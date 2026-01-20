
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
    searchVersion: number; 
    searchEditorOpen: boolean;

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
    replaceInFile: (rootPath: string, filePath: string) => Promise<void>;
    clearResults: () => void;
    clearIncludePattern: () => void;
    clearExcludePattern: () => void;
    openSearchEditor: () => void;
    closeSearchEditor: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set, get) => ({
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
    searchEditorOpen: false,

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
            
            
            if (get().searchVersion === currentVersion) {
                set({ results });
            }
        } catch (e) {
        } finally {
            
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
        } finally {
            set({ isSearching: false });
        }
    },

    replaceInFile: async (rootPath: string, filePath: string) => {
        const { query, replaceQuery, isCaseSensitive, isWholeWord, isRegex } = get();
        if (!query.trim()) return;

        try {
            const content = await tauriApi.readFile(filePath);
            let newContent = content;
            
            if (isRegex) {
                const flags = isCaseSensitive ? 'g' : 'gi';
                const regex = new RegExp(query, flags);
                newContent = content.replace(regex, replaceQuery);
            } else {
                const searchStr = query;
                const replaceStr = replaceQuery;
                
                if (isWholeWord) {
                    const flags = isCaseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(`\\b${searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
                    newContent = content.replace(regex, replaceStr);
                } else {
                    if (isCaseSensitive) {
                        newContent = content.split(searchStr).join(replaceStr);
                    } else {
                        const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        newContent = content.replace(regex, replaceStr);
                    }
                }
            }
            
            await tauriApi.writeFile(filePath, newContent);
            
            // Refresh search results
            await get().performSearch(rootPath);
        } catch (e) {
            console.error('Replace in file error:', e);
        }
    },

    clearResults: () => set({ results: [] }),
    clearIncludePattern: () => set({ includePattern: '' }),
    clearExcludePattern: () => set({ excludePattern: '' }),
    
    openSearchEditor: () => {
        // Используем projectStore для открытия таба
        const projectStore = (window as any).__projectStore;
        if (projectStore) {
            projectStore.getState().openSearchTab();
        }
    },
    closeSearchEditor: () => set({ searchEditorOpen: false }),
        }),
        {
            name: 'search-storage',
            partialize: (state) => ({
                // Сохраняем параметры поиска
                query: state.query,
                replaceQuery: state.replaceQuery,
                includePattern: state.includePattern,
                excludePattern: state.excludePattern,
                filterPattern: state.filterPattern,
                
                // Сохраняем настройки поиска
                isCaseSensitive: state.isCaseSensitive,
                isWholeWord: state.isWholeWord,
                isRegex: state.isRegex,
                preserveCase: state.preserveCase,
            }),
        }
    )
);
