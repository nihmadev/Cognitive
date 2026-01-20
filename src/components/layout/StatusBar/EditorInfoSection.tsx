import React from 'react';
import styles from '../../../App.module.css';

interface EditorInfoSectionProps {
    line: number;
    column: number;
    language: string;
    lineCount: number;
    encoding: string;
    lineEnding: 'CRLF' | 'LF' | 'Mixed';
    indentation: { type: 'Spaces' | 'Tabs' | 'Mixed'; size?: number };
}

export const EditorInfoSection: React.FC<EditorInfoSectionProps> = ({
    line,
    column,
    language,
    lineCount,
    encoding,
    lineEnding,
    indentation
}) => {
    const getIndentationDisplay = () => {
        if (indentation.type === 'Tabs') return 'Tabs';
        if (indentation.type === 'Mixed') return 'Mixed';
        return `Spaces: ${indentation.size || 4}`;
    };

    return (
        <>
            <span className={styles.statusItem}>
                Ln {line}, Col {column}
            </span>
            <span className={styles.statusItem}>{encoding}</span>
            <span className={styles.statusItem}>{lineEnding}</span>
            <span className={styles.statusItem}>{getIndentationDisplay()}</span>
            <span className={styles.statusItem}>{language}</span>
            <span className={styles.statusItem}>Lines: {lineCount}</span>
        </>
    );
};
