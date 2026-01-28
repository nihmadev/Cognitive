import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useEditorStore } from '../../store/editorStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import CommandPalette from './CommandPalette';
import GoToFileModal from './GoToFile';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { MenuLeft } from './MenuBar/MenuLeft';
import { MenuRight } from './MenuBar/MenuRight';
import { WindowControls } from './MenuBar/WindowControls';
import { createMenuStructure } from './MenuBar/menuStructure';
import styles from './MenuBar.module.css';

interface MenuBarProps {
    onOpenSettings?: () => void;
    onOpenKeyboardShortcuts?: () => void;
    onOpenProfiles?: () => void;
}

export const MenuBar = ({ onOpenSettings, onOpenKeyboardShortcuts, onOpenProfiles }: MenuBarProps) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isGoToFileOpen, setIsGoToFileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const { 
        setWorkspace, 
        openFile, 
        activeFile, 
        navigateHistory, 
        openNewFileModal, 
        openFiles, 
        closeFile, 
        closeWorkspace, 
        currentWorkspace,
        nextEditor,
        previousEditor,
        goToNextErrorInFiles,
        goToPrevErrorInFiles,
        goToLastEditLocation,
        goToLastLocation,
        historyIndex,
        history
    } = useProjectStore();
    const { selectAll, save, saveAs, runAction } = useEditorStore();
    const autoSaveStore = useAutoSaveStore();
    const window = getCurrentWindow();
    const isMacOS = navigator.userAgent.toLowerCase().includes('mac');
    const isWindows = navigator.userAgent.toLowerCase().includes('win');

    const handlePaletteOpen = () => {
        if (isPaletteOpen) {
            setIsPaletteOpen(false);
            return;
        }
        
        setIsPaletteOpen(true);
    };

    const handleGoToFileOpen = () => {
        if (isGoToFileOpen) {
            setIsGoToFileOpen(false);
            return;
        }
        
        setIsGoToFileOpen(true);
    };

    const menuStructure = createMenuStructure({
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
        hasWorkspace: !!currentWorkspace,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        const handleCopy = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (menuRef.current?.contains(target)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (menuRef.current?.contains(target)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);



    const handleMenuClick = (category: string) => {
        setActiveMenu(activeMenu === category ? null : category);
    };

    const currentFileName = activeFile ? (activeFile.split(/[/\\]/).pop() ?? 'Untitled') : 'Untitled';
    
    // Логика для стрелок навигации по ТАБАМ (не по истории файлов)
    const currentTabIndex = openFiles?.indexOf(activeFile || '') ?? -1;
    const canGoBack = currentTabIndex > 0;
    const canGoForward = currentTabIndex >= 0 && currentTabIndex < (openFiles?.length || 0) - 1;

    return (
        <>
            <div className={`${styles.menuBar} ${isMacOS ? styles.macos : ''} ${isWindows ? styles.windows : ''}`} ref={menuRef}>
                <MenuLeft
                    menuStructure={menuStructure}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    handleMenuClick={handleMenuClick}
                />

                {}
                <div className={styles.center} data-tauri-drag-region>
                    <div className={styles.navGroup}>
                        <div className={styles.navButtons}>
                            <button 
                                onClick={() => {
                                    const prevIndex = currentTabIndex - 1;
                                    if (prevIndex >= 0) {
                                        openFile(openFiles[prevIndex]);
                                    }
                                }} 
                                className={`${styles.navBtn} ${!canGoBack ? styles.disabled : ''}`}
                                disabled={!canGoBack}
                                title={canGoBack ? "Go Back" : "Cannot go back"}
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <button 
                                onClick={() => {
                                    const nextIndex = currentTabIndex + 1;
                                    if (nextIndex < openFiles.length) {
                                        openFile(openFiles[nextIndex]);
                                    }
                                }} 
                                className={`${styles.navBtn} ${!canGoForward ? styles.disabled : ''}`}
                                disabled={!canGoForward}
                                title={canGoForward ? "Go Forward" : "Cannot go forward"}
                            >
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <div
                            ref={triggerRef}
                            onClick={handlePaletteOpen}
                            className={styles.searchBar}
                        >
                            <Search size={14} className={styles.searchIcon} />
                            <span className={styles.searchText}>
                                Cognitive {!!openFiles?.length && `- ${currentFileName}`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.rightGroup}>
                    <MenuRight
                        onOpenSettings={onOpenSettings}
                        onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
                        onOpenProfiles={onOpenProfiles}
                    />

                    <WindowControls />
                </div>
            </div>

            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
            <GoToFileModal isOpen={isGoToFileOpen} onClose={() => setIsGoToFileOpen(false)} />
        </>
    );
};
