import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tauriApi, GitFileStatus, GitInfo, GitContributor, GitCommit, GitPushResult } from '../lib/tauri-api';

interface GitStore {

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
    repositoriesVisible: boolean;
    changesVisible: boolean;
    graphVisible: boolean;
    repositoriesOpen: boolean;
    changesOpen: boolean;

    setRepositoriesVisible: (visible: boolean) => void;
    setChangesVisible: (visible: boolean) => void;
    setGraphVisible: (visible: boolean) => void;
    toggleRepositories: () => void;
    toggleChanges: () => void;
    toggleGraph: () => void;
    setRepositoriesOpen: (open: boolean) => void;
    setChangesOpen: (open: boolean) => void;
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
    commitAmend: (workspacePath: string) => Promise<void>;
    discardChanges: (workspacePath: string, filePath: string) => Promise<void>;
    push: (workspacePath: string, remoteName?: string, branchName?: string, force?: boolean) => Promise<GitPushResult>;
    pull: (workspacePath: string) => Promise<void>;
    fetch: (workspacePath: string) => Promise<void>;
    sync: (workspacePath: string) => Promise<void>;
    commitAndPush: (workspacePath: string) => Promise<void>;
    commitAndSync: (workspacePath: string) => Promise<void>;
    clearPushResult: () => void;
    setAuthModalOpen: (open: boolean) => void;
    
    // Branch operations
    listBranches: (workspacePath: string) => Promise<any[]>;
    createBranch: (workspacePath: string, branchName: string) => Promise<void>;
    checkoutBranch: (workspacePath: string, branchName: string) => Promise<void>;
    deleteBranch: (workspacePath: string, branchName: string, force?: boolean) => Promise<void>;
    mergeBranch: (workspacePath: string, branchName: string) => Promise<void>;
    
    // Stash operations
    stashSave: (workspacePath: string, message?: string) => Promise<void>;
    stashPop: (workspacePath: string, index?: number) => Promise<void>;
    stashList: (workspacePath: string) => Promise<Array<[number, string]>>;
    stashDrop: (workspacePath: string, index: number) => Promise<void>;
    
    // Remote operations
    listRemotes: (workspacePath: string) => Promise<string[]>;
    addRemote: (workspacePath: string, name: string, url: string) => Promise<void>;
    removeRemote: (workspacePath: string, name: string) => Promise<void>;
    
    // Tag operations
    listTags: (workspacePath: string) => Promise<string[]>;
    createTag: (workspacePath: string, tagName: string, message?: string) => Promise<void>;
    deleteTag: (workspacePath: string, tagName: string) => Promise<void>;
}

