import { useState, useEffect } from 'react';
import {
    Bot, Palette, Type, Keyboard, Monitor,
    Terminal, GitBranch, Search, Zap, Shield,
    Cloud, Database, Code2, ChevronRight,
    Command, Check
} from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore, themes, availableFonts, type Theme } from '../../../store/uiStore';
import styles from './styles';

type SettingsSection = 
    | 'appearance-theme' | 'appearance-fonts'
    | 'editor-general' | 'editor-formatting' | 'editor-intellisense'
    | 'keybindings' | 'terminal' | 'git' | 'search' | 'privacy' | 'sync' | 'advanced'
    | 'ai-api-keys';

interface SettingsPaneProps {
    initialSection?: string | null;
}

interface NavItem { id: SettingsSection; label: string; icon: React.ReactNode; badge?: string; }
interface NavGroup { title: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
    { title: 'Appearance', items: [
        { id: 'appearance-theme', label: 'Theme', icon: <Palette size={16} /> },
        { id: 'appearance-fonts', label: 'Fonts', icon: <Type size={16} /> },
    ]},
    { title: 'Editor', items: [
        { id: 'editor-general', label: 'General', icon: <Code2 size={16} /> },
        { id: 'editor-formatting', label: 'Formatting', icon: <Monitor size={16} /> },
        { id: 'editor-intellisense', label: 'IntelliSense', icon: <Zap size={16} /> },
    ]},
    { title: 'Features', items: [
        { id: 'keybindings', label: 'Keyboard Shortcuts', icon: <Keyboard size={16} /> },
        { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
        { id: 'git', label: 'Git', icon: <GitBranch size={16} /> },
        { id: 'search', label: 'Search', icon: <Search size={16} /> },
    ]},
    { title: 'System', items: [
        { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
        { id: 'sync', label: 'Settings Sync', icon: <Cloud size={16} /> },
        { id: 'advanced', label: 'Advanced', icon: <Database size={16} /> },
    ]}
];

const sectionMeta: Record<SettingsSection, { title: string; desc: string; icon: React.ReactNode }> = {
    'appearance-theme': { title: 'Theme', desc: 'Customize the look and feel of your IDE', icon: <Palette size={18} /> },
    'appearance-fonts': { title: 'Fonts', desc: 'Configure editor and UI fonts', icon: <Type size={18} /> },
    'editor-general': { title: 'Editor', desc: 'General editor settings', icon: <Code2 size={18} /> },
    'editor-formatting': { title: 'Formatting', desc: 'Code formatting preferences', icon: <Monitor size={18} /> },
    'editor-intellisense': { title: 'IntelliSense', desc: 'Configure code completion and suggestions', icon: <Zap size={18} /> },
    'keybindings': { title: 'Keyboard Shortcuts', desc: 'Customize keyboard shortcuts', icon: <Keyboard size={18} /> },
    'terminal': { title: 'Terminal', desc: 'Terminal settings and shell configuration', icon: <Terminal size={18} /> },
    'git': { title: 'Git', desc: 'Git integration settings', icon: <GitBranch size={18} /> },
    'search': { title: 'Search', desc: 'Search and replace settings', icon: <Search size={18} /> },
    'privacy': { title: 'Privacy', desc: 'Privacy and telemetry settings', icon: <Shield size={18} /> },
    'sync': { title: 'Settings Sync', desc: 'Sync your settings across devices', icon: <Cloud size={18} /> },
    'advanced': { title: 'Advanced', desc: 'Advanced configuration options', icon: <Database size={18} /> },
    'ai-api-keys': { title: 'AI API Keys', desc: 'Configure API keys for AI assistants', icon: <Bot size={18} /> },
};

export const SettingsPane = ({ initialSection }: SettingsPaneProps) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>(
        (initialSection as SettingsSection) || 'appearance-theme'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const meta = sectionMeta[activeSection];
    const { updateSettingsTabTitle, activeSettingsTab, goBackFromSettings, openSettingsTabs } = useProjectStore();
    
    // Get previous context label
    const currentTab = openSettingsTabs.find(t => t.id === activeSettingsTab);
    const hasPreviousContext = currentTab?.previousContext?.id;

    useEffect(() => {
        if (initialSection) {
            setActiveSection(initialSection as SettingsSection);
        }
    }, [initialSection]);

    // Update tab title when section changes
    useEffect(() => {
        if (activeSettingsTab) {
            updateSettingsTabTitle(activeSettingsTab, meta.title, activeSection);
        }
    }, [activeSection, activeSettingsTab, meta.title, updateSettingsTabTitle]);

    return (
        <div className={styles.settingsPane}>
            <div className={styles.sidebar}>

                <div className={styles.sidebarSearch}>
                    <Search size={14} className={styles.sidebarSearchIcon} />
                    <input className={styles.sidebarSearchInput} placeholder="Search settings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <nav className={styles.sidebarNav}>
                    {navGroups.map((group) => (
                        <div key={group.title} className={styles.navSection}>
                            <div className={styles.navSectionTitle}>{group.title}</div>
                            {group.items.map((item) => (
                                <div key={item.id} className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`} onClick={() => setActiveSection(item.id)}>
                                    <span className={styles.navItemIcon}>{item.icon}</span>
                                    <span>{item.label}</span>
                                    {item.badge && <span className={styles.navItemBadge}>{item.badge}</span>}
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>
            </div>
            <div className={styles.content}>
                <div className={styles.contentHeader}>
                    <div className={styles.contentHeaderInfo}>
                        <div className={styles.breadcrumbs}>
                            <span className={styles.breadcrumb}>
                                <span 
                                    className={`${styles.breadcrumbLink} ${hasPreviousContext ? styles.breadcrumbClickable : ''}`}
                                    onClick={hasPreviousContext ? goBackFromSettings : undefined}
                                >
                                    Settings
                                </span>
                                <ChevronRight size={12} className={styles.breadcrumbSeparator} />
                            </span>
                            <span className={styles.breadcrumb}>{meta.title}</span>
                        </div>
                        <h2 className={styles.contentTitle}><div className={styles.contentTitleIcon}>{meta.icon}</div>{meta.title}</h2>
                        <p className={styles.contentDescription}>{meta.desc}</p>
                    </div>
                    <div className={styles.searchBox}>
                        <Search size={16} className={styles.searchIcon} />
                        <input className={styles.searchInput} placeholder="Search settings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <span className={styles.searchShortcut}>⌘K</span>
                    </div>
                </div>
                <div className={styles.contentBody}>{renderSection(activeSection)}</div>
            </div>
        </div>
    );
};

const Toggle = ({ active, onChange }: { active: boolean; onChange: () => void }) => (
    <div className={`${styles.toggle} ${active ? styles.active : ''}`} onClick={onChange}><div className={styles.toggleKnob} /></div>
);

const Slider = ({ value, min, max, onChange, unit = '' }: { value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) => (
    <div className={styles.sliderContainer}>
        <input type="range" className={styles.slider} value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
        <span className={styles.sliderValue}>{value}{unit}</span>
    </div>
);

function renderSection(section: SettingsSection) {
    const sections: Record<SettingsSection, React.ReactNode> = {
        'appearance-theme': <ThemeSection />, 'appearance-fonts': <FontsSection />, 'editor-general': <EditorGeneralSection />, 'editor-formatting': <FormattingSection />,
        'editor-intellisense': <IntelliSenseSection />, 'keybindings': <KeybindingsSection />, 'terminal': <TerminalSection />,
        'git': <GitSection />, 'search': <SearchSection />, 'privacy': <PrivacySection />, 'sync': <SyncSection />, 'advanced': <AdvancedSection />,
        'ai-api-keys': <div className={styles.settingsSection}><h3 className={styles.sectionTitle}>AI API Keys</h3><p>API keys configuration is now available directly in the AI assistant panel.</p></div>,
    };
    return sections[section] || null;
}

const ThemeSection = () => {
    const { theme: currentTheme, setTheme } = useUIStore();
    const themeList = Object.values(themes) as Theme[];
    
    return (
        <div className={styles.settingsSection}>
            <h3 className={styles.sectionTitle}>Color Theme</h3>
            <div className={styles.themePreview}>
                {themeList.map((t) => (
                    <div 
                        key={t.id} 
                        className={`${styles.themeCard} ${currentTheme === t.id ? styles.themeCardActive : ''}`} 
                        onClick={() => setTheme(t.id)}
                    >
                        <div className={styles.themePreviewImage} style={{ background: t.previewColors[0] }}>
                            <div className={styles.themePreviewColors}>
                                {t.previewColors.map((c, i) => (
                                    <div key={i} className={styles.themePreviewColor} style={{ background: c }} />
                                ))}
                            </div>
                        </div>
                        <div className={styles.themeName}>
                            {t.name}
                            {currentTheme === t.id && <Check size={12} style={{ marginLeft: 6 }} />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FontsSection = () => {
    const { fontSettings, setFontFamily, setFontSize, setLineHeight } = useUIStore();
    
    return (
        <>
            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Editor Font</h3>
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingLabel}>Font Family</div>
                        <div className={styles.settingDescription}>Font used in the code editor</div>
                    </div>
                    <div className={styles.settingControl}>
                        <select 
                            className={styles.select}
                            value={fontSettings.fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                        >
                            {availableFonts.map(font => (
                                <option key={font.id} value={font.id}>
                                    {font.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingLabel}>Font Size</div>
                        <div className={styles.settingDescription}>Size of text in the editor</div>
                    </div>
                    <div className={styles.settingControl}>
                        <Slider 
                            value={fontSettings.fontSize} 
                            min={10} 
                            max={24} 
                            onChange={setFontSize} 
                            unit="px" 
                        />
                    </div>
                </div>
                <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <div className={styles.settingLabel}>Line Height</div>
                        <div className={styles.settingDescription}>Spacing between lines</div>
                    </div>
                    <div className={styles.settingControl}>
                        <Slider 
                            value={fontSettings.lineHeight * 10} 
                            min={10} 
                            max={25} 
                            onChange={(v) => setLineHeight(v / 10)} 
                        />
                    </div>
                </div>
            </div>
            <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Preview</h3>
                <div className={styles.fontPreview}>
                    <div 
                        className={styles.fontPreviewCode}
                        dangerouslySetInnerHTML={{
                            __html: `<span class="${styles.fontPreviewKeyword}">function</span> <span class="${styles.fontPreviewFunction}">greet</span>(name: <span class="${styles.fontPreviewType}">string</span>) {
  <span class="${styles.fontPreviewComment}">// Say hello to the user</span>
  <span class="${styles.fontPreviewKeyword}">return</span> <span class="${styles.fontPreviewString}">\`Hello, ${name}!\`</span>;
}

<span class="${styles.fontPreviewKeyword}">const</span> <span class="${styles.fontPreviewVariable}">result</span> = <span class="${styles.fontPreviewFunction}">greet</span>(<span class="${styles.fontPreviewString}">"World"</span>);
<span class="${styles.fontPreviewKeyword}">console</span>.<span class="${styles.fontPreviewFunction}">log</span>(<span class="${styles.fontPreviewVariable}">result</span>);`
                        }}
                    />
                </div>
            </div>
        </>
    );
};


const EditorGeneralSection = () => {
    const [wordWrap, setWordWrap] = useState(false);
    const { minimapEnabled, setMinimapEnabled, lineNumbersEnabled, setLineNumbersEnabled, tabSize, setTabSize } = useUIStore();
    
    const tabSizeOptions = [2, 4, 8];
    
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Display</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Word Wrap</div><div className={styles.settingDescription}>Wrap long lines to fit the editor width</div></div><div className={styles.settingControl}><Toggle active={wordWrap} onChange={() => setWordWrap(!wordWrap)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Minimap</div><div className={styles.settingDescription}>Show code overview on the right side</div></div><div className={styles.settingControl}><Toggle active={minimapEnabled} onChange={() => setMinimapEnabled(!minimapEnabled)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Line Numbers</div><div className={styles.settingDescription}>Display line numbers in the gutter</div></div><div className={styles.settingControl}><Toggle active={lineNumbersEnabled} onChange={() => setLineNumbersEnabled(!lineNumbersEnabled)} /></div></div>
        <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>Tab Size</div>
                <div className={styles.settingDescription}>Number of spaces per tab</div>
            </div>
            <div className={styles.settingControl}>
                <select 
                    className={styles.select}
                    value={tabSize}
                    onChange={(e) => setTabSize(Number(e.target.value))}
                >
                    {tabSizeOptions.map(size => (
                        <option key={size} value={size}>
                            {size} spaces
                        </option>
                    ))}
                </select>
            </div>
        </div>
    </div>);
};

const FormattingSection = () => {
    const [formatOnSave, setFormatOnSave] = useState(true);
    const [formatOnPaste, setFormatOnPaste] = useState(false);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Auto Formatting</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Format On Save</div><div className={styles.settingDescription}>Automatically format code when saving</div></div><div className={styles.settingControl}><Toggle active={formatOnSave} onChange={() => setFormatOnSave(!formatOnSave)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Format On Paste</div><div className={styles.settingDescription}>Format pasted code automatically</div></div><div className={styles.settingControl}><Toggle active={formatOnPaste} onChange={() => setFormatOnPaste(!formatOnPaste)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Default Formatter</div><div className={styles.settingDescription}>Formatter to use for code files</div></div><div className={styles.settingControl}><select className={styles.select}><option value="prettier">Prettier</option><option value="eslint">ESLint</option></select></div></div>
    </div>);
};

const IntelliSenseSection = () => {
    const [quickSuggestions, setQuickSuggestions] = useState(true);
    const [parameterHints, setParameterHints] = useState(true);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Suggestions</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Quick Suggestions</div><div className={styles.settingDescription}>Show suggestions as you type</div></div><div className={styles.settingControl}><Toggle active={quickSuggestions} onChange={() => setQuickSuggestions(!quickSuggestions)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Parameter Hints</div><div className={styles.settingDescription}>Show function parameter hints</div></div><div className={styles.settingControl}><Toggle active={parameterHints} onChange={() => setParameterHints(!parameterHints)} /></div></div>
    </div>);
};

const KeybindingsSection = () => {
    const shortcuts = [
        { action: 'Open Command Palette', keys: ['Ctrl', 'Shift', 'P'], icon: <Command size={14} /> },
        { action: 'Quick Open File', keys: ['Ctrl', 'P'], icon: <Search size={14} /> },
        { action: 'Toggle Terminal', keys: ['Ctrl', '`'], icon: <Terminal size={14} /> },
        { action: 'Toggle Assistant', keys: ['Ctrl', 'L'], icon: <Bot size={14} /> },
        { action: 'Save File', keys: ['Ctrl', 'S'], icon: <Check size={14} /> },
    ];
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Keyboard Shortcuts</h3>
        {shortcuts.map((s) => (<div key={s.action} className={styles.keybindingItem}><div className={styles.keybindingAction}><span className={styles.keybindingIcon}>{s.icon}</span>{s.action}</div><div className={styles.keybindingKeys}><span className={styles.shortcutBadge}>{s.keys.map((k, i) => <span key={i} className={styles.shortcutKey}>{k}</span>)}</span></div></div>))}
    </div>);
};

const TerminalSection = () => {
    const [cursorBlink, setCursorBlink] = useState(true);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Terminal Settings</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Default Shell</div><div className={styles.settingDescription}>Shell to use for new terminals</div></div><div className={styles.settingControl}><select className={styles.select}><option value="bash">Bash</option><option value="zsh">Zsh</option><option value="powershell">PowerShell</option></select></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Cursor Blink</div><div className={styles.settingDescription}>Enable cursor blinking in terminal</div></div><div className={styles.settingControl}><Toggle active={cursorBlink} onChange={() => setCursorBlink(!cursorBlink)} /></div></div>
    </div>);
};

const GitSection = () => {
    const [autoFetch, setAutoFetch] = useState(true);
    const [confirmSync, setConfirmSync] = useState(true);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Git Integration</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Auto Fetch</div><div className={styles.settingDescription}>Automatically fetch from remotes</div></div><div className={styles.settingControl}><Toggle active={autoFetch} onChange={() => setAutoFetch(!autoFetch)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Confirm Sync</div><div className={styles.settingDescription}>Ask for confirmation before syncing</div></div><div className={styles.settingControl}><Toggle active={confirmSync} onChange={() => setConfirmSync(!confirmSync)} /></div></div>
    </div>);
};

const SearchSection = () => {
    const [searchOnType, setSearchOnType] = useState(true);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Search Settings</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Search On Type</div><div className={styles.settingDescription}>Start searching as you type</div></div><div className={styles.settingControl}><Toggle active={searchOnType} onChange={() => setSearchOnType(!searchOnType)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Exclude Patterns</div><div className={styles.settingDescription}>Patterns to exclude from search</div></div><div className={styles.settingControl}><input type="text" className={styles.input} defaultValue="node_modules, .git, dist" /></div></div>
    </div>);
};

const PrivacySection = () => {
    const [telemetry, setTelemetry] = useState(false);
    const [crashReports, setCrashReports] = useState(true);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Privacy Settings</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Telemetry</div><div className={styles.settingDescription}>Send anonymous usage data to help improve the product</div></div><div className={styles.settingControl}><Toggle active={telemetry} onChange={() => setTelemetry(!telemetry)} /></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Crash Reports</div><div className={styles.settingDescription}>Automatically send crash reports</div></div><div className={styles.settingControl}><Toggle active={crashReports} onChange={() => setCrashReports(!crashReports)} /></div></div>
    </div>);
};

const SyncSection = () => {
    const [syncEnabled, setSyncEnabled] = useState(false);
    return (<div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Settings Sync</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Enable Sync</div><div className={styles.settingDescription}>Sync settings, keybindings, and extensions across devices</div></div><div className={styles.settingControl}><Toggle active={syncEnabled} onChange={() => setSyncEnabled(!syncEnabled)} /></div></div>
        {syncEnabled && <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Sync Account</div><div className={styles.settingDescription}>Sign in to sync your settings</div></div><div className={styles.settingControl}><button className={styles.button}>Sign In</button></div></div>}
    </div>);
};

const AdvancedSection = () => {
    const [experimentalFeatures, setExperimentalFeatures] = useState(false);
    return (<><div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Experimental</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Experimental Features</div><div className={styles.settingDescription}>Enable experimental features (may be unstable)</div></div><div className={styles.settingControl}><Toggle active={experimentalFeatures} onChange={() => setExperimentalFeatures(!experimentalFeatures)} /></div></div>
    </div>
    <div className={styles.settingsSection}><h3 className={styles.sectionTitle}>Data</h3>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Clear Cache</div><div className={styles.settingDescription}>Clear all cached data and temporary files</div></div><div className={styles.settingControl}><button className={`${styles.button} ${styles.buttonSecondary}`}>Clear Cache</button></div></div>
        <div className={styles.settingItem}><div className={styles.settingInfo}><div className={styles.settingLabel}>Reset Settings</div><div className={styles.settingDescription}>Reset all settings to default values</div></div><div className={styles.settingControl}><button className={`${styles.button} ${styles.buttonDanger}`}>Reset All</button></div></div>
    </div></>);
};
