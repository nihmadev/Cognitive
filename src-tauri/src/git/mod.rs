pub mod push;

use git2::{Repository, StatusOptions, Signature};
use serde::{Serialize, Deserialize};
use std::path::Path;
use std::collections::HashMap;
use md5::{Md5, Digest};
use std::fs;
use std::io::{self, BufRead};

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
    pub is_dir: bool,
    pub is_ignored: bool,
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
    
    // Read .gitignore patterns
    let gitignore_patterns = read_gitignore_patterns(&path);
    
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.include_ignored(true); // Include to see all files
    opts.recurse_untracked_dirs(true);

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
        } else if status.is_ignored() {
            "ignored"
        } else {
            continue;
        };

        if let Some(file_path) = entry.path() {
            let full_path = Path::new(&path).join(file_path);
            let is_dir = full_path.is_dir();
            
            // Check if file is ignored using our manual check
            // This is more reliable than git2's is_ignored() for display purposes
            let is_ignored = is_path_ignored(file_path, &gitignore_patterns);
            
            statuses.push(GitFileStatus {
                path: file_path.to_string(),
                status: status_str.to_string(),
                is_staged,
                is_dir,
                is_ignored,
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
    
    
    let head_oid = repo.head()
        .ok()
        .and_then(|head| head.target());
    
    
    let github_username = repo.find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(|s| s.to_string()))
        .and_then(|url| extract_github_username(&url));
    
    
    let config = repo.config().ok();
    let local_email = config.as_ref().and_then(|c| c.get_string("user.email").ok());
    let _local_name = config.as_ref().and_then(|c| c.get_string("user.name").ok());
    
    
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
                
                
                let is_head = head_oid.map(|h| h == oid).unwrap_or(false);
                
                
                let branches = commit_branches.get(&oid)
                    .cloned()
                    .unwrap_or_default();
                
                
                let commit_time = commit.time();
                let timestamp = commit_time.seconds();
                
                
                let date = {
                    use std::time::{UNIX_EPOCH, Duration};
                    let dt = UNIX_EPOCH + Duration::from_secs(timestamp as u64);
                    let datetime: chrono::DateTime<chrono::Utc> = dt.into();
                    datetime.format("%Y-%m-%d %H:%M:%S").to_string()
                };
                
                
                let is_local = local_email.as_ref().map(|le| le == &author_email).unwrap_or(false);
                let author_avatar = get_avatar_url(&author_email, &author_name, is_local, github_username.as_deref());
                
                
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

/// Reads .gitignore file and returns a list of patterns
fn read_gitignore_patterns(repo_path: &str) -> Vec<String> {
    let gitignore_path = Path::new(repo_path).join(".gitignore");
    let mut patterns = Vec::new();
    
    if let Ok(file) = fs::File::open(gitignore_path) {
        let reader = io::BufReader::new(file);
        for line in reader.lines() {
            if let Ok(line) = line {
                let trimmed = line.trim();
                // Skip empty lines and comments
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    patterns.push(trimmed.to_string());
                }
            }
        }
    }
    
    patterns
}

/// Checks if a file path matches any gitignore pattern
fn is_path_ignored(file_path: &str, patterns: &[String]) -> bool {
    // Check if the file itself or any of its parent directories match a pattern
    
    for pattern in patterns {
        let pattern = pattern.trim();
        
        // Skip empty patterns and comments
        if pattern.is_empty() || pattern.starts_with('#') {
            continue;
        }
        
        // Handle negation patterns (starting with !)
        if pattern.starts_with('!') {
            continue; // Skip negation for now
        }
        
        // Remove trailing slash for directory patterns
        let pattern = pattern.trim_end_matches('/');
        
        // Handle patterns starting with / (root-relative, must match from start)
        if pattern.starts_with('/') {
            let pattern_without_slash = &pattern[1..];
            if file_path == pattern_without_slash || file_path.starts_with(&format!("{}/", pattern_without_slash)) {
                return true;
            }
            continue; // Root-relative patterns don't match anywhere else
        }
        
        // Handle wildcard patterns
        if pattern.contains('*') {
            if pattern.starts_with("*.") {
                // *.ext - match file extension anywhere in the tree
                let ext = &pattern[1..]; // includes the dot
                // Check if the file itself ends with this extension
                if file_path.ends_with(ext) {
                    return true;
                }
                // Check if any path component ends with this extension
                for component in file_path.split('/') {
                    if component.ends_with(ext) {
                        return true;
                    }
                }
            } else if pattern.ends_with('*') && !pattern.contains('/') {
                // prefix* - match files/dirs starting with prefix
                let prefix = &pattern[..pattern.len()-1];
                // Check each path component for exact prefix match
                for component in file_path.split('/') {
                    if component.starts_with(prefix) {
                        return true;
                    }
                }
            } else if pattern.starts_with('*') && !pattern.contains('/') {
                // *suffix - match files/dirs ending with suffix
                let suffix = &pattern[1..];
                for component in file_path.split('/') {
                    if component.ends_with(suffix) {
                        return true;
                    }
                }
            }
            // Skip other complex wildcard patterns
            continue;
        }
        
        // For simple patterns (no wildcards, no leading /)
        // These patterns can match anywhere in the directory tree
        
        // Check if the entire path matches
        if file_path == pattern {
            return true;
        }
        
        // Check if path starts with pattern (for directories)
        // e.g., "node_modules" matches "node_modules/file"
        if file_path.starts_with(&format!("{}/", pattern)) {
            return true;
        }
        
        // Check each component of the path
        // e.g., "node_modules" matches "path/node_modules/file"
        let file_components: Vec<&str> = file_path.split('/').collect();
        for (i, component) in file_components.iter().enumerate() {
            if *component == pattern {
                // This component matches the pattern
                // If it's not the last component, everything under it is ignored
                // If it is the last component, the file/dir itself is ignored
                return true;
            }
        }
    }
    
    false
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

#[tauri::command]
pub fn git_pull(repo_path: String, remote_name: Option<String>, branch_name: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let remote_name = remote_name.unwrap_or_else(|| "origin".to_string());
    let mut remote = repo.find_remote(&remote_name).map_err(|e| e.to_string())?;
    
    let branch_name = branch_name.or_else(|| {
        repo.head().ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()))
    }).unwrap_or_else(|| "main".to_string());
    
    remote.fetch(&[&branch_name], None, None).map_err(|e| e.to_string())?;
    
    let fetch_head = repo.find_reference("FETCH_HEAD").map_err(|e| e.to_string())?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head).map_err(|e| e.to_string())?;
    
    let analysis = repo.merge_analysis(&[&fetch_commit]).map_err(|e| e.to_string())?;
    
    if analysis.0.is_up_to_date() {
        return Ok("Already up to date".to_string());
    }
    
    if analysis.0.is_fast_forward() {
        let refname = format!("refs/heads/{}", branch_name);
        let mut reference = repo.find_reference(&refname).map_err(|e| e.to_string())?;
        reference.set_target(fetch_commit.id(), "Fast-forward").map_err(|e| e.to_string())?;
        repo.set_head(&refname).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| e.to_string())?;
        return Ok("Fast-forward successful".to_string());
    }
    
    if analysis.0.is_normal() {
        let head_commit = repo.reference_to_annotated_commit(&repo.head().map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        
        repo.merge(&[&fetch_commit], None, None).map_err(|e| e.to_string())?;
        
        let mut index = repo.index().map_err(|e| e.to_string())?;
        if index.has_conflicts() {
            return Err("Merge conflicts detected. Please resolve conflicts manually.".to_string());
        }
        
        let tree_id = index.write_tree().map_err(|e| e.to_string())?;
        let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
        
        let config = repo.config().map_err(|e| e.to_string())?;
        let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
        let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
        let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
        
        let local_commit = repo.find_commit(head_commit.id()).map_err(|e| e.to_string())?;
        let remote_commit = repo.find_commit(fetch_commit.id()).map_err(|e| e.to_string())?;
        
        let message = format!("Merge branch '{}' of {}", branch_name, remote_name);
        repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&local_commit, &remote_commit])
            .map_err(|e| e.to_string())?;
        
        repo.cleanup_state().map_err(|e| e.to_string())?;
        
        return Ok("Merge successful".to_string());
    }
    
    Err("Unable to pull: unknown merge analysis result".to_string())
}

