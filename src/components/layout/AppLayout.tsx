import { ReactNode } from 'react';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { NewFileModal } from './NewFile';
import { GlobalAudioPlayer } from './AudioPlayer/GlobalAudioPlayer';
import { FloatingAudioPlayer } from './AudioPlayer/FloatingAudioPlayer';
import styles from '../../App.module.css';

interface AppLayoutProps {
  children: ReactNode;
  onOpenSettings: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenProfiles: () => void;
  isNewFileModalOpen: boolean;
  onCloseNewFileModal: () => void;
  onSelectFileType: (type: 'text' | 'notebook' | string, extension?: string) => Promise<void>;
}

export const AppLayout = ({
  children,
  onOpenSettings,
  onOpenKeyboardShortcuts,
  onOpenProfiles,
  isNewFileModalOpen,
  onCloseNewFileModal,
  onSelectFileType
}: AppLayoutProps) => {
  return (
    <div className={styles.app}>
      <MenuBar
        onOpenSettings={onOpenSettings}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
        onOpenProfiles={onOpenProfiles}
      />

      {children}

      <StatusBar />

      <GlobalAudioPlayer />
      <FloatingAudioPlayer />

      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={onCloseNewFileModal}
        onSelectFileType={onSelectFileType}
      />
    </div>
  );
};
