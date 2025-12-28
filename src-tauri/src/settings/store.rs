use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;

use super::defaults::*;
use super::types::*;
use super::validation::validate_settings;

/// Settings store with file persistence
pub struct SettingsStore {
    /// User settings (global)
    user_settings: RwLock<AppSettings>,
    /// Workspace settings (per-project, optional)
    workspace_settings: RwLock<Option<AppSettings>>,
    /// Path to user settings file
    user_config_path: PathBuf,
    /// Path to workspace settings file (if workspace is open)
    workspace_config_path: RwLock<Option<PathBuf>>,
}

impl SettingsStore {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("colbex");
        
        Self {
            user_settings: RwLock::new(AppSettings::default()),
            workspace_settings: RwLock::new(None),
            user_config_path: config_dir.join("settings.json"),
            workspace_config_path: RwLock::new(None),
        }
    }

    /// Get user config directory
    pub fn get_config_dir(&self) -> PathBuf {
        self.user_config_path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."))
    }

    /// Get user config path
    pub fn get_user_config_path(&self) -> PathBuf {
        self.user_config_path.clone()
    }

    /// Get workspace config path
    pub fn get_workspace_config_path(&self) -> Option<PathBuf> {
        self.workspace_config_path.read().unwrap().clone()
    }

    /// Load user settings from file
    pub fn load_user_settings(&self) -> Result<(), String> {
        if !self.user_config_path.exists() {
            // Create default settings file
            self.save_user_settings()?;
            return Ok(());
        }

        let content = fs::read_to_string(&self.user_config_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;

        let settings: AppSettings = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        // Validate settings
        let validation = validate_settings(&settings);
        if !validation.valid {
            let errors: Vec<String> = validation.errors.iter()
                .map(|e| format!("{}: {}", e.path, e.message))
                .collect();
            return Err(format!("Invalid settings: {}", errors.join(", ")));
        }

        *self.user_settings.write().unwrap() = settings;
        Ok(())
    }

    /// Save user settings to file
    pub fn save_user_settings(&self) -> Result<(), String> {
        let settings = self.user_settings.read().unwrap();
        
        // Ensure config directory exists
        if let Some(parent) = self.user_config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let content = serde_json::to_string_pretty(&*settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        fs::write(&self.user_config_path, content)
            .map_err(|e| format!("Failed to write settings file: {}", e))?;

        Ok(())
    }

    /// Set workspace path and load workspace settings
    pub fn set_workspace(&self, workspace_path: &str) -> Result<(), String> {
        let workspace_config = PathBuf::from(workspace_path)
            .join(".colbex")
            .join("settings.json");

        *self.workspace_config_path.write().unwrap() = Some(workspace_config.clone());

        if workspace_config.exists() {
            let content = fs::read_to_string(&workspace_config)
                .map_err(|e| format!("Failed to read workspace settings: {}", e))?;

            let settings: AppSettings = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse workspace settings: {}", e))?;

            *self.workspace_settings.write().unwrap() = Some(settings);
        } else {
            *self.workspace_settings.write().unwrap() = None;
        }

        Ok(())
    }

    /// Clear workspace settings
    pub fn clear_workspace(&self) {
        *self.workspace_config_path.write().unwrap() = None;
        *self.workspace_settings.write().unwrap() = None;
    }

    /// Save workspace settings
    pub fn save_workspace_settings(&self) -> Result<(), String> {
        let workspace_path = self.workspace_config_path.read().unwrap();
        let workspace_path = workspace_path.as_ref()
            .ok_or("No workspace is open")?;

        let settings = self.workspace_settings.read().unwrap();
        let settings = settings.as_ref()
            .ok_or("No workspace settings to save")?;

        // Ensure .colbex directory exists
        if let Some(parent) = workspace_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create workspace config directory: {}", e))?;
        }

        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("Failed to serialize workspace settings: {}", e))?;

        fs::write(workspace_path, content)
            .map_err(|e| format!("Failed to write workspace settings: {}", e))?;

        Ok(())
    }

    /// Get merged settings (workspace overrides user)
    pub fn get_settings(&self) -> AppSettings {
        let user = self.user_settings.read().unwrap().clone();
        
        if let Some(workspace) = self.workspace_settings.read().unwrap().as_ref() {
            // Merge workspace settings over user settings
            self.merge_settings(&user, workspace)
        } else {
            user
        }
    }

    /// Get user settings only
    pub fn get_user_settings(&self) -> AppSettings {
        self.user_settings.read().unwrap().clone()
    }

    /// Get workspace settings only
    pub fn get_workspace_settings(&self) -> Option<AppSettings> {
        self.workspace_settings.read().unwrap().clone()
    }

    /// Update a specific setting section
    pub fn update_section<T: serde::Serialize>(
        &self,
        section: &str,
        value: T,
        target: SettingsSource,
    ) -> Result<(), String> {
        let json_value = serde_json::to_value(&value)
            .map_err(|e| format!("Failed to serialize value: {}", e))?;

        match target {
            SettingsSource::User => {
                let mut settings = self.user_settings.write().unwrap();
                self.apply_section_update(&mut settings, section, json_value)?;
                drop(settings);
                self.save_user_settings()?;
            }
            SettingsSource::Workspace => {
                let mut workspace = self.workspace_settings.write().unwrap();
                if workspace.is_none() {
                    *workspace = Some(AppSettings::default());
                }
                if let Some(ref mut ws) = *workspace {
                    self.apply_section_update(ws, section, json_value)?;
                }
                drop(workspace);
                self.save_workspace_settings()?;
            }
            _ => return Err("Invalid settings source".to_string()),
        }

        Ok(())
    }

    /// Update a single setting value
    pub fn update_value(
        &self,
        section: &str,
        key: &str,
        value: serde_json::Value,
        target: SettingsSource,
    ) -> Result<(), String> {
        match target {
            SettingsSource::User => {
                let mut settings = self.user_settings.write().unwrap();
                self.apply_value_update(&mut settings, section, key, value)?;
                drop(settings);
                self.save_user_settings()?;
            }
            SettingsSource::Workspace => {
                let mut workspace = self.workspace_settings.write().unwrap();
                if workspace.is_none() {
                    *workspace = Some(AppSettings::default());
                }
                if let Some(ref mut ws) = *workspace {
                    self.apply_value_update(ws, section, key, value)?;
                }
                drop(workspace);
                self.save_workspace_settings()?;
            }
            _ => return Err("Invalid settings source".to_string()),
        }

        Ok(())
    }

    /// Apply section update to settings
    fn apply_section_update(
        &self,
        settings: &mut AppSettings,
        section: &str,
        value: serde_json::Value,
    ) -> Result<(), String> {
        match section {
            "ui" => {
                settings.ui = serde_json::from_value(value)
                    .map_err(|e| format!("Invalid UI settings: {}", e))?;
            }
            "editor" => {
                settings.editor = serde_json::from_value(value)
                    .map_err(|e| format!("Invalid editor settings: {}", e))?;
            }
            "ai" => {
                settings.ai = serde_json::from_value(value)
                    .map_err(|e| format!("Invalid AI settings: {}", e))?;
            }
            "workspace" => {
                settings.workspace = serde_json::from_value(value)
                    .map_err(|e| format!("Invalid workspace settings: {}", e))?;
            }
            _ => return Err(format!("Unknown settings section: {}", section)),
        }
        Ok(())
    }

    /// Apply single value update to settings
    fn apply_value_update(
        &self,
        settings: &mut AppSettings,
        section: &str,
        key: &str,
        value: serde_json::Value,
    ) -> Result<(), String> {
        // Convert settings to JSON, update the value, convert back
        let mut json = serde_json::to_value(&*settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        if let Some(section_obj) = json.get_mut(section) {
            if let Some(obj) = section_obj.as_object_mut() {
                obj.insert(key.to_string(), value);
            } else {
                return Err(format!("Section {} is not an object", section));
            }
        } else {
            return Err(format!("Unknown section: {}", section));
        }

        *settings = serde_json::from_value(json)
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?;

        // Validate after update
        let validation = validate_settings(settings);
        if !validation.valid {
            return Err(format!("Invalid settings after update: {:?}", validation.errors));
        }

        Ok(())
    }

    /// Merge workspace settings over user settings
    fn merge_settings(&self, user: &AppSettings, workspace: &AppSettings) -> AppSettings {
        // For now, workspace completely overrides sections that are set
        // Could be made more granular if needed
        AppSettings {
            ui: workspace.ui.clone(),
            editor: workspace.editor.clone(),
            ai: workspace.ai.clone(),
            workspace: workspace.workspace.clone().or_else(|| user.workspace.clone()),
        }
    }

    /// Reload settings from files (called by file watcher)
    pub fn reload(&self) -> Result<SettingsChangeEvent, String> {
        self.load_user_settings()?;
        
        // Reload workspace settings if workspace is set
        if let Some(workspace_path) = self.workspace_config_path.read().unwrap().as_ref() {
            if workspace_path.exists() {
                let content = fs::read_to_string(workspace_path)
                    .map_err(|e| format!("Failed to read workspace settings: {}", e))?;

                let settings: AppSettings = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse workspace settings: {}", e))?;

                *self.workspace_settings.write().unwrap() = Some(settings);
            }
        }

        Ok(SettingsChangeEvent {
            section: "all".to_string(),
            key: None,
            value: serde_json::to_value(self.get_settings()).unwrap_or_default(),
            source: SettingsSource::FileWatch,
        })
    }
}

impl Default for SettingsStore {
    fn default() -> Self {
        Self::new()
    }
}
