use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures_util::StreamExt;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponseChunk {
    pub choices: Vec<ChoiceChunk>,
}

#[derive(Debug, Deserialize)]
pub struct ChoiceChunk {
    pub delta: Delta,
    #[allow(dead_code)]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Delta {
    pub content: Option<String>,
}

pub struct OpenAIClient {
    api_key: String,
    base_url: String,
    client: Client,
}

impl OpenAIClient {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            client: Client::new(),
        }
    }

    pub async fn chat_stream(
        &self,
        request: ChatRequest,
    ) -> Result<impl futures_util::Stream<Item = Result<String, Box<dyn Error + Send + Sync>>>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("OpenAI API error: {}", error_text).into());
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
                            
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if data == "[DONE]" {
                                    continue;
                                }
                                
                                if let Ok(chunk) = serde_json::from_str::<ChatResponseChunk>(data) {
                                    if let Some(choice) = chunk.choices.get(0) {
                                        if let Some(delta_content) = &choice.delta.content {
                                            content.push_str(delta_content);
                                        }
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
