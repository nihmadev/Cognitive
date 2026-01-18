import React, { useState } from 'react';
import {
    ChevronRight, ChevronDown, Cloud, CircleDot, ExternalLink,
    MoreHorizontal, RefreshCw, Target, ArrowDownToLine, ArrowDown, CloudUpload, Check
} from 'lucide-react';
import { GraphSectionProps } from '../types';
import styles from './GraphSection.module.css';

export const GraphSection = ({
    commits,
    graphOpen,
    onToggle,
    onCommitHover,
    onCommitLeave
}: GraphSectionProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.right - 160, y: rect.bottom + 5 });
        setShowMenu(true);
    };

    return (
        <div className={`${styles.graphSection} ${graphOpen ? styles.open : ''}`}>
            <div className={styles.sectionHeader} onClick={onToggle}>
                <div className={styles.sectionTitle}>
                    {graphOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Graph</span>
                </div>
                {graphOpen && (
                    <div className={styles.graphActions}>
                        <button className={styles.graphIconBtn} title="Go To Current History Item">
                            <Target size={14} />
                        </button>
                        <button className={styles.graphIconBtn} title="Fetch From All Remotes">
                            <ArrowDownToLine size={14} />
                        </button>
                        <button className={styles.graphIconBtn} title="Pull" disabled>
                            <ArrowDown size={14} />
                        </button>
                        <button className={styles.graphIconBtn} title="Publish Branch">
                            <CloudUpload size={14} />
                        </button>
                        <button className={styles.graphIconBtn} title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                        <button
                            className={styles.graphIconBtn}
                            title="More"
                            onClick={handleMenuClick}
                        >
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                )}
            </div>

            {showMenu && (
                <>
                    <div className={styles.menuOverlay} onClick={() => setShowMenu(false)} />
                    <div className={styles.dropdownMenu} style={{ left: menuPos.x, top: menuPos.y }}>
                        <div
                            className={styles.menuItem}
                            onClick={(e) => { e.stopPropagation(); setViewMode('list'); setShowMenu(false); }}
                        >
                            <div className={styles.menuItemIcon}>
                                {viewMode === 'list' && <Check size={14} />}
                            </div>
                            <span>View as List</span>
                        </div>
                        <div
                            className={styles.menuItem}
                            onClick={(e) => { e.stopPropagation(); setViewMode('tree'); setShowMenu(false); }}
                        >
                            <div className={styles.menuItemIcon}>
                                {viewMode === 'tree' && <Check size={14} />}
                            </div>
                            <span>View as Tree</span>
                        </div>
                    </div>
                </>
            )}

            {graphOpen && (
                <div className={styles.graphContent}>
                    <div className={styles.commitsList}>
                        {commits.map((c, index) => (
                            <div
                                key={c.hash}
                                className={styles.commitRow}
                                onMouseEnter={(e) => onCommitHover(c, e)}
                                onMouseLeave={onCommitLeave}
                            >
                                <div className={styles.graphLine}>
                                    <div className={`${styles.graphNode} ${c.is_head ? styles.graphNodeHead : ''}`} />
                                    {index < commits.length - 1 && <div className={styles.graphConnector} />}
                                </div>
                                <div className={styles.commitInfo}>
                                    <span className={styles.commitNumber}>{commits.length - index}</span>
                                    <span className={styles.commitMessage}>{c.message || c.author_name}</span>
                                </div>
                                {(c.branches?.length ?? 0) > 0 && (
                                    <div className={styles.commitBranches}>
                                        {(c.branches ?? []).slice(0, 2).map((branch) => (
                                            <span
                                                key={branch}
                                                className={`${styles.branchBadge} ${branch.includes('origin') ? styles.remoteBranch : styles.localBranch}`}
                                            >
                                                {branch.includes('origin') ? <Cloud size={10} /> : <CircleDot size={10} />}
                                                {branch.replace('origin/', '')}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {(c.branches?.length ?? 0) > 0 && c.is_head && (
                                    <button className={styles.pushBtn} title="Push">
                                        <ExternalLink size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
