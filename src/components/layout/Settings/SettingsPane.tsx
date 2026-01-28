import { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Filter, Search, X, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import styles from './styles';
import { SettingsSection, SettingsPaneProps } from './types';
import { sectionMeta } from './constants';
import { SettingsSidebar } from './components/SettingsSidebar';
import { SettingsSearch } from './components/SettingsSearch';
import { renderSectionComponent } from './sections';
import { 
  preferencesClearInputIcon, 
  preferencesFilterIcon, 
  preferencesAiResultsIcon 
} from './icons';

export const SettingsPane = ({ initialSection }: SettingsPaneProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>(
        (initialSection as SettingsSection) || 'general-home'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [activeScope, setActiveScope] = useState<'user' | 'workspace'>('user');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'General': true,
        'Editor': false,
        'Workbench': false,
        'Features': false,
        'Extensions': false,
        'Application': false,
        'Security': false,
    });
    const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const meta = sectionMeta[activeSection] || { group: 'Commonly Used', label: 'Settings' };
    const { updateSettingsTabTitle, activeSettingsTab } = useProjectStore();

    // VS Code inspired search suggestions
    const searchSuggestionsList = useMemo(() => [
        '@modified',
        '@tag:notebookLayout',
        '@tag:notebookOutputLayout',
        '@tag:sync',
        '@tag:usesOnlineServices',
        '@tag:telemetry',
        '@tag:accessibility',
        '@tag:preview',
        '@tag:experimental',
        '@tag:advanced',
        '@id:',
        '@ext:',
        '@feature:scm',
        '@feature:explorer',
        '@feature:search',
        '@feature:debug',
        '@feature:extensions',
        '@feature:terminal',
        '@feature:task',
        '@feature:problems',
        '@feature:output',
        '@feature:comments',
        '@feature:remote',
        '@feature:timeline',
        '@feature:notebook',
        '@policy'
    ], []);

    useEffect(() => {
        if (initialSection && sectionMeta[initialSection]) {
            setActiveSection(initialSection as SettingsSection);
            const groupName = sectionMeta[initialSection].group;
            setOpenGroups(prev => ({ ...prev, [groupName]: true }));
        }
    }, [initialSection]);

    
    useEffect(() => {
        if (activeSettingsTab) {
            updateSettingsTabTitle(activeSettingsTab, meta.label, activeSection);
        }
    }, [activeSection, activeSettingsTab, meta.label, updateSettingsTabTitle]);

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);
        
        // Show suggestions when typing @ or :
        if (value.includes('@') || value.includes(':')) {
            const filtered = searchSuggestionsList.filter(suggestion => 
                suggestion.toLowerCase().includes(value.toLowerCase()) &&
                suggestion !== value
            );
            setSearchSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setSelectedSuggestionIndex(-1);
        } else {
            setShowSuggestions(false);
            setSearchSuggestions([]);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev < searchSuggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : searchSuggestions.length - 1
                );
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                if (selectedSuggestionIndex >= 0) {
                    const suggestion = searchSuggestions[selectedSuggestionIndex];
                    setSearchQuery(suggestion);
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                break;
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setShowSuggestions(false);
        setSearchSuggestions([]);
        setSelectedSuggestionIndex(-1);
        searchInputRef.current?.focus();
    };

    const isSearchMode = searchQuery.length > 0;

    return (
        <div className={`${styles.settingsPane} ${isSearchMode ? styles.searchMode : ''}`}>
            <div className={styles.content}>
                <div className={styles.settingsHeader}>
                    <div className={styles.searchContainer}>
                        <input
                            ref={searchInputRef}
                            className={styles.mainSearchInput}
                            placeholder="Search settings"
                            value={searchQuery}
                            onChange={(e) => handleSearchInputChange(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => {
                                if (searchQuery.includes('@') || searchQuery.includes(':')) {
                                    handleSearchInputChange(searchQuery);
                                }
                            }}
                        />
                        <div className={styles.searchContainerWidgets}>
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className={styles.searchIcons}
                                    title="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <div className={styles.searchIcons}>
                                <Menu size={14} title="More options" />
                                <Filter size={14} style={{ opacity: 0.8 }} title="Filter settings" />
                            </div>
                        </div>
                        
                        {/* Search suggestions dropdown */}
                        {showSuggestions && (
                            <div className={styles.searchSuggestions}>
                                {searchSuggestions.map((suggestion, index) => (
                                    <div
                                        key={suggestion}
                                        className={`${styles.searchSuggestion} ${
                                            index === selectedSuggestionIndex ? styles.selected : ''
                                        }`}
                                        onClick={() => {
                                            setSearchQuery(suggestion);
                                            setShowSuggestions(false);
                                            setSelectedSuggestionIndex(-1);
                                        }}
                                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                    >
                                        <Search size={14} style={{ marginRight: '8px', opacity: 0.6 }} />
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
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
