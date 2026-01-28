import type { Window } from '@tauri-apps/api/window';
import type { MenuCategory } from './menuBarTypes';
import { tauriApi } from '../../../lib/tauri-api';

const handleOpenFile = async (openFile: (path: string) => void) => {
    try {
        const filePath = await tauriApi.openFileDialog();
        if (filePath) {
            openFile(filePath);
        }
    } catch (error) {
        // Failed to open file
    }
};

const handleOpenFolder = async (setWorkspace: (path: string) => void) => {
    try {
        const folderPath = await tauriApi.openFolderDialog();
        if (folderPath) {
            setWorkspace(folderPath);
        }
    } catch (error) {
        // Failed to open folder
    }
};


const handleSave = async (saveFn: () => Promise<void>) => {
    try {
        await saveFn();
    } catch (error) {
        // Failed to save file
    }
};

const handleSaveAs = async (saveAsFn: () => Promise<void>) => {
    try {
        await saveAsFn();
    } catch (error) {
        // Failed to save file as
    }
};

const handleNewWindow = async () => {
    try {
        await tauriApi.openNewWindow('', 'default');
    } catch (error) {
        // Failed to open new window
    }
};

const handleOpenNewFileModal = (openNewFileModalFn: () => void) => {
    openNewFileModalFn();
};


const handleToggleAutoSave = (autoSaveStore: any) => {
    const { isEnabled, setAutoSaveEnabled } = autoSaveStore;
    setAutoSaveEnabled(!isEnabled);
};

const handleSaveAllNow = async (autoSaveStore: any) => {
    try {
        await autoSaveStore.saveAllUnsaved();
    } catch (error) {
        // Failed to save all files
    }
};

const handleNavigateTabs = (direction: 'back' | 'forward', openFiles: string[], activeFile: string | null, openFile: (path: string) => void) => {
    const currentTabIndex = openFiles?.indexOf(activeFile || '') ?? -1;
    
    if (direction === 'back') {
        const prevIndex = currentTabIndex - 1;
        if (prevIndex >= 0) {
            openFile(openFiles[prevIndex]);
        }
    } else {
        const nextIndex = currentTabIndex + 1;
        if (nextIndex < openFiles.length) {
            openFile(openFiles[nextIndex]);
        }
    }
};

const canNavigateTabs = (direction: 'back' | 'forward', openFiles: string[], activeFile: string | null) => {
    const currentTabIndex = openFiles?.indexOf(activeFile || '') ?? -1;
    
    if (direction === 'back') {
        return currentTabIndex > 0;
    } else {
        return currentTabIndex >= 0 && currentTabIndex < openFiles.length - 1;
    }
};

