import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Book, GitBranch, CloudUpload, Check, RotateCw, MoreHorizontal } from 'lucide-react';
import styles from './RepositoriesSection.module.css';

interface RepositoriesSectionProps {
    repositoriesOpen: boolean;
    onToggle: () => void;
    currentWorkspace: string;
    branchName?: string;
    isClean: boolean;
    onRefresh: () => void;
    onCommit: () => void;
    onPush: () => void;
}

export const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({
    repositoriesOpen,
    onToggle,
    currentWorkspace,
    branchName,
    isClean,
    onRefresh,
    onCommit,
    onPush
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const repoName = currentWorkspace.split(/[\\/]/).pop() || '';

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.right - 180, y: rect.bottom + 12 });
        setShowMenu(true);
    };

    return (
        <div className={styles.repositoriesSection}>
            <div className={styles.header} onClick={onToggle}>
                <ChevronRight
                    size={14}
                    className={`${styles.chevron} ${repositoriesOpen ? styles.chevronOpen : ''}`}
                />
                REPOSITORIES
            </div>

            {repositoriesOpen && (
                <div className={styles.content}>
                    <div className={styles.repoItem}>
                        <Book size={14} className={styles.repoIcon} />
                        <div className={styles.repoInfo}>
                            <span className={styles.repoName}>{repoName}</span>
                            <span className={styles.repoType}>Git</span>
                        </div>

                        <div className={styles.branchInfo}>
                            <GitBranch size={12} />
                            <span className={styles.branchName}>
                                {branchName}{!isClean && <span className={styles.branchModified}>*</span>}
                            </span>
                        </div>

                        <div className={styles.actions}>
                            <button
                                className={styles.actionBtn}
                                title="Publish Branch"
                                onClick={(e) => { e.stopPropagation(); onPush(); }}
                            >
                                <CloudUpload size={14} />
                            </button>
                            <button
                                className={styles.actionBtn}
                                title="Commit"
                                onClick={(e) => { e.stopPropagation(); onCommit(); }}
                            >
                                <Check size={14} />
                            </button>
                            <button
                                className={styles.actionBtn}
                                title="Refresh"
                                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                            >
                                <RotateCw size={14} />
                            </button>
                            <button
                                className={styles.actionBtn}
                                title="More Actions..."
                                onClick={handleMenuClick}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMenu && (
                <>
                    <div className={styles.menuOverlay} onClick={() => setShowMenu(false)} />
                    <div
                        className={styles.dropdownMenu}
                        style={{ left: menuPos.x, top: menuPos.y }}
                    >
                        <div className={styles.menuItem}>Pull</div>
                        <div className={styles.menuItem}>Push</div>
                        <div className={styles.menuItem}>Clone</div>
                        <div className={styles.menuItem}>Checkout to...</div>
                        <div className={styles.menuItem}>Fetch</div>

                        <div className={styles.menuSeparator} />

                        <div className={styles.menuItem}>
                            <span>Commit</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Changes</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Pull, Push</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Branch</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Remote</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Stash</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Tags</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div className={styles.menuItem}>
                            <span>Worktrees</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>

                        <div className={styles.menuSeparator} />

                        <div className={styles.menuItem}>Show Git Output</div>
                    </div>
                </>
            )}
        </div>
    );
};
