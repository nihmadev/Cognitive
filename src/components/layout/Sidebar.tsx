import { useState, useRef, useEffect, useCallback, type ReactElement } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { ChevronRight, ChevronDown, FilePlus2, FolderPlus, RotateCw, ChevronsDownUp, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { OutlineSection } from './Outline';
import { NpmScriptsSection } from './NPM';
import { TimelineSection } from './Timeline';
import { tauriApi } from '../../lib/tauri-api';
import { OpenEditorsSection } from './Sidebar/OpenEditorsSection';
import { ExplorerMenu, type ExplorerSection } from './Sidebar/ExplorerMenu';
import { FileItem } from './Sidebar/FileItem';
import { NewItemInput } from './Sidebar/NewItemInput';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import styles from './Sidebar/SidebarLayout.module.css';

export const Sidebar = () => {
    const { fileStructure, currentWorkspace, setWorkspace, refreshWorkspace, closeFile, fileSystemVersion } = useProjectStore();
    const { sidebarWidth, setSidebarWidth } = useUIStore();
    
    // Initialize resizable panel for sidebar
    const resizablePanel = useResizablePanel({
        defaultWidth: sidebarWidth,
        minWidth: 200,
        maxWidth: 500,
        direction: 'right',
        onResize: setSidebarWidth
    });
    const [isProjectOpen, setIsProjectOpen] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [creatingNew, setCreatingNew] = useState<{ parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null>(null);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [enabledSections, setEnabledSections] = useState<Set<ExplorerSection>>(
        new Set(['folders'])
    );
    const treeRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const handleToggleSection = useCallback((section: ExplorerSection) => {
        setEnabledSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    const openFolder = async () => {
        try {
            const selectedFolder = await tauriApi.openFolderDialog();
            if (selectedFolder) {
                setWorkspace(selectedFolder);
            }
        } catch (error) {
            console.error("Failed to open folder dialog:", error);
        }
    };

    const handleToggleExpand = useCallback((path: string, isOpen: boolean) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (isOpen) {
                next.add(path);
            } else {
                next.delete(path);
            }
            return next;
        });
    }, []);

    const handleCollapseAll = useCallback(() => {
        setExpandedFolders(new Set());
    }, []);

    const handleRefresh = useCallback(async () => {
        await refreshWorkspace();
        // Keep expanded folders but they will reload their children
    }, [refreshWorkspace]);

    const handleNewFile = useCallback(() => {
        if (currentWorkspace) {
            setCreatingNew({ parentPath: currentWorkspace, type: 'file' });
        }
    }, [currentWorkspace]);

    const handleNewFolder = useCallback(() => {
        if (currentWorkspace) {
            setCreatingNew({ parentPath: currentWorkspace, type: 'folder' });
        }
    }, [currentWorkspace]);

    const handleCreationComplete = useCallback(() => {
        setCreatingNew(null);
    }, []);

    const handleSelect = useCallback((path: string) => {
        setSelectedPath(path);
    }, []);

    const handleDelete = useCallback(async () => {
        if (!selectedPath) return;
        
        const name = selectedPath.split(/[\\/]/).pop() || selectedPath;
        const isDir = fileStructure.some(e => e.path === selectedPath && e.is_dir) ||
            expandedFolders.has(selectedPath);
        
        const confirmMessage = isDir 
            ? `Delete folder "${name}" and all its contents?`
            : `Delete file "${name}"?`;
        
        if (!window.confirm(confirmMessage)) return;
        
        try {
            await tauriApi.deletePath(selectedPath);
            closeFile(selectedPath);
            setSelectedPath(null);
            await refreshWorkspace();
        } catch (e) {
            console.error("Failed to delete:", e);
        }
    }, [selectedPath, fileStructure, expandedFolders, closeFile, refreshWorkspace]);
    
    // Sync store width with hook when it changes
    useEffect(() => {
        if (Math.abs(resizablePanel.width - sidebarWidth) > 1) {
            setSidebarWidth(resizablePanel.width);
        }
    }, [resizablePanel.width, sidebarWidth, setSidebarWidth]);

    // Handle Delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' && selectedPath && !creatingNew) {
                e.preventDefault();
                handleDelete();
            }
        };

        const treeElement = treeRef.current;
        if (treeElement) {
            treeElement.addEventListener('keydown', handleKeyDown);
            return () => treeElement.removeEventListener('keydown', handleKeyDown);
        }
    }, [selectedPath, creatingNew, handleDelete]);

    // Double click on empty space to create file (Shift+DoubleClick for folder)
    const handleTreeDoubleClick = useCallback((e: React.MouseEvent) => {
        // Check if clicked on empty space (not on a file item)
        const target = e.target as HTMLElement;
        const isEmptyArea = target.classList.contains(styles.tree) || 
                           target.classList.contains(styles.treeEmpty) ||
                           target.classList.contains(styles.treeClickArea);
        
        if (isEmptyArea && currentWorkspace) {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the closest folder and insert position to the click position
            const findClosestFolderAndPosition = (): { parentPath: string; insertIndex?: number } => {
                const treeContainer = treeRef.current;
                if (!treeContainer) return { parentPath: currentWorkspace };
                
                // Get click position relative to the tree container
                const treeRect = treeContainer.getBoundingClientRect();
                const clickY = e.clientY - treeRect.top;
                
                let closestElement: HTMLElement | null = null;
                let closestDistance = Infinity;
                let insertIndex: number | undefined;
                
                // Find all visible file/folder elements
                const allFileElements = treeContainer.querySelectorAll('[data-file-path]');
                
                if (allFileElements) {
                    const elementsWithPositions: Array<{ element: HTMLElement; rect: DOMRect; top: number; center: number; filePath: string; isFolder: boolean; index: number }> = [];
                    
                    // Collect positions of all visible elements
                    for (let i = 0; i < allFileElements.length; i++) {
                        const fileElement = allFileElements[i] as HTMLElement;
                        const elementRect = fileElement.getBoundingClientRect();
                        const elementTop = elementRect.top - treeRect.top;
                        const elementCenterY = elementTop + elementRect.height / 2;
                        
                        // Only consider visible elements
                        if (elementTop >= 0 && elementTop <= treeRect.height) {
                            const filePath = fileElement.getAttribute('data-file-path') || '';
                            const isFolder = fileElement.getAttribute('data-is-dir') === 'true';
                            
                            elementsWithPositions.push({
                                element: fileElement,
                                rect: elementRect,
                                top: elementTop,
                                center: elementCenterY,
                                filePath,
                                isFolder,
                                index: i
                            });
                        }
                    }
                    
                    // Find the closest element to the click position
                    for (const item of elementsWithPositions) {
                        const distance = Math.abs(clickY - item.center);
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestElement = item.element;
                            
                            // Determine insert index based on click position relative to element
                            if (clickY < item.center) {
                                // Click is above the element center - insert before
                                insertIndex = item.index;
                            } else {
                                // Click is below the element center - insert after
                                insertIndex = item.index + 1;
                            }
                        }
                    }
                }
                
                // Debug logging
                console.log('Click Y:', clickY, 'Tree height:', treeRect.height, 'Elements found:', allFileElements?.length);
                console.log('Closest element:', closestElement?.getAttribute('data-file-path'), 'Distance:', closestDistance, 'Insert index:', insertIndex);
                
                if (closestElement) {
                    const filePath = closestElement.getAttribute('data-file-path');
                    const isFolder = closestElement.getAttribute('data-is-dir') === 'true';
                    
                    if (filePath) {
                        if (isFolder) {
                            return { parentPath: filePath, insertIndex };
                        } else {
                            // If it's a file, get its parent directory
                            const lastSlash = filePath.lastIndexOf('/');
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
            
            // Expand the parent folder if it's not already expanded
            if (parentPath !== currentWorkspace) {
                setExpandedFolders(prev => {
                    const next = new Set(prev);
                    next.add(parentPath);
                    return next;
                });
            }
            
            setCreatingNew({ parentPath, type, insertIndex });
        }
    }, [currentWorkspace]);

    const projectName = currentWorkspace ? currentWorkspace.split(/[\\/]/).pop() : 'No Folder';

    return (
        <div 
            ref={resizablePanel.panelRef}
            className={styles.sidebar}
            style={{ width: resizablePanel.width }}
        >
            <div 
                className={clsx(styles.resizeHandle, resizablePanel.isResizing && styles.isResizing)}
                onMouseDown={resizablePanel.handleMouseDown}
            />
            <div className={styles.header}>
                <span>Explorer</span>
                {currentWorkspace && (
                    <div className={styles.headerActions}>
                        <button 
                            className={styles.headerActionBtn} 
                            title="New File"
                            onClick={handleNewFile}
                        >
                            <FilePlus2 size={14} />
                        </button>
                        <button 
                            className={styles.headerActionBtn} 
                            title="New Folder"
                            onClick={handleNewFolder}
                        >
                            <FolderPlus size={14} />
                        </button>
                        <button
                            className={styles.headerActionBtn}
                            title="Refresh Explorer"
                            onClick={handleRefresh}
                        >
                            <RotateCw size={14} />
                        </button>
                        <button 
                            className={styles.headerActionBtn} 
                            title="Collapse Folders"
                            onClick={handleCollapseAll}
                        >
                            <ChevronsDownUp size={14} />
                        </button>
                        <div className={styles.menuWrapper}>
                            <button 
                                ref={menuButtonRef}
                                className={clsx(styles.headerActionBtn, isMenuOpen && styles.headerActionBtnActive)} 
                                title="Views and More Actions..."
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            <ExplorerMenu
                                isOpen={isMenuOpen}
                                onClose={() => setIsMenuOpen(false)}
                                enabledSections={enabledSections}
                                onToggleSection={handleToggleSection}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.body}>
                {enabledSections.has('openEditors') && <OpenEditorsSection />}
                {currentWorkspace ? (
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
                                {/* Render root level with insert position support */}
                                {(() => {
                                    const elements: ReactElement[] = [];
                                    
                                    fileStructure.forEach((entry: any, index: number) => {
                                        // Insert NewItemInput at the correct position if creating at root level
                                        if (creatingNew?.parentPath === currentWorkspace && creatingNew.insertIndex === index) {
                                            elements.push(
                                                <NewItemInput
                                                    key="new-item-input"
                                                    parentPath={currentWorkspace!}
                                                    type={creatingNew.type}
                                                    depth={0}
                                                    insertIndex={creatingNew.insertIndex}
                                                    onComplete={async (name) => {
                                                        handleCreationComplete();
                                                        if (name) {
                                                            await refreshWorkspace();
                                                        }
                                                    }}
                                                />
                                            );
                                        }
                                        
                                        // Add the regular file item
                                        elements.push(
                                            <FileItem 
                                                key={`${entry.path}-${fileSystemVersion}`} 
                                                entry={entry}
                                                expandedFolders={expandedFolders}
                                                onToggleExpand={handleToggleExpand}
                                                onCreateNew={(parentPath, type, insertIndex) => setCreatingNew({ parentPath, type, insertIndex })}
                                                creatingNew={creatingNew}
                                                onCreationComplete={handleCreationComplete}
                                                selectedPath={selectedPath}
                                                onSelect={handleSelect}
                                                fileSystemVersion={fileSystemVersion}
                                            />
                                        );
                                    });
                                    
                                    // If insert index is at the end or no insert index specified for root level
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
                                                    handleCreationComplete();
                                                    if (name) {
                                                        await refreshWorkspace();
                                                    }
                                                }}
                                            />
                                        );
                                    }
                                    
                                    return elements;
                                })()}
                                {fileStructure.length === 0 && !creatingNew && (
                                    <div className={styles.treeEmpty}>
                                        Double-click to create a file
                                    </div>
                                )}
                                {/* Clickable empty area at the bottom */}
                                <div 
                                    className={styles.treeClickArea}
                                    title="Double-click: new file, Shift+Double-click: new folder"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.noWorkspace}>
                        <p className={styles.noWorkspaceText}>You have not yet opened a folder.</p>
                        <button
                            onClick={openFolder}
                            className={styles.openFolderBtn}
                        >
                            Open Folder
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom sections - Outline, NPM Scripts and Timeline */}
            <div className={styles.bottomSections}>
                {enabledSections.has('outline') && <OutlineSection />}
                {enabledSections.has('npmScripts') && <NpmScriptsSection />}
                {enabledSections.has('timeline') && <TimelineSection />}
            </div>
        </div>
    );
};
