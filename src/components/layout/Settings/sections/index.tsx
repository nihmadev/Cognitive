import React from 'react';
import styles from '../styles';
import { SettingsSection } from '../types';

// Import existing components
import { CursorSection, FindSection, FontsSection, FormattingSection, MinimapSection, IntelliSenseSection, FilesSection } from './Editor';
import { ThemeSection } from './Workbench';
import { TerminalSection, GitSection, SearchSection } from './Features';
import { KeybindingsSection } from './Application';
import { PrivacySection } from './Security';

// Import new General components
import { GeneralHomeSection, GeneralWorkbenchSection, GeneralWindowSection } from './General';

export * from './Editor';
export * from './Workbench';
export * from './Features';
export * from './Application';
export * from './Security';
export * from './General';

export const renderSectionComponent = (section: SettingsSection): React.ReactNode => {
    const sections: Record<SettingsSection, React.ReactNode> = {
        // General sections
        'general-home': <GeneralHomeSection />,
        'general-workbench': <GeneralWorkbenchSection />,
        'general-window': <GeneralWindowSection />,
        'general-menu': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Menu Bar</div><div className={styles.settingDescriptionV2}>Configure menu bar visibility and behavior.</div></div>,
        'general-explorer': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Explorer</div><div className={styles.settingDescriptionV2}>File explorer settings.</div></div>,
        'general-search': <SearchSection />,
        'general-debug': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Debug</div><div className={styles.settingDescriptionV2}>Debug configuration.</div></div>,
        'general-terminal': <TerminalSection />,
        'general-git': <GitSection />,
        'general-security': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Security</div><div className={styles.settingDescriptionV2}>Security settings.</div></div>,
        'general-scm': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Source Control</div><div className={styles.settingDescriptionV2}>Source control management.</div></div>,
        'general-extensions': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Extensions</div><div className={styles.settingDescriptionV2}>Extension management.</div></div>,
        'general-telemetry': <PrivacySection />,
        'general-update': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Update</div><div className={styles.settingDescriptionV2}>Update settings.</div></div>,
        'general-proxy': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Proxy</div><div className={styles.settingDescriptionV2}>Network proxy settings.</div></div>,
        'general-application': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Application</div><div className={styles.settingDescriptionV2}>Application settings.</div></div>,

        // Editor sections
        'editor-general': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Editor General</div><div className={styles.settingDescriptionV2}>General editor settings.</div></div>,
        'editor-cursor': <CursorSection />,
        'editor-find': <FindSection />,
        'editor-font': <FontsSection />,
        'editor-formatting': <FormattingSection />,
        'editor-diff': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Diff Editor</div><div className={styles.settingDescriptionV2}>Diff editor settings coming soon.</div></div>,
        'editor-minimap': <MinimapSection />,
        'editor-suggestions': <IntelliSenseSection />,
        'editor-snippets': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Snippets</div><div className={styles.settingDescriptionV2}>Code snippets configuration.</div></div>,
        'editor-unicode': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Unicode</div><div className={styles.settingDescriptionV2}>Unicode text editor settings.</div></div>,
        'editor-bracket-pair-colorization': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Bracket Pair Colorization</div><div className={styles.settingDescriptionV2}>Configure bracket pair colorization.</div></div>,
        'editor-guides': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Guides</div><div className={styles.settingDescriptionV2}>Editor guides configuration.</div></div>,
        'editor-inlay-hints': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Inlay Hints</div><div className={styles.settingDescriptionV2}>Inlay hints settings.</div></div>,
        'editor-sticky-scroll': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Sticky Scroll</div><div className={styles.settingDescriptionV2}>Sticky scroll configuration.</div></div>,
        'editor-editing': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Editing</div><div className={styles.settingDescriptionV2}>Text editing behavior.</div></div>,
        'editor-folding': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Folding</div><div className={styles.settingDescriptionV2}>Code folding settings.</div></div>,
        'editor-line-numbers': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Line Numbers</div><div className={styles.settingDescriptionV2}>Line number display.</div></div>,
        'editor-rulers': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Rulers</div><div className={styles.settingDescriptionV2}>Vertical rulers configuration.</div></div>,
        'editor-word-wrap': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Word Wrap</div><div className={styles.settingDescriptionV2}>Word wrapping settings.</div></div>,
        'editor-indentation': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Indentation</div><div className={styles.settingDescriptionV2}>Indentation settings.</div></div>,
        'editor-detection': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>File Detection</div><div className={styles.settingDescriptionV2}>File type detection.</div></div>,
        'editor-accessibility': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Accessibility</div><div className={styles.settingDescriptionV2}>Accessibility settings.</div></div>,
        'editor-goto': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Go to</div><div className={styles.settingDescriptionV2}>Navigation settings.</div></div>,
        'editor-multicursor': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Multi-cursor</div><div className={styles.settingDescriptionV2}>Multi-cursor editing.</div></div>,
        'editor-occurrences': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Occurrences</div><div className={styles.settingDescriptionV2}>Highlight occurrences.</div></div>,
        'editor-smart-scroll': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Smart Scroll</div><div className={styles.settingDescriptionV2}>Smart scrolling.</div></div>,
        'editor-suggest': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Suggestions</div><div className={styles.settingDescriptionV2}>Suggestion settings.</div></div>,
        'editor-clipboard': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Clipboard</div><div className={styles.settingDescriptionV2}>Clipboard settings.</div></div>,
        'editor-contributions': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Contributions</div><div className={styles.settingDescriptionV2}>Editor contributions.</div></div>,
        'editor-files': <FilesSection />,

        // Workbench sections
        'workbench-appearance': <ThemeSection />,
        'workbench-editor': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Editor Management</div><div className={styles.settingDescriptionV2}>Configure how editors are managed.</div></div>,
        'workbench-layout': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Layout</div><div className={styles.settingDescriptionV2}>Workbench layout settings.</div></div>,
        'workbench-sidebar': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Sidebar</div><div className={styles.settingDescriptionV2}>Sidebar configuration.</div></div>,
        'workbench-panel': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Panel</div><div className={styles.settingDescriptionV2}>Panel settings.</div></div>,
        'workbench-zen': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Zen Mode</div><div className={styles.settingDescriptionV2}>Zen mode configuration.</div></div>,
        'workbench-timeline': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Timeline</div><div className={styles.settingDescriptionV2}>Timeline view settings.</div></div>,
        'workbench-comments': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Comments</div><div className={styles.settingDescriptionV2}>Comment settings.</div></div>,
        'workbench-chat': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Chat</div><div className={styles.settingDescriptionV2}>Chat configuration.</div></div>,
        'workbench-issues': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Issues</div><div className={styles.settingDescriptionV2}>Issue tracking.</div></div>,
        'workbench-experimentation': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Experimentation</div><div className={styles.settingDescriptionV2}>Feature experiments.</div></div>,
        'workbench-settings-editor': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Settings Editor</div><div className={styles.settingDescriptionV2}>Settings editor configuration.</div></div>,
        'workbench-keybindings': <KeybindingsSection />,
        'workbench-colors': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Color Themes</div><div className={styles.settingDescriptionV2}>Color theme settings.</div></div>,
        'workbench-themes': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Themes</div><div className={styles.settingDescriptionV2}>Theme configuration.</div></div>,
        'workbench-icons': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>File Icons</div><div className={styles.settingDescriptionV2}>File icon themes.</div></div>,
        'workbench-product-icon': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Product Icon</div><div className={styles.settingDescriptionV2}>Product icon settings.</div></div>,
        'workbench-startup': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Startup</div><div className={styles.settingDescriptionV2}>Startup configuration.</div></div>,
        'workbench-window': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Window</div><div className={styles.settingDescriptionV2}>Window management.</div></div>,
        'workbench-welcome': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Welcome</div><div className={styles.settingDescriptionV2}>Welcome page settings.</div></div>,
        'workbench-trust': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Workspace Trust</div><div className={styles.settingDescriptionV2}>Workspace trust configuration.</div></div>,

        // Features sections
        'features-explorer': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Explorer</div><div className={styles.settingDescriptionV2}>File explorer features.</div></div>,
        'features-search': <SearchSection />,
        'features-debug': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Debug</div><div className={styles.settingDescriptionV2}>Debug features.</div></div>,
        'features-terminal': <TerminalSection />,
        'features-git': <GitSection />,
        'features-testing': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Testing</div><div className={styles.settingDescriptionV2}>Testing framework integration.</div></div>,
        'features-tasks': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Tasks</div><div className={styles.settingDescriptionV2}>Task runner configuration.</div></div>,
        'features-extension-host': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Extension Host</div><div className={styles.settingDescriptionV2}>Extension host settings.</div></div>,
        'features-remote': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Remote</div><div className={styles.settingDescriptionV2}>Remote development.</div></div>,
        'features-ssh': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>SSH</div><div className={styles.settingDescriptionV2}>SSH configuration.</div></div>,
        'features-containers': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Containers</div><div className={styles.settingDescriptionV2}>Container development.</div></div>,
        'features-wsl': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>WSL</div><div className={styles.settingDescriptionV2}>Windows Subsystem for Linux.</div></div>,
        'features-performance': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Performance</div><div className={styles.settingDescriptionV2}>Performance optimization.</div></div>,
        'features-network': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Network</div><div className={styles.settingDescriptionV2}>Network settings.</div></div>,
        'features-security': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Security</div><div className={styles.settingDescriptionV2}>Security features.</div></div>,
        'features-accessibility': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Accessibility</div><div className={styles.settingDescriptionV2}>Accessibility features.</div></div>,

        // Extensions sections
        'extensions-general': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>General</div><div className={styles.settingDescriptionV2}>General extension settings.</div></div>,
        'extensions-auto-update': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Auto Update</div><div className={styles.settingDescriptionV2}>Extension auto-update settings.</div></div>,
        'extensions-close-extensions': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Close Extensions</div><div className={styles.settingDescriptionV2}>Extension closing behavior.</div></div>,
        'extensions-recommendations': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Recommendations</div><div className={styles.settingDescriptionV2}>Extension recommendations.</div></div>,
        'extensions-marketplace': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Marketplace</div><div className={styles.settingDescriptionV2}>Extension marketplace settings.</div></div>,
        'extensions-search': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Search</div><div className={styles.settingDescriptionV2}>Extension search configuration.</div></div>,
        'extensions-installed': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Installed</div><div className={styles.settingDescriptionV2}>Installed extensions.</div></div>,
        'extensions-enabled': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Enabled</div><div className={styles.settingDescriptionV2}>Enabled extensions.</div></div>,
        'extensions-disabled': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Disabled</div><div className={styles.settingDescriptionV2}>Disabled extensions.</div></div>,
        'extensions-outdated': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Outdated</div><div className={styles.settingDescriptionV2}>Outdated extensions.</div></div>,
        'extensions-builtin': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Built-in</div><div className={styles.settingDescriptionV2}>Built-in extensions.</div></div>,

        // Application sections
        'application-proxy': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Proxy</div><div className={styles.settingDescriptionV2}>Network proxy settings.</div></div>,
        'application-update': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Update</div><div className={styles.settingDescriptionV2}>Application update settings.</div></div>,
        'application-telemetry': <PrivacySection />,
        'application-crash-reporter': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Crash Reporter</div><div className={styles.settingDescriptionV2}>Crash reporting configuration.</div></div>,
        'application-language': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Language</div><div className={styles.settingDescriptionV2}>Display language settings.</div></div>,
        'application-keyboard': <KeybindingsSection />,
        'application-mouse': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Mouse</div><div className={styles.settingDescriptionV2}>Mouse settings.</div></div>,
        'application-shell': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Shell</div><div className={styles.settingDescriptionV2}>Shell integration.</div></div>,
        'application-developer': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Developer</div><div className={styles.settingDescriptionV2}>Developer tools.</div></div>,
        'application-experimental': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Experimental</div><div className={styles.settingDescriptionV2}>Experimental features.</div></div>,

        // Security sections
        'security-workspace': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Workspace</div><div className={styles.settingDescriptionV2}>Workspace security settings.</div></div>,
        'security-trust': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Trust</div><div className={styles.settingDescriptionV2}>Trust management.</div></div>,
        'security-extensions': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Extensions</div><div className={styles.settingDescriptionV2}>Extension security.</div></div>,
        'security-telemetry': <PrivacySection />,
        'security-proxy': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Proxy</div><div className={styles.settingDescriptionV2}>Security proxy settings.</div></div>,
        'security-network': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Network</div><div className={styles.settingDescriptionV2}>Network security.</div></div>,
        'security-privacy': <PrivacySection />,
    };
    return sections[section] || null;
};
