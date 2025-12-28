import { Check, Trash2, Copy, Download } from 'lucide-react';
import { Profile } from './types';
import styles from './styles/ProfileMenu.module.css';

interface ProfileMenuProps {
    profile: Profile;
    onSetActive: () => void;
    onRename: () => void;
    onDuplicate: () => void;
    onExport: () => void;
    onDelete: () => void;
    onClose: () => void;
}

export const ProfileMenu = ({ 
    profile, 
    onSetActive, 
    onRename,
    onDuplicate,
    onExport,
    onDelete,
    onClose 
}: ProfileMenuProps) => {
    const handleClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
        onClose();
    };

    return (
        <div className={styles.profileMenu} data-profile-menu>
            {!profile.isActive && (
                <button 
                    className={styles.profileMenuItem}
                    onClick={(e) => handleClick(e, onSetActive)}
                >
                    <Check size={14} />
                    Set as Active
                </button>
            )}
            <button 
                className={styles.profileMenuItem}
                onClick={(e) => handleClick(e, onRename)}
            >
                Rename
            </button>
            <button 
                className={styles.profileMenuItem}
                onClick={(e) => handleClick(e, onDuplicate)}
            >
                <Copy size={14} />
                Duplicate
            </button>
            <button 
                className={styles.profileMenuItem}
                onClick={(e) => handleClick(e, onExport)}
            >
                <Download size={14} />
                Export
            </button>
            {!profile.isDefault && (
                <button 
                    className={`${styles.profileMenuItem} ${styles.deleteItem}`}
                    onClick={(e) => handleClick(e, onDelete)}
                >
                    <Trash2 size={14} />
                    Delete
                </button>
            )}
        </div>
    );
};
