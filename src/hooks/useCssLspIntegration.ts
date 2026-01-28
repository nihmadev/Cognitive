import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useDiagnosticsStore } from '../store/diagnosticsStore';
import {
  cssLspInitialize,
  cssLspDidOpen,
  cssLspDidChange,
  cssLspDidClose,
  onCssDiagnostics,
  isCssFile,
  type CssPublishDiagnosticsParams,
} from '../lib/tauri/css-lsp';

export function useCssLspIntegration() {
  const { activeFile, fileContents, currentWorkspace } = useProjectStore();
  const { setLspDiagnostics } = useDiagnosticsStore();
  const versionRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);

  // Инициализация CSS LSP
  useEffect(() => {
    if (!currentWorkspace || initializedRef.current) return;

    const initializeLsp = async () => {
      try {
        await cssLspInitialize(currentWorkspace);
        initializedRef.current = true;
      } catch (error) {
        // CSS LSP not available - continuing without it
        // Don't treat this as an error - CSS LSP is optional
        initializedRef.current = true; // Prevent retrying
      }
    };

    initializeLsp();
  }, [currentWorkspace]);

  // Подписка на диагностику
  useEffect(() => {
    const unsubscribe = onCssDiagnostics((params: CssPublishDiagnosticsParams) => {
      // Конвертируем URI обратно в путь
      const path = params.uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
      
      // Преобразуем диагностику в формат store
      const diagnostics = params.diagnostics.map((diag, index) => ({
        id: `css-lsp-${path}-${index}`,
        type: (diag.severity === 1 ? 'error' : 
               diag.severity === 2 ? 'warning' : 
               diag.severity === 3 ? 'info' : 'hint') as 'error' | 'warning' | 'info' | 'hint',
        file: path.split(/[\\/]/).pop() || path,
        path: path,
        line: diag.range.start.line + 1,
        column: diag.range.start.character + 1,
        endLine: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        message: diag.message,
        code: diag.code?.toString() || null,
        source: diag.source || 'css-lsp',
      }));

      setLspDiagnostics(path, diagnostics);
    });

    return unsubscribe;
  }, [setLspDiagnostics]);

  // Отслеживание открытия/изменения файлов
  useEffect(() => {
    if (!activeFile || !initializedRef.current || !isCssFile(activeFile)) {
      return;
    }

    const content = fileContents[activeFile] || '';

    const handleFileOpen = async () => {
      try {
        const version = versionRef.current.get(activeFile) || 0;
        
        if (version === 0) {
          // Первое открытие файла
          await cssLspDidOpen(activeFile, content);
          versionRef.current.set(activeFile, 1);
        } else {
          // Файл уже был открыт, отправляем изменения
          const newVersion = version + 1;
          await cssLspDidChange(activeFile, content, newVersion);
          versionRef.current.set(activeFile, newVersion);
        }
      } catch (error) {
        // CSS LSP error
      }
    };

    handleFileOpen();
  }, [activeFile, fileContents]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (!activeFile || !initializedRef.current || !isCssFile(activeFile)) {
        return;
      }

      cssLspDidClose(activeFile).catch((error) => {
        // Failed to close CSS file in LSP
      });
    };
  }, [activeFile]);
}
