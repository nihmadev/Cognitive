use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Child, Stdio};
use std::sync::{Arc, Mutex};
use tauri::State;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct NpmScript {
    pub name: String,
    pub command: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunningScript {
    pub name: String,
    pub pid: u32,
    pub start_time: String,
}

pub struct RunningScriptsState {
    scripts: Arc<Mutex<HashMap<String, Child>>>,
}

impl Default for RunningScriptsState {
    fn default() -> Self {
        Self {
            scripts: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn npm_get_scripts(workspace: String) -> Result<Vec<NpmScript>, String> {
    let package_json_path = format!("{}/package.json", workspace);
    
    // Read package.json
    let content = std::fs::read_to_string(&package_json_path)
        .map_err(|e| format!("Failed to read package.json: {}", e))?;
    
    // Parse JSON
    let package_json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse package.json: {}", e))?;
    
    // Extract scripts
    let scripts_obj = package_json.get("scripts")
        .and_then(|s| s.as_object())
        .ok_or("No scripts found in package.json")?;
    
    let mut scripts = Vec::new();
    
    for (name, command) in scripts_obj {
        if let Some(command_str) = command.as_str() {
            scripts.push(NpmScript {
                name: name.clone(),
                command: command_str.to_string(),
                description: None, // Could be enhanced to extract from other fields
            });
        }
    }
    
    // Sort scripts alphabetically
    scripts.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(scripts)
}

#[tauri::command]
pub async fn npm_run_script(
    workspace: String,
    script_name: String,
    state: State<'_, RunningScriptsState>,
) -> Result<String, String> {
    // Check if script is already running
    {
        let scripts = state.scripts.lock().unwrap();
        if scripts.contains_key(&script_name) {
            return Err(format!("Script '{}' is already running", script_name));
        }
    }
    
    // Run npm script
    let child = Command::new("npm")
        .args(&["run", &script_name])
        .current_dir(&workspace)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start npm script: {}", e))?;
    
    let pid = child.id();
    
    // Store the running process
    {
        let mut scripts = state.scripts.lock().unwrap();
        scripts.insert(script_name.clone(), child);
    }
    
    // Start a background task to monitor the process
    let scripts_arc = Arc::clone(&state.scripts);
    let script_name_clone = script_name.clone();
    
    tokio::spawn(async move {
        // Poll periodically to check if process is still running
        loop {
            {
                let mut scripts = scripts_arc.lock().unwrap();
                if let Some(child) = scripts.get_mut(&script_name_clone) {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            // Process finished, remove from running scripts
                            scripts.remove(&script_name_clone);
                            println!("Script '{}' finished with status: {}", script_name_clone, status);
                            break;
                        }
                        Ok(None) => {
                            // Process still running
                        }
                        Err(e) => {
                            // Error checking process status, remove it
                            scripts.remove(&script_name_clone);
                            println!("Error checking script '{}': {}", script_name_clone, e);
                            break;
                        }
                    }
                } else {
                    // Script was removed (probably stopped manually)
                    break;
                }
            }
            
            sleep(Duration::from_secs(1)).await;
        }
    });
    
    Ok(format!("Started script '{}' with PID: {}", script_name, pid))
}

#[tauri::command]
pub async fn npm_stop_script(
    script_name: String,
    state: State<'_, RunningScriptsState>,
) -> Result<String, String> {
    let mut scripts = state.scripts.lock().unwrap();
    
    if let Some(mut child) = scripts.remove(&script_name) {
        // Try to kill the process gracefully first
        match child.kill() {
            Ok(_) => {
                // Wait for the process to actually terminate
                match child.wait() {
                    Ok(status) => {
                        Ok(format!("Stopped script '{}'. Exit status: {}", script_name, status))
                    }
                    Err(e) => {
                        Ok(format!("Stopped script '{}' but couldn't get exit status: {}", script_name, e))
                    }
                }
            }
            Err(e) => {
                // If killing failed, put it back in the map
                scripts.insert(script_name.clone(), child);
                Err(format!("Failed to stop script '{}': {}", script_name, e))
            }
        }
    } else {
        Err(format!("Script '{}' is not running", script_name))
    }
}

#[tauri::command]
pub async fn npm_get_running_scripts(state: State<'_, RunningScriptsState>) -> Result<Vec<RunningScript>, String> {
    let mut scripts = state.scripts.lock().unwrap();
    let mut running_scripts = Vec::new();
    
    for (name, child) in scripts.iter_mut() {
        // Check if process is still running
        match child.try_wait() {
            Ok(None) => {
                // Process is still running
                running_scripts.push(RunningScript {
                    name: name.clone(),
                    pid: child.id(),
                    start_time: "Running".to_string(), // Simplified for now
                });
            }
            Ok(Some(_)) | Err(_) => {
                // Process has finished or error checking - this will be cleaned up by the monitor task
            }
        }
    }
    
    Ok(running_scripts)
}

#[tauri::command]
pub async fn npm_run_script_in_terminal(
    workspace: String,
    script_name: String,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // For Windows, use PowerShell or Command Prompt with pause
        let command = format!("cd /d \"{}\" && npm run {} && pause", workspace, script_name);
        let child = Command::new("powershell")
            .args(&["-Command", &command])
            .spawn()
            .or_else(|_| {
                // Fallback to cmd if PowerShell fails
                let cmd_command = format!("cd /d \"{}\" && npm run {} && pause", workspace, script_name);
                Command::new("cmd")
                    .args(&["/C", &cmd_command])
                    .spawn()
            })
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
        
        Ok(format!("Started script '{}' in terminal with PID: {}", script_name, child.id()))
    }
    
    #[cfg(target_os = "macos")]
    {
        // For macOS, use Terminal.app with read prompt
        let script = format!(
            "cd \"{}\" && npm run {} && echo 'Press Enter to exit...' && read",
            workspace, script_name
        );
        let command = format!("osascript -e 'tell application \"Terminal\" to do script \"{}\"'", script);
        
        Command::new("sh")
            .args(&["-c", &command])
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        
        Ok(format!("Started script '{}' in Terminal.app", script_name))
    }
    
    #[cfg(target_os = "linux")]
    {
        // For Linux, try common terminals with proper arguments
        let terminals = vec![
            ("gnome-terminal", vec!["--", "bash", "-c"]),
            ("konsole", vec!["-e", "bash", "-c"]),
            ("xfce4-terminal", vec!["-e", "bash", "-c"]),
            ("xterm", vec!["-e", "bash", "-c"]),
        ];
        
        let command = format!("cd \"{}\" && npm run {}; echo ''; echo 'Script completed. Press Enter to exit...'; read", workspace, script_name);
        
        for (terminal, args) in terminals {
            // Check if terminal exists and can be executed
            if let Ok(which_output) = Command::new("which").arg(terminal).output() {
                if which_output.status.success() {
                    let terminal_path = String::from_utf8_lossy(&which_output.stdout).trim().to_string();
                    
                    // Build command with terminal-specific arguments
                    let mut cmd_args = args.clone();
                    cmd_args.push(&command);
                    
                    match Command::new(&terminal_path).args(&cmd_args).spawn() {
                        Ok(child) => {
                            return Ok(format!("Started script '{}' in {} with PID: {}", script_name, terminal, child.id()));
                        }
                        Err(e) => {
                            eprintln!("Failed to start {}: {}", terminal, e);
                            continue;
                        }
                    }
                }
            }
        }
        
        // Fallback: try to run in background without terminal
        match Command::new("npm")
            .args(&["run", &script_name])
            .current_dir(&workspace)
            .spawn()
        {
            Ok(child) => {
                Ok(format!("Started script '{}' in background with PID: {} (no terminal available)", script_name, child.id()))
            }
            Err(e) => {
                Err(format!("Failed to start script and no terminal found: {}", e))
            }
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}
