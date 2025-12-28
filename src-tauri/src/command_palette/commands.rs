use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use crate::command_palette::defaults::get_default_commands;
use crate::command_palette::registry::CommandRegistry;
use crate::command_palette::types::{
    Command, CommandCategory, CommandSearchResult, CommandSource, CommandWithKeybinding,
    SearchOptions,
};
use crate::keybindings::KeybindingsState;

/// State wrapper for command registry
pub struct CommandPaletteState(Mutex<CommandRegistry>);

impl CommandPaletteState {
    pub fn new() -> Self {
        Self(Mutex::new(CommandRegistry::new()))
    }

    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, CommandRegistry>, String> {
        self.0.lock().map_err(|e| e.to_string())
    }
}

impl Default for CommandPaletteState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize command palette with default commands
#[tauri::command]
pub fn command_palette_init(state: State<'_, CommandPaletteState>) -> Result<usize, String> {
    let registry = state.lock()?;
    let commands = get_default_commands();
    let count = commands.len();
    registry.register_many(commands)?;
    Ok(count)
}

/// Search commands with fuzzy matching
#[tauri::command]
pub fn command_palette_search(
    query: String,
    options: Option<SearchOptions>,
    state: State<'_, CommandPaletteState>,
    keybindings_state: State<'_, KeybindingsState>,
) -> Result<Vec<CommandSearchResult>, String> {
    let registry = state.lock()?;
    let kb_store = keybindings_state.lock().map_err(|e| e.to_string())?;
    
    // Build keybinding map for display
    let keybindings: HashMap<String, String> = kb_store
        .get_all()
        .into_iter()
        .filter(|entry| !entry.disabled)
        .map(|entry| {
            let display = format_keybinding(&entry.binding);
            (entry.binding.command, display)
        })
        .collect();

    let opts = options.unwrap_or_default();
    Ok(registry.search(&query, opts, &keybindings))
}

/// Get all commands (optionally filtered)
#[tauri::command]
pub fn command_palette_get_all(
    category: Option<CommandCategory>,
    state: State<'_, CommandPaletteState>,
    keybindings_state: State<'_, KeybindingsState>,
) -> Result<Vec<CommandWithKeybinding>, String> {
    let registry = state.lock()?;
    let kb_store = keybindings_state.lock().map_err(|e| e.to_string())?;
    
    let keybindings: HashMap<String, String> = kb_store
        .get_all()
        .into_iter()
        .filter(|entry| !entry.disabled)
        .map(|entry| {
            let display = format_keybinding(&entry.binding);
            (entry.binding.command, display)
        })
        .collect();

    let commands = match category {
        Some(cat) => registry.get_by_category(cat),
        None => registry.get_all(),
    };

    Ok(commands
        .into_iter()
        .map(|cmd| CommandWithKeybinding {
            keybinding: keybindings.get(&cmd.id).cloned(),
            command: cmd,
        })
        .collect())
}

/// Get a single command by ID
#[tauri::command]
pub fn command_palette_get(
    id: String,
    state: State<'_, CommandPaletteState>,
    keybindings_state: State<'_, KeybindingsState>,
) -> Result<Option<CommandWithKeybinding>, String> {
    let registry = state.lock()?;
    
    match registry.get(&id) {
        Some(cmd) => {
            let kb_store = keybindings_state.lock().map_err(|e| e.to_string())?;
            let keybinding = kb_store
                .get_all()
                .into_iter()
                .find(|e| e.binding.command == id && !e.disabled)
                .map(|e| format_keybinding(&e.binding));
            
            Ok(Some(CommandWithKeybinding { command: cmd, keybinding }))
        }
        None => Ok(None),
    }
}

/// Register a custom command (from plugin or user)
#[tauri::command]
pub fn command_palette_register(
    command: Command,
    state: State<'_, CommandPaletteState>,
) -> Result<(), String> {
    let registry = state.lock()?;
    registry.register(command)
}

