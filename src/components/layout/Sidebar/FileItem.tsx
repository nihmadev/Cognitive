import { useState, useEffect, useCallback, type ReactElement, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getFileIcon, getFolderIcon } from '../../../utils/fileIcons';
import { tauriApi } from '../../../lib/tauri-api';
import { useProjectStore } from '../../../store/projectStore';
import { useFolderHierarchyDiagnostics } from './useFolderHierarchyDiagnostics';
import { useFileDiagnosticStatus } from './useFileDiagnosticStatus';
import { NewItemInput } from './NewItemInput';
import styles from './FileItem.module.css';

interface FileItemProps {
    entry: any;
    depth?: number;
    isExpanded?: boolean;
    onToggleExpand?: (path: string, isOpen: boolean) => void;
    expandedFolders: Set<string>;
    onCreateNew?: (parentPath: string, type: 'file' | 'folder', insertIndex?: number) => void;
    creatingNew: { parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null;
    onCreationComplete: () => void;
    selectedPath: string | null;
    onSelect: (path: string) => void;
    fileSystemVersion?: number;
}

export const FileItem = ({ 
    entry, 
    depth = 0, 
    expandedFolders, 
    onToggleExpand,
    onCreateNew,
    creatingNew,
    onCreationComplete,
    selectedPath,
    onSelect,
    fileSystemVersion = 0
}: FileItemProps) => {
    const [children, setChildren] = useState<any[]>(entry.children || []);
    const { openFile, activeFile, refreshWorkspace, updateFilePath } = useProjectStore();
    
    // Получаем статус диагностики для папок
    const folderDiagnostics = useFolderHierarchyDiagnostics(entry.path, entry.is_dir);
    
    // Получаем статус диагностики для файлов
    const fileDiagnostics = useFileDiagnosticStatus(entry.path, entry.is_dir);
    
    // Используем соответствующий статус в зависимости от типа
    const { hasError, hasWarning } = entry.is_dir ? folderDiagnostics : fileDiagnostics;

    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(entry.name);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const isOpen = expandedFolders.has(entry.path);
    const isActive = activeFile === entry.path;
    const isSelected = selectedPath === entry.path;
    const isCreatingHere = creatingNew?.parentPath === entry.path;
    const insertIndex = creatingNew?.insertIndex;

    const loadChildren = useCallback(async () => {
        if (entry.is_dir && children.length === 0) {
            try {
                const files = await tauriApi.readDir(entry.path);
                setChildren(files);
            } catch (e) {
                console.error("Failed to read dir", e);
            }
        }
    }, [entry.is_dir, entry.path, children.length]);

    useEffect(() => {
        if (isOpen && entry.is_dir) {
            loadChildren();
        }
    }, [isOpen, loadChildren, entry.is_dir]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(entry.path);
        if (isRenaming) return;
        
        if (entry.is_dir) {
            onToggleExpand?.(entry.path, !isOpen);
        } else {
            openFile(entry.path);
        }
    };
    
    const handleStartRename = useCallback(() => {
        if (isSelected && !isRenaming) {
            setIsRenaming(true);
            setNewName(entry.name);
        }
    }, [isSelected, isRenaming, entry.name]);
    
    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName === entry.name) {
            setIsRenaming(false);
            return;
        }
        
