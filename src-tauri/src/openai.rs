use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State, Emitter};
use crate::api_keys::ApiKeyStore;
use crate::proxy_config::ProxyConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    #[allow(dead_code)]
    usage: OpenAIUsage,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    #[allow(dead_code)]
    prompt_tokens: u32,
    #[allow(dead_code)]
    completion_tokens: u32,
    #[allow(dead_code)]
    total_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChunk {
    #[allow(dead_code)]
    id: String,
    #[allow(dead_code)]
    object: String,
    #[allow(dead_code)]
    created: u64,
    #[allow(dead_code)]
    model: String,
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamChoice {
    #[allow(dead_code)]
    index: u32,
    delta: OpenAIStreamDelta,
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAIStreamDelta {
    #[allow(dead_code)]
    role: Option<String>,
    content: Option<String>,
}

#[command]
pub async fn openai_chat(
    model: String,
    messages: Vec<OpenAIMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
) -> Result<String, String> {
    let api_key = get_api_key(&state, "openai")?;
    let proxy_config = ProxyConfig::from_env();
    let api_url = proxy_config.get_openai_url();
    
    let client = reqwest::Client::new();
    let request_body = OpenAIRequest {
        model: model.clone(),
        messages,
        stream: false,
        max_tokens,
        temperature,
    };

    let response = client
        .post(&api_url)
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

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(choice) = openai_response.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("No response from API".to_string())
    }
}

#[command]
pub async fn openai_chat_stream(
    model: String,
    messages: Vec<OpenAIMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let api_key = get_api_key(&state, "openai")?;
    let proxy_config = ProxyConfig::from_env();
    let api_url = proxy_config.get_openai_url();
    
    let client = reqwest::Client::new();
    let request_body = OpenAIRequest {
        model: model.clone(),
        messages,
        stream: true,
        max_tokens,
        temperature,
    };

    let response = client
        .post(&api_url)
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
                        
                        match serde_json::from_str::<OpenAIStreamChunk>(data) {
                            Ok(chunk_data) => {
                                if let Some(choice) = chunk_data.choices.first() {
                                    if let Some(content) = &choice.delta.content {
                                        app_handle
                                            .emit("openai-stream", content)
                                            .map_err(|e| format!("Failed to emit stream event: {}", e))?;
                                    }
                                }
                            }
                            Err(_) => {
                                
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

fn get_api_key(state: &State<'_, Mutex<crate::api_keys::ApiKeyStore>>, provider: &str) -> Result<String, String> {
    crate::api_keys::get_api_key(state, provider)
}
