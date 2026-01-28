use tauri::{State, Window, Emitter};
use crate::agent::rag::RagEngine;
use std::sync::{Arc, Mutex};
use crate::agent::openai::{OpenAIClient, ChatRequest, ChatMessage};
use crate::agent::gemini::{GeminiClient, GeminiRequest, GeminiContent, GeminiPart, GeminiConfig};
use crate::agent::ollama::{OllamaClient, OllamaChatRequest, OllamaOptions, OllamaModel};
use crate::agent::system_prompt::{generate_system_prompt, SystemPromptContext};
use crate::agent::tools::{ToolExecutor, parse_tool_calls};
use futures_util::StreamExt;
use std::path::PathBuf;

pub struct AgentState {
    pub openai_api_key: Mutex<Option<String>>,
    pub gemini_api_key: Mutex<Option<String>>,
    pub base_url: Mutex<Option<String>>,
    pub ollama_base_url: Mutex<Option<String>>,
    pub workspace_path: Mutex<Option<PathBuf>>,
    pub rag_engine: Arc<RagEngine>,
}

impl Default for AgentState {
    fn default() -> Self {
        Self {
            openai_api_key: Mutex::new(None),
            gemini_api_key: Mutex::new(None),
            base_url: Mutex::new(None),
            ollama_base_url: Mutex::new(None),
            workspace_path: Mutex::new(None),
            rag_engine: Arc::new(RagEngine::new()),
        }
    }
}

#[tauri::command]
pub fn agentrouter_configure(
    state: State<'_, AgentState>,
    openai_api_key: Option<String>,
    gemini_api_key: Option<String>,
    base_url: Option<String>,
    ollama_base_url: Option<String>,
) {
    if let Ok(mut key) = state.openai_api_key.lock() {
        *key = openai_api_key;
    }
    if let Ok(mut key) = state.gemini_api_key.lock() {
        *key = gemini_api_key;
    }
    if let Ok(mut url) = state.base_url.lock() {
        *url = base_url;
    }
    if let Ok(mut url) = state.ollama_base_url.lock() {
        *url = ollama_base_url;
    }
}

#[tauri::command]
pub async fn agentrouter_set_workspace(
    state: State<'_, AgentState>,
    workspace_path: Option<String>,
) -> Result<(), String> {
    if let Some(path_str) = workspace_path {
        let path = PathBuf::from(path_str);
        {
            let mut w_path = state.workspace_path.lock().unwrap();
            *w_path = Some(path.clone());
        }
        
        // Trigger indexing in the background with cold start optimization
        let rag_engine = state.rag_engine.clone();
        tokio::spawn(async move {
            if let Err(_e) = rag_engine.load_or_index(&path).await {
                // Failed to index workspace
            }
        });
    } else {
        let mut w_path = state.workspace_path.lock().unwrap();
        *w_path = None;
    }
    Ok(())
}