        try {
            const parentDir = entry.path.split('/').slice(0, -1).join('/');
            const newPath = `${parentDir}/${newName}`;
            
            // Use the new Rust function that returns rename result
            const renameResult = await tauriApi.renameFileWithResult(entry.path, newPath);
            
            // Update file paths in store if this was a file
            if (renameResult.was_file) {
                updateFilePath(renameResult.old_path, renameResult.new_path);
            }
            
            // Refresh the workspace to show the renamed file/folder
            await refreshWorkspace();
        } catch (error) {
            console.error('Failed to rename:', error);
        } finally {
            setIsRenaming(false);
        }
    };
    
    // Handle F2 key press for renaming
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSelected && e.key === 'F2') {
                e.preventDefault();
                handleStartRename();
            } else if (isRenaming && e.key === 'Escape') {
                setIsRenaming(false);
                setNewName(entry.name);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, isRenaming, handleStartRename, entry.name]);
    
    // Handle global rename event (triggered from F2 key in useEditorEvents)
    useEffect(() => {
        const handleGlobalRename = () => {
            if (isSelected) {
                handleStartRename();
            }
        };
        
        window.addEventListener('start-rename', handleGlobalRename);
        return () => window.removeEventListener('start-rename', handleGlobalRename);
    }, [isSelected, handleStartRename]);
    
    // Focus the input when renaming starts
    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleCreationComplete = async (name: string | null) => {
        onCreationComplete();
        if (name) {
            // Refresh children
            try {
                const files = await tauriApi.readDir(entry.path);
                setChildren(files);
            } catch (e) {
                console.error("Failed to refresh dir", e);
            }
            refreshWorkspace();
        }
    };

    return (
        <div className={styles.fileItemWrap}>
            {/* Indentation line only for expanded folders */}
            {depth > 0 && entry.is_dir && isOpen && (
                <div 
                    className={styles.indentationLine}
                    style={{ ['--depth' as any]: depth }}
                />
            )}
            <div
                className={clsx(
                    styles.fileRow,
                    isActive && styles.fileRowActive,
                    isSelected && styles.fileRowSelected,
                    entry.is_dir && isOpen && styles.fileRowSticky,
                    entry.is_dir && isOpen && isActive && styles.fileRowStickyActive
                )}
                style={{ ['--depth' as any]: depth }}
                onClick={handleToggle}
                data-file-path={entry.path}
                data-is-dir={entry.is_dir}
            >
                {isActive && <div className={styles.activeIndicator} />}

                <span className={styles.chevronSlot}>
                    {entry.is_dir && (
                        isOpen ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />
                    )}
                    {!entry.is_dir && <div className={styles.placeholderChevron} />}
                </span>

                {entry.is_dir ? (
                    <div className={styles.iconSlot}>
                        {getFolderIcon(isRenaming ? newName : entry.name, isOpen, entry.path)}
                    </div>
                ) : (
                    <div className={styles.iconSlot}>
                        {getFileIcon(isRenaming ? newName : entry.name, entry.path)}
                    </div>
                )}
                {isRenaming ? (
                    <form onSubmit={handleRename} className={styles.renameForm}>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.renameInput}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => setIsRenaming(false)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </form>
                ) : (
                    <span className={clsx(
                        styles.name,
                        hasError && styles.nameError,
                        !hasError && hasWarning && styles.nameWarning
                    )}>
                        {entry.name}
                    </span>
                )}
            </div>

            <AnimatePresence>
                {isOpen && entry.is_dir && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={styles.childrenWrap}
                    >
                        {/* Render children with insert position support */}
                        {(() => {
                            const elements: ReactElement[] = [];
                            
                            children.forEach((child: any, index: number) => {
                                // Insert NewItemInput at the correct position if creating in this folder
                                if (isCreatingHere && insertIndex === index) {
                                    elements.push(
                                        <NewItemInput
                                            key="new-item-input"
                                            parentPath={entry.path}
                                            type={creatingNew!.type}
                                            depth={depth + 1}
                                            insertIndex={insertIndex}
                                            onComplete={handleCreationComplete}
                                        />
                                    );
                                }
                                
                                // Add the regular file item
                                elements.push(
                                    <FileItem 
                                        key={`${child.path}-${fileSystemVersion}`} 
                                        entry={child} 
                                        depth={depth + 1}
                                        expandedFolders={expandedFolders}
                                        onToggleExpand={onToggleExpand}
                                        onCreateNew={onCreateNew}
                                        creatingNew={creatingNew}
                                        onCreationComplete={onCreationComplete}
                                        selectedPath={selectedPath}
                                        onSelect={onSelect}
                                        fileSystemVersion={fileSystemVersion}
                                    />
                                );
                            });
                            
                            // If insert index is at the end or no insert index specified, add at the end
                            if (isCreatingHere && (insertIndex === undefined || insertIndex >= children.length)) {
                                elements.push(
                                    <NewItemInput
                                        key="new-item-input"
                                        parentPath={entry.path}
                                        type={creatingNew!.type}
                                        depth={depth + 1}
                                        insertIndex={insertIndex}
                                        onComplete={handleCreationComplete}
                                    />
                                );
                            }
                            
                            return elements;
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
