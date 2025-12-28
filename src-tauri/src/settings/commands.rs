use std::sync::Mutex;
use tauri::{AppHandle, State, Emitter};

use super::store::SettingsStore;
use super::types::*;
use super::watcher::SettingsWatcher;

/// Combined state for settings
pub struct SettingsState {
    pub store: Mutex<SettingsStore>,
    pub watcher: Mutex<SettingsWatcher>,
}

impl SettingsState {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(SettingsStore::new()),
            watcher: Mutex::new(SettingsWatcher::new()),
        }
    }
}

impl Default for SettingsState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize settings system
#[tauri::command]
pub fn settings_init(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let store = state.store.lock().unwrap();
    
    // Load user settings
    store.load_user_settings()?;
    
    // Get paths to watch
    let mut paths = vec![store.get_user_config_path()];
    if let Some(workspace_path) = store.get_workspace_config_path() {
        paths.push(workspace_path);
    }
    
    drop(store);
    
    // Start file watcher
    let mut watcher = state.watcher.lock().unwrap();
    watcher.start(app_handle, paths)?;
    
    drop(watcher);
    
    // Return current settings
    let store = state.store.lock().unwrap();
    Ok(store.get_settings())
}

/// Get all settings (merged user + workspace)
#[tauri::command]
pub fn settings_get_all(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    let store = state.store.lock().unwrap();
    Ok(store.get_settings())
}

/// Get user settings only
#[tauri::command]
pub fn settings_get_user(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    let store = state.store.lock().unwrap();
    Ok(store.get_user_settings())
}

/// Get workspace settings only
#[tauri::command]
pub fn settings_get_workspace(state: State<'_, SettingsState>) -> Result<Option<AppSettings>, String> {
    let store = state.store.lock().unwrap();
    Ok(store.get_workspace_settings())
}

/// Update a settings section
#[tauri::command]
pub fn settings_update_section(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
    section: String,
    value: serde_json::Value,
    target: String,
) -> Result<(), String> {
    let source = match target.as_str() {
        "user" => SettingsSource::User,
        "workspace" => SettingsSource::Workspace,
        _ => return Err("Invalid target: must be 'user' or 'workspace'".to_string()),
    };

    let store = state.store.lock().unwrap();
    
    // Update based on section type
    match section.as_str() {
        "ui" => {
            let ui: UISettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid UI settings: {}", e))?;
            store.update_section(&section, ui, source.clone())?;
        }
        "editor" => {
            let editor: EditorSettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid editor settings: {}", e))?;
            store.update_section(&section, editor, source.clone())?;
        }
        "ai" => {
            let ai: AISettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid AI settings: {}", e))?;
            store.update_section(&section, ai, source.clone())?;
        }
        "workspace" => {
            let workspace: WorkspaceSettings = serde_json::from_value(value.clone())
                .map_err(|e| format!("Invalid workspace settings: {}", e))?;
            store.update_section(&section, workspace, source.clone())?;
        }
        _ => return Err(format!("Unknown section: {}", section)),
    }

    // Broadcast change to all windows
    let event = SettingsChangeEvent {
        section: section.clone(),
        key: None,
        value,
        source,
    };
    let _ = app_handle.emit("settings-changed", &event);

    Ok(())
}

/// Update a single setting value
#[tauri::command]
pub fn settings_update_value(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
    section: String,
    key: String,
    value: serde_json::Value,
    target: String,
) -> Result<(), String> {
    let source = match target.as_str() {
        "user" => SettingsSource::User,
        "workspace" => SettingsSource::Workspace,
        _ => return Err("Invalid target: must be 'user' or 'workspace'".to_string()),
    };

    let store = state.store.lock().unwrap();
    store.update_value(&section, &key, value.clone(), source.clone())?;

    // Broadcast change to all windows
    let event = SettingsChangeEvent {
        section,
        key: Some(key),
        value,
        source,
    };
    let _ = app_handle.emit("settings-changed", &event);

    Ok(())
}

