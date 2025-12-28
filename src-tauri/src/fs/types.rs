use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchOptions {
    pub query: String,
    pub is_case_sensitive: bool,
    pub is_whole_word: bool,
    pub is_regex: bool,
    pub include_pattern: String,
    pub exclude_pattern: String,
    pub filter_pattern: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchMatch {
    pub line: u32,
    pub char_start: u32,
    pub char_end: u32,
    pub line_text: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchFile {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub file: SearchFile,
    pub matches: Vec<SearchMatch>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReplaceAllResult {
    pub total_replacements: u64,
    pub files_changed: u32,
}
