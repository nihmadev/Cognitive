use std::fs;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use grep_matcher::Matcher;
use grep_regex::RegexMatcherBuilder;
use grep_searcher::{Searcher, SearcherBuilder, Sink, SinkMatch};
use ignore::WalkBuilder;
use tauri::Window;
use tauri_plugin_dialog::DialogExt;

use super::glob_utils::{build_globset, is_ignored_dir};
use super::search::{build_search_regex, preserve_case};
use super::types::*;

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            children: None,
        });
    }

    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.cmp(&b.name)
        } else {
            b.is_dir.cmp(&a.is_dir)
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}


#[tauri::command]
pub fn get_asset_url(path: String) -> String {
    let normalized_path = path.replace("\\", "/");
    format!("asset://localhost/{}", normalized_path)
}

#[tauri::command]
pub async fn open_file_dialog(window: Window) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    window
        .dialog()
        .file()
        .add_filter("All Files", &["*"])
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| match p {
                tauri_plugin_dialog::FilePath::Path(path) => path.to_string_lossy().to_string(),
                tauri_plugin_dialog::FilePath::Url(url) => url.to_string(),
            }));
        });

    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_folder_dialog(window: Window) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    window.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| match p {
            tauri_plugin_dialog::FilePath::Path(path) => path.to_string_lossy().to_string(),
            tauri_plugin_dialog::FilePath::Url(url) => url.to_string(),
        }));
    });

    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_terminal() -> Result<(), String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "start", "cmd"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args(&["-e", "tell application \"Terminal\" to activate"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("gnome-terminal")
            .spawn()
            .or_else(|_| Command::new("xterm").spawn())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

const MAX_TOTAL_MATCHES: usize = 10000;
const MAX_MATCHES_PER_FILE: usize = 1000;

// Sink for grep-searcher that collects matches
struct MatchSink<'a, M: Matcher> {
    matches: Vec<SearchMatch>,
    max_matches: usize,
    total_counter: Arc<AtomicUsize>,
    max_total: usize,
    matcher: &'a M,
}

impl<'a, M: Matcher> Sink for MatchSink<'a, M> {
    type Error = std::io::Error;

    fn matched(&mut self, _searcher: &Searcher, mat: &SinkMatch<'_>) -> Result<bool, Self::Error> {
        // Check limits
        if self.matches.len() >= self.max_matches {
            return Ok(false);
        }
        if self.total_counter.load(Ordering::Relaxed) >= self.max_total {
            return Ok(false);
        }

        let line_bytes = mat.bytes();
        let line_text_full = String::from_utf8_lossy(line_bytes);
        let line_text_full = line_text_full.trim_end_matches('\n').trim_end_matches('\r');
        
        let line_num = mat.line_number().unwrap_or(1) as u32;

        // Find all matches within this line
        let mut byte_offset = 0;
        while byte_offset < line_bytes.len() {
            if self.matches.len() >= self.max_matches {
                break;
            }
            if self.total_counter.load(Ordering::Relaxed) >= self.max_total {
                break;
            }

            match self.matcher.find(&line_bytes[byte_offset..]) {
                Ok(Some(m)) => {
                    let char_start = (byte_offset + m.start()) as u32;
                    let char_end = (byte_offset + m.end()) as u32;
                    
                    let line_text = if line_text_full.len() > 400 {
                        format!("{}...", &line_text_full[..400])
                    } else {
                        line_text_full.to_string()
                    };

                    self.matches.push(SearchMatch {
                        line: line_num,
                        char_start,
                        char_end,
                        line_text,
                    });
                    
                    self.total_counter.fetch_add(1, Ordering::Relaxed);
                    byte_offset += m.end().max(1); // Move past this match
                }
                _ => break,
            }
        }
        
        Ok(true)
    }
}

#[tauri::command]
pub async fn search_in_files(
    root_path: String,
    options: SearchOptions,
) -> Result<Vec<SearchResult>, String> {
    tokio::task::spawn_blocking(move || {
        let include_set = build_globset(&options.include_pattern)?;
        let exclude_set = build_globset(&options.exclude_pattern)?;
        let filter_set = build_globset(&options.filter_pattern)?;
        
        // Build grep-regex matcher (same as ripgrep uses)
        let mut pattern = options.query.clone();
        if !options.is_regex {
            pattern = regex::escape(&pattern);
        }
        if options.is_whole_word {
            pattern = format!(r"\b{}\b", pattern);
        }
        
        let matcher = RegexMatcherBuilder::new()
            .case_insensitive(!options.is_case_sensitive)
            .multi_line(true)
            .build(&pattern)
            .map_err(|e| e.to_string())?;
        
        let matcher = Arc::new(matcher);
        let total_matches = Arc::new(AtomicUsize::new(0));

        // Use parallel walker from ignore crate
        let (tx, rx) = std::sync::mpsc::channel();
        
        let walker = WalkBuilder::new(&root_path)
            .hidden(false)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .threads(num_cpus::get().min(12))
            .build_parallel();

        let include_set = Arc::new(include_set);
        let exclude_set = Arc::new(exclude_set);
        let filter_set = Arc::new(filter_set);

        walker.run(|| {
            let tx = tx.clone();
            let matcher = Arc::clone(&matcher);
            let total_matches = Arc::clone(&total_matches);
            let include_set = Arc::clone(&include_set);
            let exclude_set = Arc::clone(&exclude_set);
            let filter_set = Arc::clone(&filter_set);

            Box::new(move |entry| {
                use ignore::WalkState;
                
                if total_matches.load(Ordering::Relaxed) >= MAX_TOTAL_MATCHES {
                    return WalkState::Quit;
                }

                let entry = match entry {
                    Ok(e) => e,
                    Err(_) => return WalkState::Continue,
                };

                if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                    return WalkState::Continue;
                }

                let path = entry.path();

                if path.iter().any(|c| is_ignored_dir(c)) {
                    return WalkState::Continue;
                }

                if let Some(ex) = exclude_set.as_ref() {
                    if ex.is_match(path) {
                        return WalkState::Continue;
                    }
                }
                if let Some(inc) = include_set.as_ref() {
                    if !inc.is_match(path) {
                        return WalkState::Continue;
                    }
                }
                if let Some(flt) = filter_set.as_ref() {
                    if !flt.is_match(path) {
                        return WalkState::Continue;
                    }
                }

                // Search using grep-searcher with mmap
                let mut searcher = SearcherBuilder::new()
                    .binary_detection(grep_searcher::BinaryDetection::quit(0))
                    .line_number(true)
                    .build();

                let mut sink = MatchSink {
                    matches: Vec::new(),
                    max_matches: MAX_MATCHES_PER_FILE,
                    total_counter: Arc::clone(&total_matches),
                    max_total: MAX_TOTAL_MATCHES,
                    matcher: &*matcher,
                };

                if searcher.search_path(&*matcher, path, &mut sink).is_ok() && !sink.matches.is_empty() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    let _ = tx.send(SearchResult {
                        file: SearchFile {
                            name: file_name,
                            path: path.to_string_lossy().to_string(),
                        },
                        matches: sink.matches,
                    });
                }

                WalkState::Continue
            })
        });

        drop(tx);
        let results: Vec<SearchResult> = rx.into_iter().collect();
        Ok(results)
    })
    .await
    .map_err(|e| format!("Search task failed: {}", e))?
}


