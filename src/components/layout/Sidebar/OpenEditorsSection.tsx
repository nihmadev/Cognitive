import { useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import clsx from 'clsx';
import layoutStyles from './SidebarLayout.module.css';
import styles from './OpenEditorsSection.module.css';

// Open Editors Section Component
export const OpenEditorsSection = () => {
    const { openFiles, activeFile, openFile, closeFile, unsavedChanges } = useProjectStore();
    const [isOpen, setIsOpen] = useState(true);

    if (openFiles.length === 0) return null;

    return (
        <div className={`${layoutStyles.section} ${styles.stickySection}`}>
            <div
                className={layoutStyles.sectionHeader}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={layoutStyles.sectionTitle}>
                    <span className={layoutStyles.chev}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span>Open Editors</span>
                </div>
            </div>
            {isOpen && (
                <div className={styles.openEditorsList}>
                    {openFiles.map((filePath) => {
                        const fileName = filePath.split(/[\\/]/).pop() || filePath;
                        const isActive = activeFile === filePath;
                        const hasUnsaved = unsavedChanges[filePath];

                        return (
                            <div
                                key={filePath}
                                className={clsx(
                                    styles.openEditorRow,
                                    isActive && styles.openEditorRowActive
                                )}
                                onClick={() => openFile(filePath)}
                            >
                                <div className={styles.openEditorIcon}>
                                    {getFileIcon(fileName, filePath)}
                                </div>
                                <span className={styles.openEditorName} title={filePath}>
                                    {hasUnsaved && <span className={styles.unsavedDot}>●</span>}
                                    {fileName}
                                </span>
                                <button
                                    className={styles.closeBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeFile(filePath);
                                    }}
                                    title="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
