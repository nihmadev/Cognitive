use super::types::*;

/// Validates UI settings
pub fn validate_ui_settings(settings: &UISettings) -> ValidationResult {
    let mut errors = Vec::new();

    // Validate font size
    if settings.font_size < 8 || settings.font_size > 72 {
        errors.push(ValidationError {
            path: "ui.fontSize".to_string(),
            message: "Font size must be between 8 and 72".to_string(),
        });
    }

    // Validate line height
    if settings.line_height < 1.0 || settings.line_height > 3.0 {
        errors.push(ValidationError {
            path: "ui.lineHeight".to_string(),
            message: "Line height must be between 1.0 and 3.0".to_string(),
        });
    }

    // Validate tab size
    if settings.tab_size < 1 || settings.tab_size > 8 {
        errors.push(ValidationError {
            path: "ui.tabSize".to_string(),
            message: "Tab size must be between 1 and 8".to_string(),
        });
    }

    // Validate zoom level
    if settings.zoom_level < 0.5 || settings.zoom_level > 2.0 {
        errors.push(ValidationError {
            path: "ui.zoomLevel".to_string(),
            message: "Zoom level must be between 0.5 and 2.0".to_string(),
        });
    }

    // Validate sidebar width
    if settings.sidebar_width < 150 || settings.sidebar_width > 600 {
        errors.push(ValidationError {
            path: "ui.sidebarWidth".to_string(),
            message: "Sidebar width must be between 150 and 600".to_string(),
        });
    }

    // Validate AI panel width
    if settings.ai_panel_width < 200 || settings.ai_panel_width > 800 {
        errors.push(ValidationError {
            path: "ui.aiPanelWidth".to_string(),
            message: "AI panel width must be between 200 and 800".to_string(),
        });
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
    }
}

/// Validates editor settings
pub fn validate_editor_settings(settings: &EditorSettings) -> ValidationResult {
    let mut errors = Vec::new();

    // Validate auto save delay
    if settings.auto_save_delay < 100 || settings.auto_save_delay > 60000 {
        errors.push(ValidationError {
            path: "editor.autoSaveDelay".to_string(),
            message: "Auto save delay must be between 100ms and 60000ms".to_string(),
        });
    }

    // Validate cursor blinking
    let valid_blinking = ["blink", "smooth", "phase", "expand", "solid"];
    if !valid_blinking.contains(&settings.cursor_blinking.as_str()) {
        errors.push(ValidationError {
            path: "editor.cursorBlinking".to_string(),
            message: format!("Cursor blinking must be one of: {:?}", valid_blinking),
        });
    }

    // Validate cursor style
    let valid_styles = ["line", "block", "underline", "line-thin", "block-outline", "underline-thin"];
    if !valid_styles.contains(&settings.cursor_style.as_str()) {
        errors.push(ValidationError {
            path: "editor.cursorStyle".to_string(),
            message: format!("Cursor style must be one of: {:?}", valid_styles),
        });
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
    }
}

/// Validates AI settings
pub fn validate_ai_settings(settings: &AISettings) -> ValidationResult {
    let mut errors = Vec::new();

    // Validate mode
    let valid_modes = ["responder", "agent"];
    if !valid_modes.contains(&settings.active_mode.as_str()) {
        errors.push(ValidationError {
            path: "ai.activeMode".to_string(),
            message: format!("Active mode must be one of: {:?}", valid_modes),
        });
    }

    // Validate max tokens
    if settings.max_tokens < 1 || settings.max_tokens > 128000 {
        errors.push(ValidationError {
            path: "ai.maxTokens".to_string(),
            message: "Max tokens must be between 1 and 128000".to_string(),
        });
    }

    // Validate temperature
    if settings.temperature < 0.0 || settings.temperature > 2.0 {
        errors.push(ValidationError {
            path: "ai.temperature".to_string(),
            message: "Temperature must be between 0.0 and 2.0".to_string(),
        });
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors,
    }
}

/// Validates all settings
pub fn validate_settings(settings: &AppSettings) -> ValidationResult {
    let mut all_errors = Vec::new();

    let ui_result = validate_ui_settings(&settings.ui);
    all_errors.extend(ui_result.errors);

    let editor_result = validate_editor_settings(&settings.editor);
    all_errors.extend(editor_result.errors);

    let ai_result = validate_ai_settings(&settings.ai);
    all_errors.extend(ai_result.errors);

    ValidationResult {
        valid: all_errors.is_empty(),
        errors: all_errors,
    }
}
