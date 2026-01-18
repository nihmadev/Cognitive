import React from 'react';
import styles from '../../../App.module.css';

interface EditorInfoSectionProps {
    line: number;
    column: number;
    language: string;
    lineCount: number;
}

export const EditorInfoSection: React.FC<EditorInfoSectionProps> = ({
    line,
    column,
    language,
    lineCount
}) => {
    return (
        <>
            <span className={styles.statusItem}>
                Ln {line}, Col {column}
            </span>
            <span className={styles.statusItem}>UTF-8</span>
            <span className={styles.statusItem}>{language}</span>
            <span className={styles.statusItem}>Lines: {lineCount}</span>
        </>
    );
};
