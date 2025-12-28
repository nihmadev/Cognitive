import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, RotateCcw, Eye, Trash2, Clock } from 'lucide-react';
import { useTimelineStore } from '../../../store/timelineStore';
import { useProjectStore } from '../../../store/projectStore';
import { TimelineEntry, tauriApi } from '../../../lib/tauri-api';
import clsx from 'clsx';
import styles from './TimelineSection.module.css';

interface TimelineItemProps {
    entry: TimelineEntry;
    onCompare: (entry: TimelineEntry) => void;
    onRestore: (entry: TimelineEntry) => void;
    onDelete: (entry: TimelineEntry) => void;
}

const TimelineItem = ({ entry, onCompare, onRestore, onDelete }: TimelineItemProps) => {
    const [isHovered, setIsHovered] = useState(false);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div 
            className={styles.timelineRow}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className={styles.chevronSlot}>
                <Clock size={12} className={styles.clockIcon} />
            </span>
            <div className={styles.timelineInfo}>
                <span className={styles.timelineDate}>{entry.date}</span>
                <span className={styles.timelineSize}>{formatSize(entry.size)}</span>
            </div>
            {isHovered && (
                <div className={styles.timelineActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); onCompare(entry); }}
                        title="Compare with current"
                    >
                        <Eye size={12} />
                    </button>
                    <button
                        className={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); onRestore(entry); }}
                        title="Restore this version"
                    >
                        <RotateCcw size={12} />
                    </button>
                    <button
                        className={clsx(styles.actionBtn, styles.deleteBtn)}
                        onClick={(e) => { e.stopPropagation(); onDelete(entry); }}
                        title="Delete snapshot"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

export const TimelineSection = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { entries, isLoading, loadHistory, restore, deleteEntry } = useTimelineStore();
    const { 
        activeFile, 
        currentWorkspace, 
        forceUpdateContent,
        openTimelineDiffTab 
    } = useProjectStore();

    const getRelativePath = (absolutePath: string | null) => {
        if (!absolutePath || !currentWorkspace) return null;
        return absolutePath.startsWith(currentWorkspace) 
            ? absolutePath.slice(currentWorkspace.length + 1) 
            : absolutePath;
    };

    const relativePath = getRelativePath(activeFile);

    useEffect(() => {
        if (currentWorkspace && relativePath) {
            loadHistory(currentWorkspace, relativePath);
        }
    }, [currentWorkspace, relativePath, loadHistory]);

    const handleCompare = async (entry: TimelineEntry) => {
        if (!currentWorkspace || !relativePath || !activeFile) return;
        try {
            // Skip comparison for binary files (including audio files)
            const extension = activeFile.split('.').pop()?.toLowerCase() || '';
            const binaryExtensions = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'weba', 'mp4', 'avi', 'mov', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'pdf', 'zip', 'rar', 'exe', 'dll'];
            
            if (binaryExtensions.includes(extension)) {
                console.warn('Cannot compare binary files:', activeFile);
                return;
            }

            const oldContent = await tauriApi.timelineGetContent(currentWorkspace, relativePath, entry.id);
            const currentContent = await tauriApi.readFile(activeFile);
            openTimelineDiffTab(relativePath, entry.id, oldContent, currentContent, entry.date);
        } catch (e) {
            console.error('Failed to compare:', e);
        }
    };

    const handleRestore = async (entry: TimelineEntry) => {
        if (!currentWorkspace || !relativePath || !activeFile) return;
        try {
            const content = await restore(currentWorkspace, relativePath, entry.id);
            forceUpdateContent(activeFile, content);
        } catch (e) {
            console.error('Failed to restore:', e);
        }
    };

    const handleDelete = async (entry: TimelineEntry) => {
        if (!currentWorkspace || !relativePath) return;
        await deleteEntry(currentWorkspace, relativePath, entry.id);
    };

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
                <div className={styles.sectionTitle}>
                    <span className={styles.chev}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span>Timeline</span>
                </div>
                {isOpen && entries.length > 0 && (
                    <span className={styles.count}>{entries.length}</span>
                )}
            </div>
            {isOpen && (
                <div className={styles.sectionBody}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading history...</div>
                    ) : !activeFile ? (
                        <div className={styles.empty}>No file open</div>
                    ) : entries.length === 0 ? (
                        <div className={styles.empty}>No local history</div>
                    ) : (
                        <div className={styles.timelineList}>
                            {entries.map((entry) => (
                                <TimelineItem
                                    key={entry.id}
                                    entry={entry}
                                    onCompare={handleCompare}
                                    onRestore={handleRestore}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
