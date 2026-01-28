import clsx from 'clsx';
import { type UnifiedProblem, type UnifiedFileProblems } from './useProblemsMerge';
import { ProblemItem } from './ProblemItem';
import { getFileIcon } from '../../../../utils/fileIcons';
import styles from './ProblemsPanel.module.css';

interface FileProblemsGroupProps {
    fileProblems: UnifiedFileProblems;
    isExpanded: boolean;
    onToggle: () => void;
    onProblemClick: (problem: UnifiedProblem, filePath: string) => void;
}

export const FileProblemsGroup = ({ fileProblems, isExpanded, onToggle, onProblemClick }: FileProblemsGroupProps) => {
    const errorCount = fileProblems.errorCount;
    const warningCount = fileProblems.warningCount;
    const totalCount = errorCount + warningCount;

    return (
        <div className={styles.fileGroup}>
            <button className={styles.fileHeader} onClick={onToggle}>
                <span className={clsx(styles.chevron, isExpanded && styles.chevronExpanded)}>
                    ›
                </span>
                <span className={styles.fileIcon}>
                    {getFileIcon(fileProblems.file, fileProblems.displayPath)}
                </span>
                <span className={styles.fileName}>{fileProblems.file}</span>
                {/* Количество ошибок рядом с именем файла */}
                {totalCount > 0 && (
                    <span className={clsx(
                        styles.problemCountInline,
                        errorCount > 0 ? styles.errorCount : styles.warningCount
                    )}>
                        {totalCount}
                    </span>
                )}
                <span className={styles.filePath}>{fileProblems.displayPath}</span>
            </button>
            
            {isExpanded && (
                <div className={styles.problemsList}>
                    {fileProblems.problems.map((problem) => (
                        <ProblemItem 
                            key={problem.id} 
                            problem={problem} 
                            onClick={() => onProblemClick(problem, fileProblems.fullPath)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
