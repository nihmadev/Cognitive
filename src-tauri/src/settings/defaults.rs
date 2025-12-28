use super::types::*;
use std::collections::HashMap;

impl Default for UISettings {
    fn default() -> Self {
        Self {
            theme: "dark-modern".to_string(),
            font_family: "jetbrains".to_string(),
            font_size: 14,
            line_height: 1.5,
            minimap_enabled: true,
            line_numbers_enabled: true,
            tab_size: 4,
            sidebar_width: 256,
            ai_panel_width: 400,
            zoom_level: 1.0,
        }
    }
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            word_wrap: false,
            auto_save: false,
            auto_save_delay: 1000,
            format_on_save: false,
            bracket_pair_colorization: true,
            indent_guides: true,
            cursor_blinking: "blink".to_string(),
            cursor_style: "line".to_string(),
        }
    }
}

impl Default for AISettings {
    fn default() -> Self {
        Self {
            active_model_id: String::new(),
            active_mode: "responder".to_string(),
            stream_responses: true,
            max_tokens: 4096,
            temperature: 0.7,
        }
    }
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        Self {
            exclude_patterns: vec![
                "**/node_modules/**".to_string(),
                "**/.git/**".to_string(),
                "**/target/**".to_string(),
                "**/dist/**".to_string(),
            ],
            search_exclude_patterns: vec![
                "**/node_modules/**".to_string(),
                "**/.git/**".to_string(),
                "**/target/**".to_string(),
            ],
            file_associations: HashMap::new(),
        }
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            ui: UISettings::default(),
            editor: EditorSettings::default(),
            ai: AISettings::default(),
            workspace: None,
        }
    }
}
