import styles from '../styles';

export const Toggle = ({ active, onChange }: { active: boolean; onChange: () => void }) => (
    <div className={`${styles.toggle} ${active ? styles.active : ''}`} onClick={onChange}><div className={styles.toggleKnob} /></div>
);

export const Slider = ({ value, min, max, onChange, unit = '' }: { value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) => (
    <div className={styles.sliderContainer}>
        <input type="range" className={styles.slider} value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
        <span className={styles.sliderValue}>{value}{unit}</span>
    </div>
);

export const CheckboxSetting = ({ label, description, checked, defaultChecked, onChange }: { label: string; description: string; checked?: boolean; defaultChecked?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className={styles.settingItemV2}>
        <div className={styles.settingLabelV2}>{label}</div>
        <label className={styles.checkboxContainer}>
            <input
                type="checkbox"
                className={styles.checkbox}
                checked={checked}
                defaultChecked={defaultChecked}
                onChange={onChange}
            />
            <span className={styles.checkboxDescription}>{description}</span>
        </label>
    </div>
);
