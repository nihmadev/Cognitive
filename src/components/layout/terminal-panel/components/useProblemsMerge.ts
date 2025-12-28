import { useCallback, useMemo } from 'react';
import { type FileProblems } from '../../../../lib/tauri-api';
import { type FileDiagnostics, type MonacoDiagnostic } from '../../../../store/diagnosticsStore';

// Unified problem type for display
export interface UnifiedProblem {
    id: string;
    type: 'error' | 'warning' | 'info' | 'hint';
    file: string;
    path: string;
    line: number;
    column: number;
    message: string;
    code: string | null;
    source: string;
}

export interface UnifiedFileProblems {
    file: string;
    path: string;           // Full path for file opening
    displayPath: string;    // Relative path for display
    problems: UnifiedProblem[];
    errorCount: number;
    warningCount: number;
}

interface UseProblemsMergeParams {
    oxcProblems: FileProblems[];
    monacoDiagnostics: Record<string, MonacoDiagnostic[]>;
    currentWorkspace: string | null;
}

export function useProblemsMerge({ oxcProblems, monacoDiagnostics, currentWorkspace }: UseProblemsMergeParams) {
    // Compute FileDiagnostics from raw data
    const monacoFiles = useMemo((): FileDiagnostics[] => {
        const result: FileDiagnostics[] = [];
        for (const [fullPath, diagnostics] of Object.entries(monacoDiagnostics)) {
            if (diagnostics.length === 0) continue;
            const fileName = fullPath.split(/[\\/]/).pop() || fullPath;
            const errorCount = diagnostics.filter(d => d.type === 'error').length;
            const warningCount = diagnostics.filter(d => d.type === 'warning').length;
            result.push({ file: fileName, path: fullPath, diagnostics, errorCount, warningCount });
        }
        return result.sort((a, b) => a.path.localeCompare(b.path));
    }, [monacoDiagnostics]);

    // Helper to get relative path from full path
    const getRelativePath = useCallback((fullPath: string): string => {
        if (!currentWorkspace) return fullPath;
        const normalized = fullPath.replace(/\\/g, '/');
        const workspaceNormalized = currentWorkspace.replace(/\\/g, '/');
        if (normalized.startsWith(workspaceNormalized)) {
            return normalized.slice(workspaceNormalized.length).replace(/^\//, '');
        }
        return fullPath;
    }, [currentWorkspace]);

    // Helper to get full path from relative path
    const getFullPath = useCallback((relativePath: string): string => {
        if (!currentWorkspace) return relativePath;
        if (relativePath.startsWith('/') || /^[a-zA-Z]:/.test(relativePath)) {
            return relativePath;
        }
        return `${currentWorkspace}/${relativePath}`.replace(/\\/g, '/').replace(/\/+/g, '/');
    }, [currentWorkspace]);

    // Merge OXC and Monaco diagnostics
    const mergedProblems = useMemo((): UnifiedFileProblems[] => {
        const fileMap = new Map<string, { problems: UnifiedProblem[], fullPath: string }>();

        // Add OXC problems (they have relative paths)
        for (const file of oxcProblems) {
            const relPath = file.path;
            const fullPath = getFullPath(relPath);
            
            if (!fileMap.has(relPath)) {
                fileMap.set(relPath, { problems: [], fullPath });
            }
            for (const p of file.problems) {
                fileMap.get(relPath)!.problems.push({
                    id: `oxc-${p.id}`,
                    type: p.type === 'error' ? 'error' : 'warning',
                    file: p.file,
                    path: p.path,
                    line: p.line,
                    column: p.column,
                    message: p.message,
                    code: p.code,
                    source: p.source,
                });
            }
        }

        // Add Monaco diagnostics
        for (const file of monacoFiles) {
            const fullPath = file.path;
            const relPath = getRelativePath(fullPath);
            
            if (!fileMap.has(relPath)) {
                fileMap.set(relPath, { problems: [], fullPath });
            }
            const existing = fileMap.get(relPath)!;
            existing.fullPath = fullPath;
            
            for (const d of file.diagnostics) {
                const isDuplicate = existing.problems.some(
                    e => e.line === d.line && 
                         (e.message === d.message || e.message.includes(d.message) || d.message.includes(e.message))
                );
                
                if (!isDuplicate) {
                    existing.problems.push({
                        id: d.id,
                        type: d.type,
                        file: d.file,
                        path: d.path,
                        line: d.line,
                        column: d.column,
                        message: d.message,
                        code: d.code,
                        source: d.source,
                    });
                }
            }
        }

        // Convert to array and calculate counts
        const result: UnifiedFileProblems[] = [];
        for (const [relPath, { problems, fullPath }] of fileMap) {
            if (problems.length === 0) continue;
            
            const fileName = relPath.split(/[\\/]/).pop() || relPath;
            const errorCount = problems.filter(p => p.type === 'error').length;
            const warningCount = problems.filter(p => p.type === 'warning').length;

            problems.sort((a, b) => a.line - b.line);

            result.push({
                file: fileName,
                path: fullPath,
                displayPath: relPath,
                problems,
                errorCount,
                warningCount,
            });
        }

        return result.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
    }, [oxcProblems, monacoFiles, getRelativePath, getFullPath]);

    return { mergedProblems, getFullPath };
}
