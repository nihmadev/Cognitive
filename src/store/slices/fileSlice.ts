import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { tauriApi } from '../../lib/tauri-api';

export interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    children?: FileEntry[];
}

interface CursorPosition {
    line: number;
    column: number;
}

export interface FileSlice {
    currentWorkspace: string | null;
    fileStructure: FileEntry[];
    openFiles: string[];
    activeFile: string | null;
    history: string[];
    historyIndex: number;
    cursorPosition: CursorPosition;
    errors: { [key: string]: number };
    warnings: { [key: string]: number };
    unsavedChanges: { [key: string]: boolean };
    fileContents: { [key: string]: string };
    originalContents: { [key: string]: string }; // Оригинальное содержимое для Timeline
    deletedFiles: { [key: string]: boolean };
    editorVersion: number; // Для принудительного обновления редактора
    fileSystemVersion: number; // Для принудительного обновления файловой системы
    tabsLocked: boolean; // Whether tabs are locked from closing
    openFileDialog: () => Promise<void>;
    newFile: () => Promise<void>;
    newTextFile: () => Promise<void>;
    newFileWithExtension: (extension?: string) => Promise<void>;
    createCustomFile: (fileName: string) => Promise<void>;
    openNewFileModal: () => void;
    setWorkspace: (path: string) => Promise<void>;
    closeWorkspace: () => Promise<void>;
    openFile: (path: string) => void;
    closeFile: (path: string) => void;
    closeAllFiles: () => void;
    closeAllSavedFiles: () => void;
    toggleTabsLock: () => void;
    refreshWorkspace: () => Promise<void>;
    navigateHistory: (direction: 'back' | 'forward') => void;
    setCursorPosition: (position: CursorPosition) => void;
    setFileErrors: (filePath: string, count: number) => void;
    setFileWarnings: (filePath: string, count: number) => void;
    setFileContent: (filePath: string, content: string) => void;
    setOriginalContent: (filePath: string, content: string) => void;
    getOriginalContent: (filePath: string) => string | undefined;
    forceUpdateContent: (filePath: string, content: string) => void;
    saveFile: (filePath: string) => Promise<void>;
    markFileAsSaved: (filePath: string) => void;
    initWorkspace: () => Promise<boolean>;
    startFileWatcher: () => Promise<void>;
    stopFileWatcher: () => Promise<void>;
    markPathDeleted: (path: string) => void;
    markPathRestored: (path: string) => void;
    markPathsDeletedByPrefix: (prefix: string) => void;
    updateFilePath: (oldPath: string, newPath: string) => void;
}

export const createFileSlice: StateCreator<
    FileSlice & { activeDiffTab: string | null; activeSettingsTab: string | null; activeProfilesTab: string | null },
    [],
    [],
    FileSlice
