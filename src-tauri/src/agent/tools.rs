use serde::{Deserialize, Serialize};
use std::error::Error;
use crate::fs;
use std::path::PathBuf;
use crate::agent::rag::RagEngine;
use std::sync::Arc;
use quick_xml::reader::Reader;
use quick_xml::events::Event;

#[derive(Debug, Deserialize, Serialize)]
pub struct ToolCall {
    pub name: String,
    pub parameters: serde_json::Value,
}

fn parse_value(s: &str) -> serde_json::Value {
    let s = s.trim();
    if s == "true" {
        serde_json::Value::Bool(true)
    } else if s == "false" {
        serde_json::Value::Bool(false)
    } else if let Ok(n) = s.parse::<i64>() {
        serde_json::Value::Number(n.into())
    } else if let Ok(f) = s.parse::<f64>() {
        if let Some(n) = serde_json::Number::from_f64(f) {
            serde_json::Value::Number(n)
        } else {
            serde_json::Value::String(s.to_string())
        }
    } else {
        serde_json::Value::String(s.to_string())
    }
}

pub struct ToolExecutor {
    pub workspace_path: Option<PathBuf>,
    pub rag_engine: Arc<RagEngine>,
}

impl ToolExecutor {
    pub fn new(workspace_path: Option<PathBuf>, rag_engine: Arc<RagEngine>) -> Self {
        Self { workspace_path, rag_engine }
    }

    pub async fn execute(&self, call: ToolCall) -> Result<String, Box<dyn Error + Send + Sync>> {
        let resolve_path = |path: &str| -> String {
            let path_buf = PathBuf::from(path);
            if path_buf.is_absolute() {
                path.to_string()
            } else if let Some(workspace) = &self.workspace_path {
                workspace.join(path_buf).to_string_lossy().to_string()
            } else {
                path.to_string()
            }
        };

        match call.name.as_str() {
            "search_codebase" => {
                let query = call.parameters.get("query").and_then(|v| v.as_str()).ok_or("Missing query parameter")?;
                let results = self.rag_engine.search(query);
                Ok(serde_json::to_string(&results)?)
            }
            "index_codebase" => {
                let workspace = self.workspace_path.as_ref().ok_or("No workspace open")?;
                self.rag_engine.index_workspace(workspace).await.map_err(|e| e.to_string())?;
                Ok("Codebase indexed successfully".to_string())
            }
            "read_file" => {
                let path = call.parameters.get("path").and_then(|v| v.as_str()).ok_or("Missing path parameter")?;
                let start_line = call.parameters.get("start_line").and_then(|v| v.as_u64()).map(|n| n as usize);
                let end_line = call.parameters.get("end_line").and_then(|v| v.as_u64()).map(|n| n as usize);
                
                let full_path = resolve_path(path);
                let content = std::fs::read_to_string(&full_path).map_err(|e| e.to_string())?;
                
                let lines: Vec<&str> = content.lines().collect();
                let total_lines = lines.len();
                
                let (start, end) = match (start_line, end_line) {
                    (Some(s), Some(e)) => (s.saturating_sub(1), e.min(total_lines)),
                    (Some(s), None) => (s.saturating_sub(1), total_lines),
                    (None, Some(e)) => (0, e.min(total_lines)),
                    (None, None) => (0, total_lines),
                };
                
                if start > total_lines || start >= end {
                    return Ok("(Empty range or out of bounds)".to_string());
                }
                
                let selected_lines = &lines[start..end];
                Ok(selected_lines.join("\n"))
            }
            "search_files" | "find_by_name" => {
                let pattern = call.parameters.get("pattern").and_then(|v| v.as_str()).ok_or("Missing pattern parameter")?;
                let workspace = self.workspace_path.as_ref().and_then(|p| p.to_str()).ok_or("No workspace open")?;
                
                let results = fs::find_files_by_name(workspace.to_string(), pattern.to_string()).await.map_err(|e| e.to_string())?;
                Ok(serde_json::to_string(&results)?)
            }
            "grep" | "search" => {
                let query = call.parameters.get("query").and_then(|v| v.as_str()).ok_or("Missing query parameter")?;
                let path = call.parameters.get("path").and_then(|v| v.as_str()).unwrap_or(".");
                let full_path = resolve_path(path);

                let options = crate::fs::SearchOptions {
                    query: query.to_string(),
                    is_case_sensitive: call.parameters.get("caseSensitive").and_then(|v| v.as_bool()).unwrap_or(false),
                    is_whole_word: call.parameters.get("wholeWord").and_then(|v| v.as_bool()).unwrap_or(false),
                    is_regex: call.parameters.get("regex").and_then(|v| v.as_bool()).unwrap_or(false),
                    include_pattern: call.parameters.get("includePattern").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    exclude_pattern: call.parameters.get("excludePattern").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    filter_pattern: String::new(),
                };
                
                let results = fs::search_in_files(full_path, options).await.map_err(|e| e.to_string())?;
                Ok(serde_json::to_string(&results)?)
            }
            "list_dir" => {
                let path = call.parameters.get("path").and_then(|v| v.as_str()).ok_or("Missing path parameter")?;
                let full_path = resolve_path(path);
                let entries = fs::read_dir(full_path).map_err(|e| e.to_string())?;
                Ok(serde_json::to_string(&entries)?)
            }
            "write_file" => {
                let path = call.parameters.get("path").and_then(|v| v.as_str()).ok_or("Missing path parameter")?;
                let content = call.parameters.get("content").and_then(|v| v.as_str()).ok_or("Missing content parameter")?;
                let full_path = resolve_path(path);
                fs::write_file(full_path, content.to_string()).map_err(|e| e.to_string())?;
                Ok("File written successfully".to_string())
            }
            "todo_add" => {
                let content = call.parameters.get("content").and_then(|v| v.as_str()).ok_or("Missing content parameter")?;
                let workspace = self.workspace_path.as_ref().ok_or("No workspace open")?;
                let todo_path = workspace.join(".cognitive").join("todos.json");
                
                if let Some(parent) = todo_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                
                let mut todos: Vec<serde_json::Value> = if todo_path.exists() {
                    let data = std::fs::read_to_string(&todo_path).map_err(|e| e.to_string())?;
                    serde_json::from_str(&data).unwrap_or_default()
                } else {
                    Vec::new()
                };
                
                todos.push(serde_json::json!({
                    "id": uuid::Uuid::new_v4().to_string(),
                    "content": content,
                    "status": "pending",
                    "created_at": chrono::Utc::now().to_rfc3339()
                }));
                
                let data = serde_json::to_string_pretty(&todos)?;
                std::fs::write(&todo_path, data).map_err(|e| e.to_string())?;
                
                Ok(format!("Added todo: {}", content))
            }
            "todo_list" => {
                let workspace = self.workspace_path.as_ref().ok_or("No workspace open")?;
                let todo_path = workspace.join(".cognitive").join("todos.json");
                
                if !todo_path.exists() {
                    return Ok("[]".to_string());
                }
                
                let data = std::fs::read_to_string(&todo_path).map_err(|e| e.to_string())?;
                Ok(data)
            }
            "todo_complete" => {
                let id = call.parameters.get("id").and_then(|v| v.as_str()).ok_or("Missing id parameter")?;
                let workspace = self.workspace_path.as_ref().ok_or("No workspace open")?;
                let todo_path = workspace.join(".cognitive").join("todos.json");
                
                if !todo_path.exists() {
                    return Err("No todos found".into());
                }
                
                let data = std::fs::read_to_string(&todo_path).map_err(|e| e.to_string())?;
                let mut todos: Vec<serde_json::Value> = serde_json::from_str(&data)?;
                
                let mut found = false;
                for todo in todos.iter_mut() {
                    if todo.get("id").and_then(|v| v.as_str()) == Some(id) {
                        if let Some(obj) = todo.as_object_mut() {
                            obj.insert("status".to_string(), serde_json::json!("completed"));
                            found = true;
                        }
                    }
                }
                
                if found {
                    let data = serde_json::to_string_pretty(&todos)?;
                    std::fs::write(&todo_path, data).map_err(|e| e.to_string())?;
                    Ok(format!("Completed todo: {}", id))
                } else {
                    Err(format!("Todo not found: {}", id).into())
                }
            }
            _ => Err(format!("Unknown tool: {}", call.name).into()),
        }
    }
}

