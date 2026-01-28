import React from 'react';
import styles from '../styles';

export const GeneralHomeSection = () => (
    <div>
        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Home</b></div>
            <div className={styles.settingDescriptionV2}>
                Configure general settings for your IDE experience.
            </div>
        </div>
        
        <div className={styles.infoCard}>
            <div className={styles.infoCardIcon}>
                ℹ️
            </div>
            <div className={styles.infoCardContent}>
                <div className={styles.infoCardTitle}>Welcome to Settings</div>
                <div className={styles.infoCardText}>
                    Use the sidebar to navigate through different categories of settings. You can also search for specific settings using the search bar above.
                </div>
            </div>
        </div>

        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Theme</b></div>
            <div className={styles.settingDescriptionV2}>
                Select your preferred color theme for the IDE.
            </div>
            <div className={styles.settingControlV2}>
                <select className={styles.mainSearchInput} style={{ width: '200px' }}>
                    <option>Dark (Default)</option>
                    <option>Light</option>
                    <option>High Contrast</option>
                    <option>Monokai</option>
                </select>
            </div>
        </div>

        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Font Size</b></div>
            <div className={styles.settingDescriptionV2}>
                Controls the font size for the editor.
            </div>
            <div className={styles.settingControlV2}>
                <input 
                    type="range" 
                    min="10" 
                    max="30" 
                    defaultValue="14" 
                    className={styles.mainSearchInput}
                    style={{ width: '200px' }}
                />
                <span style={{ marginLeft: '10px' }}>14px</span>
            </div>
        </div>

        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Auto Save</b></div>
            <div className={styles.settingDescriptionV2}>
                Controls auto save of dirty files.
            </div>
            <div className={styles.settingControlV2}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ marginRight: '8px' }} />
                    Enable auto save
                </label>
            </div>
        </div>
    </div>
);

export const GeneralWorkbenchSection = () => (
    <div>
        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Workbench</b></div>
            <div className={styles.settingDescriptionV2}>
                Configure workbench related settings.
            </div>
        </div>
        
        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Startup</b></div>
            <div className={styles.settingDescriptionV2}>
                Configure startup behavior.
            </div>
            <div className={styles.settingControlV2}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ marginRight: '8px' }} />
                    Show welcome page on startup
                </label>
            </div>
        </div>
    </div>
);

export const GeneralWindowSection = () => (
    <div>
        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Window</b></div>
            <div className={styles.settingDescriptionV2}>
                Configure window management settings.
            </div>
        </div>
        
        <div className={styles.settingItemV2}>
            <div className={styles.settingLabelV2}><b>Restore Window</b></div>
            <div className={styles.settingDescriptionV2}>
                Control whether to restore windows when opening the IDE.
            </div>
            <div className={styles.settingControlV2}>
                <select className={styles.mainSearchInput} style={{ width: '200px' }}>
                    <option>Restore all windows</option>
                    <option>Restore folders and workspaces</option>
                    <option>Never restore</option>
                </select>
            </div>
        </div>
    </div>
);
