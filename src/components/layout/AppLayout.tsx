import { ReactNode } from 'react';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { NewFileModal } from './NewFile';
import { GlobalAudioPlayer } from './AudioPlayer/GlobalAudioPlayer';
import { FloatingAudioPlayer } from './AudioPlayer/FloatingAudioPlayer';
import { AIAssistant } from '../ai/Assistant';
import { useAIStore } from '../../store/aiStore';
import { useAssistantResize } from '../../hooks/useAssistantResize';
import { useProjectStore } from '../../store/projectStore';
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
  const { isAssistantOpen } = useAIStore();
  const { assistantRef, resizeHandleRef, isResizing } = useAssistantResize();
  const { currentWorkspace } = useProjectStore();

  const hasWorkspace = !!currentWorkspace;

  return (
    <div className={styles.app}>
      <div className={styles.menuBarContainer}>
        <MenuBar
          onOpenSettings={onOpenSettings}
          onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
          onOpenProfiles={onOpenProfiles}
        />
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
        
        {hasWorkspace && isAssistantOpen && (
          <div className={styles.assistantPanelWrapper}>
            <div 
              ref={resizeHandleRef}
              className={`${styles.assistantResizeHandle} ${isResizing ? styles.isResizing : ''}`}
            />
            <div ref={assistantRef} className={styles.assistantPanel}>
              <AIAssistant />
            </div>
          </div>
        )}
      </div>

      {hasWorkspace && <StatusBar />}

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
