use crate::keybindings::types::Modifier;

/// Normalize key combo to consistent string format
pub fn normalize_key_combo(modifiers: &[Modifier], key: &str) -> String {
    let mut parts: Vec<String> = Vec::new();
    
    // Sort modifiers for consistent ordering
    let mut mods: Vec<_> = modifiers.iter().collect();
    mods.sort_by_key(|m| match m {
        Modifier::Ctrl => 0,
        Modifier::Shift => 1,
        Modifier::Alt => 2,
        Modifier::Meta => 3,
    });

    for m in mods {
        parts.push(match m {
            Modifier::Ctrl => "ctrl",
            Modifier::Shift => "shift",
            Modifier::Alt => "alt",
            Modifier::Meta => "meta",
        }.to_string());
    }
    
    parts.push(key.to_lowercase());
    parts.join("+")
}

/// Normalize modifiers for current platform (Ctrl <-> Meta)
#[cfg(target_os = "macos")]
pub fn normalize_platform_modifiers(modifiers: Vec<Modifier>) -> Vec<Modifier> {
    modifiers
        .into_iter()
        .map(|m| match m {
            Modifier::Ctrl => Modifier::Meta, // Ctrl -> Cmd on macOS
            other => other,
        })
        .collect()
}

#[cfg(not(target_os = "macos"))]
pub fn normalize_platform_modifiers(modifiers: Vec<Modifier>) -> Vec<Modifier> {
    modifiers
        .into_iter()
        .map(|m| match m {
            Modifier::Meta => Modifier::Ctrl, // Cmd -> Ctrl on Windows/Linux
            other => other,
        })
        .collect()
}

/// Simple when clause evaluation
pub fn evaluate_when_clause(when: &str, context: &str) -> bool {
    // Simple implementation - can be extended for complex expressions
    // Supports: "editorFocus", "!editorFocus", "editorFocus && sidebarVisible"
    let parts: Vec<&str> = when.split("&&").map(|s| s.trim()).collect();
    
    for part in parts {
        let (negated, condition) = if part.starts_with('!') {
            (true, &part[1..])
        } else {
            (false, part)
        };

        let matches = context.contains(condition);
        if negated && matches {
            return false;
        }
        if !negated && !matches {
            return false;
        }
    }
    true
}