#[tauri::command]
pub fn git_fetch(repo_path: String, remote_name: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let remote_name = remote_name.unwrap_or_else(|| "origin".to_string());
    let mut remote = repo.find_remote(&remote_name).map_err(|e| e.to_string())?;
    
    remote.fetch(&[] as &[&str], None, None).map_err(|e| e.to_string())?;
    
    Ok(format!("Fetched from {}", remote_name))
}

#[tauri::command]
pub fn git_commit_amend(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let parents: Vec<git2::Commit> = head_commit.parents().collect();
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    
    let commit_id = repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parent_refs)
        .map_err(|e| e.to_string())?;
    
    Ok(commit_id.to_string())
}



#[tauri::command]
pub fn git_stash_save(repo_path: String, message: Option<String>) -> Result<String, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let msg = message.as_deref().unwrap_or("WIP");
    
    let stash_id = repo.stash_save(&sig, msg, None).map_err(|e| e.to_string())?;
    
    Ok(stash_id.to_string())
}

#[tauri::command]
pub fn git_stash_pop(repo_path: String, index: Option<usize>) -> Result<(), String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let idx = index.unwrap_or(0);
    repo.stash_pop(idx, None).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn git_stash_list(repo_path: String) -> Result<Vec<(usize, String)>, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let mut stashes = Vec::new();
    repo.stash_foreach(|index, name, _oid| {
        stashes.push((index, name.to_string()));
        true
    }).map_err(|e| e.to_string())?;
    
    Ok(stashes)
}

