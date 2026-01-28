import { invoke } from '@tauri-apps/api/core';

export type GitFileStatus = {
    path: string;
    status: string;
    is_staged: boolean;
    is_dir: boolean;
    is_ignored: boolean;
};

export type GitInfo = {
    branch: string;
    is_clean: boolean;
    modified_files: number;
    untracked_files: number;
    staged_files: number;
    has_remote: boolean;
    remote_name: string | null;
    user_name: string | null;
    user_email: string | null;
};

export type DiffLine = {
    line_type: 'add' | 'delete' | 'context' | 'header' | 'hunk';
    content: string;
    old_line_no: number | null;
    new_line_no: number | null;
};

export type FileDiff = {
    file_path: string;
    old_content: string;
    new_content: string;
    lines: DiffLine[];
    is_new_file: boolean;
    is_deleted: boolean;
};

export type GitContributor = {
    name: string;
    email: string;
    commits_count: number;
    branches: string[];
    is_local: boolean;
    avatar_url: string | null;
};

export type GitBranch = {
    name: string;
    is_remote: boolean;
    is_head: boolean;
    commit: string;
    commit_message: string | null;
    last_commit_time: number;
};

export type GitPushResult = {
    success: boolean;
    message: string;
    pushed_refs: string[];
};

export type GitCommit = {
    hash: string;
    short_hash: string;
    message: string;
    author_name: string;
    author_email: string;
    author_avatar: string | null;
    date: string;
    timestamp: number;
    branches: string[];
    is_head: boolean;
    files_changed: number;
    insertions: number;
    deletions: number;
};

export type CommitFile = {
    path: string;
    status: string; // A (Added), M (Modified), D (Deleted), R (Renamed)
    old_path?: string; // For renamed files
};

export const gitStatus = (path: string) => invoke<GitFileStatus[]>('git_status', { path });
export const gitInfo = (path: string) => invoke<GitInfo>('git_info', { path });
export const gitClone = (url: string, path: string) => invoke<void>('git_clone', { url, path });
export const gitStage = (repoPath: string, filePath: string) => invoke<void>('git_stage', { repoPath, filePath });
export const gitUnstage = (repoPath: string, filePath: string) => invoke<void>('git_unstage', { repoPath, filePath });
export const gitStageAll = (repoPath: string) => invoke<void>('git_stage_all', { repoPath });
export const gitUnstageAll = (repoPath: string) => invoke<void>('git_unstage_all', { repoPath });
export const gitCommit = (repoPath: string, message: string) => invoke<string>('git_commit', { repoPath, message });
export const gitDiscardChanges = (repoPath: string, filePath: string) => invoke<void>('git_discard_changes', { repoPath, filePath });
export const gitDiff = (repoPath: string, filePath: string, isStaged: boolean) => invoke<FileDiff>('git_diff', { repoPath, filePath, isStaged });
export const gitContributors = (repoPath: string) => invoke<GitContributor[]>('git_contributors', { repoPath });
export const gitLog = (repoPath: string, limit?: number) => invoke<GitCommit[]>('git_log', { repoPath, limit });
export const gitListBranches = (repoPath: string) => invoke<GitBranch[]>('git_list_branches', { repoPath });
export const gitCreateBranch = (repoPath: string, request: { name: string; from_branch?: string; from_commit?: string }) => invoke<string>('git_create_branch', { repoPath, request });
export const gitCheckoutBranch = (repoPath: string, branchName: string) => invoke<string>('git_checkout_branch', { repoPath, branchName });
export const gitDeleteBranch = (repoPath: string, branchName: string, force: boolean) => invoke<string>('git_delete_branch', { repoPath, branchName, force });
export const gitPush = (repoPath: string, remoteName?: string, branchName?: string, force?: boolean) => invoke<GitPushResult>('git_push', { repoPath, remoteName, branchName, force });
export const gitPushWithForce = (repoPath: string, remoteName?: string, branchName?: string) => invoke<GitPushResult>('git_push_with_force', { repoPath, remoteName, branchName });
export const gitListRemotes = (repoPath: string) => invoke<string[]>('git_list_remotes', { repoPath });
export const gitGetRemoteUrl = (repoPath: string, remoteName: string) => invoke<string>('git_get_remote_url', { repoPath, remoteName });
export const gitPull = (repoPath: string, remoteName?: string, branchName?: string) => invoke<string>('git_pull', { repoPath, remoteName, branchName });
export const gitFetch = (repoPath: string, remoteName?: string) => invoke<string>('git_fetch', { repoPath, remoteName });
export const gitGithubAuthStatus = () => invoke<boolean>('git_github_auth_status');
export const gitGithubAuthLogin = () => invoke<void>('git_github_auth_login');
export const gitFileAtParentCommit = (repoPath: string, commitHash: string, filePath: string) => invoke<string>('git_file_at_parent_commit', { repoPath, commitHash, filePath });
export const gitFileAtCommit = (repoPath: string, commitHash: string, filePath: string) => invoke<string>('git_file_at_commit', { repoPath, commitHash, filePath });
export const gitCommitFiles = (repoPath: string, commitHash: string) => invoke<CommitFile[]>('git_commit_files', { repoPath, commitHash });

// Stash operations
export const gitStashSave = (repoPath: string, message?: string) => invoke<string>('git_stash_save', { repoPath, message });
export const gitStashPop = (repoPath: string, index?: number) => invoke<void>('git_stash_pop', { repoPath, index });
export const gitStashList = (repoPath: string) => invoke<Array<[number, string]>>('git_stash_list', { repoPath });
export const gitStashDrop = (repoPath: string, index: number) => invoke<void>('git_stash_drop', { repoPath, index });

// Remote operations
export const gitAddRemote = (repoPath: string, name: string, url: string) => invoke<void>('git_add_remote', { repoPath, name, url });
export const gitRemoveRemote = (repoPath: string, name: string) => invoke<void>('git_remove_remote', { repoPath, name });
export const gitRenameRemote = (repoPath: string, oldName: string, newName: string) => invoke<void>('git_rename_remote', { repoPath, oldName, newName });

// Tag operations
export const gitCreateTag = (repoPath: string, tagName: string, message?: string) => invoke<string>('git_create_tag', { repoPath, tagName, message });
export const gitDeleteTag = (repoPath: string, tagName: string) => invoke<void>('git_delete_tag', { repoPath, tagName });
export const gitListTags = (repoPath: string) => invoke<string[]>('git_list_tags', { repoPath });

// Advanced operations
export const gitMergeBranch = (repoPath: string, branchName: string) => invoke<string>('git_merge_branch', { repoPath, branchName });
export const gitRebase = (repoPath: string, branchName: string) => invoke<string>('git_rebase', { repoPath, branchName });
export const gitResetHard = (repoPath: string, commitHash?: string) => invoke<void>('git_reset_hard', { repoPath, commitHash });
export const gitResetSoft = (repoPath: string, commitHash: string) => invoke<void>('git_reset_soft', { repoPath, commitHash });
export const gitCommitAmend = (repoPath: string, message: string) => invoke<string>('git_commit_amend', { repoPath, message });
