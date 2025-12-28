pub mod push;

use git2::{Repository, StatusOptions, Signature};
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
    pub status: String,
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

#[derive(Serialize, Deserialize, Debug)]
pub struct DiffLine {
    pub line_type: String,
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

#[derive(Serialize, Deserialize, Debug)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub author_avatar: Option<String>,
    pub date: String,
    pub timestamp: i64,
    pub branches: Vec<String>,
    pub is_head: bool,
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
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
        let is_staged = status.is_index_new() || status.is_index_modified() || status.is_index_deleted();
        
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
            continue;
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
    
    let branch_name = match repo.head() {
        Ok(head) => head.shorthand().unwrap_or("HEAD").to_string(),
        Err(_) => "main".to_string(),
    };
    
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
    
    let (has_remote, remote_name) = match repo.find_remote("origin") {
        Ok(remote) => (true, remote.url().map(|s| s.to_string())),
        Err(_) => (false, None),
    };
    
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
    
    let commit_id = repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;
    
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

#[tauri::command]
pub fn git_diff(repo_path: String, file_path: String, is_staged: bool) -> Result<FileDiff, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut diff_lines: Vec<DiffLine> = Vec::new();
    let mut old_content = String::new();
    let mut new_content = String::new();
    let mut is_new_file = false;
    let mut is_deleted = false;
    
    let diff = if is_staged {
        let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head.as_ref(), None, None).map_err(|e| e.to_string())?
    } else {
        repo.diff_index_to_workdir(None, None).map_err(|e| e.to_string())?
    };
    
    let file_path_clone = file_path.clone();
    
    if is_staged {
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
        if let Ok(index) = repo.index() {
            if let Some(entry) = index.get_path(Path::new(&file_path), 0) {
                if let Ok(blob) = repo.find_blob(entry.id) {
                    if let Ok(content) = std::str::from_utf8(blob.content()) {
                        old_content = content.to_string();
                    }
                }
            }
        }
        let full_path = Path::new(&repo_path).join(&file_path);
        if let Ok(content) = std::fs::read_to_string(&full_path) {
            new_content = content;
        }
    }
    
    diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        if let Some(path) = delta.new_file().path().or(delta.old_file().path()) {
            if path.to_string_lossy() != file_path_clone {
                return true;
            }
        }
        
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
    let mut contributors_map: HashMap<String, (String, usize, std::collections::HashSet<String>)> = HashMap::new();
    
    let config = repo.config().ok();
    let local_email = config.as_ref().and_then(|c| c.get_string("user.email").ok());
    
    let github_username = repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()))
        .and_then(|url| extract_github_username(&url));
    
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    
    if let Ok(branches) = repo.branches(None) {
        for branch_result in branches {
            if let Ok((branch, _)) = branch_result {
                if let Ok(reference) = branch.into_reference().resolve() {
                    if let Some(oid) = reference.target() {
                        let _ = revwalk.push(oid);
                    }
                }
            }
        }
    }
    
    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            let _ = revwalk.push(oid);
        }
    }
    
    for oid_result in revwalk {
        if let Ok(oid) = oid_result {
            if let Ok(commit) = repo.find_commit(oid) {
                let author = commit.author();
                let email = author.email().unwrap_or("unknown").to_string();
                let name = author.name().unwrap_or("Unknown").to_string();
                
                let entry = contributors_map.entry(email.clone())
                    .or_insert_with(|| (name.clone(), 0, std::collections::HashSet::new()));
                entry.1 += 1;
            }
        }
    }
    
    let mut contributors: Vec<GitContributor> = contributors_map
        .into_iter()
        .map(|(email, (name, commits_count, branches))| {
            let is_local = local_email.as_ref().map(|le| le == &email).unwrap_or(false);
            let avatar_url = get_avatar_url(&email, &name, is_local, github_username.as_deref());
            
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
    
    contributors.sort_by(|a, b| b.commits_count.cmp(&a.commits_count));
    Ok(contributors)
}

#[tauri::command]
pub fn git_log(repo_path: String, max_count: Option<usize>) -> Result<Vec<GitCommit>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    
    // Get current HEAD commit OID
    let head_oid = repo.head()
        .ok()
        .and_then(|head| head.target());
    
    // Get remote URL for avatar generation
    let github_username = repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()))
        .and_then(|url| extract_github_username(&url));
    
    // Get local user config
    let config = repo.config().ok();
    let local_email = config.as_ref().and_then(|c| c.get_string("user.email").ok());
    let local_name = config.as_ref().and_then(|c| c.get_string("user.name").ok());
    
    // Build commit to branches mapping
    let mut commit_branches: HashMap<git2::Oid, Vec<String>> = HashMap::new();
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
    
    let max = max_count.unwrap_or(100);
    let mut commits = Vec::new();
    
    for (i, oid_result) in revwalk.enumerate() {
        if i >= max { break; }
        if let Ok(oid) = oid_result {
            if let Ok(commit) = repo.find_commit(oid) {
                let author = commit.author();
                let author_name = author.name().unwrap_or("Unknown").to_string();
                let author_email = author.email().unwrap_or("").to_string();
                
                // Check if this is HEAD
                let is_head = head_oid.map(|h| h == oid).unwrap_or(false);
                
                // Get branches for this commit
                let branches = commit_branches.get(&oid)
                    .cloned()
                    .unwrap_or_default();
                
                // Get commit time
                let commit_time = commit.time();
                let timestamp = commit_time.seconds();
                
                // Format date
                let date = {
                    use std::time::{SystemTime, UNIX_EPOCH, Duration};
                    let dt = UNIX_EPOCH + Duration::from_secs(timestamp as u64);
                    let datetime: chrono::DateTime<chrono::Utc> = dt.into();
                    datetime.format("%Y-%m-%d %H:%M:%S").to_string()
                };
                
                // Get avatar URL
                let is_local = local_email.as_ref().map(|le| le == &author_email).unwrap_or(false);
                let author_avatar = get_avatar_url(&author_email, &author_name, is_local, github_username.as_deref());
                
                // Calculate stats (files changed, insertions, deletions)
                let (files_changed, insertions, deletions) = {
                    let mut files = 0;
                    let mut insertions = 0;
                    let mut deletions = 0;
                    
                    if let Ok(parent) = commit.parent(0) {
                        if let Ok(parent_tree) = parent.tree() {
                            if let Ok(commit_tree) = commit.tree() {
                                if let Ok(diff) = repo.diff_tree_to_tree(
                                    Some(&parent_tree),
                                    Some(&commit_tree),
                                    None
                                ) {
                                    if let Ok(stats) = diff.stats() {
                                        files = stats.files_changed();
                                        insertions = stats.insertions();
                                        deletions = stats.deletions();
                                    }
                                }
                            }
                        }
                    } else {
                        // First commit - all files are new
                        if let Ok(tree) = commit.tree() {
                            files = tree.len();
                            if let Ok(diff) = repo.diff_tree_to_tree(None, Some(&tree), None) {
                                if let Ok(stats) = diff.stats() {
                                    insertions = stats.insertions();
                                }
                            }
                        }
                    }
                    
                    (files, insertions, deletions)
                };
                
                let hash_str = oid.to_string();
                let short_hash = if hash_str.len() >= 7 {
                    hash_str[..7].to_string()
                } else {
                    hash_str.clone()
                };
                
                commits.push(GitCommit {
                    hash: hash_str,
                    short_hash,
                    message: commit.message().unwrap_or("").trim().to_string(),
                    author_name,
                    author_email,
                    author_avatar,
                    date,
                    timestamp,
                    branches,
                    is_head,
                    files_changed,
                    insertions,
                    deletions,
                });
            }
        }
    }
    
    Ok(commits)
}

