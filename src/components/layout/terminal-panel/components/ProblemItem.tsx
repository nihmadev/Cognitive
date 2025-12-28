import clsx from 'clsx';
import { type UnifiedProblem } from './useProblemsMerge';
import styles from './ProblemsPanel.module.css';

interface ProblemItemProps {
    problem: UnifiedProblem;
    onClick: () => void;
}

export const ProblemItem = ({ problem, onClick }: ProblemItemProps) => {
    const isError = problem.type === 'error';

    return (
        <div className={styles.problemItem} onClick={onClick}>
            <span className={clsx(styles.problemIcon, isError ? styles.errorIcon : styles.warningIcon)}>
                {isError ? '⊗' : '⚠'}
            </span>
            <span className={styles.problemMessage}>{problem.message}</span>
            {problem.code && (
                <span className={styles.problemCode}>{problem.source}({problem.code})</span>
            )}
            <span className={styles.problemLocation}>
                [Ln {problem.line}, Col {problem.column}]
            </span>
        </div>
    );
};
