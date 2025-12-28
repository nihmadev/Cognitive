use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::types::SettingsChangeEvent;

/// File watcher for settings files
pub struct SettingsWatcher {
    watcher: Option<RecommendedWatcher>,
    watched_paths: Vec<PathBuf>,
}

impl SettingsWatcher {
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_paths: Vec::new(),
        }
    }

    /// Start watching settings files
    pub fn start(&mut self, app_handle: AppHandle, paths: Vec<PathBuf>) -> Result<(), String> {
        let (tx, rx) = channel();

        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        }).map_err(|e| format!("Failed to create watcher: {}", e))?;

        // Watch each path
        for path in &paths {
            if let Some(parent) = path.parent() {
                if parent.exists() {
                    watcher.watch(parent, RecursiveMode::NonRecursive)
                        .map_err(|e| format!("Failed to watch {}: {}", parent.display(), e))?;
                }
            }
        }

        self.watcher = Some(watcher);
        self.watched_paths = paths.clone();

        // Spawn event handler thread
        let watched_paths = paths;
        std::thread::spawn(move || {
            Self::handle_events(rx, app_handle, watched_paths);
        });

        Ok(())
    }

    /// Handle file system events
    fn handle_events(rx: Receiver<Event>, app_handle: AppHandle, watched_paths: Vec<PathBuf>) {
        // Debounce timer
        let mut last_event_time = std::time::Instant::now();
        let debounce_duration = Duration::from_millis(100);

        loop {
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(event) => {
                    // Check if event is for our settings files
                    let is_settings_file = event.paths.iter().any(|p| {
                        watched_paths.iter().any(|wp| p == wp)
                    });

                    if !is_settings_file {
                        continue;
                    }

                    // Only handle modify/create events
                    match event.kind {
                        EventKind::Modify(_) | EventKind::Create(_) => {
                            // Debounce
                            let now = std::time::Instant::now();
                            if now.duration_since(last_event_time) < debounce_duration {
                                continue;
                            }
                            last_event_time = now;

                            // Determine source based on path
                            let source = if event.paths.iter().any(|p| {
                                p.to_string_lossy().contains(".colbex")
                            }) {
                                "workspace"
                            } else {
                                "user"
                            };

                            // Emit event to all windows
                            let change_event = SettingsChangeEvent {
                                section: "all".to_string(),
                                key: None,
                                value: serde_json::json!({ "reload": true }),
                                source: super::types::SettingsSource::FileWatch,
                            };

                            let _ = app_handle.emit("settings-file-changed", &change_event);
                        }
                        _ => {}
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // Continue waiting
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    // Channel closed, exit thread
                    break;
                }
            }
        }
    }

    /// Add a new path to watch
    pub fn add_path(&mut self, path: PathBuf) -> Result<(), String> {
        if let Some(ref mut watcher) = self.watcher {
            if let Some(parent) = path.parent() {
                if parent.exists() {
                    watcher.watch(parent, RecursiveMode::NonRecursive)
                        .map_err(|e| format!("Failed to watch {}: {}", parent.display(), e))?;
                    self.watched_paths.push(path);
                }
            }
        }
        Ok(())
    }

    /// Remove a path from watching
    pub fn remove_path(&mut self, path: &PathBuf) -> Result<(), String> {
        if let Some(ref mut watcher) = self.watcher {
            if let Some(parent) = path.parent() {
                let _ = watcher.unwatch(parent);
                self.watched_paths.retain(|p| p != path);
            }
        }
        Ok(())
    }

    /// Stop watching all paths
    pub fn stop(&mut self) {
        self.watcher = None;
        self.watched_paths.clear();
    }
}

impl Default for SettingsWatcher {
    fn default() -> Self {
        Self::new()
    }
}
