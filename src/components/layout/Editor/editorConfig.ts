// Editor configuration to match VS Code dark theme and performance settings
export const getEditorOptions = (fontSettings?: { fontFamily: string; fontSize: number; lineHeight: number }, availableFonts?: Array<{ id: string; name: string; stack: string }>, minimapEnabled?: boolean, lineNumbersEnabled?: boolean, tabSize?: number) => {
    const font = availableFonts?.find(f => f.id === fontSettings?.fontFamily);
    const fontStack = font?.stack || "'JetBrains Mono', 'Fira Code', Consolas, monospace";
    
    return {
        minimap: { enabled: minimapEnabled !== undefined ? minimapEnabled : true },
        fontSize: fontSettings?.fontSize || 14,
        fontFamily: fontStack,
        lineHeight: (fontSettings?.fontSize || 14) * (fontSettings?.lineHeight || 1.5),
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth" as const,
        renderWhitespace: "selection" as const,
        automaticLayout: true,
        padding: { top: 16 },
        // Tab and indentation settings
        tabSize: tabSize || 4,
        indentSize: tabSize || 4,
        insertSpaces: true,
        // Disable automatic word highlighting on selection/click
        occurrencesHighlight: "off" as const,
        selectionHighlight: false,
        // Line highlight disabled - Monaco ignores theme colors for lineHighlightBorder
        renderLineHighlight: 'none' as const,
        // Sticky scroll - enabled, border fixed via CSS
        stickyScroll: { enabled: true },
        // Bracket matching - enabled (highlight when cursor is on bracket)
        matchBrackets: 'always' as const,
        // Bracket pair colorization disabled - Monaco ignores theme colors
        'bracketPairColorization.enabled': false,
        bracketPairColorization: { enabled: false },
        // Guides configuration
        guides: {
            bracketPairs: false,
            bracketPairsHorizontal: false,
            highlightActiveBracketPair: false,
            indentation: true,
            highlightActiveIndentation: true,
        },
        // Line numbers configuration
        lineNumbers: lineNumbersEnabled ? 'on' as const : 'off' as const,
    };
};

// Legacy export for backward compatibility
export const editorOptions = getEditorOptions();

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'];

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'oga', 'weba'];

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v', '3gp'];

// Common binary file extensions
export const BINARY_EXTENSIONS = [
    'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib',
    'zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'flac',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
    'class', 'pyc', 'pyo', 'wasm',
    'db', 'sqlite', 'sqlite3'
];

// Extension to Monaco language mapping
export const languageMap: Record<string, string> = {
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
};

export const getFileExtension = (path: string): string => {
    return path.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (path: string): boolean => {
    return IMAGE_EXTENSIONS.includes(getFileExtension(path));
};

export const isAudioFile = (path: string): boolean => {
    return AUDIO_EXTENSIONS.includes(getFileExtension(path));
};

export const isVideoFile = (path: string): boolean => {
    return VIDEO_EXTENSIONS.includes(getFileExtension(path));
};

export const isBinaryExtension = (path: string): boolean => {
    return BINARY_EXTENSIONS.includes(getFileExtension(path));
};

export const getLanguageFromExtension = (ext: string): string => {
    return languageMap[ext] || 'plaintext';
};

export const isBinaryContent = (content: string): boolean => {
    return content.includes('\0') ||
        (content.length > 0 && [...content.slice(0, 8000)].filter(c => {
            const code = c.charCodeAt(0);
            return code < 32 && code !== 9 && code !== 10 && code !== 13;
        }).length > content.slice(0, 8000).length * 0.3);
};
