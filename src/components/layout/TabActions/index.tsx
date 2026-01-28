import { useState, useRef, useEffect } from 'react';
import { GitCompare, MoreVertical, Lock, Play, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import { useExtensionStore } from '../../../store/extensionStore';
import { useTerminalStore } from '../../../store/terminalStore';
import { useUIStore } from '../../../store/uiStore';
import styles from './styles.module.css';

export const TabActions = ({ hideButtons = false }: { hideButtons?: boolean }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showRunDropdown, setShowRunDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const runDropdownRef = useRef<HTMLDivElement>(null);
    const { closeAllFiles, closeAllSavedFiles, activeFile, tabsLocked, toggleTabsLock } = useProjectStore();
    const { extensions } = useExtensionStore();
    const { terminals, addTerminal, setActiveTerminal, sendCommandToTerminal, updateTerminal } = useTerminalStore();
    const { setTerminalOpen } = useUIStore();

    const isPythonExtensionInstalled = extensions.find(ext => ext.id === 'python')?.installed;
    const isPythonFile = activeFile?.endsWith('.py');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
            if (runDropdownRef.current && !runDropdownRef.current.contains(event.target as Node)) {
                setShowRunDropdown(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.altKey && event.key === 'w') {
                event.preventDefault();
                handleCloseAll();
                return;
            }

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

    const handleRunPython = (dedicated: boolean = false) => {
        if (!activeFile) return;
        
        setTerminalOpen(true);
        
        let targetTerminalId: string | null = null;
        
        if (dedicated) {
            const pythonTerminal = terminals.find(t => t.name === 'Python');
            if (pythonTerminal) {
                targetTerminalId = pythonTerminal.id;
            } else {
                targetTerminalId = addTerminal('powershell');
                updateTerminal(targetTerminalId, { name: 'Python' });
            }
        } else {
            const { activeTerminalId } = useTerminalStore.getState();
            targetTerminalId = activeTerminalId || (terminals.length > 0 ? terminals[0].id : addTerminal('powershell'));
        }

        if (targetTerminalId) {
            setActiveTerminal(targetTerminalId);
            // Wait a bit for terminal to be ready if it was just created
            setTimeout(() => {
                sendCommandToTerminal(targetTerminalId!, `python "${activeFile}"`);
            }, 100);
        }
        
        setShowRunDropdown(false);
    };

    const handleViewChanges = () => {
        if (activeFile) {
            const { openDiffTab } = useProjectStore.getState();
            openDiffTab(activeFile, false);
        }
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

    if (hideButtons) {
        return null;
    }

    return (
        <div className={styles.tabActions}>
            {isPythonExtensionInstalled && isPythonFile && (
                <div className={styles.dropdownContainer} ref={runDropdownRef}>
                    <div className={styles.runButtonContainer}>
                        <button 
                            className={styles.playButton} 
                            onClick={() => handleRunPython(false)}
                            title="Run Python File"
                        >
                            <Play size={16} fill="currentColor" />
                        </button>
                        <button 
                            className={styles.chevronButton}
                            onClick={() => setShowRunDropdown(!showRunDropdown)}
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    {showRunDropdown && (
                        <div className={styles.dropdown}>
                            <button className={styles.dropdownItem} onClick={() => handleRunPython(false)}>
                                <div className={styles.dropdownItemContent}>
                                    <Play size={16} fill="currentColor" />
                                    <span>Run Python File</span>
                                </div>
                            </button>
                            <button className={styles.dropdownItem} onClick={() => handleRunPython(true)}>
                                <div className={styles.dropdownItemContent}>
                                    <Play size={16} fill="currentColor" />
                                    <span>Run Python File in Dedicated Terminal</span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
                className={styles.actionButton}
                onClick={handleViewChanges}
                title="View Changes"
                disabled={!activeFile}
            >
                <GitCompare size={16} />
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
                                <span>Close All Saved</span>
                                <span className={styles.keybind}>Ctrl+Alt+U</span>
                            </div>
                        </button>
                        <button
                            className={styles.dropdownItem}
                            onClick={handleLockGroup}
                        >
                            <div className={styles.dropdownItemContent}>
                                <span>{tabsLocked ? 'Unlock Tabs' : 'Lock Tabs'}</span>
                                {tabsLocked ? null : <Lock size={14} className={styles.lockIcon} />}
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
