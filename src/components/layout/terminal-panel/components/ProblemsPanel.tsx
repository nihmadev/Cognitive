import { useState, useEffect } from 'react';
import { useProjectStore } from '../../../../store/projectStore';
import { useDiagnosticsStore } from '../../../../store/diagnosticsStore';
import { useProblemsMerge, type UnifiedProblem } from './useProblemsMerge';
import { FileProblemsGroup } from './FileProblemsGroup';
import styles from './ProblemsPanel.module.css';

interface ProblemsPanelProps {
    filterText?: string;
}

export const ProblemsPanel = ({ filterText = '' }: ProblemsPanelProps) => {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);
    const openFile = useProjectStore((state) => state.openFile);
    
    // Используем Monaco и LSP диагностику
    const monacoDiagnostics = useDiagnosticsStore((state) => state.monacoDiagnostics);
    const lspDiagnostics = useDiagnosticsStore((state) => state.lspDiagnostics);
    
    // Преобразуем диагностику в формат FileProblems
    const { mergedProblems } = useProblemsMerge({
        monacoDiagnostics,
        lspDiagnostics,
        currentWorkspace,
    });

    
    useEffect(() => {
        const allPaths = new Set(mergedProblems.map(f => f.path));
        setExpandedFiles(allPaths);
    }, [mergedProblems.length]);

    const toggleFile = (path: string) => {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleProblemClick = async (problem: UnifiedProblem, filePath: string) => {
        // filePath уже полный путь с прямыми слэшами (например home/one/Cognitive/src/index.css)
        // Нормализуем его для текущей ОС
        
        // Определяем ОС по формату пути (если есть диск C:, D: и т.д. - это Windows)
        const isWindows = /^[a-zA-Z]:/.test(filePath);
        
        // Нормализуем слэши для текущей ОС
        let fullPath = isWindows 
            ? filePath.replace(/\//g, '\\')
            : filePath.replace(/\\/g, '/');
        
        // Убираем дублирующиеся слэши
        fullPath = fullPath.replace(/[\\\/]+/g, isWindows ? '\\' : '/');
        
        if (!fullPath || fullPath === '/' || fullPath === currentWorkspace) {
            return;
        }
        
        try {
            const openFiles = useProjectStore.getState().openFiles;
            const isAlreadyOpen = openFiles.includes(fullPath);
            
            openFile(fullPath);
            
            
            const column = Math.max(1, problem.column);
            const delay = isAlreadyOpen ? 50 : 150;
            
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('editor-reveal-line', {
                    detail: {
                        path: fullPath,
                        line: Math.max(1, problem.line),
                        start: column - 1,
                        end: column - 1
                    }
                }));
            }, delay);
        } catch (error) {
        }
    };

    const filteredData = filterText
        ? mergedProblems.map(file => ({
            ...file,
            problems: file.problems.filter(p => 
                p.message.toLowerCase().includes(filterText.toLowerCase()) ||
                p.file.toLowerCase().includes(filterText.toLowerCase()) ||
                p.path.toLowerCase().includes(filterText.toLowerCase())
            )
        })).filter(file => file.problems.length > 0)
        : mergedProblems;

    return (
        <div className={styles.container}>
            {filteredData.length === 0 ? (
                <div className={styles.placeholder}>
                    No problems detected in workspace
                </div>
            ) : (
                <div className={styles.list}>
                    {filteredData.map((fileProblems) => (
                        <FileProblemsGroup
                            key={fileProblems.displayPath}
                            fileProblems={fileProblems}
                            isExpanded={expandedFiles.has(fileProblems.displayPath)}
                            onToggle={() => toggleFile(fileProblems.displayPath)}
                            onProblemClick={handleProblemClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export type { UnifiedProblem as Problem };
