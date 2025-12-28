import { useState, useRef, useEffect } from 'react';
import { ActivitySquareIcon, SettingsIcon, ProfileIcon, AssistantIcon } from './icons';
import { useAIStore } from '../../../store/aiStore';
import { useUIStore } from '../../../store/uiStore';
import { useProjectStore } from '../../../store/projectStore';
import clsx from 'clsx';
import styles from './MenuRight.module.css';

interface SettingsMenuItem {
    id: string;
    label: string;
    shortcut?: string;
    divider?: boolean;
    hasSubmenu?: boolean;
}

const settingsMenuItems: SettingsMenuItem[] = [
    { id: 'command-palette', label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' },
    { id: 'divider-1', label: '', divider: true },
    { id: 'profiles', label: 'Profiles' },
    { id: 'settings', label: 'Settings', shortcut: 'Ctrl+,' },
    { id: 'extensions', label: 'Extensions', shortcut: 'Ctrl+Shift+X' },
    { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S' },
    { id: 'snippets', label: 'Snippets' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'themes', label: 'Themes', hasSubmenu: true },
    { id: 'divider-2', label: '', divider: true },
    { id: 'check-updates', label: 'Check for Updates...' },
];

export const MenuRight = ({
    onOpenSettings,
    onOpenKeyboardShortcuts,
    onOpenProfiles,
}: {
    onOpenSettings?: () => void;
    onOpenKeyboardShortcuts?: () => void;
    onOpenProfiles?: () => void;
}) => {
    const { isAssistantOpen, toggleAssistant } = useAIStore();
    const { showTerminal, openPorts, showSidebar, toggleSidebar, setTerminalOpen } = useUIStore();
    const { currentWorkspace } = useProjectStore();
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handlePortsToggle = () => {
        if (showTerminal) {
            setTerminalOpen(false);
        } else {
            openPorts();
        }
    };

    const handleSettingsClick = () => {
        setShowSettingsMenu(prev => !prev);
    };

    const handleMenuItemClick = (itemId: string) => {
        setShowSettingsMenu(false);
        switch (itemId) {
            case 'settings':
                onOpenSettings?.();
                break;
            case 'keyboard-shortcuts':
                onOpenKeyboardShortcuts?.();
                break;
            case 'profiles':
                onOpenProfiles?.();
                break;
            // Add more handlers as needed
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowSettingsMenu(false);
            }
        };

        if (showSettingsMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettingsMenu]);

    return (
        <div className={styles.root}>
            {/* Left Sidebar Toggle */}
            <button
                onClick={toggleSidebar}
                className={styles.btn}
                title="Toggle Sidebar"
            >
                <ActivitySquareIcon active={showSidebar} position="left" />
            </button>

            {/* Bottom Ports Toggle */}
            <button
                onClick={handlePortsToggle}
                className={styles.btn}
                title="Toggle Tools"
            >
                <ActivitySquareIcon active={showTerminal} position="bottom" />
            </button>

            {/* Right Assistant Toggle - только если открыт проект */}
            {currentWorkspace && (
                <button
                    onClick={toggleAssistant}
                    className={styles.btn}
                    title="Toggle Assistant"
                >
                    <AssistantIcon active={isAssistantOpen} />
                </button>
            )}

            <div className={styles.divider} />

            {/* Settings with Dropdown */}
            <div className={styles.settingsWrapper}>
                <button
                    ref={buttonRef}
                    onClick={handleSettingsClick}
                    className={clsx(styles.btn, showSettingsMenu && styles.btnActive)}
                    title="Settings"
                >
                    <SettingsIcon />
                </button>

                {showSettingsMenu && (
                    <div ref={menuRef} className={styles.settingsMenu}>
                        {settingsMenuItems.map((item) => {
                            if (item.divider) {
                                return <div key={item.id} className={styles.menuDivider} />;
                            }
                            return (
                                <button
                                    key={item.id}
                                    className={styles.menuItem}
                                    onClick={() => handleMenuItemClick(item.id)}
                                >
                                    <span className={styles.menuItemLabel}>{item.label}</span>
                                    {item.shortcut && (
                                        <span className={styles.menuItemShortcut}>{item.shortcut}</span>
                                    )}
                                    {item.hasSubmenu && (
                                        <span className={styles.menuItemArrow}>›</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Profile */}
            <button
                className={styles.btn}
                title="Profile"
            >
                <ProfileIcon />
            </button>
        </div>
    );
};
