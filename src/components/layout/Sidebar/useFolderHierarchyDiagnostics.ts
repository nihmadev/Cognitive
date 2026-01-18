import { useMemo } from 'react';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';


export const useFolderHierarchyDiagnostics = (folderPath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    
    return useMemo(() => {
        if (!isDir) return { hasError: false, hasWarning: false };
        
        let hasError = false;
        let hasWarning = false;
        
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');
        
        
        for (const [filePath, diagnostics] of Object.entries(monacoDiagnostics)) {
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
    }, [folderPath, isDir, monacoDiagnostics]);
};



export const useParentFolderDiagnostics = (folderPath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    
    return useMemo(() => {
        if (!isDir) return { hasError: false, hasWarning: false };
        
        let hasError = false;
        let hasWarning = false;
        
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');
        
        
        for (const [filePath, diagnostics] of Object.entries(monacoDiagnostics)) {
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
    }, [folderPath, isDir, monacoDiagnostics]);
};
