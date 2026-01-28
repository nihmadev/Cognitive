import { useEffect, useState, useRef } from 'react';
import { useGitStore } from '../../../store/gitStore';
import { useProjectStore } from '../../../store/projectStore';
import { RotateCw, GitBranch, Cloud, MoreHorizontal, Check } from 'lucide-react';
import { GitCommit, tauriApi } from '../../../lib/tauri-api';
import { CommitSection, GraphSection, ChangesSection, CommitTooltip, RepositoriesSection } from './components';
import { TooltipPosition } from './types';
import styles from './GitPane.module.css';

export const GitPane = () => {
    const { currentWorkspace, openDiffTab, openFile } = useProjectStore();
    const {
        files, info, commits, isLoading, error, commitMessage, graphOpen, pushResult,
        isAuthModalOpen,
        repositoriesVisible, changesVisible, graphVisible,
        repositoriesOpen, changesOpen,
        setCommitMessage, setGraphOpen, refresh, refreshCommits, stageFile,
        stageAll, commit, commitAmend, discardChanges, clearPushResult, setAuthModalOpen, push,
        toggleRepositories, toggleChanges, toggleGraph,
        setRepositoriesOpen, setChangesOpen,
        pull, fetch, commitAndPush, commitAndSync
    } = useGitStore();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const [hoveredCommit, setHoveredCommit] = useState<GitCommit | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
    const [isTooltipHovered, setIsTooltipHovered] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (currentWorkspace) {
            refresh(currentWorkspace);
            refreshCommits(currentWorkspace);
        }
    }, [currentWorkspace]);

    // Handle CTRL+A to select all files
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && files.length > 0) {
                // Only handle if focus is within the git pane or no active element
                const activeElement = document.activeElement;
                const gitPaneElement = document.querySelector('[data-git-pane="true"]');
                
                if (!activeElement || (gitPaneElement && gitPaneElement.contains(activeElement))) {
                    stageAll(currentWorkspace);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentWorkspace, files.length, stageAll]);

    const handleCommit = async () => {
        if (currentWorkspace && commitMessage.trim() && files.length > 0) {
            await stageAll(currentWorkspace);
            await commit(currentWorkspace);
            await refreshCommits(currentWorkspace);
        }
    };

    const handleCommitPush = async () => {
        if (currentWorkspace && commitMessage.trim() && files.length > 0) {
            await stageAll(currentWorkspace);
            await commitAndPush(currentWorkspace);
            await refreshCommits(currentWorkspace);
        }
    };

    const handleCommitSync = async () => {
        if (currentWorkspace && commitMessage.trim() && files.length > 0) {
            await stageAll(currentWorkspace);
            await commitAndSync(currentWorkspace);
            await refreshCommits(currentWorkspace);
        }
    };

    const handleCommitAmend = async () => {
        if (currentWorkspace && commitMessage.trim()) {
            await stageAll(currentWorkspace);
            await commitAmend(currentWorkspace);
        }
    };

    const handleCommitHover = (commit: GitCommit, e: React.MouseEvent) => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPosition({ x: rect.right + 8, y: rect.top });
        setHoveredCommit(commit);
    };

    const handleCommitLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            if (!isTooltipHovered) {
                setHoveredCommit(null);
            }
        }, 100);
    };

    const handleTooltipEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setIsTooltipHovered(true);
    };

    const handleTooltipLeave = () => {
        setIsTooltipHovered(false);
        setHoveredCommit(null);
    };

    const handleFileClick = (file: { path: string; is_staged: boolean }) => {
        openDiffTab(file.path, file.is_staged);
    };

    const handleOpenFile = (relativePath: string) => {
        if (!currentWorkspace) return;
        
        // Преобразуем относительный путь в полный
        const fullPath = `${currentWorkspace}/${relativePath}`.replace(/\\/g, '/');
        openFile(fullPath);
    };

    const handleAuthLogin = async () => {
        try {
            const ok = await tauriApi.gitGithubAuthStatus();
            if (ok) {
                setAuthModalOpen(false);
                return;
            }
        } catch {

        }
        try {
            await tauriApi.gitGithubAuthLogin();
            setAuthModalOpen(false);
        } catch (e) {
        }
    };

    const handleRetryPush = async () => {
        if (!currentWorkspace) return;
        setAuthModalOpen(false);
        await push(currentWorkspace);
    };

    if (!currentWorkspace) {
        return (
            <div className={styles.gitPane} data-git-pane="true">
                <div className={styles.header}>Source Control</div>
                <div className={styles.noRepo}>
                    <GitBranch size={32} />
                    <p className={styles.noRepoText}>Open a folder to see Git changes</p>
                </div>
            </div>
        );
    }

    if (error && !info) {
        return (
            <div className={styles.gitPane} data-git-pane="true">
                <div className={styles.header}>
                    <span>Source Control</span>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.headerBtn}
                            onClick={() => refresh(currentWorkspace)}
                            title="Refresh"
                        >
                            <RotateCw size={14} />
                        </button>
                    </div>
                </div>
                <div className={styles.noRepo}>
                    <GitBranch size={32} />
                    <p className={styles.noRepoText}>Not a Git repository</p>
                </div>
            </div>
        );
    }

    if (isLoading && !info) {
        return (
            <div className={styles.gitPane} data-git-pane="true">
                <div className={styles.header}>Source Control</div>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.gitPane} data-git-pane="true">
            <div className={styles.header}>
                <span>Source Control</span>
                <div className={styles.headerActions}>
                    <button
                        className={styles.headerBtn}
                        onClick={() => {
                            refresh(currentWorkspace);
                            refreshCommits(currentWorkspace);
                        }}
                        title="Refresh"
                    >
                        <RotateCw size={14} />
                    </button>
                    <button
                        className={styles.headerBtn}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({ x: rect.right - 180, y: rect.bottom + 12 });
                            setIsMenuOpen(true);
                        }}
                        title="Views and More Actions..."
                    >
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <>
                    <div className={styles.menuOverlay} onClick={() => setIsMenuOpen(false)} />
                    <div
                        className={styles.visibilityMenu}
                        style={{ left: menuPosition.x, top: menuPosition.y }}
                    >
                        <button className={styles.visibilityMenuItem} onClick={() => { toggleRepositories(); setIsMenuOpen(false); }}>
                            <div className={styles.menuCheck}>{repositoriesVisible && <Check size={12} />}</div>
                            Repositories
                        </button>
                        <button className={styles.visibilityMenuItem} onClick={() => { toggleChanges(); setIsMenuOpen(false); }}>
                            <div className={styles.menuCheck}>{changesVisible && <Check size={12} />}</div>
                            Changes
                        </button>
                        <button className={styles.visibilityMenuItem} onClick={() => { toggleGraph(); setIsMenuOpen(false); }}>
                            <div className={styles.menuCheck}>{graphVisible && <Check size={12} />}</div>
                            Graph
                        </button>
                    </div>
                </>
            )}

            {repositoriesVisible && (
                <RepositoriesSection
                    repositoriesOpen={repositoriesOpen}
                    onToggle={() => setRepositoriesOpen(!repositoriesOpen)}
                    currentWorkspace={currentWorkspace}
                    branchName={info?.branch}
                    isClean={info?.is_clean ?? true}
                    onRefresh={() => {
                        refresh(currentWorkspace);
                        refreshCommits(currentWorkspace);
                    }}
                    onCommit={handleCommit}
                    onPush={() => push(currentWorkspace)}
                    onPull={() => pull(currentWorkspace)}
                    onFetch={() => fetch(currentWorkspace)}
                />
            )}

            {changesVisible && (
                <ChangesSection
                    files={files}
                    changesOpen={changesOpen}
                    onToggle={() => setChangesOpen(!changesOpen)}
                    onFileClick={handleFileClick}
                    onStageFile={(path) => stageFile(currentWorkspace, path)}
                    onStageAll={() => stageAll(currentWorkspace)}
                    onDiscardChanges={(path) => discardChanges(currentWorkspace, path)}
                    onOpenFile={handleOpenFile}
                />
            )}

            {changesVisible && changesOpen && (
                <CommitSection
                    commitMessage={commitMessage}
                    filesCount={files.length}
                    onCommitMessageChange={setCommitMessage}
                    onCommit={handleCommit}
                    onCommitPush={handleCommitPush}
                    onCommitSync={handleCommitSync}
                    onCommitAmend={handleCommitAmend}
                />
            )}

            {graphVisible && (
                <GraphSection
                    commits={commits}
                    graphOpen={graphOpen}
                    remoteName={info?.remote_name}
                    workspacePath={currentWorkspace}
                    onToggle={() => setGraphOpen(!graphOpen)}
                    onCommitHover={handleCommitHover}
                    onCommitLeave={handleCommitLeave}
                    onPull={() => pull(currentWorkspace)}
                    onPush={() => push(currentWorkspace)}
                    onFetch={() => fetch(currentWorkspace)}
                    onRefresh={() => refreshCommits(currentWorkspace)}
                />
            )}

            {pushResult && (
                <div className={`${styles.pushResult} ${pushResult.success ? styles.success : styles.error}`}>
                    <div className={styles.resultIcon}>
                        {pushResult.success ? (
                            <Cloud size={14} />
                        ) : (
                            <GitBranch size={14} />
                        )}
                    </div>
                    <div className={styles.resultContent}>
                        <div className={styles.resultMessage}>{pushResult.message}</div>
                    </div>
                    <button
                        className={styles.closeResult}
                        onClick={clearPushResult}
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            )}


            {hoveredCommit && (
                <CommitTooltip
                    commit={hoveredCommit}
                    position={tooltipPosition}
                    remoteName={info?.remote_name}
                    onMouseEnter={handleTooltipEnter}
                    onMouseLeave={handleTooltipLeave}
                />
            )}

            {isAuthModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContainer}>
                        <div className={styles.modalTitle}>Sign in required</div>
                        <div className={styles.modalText}>
                            To push, you need to authenticate. You can sign in via GitHub CLI or configure SSH/credential helper.
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalBtnSecondary}
                                onClick={() => tauriApi.openUrl('https://github.com/login')}
                            >
                                Open GitHub Login
                            </button>
                            <button className={styles.modalBtn} onClick={handleAuthLogin}>
                                Sign in (gh)
                            </button>
                            <button className={styles.modalBtn} onClick={handleRetryPush}>
                                Retry push
                            </button>
                            <button
                                className={styles.modalBtnSecondary}
                                onClick={() => setAuthModalOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
