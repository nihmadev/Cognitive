use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State, Emitter};
use crate::api_keys::ApiKeyStore;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    id: String,
    type_: String,
    role: String,
    content: Vec<AnthropicContent>,
    usage: AnthropicUsage,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    type_: String,
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamChunk {
    type_: String,
    delta: Option<AnthropicDelta>,
}

#[derive(Debug, Deserialize)]
struct AnthropicDelta {
    type_: String,
    text: String,
}

#[command]
pub async fn anthropic_chat(
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
) -> Result<String, String> {
    let api_key = get_api_key(&state, "anthropic")?;
    
    let client = reqwest::Client::new();
    let request_body = AnthropicRequest {
        model: model.clone(),
        messages,
        max_tokens: max_tokens.unwrap_or(4096),
        temperature,
        stream: Some(false),
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(content) = anthropic_response.content.first() {
        Ok(content.text.clone())
    } else {
        Err("No response from API".to_string())
    }
}

#[command]
pub async fn anthropic_chat_stream(
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let api_key = get_api_key(&state, "anthropic")?;
    
    let client = reqwest::Client::new();
    let request_body = AnthropicRequest {
        model: model.clone(),
        messages,
        max_tokens: max_tokens.unwrap_or(4096),
        temperature,
        stream: Some(true),
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }

    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;
    
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                let chunk_str = String::from_utf8_lossy(&chunk);
                let lines: Vec<&str> = chunk_str.lines().collect();
                
                for line in lines {
                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        
                        match serde_json::from_str::<AnthropicStreamChunk>(data) {
                            Ok(chunk_data) => {
                                if chunk_data.type_ == "content_block_delta" {
                                    if let Some(delta) = chunk_data.delta {
                                        if delta.type_ == "text_delta" {
                                            app_handle
                                                .emit("anthropic-stream", delta.text)
                                                .map_err(|e| format!("Failed to emit stream event: {}", e))?;
                                        }
                                    }
                                }
                            }
                            Err(_) => {
                                // Ignore parsing errors for malformed chunks
                                continue;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    Ok(())
}

fn get_api_key(state: &State<'_, Mutex<ApiKeyStore>>, provider: &str) -> Result<String, String> {
    crate::api_keys::get_api_key(state, provider)
}
