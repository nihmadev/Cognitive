import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import styles from './ExplorerMenu.module.css';

export type ExplorerSection = 'openEditors' | 'outline' | 'folders' | 'timeline' | 'npmScripts';

interface ExplorerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    enabledSections: Set<ExplorerSection>;
    onToggleSection: (section: ExplorerSection) => void;
}

const SECTION_LABELS: Record<ExplorerSection, string> = {
    openEditors: 'Open Editors',
    outline: 'Outline',
    folders: 'Folders',
    timeline: 'Timeline',
    npmScripts: 'NPM Scripts',
};

export const ExplorerMenu = ({ isOpen, onClose, enabledSections, onToggleSection }: ExplorerMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sections: ExplorerSection[] = ['openEditors', 'outline', 'folders', 'timeline', 'npmScripts'];

    return (
        <div ref={menuRef} className={styles.explorerMenu}>
            {sections.map((section) => (
                <button
                    key={section}
                    className={styles.explorerMenuItem}
                    onClick={() => onToggleSection(section)}
                >
                    <span className={styles.explorerMenuCheck}>
                        {enabledSections.has(section) && <Check size={14} />}
                    </span>
                    <span>{SECTION_LABELS[section]}</span>
                </button>
            ))}
        </div>
    );
};
