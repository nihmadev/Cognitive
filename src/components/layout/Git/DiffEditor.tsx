import { useEffect, useState, useRef, useCallback } from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { tauriApi, FileDiff } from '../../../lib/tauri-api';
import { useUIStore } from '../../../store/uiStore';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
import styles from './DiffEditor.module.css';

interface DiffEditorProps {
    filePath: string;
    isStaged: boolean;
    workspacePath: string;
}

const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
        'rs': 'rust',
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'json': 'json',
        'html': 'html',
        'css': 'css',
        'md': 'markdown',
        'py': 'python',
        'go': 'go',
        'cpp': 'cpp',
        'c': 'c',
        'java': 'java',
        'toml': 'toml',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'bash': 'shell',
    };
    return langMap[ext] || 'plaintext';
};

export const DiffEditor = ({ filePath, isStaged, workspacePath }: DiffEditorProps) => {
    const [diff, setDiff] = useState<FileDiff | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const diffEditorRef = useRef<any>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const targetScrollTopRef = useRef<number>(0);
    const currentScrollTopRef = useRef<number>(0);
    const themesRegisteredRef = useRef<boolean>(false);

    const { theme } = useUIStore();


    const animateScroll = useCallback(() => {
        const editor = diffEditorRef.current?.getModifiedEditor();
        if (!editor) return;

        const diff = targetScrollTopRef.current - currentScrollTopRef.current;

        if (Math.abs(diff) < 0.5) {
            currentScrollTopRef.current = targetScrollTopRef.current;
            editor.setScrollTop(targetScrollTopRef.current);
            scrollAnimationRef.current = null;
            return;
        }


        const ease = 0.15;
        currentScrollTopRef.current += diff * ease;
        editor.setScrollTop(currentScrollTopRef.current);

        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    }, []);


    const handleWheel = useCallback((e: WheelEvent) => {
        const editor = diffEditorRef.current?.getModifiedEditor();
        if (!editor) return;

        e.preventDefault();


        if (scrollAnimationRef.current === null) {
            currentScrollTopRef.current = editor.getScrollTop();
        }


        const scrollAmount = e.deltaY * 0.8;
        const maxScrollTop = editor.getScrollHeight() - editor.getLayoutInfo().height;


        targetScrollTopRef.current = Math.max(0, Math.min(
            targetScrollTopRef.current + scrollAmount,
            maxScrollTop
        ));


        if (scrollAnimationRef.current === null) {
            scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        }
    }, [animateScroll]);

    useEffect(() => {
        const loadDiff = async () => {
            setIsLoading(true);
            setError(null);
            try {

                const relativeFilePath = filePath.startsWith(workspacePath)
                    ? filePath.slice(workspacePath.length).replace(/^[/\\]/, '')
                    : filePath;

                const result = await tauriApi.gitDiff(workspacePath, relativeFilePath, isStaged);
                setDiff(result);
            } catch (e: any) {
                setError(e.toString());
            } finally {
                setIsLoading(false);
            }
        };
        loadDiff();
    }, [filePath, isStaged, workspacePath]);


    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
            if (scrollAnimationRef.current !== null) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
            if (diffEditorRef.current) {
                diffEditorRef.current = null;
            }
        };
    }, [handleWheel]);

    useEffect(() => {
        return () => {
            if (scrollAnimationRef.current !== null) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
            diffEditorRef.current = null;
        };
    }, []);

    const intervalRef = useRef<any>(null);

    const navigateToChange = useCallback((direction: 'next' | 'prev') => {
        const editor = diffEditorRef.current;
        if (!editor) return;

        const lineChanges = editor.getLineChanges();
        if (!lineChanges || lineChanges.length === 0) return;

        const modifiedEditor = editor.getModifiedEditor();
        const currentPosition = modifiedEditor.getPosition();
        const currentLine = currentPosition?.lineNumber || 1;

        if (direction === 'next') {
            const nextChange = lineChanges.find((change: any) => 
                change.modifiedStartLineNumber > currentLine
            );
            
            if (nextChange) {
                modifiedEditor.setPosition({
                    lineNumber: nextChange.modifiedStartLineNumber,
                    column: 1
                });
                modifiedEditor.revealLineInCenter(nextChange.modifiedStartLineNumber);
            } else {
                const firstChange = lineChanges[0];
                modifiedEditor.setPosition({
                    lineNumber: firstChange.modifiedStartLineNumber,
                    column: 1
                });
                modifiedEditor.revealLineInCenter(firstChange.modifiedStartLineNumber);
            }
        } else {
            const previousChanges = lineChanges.filter((change: any) => 
                change.modifiedStartLineNumber < currentLine
            );
            const previousChange = previousChanges[previousChanges.length - 1];
            
            if (previousChange) {
                modifiedEditor.setPosition({
                    lineNumber: previousChange.modifiedStartLineNumber,
                    column: 1
                });
                modifiedEditor.revealLineInCenter(previousChange.modifiedStartLineNumber);
            } else {
                const lastChange = lineChanges[lineChanges.length - 1];
                modifiedEditor.setPosition({
                    lineNumber: lastChange.modifiedStartLineNumber,
                    column: 1
                });
                modifiedEditor.revealLineInCenter(lastChange.modifiedStartLineNumber);
            }
        }
    }, []);

    const handleMouseDown = (direction: 'next' | 'prev') => {
        navigateToChange(direction);
        intervalRef.current = setInterval(() => navigateToChange(direction), 250);
    };

    const handleMouseUp = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <span>Loading diff...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <span>Error loading diff: {error}</span>
            </div>
        );
    }

    if (!diff) {
        return (
            <div className={styles.error}>
                <span>No diff available</span>
            </div>
        );
    }

    const language = getLanguageFromPath(filePath);

    return (
        <div className={styles.diffEditor} ref={containerRef}>
            <div className={styles.actions}>
                <button
                    className={styles.actionButton}
                    onMouseDown={() => handleMouseDown('prev')}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    title="Previous Change"
                >
                    <ChevronUp size={20} />
                </button>
                <div className={styles.divider} />
                <button
                    className={styles.actionButton}
                    onMouseDown={() => handleMouseDown('next')}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    title="Next Change"
                >
                    <ChevronDown size={20} />
                </button>
            </div>
            <MonacoDiffEditor
                height="100%"
                language={language}
                original={diff.old_content}
                modified={diff.new_content}
                theme={getMonacoThemeName(theme)}
                beforeMount={(monaco) => {
                    if (!themesRegisteredRef.current) {
                        registerMonacoThemes(monaco);
                        themesRegisteredRef.current = true;
                    }
                }}
                onMount={(editor) => {
                    diffEditorRef.current = editor;
                    const modifiedEditor = editor.getModifiedEditor();
                    currentScrollTopRef.current = modifiedEditor.getScrollTop();
                    targetScrollTopRef.current = currentScrollTopRef.current;
                }}
                options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: true },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    lineHeight: 22,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    automaticLayout: true,
                    padding: { top: 8 },
                    renderOverviewRuler: true,
                    diffWordWrap: 'off',
                    renderLineHighlight: 'none',
                    guides: { indentation: false },
                    folding: false,
                    links: false,
                    contextmenu: false,
                    scrollbar: {
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                    },
                }}
            />
        </div>
    );
};