#[tauri::command]
pub fn git_stash_drop(repo_path: String, index: usize) -> Result<(), String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.stash_drop(index).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.remote(&name, &url).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_remove_remote(repo_path: String, name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.remote_delete(&name).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_rename_remote(repo_path: String, old_name: String, new_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.remote_rename(&old_name, &new_name).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_create_tag(repo_path: String, tag_name: String, message: Option<String>) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let target = head.peel_to_commit().map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let tag_id = if let Some(msg) = message {
        repo.tag(&tag_name, target.as_object(), &sig, &msg, false)
            .map_err(|e| e.to_string())?
    } else {
        repo.tag_lightweight(&tag_name, target.as_object(), false)
            .map_err(|e| e.to_string())?
    };
    
    Ok(tag_id.to_string())
}

#[tauri::command]
pub fn git_delete_tag(repo_path: String, tag_name: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    repo.tag_delete(&tag_name).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_list_tags(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let tags = repo.tag_names(None).map_err(|e| e.to_string())?;
    
    let tag_list: Vec<String> = tags.iter()
        .filter_map(|t| t.map(|s| s.to_string()))
        .collect();
    
    Ok(tag_list)
}

#[tauri::command]
pub fn git_merge_branch(repo_path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|e| e.to_string())?;
    let branch_ref = branch.into_reference();
    let annotated_commit = repo.reference_to_annotated_commit(&branch_ref)
        .map_err(|e| e.to_string())?;
    
    let analysis = repo.merge_analysis(&[&annotated_commit])
        .map_err(|e| e.to_string())?;
    
    if analysis.0.is_up_to_date() {
        return Ok("Already up to date".to_string());
    }
    
    if analysis.0.is_fast_forward() {
        let refname = format!("refs/heads/{}", 
            repo.head().ok()
                .and_then(|h| h.shorthand().map(|s| s.to_string()))
                .unwrap_or_else(|| "main".to_string())
        );
        let mut reference = repo.find_reference(&refname).map_err(|e| e.to_string())?;
        reference.set_target(annotated_commit.id(), "Fast-forward")
            .map_err(|e| e.to_string())?;
        repo.set_head(&refname).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| e.to_string())?;
        return Ok("Fast-forward merge successful".to_string());
    }
    
    repo.merge(&[&annotated_commit], None, None).map_err(|e| e.to_string())?;
    
    let mut index = repo.index().map_err(|e| e.to_string())?;
    if index.has_conflicts() {
        return Err("Merge conflicts detected. Please resolve conflicts manually.".to_string());
    }
    
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let head_commit = repo.head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let merge_commit = repo.find_commit(annotated_commit.id())
        .map_err(|e| e.to_string())?;
    
    let message = format!("Merge branch '{}'", branch_name);
    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&head_commit, &merge_commit])
        .map_err(|e| e.to_string())?;
    
    repo.cleanup_state().map_err(|e| e.to_string())?;
    
    Ok("Merge successful".to_string())
}

