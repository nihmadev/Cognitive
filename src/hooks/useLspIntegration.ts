import { useEffect, useRef } from 'react';
import { listenToLspDiagnostics, lspInitialize, lspDidOpen, lspDidChange, type LspDiagnosticsPayload } from '../lib/tauri/lsp';
import { useDiagnosticsStore, type MonacoDiagnostic } from '../store/diagnosticsStore';

interface UseLspIntegrationProps {
    currentWorkspace: string | null;
    activeFile: string | null;
    editorRef: React.MutableRefObject<any>;
    monacoRef: React.MutableRefObject<any>;
    fileContent: string;
    editorVersion: number;
}

/**
 * Hook для интеграции LSP с Monaco Editor
 * Инициализирует LSP сервер, отправляет уведомления об открытии/изменении файлов
 * и обрабатывает диагностику от LSP
 */
export function useLspIntegration({
    currentWorkspace,
    activeFile,
    editorRef,
    monacoRef,
    fileContent,
    editorVersion,
}: UseLspIntegrationProps) {
    const { setLspDiagnostics } = useDiagnosticsStore();
    const lspInitializedRef = useRef(false);
    const openFilesRef = useRef<Set<string>>(new Set());
    const fileVersionsRef = useRef<Map<string, number>>(new Map());

    // Инициализация LSP при открытии workspace
    useEffect(() => {
        if (!currentWorkspace || lspInitializedRef.current) return;

        lspInitialize(currentWorkspace)
            .then(() => {
                lspInitializedRef.current = true;
            })
            .catch(() => {
                // LSP initialization failed
            });

        return () => {
            lspInitializedRef.current = false;
            openFilesRef.current.clear();
            fileVersionsRef.current.clear();
        };
    }, [currentWorkspace]);

    // Слушаем диагностику от LSP
    useEffect(() => {
        
        const setupListener = async () => {
            const unlisten = await listenToLspDiagnostics((payload: LspDiagnosticsPayload) => {
                
                // Конвертируем URI в путь файла
                let filePath = payload.uri;
                if (filePath.startsWith('file:///')) {
                    filePath = filePath.substring(8); // Remove 'file:///'
                } else if (filePath.startsWith('file://')) {
                    filePath = filePath.substring(7); // Remove 'file://'
                }
                
                // Нормализуем путь (заменяем / на \\ для Windows)
                filePath = filePath.replace(/\//g, '\\');
                
                // Конвертируем LSP диагностику в формат Monaco
                const diagnostics: MonacoDiagnostic[] = payload.diagnostics.map((d, index) => {
                    const severityMap: Record<number, 'error' | 'warning' | 'info' | 'hint'> = {
                        1: 'error',
                        2: 'warning',
                        3: 'info',
                        4: 'hint',
                    };

                    return {
                        id: `lsp-${filePath}-${index}`,
                        type: severityMap[d.severity] || 'error',
                        file: filePath.split(/[\\/]/).pop() || filePath,
                        path: filePath,
                        line: d.range.start.line + 1, // LSP uses 0-based, Monaco uses 1-based
                        column: d.range.start.character + 1,
                        endLine: d.range.end.line + 1,
                        endColumn: d.range.end.character + 1,
                        message: d.message,
                        code: d.code ? String(d.code) : null,
                        source: d.source || 'lsp',
                    };
                });

                // Обновляем store
                setLspDiagnostics(filePath, diagnostics);

                // Обновляем Monaco markers если файл открыт
                if (monacoRef.current && editorRef.current) {
                    const model = editorRef.current.getModel();
                    if (model) {
                        // Получаем путь из URI модели Monaco
                        const modelUri = model.uri.toString();
                        let modelPath = modelUri;
                        
                        // Убираем file:// префикс
                        if (modelPath.startsWith('file:///')) {
                            modelPath = modelPath.substring(8);
                        } else if (modelPath.startsWith('file://')) {
                            modelPath = modelPath.substring(7);
                        }
                        
                        // Нормализуем путь
                        modelPath = modelPath.replace(/\//g, '\\');
                        
                        if (modelPath === filePath) {
                            const markers = diagnostics.map(d => ({
                                startLineNumber: d.line,
                                startColumn: d.column,
                                endLineNumber: d.endLine,
                                endColumn: d.endColumn,
                                message: d.message,
                                severity: d.type === 'error' ? 8 : d.type === 'warning' ? 4 : 2,
                                source: d.source,
                                code: d.code || undefined,
                            }));

                            monacoRef.current.editor.setModelMarkers(model, 'lsp', markers);
                        }
                    }
                }
            });

            return unlisten;
        };

        let unlistenFn: (() => void) | null = null;
        setupListener().then(fn => {
            unlistenFn = fn;
        });

        return () => {
            if (unlistenFn) {
                unlistenFn();
            }
        };
    }, [monacoRef, editorRef, setLspDiagnostics]);

    // Уведомляем LSP об открытии файла
    useEffect(() => {
        if (!lspInitializedRef.current || !activeFile || !fileContent) return;

        // Проверяем, поддерживается ли файл LSP (только TypeScript/JavaScript)
        const ext = activeFile.split('.').pop()?.toLowerCase();
        if (!ext || !['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
            return;
        }

        if (!openFilesRef.current.has(activeFile)) {
            lspDidOpen(activeFile, fileContent)
                .then(() => {
                    openFilesRef.current.add(activeFile);
                    fileVersionsRef.current.set(activeFile, 1);
                })
                .catch(() => {
                });
        }
    }, [activeFile, fileContent, lspInitializedRef.current]);

    // Уведомляем LSP об изменениях в файле
    useEffect(() => {
        if (!lspInitializedRef.current || !activeFile || !fileContent) return;
        if (!openFilesRef.current.has(activeFile)) return;

        const ext = activeFile.split('.').pop()?.toLowerCase();
        if (!ext || !['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
            return;
        }

        const currentVersion = fileVersionsRef.current.get(activeFile) || 1;
        const newVersion = currentVersion + 1;
        fileVersionsRef.current.set(activeFile, newVersion);

        lspDidChange(activeFile, fileContent, newVersion)
            .catch(() => {
                // LSP didChange failed
            });
    }, [fileContent, editorVersion]);
}
