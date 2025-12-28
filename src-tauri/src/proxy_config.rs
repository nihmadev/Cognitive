use std::env;

pub struct ProxyConfig {
    pub enabled: bool,
    pub base_url: String,
}

impl ProxyConfig {
    pub fn from_env() -> Self {
        let enabled = env::var("PROXY_ENABLED").unwrap_or_else(|_| "false".to_string()) == "true";
        let base_url = env::var("PROXY_BASE_URL")
            .unwrap_or_else(|_| "https://your-vercel-domain.vercel.app/api".to_string());
        
        Self { enabled, base_url }
    }

    pub fn get_openai_url(&self) -> String {
        if self.enabled {
            format!("{}/openai/v1/chat/completions", self.base_url)
        } else {
            "https://api.openai.com/v1/chat/completions".to_string()
        }
    }

    pub fn get_openai_models_url(&self) -> String {
        if self.enabled {
            format!("{}/openai/v1/models", self.base_url)
        } else {
            "https://api.openai.com/v1/models".to_string()
        }
    }
}
