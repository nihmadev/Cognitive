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
    tags?: number[];
}

export interface FileDiagnostics {
    file: string;
    path: string;
    diagnostics: MonacoDiagnostic[];
    errorCount: number;
    warningCount: number;
}

interface DiagnosticsState {
    // Monaco diagnostics (from built-in TypeScript worker)
    monacoDiagnostics: Record<string, MonacoDiagnostic[]>;
    // LSP diagnostics (from external Language Server)
    lspDiagnostics: Record<string, MonacoDiagnostic[]>;
    
    setFileDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => void;
    setLspDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => void;
    clearFileDiagnostics: (filePath: string) => void;
    clearLspDiagnostics: (filePath: string) => void;
    getAllDiagnostics: () => FileDiagnostics[];
    getTotalCounts: () => { errors: number; warnings: number };
    getErrorCount: () => number;
    getWarningCount: () => number;
    getFileDiagnosticsCounts: (filePath: string) => { errors: number; warnings: number };
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
    monacoDiagnostics: {},
    lspDiagnostics: {},

    setFileDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        set((state) => ({
            monacoDiagnostics: {
                ...state.monacoDiagnostics,
                [normalizedPath]: diagnostics,
            },
        }));
    },

    setLspDiagnostics: (filePath: string, diagnostics: MonacoDiagnostic[]) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        set((state) => ({
            lspDiagnostics: {
                ...state.lspDiagnostics,
                [normalizedPath]: diagnostics,
            },
        }));
    },

    clearFileDiagnostics: (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        set((state) => {
            const newDiagnostics = { ...state.monacoDiagnostics };
            delete newDiagnostics[normalizedPath];
            return { monacoDiagnostics: newDiagnostics };
        });
    },

    clearLspDiagnostics: (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        set((state) => {
            const newDiagnostics = { ...state.lspDiagnostics };
            delete newDiagnostics[normalizedPath];
            return { lspDiagnostics: newDiagnostics };
        });
    },

    getAllDiagnostics: () => {
        const { monacoDiagnostics, lspDiagnostics } = get();
        const result: FileDiagnostics[] = [];
        const filesMap = new Map<string, MonacoDiagnostic[]>();

        // Merge Monaco and LSP diagnostics
        for (const [path, diagnostics] of Object.entries(monacoDiagnostics)) {
            filesMap.set(path, [...diagnostics]);
        }

        for (const [path, diagnostics] of Object.entries(lspDiagnostics)) {
            const existing = filesMap.get(path) || [];
            // Avoid duplicates by checking message and line
            const filtered = diagnostics.filter(d => 
                !existing.some(e => 
                    e.message === d.message && 
                    e.line === d.line && 
                    e.column === d.column
                )
            );
            filesMap.set(path, [...existing, ...filtered]);
        }

        for (const [path, diagnostics] of filesMap.entries()) {
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
        const { monacoDiagnostics, lspDiagnostics } = get();
        let errors = 0;
        let warnings = 0;

        const countDiagnostics = (diagnostics: Record<string, MonacoDiagnostic[]>) => {
            for (const diags of Object.values(diagnostics)) {
                for (const d of diags) {
                    if (d.type === 'error') errors++;
                    else if (d.type === 'warning') warnings++;
                }
            }
        };

        countDiagnostics(monacoDiagnostics);
        countDiagnostics(lspDiagnostics);

        return { errors, warnings };
    },

    getErrorCount: () => {
        const { monacoDiagnostics, lspDiagnostics } = get();
        let errors = 0;

        const countErrors = (diagnostics: Record<string, MonacoDiagnostic[]>) => {
            for (const diags of Object.values(diagnostics)) {
                for (const d of diags) {
                    if (d.type === 'error') errors++;
                }
            }
        };

        countErrors(monacoDiagnostics);
        countErrors(lspDiagnostics);

        return errors;
    },

    getWarningCount: () => {
        const { monacoDiagnostics, lspDiagnostics } = get();
        let warnings = 0;

        const countWarnings = (diagnostics: Record<string, MonacoDiagnostic[]>) => {
            for (const diags of Object.values(diagnostics)) {
                for (const d of diags) {
                    if (d.type === 'warning') warnings++;
                }
            }
        };

        countWarnings(monacoDiagnostics);
        countWarnings(lspDiagnostics);

        return warnings;
    },

    getFileDiagnosticsCounts: (filePath: string) => {
        const { monacoDiagnostics, lspDiagnostics } = get();
        let errors = 0;
        let warnings = 0;

        const normalizedPath = filePath.replace(/\\/g, '/');

        const countDiagnostics = (diagnostics: MonacoDiagnostic[]) => {
            for (const d of diagnostics) {
                if (d.type === 'error') errors++;
                else if (d.type === 'warning') warnings++;
            }
        };

        if (monacoDiagnostics[normalizedPath]) {
            countDiagnostics(monacoDiagnostics[normalizedPath]);
        }

        if (lspDiagnostics[normalizedPath]) {
            countDiagnostics(lspDiagnostics[normalizedPath]);
        }

        return { errors, warnings };
    },
}));
