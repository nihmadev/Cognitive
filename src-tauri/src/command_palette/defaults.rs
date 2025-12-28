use crate::command_palette::types::{Command, CommandCategory, CommandSource};

/// Get all default built-in commands
pub fn get_default_commands() -> Vec<Command> {
    let mut commands = Vec::new();
    
    commands.extend(file_commands());
    commands.extend(edit_commands());
    commands.extend(selection_commands());
    commands.extend(view_commands());
    commands.extend(go_commands());
    commands.extend(run_commands());
    commands.extend(terminal_commands());
    commands.extend(git_commands());
    commands.extend(ai_commands());
    commands.extend(settings_commands());
    commands.extend(help_commands());
    
    commands
}

fn file_commands() -> Vec<Command> {
    vec![
        cmd("file.newFile", "New File", CommandCategory::File, None),
        cmd("file.newWindow", "New Window", CommandCategory::File, None),
        cmd("file.open", "Open File", CommandCategory::File, None),
        cmd("file.openFolder", "Open Folder", CommandCategory::File, None),
        cmd("file.openRecent", "Open Recent", CommandCategory::File, None),
        cmd("file.save", "Save", CommandCategory::File, Some("editorFocus")),
        cmd("file.saveAs", "Save As...", CommandCategory::File, Some("editorFocus")),
        cmd("file.saveAll", "Save All", CommandCategory::File, None),
        cmd("file.close", "Close Editor", CommandCategory::File, Some("editorFocus")),
        cmd("file.closeAll", "Close All Editors", CommandCategory::File, None),
        cmd("file.closeOthers", "Close Other Editors", CommandCategory::File, Some("editorFocus")),
        cmd("file.reopenClosedEditor", "Reopen Closed Editor", CommandCategory::File, None),
        cmd("file.revealInExplorer", "Reveal in Explorer", CommandCategory::File, Some("editorFocus")),
        cmd("file.copyPath", "Copy Path", CommandCategory::File, Some("editorFocus")),
        cmd("file.copyRelativePath", "Copy Relative Path", CommandCategory::File, Some("editorFocus")),
    ]
}

