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
    onCommitPush?: () => void;
    onCommitSync?: () => void;
    onCommitAmend?: () => void;
}

export interface GraphSectionProps {
    commits: GitCommit[];
    graphOpen: boolean;
    remoteName: string | null | undefined;
    workspacePath?: string;
    onToggle: () => void;
    onCommitHover: (commit: GitCommit, e: React.MouseEvent) => void;
    onCommitLeave: () => void;
    onPull?: () => void | Promise<void>;
    onPush?: () => void | Promise<any>;
    onFetch?: () => void | Promise<void>;
    onRefresh?: () => void | Promise<void>;
}

export interface ChangesSectionProps {
    files: Array<{
        path: string;
        status: string;
        is_staged: boolean;
        is_dir: boolean;
    }>;
    changesOpen: boolean;
    onToggle: () => void;
    onFileClick: (file: { path: string; is_staged: boolean }) => void;
    onStageFile: (path: string) => void;
    onStageAll: () => void;
    onDiscardChanges: (path: string) => void;
    onOpenFile?: (path: string) => void;
}
