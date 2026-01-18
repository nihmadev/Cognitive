use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CommandCategory {
    File,
    Edit,
    Selection,
    View,
    Go,
    Run,
    Terminal,
    Git,
    Ai,
    Settings,
    Help,
    Custom,
}

impl CommandCategory {
    pub fn label(&self) -> &'static str {
        match self {
            Self::File => "File",
            Self::Edit => "Edit",
            Self::Selection => "Selection",
            Self::View => "View",
            Self::Go => "Go",
            Self::Run => "Run",
            Self::Terminal => "Terminal",
            Self::Git => "Git",
            Self::Ai => "AI",
            Self::Settings => "Settings",
            Self::Help => "Help",
            Self::Custom => "Custom",
        }
    }
}


#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CommandSource {
    Builtin,
    Plugin,
    User,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    
    pub id: String,
    
    pub label: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    pub category: CommandCategory,
    
    pub source: CommandSource,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandWithKeybinding {
    #[serde(flatten)]
    pub command: Command,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keybinding: Option<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandSearchResult {
    #[serde(flatten)]
    pub command: CommandWithKeybinding,
    
    pub score: i32,
    
    pub matched_indices: Vec<usize>,
}


#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<CommandCategory>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<CommandSource>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    
    #[serde(default)]
    pub include_disabled: bool,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}
