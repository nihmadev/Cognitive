import { tauriApi } from '../../../lib/tauri-api';

export const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'modified':
        case 'staged_modified':
            return 'M';
        case 'untracked':
        case 'staged_new':
            return 'U';
        case 'deleted':
        case 'staged_deleted':
            return 'D';
        default:
            return '?';
    }
};

export const getFileName = (path: string): string => path.split('/').pop() || path;

export const getFilePath = (path: string): string => {
    const parts = path.split('/');
    if (parts.length > 1) {
        return parts.slice(0, -1).join('/');
    }
    return '';
};

export const getRelativeTime = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
    return `${Math.floor(diff / 2592000)} months ago`;
};

export const getGitHubUrl = (remoteUrl: string | null | undefined): string | null => {
    if (!remoteUrl) return null;
    
    if (remoteUrl.startsWith('git@github.com:')) {
        const path = remoteUrl.replace('git@github.com:', '').replace(/\.git$/, '');
        return `https://github.com/${path}`;
    }
    
    if (remoteUrl.includes('github.com')) {
        return remoteUrl.replace(/\.git$/, '');
    }
    
    return null;
};

export const openOnGitHub = (commitHash: string, remoteName: string | null | undefined): void => {
    const githubUrl = getGitHubUrl(remoteName);
    if (githubUrl) {
        tauriApi.openUrl(`${githubUrl}/commit/${commitHash}`);
    }
};