#[tauri::command]
pub async fn replace_all(
    root_path: String,
    options: SearchOptions,
    replace_query: String,
    preserve_case_flag: bool,
) -> Result<ReplaceAllResult, String> {
    tokio::task::spawn_blocking(move || {
        let include_set = build_globset(&options.include_pattern)?;
        let exclude_set = build_globset(&options.exclude_pattern)?;
        let filter_set = build_globset(&options.filter_pattern)?;
        let re = build_search_regex(&options)?;

        // Collect files first
        let files: Vec<_> = WalkBuilder::new(&root_path)
            .hidden(false)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .build()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|ft| ft.is_file()).unwrap_or(false))
            .filter(|e| {
                let path = e.path();
                
                if path.iter().any(|c| is_ignored_dir(c)) {
                    return false;
                }
                
                if let Some(ex) = &exclude_set {
                    if ex.is_match(path) {
                        return false;
                    }
                }
                if let Some(inc) = &include_set {
                    if !inc.is_match(path) {
                        return false;
                    }
                }
                if let Some(flt) = &filter_set {
                    if !flt.is_match(path) {
                        return false;
                    }
                }
                
                true
            })
            .collect();

        // Process replacements (sequential for file writes to avoid conflicts)
        let mut total_replacements: u64 = 0;
        let mut files_changed: u32 = 0;

        for entry in files {
            let path = entry.path();

            let content = match fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let mut changed = false;
            let mut replacements_in_file: u64 = 0;

            let new_content = re
                .replace_all(&content, |caps: &regex::Captures| {
                    replacements_in_file += 1;
                    changed = true;
                    let matched = caps.get(0).map(|m| m.as_str()).unwrap_or("");
                    if preserve_case_flag {
                        preserve_case(&replace_query, matched)
                    } else {
                        replace_query.clone()
                    }
                })
                .to_string();

            if changed {
                fs::write(path, new_content).map_err(|e| e.to_string())?;
                total_replacements += replacements_in_file;
                files_changed += 1;
            }
        }

        Ok(ReplaceAllResult {
            total_replacements,
            files_changed,
        })
    })
    .await
    .map_err(|e| format!("Replace task failed: {}", e))?
}

