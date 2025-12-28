use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::keybindings::defaults::get_default_keybindings;
use crate::keybindings::types::{
    Keybinding, KeybindingConflict, KeybindingEntry, KeybindingLookupResult, KeybindingSource,
};
use crate::keybindings::utils::{evaluate_when_clause, normalize_key_combo};

/// Keybindings store
#[derive(Debug, Default)]
pub struct KeybindingsStore {
    default_bindings: Vec<KeybindingEntry>,
    user_bindings: Vec<KeybindingEntry>,
    /// Cached merged bindings (user overrides default)
    merged: Vec<KeybindingEntry>,
    /// Index by normalized key combo for fast lookup
    index: HashMap<String, Vec<usize>>,
}

impl KeybindingsStore {
    pub fn new() -> Self {
        let mut store = Self::default();
        store.load_defaults();
        store.rebuild_index();
        store
    }

    /// Load default keybindings
    fn load_defaults(&mut self) {
        self.default_bindings = get_default_keybindings()
            .into_iter()
            .map(|b| KeybindingEntry {
                binding: b,
                source: KeybindingSource::Default,
                disabled: false,
            })
            .collect();
    }

    /// Load user keybindings from config file
    pub fn load_user_bindings(&mut self, config_path: &PathBuf) -> Result<(), String> {
        if !config_path.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(config_path)
            .map_err(|e| format!("Failed to read keybindings file: {}", e))?;

        let bindings: Vec<Keybinding> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse keybindings: {}", e))?;

        self.user_bindings = bindings
            .into_iter()
            .map(|b| KeybindingEntry {
                binding: b,
                source: KeybindingSource::User,
                disabled: false,
            })
            .collect();

        self.rebuild_merged();
        self.rebuild_index();
        Ok(())
    }

    /// Save user keybindings to config file
    pub fn save_user_bindings(&self, config_path: &PathBuf) -> Result<(), String> {
        let bindings: Vec<&Keybinding> = self.user_bindings.iter().map(|e| &e.binding).collect();

        let content = serde_json::to_string_pretty(&bindings)
            .map_err(|e| format!("Failed to serialize keybindings: {}", e))?;

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        fs::write(config_path, content)
            .map_err(|e| format!("Failed to write keybindings file: {}", e))?;

        Ok(())
    }

    /// Rebuild merged bindings (user overrides default)
    fn rebuild_merged(&mut self) {
        let mut merged = self.default_bindings.clone();

        // User bindings override defaults by command
        for user_entry in &self.user_bindings {
            if let Some(idx) = merged
                .iter()
                .position(|e| e.binding.command == user_entry.binding.command)
            {
                merged[idx] = user_entry.clone();
            } else {
                merged.push(user_entry.clone());
            }
        }

        self.merged = merged;
    }

    /// Rebuild index for fast lookup
    fn rebuild_index(&mut self) {
        self.rebuild_merged();
        self.index.clear();

        for (idx, entry) in self.merged.iter().enumerate() {
            if entry.disabled {
                continue;
            }
            let key_combo = normalize_key_combo(&entry.binding.modifiers, &entry.binding.key);
            self.index.entry(key_combo).or_default().push(idx);
        }
    }

    /// Lookup keybinding by key combo
    pub fn lookup(
        &self,
        modifiers: &[crate::keybindings::types::Modifier],
        key: &str,
        context: Option<&str>,
    ) -> KeybindingLookupResult {
        let key_combo = normalize_key_combo(modifiers, key);

        let indices = match self.index.get(&key_combo) {
            Some(indices) => indices,
            None => return KeybindingLookupResult::None,
        };

        let mut matching: Vec<KeybindingEntry> = indices
            .iter()
            .filter_map(|&idx| {
                let entry = &self.merged[idx];
                // Check context condition
                if let Some(when) = &entry.binding.when {
                    if let Some(ctx) = context {
                        if !evaluate_when_clause(when, ctx) {
                            return None;
                        }
                    }
                }
                Some(entry.clone())
            })
            .collect();

        match matching.len() {
            0 => KeybindingLookupResult::None,
            1 => {
                let entry = matching.remove(0);
                if entry.binding.is_chord {
                    KeybindingLookupResult::ChordPending {
                        bindings: vec![entry],
                    }
                } else {
                    KeybindingLookupResult::Single { binding: entry }
                }
            }
            _ => {
                // Check if all are chord starters
                let all_chords = matching.iter().all(|e| e.binding.is_chord);
                if all_chords {
                    KeybindingLookupResult::ChordPending { bindings: matching }
                } else {
                    KeybindingLookupResult::Conflict {
                        conflict: KeybindingConflict {
                            key_combo,
                            bindings: matching,
                        },
                    }
                }
            }
        }
    }

