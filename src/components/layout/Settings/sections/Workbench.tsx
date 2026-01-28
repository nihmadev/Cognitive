import { useUIStore, themes, type Theme, type ThemeId } from '../../../../store/uiStore';
import styles from '../styles';

export const ThemeSection = () => {
    const { theme: currentTheme, setTheme } = useUIStore();
    const themeList = Object.values(themes) as Theme[];

    return (
        <div className={styles.settingsSection}>
            <div className={styles.settingItemV2}>
                <div className={styles.settingLabelV2}>Workbench: <b>Color Theme</b></div>
                <div className={styles.settingDescriptionV2}>Specifies the color theme used in the workbench.</div>
                <div className={styles.settingControlV2}>
                    <select
                        className={styles.select}
                        value={currentTheme}
                        onChange={(e) => setTheme(e.target.value as ThemeId)}
                    >
                        {themeList.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
