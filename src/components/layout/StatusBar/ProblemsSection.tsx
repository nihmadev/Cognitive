import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import styles from '../../../App.module.css';

interface ProblemsSectionProps {
    errorCount: number;
    warningCount: number;
    onOpenProblems: () => void;
}

export const ProblemsSection: React.FC<ProblemsSectionProps> = ({
    errorCount,
    warningCount,
    onOpenProblems
}) => {
    return (
        <span className={styles.statusItem}>
            <span
                className={styles.error}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                onClick={onOpenProblems}
                title={`${errorCount} error${errorCount !== 1 ? 's' : ''} - Click to open Problems panel`}
            >
                <XCircle size={16} style={{ marginRight: '4px' }} />
                {errorCount}
            </span>
            <span
                className={styles.warning}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}
                onClick={onOpenProblems}
                title={`${warningCount} warning${warningCount !== 1 ? 's' : ''} - Click to open Problems panel`}
            >
                <AlertTriangle size={16} style={{ marginRight: '4px' }} />
                {warningCount}
            </span>
        </span>
    );
};
