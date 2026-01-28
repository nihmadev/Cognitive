import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';


export interface UISettings {
    theme: string;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    minimapEnabled: boolean;
    lineNumbersEnabled: boolean;
    tabSize: number;
    sidebarWidth: number;
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

export interface WorkspaceSettings {
    excludePatterns: string[];
    searchExcludePatterns: string[];
    fileAssociations: Record<string, string>;
}

export interface AppSettings {
    ui: UISettings;
    editor: EditorSettings;
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


export const settingsApi = {
    
    async init(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_init');
    },

    
    async getAll(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_get_all');
    },

    
    async getUser(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_get_user');
    },

    
    async getWorkspace(): Promise<AppSettings | null> {
        return invoke<AppSettings | null>('settings_get_workspace');
    },

    
    async updateSection<T extends keyof AppSettings>(
        section: T,
        value: AppSettings[T],
        target: SettingsTarget = 'user'
    ): Promise<void> {
        return invoke('settings_update_section', { section, value, target });
    },

    
    async updateValue(
        section: keyof AppSettings,
        key: string,
        value: unknown,
        target: SettingsTarget = 'user'
    ): Promise<void> {
        return invoke('settings_update_value', { section, key, value, target });
    },

    
    async setWorkspace(workspacePath: string): Promise<void> {
        return invoke('settings_set_workspace', { workspacePath });
    },

    
    async clearWorkspace(): Promise<void> {
        return invoke('settings_clear_workspace');
    },

    
    async reload(): Promise<AppSettings> {
        return invoke<AppSettings>('settings_reload');
    },

    
    async getPaths(): Promise<SettingsPaths> {
        return invoke<SettingsPaths>('settings_get_paths');
    },

    
    async reset(target: 'user' | 'workspace' | 'all' = 'user'): Promise<AppSettings> {
        return invoke<AppSettings>('settings_reset', { target });
    },

    
    onSettingsChanged(callback: (event: SettingsChangeEvent) => void): Promise<UnlistenFn> {
        return listen<SettingsChangeEvent>('settings-changed', (event) => {
            callback(event.payload);
        });
    },

    
    onSettingsFileChanged(callback: (event: SettingsChangeEvent) => void): Promise<UnlistenFn> {
        return listen<SettingsChangeEvent>('settings-file-changed', (event) => {
            callback(event.payload);
        });
    },
};


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
};
