// Theme type definitions
export type ThemeId = 
    | 'dark-modern'
    | 'dracula'
    | 'github-dark'
    | 'nord'
    | 'one-dark'
    | 'monokai'
    | 'solarized-dark'
    | 'tokyo-night';

export interface ThemeColors {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    foreground: string;
    foregroundMuted: string;
    foregroundSubtle: string;
    accent: string;
    accentHover: string;
    accentMuted: string;
    border: string;
    borderActive: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    syntaxKeyword: string;
    syntaxString: string;
    syntaxFunction: string;
    syntaxComment: string;
    syntaxType: string;
    syntaxVariable: string;
    syntaxNumber: string;
    syntaxOperator: string;
    sidebarBackground: string;
    activityBarBackground: string;
    statusBarBackground: string;
    tabActiveBackground: string;
    tabInactiveBackground: string;
    inputBackground: string;
    buttonBackground: string;
    buttonHoverBackground: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
    selection: string;
    selectionHighlight: string;
    editorLineHighlight: string;
    editorGutter: string;
    hoverOverlay: string;
    hoverOverlayStrong: string;
    gitAdded: string;
    gitModified: string;
    gitDeleted: string;
}

export interface Theme {
    id: ThemeId;
    name: string;
    type: 'dark' | 'light';
    colors: ThemeColors;
    previewColors: string[];
}


// Dark Modern theme (VS Code default dark)
const darkModern: Theme = {
    id: 'dark-modern',
    name: 'Dark Modern',
    type: 'dark',
    previewColors: ['#1e1e1e', '#007acc', '#569cd6', '#4ec9b0'],
    colors: {
        background: '#1e1e1e',
        backgroundSecondary: '#252526',
        backgroundTertiary: '#2d2d2d',
        foreground: '#d4d4d4',
        foregroundMuted: '#a8a8a8',
        foregroundSubtle: '#6e6e6e',
        accent: '#007acc',
        accentHover: '#1c8cd9',
        accentMuted: '#264f78',
        border: '#3c3c3c',
        borderActive: '#007acc',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        syntaxKeyword: '#569cd6',
        syntaxString: '#ce9178',
        syntaxFunction: '#dcdcaa',
        syntaxComment: '#6a9955',
        syntaxType: '#4ec9b0',
        syntaxVariable: '#9cdcfe',
        syntaxNumber: '#b5cea8',
        syntaxOperator: '#d4d4d4',
        sidebarBackground: '#252526',
        activityBarBackground: '#333333',
        statusBarBackground: '#007acc',
        tabActiveBackground: '#1e1e1e',
        tabInactiveBackground: '#2d2d2d',
        inputBackground: '#3c3c3c',
        buttonBackground: '#0e639c',
        buttonHoverBackground: '#1177bb',
        scrollbarThumb: '#424242',
        scrollbarThumbHover: '#4f4f4f',
        selection: '#264f78',
        selectionHighlight: '#add6ff26',
        editorLineHighlight: '#2a2d2e',
        editorGutter: '#1e1e1e',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#73c991',
        gitModified: '#e3b341',
        gitDeleted: '#f85149',
    },
};

// Dracula theme
const dracula: Theme = {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    previewColors: ['#282a36', '#bd93f9', '#ff79c6', '#50fa7b'],
    colors: {
        background: '#282a36',
        backgroundSecondary: '#21222c',
        backgroundTertiary: '#343746',
        foreground: '#f8f8f2',
        foregroundMuted: '#d0d0d0',
        foregroundSubtle: '#6272a4',
        accent: '#bd93f9',
        accentHover: '#caa9fa',
        accentMuted: '#44475a',
        border: '#44475a',
        borderActive: '#bd93f9',
        success: '#50fa7b',
        warning: '#ffb86c',
        error: '#ff5555',
        info: '#8be9fd',
        syntaxKeyword: '#ff79c6',
        syntaxString: '#f1fa8c',
        syntaxFunction: '#50fa7b',
        syntaxComment: '#6272a4',
        syntaxType: '#8be9fd',
        syntaxVariable: '#f8f8f2',
        syntaxNumber: '#bd93f9',
        syntaxOperator: '#ff79c6',
        sidebarBackground: '#21222c',
        activityBarBackground: '#191a21',
        statusBarBackground: '#191a21',
        tabActiveBackground: '#282a36',
        tabInactiveBackground: '#21222c',
        inputBackground: '#44475a',
        buttonBackground: '#44475a',
        buttonHoverBackground: '#6272a4',
        scrollbarThumb: '#44475a',
        scrollbarThumbHover: '#6272a4',
        selection: '#44475a',
        selectionHighlight: '#bd93f926',
        editorLineHighlight: '#44475a50',
        editorGutter: '#282a36',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#50fa7b',
        gitModified: '#ffb86c',
        gitDeleted: '#ff5555',
    },
};

