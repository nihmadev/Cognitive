import { invoke } from '@tauri-apps/api/core';

export type SearchOptions = {
    query: string;
    is_case_sensitive: boolean;
    is_whole_word: boolean;
    is_regex: boolean;
    include_pattern: string;
    exclude_pattern: string;
    filter_pattern: string;
};

export type SearchMatch = {
    line: number;
    char_start: number;
    char_end: number;
    line_text: string;
};

export type SearchResult = {
    file: { name: string; path: string };
    matches: SearchMatch[];
};

export type ReplaceAllResult = {
    total_replacements: number;
    files_changed: number;
};

export const searchInFiles = (root_path: string, options: SearchOptions) =>
    invoke<SearchResult[]>('search_in_files', { rootPath: root_path, options });

export const replaceAll = (root_path: string, options: SearchOptions, replace_query: string, preserve_case_flag: boolean) =>
    invoke<ReplaceAllResult>('replace_all', { rootPath: root_path, options, replace_query, preserve_case_flag });

export const getAllFiles = (root_path: string) => 
    invoke<any[]>('get_all_files', { rootPath: root_path });
