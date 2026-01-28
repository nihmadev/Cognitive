import styles from './Editor.module.css';

interface BinaryWarningProps {
    fileName: string;
}

export const BinaryWarning = ({ fileName }: BinaryWarningProps) => {
    return (
        <div className={styles.binaryWarning}>
            <div className={styles.binaryWarningContent}>
                <svg
                    className={styles.binaryWarningIcon}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                >
                    <path d="M7.56 1h.88l6.54 12.26-.44.74H1.44l-.42-.74L7.56 1zm.44 1.47L2.31 13h11.38L8 2.47zM8 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-.5-5h1v4h-1V6z" />
                </svg>
                <div className={styles.binaryWarningTextWrapper}>
                    <div className={styles.binaryWarningText}>
                        The file is not displayed in the editor because it is either binary or uses an unsupported text encoding.
                    </div>
                    <div className={styles.binaryWarningFile}>
                        {fileName}
                    </div>
                </div>
            </div>
        </div>
    );
};
