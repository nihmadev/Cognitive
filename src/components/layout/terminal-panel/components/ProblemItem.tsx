import clsx from 'clsx';
import { type UnifiedProblem } from './useProblemsMerge';
import styles from './ProblemsPanel.module.css';

interface ProblemItemProps {
    problem: UnifiedProblem;
    onClick: () => void;
}

export const ProblemItem = ({ problem, onClick }: ProblemItemProps) => {
    const isError = problem.type === 'error';
    
    // Получаем расширение файла из пути
    const getFileExtension = (filePath: string) => {
        const parts = filePath.split(/[\\/]/);
        const fileName = parts[parts.length - 1];
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
    };
    
    const fileExtension = getFileExtension(problem.path);

    return (
        <div className={styles.problemItem} onClick={onClick}>
            <span className={clsx(styles.problemIcon, isError ? styles.errorIcon : styles.warningIcon)}>
                {isError ? '⊗' : '⚠'}
            </span>
            <div className={styles.problemContent}>
                <span className={styles.problemMessage}>{problem.message}</span>
                {problem.code && (
                    <span className={styles.problemCode}>{fileExtension}({problem.code})</span>
                )}
            </div>
            <span className={styles.problemLocation}>
                [Ln {problem.line}, Col {problem.column}]
            </span>
        </div>
    );
};
