
import styles from '../styles';

export const KeybindingsSection = () => {
    const shortcuts = [
        { action: 'Open Command Palette', keys: ['Ctrl', 'Shift', 'P'] },
        { action: 'Quick Open File', keys: ['Ctrl', 'P'] },
    ];
    return (
        <div className={styles.settingsSection}>
            {shortcuts.map((s) => (
                <div key={s.action} className={styles.settingItemV2}>
                    <div className={styles.settingLabelV2}>Keyboard: <b>{s.action}</b></div>
                    <div className={styles.settingDescriptionV2}>Shortcut key combination.</div>
                    <div className={styles.settingControlV2}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {s.keys.map((k, i) => <span key={i} className={styles.shortcutKey} style={{ padding: '2px 6px', background: '#3c3c3c', borderRadius: '2px', fontSize: '11px', color: '#ccc', border: '1px solid #454545' }}>{k}</span>)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
