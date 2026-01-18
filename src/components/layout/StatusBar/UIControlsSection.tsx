import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlassPlus, faMagnifyingGlassMinus } from '@fortawesome/free-solid-svg-icons';
import styles from '../../../App.module.css';

interface UIControlsSectionProps {
    insertMode: boolean;
    zoomLevel: number;
    onToggleInsertMode: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
}

export const UIControlsSection: React.FC<UIControlsSectionProps> = ({
    insertMode,
    zoomLevel,
    onToggleInsertMode,
    onZoomIn,
    onZoomOut,
    onResetZoom
}) => {
    return (
        <>
            <span
                className={styles.statusItem}
                onClick={onToggleInsertMode}
                style={{ cursor: 'pointer', minWidth: '32px', textAlign: 'center' }}
                title="Toggle Insert/Overtype mode (Insert key)"
            >
                {insertMode ? 'INS' : 'OVR'}
            </span>

            <span className={styles.statusItem} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                    onClick={onZoomOut}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 2px',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Zoom Out (Ctrl+-)"
                >
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} style={{ fontSize: '12px' }} />
                </button>
                <span
                    onClick={onResetZoom}
                    style={{ cursor: 'pointer', minWidth: '40px', textAlign: 'center' }}
                    title="Reset Zoom (Ctrl+0)"
                >
                    {Math.round(zoomLevel * 100)}%
                </span>
                <button
                    onClick={onZoomIn}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 2px',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Zoom In (Ctrl++)"
                >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} style={{ fontSize: '12px' }} />
                </button>
            </span>
        </>
    );
};
