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
        console.error('Failed to open file:', error);
    }
};

const handleOpenFolder = async (setWorkspace: (path: string) => void) => {
    try {
        const folderPath = await tauriApi.openFolderDialog();
        if (folderPath) {
            setWorkspace(folderPath);
        }
    } catch (error) {
        console.error('Failed to open folder:', error);
    }
};


const handleSave = async (saveFn: () => Promise<void>) => {
    try {
        await saveFn();
    } catch (error) {
        console.error('Failed to save file:', error);
    }
};

const handleSaveAs = async (saveAsFn: () => Promise<void>) => {
    try {
        await saveAsFn();
    } catch (error) {
        console.error('Failed to save file as:', error);
    }
};

const handleNewWindow = async () => {
    try {
        await tauriApi.openNewWindow('', 'default');
    } catch (error) {
        console.error('Failed to open new window:', error);
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
        console.error('Failed to save all files:', error);
    }
};

export const createMenuStructure = ({
    setWorkspace,
    openFile,
    window,
    handlePaletteOpen,
    selectAll,
    save,
    saveAs,
    openNewFileModal,
    autoSaveStore,
}: {
    setWorkspace: (path: string) => void;
    openFile: (path: string) => void;
    window: Window;
    handlePaletteOpen: () => void;
    selectAll: () => void;
    save: () => Promise<void>;
    saveAs: () => Promise<void>;
    openNewFileModal: () => void;
    autoSaveStore: any;
}): MenuCategory[] => [
    {
        label: 'File',
        items: [
            { label: 'New File...', shortcut: 'Ctrl+N', action: () => handleOpenNewFileModal(openNewFileModal) },
            { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: handleNewWindow },
            { label: 'Open File...', shortcut: 'Ctrl+O', action: () => handleOpenFile(openFile) },
            { 
                label: 'Open Folder...', 
                shortcut: 'Ctrl+K Ctrl+O', 
                action: () => handleOpenFolder(setWorkspace) 
            },
            { label: 'Open Recent...' },
            { label: 'Reopen Closed Editor', shortcut: 'Ctrl+Shift+T' },
            { label: 'Save', shortcut: 'Ctrl+S', action: async () => await handleSave(save) },
            { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: async () => await handleSaveAs(saveAs) },
            { label: 'Save All...', shortcut: 'Ctrl+K S', action: async () => await handleSaveAllNow(autoSaveStore) },
            { 
                label: autoSaveStore?.isEnabled ? 'Disable Auto Save' : 'Enable Auto Save', 
                shortcut: '',
                action: () => handleToggleAutoSave(autoSaveStore) 
            },
            { label: 'Exit', action: () => window.close() },
        ],
    },
    {
        label: 'Edit',
        items: [
            { label: 'Undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', shortcut: 'Ctrl+Y' },
            { label: 'Cut', shortcut: 'Ctrl+X' },
            { label: 'Copy', shortcut: 'Ctrl+C' },
            { label: 'Paste', shortcut: 'Ctrl+V' },
            { label: 'Find', shortcut: 'Ctrl+F' },
            { label: 'Replace', shortcut: 'Ctrl+H' },
            { label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
            { label: 'Replace in Files', shortcut: 'Ctrl+Shift+H' },
            { label: 'Toggle Line Comment', shortcut: 'Ctrl+/' },
            { label: 'Toggle Block Comment', shortcut: 'Ctrl+Shift+A' },
            { label: 'Emmet: Expand Abbreviation', shortcut: 'Tab' },
        ],
    },
    {
        label: 'Selection',
        items: [
            { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
            { label: 'Expand Selection', shortcut: 'Shift+Alt+Right' },
            { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left' },
            { label: 'Copy Line Up', shortcut: 'Ctrl+Shift+Alt+Up' },
            { label: 'Copy Line Down', shortcut: 'Ctrl+Shift+Alt+Down' },
            { label: 'Move Line Up', shortcut: 'Alt+Up' },
            { label: 'Move Line Down', shortcut: 'Alt+Down' },
            { label: 'Duplicate Selection' },
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
            { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: handlePaletteOpen },
            { label: 'Open View...' },
            { label: 'Appearance' },
            { label: 'Editor Layout' },
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
            { label: 'Back', shortcut: 'Alt+Left' },
            { label: 'Forward', shortcut: 'Alt+Right' },
            { label: 'Go to File...', shortcut: 'Ctrl+P' },
            { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O' },
            { label: 'Go to Symbol in File', shortcut: 'Ctrl+T' },
            { label: 'Go to Symbol in Workspace', shortcut: 'Ctrl+Shift+T' },
            { label: 'Go to Definition', shortcut: 'F12' },
            { label: 'Peek Definition', shortcut: 'Alt+F12' },
            { label: 'Go to Type Definition', shortcut: 'Shift+F12' },
            { label: 'Peek Type Definition' },
            { label: 'Go to Implementation', shortcut: 'Ctrl+F12' },
            { label: 'Peek Implementation' },
            { label: 'Go to References', shortcut: 'Shift+F12' },
            { label: 'Go to Line...', shortcut: 'Ctrl+G' },
            { label: 'Go to Last Edit Location', shortcut: 'Ctrl+K Ctrl+Q' },
            { label: 'Go to Last Location', shortcut: 'Ctrl+K Ctrl+P' },
            { label: 'Go to Next Problem', shortcut: 'F8' },
            { label: 'Go to Previous Problem', shortcut: 'Shift+F8' },
            { label: 'Go to Next Error in Files', shortcut: 'Ctrl+K Ctrl+N' },
            { label: 'Go to Previous Error in Files', shortcut: 'Ctrl+K Ctrl+P' },
            { label: 'Go to Member' },
            { label: 'Go to Symbol from Editor' },
            { label: 'Go to Bracket' },
            { label: 'Go to Next Change', shortcut: 'Alt+F3' },
            { label: 'Go to Previous Change', shortcut: 'Shift+Alt+F3' },
            { label: 'Switch Window', shortcut: 'Ctrl+Tab' },
        ],
    },
    {
        label: 'Run',
        items: [
            { label: 'Start Debugging', shortcut: 'F5' },
            { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' },
        ],
    },
    {
        label: 'Help',
        items: [{ label: 'Welcome' }, { label: 'Documentation' }, { label: 'About' }],
    },
];
