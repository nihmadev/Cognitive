import React, { useRef, useMemo } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { X, GitCompare, Settings, User, History } from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import { TabActions } from '../TabActions';
import { useFileGitStatus } from '../Sidebar/useFileGitStatus';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';
import clsx from 'clsx';
import styles from './styles.module.css';

const FileTab = ({ 
    path, 
    isActive, 
    hasUnsavedChanges, 
    isDeleted, 
    onTabClick, 
    onCloseFile 
}: {
    path: string;
    isActive: boolean;
    hasUnsavedChanges: boolean;
    isDeleted: boolean;
    onTabClick: (path: string) => void;
    onCloseFile: (path: string) => void;
}) => {
    const gitStatus = useFileGitStatus(path);
    
    // Normalize path to match diagnostics store (forward slashes)
    const normalizedPath = useMemo(() => path.replace(/\\/g, '/'), [path]);
    
    // Subscribe to diagnostics arrays for this file
    const monacoDiags = useDiagnosticsStore(state => state.monacoDiagnostics[normalizedPath]);
    const lspDiags = useDiagnosticsStore(state => state.lspDiagnostics[normalizedPath]);
    
    // Calculate counts only when diagnostics change
    const diagnostics = useMemo(() => {
        let errors = 0;
        let warnings = 0;
        
        if (monacoDiags) {
            for (const d of monacoDiags) {
                if (d.type === 'error') errors++;
                else if (d.type === 'warning') warnings++;
            }
        }
        
        if (lspDiags) {
            for (const d of lspDiags) {
                if (d.type === 'error') errors++;
                else if (d.type === 'warning') warnings++;
            }
        }
        
        return { errors, warnings };
    }, [monacoDiags, lspDiags]);
    
    const name = path.split(/[\\/]/).pop() || path;
    
    
    if (isDeleted) {
        console.log('[FileTab] Rendering deleted file:', path, 'isDeleted:', isDeleted);
    }

    const getGitStatusInfo = () => {
        if (!gitStatus.status) return null;
        
        switch (gitStatus.status) {
            case 'conflicted':
                return {
                    text: 'C',
                    className: styles.gitConflicted,
                    title: 'Merge conflict'
                };
            case 'deleted':
                return {
                    text: 'D',
                    className: styles.gitDeleted,
                    title: gitStatus.isStaged ? 'Staged deletion' : 'Deleted'
                };
            case 'modified':
                return {
                    text: 'M',
                    className: styles.gitModified,
                    title: gitStatus.isStaged ? 'Staged changes' : 'Modified'
                };
            case 'untracked':
                return {
                    text: 'U',
                    className: styles.gitUntracked,
                    title: 'Untracked file'
                };
            case 'staged':
                return {
                    text: 'A',
                    className: styles.gitStaged,
                    title: 'Staged new file'
                };
            default:
                return null;
        }
    };

    const gitStatusInfo = getGitStatusInfo();
    
    
    const showDeletedBadge = isDeleted && !gitStatusInfo;
    
    // Determine tab label color based on diagnostics
    const hasErrors = diagnostics.errors > 0;
    const hasWarnings = diagnostics.warnings > 0;
    const diagnosticsCount = diagnostics.errors + diagnostics.warnings;

    return (
        <div
            key={path}
            className={clsx(
                styles.tab,
                isActive && styles.tabActive,
                !isActive && styles.tabInactive,
                isDeleted && styles.tabDeleted
            )}
            onClick={() => onTabClick(path)}
            title={isDeleted ? 'File deleted from disk' : path}
        >
            <div className={styles.tabContent}>
                <span className={styles.tabIcon}>
                    {getFileIcon(name, path)}
                </span>
                <span className={clsx(
                    styles.tabLabel, 
                    isDeleted && styles.tabLabelDeleted,
                    hasErrors && styles.tabLabelError,
                    !hasErrors && hasWarnings && styles.tabLabelWarning
                )}>
                    {name}
                </span>
                {(diagnosticsCount > 0 || gitStatusInfo || showDeletedBadge) && (
                    <span className={styles.statusContainer}>
                        {diagnosticsCount > 0 && (
                            <span 
                                className={clsx(
                                    styles.diagnosticsCount,
                                    hasErrors && styles.diagnosticsError,
                                    !hasErrors && hasWarnings && styles.diagnosticsWarning
                                )}
                                title={`${diagnostics.errors} error(s), ${diagnostics.warnings} warning(s)`}
                            >
                                {diagnosticsCount}
                            </span>
                        )}
                        {(diagnosticsCount > 0 && (gitStatusInfo || showDeletedBadge)) && (
                            <span className={styles.statusSeparator}>,</span>
                        )}
                        {showDeletedBadge && (
                            <span 
                                className={clsx(styles.gitStatusText, styles.gitDeleted)}
                                title="File deleted from disk"
                            >
                                D
                            </span>
                        )}
                        {gitStatusInfo && (
                            <span 
                                className={clsx(styles.gitStatusText, gitStatusInfo.className)}
                                title={gitStatusInfo.title}
                            >
                                {gitStatusInfo.text}
                            </span>
                        )}
                    </span>
                )}
                                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCloseFile(path);
                    }}
                    className={clsx(
                        styles.closeButton,
                        isActive && styles.closeButtonActive,
                        hasUnsavedChanges && styles.closeButtonUnsaved
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseUp={(e) => e.stopPropagation()}
                >
                    {hasUnsavedChanges ? (
                        <>
                            <div className={styles.unsavedDot} />
                            <X size={14} strokeWidth={2} className={clsx(styles.closeIcon, styles.unsavedCloseIcon)} />
                        </>
                    ) : (
                        <X size={14} strokeWidth={2} className={styles.closeIcon} />
                    )}
                </button>
            </div>
        </div>
    );
};

