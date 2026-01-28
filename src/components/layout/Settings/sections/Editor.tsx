import { useState } from 'react';
import { useUIStore, availableFonts } from '../../../../store/uiStore';
import styles from '../styles';
import { CheckboxSetting } from '../components/SettingsControls';

export const CursorSection = () => {
    const [blinking, setBlinking] = useState('blink');
    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Editor: <b>Cursor Blinking</b></div>
                <div className={styles.settingDescriptionV2}>Control the cursor animation style.</div>
                <div className={styles.settingControlV2}>
                    <select className={styles.select} value={blinking} onChange={e => setBlinking(e.target.value)}>
                        <option value="blink">blink</option>
                        <option value="smooth">smooth</option>
                        <option value="phase">phase</option>
                        <option value="expand">expand</option>
                        <option value="solid">solid</option>
                    </select>
                </div>
            </div>
            <CheckboxSetting
                label="Editor: Cursor Smooth Caret Animation"
                description="Controls whether the smooth caret animation should be enabled."
                defaultChecked={false}
            />
        </div>
    );
};

export const FindSection = () => {
    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Editor: <b>Find: Seed Search String From Selection</b></div>
                <div className={styles.settingDescriptionV2}>Controls whether the search string in the Find Widget is seeded from the editor selection.</div>
                <div className={styles.settingControlV2}>
                    <select className={styles.select}>
                        <option value="never">never</option>
                        <option value="always">always</option>
                        <option value="selection">selection</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export const MinimapSection = () => {
    const { minimapEnabled, setMinimapEnabled } = useUIStore();
    return (
        <div className={styles.settingsSection}>
            <CheckboxSetting
                label="Editor › Minimap: Enabled"
                description="Controls whether the minimap is shown."
                checked={minimapEnabled}
                onChange={() => setMinimapEnabled(!minimapEnabled)}
            />
        </div>
    );
};

export const FontsSection = () => {
    const { fontSettings, setFontFamily, setFontSize } = useUIStore();

    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Editor: <b>Font Family</b></div>
                <div className={styles.settingDescriptionV2}>Controls the font family.</div>
                <div className={styles.settingControlV2}>
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

            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Editor: <b>Font Size</b></div>
                <div className={styles.settingDescriptionV2}>Controls the font size in pixels.</div>
                <div className={styles.settingControlV2}>
                    <input
                        className={styles.input}
                        type="number"
                        value={fontSettings.fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
};

export const FormattingSection = () => {
    const [formatOnSave, setFormatOnSave] = useState(true);
    return (
        <div className={styles.settingsSection}>
            <CheckboxSetting
                label="Editor: Format On Save"
                description="Format a file on save."
                checked={formatOnSave}
                onChange={() => setFormatOnSave(!formatOnSave)}
            />
        </div>
    );
};

export const IntelliSenseSection = () => {
    return (
        <div className={styles.settingsSection}>
            <CheckboxSetting
                label="Editor: Quick Suggestions"
                description="Controls whether suggestions should automatically show up while typing."
                defaultChecked={true}
            />
        </div>
    );
};

export const FilesSection = () => {
    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Files: <b>Associations</b></div>
                <div className={styles.settingDescriptionV2}>Configure glob patterns of file associations to languages.</div>
                <div className={styles.settingControlV2}>
                    <table className={styles.settingsTable}>
                        <thead>
                            <tr>
                                <th style={{ width: '50%' }}>Item</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>*.embeddedhtml</td>
                                <td>html</td>
                            </tr>
                        </tbody>
                    </table>
                    <button className={styles.addButton}>Add Item</button>
                </div>
            </div>

            <CheckboxSetting
                label="Files: Auto Guess Encoding"
                description="When enabled, the editor will attempt to guess the character set encoding when opening files."
                defaultChecked={false}
            />

            <div className={styles.settingItemV2}>

                <div className={styles.settingItemV2}>
                    <div className={styles.settingLabelV2}>Files: <b>Auto Save</b></div>
                    <div className={styles.settingDescriptionV2}>Controls auto save of editors that have unsaved changes.</div>
                    <div className={styles.settingControlV2}>
                        <select className={styles.select}>
                            <option value="off">off</option>
                            <option value="afterDelay">afterDelay</option>
                            <option value="onFocusChange">onFocusChange</option>
                            <option value="onWindowChange">onWindowChange</option>
                        </select>
                    </div>
                </div>

                <div className={styles.settingItemV2}>
                    <div className={styles.settingLabelV2}>Files: <b>Auto Save Delay</b></div>
                    <div className={styles.settingDescriptionV2}>Controls the delay in milliseconds after which an editor with unsaved changes is saved automatically.</div>
                    <div className={styles.settingControlV2}>
                        <input type="number" className={styles.input} defaultValue={1000} />
                    </div>
                </div>

                <div className={styles.settingItemV2}>
                    <div className={styles.settingLabelV2}>Files: <b>Default Language</b></div>
                    <div className={styles.settingDescriptionV2}>The default language identifier that is assigned to new files.</div>
                    <div className={styles.settingControlV2}>
                        <input type="text" className={styles.input} />
                    </div>
                </div>

                <CheckboxSetting
                    label="Files: Enable Trash"
                    description="Moves files/folders to the OS trash (recycle bin on Windows) when deleting."
                    defaultChecked={true}
                />

                <div className={styles.settingItemV2}>

                    <div className={styles.settingItemV2}>
                        <div className={styles.settingLabelV2}>Files: <b>Encoding</b></div>
                        <div className={styles.settingDescriptionV2}>The default character set encoding to use when reading and writing files.</div>
                        <div className={styles.settingControlV2}>
                            <select className={styles.select}>
                                <option value="utf8">UTF-8</option>
                                <option value="utf16le">UTF-16le</option>
                                <option value="utf16be">UTF-16be</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.settingItemV2}>
                        <div className={styles.settingLabelV2}>Files: <b>Exclude</b></div>
                        <div className={styles.settingDescriptionV2}>Configure glob patterns for excluding files and folders.</div>
                        <div className={styles.settingControlV2}>
                            <div className={styles.patternsList}>
                                <div className={styles.patternItem}>**/.git</div>
                                <div className={styles.patternItem}>**/.svn</div>
                                <div className={styles.patternItem}>**/.hg</div>
                                <div className={styles.patternItem}>**/CVS</div>
                                <div className={styles.patternItem}>**/.DS_Store</div>
                            </div>
                            <button className={styles.addButton}>Add Pattern</button>
                        </div>
                    </div>

                    <CheckboxSetting
                        label="Files: Insert Final Newline"
                        description="When enabled, insert a final new line at the end of the file when saving it."
                        defaultChecked={false}
                    />
                </div>
            </div>
        </div>
    );
};
