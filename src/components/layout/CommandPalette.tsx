import React, { useState, useEffect, useRef } from 'react';
import { getFileIcon } from '../../utils/fileIcons';
import { motion, AnimatePresence } from 'framer-motion';
import {
    File,
    Code,
    Terminal,
    Bug,
    Search,
    ArrowRight
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { tauriApi } from '../../lib/tauri-api';
import clsx from 'clsx';
import styles from './CommandPalette.module.css';
import { SearchModal } from './Search/SearchModal';
import { SymbolModal } from './Search/SymbolModal';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    position?: { top: number; left: number } | null;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, position }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { history, openFile, currentWorkspace } = useProjectStore();
    const [allFiles, setAllFiles] = useState<any[]>([]);
    const [isGoToFileMode, setIsGoToFileMode] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showSymbolModal, setShowSymbolModal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const uniqueHistory = Array.from(new Set(history)).reverse();

    const files = uniqueHistory.map(path => ({
        name: path.split(/[/\\]/).pop() || path,
        path: path,
        icon: getFileIcon(path.split(/[/\\]/).pop() || path, path)
    })).filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter all files for "Go to file" mode
    const allFilesFiltered = allFiles.map(file => ({
        name: file.name,
        path: file.path,
        icon: getFileIcon(file.name, file.path)
    })).filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const shortcuts = [
        { 
            label: 'Go to File', 
            shortcut: 'Ctrl + P', 
            icon: <File className={styles.iconMd} />,
            action: () => {
                setIsGoToFileMode(true);
                setSearchQuery('');
                inputRef.current?.focus();
            }
        },
        { 
            label: 'Show and Run Commands', 
            shortcut: 'Ctrl + Shift + P', 
            icon: <ArrowRight className={styles.iconMd} />,
            action: () => {
                // Handle command palette commands
            }
        },
        { 
            label: 'Search for Text %', 
            icon: <Search className={styles.iconMd} />,
            action: () => {
                setShowSearchModal(true);
                onClose();
            }
        },
        { 
            label: 'Go to Symbol in Editor @', 
            shortcut: 'Ctrl + Shift + O', 
            icon: <Code className={styles.iconMd} />,
            action: () => {
                console.log('Go to Symbol action triggered');
                setShowSymbolModal(true);
                onClose();
            }
        },
        { 
            label: 'Start Debugging debug', 
            icon: <Bug className={styles.iconMd} />,
            action: () => {
                // Handle start debugging
            }
        },
        { 
            label: 'Run Task task', 
            icon: <Terminal className={styles.iconMd} />,
            action: () => {
                // Handle run task
            }
        },
    ].filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            // Load all files when palette opens
            loadAllFiles();
        } else {
            setSearchQuery('');
            setIsGoToFileMode(false);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard navigation and actions
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...files];
                const selectedItem = currentItems[selectedIndex];
                
                if (selectedItem) {
                    if (isGoToFileMode) {
                        openFile((selectedItem as any).path);
                    } else if ('action' in selectedItem && typeof selectedItem.action === 'function') {
                        selectedItem.action();
                    } else if ('path' in selectedItem) {
                        openFile((selectedItem as any).path);
                    }
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, isGoToFileMode, allFilesFiltered, shortcuts, files, openFile, onClose]);

    const loadAllFiles = async () => {
        if (currentWorkspace) {
            try {
                const files = await tauriApi.getAllFiles(currentWorkspace);
                setAllFiles(files);
            } catch (error) {
                console.error('Error loading files:', error);
            }
        }
    };

    // Close on escape and handle navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...files];
                setSelectedIndex(prev => (prev + 1) % currentItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...files];
                setSelectedIndex(prev => (prev - 1 + currentItems.length) % currentItems.length);
                e.stopPropagation();
                const selectedItem = currentItems[selectedIndex];
                
                if (selectedItem) {
                    if (isGoToFileMode && 'path' in selectedItem) {
                        openFile(selectedItem.path);
                        onClose();
                    } else if (!isGoToFileMode && 'label' in selectedItem) {
                        if (selectedItem.label === 'Go to File') {
                            setIsGoToFileMode(true);
                            setSearchQuery('');
                            setSelectedIndex(0);
                            return;
                        }
                    } else if (!isGoToFileMode && 'path' in selectedItem) {
                        openFile(selectedItem.path);
                        onClose();
                    }
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isGoToFileMode, allFilesFiltered, shortcuts, files, selectedIndex]);

    // Handle special character input (@ for symbols)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            // Handle @ symbol for go to symbol
            if (e.key === '@' && document.activeElement === inputRef.current) {
                e.preventDefault();
                setShowSymbolModal(true);
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Check if we should enter "Go to file" mode
    useEffect(() => {
        if (searchQuery.length > 0) {
            setIsGoToFileMode(true);
        } else {
            setIsGoToFileMode(false);
        }
        setSelectedIndex(0);
    }, [searchQuery]);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                <div className={styles.overlayRoot}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={styles.backdrop}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.1 }}
                        style={
                            position
                                ? { top: `${position.top}px`, left: `${position.left}px` }
                                : undefined
                        }
                        className={clsx(
                            styles.palette,
                            position ? styles.palettePositioned : styles.paletteCentered
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.header}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isGoToFileMode ? "Search files by name..." : "Search files by name (append : to go to line or @ to go to symbol)"}
                                className={styles.input}
                                autoFocus
                            />
                        </div>

                        <div className={styles.body}>
                            {/* Go to File Mode */}
                            {isGoToFileMode && (
                                <div>
                                    {allFilesFiltered.length > 0 ? (
                                        allFilesFiltered.map((file, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    openFile(file.path);
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={clsx(styles.item, idx === selectedIndex && styles.selected)}
                                            >
                                                <div className={styles.itemLeft}>
                                                    {file.icon}
                                                    <span className={styles.fileName}>{file.name}</span>
                                                    <span className={styles.filePath}>{file.path}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.noResults}>
                                            No files found
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Default Mode - Shortcuts and Recent Files */}
                            {!isGoToFileMode && (
                                <>
                                    {/* Shortcuts Section */}
                                    {shortcuts.length > 0 && (
                                        <div className={styles.section}>
                                            {shortcuts.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className={clsx(styles.item, idx === selectedIndex && styles.selected)}
                                                    onClick={() => {
                                                        if (item.label === 'Go to File') {
                                                            setIsGoToFileMode(true);
                                                            setSearchQuery('');
                                                        } else if ('action' in item && typeof item.action === 'function') {
                                                            item.action();
                                                        }
                                                    }}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                >
                                                    <div className={styles.itemLeft}>
                                                        {/* Icons often invisible in screenshots if generic, but helpful visually */}
                                                        <span className={styles.hoverArrow}>
                                                            <ArrowRight className={styles.iconSm} />
                                                        </span>
                                                        <span>{item.label}</span>
                                                    </div>
                                                    {item.shortcut && (
                                                        <div className={styles.shortcut}>
                                                            {item.shortcut.split(' ').map((key, k) => (
                                                                <span key={k} className={styles.key}>
                                                                    {key}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Recent Files Section */}
                                    {files.length > 0 && (
                                        <div>
                                            <div className={styles.recentTitle}>recently opened</div>
                                            {files.map((file, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        openFile(file.path);
                                                        onClose();
                                                    }}
                                                    onMouseEnter={() => setSelectedIndex(shortcuts.length + idx)}
                                                    className={clsx(styles.item, (shortcuts.length + idx) === selectedIndex && styles.selected)}
                                                >
                                                    <div className={styles.itemLeft}>
                                                        {file.icon}
                                                        <span className={styles.fileName}>{file.name}</span>
                                                        <span className={styles.filePath}>{file.path}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {files.length === 0 && shortcuts.length === 0 && (
                                        <div className={styles.noResults}>
                                            No results found
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className={styles.footer}>
                            <span>Use arrow keys to navigate</span>
                            <span>Enter to select</span>
                        </div>
                    </motion.div>
                </div>
                )}
            </AnimatePresence>
            {showSearchModal && (
                <SearchModal 
                    isOpen={showSearchModal} 
                    onClose={() => setShowSearchModal(false)} 
                />
            )}
            {showSymbolModal && (
                <SymbolModal 
                    isOpen={showSymbolModal} 
                    onClose={() => setShowSymbolModal(false)} 
                />
            )}
        </>
    );
};

export default CommandPalette;
