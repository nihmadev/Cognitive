use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyStore {
    keys: HashMap<String, String>,
}

impl ApiKeyStore {
    pub fn new() -> Self {
        Self {
            keys: HashMap::new(),
        }
    }

    pub fn set_key(&mut self, provider: &str, key: String) {
        self.keys.insert(provider.to_string(), key);
    }

    pub fn get_key(&self, provider: &str) -> Option<String> {
        self.keys.get(provider).cloned()
    }

    pub fn remove_key(&mut self, provider: &str) {
        self.keys.remove(provider);
    }

    pub fn has_key(&self, provider: &str) -> bool {
        self.keys.contains_key(provider)
    }
}

impl Default for ApiKeyStore {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_api_key(state: &State<'_, Mutex<ApiKeyStore>>, provider: &str) -> Result<String, String> {
    let store = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    store.get_key(provider).ok_or_else(|| format!("{} API key not configured", provider))
}

#[tauri::command]
pub fn set_api_key(state: State<'_, Mutex<ApiKeyStore>>, provider: String, key: String) -> Result<(), String> {
    let mut store = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    if key.trim().is_empty() {
        store.remove_key(&provider);
    } else {
        store.set_key(&provider, key.trim().to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn get_api_keys(state: State<'_, Mutex<ApiKeyStore>>) -> Result<HashMap<String, bool>, String> {
    let store = state.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let mut result = HashMap::new();
    
    let providers = vec!["openai", "anthropic", "google", "xai", "zhipu", "yandex", "gigachat", "agentrouter"];
    for provider in providers {
        result.insert(provider.to_string(), store.has_key(provider));
    }
    
    Ok(result)
}
