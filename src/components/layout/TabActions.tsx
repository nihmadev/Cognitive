import { useState, useRef, useEffect } from 'react';
import { GitCompare, Columns, MoreVertical, Lock } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import styles from './TabActions.module.css';

export const TabActions = () => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { closeAllFiles, closeAllSavedFiles, activeFile, tabsLocked, toggleTabsLock } = useProjectStore();
    const { toggleSplitView } = useUIStore();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            // Handle Ctrl+Alt+W (Close All)
            if (event.ctrlKey && event.altKey && event.key === 'w') {
                event.preventDefault();
                handleCloseAll();
                return;
            }

            // Handle Ctrl+Alt+U (Close Saved)
            if (event.ctrlKey && event.altKey && event.key === 'u') {
                event.preventDefault();
                handleCloseAllSaved();
                return;
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleViewChanges = () => {
        // Open git diff for the current file if available
        if (activeFile) {
            const { openDiffTab } = useProjectStore.getState();
            openDiffTab(activeFile, false);
        }
    };

    const handleSplit = () => {
        toggleSplitView();
    };

    const handleCloseAll = () => {
        closeAllFiles();
        setShowDropdown(false);
    };

    const handleCloseAllSaved = () => {
        closeAllSavedFiles();
        setShowDropdown(false);
    };

    const handleLockGroup = () => {
        toggleTabsLock();
        setShowDropdown(false);
    };

    return (
        <div className={styles.tabActions}>
            <button
                className={styles.actionButton}
                onClick={handleViewChanges}
                title="View Changes"
                disabled={!activeFile}
            >
                <GitCompare size={16} />
            </button>
            
            <button
                className={styles.actionButton}
                onClick={handleSplit}
                title="Split Editor"
            >
                <Columns size={16} />
            </button>
            
            <div className={styles.dropdownContainer} ref={dropdownRef}>
                <button
                    className={styles.actionButton}
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="More Actions"
                >
                    <MoreVertical size={16} />
                </button>
                
                {showDropdown && (
                    <div className={styles.dropdown}>
                        <button
                            className={styles.dropdownItem}
                            onClick={handleCloseAll}
                        >
                            <div className={styles.dropdownItemContent}>
                                <span>Close All</span>
                                <span className={styles.keybind}>Ctrl+Alt+W</span>
                            </div>
                        </button>
                        <button
                            className={styles.dropdownItem}
                            onClick={handleCloseAllSaved}
                        >
                            <div className={styles.dropdownItemContent}>
                                <span>Close Saved</span>
                                <span className={styles.keybind}>Ctrl+Alt+U</span>
                            </div>
                        </button>
                        <button
                            className={styles.dropdownItem}
                            onClick={handleLockGroup}
                        >
                            <div className={styles.dropdownItemContent}>
                                <span>{tabsLocked ? 'Unlock Group' : 'Lock Group'}</span>
                                <Lock size={14} className={styles.lockIcon} />
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
