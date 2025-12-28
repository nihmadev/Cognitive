import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themes, type ThemeId, type Theme, type ThemeColors } from '../themes';

// Re-export theme types for convenience
export type { ThemeId, Theme, ThemeColors };
export { themes };

type BottomPanelTab = 'problems' | 'output' | 'debug' | 'ports';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export interface FontSettings {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
}

export const availableFonts = [
    { id: 'jetbrains', name: 'JetBrains Mono', stack: '"JetBrains Mono", "Fira Code", Consolas, monospace' },
    { id: 'fira', name: 'Fira Code', stack: '"Fira Code", "JetBrains Mono", Consolas, monospace' },
    { id: 'consolas', name: 'Consolas', stack: 'Consolas, "JetBrains Mono", "Fira Code", monospace' },
    { id: 'cascadia', name: 'Cascadia Code', stack: '"Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace' },
    { id: 'source', name: 'Source Code Pro', stack: '"Source Code Pro", "JetBrains Mono", "Fira Code", Consolas, monospace' },
    { id: 'ibm', name: 'IBM Plex Mono', stack: '"IBM Plex Mono", "JetBrains Mono", "Fira Code", Consolas, monospace' },
];

interface UIState {
    showSidebar: boolean;
    toggleSidebar: () => void;
    showTerminal: boolean;
    toggleTerminal: () => void;
    setTerminalOpen: (open: boolean) => void;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    aiPanelWidth: number;
    setAIPanelWidth: (width: number) => void;
    bottomPanelTab: BottomPanelTab;
    setBottomPanelTab: (tab: BottomPanelTab) => void;
    openPorts: () => void;
    // Split View
    splitView: boolean;
    splitViewSecondFile: string | null;
    toggleSplitView: () => void;
    setSplitView: (split: boolean) => void;
    setSplitViewSecondFile: (file: string | null) => void;
    // Zoom
    zoomLevel: number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    setZoomLevel: (level: number) => void;
    // Insert mode
    insertMode: boolean;
    toggleInsertMode: () => void;
    setInsertMode: (mode: boolean) => void;
    // Theme
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
    // Font settings
    fontSettings: FontSettings;
    availableFonts: Array<{ id: string; name: string; stack: string }>;
    setFontFamily: (fontId: string) => void;
    setFontSize: (size: number) => void;
    setLineHeight: (height: number) => void;
    updateFontSettings: (settings: Partial<FontSettings>) => void;
    // Editor settings
    minimapEnabled: boolean;
    setMinimapEnabled: (enabled: boolean) => void;
    lineNumbersEnabled: boolean;
    setLineNumbersEnabled: (enabled: boolean) => void;
    tabSize: number;
    setTabSize: (size: number) => void;
}