#[tauri::command]
pub fn git_list_branches(repo_path: String) -> Result<Vec<GitBranch>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();
    
    let current_branch = repo.head().ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));
    
    for branch_result in repo.branches(None).map_err(|e| e.to_string())? {
        if let Ok((branch, branch_type)) = branch_result {
            if let Ok(Some(name)) = branch.name() {
                branches.push(GitBranch {
                    name: name.to_string(),
                    is_current: current_branch.as_ref().map(|c| c == name).unwrap_or(false),
                    is_remote: branch_type == git2::BranchType::Remote,
                });
            }
        }
    }
    
    Ok(branches)
}

#[tauri::command]
pub fn git_create_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    repo.branch(&branch_name, &commit, false).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_checkout_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let refname = format!("refs/heads/{}", branch_name);
    let obj = repo.revparse_single(&refname).map_err(|e| e.to_string())?;
    repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&refname).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_delete_branch(repo_path: String, branch_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|e| e.to_string())?;
    branch.delete().map_err(|e| e.to_string())?;
    Ok(())
}

fn md5_hash(input: &str) -> String {
    use md5::{Md5, Digest};
    let mut hasher = Md5::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn extract_github_username(url: &str) -> Option<String> {
    if url.contains("github.com") {
        if url.starts_with("git@") {
            url.split(':').nth(1).and_then(|s| s.split('/').next()).map(|s| s.to_string())
        } else {
            url.split("github.com/").nth(1).and_then(|s| s.split('/').next()).map(|s| s.to_string())
        }
    } else {
        None
    }
}

fn get_avatar_url(email: &str, name: &str, is_local: bool, github_username: Option<&str>) -> Option<String> {
    if email.contains("@users.noreply.github.com") {
        let username = email.split('+').nth(1)
            .and_then(|s| s.split('@').next())
            .or_else(|| email.split('@').next());
        return username.map(|u| format!("https://github.com/{}.png?size=40", u));
    }
    
    if is_local {
        if let Some(gh_user) = github_username {
            return Some(format!("https://github.com/{}.png?size=40", gh_user));
        }
    }
    
    let name_trimmed = name.trim();
    if !name_trimmed.contains(' ') && !name_trimmed.is_empty() {
        return Some(format!("https://github.com/{}.png?size=40", name_trimmed));
    }
    
    let hash = md5_hash(&email.trim().to_lowercase());
    Some(format!("https://www.gravatar.com/avatar/{}?s=40&d=retro", hash))
}

#[tauri::command]
pub fn git_github_auth_status() -> Result<bool, String> {
    // Check if GitHub CLI is authenticated
    let output = std::process::Command::new("gh")
        .args(&["auth", "status"])
        .output();
    
    match output {
        Ok(result) => Ok(result.status.success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn git_github_auth_login() -> Result<(), String> {
    // Try to authenticate via GitHub CLI
    let output = std::process::Command::new("gh")
        .args(&["auth", "login"])
        .status();
    
    match output {
        Ok(status) => {
            if status.success() {
                Ok(())
            } else {
                Err("GitHub authentication failed".to_string())
            }
        }
        Err(e) => Err(format!("Failed to run GitHub CLI: {}", e)),
    }
}
