import { Check } from 'lucide-react';
import { CommitSectionProps } from '../types';
import styles from '../GitPane.module.css';

export const CommitSection = ({ 
    commitMessage, 
    filesCount, 
    onCommitMessageChange, 
    onCommit 
}: CommitSectionProps) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            onCommit();
        }
    };

    return (
        <div className={styles.commitSection}>
            <textarea
                className={styles.commitInput}
                placeholder="Message (Ctrl+Enter to commit)"
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button 
                className={styles.commitBtn}
                onClick={onCommit}
                disabled={!commitMessage.trim() || filesCount === 0}
            >
                <Check size={14} />
                Commit & Push
            </button>
        </div>
    );
};
