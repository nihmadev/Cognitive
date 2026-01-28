import { NavGroup } from './types';

export const navigation: NavGroup[] = [
    {
        title: 'General',
        items: [
            { id: 'general-home', label: 'Home' },
            { id: 'general-workbench', label: 'Workbench' },
            { id: 'general-window', label: 'Window' },
            { id: 'general-menu', label: 'Menu Bar' },
            { id: 'general-explorer', label: 'Explorer' },
            { id: 'general-search', label: 'Search' },
            { id: 'general-debug', label: 'Debug' },
            { id: 'general-terminal', label: 'Terminal' },
            { id: 'general-git', label: 'Git' },
            { id: 'general-security', label: 'Security' },
            { id: 'general-scm', label: 'Source Control' },
            { id: 'general-extensions', label: 'Extensions' },
            { id: 'general-telemetry', label: 'Telemetry' },
            { id: 'general-update', label: 'Update' },
            { id: 'general-proxy', label: 'Proxy' },
            { id: 'general-application', label: 'Application' },
        ]
    },
    {
        title: 'Editor',
        items: [
            { id: 'editor-general', label: 'General' },
            { id: 'editor-cursor', label: 'Cursor' },
            { id: 'editor-find', label: 'Find' },
            { id: 'editor-font', label: 'Font' },
            { id: 'editor-formatting', label: 'Formatting' },
            { id: 'editor-diff', label: 'Diff Editor' },
            { id: 'editor-minimap', label: 'Minimap' },
            { id: 'editor-suggestions', label: 'Suggestions' },
            { id: 'editor-snippets', label: 'Snippets' },
            { id: 'editor-unicode', label: 'Unicode' },
            { id: 'editor-bracket-pair-colorization', label: 'Bracket Pair Colorization' },
            { id: 'editor-guides', label: 'Guides' },
            { id: 'editor-inlay-hints', label: 'Inlay Hints' },
            { id: 'editor-sticky-scroll', label: 'Sticky Scroll' },
            { id: 'editor-editing', label: 'Editing' },
            { id: 'editor-folding', label: 'Folding' },
            { id: 'editor-line-numbers', label: 'Line Numbers' },
            { id: 'editor-rulers', label: 'Rulers' },
            { id: 'editor-word-wrap', label: 'Word Wrap' },
            { id: 'editor-indentation', label: 'Indentation' },
            { id: 'editor-detection', label: 'File Detection' },
            { id: 'editor-accessibility', label: 'Accessibility' },
            { id: 'editor-goto', label: 'Go to' },
            { id: 'editor-multicursor', label: 'Multi-cursor' },
            { id: 'editor-occurrences', label: 'Occurrences' },
            { id: 'editor-smart-scroll', label: 'Smart Scroll' },
            { id: 'editor-suggest', label: 'Suggestions' },
            { id: 'editor-clipboard', label: 'Clipboard' },
            { id: 'editor-contributions', label: 'Contributions' },
        ]
    },
    {
        title: 'Workbench',
        items: [
            { id: 'workbench-appearance', label: 'Appearance' },
            { id: 'workbench-editor', label: 'Editor Management' },
            { id: 'workbench-layout', label: 'Layout' },
            { id: 'workbench-sidebar', label: 'Sidebar' },
            { id: 'workbench-panel', label: 'Panel' },
            { id: 'workbench-zen', label: 'Zen Mode' },
            { id: 'workbench-timeline', label: 'Timeline' },
            { id: 'workbench-comments', label: 'Comments' },
            { id: 'workbench-chat', label: 'Chat' },
            { id: 'workbench-issues', label: 'Issues' },
            { id: 'workbench-experimentation', label: 'Experimentation' },
            { id: 'workbench-settings-editor', label: 'Settings Editor' },
            { id: 'workbench-keybindings', label: 'Keybindings' },
            { id: 'workbench-colors', label: 'Color Themes' },
            { id: 'workbench-themes', label: 'Themes' },
            { id: 'workbench-icons', label: 'File Icons' },
            { id: 'workbench-product-icon', label: 'Product Icon' },
            { id: 'workbench-startup', label: 'Startup' },
            { id: 'workbench-window', label: 'Window' },
            { id: 'workbench-welcome', label: 'Welcome' },
            { id: 'workbench-trust', label: 'Workspace Trust' },
        ]
    },
    {
        title: 'Features',
        items: [
            { id: 'features-explorer', label: 'Explorer' },
            { id: 'features-search', label: 'Search' },
            { id: 'features-debug', label: 'Debug' },
            { id: 'features-terminal', label: 'Terminal' },
            { id: 'features-git', label: 'Git' },
            { id: 'features-testing', label: 'Testing' },
            { id: 'features-tasks', label: 'Tasks' },
            { id: 'features-extension-host', label: 'Extension Host' },
            { id: 'features-remote', label: 'Remote' },
            { id: 'features-ssh', label: 'SSH' },
            { id: 'features-containers', label: 'Containers' },
            { id: 'features-wsl', label: 'WSL' },
            { id: 'features-performance', label: 'Performance' },
            { id: 'features-network', label: 'Network' },
            { id: 'features-security', label: 'Security' },
            { id: 'features-accessibility', label: 'Accessibility' },
        ]
    },
    {
        title: 'Extensions',
        items: [
            { id: 'extensions-general', label: 'General' },
            { id: 'extensions-auto-update', label: 'Auto Update' },
            { id: 'extensions-close-extensions', label: 'Close Extensions' },
            { id: 'extensions-recommendations', label: 'Recommendations' },
            { id: 'extensions-marketplace', label: 'Marketplace' },
            { id: 'extensions-search', label: 'Search' },
            { id: 'extensions-installed', label: 'Installed' },
            { id: 'extensions-enabled', label: 'Enabled' },
            { id: 'extensions-disabled', label: 'Disabled' },
            { id: 'extensions-outdated', label: 'Outdated' },
            { id: 'extensions-builtin', label: 'Built-in' },
        ]
    },
    {
        title: 'Application',
        items: [
            { id: 'application-proxy', label: 'Proxy' },
            { id: 'application-update', label: 'Update' },
            { id: 'application-telemetry', label: 'Telemetry' },
            { id: 'application-crash-reporter', label: 'Crash Reporter' },
            { id: 'application-language', label: 'Language' },
            { id: 'application-keyboard', label: 'Keyboard' },
            { id: 'application-mouse', label: 'Mouse' },
            { id: 'application-shell', label: 'Shell' },
            { id: 'application-developer', label: 'Developer' },
            { id: 'application-experimental', label: 'Experimental' },
        ]
    },
    {
        title: 'Security',
        items: [
            { id: 'security-workspace', label: 'Workspace' },
            { id: 'security-trust', label: 'Trust' },
            { id: 'security-extensions', label: 'Extensions' },
            { id: 'security-telemetry', label: 'Telemetry' },
            { id: 'security-proxy', label: 'Proxy' },
            { id: 'security-network', label: 'Network' },
            { id: 'security-privacy', label: 'Privacy' },
        ]
    }
];

export const sectionMeta: Record<string, { group: string; label: string }> = {};
navigation.forEach(group => {
    group.items.forEach(item => {
        sectionMeta[item.id] = { group: group.title, label: item.label };
    });
});
