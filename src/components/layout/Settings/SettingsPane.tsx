import { useState, useEffect } from 'react';
import { Menu, Filter } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import styles from './styles';
import { SettingsSection, SettingsPaneProps } from './types';
import { sectionMeta } from './constants';
import { SettingsSidebar } from './components/SettingsSidebar';
import { SettingsSearch } from './components/SettingsSearch';
import { renderSectionComponent } from './sections';

export const SettingsPane = ({ initialSection }: SettingsPaneProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>(
        (initialSection as SettingsSection) || 'editor-cursor'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [activeScope, setActiveScope] = useState<'user' | 'workspace'>('user');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'Text Editor': true,
        'Workbench': false,
        'Window': false,
        'Features': false,
        'Application': false,
        'Security': false,
        'Extensions': false,
    });

    const meta = sectionMeta[activeSection] || { group: 'Commonly Used', label: 'Settings' };
    const { updateSettingsTabTitle, activeSettingsTab } = useProjectStore();

    useEffect(() => {
        if (initialSection && sectionMeta[initialSection]) {
            setActiveSection(initialSection as SettingsSection);
            const groupName = sectionMeta[initialSection].group;
            setOpenGroups(prev => ({ ...prev, [groupName]: true }));
        }
    }, [initialSection]);

    // Update tab title when section changes
    useEffect(() => {
        if (activeSettingsTab) {
            updateSettingsTabTitle(activeSettingsTab, meta.label, activeSection);
        }
    }, [activeSection, activeSettingsTab, meta.label, updateSettingsTabTitle]);

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className={styles.settingsPane}>
            <div className={styles.content}>
                <div className={styles.settingsHeader}>
                    <div className={styles.searchContainer}>
                        <input
                            className={styles.mainSearchInput}
                            placeholder="Search settings"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className={styles.searchIcons}>
                            <Menu size={14} />
                            <Filter size={14} style={{ opacity: 0.8 }} />
                        </div>
                    </div>
                    <div className={styles.tabsContainer}>
                        <div
                            className={`${styles.tab} ${activeScope === 'user' ? styles.activeTab : ''}`}
                            onClick={() => setActiveScope('user')}
                        >
                            User
                        </div>
                        <div
                            className={`${styles.tab} ${activeScope === 'workspace' ? styles.activeTab : ''}`}
                            onClick={() => setActiveScope('workspace')}
                        >
                            Workspace
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <SettingsSidebar
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        openGroups={openGroups}
                        toggleGroup={toggleGroup}
                    />

                    <div className={styles.contentBody}>
                        {!searchQuery && (
                            <div className={styles.contentBodyHeader}>
                                <div className={styles.breadcrumbs}>
                                    <span className={styles.breadcrumbLink}>{activeScope === 'user' ? 'User' : 'Workspace'}</span>
                                    <span className={styles.breadcrumbSeparator}>{'>'}</span>
                                    <span className={styles.breadcrumbLink}>{meta.group}</span>
                                    <span className={styles.breadcrumbSeparator}>{'>'}</span>
                                    <span>{meta.label}</span>
                                </div>
                                <h1 className={styles.contentTitle}>{meta.group}</h1>
                                <h2 className={styles.sectionTitle}>{meta.label}</h2>
                            </div>
                        )}
                        <div style={{ padding: '0 24px 24px 24px' }}>
                            {searchQuery ? (
                                <SettingsSearch searchQuery={searchQuery} />
                            ) : (
                                renderSectionComponent(activeSection)
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
