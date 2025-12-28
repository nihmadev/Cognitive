import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { 
    settingsApi, 
    AppSettings, 
    SettingsChangeEvent,
    SettingsTarget,
    defaultSettings 
} from '@/lib/settings-api';

interface SettingsState {
    settings: AppSettings;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    
    // Actions
    initialize: () => Promise<void>;
    updateUI: <K extends keyof AppSettings['ui']>(key: K, value: AppSettings['ui'][K], target?: SettingsTarget) => Promise<void>;
    updateEditor: <K extends keyof AppSettings['editor']>(key: K, value: AppSettings['editor'][K], target?: SettingsTarget) => Promise<void>;
    updateAI: <K extends keyof AppSettings['ai']>(key: K, value: AppSettings['ai'][K], target?: SettingsTarget) => Promise<void>;
    reload: () => Promise<void>;
    reset: (target?: 'user' | 'workspace' | 'all') => Promise<void>;
    setWorkspace: (path: string) => Promise<void>;
    clearWorkspace: () => Promise<void>;
    
    // Internal
    _setSettings: (settings: AppSettings) => void;
    _handleChange: (event: SettingsChangeEvent) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: defaultSettings,
    isLoading: false,
    isInitialized: false,
    error: null,

    initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true, error: null });
        try {
            const settings = await settingsApi.init();
            set({ settings, isInitialized: true, isLoading: false });
        } catch (error) {
            console.error('Failed to initialize settings:', error);
            set({ error: String(error), isLoading: false });
        }
    },

    updateUI: async (key, value, target = 'user') => {
        const { settings } = get();
        
        // Optimistic update
        set({
            settings: {
                ...settings,
                ui: { ...settings.ui, [key]: value }
            }
        });

        try {
            await settingsApi.updateValue('ui', key, value, target);
        } catch (error) {
            // Revert on error
            console.error('Failed to update UI setting:', error);
            set({ settings, error: String(error) });
        }
    },

    updateEditor: async (key, value, target = 'user') => {
        const { settings } = get();
        
        set({
            settings: {
                ...settings,
                editor: { ...settings.editor, [key]: value }
            }
        });

        try {
            await settingsApi.updateValue('editor', key, value, target);
        } catch (error) {
            console.error('Failed to update editor setting:', error);
            set({ settings, error: String(error) });
        }
    },

    updateAI: async (key, value, target = 'user') => {
        const { settings } = get();
        
        set({
            settings: {
                ...settings,
                ai: { ...settings.ai, [key]: value }
            }
        });

        try {
            await settingsApi.updateValue('ai', key, value, target);
        } catch (error) {
            console.error('Failed to update AI setting:', error);
            set({ settings, error: String(error) });
        }
    },

    reload: async () => {
        set({ isLoading: true, error: null });
        try {
            const settings = await settingsApi.reload();
            set({ settings, isLoading: false });
        } catch (error) {
            console.error('Failed to reload settings:', error);
            set({ error: String(error), isLoading: false });
        }
    },

    reset: async (target = 'user') => {
        set({ isLoading: true, error: null });
        try {
            const settings = await settingsApi.reset(target);
            set({ settings, isLoading: false });
        } catch (error) {
            console.error('Failed to reset settings:', error);
            set({ error: String(error), isLoading: false });
        }
    },

    setWorkspace: async (path) => {
        try {
            await settingsApi.setWorkspace(path);
            const settings = await settingsApi.getAll();
            set({ settings });
        } catch (error) {
            console.error('Failed to set workspace:', error);
            set({ error: String(error) });
        }
    },

    clearWorkspace: async () => {
        try {
            await settingsApi.clearWorkspace();
            const settings = await settingsApi.getAll();
            set({ settings });
        } catch (error) {
            console.error('Failed to clear workspace:', error);
            set({ error: String(error) });
        }
    },

    _setSettings: (settings) => set({ settings }),

    _handleChange: (event) => {
        const { settings } = get();
        
        if (event.section === 'all') {
            // Full settings update
            if (typeof event.value === 'object' && event.value !== null) {
                set({ settings: event.value as AppSettings });
            }
        } else if (event.key) {
            // Single value update
            const section = event.section as keyof AppSettings;
            if (settings[section] && typeof settings[section] === 'object') {
                set({
                    settings: {
                        ...settings,
                        [section]: {
                            ...settings[section],
                            [event.key]: event.value
                        }
                    }
                });
            }
        } else {
            // Section update
            const section = event.section as keyof AppSettings;
            if (typeof event.value === 'object' && event.value !== null) {
                set({
                    settings: {
                        ...settings,
                        [section]: event.value
                    }
                });
            }
        }
    },
}));

/**
 * Hook to use settings with automatic initialization and event listening
 */
export function useSettings() {
    const store = useSettingsStore();
    const unlistenRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Initialize settings
        store.initialize();

        // Set up event listeners
        const setupListeners = async () => {
            const unlisten1 = await settingsApi.onSettingsChanged(store._handleChange);
            const unlisten2 = await settingsApi.onSettingsFileChanged(async () => {
                // Reload settings when file changes externally
                await store.reload();
            });

            unlistenRef.current = () => {
                unlisten1();
                unlisten2();
            };
        };

        setupListeners();

        return () => {
            unlistenRef.current?.();
        };
    }, []);

    return {
        settings: store.settings,
        isLoading: store.isLoading,
        isInitialized: store.isInitialized,
        error: store.error,
        updateUI: store.updateUI,
        updateEditor: store.updateEditor,
        updateAI: store.updateAI,
        reload: store.reload,
        reset: store.reset,
        setWorkspace: store.setWorkspace,
        clearWorkspace: store.clearWorkspace,
    };
}

/**
 * Hook for specific UI settings
 */
export function useUISettings() {
    const { settings, updateUI } = useSettingsStore();
    return { ui: settings.ui, updateUI };
}

/**
 * Hook for specific editor settings
 */
export function useEditorSettings() {
    const { settings, updateEditor } = useSettingsStore();
    return { editor: settings.editor, updateEditor };
}

/**
 * Hook for specific AI settings
 */
export function useAISettings() {
    const { settings, updateAI } = useSettingsStore();
    return { ai: settings.ai, updateAI };
}
