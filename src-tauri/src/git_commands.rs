use git2::{Repository, StatusOptions, Signature, DiffOptions, Diff};
use serde::{Serialize, Deserialize};
use std::path::Path;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GitContributor {
    pub name: String,
    pub email: String,
    pub commits_count: usize,
    pub branches: Vec<String>,
    pub is_local: bool,
    pub avatar_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified", "new", "deleted", "staged", etc.
    pub is_staged: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GitInfo {
    pub branch: String,
    pub is_clean: bool,
    pub modified_files: usize,
    pub untracked_files: usize,
    pub staged_files: usize,
    pub has_remote: bool,
    pub remote_name: Option<String>,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

#[tauri::command]
pub fn git_status(path: String) -> Result<Vec<GitFileStatus>, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;
    let mut statuses = Vec::new();
    
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.include_ignored(false);

    for entry in repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?.iter() {
        let status = entry.status();
        
        // Check if staged (index)
        let is_staged = status.is_index_new() || status.is_index_modified() || status.is_index_deleted();
        
        // Determine status string
        let status_str = if status.is_index_new() {
            "staged_new"
        } else if status.is_index_modified() {
            "staged_modified"
        } else if status.is_index_deleted() {
            "staged_deleted"
        } else if status.is_wt_new() {
            "untracked"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_wt_deleted() {
            "deleted"
        } else {
            continue; // Skip unknown statuses
        };

        if let Some(file_path) = entry.path() {
            statuses.push(GitFileStatus {
                path: file_path.to_string(),
                status: status_str.to_string(),
                is_staged,
            });
        }
    }

    Ok(statuses)
}

#[tauri::command]
pub fn git_info(path: String) -> Result<GitInfo, String> {
    let repo = Repository::open(&path).map_err(|e| e.to_string())?;
    
    // Получаем текущую ветку
    let branch_name = match repo.head() {
        Ok(head) => {
            if let Some(name) = head.shorthand() {
                name.to_string()
            } else {
                "HEAD".to_string()
            }
        }
        Err(_) => "main".to_string(),
    };
    
    // Получаем статус
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    let mut modified_files = 0;
    let mut untracked_files = 0;
    let mut staged_files = 0;
    
    for entry in statuses.iter() {
        let status = entry.status();
        if status.is_index_new() || status.is_index_modified() || status.is_index_deleted() {
            staged_files += 1;
        }
        if status.is_wt_new() {
            untracked_files += 1;
        } else if status.is_wt_modified() || status.is_wt_deleted() {
            modified_files += 1;
        }
    }
    
    let is_clean = modified_files == 0 && untracked_files == 0 && staged_files == 0;
    
    // Check for remote
    let (has_remote, remote_name) = match repo.find_remote("origin") {
        Ok(remote) => (true, remote.url().map(|s| s.to_string())),
        Err(_) => {
            // Try to find any remote
            match repo.remotes() {
                Ok(remotes) => {
                    if remotes.len() > 0 {
                        let name = remotes.get(0).unwrap_or("origin");
                        match repo.find_remote(name) {
                            Ok(remote) => (true, remote.url().map(|s| s.to_string())),
                            Err(_) => (false, None),
                        }
                    } else {
                        (false, None)
                    }
                }
                Err(_) => (false, None),
            }
        }
    };
    
    // Get user config
    let config = repo.config().ok();
    let user_name = config.as_ref().and_then(|c| c.get_string("user.name").ok());
    let user_email = config.as_ref().and_then(|c| c.get_string("user.email").ok());
    
    Ok(GitInfo {
        branch: branch_name,
        is_clean,
        modified_files,
        untracked_files,
        staged_files,
        has_remote,
        remote_name,
        user_name,
        user_email,
    })
}

#[tauri::command]
pub fn git_clone(url: String, path: String) -> Result<(), String> {
    Repository::clone(&url, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_stage(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_path(std::path::Path::new(&file_path)).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    repo.reset_default(Some(&head_commit.into_object()), [std::path::Path::new(&file_path)])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_stage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage_all(repo_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    repo.reset_default(Some(&head_commit.into_object()), ["."]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None,
    };
    
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();
    
    let commit_id = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &parents,
    ).map_err(|e| e.to_string())?;
    
    Ok(commit_id.to_string())
}

#[tauri::command]
pub fn git_discard_changes(repo_path: String, file_path: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.path(&file_path);
    checkout_opts.force();
    repo.checkout_head(Some(&mut checkout_opts)).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DiffLine {
    pub line_type: String, // "add", "delete", "context", "header"
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileDiff {
    pub file_path: String,
    pub old_content: String,
    pub new_content: String,
    pub lines: Vec<DiffLine>,
    pub is_new_file: bool,
    pub is_deleted: bool,
}

#[tauri::command]
pub fn git_diff(repo_path: String, file_path: String, is_staged: bool) -> Result<FileDiff, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut diff_lines: Vec<DiffLine> = Vec::new();
    let mut old_content = String::new();
    let mut new_content = String::new();
    let mut is_new_file = false;
    let mut is_deleted = false;
    
    // Get the diff
    let diff = if is_staged {
        // Staged changes: compare HEAD to index
        let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head.as_ref(), None, None)
            .map_err(|e| e.to_string())?
    } else {
        // Unstaged changes: compare index to workdir
        repo.diff_index_to_workdir(None, None)
            .map_err(|e| e.to_string())?
    };
    
    // Filter to specific file
    let file_path_clone = file_path.clone();
    
    // Get old content (from HEAD or index)
    if is_staged {
        // For staged: get from HEAD
        if let Ok(head) = repo.head() {
            if let Ok(tree) = head.peel_to_tree() {
                if let Ok(entry) = tree.get_path(Path::new(&file_path)) {
                    if let Ok(blob) = repo.find_blob(entry.id()) {
                        if let Ok(content) = std::str::from_utf8(blob.content()) {
                            old_content = content.to_string();
                        }
                    }
                }
            }
        }
        // Get new content from index
        if let Ok(index) = repo.index() {
            if let Some(entry) = index.get_path(Path::new(&file_path), 0) {
                if let Ok(blob) = repo.find_blob(entry.id) {
                    if let Ok(content) = std::str::from_utf8(blob.content()) {
                        new_content = content.to_string();
                    }
                }
            }
        }
    } else {
        // For unstaged: get from index
        if let Ok(index) = repo.index() {
            if let Some(entry) = index.get_path(Path::new(&file_path), 0) {
                if let Ok(blob) = repo.find_blob(entry.id) {
                    if let Ok(content) = std::str::from_utf8(blob.content()) {
                        old_content = content.to_string();
                    }
                }
            }
        }
        // Get new content from workdir
        let full_path = Path::new(&repo_path).join(&file_path);
        if let Ok(content) = std::fs::read_to_string(&full_path) {
            new_content = content;
        }
    }
    
    // Parse diff for the specific file
    diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        if let Some(path) = delta.new_file().path().or(delta.old_file().path()) {
            if path.to_string_lossy() != file_path_clone {
                return true;
            }
        }
        
        // Check if new or deleted file
        if delta.status() == git2::Delta::Added {
            is_new_file = true;
        } else if delta.status() == git2::Delta::Deleted {
            is_deleted = true;
        }
        
        let line_type = match line.origin() {
            '+' => "add",
            '-' => "delete",
            ' ' => "context",
            'H' | 'F' => "header",
            '@' => "hunk",
            _ => "context",
        };
        
        let content = String::from_utf8_lossy(line.content()).to_string();
        
        diff_lines.push(DiffLine {
            line_type: line_type.to_string(),
            content,
            old_line_no: line.old_lineno(),
            new_line_no: line.new_lineno(),
        });
        
        true
    }).map_err(|e| e.to_string())?;
    
    // If no diff lines but file is untracked, treat as new file
    if diff_lines.is_empty() && !is_staged {
        let full_path = Path::new(&repo_path).join(&file_path);
        if let Ok(content) = std::fs::read_to_string(&full_path) {
            is_new_file = true;
            new_content = content.clone();
            for (i, line) in content.lines().enumerate() {
                diff_lines.push(DiffLine {
                    line_type: "add".to_string(),
                    content: format!("{}\n", line),
                    old_line_no: None,
                    new_line_no: Some((i + 1) as u32),
                });
            }
        }
    }
    
    Ok(FileDiff {
        file_path,
        old_content,
        new_content,
        lines: diff_lines,
        is_new_file,
        is_deleted,
    })
}


#[tauri::command]
pub fn git_contributors(repo_path: String) -> Result<Vec<GitContributor>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    // Map: email -> (name, commits_count, branches set)
    let mut contributors_map: HashMap<String, (String, usize, std::collections::HashSet<String>)> = HashMap::new();
    
    // Get current user email for is_local check
    let config = repo.config().ok();
    let local_email = config.as_ref().and_then(|c| c.get_string("user.email").ok());
    let local_name = config.as_ref().and_then(|c| c.get_string("user.name").ok());
    
    // Try to get GitHub username from remote URL
    let github_username = repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()))
        .and_then(|url| extract_github_username(&url));
    
    // Walk through all commits
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    
    // Add all branches (local and remote)
    if let Ok(branches) = repo.branches(None) {
        for branch_result in branches {
            if let Ok((branch, _branch_type)) = branch_result {
                if let Ok(reference) = branch.into_reference().resolve() {
                    if let Some(oid) = reference.target() {
                        let _ = revwalk.push(oid);
                    }
                }
            }
        }
    }
    
    // Also push HEAD
    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            let _ = revwalk.push(oid);
        }
    }
    
    // Collect commits and their branch associations
    let mut commit_branches: HashMap<git2::Oid, Vec<String>> = HashMap::new();
    
    // Map commits to branches
    if let Ok(branches) = repo.branches(None) {
        for branch_result in branches {
            if let Ok((branch, branch_type)) = branch_result {
                let branch_name = branch.name().ok().flatten().unwrap_or("unknown").to_string();
                let display_name = if branch_type == git2::BranchType::Remote {
                    branch_name.clone()
                } else {
                    branch_name.clone()
                };
                
                if let Ok(reference) = branch.into_reference().resolve() {
                    if let Some(oid) = reference.target() {
                        commit_branches.entry(oid).or_insert_with(Vec::new).push(display_name);
                    }
                }
            }
        }
    }
    
    // Process commits
    for oid_result in revwalk {
        if let Ok(oid) = oid_result {
            if let Ok(commit) = repo.find_commit(oid) {
                let author = commit.author();
                let email = author.email().unwrap_or("unknown").to_string();
                let name = author.name().unwrap_or("Unknown").to_string();
                
                let entry = contributors_map.entry(email.clone()).or_insert_with(|| {
                    (name.clone(), 0, std::collections::HashSet::new())
                });
                
                entry.1 += 1; // Increment commit count
                
                // Add branches for this commit
                if let Some(branches) = commit_branches.get(&oid) {
                    for branch in branches {
                        entry.2.insert(branch.clone());
                    }
                }
            }
        }
    }
    
    // Convert to Vec<GitContributor>
    let mut contributors: Vec<GitContributor> = contributors_map
        .into_iter()
        .map(|(email, (name, commits_count, branches))| {
            let is_local = local_email.as_ref().map(|le| le == &email).unwrap_or(false);
            
            // Generate avatar URL
            let avatar_url = get_avatar_url(&email, &name, is_local, github_username.as_deref(), local_name.as_deref());
            
            GitContributor {
                name,
                email,
                commits_count,
                branches: branches.into_iter().collect(),
                is_local,
                avatar_url,
            }
        })
        .collect();
    
    // Sort by commits count descending
    contributors.sort_by(|a, b| b.commits_count.cmp(&a.commits_count));
    
    Ok(contributors)
}

