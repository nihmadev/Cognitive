import { Trash2, FolderOpen } from 'lucide-react';
import { Profile, EditingFolder } from './types';
import styles from './styles/FoldersTable.module.css';
import detailsStyles from './styles/ProfileDetails.module.css';

interface FoldersTableProps {
    profile: Profile;
    editingFolder: EditingFolder | null;
    onEditFolder: (editing: EditingFolder | null) => void;
    onUpdateFolder: (index: number, field: 'host' | 'path', value: string) => void;
    onRemoveFolder: (index: number) => void;
    onAddFolder: () => void;
}

export const FoldersTable = ({
    profile,
    editingFolder,
    onEditFolder,
    onUpdateFolder,
    onRemoveFolder,
    onAddFolder
}: FoldersTableProps) => {
    const isEditing = (index: number, field: 'host' | 'path') =>
        editingFolder?.profileId === profile.id &&
        editingFolder?.index === index &&
        editingFolder?.field === field;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            onEditFolder(null);
        }
    };

    return (
        <section className={detailsStyles.section}>
            <h2 className={detailsStyles.sectionTitle}>Folders & Workspaces</h2>
            <p className={detailsStyles.sectionDesc}>Following folders and workspaces are using this profile</p>
            
            <div className={styles.foldersTable}>
                <div className={styles.tableHeader}>
                    <span className={styles.tableHeaderCell}>Host</span>
                    <span className={styles.tableHeaderCell}>Path</span>
                    <span className={styles.tableHeaderCellActions}></span>
                </div>
                {profile.folders.length === 0 ? (
                    <div className={styles.emptyFolders}>No folders added yet</div>
                ) : (
                    profile.folders.map((folder, idx) => (
                        <div key={idx} className={styles.tableRow}>
                            {isEditing(idx, 'host') ? (
                                <input
                                    type="text"
                                    className={styles.tableCellInput}
                                    value={folder.host}
                                    onChange={(e) => onUpdateFolder(idx, 'host', e.target.value)}
                                    onBlur={() => onEditFolder(null)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                            ) : (
                                <span 
                                    className={`${styles.tableCell} ${folder.host === 'Local' ? styles.localHost : ''}`}
                                    onDoubleClick={() => onEditFolder({ profileId: profile.id, index: idx, field: 'host' })}
                                    title="Double-click to edit"
                                >
                                    {folder.host || 'Local'}
                                </span>
                            )}
                            {isEditing(idx, 'path') ? (
                                <input
                                    type="text"
                                    className={`${styles.tableCellInput} ${styles.pathInput}`}
                                    value={folder.path}
                                    onChange={(e) => onUpdateFolder(idx, 'path', e.target.value)}
                                    onBlur={() => onEditFolder(null)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                            ) : (
                                <span 
                                    className={`${styles.tableCell} ${styles.pathCell}`}
                                    onDoubleClick={() => onEditFolder({ profileId: profile.id, index: idx, field: 'path' })}
                                    title="Double-click to edit"
                                >
                                    {folder.path || <span className={styles.placeholder}>Click to set path...</span>}
                                </span>
                            )}
                            <span className={styles.tableCellActions}>
                                <button 
                                    className={styles.removeBtn}
                                    onClick={() => onRemoveFolder(idx)}
                                    title="Remove folder"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </span>
                        </div>
                    ))
                )}
            </div>
            
            <button className={styles.addFolderBtn} onClick={onAddFolder}>
                <FolderOpen size={14} />
                Add Folder
            </button>
        </section>
    );
};