export const createMenuStructure = ({
    setWorkspace,
    openFile,
    closeFile,
    closeWorkspace,
    activeFile,
    openFiles,
    window,
    handlePaletteOpen,
    handleGoToFileOpen,
    selectAll,
    save,
    saveAs,
    openNewFileModal,
    autoSaveStore,
    navigateHistory,
    nextEditor,
    previousEditor,
    goToNextErrorInFiles,
    goToPrevErrorInFiles,
    goToLastEditLocation,
    goToLastLocation,
    runAction,
    hasWorkspace,
}: {
    setWorkspace: (path: string) => void;
    openFile: (path: string) => void;
    closeFile: (path: string) => void;
    closeWorkspace: () => void;
    activeFile: string | null;
    openFiles: string[];
    window: Window;
    handlePaletteOpen: () => void;
    handleGoToFileOpen: () => void;
    selectAll: () => void;
    save: () => Promise<void>;
    saveAs: () => Promise<void>;
    openNewFileModal: () => void;
    autoSaveStore: any;
    navigateHistory: (direction: 'back' | 'forward') => void;
    nextEditor: () => void;
    previousEditor: () => void;
    goToNextErrorInFiles: () => void;
    goToPrevErrorInFiles: () => void;
    goToLastEditLocation: () => void;
    goToLastLocation: () => void;
    runAction: (actionId: string) => void;
    hasWorkspace: boolean;
}): MenuCategory[] => {
    const fileItems = [
        { label: 'New File', shortcut: 'Alt+N', action: () => handleOpenNewFileModal(openNewFileModal) },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: handleNewWindow },
        { label: '', isSeparator: true },
        { label: 'Open File', shortcut: 'Ctrl+O', action: () => handleOpenFile(openFile) },
        { 
            label: 'Open Folder', 
            shortcut: 'Ctrl+K Ctrl+O', 
            action: () => handleOpenFolder(setWorkspace) 
        },
        { label: 'Open Recent', shortcut: 'Ctrl+R' },
        { label: 'Reopen Closed Editor', shortcut: 'Ctrl+Shift+T' },
        { label: '', isSeparator: true },
    ];

    if (hasWorkspace) {
        fileItems.push(
            { label: 'Save', shortcut: 'Ctrl+S', action: async () => await handleSave(save) },
            { label: 'Save As', shortcut: 'Ctrl+Shift+S', action: async () => await handleSaveAs(saveAs) },
            { label: 'Save All', shortcut: 'Ctrl+K S', action: async () => await handleSaveAllNow(autoSaveStore) },
            { 
                label: autoSaveStore?.isEnabled ? 'Disable Auto Save' : 'Enable Auto Save', 
                shortcut: '',
                action: () => handleToggleAutoSave(autoSaveStore) 
            },
            { label: '', isSeparator: true },
            { 
                label: 'Close Editor', 
                shortcut: 'Ctrl+W', 
                action: () => {
                    if (activeFile) {
                        closeFile(activeFile);
                    }
                },
                ...(activeFile ? {} : { action: undefined })
            },
            { 
                label: 'Close Folder', 
                shortcut: 'Ctrl+K F', 
                action: () => closeWorkspace() 
            },
            { label: '', isSeparator: true }
        );
    }

    fileItems.push(
        { 
            label: 'Close Window', 
            shortcut: 'Ctrl+Shift+W', 
            action: () => window.close() 
        },
        { label: '', isSeparator: true },
        { label: 'Exit', shortcut: 'Ctrl+Shift+Q', action: () => window.close() },
    );

    const menu: MenuCategory[] = [
        {
            label: 'File',
            items: fileItems,
        }
    ];

    if (hasWorkspace) {
        menu.push(
            {
                label: 'Edit',
                items: [
                    { label: 'Undo', shortcut: 'Ctrl+Z' },
                    { label: 'Redo', shortcut: 'Ctrl+Y' },
                    { label: '', isSeparator: true },
                    { label: 'Cut', shortcut: 'Ctrl+X' },
                    { label: 'Copy', shortcut: 'Ctrl+C' },
                    { label: 'Paste', shortcut: 'Ctrl+V' },
                    { label: '', isSeparator: true },
                    { label: 'Find', shortcut: 'Ctrl+F' },
                    { label: 'Replace', shortcut: 'Ctrl+H' },
                    { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
                    { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H' },
                    { label: '', isSeparator: true },
                    { label: 'Toggle Line Comment', shortcut: 'Ctrl+/' },
                    { label: 'Toggle Block Comment', shortcut: 'Ctrl+Shift+A' },
                    { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab' },
                ],
            },
            {
                label: 'Selection',
                items: [
                    { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
                    { label: '', isSeparator: true },
                    { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' },
                    { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left' },
                    { label: '', isSeparator: true },
                    { label: 'Copy Line Up', shortcut: 'Ctrl+Shift+Alt+Up' },
                    { label: 'Copy Line Down', shortcut: 'Ctrl+Shift+Alt+Down' },
                    { label: 'Move Line Up', shortcut: 'Alt+Up' },
                    { label: 'Move Line Down', shortcut: 'Alt+Down' },
                    { label: 'Duplicate Selection' },
                    { label: '', isSeparator: true },
                    { label: 'Add Cursor Above', shortcut: 'Shift+Alt+Up' },
                    { label: 'Add Cursor Below', shortcut: 'Shift+Alt+Down' },
                    { label: 'Add Cursors to Line Ends', shortcut: 'Shift+Alt+I' },
                    { label: 'Add Next Occurrence', shortcut: 'Ctrl+D' },
                    { label: 'Add Previous Occurrence' },
                    { label: 'Select All Occurrences', shortcut: 'Ctrl+Shift+L' },
                    { label: 'Switch to Ctrl+Click for Multi-Cursor' },
                    { label: 'Column Selection Mode' },
                ],
            },
            {
                label: 'View',
                items: [
                    { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: handlePaletteOpen },
                    { label: 'Open View' },
                    { label: '', isSeparator: true },
                    { label: 'Appearance' },
                    { label: 'Editor Layout' },
                    { label: '', isSeparator: true },
                    { label: 'Codemaps' },
                    { label: 'Explorer' },
                    { label: 'Search' },
                    { label: 'Source Control' },
                    { label: 'Run' },
                    { label: 'Extensions' },
                    { label: 'Problems' },
                    { label: 'Output' },
                    { label: 'Debug Console' },
                ],
            },
            {
                label: 'Go',
                items: [
                    { 
                        label: 'Back', 
                        shortcut: 'Alt+Left', 
                        action: () => handleNavigateTabs('back', openFiles, activeFile, openFile),
                        disabled: !canNavigateTabs('back', openFiles, activeFile)
                    },
                    { 
                        label: 'Forward', 
                        shortcut: 'Alt+Right', 
                        action: () => handleNavigateTabs('forward', openFiles, activeFile, openFile),
                        disabled: !canNavigateTabs('forward', openFiles, activeFile)
                    },
                    { label: '', isSeparator: true },
                    { label: 'Go to File', shortcut: 'Ctrl+P', action: handleGoToFileOpen },
                    { 
                        label: 'Go to Symbol', 
                        shortcut: 'Ctrl+Shift+O',
                        action: () => runAction('editor.action.quickOutline')
                    },
                    { 
                        label: 'Go to Definition', 
                        shortcut: 'F12',
                        action: () => runAction('editor.action.revealDefinition')
                    },
                    { 
                        label: 'Go to Line', 
                        shortcut: 'Ctrl+G',
                        action: () => runAction('editor.action.gotoLine')
                    },
                    { label: '', isSeparator: true },
                    { 
                        label: 'Go to Last Edit Location', 
                        shortcut: 'Ctrl+K Ctrl+Q',
                        action: goToLastEditLocation
                    },
                    { 
                        label: 'Go to Last Location', 
                        shortcut: 'Ctrl+K Ctrl+P',
                        action: goToLastLocation
                    },
                    { label: '', isSeparator: true },
                    { 
                        label: 'Go to Next Problem', 
                        shortcut: 'F8',
                        action: () => runAction('editor.action.marker.next')
                    },
                    { 
                        label: 'Go to Previous Problem', 
                        shortcut: 'Shift+F8',
                        action: () => runAction('editor.action.marker.prev')
                    },
                    { label: '', isSeparator: true },
                    { 
                        label: 'Next Editor', 
                        shortcut: 'Ctrl+PageDown',
                        action: nextEditor
                    },
                    { 
                        label: 'Previous Editor', 
                        shortcut: 'Ctrl+PageUp',
                        action: previousEditor
                    },
                    { 
                        label: 'Switch Window', 
                        shortcut: 'Ctrl+Tab',
                        action: nextEditor
                    },
                ],
            },
            {
                label: 'Terminal',
                items: [
                    { label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
                    { label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
                    { label: '', isSeparator: true },
                    { label: 'Run Active File' },
                    { label: 'Run Selected Text' },
                ],
            }
        );
    } else {
        // Limited View menu for Welcome Screen
        menu.push({
            label: 'View',
            items: [
                { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: handlePaletteOpen },
                { label: '', isSeparator: true },
                { label: 'Appearance' },
                { label: 'Extensions' },
            ],
        });
    }   return menu;
};

