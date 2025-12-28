import React, { useState, useEffect } from 'react';
import { tauriApi } from '../../lib/tauri-api';
import styles from './ImageViewer.module.css';

interface ImageViewerProps {
    path: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ path }) => {
    const [assetUrl, setAssetUrl] = useState<string>('');
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [icoDataUrl, setIcoDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        let isMounted = true;
        const isSvg = path.toLowerCase().endsWith('.svg');
        const isIco = path.toLowerCase().endsWith('.ico');

        const loadMedia = async () => {
            setLoading(true);
            try {
                if (isSvg) {
                    const content = await tauriApi.readFile(path);
                    if (isMounted) {
                        setSvgContent(content);
                        setAssetUrl('');
                        setIcoDataUrl(null);
                        setLoading(false);
                    }
                } else if (isIco) {
                    // Read .ico files as binary and convert to data URL
                    const binaryData = await tauriApi.readFileBinary(path);
                    if (isMounted) {
                        const byteArray = new Uint8Array(binaryData);
                        const blob = new Blob([byteArray], { type: 'image/x-icon' });
                        const dataUrl = URL.createObjectURL(blob);
                        setIcoDataUrl(dataUrl);
                        setAssetUrl('');
                        setSvgContent(null);
                        setLoading(false);
                    }
                } else {
                    const url = await tauriApi.getAssetUrl(path);
                    if (isMounted) {
                        setAssetUrl(url);
                        setSvgContent(null);
                        setIcoDataUrl(null);
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Failed to load media:', error);
                if (isMounted) setLoading(false);
            }
        };

        loadMedia();
        return () => { 
            isMounted = false; 
            // Clean up object URL to prevent memory leaks
            if (icoDataUrl) {
                URL.revokeObjectURL(icoDataUrl);
            }
        };
    }, [path]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(prevScale => {
                const newScale = prevScale + delta;
                return Math.min(Math.max(0.1, newScale), 5);
            });
        }
    };


    return (
        <div className={styles.root}>
            {/* Main Viewport */}
            <div 
                className={styles.viewport}
                onWheel={handleWheel}
            >
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <div>
                        <div
                            className={styles.canvas}
                        >
                            {svgContent ? (
                                <div
                                    className={styles.media}
                                    dangerouslySetInnerHTML={{ __html: svgContent }}
                                    style={{ ['--scale' as any]: scale }}
                                />
                            ) : (
                                <img
                                    src={assetUrl || icoDataUrl || ''}
                                    alt="Preview"
                                    className={styles.img + ' ' + styles.media}
                                    style={{
                                        display: (assetUrl || icoDataUrl) ? 'block' : 'none',
                                        ['--scale' as any]: scale
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
