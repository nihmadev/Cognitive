import { useEffect, useRef, useCallback, RefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../../../store/projectStore';
import { useDiagnosticsStore, type MonacoDiagnostic } from '../../../store/diagnosticsStore';
import { useUIStore } from '../../../store/uiStore';
import { useOutlineStore, OutlineSymbol } from '../../../store/outlineStore';
import { useTimelineStore } from '../../../store/timelineStore';

interface UseEditorEventsProps {
    activeFile: string | null;
    currentWorkspace: string | null;
    editorRef: RefObject<any>;
    monacoRef: RefObject<any>;
}

interface PendingReveal {
    path: string;
    line: number;
    start: number;
}


const KEYBINDING_MAP: Record<string, string> = {
    'KeyZ': 'z',
    'KeyY': 'y',
    'KeyC': 'c',
    'KeyV': 'v',
    'KeyX': 'x',
    'KeyA': 'a',
    'KeyF': 'f',
    'KeyH': 'h',
    'KeyD': 'd',
    'KeyL': 'l',
    'KeyK': 'k',
    'KeyG': 'g',
    'KeyP': 'p',
    'KeyS': 's',
    'F2': 'f2',
};

export const useEditorEvents = ({
    activeFile,
    currentWorkspace,
    editorRef,
    monacoRef,
}: UseEditorEventsProps) => {
    const { unsavedChanges, saveFile, fileContents } = useProjectStore();
    const setFileDiagnostics = useDiagnosticsStore((state) => state.setFileDiagnostics);
    const clearFileDiagnostics = useDiagnosticsStore((state) => state.clearFileDiagnostics);
    const toggleInsertMode = useUIStore((state) => state.toggleInsertMode);
    const { setSymbols, setLoading, clearSymbols, loadFromCache, invalidateCache } = useOutlineStore();
    const { saveSnapshot } = useTimelineStore();

    const decorationsRef = useRef<string[]>([]);
    const problemHighlightRef = useRef<string[]>([]);
    const pendingRevealRef = useRef<PendingReveal | null>(null);
    const outlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActiveFileRef = useRef<string | null>(null);


    const collectDiagnostics = useCallback(() => {
        if (!monacoRef.current || !activeFile) return;

        const monaco = monacoRef.current;
        const model = editorRef.current?.getModel();
        if (!model) return;

        try {
            // Skip diagnostics for in-memory models
            if (model.uri.scheme === 'inmemory') {
                return;
            }
            
            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            const fileName = activeFile.split(/[\\/]/).pop() || activeFile;

            // Нормализуем activeFile для сопоставления с Monaco URI (всегда прямые слэши)
            const normalizedActiveFile = activeFile.replace(/\\/g, '/');
            const modelPath = model.uri.path;
            const normalizedPath = modelPath.startsWith('/') ? modelPath.slice(1) : modelPath;

            const relativePath = currentWorkspace
                ? normalizedPath.includes(currentWorkspace.replace(/\\/g, '/'))
                    ? normalizedPath.replace(currentWorkspace.replace(/\\/g, '/'), '').replace(/^[\\/]/, '')
                    : normalizedPath
                : normalizedPath;

            console.log('Debug diagnostics:', {
                activeFile,
                modelUri: model.uri.toString(),
                modelPath,
                normalizedPath,
                relativePath,
                markersCount: markers.length
            });

            const diagnostics: MonacoDiagnostic[] = markers.map((marker: any, idx: number) => {
                let type: 'error' | 'warning' | 'info' | 'hint' = 'info';
                if (marker.severity === 8) type = 'error';
                else if (marker.severity === 4) type = 'warning';
                else if (marker.severity === 2) type = 'info';
                else if (marker.severity === 1) type = 'hint';

                return {
                    id: `monaco-${model.uri.toString()}-${idx}`,
                    type,
                    file: fileName,
                    path: relativePath,
                    line: marker.startLineNumber,
                    column: marker.startColumn,
                    endLine: marker.endLineNumber,
                    endColumn: marker.endColumn,
                    message: marker.message,
                    code: marker.code ? String(marker.code) : null,
                    source: marker.source || 'monaco',
                };
            });

            // Используем полный путь с прямыми слэшами как ключ для диагностики
            const diagnosticsKey = normalizedActiveFile;
            console.log('[collectDiagnostics] Saving diagnostics with key:', diagnosticsKey, 'count:', diagnostics.length);
            setFileDiagnostics(diagnosticsKey, diagnostics);
        } catch (error: any) {
            console.warn('Error collecting diagnostics:', error);
            
            if (error.message && error.message.includes('Could not find source file')) {
                console.warn('In-memory model detected, skipping diagnostics collection');
                return;
            }
        }
    }, [activeFile, currentWorkspace, setFileDiagnostics, editorRef, monacoRef]);


    const collectOutlineSymbols = useCallback(async () => {
        if (!activeFile) {
            clearSymbols();
            return;
        }

        setLoading(true);

        try {
            let symbols: OutlineSymbol[];


            const model = editorRef.current?.getModel();
            if (model && unsavedChanges[activeFile]) {
                // Skip outline for in-memory models
                if (model.uri.scheme === 'inmemory') {
                    setLoading(false);
                    clearSymbols();
                    return;
                }
                
                const content = model.getValue();
                symbols = await invoke<OutlineSymbol[]>('get_outline_from_content', {
                    filePath: activeFile,
                    content
                });
            } else {

                symbols = await invoke<OutlineSymbol[]>('get_outline', { filePath: activeFile });
            }

            if (symbols && symbols.length > 0) {
                setSymbols(symbols, activeFile);
            } else {
                setLoading(false);
                clearSymbols();
            }
        } catch (error) {
            console.error('Failed to get outline symbols:', error);
            setLoading(false);
            clearSymbols();
        }
    }, [activeFile, editorRef, unsavedChanges, setSymbols, setLoading, clearSymbols]);


    const updateOutlineDebounced = useCallback(() => {
        if (outlineTimeoutRef.current) {
            clearTimeout(outlineTimeoutRef.current);
        }
        outlineTimeoutRef.current = setTimeout(() => {
            collectOutlineSymbols();
        }, 150);
    }, [collectOutlineSymbols]);


    useEffect(() => {
        if (activeFile) {

            const cacheHit = loadFromCache(activeFile);


            const timer = setTimeout(() => {
                collectOutlineSymbols();
            }, cacheHit ? 200 : 50);

            return () => clearTimeout(timer);
        } else {
            clearSymbols();
        }
    }, [activeFile, collectOutlineSymbols, clearSymbols, loadFromCache]);


    useEffect(() => {
        if (lastActiveFileRef.current && lastActiveFileRef.current !== activeFile) {

            clearFileDiagnostics(lastActiveFileRef.current);
        }
        lastActiveFileRef.current = activeFile;
    }, [activeFile, clearFileDiagnostics]);


    useEffect(() => {
        if (!editorRef.current || !activeFile) return;

        const editor = editorRef.current;
        const disposable = editor.onDidChangeModelContent(() => {

            invalidateCache(activeFile);


            if (outlineTimeoutRef.current) {
                clearTimeout(outlineTimeoutRef.current);
            }
            outlineTimeoutRef.current = setTimeout(() => {
                collectOutlineSymbols();
            }, 200);
        });

        return () => disposable?.dispose();
    }, [editorRef.current, activeFile, collectOutlineSymbols, invalidateCache]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            if (e.code === 'Insert' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                toggleInsertMode();
                return;
            }


            const physicalKey = KEYBINDING_MAP[e.code];
            const hasModifier = e.ctrlKey || e.metaKey;

            if (!hasModifier || !physicalKey) return;

            const editor = editorRef.current;
            if (!editor) return;


            if (physicalKey === 's') {
                e.preventDefault();
                if (activeFile && unsavedChanges[activeFile]) {

                    const { deletedFiles } = useProjectStore.getState();
                    if (deletedFiles[activeFile]) {
                        console.warn('[Save] Cannot save deleted file:', activeFile);

                        return;
                    }


                    if (currentWorkspace) {
                        const relativePath = activeFile.startsWith(currentWorkspace)
                            ? activeFile.slice(currentWorkspace.length + 1)
                            : activeFile;

                        const { getOriginalContent } = useProjectStore.getState();
                        const originalContent = getOriginalContent(activeFile);
                        if (originalContent) {
                            saveSnapshot(currentWorkspace, relativePath, originalContent);
                        }
                    }
                    saveFile(activeFile);
                }
                return;
            }


            const editorDomNode = editor.getDomNode?.();
            const isEditorFocused = editorDomNode?.contains(document.activeElement) ||
                document.activeElement?.closest('.monaco-editor');

            if (!isEditorFocused) return;


            if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
                return;
            }


            if (physicalKey === 'z' && !e.shiftKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'undo', null);
                return;
            }


            if (physicalKey === 'z' && e.shiftKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'redo', null);
                return;
            }


            if (physicalKey === 'y' && !e.shiftKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'redo', null);
                return;
            }



            if (physicalKey === 'c' && !e.shiftKey && !e.altKey) {

                return;
            }



            if (physicalKey === 'x' && !e.shiftKey && !e.altKey) {

                return;
            }



            if (physicalKey === 'v' && !e.shiftKey && !e.altKey) {

                return;
            }


            if (physicalKey === 'a' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'editor.action.selectAll', null);
                return;
            }


            if (physicalKey === 'f' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'actions.find', null);
                return;
            }


            if (physicalKey === 'h' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
                return;
            }


            if (physicalKey === 'd' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null);
                return;
            }


            if (physicalKey === 'l' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'expandLineSelection', null);
                return;
            }



            if (physicalKey === 'g' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                editor.trigger('keyboard', 'editor.action.gotoLine', null);
                return;
            }


            if (physicalKey === 'f2' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();

                window.dispatchEvent(new CustomEvent('start-rename'));
                return;
            }



        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [activeFile, unsavedChanges, saveFile, editorRef, toggleInsertMode, currentWorkspace, fileContents, saveSnapshot]);


    useEffect(() => {
        const executeReveal = (line: number, start: number) => {
            if (!editorRef.current || !monacoRef.current) return;

            const monaco = monacoRef.current;
            const editor = editorRef.current;

            problemHighlightRef.current = editor.deltaDecorations(problemHighlightRef.current, []);
            editor.setPosition({ lineNumber: line, column: start + 1 });
            editor.revealLineInCenter(line);

            const highlightDecoration = [{
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'problem-line-highlight',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                }
            }];

            problemHighlightRef.current = editor.deltaDecorations([], highlightDecoration);

            setTimeout(() => {
                if (editorRef.current) {
                    problemHighlightRef.current = editorRef.current.deltaDecorations(problemHighlightRef.current, []);
                }
            }, 3000);

            editor.focus();
        };

        const handleReveal = (e: any) => {
            const detail = e?.detail;
            if (!detail) return;

            const targetPath = detail.path;
            const line = Number(detail.line || 1);
            const start = Number(detail.start || 0);

            if (!activeFile || targetPath !== activeFile || !editorRef.current || !monacoRef.current) {
                pendingRevealRef.current = { path: targetPath, line, start };
                return;
            }

            executeReveal(line, start);
        };

        const handleApplyDecorations = (e: any) => {
            const detail = e?.detail;
            if (!detail || !activeFile || detail.path !== activeFile) return;
            if (!editorRef.current || !monacoRef.current) return;

            const monaco = monacoRef.current;
            const matches = Array.isArray(detail.matches) ? detail.matches : [];
            const newDecorations = matches.map((m: any) => {
                const line = Number(m.line || 1);
                const start = Number(m.charStart ?? m.char_start ?? 0);
                const end = Number(m.charEnd ?? m.char_end ?? start);
                return {
                    range: new monaco.Range(line, start + 1, line, end + 1),
                    options: {
                        inlineClassName: 'cognitive-search-match',
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    },
                };
            });

            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
        };

        const handleClearDecorations = (e: any) => {
            const detail = e?.detail;
            if (!detail || !activeFile || detail.path !== activeFile) return;
            if (!editorRef.current) return;
            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
        };

        window.addEventListener('editor-reveal-line', handleReveal as any);
        window.addEventListener('editor-apply-search-decorations', handleApplyDecorations as any);
        window.addEventListener('editor-clear-search-decorations', handleClearDecorations as any);

        return () => {
            window.removeEventListener('editor-reveal-line', handleReveal as any);
            window.removeEventListener('editor-apply-search-decorations', handleApplyDecorations as any);
            window.removeEventListener('editor-clear-search-decorations', handleClearDecorations as any);
        };
    }, [activeFile, editorRef, monacoRef]);


    useEffect(() => {
        if (!pendingRevealRef.current || !activeFile || !editorRef.current || !monacoRef.current) return;
        if (pendingRevealRef.current.path !== activeFile) return;

        const { line, start } = pendingRevealRef.current;
        pendingRevealRef.current = null;

        const timer = setTimeout(() => {
            if (!editorRef.current || !monacoRef.current) return;

            const monaco = monacoRef.current;
            const editor = editorRef.current;

            problemHighlightRef.current = editor.deltaDecorations(problemHighlightRef.current, []);
            editor.setPosition({ lineNumber: line, column: start + 1 });
            editor.revealLineInCenter(line);

            const highlightDecoration = [{
                range: new monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'problem-line-highlight',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                }
            }];

            problemHighlightRef.current = editor.deltaDecorations([], highlightDecoration);

            setTimeout(() => {
                if (editorRef.current) {
                    problemHighlightRef.current = editorRef.current.deltaDecorations(problemHighlightRef.current, []);
                }
            }, 3000);

            editor.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, [activeFile, editorRef, monacoRef]);

    return {
        collectDiagnostics,
        collectOutlineSymbols,
        updateOutlineDebounced,
        decorationsRef,
        problemHighlightRef,
    };
};
