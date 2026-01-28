import { ChevronRight, ChevronDown, Plus, Undo2, FileText } from 'lucide-react';
import { getFileIcon, getFolderIcon } from '../../../../utils/fileIcons';
import { ChangesSectionProps } from '../types';
import { getStatusLabel, getFileName, getFilePath } from '../utils';
import styles from './ChangesSection.module.css';

const getStatusClass = (status: string): string => {
    if (status.includes('modified')) return styles.statusM;
    if (status.includes('new') || status === 'untracked') return styles.statusU;
    if (status.includes('deleted')) return styles.statusD;
    return '';
};

export const ChangesSection = ({
    files,
    changesOpen,
    onToggle,
    onFileClick,
    onStageFile,
    onStageAll,
    onDiscardChanges,
    onOpenFile
}: ChangesSectionProps) => {
    // Filter out ignored files and directories from changes
    const nonIgnoredFiles = files.filter(file =>
        !(file as any).is_ignored && !(file as any).is_dir
    );

    return (
        <div className={`${styles.changesSection} ${changesOpen ? styles.open : ''}`}>
            <div className={styles.sectionHeader} onClick={onToggle}>
                <div className={styles.sectionTitle}>
                    {changesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Changes</span>
                    {nonIgnoredFiles.length > 0 && (
                        <span className={styles.sectionCount}>{nonIgnoredFiles.length}</span>
                    )}
                </div>
                {nonIgnoredFiles.length > 0 && (
                    <div className={styles.sectionActions}>
                        <button
                            className={styles.sectionBtn}
                            onClick={(e) => { e.stopPropagation(); onStageAll(); }}
                            title="Stage All"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                )}
            </div>

            {changesOpen && (
                <div className={styles.filesList}>
                    {nonIgnoredFiles.length === 0 ? (
                        <div className={styles.emptySection}>No changes</div>
                    ) : (
                        nonIgnoredFiles.map((file) => (
                            <div
                                key={file.path}
                                className={styles.fileItem}
                                onClick={() => onFileClick(file)}
                            >
                                <div className={styles.fileIcon}>
                                    {file.is_dir
                                        ? getFolderIcon(getFileName(file.path), false, file.path)
                                        : getFileIcon(getFileName(file.path), file.path)}
                                </div>
                                <span className={`${styles.fileName} ${file.status.includes('deleted') ? styles.deleted : ''}`}>
                                    {getFileName(file.path)}
                                    {getFilePath(file.path) && !file.status.includes('deleted') && (
                                        <span className={styles.filePath}>{getFilePath(file.path)}</span>
                                    )}
                                </span>
                                <span className={`${styles.fileStatus} ${getStatusClass(file.status)}`}>
                                    {getStatusLabel(file.status)}
                                </span>
                                <div className={styles.fileActions}>
                                    <button
                                        className={styles.fileActionBtn}
                                        onClick={(e) => { e.stopPropagation(); onOpenFile?.(file.path); }}
                                        title="Open File"
                                    >
                                        <FileText size={12} />
                                    </button>
                                    <button
                                        className={styles.fileActionBtn}
                                        onClick={(e) => { e.stopPropagation(); onDiscardChanges(file.path); }}
                                        title="Discard Changes"
                                    >
                                        <Undo2 size={12} />
                                    </button>
                                    <button
                                        className={styles.fileActionBtn}
                                        onClick={(e) => { e.stopPropagation(); onStageFile(file.path); }}
                                        title="Stage"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
