import { useEffect, useState, useRef } from 'react';
import { useGitStore } from '../../../store/gitStore';
import { useProjectStore } from '../../../store/projectStore';
import { RotateCw, GitBranch, Cloud, CircleDot } from 'lucide-react';
import { GitCommit, tauriApi } from '../../../lib/tauri-api';
import { CommitSection, GraphSection, ChangesSection, CommitTooltip } from './components';
import { TooltipPosition } from './types';
import styles from './GitPane.module.css';

export const GitPane = () => {
    const { currentWorkspace, openDiffTab } = useProjectStore();
    const { 
        files, info, commits, isLoading, error, commitMessage, graphOpen, pushResult,
        isAuthModalOpen,
        setCommitMessage, setGraphOpen, refresh, refreshCommits, stageFile, 
        stageAll, commit, discardChanges, clearPushResult, setAuthModalOpen, push
    } = useGitStore();
    
    const [changesOpen, setChangesOpen] = useState(true);
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

    const handleCommit = async () => {
        if (currentWorkspace && commitMessage.trim() && files.length > 0) {
            await stageAll(currentWorkspace);
            await commit(currentWorkspace);
            await refreshCommits(currentWorkspace);
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

    const handleAuthLogin = async () => {
        try {
            const ok = await tauriApi.gitGithubAuthStatus();
            if (ok) {
                setAuthModalOpen(false);
                return;
            }
        } catch {
            // ignore
        }
        try {
            await tauriApi.gitGithubAuthLogin();
            setAuthModalOpen(false);
        } catch (e) {
            console.warn('GitHub auth login failed:', e);
        }
    };

    const handleRetryPush = async () => {
        if (!currentWorkspace) return;
        setAuthModalOpen(false);
        await push(currentWorkspace);
    };

    if (!currentWorkspace) {
        return (
            <div className={styles.gitPane}>
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
            <div className={styles.gitPane}>
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
            <div className={styles.gitPane}>
                <div className={styles.header}>Source Control</div>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.gitPane}>
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
                </div>
            </div>

            <CommitSection
                commitMessage={commitMessage}
                filesCount={files.length}
                onCommitMessageChange={setCommitMessage}
                onCommit={handleCommit}
            />

            <GraphSection
                commits={commits}
                graphOpen={graphOpen}
                remoteName={info?.remote_name}
                onToggle={() => setGraphOpen(!graphOpen)}
                onCommitHover={handleCommitHover}
                onCommitLeave={handleCommitLeave}
            />

            <ChangesSection
                files={files}
                changesOpen={changesOpen}
                onToggle={() => setChangesOpen(!changesOpen)}
                onFileClick={handleFileClick}
                onStageFile={(path) => stageFile(currentWorkspace, path)}
                onStageAll={() => stageAll(currentWorkspace)}
                onDiscardChanges={(path) => discardChanges(currentWorkspace, path)}
            />

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

            {info && (
                <div className={styles.footer}>
                    <div className={styles.branchInfo}>
                        <div className={styles.branchName}>
                            <CircleDot size={10} />
                            {info.branch}
                        </div>
                        {info.has_remote && (
                            <Cloud size={14} className={styles.remoteIcon} />
                        )}
                    </div>
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