pub fn parse_tool_calls(text: &str) -> Vec<ToolCall> {
    let mut calls = Vec::new();
    let allowed_tools = ["search_codebase", "index_codebase", "read_file", "search_files", "find_by_name", "grep", "list_dir", "todo_list", "todo_add", "todo_complete", "todo_delete", "todo_clear"];

    // 1. Парсинг XML-подобного формата с помощью quick-xml
    let mut reader = Reader::from_str(text);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();

    let mut current_invoke: Option<(String, serde_json::Map<String, serde_json::Value>)> = None;
    let mut current_param_name: Option<String> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if name == "invoke" {
                    let mut tool_name = String::new();
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            if attr.key.as_ref() == b"name" {
                                tool_name = String::from_utf8_lossy(&attr.value).to_string();
                            }
                        }
                    }
                    if !tool_name.is_empty() && allowed_tools.contains(&tool_name.as_str()) {
                        current_invoke = Some((tool_name, serde_json::Map::new()));
                    }
                } else if name == "parameter" && current_invoke.is_some() {
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            if attr.key.as_ref() == b"name" {
                                current_param_name = Some(String::from_utf8_lossy(&attr.value).to_string());
                            }
                        }
                    }
                } else if allowed_tools.contains(&name.as_str()) {
                    // Компактный формат: <tool_name arg1="val1" />
                    let mut parameters = serde_json::Map::new();
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            let p_name = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            let p_value = String::from_utf8_lossy(&attr.value).to_string();
                            parameters.insert(p_name, parse_value(&p_value));
                        }
                    }
                    calls.push(ToolCall {
                        name,
                        parameters: serde_json::Value::Object(parameters),
                    });
                }
            }
            Ok(Event::Empty(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if allowed_tools.contains(&name.as_str()) {
                    let mut parameters = serde_json::Map::new();
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            let p_name = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            let p_value = String::from_utf8_lossy(&attr.value).to_string();
                            parameters.insert(p_name, parse_value(&p_value));
                        }
                    }
                    calls.push(ToolCall {
                        name,
                        parameters: serde_json::Value::Object(parameters),
                    });
                }
            }
            Ok(Event::Text(ref e)) => {
                if let (Some((_, ref mut params)), Some(ref p_name)) = (&mut current_invoke, &current_param_name) {
                    let text = e.unescape().unwrap_or_else(|_| String::from_utf8_lossy(e.as_ref())).to_string();
                    params.insert(p_name.clone(), parse_value(&text));
                }
            }
            Ok(Event::End(ref e)) => {
                let name = e.name();
                if name.as_ref() == b"invoke" {
                    if let Some((name, parameters)) = current_invoke.take() {
                        calls.push(ToolCall {
                            name,
                            parameters: serde_json::Value::Object(parameters),
                        });
                    }
                } else if name.as_ref() == b"parameter" {
                    current_param_name = None;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => {} // Игнорируем ошибки XML в выводе AI
            _ => {}
        }
        buf.clear();
    }

    // 2. Поиск JSON объектов
    for (start_idx, _) in text.match_indices('{') {
        for end_idx in (start_idx + 1..text.len()).rev() {
            if text.as_bytes()[end_idx] == b'}' {
                let json_str = &text[start_idx..=end_idx];
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if let Some(call) = try_parse_json_tool_call(&v) {
                        if allowed_tools.contains(&call.name.as_str()) && !calls.iter().any(|c| c.name == call.name && c.parameters == call.parameters) {
                            calls.push(call);
                        }
                        break;
                    }
                }
            }
        }
    }

    // 3. Старый формат для обратной совместимости: tool_call: { ... }
    for line in text.lines() {
        if line.starts_with("tool_call: ") {
            let json_str = &line[11..];
            if let Ok(call) = serde_json::from_str::<ToolCall>(json_str) {
                if allowed_tools.contains(&call.name.as_str()) && !calls.iter().any(|c| c.name == call.name && c.parameters == call.parameters) {
                    calls.push(call);
                }
            }
        }
    }

    calls
}

