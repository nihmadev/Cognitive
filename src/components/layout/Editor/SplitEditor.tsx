import MonacoEditor from '@monaco-editor/react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
import { getEditorOptions } from './editorConfig';
import styles from './Editor.module.css';

interface SplitEditorProps {
    filePath: string;
}

export const SplitEditor = ({ filePath }: SplitEditorProps) => {
    const { fileContents, setFileContent } = useProjectStore();
    const { theme, fontSettings, availableFonts, minimapEnabled, lineNumbersEnabled, tabSize } = useUIStore();

    // Get content directly from store instead of loading again
    const content = fileContents[filePath] || "// Split View - Same file content";
    
    // Get language from file extension
    const getLanguage = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const langMap: { [key: string]: string } = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
            'sql': 'sql',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'sh': 'shell',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'r': 'r',
            'dart': 'dart',
            'vue': 'html',
            'svelte': 'html'
        };
        return langMap[ext || ''] || 'plaintext';
    };

    const language = getLanguage(filePath);

    return (
        <div className={styles.splitEditorContainer}>
            <MonacoEditor
                key={`split-${filePath}-${fontSettings.fontFamily}-${fontSettings.fontSize}-${fontSettings.lineHeight}`}
                height="100%"
                language={language}
                value={content}
                theme={getMonacoThemeName(theme)}
                options={getEditorOptions(fontSettings, availableFonts, minimapEnabled, lineNumbersEnabled, tabSize)}
                beforeMount={(monaco) => {
                    registerMonacoThemes(monaco);
                }}
                onChange={(value) => {
                    if (filePath && value !== undefined) {
                        setFileContent(filePath, value);
                    }
                }}
            />
        </div>
    );
};
