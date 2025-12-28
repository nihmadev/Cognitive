use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::keybindings::store::KeybindingsStore;
use crate::keybindings::types::{
    Keybinding, KeybindingConflict, KeybindingEntry, KeybindingLookupResult, Modifier,
};
use crate::keybindings::utils::normalize_platform_modifiers;

pub type KeybindingsState = Mutex<KeybindingsStore>;

/// Get config path for keybindings
fn get_keybindings_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("keybindings.json")
}

/// Initialize keybindings store
#[tauri::command]
pub fn keybindings_init(app: AppHandle, state: State<'_, KeybindingsState>) -> Result<(), String> {
    let config_path = get_keybindings_path(&app);
    let mut store = state.lock().map_err(|e| e.to_string())?;
    store.load_user_bindings(&config_path)?;
    Ok(())
}

/// Get all keybindings
#[tauri::command]
pub fn keybindings_get_all(
    state: State<'_, KeybindingsState>,
) -> Result<Vec<KeybindingEntry>, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    Ok(store.get_all())
}

/// Lookup keybinding
#[tauri::command]
pub fn keybindings_lookup(
    modifiers: Vec<Modifier>,
    key: String,
    context: Option<String>,
    state: State<'_, KeybindingsState>,
) -> Result<KeybindingLookupResult, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    let normalized_mods = normalize_platform_modifiers(modifiers);
    Ok(store.lookup(&normalized_mods, &key, context.as_deref()))
}

/// Lookup chord keybinding (second part)
#[tauri::command]
pub fn keybindings_lookup_chord(
    first_modifiers: Vec<Modifier>,
    first_key: String,
    second_modifiers: Vec<Modifier>,
    second_key: String,
    context: Option<String>,
    state: State<'_, KeybindingsState>,
) -> Result<KeybindingLookupResult, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    let first_mods = normalize_platform_modifiers(first_modifiers);
    let second_mods = normalize_platform_modifiers(second_modifiers);
    Ok(store.lookup_chord(
        &first_mods,
        &first_key,
        &second_mods,
        &second_key,
        context.as_deref(),
    ))
}

/// Set user keybinding
#[tauri::command]
pub fn keybindings_set(
    app: AppHandle,
    binding: Keybinding,
    state: State<'_, KeybindingsState>,
) -> Result<(), String> {
    let config_path = get_keybindings_path(&app);
    let mut store = state.lock().map_err(|e| e.to_string())?;
    store.set_user_binding(binding);
    store.save_user_bindings(&config_path)?;
    Ok(())
}

/// Remove user keybinding
#[tauri::command]
pub fn keybindings_remove(
    app: AppHandle,
    command: String,
    state: State<'_, KeybindingsState>,
) -> Result<(), String> {
    let config_path = get_keybindings_path(&app);
    let mut store = state.lock().map_err(|e| e.to_string())?;
    store.remove_user_binding(&command);
    store.save_user_bindings(&config_path)?;
    Ok(())
}

/// Disable keybinding
#[tauri::command]
pub fn keybindings_disable(
    app: AppHandle,
    command: String,
    state: State<'_, KeybindingsState>,
) -> Result<(), String> {
    let config_path = get_keybindings_path(&app);
    let mut store = state.lock().map_err(|e| e.to_string())?;
    store.disable_binding(&command);
    store.save_user_bindings(&config_path)?;
    Ok(())
}

/// Get conflicts
#[tauri::command]
pub fn keybindings_get_conflicts(
    state: State<'_, KeybindingsState>,
) -> Result<Vec<KeybindingConflict>, String> {
    let store = state.lock().map_err(|e| e.to_string())?;
    Ok(store.get_conflicts())
}

/// Reset to defaults
#[tauri::command]
pub fn keybindings_reset(app: AppHandle, state: State<'_, KeybindingsState>) -> Result<(), String> {
    let config_path = get_keybindings_path(&app);
    let mut store = state.lock().map_err(|e| e.to_string())?;
    store.reset_to_defaults();

    // Delete user config file
    if config_path.exists() {
        fs::remove_file(&config_path)
            .map_err(|e| format!("Failed to delete config file: {}", e))?;
    }
    Ok(())
}

/// Format keybinding for display (platform-aware)
#[tauri::command]
pub fn keybindings_format_display(binding: Keybinding) -> String {
    let mut parts = Vec::new();

    for m in &binding.modifiers {
        #[cfg(target_os = "macos")]
        let symbol = match m {
            Modifier::Ctrl => "⌃",
            Modifier::Shift => "⇧",
            Modifier::Alt => "⌥",
            Modifier::Meta => "⌘",
        };

        #[cfg(not(target_os = "macos"))]
        let symbol = match m {
            Modifier::Ctrl => "Ctrl",
            Modifier::Shift => "Shift",
            Modifier::Alt => "Alt",
            Modifier::Meta => "Win",
        };

        parts.push(symbol.to_string());
    }

    // Format key
    let key_display = match binding.key.as_str() {
        "ArrowUp" => "↑",
        "ArrowDown" => "↓",
        "ArrowLeft" => "←",
        "ArrowRight" => "→",
        k => k,
    };
    parts.push(key_display.to_string());

    #[cfg(target_os = "macos")]
    let separator = "";
    #[cfg(not(target_os = "macos"))]
    let separator = "+";

    let first_part = parts.join(separator);

    if let Some(chord) = &binding.chord_part {
        let mut chord_parts = Vec::new();
        for m in &chord.modifiers {
            #[cfg(target_os = "macos")]
            let symbol = match m {
                Modifier::Ctrl => "⌃",
                Modifier::Shift => "⇧",
                Modifier::Alt => "⌥",
                Modifier::Meta => "⌘",
            };
            #[cfg(not(target_os = "macos"))]
            let symbol = match m {
                Modifier::Ctrl => "Ctrl",
                Modifier::Shift => "Shift",
                Modifier::Alt => "Alt",
                Modifier::Meta => "Win",
            };
            chord_parts.push(symbol.to_string());
        }
        let chord_key = match chord.key.as_str() {
            "ArrowUp" => "↑",
            "ArrowDown" => "↓",
            "ArrowLeft" => "←",
            "ArrowRight" => "→",
            k => k,
        };
        chord_parts.push(chord_key.to_string());
        format!("{} {}", first_part, chord_parts.join(separator))
    } else {
        first_part
    }
}
