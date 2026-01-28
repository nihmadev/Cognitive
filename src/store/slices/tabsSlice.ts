import { StateCreator } from 'zustand';

export interface DiffTab {
    id: string;
    filePath: string;
    fileName: string;
    isStaged: boolean;
}

export interface TimelineDiffTab {
    id: string;
    filePath: string;
    fileName: string;
    entryId: string;
    oldContent: string;
    newContent: string;
    date: string;
}

export interface CommitDiffTab {
    id: string;
    filePath: string;
    fileName: string;
    commitHash: string;
    commitMessage: string;
    oldContent: string;
    newContent: string;
}

export interface SearchTab {
    id: string;
    title: string;
}

export interface CommitDetailTab {
    id: string;
    commitHash: string;
    shortHash: string;
    message: string;
    authorName: string;
    authorEmail: string;
    authorAvatar: string | null;
    date: string;
    timestamp: number;
    branches: string[];
    isHead: boolean;
    filesChanged: number;
    insertions: number;
    deletions: number;
}

export interface TabsSlice {
    openDiffTabs: DiffTab[];
    activeDiffTab: string | null;
    openDiffTab: (filePath: string, isStaged: boolean) => void;
    closeDiffTab: (id: string) => void;
    setActiveDiffTab: (id: string | null) => void;
    
    openTimelineDiffTabs: TimelineDiffTab[];
    activeTimelineDiffTab: string | null;
    openTimelineDiffTab: (filePath: string, entryId: string, oldContent: string, newContent: string, date: string) => void;
    closeTimelineDiffTab: (id: string) => void;
    setActiveTimelineDiffTab: (id: string | null) => void;

    openCommitDiffTabs: CommitDiffTab[];
    activeCommitDiffTab: string | null;
    openCommitDiffTab: (filePath: string, commitHash: string, commitMessage: string, oldContent: string, newContent: string) => void;
    closeCommitDiffTab: (id: string) => void;
    setActiveCommitDiffTab: (id: string | null) => void;

    openSearchTabs: SearchTab[];
    activeSearchTab: string | null;
    openSearchTab: () => void;
    closeSearchTab: (id: string) => void;
    setActiveSearchTab: (id: string | null) => void;

    openCommitDetailTabs: CommitDetailTab[];
    activeCommitDetailTab: string | null;
    openCommitDetailTab: (commit: any) => void;
    closeCommitDetailTab: (id: string) => void;
    setActiveCommitDetailTab: (id: string | null) => void;
}

export const createTabsSlice: StateCreator<
    TabsSlice & { openFiles: string[]; activeFile: string | null; activeSettingsTab: string | null; activeProfilesTab: string | null; setActiveFile: (path: string | null) => void },
    [],
    [],
    TabsSlice
