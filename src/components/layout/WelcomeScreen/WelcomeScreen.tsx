import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore, themes } from '../../../store/uiStore';
import { tauriApi } from '../../../lib/tauri-api';
import { Github } from 'lucide-react';
import { CloneRepoModal } from './CloneRepoModal';
import styles from './WelcomeScreen.module.css';

export const WelcomeScreen = () => {
  const { setWorkspace } = useProjectStore();
  const theme = useUIStore((state) => state.theme);
  const isLightTheme = themes[theme]?.type === 'light';
  const iconSrc = isLightTheme ? '/icon2.png' : '/icon.ico';
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  const handleOpenProject = async () => {
    try {
      const selectedFolder = await tauriApi.openFolderDialog();
      if (selectedFolder) {
        setWorkspace(selectedFolder);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
    }
  };

  const handleCloneRepo = () => {
    setIsCloneModalOpen(true);
  };

  const handleConnectSSH = () => {
    // TODO: Implement SSH connection dialog
    console.log('Connect via SSH clicked');
  };

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <img src={iconSrc} alt="Colbex" className={styles.logo} draggable={false} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
            <span className={styles.title}>COLBEX</span>
          </div>
          <div className={styles.options}>
            <button className={styles.option} onClick={handleOpenProject}>
              <svg className={styles.optionIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4.5h5l1.5 1.5H14v7H2V4.5z" />
                <path d="M2 4.5V3h5l1.5 1.5" />
              </svg>
              <span className={styles.optionLabel}>Open project</span>
            </button>

            <button className={styles.option} onClick={handleCloneRepo}>
              <Github className={styles.optionIcon} />
              <span className={styles.optionLabel}>Clone repo</span>
            </button>

            <button className={styles.option} onClick={handleConnectSSH}>
              <svg className={styles.optionIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="12" height="8" rx="1" />
                <path d="M4 7h2M4 9h4" />
              </svg>
              <span className={styles.optionLabel}>Connect via SSH</span>
            </button>
          </div>
        </div>
      </div>
      <CloneRepoModal isOpen={isCloneModalOpen} onClose={() => setIsCloneModalOpen(false)} />
    </>
  );
};
