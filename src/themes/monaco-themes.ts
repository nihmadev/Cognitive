import type { Monaco } from '@monaco-editor/react';
import { themes, type ThemeId } from './index';

// Track registered themes
let themesRegistered = false;

// Monaco theme name mapping
export const getMonacoThemeName = (themeId: ThemeId): string => {
    return `colbex-${themeId}`;
};

// Convert our theme colors to Monaco theme format
const createMonacoTheme = (themeId: ThemeId): any => {
    const theme = themes[themeId];
    if (!theme) return null;

    const colors = theme.colors;

    return {
        base: theme.type === 'dark' ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
            { token: '', foreground: colors.foreground.replace('#', '') },
            { token: 'comment', foreground: colors.syntaxComment.replace('#', ''), fontStyle: 'italic' },
            { token: 'keyword', foreground: colors.syntaxKeyword.replace('#', '') },
            { token: 'keyword.control', foreground: colors.syntaxKeyword.replace('#', '') },
            { token: 'string', foreground: colors.syntaxString.replace('#', '') },
            { token: 'string.key', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'string.value', foreground: colors.syntaxString.replace('#', '') },
            { token: 'number', foreground: colors.syntaxNumber.replace('#', '') },
            { token: 'number.hex', foreground: colors.syntaxNumber.replace('#', '') },
            { token: 'regexp', foreground: colors.syntaxString.replace('#', '') },
            { token: 'type', foreground: colors.syntaxType.replace('#', '') },
            { token: 'type.identifier', foreground: colors.syntaxType.replace('#', '') },
            { token: 'class', foreground: colors.syntaxType.replace('#', '') },
            { token: 'interface', foreground: colors.syntaxType.replace('#', '') },
            { token: 'function', foreground: colors.syntaxFunction.replace('#', '') },
            { token: 'function.call', foreground: colors.syntaxFunction.replace('#', '') },
            { token: 'variable', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'variable.predefined', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'constant', foreground: colors.syntaxNumber.replace('#', '') },
            { token: 'operator', foreground: colors.syntaxOperator.replace('#', '') },
            { token: 'delimiter', foreground: colors.foreground.replace('#', '') },
            { token: 'delimiter.bracket', foreground: colors.foreground.replace('#', '') },
            { token: 'tag', foreground: colors.syntaxKeyword.replace('#', '') },
            { token: 'attribute.name', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'attribute.value', foreground: colors.syntaxString.replace('#', '') },
            { token: 'metatag', foreground: colors.syntaxKeyword.replace('#', '') },
            { token: 'annotation', foreground: colors.syntaxFunction.replace('#', '') },
            // JSON specific
            { token: 'string.key.json', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'string.value.json', foreground: colors.syntaxString.replace('#', '') },
            // HTML/XML
            { token: 'tag.html', foreground: colors.syntaxKeyword.replace('#', '') },
            { token: 'tag.xml', foreground: colors.syntaxKeyword.replace('#', '') },
            // CSS
            { token: 'attribute.name.css', foreground: colors.syntaxVariable.replace('#', '') },
            { token: 'attribute.value.css', foreground: colors.syntaxString.replace('#', '') },
            { token: 'selector.css', foreground: colors.syntaxFunction.replace('#', '') },
        ],
        colors: {
            'editor.background': colors.background,
            'editor.foreground': colors.foreground,
            'editor.lineHighlightBackground': colors.editorLineHighlight,
            'editor.selectionBackground': colors.selection,
            'editor.selectionHighlightBackground': colors.selectionHighlight,
            'editor.inactiveSelectionBackground': colors.selection + '80',
            'editorLineNumber.foreground': colors.foregroundSubtle,
            'editorLineNumber.activeForeground': colors.foreground,
            'editorCursor.foreground': colors.accent,
            'editorWhitespace.foreground': colors.foregroundSubtle + '40',
            'editorIndentGuide.background': colors.border,
            'editorIndentGuide.activeBackground': colors.borderActive,
            'editor.findMatchBackground': colors.accent + '40',
            'editor.findMatchHighlightBackground': colors.accent + '20',
            'editorBracketMatch.background': colors.accent + '30',
            'editorBracketMatch.border': colors.accent,
            'editorGutter.background': colors.editorGutter,
            'editorWidget.background': colors.backgroundSecondary,
            'editorWidget.border': colors.border,
            'editorSuggestWidget.background': colors.backgroundSecondary,
            'editorSuggestWidget.border': colors.border,
            'editorSuggestWidget.foreground': colors.foreground,
            'editorSuggestWidget.selectedBackground': colors.selection,
            'editorHoverWidget.background': colors.backgroundSecondary,
            'editorHoverWidget.border': colors.border,
            'scrollbar.shadow': '#00000000',
            'scrollbarSlider.background': colors.scrollbarThumb + '80',
            'scrollbarSlider.hoverBackground': colors.scrollbarThumbHover,
            'scrollbarSlider.activeBackground': colors.scrollbarThumbHover,
            'minimap.background': colors.background,
            'minimapSlider.background': colors.scrollbarThumb + '40',
            'minimapSlider.hoverBackground': colors.scrollbarThumb + '60',
            'minimapSlider.activeBackground': colors.scrollbarThumb + '80',
        },
    };
};

// Register all themes with Monaco
export const registerMonacoThemes = (monaco: Monaco): void => {
    if (themesRegistered) return;

    const themeIds = Object.keys(themes) as ThemeId[];
    
    for (const themeId of themeIds) {
        const monacoTheme = createMonacoTheme(themeId);
        if (monacoTheme) {
            monaco.editor.defineTheme(getMonacoThemeName(themeId), monacoTheme);
        }
    }

    themesRegistered = true;
};

// Force re-registration (useful for hot reload)
export const forceRegisterMonacoThemes = (monaco: Monaco): void => {
    themesRegistered = false;
    registerMonacoThemes(monaco);
};
