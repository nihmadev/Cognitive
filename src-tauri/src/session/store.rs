use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;

use super::defaults::*;
use super::types::*;

/// Session store with file persistence
pub struct SessionStore {
    /// Global session state
    global_session: RwLock<GlobalSession>,
    /// Workspace sessions cache (workspace_path -> session)
    workspace_sessions: RwLock<HashMap<String, WorkspaceSession>>,
    /// Current active workspace path
    active_workspace: RwLock<Option<String>>,
    /// Path to global session file
    global_session_path: PathBuf,
    /// Base directory for workspace sessions
    sessions_dir: PathBuf,
}

impl SessionStore {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("colbex");

        Self {
            global_session: RwLock::new(default_global_session()),
            workspace_sessions: RwLock::new(HashMap::new()),
            active_workspace: RwLock::new(None),
            global_session_path: config_dir.join("session.json"),
            sessions_dir: config_dir.join("sessions"),
        }
    }

    /// Get config directory
    pub fn get_config_dir(&self) -> PathBuf {
        self.global_session_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."))
    }

    /// Get sessions directory
    pub fn get_sessions_dir(&self) -> PathBuf {
        self.sessions_dir.clone()
    }

    /// Generate workspace session filename from path
    fn workspace_session_filename(workspace_path: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        workspace_path.hash(&mut hasher);
        format!("{:x}.json", hasher.finish())
    }

    /// Get workspace session file path
    fn get_workspace_session_path(&self, workspace_path: &str) -> PathBuf {
        self.sessions_dir
            .join(Self::workspace_session_filename(workspace_path))
    }

    // ==================== Global Session ====================

    /// Load global session from file
    pub fn load_global_session(&self) -> Result<(), String> {
        if !self.global_session_path.exists() {
            self.save_global_session()?;
            return Ok(());
        }

        let content = fs::read_to_string(&self.global_session_path)
            .map_err(|e| format!("Failed to read global session: {}", e))?;

        let session: GlobalSession = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse global session: {}", e))?;

        *self.global_session.write().unwrap() = session;
        Ok(())
    }

    /// Save global session to file
    pub fn save_global_session(&self) -> Result<(), String> {
        let session = self.global_session.read().unwrap();

        if let Some(parent) = self.global_session_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let content = serde_json::to_string_pretty(&*session)
            .map_err(|e| format!("Failed to serialize global session: {}", e))?;

        fs::write(&self.global_session_path, content)
            .map_err(|e| format!("Failed to write global session: {}", e))?;

        Ok(())
    }

    /// Get global session
    pub fn get_global_session(&self) -> GlobalSession {
        self.global_session.read().unwrap().clone()
    }

    /// Update window state
    pub fn update_window_state(&self, window: WindowState) -> Result<(), String> {
        {
            let mut session = self.global_session.write().unwrap();
            session.window = window;
        }
        self.save_global_session()
    }

    /// Update zoom level
    pub fn update_zoom_level(&self, zoom: f64) -> Result<(), String> {
        {
            let mut session = self.global_session.write().unwrap();
            session.zoom_level = zoom;
        }
        self.save_global_session()
    }

    /// Add workspace to recent list
    pub fn add_recent_workspace(&self, path: &str) -> Result<(), String> {
        let name = PathBuf::from(path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string());

        let entry = RecentWorkspace {
            path: path.to_string(),
            name,
            last_opened: chrono::Utc::now().timestamp(),
        };

        {
            let mut session = self.global_session.write().unwrap();

            // Remove existing entry if present
            session.recent_workspaces.retain(|w| w.path != path);

            // Add to front
            session.recent_workspaces.insert(0, entry);

            // Trim to max size
            if session.recent_workspaces.len() > MAX_RECENT_WORKSPACES {
                session.recent_workspaces.truncate(MAX_RECENT_WORKSPACES);
            }

            session.last_workspace = Some(path.to_string());
        }

        self.save_global_session()
    }

    /// Remove workspace from recent list
    pub fn remove_recent_workspace(&self, path: &str) -> Result<(), String> {
        {
            let mut session = self.global_session.write().unwrap();
            session.recent_workspaces.retain(|w| w.path != path);

            if session.last_workspace.as_deref() == Some(path) {
                session.last_workspace = session.recent_workspaces.first().map(|w| w.path.clone());
            }
        }
        self.save_global_session()
    }

    /// Get recent workspaces
    pub fn get_recent_workspaces(&self) -> Vec<RecentWorkspace> {
        self.global_session.read().unwrap().recent_workspaces.clone()
    }

    /// Get last workspace path
    pub fn get_last_workspace(&self) -> Option<String> {
        self.global_session.read().unwrap().last_workspace.clone()
    }

    // ==================== Workspace Session ====================

    /// Load workspace session from file
    pub fn load_workspace_session(&self, workspace_path: &str) -> Result<WorkspaceSession, String> {
        let session_path = self.get_workspace_session_path(workspace_path);

        if !session_path.exists() {
            let session = default_workspace_session(workspace_path);
            return Ok(session);
        }

        let content = fs::read_to_string(&session_path)
            .map_err(|e| format!("Failed to read workspace session: {}", e))?;

        let mut session: WorkspaceSession = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse workspace session: {}", e))?;

        // Update last opened timestamp
        session.last_opened = chrono::Utc::now().timestamp();

        // Cache the session
        self.workspace_sessions
            .write()
            .unwrap()
            .insert(workspace_path.to_string(), session.clone());

        Ok(session)
    }

    /// Save workspace session to file
    pub fn save_workspace_session(&self, workspace_path: &str) -> Result<(), String> {
        let sessions = self.workspace_sessions.read().unwrap();
        let session = sessions
            .get(workspace_path)
            .ok_or_else(|| format!("No session found for workspace: {}", workspace_path))?;

        // Ensure sessions directory exists
        fs::create_dir_all(&self.sessions_dir)
            .map_err(|e| format!("Failed to create sessions directory: {}", e))?;

        let session_path = self.get_workspace_session_path(workspace_path);
        let content = serde_json::to_string_pretty(session)
            .map_err(|e| format!("Failed to serialize workspace session: {}", e))?;

        fs::write(&session_path, content)
            .map_err(|e| format!("Failed to write workspace session: {}", e))?;

        Ok(())
    }

    /// Set active workspace and load its session
    pub fn set_active_workspace(&self, workspace_path: &str) -> Result<WorkspaceSession, String> {
        // Load session (creates default if not exists)
        let session = self.load_workspace_session(workspace_path)?;

        // Set as active
        *self.active_workspace.write().unwrap() = Some(workspace_path.to_string());

        // Add to recent workspaces
        self.add_recent_workspace(workspace_path)?;

        Ok(session)
    }

    /// Clear active workspace
    pub fn clear_active_workspace(&self) -> Result<(), String> {
        // Save current workspace session before clearing
        if let Some(workspace_path) = self.active_workspace.read().unwrap().clone() {
            let _ = self.save_workspace_session(&workspace_path);
        }

        *self.active_workspace.write().unwrap() = None;
        Ok(())
    }

    /// Get current workspace session
    pub fn get_workspace_session(&self, workspace_path: &str) -> Option<WorkspaceSession> {
        self.workspace_sessions
            .read()
            .unwrap()
            .get(workspace_path)
            .cloned()
    }

    /// Get active workspace session
    pub fn get_active_workspace_session(&self) -> Option<WorkspaceSession> {
        let active = self.active_workspace.read().unwrap().clone()?;
        self.get_workspace_session(&active)
    }

    // ==================== Tab Management ====================

    /// Open a tab in workspace session
    pub fn open_tab(&self, workspace_path: &str, tab: OpenTab) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            let session = sessions
                .entry(workspace_path.to_string())
                .or_insert_with(|| default_workspace_session(workspace_path));

            // Check if tab already exists
            if !session.open_tabs.iter().any(|t| t.path == tab.path) {
                session.open_tabs.push(tab.clone());
            }

            // Set as active file
            session.active_file = Some(tab.path);
        }

        self.save_workspace_session(workspace_path)
    }

    /// Close a tab in workspace session
    pub fn close_tab(&self, workspace_path: &str, file_path: &str) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session.open_tabs.retain(|t| t.path != file_path);

                // Update active file if needed
                if session.active_file.as_deref() == Some(file_path) {
                    session.active_file = session.open_tabs.last().map(|t| t.path.clone());
                }

                // Remove editor state
                session.editor_states.remove(file_path);
            }
        }

        self.save_workspace_session(workspace_path)
    }

    /// Set active file in workspace session
    pub fn set_active_file(
        &self,
        workspace_path: &str,
        file_path: Option<String>,
    ) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session.active_file = file_path;
            }
        }

        self.save_workspace_session(workspace_path)
    }

    // ==================== Editor State ====================

    /// Update editor view state for a file
    pub fn update_editor_state(
        &self,
        workspace_path: &str,
        file_path: &str,
        state: EditorViewState,
    ) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session
                    .editor_states
                    .insert(file_path.to_string(), state);
            }
        }

        // Don't save immediately for editor state changes (too frequent)
        // Use debounced save instead
        Ok(())
    }

    /// Get editor view state for a file
    pub fn get_editor_state(
        &self,
        workspace_path: &str,
        file_path: &str,
    ) -> Option<EditorViewState> {
        self.workspace_sessions
            .read()
            .unwrap()
            .get(workspace_path)
            .and_then(|s| s.editor_states.get(file_path).cloned())
    }

    // ==================== Panel State ====================

    /// Update panels state
    pub fn update_panels_state(
        &self,
        workspace_path: &str,
        panels: PanelsState,
    ) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session.panels = panels;
            }
        }

        self.save_workspace_session(workspace_path)
    }

    /// Update split view state
    pub fn update_split_view(
        &self,
        workspace_path: &str,
        split_view: SplitViewState,
    ) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session.split_view = split_view;
            }
        }

        self.save_workspace_session(workspace_path)
    }

    // ==================== File Explorer State ====================

    /// Update expanded folders
    pub fn update_expanded_folders(
        &self,
        workspace_path: &str,
        folders: Vec<String>,
    ) -> Result<(), String> {
        {
            let mut sessions = self.workspace_sessions.write().unwrap();
            if let Some(session) = sessions.get_mut(workspace_path) {
                session.expanded_folders = folders;
            }
        }

        self.save_workspace_session(workspace_path)
    }

    // ==================== Bulk Operations ====================

    /// Save all sessions
    pub fn save_all(&self) -> Result<(), String> {
        self.save_global_session()?;

        // Collect workspace paths first to avoid holding lock during save
        let workspace_paths: Vec<String> = {
            let sessions = self.workspace_sessions.read().unwrap();
            sessions.keys().cloned().collect()
        };

        for workspace_path in workspace_paths {
            self.save_workspace_session(&workspace_path)?;
        }

        Ok(())
    }

    /// Delete workspace session file
    pub fn delete_workspace_session(&self, workspace_path: &str) -> Result<(), String> {
        let session_path = self.get_workspace_session_path(workspace_path);

        if session_path.exists() {
            fs::remove_file(&session_path)
                .map_err(|e| format!("Failed to delete workspace session: {}", e))?;
        }

        self.workspace_sessions
            .write()
            .unwrap()
            .remove(workspace_path);

        Ok(())
    }
}

impl Default for SessionStore {
    fn default() -> Self {
        Self::new()
    }
}
