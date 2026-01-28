import { useCallback, useMemo } from 'react';
import { type FileDiagnostics, type MonacoDiagnostic } from '../../../../store/diagnosticsStore';


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
    path: string;           // Относительный путь для отображения
    fullPath: string;       // Полный путь для открытия файла
    displayPath: string;    
    problems: UnifiedProblem[];
    errorCount: number;
    warningCount: number;
}

interface UseProblemsMergeParams {
    monacoDiagnostics: Record<string, MonacoDiagnostic[]>;
    lspDiagnostics?: Record<string, MonacoDiagnostic[]>;
    currentWorkspace: string | null;
}

export function useProblemsMerge({ monacoDiagnostics, lspDiagnostics = {}, currentWorkspace }: UseProblemsMergeParams) {
    // Объединяем Monaco и LSP диагностику
    const monacoFiles = useMemo((): FileDiagnostics[] => {
        const result: FileDiagnostics[] = [];
        const allPaths = new Set([
            ...Object.keys(monacoDiagnostics),
            ...Object.keys(lspDiagnostics)
        ]);

        for (const fullPath of allPaths) {
            const monacoDiags = monacoDiagnostics[fullPath] || [];
            const lspDiags = lspDiagnostics[fullPath] || [];
            
            // Объединяем диагностику, избегая дубликатов
            const allDiagnostics = [...monacoDiags];
            for (const lspDiag of lspDiags) {
                // Проверяем, нет ли уже такой же диагностики
                const isDuplicate = allDiagnostics.some(d => 
                    d.line === lspDiag.line &&
                    d.column === lspDiag.column &&
                    d.message === lspDiag.message
                );
                if (!isDuplicate) {
                    allDiagnostics.push(lspDiag);
                }
            }

            if (allDiagnostics.length === 0) continue;

            const normalizedPath = fullPath.replace(/\\/g, '/');
            const fileName = normalizedPath.split(/[\\/]/).pop() || normalizedPath;
            const errorCount = allDiagnostics.filter(d => d.type === 'error').length;
            const warningCount = allDiagnostics.filter(d => d.type === 'warning').length;
            
            result.push({ 
                file: fileName, 
                path: normalizedPath, 
                diagnostics: allDiagnostics, 
                errorCount, 
                warningCount 
            });
        }
        return result.sort((a, b) => a.path.localeCompare(b.path));
    }, [monacoDiagnostics, lspDiagnostics]);

    
    const getRelativePath = useCallback((fullPath: string): string => {
        const normalized = fullPath.replace(/\\/g, '/');
        
        if (!currentWorkspace) {
            return normalized.split(/[\\/]/).pop() || normalized;
        }
        
        const workspaceNormalized = currentWorkspace.replace(/\\/g, '/');
        
        // Проверяем точное совпадение
        if (normalized.startsWith(workspaceNormalized)) {
            return normalized.slice(workspaceNormalized.length).replace(/^\/+/, '');
        }
        
        // Пробуем добавить слеш в конец workspace для сравнения
        const workspaceWithSlash = workspaceNormalized.endsWith('/') ? workspaceNormalized : workspaceNormalized + '/';
        if (normalized.startsWith(workspaceWithSlash)) {
            return normalized.slice(workspaceWithSlash.length).replace(/^\/+/, '');
        }
        
        // Ищем общую часть пути
        const pathParts = normalized.split('/');
        const workspaceParts = workspaceNormalized.split('/');
        
        let commonIndex = 0;
        for (let i = 0; i < Math.min(pathParts.length, workspaceParts.length); i++) {
            if (pathParts[i] === workspaceParts[i]) {
                commonIndex++;
            } else {
                break;
            }
        }
        
        if (commonIndex > 0) {
            return pathParts.slice(commonIndex).join('/');
        }
        
        return normalized.split(/[\\/]/).pop() || normalized;
    }, [currentWorkspace]);

    
    const getFullPath = useCallback((relativePath: string): string => {
        if (!currentWorkspace) return relativePath.replace(/\\/g, '/');
        if (relativePath.startsWith('/') || /^[a-zA-Z]:/.test(relativePath)) {
            return relativePath.replace(/\\/g, '/');
        }
        return `${currentWorkspace}/${relativePath}`.replace(/\\/g, '/').replace(/\/+/g, '/');
    }, [currentWorkspace]);

    
    const mergedProblems = useMemo((): UnifiedFileProblems[] => {
        const fileMap = new Map<string, { problems: UnifiedProblem[], relPath: string, fullPath: string }>();

        
        for (const file of monacoFiles) {
            const fullPath = file.path; // Путь уже нормализован в monacoFiles (полный путь с прямыми слэшами)
            const relPath = getRelativePath(fullPath);
            
            // Используем относительный путь как ключ для дедупликации, 
            // так как он более стабилен и уникален для каждого файла
            const dedupeKey = relPath;
            
            if (!fileMap.has(dedupeKey)) {
                fileMap.set(dedupeKey, { problems: [], relPath, fullPath });
            }
            const existing = fileMap.get(dedupeKey)!;
            
            for (const d of file.diagnostics) {
                // Проверяем на дубликаты по ID перед добавлением
                if (!existing.problems.some(p => p.id === d.id)) {
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

        
        const result: UnifiedFileProblems[] = [];
        for (const [, { problems, relPath, fullPath }] of fileMap) {
            if (problems.length === 0) continue;
            
            const fileName = relPath.split(/[\\/]/).pop() || relPath;
            const errorCount = problems.filter(p => p.type === 'error').length;
            const warningCount = problems.filter(p => p.type === 'warning').length;

            problems.sort((a, b) => a.line - b.line);

            result.push({
                file: fileName,
                path: relPath,
                fullPath: fullPath,
                displayPath: relPath,
                problems,
                errorCount,
                warningCount,
            });
        }

        return result.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
    }, [monacoFiles, getRelativePath, getFullPath]);

    return { mergedProblems, getFullPath };
}
