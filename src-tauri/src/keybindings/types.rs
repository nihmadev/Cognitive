use serde::{Deserialize, Serialize};

/// Modifier keys for keybindings
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Modifier {
    Ctrl,
    Shift,
    Alt,
    Meta, // Cmd on macOS, Win on Windows
}

/// A single keybinding definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keybinding {
    pub id: String,
    pub key: String,
    pub modifiers: Vec<Modifier>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>, // context condition (e.g., "editorFocus", "sidebarFocus")
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
    #[serde(default)]
    pub is_chord: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chord_part: Option<ChordPart>, // second part of chord shortcut
}

/// Second part of a chord keybinding (e.g., Ctrl+K Ctrl+O)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChordPart {
    pub key: String,
    pub modifiers: Vec<Modifier>,
}

/// Keybinding source - default or user-defined
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeybindingSource {
    Default,
    User,
}

/// Keybinding with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingEntry {
    #[serde(flatten)]
    pub binding: Keybinding,
    pub source: KeybindingSource,
    #[serde(default)]
    pub disabled: bool,
}

/// Conflict information when multiple bindings share the same key combo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingConflict {
    pub key_combo: String,
    pub bindings: Vec<KeybindingEntry>,
}

/// Result of keybinding lookup
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum KeybindingLookupResult {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "single")]
    Single { binding: KeybindingEntry },
    #[serde(rename = "chord_pending")]
    ChordPending { bindings: Vec<KeybindingEntry> },
    #[serde(rename = "conflict")]
    Conflict { conflict: KeybindingConflict },
}
