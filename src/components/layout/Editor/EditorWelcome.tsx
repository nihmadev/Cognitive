import { useUIStore, themes } from '../../../store/uiStore';
import styles from './Editor.module.css';

export const EditorWelcome = () => {
    const theme = useUIStore((state) => state.theme);
    const isLightTheme = themes[theme]?.type === 'light';
    const iconSrc = isLightTheme ? '/icon2.png' : '/icon.ico';

    return (
        <div className={styles.empty}>
            <div className={styles.emptyInner}>
                <div className={styles.brand}>
                    <img
                        src={iconSrc}
                        alt="Colbex"
                        className={styles.brandIcon}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                    />
                </div>
                <h1 className={styles.title}>Welcome to Colbex</h1>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>File Operations</h3>
                        <div className={styles.cardBody}>
                            <p><kbd className={styles.kbd}>Ctrl+O</kbd> Open Folder</p>
                            <p><kbd className={styles.kbd}>Ctrl+P</kbd> Quick Open</p>
                            <p><kbd className={styles.kbd}>Ctrl+N</kbd> New File</p>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Navigation</h3>
                        <div className={styles.cardBody}>
                            <p><kbd className={styles.kbd}>Ctrl+,</kbd> Open Settings</p>
                            <p><kbd className={styles.kbd}>Ctrl+Shift+E</kbd> Show Explorer</p>
                            <p><kbd className={styles.kbd}>Ctrl+`</kbd> Toggle Tools</p>
                        </div>
                    </div>
                </div>

                <p></p>
            </div>
        </div>
    );
};
