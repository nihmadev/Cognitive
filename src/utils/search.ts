
import { tauriApi } from '../lib/tauri-api';

interface SearchOptions {
    query: string;
    isCaseSensitive: boolean;
    isWholeWord: boolean;
    isRegex: boolean;
    includePattern: string;
    excludePattern: string;
    filterPattern: string;
}

export interface SearchResult {
    file: {
        name: string;
        path: string;
    };
    matches: SearchMatch[];
}

export interface SearchMatch {
    line: number;
    charStart: number;
    charEnd: number;
    lineText: string;
}

export async function searchInDirectory(
    dirPath: string,
    options: SearchOptions,
    cancelSignal?: AbortSignal
): Promise<SearchResult[]> {
    if (!options.query) return [];

    if (cancelSignal?.aborted) return [];

    try {
        const apiResults = await tauriApi.searchInFiles(dirPath, {
            query: options.query,
            is_case_sensitive: options.isCaseSensitive,
            is_whole_word: options.isWholeWord,
            is_regex: options.isRegex,
            include_pattern: options.includePattern,
            exclude_pattern: options.excludePattern,
            filter_pattern: options.filterPattern,
        });

        return apiResults.map((r) => ({
            file: r.file,
            matches: r.matches.map((m) => ({
                line: m.line,
                charStart: m.char_start,
                charEnd: m.char_end,
                lineText: m.line_text,
            })),
        }));
    } catch (e) {
        console.error('Error searching directory', dirPath, e);
        return [];
    }
}
