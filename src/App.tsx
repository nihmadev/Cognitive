import { useState, useEffect } from 'react';
import { type ActivityId } from './components/layout/ActivityBar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { AppLayout } from './components/layout/AppLayout';
import { MainContent } from './components/layout/MainContent';
import { useProjectStore } from './store/projectStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useFileWatcher } from './hooks/useFileWatcher';
import { useZoomControl } from './hooks/useZoomControl';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';
import { useSelectAllListener } from './hooks/useSelectAllListener';
import { useAIPanelResize } from './hooks/useAIPanelResize';

function App() {
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const { currentWorkspace, openSettingsTab, openProfilesTab, newTextFile, newFileWithExtension, createCustomFile } = useProjectStore();

  useAppInitialization();
  useFileWatcher();
  useZoomControl();
  useSelectAllListener();
  useAutoSave();

  const aiPanel = useAIPanelResize();


  const handleNewFileModalOpen = () => {
    setIsNewFileModalOpen(true);
  };

  useKeyboardShortcuts({ onNewFileModalOpen: handleNewFileModalOpen });

  const handleFileTypeSelect = async (type: 'text' | 'notebook' | string, extension?: string) => {
    if (type === 'text') {
      await newTextFile();
    } else if (type === 'notebook') {
      await newFileWithExtension('.ipynb');
    } else if (type === 'custom' && extension) {
      await createCustomFile(extension);
    } else {
      await newFileWithExtension(extension);
    }
    setIsNewFileModalOpen(false);
  };

  const handleOpenSettings = () => {
    openSettingsTab();
  };

  const handleOpenKeyboardShortcuts = () => {
    openSettingsTab('keybindings');
  };

  const handleOpenProfiles = () => {
    openProfilesTab();
  };

  const handleActivityChange = (activity: ActivityId) => {
    setActiveActivity(activity);
  };

  useEffect(() => {
    const store = useProjectStore.getState();
    store.openNewFileModal = handleNewFileModalOpen;
  }, []);

  if (!currentWorkspace) {
    return (
      <AppLayout
        onOpenSettings={handleOpenSettings}
        onOpenKeyboardShortcuts={handleOpenKeyboardShortcuts}
        onOpenProfiles={handleOpenProfiles}
        isNewFileModalOpen={isNewFileModalOpen}
        onCloseNewFileModal={() => setIsNewFileModalOpen(false)}
        onSelectFileType={handleFileTypeSelect}
      >
        <WelcomeScreen />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      onOpenSettings={handleOpenSettings}
      onOpenKeyboardShortcuts={handleOpenKeyboardShortcuts}
      onOpenProfiles={handleOpenProfiles}
      isNewFileModalOpen={isNewFileModalOpen}
      onCloseNewFileModal={() => setIsNewFileModalOpen(false)}
      onSelectFileType={handleFileTypeSelect}
    >
      <MainContent
        activeActivity={activeActivity}
        onActivityChange={handleActivityChange}
        aiPanelRef={aiPanel.panelRef}
        aiPanelWidth={aiPanel.width}
        isAIResizing={aiPanel.isResizing}
        onAIResizeStart={aiPanel.handleMouseDown}
      />
    </AppLayout>
  );
}

export default App;
