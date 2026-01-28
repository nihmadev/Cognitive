export type SettingsSection =
    // General
    | 'general' | 'general-home' | 'general-workbench' | 'general-window' | 'general-menu' | 'general-explorer' | 'general-search' | 'general-debug' | 'general-terminal' | 'general-git' | 'general-security' | 'general-scm' | 'general-extensions' | 'general-telemetry' | 'general-update' | 'general-proxy' | 'general-application'
    // Editor
    | 'editor-general' | 'editor-cursor' | 'editor-find' | 'editor-font' | 'editor-formatting' | 'editor-diff' | 'editor-minimap' | 'editor-suggestions' | 'editor-snippets' | 'editor-unicode' | 'editor-bracket-pair-colorization' | 'editor-guides' | 'editor-inlay-hints' | 'editor-sticky-scroll' | 'editor-editing' | 'editor-folding' | 'editor-line-numbers' | 'editor-rulers' | 'editor-word-wrap' | 'editor-indentation' | 'editor-detection' | 'editor-accessibility' | 'editor-goto' | 'editor-multicursor' | 'editor-occurrences' | 'editor-smart-scroll' | 'editor-suggest' | 'editor-clipboard' | 'editor-contributions'
    // Workbench
    | 'workbench-appearance' | 'workbench-editor' | 'workbench-layout' | 'workbench-sidebar' | 'workbench-panel' | 'workbench-zen' | 'workbench-timeline' | 'workbench-comments' | 'workbench-chat' | 'workbench-issues' | 'workbench-experimentation' | 'workbench-settings-editor' | 'workbench-keybindings' | 'workbench-colors' | 'workbench-themes' | 'workbench-icons' | 'workbench-product-icon' | 'workbench-startup' | 'workbench-window' | 'workbench-welcome' | 'workbench-trust'
    // Features
    | 'features-explorer' | 'features-search' | 'features-debug' | 'features-terminal' | 'features-git' | 'features-testing' | 'features-tasks' | 'features-extension-host' | 'features-remote' | 'features-ssh' | 'features-containers' | 'features-wsl' | 'features-performance' | 'features-network' | 'features-security' | 'features-accessibility'
    // Extensions
    | 'extensions-general' | 'extensions-auto-update' | 'extensions-close-extensions' | 'extensions-recommendations' | 'extensions-marketplace' | 'extensions-search' | 'extensions-installed' | 'extensions-enabled' | 'extensions-disabled' | 'extensions-outdated' | 'extensions-builtin'
    // Application
    | 'application-proxy' | 'application-update' | 'application-telemetry' | 'application-crash-reporter' | 'application-language' | 'application-keyboard' | 'application-mouse' | 'application-shell' | 'application-developer' | 'application-experimental'
    // Security
    | 'security-workspace' | 'security-trust' | 'security-extensions' | 'security-telemetry' | 'security-proxy' | 'security-network' | 'security-privacy';

export interface SettingsPaneProps {
    initialSection?: string | null;
}

export interface NavItem { id: SettingsSection; label: string; }
export interface NavGroup { title: string; items: NavItem[]; isOpen?: boolean; }
