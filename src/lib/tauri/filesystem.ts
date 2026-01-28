import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export type RenameResult = {
    old_path: string;
    new_path: string;
    was_file: boolean;
};

export const readDir = (path: string) => invoke<any[]>('read_dir', { path });
export const readFile = (path: string) => invoke<string>('read_file', { path });
export const readFileBinary = (path: string) => invoke<number[]>('read_file_binary', { path });
export const readFileBinaryChunked = (path: string, offset?: number, chunk_size?: number) =>
    invoke<number[]>('read_file_binary_chunked', { path, offset, chunk_size });
export const getFileSize = (path: string) => invoke<number>('get_file_size', { path });
export const writeFile = (path: string, content: string) => invoke<void>('write_file', { path, content });
export const createFile = (path: string) => invoke<void>('create_file', { path });
export const createFolder = (path: string) => invoke<void>('create_folder', { path });
export const renamePath = (oldPath: string, newPath: string) => invoke<void>('rename_path', { oldPath, newPath });
export const renameFileWithResult = (oldPath: string, newPath: string) => invoke<RenameResult>('rename_file_with_result', { oldPath, newPath });
export const deletePath = (path: string) => invoke<void>('delete_path', { path });
export const fileExists = (path: string) => invoke<boolean>('file_exists', { path });
export const getAssetUrl = (path: string) => convertFileSrc(path);
export const openFileDialog = () => invoke<string | null>('open_file_dialog');
export const openFolderDialog = () => invoke<string | null>('open_folder_dialog');
export const saveFileDialog = () => invoke<string | null>('save_file_dialog');
export const getAllFiles = (root_path: string) => invoke<any[]>('get_all_files', { rootPath: root_path });
export const startFileWatcher = (path: string) => invoke<void>('start_file_watcher', { path });
export const stopFileWatcher = (path: string) => invoke<void>('stop_file_watcher', { path });
export const addWatchPath = (path: string) => invoke<void>('add_watch_path', { path });
export const isPathIgnored = (workspacePath: string, filePath: string) => invoke<boolean>('is_path_ignored', { workspacePath, filePath });

// Helper functions for undo/redo functionality
export const getFileContentsBeforeDeletion = async (path: string, isDirectory: boolean) => {
    if (isDirectory) {
        // For directories, we need to get all contents recursively
        const getAllContents = async (dirPath: string): Promise<any[]> => {
            try {
                const entries = await readDir(dirPath);
                const result: any[] = [];
                
                for (const entry of entries) {
                    if (entry.is_dir) {
                        const children = await getAllContents(entry.path);
                        result.push({
                            path: entry.path,
                            name: entry.name,
                            is_dir: true,
                            children
                        });
                    } else {
                        try {
                            const content = await readFile(entry.path);
                            result.push({
                                path: entry.path,
                                name: entry.name,
                                is_dir: false,
                                content
                            });
                        } catch (error) {
                            // If we can't read file content, still include it without content
                            result.push({
                                path: entry.path,
                                name: entry.name,
                                is_dir: false
                            });
                        }
                    }
                }
                
                return result;
            } catch (error) {
                return [];
            }
        };
        
        return getAllContents(path);
    } else {
        // For files, just read the content
        try {
            const content = await readFile(path);
            return content;
        } catch (error) {
            return '';
        }
    }
};
