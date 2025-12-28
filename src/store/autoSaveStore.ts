import { create } from 'zustand';
import { useProjectStore } from './projectStore';
import { useEditorStore } from './editorStore';

interface AutoSaveState {
    isEnabled: boolean;
    delay: number; // milliseconds
    saveOnFocusLoss: boolean;
    lastSaveTime: { [key: string]: number };
    pendingSaves: { [key: string]: ReturnType<typeof setTimeout> };
    isAutoSaving: boolean;
    autoSaveCount: number;
}

interface AutoSaveActions {
    setAutoSaveEnabled: (enabled: boolean) => void;
    setAutoSaveDelay: (delay: number) => void;
    setSaveOnFocusLoss: (enabled: boolean) => void;
    triggerAutoSave: (filePath?: string) => Promise<void>;
    scheduleAutoSave: (filePath: string, delay?: number) => void;
    cancelAutoSave: (filePath: string) => void;
    saveAllUnsaved: () => Promise<void>;
    getAutoSaveStatus: (filePath?: string) => { lastSaved: number | null; isPending: boolean };
}

type AutoSaveStore = AutoSaveState & AutoSaveActions;

export const useAutoSaveStore = create<AutoSaveStore>((set, get) => ({
    // Default state
    isEnabled: true,
    delay: 1000, // 1 second default
    saveOnFocusLoss: true,
    lastSaveTime: {},
    pendingSaves: {},
    isAutoSaving: false,
    autoSaveCount: 0,

    // Actions
    setAutoSaveEnabled: (enabled: boolean) => {
        set({ isEnabled: enabled });
        
        // Cancel all pending saves when disabled
        if (!enabled) {
            const { pendingSaves } = get();
            Object.values(pendingSaves).forEach(timer => clearTimeout(timer));
            set({ pendingSaves: {} });
        }
    },

    setAutoSaveDelay: (delay: number) => {
        set({ delay: Math.max(100, delay) }); // Minimum 100ms
    },

    setSaveOnFocusLoss: (enabled: boolean) => {
        set({ saveOnFocusLoss: enabled });
    },

    triggerAutoSave: async (filePath?: string) => {
        const { isEnabled, isAutoSaving } = get();
        if (!isEnabled || isAutoSaving) return;

        const projectStore = useProjectStore.getState();
        const editorStore = useEditorStore.getState();
        
        // Determine which file to save
        const fileToSave = filePath || projectStore.activeFile || editorStore.currentFilePath;
        
        if (!fileToSave) {
            console.log('No file to auto-save');
            return;
        }

        // Check if file has unsaved changes
        if (!projectStore.unsavedChanges[fileToSave]) {
            console.log('No unsaved changes for:', fileToSave);
            return;
        }

        set({ isAutoSaving: true });

        try {
            // Use existing save functionality
            await projectStore.saveFile(fileToSave);
            
            // Update last save time and count
            const now = Date.now();
            set(state => ({
                lastSaveTime: { ...state.lastSaveTime, [fileToSave]: now },
                autoSaveCount: state.autoSaveCount + 1,
                isAutoSaving: false
            }));

            console.log('Auto-saved:', fileToSave);
        } catch (error) {
            console.error('Auto-save failed for', fileToSave, ':', error);
            set({ isAutoSaving: false });
        }
    },

    scheduleAutoSave: (filePath: string, customDelay?: number) => {
        const { isEnabled, delay, pendingSaves } = get();
        if (!isEnabled) return;

        // Cancel existing pending save for this file
        if (pendingSaves[filePath]) {
            clearTimeout(pendingSaves[filePath]);
        }

        // Schedule new auto-save
        const saveDelay = customDelay || delay;
        const timer = setTimeout(() => {
            get().triggerAutoSave(filePath);
            // Remove from pending saves after execution
            set(state => {
                const newPendingSaves = { ...state.pendingSaves };
                delete newPendingSaves[filePath];
                return { pendingSaves: newPendingSaves };
            });
        }, saveDelay);

        set(state => ({
            pendingSaves: { ...state.pendingSaves, [filePath]: timer }
        }));
    },

    cancelAutoSave: (filePath: string) => {
        const { pendingSaves } = get();
        if (pendingSaves[filePath]) {
            clearTimeout(pendingSaves[filePath]);
            set(state => {
                const newPendingSaves = { ...state.pendingSaves };
                delete newPendingSaves[filePath];
                return { pendingSaves: newPendingSaves };
            });
        }
    },

    saveAllUnsaved: async () => {
        const { isEnabled } = get();
        if (!isEnabled) return;

        const projectStore = useProjectStore.getState();
        const unsavedFiles = Object.keys(projectStore.unsavedChanges).filter(
            file => projectStore.unsavedChanges[file]
        );

        if (unsavedFiles.length === 0) return;

        set({ isAutoSaving: true });

        try {
            // Save all files with unsaved changes
            await Promise.all(
                unsavedFiles.map(file => projectStore.saveFile(file))
            );

            // Update last save times for all saved files
            const now = Date.now();
            const newLastSaveTimes: { [key: string]: number } = {};
            unsavedFiles.forEach(file => {
                newLastSaveTimes[file] = now;
            });

            set({
                lastSaveTime: { ...get().lastSaveTime, ...newLastSaveTimes },
                autoSaveCount: get().autoSaveCount + unsavedFiles.length,
                isAutoSaving: false
            });

            console.log(`Auto-saved ${unsavedFiles.length} files`);
        } catch (error) {
            console.error('Bulk auto-save failed:', error);
            set({ isAutoSaving: false });
        }
    },

    getAutoSaveStatus: (filePath?: string) => {
        const { lastSaveTime, pendingSaves } = get();
        const projectStore = useProjectStore.getState();
        
        const file = filePath || projectStore.activeFile || useEditorStore.getState().currentFilePath;
        
        if (!file) {
            return { lastSaved: null, isPending: false };
        }

        return {
            lastSaved: lastSaveTime[file] || null,
            isPending: !!pendingSaves[file]
        };
    }
}));
