
import { create } from 'zustand';
import { SearchResult, searchInDirectory } from '../utils/search';
import { tauriApi } from '../lib/tauri-api';

interface SearchState {
    query: string;
    replaceQuery: string;
    includePattern: string;
    excludePattern: string;
    filterPattern: string;
    isCaseSensitive: boolean;
    isWholeWord: boolean;
    isRegex: boolean;
    preserveCase: boolean;

    isSearching: boolean;
    results: SearchResult[];
    searchVersion: number; // Track search version for cancellation

    setQuery: (q: string) => void;
    setReplaceQuery: (q: string) => void;
    setIncludePattern: (p: string) => void;
    setExcludePattern: (p: string) => void;
    setFilterPattern: (p: string) => void;

    toggleCaseSensitive: () => void;
    toggleWholeWord: () => void;
    toggleRegex: () => void;
    togglePreserveCase: () => void;

    performSearch: (rootPath: string) => Promise<void>;
    replaceAll: (rootPath: string) => Promise<void>;
    clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
    query: '',
    replaceQuery: '',
    includePattern: '',
    excludePattern: '',
    filterPattern: '',
    isCaseSensitive: false,
    isWholeWord: false,
    isRegex: false,
    preserveCase: false,

    isSearching: false,
    results: [],
    searchVersion: 0,

    setQuery: (q) => set({ query: q }),
    setReplaceQuery: (q) => set({ replaceQuery: q }),
    setIncludePattern: (p) => set({ includePattern: p }),
    setExcludePattern: (p) => set({ excludePattern: p }),
    setFilterPattern: (p) => set({ filterPattern: p }),

    toggleCaseSensitive: () => set((state) => ({ isCaseSensitive: !state.isCaseSensitive })),
    toggleWholeWord: () => set((state) => ({ isWholeWord: !state.isWholeWord })),
    toggleRegex: () => set((state) => ({ isRegex: !state.isRegex })),
    togglePreserveCase: () => set((state) => ({ preserveCase: !state.preserveCase })),

    performSearch: async (rootPath: string) => {
        const { query, isCaseSensitive, isWholeWord, isRegex, includePattern, excludePattern, filterPattern } = get();

        if (!query.trim()) return;

        // Increment version to invalidate any in-flight searches
        const currentVersion = get().searchVersion + 1;
        set({ isSearching: true, results: [], searchVersion: currentVersion });

        try {
            const results = await searchInDirectory(rootPath, {
                query,
                isCaseSensitive,
                isWholeWord,
                isRegex,
                includePattern,
                excludePattern,
                filterPattern
            });
            
            // Only update if this is still the latest search
            if (get().searchVersion === currentVersion) {
                set({ results });
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            // Only clear isSearching if this is still the latest search
            if (get().searchVersion === currentVersion) {
                set({ isSearching: false });
            }
        }
    },

    replaceAll: async (rootPath: string) => {
        const { query, replaceQuery, isCaseSensitive, isWholeWord, isRegex, includePattern, excludePattern, filterPattern, preserveCase, isSearching } = get();
        if (!query.trim()) return;
        if (isSearching) return;

        set({ isSearching: true });

        try {
            await tauriApi.replaceAll(
                rootPath,
                {
                    query,
                    is_case_sensitive: isCaseSensitive,
                    is_whole_word: isWholeWord,
                    is_regex: isRegex,
                    include_pattern: includePattern,
                    exclude_pattern: excludePattern,
                    filter_pattern: filterPattern,
                },
                replaceQuery,
                preserveCase
            );

            const results = await searchInDirectory(rootPath, {
                query,
                isCaseSensitive,
                isWholeWord,
                isRegex,
                includePattern,
                excludePattern,
                filterPattern,
            });
            set({ results });
        } catch (e) {
            console.error('Replace all failed', e);
        } finally {
            set({ isSearching: false });
        }
    },

    clearResults: () => set({ results: [] }),
}));