// MD5 hash for Gravatar
fn md5_hash(input: &str) -> String {
    use md5::{Md5, Digest};
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// Extract GitHub username from remote URL
fn extract_github_username(url: &str) -> Option<String> {
    // Handle formats:
    // https://github.com/username/repo.git
    // git@github.com:username/repo.git
    // https://github.com/username/repo
    
    if url.contains("github.com") {
        if url.starts_with("git@") {
            // git@github.com:username/repo.git
            url.split(':').nth(1)
                .and_then(|s| s.split('/').next())
                .map(|s| s.to_string())
        } else {
            // https://github.com/username/repo
            url.split("github.com/").nth(1)
                .and_then(|s| s.split('/').next())
                .map(|s| s.to_string())
        }
    } else {
        None
    }
}

// Get avatar URL for a contributor
fn get_avatar_url(email: &str, name: &str, is_local: bool, github_username: Option<&str>, local_name: Option<&str>) -> Option<String> {
    // 1. For GitHub noreply emails, extract username directly
    if email.contains("@users.noreply.github.com") {
        // GitHub noreply format: 12345678+username@users.noreply.github.com
        // or just: username@users.noreply.github.com
        let username = email.split('+').nth(1)
            .and_then(|s| s.split('@').next())
            .or_else(|| email.split('@').next());
        return username.map(|u| format!("https://github.com/{}.png?size=40", u));
    }
    
    // 2. For local user, try to use GitHub username from remote
    if is_local {
        if let Some(gh_user) = github_username {
            return Some(format!("https://github.com/{}.png?size=40", gh_user));
        }
    }
    
    // 3. Try to use name as GitHub username (common case)
    // GitHub usernames can't have spaces, so only try if name looks like a username
    let name_trimmed = name.trim();
    if !name_trimmed.contains(' ') && !name_trimmed.is_empty() {
        // This might be a GitHub username
        return Some(format!("https://github.com/{}.png?size=40", name_trimmed));
    }
    
    // 4. Fallback to Gravatar
    let hash = md5_hash(&email.trim().to_lowercase());
    Some(format!("https://www.gravatar.com/avatar/{}?s=40&d=retro", hash))
}
