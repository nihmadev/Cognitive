import { useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useGitStore } from '../../store/gitStore';
import clsx from 'clsx';
import { OutlineSection } from './Outline';
import { NpmScriptsSection } from './NPM';
import { TimelineSection } from './Timeline';
import { tauriApi } from '../../lib/tauri-api';
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

    const resizablePanel = useResizablePanel({
        defaultWidth: sidebarWidth,
        minWidth: 200,
        maxWidth: 500,
        direction: 'right',
        onResize: setSidebarWidth
    });

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [creatingNew, setCreatingNew] = useState<{ parentPath: string; type: 'file' | 'folder'; insertIndex?: number } | null>(null);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
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
        if (currentWorkspace) {
            await refreshGitStatus(currentWorkspace);
        }
    }, [refreshWorkspace, refreshGitStatus, currentWorkspace]);

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
                        selectedPath={selectedPath}
                        onSelect={handleSelect}
                        onDelete={handleDelete}
                        fileSystemVersion={fileSystemVersion}
                        refreshWorkspace={refreshWorkspace}
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

