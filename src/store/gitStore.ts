import { create } from 'zustand';
import { tauriApi, GitFileStatus, GitInfo, GitContributor, GitCommit, GitPushResult } from '../lib/tauri-api';

interface GitStore {
    // State
    files: GitFileStatus[];
    info: GitInfo | null;
    contributors: GitContributor[];
    commits: GitCommit[];
    isLoading: boolean;
    error: string | null;
    commitMessage: string;
    searchQuery: string;
    graphOpen: boolean;
    isPushing: boolean;
    pushResult: GitPushResult | null;
    isAuthModalOpen: boolean;
    
    // Actions
    setCommitMessage: (message: string) => void;
    setSearchQuery: (query: string) => void;
    setGraphOpen: (open: boolean) => void;
    refresh: (workspacePath: string) => Promise<void>;
    refreshContributors: (workspacePath: string) => Promise<void>;
    refreshCommits: (workspacePath: string) => Promise<void>;
    stageFile: (workspacePath: string, filePath: string) => Promise<void>;
    unstageFile: (workspacePath: string, filePath: string) => Promise<void>;
    stageAll: (workspacePath: string) => Promise<void>;
    unstageAll: (workspacePath: string) => Promise<void>;
    commit: (workspacePath: string) => Promise<void>;
    discardChanges: (workspacePath: string, filePath: string) => Promise<void>;
    push: (workspacePath: string, remoteName?: string, branchName?: string, force?: boolean) => Promise<GitPushResult>;
    clearPushResult: () => void;
    setAuthModalOpen: (open: boolean) => void;
}

export const useGitStore = create<GitStore>((set, get) => ({
    files: [],
    info: null,
    contributors: [],
    commits: [],
    isLoading: false,
    error: null,
    commitMessage: '',
    searchQuery: '',
    graphOpen: true,
    isPushing: false,
    pushResult: null,
    isAuthModalOpen: false,
    
    setCommitMessage: (message) => set({ commitMessage: message }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setGraphOpen: (open) => set({ graphOpen: open }),
    setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
    
    refresh: async (workspacePath) => {
        if (!workspacePath) return;
        set({ isLoading: true, error: null });
        try {
            const [files, info] = await Promise.all([
                tauriApi.gitStatus(workspacePath),
                tauriApi.gitInfo(workspacePath),
            ]);
            set({ files, info, isLoading: false });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false, files: [], info: null });
        }
    },
    
    refreshContributors: async (workspacePath) => {
        if (!workspacePath) return;
        try {
            const contributors = await tauriApi.gitContributors(workspacePath);
            set({ contributors });
        } catch (e: any) {
            console.error('Failed to load contributors:', e);
            set({ contributors: [] });
        }
    },
    
    refreshCommits: async (workspacePath) => {
        if (!workspacePath) return;
        try {
            const commits = await tauriApi.gitLog(workspacePath, 50);
            set({ commits });
        } catch (e: any) {
            console.error('Failed to load commits:', e);
            set({ commits: [] });
        }
    },
    
    stageFile: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitStage(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    unstageFile: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitUnstage(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    stageAll: async (workspacePath) => {
        try {
            await tauriApi.gitStageAll(workspacePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    unstageAll: async (workspacePath) => {
        try {
            await tauriApi.gitUnstageAll(workspacePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    commit: async (workspacePath) => {
        const { commitMessage } = get();
        if (!commitMessage.trim()) {
            set({ error: 'Commit message is required' });
            return;
        }
        try {
            // Выполняем коммит
            await tauriApi.gitCommit(workspacePath, commitMessage);
            set({ commitMessage: '' });
            await get().refresh(workspacePath);
            
            // Автоматически выполняем push если есть удаленный репозиторий
            const { info } = get();
            if (info?.has_remote && info.branch) {
                try {
                    await get().push(workspacePath);
                } catch (pushError) {
                    // Если push не удался, показываем ошибку но не прерываем процесс
                    console.warn('Push failed after commit:', pushError);
                }
            }
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    discardChanges: async (workspacePath, filePath) => {
        try {
            await tauriApi.gitDiscardChanges(workspacePath, filePath);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    push: async (workspacePath, remoteName, branchName, force = false) => {
        set({ isPushing: true, error: null, pushResult: null });
        try {
            const result = await tauriApi.gitPush(workspacePath, remoteName, branchName, force);
            set({ pushResult: result, isPushing: false });

            const msg = (result.message || '').toLowerCase();
            if (!result.success && (msg.includes('authentication') || msg.includes('auth') || msg.includes('credentials'))) {
                set({ isAuthModalOpen: true });
            }
            
            // После успешного push обновляем информацию
            if (result.success) {
                await get().refresh(workspacePath);
                await get().refreshCommits(workspacePath);
            }
            
            return result;
        } catch (e: any) {
            const errorResult: GitPushResult = {
                success: false,
                message: e.toString(),
                pushed_refs: []
            };
            const errMsg = (e?.toString?.() ?? '').toLowerCase();
            set({
                error: e.toString(),
                isPushing: false,
                pushResult: errorResult,
                isAuthModalOpen: errMsg.includes('authentication') || errMsg.includes('auth') || errMsg.includes('credentials')
            });
            return errorResult;
        }
    },
    
    clearPushResult: () => set({ pushResult: null }),
}));