#[tauri::command]
pub async fn get_all_files(root_path: String) -> Result<Vec<SearchFile>, String> {
    tokio::task::spawn_blocking(move || {
        let mut files: Vec<SearchFile> = WalkBuilder::new(&root_path)
            .hidden(false)
            .git_ignore(true)
            .git_global(true)
            .git_exclude(true)
            .build()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|ft| ft.is_file()).unwrap_or(false))
            .filter(|e| !e.path().iter().any(|c| is_ignored_dir(c)))
            .map(|entry| {
                let file_name = entry.file_name().to_string_lossy().to_string();
                SearchFile {
                    name: file_name,
                    path: entry.path().to_string_lossy().to_string(),
                }
            })
            .collect();

        files.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(files)
    })
    .await
    .map_err(|e| format!("Get all files task failed: {}", e))?
}


// File size command
#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    Ok(metadata.len())
}

// Read file binary in chunks
#[tauri::command]
pub fn read_file_binary_chunked(path: String, offset: u64, chunk_size: u64) -> Result<Vec<u8>, String> {
    use std::io::{Read, Seek, SeekFrom};
    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    let mut buffer = vec![0u8; chunk_size as usize];
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    buffer.truncate(bytes_read);
    Ok(buffer)
}

// Create file
#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    std::fs::File::create(&path).map_err(|e| e.to_string())?;
    Ok(())
}

// Create folder
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

// Rename path
#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

// Rename file with result
#[tauri::command]
pub fn rename_file_with_result(old_path: String, new_path: String) -> Result<String, String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path)
}

// Delete path
#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

// Save file dialog
#[tauri::command]
pub async fn save_file_dialog(window: Window, default_name: Option<String>) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    let mut dialog = window.dialog().file();
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }
    
    dialog.save_file(move |path| {
        let _ = tx.send(path.map(|p| match p {
            tauri_plugin_dialog::FilePath::Path(path) => path.to_string_lossy().to_string(),
            tauri_plugin_dialog::FilePath::Url(url) => url.to_string(),
        }));
    });

    rx.recv().map_err(|e| e.to_string())
}

