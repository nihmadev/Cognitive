import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import styles from '../../../App.module.css';

interface GitSectionProps {
    branch: string;
    hasChanges: boolean;
    isPushing: boolean;
    onPush: () => void;
    onOpenBranchModal: () => void;
}

export const GitSection: React.FC<GitSectionProps> = ({
    branch,
    hasChanges,
    isPushing,
    onPush,
    onOpenBranchModal
}) => {
    return (
        <div
            className={`${styles.statusItem} ${hasChanges ? styles.gitChanged : ''}`}
            onClick={onOpenBranchModal}
            style={{ cursor: 'pointer' }}
            title="Click to manage branches"
        >
            <FontAwesomeIcon
                icon={faCodeBranch}
                style={{
                    fontSize: '16px',
                    marginRight: '4px'
                }}
            />
            <span style={{ verticalAlign: 'middle' }}>
                {branch} {hasChanges && '*'}
            </span>

            {hasChanges && (
                <button
                    className={styles.pushButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPush();
                    }}
                    disabled={isPushing}
                    style={{
                        cursor: isPushing ? 'not-allowed' : 'pointer',
                        opacity: isPushing ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        border: 'none',
                        background: 'none',
                        color: 'inherit',
                        marginLeft: '4px'
                    }}
                    title={isPushing ? 'Committing and pushing...' : 'Commit changes with random message and push to remote'}
                >
                    <FontAwesomeIcon
                        icon={faCloudArrowUp}
                        style={{ fontSize: '14px' }}
                    />
                </button>
            )}
        </div>
    );
};
