import { useEffect, useState, useRef, useCallback } from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
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

    // Smooth scroll animation
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

        // Easing factor for smooth animation
        const ease = 0.15;
        currentScrollTopRef.current += diff * ease;
        editor.setScrollTop(currentScrollTopRef.current);
        
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    }, []);

    // Custom wheel handler for smooth scrolling
    const handleWheel = useCallback((e: WheelEvent) => {
        const editor = diffEditorRef.current?.getModifiedEditor();
        if (!editor) return;

        e.preventDefault();
        
        // Initialize current scroll position if needed
        if (scrollAnimationRef.current === null) {
            currentScrollTopRef.current = editor.getScrollTop();
        }

        // Calculate scroll amount (multiply for faster scrolling)
        const scrollAmount = e.deltaY * 0.8;
        const maxScrollTop = editor.getScrollHeight() - editor.getLayoutInfo().height;
        
        // Update target scroll position with bounds
        targetScrollTopRef.current = Math.max(0, Math.min(
            targetScrollTopRef.current + scrollAmount,
            maxScrollTop
        ));

        // Start animation if not already running
        if (scrollAnimationRef.current === null) {
            scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        }
    }, [animateScroll]);

    useEffect(() => {
        const loadDiff = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Convert absolute file path to relative path for git operations
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

    // Setup wheel event listener for smooth scrolling
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
                    // Initialize scroll position
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
    );
};