    /// Complete chord lookup (second part)
    pub fn lookup_chord(
        &self,
        first_modifiers: &[crate::keybindings::types::Modifier],
        first_key: &str,
        second_modifiers: &[crate::keybindings::types::Modifier],
        second_key: &str,
        context: Option<&str>,
    ) -> KeybindingLookupResult {
        let first_combo = normalize_key_combo(first_modifiers, first_key);
        let second_combo = normalize_key_combo(second_modifiers, second_key);

        let indices = match self.index.get(&first_combo) {
            Some(indices) => indices,
            None => return KeybindingLookupResult::None,
        };

        let matching: Vec<KeybindingEntry> = indices
            .iter()
            .filter_map(|&idx| {
                let entry = &self.merged[idx];
                if !entry.binding.is_chord {
                    return None;
                }

                // Check chord part matches
                if let Some(chord) = &entry.binding.chord_part {
                    let chord_combo = normalize_key_combo(&chord.modifiers, &chord.key);
                    if chord_combo != second_combo {
                        return None;
                    }
                } else {
                    return None;
                }

                // Check context
                if let Some(when) = &entry.binding.when {
                    if let Some(ctx) = context {
                        if !evaluate_when_clause(when, ctx) {
                            return None;
                        }
                    }
                }
                Some(entry.clone())
            })
            .collect();

        match matching.len() {
            0 => KeybindingLookupResult::None,
            1 => KeybindingLookupResult::Single {
                binding: matching.into_iter().next().unwrap(),
            },
            _ => KeybindingLookupResult::Conflict {
                conflict: KeybindingConflict {
                    key_combo: format!("{} {}", first_combo, second_combo),
                    bindings: matching,
                },
            },
        }
    }

    /// Add or update user keybinding
    pub fn set_user_binding(&mut self, binding: Keybinding) {
        // Remove existing binding for same command
        self.user_bindings
            .retain(|e| e.binding.command != binding.command);

        self.user_bindings.push(KeybindingEntry {
            binding,
            source: KeybindingSource::User,
            disabled: false,
        });

        self.rebuild_index();
    }

    /// Remove user keybinding (reverts to default if exists)
    pub fn remove_user_binding(&mut self, command: &str) {
        self.user_bindings.retain(|e| e.binding.command != command);
        self.rebuild_index();
    }

    /// Disable a keybinding
    pub fn disable_binding(&mut self, command: &str) {
        // Add disabled user binding to override default
        if let Some(entry) = self.merged.iter().find(|e| e.binding.command == command) {
            let mut disabled_entry = entry.clone();
            disabled_entry.disabled = true;
            disabled_entry.source = KeybindingSource::User;

            self.user_bindings.retain(|e| e.binding.command != command);
            self.user_bindings.push(disabled_entry);
            self.rebuild_index();
        }
    }

    /// Get all keybindings
    pub fn get_all(&self) -> Vec<KeybindingEntry> {
        self.merged.clone()
    }

    /// Get conflicts
    pub fn get_conflicts(&self) -> Vec<KeybindingConflict> {
        let mut conflicts = Vec::new();
        let mut seen: HashMap<String, Vec<usize>> = HashMap::new();

        for (idx, entry) in self.merged.iter().enumerate() {
            if entry.disabled {
                continue;
            }
            let key_combo = normalize_key_combo(&entry.binding.modifiers, &entry.binding.key);
            seen.entry(key_combo).or_default().push(idx);
        }

        for (key_combo, indices) in seen {
            if indices.len() > 1 {
                // Check if they have different contexts (not a real conflict)
                let bindings: Vec<_> = indices.iter().map(|&i| self.merged[i].clone()).collect();
                let all_have_context = bindings.iter().all(|b| b.binding.when.is_some());

                if !all_have_context {
                    conflicts.push(KeybindingConflict { key_combo, bindings });
                }
            }
        }

        conflicts
    }

    /// Reset to defaults
    pub fn reset_to_defaults(&mut self) {
        self.user_bindings.clear();
        self.rebuild_index();
    }
}
