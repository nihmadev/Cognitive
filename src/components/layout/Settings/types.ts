export type SettingsSection =
    | 'editor-cursor' | 'editor-find' | 'editor-font' | 'editor-formatting' | 'editor-diff' | 'editor-minimap' | 'editor-suggestions' | 'editor-files'
    | 'workbench-appearance' | 'workbench-editor' | 'workbench-zen'
    | 'window-appearance' | 'window-newwindow'
    | 'features-explorer' | 'features-search' | 'features-debug' | 'features-terminal' | 'features-git'
    | 'application-update' | 'application-proxy' | 'application-keyboard'
    | 'security-workspace' | 'security-telemetry'
    | 'extensions-general';

export interface SettingsPaneProps {
    initialSection?: string | null;
}

export interface NavItem { id: SettingsSection; label: string; }
export interface NavGroup { title: string; items: NavItem[]; isOpen?: boolean; }
