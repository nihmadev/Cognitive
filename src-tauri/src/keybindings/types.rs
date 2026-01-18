use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Modifier {
    Ctrl,
    Shift,
    Alt,
    Meta, 
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keybinding {
    pub id: String,
    pub key: String,
    pub modifiers: Vec<Modifier>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>, 
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<serde_json::Value>,
    #[serde(default)]
    pub is_chord: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chord_part: Option<ChordPart>, 
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChordPart {
    pub key: String,
    pub modifiers: Vec<Modifier>,
}


#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeybindingSource {
    Default,
    User,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingEntry {
    #[serde(flatten)]
    pub binding: Keybinding,
    pub source: KeybindingSource,
    #[serde(default)]
    pub disabled: bool,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingConflict {
    pub key_combo: String,
    pub bindings: Vec<KeybindingEntry>,
}


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
