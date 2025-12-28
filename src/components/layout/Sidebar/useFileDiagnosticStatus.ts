import { useMemo } from 'react';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';

// Получить статус диагностики для файла
export const useFileDiagnosticStatus = (filePath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    
    return useMemo(() => {
        if (isDir) return { hasError: false, hasWarning: false };
        
        const diagnostics = monacoDiagnostics[filePath];
        if (!diagnostics || diagnostics.length === 0) {
            return { hasError: false, hasWarning: false };
        }
        
        let hasError = false;
        let hasWarning = false;
        
        for (const d of diagnostics) {
            if (d.type === 'error') {
                hasError = true;
                break; // Ошибка имеет приоритет
            } else if (d.type === 'warning') {
                hasWarning = true;
            }
        }
        
        return { hasError, hasWarning };
    }, [filePath, isDir, monacoDiagnostics]);
};