/// Register multiple commands at once
#[tauri::command]
pub fn command_palette_register_many(
    commands: Vec<Command>,
    state: State<'_, CommandPaletteState>,
) -> Result<usize, String> {
    let registry = state.lock()?;
    let count = commands.len();
    registry.register_many(commands)?;
    Ok(count)
}

/// Unregister a command
#[tauri::command]
pub fn command_palette_unregister(
    id: String,
    state: State<'_, CommandPaletteState>,
) -> Result<bool, String> {
    let registry = state.lock()?;
    registry.unregister(&id)
}

/// Unregister all commands from a source (e.g., when plugin unloads)
#[tauri::command]
pub fn command_palette_unregister_source(
    source: CommandSource,
    state: State<'_, CommandPaletteState>,
) -> Result<usize, String> {
    let registry = state.lock()?;
    registry.unregister_by_source(source)
}

/// Enable or disable a command
#[tauri::command]
pub fn command_palette_set_enabled(
    id: String,
    enabled: bool,
    state: State<'_, CommandPaletteState>,
) -> Result<bool, String> {
    let registry = state.lock()?;
    registry.set_enabled(&id, enabled)
}

/// Update command label/description
#[tauri::command]
pub fn command_palette_update(
    id: String,
    label: Option<String>,
    description: Option<String>,
    state: State<'_, CommandPaletteState>,
) -> Result<bool, String> {
    let registry = state.lock()?;
    registry.update(&id, label, description)
}

/// Get command count
#[tauri::command]
pub fn command_palette_count(state: State<'_, CommandPaletteState>) -> Result<usize, String> {
    let registry = state.lock()?;
    Ok(registry.count())
}

/// Get all categories with command counts
#[tauri::command]
pub fn command_palette_categories(
    state: State<'_, CommandPaletteState>,
) -> Result<Vec<(String, usize)>, String> {
    let registry = state.lock()?;
    
    let categories = [
        CommandCategory::File,
        CommandCategory::Edit,
        CommandCategory::Selection,
        CommandCategory::View,
        CommandCategory::Go,
        CommandCategory::Run,
        CommandCategory::Terminal,
        CommandCategory::Git,
        CommandCategory::Ai,
        CommandCategory::Settings,
        CommandCategory::Help,
        CommandCategory::Custom,
    ];
    
    Ok(categories
        .iter()
        .map(|cat| {
            let count = registry.get_by_category(cat.clone()).len();
            (cat.label().to_string(), count)
        })
        .filter(|(_, count)| *count > 0)
        .collect())
}

/// Format keybinding for display
fn format_keybinding(binding: &crate::keybindings::types::Keybinding) -> String {
    use crate::keybindings::types::Modifier;
    
    let mut parts = Vec::new();
    
    for modifier in &binding.modifiers {
        parts.push(match modifier {
            Modifier::Ctrl => "Ctrl",
            Modifier::Shift => "Shift",
            Modifier::Alt => "Alt",
            Modifier::Meta => {
                #[cfg(target_os = "macos")]
                { "⌘" }
                #[cfg(not(target_os = "macos"))]
                { "Win" }
            }
        });
    }
    
    parts.push(&binding.key);
    
    let first_part = parts.join("+");
    
    if let Some(ref chord) = binding.chord_part {
        let mut chord_parts = Vec::new();
        for modifier in &chord.modifiers {
            chord_parts.push(match modifier {
                Modifier::Ctrl => "Ctrl",
                Modifier::Shift => "Shift",
                Modifier::Alt => "Alt",
                Modifier::Meta => {
                    #[cfg(target_os = "macos")]
                    { "⌘" }
                    #[cfg(not(target_os = "macos"))]
                    { "Win" }
                }
            });
        }
        chord_parts.push(&chord.key);
        format!("{} {}", first_part, chord_parts.join("+"))
    } else {
        first_part
    }
}
