import { useMemo } from 'react';
import { useGitStore } from '../../../store/gitStore';
import { useProjectStore } from '../../../store/projectStore';
import { FileGitStatus } from './useFileGitStatus';

export const useFolderGitStatus = (folderPath: string, isDirectory: boolean): FileGitStatus => {
    const { files } = useGitStore();
    const { currentWorkspace } = useProjectStore();

    const status = useMemo((): FileGitStatus => {
        if (!isDirectory || !currentWorkspace || !folderPath) {
            return { status: '', isStaged: false, hasConflicts: false, isIgnored: false };
        }

        const normalizedWorkspace = currentWorkspace.replace(/\\/g, '/');
        const normalizedFolderPath = folderPath.replace(/\\/g, '/');

        let relativePath = '';
        if (normalizedFolderPath === normalizedWorkspace) {
            relativePath = '';
        } else if (normalizedFolderPath.startsWith(normalizedWorkspace + '/')) {
            relativePath = normalizedFolderPath.substring(normalizedWorkspace.length + 1);
        } else {
            relativePath = normalizedFolderPath;
        }

        // Находим файлы с изменениями в этой папке
        const changedFiles = files.filter(file => {
            if (relativePath === '') {
                // Корневая папка - все файлы
                return true;
            }
            // Файлы внутри папки
            return file.path.startsWith(relativePath + '/');
        });

        if (changedFiles.length === 0) {
            return { status: '', isStaged: false, hasConflicts: false, isIgnored: false };
        }

        // Check if folder contains ignored files
        const isIgnored = changedFiles.some(f => f.is_ignored);

        // Приоритет статусов: conflicted > modified > staged > untracked > ignored
        const hasConflicted = changedFiles.some(f => f.status === 'conflicted');
        if (hasConflicted) {
            return { status: 'conflicted', isStaged: false, hasConflicts: true, isIgnored };
        }

        const hasModified = changedFiles.some(f => f.status === 'modified');
        if (hasModified) {
            return { status: 'modified', isStaged: false, hasConflicts: false, isIgnored };
        }

        const hasStaged = changedFiles.some(f => f.status === 'staged');
        if (hasStaged) {
            return { status: 'staged', isStaged: true, hasConflicts: false, isIgnored };
        }

        const hasUntracked = changedFiles.some(f => f.status === 'untracked');
        if (hasUntracked) {
            return { status: 'untracked', isStaged: false, hasConflicts: false, isIgnored };
        }

        const hasIgnored = changedFiles.some(f => f.status === 'ignored');
        if (hasIgnored) {
            return { status: 'ignored', isStaged: false, hasConflicts: false, isIgnored: true };
        }

        return { status: '', isStaged: false, hasConflicts: false, isIgnored };
    }, [files, folderPath, currentWorkspace, isDirectory]);

    return status;
};
