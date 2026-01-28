use std::path::PathBuf;
use tauri::AppHandle;

pub struct PathResolver;

impl PathResolver {
    pub fn app_data_dir(_app: &AppHandle) -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Cognitive")
    }

    pub fn db_dir(app: &AppHandle) -> PathBuf {
        Self::app_data_dir(app).join("db")
    }

    pub fn main_db_path(app: &AppHandle) -> PathBuf {
        Self::db_dir(app).join("main.db")
    }

    pub fn workspace_db_path(app: &AppHandle) -> PathBuf {
        Self::db_dir(app).join("workspace_states.db")
    }

    #[allow(dead_code)]
    pub fn extensions_db_path(app: &AppHandle) -> PathBuf {
        Self::db_dir(app).join("extensions.db")
    }

    pub fn config_dir(app: &AppHandle) -> PathBuf {
        Self::app_data_dir(app).join("config")
    }

    #[allow(dead_code)]
    pub fn user_settings_path(app: &AppHandle) -> PathBuf {
        Self::config_dir(app).join("user_settings.json")
    }

    pub fn extensions_dir(app: &AppHandle) -> PathBuf {
        Self::app_data_dir(app).join("extensions")
    }

    pub fn cache_dir(app: &AppHandle) -> PathBuf {
        Self::app_data_dir(app).join("cache")
    }

    pub fn logs_dir(app: &AppHandle) -> PathBuf {
        Self::app_data_dir(app).join("logs")
    }

    pub fn ensure_dirs(app: &AppHandle) -> Result<(), std::io::Error> {
        let dirs = [
            Self::db_dir(app),
            Self::config_dir(app),
            Self::extensions_dir(app),
            Self::cache_dir(app),
            Self::logs_dir(app),
        ];

        for dir in dirs {
            if !dir.exists() {
                std::fs::create_dir_all(dir)?;
            }
        }
        Ok(())
    }
}
