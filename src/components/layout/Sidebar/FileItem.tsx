import { useState, useEffect, useCallback, type ReactElement, useRef, memo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getFileIcon, getFolderIcon } from '../../../utils/fileIcons';
import { tauriApi } from '../../../lib/tauri-api';
import { useProjectStore } from '../../../store/projectStore';
import { useFolderHierarchyDiagnostics } from './useFolderHierarchyDiagnostics';
import { useFileDiagnosticStatus } from './useFileDiagnosticStatus';
import { useFileGitStatus } from './useFileGitStatus';
import { useFolderGitStatus } from './useFolderGitStatus';
import { GitStatusIndicator } from './GitStatusIndicator';
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
    selectedPaths: Set<string>;
    focusedPath?: string | null;
    onSelect: (path: string, isCtrlClick?: boolean) => void;
    fileSystemVersion?: number;
    onOpenFile?: (path: string) => void;
}

export const FileItem = memo(({
    entry,
    depth = 0,
    expandedFolders,
    onToggleExpand,
    onCreateNew,
    creatingNew,
    onCreationComplete,
    selectedPaths,
    focusedPath,
    onSelect,
    fileSystemVersion = 0,
    onOpenFile
}: FileItemProps) => {
    const { openFile, activeFile, refreshWorkspace, updateFilePath, loadedFolders, setLoadedFolder } = useProjectStore();
    const children = loadedFolders[entry.path] || entry.children || [];


    const folderDiagnostics = useFolderHierarchyDiagnostics(entry.path, entry.is_dir);


    const fileDiagnostics = useFileDiagnosticStatus(entry.path, entry.is_dir);


    const gitStatus = useFileGitStatus(entry.path, entry.is_dir);
    const folderGitStatus = useFolderGitStatus(entry.path, entry.is_dir);
    const rowRef = useRef<HTMLDivElement>(null);

    const { hasError, hasWarning } = entry.is_dir ? folderDiagnostics : fileDiagnostics;
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(entry.name);
    const [gitStatusClassName, setGitStatusClassName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const normalizedPath = entry.path.replace(/\\/g, '/');
    const isOpen = expandedFolders.has(normalizedPath) || expandedFolders.has(entry.path);
    const isActive = activeFile === entry.path || (activeFile && activeFile.replace(/\\/g, '/') === normalizedPath);
    const normalizedFocused = focusedPath ? focusedPath.replace(/\\/g, '/') : null;
    const isFocused = normalizedFocused && normalizedPath === normalizedFocused;
    const isSelected = selectedPaths.has(entry.path) || selectedPaths.has(normalizedPath) || !!isFocused;
    const isCreatingHere = creatingNew?.parentPath === entry.path;
    const insertIndex = creatingNew?.insertIndex;

    useEffect(() => {
        if (isFocused && rowRef.current) {
            // Use setImmediate or setTimeout to ensure DOM is updated after folder expansion
            const timer = setTimeout(() => {
                rowRef.current?.scrollIntoView({
                    behavior: 'auto',
                    block: 'nearest'
                });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isFocused, isOpen]); // Re-run when folder opens to keep focused item visible

    const loadChildren = useCallback(async (force: boolean = false) => {
        if (entry.is_dir && isOpen) {

            if (force || !loadedFolders[entry.path]) {
                try {
                    const files = await tauriApi.readDir(entry.path);
                    setLoadedFolder(entry.path, files);
                } catch (e) {
                }
            }
        }
    }, [entry.is_dir, entry.path, loadedFolders[entry.path], isOpen, setLoadedFolder]);

    useEffect(() => {
        if (isOpen && entry.is_dir) {
            loadChildren(false);
        }
    }, [isOpen, loadChildren, entry.is_dir]);


    useEffect(() => {
        if (isOpen && entry.is_dir) {
            loadChildren(true);
        }
    }, [fileSystemVersion, isOpen, entry.is_dir, loadChildren]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent event from bubbling
        e.stopPropagation();
        
        // This is important: we want the ProjectExplorer's tree container
        // to stay focused so it can receive KeyboardEvents
        const treeElement = rowRef.current?.closest('[data-explorer-tree]');
        if (treeElement instanceof HTMLElement) {
            treeElement.focus();
        }
        
        // Update selection and focus immediately
        onSelect(entry.path, e.ctrlKey || e.metaKey);
        
        // If it was a regular left click, handle toggling/opening
        if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            if (entry.is_dir) {
                onToggleExpand?.(entry.path, !isOpen);
            } else {
                openFile(entry.path);
            }
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
            // Use proper path separator for the current OS
            const pathSeparator = entry.path.includes('\\') ? '\\' : '/';
            const parentDir = entry.path.split(pathSeparator).slice(0, -1).join(pathSeparator);
            const newPath = `${parentDir}${pathSeparator}${newName}`;

            const renameResult = await tauriApi.renameFileWithResult(entry.path, newPath);

            if (renameResult.was_file) {
                updateFilePath(renameResult.old_path, renameResult.new_path);
            }

            await refreshWorkspace();
        } catch (error) {
            // Rename error
        } finally {
            setIsRenaming(false);
        }
    };


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ONLY handle F2 and Escape here, skip everything else
            // Navigation is handled by ProjectExplorer tree container
            if (isSelected && e.key === 'F2') {
                e.preventDefault();
                e.stopPropagation();
                handleStartRename();
            } else if (isRenaming && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setIsRenaming(false);
                setNewName(entry.name);
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture to intercept before tree
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isSelected, isRenaming, handleStartRename, entry.name]);


    useEffect(() => {
        const handleGlobalRename = () => {
            if (isSelected) {
                handleStartRename();
            }
        };

        window.addEventListener('start-rename', handleGlobalRename);
        return () => window.removeEventListener('start-rename', handleGlobalRename);
    }, [isSelected, handleStartRename]);


    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleCreationComplete = async (name: string | null) => {
        onCreationComplete();
        if (name) {

            try {
                const files = await tauriApi.readDir(entry.path);
                setLoadedFolder(entry.path, files);
            } catch (e) {
            }
            refreshWorkspace();
        }
    };

    return (
        <div className={styles.fileItemWrap}>
            { }
            {depth > 0 && entry.is_dir && isOpen && (
                <div
                    className={styles.indentationLine}
                    style={{ ['--depth' as any]: depth }}
                />
            )}
            <div
                ref={rowRef}
                className={clsx(
                    styles.fileRow,
                    isActive && styles.fileRowActive,
                    isSelected && styles.fileRowSelected,
                    isFocused && styles.fileRowFocused,
                    entry.is_dir && isOpen && styles.fileRowSticky,
                    entry.is_dir && isOpen && isActive && styles.fileRowStickyActive
                )}
                style={{ ['--depth' as any]: depth }}
                onMouseDown={handleMouseDown}
                data-file-path={entry.path}
                data-is-dir={entry.is_dir}
                onContextMenu={(e) => {
                    // Ensure item is selected on right click
                    if (!isSelected) {
                        onSelect(entry.path, false);
                    }
                }}
                title={(() => {
                    const parts = [entry.path];
                    
                    // Добавляем информацию о проблемах для файлов
                    if (!entry.is_dir && (fileDiagnostics.hasError || fileDiagnostics.hasWarning)) {
                        const errorCount = fileDiagnostics.errorCount || 0;
                        const warningCount = fileDiagnostics.warningCount || 0;
                        const details = [];
                        
                        if (errorCount > 0) {
                            details.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
                        }
                        if (warningCount > 0) {
                            details.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
                        }
                        
                        if (details.length > 0) {
                            parts.push(details.join(', '));
                        }
                    }
                    
                    // Добавляем Git статус
                    if (gitStatus.isIgnored || folderGitStatus.isIgnored) {
                        parts.push('● Ignored');
                    } else if (gitStatus.status) {
                        const statusMap: Record<string, string> = {
                            'modified': 'Modified',
                            'untracked': 'Untracked',
                            'deleted': 'Deleted',
                            'staged': 'Staged',
                            'conflicted': 'Conflicted'
                        };
                        const statusText = statusMap[gitStatus.status];
                        if (statusText) {
                            parts.push(statusText);
                        }
                    }
                    
                    return parts.join(' • ');
                })()}
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
                    <>
                        <span className={clsx(
                            styles.name,
                            hasError && styles.nameError,
                            !hasError && hasWarning && styles.nameWarning,
                            !entry.is_dir && hasError && styles.isFile,
                            !entry.is_dir && !hasError && hasWarning && styles.isFile,
                            (gitStatus.isIgnored || folderGitStatus.isIgnored) && styles.nameIgnored,
                            gitStatusClassName
                        )}>
                            {entry.name}
                        </span>
                        {!entry.is_dir && (hasError || hasWarning) && (
                            <span className={styles.statusContainer}>
                                {(() => {
                                    const errorCount = fileDiagnostics.errorCount || 0;
                                    const warningCount = fileDiagnostics.warningCount || 0;
                                    
                                    // Показываем количество ошибок, если они есть, иначе количество предупреждений
                                    const displayCount = errorCount > 0 ? errorCount : warningCount;
                                    const displayType = errorCount > 0 ? 'error' : 'warning';
                                    
                                    const tooltipParts = [];
                                    
                                    // Путь к файлу
                                    tooltipParts.push(entry.path);
                                    
                                    // Добавляем количество проблем
                                    const totalCount = errorCount + warningCount;
                                    if (totalCount === 1) {
                                        tooltipParts.push('1 problem in this file');
                                    } else if (totalCount > 1) {
                                        tooltipParts.push(`${totalCount} problems in this file`);
                                    }
                                    
                                    // Добавляем детализацию
                                    const details = [];
                                    if (errorCount > 0) {
                                        details.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
                                    }
                                    if (warningCount > 0) {
                                        details.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
                                    }
                                    if (details.length > 0) {
                                        tooltipParts.push(`(${details.join(', ')})`);
                                    }
                                    
                                    // Добавляем Git статус
                                    if (gitStatus.isIgnored) {
                                        tooltipParts.push('● Ignored');
                                    } else if (gitStatus.status) {
                                        const statusMap: Record<string, string> = {
                                            'modified': 'Modified',
                                            'untracked': 'Untracked',
                                            'deleted': 'Deleted',
                                            'staged': 'Staged',
                                            'conflicted': 'Conflicted'
                                        };
                                        const statusText = statusMap[gitStatus.status];
                                        if (statusText) {
                                            tooltipParts.push(statusText);
                                        }
                                    }
                                    
                                    const tooltipText = tooltipParts.join(' • ');
                                    
                                    return (
                                        <span 
                                            className={clsx(
                                                styles.diagnosticsCount,
                                                displayType === 'error' && styles.diagnosticsError,
                                                displayType === 'warning' && styles.diagnosticsWarning
                                            )}
                                            title={tooltipText}
                                        >
                                            {displayCount}
                                        </span>
                                    );
                                })()}
                                {gitStatus.status && (
                                    <span className={styles.statusSeparator}>,</span>
                                )}
                            </span>
                        )}
                        {entry.is_dir && folderGitStatus.status ? (
                            <GitStatusIndicator
                                status={folderGitStatus}
                                showDot={true}
                                isFile={false}
                                onClassName={setGitStatusClassName}
                            />
                        ) : (
                            <GitStatusIndicator
                                status={gitStatus}
                                showDot={true}
                                isFile={true}
                                onClassName={setGitStatusClassName}
                            />
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {isOpen && entry.is_dir && (
                    <motion.div
                        key="children"
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{
                            duration: 0.15,
                            ease: [0.4, 0.0, 0.2, 1]
                        }}
                        className={styles.childrenWrap}
                    >
                        { }
                        {(() => {
                            const elements: ReactElement[] = [];

                            children.forEach((child: any, index: number) => {

                                if (isCreatingHere && insertIndex === index) {
                                    elements.push(
                                        <NewItemInput
                                            key="new-item-input"
                                            parentPath={entry.path}
                                            type={creatingNew!.type}
                                            depth={depth + 1}
                                            insertIndex={insertIndex}
                                            onComplete={handleCreationComplete}
                                            onOpenFile={onOpenFile}
                                        />
                                    );
                                }


                                elements.push(
                                    <FileItem
                                        key={child.path}
                                        entry={child}
                                        depth={depth + 1}
                                        expandedFolders={expandedFolders}
                                        onToggleExpand={onToggleExpand}
                                        onCreateNew={onCreateNew}
                                        creatingNew={creatingNew}
                                        onCreationComplete={onCreationComplete}
                                        selectedPaths={selectedPaths}
                                        focusedPath={focusedPath}
                                        onSelect={onSelect}
                                        onOpenFile={onOpenFile}
                                    />
                                );
                            });


                            if (isCreatingHere && (insertIndex === undefined || insertIndex >= children.length)) {
                                elements.push(
                                    <NewItemInput
                                        key="new-item-input"
                                        parentPath={entry.path}
                                        type={creatingNew!.type}
                                        depth={depth + 1}
                                        insertIndex={insertIndex}
                                        onComplete={handleCreationComplete}
                                        onOpenFile={onOpenFile}
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
}, (prevProps, nextProps) => {
    // If key props changed, update
    if (prevProps.entry.path !== nextProps.entry.path ||
        prevProps.entry.name !== nextProps.entry.name ||
        prevProps.entry.is_dir !== nextProps.entry.is_dir ||
        prevProps.depth !== nextProps.depth ||
        prevProps.fileSystemVersion !== nextProps.fileSystemVersion ||
        prevProps.focusedPath !== nextProps.focusedPath) {
        return false;
    }

    // Creating new matches?
    if (prevProps.creatingNew?.parentPath !== nextProps.creatingNew?.parentPath ||
        prevProps.creatingNew?.type !== nextProps.creatingNew?.type ||
        prevProps.creatingNew?.insertIndex !== nextProps.creatingNew?.insertIndex) {
        return false;
    }

    // Selection state changed?
    const normalize = (p: string) => p.replace(/\\/g, '/');
    const prevNormalized = normalize(prevProps.entry.path);
    const nextNormalized = normalize(nextProps.entry.path);

    const prevSelected = prevProps.selectedPaths.has(prevProps.entry.path) || prevProps.selectedPaths.has(prevNormalized);
    const nextSelected = nextProps.selectedPaths.has(nextProps.entry.path) || nextProps.selectedPaths.has(nextNormalized);
    
    if (prevSelected !== nextSelected) {
        return false;
    }

    // If selection set changed and this item is selected, we need to update to reflect potential multiple selection changes
    if (nextSelected && prevProps.selectedPaths !== nextProps.selectedPaths) {
        return false;
    }

    // Expanded state logic
    const wasExpanded = prevProps.expandedFolders.has(prevNormalized) || prevProps.expandedFolders.has(prevProps.entry.path);
    const isExpanded = nextProps.expandedFolders.has(nextNormalized) || nextProps.expandedFolders.has(nextProps.entry.path);

    // If expansion status for THIS folder changed, update
    if (wasExpanded !== isExpanded) return false;

    // If currently expanded, we MUST update if the Set object changed differently to propagate to children
    // We compare reference because Set is always recreated on change in Sidebar
    if (isExpanded && prevProps.expandedFolders !== nextProps.expandedFolders) {
        return false;
    }

    // Otherwise, it is collapsed and status didn't change, so we can safely skip re-render
    // (Children are not rendered, so they don't need the new Set)
    return true;
});
