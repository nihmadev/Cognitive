import React, { useRef, useMemo, useEffect } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { X, GitCompare, Settings, User, History, Search } from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import { TabActions } from '../TabActions';
import { useFileGitStatus } from '../Sidebar/useFileGitStatus';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';
import { useAudioStore } from '../../../store/audioStore';
import clsx from 'clsx';
import styles from './styles.module.css';

const FileTab = ({
    path,
    isActive,
    hasUnsavedChanges,
    isDeleted,
    isPinned,
    onTabClick,
    onTabDoubleClick,
    onCloseFile
}: {
    path: string;
    isActive: boolean;
    hasUnsavedChanges: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    onTabClick: (path: string) => void;
    onTabDoubleClick: (path: string) => void;
    onCloseFile: (path: string) => void;
}) => {
    const gitStatus = useFileGitStatus(path);
    const { currentPath: audioCurrentPath, title: audioTitle } = useAudioStore();
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    // Force re-render when audio title changes for any audio file
    useEffect(() => {
        const isAudioFile = /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus)$/i.test(path);
        if (isAudioFile && audioCurrentPath && audioTitle) {
            forceUpdate();
        }
    }, [audioTitle, audioCurrentPath, path]);

    // Normalize path to match diagnostics store (forward slashes)
    const normalizedPath = useMemo(() => path.replace(/\\/g, '/'), [path]);

    // Subscribe to diagnostics arrays for this file
    const monacoDiags = useDiagnosticsStore(state => {
        const diagnostics = state.monacoDiagnostics[normalizedPath];
        return diagnostics || [];
    });
    const lspDiags = useDiagnosticsStore(state => {
        const diagnostics = state.lspDiagnostics[normalizedPath];
        return diagnostics || [];
    });

    // Calculate counts only when diagnostics change
    const diagnostics = useMemo(() => {
        let errors = 0;
        let warnings = 0;

        for (const d of monacoDiags) {
            if (d.type === 'error') errors++;
            else if (d.type === 'warning') warnings++;
        }

        for (const d of lspDiags) {
            if (d.type === 'error') errors++;
            else if (d.type === 'warning') warnings++;
        }

        return { errors, warnings };
    }, [monacoDiags, lspDiags]);

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

    // For audio files that are currently playing, use the track title instead of filename
    const isAudioFile = /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus)$/i.test(path);
    const isPlayingAudio = isAudioFile && audioCurrentPath && audioTitle;
    const name = isPlayingAudio ? audioTitle : path.split(/[\\/]/).pop() || path;

    // Determine tab label color based on diagnostics
    const hasErrors = diagnostics.errors > 0;
    const hasWarnings = diagnostics.warnings > 0;
    
    // Показываем количество ошибок, если они есть, иначе количество предупреждений
    const displayCount = hasErrors ? (diagnostics.errors > 9 ? '9+' : diagnostics.errors) : (diagnostics.warnings > 9 ? '9+' : diagnostics.warnings);
    const displayType = hasErrors ? 'error' : 'warning';

    const showDeletedBadge = isDeleted && !gitStatusInfo;

    return (
        <div
            key={path}
            className={clsx(
                styles.tab,
                isActive && styles.tabActive,
                !isActive && styles.tabInactive,
                isDeleted && styles.tabDeleted,
                !isPinned && styles.tabPreview
            )}
            onClick={() => onTabClick(path)}
            onDoubleClick={() => onTabDoubleClick(path)}
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
                    !hasErrors && hasWarnings && styles.tabLabelWarning,
                    !isPinned && styles.tabLabelPreview
                )}>
                    {name}
                </span>
                {(displayCount !== 0 || gitStatusInfo || showDeletedBadge) && (
                    <span className={styles.statusContainer}>
                        {displayCount !== 0 && (
                            <span
                                className={clsx(
                                    styles.diagnosticsCount,
                                    displayType === 'error' && styles.diagnosticsError,
                                    displayType === 'warning' && styles.diagnosticsWarning
                                )}
                                title={`${diagnostics.errors} error(s), ${diagnostics.warnings} warning(s)`}
                            >
                                {displayCount}
                            </span>
                        )}
                        {(displayCount !== 0 && (gitStatusInfo || showDeletedBadge)) && (
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
        openTimelineDiffTabs, activeTimelineDiffTab, setActiveTimelineDiffTab, closeTimelineDiffTab,
        openCommitDiffTabs, activeCommitDiffTab, setActiveCommitDiffTab, closeCommitDiffTab,
        openSearchTabs, activeSearchTab, setActiveSearchTab, closeSearchTab
    } = useProjectStore();

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // Drag state
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartScrollLeft = useRef(0);
    const THUMB_WIDTH = 100;

    const handleTabClick = (path: string) => {
        openFile(path);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
            e.preventDefault();
        }
    };

    const updateScrollbar = () => {
        if (!scrollContainerRef.current || !thumbRef.current || !trackRef.current) return;

        const { scrollWidth, clientWidth, scrollLeft } = scrollContainerRef.current;

        // Update track width to match container
        trackRef.current.style.width = `${clientWidth}px`;

        if (scrollWidth <= clientWidth) {
            thumbRef.current.style.opacity = '0';
            return;
        }

        thumbRef.current.style.opacity = '1';

        const maxScrollLeft = scrollWidth - clientWidth;
        const availableWidth = clientWidth - THUMB_WIDTH;

        const ratio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
        const left = ratio * availableWidth;

        thumbRef.current.style.width = `${THUMB_WIDTH}px`;
        thumbRef.current.style.transform = `translateX(${left}px)`;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        if (scrollContainerRef.current) {
            dragStartScrollLeft.current = scrollContainerRef.current.scrollLeft;
        }

        if (trackRef.current) trackRef.current.classList.add(styles.dragging);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;

        const deltaX = e.clientX - dragStartX.current;
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        const maxScrollLeft = scrollWidth - clientWidth;
        const availableWidth = clientWidth - THUMB_WIDTH;

        if (availableWidth <= 0) return;

        const scrollDelta = deltaX * (maxScrollLeft / availableWidth);
        scrollContainerRef.current.scrollLeft = dragStartScrollLeft.current + scrollDelta;
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        if (trackRef.current) trackRef.current.classList.remove(styles.dragging);

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    };

    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        el.addEventListener('scroll', updateScrollbar);

        const resizeObserver = new ResizeObserver(updateScrollbar);
        resizeObserver.observe(el);

        // Initial update
        updateScrollbar();

        return () => {
            el.removeEventListener('scroll', updateScrollbar);
            resizeObserver.disconnect();
        };
    }, []);

    // Update whenever tabs change
    React.useEffect(() => {
        updateScrollbar();
    }, [
        openFiles,
        openDiffTabs,
        openSettingsTabs,
        openProfilesTabs,
        openTimelineDiffTabs,
        openCommitDiffTabs,
        openSearchTabs
    ]);

    if (openFiles.length === 0 && openDiffTabs.length === 0 && openSettingsTabs.length === 0 && openProfilesTabs.length === 0 && openTimelineDiffTabs.length === 0 && openCommitDiffTabs.length === 0 && openSearchTabs.length === 0) {
        return null;
    }

    return (
        <div className={styles.tabsContainer}>
            <div
                className={styles.tabBar}
                onWheel={handleWheel}
                ref={scrollContainerRef}
            >
                {openFiles.map((path) => {
                    const isActive = activeFile === path && !activeDiffTab && !activeSettingsTab;
                    const hasUnsavedChanges = unsavedChanges[path];
                    const isDeleted = !!deletedFiles[path];

                    return (
                        <FileTab
                            key={path}
                            path={path}
                            isActive={isActive}
                            hasUnsavedChanges={hasUnsavedChanges}
                            isDeleted={isDeleted}
                            isPinned={false}
                            onTabClick={handleTabClick}
                            onTabDoubleClick={handleTabClick}
                            onCloseFile={closeFile}
                        />
                    );
                })}

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

                {openCommitDiffTabs.map((commitTab) => {
                    const isActive = activeCommitDiffTab === commitTab.id;

                    return (
                        <div
                            key={commitTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveCommitDiffTab(commitTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <GitCompare size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {commitTab.fileName}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeCommitDiffTab(commitTab.id);
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

                {openSearchTabs.map((searchTab) => {
                    const isActive = activeSearchTab === searchTab.id;

                    return (
                        <div
                            key={searchTab.id}
                            className={clsx(
                                styles.tab,
                                isActive && styles.tabActive,
                                !isActive && styles.tabInactive
                            )}
                            onClick={() => setActiveSearchTab(searchTab.id)}
                        >
                            <div className={styles.tabContent}>
                                <span className={styles.tabIcon}>
                                    <Search size={14} />
                                </span>
                                <span className={styles.tabLabel}>
                                    {searchTab.title}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeSearchTab(searchTab.id);
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

            <div className={styles.scrollTrack} ref={trackRef}>
                <div
                    className={styles.scrollThumb}
                    ref={thumbRef}
                    onMouseDown={handleMouseDown}
                />
            </div>

            <TabActions />
        </div>
    );
};
