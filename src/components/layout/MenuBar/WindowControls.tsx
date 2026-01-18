import { useEffect, useState } from 'react';
import { getCurrentWindow, PhysicalPosition, PhysicalSize, currentMonitor } from '@tauri-apps/api/window';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, CloseIcon } from './icons';
import styles from './WindowControls.module.css';

interface SnapTarget {
    x: number;
    y: number;
    w: number;
    h: number;
}

export const WindowControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        const updateState = async () => {
            setIsMaximized(await appWindow.isMaximized());
        };

        updateState();

        
        let unlisten: (() => void) | undefined;
        appWindow.onResized(() => {
            updateState();
        }).then((u: () => void) => { unlisten = u; });

        
        const interval = setInterval(updateState, 1000);

        return () => {
            if (unlisten) unlisten();
            clearInterval(interval);
        };
    }, []);

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = async () => {
        if (isMaximized) {
            await appWindow.unmaximize();
        } else {
            await appWindow.maximize();
        }
    };
    const handleClose = () => appWindow.close();

    const handleSnap = async (target: SnapTarget) => {
        const monitor = await currentMonitor();
        if (!monitor) return;

        const screenW = monitor.size.width; 
        const screenH = monitor.size.height; 

        
        const newX = Math.round(target.x * screenW);
        const newY = Math.round(target.y * screenH);
        const newW = Math.round(target.w * screenW);
        const newH = Math.round(target.h * screenH);

        if (await appWindow.isMaximized()) {
            await appWindow.unmaximize();
        }

        await appWindow.setPosition(new PhysicalPosition(newX, newY));
        await appWindow.setSize(new PhysicalSize(newW, newH));
    };

    return (
        <div className={styles.root}>
            <button className={styles.button} onClick={handleMinimize} title="Minimize">
                <MinimizeIcon />
            </button>

            <div className={styles.maximizeContainer}>
                <button className={styles.button} onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
                    {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                </button>

                {}
                <div className={styles.snapMenu}>
                    {}
                    <div className={styles.layoutPreview} title="Split 50/50">
                        <div className={`${styles.zone} ${styles.split50}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0, y: 0, w: 0.5, h: 1 }); }} />
                        <div className={`${styles.zone} ${styles.split50}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0.5, y: 0, w: 0.5, h: 1 }); }} />
                    </div>

                    {}
                    <div className={styles.layoutPreview} title="Split 66/33">
                        <div className={`${styles.zone} ${styles.split60}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0, y: 0, w: 0.66, h: 1 }); }} />
                        <div className={`${styles.zone} ${styles.split40}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0.66, y: 0, w: 0.34, h: 1 }); }} />
                    </div>

                    {}
                    <div className={`${styles.layoutPreview} ${styles.quarters}`} title="Quarters">
                        <div className={`${styles.zone} ${styles.quarter}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0, y: 0, w: 0.5, h: 0.5 }); }} />
                        <div className={`${styles.zone} ${styles.quarter}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0.5, y: 0, w: 0.5, h: 0.5 }); }} />
                        <div className={`${styles.zone} ${styles.quarter}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0, y: 0.5, w: 0.5, h: 0.5 }); }} />
                        <div className={`${styles.zone} ${styles.quarter}`}
                            onClick={(e) => { e.stopPropagation(); handleSnap({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }); }} />
                    </div>
                </div>
            </div>

            <button className={`${styles.button} ${styles.close}`} onClick={handleClose} title="Close">
                <CloseIcon />
            </button>
        </div>
    );
};
