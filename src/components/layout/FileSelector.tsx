import { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { X, File } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import styles from './FileSelector.module.css';

export const FileSelector = () => {
    const { openFiles, activeFile } = useProjectStore();
    const { splitViewSecondFile, setSplitViewSecondFile } = useUIStore();
    const [isOpen, setIsOpen] = useState(false);

    const fileName = (path: string) => path.split(/[\\/]/).pop() || path;

    const candidates = openFiles.filter((file) => file !== splitViewSecondFile);

    const handleFileSelect = (filePath: string) => {
        setSplitViewSecondFile(filePath);
        setIsOpen(false);
    };

    const handleClear = () => {
        setSplitViewSecondFile(null);
        setIsOpen(false);
    };

    return (
        <div className={styles.fileSelector}>
            <button
                className={styles.selectButton}
                onClick={() => setIsOpen(!isOpen)}
                title={splitViewSecondFile || 'Select right file'}
            >
                {splitViewSecondFile ? (
                    <span className={styles.fileIcon}>
                        {getFileIcon(fileName(splitViewSecondFile), splitViewSecondFile)}
                    </span>
                ) : (
                    <File size={16} />
                )}
                <span className={styles.fileName}>
                    {splitViewSecondFile ? fileName(splitViewSecondFile) : 'Select file'}
                </span>
            </button>

            {splitViewSecondFile && (
                <button
                    className={styles.clearButton}
                    onClick={handleClear}
                    title="Clear right file"
                >
                    <X size={14} />
                </button>
            )}

            {isOpen && (
                <div className={styles.dropdown}>
                    {candidates
                        .filter((file) => file !== activeFile)
                        .map((file) => (
                            <button
                                key={file}
                                className={styles.fileOption}
                                onClick={() => handleFileSelect(file)}
                                title={file}
                            >
                                <span className={styles.fileIcon}>
                                    {getFileIcon(fileName(file), file)}
                                </span>
                                <span className={styles.fileName}>
                                    {fileName(file)}
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
};
