use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Project {
    pub id: String,
    pub path: String,
    pub name: String,
    #[sqlx(default)]
    pub last_opened: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WorkspaceBuffer {
    pub workspace_id: String,
    pub file_path: String,
    pub cursor_line: i64,
    pub cursor_column: i64,
    pub scroll_top: i64,
    pub is_active: bool,
    pub order_index: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct UnsavedBuffer {
    pub buffer_id: String,
    pub content: String,
}
