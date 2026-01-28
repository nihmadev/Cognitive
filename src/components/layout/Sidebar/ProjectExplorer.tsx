import { useState, useRef, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileItem } from './FileItem';
import { NewItemInput } from './NewItemInput';
import styles from './SidebarLayout.module.css';
import { useProjectStore } from '../../../store/projectStore';

interface ProjectExplorerProps {
    currentWorkspace: string;
    fileStructure: any[];
    expandedFolders: Set<string>;
    onToggleExpand: (path: string, isOpen: boolean) => void;
    creatingNew: { parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null;
    setCreatingNew: (value: { parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null) => void;
    onCreationComplete: () => void;
    selectedPaths: Set<string>;
    focusedPath: string | null;
    setFocusedPath: (path: string | null) => void;
    onSelect: (path: string, isCtrlClick?: boolean) => void;
    onDelete: () => void; // Pass the delete handler from parent or implement here? Parent has it now.
    fileSystemVersion: number;
    refreshWorkspace: () => Promise<void>;
    onOpenFile?: (path: string) => void;
}

export const ProjectExplorer = ({
    currentWorkspace,
    fileStructure,
    expandedFolders,
    onToggleExpand,
    creatingNew,
    setCreatingNew,
    onCreationComplete,
    selectedPaths,
    focusedPath,
    setFocusedPath,
    onSelect,
    onDelete,
    fileSystemVersion,
    refreshWorkspace,
    onOpenFile
}: ProjectExplorerProps) => {
    const [isProjectOpen, setIsProjectOpen] = useState(true);
    const treeRef = useRef<HTMLDivElement>(null);
    const { loadedFolders } = useProjectStore();

    const projectName = currentWorkspace ? currentWorkspace.split(/[\\/]/).pop() : 'No Folder';

    // Helper to find entry by path in the tree
    const findEntry = useCallback((path: string): any | null => {
        const normalize = (p: string) => p.replace(/\\/g, '/');
        const targetPath = normalize(path);

        const search = (entries: any[]): any | null => {
            for (const entry of entries) {
                const entryNormalized = normalize(entry.path);
                if (entryNormalized === targetPath) return entry;
                if (entry.is_dir && (expandedFolders.has(entryNormalized) || expandedFolders.has(entry.path) || loadedFolders[entry.path])) {
                    const children = loadedFolders[entry.path] || entry.children || [];
                    const found = search(children);
                    if (found) return found;
                }
            }
            return null;
        };

        return search(fileStructure);
    }, [fileStructure, expandedFolders, loadedFolders]);

    // Helper function to handle Enter key
    const handleEnterKey = useCallback((path: string) => {
        const entry = findEntry(path);
        if (!entry) return;
        
        if (entry.is_dir) {
            // Toggle folder expansion
            const isExpanded = expandedFolders.has(path);
            onToggleExpand(path, !isExpanded);
        } else {
            // Open file
            onOpenFile?.(path);
        }
        
        // Also select the item
        onSelect(path);
    }, [findEntry, expandedFolders, onToggleExpand, onOpenFile, onSelect]);

    // Handle keydown for delete, CTRL+A
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // CRITICAL: Stop EVERYTHING immediately to prevent any other component from reacting
            // This is especially important for the Sidebar parent which might have global listeners
            
            // List of keys we handle
            const handledKeys = ['Enter', 'Delete', 'a'];
            const isCtrlA = (e.ctrlKey || e.metaKey) && e.key === 'a';
            
            if (!handledKeys.includes(e.key) && !isCtrlA) return;

            // Only handle if focus is within the explorer tree or if no input is focused
            const activeElement = document.activeElement;
            const treeElement = treeRef.current;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.getAttribute('contenteditable') === 'true'
            );
            
            if (isInputFocused) return;
            
            // We are handling this key, stop others
            e.preventDefault();
            e.stopImmediatePropagation();
            
            if (e.key === 'Delete' && selectedPaths.size > 0 && !creatingNew) {
                onDelete();
            } else if (isCtrlA) {
                // Select all files in the file structure
                const allFilePaths: string[] = [];
                const collectPaths = (entries: any[]) => {
                    entries.forEach(entry => {
                        allFilePaths.push(entry.path);
                    });
                };
                collectPaths(fileStructure);
                
                // Clear current selection and select all
                onSelect('clear-all');
                allFilePaths.forEach(path => {
                    onSelect(path, true);
                });
            } else if (e.key === 'Enter') {
                if (focusedPath) {
                    handleEnterKey(focusedPath);
                } else if (selectedPaths.size > 0) {
                    const firstSelected = Array.from(selectedPaths)[0];
                    handleEnterKey(firstSelected);
                }
            }
        };

