import { ChevronRight, ChevronDown, Plus, Undo2 } from 'lucide-react';
import { getFileIcon } from '../../../../utils/fileIcons';
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
    onDiscardChanges 
}: ChangesSectionProps) => {
    return (
        <div className={styles.changesSection}>
            <div className={styles.sectionHeader} onClick={onToggle}>
                <div className={styles.sectionTitle}>
                    {changesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Changes</span>
                    {files.length > 0 && (
                        <span className={styles.sectionCount}>{files.length}</span>
                    )}
                </div>
                {files.length > 0 && (
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
                    {files.length === 0 ? (
                        <div className={styles.emptySection}>No changes</div>
                    ) : (
                        files.map((file) => (
                            <div 
                                key={file.path} 
                                className={styles.fileItem}
                                onClick={() => onFileClick(file)}
                            >
                                <div className={styles.fileIcon}>
                                    {getFileIcon(getFileName(file.path), file.path)}
                                </div>
                                <span className={styles.fileName}>
                                    {getFileName(file.path)}
                                    {getFilePath(file.path) && (
                                        <span className={styles.filePath}>{getFilePath(file.path)}</span>
                                    )}
                                </span>
                                <span className={`${styles.fileStatus} ${getStatusClass(file.status)}`}>
                                    {getStatusLabel(file.status)}
                                </span>
                                <div className={styles.fileActions}>
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
