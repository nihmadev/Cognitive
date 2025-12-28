import { useState, useRef, useEffect } from 'react';
import { Search, FileText, Code } from 'lucide-react';
import { getFileIcon } from '../../utils/fileIcons';
import styles from './NewFileModal.module.css';

interface NewFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFileType: (type: 'text' | 'notebook' | string, extension?: string) => void;
}

export const NewFileModal = ({ isOpen, onClose, onSelectFileType }: NewFileModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        if (searchQuery.trim()) {
            // User entered a file name - create file with that name
            const fileName = searchQuery.trim();
            onSelectFileType('text', fileName);
            onClose();
        } else if (filteredTypes[selectedIndex]) {
            // User selected a predefined type
            const selected = filteredTypes[selectedIndex];
            onSelectFileType(selected.type, selected.extension);
            onClose();
        }
    };

    const fileTypes = [
        { 
            name: 'Text File', 
            description: 'Built-In', 
            icon: FileText, 
            shortcut: 'Ctrl+N',
            type: 'text' as const,
            extension: ''
        },
        { 
            name: 'Jupyter Notebook', 
            description: 'Built-In', 
            icon: Code, 
            shortcut: '',
            type: 'notebook' as const,
            extension: '.ipynb'
        }
    ];

    const filteredTypes = fileTypes.filter(type => 
        type.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (filteredTypes.length > 0) {
                        setSelectedIndex(prev => (prev + 1) % filteredTypes.length);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (filteredTypes.length > 0) {
                        setSelectedIndex(prev => (prev - 1 + filteredTypes.length) % filteredTypes.length);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    handleFileSelect();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredTypes, searchQuery, onSelectFileType, onClose]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return isOpen ? (
        <div className={styles.modalOverlay}>
            <div
                ref={modalRef}
                className={styles.modalContainer}
            >
            <div className={styles.modalContent}>
                <div className={styles.searchContainer}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Select File Type or Enter File Name..."
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                </div>

                <div className={styles.fileTypesList}>
                    {searchQuery.trim() ? (
                        <div
                            className={`${styles.fileTypeItem} ${styles.fileTypeItemSelected}`}
                            onClick={handleFileSelect}
                        >
                            <div className={styles.fileTypeInfo}>
                                <div className={styles.fileTypeIcon}>
                                    {getFileIcon(searchQuery.trim())}
                                </div>
                                <div className={styles.fileTypeDetails}>
                                    <div className={styles.fileTypeName}>{searchQuery.trim()}</div>
                                </div>
                            </div>
                        </div>
                    ) : filteredTypes.length > 0 ? (
                        filteredTypes.map((type, index) => {
                            const Icon = type.icon;
                            const isSelected = index === selectedIndex;
                            
                            return (
                                <div
                                    key={type.type}
                                    className={`${styles.fileTypeItem} ${
                                        isSelected ? styles.fileTypeItemSelected : ''
                                    }`}
                                    onClick={() => {
                                        onSelectFileType(type.type, type.extension);
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    tabIndex={0}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className={styles.fileTypeInfo}>
                                        <Icon size={16} className={styles.fileTypeIcon} />
                                        <div className={styles.fileTypeDetails}>
                                            <div className={styles.fileTypeName}>{type.name}</div>
                                            <div className={styles.fileTypeDescription}>{type.description}</div>
                                        </div>
                                    </div>
                                    {type.shortcut && (
                                        <div className={styles.shortcutBadge}>
                                            {type.shortcut}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyState}>
                            No file types found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    ) : null;
};
