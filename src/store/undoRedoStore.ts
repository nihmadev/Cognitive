import { StateCreator } from 'zustand';
import { create } from 'zustand';
import { tauriApi } from '../lib/tauri-api';

export interface DeletionItem {
    path: string;
    name: string;
    isDirectory: boolean;
    content?: string; // For files only
    children?: DeletionItem[]; // For directories only
    originalParentPath: string;
    timestamp: number;
}

export interface UndoRedoSlice {
    deletionHistory: DeletionItem[];
    redoHistory: DeletionItem[];
    canUndo: boolean;
    canRedo: boolean;
    
    addToDeletionHistory: (item: DeletionItem) => void;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    clearHistory: () => void;
}

export const createUndoRedoSlice: StateCreator<UndoRedoSlice, [], [], UndoRedoSlice> = (set, get) => ({
    deletionHistory: [],
    redoHistory: [],
    canUndo: false,
    canRedo: false,

    addToDeletionHistory: (item: DeletionItem) => {
        const { deletionHistory } = get();
        const newHistory = [...deletionHistory, item];
        
        // Limit history to 50 items
        if (newHistory.length > 50) {
            newHistory.shift();
        }
        
        // Clear redo history when new deletion occurs
        set({
            deletionHistory: newHistory,
            redoHistory: [],
            canUndo: newHistory.length > 0,
            canRedo: false
        });
    },

    undo: async () => {
        const { deletionHistory, redoHistory } = get();
        
        if (deletionHistory.length === 0) return;
        
        // Get the last item to restore
        const itemToRestore = deletionHistory[deletionHistory.length - 1];
        
        try {
            await restoreItem(itemToRestore);
            
            // Move item from deletion history to redo history
            const newDeletionHistory = deletionHistory.slice(0, -1);
            const newRedoHistory = [...redoHistory, itemToRestore];
            
            set({
                deletionHistory: newDeletionHistory,
                redoHistory: newRedoHistory,
                canUndo: newDeletionHistory.length > 0,
                canRedo: true
            });
        } catch (error) {
            // Failed to restore item
        }
    },

    redo: async () => {
        const { deletionHistory, redoHistory } = get();
        
        if (redoHistory.length === 0) return;
        
        // Get the last item to redo (delete again)
        const itemToRedo = redoHistory[redoHistory.length - 1];
        
        try {
            await tauriApi.deletePath(itemToRedo.path);
            
            // Move item from redo history back to deletion history
            const newRedoHistory = redoHistory.slice(0, -1);
            const newDeletionHistory = [...deletionHistory, itemToRedo];
            
            set({
                deletionHistory: newDeletionHistory,
                redoHistory: newRedoHistory,
                canUndo: true,
                canRedo: newRedoHistory.length > 0
            });
        } catch (error) {
            // Failed to redo deletion
        }
    },

    clearHistory: () => {
        set({
            deletionHistory: [],
            redoHistory: [],
            canUndo: false,
            canRedo: false
        });
    }
});

// Create the store hook
export const useUndoRedoStore = create<UndoRedoSlice>()(
    (...a) => createUndoRedoSlice(...a)
);

// Helper function to restore a deleted item
async function restoreItem(item: DeletionItem): Promise<void> {
    if (item.isDirectory) {
        // Recreate directory
        await tauriApi.createFolder(item.path);
        
        // Restore all children if they exist
        if (item.children && item.children.length > 0) {
            for (const child of item.children) {
                await restoreChildItem(child, item.path);
            }
        }
    } else {
        // Recreate file with original content
        if (item.content !== undefined) {
            await tauriApi.writeFile(item.path, item.content);
        } else {
            // If no content is stored, create an empty file
            await tauriApi.createFile(item.path);
        }
    }
}

// Helper function to restore child items (for directories)
async function restoreChildItem(child: any, parentPath: string): Promise<void> {
    if (child.is_dir) {
        // Recreate subdirectory
        await tauriApi.createFolder(child.path);
        
        // Restore all grandchildren if they exist
        if (child.children && child.children.length > 0) {
            for (const grandchild of child.children) {
                await restoreChildItem(grandchild, child.path);
            }
        }
    } else {
        // Recreate file with original content
        if (child.content !== undefined) {
            await tauriApi.writeFile(child.path, child.content);
        } else {
            // If no content is stored, create an empty file
            await tauriApi.createFile(child.path);
        }
    }
}