// GitHub Dark theme
const githubDark: Theme = {
    id: 'github-dark',
    name: 'GitHub Dark',
    type: 'dark',
    previewColors: ['#0d1117', '#58a6ff', '#7ee787', '#ff7b72'],
    colors: {
        background: '#0d1117',
        backgroundSecondary: '#161b22',
        backgroundTertiary: '#21262d',
        foreground: '#e6edf3',
        foregroundMuted: '#9198a1',
        foregroundSubtle: '#484f58',
        accent: '#58a6ff',
        accentHover: '#79c0ff',
        accentMuted: '#388bfd26',
        border: '#30363d',
        borderActive: '#58a6ff',
        success: '#7ee787',
        warning: '#d29922',
        error: '#ff7b72',
        info: '#58a6ff',
        syntaxKeyword: '#ff7b72',
        syntaxString: '#a5d6ff',
        syntaxFunction: '#d2a8ff',
        syntaxComment: '#8b949e',
        syntaxType: '#7ee787',
        syntaxVariable: '#ffa657',
        syntaxNumber: '#79c0ff',
        syntaxOperator: '#ff7b72',
        sidebarBackground: '#161b22',
        activityBarBackground: '#0d1117',
        statusBarBackground: '#161b22',
        tabActiveBackground: '#0d1117',
        tabInactiveBackground: '#161b22',
        inputBackground: '#21262d',
        buttonBackground: '#238636',
        buttonHoverBackground: '#2ea043',
        scrollbarThumb: '#484f58',
        scrollbarThumbHover: '#6e7681',
        selection: '#388bfd26',
        selectionHighlight: '#58a6ff26',
        editorLineHighlight: '#161b22',
        editorGutter: '#0d1117',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#7ee787',
        gitModified: '#d29922',
        gitDeleted: '#ff7b72',
    },
};


// Nord theme
const nord: Theme = {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    previewColors: ['#2e3440', '#88c0d0', '#81a1c1', '#a3be8c'],
    colors: {
        background: '#2e3440',
        backgroundSecondary: '#3b4252',
        backgroundTertiary: '#434c5e',
        foreground: '#eceff4',
        foregroundMuted: '#e5e9f0',
        foregroundSubtle: '#4c566a',
        accent: '#88c0d0',
        accentHover: '#8fbcbb',
        accentMuted: '#5e81ac',
        border: '#4c566a',
        borderActive: '#88c0d0',
        success: '#a3be8c',
        warning: '#ebcb8b',
        error: '#bf616a',
        info: '#81a1c1',
        syntaxKeyword: '#81a1c1',
        syntaxString: '#a3be8c',
        syntaxFunction: '#88c0d0',
        syntaxComment: '#616e88',
        syntaxType: '#8fbcbb',
        syntaxVariable: '#d8dee9',
        syntaxNumber: '#b48ead',
        syntaxOperator: '#81a1c1',
        sidebarBackground: '#3b4252',
        activityBarBackground: '#2e3440',
        statusBarBackground: '#3b4252',
        tabActiveBackground: '#2e3440',
        tabInactiveBackground: '#3b4252',
        inputBackground: '#4c566a',
        buttonBackground: '#5e81ac',
        buttonHoverBackground: '#81a1c1',
        scrollbarThumb: '#4c566a',
        scrollbarThumbHover: '#616e88',
        selection: '#434c5e',
        selectionHighlight: '#88c0d026',
        editorLineHighlight: '#3b4252',
        editorGutter: '#2e3440',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#a3be8c',
        gitModified: '#ebcb8b',
        gitDeleted: '#bf616a',
    },
};