export const useGitStore = create<GitStore>()(
    persist(
        (set, get) => ({
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
            repositoriesVisible: true,
            changesVisible: true,
            graphVisible: true,
            repositoriesOpen: true,
            changesOpen: true,

    setCommitMessage: (message) => set({ commitMessage: message }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setGraphOpen: (open) => set({ graphOpen: open }),
    setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

    setRepositoriesVisible: (visible) => set({ repositoriesVisible: visible }),
    setChangesVisible: (visible) => set({ changesVisible: visible }),
    setGraphVisible: (visible) => set({ graphVisible: visible }),
    toggleRepositories: () => set(state => ({ repositoriesVisible: !state.repositoriesVisible })),
    toggleChanges: () => set(state => ({ changesVisible: !state.changesVisible })),
    toggleGraph: () => set(state => ({ graphVisible: !state.graphVisible })),
    setRepositoriesOpen: (open) => set({ repositoriesOpen: open }),
    setChangesOpen: (open) => set({ changesOpen: open }),

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
            set({ contributors: [] });
        }
    },

    refreshCommits: async (workspacePath) => {
        if (!workspacePath) return;
        try {
            const commits = await tauriApi.gitLog(workspacePath, 50);
            set({ commits });
        } catch (e: any) {
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
            // Use git's native stage all command which respects .gitignore automatically
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

            await tauriApi.gitCommit(workspacePath, commitMessage);
            set({ commitMessage: '' });
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },

    commitAmend: async (workspacePath) => {
        const { commitMessage } = get();
        if (!commitMessage.trim()) {
            set({ error: 'Commit message is required' });
            return;
        }
        try {
            await tauriApi.gitCommitAmend(workspacePath, commitMessage);
            set({ commitMessage: '' });
            await get().refresh(workspacePath);
            await get().refreshCommits(workspacePath);
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

    pull: async (workspacePath) => {
        set({ isLoading: true, error: null });
        try {
            await tauriApi.gitPull(workspacePath);
            await get().refresh(workspacePath);
            await get().refreshCommits(workspacePath);
            set({ isLoading: false });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false });
        }
    },

    fetch: async (workspacePath) => {
        set({ isLoading: true, error: null });
        try {
            await tauriApi.gitFetch(workspacePath);
            await get().refresh(workspacePath);
            await get().refreshCommits(workspacePath);
            set({ isLoading: false });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false });
        }
    },

    sync: async (workspacePath) => {
        await get().pull(workspacePath);
        if (!get().error) {
            await get().push(workspacePath);
        }
    },

    commitAndPush: async (workspacePath) => {
        await get().commit(workspacePath);
        if (!get().error) {
            await get().push(workspacePath);
        }
    },

    commitAndSync: async (workspacePath) => {
        await get().commit(workspacePath);
        if (!get().error) {
            await get().sync(workspacePath);
        }
    },

    clearPushResult: () => set({ pushResult: null }),
    
    // Branch operations
    listBranches: async (workspacePath) => {
        try {
            const branches = await tauriApi.gitListBranches(workspacePath);
            return branches;
        } catch (e: any) {
            throw e;
        }
    },
    
    createBranch: async (workspacePath, branchName) => {
        try {
            await tauriApi.gitCreateBranch(workspacePath, { name: branchName });
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    checkoutBranch: async (workspacePath, branchName) => {
        try {
            await tauriApi.gitCheckoutBranch(workspacePath, branchName);
            await get().refresh(workspacePath);
            await get().refreshCommits(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    deleteBranch: async (workspacePath, branchName, force = false) => {
        try {
            await tauriApi.gitDeleteBranch(workspacePath, branchName, force);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    mergeBranch: async (workspacePath, branchName) => {
        try {
            await tauriApi.gitMergeBranch(workspacePath, branchName);
            await get().refresh(workspacePath);
            await get().refreshCommits(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    // Stash operations
    stashSave: async (workspacePath, message) => {
        try {
            await tauriApi.gitStashSave(workspacePath, message);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    stashPop: async (workspacePath, index) => {
        try {
            await tauriApi.gitStashPop(workspacePath, index);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    stashList: async (workspacePath) => {
        try {
            return await tauriApi.gitStashList(workspacePath);
        } catch (e: any) {
            return [];
        }
    },
    
    stashDrop: async (workspacePath, index) => {
        try {
            await tauriApi.gitStashDrop(workspacePath, index);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    // Remote operations
    listRemotes: async (workspacePath) => {
        try {
            return await tauriApi.gitListRemotes(workspacePath);
        } catch (e: any) {
            return [];
        }
    },
    
    addRemote: async (workspacePath, name, url) => {
        try {
            await tauriApi.gitAddRemote(workspacePath, name, url);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    removeRemote: async (workspacePath, name) => {
        try {
            await tauriApi.gitRemoveRemote(workspacePath, name);
            await get().refresh(workspacePath);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    // Tag operations
    listTags: async (workspacePath) => {
        try {
            return await tauriApi.gitListTags(workspacePath);
        } catch (e: any) {
            return [];
        }
    },
    
    createTag: async (workspacePath, tagName, message) => {
        try {
            await tauriApi.gitCreateTag(workspacePath, tagName, message);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    deleteTag: async (workspacePath, tagName) => {
        try {
            await tauriApi.gitDeleteTag(workspacePath, tagName);
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
        }),
        {
            name: 'git-storage',
            partialize: (state) => ({
                // Сохраняем состояние видимости секций Git панели
                repositoriesVisible: state.repositoriesVisible,
                changesVisible: state.changesVisible,
                graphVisible: state.graphVisible,
                graphOpen: state.graphOpen,
                // Сохраняем состояние открытия/закрытия секций
                repositoriesOpen: state.repositoriesOpen,
                changesOpen: state.changesOpen,
            }),
        }
    )
);
