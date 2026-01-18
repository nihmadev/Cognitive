import { NavGroup } from './types';

export const navigation: NavGroup[] = [
    {
        title: 'Text Editor',
        items: [
            { id: 'editor-cursor', label: 'Cursor' },
            { id: 'editor-find', label: 'Find' },
            { id: 'editor-font', label: 'Font' },
            { id: 'editor-formatting', label: 'Formatting' },
            { id: 'editor-diff', label: 'Diff Editor' },
            { id: 'editor-minimap', label: 'Minimap' },
            { id: 'editor-suggestions', label: 'Suggestions' },
            { id: 'editor-files', label: 'Files' },
        ]
    },
    {
        title: 'Workbench',
        items: [
            { id: 'workbench-appearance', label: 'Appearance' },
            { id: 'workbench-editor', label: 'Editor Management' },
            { id: 'workbench-zen', label: 'Zen Mode' },
        ]
    },
    {
        title: 'Window',
        items: [
            { id: 'window-appearance', label: 'Appearance' },
            { id: 'window-newwindow', label: 'New Window' },
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
        ]
    },
    {
        title: 'Application',
        items: [
            { id: 'application-update', label: 'Update' },
            { id: 'application-proxy', label: 'Proxy' },
            { id: 'application-keyboard', label: 'Keyboard' },
        ]
    },
    {
        title: 'Security',
        items: [
            { id: 'security-workspace', label: 'Workspace' },
            { id: 'security-telemetry', label: 'Telemetry' },
        ]
    },
    {
        title: 'Extensions',
        items: [
            { id: 'extensions-general', label: 'Extensions' },
        ]
    }
];

export const sectionMeta: Record<string, { group: string; label: string }> = {};
navigation.forEach(group => {
    group.items.forEach(item => {
        sectionMeta[item.id] = { group: group.title, label: item.label };
    });
});
