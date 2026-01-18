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
    selectedPath: string | null;
    onSelect: (path: string) => void;
    fileSystemVersion?: number;
}

export const FileItem = memo(({
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


    const folderDiagnostics = useFolderHierarchyDiagnostics(entry.path, entry.is_dir);


    const fileDiagnostics = useFileDiagnosticStatus(entry.path, entry.is_dir);


    const gitStatus = useFileGitStatus(entry.path, entry.is_dir);


    const { hasError, hasWarning } = entry.is_dir ? folderDiagnostics : fileDiagnostics;

    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(entry.name);
    const [gitStatusClassName, setGitStatusClassName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const isOpen = expandedFolders.has(entry.path);
    const isActive = activeFile === entry.path;
    const isSelected = selectedPath === entry.path;
    const isCreatingHere = creatingNew?.parentPath === entry.path;
    const insertIndex = creatingNew?.insertIndex;

    const loadChildren = useCallback(async (force: boolean = false) => {
        if (entry.is_dir && isOpen) {

            if (force || children.length === 0) {
                try {
                    const files = await tauriApi.readDir(entry.path);
                    setChildren(files);
                } catch (e) {
                    console.error("Failed to read dir", e);
                }
            }
        }
    }, [entry.is_dir, entry.path, children.length, isOpen]);

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

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRenaming) return;

        if (entry.is_dir) {
            // Сначала переключаем состояние папки, потом выделяем
            onToggleExpand?.(entry.path, !isOpen);
            onSelect(entry.path);
        } else {
            onSelect(entry.path);
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


            const renameResult = await tauriApi.renameFileWithResult(entry.path, newPath);


            if (renameResult.was_file) {
                updateFilePath(renameResult.old_path, renameResult.new_path);
            }


            await refreshWorkspace();
        } catch (error) {
            console.error('Failed to rename:', error);
        } finally {
            setIsRenaming(false);
        }
    };


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
                setChildren(files);
            } catch (e) {
                console.error("Failed to refresh dir", e);
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
                title={`${entry.path}${gitStatus.status ? ` • ${gitStatus.status === 'modified' ? 'Modified' : gitStatus.status === 'untracked' ? 'Untracked' : gitStatus.status === 'deleted' ? 'Deleted' : gitStatus.status === 'staged' ? 'Staged' : gitStatus.status === 'conflicted' ? 'Conflicted' : ''}` : ''}`}
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
                            gitStatusClassName
                        )}>
                            {entry.name}
                        </span>
                        { }
                        <GitStatusIndicator
                            status={gitStatus}
                            onClassName={setGitStatusClassName}
                        />
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
                                        selectedPath={selectedPath}
                                        onSelect={onSelect}
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
        prevProps.selectedPath !== nextProps.selectedPath ||
        prevProps.fileSystemVersion !== nextProps.fileSystemVersion) {
        return false;
    }

    // Creating new matches?
    if (prevProps.creatingNew?.parentPath !== nextProps.creatingNew?.parentPath ||
        prevProps.creatingNew?.type !== nextProps.creatingNew?.type ||
        prevProps.creatingNew?.insertIndex !== nextProps.creatingNew?.insertIndex) {
        return false;
    }

    // Expanded state logic
    const wasExpanded = prevProps.expandedFolders.has(prevProps.entry.path);
    const isExpanded = nextProps.expandedFolders.has(nextProps.entry.path);

    // If expansion status for THIS folder changed, update
    if (wasExpanded !== isExpanded) return false;

    // If currently expanded, we MUST update if the Set object changed diffrently to propagate to children
    // We compare reference because Set is always recreated on change in Sidebar
    if (isExpanded && prevProps.expandedFolders !== nextProps.expandedFolders) {
        return false;
    }

    // Otherwise, it is collapsed and status didn't change, so we can safely skip re-render
    // (Children are not rendered, so they don't need the new Set)
    return true;
});