fn edit_commands() -> Vec<Command> {
    vec![
        cmd("edit.undo", "Undo", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.redo", "Redo", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.cut", "Cut", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.copy", "Copy", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.paste", "Paste", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.find", "Find", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.replace", "Replace", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.findInFiles", "Find in Files", CommandCategory::Edit, None),
        cmd("edit.replaceInFiles", "Replace in Files", CommandCategory::Edit, None),
        cmd("edit.toggleLineComment", "Toggle Line Comment", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.toggleBlockComment", "Toggle Block Comment", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.formatDocument", "Format Document", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.formatSelection", "Format Selection", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.indentLine", "Indent Line", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.outdentLine", "Outdent Line", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.deleteLine", "Delete Line", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.duplicateLine", "Duplicate Line", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.joinLines", "Join Lines", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.transformToUppercase", "Transform to Uppercase", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.transformToLowercase", "Transform to Lowercase", CommandCategory::Edit, Some("editorFocus")),
        cmd("edit.transformToTitlecase", "Transform to Title Case", CommandCategory::Edit, Some("editorFocus")),
    ]
}

fn selection_commands() -> Vec<Command> {
    vec![
        cmd("selection.selectAll", "Select All", CommandCategory::Selection, None),
        cmd("selection.expandSelection", "Expand Selection", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.shrinkSelection", "Shrink Selection", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.copyLineUp", "Copy Line Up", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.copyLineDown", "Copy Line Down", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.moveLineUp", "Move Line Up", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.moveLineDown", "Move Line Down", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.addCursorAbove", "Add Cursor Above", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.addCursorBelow", "Add Cursor Below", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.addCursorsToLineEnds", "Add Cursors to Line Ends", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.addNextOccurrence", "Add Next Occurrence", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.selectAllOccurrences", "Select All Occurrences", CommandCategory::Selection, Some("editorFocus")),
        cmd("selection.selectLine", "Select Line", CommandCategory::Selection, Some("editorFocus")),
    ]
}

fn view_commands() -> Vec<Command> {
    vec![
        cmd("view.commandPalette", "Command Palette", CommandCategory::View, None),
        cmd("view.quickOpen", "Quick Open", CommandCategory::View, None),
        cmd("view.explorer", "Show Explorer", CommandCategory::View, None),
        cmd("view.search", "Show Search", CommandCategory::View, None),
        cmd("view.git", "Show Git", CommandCategory::View, None),
        cmd("view.problems", "Show Problems", CommandCategory::View, None),
        cmd("view.output", "Show Output", CommandCategory::View, None),
        cmd("view.terminal", "Show Terminal", CommandCategory::View, None),
        cmd("view.aiAssistant", "Show AI Assistant", CommandCategory::View, None),
        cmd("view.toggleSidebar", "Toggle Sidebar", CommandCategory::View, None),
        cmd("view.togglePanel", "Toggle Panel", CommandCategory::View, None),
        cmd("view.toggleFullscreen", "Toggle Fullscreen", CommandCategory::View, None),
        cmd("view.toggleZenMode", "Toggle Zen Mode", CommandCategory::View, None),
        cmd("view.zoomIn", "Zoom In", CommandCategory::View, None),
        cmd("view.zoomOut", "Zoom Out", CommandCategory::View, None),
        cmd("view.resetZoom", "Reset Zoom", CommandCategory::View, None),
        cmd("view.toggleWordWrap", "Toggle Word Wrap", CommandCategory::View, Some("editorFocus")),
        cmd("view.toggleMinimap", "Toggle Minimap", CommandCategory::View, None),
        cmd("view.toggleBreadcrumbs", "Toggle Breadcrumbs", CommandCategory::View, None),
        cmd("view.splitEditor", "Split Editor", CommandCategory::View, Some("editorFocus")),
        cmd("view.splitEditorDown", "Split Editor Down", CommandCategory::View, Some("editorFocus")),
    ]
}

fn go_commands() -> Vec<Command> {
    vec![
        cmd("go.back", "Go Back", CommandCategory::Go, None),
        cmd("go.forward", "Go Forward", CommandCategory::Go, None),
        cmd("go.goToLine", "Go to Line", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToSymbol", "Go to Symbol in Editor", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToSymbolInWorkspace", "Go to Symbol in Workspace", CommandCategory::Go, None),
        cmd("go.goToDefinition", "Go to Definition", CommandCategory::Go, Some("editorFocus")),
        cmd("go.peekDefinition", "Peek Definition", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToTypeDefinition", "Go to Type Definition", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToImplementation", "Go to Implementation", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToReferences", "Go to References", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToLastEditLocation", "Go to Last Edit Location", CommandCategory::Go, None),
        cmd("go.goToNextProblem", "Go to Next Problem", CommandCategory::Go, None),
        cmd("go.goToPreviousProblem", "Go to Previous Problem", CommandCategory::Go, None),
        cmd("go.goToNextChange", "Go to Next Change", CommandCategory::Go, Some("editorFocus")),
        cmd("go.goToPreviousChange", "Go to Previous Change", CommandCategory::Go, Some("editorFocus")),
        cmd("go.switchWindow", "Switch Window", CommandCategory::Go, None),
        cmd("go.switchEditor", "Switch Editor", CommandCategory::Go, None),
    ]
}

fn run_commands() -> Vec<Command> {
    vec![
        cmd("run.startDebugging", "Start Debugging", CommandCategory::Run, None),
        cmd("run.runWithoutDebugging", "Run Without Debugging", CommandCategory::Run, None),
        cmd("run.stopDebugging", "Stop Debugging", CommandCategory::Run, None),
        cmd("run.restartDebugging", "Restart Debugging", CommandCategory::Run, None),
        cmd("run.runTask", "Run Task", CommandCategory::Run, None),
        cmd("run.runBuildTask", "Run Build Task", CommandCategory::Run, None),
        cmd("run.runTestTask", "Run Test Task", CommandCategory::Run, None),
    ]
}

fn terminal_commands() -> Vec<Command> {
    vec![
        cmd("terminal.new", "New Terminal", CommandCategory::Terminal, None),
        cmd("terminal.split", "Split Terminal", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.kill", "Kill Terminal", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.clear", "Clear Terminal", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.scrollUp", "Scroll Up", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.scrollDown", "Scroll Down", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.scrollToTop", "Scroll to Top", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.scrollToBottom", "Scroll to Bottom", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.copy", "Copy Selection", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.paste", "Paste", CommandCategory::Terminal, Some("terminalFocus")),
        cmd("terminal.selectAll", "Select All", CommandCategory::Terminal, Some("terminalFocus")),
    ]
}

fn git_commands() -> Vec<Command> {
    vec![
        cmd("git.init", "Initialize Repository", CommandCategory::Git, None),
        cmd("git.clone", "Clone Repository", CommandCategory::Git, None),
        cmd("git.stage", "Stage Changes", CommandCategory::Git, None),
        cmd("git.stageAll", "Stage All Changes", CommandCategory::Git, None),
        cmd("git.unstage", "Unstage Changes", CommandCategory::Git, None),
        cmd("git.unstageAll", "Unstage All Changes", CommandCategory::Git, None),
        cmd("git.commit", "Commit", CommandCategory::Git, None),
        cmd("git.commitAmend", "Commit (Amend)", CommandCategory::Git, None),
        cmd("git.push", "Push", CommandCategory::Git, None),
        cmd("git.pull", "Pull", CommandCategory::Git, None),
        cmd("git.fetch", "Fetch", CommandCategory::Git, None),
        cmd("git.checkout", "Checkout Branch", CommandCategory::Git, None),
        cmd("git.createBranch", "Create Branch", CommandCategory::Git, None),
        cmd("git.deleteBranch", "Delete Branch", CommandCategory::Git, None),
        cmd("git.merge", "Merge Branch", CommandCategory::Git, None),
        cmd("git.rebase", "Rebase Branch", CommandCategory::Git, None),
        cmd("git.stash", "Stash Changes", CommandCategory::Git, None),
        cmd("git.stashPop", "Pop Stash", CommandCategory::Git, None),
        cmd("git.discardChanges", "Discard Changes", CommandCategory::Git, None),
        cmd("git.viewHistory", "View File History", CommandCategory::Git, Some("editorFocus")),
        cmd("git.viewDiff", "View Diff", CommandCategory::Git, None),
    ]
}

fn ai_commands() -> Vec<Command> {
    vec![
        cmd("ai.openChat", "Open AI Chat", CommandCategory::Ai, None),
        cmd("ai.newConversation", "New AI Conversation", CommandCategory::Ai, None),
        cmd("ai.explainCode", "Explain Code", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.refactorCode", "Refactor Code", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.generateTests", "Generate Tests", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.fixCode", "Fix Code", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.addComments", "Add Comments", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.optimizeCode", "Optimize Code", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.translateCode", "Translate Code", CommandCategory::Ai, Some("editorFocus")),
        cmd("ai.toggleMode", "Toggle AI Mode", CommandCategory::Ai, None),
        cmd("ai.selectModel", "Select AI Model", CommandCategory::Ai, None),
        cmd("ai.clearHistory", "Clear AI History", CommandCategory::Ai, None),
    ]
}

fn settings_commands() -> Vec<Command> {
    vec![
        cmd("settings.open", "Open Settings", CommandCategory::Settings, None),
        cmd("settings.openJson", "Open Settings (JSON)", CommandCategory::Settings, None),
        cmd("settings.openKeybindings", "Open Keyboard Shortcuts", CommandCategory::Settings, None),
        cmd("settings.openKeybindingsJson", "Open Keyboard Shortcuts (JSON)", CommandCategory::Settings, None),
        cmd("settings.selectTheme", "Color Theme", CommandCategory::Settings, None),
        cmd("settings.selectIconTheme", "File Icon Theme", CommandCategory::Settings, None),
        cmd("settings.selectLanguage", "Configure Display Language", CommandCategory::Settings, None),
        cmd("settings.configureSnippets", "Configure User Snippets", CommandCategory::Settings, None),
        cmd("settings.syncSettings", "Sync Settings", CommandCategory::Settings, None),
    ]
}

fn help_commands() -> Vec<Command> {
    vec![
        cmd("help.welcome", "Welcome", CommandCategory::Help, None),
        cmd("help.documentation", "Documentation", CommandCategory::Help, None),
        cmd("help.releaseNotes", "Release Notes", CommandCategory::Help, None),
        cmd("help.keyboardShortcuts", "Keyboard Shortcuts Reference", CommandCategory::Help, None),
        cmd("help.reportIssue", "Report Issue", CommandCategory::Help, None),
        cmd("help.about", "About", CommandCategory::Help, None),
        cmd("help.checkUpdates", "Check for Updates", CommandCategory::Help, None),
    ]
}

/// Helper to create a command
fn cmd(id: &str, label: &str, category: CommandCategory, when: Option<&str>) -> Command {
    Command {
        id: id.to_string(),
        label: label.to_string(),
        description: None,
        category,
        source: CommandSource::Builtin,
        when: when.map(|s| s.to_string()),
        icon: None,
        enabled: true,
    }
}