> = (set, get) => ({
    openDiffTabs: [],
    activeDiffTab: null,
    openTimelineDiffTabs: [],
    activeTimelineDiffTab: null,
    openCommitDiffTabs: [],
    activeCommitDiffTab: null,
    openSearchTabs: [],
    activeSearchTab: null,
    openCommitDetailTabs: [],
    activeCommitDetailTab: null,

    openDiffTab: (filePath: string, isStaged: boolean) => {
        const { openDiffTabs, setActiveFile } = get();
        const id = `diff:${filePath}:${isStaged ? 'staged' : 'unstaged'}`;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        
        const existing = openDiffTabs.find(t => t.id === id);
        if (existing) {
            setActiveFile(null);
            set({ activeDiffTab: id });
            return;
        }
        
        setActiveFile(null);
        set({
            openDiffTabs: [...openDiffTabs, { id, filePath, fileName, isStaged }],
            activeDiffTab: id
        });
    },

    closeDiffTab: (id: string) => {
        const { openDiffTabs, activeDiffTab, openFiles, setActiveFile } = get();
        const newDiffTabs = openDiffTabs.filter(t => t.id !== id);
        
        let newActiveDiffTab = activeDiffTab;
        let newActiveFile = null;
        
        if (activeDiffTab === id) {
            if (newDiffTabs.length > 0) {
                newActiveDiffTab = newDiffTabs[newDiffTabs.length - 1].id;
            } else {
                newActiveDiffTab = null;
                newActiveFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
            }
        }
        
        set({
            openDiffTabs: newDiffTabs,
            activeDiffTab: newActiveDiffTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveDiffTab) {
            setActiveFile(null);
        }
    },

    setActiveDiffTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeDiffTab: id });
        } else {
            set({ activeDiffTab: null });
        }
    },

    openTimelineDiffTab: (filePath: string, entryId: string, oldContent: string, newContent: string, date: string) => {
        const { openTimelineDiffTabs, setActiveFile } = get();
        const id = `timeline:${filePath}:${entryId}`;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        
        const existing = openTimelineDiffTabs.find(t => t.id === id);
        if (existing) {
            setActiveFile(null);
            set({ activeTimelineDiffTab: id });
            return;
        }
        
        setActiveFile(null);
        set({
            openTimelineDiffTabs: [...openTimelineDiffTabs, { id, filePath, fileName, entryId, oldContent, newContent, date }],
            activeTimelineDiffTab: id
        });
    },

    closeTimelineDiffTab: (id: string) => {
        const { openTimelineDiffTabs, activeTimelineDiffTab, openFiles, setActiveFile } = get();
        const newTabs = openTimelineDiffTabs.filter(t => t.id !== id);
        
        let newActiveTab = activeTimelineDiffTab;
        let newActiveFile = null;
        
        if (activeTimelineDiffTab === id) {
            if (newTabs.length > 0) {
                newActiveTab = newTabs[newTabs.length - 1].id;
            } else {
                newActiveTab = null;
                newActiveFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
            }
        }
        
        set({
            openTimelineDiffTabs: newTabs,
            activeTimelineDiffTab: newActiveTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveTab) {
            setActiveFile(null);
        }
    },

    setActiveTimelineDiffTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeTimelineDiffTab: id });
        } else {
            set({ activeTimelineDiffTab: null });
        }
    },

    openCommitDiffTab: (filePath: string, commitHash: string, commitMessage: string, oldContent: string, newContent: string) => {
        const { openCommitDiffTabs, setActiveFile } = get();
        const id = `commit:${filePath}:${commitHash}`;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        
        const existing = openCommitDiffTabs.find(t => t.id === id);
        if (existing) {
            setActiveFile(null);
            set({ activeCommitDiffTab: id });
            return;
        }
        
        setActiveFile(null);
        set({
            openCommitDiffTabs: [...openCommitDiffTabs, { id, filePath, fileName, commitHash, commitMessage, oldContent, newContent }],
            activeCommitDiffTab: id
        });
    },

    closeCommitDiffTab: (id: string) => {
        const { openCommitDiffTabs, activeCommitDiffTab, openFiles, setActiveFile } = get();
        const newTabs = openCommitDiffTabs.filter(t => t.id !== id);
        
        let newActiveTab = activeCommitDiffTab;
        let newActiveFile = null;
        
        if (activeCommitDiffTab === id) {
            if (newTabs.length > 0) {
                newActiveTab = newTabs[newTabs.length - 1].id;
            } else {
                newActiveTab = null;
                newActiveFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
            }
        }
        
        set({
            openCommitDiffTabs: newTabs,
            activeCommitDiffTab: newActiveTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveTab) {
            setActiveFile(null);
        }
    },

    setActiveCommitDiffTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeCommitDiffTab: id });
        } else {
            set({ activeCommitDiffTab: null });
        }
    },

    openSearchTab: () => {
        const { openSearchTabs, setActiveFile } = get();
        const id = `search:${Date.now()}`;
        
        const existing = openSearchTabs.find(t => t.id.startsWith('search:'));
        if (existing) {
            setActiveFile(null);
            set({ activeSearchTab: existing.id });
            return;
        }
        
        setActiveFile(null);
        set({
            openSearchTabs: [...openSearchTabs, { id, title: 'Search' }],
            activeSearchTab: id
        });
    },

    closeSearchTab: (id: string) => {
        const { openSearchTabs, activeSearchTab, openFiles, setActiveFile } = get();
        const newTabs = openSearchTabs.filter(t => t.id !== id);
        
        let newActiveTab = activeSearchTab;
        let newActiveFile = null;
        
        if (activeSearchTab === id) {
            if (newTabs.length > 0) {
                newActiveTab = newTabs[newTabs.length - 1].id;
            } else {
                newActiveTab = null;
                newActiveFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
            }
        }
        
        set({
            openSearchTabs: newTabs,
            activeSearchTab: newActiveTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveTab) {
            setActiveFile(null);
        }
    },

    setActiveSearchTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeSearchTab: id });
        } else {
            set({ activeSearchTab: null });
        }
    },

    openCommitDetailTab: (commit: any) => {
        const { openCommitDetailTabs, setActiveFile } = get();
        const id = `commit-detail:${commit.hash}`;
        
        const existing = openCommitDetailTabs.find(t => t.id === id);
        if (existing) {
            setActiveFile(null);
            set({ activeCommitDetailTab: id });
            return;
        }
        
        const commitDetailTab: CommitDetailTab = {
            id,
            commitHash: commit.hash,
            shortHash: commit.short_hash,
            message: commit.message,
            authorName: commit.author_name,
            authorEmail: commit.author_email,
            authorAvatar: commit.author_avatar,
            date: commit.date,
            timestamp: commit.timestamp,
            branches: commit.branches || [],
            isHead: commit.is_head,
            filesChanged: commit.files_changed,
            insertions: commit.insertions,
            deletions: commit.deletions
        };
        
        setActiveFile(null);
        set({
            openCommitDetailTabs: [...openCommitDetailTabs, commitDetailTab],
            activeCommitDetailTab: id
        });
    },

    closeCommitDetailTab: (id: string) => {
        const { openCommitDetailTabs, activeCommitDetailTab, openFiles, setActiveFile } = get();
        const newTabs = openCommitDetailTabs.filter(t => t.id !== id);
        
        let newActiveTab = activeCommitDetailTab;
        let newActiveFile = null;
        
        if (activeCommitDetailTab === id) {
            if (newTabs.length > 0) {
                newActiveTab = newTabs[newTabs.length - 1].id;
            } else {
                newActiveTab = null;
                newActiveFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
            }
        }
        
        set({
            openCommitDetailTabs: newTabs,
            activeCommitDetailTab: newActiveTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveTab) {
            setActiveFile(null);
        }
    },

    setActiveCommitDetailTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeCommitDetailTab: id });
        } else {
            set({ activeCommitDetailTab: null });
        }
    },
});
