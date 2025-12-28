use serde::{Deserialize, Serialize};

/// Command category for grouping in palette
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

/// Source of command registration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CommandSource {
    Builtin,
    Plugin,
    User,
}

/// A command definition in the palette
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    /// Unique command identifier (e.g., "file.save", "git.commit")
    pub id: String,
    /// Display label in palette
    pub label: String,
    /// Optional description/detail
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Category for grouping
    pub category: CommandCategory,
    /// Source of registration
    pub source: CommandSource,
    /// Context condition when command is available
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>,
    /// Optional icon identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// Whether command is currently enabled
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

/// Command with keybinding info for display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandWithKeybinding {
    #[serde(flatten)]
    pub command: Command,
    /// Formatted keybinding string (e.g., "Ctrl+S")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keybinding: Option<String>,
}

/// Search result with fuzzy match score
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandSearchResult {
    #[serde(flatten)]
    pub command: CommandWithKeybinding,
    /// Fuzzy match score (higher = better match)
    pub score: i32,
    /// Matched character indices for highlighting
    pub matched_indices: Vec<usize>,
}

/// Options for command search
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    /// Filter by category
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<CommandCategory>,
    /// Filter by source
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<CommandSource>,
    /// Maximum results to return
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    /// Include disabled commands
    #[serde(default)]
    pub include_disabled: bool,
    /// Current context for filtering
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}
