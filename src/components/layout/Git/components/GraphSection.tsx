import { 
    ChevronRight, ChevronDown, Cloud, CircleDot, ExternalLink,
    MoreHorizontal, Sparkles, GitMerge, Cherry, RefreshCw
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
    return (
        <div className={styles.graphSection}>
            <div className={styles.sectionHeader} onClick={onToggle}>
                <div className={styles.sectionTitle}>
                    {graphOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Graph</span>
                </div>
                <div className={styles.graphActions}>
                    <button className={styles.graphActionBtn} title="Auto">
                        <Sparkles size={12} />
                        <span>Auto</span>
                    </button>
                    <button className={styles.graphIconBtn} title="Fetch">
                        <CircleDot size={12} />
                    </button>
                    <button className={styles.graphIconBtn} title="Merge">
                        <GitMerge size={12} />
                    </button>
                    <button className={styles.graphIconBtn} title="Cherry Pick">
                        <Cherry size={12} />
                    </button>
                    <button className={styles.graphIconBtn} title="Refresh">
                        <RefreshCw size={12} />
                    </button>
                    <button className={styles.graphIconBtn} title="More">
                        <MoreHorizontal size={12} />
                    </button>
                </div>
            </div>
            
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
