import React from 'react';
import styles from '../styles';
import { SettingsSection } from '../types';

import { CursorSection, FindSection, FontsSection, FormattingSection, MinimapSection, IntelliSenseSection, FilesSection } from './Editor';
import { ThemeSection } from './Workbench';
import { TerminalSection, GitSection, SearchSection } from './Features';
import { KeybindingsSection } from './Application';
import { PrivacySection } from './Security';

export * from './Editor';
export * from './Workbench';
export * from './Features';
export * from './Application';
export * from './Security';

export const renderSectionComponent = (section: SettingsSection): React.ReactNode => {
    const sections: Record<SettingsSection, React.ReactNode> = {
        'editor-cursor': <CursorSection />,
        'editor-find': <FindSection />,
        'editor-font': <FontsSection />,
        'editor-formatting': <FormattingSection />,
        'editor-diff': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Diff Editor</div><div className={styles.settingDescriptionV2}>Diff editor settings coming soon.</div></div>,
        'editor-minimap': <MinimapSection />,
        'editor-suggestions': <IntelliSenseSection />,
        'editor-files': <FilesSection />,
        'workbench-appearance': <ThemeSection />,
        'workbench-editor': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Editor Management</div><div className={styles.settingDescriptionV2}>Configure how editors are managed.</div></div>,
        'workbench-zen': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Zen Mode</div><div className={styles.settingDescriptionV2}>Zen mode configuration.</div></div>,
        'window-appearance': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Window Appearance</div><div className={styles.settingDescriptionV2}>Configure window visuals.</div></div>,
        'window-newwindow': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>New Window</div><div className={styles.settingDescriptionV2}>New window behavior.</div></div>,
        'features-explorer': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Explorer</div><div className={styles.settingDescriptionV2}>Explorer settings.</div></div>,
        'features-search': <SearchSection />,
        'features-debug': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Debug</div><div className={styles.settingDescriptionV2}>Debugger configuration.</div></div>,
        'features-terminal': <TerminalSection />,
        'features-git': <GitSection />,
        'application-update': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Update</div><div className={styles.settingDescriptionV2}>Update settings.</div></div>,
        'application-proxy': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Proxy</div><div className={styles.settingDescriptionV2}>Network proxy settings.</div></div>,
        'application-keyboard': <KeybindingsSection />,
        'security-workspace': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Workspace Security</div><div className={styles.settingDescriptionV2}>Workspace trust and security.</div></div>,
        'security-telemetry': <PrivacySection />,
        'extensions-general': <div className={styles.settingItemV2}><div className={styles.settingLabelV2}>Extensions</div><div className={styles.settingDescriptionV2}>General extension settings.</div></div>,
    };
    return sections[section] || null;
};
