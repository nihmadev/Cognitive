import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getFileIcon } from '../../../utils/fileIcons';
import { motion, AnimatePresence } from 'framer-motion';
import {
    File,
    Code,
    Terminal,
    Bug,
    Search,
    ArrowRight
} from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import { tauriApi } from '../../../lib/tauri-api';
import clsx from 'clsx';
import styles from './styles.module.css';
import { SearchModal } from '../Search/SearchModal';
import { SymbolModal } from '../Search/SymbolModal';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { history, openFile, currentWorkspace } = useProjectStore();
    const [allFiles, setAllFiles] = useState<any[]>([]);
    const [isGoToFileMode, setIsGoToFileMode] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showSymbolModal, setShowSymbolModal] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const uniqueHistory = Array.from(new Set(history)).reverse();

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
                setShowSymbolModal(true);
                onClose();
            }
        },
    ].filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const loadAllFiles = async () => {
        if (currentWorkspace) {
            try {
                const files = await tauriApi.getAllFiles(currentWorkspace);
                setAllFiles(files);
            } catch (error) {
                console.error('Failed to load files:', error);
            }
        }
    };

    const allFilesFiltered = React.useMemo(() => {
        const filtered = allFiles.filter(f => 
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.path.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered.map(file => ({
            name: file.name,
            path: file.path,
            icon: getFileIcon(file.name, file.path)
        }));
    }, [allFiles, searchQuery]);

    const recentFilesFiltered = React.useMemo(() => {
        return uniqueHistory.map(path => ({
            name: path.split(/[/\\]/).pop() || path,
            path: path,
            icon: getFileIcon(path.split(/[/\\]/).pop() || path, path)
        })).filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [uniqueHistory, searchQuery]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            
            loadAllFiles();
        } else {
            setSearchQuery('');
            setIsGoToFileMode(false);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...recentFilesFiltered];
                if (currentItems.length > 0) {
                    setSelectedIndex(prev => (prev + 1) % currentItems.length);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...recentFilesFiltered];
                if (currentItems.length > 0) {
                    setSelectedIndex(prev => (prev - 1 + currentItems.length) % currentItems.length);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const currentItems = isGoToFileMode ? allFilesFiltered : [...shortcuts, ...recentFilesFiltered];
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
                        } else if ('action' in selectedItem && typeof selectedItem.action === 'function') {
                            selectedItem.action();
                        }
                    } else if ('path' in selectedItem) {
                        openFile((selectedItem as any).path);
                        onClose();
                    }
                }
            } else if (e.key === '@' && document.activeElement === inputRef.current && !isGoToFileMode) {
                e.preventDefault();
                setShowSymbolModal(true);
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, isGoToFileMode, allFilesFiltered, shortcuts, recentFilesFiltered, openFile, onClose]);

    
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
            {createPortal(
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
                            className={styles.palette}
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
                                {isGoToFileMode ? (
                                    allFilesFiltered.length > 0 ? (
                                        <div>
                                            {allFilesFiltered.map((file, idx) => (
                                                <div
                                                    key={`file-${idx}`}
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
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.noResults}>No files found</div>
                                    )
                                ) : (
                                    <>
                                        {shortcuts.length > 0 && (
                                            <div className={styles.section}>
                                                {shortcuts.map((shortcut, idx) => (
                                                    <div
                                                        key={`shortcut-${idx}`}
                                                        onClick={() => {
                                                            shortcut.action();
                                                            if (shortcut.label !== 'Go to File') onClose();
                                                        }}
                                                        onMouseEnter={() => setSelectedIndex(idx)}
                                                        className={clsx(styles.item, idx === selectedIndex && styles.selected)}
                                                    >
                                                        <div className={styles.itemLeft}>
                                                            {shortcut.icon}
                                                            <span className={styles.fileName}>{shortcut.label}</span>
                                                        </div>
                                                        {shortcut.shortcut && (
                                                            <div className={styles.shortcut}>
                                                                {shortcut.shortcut.split(' + ').map((key, i) => (
                                                                    <span key={i} className={styles.key}>{key}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {recentFilesFiltered.length > 0 && (
                                            <div className={styles.section}>
                                                <div className={styles.recentTitle}>recently opened</div>
                                                {recentFilesFiltered.map((file, idx) => {
                                                    const actualIndex = shortcuts.length + idx;
                                                    return (
                                                        <div
                                                            key={`recent-${idx}`}
                                                            onClick={() => {
                                                                openFile(file.path);
                                                                onClose();
                                                            }}
                                                            onMouseEnter={() => setSelectedIndex(actualIndex)}
                                                            className={clsx(styles.item, actualIndex === selectedIndex && styles.selected)}
                                                        >
                                                            <div className={styles.itemLeft}>
                                                                {file.icon}
                                                                <span className={styles.fileName}>{file.name}</span>
                                                                <span className={styles.filePath}>{file.path}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                </AnimatePresence>,
                document.body
            )}
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
