import { create } from 'zustand';
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

// Re-export types for backward compatibility
export type { DiffTab, TimelineDiffTab } from './slices/tabsSlice';
export type { SettingsTab } from './slices/settingsSlice';
export type { ProfilesTab } from './slices/profilesSlice';
export type { FileEntry } from './slices/fileSlice';

type ProjectState = FileSlice & TabsSlice & SettingsSlice & ProfilesSlice;

export const useProjectStore = create<ProjectState>()((...a) => ({
    ...createFileSlice(...a),
    ...createTabsSlice(...a),
    ...createSettingsSlice(...a),
    ...createProfilesSlice(...a),
}));
