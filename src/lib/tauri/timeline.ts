import { invoke } from '@tauri-apps/api/core';

export type TimelineEntry = {
    id: string;
    timestamp: number;
    date: string;
    size: number;
    hash: string;
};

export type FileTimeline = {
    file_path: string;
    entries: TimelineEntry[];
};

export type TimelineDiff = {
    old_content: string;
    new_content: string;
    old_id: string;
    new_id: string;
};

export const timelineSaveSnapshot = (workspace: string, filePath: string, content: string) =>
    invoke<TimelineEntry>('timeline_save_snapshot', { workspace, filePath, content });

export const timelineGetHistory = (workspace: string, filePath: string) =>
    invoke<FileTimeline>('timeline_get_history', { workspace, filePath });

export const timelineGetContent = (workspace: string, filePath: string, entryId: string) =>
    invoke<string>('timeline_get_content', { workspace, filePath, entryId });

export const timelineGetDiff = (workspace: string, filePath: string, oldId: string, newId: string) =>
    invoke<TimelineDiff>('timeline_get_diff', { workspace, filePath, oldId, newId });

export const timelineRestore = (workspace: string, filePath: string, entryId: string) =>
    invoke<string>('timeline_restore', { workspace, filePath, entryId });

export const timelineDeleteEntry = (workspace: string, filePath: string, entryId: string) =>
    invoke<void>('timeline_delete_entry', { workspace, filePath, entryId });

export const timelineClearHistory = (workspace: string, filePath: string) =>
    invoke<void>('timeline_clear_history', { workspace, filePath });