> = (set, get) => ({
    currentWorkspace: null,
    fileStructure: [],
    openFiles: [],
    activeFile: null,
    history: [],
    historyIndex: -1,
    cursorPosition: { line: 1, column: 1 },
    errors: {},
    warnings: {},
    unsavedChanges: {},
    fileContents: {},
    originalContents: {},
    deletedFiles: {},
    editorVersion: 0,
    fileSystemVersion: 0,
    tabsLocked: false,

    openNewFileModal: () => {
        // This function should be overridden by the UI layer
        console.warn('openNewFileModal called but not implemented in store');
    },

    setWorkspace: async (path: string) => {
        try {
            const structure = await invoke<FileEntry[]>('read_dir', { path });
            // Save the workspace path to localStorage
            localStorage.setItem('lastWorkspace', path);
            set({ 
                currentWorkspace: path, 
                fileStructure: structure,
                fileSystemVersion: get().fileSystemVersion + 1 // Force sidebar re-render
            });
            
            // Start file watcher for the new workspace
            const { startFileWatcher } = get();
            await startFileWatcher();
        } catch (error) {
            console.error('Failed to load workspace:', error);
        }
    },

    closeWorkspace: async () => {
        // Stop file watcher before clearing workspace
        const { stopFileWatcher } = get();
        await stopFileWatcher();
        
        // Clear workspace data and localStorage
        localStorage.removeItem('lastWorkspace');
        set({
            currentWorkspace: null,
            fileStructure: [],
            openFiles: [],
            activeFile: null,
            history: [],
            historyIndex: -1,
            errors: {},
            warnings: {},
            unsavedChanges: {},
            fileContents: {},
            originalContents: {},
            deletedFiles: {}
        });
    },

    // Initialize the store with the last opened workspace if it exists
    initWorkspace: async () => {
        const lastWorkspace = localStorage.getItem('lastWorkspace');
        if (lastWorkspace) {
            try {
                const structure = await invoke<FileEntry[]>('read_dir', { path: lastWorkspace });
                set({ currentWorkspace: lastWorkspace, fileStructure: structure });
                // Start file watcher for the restored workspace
                const { startFileWatcher } = get();
                await startFileWatcher();
                return true;
            } catch (error) {
                console.error('Failed to load last workspace:', error);
                localStorage.removeItem('lastWorkspace');
                return false;
            }
        }
        return false;
    },

    refreshWorkspace: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            const structure = await invoke<FileEntry[]>('read_dir', { path: currentWorkspace });
            set({ 
                fileStructure: structure,
                fileSystemVersion: get().fileSystemVersion + 1 // Force sidebar re-render
            });
        }
    },

    openFile: (path: string) => {
        if (!path || path.trim() === '') {
            console.error('openFile: Invalid empty path');
            return;
        }
        
        const { openFiles, history, historyIndex, deletedFiles } = get();
        const newHistory = [...history.slice(0, historyIndex + 1), path];
        if (newHistory.length > 50) newHistory.shift();

        const newOpenFiles = openFiles.includes(path) ? openFiles : [...openFiles, path];

        const newDeletedFiles = { ...deletedFiles };
        delete newDeletedFiles[path];

        set({
            openFiles: newOpenFiles,
            activeFile: path,
            activeDiffTab: null,
            activeSettingsTab: null,
            activeProfilesTab: null,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            deletedFiles: newDeletedFiles
        });
    },

    closeFile: (path: string) => {
        const { openFiles, activeFile, history, historyIndex, errors, warnings, deletedFiles, tabsLocked } = get();
        
        // Prevent closing files if tabs are locked
        if (tabsLocked) {
            return;
        }
        
        const newOpenFiles = openFiles.filter(file => file !== path);
        const newActiveFile = activeFile === path ? (newOpenFiles[0] || null) : activeFile;

        const newHistory = history.filter(file => file !== path);
        const newHistoryIndex = Math.min(historyIndex, newHistory.length - 1);

        const newErrors = { ...errors };
        const newWarnings = { ...warnings };
        delete newErrors[path];
        delete newWarnings[path];

        const newDeletedFiles = { ...deletedFiles };
        delete newDeletedFiles[path];

        set({
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
            history: newHistory,
            historyIndex: newHistoryIndex,
            errors: newErrors,
            warnings: newWarnings,
            deletedFiles: newDeletedFiles
        });
    },

    closeAllFiles: () => {
        const { tabsLocked } = get();
        
        // Prevent closing files if tabs are locked
        if (tabsLocked) {
            return;
        }
        
        set({
            openFiles: [],
            activeFile: null,
            history: [],
            historyIndex: -1,
            errors: {},
            warnings: {},
            deletedFiles: {}
        });
    },

    closeAllSavedFiles: () => {
        const { openFiles, unsavedChanges, activeFile, history, historyIndex, errors, warnings, deletedFiles, tabsLocked } = get();
        
        // Prevent closing files if tabs are locked
        if (tabsLocked) {
            return;
        }
        
        // Keep only files with unsaved changes
        const filesWithUnsavedChanges = openFiles.filter(file => unsavedChanges[file]);
        
        // Update active file if it was closed
        const newActiveFile = activeFile && !unsavedChanges[activeFile] 
            ? (filesWithUnsavedChanges[0] || null) 
            : activeFile;
        
        // Update history to only include files with unsaved changes
        const newHistory = history.filter(file => unsavedChanges[file]);
        const newHistoryIndex = Math.min(historyIndex, newHistory.length - 1);
        
        // Clean up errors and warnings for closed files
        const newErrors = { ...errors };
        const newWarnings = { ...warnings };
        const newDeletedFiles = { ...deletedFiles };
        
        openFiles.forEach(file => {
            if (!unsavedChanges[file]) {
                delete newErrors[file];
                delete newWarnings[file];
                delete newDeletedFiles[file];
            }
        });
        
        set({
            openFiles: filesWithUnsavedChanges,
            activeFile: newActiveFile,
            history: newHistory,
            historyIndex: newHistoryIndex,
            errors: newErrors,
            warnings: newWarnings,
            deletedFiles: newDeletedFiles
        });
    },

    toggleTabsLock: () => {
        set({ tabsLocked: !get().tabsLocked });
    },

    navigateHistory: (direction: 'back' | 'forward') => {
        const { history, historyIndex } = get();
        if (direction === 'back' && historyIndex > 0) {
            const newIndex = historyIndex - 1;
            set({ historyIndex: newIndex, activeFile: history[newIndex] });
        } else if (direction === 'forward' && historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            set({ historyIndex: newIndex, activeFile: history[newIndex] });
        }
    },

    setCursorPosition: (position: CursorPosition) => {
        set({ cursorPosition: position });
    },

    setFileErrors: (filePath: string, count: number) => {
        const { errors } = get();
        set({ errors: { ...errors, [filePath]: count } });
    },

    setFileWarnings: (filePath: string, count: number) => {
        const { warnings } = get();
        set({ warnings: { ...warnings, [filePath]: count } });
    },

    setFileContent: (filePath: string, content: string) => {
        const { fileContents, unsavedChanges, originalContents } = get();
        const originalContent = fileContents[filePath];
        const hasChanges = originalContent !== undefined && originalContent !== content;
        
        // Сохраняем оригинальное содержимое при первом изменении
        if (hasChanges && !originalContents[filePath] && originalContent !== undefined) {
            set({
                originalContents: { ...originalContents, [filePath]: originalContent }
            });
        }
        
        set({
            fileContents: { ...fileContents, [filePath]: content },
            unsavedChanges: { ...unsavedChanges, [filePath]: hasChanges }
        });
    },

    setOriginalContent: (filePath: string, content: string) => {
        const { originalContents } = get();
        set({
            originalContents: { ...originalContents, [filePath]: content }
        });
    },

    getOriginalContent: (filePath: string) => {
        return get().originalContents[filePath];
    },

    forceUpdateContent: (filePath: string, content: string) => {
        const { fileContents, unsavedChanges, originalContents, editorVersion } = get();
        // Очищаем оригинальное содержимое и помечаем как несохранённое
        const newOriginalContents = { ...originalContents };
        delete newOriginalContents[filePath];
        
        set({
            fileContents: { ...fileContents, [filePath]: content },
            unsavedChanges: { ...unsavedChanges, [filePath]: false },
            originalContents: newOriginalContents,
            editorVersion: editorVersion + 1, // Триггерим обновление редактора
        });
    },

    saveFile: async (filePath: string) => {
        const { fileContents, originalContents } = get();
        const content = fileContents[filePath];
        
        if (content !== undefined) {
            try {
                await invoke('write_file', { path: filePath, content });
                get().markFileAsSaved(filePath);
                // Очищаем оригинальное содержимое после сохранения
                const newOriginalContents = { ...originalContents };
                delete newOriginalContents[filePath];
                set({ originalContents: newOriginalContents });
            } catch (error) {
                console.error('Failed to save file:', error);
            }
        }
    },

    markFileAsSaved: (filePath: string) => {
        const { unsavedChanges } = get();
        set({ unsavedChanges: { ...unsavedChanges, [filePath]: false } });
    },

    openFileDialog: async () => {
        try {
            const path = await tauriApi.openFolderDialog();
            if (path) {
                await get().setWorkspace(path);
            }
        } catch (error) {
            console.error('Failed to open folder dialog:', error);
        }
    },

    newFile: async () => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges } = get();
            if (!currentWorkspace) return;
            
            // Create a new untitled file
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}.txt`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            // Save the empty file
            await tauriApi.writeFile(newFilePath, '');
            
            // Refresh workspace to show the new file in explorer
            await get().refreshWorkspace();
        } catch (error) {
            console.error('Failed to create new file:', error);
        }
    },

    newTextFile: async () => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges } = get();
            if (!currentWorkspace) return;
            
            // Create a new untitled text file without extension
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            // Save the empty file
            await tauriApi.writeFile(newFilePath, '');
            
            // Refresh workspace to show the new file in explorer
            await get().refreshWorkspace();
        } catch (error) {
            console.error('Failed to create new text file:', error);
        }
    },

    createCustomFile: async (fileName: string) => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges } = get();
            if (!currentWorkspace) return;
            
            // Create a new file with the custom name provided by user
            const newFilePath = `${currentWorkspace}/${fileName}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            // Save the empty file
            await tauriApi.writeFile(newFilePath, '');
            
            // Refresh workspace to show the new file in explorer
            await get().refreshWorkspace();
        } catch (error) {
            console.error('Failed to create custom file:', error);
        }
    },

    newFileWithExtension: async (extension: string = '.txt') => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges } = get();
            if (!currentWorkspace) return;
            
            // Create a new file with the specified extension
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}${extension}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            // Save the empty file
            await tauriApi.writeFile(newFilePath, '');
            
            // Refresh workspace to show the new file in explorer
            await get().refreshWorkspace();
        } catch (error) {
            console.error('Failed to create new file with extension:', error);
        }
    },

    startFileWatcher: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            try {
                await tauriApi.startFileWatcher(currentWorkspace);
                console.log('File watcher started for workspace:', currentWorkspace);
            } catch (error) {
                console.error('Failed to start file watcher:', error);
            }
        }
    },

    stopFileWatcher: async () => {
        try {
            await tauriApi.stopFileWatcher();
            console.log('File watcher stopped');
        } catch (error) {
            console.error('Failed to stop file watcher:', error);
        }
    },

    markPathDeleted: (path: string) => {
        if (!path) return;
        const { deletedFiles } = get();
        set({ deletedFiles: { ...deletedFiles, [path]: true } });
    },

    markPathRestored: (path: string) => {
        if (!path) return;
        const { deletedFiles } = get();
        if (!deletedFiles[path]) return;
        const next = { ...deletedFiles };
        delete next[path];
        set({ deletedFiles: next });
    },

    markPathsDeletedByPrefix: (prefix: string) => {
        if (!prefix) return;
        const { openFiles, deletedFiles } = get();

        const normalized = prefix.replace(/[\\/]+$/, '');
        const isUnder = (p: string) => p === normalized || p.startsWith(`${normalized}/`) || p.startsWith(`${normalized}\\`);

        const next = { ...deletedFiles };
        openFiles.forEach((p) => {
            if (isUnder(p)) {
                next[p] = true;
            }
        });
        set({ deletedFiles: next });
    },

    updateFilePath: (oldPath: string, newPath: string) => {
        const { openFiles, activeFile, history, fileContents, unsavedChanges, originalContents, errors, warnings, deletedFiles } = get();
        
        // Update openFiles array
        const newOpenFiles = openFiles.map(path => path === oldPath ? newPath : path);
        
        // Update activeFile if it matches
        const newActiveFile = activeFile === oldPath ? newPath : activeFile;
        
        // Update history
        const newHistory = history.map(path => path === oldPath ? newPath : path);
        
        // Update fileContents
        const newFileContents = { ...fileContents };
        if (fileContents[oldPath] !== undefined) {
            newFileContents[newPath] = fileContents[oldPath];
            delete newFileContents[oldPath];
        }
        
        // Update unsavedChanges
        const newUnsavedChanges = { ...unsavedChanges };
        if (unsavedChanges[oldPath] !== undefined) {
            newUnsavedChanges[newPath] = unsavedChanges[oldPath];
            delete newUnsavedChanges[oldPath];
        }
        
        // Update originalContents
        const newOriginalContents = { ...originalContents };
        if (originalContents[oldPath] !== undefined) {
            newOriginalContents[newPath] = originalContents[oldPath];
            delete newOriginalContents[oldPath];
        }
        
        // Update errors
        const newErrors = { ...errors };
        if (errors[oldPath] !== undefined) {
            newErrors[newPath] = errors[oldPath];
            delete newErrors[oldPath];
        }
        
        // Update warnings
        const newWarnings = { ...warnings };
        if (warnings[oldPath] !== undefined) {
            newWarnings[newPath] = warnings[oldPath];
            delete newWarnings[oldPath];
        }
        
        // Update deletedFiles
        const newDeletedFiles = { ...deletedFiles };
        if (deletedFiles[oldPath] !== undefined) {
            newDeletedFiles[newPath] = deletedFiles[oldPath];
            delete newDeletedFiles[oldPath];
        }
        
        set({
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
            history: newHistory,
            fileContents: newFileContents,
            unsavedChanges: newUnsavedChanges,
            originalContents: newOriginalContents,
            errors: newErrors,
            warnings: newWarnings,
            deletedFiles: newDeletedFiles,
            editorVersion: get().editorVersion + 1, // Force editor update
            fileSystemVersion: get().fileSystemVersion + 1 // Force file system UI update
        });
    },
});