        const treeElement = treeRef.current;
        if (treeElement) {
            treeElement.addEventListener('keydown', handleKeyDown);
            return () => treeElement.removeEventListener('keydown', handleKeyDown);
        }
    }, [selectedPaths, creatingNew, onDelete, fileStructure, onSelect, focusedPath, setFocusedPath, handleEnterKey, expandedFolders]);


    const handleTreeClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isEmptyArea = target.classList.contains(styles.tree) ||
            target.classList.contains(styles.treeEmpty) ||
            target.classList.contains(styles.treeClickArea);

        if (isEmptyArea && (selectedPaths.size > 0 || focusedPath)) {
            e.preventDefault();
            e.stopPropagation();
            onSelect('clear-all');
        }
    }, [selectedPaths, focusedPath, onSelect]);

    const handleTreeDoubleClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isEmptyArea = target.classList.contains(styles.tree) ||
            target.classList.contains(styles.treeEmpty) ||
            target.classList.contains(styles.treeClickArea);

        if (isEmptyArea && currentWorkspace) {
            e.preventDefault();
            e.stopPropagation();

            const findClosestFolderAndPosition = (): { parentPath: string; insertIndex?: number } => {
                const treeContainer = treeRef.current;
                if (!treeContainer) return { parentPath: currentWorkspace };

                const treeRect = treeContainer.getBoundingClientRect();
                const clickY = e.clientY - treeRect.top;

                let closestPath: string | null = null;
                let closestDistance = Infinity;
                let isBelow = false;

                // We still need to check DOM positions to know where the user clicked relative to items
                const allFileElements = treeContainer.querySelectorAll('[data-file-path]');
                
                if (allFileElements.length === 0) return { parentPath: currentWorkspace };

                for (let i = 0; i < allFileElements.length; i++) {
                    const fileElement = allFileElements[i] as HTMLElement;
                    const elementRect = fileElement.getBoundingClientRect();
                    const elementTop = elementRect.top - treeRect.top;
                    const elementCenterY = elementTop + elementRect.height / 2;
                    
                    const distance = Math.abs(clickY - elementCenterY);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPath = fileElement.getAttribute('data-file-path');
                        isBelow = clickY > elementCenterY;
                    }
                }

                if (closestPath) {
                    const entry = findEntry(closestPath);
                    if (entry) {
                        if (entry.is_dir) {
                            return { parentPath: entry.path, insertIndex: isBelow ? 0 : undefined };
                        } else {
                            const lastSlash = Math.max(entry.path.lastIndexOf('/'), entry.path.lastIndexOf('\\'));
                            const parentPath = lastSlash > 0 ? entry.path.substring(0, lastSlash) : currentWorkspace;
                            return { parentPath, insertIndex: undefined };
                        }
                    }
                }

                return { parentPath: currentWorkspace };
            };

            // Проверяем, есть ли выделенные элементы
            if (selectedPaths.size > 0) {
                const selectedPath = Array.from(selectedPaths)[0];
                const isDir = fileStructure.some(e => e.path === selectedPath && e.is_dir) ||
                    expandedFolders.has(selectedPath);
                
                const parentPath = isDir ? selectedPath : selectedPath.substring(0, Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\')));
                const type = e.shiftKey ? 'folder' : 'file';

                if (parentPath !== currentWorkspace) {
                    onToggleExpand(parentPath, true);
                }

                setCreatingNew({ parentPath, type });
            } else {
                const { parentPath, insertIndex } = findClosestFolderAndPosition();
                const type = e.shiftKey ? 'folder' : 'file';

                if (parentPath !== currentWorkspace) {
                    onToggleExpand(parentPath, true);
                }

                setCreatingNew({ parentPath, type, insertIndex });
            }
        }
    }, [currentWorkspace, onToggleExpand, setCreatingNew, selectedPaths, fileStructure, expandedFolders, findEntry]);

    const fileTreeElements = useMemo(() => {
        const elements: ReactElement[] = [];

        fileStructure.forEach((entry: any, index: number) => {
            if (creatingNew?.parentPath === currentWorkspace && creatingNew.insertIndex === index) {
                elements.push(
                    <NewItemInput
                        key="new-item-input"
                        parentPath={currentWorkspace!}
                        type={creatingNew.type}
                        depth={0}
                        insertIndex={creatingNew.insertIndex}
                        onComplete={async (name) => {
                            onCreationComplete();
                            if (name) {
                                await refreshWorkspace();
                            }
                        }}
                        onOpenFile={onOpenFile}
                    />
                );
            }

            elements.push(
                <FileItem
                    key={entry.path}
                    entry={entry}
                    expandedFolders={expandedFolders}
                    onToggleExpand={onToggleExpand}
                    onCreateNew={(parentPath, type, insertIndex) => setCreatingNew({ parentPath, type, insertIndex })}
                    creatingNew={creatingNew}
                    onCreationComplete={onCreationComplete}
                    selectedPaths={selectedPaths}
                    focusedPath={focusedPath}
                    onSelect={onSelect}
                    fileSystemVersion={fileSystemVersion}
                    onOpenFile={onOpenFile}
                />
            );
        });

        if (creatingNew?.parentPath === currentWorkspace &&
            (creatingNew.insertIndex === undefined || creatingNew.insertIndex >= fileStructure.length)) {
            elements.push(
                <NewItemInput
                    key="new-item-input"
                    parentPath={currentWorkspace!}
                    type={creatingNew.type}
                    depth={0}
                    insertIndex={creatingNew.insertIndex}
                    onComplete={async (name) => {
                        onCreationComplete();
                        if (name) {
                            await refreshWorkspace();
                        }
                    }}
                    onOpenFile={onOpenFile}
                />
            );
        }

        return elements;
    }, [fileStructure, fileSystemVersion, creatingNew, currentWorkspace, expandedFolders, onToggleExpand, onCreationComplete, selectedPaths, onSelect, refreshWorkspace, setCreatingNew, focusedPath, onOpenFile]);

    return (
        <div className={styles.section}>
            <div
                className={styles.projectHeader}
                onClick={() => setIsProjectOpen(!isProjectOpen)}
            >
                <div className={styles.sectionTitle}>
                    <span className={styles.chev}>
                        {isProjectOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span>{projectName}</span>
                </div>
            </div>

            {isProjectOpen && (
                <div
                    ref={treeRef}
                    className={styles.tree}
                    onClick={handleTreeClick}
                    onDoubleClick={handleTreeDoubleClick}
                    tabIndex={0}
                    data-explorer-tree="true"
                >
                    {fileTreeElements}
                    {fileStructure.length === 0 && !creatingNew && (
                        <div className={styles.treeEmpty}>
                            Double-click to create a file
                        </div>
                    )}
                    <div
                        className={styles.treeClickArea}
                        title="Double-click: new file, Shift+Double-click: new folder"
                    />
                </div>
            )}
        </div>
    );
};
