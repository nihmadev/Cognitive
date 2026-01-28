
import { ChevronRight } from 'lucide-react';
import styles from '../styles';
import { navigation } from '../constants';
import { SettingsSection } from '../types';

interface SettingsSidebarProps {
    activeSection: SettingsSection;
    setActiveSection: (section: SettingsSection) => void;
    openGroups: Record<string, boolean>;
    toggleGroup: (title: string) => void;
}

export const SettingsSidebar = ({ activeSection, setActiveSection, openGroups, toggleGroup }: SettingsSidebarProps) => {
    return (
        <div className={styles.sidebar}>
            <nav className={styles.sidebarNav}>
                <div className={styles.navItem} style={{ paddingLeft: '20px', color: '#888' }}>Commonly Used</div>
                {navigation.map((group) => (
                    <div key={group.title} className={styles.navGroup}>
                        <div
                            className={styles.navGroupHeader}
                            onClick={() => toggleGroup(group.title)}
                        >
                            <ChevronRight
                                size={14}
                                style={{
                                    transform: openGroups[group.title] ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.1s ease'
                                }}
                            />
                            <span>{group.title}</span>
                        </div>
                        {openGroups[group.title] && (
                            <div className={styles.navGroupItems}>
                                {group.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
                                        onClick={() => setActiveSection(item.id)}
                                    >
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </div>
    );
};
