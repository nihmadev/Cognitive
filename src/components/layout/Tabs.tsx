import React, { useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { X, GitCompare, Settings, User, History } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import { TabActions } from './TabActions';
import clsx from 'clsx';
import styles from './Tabs.module.css';

export const TabBar = () => {
    const { 
        openFiles, activeFile, openFile, closeFile, unsavedChanges, deletedFiles,
        openDiffTabs, activeDiffTab, setActiveDiffTab, closeDiffTab,
        openSettingsTabs, activeSettingsTab, setActiveSettingsTab, closeSettingsTab,
        openProfilesTabs, activeProfilesTab, setActiveProfilesTab, closeProfilesTab,
        openTimelineDiffTabs, activeTimelineDiffTab, setActiveTimelineDiffTab, closeTimelineDiffTab
    } = useProjectStore();
    const { splitView, setSplitViewSecondFile, splitViewSecondFile } = useUIStore();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleTabClick = (path: string) => {
        if (splitView) {
            // In split view, set the file as the second editor
            setSplitViewSecondFile(path);
        } else {
            // Normal mode, open in main editor
            openFile(path);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    if (openFiles.length === 0 && openDiffTabs.length === 0 && openSettingsTabs.length === 0 && openProfilesTabs.length === 0 && openTimelineDiffTabs.length === 0) {
    return (
        <div className={styles.tabsContainer}>
            <div className={styles.tabBar} />
            <TabActions />
        </div>
    );
}

    return (
        <div className={styles.tabsContainer}>
            <div
                className={styles.tabBar}
                onWheel={handleWheel}
                ref={scrollContainerRef}
            >
                {/* Regular file tabs */}
                {openFiles.map((path) => {
                    const name = path.split(/[\\/]/).pop() || path;
                    const isActive = activeFile === path && !activeDiffTab && !activeSettingsTab;
                    const isSecondEditor = splitView && splitViewSecondFile === path;
                    const hasUnsavedChanges = unsavedChanges[path];
                    const isDeleted = !!deletedFiles[path];

                    return (
                        <div
                            key={path}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive,
                                isSecondEditor && styles.tabSecondEditor,
                                isDeleted && styles.tabDeleted
                            )}
                            onClick={() => handleTabClick(path)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    {getFileIcon(name, path)}
                                </span>
                                <span className={clsx(styles.tabLabel, isDeleted && styles.tabLabelDeleted)}>
                                    {name}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeFile(path);
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
                })}
                
                {/* Diff tabs */}
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

                {/* Settings tabs */}
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

                {/* Profiles tabs */}
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

                {/* Timeline diff tabs */}
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
            
            {/* Tab Actions */}
            <TabActions />
        </div>
    );
};
