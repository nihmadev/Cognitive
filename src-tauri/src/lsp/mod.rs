use tauri::{AppHandle, State};
use std::sync::Mutex;
use crate::lsp::client::{LspClient, LanguageServerType};

pub mod client;
pub mod protocol;

pub struct LspState {
    pub client: Mutex<LspClient>,
}

impl LspState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(LspClient::new()),
        }
    }
}

fn to_file_uri(path: &str) -> String {
    let path = path.replace('\\', "/");
    if path.starts_with('/') {
        format!("file://{}", path)
    } else {
        format!("file:///{}", path)
    }
}

#[tauri::command]
pub fn lsp_initialize(state: State<LspState>, app: AppHandle, project_path: String, server_type: Option<String>) -> Result<(), String> {
    let server_type = match server_type.as_deref() {
        Some("go") => LanguageServerType::Go,
        Some("python") => LanguageServerType::Python,
        Some("typescript") | _ => LanguageServerType::TypeScript,
    };
    
    let mut client = state.client.lock().map_err(|_| "Failed to lock LSP client")?;
    client.start(app, server_type).map_err(|e| format!("Failed to start LSP: {}", e))?;
    client.initialize(to_file_uri(&project_path))?;
    Ok(())
}

#[tauri::command]
pub fn lsp_did_open(state: State<LspState>, path: String, content: String) -> Result<(), String> {
    let uri = to_file_uri(&path);
    let mut client = state.client.lock().map_err(|_| "Failed to lock LSP client")?;
    client.did_open(uri, content)?;
    Ok(())
}

#[tauri::command]
pub fn lsp_did_change(state: State<LspState>, path: String, content: String, version: i32) -> Result<(), String> {
    let uri = to_file_uri(&path);
    let mut client = state.client.lock().map_err(|_| "Failed to lock LSP client")?;
    client.did_change(uri, content, version)?;
    Ok(())
}

// CSS LSP Commands - placeholder implementations
#[tauri::command]
pub fn css_lsp_initialize(_project_path: String) -> Result<(), String> {
    // TODO: Implement CSS LSP initialization
    Err("CSS LSP not implemented yet".to_string())
}

#[tauri::command]
pub fn css_lsp_did_open(_path: String, _content: String) -> Result<(), String> {
    // TODO: Implement CSS LSP did_open
    Ok(())
}

#[tauri::command]
pub fn css_lsp_did_change(_path: String, _content: String, _version: i32) -> Result<(), String> {
    // TODO: Implement CSS LSP did_change
    Ok(())
}

#[tauri::command]
pub fn css_lsp_did_close(_path: String) -> Result<(), String> {
    // TODO: Implement CSS LSP did_close
    Ok(())
}
