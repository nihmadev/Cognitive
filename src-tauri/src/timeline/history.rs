use std::fs;
use std::path::{Path, PathBuf};
use std::io::{Read, Write};
use chrono::{Utc, TimeZone, Local};
use sha2::{Sha256, Digest};
use flate2::write::GzEncoder;
use flate2::read::GzDecoder;
use flate2::Compression;
use crate::timeline::types::{TimelineEntry, FileTimeline, TimelineDiff};

const TIMELINE_DIR: &str = ".timeline";
const MAX_ENTRIES_PER_FILE: usize = 50;

fn get_timeline_dir(workspace: &str) -> PathBuf {
    Path::new(workspace).join(TIMELINE_DIR)
}

fn get_file_history_dir(workspace: &str, file_path: &str) -> PathBuf {
    let mut hasher = Sha256::new();
    hasher.update(file_path.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    get_timeline_dir(workspace).join(&hash[..16])
}

fn compute_content_hash(content: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    format!("{:x}", hasher.finalize())[..12].to_string()
}

fn compress_content(content: &[u8]) -> Result<Vec<u8>, String> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(content).map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())
}

fn decompress_content(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoder = GzDecoder::new(data);
    let mut result = Vec::new();
    decoder.read_to_end(&mut result).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn timeline_save_snapshot(workspace: String, file_path: String, content: String) -> Result<TimelineEntry, String> {
    let history_dir = get_file_history_dir(&workspace, &file_path);
    fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    
    let content_bytes = content.as_bytes();
    let content_hash = compute_content_hash(content_bytes);
    let timestamp = Utc::now().timestamp_millis();
    let id = format!("{}_{}", timestamp, &content_hash);
    
    // Check if identical content already exists (skip duplicate saves)
    let entries = list_entries(&history_dir)?;
    if let Some(last) = entries.first() {
        if last.hash == content_hash {
            return Ok(last.clone());
        }
    }
    
    // Compress and save
    let compressed = compress_content(content_bytes)?;
    let snapshot_path = history_dir.join(format!("{}.gz", id));
    fs::write(&snapshot_path, &compressed).map_err(|e| e.to_string())?;
    
    // Save metadata
    let meta_path = history_dir.join("meta.json");
    let mut meta: serde_json::Value = if meta_path.exists() {
        let data = fs::read_to_string(&meta_path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or(serde_json::json!({"file_path": file_path}))
    } else {
        serde_json::json!({"file_path": file_path})
    };
    meta["file_path"] = serde_json::json!(file_path);
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap()).ok();
    
    // Cleanup old entries if exceeds limit
    cleanup_old_entries(&history_dir, MAX_ENTRIES_PER_FILE)?;
    
    let date = Local.timestamp_millis_opt(timestamp)
        .single()
        .map(|dt| dt.format("%b %d, %Y %H:%M:%S").to_string())
        .unwrap_or_default();
    
    Ok(TimelineEntry {
        id,
        timestamp,
        date,
        size: content_bytes.len() as u64,
        hash: content_hash,
    })
}

#[tauri::command]
pub fn timeline_get_history(workspace: String, file_path: String) -> Result<FileTimeline, String> {
    let history_dir = get_file_history_dir(&workspace, &file_path);
    
    if !history_dir.exists() {
        return Ok(FileTimeline {
            file_path,
            entries: vec![],
        });
    }
    
    let entries = list_entries(&history_dir)?;
    
    Ok(FileTimeline {
        file_path,
        entries,
    })
}

fn list_entries(history_dir: &Path) -> Result<Vec<TimelineEntry>, String> {
    let mut entries = Vec::new();
    
    let dir_entries = fs::read_dir(history_dir).map_err(|e| e.to_string())?;
    
    for entry in dir_entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "gz").unwrap_or(false) {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                let parts: Vec<&str> = stem.split('_').collect();
                if parts.len() >= 2 {
                    if let Ok(timestamp) = parts[0].parse::<i64>() {
                        let hash = parts[1].to_string();
                        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                        
                        let date = Local.timestamp_millis_opt(timestamp)
                            .single()
                            .map(|dt| dt.format("%b %d, %Y %H:%M:%S").to_string())
                            .unwrap_or_default();
                        
                        entries.push(TimelineEntry {
                            id: stem.to_string(),
                            timestamp,
                            date,
                            size,
                            hash,
                        });
                    }
                }
            }
        }
    }
    
    // Sort by timestamp descending (newest first)
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(entries)
}

fn cleanup_old_entries(history_dir: &Path, max_entries: usize) -> Result<(), String> {
    let entries = list_entries(history_dir)?;
    
    if entries.len() > max_entries {
        for entry in entries.iter().skip(max_entries) {
            let path = history_dir.join(format!("{}.gz", entry.id));
            fs::remove_file(path).ok();
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn timeline_get_content(workspace: String, file_path: String, entry_id: String) -> Result<String, String> {
    let history_dir = get_file_history_dir(&workspace, &file_path);
    let snapshot_path = history_dir.join(format!("{}.gz", entry_id));
    
    if !snapshot_path.exists() {
        return Err(format!("Snapshot {} not found", entry_id));
    }
    
    let compressed = fs::read(&snapshot_path).map_err(|e| e.to_string())?;
    let content = decompress_content(&compressed)?;
    
    String::from_utf8(content).map_err(|_| "Content is not valid UTF-8".to_string())
}

#[tauri::command]
pub fn timeline_get_diff(workspace: String, file_path: String, old_id: String, new_id: String) -> Result<TimelineDiff, String> {
    let old_content = timeline_get_content(workspace.clone(), file_path.clone(), old_id.clone())?;
    let new_content = timeline_get_content(workspace, file_path, new_id.clone())?;
    
    Ok(TimelineDiff {
        old_content,
        new_content,
        old_id,
        new_id,
    })
}

#[tauri::command]
pub fn timeline_restore(workspace: String, file_path: String, entry_id: String) -> Result<String, String> {
    let content = timeline_get_content(workspace.clone(), file_path.clone(), entry_id)?;
    
    // Save current state before restore
    let current_path = Path::new(&workspace).join(&file_path);
    if current_path.exists() {
        let current_content = fs::read_to_string(&current_path).map_err(|e| e.to_string())?;
        timeline_save_snapshot(workspace.clone(), file_path.clone(), current_content)?;
    }
    
    // Write restored content
    fs::write(&current_path, &content).map_err(|e| e.to_string())?;
    
    Ok(content)
}

#[tauri::command]
pub fn timeline_delete_entry(workspace: String, file_path: String, entry_id: String) -> Result<(), String> {
    let history_dir = get_file_history_dir(&workspace, &file_path);
    let snapshot_path = history_dir.join(format!("{}.gz", entry_id));
    
    fs::remove_file(snapshot_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn timeline_clear_history(workspace: String, file_path: String) -> Result<(), String> {
    let history_dir = get_file_history_dir(&workspace, &file_path);
    
    if history_dir.exists() {
        fs::remove_dir_all(&history_dir).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}
