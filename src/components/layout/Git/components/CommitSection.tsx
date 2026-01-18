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
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleAction('commit-push');
        }
    };

    const handleAction = (action: CommitAction) => {
        setShowMenu(false);
        
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

    const toggleMenu = () => {
        if (!showMenu && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: buttonRect.bottom + 20,
                left: buttonRect.left + 70
            });
        }
        setShowMenu(!showMenu);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
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
            <div className={styles.commitBtnGroup}>
                <button 
                    className={styles.commitBtn}
                    onClick={() => handleAction('commit-push')}
                    disabled={isDisabled}
                >
                    <Check size={14} />
                    Commit & Push
                </button>
                <button 
                    ref={buttonRef}
                    className={styles.commitBtnDropdown}
                    onClick={toggleMenu}
                    aria-label="More commit options"
                >
                    <ChevronDown size={14} />
                </button>
            </div>
            {showMenu && (
                <div 
                    ref={menuRef}
                    className={styles.commitMenu}
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`
                    }}
                >
                    <button 
                        className={styles.commitMenuItem}
                        onClick={() => handleAction('commit')}
                        disabled={isDisabled}
                        style={{ color: '#ffffff' }}
                    >
                        Commit
                    </button>
                    <button 
                        className={styles.commitMenuItem}
                        onClick={() => handleAction('commit-amend')}
                        disabled={isDisabled}
                        style={{ color: '#ffffff' }}
                    >
                        Commit (Amend)
                    </button>
                    <div className={styles.commitMenuDivider} />
                    <button 
                        className={styles.commitMenuItem}
                        onClick={() => handleAction('commit-push')}
                        disabled={isDisabled}
                        style={{ color: '#ffffff' }}
                    >
                        Commit & Push
                    </button>
                    <button 
                        className={styles.commitMenuItem}
                        onClick={() => handleAction('commit-sync')}
                        disabled={isDisabled}
                        style={{ color: '#ffffff' }}
                    >
                        Commit & Sync
                    </button>
                </div>
            )}
        </div>
    );
};
