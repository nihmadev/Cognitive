import { StateCreator } from 'zustand';
import { DiffTab } from './tabsSlice';

export interface SettingsTab {
    id: string;
    section: string | null;
    title: string;
    previousContext?: {
        type: 'file' | 'diff' | null;
        id: string | null;
    };
}

export interface SettingsSlice {
    openSettingsTabs: SettingsTab[];
    activeSettingsTab: string | null;
    openSettingsTab: (section?: string | null) => void;
    closeSettingsTab: (id: string) => void;
    setActiveSettingsTab: (id: string | null) => void;
    updateSettingsTabTitle: (id: string, title: string, section: string) => void;
    goBackFromSettings: () => void;
}

export const createSettingsSlice: StateCreator<
    SettingsSlice & { 
        openFiles: string[]; 
        activeFile: string | null; 
        openDiffTabs: DiffTab[];
        activeDiffTab: string | null;
        activeProfilesTab: string | null;
        activeTimelineDiffTab: string | null;
    },
    [],
    [],
    SettingsSlice
> = (set, get) => ({
    openSettingsTabs: [],
    activeSettingsTab: null,

    openSettingsTab: (section?: string | null) => {
        const { openSettingsTabs, activeFile, activeDiffTab } = get();
        const id = 'settings:main';
        const title = section === 'keybindings' ? 'Keyboard Shortcuts' : 'Settings';
        
        const previousContext = {
            type: activeDiffTab ? 'diff' as const : (activeFile ? 'file' as const : null),
            id: activeDiffTab || activeFile
        };
        
        const existing = openSettingsTabs.find(t => t.id === id);
        if (existing) {
            const updatedTabs = openSettingsTabs.map(t => 
                t.id === id ? { 
                    ...t, 
                    section: section ?? null,
                    previousContext: t.previousContext || previousContext
                } : t
            );
            set({ 
                openSettingsTabs: updatedTabs,
                activeSettingsTab: id, 
                activeFile: null, 
                activeDiffTab: null,
                activeProfilesTab: null,
                activeTimelineDiffTab: null
            });
            return;
        }
        
        set({
            openSettingsTabs: [...openSettingsTabs, { id, section: section ?? null, title, previousContext }],
            activeSettingsTab: id,
            activeFile: null,
            activeDiffTab: null,
            activeProfilesTab: null,
            activeTimelineDiffTab: null
        });
    },

    closeSettingsTab: (id: string) => {
        const { openSettingsTabs, activeSettingsTab, openFiles, openDiffTabs } = get();
        const newSettingsTabs = openSettingsTabs.filter(t => t.id !== id);
        
        let newActiveSettingsTab = activeSettingsTab;
        let newActiveFile = null;
        let newActiveDiffTab = null;
        
        if (activeSettingsTab === id) {
            if (newSettingsTabs.length > 0) {
                newActiveSettingsTab = newSettingsTabs[newSettingsTabs.length - 1].id;
            } else {
                newActiveSettingsTab = null;
                if (openDiffTabs.length > 0) {
                    newActiveDiffTab = openDiffTabs[openDiffTabs.length - 1].id;
                } else if (openFiles.length > 0) {
                    newActiveFile = openFiles[openFiles.length - 1];
                }
            }
        }
        
        set({
            openSettingsTabs: newSettingsTabs,
            activeSettingsTab: newActiveSettingsTab,
            activeFile: newActiveFile,
            activeDiffTab: newActiveDiffTab
        });
    },

    setActiveSettingsTab: (id: string | null) => {
        if (id) {
            set({ activeSettingsTab: id, activeFile: null, activeDiffTab: null, activeProfilesTab: null, activeTimelineDiffTab: null });
        } else {
            set({ activeSettingsTab: null });
        }
    },

    updateSettingsTabTitle: (id: string, title: string, section: string) => {
        const { openSettingsTabs } = get();
        const updatedTabs = openSettingsTabs.map(t => 
            t.id === id ? { ...t, title, section } : t
        );
        set({ openSettingsTabs: updatedTabs });
    },

    goBackFromSettings: () => {
        const { openSettingsTabs, activeSettingsTab, openFiles, openDiffTabs } = get();
        const currentTab = openSettingsTabs.find(t => t.id === activeSettingsTab);
        
        if (currentTab?.previousContext?.id) {
            if (currentTab.previousContext.type === 'diff') {
                const diffExists = openDiffTabs.some(t => t.id === currentTab.previousContext!.id);
                if (diffExists) {
                    set({ 
                        activeDiffTab: currentTab.previousContext.id, 
                        activeFile: null, 
                        activeSettingsTab: null 
                    });
                    return;
                }
            } else if (currentTab.previousContext.type === 'file') {
                const fileExists = openFiles.includes(currentTab.previousContext.id!);
                if (fileExists) {
                    set({ 
                        activeFile: currentTab.previousContext.id, 
                        activeDiffTab: null, 
                        activeSettingsTab: null 
                    });
                    return;
                }
            }
        }
        
        if (openDiffTabs.length > 0) {
            set({ 
                activeDiffTab: openDiffTabs[openDiffTabs.length - 1].id, 
                activeFile: null, 
                activeSettingsTab: null 
            });
        } else if (openFiles.length > 0) {
            set({ 
                activeFile: openFiles[openFiles.length - 1], 
                activeDiffTab: null, 
                activeSettingsTab: null 
            });
        }
    },
});
