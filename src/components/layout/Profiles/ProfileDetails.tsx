import { useState } from 'react';
import { Settings, Keyboard, Puzzle, ChevronRight, ChevronDown, Play, Braces } from 'lucide-react';
import { Profile, ContentItem, EditingFolder } from './types';
import { FoldersTable } from './FoldersTable';
import { tauriApi } from '../../../lib/tauri-api';
import { useProjectStore } from '../../../store/projectStore';
import styles from './styles/ProfileDetails.module.css';

const LAST_SETTINGS_SECTION_KEY = 'colbex-last-settings-section';

const contentItems: ContentItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings size={14} />, navigateTo: 'appearance-theme' },
    { id: 'keyboard', label: 'Keyboard Shortcuts', icon: <Keyboard size={14} />, navigateTo: 'keybindings' },
    { id: 'snippets', label: 'Snippets', icon: <Braces size={14} />, expandable: true },
    { id: 'extensions', label: 'Extensions', icon: <Puzzle size={14} />, expandable: true },
];

interface ProfileDetailsProps {
    profile: Profile;
    profiles: Profile[];
    onSetProfiles: (profiles: Profile[]) => void;
    onSetActiveProfile: (id: string) => void;
}

export const ProfileDetails = ({ 
    profile, 
    profiles, 
    onSetProfiles,
    onSetActiveProfile 
}: ProfileDetailsProps) => {
    const { openSettingsTab } = useProjectStore();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [editingFolder, setEditingFolder] = useState<EditingFolder | null>(null);

    const toggleExpanded = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleContentItemClick = (item: ContentItem) => {
        if (item.expandable) {
            toggleExpanded(item.id);
        } else if (item.navigateTo) {
            localStorage.setItem(LAST_SETTINGS_SECTION_KEY, item.navigateTo);
            openSettingsTab(item.navigateTo);
        }
    };

    const toggleUseForNewWindows = (checked: boolean) => {
        onSetProfiles(profiles.map(p => ({
            ...p,
            useForNewWindows: p.id === profile.id ? checked : (checked ? false : p.useForNewWindows)
        })));
    };

    const updateFolder = (index: number, field: 'host' | 'path', value: string) => {
        onSetProfiles(profiles.map(p => 
            p.id === profile.id 
                ? { ...p, folders: p.folders.map((f, i) => i === index ? { ...f, [field]: value } : f) }
                : p
        ));
    };

    const removeFolder = (index: number) => {
        onSetProfiles(profiles.map(p => 
            p.id === profile.id 
                ? { ...p, folders: p.folders.filter((_, i) => i !== index) }
                : p
        ));
    };

    const addFolder = async () => {
        try {
            const selectedFolder = await tauriApi.openFolderDialog();
            if (selectedFolder) {
                onSetProfiles(profiles.map(p => 
                    p.id === profile.id 
                        ? { ...p, folders: [...p.folders, { host: 'Local', path: selectedFolder }] }
                        : p
                ));
            }
        } catch (e) {
            console.error('Failed to open folder dialog:', e);
            onSetProfiles(profiles.map(p => 
                p.id === profile.id 
                    ? { ...p, folders: [...p.folders, { host: 'Local', path: '' }] }
                    : p
            ));
        }
    };

    return (
        <div className={styles.content}>
            <div className={styles.contentHeader}>
                <h1 className={styles.profileTitle}>
                    <Settings size={16} />
                    {profile.name}
                    {profile.isActive && <span className={styles.activeBadge}>Active</span>}
                </h1>
                <div className={styles.headerActions}>
                    {!profile.isActive && (
                        <button className={styles.actionBtn} onClick={() => onSetActiveProfile(profile.id)}>
                            <Play size={14} />
                            Set as Active
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.contentBody}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Use for New Windows</h2>
                    <label className={styles.checkbox}>
                        <input 
                            type="checkbox" 
                            checked={profile.useForNewWindows}
                            onChange={(e) => toggleUseForNewWindows(e.target.checked)}
                        />
                        <span className={styles.checkmark}></span>
                        <span>Use this profile as the default for new windows</span>
                    </label>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Contents</h2>
                    <p className={styles.sectionDesc}>Browse contents of this profile</p>
                    
                    <div className={styles.contentsList}>
                        <div className={styles.contentsHeader}>Contents</div>
                        {contentItems.map(item => (
                            <div 
                                key={item.id}
                                className={`${styles.contentItem} ${item.navigateTo ? styles.contentItemClickable : ''}`}
                                onClick={() => handleContentItemClick(item)}
                            >
                                {item.expandable ? (
                                    expandedItems.has(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                ) : (
                                    <span className={styles.contentItemSpacer} />
                                )}
                                {item.icon}
                                <span>{item.label}</span>
                                {item.navigateTo && <ChevronRight size={14} className={styles.contentItemArrow} />}
                            </div>
                        ))}
                    </div>
                </section>

                <FoldersTable
                    profile={profile}
                    editingFolder={editingFolder}
                    onEditFolder={setEditingFolder}
                    onUpdateFolder={updateFolder}
                    onRemoveFolder={removeFolder}
                    onAddFolder={addFolder}
                />
            </div>
        </div>
    );
};
