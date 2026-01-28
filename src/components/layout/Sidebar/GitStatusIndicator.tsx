import { useEffect } from 'react';
import { FileGitStatus } from './useFileGitStatus';
import styles from './GitStatusIndicator.module.css';

interface GitStatusIndicatorProps {
    status: FileGitStatus;
    onClassName?: (className: string) => void;
    showDot?: boolean; // Для папок показываем кружок вместо букв
    isFile?: boolean; // Добавляем флаг для определения типа элемента
}

export const GitStatusIndicator = ({ status, onClassName, showDot = false, isFile = false }: GitStatusIndicatorProps) => {
    
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
                case 'ignored':
                    return styles.ignored;
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
            case 'ignored':
                return {
                    text: 'I',
                    className: styles.ignored,
                    title: '● Ignored by .gitignore'
                };
            default:
                return null;
        }
    };

    const statusInfo = getStatusInfo();
    if (!statusInfo) {
        return null;
    }

    // Для папок показываем кружок, для файлов - буквы но с позиционированием как у кружков
    if (showDot && !isFile) {
        return (
            <span 
                className={`${styles.gitStatusDot} ${statusInfo.className}`}
                title={statusInfo.title}
            />
        );
    }

    // Для файлов показываем буквы но с позиционированием как у кружков
    const className = showDot && isFile ? `${styles.gitStatusAsDot} ${statusInfo.className}` : `${styles.gitStatus} ${statusInfo.className}`;

    return (
        <span 
            className={className}
            title={statusInfo.title}
        >
            {statusInfo.text}
        </span>
    );
};
