mod parser;

use serde::{Deserialize, Serialize};
use std::path::Path;

pub use parser::{parse_outline, parse_outline_from_content};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineSymbol {
    pub name: String,
    pub kind: SymbolKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    pub range: Range,
    pub selection_range: Range,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<OutlineSymbol>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SymbolKind {
    File,
    Module,
    Namespace,
    Package,
    Class,
    Method,
    Property,
    Field,
    Constructor,
    Enum,
    Interface,
    Function,
    Variable,
    Constant,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Key,
    Null,
    EnumMember,
    Struct,
    Event,
    Operator,
    TypeParameter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Range {
    pub start_line: u32,
    pub start_column: u32,
    pub end_line: u32,
    pub end_column: u32,
}

fn is_supported_extension(ext: &str) -> bool {
    matches!(ext, "js" | "jsx" | "ts" | "tsx" | "mjs" | "cjs" | "mts" | "cts")
}

#[tauri::command]
pub fn get_outline(file_path: String) -> Result<Vec<OutlineSymbol>, String> {
    let path = Path::new(&file_path);
    
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    if is_supported_extension(ext) {
        parse_outline(&file_path).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}

/// Parse outline from content string (for unsaved files)
#[tauri::command]
pub fn get_outline_from_content(file_path: String, content: String) -> Result<Vec<OutlineSymbol>, String> {
    let path = Path::new(&file_path);
    
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    if is_supported_extension(ext) {
        parse_outline_from_content(&file_path, &content).map_err(|e| e.to_string())
    } else {
        Ok(vec![])
    }
}
