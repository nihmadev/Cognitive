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

    
    const relativePath = useMemo(() => {
        if (!currentWorkspace || !filePath) return '';
        if (filePath === currentWorkspace) return '';
        
        
        const normalizedWorkspace = currentWorkspace.replace(/\\/g, '/');
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        
        if (normalizedFilePath.startsWith(normalizedWorkspace + '/')) {
            return normalizedFilePath.substring(normalizedWorkspace.length + 1);
        }
        
        return normalizedFilePath;
    }, [filePath, currentWorkspace]);

    
    const gitStatus = useMemo(() => {
        if (!relativePath) {
            return { status: '', isStaged: false, hasConflicts: false };
        }

        
        const matchingFiles = files.filter(file => {
            
            if (file.path === relativePath) return true;
            
            
            if (isDirectory && file.path.startsWith(relativePath + '/')) return true;
            
            return false;
        });

        if (matchingFiles.length === 0) {
            return { status: '', isStaged: false, hasConflicts: false };
        }

        
        
        let finalStatus = '';
        let isStaged = false;
        let hasConflicts = false;

        for (const file of matchingFiles) {
            
            if (file.status.includes('conflicted') || file.status.includes('merge')) {
                hasConflicts = true;
                finalStatus = 'conflicted';
                break;
            }

            
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
