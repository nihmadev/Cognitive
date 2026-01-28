import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useProjectStore } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useUIStore } from '../store/uiStore';

export const useTauriMenu = () => {
    const { 
        setWorkspace, 
        openFile, 
        navigateHistory,
        openNewFileModal 
    } = useProjectStore();
    
    const { selectAll, save, saveAs } = useEditorStore();
    const { zoomIn, zoomOut, resetZoom } = useUIStore();

    useEffect(() => {
        const unlistenPromises = [];

        // Menu event listeners
        unlistenPromises.push(listen('menu:command-palette', () => {
            window.dispatchEvent(new CustomEvent('open-command-palette'));
        }));

        unlistenPromises.push(listen('menu:go-to-file', () => {
            window.dispatchEvent(new CustomEvent('open-go-to-file'));
        }));

        unlistenPromises.push(listen('menu:new-file', () => {
            if (openNewFileModal) openNewFileModal();
        }));

        unlistenPromises.push(listen('menu:open-file', async () => {
            try {
                const filePath = await invoke('open_file_dialog');
                if (filePath) {
                    openFile(filePath as string);
                }
            } catch (err) {
                // Failed to open file
            }
        }));

        unlistenPromises.push(listen('menu:open-folder', async () => {
            try {
                const folderPath = await invoke('open_folder_dialog');
                if (folderPath) {
                    setWorkspace(folderPath as string);
                }
            } catch (err) {
                // Failed to open folder
            }
        }));

        unlistenPromises.push(listen('menu:save', () => {
            save();
        }));

        unlistenPromises.push(listen('menu:save-as', () => {
            saveAs();
        }));

        unlistenPromises.push(listen('menu:undo', () => {
            document.execCommand('undo');
        }));

        unlistenPromises.push(listen('menu:redo', () => {
            document.execCommand('redo');
        }));

        unlistenPromises.push(listen('menu:cut', () => {
            document.execCommand('cut');
        }));

        unlistenPromises.push(listen('menu:copy', () => {
            document.execCommand('copy');
        }));

        unlistenPromises.push(listen('menu:paste', () => {
            document.execCommand('paste');
        }));

        unlistenPromises.push(listen('menu:select-all', () => {
            document.execCommand('selectAll');
        }));

        unlistenPromises.push(listen('menu:go-back', () => {
            navigateHistory('back');
        }));

        unlistenPromises.push(listen('menu:go-forward', () => {
            navigateHistory('forward');
        }));

        unlistenPromises.push(listen('menu:zoom-in', () => {
            zoomIn();
        }));

        unlistenPromises.push(listen('menu:zoom-out', () => {
            zoomOut();
        }));

        unlistenPromises.push(listen('menu:zoom-reset', () => {
            resetZoom();
        }));

        unlistenPromises.push(listen('menu:toggle-fullscreen', async () => {
            const window = getCurrentWindow();
            const isFullscreen = await window.isFullscreen();
            await window.setFullscreen(!isFullscreen);
        }));

        return () => {
            unlistenPromises.forEach(unlisten => {
                unlisten.then(fn => fn());
            });
        };
    }, [openNewFileModal, openFile, setWorkspace, save, saveAs, selectAll, navigateHistory, zoomIn, zoomOut, resetZoom]);
};
