import { useEffect } from 'react';
import { FileGitStatus } from './useFileGitStatus';
import styles from './GitStatusIndicator.module.css';

interface GitStatusIndicatorProps {
    status: FileGitStatus;
    onClassName?: (className: string) => void;
}

export const GitStatusIndicator = ({ status, onClassName }: GitStatusIndicatorProps) => {
    // Use useEffect to call onClassName after render, not during render
    useEffect(() => {
        if (!status.status) {
            onClassName?.('');
            return;
        }

        const getStatusInfo = () => {
            switch (status.status) {
                case 'conflicted':
                    return styles.conflicted;
                case 'deleted':
                    return styles.deleted;
                case 'modified':
                    return styles.modified;
                case 'untracked':
                    return styles.untracked;
                case 'staged':
                    return styles.staged;
                default:
                    return '';
            }
        };

        onClassName?.(getStatusInfo());
    }, [status.status, onClassName]);

    if (!status.status) {
        return null;
    }

    const getStatusInfo = () => {
        switch (status.status) {
            case 'conflicted':
                return {
                    text: 'C',
                    className: styles.conflicted,
                    title: 'Merge conflict'
                };
            case 'deleted':
                return {
                    text: 'D',
                    className: styles.deleted,
                    title: status.isStaged ? 'Staged deletion' : 'Deleted'
                };
            case 'modified':
                return {
                    text: 'M',
                    className: styles.modified,
                    title: status.isStaged ? 'Staged changes' : 'Modified'
                };
            case 'untracked':
                return {
                    text: 'U',
                    className: styles.untracked,
                    title: 'Untracked file'
                };
            case 'staged':
                return {
                    text: 'A',
                    className: styles.staged,
                    title: 'Staged new file'
                };
            default:
                return null;
        }
    };

    const statusInfo = getStatusInfo();
    if (!statusInfo) {
        return null;
    }

    return (
        <span 
            className={`${styles.gitStatus} ${statusInfo.className}`}
            title={statusInfo.title}
        >
            {statusInfo.text}
        </span>
    );
};
