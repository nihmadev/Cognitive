import { useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useGitStore } from '../../store/gitStore';
import { useUndoRedoStore } from '../../store/undoRedoStore';
import clsx from 'clsx';
import { OutlineSection } from './Outline';
import { NpmScriptsSection } from './NPM';
import { TimelineSection } from './Timeline';
import { tauriApi } from '../../lib/tauri';
import { OpenEditorsSection } from './Sidebar/OpenEditorsSection';
import { type ExplorerSection } from './Sidebar/ExplorerMenu';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import styles from './Sidebar/SidebarLayout.module.css';
import { SidebarHeader } from './Sidebar/SidebarHeader';
import { ProjectExplorer } from './Sidebar/ProjectExplorer';
import { NoWorkspaceView } from './Sidebar/NoWorkspaceView';

export const Sidebar = () => {
    const { fileStructure, currentWorkspace, refreshWorkspace, closeFile, fileSystemVersion } = useProjectStore();
    const { sidebarWidth, setSidebarWidth } = useUIStore();
    const { refresh: refreshGitStatus } = useGitStore();
    const { addToDeletionHistory, undo, canUndo } = useUndoRedoStore();

    const resizablePanel = useResizablePanel({
        defaultWidth: sidebarWidth,
        minWidth: 200,
        maxWidth: 500,
        direction: 'right',
        onResize: setSidebarWidth
    });

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [creatingNew, setCreatingNew] = useState<{ parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null>(null);
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [focusedPath, setFocusedPath] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [enabledSections, setEnabledSections] = useState<Set<ExplorerSection>>(
        new Set(['folders'])
    );

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

    const handleToggleExpand = useCallback((path: string, isOpen: boolean) => {
        const normalizedPath = path.replace(/\\/g, '/');
        setExpandedFolders(prev => {
            const next = new Set(prev);
            // We store normalized paths for consistency
            if (isOpen) {
                next.add(normalizedPath);
            } else {
                // Remove both variants just in case
                next.delete(normalizedPath);
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
        if (currentWorkspace) {
            await refreshGitStatus(currentWorkspace);
        }
    }, [refreshWorkspace, refreshGitStatus, currentWorkspace]);

    const handleNewFile = useCallback(() => {
        if (currentWorkspace) {
            // Если есть выделенные элементы, создаем в их родительской папке
            if (selectedPaths.size > 0) {
                const selectedPath = Array.from(selectedPaths)[0];
                const isDir = fileStructure.some(e => e.path === selectedPath && e.is_dir) ||
                    expandedFolders.has(selectedPath);
                
                const parentPath = isDir ? selectedPath : selectedPath.substring(0, Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\')));
                setCreatingNew({ parentPath, type: 'file' });
            } else {
                setCreatingNew({ parentPath: currentWorkspace, type: 'file' });
            }
        }
    }, [currentWorkspace, selectedPaths, fileStructure, expandedFolders]);

    const handleNewFolder = useCallback(() => {
        if (currentWorkspace) {
            // Если есть выделенные элементы, создаем в их родительской папке
            if (selectedPaths.size > 0) {
                const selectedPath = Array.from(selectedPaths)[0];
                const isDir = fileStructure.some(e => e.path === selectedPath && e.is_dir) ||
                    expandedFolders.has(selectedPath);
                
                const parentPath = isDir ? selectedPath : selectedPath.substring(0, Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\')));
                setCreatingNew({ parentPath, type: 'folder' });
            } else {
                setCreatingNew({ parentPath: currentWorkspace, type: 'folder' });
            }
        }
    }, [currentWorkspace, selectedPaths, fileStructure, expandedFolders]);

    const handleCreationComplete = useCallback(() => {
        setCreatingNew(null);
    }, []);

    const handleSelect = useCallback((path: string, isCtrlClick: boolean = false) => {
        if (path === 'clear-all') {
            setSelectedPaths(new Set());
            setFocusedPath(null);
            return;
        }
        
        const normalizedPath = path.replace(/\\/g, '/');
        
        setSelectedPaths(prev => {
            const next = new Set(prev);
            if (isCtrlClick) {
                // Toggle selection on Ctrl+click
                if (next.has(normalizedPath) || next.has(path)) {
                    next.delete(normalizedPath);
                    next.delete(path);
                } else {
                    next.add(normalizedPath);
                }
            } else {
                // Single selection on regular click
                next.clear();
                next.add(normalizedPath);
            }
            return next;
        });
        
        // Always set focused path when selecting (use normalized)
        setFocusedPath(normalizedPath);
    }, []);

    const handleDelete = useCallback(async () => {
        if (selectedPaths.size === 0) return;

        const selectedPathsArray = Array.from(selectedPaths);
        const count = selectedPathsArray.length;
        
        if (count === 1) {
            // Single file/folder deletion
            const path = selectedPathsArray[0];
            const name = path.split(/[\\/]/).pop() || path;
            const isDir = fileStructure.some(e => e.path === path && e.is_dir) ||
                expandedFolders.has(path);

            const confirmMessage = isDir
                ? `Delete folder "${name}" and all its contents?`
                : `Delete file "${name}"?`;

            if (!window.confirm(confirmMessage)) return;

            try {
                // Capture contents before deletion for undo
                const content = await tauriApi.getFileContentsBeforeDeletion(path, isDir);
                
                // Get original parent path
                const originalParentPath = path.substring(0, path.lastIndexOf(/[\\/]/.exec(path)?.[0] || '/'));
                
                // Add to deletion history
                addToDeletionHistory({
                    path,
                    name,
                    isDirectory: isDir,
                    content: isDir ? undefined : (typeof content === 'string' ? content : ''),
                    children: isDir ? (Array.isArray(content) ? content : []) : undefined,
                    originalParentPath,
                    timestamp: Date.now()
                });

                await tauriApi.deletePath(path);
                closeFile(path);
                setSelectedPaths(new Set());
                await refreshWorkspace();
            } catch (e) {
            }
        } else {
            // Multiple files/folders deletion
            const confirmMessage = `Delete ${count} selected item${count !== 1 ? 's' : ''}?`;
            if (!window.confirm(confirmMessage)) return;

            try {
                // Capture contents for all selected paths before deletion
                for (const path of selectedPathsArray) {
                    const name = path.split(/[\\/]/).pop() || path;
                    const isDir = fileStructure.some(e => e.path === path && e.is_dir) ||
                        expandedFolders.has(path);
                    
                    try {
                        const content = await tauriApi.getFileContentsBeforeDeletion(path, isDir);
                        const originalParentPath = path.substring(0, path.lastIndexOf(/[\\/]/.exec(path)?.[0] || '/'));
                        
                        addToDeletionHistory({
                            path,
                            name,
                            isDirectory: isDir,
                            content: isDir ? undefined : (typeof content === 'string' ? content : ''),
                            children: isDir ? (Array.isArray(content) ? content : []) : undefined,
                            originalParentPath,
                            timestamp: Date.now()
                        });
                    } catch (error) {
                        // If we can't capture content, still add to history without it
                        const originalParentPath = path.substring(0, path.lastIndexOf(/[\\/]/.exec(path)?.[0] || '/'));
                        addToDeletionHistory({
                            path,
                            name,
                            isDirectory: isDir,
                            originalParentPath,
                            timestamp: Date.now()
                        });
                    }
                }

                // Delete all selected paths
                await Promise.all(selectedPathsArray.map(async (path) => {
                    await tauriApi.deletePath(path);
                    closeFile(path);
                }));
                setSelectedPaths(new Set());
                await refreshWorkspace();
            } catch (e) {
            }
        }
    }, [selectedPaths, fileStructure, expandedFolders, closeFile, refreshWorkspace, addToDeletionHistory]);

    useEffect(() => {
        if (Math.abs(resizablePanel.width - sidebarWidth) > 1) {
            setSidebarWidth(resizablePanel.width);
        }
    }, [resizablePanel.width, sidebarWidth, setSidebarWidth]);

    useEffect(() => {
        if (currentWorkspace) {
            refreshGitStatus(currentWorkspace);
        }
    }, [currentWorkspace, refreshGitStatus]);

    // Clear selection when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-file-path]') && !target.closest('[data-explorer-tree]')) {
                setSelectedPaths(new Set());
                setFocusedPath(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Handle CTRL+Z for undo (supports all keyboard layouts)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Use e.code instead of e.key to support all keyboard layouts
            // KeyZ is the physical Z key regardless of layout
            if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey && canUndo) {
                e.preventDefault();
                e.stopPropagation();
                undo().then(() => {
                    // Refresh workspace after undo
                    refreshWorkspace();
                });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, undo, refreshWorkspace]);

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

            <SidebarHeader
                currentWorkspace={currentWorkspace}
                onNewFile={handleNewFile}
                onNewFolder={handleNewFolder}
                onRefresh={handleRefresh}
                onCollapseAll={handleCollapseAll}
                isMenuOpen={isMenuOpen}
                onToggleMenu={setIsMenuOpen}
                enabledSections={enabledSections}
                onToggleSection={handleToggleSection}
            />

            <div className={styles.body}>
                {enabledSections.has('openEditors') && <OpenEditorsSection />}
                {currentWorkspace ? (
                    <ProjectExplorer
                        currentWorkspace={currentWorkspace}
                        fileStructure={fileStructure}
                        expandedFolders={expandedFolders}
                        onToggleExpand={handleToggleExpand}
                        creatingNew={creatingNew}
                        setCreatingNew={setCreatingNew}
                        onCreationComplete={handleCreationComplete}
                        selectedPaths={selectedPaths}
                        focusedPath={focusedPath}
                        setFocusedPath={setFocusedPath}
                        onSelect={handleSelect}
                        onDelete={handleDelete}
                        fileSystemVersion={fileSystemVersion}
                        refreshWorkspace={refreshWorkspace}
                        onOpenFile={useProjectStore().openFile}
                    />
                ) : (
                    <NoWorkspaceView />
                )}
            </div>

            <div className={styles.bottomSections}>
                {enabledSections.has('outline') && <OutlineSection />}
                {enabledSections.has('npmScripts') && <NpmScriptsSection />}
                {enabledSections.has('timeline') && <TimelineSection />}
            </div>
        </div>
    );
};