#[tauri::command]
pub fn git_rebase(repo_path: String, branch_name: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let branch = repo.find_branch(&branch_name, git2::BranchType::Local)
        .map_err(|e| e.to_string())?;
    let branch_ref = branch.into_reference();
    let annotated_commit = repo.reference_to_annotated_commit(&branch_ref)
        .map_err(|e| e.to_string())?;
    
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = repo.reference_to_annotated_commit(&head)
        .map_err(|e| e.to_string())?;
    
    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
    let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    
    let mut rebase = repo.rebase(Some(&head_commit), Some(&annotated_commit), None, None)
        .map_err(|e| e.to_string())?;
    
    while let Some(op) = rebase.next() {
        op.map_err(|e| e.to_string())?;
        rebase.commit(None, &sig, None).map_err(|e| e.to_string())?;
    }
    
    rebase.finish(Some(&sig)).map_err(|e| e.to_string())?;
    
    Ok("Rebase successful".to_string())
}

#[tauri::command]
pub fn git_reset_hard(repo_path: String, commit_hash: Option<String>) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let target = if let Some(hash) = commit_hash {
        let oid = git2::Oid::from_str(&hash).map_err(|e| e.to_string())?;
        repo.find_commit(oid).map_err(|e| e.to_string())?
    } else {
        repo.head()
            .and_then(|h| h.peel_to_commit())
            .map_err(|e| e.to_string())?
    };
    
    repo.reset(target.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn git_reset_soft(repo_path: String, commit_hash: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    
    repo.reset(commit.as_object(), git2::ResetType::Soft, None)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CommitFile {
    pub path: String,
    pub status: String, // A (Added), M (Modified), D (Deleted), R (Renamed)
    pub old_path: Option<String>, // For renamed files
}

#[tauri::command]
pub fn git_commit_files(repo_path: String, commit_hash: String) -> Result<Vec<CommitFile>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    
    // Get the commit's tree
    let commit_tree = commit.tree().map_err(|e| e.to_string())?;
    
    // Get parent tree (if exists)
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0).map_err(|e| e.to_string())?.tree().map_err(|e| e.to_string())?)
    } else {
        None
    };
    
    // Create diff between parent and current commit
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&commit_tree),
        None
    ).map_err(|e| e.to_string())?;
    
    // Iterate through deltas
    for delta in diff.deltas() {
        let status = match delta.status() {
            git2::Delta::Added => "A",
            git2::Delta::Modified => "M",
            git2::Delta::Deleted => "D",
            git2::Delta::Renamed => "R",
            git2::Delta::Copied => "C",
            _ => "M",
        };
        
        let path = delta.new_file().path()
            .or(delta.old_file().path())
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();
        
        let old_path = if delta.status() == git2::Delta::Renamed {
            delta.old_file().path().and_then(|p| p.to_str()).map(|s| s.to_string())
        } else {
            None
        };
        
        files.push(CommitFile {
            path,
            status: status.to_string(),
            old_path,
        });
    }
    
    Ok(files)
}

#[tauri::command]
pub fn git_file_at_commit(repo_path: String, commit_hash: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    
    // Get the file from the tree
    let entry = tree.get_path(std::path::Path::new(&file_path))
        .map_err(|e| format!("File not found in commit: {}", e))?;
    
    let object = entry.to_object(&repo).map_err(|e| e.to_string())?;
    let blob = object.as_blob()
        .ok_or_else(|| "Object is not a blob".to_string())?;
    
    // Convert blob content to string
    let content = std::str::from_utf8(blob.content())
        .map_err(|e| format!("Failed to decode file content: {}", e))?;
    
    Ok(content.to_string())
}

#[tauri::command]
pub fn git_file_at_parent_commit(repo_path: String, commit_hash: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let oid = git2::Oid::from_str(&commit_hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    
    // Get parent commit (first parent for merge commits)
    let parent = commit.parent(0)
        .map_err(|_| "No parent commit found (this might be the initial commit)".to_string())?;
    
    let tree = parent.tree().map_err(|e| e.to_string())?;
    
    // Try to get the file from the parent tree
    let entry = tree.get_path(std::path::Path::new(&file_path))
        .map_err(|_| "File did not exist in parent commit (newly added file)".to_string())?;
    
    let object = entry.to_object(&repo).map_err(|e| e.to_string())?;
    let blob = object.as_blob()
        .ok_or_else(|| "Object is not a blob".to_string())?;
    
    // Convert blob content to string
    let content = std::str::from_utf8(blob.content())
        .map_err(|e| format!("Failed to decode file content: {}", e))?;
    
    Ok(content.to_string())
}

