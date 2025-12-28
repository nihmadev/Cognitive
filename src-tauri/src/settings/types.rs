use serde::{Deserialize, Serialize};

/// UI Settings - theme, fonts, layout
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UISettings {
    pub theme: String,
    pub font_family: String,
    pub font_size: u32,
    pub line_height: f32,
    pub minimap_enabled: bool,
    pub line_numbers_enabled: bool,
    pub tab_size: u32,
    pub sidebar_width: u32,
    pub ai_panel_width: u32,
    pub zoom_level: f32,
}

/// Editor Settings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EditorSettings {
    pub word_wrap: bool,
    pub auto_save: bool,
    pub auto_save_delay: u32,
    pub format_on_save: bool,
    pub bracket_pair_colorization: bool,
    pub indent_guides: bool,
    pub cursor_blinking: String,
    pub cursor_style: String,
}

/// AI Settings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AISettings {
    pub active_model_id: String,
    pub active_mode: String,
    pub stream_responses: bool,
    pub max_tokens: u32,
    pub temperature: f32,
}

/// Workspace Settings (per-project)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub exclude_patterns: Vec<String>,
    pub search_exclude_patterns: Vec<String>,
    pub file_associations: std::collections::HashMap<String, String>,
}

/// All application settings combined
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub ui: UISettings,
    pub editor: EditorSettings,
    pub ai: AISettings,
    #[serde(default)]
    pub workspace: Option<WorkspaceSettings>,
}

/// Settings change event for IPC broadcast
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsChangeEvent {
    pub section: String,
    pub key: Option<String>,
    pub value: serde_json::Value,
    pub source: SettingsSource,
}

/// Source of settings change
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SettingsSource {
    User,
    Workspace,
    Default,
    FileWatch,
}

/// Result of settings validation
#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationError {
    pub path: String,
    pub message: String,
}
