import { Settings, Plus, ChevronDown, Check, MoreHorizontal, Copy } from 'lucide-react';

const WindowPlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 5V11M5 8H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);
import { Profile } from './types';
import { ProfileMenu } from './ProfileMenu';
import { tauriApi } from '../../../lib/tauri-api';
import styles from './styles/ProfileList.module.css';
import baseStyles from './styles/base.module.css';

interface ProfileListProps {
    profiles: Profile[];
    selectedProfile: string;
    editingName: string | null;
    showProfileMenu: string | null;
    showNewProfileDropdown: boolean;
    onSelectProfile: (id: string) => void;
    onSetShowNewProfileDropdown: (show: boolean) => void;
    onCreateNewProfile: (type: 'empty' | 'copy') => void;
    onUpdateProfileName: (id: string, name: string) => void;
    onSetEditingName: (id: string | null) => void;
    onSetShowProfileMenu: (id: string | null) => void;
    onSetActiveProfile: (id: string) => void;
    onDuplicateProfile: (id: string) => void;
    onDeleteProfile: (id: string) => void;
}

export const ProfileList = ({
    profiles,
    selectedProfile,
    editingName,
    showProfileMenu,
    showNewProfileDropdown,
    onSelectProfile,
    onSetShowNewProfileDropdown,
    onCreateNewProfile,
    onUpdateProfileName,
    onSetEditingName,
    onSetShowProfileMenu,
    onSetActiveProfile,
    onDuplicateProfile,
    onDeleteProfile
}: ProfileListProps) => {
    const openNewWindow = async (profile: Profile, e: React.MouseEvent) => {
        e.stopPropagation();
        if (profile.folders.length === 0 || !profile.folders[0].path) return;
        try {
            await tauriApi.openNewWindow(profile.folders[0].path, profile.name);
        } catch (err) {
            console.error('Failed to open new window:', err);
        }
    };

    const exportProfile = (profile: Profile) => {
        const exportData = JSON.stringify(profile, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profile.name.replace(/\s+/g, '_')}_profile.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.sidebarHeaderIcon}>
                    <Settings size={16} />
                </div>
                <span className={styles.sidebarHeaderTitle}>Profiles</span>
            </div>

            <div className={styles.newProfileWrapper}>
                <button 
                    className={styles.newProfileBtn}
                    onClick={() => onSetShowNewProfileDropdown(!showNewProfileDropdown)}
                >
                    <Plus size={14} />
                    <span>New Profile</span>
                    <ChevronDown size={14} className={styles.dropdownIcon} />
                </button>
                {showNewProfileDropdown && (
                    <div className={styles.dropdown}>
                        <button 
                            className={styles.dropdownItem}
                            onClick={() => onCreateNewProfile('empty')}
                        >
                            Create Empty Profile
                        </button>
                        <button 
                            className={styles.dropdownItem}
                            onClick={() => onCreateNewProfile('copy')}
                        >
                            <Copy size={14} />
                            Copy Current Profile
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.profileList}>
                {profiles.map(profile => (
                    <div 
                        key={profile.id}
                        className={`${styles.profileItem} ${selectedProfile === profile.id ? styles.profileItemActive : ''}`}
                        onClick={() => {
                            onSelectProfile(profile.id);
                            onSetShowProfileMenu(null);
                        }}
                    >
                        <div className={styles.profileIcon}>
                            <Settings size={14} />
                        </div>
                        <div className={styles.profileInfo}>
                            {editingName === profile.id ? (
                                <input
                                    type="text"
                                    className={styles.profileNameInput}
                                    value={profile.name}
                                    onChange={(e) => onUpdateProfileName(profile.id, e.target.value)}
                                    onBlur={() => onSetEditingName(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') onSetEditingName(null);
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span 
                                    className={styles.profileName}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if (!profile.isDefault) onSetEditingName(profile.id);
                                    }}
                                >
                                    {profile.name}
                                </span>
                            )}
                            {profile.isActive && (
                                <span className={styles.activeLabel}>
                                    <Check size={10} /> Active
                                </span>
                            )}
                        </div>
                        <div className={styles.profileActions}>
                            {profile.folders.length > 0 && profile.folders[0].path && (
                                <button 
                                    className={baseStyles.iconBtn} 
                                    title="Open New Window"
                                    onClick={(e) => openNewWindow(profile, e)}
                                >
                                    <WindowPlusIcon />
                                </button>
                            )}
                            <div className={styles.menuWrapper}>
                                <button 
                                    className={baseStyles.iconBtn} 
                                    title="More"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSetShowProfileMenu(showProfileMenu === profile.id ? null : profile.id);
                                    }}
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                                {showProfileMenu === profile.id && (
                                    <ProfileMenu
                                        profile={profile}
                                        onSetActive={() => onSetActiveProfile(profile.id)}
                                        onRename={() => onSetEditingName(profile.id)}
                                        onDuplicate={() => onDuplicateProfile(profile.id)}
                                        onExport={() => exportProfile(profile)}
                                        onDelete={() => onDeleteProfile(profile.id)}
                                        onClose={() => onSetShowProfileMenu(null)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
