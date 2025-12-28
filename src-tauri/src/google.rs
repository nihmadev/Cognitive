use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, State, Emitter};
use crate::api_keys::ApiKeyStore;

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleMessage {
    role: String,
    parts: Vec<GooglePart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GooglePart {
    text: String,
}

#[derive(Debug, Serialize)]
struct GoogleRequest {
    contents: Vec<GoogleContent>,
    generation_config: Option<GoogleGenerationConfig>,
    safety_settings: Option<Vec<GoogleSafetySetting>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GoogleContent {
    role: String,
    parts: Vec<GooglePart>,
}

#[derive(Debug, Serialize)]
struct GoogleGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Debug, Serialize)]
struct GoogleSafetySetting {
    category: String,
    threshold: String,
}

#[derive(Debug, Deserialize)]
struct GoogleResponse {
    candidates: Vec<GoogleCandidate>,
    usage_metadata: GoogleUsageMetadata,
}

#[derive(Debug, Deserialize)]
struct GoogleCandidate {
    content: GoogleContent,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleUsageMetadata {
    prompt_token_count: u32,
    candidates_token_count: u32,
    total_token_count: u32,
}

#[derive(Debug, Deserialize)]
struct GoogleStreamChunk {
    candidates: Vec<GoogleCandidate>,
    usage_metadata: Option<GoogleUsageMetadata>,
}

#[command]
pub async fn google_chat(
    model: String,
    messages: Vec<GoogleMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
) -> Result<String, String> {
    let api_key = get_api_key(&state, "google")?;
    
    let client = reqwest::Client::new();
    
    // Convert messages to Google format
    let contents: Vec<GoogleContent> = messages
        .into_iter()
        .map(|msg| {
            let text = if msg.parts.len() > 0 {
                msg.parts[0].text.clone()
            } else {
                String::new()
            };
            GoogleContent {
                role: if msg.role == "assistant" { "model".to_string() } else { msg.role },
                parts: vec![GooglePart { text }],
            }
        })
        .collect();

    let generation_config = GoogleGenerationConfig {
        max_output_tokens: max_tokens,
        temperature,
    };

    let request_body = GoogleRequest {
        contents,
        generation_config: Some(generation_config),
        safety_settings: Some(vec![
            GoogleSafetySetting {
                category: "HARM_CATEGORY_HARASSMENT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
        ]),
    };

    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", model, api_key);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {}", error_text));
    }

    let google_response: GoogleResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(candidate) = google_response.candidates.first() {
        if let Some(part) = candidate.content.parts.first() {
            Ok(part.text.clone())
        } else {
            Err("No text in response".to_string())
        }
    } else {
        Err("No candidates in response".to_string())
    }
}

#[command]
pub async fn google_chat_stream(
    model: String,
    messages: Vec<GoogleMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    state: State<'_, Mutex<ApiKeyStore>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let api_key = get_api_key(&state, "google")?;
    
    let client = reqwest::Client::new();
    
    // Convert messages to Google format
    let contents: Vec<GoogleContent> = messages
        .into_iter()
        .map(|msg| {
            let text = if msg.parts.len() > 0 {
                msg.parts[0].text.clone()
            } else {
                String::new()
            };
            GoogleContent {
                role: if msg.role == "assistant" { "model".to_string() } else { msg.role },
                parts: vec![GooglePart { text }],
            }
        })
        .collect();

    let generation_config = GoogleGenerationConfig {
        max_output_tokens: max_tokens,
        temperature,
    };

    let request_body = GoogleRequest {
        contents,
        generation_config: Some(generation_config),
        safety_settings: Some(vec![
            GoogleSafetySetting {
                category: "HARM_CATEGORY_HARASSMENT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
            GoogleSafetySetting {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                threshold: "BLOCK_NONE".to_string(),
            },
        ]),
    };

    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}", model, api_key);

    let response = client
        .post(&url)
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
                    if line.trim().starts_with('{') && line.trim().ends_with('}') {
                        match serde_json::from_str::<GoogleStreamChunk>(line) {
                            Ok(chunk_data) => {
                                if let Some(candidate) = chunk_data.candidates.first() {
                                    if let Some(part) = candidate.content.parts.first() {
                                        if !part.text.is_empty() {
                                            app_handle
                                                .emit("google-stream", part.text.clone())
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