// Apply theme CSS variables to document
const applyTheme = (themeId: ThemeId) => {
    const theme = themes[themeId];
    if (!theme) return;
    
    const root = document.documentElement;
    const colors = theme.colors;
    
    // Set CSS variables
    root.style.setProperty('--theme-background', colors.background);
    root.style.setProperty('--theme-background-secondary', colors.backgroundSecondary);
    root.style.setProperty('--theme-background-tertiary', colors.backgroundTertiary);
    root.style.setProperty('--theme-foreground', colors.foreground);
    root.style.setProperty('--theme-foreground-muted', colors.foregroundMuted);
    root.style.setProperty('--theme-foreground-subtle', colors.foregroundSubtle);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-accent-hover', colors.accentHover);
    root.style.setProperty('--theme-accent-muted', colors.accentMuted);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-border-active', colors.borderActive);
    root.style.setProperty('--theme-success', colors.success);
    root.style.setProperty('--theme-warning', colors.warning);
    root.style.setProperty('--theme-error', colors.error);
    root.style.setProperty('--theme-info', colors.info);
    root.style.setProperty('--theme-syntax-keyword', colors.syntaxKeyword);
    root.style.setProperty('--theme-syntax-string', colors.syntaxString);
    root.style.setProperty('--theme-syntax-function', colors.syntaxFunction);
    root.style.setProperty('--theme-syntax-comment', colors.syntaxComment);
    root.style.setProperty('--theme-syntax-type', colors.syntaxType);
    root.style.setProperty('--theme-syntax-variable', colors.syntaxVariable);
    root.style.setProperty('--theme-syntax-number', colors.syntaxNumber);
    root.style.setProperty('--theme-syntax-operator', colors.syntaxOperator);
    root.style.setProperty('--theme-sidebar-background', colors.sidebarBackground);
    root.style.setProperty('--theme-activity-bar-background', colors.activityBarBackground);
    root.style.setProperty('--theme-status-bar-background', colors.statusBarBackground);
    root.style.setProperty('--theme-tab-active-background', colors.tabActiveBackground);
    root.style.setProperty('--theme-tab-inactive-background', colors.tabInactiveBackground);
    root.style.setProperty('--theme-input-background', colors.inputBackground);
    root.style.setProperty('--theme-button-background', colors.buttonBackground);
    root.style.setProperty('--theme-button-hover-background', colors.buttonHoverBackground);
    root.style.setProperty('--theme-scrollbar-thumb', colors.scrollbarThumb);
    root.style.setProperty('--theme-scrollbar-thumb-hover', colors.scrollbarThumbHover);
    root.style.setProperty('--theme-selection', colors.selection);
    root.style.setProperty('--theme-selection-highlight', colors.selectionHighlight);
    root.style.setProperty('--theme-editor-line-highlight', colors.editorLineHighlight);
    root.style.setProperty('--theme-editor-gutter', colors.editorGutter);
    root.style.setProperty('--theme-hover-overlay', colors.hoverOverlay);
    root.style.setProperty('--theme-hover-overlay-strong', colors.hoverOverlayStrong);
    
    // Set theme type class
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme.type}`);
    
    // Update meta theme-color for browser
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colors.background);
    }
};

// Apply font settings to document
const applyFontSettings = (fontSettings: FontSettings) => {
    const root = document.documentElement;
    const font = availableFonts.find(f => f.id === fontSettings.fontFamily);
    const fontStack = font?.stack || availableFonts[0].stack;
    
    // Set CSS variables for fonts
    root.style.setProperty('--font-family', fontStack);
    root.style.setProperty('--font-size', `${fontSettings.fontSize}px`);
    root.style.setProperty('--line-height', fontSettings.lineHeight.toString());
    
    // Apply font to all editor elements
    const editorElements = document.querySelectorAll('.monaco-editor, .editor-container, .code-editor');
    editorElements.forEach(element => {
        (element as HTMLElement).style.fontFamily = fontStack;
        (element as HTMLElement).style.fontSize = `${fontSettings.fontSize}px`;
        (element as HTMLElement).style.lineHeight = fontSettings.lineHeight.toString();
    });
};

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            showSidebar: true,
            toggleSidebar: () => {
                set((state) => {
                    const newState = { showSidebar: !state.showSidebar };
                    return newState;
                });
            },
            sidebarWidth: 256,
            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            aiPanelWidth: 400,
            setAIPanelWidth: (width) => set({ aiPanelWidth: width }),
            showTerminal: false,
            toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
            setTerminalOpen: (open) => set({ showTerminal: open }),
            bottomPanelTab: 'ports',
            setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
            openPorts: () => set({ showTerminal: true, bottomPanelTab: 'ports' }),
            // Split View
            splitView: false,
            splitViewSecondFile: null,
            toggleSplitView: () => {
                set((state) => ({ splitView: !state.splitView }));
            },
            setSplitView: (split) => set({ splitView: split }),
            setSplitViewSecondFile: (file) => set({ splitViewSecondFile: file }),
            // Zoom
            zoomLevel: 1.0,
            zoomIn: () => set((state) => ({ 
                zoomLevel: Math.min(MAX_ZOOM, Math.round((state.zoomLevel + ZOOM_STEP) * 10) / 10)
            })),
            zoomOut: () => set((state) => ({ 
                zoomLevel: Math.max(MIN_ZOOM, Math.round((state.zoomLevel - ZOOM_STEP) * 10) / 10)
            })),
            resetZoom: () => set({ zoomLevel: 1.0 }),
            setZoomLevel: (level) => set({ 
                zoomLevel: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))
            }),
            // Insert mode
            insertMode: true,
            toggleInsertMode: () => set((state) => ({ insertMode: !state.insertMode })),
            setInsertMode: (mode) => set({ insertMode: mode }),
            // Theme
            theme: 'dark-modern',
            setTheme: (themeId) => {
                applyTheme(themeId);
                set({ theme: themeId });
            },
            // Font settings
            fontSettings: {
                fontFamily: 'jetbrains',
                fontSize: 14,
                lineHeight: 1.5,
            },
            availableFonts: availableFonts,
            setFontFamily: (fontId) => set((state) => {
                const newSettings = { ...state.fontSettings, fontFamily: fontId };
                applyFontSettings(newSettings);
                return { fontSettings: newSettings };
            }),
            setFontSize: (size) => set((state) => {
                const newSettings = { ...state.fontSettings, fontSize: size };
                applyFontSettings(newSettings);
                return { fontSettings: newSettings };
            }),
            setLineHeight: (height) => set((state) => {
                const newSettings = { ...state.fontSettings, lineHeight: height };
                applyFontSettings(newSettings);
                return { fontSettings: newSettings };
            }),
            updateFontSettings: (settings) => set((state) => {
                const newSettings = { ...state.fontSettings, ...settings };
                applyFontSettings(newSettings);
                return { fontSettings: newSettings };
            }),
            // Editor settings
            minimapEnabled: true,
            setMinimapEnabled: (enabled) => set({ minimapEnabled: enabled }),
            lineNumbersEnabled: true,
            setLineNumbersEnabled: (enabled) => set({ lineNumbersEnabled: enabled }),
            tabSize: 4,
            setTabSize: (size) => set({ tabSize: size }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({ 
                zoomLevel: state.zoomLevel, 
                theme: state.theme,
                fontSettings: state.fontSettings,
                minimapEnabled: state.minimapEnabled,
                lineNumbersEnabled: state.lineNumbersEnabled,
                tabSize: state.tabSize,
                sidebarWidth: state.sidebarWidth,
                aiPanelWidth: state.aiPanelWidth
            }),
            onRehydrateStorage: () => (state) => {
                // Apply theme on rehydration
                if (state?.theme) {
                    applyTheme(state.theme);
                }
                // Apply font settings on rehydration
                if (state?.fontSettings) {
                    applyFontSettings(state.fontSettings);
                }
            },
        }
    )
);

// Initialize theme and fonts on first load
const initThemeAndFonts = () => {
    const stored = localStorage.getItem('ui-storage');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.state?.theme) {
                applyTheme(parsed.state.theme);
            }
            if (parsed.state?.fontSettings) {
                applyFontSettings(parsed.state.fontSettings);
            }
        } catch {
            applyTheme('dark-modern');
            applyFontSettings({
                fontFamily: 'jetbrains',
                fontSize: 14,
                lineHeight: 1.5,
            });
        }
    } else {
        applyTheme('dark-modern');
        applyFontSettings({
            fontFamily: 'jetbrains',
            fontSize: 14,
            lineHeight: 1.5,
        });
    }
};

initThemeAndFonts();
