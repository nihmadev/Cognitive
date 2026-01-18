use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use super::types::SettingsChangeEvent;


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

    
    pub fn start(&mut self, app_handle: AppHandle, paths: Vec<PathBuf>) -> Result<(), String> {
        let (tx, rx) = channel();

        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        }).map_err(|e| format!("Failed to create watcher: {}", e))?;

        
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

        
        let watched_paths = paths;
        std::thread::spawn(move || {
            Self::handle_events(rx, app_handle, watched_paths);
        });

        Ok(())
    }

    
    fn handle_events(rx: Receiver<Event>, app_handle: AppHandle, watched_paths: Vec<PathBuf>) {
        
        let mut last_event_time = std::time::Instant::now();
        let debounce_duration = Duration::from_millis(100);

        loop {
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(event) => {
                    
                    let is_settings_file = event.paths.iter().any(|p| {
                        watched_paths.iter().any(|wp| p == wp)
                    });

                    if !is_settings_file {
                        continue;
                    }

                    
                    match event.kind {
                        EventKind::Modify(_) | EventKind::Create(_) => {
                            
                            let now = std::time::Instant::now();
                            if now.duration_since(last_event_time) < debounce_duration {
                                continue;
                            }
                            last_event_time = now;

                            
                            let _source = if event.paths.iter().any(|p| {
                                p.to_string_lossy().contains(".cognitive")
                            }) {
                                "workspace"
                            } else {
                                "user"
                            };

                            
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
                    
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    
                    break;
                }
            }
        }
    }

    
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

    
    pub fn remove_path(&mut self, path: &PathBuf) -> Result<(), String> {
        if let Some(ref mut watcher) = self.watcher {
            if let Some(parent) = path.parent() {
                let _ = watcher.unwatch(parent);
                self.watched_paths.retain(|p| p != path);
            }
        }
        Ok(())
    }

    
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
