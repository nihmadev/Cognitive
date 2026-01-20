import React, { useState } from 'react';
import { ChevronRight, Book, GitBranch, CloudUpload, Check, RotateCw, MoreHorizontal } from 'lucide-react';
import { useGitStore } from '../../../../store/gitStore';
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
    onPull: () => void;
    onFetch: () => void;
}

type SubMenuType = 'commit' | 'changes' | 'pullpush' | 'branch' | 'remote' | 'stash' | 'tags' | 'worktrees' | null;

export const RepositoriesSection: React.FC<RepositoriesSectionProps> = ({
    repositoriesOpen,
    onToggle,
    currentWorkspace,
    branchName,
    isClean,
    onRefresh,
    onCommit,
    onPush,
    onPull,
    onFetch
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(null);
    const [subMenuPos, setSubMenuPos] = useState({ x: 0, y: 0 });
    
    const {
        checkoutBranch,
        createBranch,
        deleteBranch,
        mergeBranch,
        stashSave,
        stashPop,
        stashList,
        listBranches,
    } = useGitStore();
    
    const repoName = currentWorkspace.split(/[\\/]/).pop() || '';

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.right - 180, y: rect.bottom + 12 });
        setShowMenu(true);
        setActiveSubMenu(null);
    };

    const handleSubMenuHover = (type: SubMenuType, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSubMenuPos({ x: rect.right + 5, y: rect.top });
        setActiveSubMenu(type);
    };

    const handleClone = () => {
        const url = prompt('Enter repository URL:');
        const path = prompt('Enter destination path:');
        if (url && path) {
            // TODO: Implement clone
        }
        setShowMenu(false);
    };

    const handleCheckout = async () => {
        try {
            const branches = await listBranches(currentWorkspace);
            const branchNames = branches.map((b: any) => b.name).join('\n');
            const branch = prompt(`Available branches:\n${branchNames}\n\nEnter branch name to checkout:`);
            if (branch) {
                await checkoutBranch(currentWorkspace, branch);
            }
        } catch (e) {
        }
        setShowMenu(false);
    };

    const handleCreateBranch = async () => {
        const name = prompt('Enter new branch name:');
        if (name) {
            try {
                await createBranch(currentWorkspace, name);
            } catch (e) {
            }
        }
        setShowMenu(false);
        setActiveSubMenu(null);
    };

    const handleDeleteBranch = async () => {
        try {
            const branches = await listBranches(currentWorkspace);
            const branchNames = branches.filter((b: any) => !b.is_head).map((b: any) => b.name).join('\n');
            const branch = prompt(`Available branches:\n${branchNames}\n\nEnter branch name to delete:`);
            if (branch) {
                const force = confirm('Force delete?');
                await deleteBranch(currentWorkspace, branch, force);
            }
        } catch (e) {
        }
        setShowMenu(false);
        setActiveSubMenu(null);
    };

    const handleMergeBranch = async () => {
        try {
            const branches = await listBranches(currentWorkspace);
            const branchNames = branches.filter((b: any) => !b.is_head).map((b: any) => b.name).join('\n');
            const branch = prompt(`Available branches:\n${branchNames}\n\nEnter branch name to merge:`);
            if (branch) {
                await mergeBranch(currentWorkspace, branch);
            }
        } catch (e) {
        }
        setShowMenu(false);
        setActiveSubMenu(null);
    };

    const handleStashSave = async () => {
        const message = prompt('Enter stash message (optional):');
        try {
            await stashSave(currentWorkspace, message || undefined);
        } catch (e) {
        }
        setShowMenu(false);
        setActiveSubMenu(null);
    };

    const handleStashPop = async () => {
        try {
            const stashes = await stashList(currentWorkspace);
            if (stashes.length === 0) {
                alert('No stashes available');
                return;
            }
            const stashListStr: string = stashes.map(([idx, msg]: [number, string]) => `${idx}: ${msg}`).join('\n');
            const input = prompt(`Available stashes:\n${stashListStr}\n\nEnter stash index (default: 0):`);
            const index = input ? parseInt(input) : 0;
            await stashPop(currentWorkspace, index);
        } catch (e) {
        }
        setShowMenu(false);
        setActiveSubMenu(null);
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
                    <div className={styles.menuOverlay} onClick={() => { setShowMenu(false); setActiveSubMenu(null); }} />
                    <div
                        className={styles.dropdownMenu}
                        style={{ left: menuPos.x, top: menuPos.y }}
                    >
                        <div className={styles.menuItem} onClick={() => { onPull(); setShowMenu(false); }}>Pull</div>
                        <div className={styles.menuItem} onClick={() => { onPush(); setShowMenu(false); }}>Push</div>
                        <div className={styles.menuItem} onClick={handleClone}>Clone</div>
                        <div className={styles.menuItem} onClick={handleCheckout}>Checkout to...</div>
                        <div className={styles.menuItem} onClick={() => { onFetch(); setShowMenu(false); }}>Fetch</div>

                        <div className={styles.menuSeparator} />

                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('commit', e)}
                        >
                            <span>Commit</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('changes', e)}
                        >
                            <span>Changes</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('pullpush', e)}
                        >
                            <span>Pull, Push</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('branch', e)}
                        >
                            <span>Branch</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('remote', e)}
                        >
                            <span>Remote</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('stash', e)}
                        >
                            <span>Stash</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('tags', e)}
                        >
                            <span>Tags</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>
                        <div 
                            className={styles.menuItem}
                            onMouseEnter={(e) => handleSubMenuHover('worktrees', e)}
                        >
                            <span>Worktrees</span>
                            <ChevronRight size={12} className={styles.chevronRight} />
                        </div>

                        <div className={styles.menuSeparator} />

                        <div className={styles.menuItem}>Show Git Output</div>
                    </div>

                    {/* Submenus */}
                    {activeSubMenu === 'commit' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem} onClick={() => { onCommit(); setShowMenu(false); }}>Commit</div>
                            <div className={styles.menuItem}>Commit Staged</div>
                            <div className={styles.menuItem}>Commit Staged (Amend)</div>
                            <div className={styles.menuItem}>Commit All</div>
                            <div className={styles.menuItem}>Commit Staged (Signed Off)</div>
                            <div className={styles.menuItem}>Undo Last Commit</div>
                        </div>
                    )}

                    {activeSubMenu === 'changes' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem}>Stage All Changes</div>
                            <div className={styles.menuItem}>Unstage All Changes</div>
                            <div className={styles.menuItem}>Discard All Changes</div>
                        </div>
                    )}

                    {activeSubMenu === 'pullpush' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem} onClick={() => { onPull(); setShowMenu(false); }}>Pull</div>
                            <div className={styles.menuItem}>Pull (Rebase)</div>
                            <div className={styles.menuItem} onClick={() => { onPush(); setShowMenu(false); }}>Push</div>
                            <div className={styles.menuItem}>Push to...</div>
                            <div className={styles.menuItem}>Force Push</div>
                            <div className={styles.menuItem} onClick={() => { onFetch(); setShowMenu(false); }}>Fetch</div>
                            <div className={styles.menuItem}>Fetch (Prune)</div>
                            <div className={styles.menuItem}>Sync</div>
                        </div>
                    )}

                    {activeSubMenu === 'branch' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem} onClick={handleCreateBranch}>Create Branch...</div>
                            <div className={styles.menuItem}>Create Branch From...</div>
                            <div className={styles.menuItem}>Rename Branch...</div>
                            <div className={styles.menuItem} onClick={handleDeleteBranch}>Delete Branch...</div>
                            <div className={styles.menuSeparator} />
                            <div className={styles.menuItem}>Publish Branch</div>
                            <div className={styles.menuSeparator} />
                            <div className={styles.menuItem} onClick={handleMergeBranch}>Merge Branch...</div>
                            <div className={styles.menuItem}>Rebase Branch...</div>
                        </div>
                    )}

                    {activeSubMenu === 'remote' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem}>Add Remote...</div>
                            <div className={styles.menuItem}>Remove Remote...</div>
                        </div>
                    )}

                    {activeSubMenu === 'stash' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem} onClick={handleStashSave}>Stash</div>
                            <div className={styles.menuItem} onClick={handleStashPop}>Pop Stash...</div>
                            <div className={styles.menuItem}>Apply Stash...</div>
                            <div className={styles.menuItem}>Drop Stash...</div>
                        </div>
                    )}

                    {activeSubMenu === 'tags' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem}>Create Tag...</div>
                            <div className={styles.menuItem}>Delete Tag...</div>
                        </div>
                    )}

                    {activeSubMenu === 'worktrees' && (
                        <div
                            className={styles.dropdownMenu}
                            style={{ left: subMenuPos.x, top: subMenuPos.y }}
                        >
                            <div className={styles.menuItem}>Add Worktree...</div>
                            <div className={styles.menuItem}>Remove Worktree...</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
