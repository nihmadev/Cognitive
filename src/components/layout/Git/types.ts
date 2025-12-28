import { GitCommit } from '../../../lib/tauri-api';

export interface TooltipPosition {
    x: number;
    y: number;
}

export interface CommitTooltipProps {
    commit: GitCommit;
    position: TooltipPosition;
    remoteName: string | null | undefined;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export interface CommitSectionProps {
    commitMessage: string;
    filesCount: number;
    onCommitMessageChange: (message: string) => void;
    onCommit: () => void;
}

export interface GraphSectionProps {
    commits: GitCommit[];
    graphOpen: boolean;
    remoteName: string | null | undefined;
    onToggle: () => void;
    onCommitHover: (commit: GitCommit, e: React.MouseEvent) => void;
    onCommitLeave: () => void;
}

export interface ChangesSectionProps {
    files: Array<{
        path: string;
        status: string;
        is_staged: boolean;
    }>;
    changesOpen: boolean;
    onToggle: () => void;
    onFileClick: (file: { path: string; is_staged: boolean }) => void;
    onStageFile: (path: string) => void;
    onStageAll: () => void;
    onDiscardChanges: (path: string) => void;
}
