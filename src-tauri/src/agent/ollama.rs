use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures_util::StreamExt;
use std::error::Error;
use crate::agent::openai::ChatMessage;

#[derive(Debug, Serialize)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize)]
pub struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct OllamaChatResponseChunk {
    pub message: Option<OllamaMessage>,
    #[allow(dead_code)]
    pub done: bool,
}

#[derive(Debug, Deserialize)]
pub struct OllamaMessage {
    pub content: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OllamaModelList {
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
    pub digest: String,
}

pub struct OllamaClient {
    base_url: String,
    client: Client,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>) -> Self {
        let mut url = base_url
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
        
        // Добавляем протокол, если он отсутствует
        if !url.contains("://") {
            url = format!("http://{}", url);
        }
        
        // Заменяем localhost на 127.0.0.1 для надежности (избегаем проблем с IPv6/прокси)
        if url.contains("localhost") {
            url = url.replace("localhost", "127.0.0.1");
        }

        // Убираем завершающий слэш, так как он добавляется в методах
        if url.ends_with('/') {
            url.pop();
        }

        // Создаем клиент с отключенным прокси, так как 502 часто возникает из-за попытки 
        // системного прокси обработать локальный трафик
        let client = Client::builder()
            .no_proxy()
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            base_url: url,
            client,
        }
    }

    pub async fn list_models(&self) -> Result<Vec<OllamaModel>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/api/tags", self.base_url);
        let response = self.client.get(&url).send().await.map_err(|e| {
            format!("Failed to connect to Ollama at {}: {}", url, e)
        })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Ollama API error: {} (Status: {}, URL: {})", error_text, status, url).into());
        }

        let model_list: OllamaModelList = response.json().await.map_err(|e| {
            format!("Failed to parse Ollama models response: {}. URL: {}", e, url)
        })?;
        Ok(model_list.models)
    }

    pub async fn chat_stream(
        &self,
        request: OllamaChatRequest,
    ) -> Result<impl futures_util::Stream<Item = Result<String, Box<dyn Error + Send + Sync>>>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/api/chat", self.base_url);
        
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await.map_err(|e| {
                format!("Failed to connect to Ollama for chat at {}: {}", url, e)
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Ollama API error: {} (Status: {}, URL: {})", error_text, status, url).into());
        }

        let mut buffer = Vec::new();
        let stream = response.bytes_stream().map(move |item| {
            match item {
                Ok(bytes) => {
                    buffer.extend_from_slice(&bytes);
                    let mut content = String::new();
                    
                    loop {
                        let line_end = buffer.iter().position(|&b| b == b'\n');
                        if let Some(pos) = line_end {
                            let line_bytes = buffer.drain(..pos + 1).collect::<Vec<u8>>();
                            let line_str = String::from_utf8_lossy(&line_bytes);
                            let line = line_str.trim();
                            
                            if !line.is_empty() {
                                if let Ok(chunk) = serde_json::from_str::<OllamaChatResponseChunk>(line) {
                                    if let Some(message) = chunk.message {
                                        content.push_str(&message.content);
                                    }
                                }
                            }
                        } else {
                            break;
                        }
                    }
                    Ok(content)
                }
                Err(e) => Err(Box::new(e) as Box<dyn Error + Send + Sync>),
            }
        });

        Ok(stream)
    }
}
