import { useMemo } from 'react';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';

// Получить статус диагностики для папки
export const useFolderDiagnosticStatus = (folderPath: string, isDir: boolean) => {
    const monacoDiagnostics = useDiagnosticsStore(state => state.monacoDiagnostics);
    
    return useMemo(() => {
        if (!isDir) return { hasError: false, hasWarning: false };
        
        let hasError = false;
        let hasWarning = false;
        
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');
        
        for (const [filePath, diagnostics] of Object.entries(monacoDiagnostics)) {
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            // Проверяем все файлы в текущей папке и всех вложенных папках
            if (normalizedFilePath.startsWith(normalizedFolderPath + '/')) {
                for (const d of diagnostics) {
                    if (d.type === 'error') {
                        hasError = true;
                        break; // Нашли ошибку - выходим из цикла диагностики
                    } else if (d.type === 'warning') {
                        hasWarning = true;
                    }
                }
                if (hasError) break; // Нашли ошибку - выходим из цикла файлов
            }
        }
        
        return { hasError, hasWarning };
    }, [folderPath, isDir, monacoDiagnostics]);
};
