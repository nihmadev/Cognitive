import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { tauriApi } from '../../lib/tauri-api';
import { useDiagnosticsStore } from '../diagnosticsStore';
import { useEditorStore } from '../editorStore';

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

interface Location {
    path: string;
    line: number;
    column: number;
}

export interface FileSlice {
    currentWorkspace: string | null;
    fileStructure: FileEntry[];
    openFiles: string[];
    pinnedFiles: { [key: string]: boolean };
    activeFile: string | null;
    history: string[];
    historyIndex: number;
    cursorPosition: CursorPosition;
    lastEditLocation: Location | null;
    lastLocation: Location | null;
    errors: { [key: string]: number };
    warnings: { [key: string]: number };
    unsavedChanges: { [key: string]: boolean };
    fileContents: { [key: string]: string };
    originalContents: { [key: string]: string }; 
    deletedFiles: { [key: string]: boolean };
    loadedFolders: { [key: string]: FileEntry[] };
    setLoadedFolder: (path: string, children: FileEntry[]) => void;
    editorVersion: number; 
    fileSystemVersion: number; 
    tabsLocked: boolean; 
    recentProjects: string[];
    openFileDialog: () => Promise<void>;
    newFile: () => Promise<void>;
    newTextFile: () => Promise<void>;
    newFileWithExtension: (extension?: string) => Promise<void>;
    createCustomFile: (fileName: string) => Promise<void>;
    openNewFileModal: () => void;
    setWorkspace: (path: string) => Promise<void>;
    closeWorkspace: () => Promise<void>;
    openFile: (path: string, pinned?: boolean) => void;
    pinFile: (path: string) => void;
    closeFile: (path: string, force?: boolean) => void;
    closeAllFiles: () => void;
    closeAllSavedFiles: () => void;
    toggleTabsLock: () => void;
    refreshWorkspace: () => Promise<void>;
    navigateHistory: (direction: 'back' | 'forward') => void;
    nextEditor: () => void;
    previousEditor: () => void;
    goToNextErrorInFiles: () => void;
    goToPrevErrorInFiles: () => void;
    goToLastEditLocation: () => void;
    goToLastLocation: () => void;
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
    setActiveFile: (path: string | null) => void;
}

export const createFileSlice: StateCreator<
    FileSlice & { 
        activeDiffTab: string | null; 
        activeSettingsTab: string | null; 
        activeProfilesTab: string | null; 
        activeSearchTab: string | null;
        activeTimelineDiffTab: string | null;
        activeCommitDiffTab: string | null;
    },
    [],
    [],
    FileSlice
