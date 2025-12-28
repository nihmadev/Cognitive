import { Cloud, CircleDot } from 'lucide-react';
import { CommitTooltipProps } from '../types';
import { getRelativeTime, openOnGitHub, getGitHubUrl } from '../utils';
import styles from './CommitTooltip.module.css';

export const CommitTooltip = ({ 
    commit, 
    position, 
    remoteName,
    onMouseEnter, 
    onMouseLeave 
}: CommitTooltipProps) => {
    return (
        <div 
            className={styles.commitTooltip}
            style={{ left: position.x, top: position.y }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className={styles.tooltipHeader}>
                <div className={styles.tooltipAvatar}>
                    {commit.author_avatar ? (
                        <img src={commit.author_avatar} alt={commit.author_name} />
                    ) : (
                        <div className={styles.avatarFallback}>
                            {commit.author_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className={styles.tooltipAuthorInfo}>
                    <span className={styles.tooltipAuthor}>{commit.author_name}</span>
                    <span className={styles.tooltipTime}>
                        {getRelativeTime(commit.timestamp)} ({commit.date})
                    </span>
                </div>
            </div>
            <div className={styles.tooltipMessage}>{commit.message}</div>
            <div className={styles.tooltipStats}>
                <span>{commit.files_changed} files changed</span>
                {commit.insertions > 0 && (
                    <span className={styles.insertions}>{commit.insertions} additions(+)</span>
                )}
                {commit.deletions > 0 && (
                    <span className={styles.deletions}>{commit.deletions} deletions(-)</span>
                )}
            </div>
            {(commit.branches?.length ?? 0) > 0 && (
                <div className={styles.tooltipBranches}>
                    {(commit.branches ?? []).map((branch) => (
                        <span 
                            key={branch} 
                            className={`${styles.tooltipBranch} ${branch.includes('origin') ? styles.remoteBranch : styles.localBranch}`}
                        >
                            {branch.includes('origin') ? <Cloud size={10} /> : <CircleDot size={10} />}
                            {branch.replace('origin/', '')}
                        </span>
                    ))}
                </div>
            )}
            <div className={styles.tooltipFooter}>
                <span className={styles.tooltipHash}>{commit.short_hash}</span>
                {getGitHubUrl(remoteName) && (
                    <button 
                        className={styles.tooltipLink} 
                        onClick={() => openOnGitHub(commit.hash, remoteName)}
                    >
                        Open on GitHub
                    </button>
                )}
            </div>
        </div>
    );
};
