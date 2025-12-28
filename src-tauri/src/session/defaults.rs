use super::types::*;

/// Maximum number of recent workspaces to keep
pub const MAX_RECENT_WORKSPACES: usize = 10;

/// Auto-save interval in seconds
pub const AUTO_SAVE_INTERVAL_SECS: u64 = 30;

/// Default global session
pub fn default_global_session() -> GlobalSession {
    GlobalSession {
        recent_workspaces: Vec::new(),
        last_workspace: None,
        zoom_level: 1.0,
        window: WindowState::default(),
    }
}

/// Default workspace session
pub fn default_workspace_session(workspace_path: &str) -> WorkspaceSession {
    WorkspaceSession {
        workspace_path: workspace_path.to_string(),
        open_tabs: Vec::new(),
        active_file: None,
        editor_states: std::collections::HashMap::new(),
        panels: PanelsState::default(),
        split_view: SplitViewState::default(),
        expanded_folders: Vec::new(),
        last_opened: chrono::Utc::now().timestamp(),
    }
}

/// Default panel states
pub fn default_panels_state() -> PanelsState {
    PanelsState::default()
}

/// Default editor view state
pub fn default_editor_view_state() -> EditorViewState {
    EditorViewState {
        cursor: CursorPosition { line: 1, column: 1 },
        scroll_top: 0.0,
        scroll_left: 0.0,
        selections: Vec::new(),
        folded_regions: Vec::new(),
    }
}
