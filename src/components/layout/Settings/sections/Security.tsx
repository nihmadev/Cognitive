
import styles from '../styles';
import { CheckboxSetting } from '../components/SettingsControls';

export const PrivacySection = () => {
    return (
        <div className={styles.settingsSection}>
            <CheckboxSetting
                label="Telemetry: Enable Telemetry"
                description="Enable diagnostic data to be sent."
                defaultChecked={false}
            />
        </div>
    );
};
