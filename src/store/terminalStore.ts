import { create } from 'zustand';
import { tauriApi } from '../lib/tauri-api';

export type TerminalType = 'bash' | 'powershell' | 'cmd' | 'zsh' | 'fish';

export interface TerminalInstance {
    id: string;
    type: TerminalType;
    name: string;
    backendTerminalId: string | null;
    pid?: number;
    processName?: string;
}

interface TerminalState {
    terminals: TerminalInstance[];
    activeTerminalId: string | null;
    addTerminal: (type?: TerminalType) => string;
    removeTerminal: (id: string) => void;
    setActiveTerminal: (id: string) => void;
    updateTerminal: (id: string, updates: Partial<TerminalInstance>) => void;
    getTerminalTypeLabel: (type: TerminalType) => string;
}

const getTerminalTypeLabel = (type: TerminalType): string => {
    const labels: Record<TerminalType, string> = {
        bash: 'Bash',
        powershell: 'PowerShell',
        cmd: 'CMD',
        zsh: 'Zsh',
        fish: 'Fish',
    };
    return labels[type] || type;
};

export const useTerminalStore = create<TerminalState>((set, get) => {
    const initialTerminal: TerminalInstance = {
        id: `terminal-${Date.now()}`,
        type: 'powershell',
        name: 'Terminal',
        backendTerminalId: null,
    };

    return {
        terminals: [initialTerminal],
        activeTerminalId: initialTerminal.id,
        getTerminalTypeLabel,

        addTerminal: (type: TerminalType = 'powershell') => {
            const id = `terminal-${Date.now()}`;
            const newTerminal: TerminalInstance = {
                id,
                type,
                name: `Terminal ${get().terminals.length + 1}`,
                backendTerminalId: null,
            };
            set((state) => ({
                terminals: [...state.terminals, newTerminal],
                activeTerminalId: id,
            }));
            return id;
        },

        removeTerminal: (id: string) => {
            const { terminals, activeTerminalId } = get();
            const terminal = terminals.find((t) => t.id === id);

            // Close backend terminal if exists
            if (terminal?.backendTerminalId) {
                tauriApi.closeTerminal(terminal.backendTerminalId).catch((err) => {
                    console.error('Failed to close backend terminal:', err);
                });
            }

            const newTerminals = terminals.filter((t) => t.id !== id);

            let newActiveId = activeTerminalId;
            if (activeTerminalId === id) {
                newActiveId = newTerminals.length > 0 ? newTerminals[0].id : null;
            }

            set({
                terminals: newTerminals,
                activeTerminalId: newActiveId,
            });
        },

        setActiveTerminal: (id: string) => {
            set({ activeTerminalId: id });
        },

        updateTerminal: (id: string, updates: Partial<TerminalInstance>) => {
            set((state) => ({
                terminals: state.terminals.map((t) =>
                    t.id === id ? { ...t, ...updates } : t
                ),
            }));
        },
    };
});
