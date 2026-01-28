use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::SystemTime;
use ignore::WalkBuilder;
use rayon::prelude::*;
use fuzzy_matcher::FuzzyMatcher;
use fuzzy_matcher::skim::SkimMatcherV2;
use crate::outline::parse_outline;
use crate::outline::OutlineSymbol;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexedSymbol {
    pub name: String,
    pub parent_name: Option<String>,
    pub kind: String,
    pub detail: Option<String>,
    pub file_path: String,
    pub start_line: u32,
    pub end_line: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub last_modified: u64,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct IndexData {
    pub file_symbols: HashMap<String, Vec<IndexedSymbol>>,
    pub flat_symbols: Vec<IndexedSymbol>,
    pub file_outline_cache: HashMap<String, Vec<OutlineSymbol>>,
    pub file_metadata: HashMap<String, FileMetadata>,
}

pub struct RagEngine {
    index: Arc<RwLock<IndexData>>,
}

impl RagEngine {
    pub fn new() -> Self {
        Self {
            index: Arc::new(RwLock::new(IndexData::default())),
        }
    }

    fn get_index_path(&self, workspace: &Path) -> PathBuf {
        workspace.join(".cognitive").join("symbols-v1.bin")
    }

    pub async fn load_or_index(&self, workspace_path: &Path) -> anyhow::Result<()> {
        let index_path = self.get_index_path(workspace_path);
        
        if index_path.exists() {
            match fs::read(&index_path) {
                Ok(data) => {
                    if let Ok(loaded_index) = bincode::deserialize::<IndexData>(&data) {
                        // Load index into memory
                        {
                            let mut index = self.index.write().map_err(|_| anyhow::anyhow!("Failed to acquire write lock"))?;
                            *index = loaded_index;
                        }
                        return self.index_workspace(workspace_path).await;
                    }
                }
                Err(_e) => {},
            }
        }
        
        // Full index if no file exists
        self.index_workspace(workspace_path).await
    }

    pub async fn index_workspace(&self, workspace_path: &Path) -> anyhow::Result<()> {
        let mut new_metadata = HashMap::new();
        let mut new_file_symbols = HashMap::new();
        let mut new_outline_cache = HashMap::new();
        
        // 1. Collect all potential files
        let files: Vec<PathBuf> = WalkBuilder::new(workspace_path)
            .hidden(false)
            .git_ignore(true)
            .build()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|ft| ft.is_file()).unwrap_or(false))
            .map(|e| e.into_path())
            .filter(|p| {
                if let Some(ext) = p.extension() {
                    let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                    matches!(ext_str.as_str(), 
                        "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" | "mts" | "cts" |
                        "rs" | "py" | "go" | "c" | "cpp" | "h" | "hpp" | "cs" | "java" |
                        "md" | "json" | "yml" | "yaml" | "toml" | "sh" | "sql"
                    )
                } else {
                    false
                }
            })
            .collect();

        let current_data = {
            let read_lock = self.index.read().unwrap();
            (
                read_lock.file_metadata.clone(), 
                read_lock.file_symbols.clone(),
                read_lock.file_outline_cache.clone()
            )
        };
        let (old_metadata, mut old_file_symbols, mut old_outline_cache) = current_data;

        // 2. Process files in parallel
        let results: Vec<(String, FileMetadata, Option<(Vec<IndexedSymbol>, Vec<OutlineSymbol>)>)> = files.into_par_iter().filter_map(|path| {
            let path_str = path.to_str()?.to_string();
            let meta = fs::metadata(&path).ok()?;
            let mtime = meta.modified().ok()?.duration_since(SystemTime::UNIX_EPOCH).ok()?.as_secs();
            let size = meta.len();
            
            let should_reindex = if let Some(old_meta) = old_metadata.get(&path_str) {
                old_meta.last_modified != mtime || old_meta.size != size
            } else {
                true
            };

            let file_meta = FileMetadata { last_modified: mtime, size };

            if should_reindex {
                if let Ok(file_symbols) = parse_outline(&path_str) {
                    let mut file_indexed_symbols = Vec::new();
                    self.flatten_symbols(&file_symbols, &path, None, &mut file_indexed_symbols);
                    Some((path_str, file_meta, Some((file_indexed_symbols, file_symbols))))
                } else {
                    Some((path_str, file_meta, None))
                }
            } else {
                Some((path_str, file_meta, None))
            }
        }).collect();

        // 3. Merge results and clean up deleted files
        for (path_str, meta, result_data) in results {
            new_metadata.insert(path_str.clone(), meta);
            
            if let Some((indexed, raw_outline)) = result_data {
                new_file_symbols.insert(path_str.clone(), indexed);
                new_outline_cache.insert(path_str, raw_outline);
            } else {
                // Keep existing data
                if let Some(existing_symbols) = old_file_symbols.remove(&path_str) {
                    new_file_symbols.insert(path_str.clone(), existing_symbols);
                }
                if let Some(existing_outline) = old_outline_cache.remove(&path_str) {
                    new_outline_cache.insert(path_str, existing_outline);
                }
            }
        }
        
        // Build flat symbols cache
        let flat_symbols: Vec<IndexedSymbol> = new_file_symbols.values()
            .flat_map(|v| v.clone())
            .collect();

        let final_data = IndexData {
            file_symbols: new_file_symbols,
            flat_symbols,
            file_outline_cache: new_outline_cache,
            file_metadata: new_metadata,
        };

        // 4. Update memory
        {
            let mut index = self.index.write().map_err(|_| anyhow::anyhow!("Failed to acquire write lock"))?;
            *index = final_data.clone();
        }

        // 5. Persist to disk
        let index_path = self.get_index_path(workspace_path);
        if let Some(parent) = index_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        if let Ok(bytes) = bincode::serialize(&final_data) {
            fs::write(index_path, bytes)?;
        }

        Ok(())
    }

    fn flatten_symbols(&self, symbols: &[OutlineSymbol], path: &Path, parent_name: Option<String>, result: &mut Vec<IndexedSymbol>) {
        let file_path = path.to_str().unwrap_or_default().to_string();
        for sym in symbols {
            result.push(IndexedSymbol {
                name: sym.name.clone(),
                parent_name: parent_name.clone(),
                kind: format!("{:?}", sym.kind),
                detail: sym.detail.clone(),
                file_path: file_path.clone(),
                start_line: sym.range.start_line,
                end_line: sym.range.end_line,
            });

            if let Some(children) = &sym.children {
                self.flatten_symbols(children, path, Some(sym.name.clone()), result);
            }
        }
    }

    pub fn search(&self, query: &str) -> Vec<IndexedSymbol> {
        let index = self.index.read().unwrap_or_else(|_| self.index.read().unwrap());
        let matcher = SkimMatcherV2::default();
        
        // Parse query for potential path filters (e.g., "login in store")
        let mut actual_query = query.to_string();
        let mut path_filter = None;
        
        if let Some(in_idx) = query.to_lowercase().rfind(" in ") {
            let (q, p) = query.split_at(in_idx);
            actual_query = q.trim().to_string();
            path_filter = Some(p[4..].trim().to_lowercase());
        }
        
        let query_lower = actual_query.to_lowercase();
        let is_short = actual_query.len() < 3;
        
        // Use flat_symbols for O(1) access to symbol list
        let mut scored_results: Vec<(i64, IndexedSymbol)> = index.flat_symbols.iter()
            .filter_map(|sym| {
                let mut score = 0;
                
                // Path filtering
                if let Some(filter) = &path_filter {
                    if !sym.file_path.to_lowercase().contains(filter) {
                        return None;
                    }
                    score += 100; // Boost for matching path filter
                }

                if is_short {
                    // Optimized for short queries: exact or prefix only
                    if sym.name == actual_query {
                        score += 1000;
                    } else if sym.name.starts_with(&actual_query) {
                        score += 500;
                    } else {
                        return None;
                    }
                } else {
                    // Fuzzy match for longer queries
                    let name_score = matcher.fuzzy_match(&sym.name, &actual_query).unwrap_or(0);
                    if name_score > 0 {
                        if sym.name == actual_query {
                            score += 1000;
                        } else if sym.name.to_lowercase() == query_lower {
                            score += 800;
                        } else if sym.name.starts_with(&actual_query) {
                            score += 500;
                        } else {
                            score += name_score;
                        }
                    } else if sym.detail.as_ref().map(|d| d.to_lowercase().contains(&query_lower)).unwrap_or(false) {
                        score += 50;
                    } else if sym.file_path.to_lowercase().contains(&query_lower) {
                        // Match against file path if not matching symbol name
                        score += 30;
                    } else {
                        return None;
                    }
                }

                // Boost based on kind
                match sym.kind.as_str() {
                    "Class" | "Interface" | "Struct" => score += 150,
                    "Function" | "Method" => score += 100,
                    _ => {}
                }

                // Parent name boost
                if let Some(parent) = &sym.parent_name {
                    if parent.to_lowercase().contains(&query_lower) {
                        score += 50;
                    }
                }
                
                // Filename boost - symbols in files that match the query name are often what's wanted
                let filename = Path::new(&sym.file_path).file_name().and_then(|f| f.to_str()).unwrap_or("");
                if filename.to_lowercase().contains(&query_lower) {
                    score += 100;
                }

                Some((score, sym.clone()))
            })
            .collect();

        // Sort results by score (descending)
        scored_results.sort_by(|a, b| b.0.cmp(&a.0));

        let mut seen = HashMap::new();
        let mut unique_results = Vec::new();

        for (_score, sym) in scored_results {
            let key = format!("{}:{}:{}", sym.name, sym.kind, sym.file_path);
            if !seen.contains_key(&key) {
                seen.insert(key, true);
                unique_results.push(sym);
            }
            if unique_results.len() >= 50 {
                break;
            }
        }

        unique_results
    }
}
