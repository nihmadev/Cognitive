import { create } from 'zustand';

export type SymbolKind = 
    | 'file' | 'module' | 'namespace' | 'package' | 'class' | 'method' 
    | 'property' | 'field' | 'constructor' | 'enum' | 'interface' 
    | 'function' | 'variable' | 'constant' | 'string' | 'number' 
    | 'boolean' | 'array' | 'object' | 'key' | 'null' | 'enumMember' 
    | 'struct' | 'event' | 'operator' | 'typeParameter';

export interface OutlineSymbol {
    name: string;
    kind: SymbolKind;
    detail?: string;
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    selectionRange: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    children?: OutlineSymbol[];
}

interface OutlineState {
    symbols: OutlineSymbol[];
    isLoading: boolean;
    activeSymbol: string | null;
    expandedSymbols: Set<string>;
    // Cache symbols per file path
    symbolsCache: Map<string, OutlineSymbol[]>;
    currentFile: string | null;
    setSymbols: (symbols: OutlineSymbol[], filePath?: string) => void;
    setLoading: (loading: boolean) => void;
    setActiveSymbol: (name: string | null) => void;
    toggleExpanded: (name: string) => void;
    expandAll: () => void;
    collapseAll: () => void;
    clearSymbols: () => void;
    // Load cached symbols for a file (returns true if cache hit)
    loadFromCache: (filePath: string) => boolean;
    // Invalidate cache for a file (on content change)
    invalidateCache: (filePath: string) => void;
}

// Helper to collect all symbol names for expand all
const collectSymbolNames = (symbols: OutlineSymbol[]): string[] => {
    const names: string[] = [];
    const collect = (syms: OutlineSymbol[]) => {
        for (const sym of syms) {
            if (sym.children && sym.children.length > 0) {
                names.push(sym.name);
                collect(sym.children);
            }
        }
    };
    collect(symbols);
    return names;
};

export const useOutlineStore = create<OutlineState>((set, get) => ({
    symbols: [],
    isLoading: false,
    activeSymbol: null,
    expandedSymbols: new Set(),
    symbolsCache: new Map(),
    currentFile: null,

    setSymbols: (symbols, filePath) => {
        // Auto-expand top-level symbols
        const topLevelNames = symbols
            .filter(s => s.children && s.children.length > 0)
            .map(s => s.name);
        
        const { symbolsCache, currentFile } = get();
        const newCache = new Map(symbolsCache);
        
        // Cache the symbols for this file
        const cacheKey = filePath || currentFile;
        if (cacheKey) {
            newCache.set(cacheKey, symbols);
            // Limit cache size to 20 files
            if (newCache.size > 20) {
                const firstKey = newCache.keys().next().value;
                if (firstKey) newCache.delete(firstKey);
            }
        }
        
        set({ 
            symbols, 
            expandedSymbols: new Set(topLevelNames),
            isLoading: false,
            symbolsCache: newCache,
            currentFile: cacheKey || null,
        });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setActiveSymbol: (name) => set({ activeSymbol: name }),

    toggleExpanded: (name) => {
        const { expandedSymbols } = get();
        const next = new Set(expandedSymbols);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        set({ expandedSymbols: next });
    },

    expandAll: () => {
        const { symbols } = get();
        const allNames = collectSymbolNames(symbols);
        set({ expandedSymbols: new Set(allNames) });
    },

    collapseAll: () => {
        set({ expandedSymbols: new Set() });
    },

    clearSymbols: () => {
        set({ symbols: [], activeSymbol: null, expandedSymbols: new Set(), currentFile: null });
    },

    loadFromCache: (filePath: string) => {
        const { symbolsCache } = get();
        const cached = symbolsCache.get(filePath);
        if (cached && cached.length > 0) {
            const topLevelNames = cached
                .filter(s => s.children && s.children.length > 0)
                .map(s => s.name);
            set({
                symbols: cached,
                expandedSymbols: new Set(topLevelNames),
                isLoading: false,
                currentFile: filePath,
            });
            return true;
        }
        return false;
    },

    invalidateCache: (filePath: string) => {
        const { symbolsCache } = get();
        const newCache = new Map(symbolsCache);
        newCache.delete(filePath);
        set({ symbolsCache: newCache });
    },
}));
