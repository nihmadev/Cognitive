import { invoke } from '@tauri-apps/api/core';

export type Problem = {
    id: number;
    type: 'error' | 'warning';
    file: string;
    path: string;
    line: number;
    column: number;
    message: string;
    code: string | null;
    source: string;
};

export type FileProblems = {
    file: string;
    path: string;
    problems: Problem[];
    error_count: number;
    warning_count: number;
};

export type ProblemsResult = {
    files: FileProblems[];
    total_errors: number;
    total_warnings: number;
    scan_time_ms: number;
    cache_hits: number;
    cache_misses: number;
};

export type ProblemsCacheStats = {
    cached_files: number;
};

export const getProblems = (projectPath: string) => invoke<ProblemsResult>('get_problems', { projectPath });
export const clearProblemsCache = () => invoke<void>('clear_problems_cache');
export const invalidateProblemsCache = (projectPath: string) => invoke<void>('invalidate_problems_cache', { projectPath });
export const getProblemsCacheStats = () => invoke<ProblemsCacheStats>('get_problems_cache_stats');
