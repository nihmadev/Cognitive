import { Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { CommitSectionProps } from '../types';
import styles from '../GitPane.module.css';

type CommitAction = 'commit' | 'commit-push' | 'commit-sync' | 'commit-amend';

export const CommitSection = ({ 
    commitMessage, 
    filesCount, 
    onCommitMessageChange, 
    onCommit 
}: CommitSectionProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleAction('commit-push');
        }
    };

    const handleAction = (action: CommitAction) => {
        setShowMenu(false);
        // TODO: Implement different actions
        switch (action) {
            case 'commit':
                console.log('Commit only');
                onCommit();
                break;
            case 'commit-push':
                console.log('Commit & Push');
                onCommit();
                break;
            case 'commit-sync':
                console.log('Commit & Sync');
                onCommit();
                break;
            case 'commit-amend':
                console.log('Commit (Amend)');
                onCommit();
                break;
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const isDisabled = !commitMessage.trim() || filesCount === 0;

    return (
        <div className={styles.commitSection}>
            <textarea
                className={styles.commitInput}
                placeholder="Message (Ctrl+Enter to commit)"
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className={styles.commitBtnGroup} ref={menuRef}>
                <button 
                    className={styles.commitBtn}
                    onClick={() => handleAction('commit-push')}
                    disabled={isDisabled}
                >
                    <Check size={14} />
                    Commit & Push
                </button>
                <button 
                    className={styles.commitBtnDropdown}
                    onClick={() => setShowMenu(!showMenu)}
                    disabled={isDisabled}
                    aria-label="More commit options"
                >
                    <ChevronDown size={14} />
                </button>
                {showMenu && (
                    <div className={styles.commitMenu}>
                        <button 
                            className={styles.commitMenuItem}
                            onClick={() => handleAction('commit')}
                        >
                            <Check size={14} />
                            Commit
                        </button>
                        <button 
                            className={styles.commitMenuItem}
                            onClick={() => handleAction('commit-amend')}
                        >
                            <Check size={14} />
                            Commit (Amend)
                        </button>
                        <div className={styles.commitMenuDivider} />
                        <button 
                            className={styles.commitMenuItem}
                            onClick={() => handleAction('commit-push')}
                        >
                            <Check size={14} />
                            Commit & Push
                        </button>
                        <button 
                            className={styles.commitMenuItem}
                            onClick={() => handleAction('commit-sync')}
                        >
                            <Check size={14} />
                            Commit & Sync
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
