import { create } from 'zustand';
import { tauriApi, TimelineEntry } from '../lib/tauri-api';

interface TimelineStore {
    entries: TimelineEntry[];
    currentFile: string | null;
    isLoading: boolean;
    error: string | null;
    selectedEntry: TimelineEntry | null;
    
    loadHistory: (workspace: string, filePath: string) => Promise<void>;
    saveSnapshot: (workspace: string, filePath: string, content: string) => Promise<void>;
    restore: (workspace: string, filePath: string, entryId: string) => Promise<string>;
    deleteEntry: (workspace: string, filePath: string, entryId: string) => Promise<void>;
    clearHistory: (workspace: string, filePath: string) => Promise<void>;
    setSelectedEntry: (entry: TimelineEntry | null) => void;
    getContent: (workspace: string, filePath: string, entryId: string) => Promise<string>;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
    entries: [],
    currentFile: null,
    isLoading: false,
    error: null,
    selectedEntry: null,
    
    loadHistory: async (workspace, filePath) => {
        set({ isLoading: true, error: null, currentFile: filePath });
        try {
            const timeline = await tauriApi.timelineGetHistory(workspace, filePath);
            set({ entries: timeline.entries, isLoading: false });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false, entries: [] });
        }
    },
    
    saveSnapshot: async (workspace, filePath, content) => {
        try {
            await tauriApi.timelineSaveSnapshot(workspace, filePath, content);
            // Reload history after save
            if (get().currentFile === filePath) {
                await get().loadHistory(workspace, filePath);
            }
        } catch (e: any) {
            console.error('Failed to save timeline snapshot:', e);
        }
    },
    
    restore: async (workspace, filePath, entryId) => {
        try {
            const content = await tauriApi.timelineRestore(workspace, filePath, entryId);
            await get().loadHistory(workspace, filePath);
            return content;
        } catch (e: any) {
            set({ error: e.toString() });
            throw e;
        }
    },
    
    deleteEntry: async (workspace, filePath, entryId) => {
        try {
            await tauriApi.timelineDeleteEntry(workspace, filePath, entryId);
            await get().loadHistory(workspace, filePath);
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    clearHistory: async (workspace, filePath) => {
        try {
            await tauriApi.timelineClearHistory(workspace, filePath);
            set({ entries: [], selectedEntry: null });
        } catch (e: any) {
            set({ error: e.toString() });
        }
    },
    
    setSelectedEntry: (entry) => set({ selectedEntry: entry }),
    
    getContent: async (workspace, filePath, entryId) => {
        return tauriApi.timelineGetContent(workspace, filePath, entryId);
    },
}));
