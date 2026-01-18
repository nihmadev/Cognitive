use super::types::*;


pub const MAX_RECENT_WORKSPACES: usize = 10;


pub const AUTO_SAVE_INTERVAL_SECS: u64 = 30;


pub fn default_global_session() -> GlobalSession {
    GlobalSession {
        recent_workspaces: Vec::new(),
        last_workspace: None,
        zoom_level: 1.0,
        window: WindowState::default(),
    }
}


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


pub fn default_panels_state() -> PanelsState {
    PanelsState::default()
}


pub fn default_editor_view_state() -> EditorViewState {
    EditorViewState {
        cursor: CursorPosition { line: 1, column: 1 },
        scroll_top: 0.0,
        scroll_left: 0.0,
        selections: Vec::new(),
        folded_regions: Vec::new(),
    }
}
