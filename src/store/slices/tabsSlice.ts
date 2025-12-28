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

export interface TabsSlice {
    openDiffTabs: DiffTab[];
    activeDiffTab: string | null;
    openDiffTab: (filePath: string, isStaged: boolean) => void;
    closeDiffTab: (id: string) => void;
    setActiveDiffTab: (id: string | null) => void;
    // Timeline diff tabs
    openTimelineDiffTabs: TimelineDiffTab[];
    activeTimelineDiffTab: string | null;
    openTimelineDiffTab: (filePath: string, entryId: string, oldContent: string, newContent: string, date: string) => void;
    closeTimelineDiffTab: (id: string) => void;
    setActiveTimelineDiffTab: (id: string | null) => void;
}

export const createTabsSlice: StateCreator<
    TabsSlice & { openFiles: string[]; activeFile: string | null; activeSettingsTab: string | null; activeProfilesTab: string | null },
    [],
    [],
    TabsSlice
> = (set, get) => ({
    openDiffTabs: [],
    activeDiffTab: null,
    openTimelineDiffTabs: [],
    activeTimelineDiffTab: null,

    openDiffTab: (filePath: string, isStaged: boolean) => {
        const { openDiffTabs } = get();
        const id = `diff:${filePath}:${isStaged ? 'staged' : 'unstaged'}`;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        
        const existing = openDiffTabs.find(t => t.id === id);
        if (existing) {
            set({ activeDiffTab: id, activeFile: null, activeSettingsTab: null, activeProfilesTab: null, activeTimelineDiffTab: null });
            return;
        }
        
        set({
            openDiffTabs: [...openDiffTabs, { id, filePath, fileName, isStaged }],
            activeDiffTab: id,
            activeFile: null,
            activeSettingsTab: null,
            activeProfilesTab: null,
            activeTimelineDiffTab: null
        });
    },

    closeDiffTab: (id: string) => {
        const { openDiffTabs, activeDiffTab, openFiles } = get();
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
            activeDiffTab: newActiveDiffTab,
            activeFile: newActiveFile
        });
    },

    setActiveDiffTab: (id: string | null) => {
        if (id) {
            set({ activeDiffTab: id, activeFile: null, activeSettingsTab: null, activeProfilesTab: null, activeTimelineDiffTab: null });
        } else {
            set({ activeDiffTab: null });
        }
    },

    openTimelineDiffTab: (filePath: string, entryId: string, oldContent: string, newContent: string, date: string) => {
        const { openTimelineDiffTabs } = get();
        const id = `timeline:${filePath}:${entryId}`;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        
        const existing = openTimelineDiffTabs.find(t => t.id === id);
        if (existing) {
            set({ activeTimelineDiffTab: id, activeFile: null, activeSettingsTab: null, activeProfilesTab: null, activeDiffTab: null });
            return;
        }
        
        set({
            openTimelineDiffTabs: [...openTimelineDiffTabs, { id, filePath, fileName, entryId, oldContent, newContent, date }],
            activeTimelineDiffTab: id,
            activeFile: null,
            activeSettingsTab: null,
            activeProfilesTab: null,
            activeDiffTab: null
        });
    },

    closeTimelineDiffTab: (id: string) => {
        const { openTimelineDiffTabs, activeTimelineDiffTab, openFiles } = get();
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
            activeTimelineDiffTab: newActiveTab,
            activeFile: newActiveFile
        });
    },

    setActiveTimelineDiffTab: (id: string | null) => {
        if (id) {
            set({ activeTimelineDiffTab: id, activeFile: null, activeSettingsTab: null, activeProfilesTab: null, activeDiffTab: null });
        } else {
            set({ activeTimelineDiffTab: null });
        }
    },
});