#[tauri::command]
pub async fn agentrouter_list_ollama_models(
    state: State<'_, AgentState>,
) -> Result<Vec<OllamaModel>, String> {
    let ollama_base_url = state.ollama_base_url.lock().unwrap().clone();
    let client = OllamaClient::new(ollama_base_url);
    client.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn agentrouter_chat_complete(
    state: State<'_, AgentState>,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let openai_key = state.openai_api_key.lock().unwrap().clone();
    let gemini_key = state.gemini_api_key.lock().unwrap().clone();
    let base_url = state.base_url.lock().unwrap().clone();
    let ollama_base_url = state.ollama_base_url.lock().unwrap().clone();

    if model.contains("gpt") {
        let key = openai_key.ok_or("OpenAI API key not configured")?;
        let _client = OpenAIClient::new(key.clone(), base_url.clone());
        let request = ChatRequest {
            model,
            messages,
            stream: false,
            temperature: None,
            max_tokens: None,
        };

        // We need a non-streaming method in OpenAIClient or just use the same logic
        let url = format!("{}/chat/completions", base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()));
        let response = reqwest::Client::new()
            .post(url)
            .header("Authorization", format!("Bearer {}", key))
            .json(&request)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("OpenAI API error: {}", response.text().await.unwrap_or_default()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        Ok(body["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string())
    } else if model.contains("gemini") {
        let key = gemini_key.ok_or("Gemini API key not configured")?;
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, key
        );

        let gemini_messages: Vec<GeminiContent> = messages.into_iter().map(|m| GeminiContent {
            role: if m.role == "user" { "user".to_string() } else { "model".to_string() },
            parts: vec![GeminiPart { text: m.content }],
        }).collect();

        let request = GeminiRequest {
            contents: gemini_messages,
            system_instruction: None, // Non-streaming version doesn't use system instruction
            generation_config: Some(GeminiConfig {
                temperature: None,
                max_output_tokens: None,
            }),
        };

        let response = reqwest::Client::new()
            .post(url)
            .json(&request)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Gemini API error: {}", response.text().await.unwrap_or_default()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        Ok(body["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or_default().to_string())
    } else {
        let url = format!("{}/api/chat", ollama_base_url.unwrap_or_else(|| "http://localhost:11434".to_string()));
        let request = OllamaChatRequest {
            model,
            messages,
            stream: false,
            options: Some(OllamaOptions {
                temperature: None,
                num_predict: None,
            }),
        };

        let response = reqwest::Client::new()
            .post(url)
            .json(&request)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Ollama API error: {}", response.text().await.unwrap_or_default()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        Ok(body["message"]["content"].as_str().unwrap_or_default().to_string())
    }
}

#[tauri::command]
pub async fn agentrouter_index_codebase(
    state: State<'_, AgentState>,
) -> Result<String, String> {
    let workspace_path = state.workspace_path.lock().unwrap().clone();
    let workspace = workspace_path.ok_or("No workspace open")?;
    
    state.rag_engine.index_workspace(&workspace).await.map_err(|e| e.to_string())?;
    Ok("Codebase indexed successfully".to_string())
}

#[tauri::command]
pub async fn agent_execute_tool(
    state: State<'_, AgentState>,
    tool: String,
    args: serde_json::Value,
) -> Result<String, String> {
    let workspace_path = state.workspace_path.lock().unwrap().clone();
    let executor = ToolExecutor::new(workspace_path, state.rag_engine.clone());
    
    let call = crate::agent::tools::ToolCall {
        name: tool,
        parameters: args,
    };
    
    executor.execute(call).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agentrouter_get_system_prompt(
    state: State<'_, AgentState>,
    user_query: Option<String>,
) -> String {
    let workspace_path = state.workspace_path.lock().unwrap().clone();
    let context = SystemPromptContext {
        user_os: std::env::consts::OS.to_string(),
        user_query,
        workspace: workspace_path.as_ref().and_then(|p| p.to_str()).map(|s| s.to_string()),
    };
    generate_system_prompt(context)
}

#[tauri::command]
pub async fn agentrouter_chat_stream(
    window: Window,
    state: State<'_, AgentState>,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    let openai_key = state.openai_api_key.lock().unwrap().clone();
    let gemini_key = state.gemini_api_key.lock().unwrap().clone();
    let base_url = state.base_url.lock().unwrap().clone();
    let ollama_base_url = state.ollama_base_url.lock().unwrap().clone();
    let workspace_path = state.workspace_path.lock().unwrap().clone();

    let context = SystemPromptContext {
        user_os: std::env::consts::OS.to_string(),
        user_query: messages.last().map(|m| m.content.clone()),
        workspace: workspace_path.as_ref().and_then(|p| p.to_str()).map(|s| s.to_string()),
    };
    let system_prompt = generate_system_prompt(context);

    let mut full_messages = vec![ChatMessage {
        role: "system".to_string(),
        content: system_prompt.clone(),
    }];
    full_messages.extend(messages);

    let mut current_iteration = 0;
    let max_iterations = 10;

    loop {
        current_iteration += 1;
        if current_iteration > max_iterations {
            break;
        }

        let mut full_response = String::new();

        if model.contains("gpt") {
            let key = openai_key.clone().ok_or("OpenAI API key not configured")?;
            let client = OpenAIClient::new(key, base_url.clone());
            let request = ChatRequest {
                model: model.clone(),
                messages: full_messages.clone(),
                stream: true,
                temperature: None,
                max_tokens: None,
            };

            let mut stream = client.chat_stream(request).await.map_err(|e| e.to_string())?;
            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(content) => {
                        full_response.push_str(&content);
                        window.emit("agent-event", serde_json::json!({ "type": "chunk", "payload": content })).map_err(|e| e.to_string())?;
                    }
                    Err(e) => {
                        return Err(format!("OpenAI stream error: {}", e));
                    }
                }
            }
        } else if model.contains("gemini") {
            let key = gemini_key.clone().ok_or("Gemini API key not configured")?;
            let client = GeminiClient::new(key);
            
            // Skip the first message (system prompt) as it is passed via system_instruction
            let gemini_messages: Vec<GeminiContent> = full_messages.iter().skip(1).map(|m| GeminiContent {
                role: if m.role == "user" { "user".to_string() } else { "model".to_string() },
                parts: vec![GeminiPart { text: m.content.clone() }],
            }).collect();

            let request = GeminiRequest {
                contents: gemini_messages,
                system_instruction: Some(GeminiContent {
                    role: "user".to_string(), // Role doesn't matter much for system instruction in API
                    parts: vec![GeminiPart { text: system_prompt.clone() }], // Use clone as system_prompt is moved? No, it's String.
                }),
                generation_config: Some(GeminiConfig {
                    temperature: None,
                    max_output_tokens: None,
                }),
            };

            let mut stream = client.chat_stream(&model, request).await.map_err(|e| e.to_string())?;
            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(content) => {
                        full_response.push_str(&content);
                        window.emit("agent-event", serde_json::json!({ "type": "chunk", "payload": content })).map_err(|e| e.to_string())?;
                    }
                    Err(e) => {
                        return Err(format!("Gemini stream error: {}", e));
                    }
                }
            }
        } else {
            // Assume Ollama
            let client = OllamaClient::new(ollama_base_url.clone());
            let request = OllamaChatRequest {
                model: model.clone(),
                messages: full_messages.clone(),
                stream: true,
                options: Some(OllamaOptions {
                    temperature: None,
                    num_predict: None,
                }),
            };

            let mut stream = client.chat_stream(request).await.map_err(|e| e.to_string())?;
            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(content) => {
                        full_response.push_str(&content);
                        window.emit("agent-event", serde_json::json!({ "type": "chunk", "payload": content })).map_err(|e| e.to_string())?;
                    }
                    Err(e) => {
                        return Err(format!("Ollama stream error: {}", e));
                    }
                }
            }
        }

        // Add assistant response to history
        full_messages.push(ChatMessage {
            role: "assistant".to_string(),
            content: full_response.clone(),
        });

        // Parse and execute tools
        let tool_calls = parse_tool_calls(&full_response);
        
        // Check if we should break the loop
        if tool_calls.is_empty() {
            // If the response contains a final answer marker, we're definitely done
            if full_response.contains("## FINAL ANSWER") {
                break;
            }
            
            // If no tool calls and no final answer, nudge the model to continue
            if current_iteration < max_iterations {
                full_messages.push(ChatMessage {
                    role: "user".to_string(),
                    content: "Your response did not include any tool calls or a ## FINAL ANSWER. If you are finished, please provide the ## FINAL ANSWER. If not, please use the appropriate tool to proceed.".to_string(),
                });
                continue;
            }

            break;
        }

        let executor = ToolExecutor::new(workspace_path.clone(), state.rag_engine.clone());
        let mut tool_outputs = Vec::new();

        for call in tool_calls {
            let call_id = uuid::Uuid::new_v4().to_string();
            let tool_name = call.name.clone();
            
            // Emit tool call started event
            let tool_start = serde_json::json!({
                "type": "agent-tool-start",
                "payload": {
                    "id": call_id,
                    "name": tool_name,
                    "parameters": call.parameters,
                    "status": "executing",
                    "timestamp": chrono::Utc::now().timestamp()
                }
            });
            window.emit("agent-event", tool_start).map_err(|e| e.to_string())?;
            
            match executor.execute(call).await {
                Ok(result) => {
                    // Emit tool result event
                    let tool_success = serde_json::json!({
                        "type": "agent-tool-res",
                        "payload": {
                            "id": call_id,
                            "name": tool_name,
                            "result": result,
                            "status": "completed"
                        }
                    });
                    window.emit("agent-event", tool_success).map_err(|e| e.to_string())?;
                    
                    // Extract line count info if present to show in tool outputs
                    let _display_result = if result.starts_with("[File:") {
                        result.splitn(2, ']').next().unwrap_or("").to_string() + "]"
                    } else {
                        "Completed".to_string()
                    };
                    
                    // Limit the result size for the LLM context to avoid hitting limits
                    let history_result = if result.len() > 100000 {
                        format!("{}... (truncated, total length: {})", &result[..100000], result.len())
                    } else {
                        result.clone()
                    };
                    
                    // Format output more naturally for the LLM
                    let formatted_output = if tool_name == "search_files" || tool_name == "find_by_name" {
                        if let Ok(files) = serde_json::from_str::<Vec<serde_json::Value>>(&history_result) {
                            if files.is_empty() {
                                "No files found matching the pattern.".to_string()
                            } else {
                                let file_list = files.iter()
                                    .filter_map(|f| f.get("path").and_then(|p| p.as_str()))
                                    .collect::<Vec<_>>()
                                    .join("\n");
                                format!("Found files:\n{}", file_list)
                            }
                        } else {
                            history_result
                        }
                    } else if tool_name == "search_codebase" {
                        if let Ok(symbols) = serde_json::from_str::<Vec<serde_json::Value>>(&history_result) {
                            if symbols.is_empty() {
                                "No symbols found matching the query.".to_string()
                            } else {
                                let symbol_list = symbols.iter()
                                    .take(15) // Limit to top 15 for brevity
                                    .map(|s| {
                                        let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                                        let kind = s.get("kind").and_then(|v| v.as_str()).unwrap_or("?");
                                        let path = s.get("file_path").and_then(|v| v.as_str()).unwrap_or("?");
                                        let line = s.get("start_line").and_then(|v| v.as_u64()).unwrap_or(0);
                                        format!("{} ({}) in {} (line {})", name, kind, path, line)
                                    })
                                    .collect::<Vec<_>>()
                                    .join("\n");
                                format!("Found symbols:\n{}", symbol_list)
                            }
                        } else {
                            history_result
                        }
                    } else {
                        history_result
                    };
                    
                    tool_outputs.push(format!("[{}] result:\n{}", tool_name, formatted_output));
                }
                Err(e) => {
                    let err_msg = e.to_string();
                    // Emit tool error event
                    let tool_error = serde_json::json!({
                        "type": "agent-tool-error",
                        "payload": {
                            "id": call_id,
                            "name": tool_name,
                            "error": err_msg,
                            "status": "error"
                        }
                    });
                    window.emit("agent-event", tool_error).map_err(|e| e.to_string())?;
                    tool_outputs.push(format!("Tool '{}' error: {}", tool_name, err_msg));
                }
            }
        }

        // Add tool outputs to history as a user message to prompt the model to continue
        if !tool_outputs.is_empty() {
            let tool_response_content = tool_outputs.join("\n\n");
            full_messages.push(ChatMessage {
                role: "user".to_string(), 
                content: format!("Tool execution results:\n{}\n\nPlease analyze these results and take the next step.", tool_response_content),
            });
        }
    }

    Ok(())
}
