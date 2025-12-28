use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State, Emitter};
use crate::api_keys::ApiKeyStore;

#[derive(Debug, Serialize, Deserialize)]
pub struct XAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct XAIRequest {
    model: String,
    messages: Vec<XAIMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct XAIResponse {
    choices: Vec<XAIChoice>,
    usage: XAIUsage,
}

#[derive(Debug, Deserialize)]
struct XAIChoice {
    message: XAIMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct XAIUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct XAIStreamChunk {
    id: String,
    object: String,
    created: u64,
    model: String,
    choices: Vec<XAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct XAIStreamChoice {
    index: u32,
    delta: XAIStreamDelta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct XAIStreamDelta {
    role: Option<String>,
    content: Option<String>,
}

#[command]
pub async fn xai_chat(
    model: String,
    messages: Vec<XAIMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
) -> Result<String, String> {
    let api_key = get_api_key(&state, "xai")?;
    
    let client = reqwest::Client::new();
    let request_body = XAIRequest {
        model: model.clone(),
        messages,
        stream: false,
        max_tokens,
        temperature,
    };

    let response = client
        .post("https://api.x.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }

    let xai_response: XAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(choice) = xai_response.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("No response from API".to_string())
    }
}

#[command]
pub async fn xai_chat_stream(
    model: String,
    messages: Vec<XAIMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let api_key = get_api_key(&state, "xai")?;
    
    let client = reqwest::Client::new();
    let request_body = XAIRequest {
        model: model.clone(),
        messages,
        stream: true,
        max_tokens,
        temperature,
    };

    let response = client
        .post("https://api.x.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
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
                        if data.trim() == "[DONE]" {
                            continue;
                        }
                        
                        match serde_json::from_str::<XAIStreamChunk>(data) {
                            Ok(chunk_data) => {
                                if let Some(choice) = chunk_data.choices.first() {
                                    if let Some(content) = &choice.delta.content {
                                        app_handle
                                            .emit("xai-stream", content)
                                            .map_err(|e| format!("Failed to emit stream event: {}", e))?;
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
