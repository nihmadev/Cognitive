use portable_pty::CommandBuilder;

fn get_workspace(workspace_path: Option<&str>) -> String {
    workspace_path.map(|s| s.to_string()).unwrap_or_else(|| {
        std::env::current_dir()
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
            .unwrap_or_else(|| ".".to_string())
    })
}

#[cfg(windows)]
pub fn get_shell_command(
    terminal_type: Option<&str>,
    workspace_path: Option<&str>,
) -> Result<CommandBuilder, String> {
    let workspace = get_workspace(workspace_path);

    match terminal_type {
        Some("cmd") => {
            let mut cmd = CommandBuilder::new("cmd.exe");
            cmd.cwd(&workspace);
            Ok(cmd)
        }
        Some("bash") | Some("git-bash") => Err(
            "Git Bash is currently not supported due to ConPTY compatibility issues. \
             Please use PowerShell or CMD instead."
                .to_string(),
        ),
        _ => {
            let mut cmd = CommandBuilder::new("powershell.exe");
            cmd.cwd(&workspace);
            cmd.args(&["-NoExit", "-NoLogo"]);
            Ok(cmd)
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_shell_command(
    terminal_type: Option<&str>,
    workspace_path: Option<&str>,
) -> Result<CommandBuilder, String> {
    let workspace = get_workspace(workspace_path);

    let mut cmd = match terminal_type {
        Some("zsh") => CommandBuilder::new("/bin/zsh"),
        Some("bash") => CommandBuilder::new("/bin/bash"),
        _ => CommandBuilder::new("/bin/zsh"),
    };
    cmd.cwd(&workspace);
    Ok(cmd)
}

#[cfg(target_os = "linux")]
pub fn get_shell_command(
    terminal_type: Option<&str>,
    workspace_path: Option<&str>,
) -> Result<CommandBuilder, String> {
    let workspace = get_workspace(workspace_path);

    let mut cmd = CommandBuilder::new("/bin/bash");
    cmd.cwd(&workspace);
    Ok(cmd)
}

#[cfg(windows)]
pub fn get_process_name(terminal_type: Option<&str>) -> String {
    match terminal_type {
        Some("cmd") => "cmd.exe".to_string(),
        Some("bash") | Some("git-bash") => "bash.exe".to_string(),
        _ => "powershell.exe".to_string(),
    }
}

#[cfg(target_os = "macos")]
pub fn get_process_name(terminal_type: Option<&str>) -> String {
    match terminal_type {
        Some("bash") => "bash".to_string(),
        _ => "zsh".to_string(),
    }
}

#[cfg(target_os = "linux")]
pub fn get_process_name(_terminal_type: Option<&str>) -> String {
    "bash".to_string()
}