// One Dark theme
const oneDark: Theme = {
    id: 'one-dark',
    name: 'One Dark',
    type: 'dark',
    previewColors: ['#282c34', '#61afef', '#c678dd', '#98c379'],
    colors: {
        background: '#282c34',
        backgroundSecondary: '#21252b',
        backgroundTertiary: '#2c313a',
        foreground: '#c8ccd4',
        foregroundMuted: '#9ca3af',
        foregroundSubtle: '#5c6370',
        accent: '#61afef',
        accentHover: '#74b9f0',
        accentMuted: '#3e4451',
        border: '#3e4451',
        borderActive: '#61afef',
        success: '#98c379',
        warning: '#e5c07b',
        error: '#e06c75',
        info: '#61afef',
        syntaxKeyword: '#c678dd',
        syntaxString: '#98c379',
        syntaxFunction: '#61afef',
        syntaxComment: '#5c6370',
        syntaxType: '#e5c07b',
        syntaxVariable: '#e06c75',
        syntaxNumber: '#d19a66',
        syntaxOperator: '#56b6c2',
        sidebarBackground: '#21252b',
        activityBarBackground: '#21252b',
        statusBarBackground: '#21252b',
        tabActiveBackground: '#282c34',
        tabInactiveBackground: '#21252b',
        inputBackground: '#3e4451',
        buttonBackground: '#404754',
        buttonHoverBackground: '#4d5566',
        scrollbarThumb: '#4e5666',
        scrollbarThumbHover: '#5c6370',
        selection: '#3e4451',
        selectionHighlight: '#61afef26',
        editorLineHighlight: '#2c313c',
        editorGutter: '#282c34',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#98c379',
        gitModified: '#e5c07b',
        gitDeleted: '#e06c75',
    },
};

// Monokai theme
const monokai: Theme = {
    id: 'monokai',
    name: 'Monokai',
    type: 'dark',
    previewColors: ['#272822', '#f92672', '#a6e22e', '#66d9ef'],
    colors: {
        background: '#272822',
        backgroundSecondary: '#1e1f1c',
        backgroundTertiary: '#3e3d32',
        foreground: '#f8f8f2',
        foregroundMuted: '#e0e0d8',
        foregroundSubtle: '#75715e',
        accent: '#a6e22e',
        accentHover: '#b6f23e',
        accentMuted: '#49483e',
        border: '#49483e',
        borderActive: '#a6e22e',
        success: '#a6e22e',
        warning: '#e6db74',
        error: '#f92672',
        info: '#66d9ef',
        syntaxKeyword: '#f92672',
        syntaxString: '#e6db74',
        syntaxFunction: '#a6e22e',
        syntaxComment: '#75715e',
        syntaxType: '#66d9ef',
        syntaxVariable: '#f8f8f2',
        syntaxNumber: '#ae81ff',
        syntaxOperator: '#f92672',
        sidebarBackground: '#1e1f1c',
        activityBarBackground: '#1e1f1c',
        statusBarBackground: '#1e1f1c',
        tabActiveBackground: '#3e3d32',
        tabInactiveBackground: '#1e1f1c',
        inputBackground: '#3e3d32',
        buttonBackground: '#49483e',
        buttonHoverBackground: '#5a5a4d',
        scrollbarThumb: '#49483e',
        scrollbarThumbHover: '#5a5a4d',
        selection: '#49483e',
        selectionHighlight: '#a6e22e26',
        editorLineHighlight: '#3e3d32',
        editorGutter: '#272822',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#a6e22e',
        gitModified: '#e6db74',
        gitDeleted: '#f92672',
    },
};


