
import styles from '../styles';
import { CheckboxSetting } from '../components/SettingsControls';

export const TerminalSection = () => {
    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Terminal: <b>Default Shell</b></div>
                <div className={styles.settingDescriptionV2}>The default shell to use in the terminal.</div>
                <div className={styles.settingControlV2}>
                    <select className={styles.select}><option value="bash">Bash</option><option value="powershell">PowerShell</option></select>
                </div>
            </div>
        </div>
    );
};

export const GitSection = () => {
    return (
        <div className={styles.settingsSection}>
            <CheckboxSetting
                label="Git: Auto Fetch"
                description="Controls whether auto fetch is enabled."
                defaultChecked={true}
            />
        </div>
    );
};

export const SearchSection = () => {
    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Search: <b>Exclude</b></div>
                <div className={styles.settingDescriptionV2}>Configure glob patterns for excluding files and folders in searches.</div>
                <div className={styles.settingControlV2}>
                    <input type="text" className={styles.input} defaultValue="node_modules, .git, dist" />
                </div>
            </div>
        </div>
    );
};
