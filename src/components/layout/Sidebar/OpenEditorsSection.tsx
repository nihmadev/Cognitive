import { useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import { useFileDiagnosticStatus } from './useFileDiagnosticStatus';
import clsx from 'clsx';
import layoutStyles from './SidebarLayout.module.css';
import styles from './OpenEditorsSection.module.css';

const OpenEditorRow = ({ 
    filePath, 
    isActive, 
    hasUnsaved, 
    isDeleted, 
    onOpen, 
    onClose 
}: { 
    filePath: string; 
    isActive: boolean; 
    hasUnsaved: boolean; 
    isDeleted: boolean; 
    onOpen: (path: string) => void; 
    onClose: (path: string) => void; 
}) => {
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    const { hasError, hasWarning } = useFileDiagnosticStatus(filePath, false);

    return (
        <div
            className={clsx(
                styles.openEditorRow,
                isActive && styles.openEditorRowActive,
                isDeleted && styles.openEditorRowDeleted
            )}
            onClick={() => onOpen(filePath)}
            title={isDeleted ? 'File deleted from disk' : filePath}
        >
            <div className={styles.openEditorIcon}>
                {getFileIcon(fileName, filePath)}
            </div>
            <span className={clsx(
                styles.openEditorName,
                isDeleted && styles.openEditorNameDeleted,
                hasError && styles.openEditorNameError,
                !hasError && hasWarning && styles.openEditorNameWarning
            )}>
                {hasUnsaved && <span className={styles.unsavedDot}>●</span>}
                {fileName}
                {isDeleted && <span className={styles.deletedBadge}>D</span>}
            </span>
            <button
                className={styles.closeBtn}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(filePath);
                }}
                title="Close"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const OpenEditorsSection = () => {
    const { openFiles, activeFile, openFile, closeFile, unsavedChanges, deletedFiles } = useProjectStore();
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
                    {openFiles.map((filePath) => (
                        <OpenEditorRow
                            key={filePath}
                            filePath={filePath}
                            isActive={activeFile === filePath}
                            hasUnsaved={unsavedChanges[filePath]}
                            isDeleted={deletedFiles[filePath]}
                            onOpen={openFile}
                            onClose={closeFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
