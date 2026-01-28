import { StateCreator } from 'zustand';
import { DiffTab } from './tabsSlice';
import { SettingsTab } from './settingsSlice';

export interface ProfilesTab {
    id: string;
    title: string;
}

export interface ProfilesSlice {
    openProfilesTabs: ProfilesTab[];
    activeProfilesTab: string | null;
    openProfilesTab: () => void;
    closeProfilesTab: (id: string) => void;
    setActiveProfilesTab: (id: string | null) => void;
}

export const createProfilesSlice: StateCreator<
    ProfilesSlice & { 
        openFiles: string[]; 
        activeFile: string | null;
        openDiffTabs: DiffTab[];
        activeDiffTab: string | null;
        openSettingsTabs: SettingsTab[];
        activeSettingsTab: string | null;
        activeTimelineDiffTab: string | null;
        setActiveFile: (path: string | null) => void;
    },
    [],
    [],
    ProfilesSlice
> = (set, get) => ({
    openProfilesTabs: [],
    activeProfilesTab: null,

    openProfilesTab: () => {
        const { openProfilesTabs, setActiveFile } = get();
        const id = 'profiles:main';
        const title = 'Profiles';
        
        const existing = openProfilesTabs.find(t => t.id === id);
        if (existing) {
            setActiveFile(null);
            set({ 
                activeProfilesTab: id
            });
            return;
        }
        
        setActiveFile(null);
        set({
            openProfilesTabs: [...openProfilesTabs, { id, title }],
            activeProfilesTab: id
        });
    },

    closeProfilesTab: (id: string) => {
        const { openProfilesTabs, activeProfilesTab, openFiles, openDiffTabs, openSettingsTabs, setActiveFile } = get();
        const newProfilesTabs = openProfilesTabs.filter(t => t.id !== id);
        
        let newActiveProfilesTab = activeProfilesTab;
        let newActiveFile = null;
        let newActiveDiffTab = null;
        let newActiveSettingsTab = null;
        
        if (activeProfilesTab === id) {
            if (newProfilesTabs.length > 0) {
                newActiveProfilesTab = newProfilesTabs[newProfilesTabs.length - 1].id;
            } else {
                newActiveProfilesTab = null;
                if (openSettingsTabs.length > 0) {
                    newActiveSettingsTab = openSettingsTabs[openSettingsTabs.length - 1].id;
                } else if (openDiffTabs.length > 0) {
                    newActiveDiffTab = openDiffTabs[openDiffTabs.length - 1].id;
                } else if (openFiles.length > 0) {
                    newActiveFile = openFiles[openFiles.length - 1];
                }
            }
        }
        
        set({
            openProfilesTabs: newProfilesTabs,
            activeProfilesTab: newActiveProfilesTab,
            activeDiffTab: newActiveDiffTab,
            activeSettingsTab: newActiveSettingsTab
        });

        if (newActiveFile) {
            setActiveFile(newActiveFile);
        } else if (!newActiveProfilesTab && !newActiveDiffTab && !newActiveSettingsTab) {
            setActiveFile(null);
        }
    },

    setActiveProfilesTab: (id: string | null) => {
        const { setActiveFile } = get();
        if (id) {
            setActiveFile(null);
            set({ activeProfilesTab: id });
        } else {
            set({ activeProfilesTab: null });
        }
    },
});
