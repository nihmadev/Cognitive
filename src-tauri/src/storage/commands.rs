use tauri::{AppHandle, State};
use crate::storage::db::DatabaseManager;
use crate::storage::models::*;
use crate::storage::paths::PathResolver;
use anyhow::Result;
use std::fs;
use serde_json;

#[tauri::command]
pub async fn install_extension(
    app: AppHandle,
    id: String,
    name: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    // 1. Create extension directory
    let extensions_dir = PathResolver::extensions_dir(&app);
    let extension_path = extensions_dir.join(&id);
    
    if !extension_path.exists() {
        fs::create_dir_all(&extension_path).map_err(|e| e.to_string())?;
        // Create a placeholder package.json or similar to simulate a "real" download
        let pkg_json = serde_json::json!({
            "id": id,
            "name": name,
            "version": "0.1.0",
            "main": "index.js"
        });
        fs::write(
            extension_path.join("package.json"),
            serde_json::to_string_pretty(&pkg_json).unwrap()
        ).map_err(|e| e.to_string())?;
        
        fs::write(
            extension_path.join("index.js"),
            "console.log('Extension loaded');"
        ).map_err(|e| e.to_string())?;
    }

    // 2. Register in database
    sqlx::query(
        "INSERT INTO extensions (id, name, version, enabled) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            name = excluded.name,
            version = excluded.version"
    )
    .bind(&id)
    .bind(&name)
    .bind("0.1.0")
    .bind(true)
    .execute(&db.main_pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_recent_projects(
    db: State<'_, DatabaseManager>,
) -> Result<Vec<Project>, String> {
    sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY last_opened DESC LIMIT 10")
        .fetch_all(&db.main_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_project(
    project: Project,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO projects (id, path, name, last_opened) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET 
            path = excluded.path,
            name = excluded.name,
            last_opened = CURRENT_TIMESTAMP"
    )
    .bind(&project.id)
    .bind(&project.path)
    .bind(&project.name)
    .execute(&db.main_pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ExtensionMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn get_installed_extensions(
    db: State<'_, DatabaseManager>,
) -> Result<Vec<ExtensionMetadata>, String> {
    sqlx::query_as::<_, ExtensionMetadata>("SELECT id, name, version, enabled FROM extensions")
        .fetch_all(&db.main_pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_extension(
    id: String,
    enabled: bool,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    sqlx::query("UPDATE extensions SET enabled = ? WHERE id = ?")
        .bind(enabled)
        .bind(id)
        .execute(&db.main_pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_workspace_state(
    workspace_id: String,
    db: State<'_, DatabaseManager>,
) -> Result<Vec<WorkspaceBuffer>, String> {
    sqlx::query_as::<_, WorkspaceBuffer>(
        "SELECT * FROM workspace_buffers WHERE workspace_id = ? ORDER BY order_index ASC"
    )
    .bind(workspace_id)
    .fetch_all(&db.workspace_pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_workspace_state(
    buffers: Vec<WorkspaceBuffer>,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    if buffers.is_empty() { return Ok(()); }
    
    let workspace_id = &buffers[0].workspace_id;
    
    // Use a transaction for atomic update
    let mut tx = db.workspace_pool.begin().await.map_err(|e| e.to_string())?;
    
    // Clear old state for this workspace
    sqlx::query("DELETE FROM workspace_buffers WHERE workspace_id = ?")
        .bind(workspace_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    // Insert new state
    for buffer in buffers {
        sqlx::query(
            "INSERT INTO workspace_buffers 
            (workspace_id, file_path, cursor_line, cursor_column, scroll_top, is_active, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(buffer.workspace_id)
        .bind(buffer.file_path)
        .bind(buffer.cursor_line)
        .bind(buffer.cursor_column)
        .bind(buffer.scroll_top)
        .bind(buffer.is_active)
        .bind(buffer.order_index)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_unsaved_buffer(
    buffer_id: String,
    content: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO unsaved_content (buffer_id, content, last_modified)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(buffer_id) DO UPDATE SET
            content = excluded.content,
            last_modified = CURRENT_TIMESTAMP"
    )
    .bind(buffer_id)
    .bind(content)
    .execute(&db.workspace_pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_unsaved_buffer(
    buffer_id: String,
    db: State<'_, DatabaseManager>,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT content FROM unsaved_content WHERE buffer_id = ?")
        .bind(buffer_id)
        .fetch_optional(&db.workspace_pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(row.map(|r| r.0))
}

#[tauri::command]
pub async fn get_user_setting(
    key: String,
    db: State<'_, DatabaseManager>,
) -> Result<Option<String>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value_json FROM user_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(&db.main_pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(row.map(|r| r.0))
}

#[tauri::command]
pub async fn set_user_setting(
    key: String,
    value_json: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO user_settings (key, value_json)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json"
    )
    .bind(key)
    .bind(value_json)
    .execute(&db.main_pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}
