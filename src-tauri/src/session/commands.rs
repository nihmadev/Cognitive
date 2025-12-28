use std::sync::Mutex;
use tauri::State;

use super::store::SessionStore;
use super::types::*;

/// Session state wrapper for Tauri
pub struct SessionState(pub Mutex<SessionStore>);

impl SessionState {
    pub fn new() -> Self {
        Self(Mutex::new(SessionStore::new()))
    }
}

impl Default for SessionState {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Initialization ====================

/// Initialize session store and load global session
#[tauri::command]
pub fn session_init(state: State<'_, SessionState>) -> Result<GlobalSession, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.load_global_session()?;
    Ok(store.get_global_session())
}

// ==================== Global Session ====================

/// Get global session state
#[tauri::command]
pub fn session_get_global(state: State<'_, SessionState>) -> Result<GlobalSession, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.get_global_session())
}

/// Update window state
#[tauri::command]
pub fn session_update_window(
    state: State<'_, SessionState>,
    window: WindowState,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_window_state(window)
}

/// Update zoom level
#[tauri::command]
pub fn session_update_zoom(state: State<'_, SessionState>, zoom: f64) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_zoom_level(zoom)
}

/// Get recent workspaces
#[tauri::command]
pub fn session_get_recent_workspaces(
    state: State<'_, SessionState>,
) -> Result<Vec<RecentWorkspace>, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.get_recent_workspaces())
}

/// Remove workspace from recent list
#[tauri::command]
pub fn session_remove_recent_workspace(
    state: State<'_, SessionState>,
    path: String,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.remove_recent_workspace(&path)
}

/// Get last workspace path
#[tauri::command]
pub fn session_get_last_workspace(state: State<'_, SessionState>) -> Result<Option<String>, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.get_last_workspace())
}

// ==================== Workspace Session ====================

/// Open workspace and load/create its session
#[tauri::command]
pub fn session_open_workspace(
    state: State<'_, SessionState>,
    workspace_path: String,
) -> Result<WorkspaceSession, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.set_active_workspace(&workspace_path)
}

/// Close current workspace
#[tauri::command]
pub fn session_close_workspace(state: State<'_, SessionState>) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.clear_active_workspace()
}

/// Get workspace session
#[tauri::command]
pub fn session_get_workspace(
    state: State<'_, SessionState>,
    workspace_path: String,
) -> Result<Option<WorkspaceSession>, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.get_workspace_session(&workspace_path))
}

/// Save workspace session
#[tauri::command]
pub fn session_save_workspace(
    state: State<'_, SessionState>,
    workspace_path: String,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.save_workspace_session(&workspace_path)
}

// ==================== Tab Management ====================

/// Open a tab
#[tauri::command]
pub fn session_open_tab(
    state: State<'_, SessionState>,
    workspace_path: String,
    file_path: String,
    is_pinned: bool,
    is_preview: bool,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.open_tab(
        &workspace_path,
        OpenTab {
            path: file_path,
            is_pinned,
            is_preview,
        },
    )
}

/// Close a tab
#[tauri::command]
pub fn session_close_tab(
    state: State<'_, SessionState>,
    workspace_path: String,
    file_path: String,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.close_tab(&workspace_path, &file_path)
}

/// Set active file
#[tauri::command]
pub fn session_set_active_file(
    state: State<'_, SessionState>,
    workspace_path: String,
    file_path: Option<String>,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.set_active_file(&workspace_path, file_path)
}

// ==================== Editor State ====================

/// Update editor view state
#[tauri::command]
pub fn session_update_editor_state(
    state: State<'_, SessionState>,
    workspace_path: String,
    file_path: String,
    editor_state: EditorViewState,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_editor_state(&workspace_path, &file_path, editor_state)
}

/// Get editor view state
#[tauri::command]
pub fn session_get_editor_state(
    state: State<'_, SessionState>,
    workspace_path: String,
    file_path: String,
) -> Result<Option<EditorViewState>, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.get_editor_state(&workspace_path, &file_path))
}

// ==================== Panel State ====================

/// Update panels state
#[tauri::command]
pub fn session_update_panels(
    state: State<'_, SessionState>,
    workspace_path: String,
    panels: PanelsState,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_panels_state(&workspace_path, panels)
}

/// Update split view state
#[tauri::command]
pub fn session_update_split_view(
    state: State<'_, SessionState>,
    workspace_path: String,
    split_view: SplitViewState,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_split_view(&workspace_path, split_view)
}

// ==================== File Explorer State ====================

/// Update expanded folders
#[tauri::command]
pub fn session_update_expanded_folders(
    state: State<'_, SessionState>,
    workspace_path: String,
    folders: Vec<String>,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.update_expanded_folders(&workspace_path, folders)
}

// ==================== Utility ====================

/// Save all sessions
#[tauri::command]
pub fn session_save_all(state: State<'_, SessionState>) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.save_all()
}

/// Delete workspace session
#[tauri::command]
pub fn session_delete_workspace(
    state: State<'_, SessionState>,
    workspace_path: String,
) -> Result<(), String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    store.delete_workspace_session(&workspace_path)
}

/// Get session paths info
#[tauri::command]
pub fn session_get_paths(state: State<'_, SessionState>) -> Result<SessionPaths, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(SessionPaths {
        config_dir: store.get_config_dir().to_string_lossy().to_string(),
        sessions_dir: store.get_sessions_dir().to_string_lossy().to_string(),
    })
}

/// Session paths info
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionPaths {
    pub config_dir: String,
    pub sessions_dir: String,
}