// Open new window
#[tauri::command]
pub fn open_new_window(workspace_path: Option<String>) -> Result<(), String> {
    use std::process::Command;
    
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut cmd = Command::new(current_exe);
    
    if let Some(path) = workspace_path {
        cmd.arg("--workspace").arg(path);
    }
    
    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

// File watcher state
use std::sync::Mutex;
use std::collections::HashMap;

pub struct FileWatcherState {
    pub watchers: Mutex<HashMap<String, notify::RecommendedWatcher>>,
}

impl Default for FileWatcherState {
    fn default() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn start_file_watcher(
    window: Window,
    path: String,
    state: tauri::State<'_, FileWatcherState>,
) -> Result<(), String> {
    use notify::{Watcher, RecursiveMode};
use tauri::Emitter;
use serde::Serialize;

#[derive(Serialize, Clone)]
struct FileChangeEvent {
    kind: String,
    paths: Vec<String>,
}
    
    let window_clone = window.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        if let Ok(event) = res {
            let file_event = FileChangeEvent {
                kind: format!("{:?}", event.kind),
                paths: event.paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
            };
            let _ = window_clone.emit("file-change", &file_event);
        }
    }).map_err(|e| e.to_string())?;
    
    watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    
    state.watchers.lock().unwrap().insert(path, watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_file_watcher(path: String, state: tauri::State<'_, FileWatcherState>) -> Result<(), String> {
    state.watchers.lock().unwrap().remove(&path);
    Ok(())
}

#[tauri::command]
pub fn add_watch_path(
    path: String,
    watch_path: String,
    state: tauri::State<'_, FileWatcherState>,
) -> Result<(), String> {
    use notify::{Watcher, RecursiveMode};
    
    let mut watchers = state.watchers.lock().unwrap();
    if let Some(watcher) = watchers.get_mut(&path) {
        watcher.watch(std::path::Path::new(&watch_path), RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Audio cache
use std::time::{Duration, Instant};

pub struct AudioCacheEntry {
    pub data: Vec<u8>,
    pub created_at: Instant,
}

pub struct AudioCache {
    pub cache: Mutex<HashMap<String, AudioCacheEntry>>,
    pub max_entries: usize,
    pub ttl_hours: u64,
}

impl AudioCache {
    pub fn new(max_entries: usize, ttl_hours: u64) -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
            max_entries,
            ttl_hours,
        }
    }
}

#[tauri::command]
pub fn get_cached_audio(key: String, state: tauri::State<'_, AudioCache>) -> Result<Option<Vec<u8>>, String> {
    let cache = state.cache.lock().unwrap();
    if let Some(entry) = cache.get(&key) {
        let ttl = Duration::from_secs(state.ttl_hours * 3600);
        if entry.created_at.elapsed() < ttl {
            return Ok(Some(entry.data.clone()));
        }
    }
    Ok(None)
}

#[tauri::command]
pub fn cache_audio(key: String, data: Vec<u8>, state: tauri::State<'_, AudioCache>) -> Result<(), String> {
    let mut cache = state.cache.lock().unwrap();
    
    // Clean up expired entries if at capacity
    if cache.len() >= state.max_entries {
        let ttl = Duration::from_secs(state.ttl_hours * 3600);
        cache.retain(|_, v| v.created_at.elapsed() < ttl);
    }
    
    cache.insert(key, AudioCacheEntry {
        data,
        created_at: Instant::now(),
    });
    Ok(())
}

#[tauri::command]
pub fn clear_audio_cache(state: tauri::State<'_, AudioCache>) -> Result<(), String> {
    state.cache.lock().unwrap().clear();
    Ok(())
}

#[tauri::command]
pub fn get_audio_cache_stats(state: tauri::State<'_, AudioCache>) -> Result<serde_json::Value, String> {
    let cache = state.cache.lock().unwrap();
    Ok(serde_json::json!({
        "entries": cache.len(),
        "max_entries": state.max_entries,
        "ttl_hours": state.ttl_hours
    }))
}
