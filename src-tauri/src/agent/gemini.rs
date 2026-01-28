use serde::{Deserialize, Serialize};
use reqwest::Client;
use futures_util::StreamExt;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeminiPart {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeminiContent {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiRequest {
    pub contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_instruction: Option<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GeminiConfig>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct GeminiResponseChunk {
    pub candidates: Vec<Candidate>,
}

#[derive(Debug, Deserialize)]
pub struct Candidate {
    pub content: GeminiContent,
    #[allow(dead_code)]
    pub finish_reason: Option<String>,
}

pub struct GeminiClient {
    api_key: String,
    client: Client,
}

impl GeminiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: Client::new(),
        }
    }

    pub async fn chat_stream(
        &self,
        model: &str,
        request: GeminiRequest,
    ) -> Result<impl futures_util::Stream<Item = Result<String, Box<dyn Error + Send + Sync>>>, Box<dyn Error + Send + Sync>> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}",
            model, self.api_key
        );
        
        let response = self.client
            .post(url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(format!("Gemini API error: {}", error_text).into());
        }

        let mut buffer = Vec::new();
        let stream = response.bytes_stream().map(move |item| {
            match item {
                Ok(bytes) => {
                    buffer.extend_from_slice(&bytes);
                    let mut content = String::new();
                    
                    let text = String::from_utf8_lossy(&buffer).to_string();
                    
                    // Gemini streaming can be tricky. It often returns a JSON array that grows.
                    // Or individual chunks. We try to find complete JSON objects.
                    
                    let mut last_pos = 0;
                    let mut depth = 0;
                    let mut in_string = false;
                    let mut escaped = false;
                    
                    let chars: Vec<(usize, char)> = text.char_indices().collect();
                    let mut i = 0;
                    while i < chars.len() {
                        let (idx, c) = chars[i];
                        if escaped {
                            escaped = false;
                            i += 1;
                            continue;
                        }
                        match c {
                            '\\' => escaped = true,
                            '"' => in_string = !in_string,
                            '{' | '[' if !in_string => {
                                if depth == 0 {
                                    last_pos = idx;
                                }
                                depth += 1;
                            }
                            '}' | ']' if !in_string => {
                                if depth > 0 {
                                    depth -= 1;
                                    if depth == 0 {
                                        let end_idx = if i + 1 < chars.len() { chars[i+1].0 } else { text.len() };
                                        let json_str = &text[last_pos..end_idx];
                                        
                                        // Try to parse as single chunk
                                        if let Ok(chunk) = serde_json::from_str::<GeminiResponseChunk>(json_str) {
                                            for candidate in chunk.candidates {
                                                for part in candidate.content.parts {
                                                    content.push_str(&part.text);
                                                }
                                            }
                                        } 
                                        // Try to parse as array of chunks
                                        else if let Ok(chunks) = serde_json::from_str::<Vec<GeminiResponseChunk>>(json_str) {
                                            for chunk in chunks {
                                                for candidate in chunk.candidates {
                                                    for part in candidate.content.parts {
                                                        content.push_str(&part.text);
                                                    }
                                                }
                                            }
                                        }
                                        last_pos = end_idx;
                                    }
                                }
                            }
                            _ => {}
                        }
                        i += 1;
                    }
                    
                    // Remove processed part from buffer
                    if last_pos > 0 {
                        let processed_bytes = text[..last_pos].as_bytes().len();
                        buffer.drain(..processed_bytes);
                    }
                    
                    Ok(content)
                }
                Err(e) => Err(Box::new(e) as Box<dyn Error + Send + Sync>),
            }
        });

        Ok(stream)
    }
}
