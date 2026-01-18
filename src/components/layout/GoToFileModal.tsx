import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getFileIcon } from '../../utils/fileIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../../store/projectStore';
import { tauriApi } from '../../lib/tauri-api';
import clsx from 'clsx';
import styles from './GoToFileModal.module.css';

interface GoToFileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GoToFileModal: React.FC<GoToFileModalProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { history, openFile, currentWorkspace } = useProjectStore();
    const [allFiles, setAllFiles] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    // Get last 3 unique files from history
    const recentFiles = Array.from(new Set(history))
        .reverse()
        .slice(0, 3)
        .map(path => ({
            name: path.split(/[/\\]/).pop() || path,
            path: path,
            icon: getFileIcon(path.split(/[/\\]/).pop() || path, path)
        }));

    // Filter all files based on search query
    const filteredFiles = allFiles
        .map(file => ({
            name: file.name,
            path: file.path,
            icon: getFileIcon(file.name, file.path)
        }))
        .filter(f => 
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.path.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Show recent files when no search query, otherwise show filtered files
    const displayFiles = searchQuery.length > 0 ? filteredFiles : [...recentFiles, ...filteredFiles];

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            loadAllFiles();
        } else {
            setSearchQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

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

    // Handle keyboard navigation
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
                setSelectedIndex(prev => (prev + 1) % displayFiles.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(prev => (prev - 1 + displayFiles.length) % displayFiles.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedFile = displayFiles[selectedIndex];
                if (selectedFile) {
                    openFile(selectedFile.path);
                    onClose();
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, displayFiles, selectedIndex, openFile]);

    // Reset selected index when search query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    return createPortal(
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
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.header}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search files by name (append : to go to line or @ to go to symbol)"
                                className={styles.input}
                                autoFocus
                            />
                        </div>

                        <div className={styles.body}>
                            {/* Recent Files Section - only show when no search query */}
                            {searchQuery.length === 0 && recentFiles.length > 0 && (
                                <div>
                                    <div className={styles.recentTitle}>recently opened</div>
                                    {recentFiles.map((file, idx) => (
                                        <div
                                            key={`recent-${idx}`}
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
                            )}

                            {/* All Files Section */}
                            {(searchQuery.length > 0 ? filteredFiles : allFiles.map(file => ({
                                name: file.name,
                                path: file.path,
                                icon: getFileIcon(file.name, file.path)
                            }))).length > 0 ? (
                                <div>
                                    {(searchQuery.length > 0 ? filteredFiles : allFiles.map(file => ({
                                        name: file.name,
                                        path: file.path,
                                        icon: getFileIcon(file.name, file.path)
                                    }))).map((file, idx) => {
                                        const actualIndex = searchQuery.length === 0 ? recentFiles.length + idx : idx;
                                        return (
                                            <div
                                                key={`file-${idx}`}
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
                            ) : (
                                <div className={styles.noResults}>
                                    No files found
                                </div>
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
    );
};

export default GoToFileModal;
