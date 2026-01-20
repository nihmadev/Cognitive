import { useMemo } from 'react';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';


export const useFileDiagnosticStatus = (filePath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    const lspDiagnostics = useDiagnosticsStore(state => state.lspDiagnostics);
    
    return useMemo(() => {
        if (isDir) return { hasError: false, hasWarning: false, errorCount: 0, warningCount: 0 };
        
        const normalizedPath = filePath.replace(/\\/g, '/');
        const monacoDiags = monacoDiagnostics[normalizedPath] || [];
        const lspDiags = lspDiagnostics[normalizedPath] || [];
        
        // Объединяем диагностику и дедуплицируем по позиции и сообщению
        const uniqueDiags = new Map<string, { type: 'error' | 'warning' }>();
        
        for (const d of [...monacoDiags, ...lspDiags]) {
            // Создаем уникальный ключ на основе позиции и сообщения
            const key = `${d.line}:${d.column}:${d.endLine || d.line}:${d.endColumn || d.column}:${d.message}`;
            
            // Если уже есть такая диагностика, приоритет у error над warning
            const existing = uniqueDiags.get(key);
            const diagType = (d.type === 'error' || d.type === 'warning') ? d.type : 'warning';
            if (!existing || (diagType === 'error' && existing.type === 'warning')) {
                uniqueDiags.set(key, { type: diagType });
            }
        }
        
        let hasError = false;
        let hasWarning = false;
        let errorCount = 0;
        let warningCount = 0;
        
        for (const diag of uniqueDiags.values()) {
            if (diag.type === 'error') {
                hasError = true;
                errorCount++;
            } else if (diag.type === 'warning') {
                hasWarning = true;
                warningCount++;
            }
        }
        
        return { hasError, hasWarning, errorCount, warningCount };
    }, [filePath, isDir, monacoDiagnostics, lspDiagnostics]);
};
