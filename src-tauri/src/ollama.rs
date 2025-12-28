use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Duration;
use thiserror::Error;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{State, Window, Emitter};
use std::process::Command;
use futures_util::StreamExt;

#[derive(Error, Debug)]
pub enum OllamaError {
    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("Invalid response format: {0}")]
    InvalidResponse(String),
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Stream error: {0}")]
    StreamError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<ChatOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub model: String,
    pub created_at: String,
    pub message: Message,
    pub done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub load_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_eval_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_eval_duration: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eval_duration: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StreamResponse {
    pub message: Option<MessagePart>,
    pub done: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MessagePart {
    pub content: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub details: ModelDetails,
    pub modified_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDetails {
    pub format: String,
    pub family: String,
    pub families: Option<Vec<String>>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListModelsResponse {
    pub models: Vec<ModelInfo>,
}

pub struct OllamaClient {
    client: Client,
    base_url: String,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
        
        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, base_url }
    }

    pub async fn chat(&self, request: ChatRequest) -> Result<ChatResponse, OllamaError> {
        let url = format!("{}/api/chat", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(OllamaError::ApiError(error_text));
        }

        let chat_response: ChatResponse = response.json().await
            .map_err(|e| OllamaError::InvalidResponse(e.to_string()))?;

        Ok(chat_response)
    }

    pub async fn chat_stream_request(&self, request: ChatRequest) -> Result<reqwest::Response, OllamaError> {
        let url = format!("{}/api/chat", self.base_url);
        
        let mut stream_request = request.clone();
        stream_request.stream = true;
        
        let response = self.client
            .post(&url)
            .json(&stream_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(OllamaError::ApiError(error_text));
        }

        Ok(response)
    }

    pub async fn list_models(&self) -> Result<ListModelsResponse, OllamaError> {
        let url = format!("{}/api/tags", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(OllamaError::ApiError(error_text));
        }

        let models_response: ListModelsResponse = response.json().await
            .map_err(|e| OllamaError::InvalidResponse(e.to_string()))?;

        Ok(models_response)
    }

    pub async fn pull_model(&self, model: &str) -> Result<(), OllamaError> {
        let url = format!("{}/api/pull", self.base_url);
        
        #[derive(Serialize)]
        struct PullRequest {
            name: String,
            stream: bool,
        }
        
        let pull_request = PullRequest {
            name: model.to_string(),
            stream: false,
        };

        let response = self.client
            .post(&url)
            .json(&pull_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(OllamaError::ApiError(error_text));
        }

        Ok(())
    }

    pub async fn generate(&self, prompt: &str, model: &str) -> Result<String, OllamaError> {
        let url = format!("{}/api/generate", self.base_url);
        
        #[derive(Serialize)]
        struct GenerateRequest {
            model: String,
            prompt: String,
            stream: bool,
        }
        
        let generate_request = GenerateRequest {
            model: model.to_string(),
            prompt: prompt.to_string(),
            stream: false,
        };

        let response = self.client
            .post(&url)
            .json(&generate_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(OllamaError::ApiError(error_text));
        }

        #[derive(Deserialize)]
        struct GenerateResponse {
            response: String,
        }

        let generate_response: GenerateResponse = response.json().await
            .map_err(|e| OllamaError::InvalidResponse(e.to_string()))?;

        Ok(generate_response.response)
    }
}

impl Default for OllamaClient {
    fn default() -> Self {
        Self::new(None)
    }
}

pub struct OllamaState {
    pub client: Arc<Mutex<OllamaClient>>,
}

impl Default for OllamaState {
    fn default() -> Self {
        Self {
            client: Arc::new(Mutex::new(OllamaClient::default())),
        }
    }
}

#[tauri::command]
pub async fn ollama_chat(
    model: String,
    messages: Vec<Message>,
    options: Option<ChatOptions>,
    state: State<'_, OllamaState>
) -> Result<ChatResponse, String> {
    let client = state.client.lock().await;
    
    let request = ChatRequest {
        model,
        messages,
        stream: false,
        options,
    };
    
    // Simple logging for debugging
    println!("Sending Ollama chat request to model: {}", request.model);
    
    match client.chat(request).await {
        Ok(response) => Ok(response),
        Err(e) => {
            println!("Ollama chat error: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn ollama_chat_stream(
    window: Window,
    model: String,
    messages: Vec<Message>,
    options: Option<ChatOptions>,
    state: State<'_, OllamaState>
) -> Result<String, String> {
    let client = state.client.lock().await;
    
    let request = ChatRequest {
        model,
        messages,
        stream: true,
        options,
    };
    
    let response = client.chat_stream_request(request)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        // Use lossy utf8 conversion to handle potential split multibyte characters
        // In a perfect implementation we would use a decoder
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        while let Some(pos) = buffer.find('\n') {
            let line_str = buffer.drain(..=pos).collect::<String>();
            let line = line_str.trim();
            if line.is_empty() {
                continue;
            }

            // Parse each line as JSON
            match serde_json::from_str::<StreamResponse>(line) {
                Ok(stream_res) => {
                    if let Some(msg) = stream_res.message {
                        if !msg.content.is_empty() {
                            // Emit the chunk content to the frontend
                            if let Err(e) = window.emit("ollama-stream", &msg.content) {
                                println!("Failed to emit event: {}", e);
                            }
                            full_response.push_str(&msg.content);
                        }
                    }
                },
                Err(e) => {
                    println!("Failed to parse stream line: {} - Error: {}", line, e);
                }
            }
        }
    }
    
    Ok(full_response)
}

#[tauri::command]
pub async fn ollama_list_models(
    state: State<'_, OllamaState>
) -> Result<ListModelsResponse, String> {
    let client = state.client.lock().await;
    client.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ollama_pull_model(
    model: String,
    state: State<'_, OllamaState>
) -> Result<(), String> {
    let client = state.client.lock().await;
    client.pull_model(&model).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ollama_generate(
    prompt: String,
    model: String,
    state: State<'_, OllamaState>
) -> Result<String, String> {
    let client = state.client.lock().await;
    client.generate(&prompt, &model).await.map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaLocalModel {
    pub name: String,
    pub size: String,
    pub digest: String,
}

#[tauri::command]
pub async fn ollama_list_local_models() -> Result<Vec<OllamaLocalModel>, String> {
    let output = Command::new("ollama")
        .arg("list")
        .output()
        .map_err(|e| format!("Failed to execute ollama list: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Ollama list command failed: {}", error));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut models = Vec::new();

    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            models.push(OllamaLocalModel {
                name: parts[0].to_string(),
                size: parts[1].to_string(),
                digest: parts[2].to_string(),
            });
        }
    }

    Ok(models)
}
