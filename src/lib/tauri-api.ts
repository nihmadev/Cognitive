import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export type SearchOptions = {
    query: string;
    is_case_sensitive: boolean;
    is_whole_word: boolean;
    is_regex: boolean;
    include_pattern: string;
    exclude_pattern: string;
    filter_pattern: string;
};

export type SearchMatch = {
    line: number;
    char_start: number;
    char_end: number;
    line_text: string;
};

export type SearchResult = {
    file: { name: string; path: string };
    matches: SearchMatch[];
};

export type ReplaceAllResult = {
    total_replacements: number;
    files_changed: number;
};

export type PortInfo = {
    port: number;
    protocol: string;
    pid: number | null;
    process_name: string | null;
    local_address: string;
    state: string;
};

export type Problem = {
    id: number;
    type: 'error' | 'warning';
    file: string;
    path: string;
    line: number;
    column: number;
    message: string;
    code: string | null;
    source: string;
};

export type FileProblems = {
    file: string;
    path: string;
    problems: Problem[];
    error_count: number;
    warning_count: number;
};

export type ProblemsResult = {
    files: FileProblems[];
    total_errors: number;
    total_warnings: number;
    scan_time_ms: number;
    cache_hits: number;
    cache_misses: number;
};

export type ProblemsCacheStats = {
    cached_files: number;
};

export type GitFileStatus = {
    path: string;
    status: string;
    is_staged: boolean;
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

export type InitialState = {
    workspace: string | null;
    profile: string | null;
};

// Timeline types
export type TimelineEntry = {
    id: string;
    timestamp: number;
    date: string;
    size: number;
    hash: string;
};

export type FileTimeline = {
    file_path: string;
    entries: TimelineEntry[];
};

export type TimelineDiff = {
    old_content: string;
    new_content: string;
    old_id: string;
    new_id: string;
};

export type RenameResult = {
    old_path: string;
    new_path: string;
    was_file: boolean;
};

// NPM types
export type NpmScript = {
    name: string;
    command: string;
    description?: string;
};

export type RunningScript = {
    name: string;
    pid: number;
    start_time: string;
};

// Google API types
export type GoogleMessage = {
    role: string;
    parts: { text: string }[];
};

// AgentRouter types
export type AgentRouterMessage = {
    role: string;
    content: string;
    name?: string;
};

export type AgentRouterChatRequest = {
    model: string;
    messages: AgentRouterMessage[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop?: string | string[];
    tools?: AgentRouterTool[];
    tool_choice?: AgentRouterToolChoice;
    response_format?: AgentRouterResponseFormat;
};

export type AgentRouterTool = {
    type: string;
    function: AgentRouterFunction;
};

export type AgentRouterFunction = {
    name: string;
    description?: string;
    parameters: any;
};

export type AgentRouterToolChoice = string | {
    type: string;
    function: { name: string };
};

export type AgentRouterResponseFormat = {
    type: string;
};

export type AgentRouterChatResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: AgentRouterChoice[];
    usage: AgentRouterUsage;
};

export type AgentRouterChoice = {
    index: number;
    message: AgentRouterMessage;
    finish_reason?: string;
};

export type AgentRouterUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
};

export type AgentRouterModel = {
    id: string;
    object: string;
    created: number;
    owned_by: string;
};

export type AgentRouterModelsResponse = {
    object: string;
    data: AgentRouterModel[];
};


