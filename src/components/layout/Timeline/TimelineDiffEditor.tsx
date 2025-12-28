import { useRef, useCallback, useEffect } from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { useUIStore } from '../../../store/uiStore';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
import styles from './TimelineDiffEditor.module.css';

interface TimelineDiffEditorProps {
    filePath: string;
    oldContent: string;
    newContent: string;
    date: string;
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

export const TimelineDiffEditor = ({ filePath, oldContent, newContent, date }: TimelineDiffEditorProps) => {
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
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', handleWheel);
            if (scrollAnimationRef.current !== null) {
                cancelAnimationFrame(scrollAnimationRef.current);
            }
        };
    }, [handleWheel]);

    const language = getLanguageFromPath(filePath);

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.header}>
                <span className={styles.label}>Snapshot from {date}</span>
                <span className={styles.vs}>vs</span>
                <span className={styles.label}>Current</span>
            </div>
            <div className={styles.editor}>
                <MonacoDiffEditor
                    height="100%"
                    language={language}
                    original={oldContent}
                    modified={newContent}
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
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        lineHeight: 22,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        automaticLayout: true,
                        padding: { top: 8 },
                        renderOverviewRuler: false,
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
        </div>
    );
};
