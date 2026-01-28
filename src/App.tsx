import { useState, useEffect, useMemo } from 'react';
import { type ActivityId } from './components/layout/ActivityBar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { AppLayout } from './components/layout/AppLayout';
import { MainContent } from './components/layout/MainContent';
import { useProjectStore } from './store/projectStore';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useFileWatcher } from './hooks/useFileWatcher';
import { useZoomControl } from './hooks/useZoomControl';
import { useKeyboardManager } from './hooks/useKeyboardManager';
import { useAutoSave } from './hooks/useAutoSave';
import { useSelectAllListener } from './hooks/useSelectAllListener';
import { useTauriMenu } from './hooks/useTauriMenu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createMenuStructure } from './components/layout/MenuBar/menuStructure';

function App() {
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const { currentWorkspace, openSettingsTab, openProfilesTab, newTextFile, newFileWithExtension, createCustomFile } = useProjectStore();
  
  // Create menu structure once and pass to keyboard manager
  const menuStructure = useMemo(() => {
    const window = getCurrentWindow();
    return createMenuStructure({
      setWorkspace: () => {},
      openFile: () => {},
      closeFile: () => {},
      closeWorkspace: () => {},
      activeFile: null,
      openFiles: [],
      window,
      handlePaletteOpen: () => {},
      handleGoToFileOpen: () => {},
      selectAll: () => {},
      save: async () => {},
      saveAs: async () => {},
      openNewFileModal: () => {},
      autoSaveStore: {},
      navigateHistory: () => {},
      nextEditor: () => {},
      previousEditor: () => {},
      goToNextErrorInFiles: () => {},
      goToPrevErrorInFiles: () => {},
      goToLastEditLocation: () => {},
      goToLastLocation: () => {},
      runAction: () => {},
      hasWorkspace: !!currentWorkspace,
    });
  }, [currentWorkspace]);

  useAppInitialization();
  useFileWatcher();
  useZoomControl();
  useSelectAllListener();
  useAutoSave();
  useTauriMenu();



  const handleNewFileModalOpen = () => {
    setIsNewFileModalOpen(true);
  };

  const handleToggleGitPanel = () => {
    setActiveActivity('git');
  };

  useKeyboardManager({ 
    onNewFileModalOpen: handleNewFileModalOpen, 
    onToggleGitPanel: handleToggleGitPanel,
    menuStructure
  });

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
      />
    </AppLayout>
  );
}

export default App;
