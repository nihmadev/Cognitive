import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from "@tauri-apps/api/core";

interface Extension {
    id: string;
    name: string;
    publisher: string;
    description: string;
    icon: string;
    installed: boolean;
}

interface ExtensionState {
    extensions: Extension[];
    installExtension: (id: string) => Promise<void>;
    uninstallExtension: (id: string) => void;
}

export const useExtensionStore = create<ExtensionState>()(
    persist(
        (set, get) => ({
            extensions: [
                {
                    id: 'python',
                    name: 'Python',
                    publisher: 'Cognitive SE',
                    description: 'Python language support with extension access points for IntelliSense (Pylance), Debugging (Python Debugger), formatting, linting, code navigation, refactoring, variable explorer, test explorer, environment management (NEW Python Environments Extension).',
                    icon: 'python',
                    installed: false,
                }
            ],
            installExtension: async (id) => {
                const extension = get().extensions.find(ext => ext.id === id);
                if (!extension) return;

                try {
                    await invoke("install_extension", { 
                        id: extension.id, 
                        name: extension.name 
                    });
                    
                    set((state) => ({
                        extensions: state.extensions.map(ext => 
                            ext.id === id ? { ...ext, installed: true } : ext
                        )
                    }));
                } catch (error) {
                    console.error("Failed to install extension:", error);
                }
            },
            uninstallExtension: (id) => set((state) => ({
                extensions: state.extensions.map(ext => 
                    ext.id === id ? { ...ext, installed: false } : ext
                )
            })),
        }),
        {
            name: 'extension-storage',
        }
    )
);
