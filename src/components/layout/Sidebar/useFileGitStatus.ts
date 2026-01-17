import { useMemo } from 'react';
import { useGitStore } from '../../../store/gitStore';
import { useProjectStore } from '../../../store/projectStore';

export type FileGitStatus = {
    status: string;
    isStaged: boolean;
    hasConflicts: boolean;
};

export const useFileGitStatus = (filePath: string, isDirectory: boolean = false) => {
    const { files } = useGitStore();
    const { currentWorkspace } = useProjectStore();

    // Get relative path from workspace root
    const relativePath = useMemo(() => {
        if (!currentWorkspace || !filePath) return '';
        if (filePath === currentWorkspace) return '';
        
        // Normalize paths and remove workspace prefix
        const normalizedWorkspace = currentWorkspace.replace(/\\/g, '/');
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        
        if (normalizedFilePath.startsWith(normalizedWorkspace + '/')) {
            return normalizedFilePath.substring(normalizedWorkspace.length + 1);
        }
        
        return normalizedFilePath;
    }, [filePath, currentWorkspace]);

    // Find git status for this file/directory
    const gitStatus = useMemo(() => {
        if (!relativePath || isDirectory) {
            return { status: '', isStaged: false, hasConflicts: false };
        }

        // For directories, we need to check if any files inside have changes
        const matchingFiles = files.filter(file => {
            // Direct match
            if (file.path === relativePath) return true;
            
            // File is inside this directory
            if (file.path.startsWith(relativePath + '/')) return true;
            
            return false;
        });

        if (matchingFiles.length === 0) {
            return { status: '', isStaged: false, hasConflicts: false };
        }

        // Determine the most significant status
        // Priority: conflicted > deleted > modified > untracked > staged
        let finalStatus = '';
        let isStaged = false;
        let hasConflicts = false;

        for (const file of matchingFiles) {
            // Check for merge conflicts
            if (file.status.includes('conflicted') || file.status.includes('merge')) {
                hasConflicts = true;
                finalStatus = 'conflicted';
                break;
            }

            // Determine status priority
            switch (file.status) {
                case 'deleted':
                case 'staged_deleted':
                    if (finalStatus !== 'conflicted') {
                        finalStatus = 'deleted';
                        isStaged = file.status.startsWith('staged_');
                    }
                    break;
                case 'modified':
                case 'staged_modified':
                    if (finalStatus !== 'conflicted' && finalStatus !== 'deleted') {
                        finalStatus = 'modified';
                        isStaged = file.status.startsWith('staged_');
                    }
                    break;
                case 'untracked':
                    if (finalStatus !== 'conflicted' && finalStatus !== 'deleted' && finalStatus !== 'modified') {
                        finalStatus = 'untracked';
                        isStaged = false;
                    }
                    break;
                case 'staged_new':
                    if (finalStatus === '') {
                        finalStatus = 'staged';
                        isStaged = true;
                    }
                    break;
            }
        }

        return { status: finalStatus, isStaged, hasConflicts };
    }, [files, relativePath, isDirectory]);

    return gitStatus;
};
