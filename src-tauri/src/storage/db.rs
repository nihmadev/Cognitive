use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use anyhow::Result;
use tauri::AppHandle;
use super::paths::PathResolver;

pub struct DatabaseManager {
    pub main_pool: SqlitePool,
    pub workspace_pool: SqlitePool,
}

impl DatabaseManager {
    pub async fn new(app: &AppHandle) -> Result<Self> {
        PathResolver::ensure_dirs(app)?;

        let main_db_path = PathResolver::main_db_path(app);
        let workspace_db_path = PathResolver::workspace_db_path(app);

        let main_pool = Self::init_pool(&main_db_path).await?;
        let workspace_pool = Self::init_pool(&workspace_db_path).await?;

        let manager = Self {
            main_pool,
            workspace_pool,
        };

        manager.run_migrations().await?;

        Ok(manager)
    }

    async fn init_pool(path: &Path) -> Result<SqlitePool> {
        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        Ok(pool)
    }

    async fn run_migrations(&self) -> Result<()> {
        // Main DB Migrations
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS schema_versions (
                component TEXT PRIMARY KEY,
                version INTEGER NOT NULL
            )"
        ).execute(&self.main_pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                last_opened DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.main_pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL
            )"
        ).execute(&self.main_pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS extensions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                install_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.main_pool).await?;

        // Workspace States DB Migrations
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS workspace_buffers (
                workspace_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                cursor_line INTEGER NOT NULL DEFAULT 0,
                cursor_column INTEGER NOT NULL DEFAULT 0,
                scroll_top INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT 0,
                order_index INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (workspace_id, file_path)
            )"
        ).execute(&self.workspace_pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS unsaved_content (
                buffer_id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.workspace_pool).await?;

        Ok(())
    }

    // Helper to get version and apply migrations if needed
    // In a real app, you'd use sqlx::migrate! or similar, but for this example
    // we'll keep it simple and manual.
}
