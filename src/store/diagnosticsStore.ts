import { create } from 'zustand';

export interface MonacoDiagnostic {
    id: string;
    type: 'error' | 'warning' | 'info' | 'hint';
    file: string;
    path: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    message: string;
    code: string | null;
    source: string;
}

export interface FileDiagnostics {
    file: string;
    path: string;
    diagnostics: MonacoDiagnostic[];
    errorCount: number;
    warningCount: number;
}

interface DiagnosticsState {
    // Monaco diagnostics by file path
    monacoDiagnostics: Record<string, MonacoDiagnostic[]>;
    // Set diagnostics for a file
    setFileDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => void;
    // Clear diagnostics for a file
    clearFileDiagnostics: (filePath: string) => void;
    // Get all diagnostics grouped by file
    getAllDiagnostics: () => FileDiagnostics[];
    // Get total counts
    getTotalCounts: () => { errors: number; warnings: number };
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
    monacoDiagnostics: {},

    setFileDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => {
        set((state) => ({
            monacoDiagnostics: {
                ...state.monacoDiagnostics,
                [filePath]: diagnostics,
            },
        }));
    },

    clearFileDiagnostics: (filePath: string) => {
        set((state) => {
            const newDiagnostics = { ...state.monacoDiagnostics };
            delete newDiagnostics[filePath];
            return { monacoDiagnostics: newDiagnostics };
        });
    },

    getAllDiagnostics: () => {
        const { monacoDiagnostics } = get();
        const result: FileDiagnostics[] = [];

        for (const [path, diagnostics] of Object.entries(monacoDiagnostics)) {
            if (diagnostics.length === 0) continue;
            
            const fileName = path.split(/[\\/]/).pop() || path;
            const errorCount = diagnostics.filter(d => d.type === 'error').length;
            const warningCount = diagnostics.filter(d => d.type === 'warning').length;

            result.push({
                file: fileName,
                path,
                diagnostics,
                errorCount,
                warningCount,
            });
        }

        return result.sort((a, b) => a.path.localeCompare(b.path));
    },

    getTotalCounts: () => {
        const { monacoDiagnostics } = get();
        let errors = 0;
        let warnings = 0;

        for (const diagnostics of Object.values(monacoDiagnostics)) {
            for (const d of diagnostics) {
                if (d.type === 'error') errors++;
                else if (d.type === 'warning') warnings++;
            }
        }

        return { errors, warnings };
    },
}));
