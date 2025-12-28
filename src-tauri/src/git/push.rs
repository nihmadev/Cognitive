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
    
    // Определяем удаленный репозиторий (по умолчанию "origin")
    let remote_name = remote_name.unwrap_or_else(|| "origin".to_string());
    
    // Находим удаленный репозиторий
    let remote = repo.find_remote(&remote_name)
        .map_err(|e| format!("Remote '{}' not found: {}", remote_name, e))?;
    
    // Определяем ветку для отправки (по умолчанию текущая ветка)
    let branch_name = branch_name
        .or_else(|| {
            repo.head().ok().and_then(|head| {
                let head_name = head.name()?.to_string();
                if let Some(local) = head_name.strip_prefix("refs/heads/") {
                    // Если локальная ветка имеет имя вида "origin/xxx", берём только последнюю часть
                    // чтобы избежать создания refs/heads/origin/main
                    let branch = if local.contains('/') {
                        local.rsplit('/').next().unwrap_or(local)
                    } else {
                        local
                    };
                    return Some(branch.to_string());
                }
                if let Some(remote_ref) = head_name.strip_prefix("refs/remotes/") {
                    // Для remote refs берём только имя ветки после remote name
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
                    // Убираем prefix типа "origin/" если есть
                    if s.contains('/') {
                        s.rsplit('/').next().unwrap_or(&s).to_string()
                    } else {
                        s
                    }
                })
        })
        .ok_or_else(|| "Cannot determine branch to push".to_string())?;

    // Получаем refspec для отправки
    let refspec = format!("refs/heads/{0}:refs/heads/{0}", branch_name);
    
    // Настраиваем опции отправки
    let mut push_options = git2::PushOptions::new();
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        let username = username_from_url.unwrap_or("git");
        
        // Сначала пробуем GitHub CLI token
        if let Ok(token) = std::process::Command::new("gh")
            .args(&["auth", "token"])
            .output()
        {
            if token.status.success() {
                if let Ok(token_str) = String::from_utf8(token.stdout) {
                    let token_str = token_str.trim();
                    if !token_str.is_empty() {
                        if let Ok(cred) = git2::Cred::userpass_plaintext(username, token_str) {
                            return Ok(cred);
                        }
                    }
                }
            }
        }
        
        // Пробуем SSH ключи из агента
        if let Ok(cred) = git2::Cred::ssh_key_from_agent(username) {
            return Ok(cred);
        }
        
        // Пробуем credential helper (для HTTPS)
        if let Ok(git_config) = git2::Config::open_default() {
            if let Ok(cred) = git2::Cred::credential_helper(&git_config, username, None) {
                return Ok(cred);
            }
        }
        
        // Возвращаем default credential как последнюю попытку
        git2::Cred::default()
    });
    push_options.remote_callbacks(callbacks);
    
    // Выполняем отправку
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
            
            // Проверяем на распространенные ошибки
            if error_msg.contains("rejected") && error_msg.contains("non-fast-forward") && !force {
                Ok(PushResult {
                    success: false,
                    message: format!("Push rejected: {}.\nTry pulling latest changes or use force push.", error_msg),
                    pushed_refs: vec![],
                })
            } else if error_msg.contains("authentication") || error_msg.contains("Auth") {
                Ok(PushResult {
                    success: false,
                    message: format!("Authentication failed: {}. Please check your credentials.\nFor HTTPS: Make sure you have configured credential helper or personal access token.\nFor SSH: Make sure your SSH keys are properly configured.", error_msg),
                    pushed_refs: vec![],
                })
            } else if error_msg.contains("no such file") || error_msg.contains("not found") {
                Ok(PushResult {
                    success: false,
                    message: format!("Repository not found: {}. Please check if the remote URL is correct.", error_msg),
                    pushed_refs: vec![],
                })
            } else {
                Err(error_msg)
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
