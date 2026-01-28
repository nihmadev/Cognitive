import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import styles from '../App.module.css';

export const useZoomControl = () => {
  const { zoomLevel, zoomIn, zoomOut } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--zoom-level', zoomLevel.toString());

    const app = document.querySelector(`.${styles.app}`) as HTMLElement;
    if (app) {
      app.style.transform = `scale(${zoomLevel})`;
      app.style.transformOrigin = 'top left';

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      app.style.width = `${viewportWidth / zoomLevel}px`;
      app.style.height = `${viewportHeight / zoomLevel}px`;
      app.style.minWidth = `${viewportWidth / zoomLevel}px`;
      app.style.minHeight = `${viewportHeight / zoomLevel}px`;
    }
  }, [zoomLevel]);

  useEffect(() => {
    const handleResize = () => {
      const app = document.querySelector(`.${styles.app}`) as HTMLElement;
      if (app) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const { zoomLevel } = useUIStore.getState();
        app.style.width = `${viewportWidth / zoomLevel}px`;
        app.style.height = `${viewportHeight / zoomLevel}px`;
        app.style.minWidth = `${viewportWidth / zoomLevel}px`;
        app.style.minHeight = `${viewportHeight / zoomLevel}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        if (event.deltaY < 0) {
          zoomIn();
        } else if (event.deltaY > 0) {
          zoomOut();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);
};
