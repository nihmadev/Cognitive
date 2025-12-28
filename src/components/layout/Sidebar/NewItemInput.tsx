import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { tauriApi } from '../../../lib/tauri-api';
import { getFileIcon, getFolderIcon } from '../../../utils/fileIcons';
import styles from './NewItemInput.module.css';
import sharedStyles from './FileItem.module.css';

interface NewItemInputProps {
    parentPath: string;
    type: 'file' | 'folder';
    depth: number;
    onComplete: (name: string | null) => void;
    insertIndex?: number;
}

export const NewItemInput = ({ parentPath, type, depth, onComplete }: NewItemInputProps) => {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async () => {
        if (!value.trim()) {
            onComplete(null);
            return;
        }

        const newPath = `${parentPath}/${value.trim()}`;
        
        try {
            if (type === 'file') {
                await tauriApi.createFile(newPath);
            } else {
                await tauriApi.createFolder(newPath);
            }
            onComplete(value.trim());
        } catch (e: any) {
            setError(e.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onComplete(null);
        }
    };

    return (
        <div className={styles.newItemRow} style={{ ['--depth' as any]: depth }}>
            <span className={sharedStyles.chevronSlot}>
                <div className={sharedStyles.placeholderChevron} />
            </span>
            <div className={sharedStyles.iconSlot}>
                {type === 'file' ? getFileIcon(value || 'untitled', '') : getFolderIcon(value || 'folder', false, '')}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                onBlur={handleSubmit}
                className={clsx(styles.newItemInput, error && styles.newItemInputError)}
                placeholder={type === 'file' ? 'filename' : 'folder name'}
            />
            {error && <div className={styles.newItemError}>{error}</div>}
        </div>
    );
};