export const TabBar = () => {
    const { 
        openFiles, activeFile, openFile, closeFile, unsavedChanges, deletedFiles,
        openDiffTabs, activeDiffTab, setActiveDiffTab, closeDiffTab,
        openSettingsTabs, activeSettingsTab, setActiveSettingsTab, closeSettingsTab,
        openProfilesTabs, activeProfilesTab, setActiveProfilesTab, closeProfilesTab,
        openTimelineDiffTabs, activeTimelineDiffTab, setActiveTimelineDiffTab, closeTimelineDiffTab
    } = useProjectStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleTabClick = (path: string) => {
        
        openFile(path);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    if (openFiles.length === 0 && openDiffTabs.length === 0 && openSettingsTabs.length === 0 && openProfilesTabs.length === 0 && openTimelineDiffTabs.length === 0) {
        return null;
    }

    return (
        <div className={styles.tabsContainer}>
            <div
                className={styles.tabBar}
                onWheel={handleWheel}
                ref={scrollContainerRef}
            >
                {}
                {openFiles.map((path) => {
                    const isActive = activeFile === path && !activeDiffTab && !activeSettingsTab;
                    const hasUnsavedChanges = unsavedChanges[path];
                    const isDeleted = !!deletedFiles[path];
                    
                    
                    if (isDeleted) {
                        console.log('[TabBar] Rendering tab for deleted file:', path, 'deletedFiles:', deletedFiles);
                    }
                    
                    return (
                        <FileTab
                            key={path}
                            path={path}
                            isActive={isActive}
                            hasUnsavedChanges={hasUnsavedChanges}
                            isDeleted={isDeleted}
                            onTabClick={handleTabClick}
                            onCloseFile={closeFile}
                        />
                    );
                })}
                
                {}
                {openDiffTabs.map((diffTab) => {
                    const isActive = activeDiffTab === diffTab.id && !activeSettingsTab;

                    return (
                        <div
                            key={diffTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveDiffTab(diffTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <GitCompare size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {diffTab.fileName}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeDiffTab(diffTab.id);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {}
                {openSettingsTabs.map((settingsTab) => {
                    const isActive = activeSettingsTab === settingsTab.id && !activeProfilesTab;

                    return (
                        <div
                            key={settingsTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveSettingsTab(settingsTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <Settings size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {settingsTab.title}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeSettingsTab(settingsTab.id);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {}
                {openProfilesTabs.map((profilesTab) => {
                    const isActive = activeProfilesTab === profilesTab.id;

                    return (
                        <div
                            key={profilesTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveProfilesTab(profilesTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <User size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {profilesTab.title}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeProfilesTab(profilesTab.id);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {}
                {openTimelineDiffTabs.map((timelineTab) => {
                    const isActive = activeTimelineDiffTab === timelineTab.id;

                    return (
                        <div
                            key={timelineTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveTimelineDiffTab(timelineTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <History size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {timelineTab.fileName}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTimelineDiffTab(timelineTab.id);
                                    }}
                                    className={clsx(
                                        styles.closeButton,
                                        isActive && styles.closeButtonActive
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                >
                                    <X size={14} strokeWidth={2} className={styles.closeIcon} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {}
            <TabActions />
        </div>
    );
};