// Solarized Dark theme
const solarizedDark: Theme = {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    type: 'dark',
    previewColors: ['#002b36', '#268bd2', '#859900', '#b58900'],
    colors: {
        background: '#002b36',
        backgroundSecondary: '#073642',
        backgroundTertiary: '#094959',
        foreground: '#93a1a1',
        foregroundMuted: '#839496',
        foregroundSubtle: '#586e75',
        accent: '#268bd2',
        accentHover: '#2aa198',
        accentMuted: '#073642',
        border: '#073642',
        borderActive: '#268bd2',
        success: '#859900',
        warning: '#b58900',
        error: '#dc322f',
        info: '#268bd2',
        syntaxKeyword: '#859900',
        syntaxString: '#2aa198',
        syntaxFunction: '#268bd2',
        syntaxComment: '#586e75',
        syntaxType: '#b58900',
        syntaxVariable: '#839496',
        syntaxNumber: '#d33682',
        syntaxOperator: '#859900',
        sidebarBackground: '#073642',
        activityBarBackground: '#002b36',
        statusBarBackground: '#073642',
        tabActiveBackground: '#002b36',
        tabInactiveBackground: '#073642',
        inputBackground: '#073642',
        buttonBackground: '#073642',
        buttonHoverBackground: '#094959',
        scrollbarThumb: '#586e75',
        scrollbarThumbHover: '#657b83',
        selection: '#073642',
        selectionHighlight: '#268bd226',
        editorLineHighlight: '#073642',
        editorGutter: '#002b36',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#859900',
        gitModified: '#b58900',
        gitDeleted: '#dc322f',
    },
};

// Tokyo Night theme
const tokyoNight: Theme = {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    type: 'dark',
    previewColors: ['#1a1b26', '#7aa2f7', '#bb9af7', '#9ece6a'],
    colors: {
        background: '#1a1b26',
        backgroundSecondary: '#16161e',
        backgroundTertiary: '#24283b',
        foreground: '#c0caf5',
        foregroundMuted: '#9aa5ce',
        foregroundSubtle: '#565f89',
        accent: '#7aa2f7',
        accentHover: '#89b4fa',
        accentMuted: '#3d59a1',
        border: '#292e42',
        borderActive: '#7aa2f7',
        success: '#9ece6a',
        warning: '#e0af68',
        error: '#f7768e',
        info: '#7dcfff',
        syntaxKeyword: '#bb9af7',
        syntaxString: '#9ece6a',
        syntaxFunction: '#7aa2f7',
        syntaxComment: '#565f89',
        syntaxType: '#2ac3de',
        syntaxVariable: '#c0caf5',
        syntaxNumber: '#ff9e64',
        syntaxOperator: '#89ddff',
        sidebarBackground: '#16161e',
        activityBarBackground: '#16161e',
        statusBarBackground: '#16161e',
        tabActiveBackground: '#1a1b26',
        tabInactiveBackground: '#16161e',
        inputBackground: '#24283b',
        buttonBackground: '#3d59a1',
        buttonHoverBackground: '#4d69b1',
        scrollbarThumb: '#292e42',
        scrollbarThumbHover: '#3b4261',
        selection: '#283457',
        selectionHighlight: '#7aa2f726',
        editorLineHighlight: '#24283b',
        editorGutter: '#1a1b26',
        hoverOverlay: 'rgba(255, 255, 255, 0.05)',
        hoverOverlayStrong: 'rgba(255, 255, 255, 0.1)',
        gitAdded: '#9ece6a',
        gitModified: '#e0af68',
        gitDeleted: '#f7768e',
    },
};

// Export all themes
export const themes: Record<ThemeId, Theme> = {
    'dark-modern': darkModern,
    'dracula': dracula,
    'github-dark': githubDark,
    'nord': nord,
    'one-dark': oneDark,
    'monokai': monokai,
    'solarized-dark': solarizedDark,
    'tokyo-night': tokyoNight,
};
