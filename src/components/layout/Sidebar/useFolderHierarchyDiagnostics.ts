import { useMemo } from 'react';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';


export const useFolderHierarchyDiagnostics = (folderPath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    const lspDiagnostics = useDiagnosticsStore(state => state.lspDiagnostics);
    
    return useMemo(() => {
        if (!isDir) return { hasError: false, hasWarning: false };
        
        let hasError = false;
        let hasWarning = false;
        
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');
        
        // Объединяем monaco и lsp диагностику
        const allDiagnostics = { ...monacoDiagnostics, ...lspDiagnostics };
        
        for (const [filePath, diagnostics] of Object.entries(allDiagnostics)) {
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            if (normalizedFilePath.startsWith(normalizedFolderPath + '/')) {
                for (const d of diagnostics) {
                    if (d.type === 'error') {
                        hasError = true;
                        break; 
                    } else if (d.type === 'warning') {
                        hasWarning = true;
                    }
                }
                if (hasError) break; 
            }
        }
        
        return { hasError, hasWarning };
    }, [folderPath, isDir, monacoDiagnostics, lspDiagnostics]);
};



export const useParentFolderDiagnostics = (folderPath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    const lspDiagnostics = useDiagnosticsStore(state => state.lspDiagnostics);
    
    return useMemo(() => {
        if (!isDir) return { hasError: false, hasWarning: false };
        
        let hasError = false;
        let hasWarning = false;
        
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');
        
        // Объединяем monaco и lsp диагностику
        const allDiagnostics = { ...monacoDiagnostics, ...lspDiagnostics };
        
        for (const [filePath, diagnostics] of Object.entries(allDiagnostics)) {
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            if (normalizedFilePath.startsWith(normalizedFolderPath + '/')) {
                for (const d of diagnostics) {
                    if (d.type === 'error') {
                        hasError = true;
                        break; 
                    } else if (d.type === 'warning') {
                        hasWarning = true;
                    }
                }
                if (hasError) break; 
            }
        }
        
        return { hasError, hasWarning };
    }, [folderPath, isDir, monacoDiagnostics, lspDiagnostics]);
};
