import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Types matching Rust types
export interface UISettings {
    theme: string;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    minimapEnabled: boolean;
    lineNumbersEnabled: boolean;
    tabSize: number;
    sidebarWidth: number;
    aiPanelWidth: number;
    zoomLevel: number;
}

export interface EditorSettings {
    wordWrap: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
    formatOnSave: boolean;
    bracketPairColorization: boolean;
    indentGuides: boolean;
    cursorBlinking: string;
    cursorStyle: string;
}

export interface AISettings {
    activeModelId: string;
    activeMode: string;
    streamResponses: boolean;
    maxTokens: number;
    temperature: number;
}

export interface WorkspaceSettings {
    excludePatterns: string[];
    searchExcludePatterns: string[];
    fileAssociations: Record<string, string>;
}

export interface AppSettings {
    ui: UISettings;
    editor: EditorSettings;
    ai: AISettings;
    workspace?: WorkspaceSettings;
}

export interface SettingsChangeEvent {
    section: string;
    key?: string;
    value: unknown;
    source: 'user' | 'workspace' | 'default' | 'fileWatch';
}

export interface SettingsPaths {
    userConfig: string;
    workspaceConfig: string | null;
    configDir: string;
}

export type SettingsTarget = 'user' | 'workspace';

/**
 * Settings API for Tauri backend
 */
export const settingsApi = {
    /**
     * Initialize settings system and start file watcher
     */
    async init(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_init');
    },

    /**
     * Get all settings (merged user + workspace)
     */
    async getAll(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_get_all');
    },

    /**
     * Get user settings only
     */
    async getUser(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_get_user');
    },

    /**
     * Get workspace settings only
     */
    async getWorkspace(): Promise<AppSettings | null> {
        return invoke<AppSettings | null>('settings_get_workspace');
    },

    /**
     * Update a settings section
     */
    async updateSection<T extends keyof AppSettings>(
        section: T,
        value: AppSettings[T],
        target: SettingsTarget = 'user'
    ): Promise<void> {
        return invoke('settings_update_section', { section, value, target });
    },

    /**
     * Update a single setting value
     */
    async updateValue(
        section: keyof AppSettings,
        key: string,
        value: unknown,
        target: SettingsTarget = 'user'
    ): Promise<void> {
        return invoke('settings_update_value', { section, key, value, target });
    },

    /**
     * Set workspace path and load workspace settings
     */
    async setWorkspace(workspacePath: string): Promise<void> {
        return invoke('settings_set_workspace', { workspacePath });
    },

    /**
     * Clear workspace settings
     */
    async clearWorkspace(): Promise<void> {
        return invoke('settings_clear_workspace');
    },

    /**
     * Reload settings from files
     */
    async reload(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_reload');
    },

    /**
     * Get settings file paths
     */
    async getPaths(): Promise<SettingsPaths> {
        return invoke<SettingsPaths>('settings_get_paths');
    },

    /**
     * Reset settings to defaults
     */
    async reset(target: 'user' | 'workspace' | 'all' = 'user'): Promise<AppSettings> {
        return invoke<AppSettings>('settings_reset', { target });
    },

    /**
     * Listen for settings changes
     */
    onSettingsChanged(callback: (event: SettingsChangeEvent) => void): Promise<UnlistenFn> {
        return listen<SettingsChangeEvent>('settings-changed', (event) => {
            callback(event.payload);
        });
    },

    /**
     * Listen for settings file changes (external edits)
     */
    onSettingsFileChanged(callback: (event: SettingsChangeEvent) => void): Promise<UnlistenFn> {
        return listen<SettingsChangeEvent>('settings-file-changed', (event) => {
            callback(event.payload);
        });
    },
};

// Default settings for reference
export const defaultSettings: AppSettings = {
    ui: {
        theme: 'dark-modern',
        fontFamily: 'jetbrains',
        fontSize: 14,
        lineHeight: 1.5,
        minimapEnabled: true,
        lineNumbersEnabled: true,
        tabSize: 4,
        sidebarWidth: 256,
        aiPanelWidth: 400,
        zoomLevel: 1.0,
    },
    editor: {
        wordWrap: false,
        autoSave: false,
        autoSaveDelay: 1000,
        formatOnSave: false,
        bracketPairColorization: true,
        indentGuides: true,
        cursorBlinking: 'blink',
        cursorStyle: 'line',
    },
    ai: {
        activeModelId: '',
        activeMode: 'responder',
        streamResponses: true,
        maxTokens: 4096,
        temperature: 0.7,
    },
};
