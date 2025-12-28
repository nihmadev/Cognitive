import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { Profile } from './types';
import { ProfileList } from './ProfileList';
import { ProfileDetails } from './ProfileDetails';
import styles from './styles/base.module.css';

const PROFILES_STORAGE_KEY = 'colbex-profiles';

export const ProfilesPane = () => {
    const { currentWorkspace } = useProjectStore();
    
    const loadProfiles = (): Profile[] => {
        try {
            const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load profiles:', e);
        }
        return [{
            id: 'default',
            name: 'Default',
            isActive: true,
            isDefault: true,
            folders: currentWorkspace ? [{ host: 'Local', path: currentWorkspace }] : [],
            useForNewWindows: true
        }];
    };

    const [profiles, setProfiles] = useState<Profile[]>(loadProfiles);
    const [selectedProfile, setSelectedProfile] = useState<string>('default');
    const [showNewProfileDropdown, setShowNewProfileDropdown] = useState(false);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState<string | null>(null);

    const currentProfile = profiles.find(p => p.id === selectedProfile);

    // Закрытие меню при клике вне
    const handleClickOutside = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-profile-menu]') && !target.closest('[data-menu-trigger]')) {
            setShowProfileMenu(null);
        }
    }, []);

    useEffect(() => {
        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showProfileMenu, handleClickOutside]);

    useEffect(() => {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }, [profiles]);

    useEffect(() => {
        if (currentWorkspace) {
            setProfiles(prev => {
                const activeProfile = prev.find(p => p.isActive);
                if (activeProfile && !activeProfile.folders.some(f => f.path === currentWorkspace)) {
                    return prev.map(p => 
                        p.isActive 
                            ? { ...p, folders: [...p.folders, { host: 'Local', path: currentWorkspace }] }
                            : p
                    );
                }
                return prev;
            });
        }
    }, [currentWorkspace]);

    const createNewProfile = (type: 'empty' | 'copy') => {
        const newId = `profile-${Date.now()}`;
        const newProfile: Profile = {
            id: newId,
            name: type === 'copy' && currentProfile ? `${currentProfile.name} (Copy)` : 'New Profile',
            isActive: false,
            isDefault: false,
            folders: type === 'copy' && currentProfile ? [...currentProfile.folders] : [],
            useForNewWindows: false
        };
        setProfiles([...profiles, newProfile]);
        setSelectedProfile(newId);
        setShowNewProfileDropdown(false);
        setEditingName(newId);
    };

    const setActiveProfile = (profileId: string) => {
        setProfiles(profiles.map(p => ({ ...p, isActive: p.id === profileId })));
    };

    const deleteProfile = (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (profile?.isDefault) return;
        
        const newProfiles = profiles.filter(p => p.id !== profileId);
        if (profile?.isActive) {
            const defaultProfile = newProfiles.find(p => p.isDefault);
            if (defaultProfile) defaultProfile.isActive = true;
        }
        setProfiles(newProfiles);
        if (selectedProfile === profileId) setSelectedProfile('default');
        setShowProfileMenu(null);
    };

    const duplicateProfile = (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        
        const newId = `profile-${Date.now()}`;
        setProfiles([...profiles, {
            ...profile,
            id: newId,
            name: `${profile.name} (Copy)`,
            isActive: false,
            isDefault: false
        }]);
        setSelectedProfile(newId);
        setShowProfileMenu(null);
    };

    const updateProfileName = (profileId: string, name: string) => {
        setProfiles(profiles.map(p => p.id === profileId ? { ...p, name } : p));
    };

    return (
        <div className={styles.profilesPane}>
            <ProfileList
                profiles={profiles}
                selectedProfile={selectedProfile}
                editingName={editingName}
                showProfileMenu={showProfileMenu}
                showNewProfileDropdown={showNewProfileDropdown}
                onSelectProfile={setSelectedProfile}
                onSetShowNewProfileDropdown={setShowNewProfileDropdown}
                onCreateNewProfile={createNewProfile}
                onUpdateProfileName={updateProfileName}
                onSetEditingName={setEditingName}
                onSetShowProfileMenu={setShowProfileMenu}
                onSetActiveProfile={setActiveProfile}
                onDuplicateProfile={duplicateProfile}
                onDeleteProfile={deleteProfile}
            />
            {currentProfile && (
                <ProfileDetails
                    profile={currentProfile}
                    profiles={profiles}
                    onSetProfiles={setProfiles}
                    onSetActiveProfile={setActiveProfile}
                />
            )}
        </div>
    );
};
