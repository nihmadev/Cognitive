use crate::keybindings::types::{ChordPart, Keybinding, Modifier};

/// Get default keybindings
pub fn get_default_keybindings() -> Vec<Keybinding> {
    vec![
        // File operations
        kb("file.newFile", "n", &[Modifier::Ctrl]),
        kb("file.newWindow", "n", &[Modifier::Ctrl, Modifier::Shift]),
        kb("file.open", "o", &[Modifier::Ctrl]),
        kb_chord("file.openFolder", "k", &[Modifier::Ctrl], "o", &[Modifier::Ctrl]),
        kb("file.save", "s", &[Modifier::Ctrl]),
        kb("file.saveAs", "s", &[Modifier::Ctrl, Modifier::Shift]),
        kb_chord("file.saveAll", "k", &[Modifier::Ctrl], "s", &[]),
        kb("file.reopenClosedEditor", "t", &[Modifier::Ctrl, Modifier::Shift]),
        
        // Edit operations
        kb_ctx("edit.undo", "z", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.redo", "y", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.redoAlt", "z", &[Modifier::Ctrl, Modifier::Shift], "editorFocus"),
        kb_ctx("edit.cut", "x", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.copy", "c", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.paste", "v", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.find", "f", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.replace", "h", &[Modifier::Ctrl], "editorFocus"),
        kb("edit.findInFiles", "f", &[Modifier::Ctrl, Modifier::Shift]),
        kb("edit.replaceInFiles", "h", &[Modifier::Ctrl, Modifier::Shift]),
        kb_ctx("edit.toggleLineComment", "/", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("edit.toggleBlockComment", "a", &[Modifier::Ctrl, Modifier::Shift], "editorFocus"),
        
        // Selection
        kb("selection.selectAll", "a", &[Modifier::Ctrl]),
        kb_ctx("selection.expandSelection", "ArrowRight", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.shrinkSelection", "ArrowLeft", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.copyLineUp", "ArrowUp", &[Modifier::Ctrl, Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.copyLineDown", "ArrowDown", &[Modifier::Ctrl, Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.moveLineUp", "ArrowUp", &[Modifier::Alt], "editorFocus"),
        kb_ctx("selection.moveLineDown", "ArrowDown", &[Modifier::Alt], "editorFocus"),
        kb_ctx("selection.addCursorAbove", "ArrowUp", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.addCursorBelow", "ArrowDown", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.addCursorsToLineEnds", "i", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb_ctx("selection.addNextOccurrence", "d", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("selection.selectAllOccurrences", "l", &[Modifier::Ctrl, Modifier::Shift], "editorFocus"),
        kb_ctx("selection.selectLine", "l", &[Modifier::Ctrl], "editorFocus"),
        
        // View
        kb("view.commandPalette", "p", &[Modifier::Ctrl, Modifier::Shift]),
        kb("view.quickOpen", "p", &[Modifier::Ctrl]),
        
        // Go
        kb("go.back", "ArrowLeft", &[Modifier::Alt]),
        kb("go.forward", "ArrowRight", &[Modifier::Alt]),
        kb_ctx("go.goToSymbol", "o", &[Modifier::Ctrl, Modifier::Shift], "editorFocus"),
        kb_ctx("go.goToSymbolInWorkspace", "t", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("go.goToDefinition", "F12", &[], "editorFocus"),
        kb_ctx("go.peekDefinition", "F12", &[Modifier::Alt], "editorFocus"),
        kb_ctx("go.goToTypeDefinition", "F12", &[Modifier::Shift], "editorFocus"),
        kb_ctx("go.goToImplementation", "F12", &[Modifier::Ctrl], "editorFocus"),
        kb_ctx("go.goToReferences", "F12", &[Modifier::Shift], "editorFocus"),
        kb_ctx("go.goToLine", "g", &[Modifier::Ctrl], "editorFocus"),
        kb_chord("go.goToLastEditLocation", "k", &[Modifier::Ctrl], "q", &[Modifier::Ctrl]),
        kb("go.goToNextProblem", "F8", &[]),
        kb("go.goToPreviousProblem", "F8", &[Modifier::Shift]),
        kb_chord("go.goToNextErrorInFiles", "k", &[Modifier::Ctrl], "n", &[Modifier::Ctrl]),
        kb_chord("go.goToPreviousErrorInFiles", "k", &[Modifier::Ctrl], "p", &[Modifier::Ctrl]),
        kb_ctx("go.goToNextChange", "F3", &[Modifier::Alt], "editorFocus"),
        kb_ctx("go.goToPreviousChange", "F3", &[Modifier::Shift, Modifier::Alt], "editorFocus"),
        kb("go.switchWindow", "Tab", &[Modifier::Ctrl]),
        
        // Run
        kb("run.startDebugging", "F5", &[]),
        kb("run.runWithoutDebugging", "F5", &[Modifier::Ctrl]),
        
        // Sidebar
        kb_ctx("sidebar.rename", "F2", &[], "sidebarFocus"),
        
        // Editor
        kb_ctx("editor.toggleInsertMode", "Insert", &[], "editorFocus"),
    ]
}

/// Helper to create simple keybinding
fn kb(command: &str, key: &str, modifiers: &[Modifier]) -> Keybinding {
    Keybinding {
        id: command.to_string(),
        key: key.to_string(),
        modifiers: modifiers.to_vec(),
        when: None,
        command: command.to_string(),
        args: None,
        is_chord: false,
        chord_part: None,
    }
}

/// Helper to create keybinding with context
fn kb_ctx(command: &str, key: &str, modifiers: &[Modifier], when: &str) -> Keybinding {
    Keybinding {
        id: command.to_string(),
        key: key.to_string(),
        modifiers: modifiers.to_vec(),
        when: Some(when.to_string()),
        command: command.to_string(),
        args: None,
        is_chord: false,
        chord_part: None,
    }
}

/// Helper to create chord keybinding
fn kb_chord(
    command: &str,
    key1: &str,
    mods1: &[Modifier],
    key2: &str,
    mods2: &[Modifier],
) -> Keybinding {
    Keybinding {
        id: command.to_string(),
        key: key1.to_string(),
        modifiers: mods1.to_vec(),
        when: None,
        command: command.to_string(),
        args: None,
        is_chord: true,
        chord_part: Some(ChordPart {
            key: key2.to_string(),
            modifiers: mods2.to_vec(),
        }),
    }
}
