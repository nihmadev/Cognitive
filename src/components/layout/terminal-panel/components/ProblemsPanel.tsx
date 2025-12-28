import { useState, useEffect, useCallback } from 'react';
import { tauriApi, type FileProblems } from '../../../../lib/tauri-api';
import { useProjectStore } from '../../../../store/projectStore';
import { useDiagnosticsStore } from '../../../../store/diagnosticsStore';
import { useProblemsMerge, type UnifiedProblem } from './useProblemsMerge';
import { FileProblemsGroup } from './FileProblemsGroup';
import styles from './ProblemsPanel.module.css';

interface ProblemsPanelProps {
    filterText?: string;
}

export const ProblemsPanel = ({ filterText = '' }: ProblemsPanelProps) => {
    const [oxcProblems, setOxcProblems] = useState<FileProblems[]>([]);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanStats, setScanStats] = useState<{ timeMs: number; cacheHits: number; cacheMisses: number } | null>(null);
    
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);
    const openFile = useProjectStore((state) => state.openFile);
    
    // Monaco diagnostics from store
    const monacoDiagnostics = useDiagnosticsStore((state) => state.monacoDiagnostics);
    
    // Use merged problems hook
    const { mergedProblems } = useProblemsMerge({
        oxcProblems,
        monacoDiagnostics,
        currentWorkspace,
    });

    const fetchProblems = useCallback(async () => {
        if (!currentWorkspace) {
            setOxcProblems([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await tauriApi.getProblems(currentWorkspace);
            setOxcProblems(result.files);
            setScanStats({
                timeMs: result.scan_time_ms,
                cacheHits: result.cache_hits,
                cacheMisses: result.cache_misses,
            });
        } catch (err) {
            console.error('Failed to fetch problems:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch problems');
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace]);

    useEffect(() => {
        fetchProblems();
        
        // Refresh OXC problems every 10 seconds
        const interval = setInterval(fetchProblems, 10000);
        return () => clearInterval(interval);
    }, [fetchProblems]);

    // Auto-expand files with problems
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
        let fullPath = filePath.replace(/\\/g, '/');
        
        // Ensure we have an absolute path
        if (!fullPath.startsWith('/') && !/^[a-zA-Z]:/.test(fullPath)) {
            fullPath = currentWorkspace 
                ? `${currentWorkspace}/${fullPath}`.replace(/\/+/g, '/')
                : fullPath;
        }
        
        // Validate path before opening
        if (!fullPath || fullPath === '/' || fullPath === currentWorkspace) {
            console.error('Invalid file path:', fullPath);
            return;
        }
        
        try {
            openFile(fullPath);
            
            // Navigate to line/column after a small delay to ensure file is loaded
            const column = Math.max(1, problem.column);
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('editor-reveal-line', {
                    detail: {
                        path: fullPath,
                        line: Math.max(1, problem.line),
                        start: column - 1,
                        end: column - 1
                    }
                }));
            }, 150);
        } catch (error) {
            console.error('Failed to open file:', fullPath, error);
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

    if (isLoading && mergedProblems.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <span className={styles.spinner}>⟳</span> Checking for problems...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <span className={styles.errorText}>⚠</span> {error}
                    <button className={styles.retryButton} onClick={fetchProblems}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    No problems detected in workspace
                    {scanStats && (
                        <span className={styles.scanStats}>
                            {' '}(scanned in {scanStats.timeMs}ms, cache: {scanStats.cacheHits}/{scanStats.cacheHits + scanStats.cacheMisses})
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {scanStats && (
                <div className={styles.statsBar}>
                    ⚡ {scanStats.timeMs}ms | Cache: {scanStats.cacheHits} hits, {scanStats.cacheMisses} misses
                </div>
            )}
            <div className={styles.list}>
                {filteredData.map((fileProblems) => (
                    <FileProblemsGroup
                        key={fileProblems.path}
                        fileProblems={fileProblems}
                        isExpanded={expandedFiles.has(fileProblems.path)}
                        onToggle={() => toggleFile(fileProblems.path)}
                        onProblemClick={handleProblemClick}
                    />
                ))}
            </div>
        </div>
    );
};

export type { UnifiedProblem as Problem };
