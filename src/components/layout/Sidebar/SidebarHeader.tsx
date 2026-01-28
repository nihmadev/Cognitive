import { useRef } from 'react';
import { FilePlus2, FolderPlus, RotateCw, ChevronsDownUp, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { ExplorerMenu, type ExplorerSection } from './ExplorerMenu';
import styles from './SidebarLayout.module.css';

interface SidebarHeaderProps {
    currentWorkspace: string | null;
    onNewFile: () => void;
    onNewFolder: () => void;
    onRefresh: () => void;
    onCollapseAll: () => void;
    isMenuOpen: boolean;
    onToggleMenu: (isOpen: boolean) => void;
    enabledSections: Set<ExplorerSection>;
    onToggleSection: (section: ExplorerSection) => void;
}

export const SidebarHeader = ({
    currentWorkspace,
    onNewFile,
    onNewFolder,
    onRefresh,
    onCollapseAll,
    isMenuOpen,
    onToggleMenu,
    enabledSections,
    onToggleSection
}: SidebarHeaderProps) => {
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className={styles.header}>
            <span>Explorer</span>
            {currentWorkspace && (
                <div className={styles.headerActions}>
                    <button
                        className={styles.headerActionBtn}
                        title="New File"
                        onClick={onNewFile}
                    >
                        <FilePlus2 size={16} />
                    </button>
                    <button
                        className={styles.headerActionBtn}
                        title="New Folder"
                        onClick={onNewFolder}
                    >
                        <FolderPlus size={16} />
                    </button>
                    <button
                        className={styles.headerActionBtn}
                        title="Refresh Explorer"
                        onClick={onRefresh}
                    >
                        <RotateCw size={16} />
                    </button>
                    <button
                        className={styles.headerActionBtn}
                        title="Collapse Folders"
                        onClick={onCollapseAll}
                    >
                        <ChevronsDownUp size={16} />
                    </button>
                    <div className={styles.menuWrapper}>
                        <button
                            ref={menuButtonRef}
                            className={clsx(styles.headerActionBtn, isMenuOpen && styles.headerActionBtnActive)}
                            title="Views and More Actions..."
                            onClick={() => onToggleMenu(!isMenuOpen)}
                        >
                            <MoreHorizontal size={16} />
                        </button>
                        <ExplorerMenu
                            isOpen={isMenuOpen}
                            onClose={() => onToggleMenu(false)}
                            enabledSections={enabledSections}
                            onToggleSection={onToggleSection}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
