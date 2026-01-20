use git2::{Repository};

#[derive(Clone, serde::Serialize)]
pub struct PushResult {
    success: bool,
    message: String,
    pushed_refs: Vec<String>,
}

#[tauri::command]
pub fn git_push(repo_path: String, remote_name: Option<String>, branch_name: Option<String>, force: bool) -> Result<PushResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let remote_name = remote_name.unwrap_or_else(|| "origin".to_string());
    
    // Get the remote and check if we need to convert SSH to HTTPS for GitHub CLI
    let mut remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Remote '{}' not found: {}", remote_name, e))?;
    
    let original_url = remote.url().ok_or("Remote URL not found")?.to_string();
    eprintln!("Original remote URL: {}", original_url);
    
    // Check if GitHub CLI is available and URL is SSH
    let use_https_conversion = if original_url.starts_with("git@github.com:") || original_url.starts_with("ssh://git@github.com/") {
        // Check if GitHub CLI token is available
        if let Ok(token) = std::process::Command::new("gh").args(&["auth", "token"]).output() {
            if token.status.success() {
                if let Ok(token_str) = String::from_utf8(token.stdout) {
                    if !token_str.trim().is_empty() {
                        eprintln!("GitHub CLI detected with SSH URL - will convert to HTTPS");
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            } else {
                false
            }
        } else {
            false
        }
    } else {
        false
    };
    
    // Convert SSH URL to HTTPS if needed
    let effective_url = if use_https_conversion {
        let https_url = if original_url.starts_with("git@github.com:") {
            // git@github.com:user/repo.git -> https://github.com/user/repo.git
            original_url.replace("git@github.com:", "https://github.com/")
        } else if original_url.starts_with("ssh://git@github.com/") {
            // ssh://git@github.com/user/repo.git -> https://github.com/user/repo.git
            original_url.replace("ssh://git@github.com/", "https://github.com/")
        } else {
            original_url.clone()
        };
        eprintln!("Converted to HTTPS URL: {}", https_url);
        
        // Create a temporary remote with HTTPS URL
        let temp_remote_name = format!("{}_https_temp", remote_name);
        match repo.remote(&temp_remote_name, &https_url) {
            Ok(r) => {
                remote = r;
                https_url
            }
            Err(_) => {
                // If temp remote exists, try to use it
                match repo.find_remote(&temp_remote_name) {
                    Ok(r) => {
                        remote = r;
                        https_url
                    }
                    Err(_) => original_url
                }
            }
        }
    } else {
        original_url
    };
    
    
    let branch_name = branch_name
        .or_else(|| {
            repo.head().ok().and_then(|head| {
                let head_name = head.name()?.to_string();
                if let Some(local) = head_name.strip_prefix("refs/heads/") {
                    
                    
                    let branch = if local.contains('/') {
                        local.rsplit('/').next().unwrap_or(local)
                    } else {
                        local
                    };
                    return Some(branch.to_string());
                }
                if let Some(remote_ref) = head_name.strip_prefix("refs/remotes/") {
                    
                    return remote_ref.split_once('/').map(|(_, b)| b.to_string());
                }
                None
            })
        })
        .or_else(|| {
            repo.head()
                .ok()
                .and_then(|head| head.shorthand().map(|s| s.to_string()))
                .map(|s| {
                    
                    if s.contains('/') {
                        s.rsplit('/').next().unwrap_or(&s).to_string()
                    } else {
                        s
                    }
                })
        })
        .ok_or_else(|| "Cannot determine branch to push".to_string())?;

    
    let refspec = format!("refs/heads/{0}:refs/heads/{0}", branch_name);
    
    
    let mut push_options = git2::PushOptions::new();
    let mut callbacks = git2::RemoteCallbacks::new();
    
    // Add progress tracking to prevent hanging
    callbacks.push_update_reference(|refname, status| {
        if let Some(s) = status {
            eprintln!("Push update for {}: {}", refname, s);
        } else {
            eprintln!("Push update for {}: OK", refname);
        }
        Ok(())
    });
    
    // Add transfer progress callback
    callbacks.push_transfer_progress(|current, total, bytes| {
        eprintln!("Push progress: {}/{} objects, {} bytes", current, total, bytes);
    });
    
    callbacks.credentials(|url, username_from_url, allowed_types| {
        let username = username_from_url.unwrap_or("git");
        
        eprintln!("=== Git Push Credentials Debug ===");
        eprintln!("URL: {}", url);
        eprintln!("Username: {}", username);
        eprintln!("Allowed types: {:?}", allowed_types);
        
        // Try GitHub CLI token first (non-interactive)
        eprintln!("Trying GitHub CLI token...");
        if let Ok(token) = std::process::Command::new("gh")
            .args(&["auth", "token"])
            .output()
        {
            if token.status.success() {
                if let Ok(token_str) = String::from_utf8(token.stdout) {
                    let token_str = token_str.trim();
                    if !token_str.is_empty() {
                        eprintln!("GitHub CLI token found!");
                        if let Ok(cred) = git2::Cred::userpass_plaintext(username, token_str) {
                            return Ok(cred);
                        }
                    }
                }
            }
        }
        eprintln!("GitHub CLI token not available");
        
        // CRITICAL: Try SSH key files BEFORE agent to avoid GUI prompts
        eprintln!("Trying default SSH key files...");
        if allowed_types.contains(git2::CredentialType::SSH_KEY) {
            let home = std::env::var("HOME")
                .or_else(|_| std::env::var("USERPROFILE"))
                .unwrap_or_else(|_| ".".to_string());
            
            let ssh_key_paths = vec![
                (format!("{}/.ssh/id_ed25519", home), "id_ed25519"),
                (format!("{}/.ssh/id_rsa", home), "id_rsa"),
                (format!("{}/.ssh/id_ecdsa", home), "id_ecdsa"),
            ];
            
            for (key_path, key_name) in ssh_key_paths {
                if std::path::Path::new(&key_path).exists() {
                    eprintln!("Trying SSH key file: {}", key_name);
                    // Try without passphrase first
                    match git2::Cred::ssh_key(
                        username,
                        None,
                        std::path::Path::new(&key_path),
                        None
                    ) {
                        Ok(cred) => {
                            eprintln!("SSH key file worked: {}", key_name);
                            return Ok(cred);
                        }
                        Err(e) => {
                            eprintln!("SSH key file failed ({}): {}", key_name, e);
                        }
                    }
                }
            }
        }
        eprintln!("No SSH key files worked");
        
        // CRITICAL: DO NOT use ssh_key_from_agent as it can trigger GUI prompts
        eprintln!("Skipping SSH agent to avoid GUI prompts and hanging");
        
        // CRITICAL: DO NOT use credential_helper on Windows as it causes hanging
        eprintln!("Skipping credential_helper to avoid GUI dialogs and hanging");
        
        eprintln!("No valid credentials found!");
        Err(git2::Error::from_str(
            "No valid credentials found. Please use one of:\n\
             1. GitHub CLI: gh auth login\n\
             2. SSH keys WITHOUT passphrase: Place your key in ~/.ssh/id_rsa or ~/.ssh/id_ed25519\n\
             3. Remove passphrase from existing key: ssh-keygen -p -f ~/.ssh/id_ed25519"
        ))
    });
    
    push_options.remote_callbacks(callbacks);
    
    
    let mut remote = remote;
    let result = remote.push(&[&refspec], Some(&mut push_options));
    
    match result {
        Ok(_) => {
            Ok(PushResult {
                success: true,
                message: format!("Successfully pushed {} to {}", branch_name, remote_name),
                pushed_refs: vec![refspec],
            })
        }
        Err(e) => {
            let error_msg = e.to_string();
            
            // Handle specific error cases
            if error_msg.contains("rejected") && error_msg.contains("non-fast-forward") && !force {
                Ok(PushResult {
                    success: false,
                    message: format!("Push rejected: {}.\nTry pulling latest changes or use force push.", error_msg),
                    pushed_refs: vec![],
                })
            } else if error_msg.contains("authentication") || error_msg.contains("Auth") || error_msg.contains("credentials") || error_msg.contains("No valid credentials") {
                Ok(PushResult {
                    success: false,
                    message: format!("Authentication failed: {}.\n\nPlease configure authentication:\n1. GitHub CLI: Run 'gh auth login' in terminal\n2. SSH: Configure SSH keys (~/.ssh/id_rsa)\n3. HTTPS: Use non-interactive credential helper (e.g., 'git config --global credential.helper store')", error_msg),
                    pushed_refs: vec![],
                })
            } else if error_msg.contains("no such file") || error_msg.contains("not found") {
                Ok(PushResult {
                    success: false,
                    message: format!("Repository not found: {}. Please check if the remote URL is correct.", error_msg),
                    pushed_refs: vec![],
                })
            } else if error_msg.contains("timed out") || error_msg.contains("timeout") {
                Ok(PushResult {
                    success: false,
                    message: format!("Push timed out: {}. Check your network connection.", error_msg),
                    pushed_refs: vec![],
                })
            } else {
                // Return as PushResult instead of Err to avoid hanging
                Ok(PushResult {
                    success: false,
                    message: format!("Push failed: {}", error_msg),
                    pushed_refs: vec![],
                })
            }
        }
    }
}

#[tauri::command]
pub fn git_push_with_force(repo_path: String, remote_name: Option<String>, branch_name: Option<String>) -> Result<PushResult, String> {
    git_push(repo_path, remote_name, branch_name, true)
}

#[tauri::command]
pub fn git_list_remotes(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let remotes = repo.remotes()
        .map_err(|e| e.to_string())?
        .iter()
        .filter_map(|name| name.map(|s| s.to_string()))
        .collect();
    
    Ok(remotes)
}

#[tauri::command]
pub fn git_get_remote_url(repo_path: String, remote_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Remote '{}' not found: {}", remote_name, e))?;
    
    let url = remote.url()
        .or_else(|| remote.pushurl())
        .ok_or_else(|| "No URL configured for remote".to_string())?
        .to_string();
    
    Ok(url)
}
