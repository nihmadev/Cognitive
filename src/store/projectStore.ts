import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    createFileSlice,
    createTabsSlice,
    createSettingsSlice,
    createProfilesSlice,
    type FileSlice,
    type TabsSlice,
    type SettingsSlice,
    type ProfilesSlice,
} from './slices';


export type { DiffTab, TimelineDiffTab, CommitDiffTab, SearchTab } from './slices/tabsSlice';
export type { SettingsTab } from './slices/settingsSlice';
export type { ProfilesTab } from './slices/profilesSlice';
export type { FileEntry } from './slices/fileSlice';

type ProjectState = FileSlice & TabsSlice & SettingsSlice & ProfilesSlice;

export const useProjectStore = create<ProjectState>()(
    persist(
        (...a) => ({
            ...createFileSlice(...a),
            ...createTabsSlice(...a),
            ...createSettingsSlice(...a),
            ...createProfilesSlice(...a),
        }),
        {
            name: 'project-storage',
            partialize: (state) => ({
                // Сохраняем открытые файлы и активный файл
                openFiles: state.openFiles,
                activeFile: state.activeFile,
                
                // Сохраняем табы
                openDiffTabs: state.openDiffTabs,
                activeDiffTab: state.activeDiffTab,
                openTimelineDiffTabs: state.openTimelineDiffTabs,
                activeTimelineDiffTab: state.activeTimelineDiffTab,
                openCommitDiffTabs: state.openCommitDiffTabs,
                activeCommitDiffTab: state.activeCommitDiffTab,
                openSearchTabs: state.openSearchTabs,
                activeSearchTab: state.activeSearchTab,
                
                // Сохраняем настройки
                activeSettingsTab: state.activeSettingsTab,
                activeProfilesTab: state.activeProfilesTab,
                
                // Сохраняем состояние блокировки табов
                tabsLocked: state.tabsLocked,
            }),
        }
    )
);

// Глобальный доступ для других store
if (typeof window !== 'undefined') {
    (window as any).__projectStore = useProjectStore;
}
