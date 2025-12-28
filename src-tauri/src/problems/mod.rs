use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Problem {
    pub id: u32,
    #[serde(rename = "type")]
    pub problem_type: String, // "error" | "warning"
    pub file: String,
    pub path: String,
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub code: Option<String>,
    pub source: String, // "ts" | "eslint"
}

#[derive(Debug, Clone, Serialize)]
pub struct FileProblems {
    pub file: String,
    pub path: String,
    pub problems: Vec<Problem>,
    pub error_count: u32,
    pub warning_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProblemsResult {
    pub files: Vec<FileProblems>,
    pub total_errors: u32,
    pub total_warnings: u32,
}

#[tauri::command]
pub async fn get_problems(project_path: String) -> Result<ProblemsResult, String> {
    let path = Path::new(&project_path);
    
    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    let mut all_problems: Vec<Problem> = Vec::new();
    let mut id_counter: u32 = 1;

    // Try TypeScript first
    if let Ok(ts_problems) = get_typescript_problems(&project_path, &mut id_counter) {
        all_problems.extend(ts_problems);
    }

    // Group problems by file
    let mut files_map: HashMap<String, Vec<Problem>> = HashMap::new();
    
    for problem in all_problems {
        files_map
            .entry(problem.path.clone())
            .or_insert_with(Vec::new)
            .push(problem);
    }

    let mut files: Vec<FileProblems> = files_map
        .into_iter()
        .map(|(path, problems)| {
            let error_count = problems.iter().filter(|p| p.problem_type == "error").count() as u32;
            let warning_count = problems.iter().filter(|p| p.problem_type == "warning").count() as u32;
            let file = Path::new(&path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone());
            
            FileProblems {
                file,
                path,
                problems,
                error_count,
                warning_count,
            }
        })
        .collect();

    // Sort files by path
    files.sort_by(|a, b| a.path.cmp(&b.path));

    let total_errors = files.iter().map(|f| f.error_count).sum();
    let total_warnings = files.iter().map(|f| f.warning_count).sum();

    Ok(ProblemsResult {
        files,
        total_errors,
        total_warnings,
    })
}

fn get_typescript_problems(project_path: &str, id_counter: &mut u32) -> Result<Vec<Problem>, String> {
    let mut problems: Vec<Problem> = Vec::new();

    // Check if tsconfig.json exists
    let tsconfig_path = Path::new(project_path).join("tsconfig.json");
    if !tsconfig_path.exists() {
        return Ok(problems);
    }

    // Try npx tsc first, then tsc directly
    let output = Command::new("npx")
        .args(["tsc", "--noEmit", "--pretty", "false"])
        .current_dir(project_path)
        .output()
        .or_else(|_| {
            Command::new("tsc")
                .args(["--noEmit", "--pretty", "false"])
                .current_dir(project_path)
                .output()
        })
        .map_err(|e| format!("Failed to run TypeScript compiler: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}{}", stdout, stderr);

    // Parse TypeScript output
    // Format: src/file.ts(10,5): error TS2304: Cannot find name 'x'.
    for line in combined.lines() {
        if let Some(problem) = parse_typescript_line(line, project_path, id_counter) {
            problems.push(problem);
        }
    }

    Ok(problems)
}

fn parse_typescript_line(line: &str, project_path: &str, id_counter: &mut u32) -> Option<Problem> {
    // Format: path/file.ts(line,col): error TSxxxx: message
    // or: path/file.ts(line,col): warning TSxxxx: message
    
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    // Find the position info (line,col)
    let paren_start = line.find('(')?;
    let paren_end = line.find(')')?;
    
    if paren_start >= paren_end {
        return None;
    }

    let file_path = &line[..paren_start];
    let position = &line[paren_start + 1..paren_end];
    let rest = &line[paren_end + 1..];

    // Parse line and column
    let pos_parts: Vec<&str> = position.split(',').collect();
    if pos_parts.len() < 2 {
        return None;
    }

    let line_num = pos_parts[0].trim().parse::<u32>().ok()?;
    let col_num = pos_parts[1].trim().parse::<u32>().ok()?;

    // Parse error/warning and code
    let rest = rest.trim_start_matches(':').trim();
    
    let (problem_type, code, message) = if rest.starts_with("error") {
        let after_error = rest.strip_prefix("error")?.trim();
        let (code, msg) = parse_ts_code_and_message(after_error);
        ("error".to_string(), code, msg)
    } else if rest.starts_with("warning") {
        let after_warning = rest.strip_prefix("warning")?.trim();
        let (code, msg) = parse_ts_code_and_message(after_warning);
        ("warning".to_string(), code, msg)
    } else {
        return None;
    };

    // Normalize file path
    let normalized_path = normalize_path(file_path, project_path);
    let file_name = Path::new(&normalized_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| normalized_path.clone());

    let id = *id_counter;
    *id_counter += 1;

    Some(Problem {
        id,
        problem_type,
        file: file_name,
        path: normalized_path,
        line: line_num,
        column: col_num,
        message,
        code,
        source: "ts".to_string(),
    })
}

fn parse_ts_code_and_message(s: &str) -> (Option<String>, String) {
    // Format: TS2304: Cannot find name 'x'.
    if let Some(colon_pos) = s.find(':') {
        let code_part = s[..colon_pos].trim();
        let message = s[colon_pos + 1..].trim().to_string();
        
        if code_part.starts_with("TS") {
            return (Some(code_part.to_string()), message);
        }
    }
    (None, s.to_string())
}

fn normalize_path(file_path: &str, project_path: &str) -> String {
    let file_path = file_path.replace('\\', "/");
    let project_path = project_path.replace('\\', "/");
    
    // If path is absolute and starts with project path, make it relative
    if file_path.starts_with(&project_path) {
        file_path
            .strip_prefix(&project_path)
            .map(|p| p.trim_start_matches('/'))
            .unwrap_or(&file_path)
            .to_string()
    } else {
        file_path
    }
}


// Cache for problems
use std::sync::Mutex;
use std::collections::HashMap as StdHashMap;

lazy_static::lazy_static! {
    static ref PROBLEMS_CACHE: Mutex<StdHashMap<String, ProblemsResult>> = Mutex::new(StdHashMap::new());
}

#[tauri::command]
pub fn clear_problems_cache() -> Result<(), String> {
    PROBLEMS_CACHE.lock().unwrap().clear();
    Ok(())
}

#[tauri::command]
pub fn get_problems_cache_stats() -> Result<serde_json::Value, String> {
    let cache = PROBLEMS_CACHE.lock().unwrap();
    Ok(serde_json::json!({
        "entries": cache.len()
    }))
}

#[tauri::command]
pub async fn check_files(project_path: String, _files: Vec<String>) -> Result<ProblemsResult, String> {
    // For now, just run full check - could be optimized to check specific files
    get_problems(project_path).await
}
