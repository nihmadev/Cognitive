import { useState, useRef, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileItem } from './FileItem';
import { NewItemInput } from './NewItemInput';
import styles from './SidebarLayout.module.css';

interface ProjectExplorerProps {
    currentWorkspace: string;
    fileStructure: any[];
    expandedFolders: Set<string>;
    onToggleExpand: (path: string, isOpen: boolean) => void;
    creatingNew: { parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null;
    setCreatingNew: (value: { parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null) => void;
    onCreationComplete: () => void;
    selectedPath: string | null;
    onSelect: (path: string) => void;
    onDelete: () => void; // Pass the delete handler from parent or implement here? Parent has it now.
    fileSystemVersion: number;
    refreshWorkspace: () => Promise<void>;
}

export const ProjectExplorer = ({
    currentWorkspace,
    fileStructure,
    expandedFolders,
    onToggleExpand,
    creatingNew,
    setCreatingNew,
    onCreationComplete,
    selectedPath,
    onSelect,
    onDelete,
    fileSystemVersion,
    refreshWorkspace
}: ProjectExplorerProps) => {
    const [isProjectOpen, setIsProjectOpen] = useState(true);
    const treeRef = useRef<HTMLDivElement>(null);

    const projectName = currentWorkspace ? currentWorkspace.split(/[\\/]/).pop() : 'No Folder';

    // Handle keydown for delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' && selectedPath && !creatingNew) {
                e.preventDefault();
                onDelete();
            }
        };

        const treeElement = treeRef.current;
        if (treeElement) {
            treeElement.addEventListener('keydown', handleKeyDown);
            return () => treeElement.removeEventListener('keydown', handleKeyDown);
        }
    }, [selectedPath, creatingNew, onDelete]);


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

                let closestElement: HTMLElement | null = null;
                let closestDistance = Infinity;
                let insertIndex: number | undefined;

                const allFileElements = treeContainer.querySelectorAll('[data-file-path]');

                if (allFileElements) {
                    const elementsWithPositions: Array<{ element: HTMLElement; center: number; filePath: string; isFolder: boolean; index: number }> = [];

                    for (let i = 0; i < allFileElements.length; i++) {
                        const fileElement = allFileElements[i] as HTMLElement;
                        const elementRect = fileElement.getBoundingClientRect();
                        const elementTop = elementRect.top - treeRect.top;
                        const elementCenterY = elementTop + elementRect.height / 2;

                        if (elementTop >= 0 && elementTop <= treeRect.height) {
                            const filePath = fileElement.getAttribute('data-file-path') || '';
                            const isFolder = fileElement.getAttribute('data-is-dir') === 'true';

                            elementsWithPositions.push({
                                element: fileElement,
                                center: elementCenterY,
                                filePath,
                                isFolder,
                                index: i
                            });
                        }
                    }

                    for (const item of elementsWithPositions) {
                        const distance = Math.abs(clickY - item.center);

                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestElement = item.element;

                            if (clickY < item.center) {
                                insertIndex = item.index;
                            } else {
                                insertIndex = item.index + 1;
                            }
                        }
                    }
                }

                if (closestElement) {
                    const filePath = closestElement.getAttribute('data-file-path');
                    const isFolder = closestElement.getAttribute('data-is-dir') === 'true';

                    if (filePath) {
                        if (isFolder) {
                            return { parentPath: filePath, insertIndex };
                        } else {
                            const lastSlash = filePath.lastIndexOf('/'); // Note: Windows paths might need regex split, but typically internal paths are normalized or we should check separator
                            // The original code used lastIndexOf('/') which might be risky if paths are backslashes, strictly speaking.
                            // But let's keep original logic. original code had: filePath.lastIndexOf('/')
                            // Actually original code had: const name = selectedPath.split(/[\\/]/).pop()
                            // But for parent path calculation:
                            // filePath.substring(0, lastSlash)
                            if (lastSlash > 0) {
                                return { parentPath: filePath.substring(0, lastSlash), insertIndex };
                            }
                        }
                    }
                }

                return { parentPath: currentWorkspace };
            };

            const { parentPath, insertIndex } = findClosestFolderAndPosition();
            const type = e.shiftKey ? 'folder' : 'file';

            if (parentPath !== currentWorkspace) {
                // We need to expand the folder we are creating in, if we clicked into it
                // But wait, if we clicked empty area, we are generally creating at root or closest folder.
                // The original logic updated expandedFolders here.
                // Since expandedFolders is passed as prop, we need a way to update it.
                // We passed `onToggleExpand`.
                onToggleExpand(parentPath, true);
            }

            setCreatingNew({ parentPath, type, insertIndex });
        }
    }, [currentWorkspace, onToggleExpand, setCreatingNew]);

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
                    selectedPath={selectedPath}
                    onSelect={onSelect}
                    fileSystemVersion={fileSystemVersion}
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
                />
            );
        }

        return elements;
    }, [fileStructure, fileSystemVersion, creatingNew, currentWorkspace, expandedFolders, onToggleExpand, onCreationComplete, selectedPath, onSelect, refreshWorkspace, setCreatingNew]);

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
                    onDoubleClick={handleTreeDoubleClick}
                    tabIndex={0}
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
