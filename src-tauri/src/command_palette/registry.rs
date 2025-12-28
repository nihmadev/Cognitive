use std::collections::HashMap;
use std::sync::RwLock;

use crate::command_palette::fuzzy::fuzzy_match_multi;
use crate::command_palette::types::{
    Command, CommandCategory, CommandSearchResult, CommandSource, CommandWithKeybinding,
    SearchOptions,
};

/// Central registry for all commands
pub struct CommandRegistry {
    commands: RwLock<HashMap<String, Command>>,
}

impl CommandRegistry {
    pub fn new() -> Self {
        Self {
            commands: RwLock::new(HashMap::new()),
        }
    }

    /// Register a new command
    pub fn register(&self, command: Command) -> Result<(), String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        
        if commands.contains_key(&command.id) {
            return Err(format!("Command '{}' already registered", command.id));
        }
        
        commands.insert(command.id.clone(), command);
        Ok(())
    }

    /// Register multiple commands at once
    pub fn register_many(&self, cmds: Vec<Command>) -> Result<(), String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        
        for cmd in cmds {
            if !commands.contains_key(&cmd.id) {
                commands.insert(cmd.id.clone(), cmd);
            }
        }
        Ok(())
    }

    /// Unregister a command by ID
    pub fn unregister(&self, id: &str) -> Result<bool, String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        Ok(commands.remove(id).is_some())
    }

    /// Unregister all commands from a specific source
    pub fn unregister_by_source(&self, source: CommandSource) -> Result<usize, String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        let before = commands.len();
        commands.retain(|_, cmd| cmd.source != source);
        Ok(before - commands.len())
    }

    /// Get a command by ID
    pub fn get(&self, id: &str) -> Option<Command> {
        self.commands.read().ok()?.get(id).cloned()
    }

    /// Get all commands
    pub fn get_all(&self) -> Vec<Command> {
        self.commands
            .read()
            .map(|c| c.values().cloned().collect())
            .unwrap_or_default()
    }

    /// Get commands by category
    pub fn get_by_category(&self, category: CommandCategory) -> Vec<Command> {
        self.commands
            .read()
            .map(|c| {
                c.values()
                    .filter(|cmd| cmd.category == category)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Search commands with fuzzy matching
    pub fn search(
        &self,
        query: &str,
        options: SearchOptions,
        keybindings: &HashMap<String, String>,
    ) -> Vec<CommandSearchResult> {
        let commands = match self.commands.read() {
            Ok(c) => c,
            Err(_) => return vec![],
        };

        let mut results: Vec<CommandSearchResult> = commands
            .values()
            .filter(|cmd| {
                // Filter by enabled
                if !options.include_disabled && !cmd.enabled {
                    return false;
                }
                // Filter by category
                if let Some(ref cat) = options.category {
                    if &cmd.category != cat {
                        return false;
                    }
                }
                // Filter by source
                if let Some(ref src) = options.source {
                    if &cmd.source != src {
                        return false;
                    }
                }
                // Filter by context
                if let Some(ref ctx) = options.context {
                    if let Some(ref when) = cmd.when {
                        if !context_matches(when, ctx) {
                            return false;
                        }
                    }
                }
                true
            })
            .filter_map(|cmd| {
                let fuzzy_result = fuzzy_match_multi(
                    query,
                    &cmd.label,
                    cmd.description.as_deref(),
                    cmd.category.label(),
                )?;

                Some(CommandSearchResult {
                    command: CommandWithKeybinding {
                        command: cmd.clone(),
                        keybinding: keybindings.get(&cmd.id).cloned(),
                    },
                    score: fuzzy_result.score,
                    matched_indices: fuzzy_result.matched_indices,
                })
            })
            .collect();

        // Sort by score descending
        results.sort_by(|a, b| b.score.cmp(&a.score));

        // Apply limit
        if let Some(limit) = options.limit {
            results.truncate(limit);
        }

        results
    }

    /// Enable/disable a command
    pub fn set_enabled(&self, id: &str, enabled: bool) -> Result<bool, String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        if let Some(cmd) = commands.get_mut(id) {
            cmd.enabled = enabled;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Update command label/description
    pub fn update(
        &self,
        id: &str,
        label: Option<String>,
        description: Option<String>,
    ) -> Result<bool, String> {
        let mut commands = self.commands.write().map_err(|e| e.to_string())?;
        if let Some(cmd) = commands.get_mut(id) {
            if let Some(l) = label {
                cmd.label = l;
            }
            if let Some(d) = description {
                cmd.description = Some(d);
            }
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Get command count
    pub fn count(&self) -> usize {
        self.commands.read().map(|c| c.len()).unwrap_or(0)
    }
}

impl Default for CommandRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple context matching (can be extended for complex expressions)
fn context_matches(when: &str, context: &str) -> bool {
    // Simple implementation: check if context contains the when condition
    // Can be extended to support && || ! operators
    context.contains(when) || when == "*"
}