export const tauriApi = {
    // Initial state
    getInitialState: () => invoke<InitialState>('get_initial_state'),
    readDir: (path: string) => invoke<any[]>('read_dir', { path }),
    readFile: (path: string) => invoke<string>('read_file', { path }),
    readFileBinary: (path: string) => invoke<number[]>('read_file_binary', { path }),
    readFileBinaryChunked: (path: string, offset?: number, size?: number) => 
        invoke<number[]>('read_file_binary_chunked', { path, offset, size }),
    getFileSize: (path: string) => invoke<number>('get_file_size', { path }),
    writeFile: (path: string, content: string) => invoke<void>('write_file', { path, content }),
    createFile: (path: string) => invoke<void>('create_file', { path }),
    createFolder: (path: string) => invoke<void>('create_directory', { path }),
    renamePath: (oldPath: string, newPath: string) => invoke<void>('rename_path', { oldPath, newPath }),
    renameFileWithResult: (oldPath: string, newPath: string) => invoke<RenameResult>('rename_file_with_result', { oldPath, newPath }),
    deletePath: (path: string) => invoke<void>('delete_path', { path }),
    getAssetUrl: (path: string) => invoke<string>('get_asset_url', { path }),
    openFileDialog: () => invoke<string | null>('open_file_dialog'),
    openFolderDialog: () => invoke<string | null>('open_folder_dialog'),
    saveFileDialog: () => invoke<string | null>('save_file_dialog'),
    // Git commands
    gitStatus: (path: string) => invoke<GitFileStatus[]>('git_status', { path }),
    gitInfo: (path: string) => invoke<GitInfo>('git_info', { path }),
    gitClone: (url: string, path: string) => invoke<void>('git_clone', { url, path }),
    gitStage: (repoPath: string, filePath: string) => invoke<void>('git_stage', { repoPath, filePath }),
    gitUnstage: (repoPath: string, filePath: string) => invoke<void>('git_unstage', { repoPath, filePath }),
    gitStageAll: (repoPath: string) => invoke<void>('git_stage_all', { repoPath }),
    gitUnstageAll: (repoPath: string) => invoke<void>('git_unstage_all', { repoPath }),
    gitCommit: (repoPath: string, message: string) => invoke<string>('git_commit', { repoPath, message }),
    gitDiscardChanges: (repoPath: string, filePath: string) => invoke<void>('git_discard_changes', { repoPath, filePath }),
    gitDiff: (repoPath: string, filePath: string, isStaged: boolean) => invoke<FileDiff>('git_diff', { repoPath, filePath, isStaged }),
    gitContributors: (repoPath: string) => invoke<GitContributor[]>('git_contributors', { repoPath }),
    gitLog: (repoPath: string, limit?: number) => invoke<GitCommit[]>('git_log', { repoPath, limit }),
    gitListBranches: (repoPath: string) => invoke<GitBranch[]>('git_list_branches', { repoPath }),
    gitCreateBranch: (repoPath: string, request: { name: string; from_branch?: string; from_commit?: string }) => invoke<string>('git_create_branch', { repoPath, request }),
    gitCheckoutBranch: (repoPath: string, branchName: string) => invoke<string>('git_checkout_branch', { repoPath, branchName }),
    gitDeleteBranch: (repoPath: string, branchName: string, force: boolean) => invoke<string>('git_delete_branch', { repoPath, branchName, force }),
    gitPush: (repoPath: string, remoteName?: string, branchName?: string, force?: boolean) => invoke<GitPushResult>('git_push', { repoPath, remoteName, branchName, force }),
    gitPushWithForce: (repoPath: string, remoteName?: string, branchName?: string) => invoke<GitPushResult>('git_push_with_force', { repoPath, remoteName, branchName }),
    gitListRemotes: (repoPath: string) => invoke<string[]>('git_list_remotes', { repoPath }),
    gitGetRemoteUrl: (repoPath: string, remoteName: string) => invoke<string>('git_get_remote_url', { repoPath, remoteName }),
    gitGithubAuthStatus: () => invoke<boolean>('git_github_auth_status'),
    gitGithubAuthLogin: () => invoke<void>('git_github_auth_login'),
    searchInFiles: (root_path: string, options: SearchOptions) =>
        invoke<SearchResult[]>('search_in_files', { rootPath: root_path, options }),
    replaceAll: (root_path: string, options: SearchOptions, replace_query: string, preserve_case_flag: boolean) =>
        invoke<ReplaceAllResult>('replace_all', { rootPath: root_path, options, replace_query, preserve_case_flag }),
    getAllFiles: (root_path: string) => invoke<any[]>('get_all_files', { rootPath: root_path }),
    // Ports commands
    getListeningPorts: () => invoke<PortInfo[]>('get_listening_ports'),
    // Problems commands
    getProblems: (projectPath: string) => invoke<ProblemsResult>('get_problems', { projectPath }),
    clearProblemsCache: () => invoke<void>('clear_problems_cache'),
    getProblemsCacheStats: () => invoke<ProblemsCacheStats>('get_problems_cache_stats'),
    // Shell commands
    openUrl: (url: string) => openUrl(url),
    // Window commands
    openNewWindow: (folderPath: string, profileName: string) => 
        invoke<void>('open_new_window', { folderPath, profileName }),
    // Timeline commands
    timelineSaveSnapshot: (workspace: string, filePath: string, content: string) =>
        invoke<TimelineEntry>('timeline_save_snapshot', { workspace, filePath, content }),
    timelineGetHistory: (workspace: string, filePath: string) =>
        invoke<FileTimeline>('timeline_get_history', { workspace, filePath }),
    timelineGetContent: (workspace: string, filePath: string, entryId: string) =>
        invoke<string>('timeline_get_content', { workspace, filePath, entryId }),
    timelineGetDiff: (workspace: string, filePath: string, oldId: string, newId: string) =>
        invoke<TimelineDiff>('timeline_get_diff', { workspace, filePath, oldId, newId }),
    timelineRestore: (workspace: string, filePath: string, entryId: string) =>
        invoke<string>('timeline_restore', { workspace, filePath, entryId }),
    timelineDeleteEntry: (workspace: string, filePath: string, entryId: string) =>
        invoke<void>('timeline_delete_entry', { workspace, filePath, entryId }),
    timelineClearHistory: (workspace: string, filePath: string) =>
        invoke<void>('timeline_clear_history', { workspace, filePath }),
    // NPM commands
    npmGetScripts: (workspace: string) => invoke<NpmScript[]>('npm_get_scripts', { workspace }),
    npmRunScript: (workspace: string, scriptName: string) => invoke<string>('npm_run_script', { workspace, scriptName }),
    npmStopScript: (scriptName: string) => invoke<string>('npm_stop_script', { scriptName }),
    npmGetRunningScripts: () => invoke<RunningScript[]>('npm_get_running_scripts'),
    npmRunScriptInTerminal: (workspace: string, scriptName: string) => invoke<string>('npm_run_script_in_terminal', { workspace, scriptName }),
    // File watcher commands
    startFileWatcher: (path: string) => invoke<void>('start_file_watcher', { path }),
    stopFileWatcher: () => invoke<void>('stop_file_watcher'),
    addWatchPath: (path: string) => invoke<void>('add_watch_path', { path }),
    // Audio cache commands
    getCachedAudio: (path: string) => invoke<number[] | null>('get_cached_audio', { path }),
    cacheAudio: (path: string, data: number[]) => invoke<void>('cache_audio', { path, data }),
    clearAudioCache: () => invoke<void>('clear_audio_cache'),
    getAudioCacheStats: () => invoke<[number, number, number]>('get_audio_cache_stats'),
    // Audio player commands
    audioLoadFile: (path: string) => invoke<void>('audio_load_file', { path }),
    audioGetState: () => invoke<any>('audio_get_state'),
    audioPlay: () => invoke<void>('audio_play'),
    audioPause: () => invoke<void>('audio_pause'),
    audioStop: () => invoke<void>('audio_stop'),
    audioSeek: (position: number) => invoke<void>('audio_seek', { position }),
    audioSetVolume: (volume: number) => invoke<void>('audio_set_volume', { volume }),
    // Ollama commands
    ollamaChat: (model: string, messages: any[], options?: any) => 
        invoke<any>('ollama_chat', { model, messages, options }),
    ollamaChatStream: (model: string, messages: any[], options?: any) => 
        invoke<string>('ollama_chat_stream', { model, messages, options }),
    ollamaChatComplete: (model: string, messages: any[], options?: any) => 
        invoke<string>('ollama_chat_complete', { model, messages, options }),
    ollamaListModels: () => invoke<any[]>('ollama_list_models'),
    ollamaPullModel: (model: string) => invoke<void>('ollama_pull_model', { model }),
    ollamaGenerate: (prompt: string, model: string) => 
        invoke<string>('ollama_generate', { prompt, model }),
    ollamaListLocalModels: () => invoke<any[]>('ollama_list_local_models'),
    // AgentRouter commands
    agentrouterConfigure: (apiKey: string, baseUrl?: string) => 
        invoke<void>('agentrouter_configure', { apiKey, baseUrl }),
    agentrouterChat: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number, topP?: number) => 
        invoke<AgentRouterChatResponse>('agentrouter_chat', { model, messages, maxTokens, temperature, topP }),
    agentrouterChatStream: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number, topP?: number, tools?: AgentRouterTool[], toolChoice?: AgentRouterToolChoice) => 
        invoke<string>('agentrouter_chat_stream', { model, messages, maxTokens, temperature, topP, tools, toolChoice }),
    agentrouterChatComplete: (model: string, messages: any[], maxTokens?: number) => 
        invoke<string>('agentrouter_chat_complete', { model, messages, maxTokens }),
    agentrouterCreateFile: (filePath: string, content?: string) => 
        invoke<string>('agentrouter_create_file', { filePath, content }),
    agentrouterListModels: () => invoke<AgentRouterModelsResponse>('agentrouter_list_models'),
    // OpenAI commands
    openaiChat: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('openai_chat', { model, messages, maxTokens, temperature }),
    openaiChatStream: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('openai_chat_stream', { model, messages, maxTokens, temperature }),
    openaiChatStreamWithTools: (model: string, messages: AgentRouterMessage[], tools?: any[], toolChoice?: any, maxTokens?: number, temperature?: number) => 
        invoke<string>('openai_chat_stream_with_tools', { model, messages, tools, toolChoice, maxTokens, temperature }),
    openaiChatComplete: (model: string, messages: any[], maxTokens?: number) => 
        invoke<string>('openai_chat_complete', { model, messages, maxTokens }),
    // Anthropic commands
    anthropicChat: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('anthropic_chat', { model, messages, maxTokens, temperature }),
    anthropicChatStream: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('anthropic_chat_stream', { model, messages, maxTokens, temperature }),
    anthropicChatComplete: (model: string, messages: any[], maxTokens?: number) => 
        invoke<string>('anthropic_chat_complete', { model, messages, maxTokens }),
    // Google commands
    googleChat: (model: string, messages: GoogleMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('google_chat', { model, messages, maxTokens, temperature }),
    googleChatStream: (model: string, messages: GoogleMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('google_chat_stream', { model, messages, maxTokens, temperature }),
    googleChatComplete: (model: string, messages: GoogleMessage[], maxTokens?: number) => 
        invoke<string>('google_chat_complete', { model, messages, maxTokens }),
    // xAI commands
    xaiChat: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('xai_chat', { model, messages, maxTokens, temperature }),
    xaiChatStream: (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) => 
        invoke<string>('xai_chat_stream', { model, messages, maxTokens, temperature }),
    xaiChatComplete: (model: string, messages: any[], maxTokens?: number) => 
        invoke<string>('xai_chat_complete', { model, messages, maxTokens }),
    // API key management
    setApiKey: (provider: string, key: string) => 
        invoke<void>('set_api_key', { provider, key }),
    getApiKeys: () => invoke<Record<string, boolean>>('get_api_keys'),
    // Terminal commands
    createTerminal: (terminalType: string, cwd?: string, size?: { rows: number; cols: number }) =>
        invoke<{ terminal_id: string; pid: number; process_name: string }>('create_terminal', { terminalType, cwd, size }),
    writeTerminal: (terminalId: string, data: string) =>
        invoke<void>('write_terminal', { terminalId, data }),
    closeTerminal: (terminalId: string) =>
        invoke<void>('close_terminal', { terminalId }),
};
