use serde::{Deserialize, Serialize};
use std::collections::HashMap;


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CursorPosition {
    pub line: u32,
    pub column: u32,
}


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EditorViewState {
    pub cursor: CursorPosition,
    pub scroll_top: f64,
    pub scroll_left: f64,
    #[serde(default)]
    pub selections: Vec<Selection>,
    #[serde(default)]
    pub folded_regions: Vec<FoldedRegion>,
}


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Selection {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FoldedRegion {
    pub start_line: u32,
    pub end_line: u32,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenTab {
    pub path: String,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub is_preview: bool,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PanelState {
    pub visible: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

impl Default for PanelState {
    fn default() -> Self {
        Self {
            visible: true,
            width: None,
            height: None,
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PanelsState {
    pub sidebar: PanelState,
    pub terminal: PanelState,
    pub ai_panel: PanelState,
    #[serde(default)]
    pub bottom_panel_tab: String,
}

impl Default for PanelsState {
    fn default() -> Self {
        Self {
            sidebar: PanelState {
                visible: true,
                width: Some(256),
                height: None,
            },
            terminal: PanelState {
                visible: false,
                width: None,
                height: Some(300),
            },
            ai_panel: PanelState {
                visible: false,
                width: Some(400),
                height: None,
            },
            bottom_panel_tab: "problems".to_string(),
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SplitViewState {
    pub enabled: bool,
    pub second_file: Option<String>,
    pub split_ratio: f64,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSession {
    
    pub workspace_path: String,
    
    pub open_tabs: Vec<OpenTab>,
    
    pub active_file: Option<String>,
    
    pub editor_states: HashMap<String, EditorViewState>,
    
    pub panels: PanelsState,
    
    pub split_view: SplitViewState,
    
    pub expanded_folders: Vec<String>,
    
    pub last_opened: i64,
}

impl Default for WorkspaceSession {
    fn default() -> Self {
        Self {
            workspace_path: String::new(),
            open_tabs: Vec::new(),
            active_file: None,
            editor_states: HashMap::new(),
            panels: PanelsState::default(),
            split_view: SplitViewState::default(),
            expanded_folders: Vec::new(),
            last_opened: 0,
        }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GlobalSession {
    
    pub recent_workspaces: Vec<RecentWorkspace>,
    
    pub last_workspace: Option<String>,
    
    pub zoom_level: f64,
    
    pub window: WindowState,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspace {
    pub path: String,
    pub name: String,
    pub last_opened: i64,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: u32,
    pub height: u32,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: 1280,
            height: 720,
            maximized: false,
        }
    }
}


#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionChangeEvent {
    pub event_type: SessionEventType,
    pub workspace_path: Option<String>,
    pub data: serde_json::Value,
}


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SessionEventType {
    WorkspaceOpened,
    WorkspaceClosed,
    TabOpened,
    TabClosed,
    ActiveFileChanged,
    EditorStateChanged,
    PanelStateChanged,
    SessionRestored,
    SessionSaved,
}