> = (set, get) => ({
    currentWorkspace: null,
    fileStructure: [],
    openFiles: [],
    pinnedFiles: {},
    activeFile: null,
    history: [],
    historyIndex: -1,
    cursorPosition: { line: 1, column: 1 },
    lastEditLocation: null,
    lastLocation: null,
    errors: {},
    warnings: {},
    unsavedChanges: {},
    fileContents: {},
    originalContents: {},
    deletedFiles: {},
    loadedFolders: {},
    setLoadedFolder: (path: string, children: FileEntry[]) => {
        set(state => ({
            loadedFolders: { ...state.loadedFolders, [path]: children }
        }));
    },
    editorVersion: 0,
    fileSystemVersion: 0,
    tabsLocked: false,
    recentProjects: [],
    activeDiffTab: null,
    activeSettingsTab: null,
    activeProfilesTab: null,
    activeSearchTab: null,
    activeTimelineDiffTab: null,
    activeCommitDiffTab: null,

    setActiveFile: (path: string | null) => {
        const { openFiles, history, historyIndex, activeFile } = get();
        
        if (!path) {
            set({ 
                activeFile: null,
                activeDiffTab: null,
                activeSettingsTab: null,
                activeProfilesTab: null,
                activeSearchTab: null,
                activeTimelineDiffTab: null,
                activeCommitDiffTab: null
            } as any);
            return;
        }

        // Если файл уже активен, ничего не делаем
        if (activeFile === path) return;

        // Если файл уже открыт, просто переключаемся на него
        if (openFiles.includes(path)) {
            // Но мы все равно должны обновить историю, если этот файл не является текущим в истории
            if (historyIndex === -1 || history[historyIndex] !== path) {
                get().openFile(path);
            } else {
                set({
                    activeFile: path,
                    activeDiffTab: null,
                    activeSettingsTab: null,
                    activeProfilesTab: null,
                    activeSearchTab: null,
                    activeTimelineDiffTab: null,
                    activeCommitDiffTab: null
                } as any);
            }
            return;
        }

        // Если файл не открыт, используем openFile
        get().openFile(path);
    },

    openNewFileModal: () => {
    },

    setWorkspace: async (path: string) => {
        try {
            const structure = await invoke<FileEntry[]>('read_dir', { path });
            
            localStorage.setItem('lastWorkspace', path);
            
            const { recentProjects } = get();
            const newRecentProjects = [
                path,
                ...recentProjects.filter(p => p !== path)
            ].slice(0, 5); // Храним до 5 последних проектов

            set({ 
                currentWorkspace: path, 
                fileStructure: structure,
                fileSystemVersion: get().fileSystemVersion + 1,
                recentProjects: newRecentProjects
            });
            
            
            const { startFileWatcher } = get();
            await startFileWatcher();
        } catch (error) {
        }
    },

    closeWorkspace: async () => {
        
        const { stopFileWatcher } = get();
        await stopFileWatcher();
        
        
        localStorage.removeItem('lastWorkspace');
        set({
            currentWorkspace: null,
            fileStructure: [],
            openFiles: [],
            pinnedFiles: {},
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

    
    initWorkspace: async () => {
        const lastWorkspace = localStorage.getItem('lastWorkspace');
        if (lastWorkspace) {
            try {
                const structure = await invoke<FileEntry[]>('read_dir', { path: lastWorkspace });
                
                const { recentProjects } = get();
                const newRecentProjects = [
                    lastWorkspace,
                    ...recentProjects.filter(p => p !== lastWorkspace)
                ].slice(0, 5);

                set({ 
                    currentWorkspace: lastWorkspace, 
                    fileStructure: structure,
                    recentProjects: newRecentProjects
                });
                
                const { startFileWatcher } = get();
                await startFileWatcher();
                return true;
            } catch (error) {
                localStorage.removeItem('lastWorkspace');
                return false;
            }
        }
        return false;
    },

    refreshWorkspace: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            try {
                const structure = await invoke<FileEntry[]>('read_dir', { path: currentWorkspace });
                set({ 
                    fileStructure: structure,
                    fileSystemVersion: get().fileSystemVersion + 1 
                });
            } catch (error) {
            }
        }
    },

    openFile: (path: string, pinned: boolean = false) => {
        if (!path || path.trim() === '') {
            return;
        }
        
        // Normalize path: handle both slashes and ensure consistency
        const normalizedPath = path.replace(/\\/g, '/');
        
        const { openFiles, pinnedFiles, history, historyIndex, deletedFiles, activeFile } = get();
        
        // 1. If we are already looking at this file, do nothing
        if (activeFile === normalizedPath && historyIndex >= 0 && historyIndex < history.length && history[historyIndex] === normalizedPath) {
            return;
        }

        // 2. If the file is already at the CURRENT history point, but activeFile was null 
        // (e.g. we were in Settings/Diff), just restore activeFile without changing history
        if (historyIndex >= 0 && historyIndex < history.length && history[historyIndex] === normalizedPath) {
            set({
                activeFile: normalizedPath,
                activeDiffTab: null,
                activeSettingsTab: null,
                activeProfilesTab: null,
                activeSearchTab: null,
                activeTimelineDiffTab: null,
                activeCommitDiffTab: null
            } as any);
            return;
        }
        
        let newHistory = history.map(h => h.replace(/\\/g, '/'));
        let newHistoryIndex = historyIndex;

        // 3. Smart navigation: if we are moving to a file that is already "adjacent" in history,
        // just move the index instead of branching history.
        if (historyIndex > 0 && newHistory[historyIndex - 1] === normalizedPath) {
            newHistoryIndex = historyIndex - 1;
        } else if (historyIndex >= 0 && historyIndex < newHistory.length - 1 && newHistory[historyIndex + 1] === normalizedPath) {
            newHistoryIndex = historyIndex + 1;
        } else {
            // 4. Traditional branching: remove forward history and add new entry
            newHistory = historyIndex >= 0 ? newHistory.slice(0, historyIndex + 1) : [];
            
            // Avoid consecutive duplicates
            if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== normalizedPath) {
                newHistory.push(normalizedPath);
            }
            
            if (newHistory.length > 50) {
                newHistory.shift();
            }
            newHistoryIndex = newHistory.length - 1;
        }

        // Preview mode logic: если файл открывается не в pinned режиме
        let newOpenFiles = openFiles.map(f => f.replace(/\\/g, '/'));
        let newPinnedFiles: { [key: string]: boolean } = {};
        Object.keys(pinnedFiles).forEach(key => {
            newPinnedFiles[key.replace(/\\/g, '/')] = pinnedFiles[key];
        });
        
        if (!pinned && !newPinnedFiles[normalizedPath]) {
            // Найти последний unpinned файл и заменить его
            const lastUnpinnedIndex = newOpenFiles.findLastIndex(f => !newPinnedFiles[f]);
            
            if (lastUnpinnedIndex !== -1 && newOpenFiles[lastUnpinnedIndex] !== normalizedPath) {
                // Заменяем последний unpinned файл на новый
                const oldPreviewFile = newOpenFiles[lastUnpinnedIndex];
                newOpenFiles[lastUnpinnedIndex] = normalizedPath;
                
                // Удаляем старый preview файл из pinnedFiles если он там был
                delete newPinnedFiles[oldPreviewFile];
            } else if (!newOpenFiles.includes(normalizedPath)) {
                // Если нет unpinned файлов, просто добавляем
                newOpenFiles.push(normalizedPath);
            }
        } else {
            // Pinned режим или файл уже pinned
            if (!newOpenFiles.includes(normalizedPath)) {
                newOpenFiles.push(normalizedPath);
            }
            newPinnedFiles[normalizedPath] = true;
        }

        const newDeletedFiles: { [key: string]: boolean } = {};
        Object.keys(deletedFiles).forEach(key => {
            newDeletedFiles[key.replace(/\\/g, '/')] = deletedFiles[key];
        });
        delete newDeletedFiles[normalizedPath];

        set({
            openFiles: newOpenFiles,
            pinnedFiles: newPinnedFiles,
            activeFile: normalizedPath,
            activeDiffTab: null,
            activeSettingsTab: null,
            activeProfilesTab: null,
            activeSearchTab: null,
            activeTimelineDiffTab: null,
            activeCommitDiffTab: null,
            history: newHistory,
            historyIndex: newHistoryIndex,
            deletedFiles: newDeletedFiles
        } as any);
    },

    pinFile: (path: string) => {
        const { pinnedFiles } = get();
        set({
            pinnedFiles: { ...pinnedFiles, [path]: true }
        });
    },

    closeFile: (path: string, force: boolean = false) => {
        const { openFiles, pinnedFiles, activeFile, tabsLocked, errors, warnings, deletedFiles, setActiveFile } = get();
        
        if (tabsLocked && !force) {
            return;
        }
        
        const newOpenFiles = openFiles.filter(file => file !== path);
        const newPinnedFiles = { ...pinnedFiles };
        delete newPinnedFiles[path];
        
        // Determine the next file to show if we closed the active one
        let newActiveFile = activeFile;
        if (activeFile === path) {
            // Try to pick the next file in openFiles, or the first one if it was the last
            const closedIndex = openFiles.indexOf(path);
            if (newOpenFiles.length > 0) {
                newActiveFile = newOpenFiles[Math.min(closedIndex, newOpenFiles.length - 1)];
            } else {
                newActiveFile = null;
            }
        }

        const newErrors = { ...errors };
        const newWarnings = { ...warnings };
        delete newErrors[path];
        delete newWarnings[path];

        const newDeletedFiles = { ...deletedFiles };
        delete newDeletedFiles[path];

        // Clear diagnostics for the closed file
        const diagnosticsStore = useDiagnosticsStore.getState();
        diagnosticsStore.clearFileDiagnostics(path);
        diagnosticsStore.clearLspDiagnostics(path);

        // Update the state with new open files list
        set({
            openFiles: newOpenFiles,
            pinnedFiles: newPinnedFiles,
            errors: newErrors,
            warnings: newWarnings,
            deletedFiles: newDeletedFiles
        });

        // Use setActiveFile to switch to the new active file/null
        if (newActiveFile !== activeFile || !newActiveFile) {
            setActiveFile(newActiveFile);
        }
    },

    closeAllFiles: () => {
        const { tabsLocked, setActiveFile, openFiles } = get();
        
        if (tabsLocked) {
            return;
        }
        
        // Clear diagnostics for all open files
        const diagnosticsStore = useDiagnosticsStore.getState();
        openFiles.forEach(file => {
            diagnosticsStore.clearFileDiagnostics(file);
            diagnosticsStore.clearLspDiagnostics(file);
        });
        
        set({
            openFiles: [],
            pinnedFiles: {},
            errors: {},
            warnings: {},
            deletedFiles: {}
        });

        setActiveFile(null);
    },

    closeAllSavedFiles: () => {
        const { openFiles, unsavedChanges, activeFile, errors, warnings, deletedFiles, tabsLocked } = get();
        
        
        if (tabsLocked) {
            return;
        }
        
        
        const filesWithUnsavedChanges = openFiles.filter(file => unsavedChanges[file]);
        const filesToClose = openFiles.filter(file => !unsavedChanges[file]);
        
        
        const newActiveFile = activeFile && !unsavedChanges[activeFile] 
            ? (filesWithUnsavedChanges[0] || null) 
            : activeFile;
        
        // We DO NOT remove files from history here either.
        
        const newErrors = { ...errors };
        const newWarnings = { ...warnings };
        const newDeletedFiles = { ...deletedFiles };
        
        // Clear diagnostics for files that are being closed
        const diagnosticsStore = useDiagnosticsStore.getState();
        
        openFiles.forEach(file => {
            if (!unsavedChanges[file]) {
                delete newErrors[file];
                delete newWarnings[file];
                delete newDeletedFiles[file];
                
                // Clear diagnostics for closed files
                diagnosticsStore.clearFileDiagnostics(file);
                diagnosticsStore.clearLspDiagnostics(file);
            }
        });
        
        set({
            openFiles: filesWithUnsavedChanges,
            activeFile: newActiveFile,
            errors: newErrors,
            warnings: newWarnings,
            deletedFiles: newDeletedFiles
        });
    },

    toggleTabsLock: () => {
        set({ tabsLocked: !get().tabsLocked });
    },

    navigateHistory: (direction: 'back' | 'forward') => {
        const { history, historyIndex, openFile } = get();
        
        if (direction === 'back') {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                const path = history[newIndex];
                
                // Открываем файл и обновляем историю
                openFile(path);
                set({ 
                    historyIndex: newIndex,
                    activeDiffTab: null,
                    activeSettingsTab: null,
                    activeProfilesTab: null,
                    activeSearchTab: null,
                    activeTimelineDiffTab: null,
                    activeCommitDiffTab: null
                } as any);
            }
        } else {
            if (historyIndex >= 0 && historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                const path = history[newIndex];
                
                // Открываем файл и обновляем историю
                openFile(path);
                set({ 
                    historyIndex: newIndex,
                    activeDiffTab: null,
                    activeSettingsTab: null,
                    activeProfilesTab: null,
                    activeSearchTab: null,
                    activeTimelineDiffTab: null,
                    activeCommitDiffTab: null
                } as any);
            }
        }
    },

    nextEditor: () => {
        const { openFiles, activeFile, openFile } = get();
        if (openFiles.length <= 1) return;
        
        const currentIndex = activeFile ? openFiles.indexOf(activeFile) : -1;
        const nextIndex = (currentIndex + 1) % openFiles.length;
        openFile(openFiles[nextIndex]);
    },

    previousEditor: () => {
        const { openFiles, activeFile, openFile } = get();
        if (openFiles.length <= 1) return;
        
        const currentIndex = activeFile ? openFiles.indexOf(activeFile) : -1;
        const prevIndex = (currentIndex - 1 + openFiles.length) % openFiles.length;
        openFile(openFiles[prevIndex]);
    },

    goToNextErrorInFiles: () => {
        const { openFiles, errors, openFile } = get();
        const filesWithErrors = openFiles.filter(file => errors[file] && errors[file] > 0);
        
        if (filesWithErrors.length === 0) return;
        
        const currentIndex = openFiles.indexOf(get().activeFile || '');
        const nextErrorFile = filesWithErrors.find(file => openFiles.indexOf(file) > currentIndex) || filesWithErrors[0];
        
        openFile(nextErrorFile);
    },

    goToPrevErrorInFiles: () => {
        const { openFiles, errors, openFile } = get();
        const filesWithErrors = openFiles.filter(file => errors[file] && errors[file] > 0);
        
        if (filesWithErrors.length === 0) return;
        
        const currentIndex = openFiles.indexOf(get().activeFile || '');
        const prevErrorFile = [...filesWithErrors].reverse().find(file => openFiles.indexOf(file) < currentIndex) || filesWithErrors[filesWithErrors.length - 1];
        
        openFile(prevErrorFile);
    },

    goToLastEditLocation: () => {
        const { lastEditLocation, openFile } = get();
        if (!lastEditLocation) return;
        
        openFile(lastEditLocation.path);
        
        // Wait for editor to be ready and jump
        setTimeout(() => {
            const editorStore = useEditorStore.getState();
            editorStore.jumpToLocation(lastEditLocation.line, lastEditLocation.column);
        }, 100);
    },

    goToLastLocation: () => {
        const { lastLocation, openFile } = get();
        if (!lastLocation) return;
        
        openFile(lastLocation.path);
        
        // Wait for editor to be ready and jump
        setTimeout(() => {
            const editorStore = useEditorStore.getState();
            editorStore.jumpToLocation(lastLocation.line, lastLocation.column);
        }, 100);
    },

    setCursorPosition: (position: CursorPosition) => {
        const { activeFile, cursorPosition } = get();
        if (activeFile) {
            set({ 
                cursorPosition: position,
                lastLocation: { path: activeFile, line: cursorPosition.line, column: cursorPosition.column }
            });
        } else {
            set({ cursorPosition: position });
        }
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
        const { fileContents, unsavedChanges, originalContents, pinnedFiles, pinFile, cursorPosition } = get();
        const originalContent = fileContents[filePath];
        const hasChanges = originalContent !== undefined && originalContent !== content;
        
        // Автоматически закрепляем файл при редактировании
        if (hasChanges && !pinnedFiles[filePath]) {
            pinFile(filePath);
        }
        
        // Track last edit location
        let lastEditLocation = get().lastEditLocation;
        if (hasChanges) {
            lastEditLocation = { path: filePath, line: cursorPosition.line, column: cursorPosition.column };
        }
        
        if (hasChanges && !originalContents[filePath] && originalContent !== undefined) {
            set({
                originalContents: { ...originalContents, [filePath]: originalContent }
            });
        }
        
        set({
            fileContents: { ...fileContents, [filePath]: content },
            unsavedChanges: { ...unsavedChanges, [filePath]: hasChanges },
            lastEditLocation
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
        
        const newOriginalContents = { ...originalContents };
        delete newOriginalContents[filePath];
        
        set({
            fileContents: { ...fileContents, [filePath]: content },
            unsavedChanges: { ...unsavedChanges, [filePath]: false },
            originalContents: newOriginalContents,
            editorVersion: editorVersion + 1, 
        });
    },

    saveFile: async (filePath: string) => {
        const { fileContents, originalContents, deletedFiles } = get();
        
        
        if (deletedFiles[filePath]) {
            throw new Error('Cannot save deleted file');
        }
        
        const content = fileContents[filePath];
        
        if (content !== undefined) {
            try {
                await invoke('write_file', { path: filePath, content });
                get().markFileAsSaved(filePath);
                
                const newOriginalContents = { ...originalContents };
                delete newOriginalContents[filePath];
                set({ originalContents: newOriginalContents });
            } catch (error) {
                throw error;
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
        }
    },

    newFile: async () => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges, pinnedFiles } = get();
            if (!currentWorkspace) return;
            
            
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}.txt`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            const newPinnedFiles = { ...pinnedFiles, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                pinnedFiles: newPinnedFiles,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            
            await tauriApi.writeFile(newFilePath, '');
            
            
            await get().refreshWorkspace();
        } catch (error) {
        }
    },

    newTextFile: async () => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges, pinnedFiles } = get();
            if (!currentWorkspace) return;
            
            
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            const newPinnedFiles = { ...pinnedFiles, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                pinnedFiles: newPinnedFiles,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            
            await tauriApi.writeFile(newFilePath, '');
            
            
            await get().refreshWorkspace();
        } catch (error) {
        }
    },

    createCustomFile: async (fileName: string) => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges, pinnedFiles } = get();
            if (!currentWorkspace) return;
            
            
            const newFilePath = `${currentWorkspace}/${fileName}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            const newPinnedFiles = { ...pinnedFiles, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                pinnedFiles: newPinnedFiles,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            
            await tauriApi.writeFile(newFilePath, '');
            
            
            await get().refreshWorkspace();
        } catch (error) {
        }
    },

    newFileWithExtension: async (extension: string = '.txt') => {
        try {
            const { currentWorkspace, fileContents, unsavedChanges, pinnedFiles } = get();
            if (!currentWorkspace) return;
            
            
            const newFilePath = `${currentWorkspace}/untitled-${Date.now()}${extension}`;
            const newFileContents = { ...fileContents, [newFilePath]: '' };
            const newUnsavedChanges = { ...unsavedChanges, [newFilePath]: true };
            const newPinnedFiles = { ...pinnedFiles, [newFilePath]: true };
            
            set({
                fileContents: newFileContents,
                unsavedChanges: newUnsavedChanges,
                pinnedFiles: newPinnedFiles,
                openFiles: [...get().openFiles, newFilePath],
                activeFile: newFilePath
            });
            
            
            await tauriApi.writeFile(newFilePath, '');
            
            
            await get().refreshWorkspace();
        } catch (error) {
        }
    },

    startFileWatcher: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            try {
                await tauriApi.startFileWatcher(currentWorkspace);
            } catch (error) {
            }
        }
    },

    stopFileWatcher: async () => {
        const { currentWorkspace } = get();
        if (currentWorkspace) {
            try {
                await tauriApi.stopFileWatcher(currentWorkspace);
            } catch (error) {
            }
        }
    },

    markPathDeleted: (path: string) => {
        if (!path) return;
        const { deletedFiles } = get();
        
        
        const newDeletedFiles = { ...deletedFiles, [path]: true };
        
        set({
            deletedFiles: newDeletedFiles,
            fileSystemVersion: get().fileSystemVersion + 1 
        });
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
        const { openFiles, activeFile, history, fileContents, unsavedChanges, originalContents, errors, warnings, deletedFiles, pinnedFiles } = get();
        
        // Update open files list
        const newOpenFiles = openFiles.map(path => path === oldPath ? newPath : path);
        
        // Update active file
        const newActiveFile = activeFile === oldPath ? newPath : activeFile;
        
        // Update history
        const newHistory = history.map(path => path === oldPath ? newPath : path);
        
        // Update file contents
        const newFileContents = { ...fileContents };
        if (fileContents[oldPath] !== undefined) {
            newFileContents[newPath] = fileContents[oldPath];
            delete newFileContents[oldPath];
        }
        
        // Update unsaved changes
        const newUnsavedChanges = { ...unsavedChanges };
        if (unsavedChanges[oldPath] !== undefined) {
            newUnsavedChanges[newPath] = unsavedChanges[oldPath];
            delete newUnsavedChanges[oldPath];
        }
        
        // Update original contents
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
        
        // Update deleted files
        const newDeletedFiles = { ...deletedFiles };
        if (deletedFiles[oldPath] !== undefined) {
            newDeletedFiles[newPath] = deletedFiles[oldPath];
            delete newDeletedFiles[oldPath];
        }
        
        // Update pinned files
        const newPinnedFiles = { ...pinnedFiles };
        if (pinnedFiles[oldPath] !== undefined) {
            newPinnedFiles[newPath] = pinnedFiles[oldPath];
            delete newPinnedFiles[oldPath];
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
            pinnedFiles: newPinnedFiles,
            editorVersion: get().editorVersion + 1, 
            fileSystemVersion: get().fileSystemVersion + 1 
        });
    },
});