fn try_parse_json_tool_call(v: &serde_json::Value) -> Option<ToolCall> {
    let allowed_tools = ["search_codebase", "index_codebase", "read_file", "search_files", "find_by_name", "grep", "list_dir", "todo_list", "todo_add", "todo_complete", "todo_delete", "todo_clear"];

    // Вариант 1: {"name": "...", "parameters": {...}}
    if let (Some(name), Some(params)) = (v.get("name").and_then(|n| n.as_str()), v.get("parameters")) {
        if allowed_tools.contains(&name) {
            return Some(ToolCall {
                name: name.to_string(),
                parameters: params.clone(),
            });
        }
    }
    // Вариант 2: {"tool": "...", "args": {...}}
    if let (Some(name), Some(args)) = (v.get("tool").and_then(|t| t.as_str()), v.get("args")) {
        if allowed_tools.contains(&name) {
            return Some(ToolCall {
                name: name.to_string(),
                parameters: args.clone(),
            });
        }
    }
    // Вариант 3: {"tool_call": {"name": "...", "parameters": {...}}}
    if let Some(inner) = v.get("tool_call") {
        return try_parse_json_tool_call(inner);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_xml_invoke() {
        let text = r#"Здесь какой-то текст.
<invoke name="read_file">
    <parameter name="path">src/main.rs</parameter>
</invoke>
И еще текст."#;
        let calls = parse_tool_calls(text);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].name, "read_file");
        assert_eq!(calls[0].parameters["path"], "src/main.rs");
    }

    #[test]
    fn test_parse_xml_compact() {
        let text = r#"<list_dir path="src" />"#;
        let calls = parse_tool_calls(text);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].name, "list_dir");
        assert_eq!(calls[0].parameters["path"], "src");
    }

    #[test]
    fn test_parse_xml_entities() {
        let text = r#"<invoke name="write_file">
    <parameter name="path">test.txt</parameter>
    <parameter name="content">A &lt; B &amp;&amp; C &gt; D</parameter>
</invoke>"#;
        let calls = parse_tool_calls(text);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].parameters["content"], "A < B && C > D");
    }

    #[test]
    fn test_parse_json_fallback() {
        let text = r#"{"name": "grep", "parameters": {"query": "test"}}"#;
        let calls = parse_tool_calls(text);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].name, "grep");
        assert_eq!(calls[0].parameters["query"], "test");
    }

    #[test]
    fn test_parse_mixed_formats() {
        let text = r#"
<read_file path="Cargo.toml" />
Затем поищем:
{"tool": "grep", "args": {"query": "quick-xml"}}
"#;
        let calls = parse_tool_calls(text);
        assert_eq!(calls.len(), 2);
        assert_eq!(calls[0].name, "read_file");
        assert_eq!(calls[1].name, "grep");
    }
}