/// Set workspace path
#[tauri::command]
pub fn settings_set_workspace(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
    workspace_path: String,
) -> Result<(), String> {
    let store = state.store.lock().unwrap();
    store.set_workspace(&workspace_path)?;
    
    // Add workspace settings file to watcher
    if let Some(workspace_config) = store.get_workspace_config_path() {
        drop(store);
        let mut watcher = state.watcher.lock().unwrap();
        watcher.add_path(workspace_config)?;
    }

    // Broadcast that settings may have changed
    let store = state.store.lock().unwrap();
    let event = SettingsChangeEvent {
        section: "all".to_string(),
        key: None,
        value: serde_json::to_value(store.get_settings()).unwrap_or_default(),
        source: SettingsSource::Workspace,
    };
    let _ = app_handle.emit("settings-changed", &event);

    Ok(())
}

/// Clear workspace settings
#[tauri::command]
pub fn settings_clear_workspace(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    let store = state.store.lock().unwrap();
    
    // Remove workspace config from watcher
    if let Some(workspace_config) = store.get_workspace_config_path() {
        drop(store);
        let mut watcher = state.watcher.lock().unwrap();
        watcher.remove_path(&workspace_config)?;
        drop(watcher);
        
        let store = state.store.lock().unwrap();
        store.clear_workspace();
    } else {
        store.clear_workspace();
    }

    // Broadcast that settings may have changed
    let store = state.store.lock().unwrap();
    let event = SettingsChangeEvent {
        section: "all".to_string(),
        key: None,
        value: serde_json::to_value(store.get_settings()).unwrap_or_default(),
        source: SettingsSource::User,
    };
    let _ = app_handle.emit("settings-changed", &event);

    Ok(())
}

/// Reload settings from files
#[tauri::command]
pub fn settings_reload(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
) -> Result<AppSettings, String> {
    let store = state.store.lock().unwrap();
    let event = store.reload()?;
    
    // Broadcast reload event
    let _ = app_handle.emit("settings-changed", &event);
    
    Ok(store.get_settings())
}

/// Get settings file paths
#[tauri::command]
pub fn settings_get_paths(state: State<'_, SettingsState>) -> Result<serde_json::Value, String> {
    let store = state.store.lock().unwrap();
    
    Ok(serde_json::json!({
        "userConfig": store.get_user_config_path().to_string_lossy(),
        "workspaceConfig": store.get_workspace_config_path().map(|p| p.to_string_lossy().to_string()),
        "configDir": store.get_config_dir().to_string_lossy()
    }))
}

/// Reset settings to defaults
#[tauri::command]
pub fn settings_reset(
    app_handle: AppHandle,
    state: State<'_, SettingsState>,
    target: String,
) -> Result<AppSettings, String> {
    let store = state.store.lock().unwrap();
    
    match target.as_str() {
        "user" => {
            // Reset user settings to defaults
            store.update_section("ui", UISettings::default(), SettingsSource::User)?;
            store.update_section("editor", EditorSettings::default(), SettingsSource::User)?;
            store.update_section("ai", AISettings::default(), SettingsSource::User)?;
        }
        "workspace" => {
            // Clear workspace settings
            store.clear_workspace();
        }
        "all" => {
            // Reset everything
            store.update_section("ui", UISettings::default(), SettingsSource::User)?;
            store.update_section("editor", EditorSettings::default(), SettingsSource::User)?;
            store.update_section("ai", AISettings::default(), SettingsSource::User)?;
            store.clear_workspace();
        }
        _ => return Err("Invalid target: must be 'user', 'workspace', or 'all'".to_string()),
    }

    let settings = store.get_settings();
    
    // Broadcast reset event
    let event = SettingsChangeEvent {
        section: "all".to_string(),
        key: None,
        value: serde_json::to_value(&settings).unwrap_or_default(),
        source: SettingsSource::Default,
    };
    let _ = app_handle.emit("settings-changed", &event);

    Ok(settings)
}
