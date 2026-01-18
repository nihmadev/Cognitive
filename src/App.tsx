import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Sidebar } from './components/layout/Sidebar';
import { SearchPane } from './components/layout/Search/SearchPane';
import { GitPane } from './components/layout/Git/GitPane';
import { CodeEditor } from './components/layout/Editor';
import { TerminalPanel } from './components/layout/terminal-panel';
import { MenuBar } from './components/layout/MenuBar';
import { AIAssistant } from './components/ai';
import { TabBar } from './components/layout/Tabs';
import { StatusBar } from './components/layout/StatusBar';
import { ActivityBar, type ActivityId } from './components/layout/ActivityBar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { NewFileModal } from './components/layout/NewFileModal';
import { useProjectStore } from './store/projectStore';
import { useAIStore } from './store/aiStore';
import { useUIStore } from './store/uiStore';
import { useEditorStore } from './store/editorStore';
import { useAutoSaveStore } from './store/autoSaveStore';
import { useGitStore } from './store/gitStore';
import { tauriApi } from './lib/tauri-api';
import { useResizablePanel } from './hooks/useResizablePanel';
import clsx from 'clsx';
import styles from './App.module.css'

function App() {
  const [activeActivity, setActiveActivity] = useState<ActivityId>('files');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const { showTerminal, openPorts, setTerminalOpen, showSidebar, zoomLevel, zoomIn, zoomOut, resetZoom, aiPanelWidth, setAIPanelWidth } = useUIStore();
  const uiStore = useUIStore();
  const { activeFile, closeFile, openSettingsTab, openProfilesTab, setWorkspace, currentWorkspace, openFileDialog, newFile, newTextFile, newFileWithExtension, createCustomFile, navigateHistory } = useProjectStore();
  const { toggleAssistant, isAssistantOpen, initializeAgentRouter, initializeModels, initializeApiKeys } = useAIStore();
  const { selectAll } = useEditorStore();
  const { saveOnFocusLoss, saveAllUnsaved } = useAutoSaveStore();
  const { files: gitFiles } = useGitStore();
  const fsRefreshTimerRef = useRef<number | null>(null);
  const aiPanel = useResizablePanel({
    defaultWidth: aiPanelWidth,
    minWidth: 300,
    maxWidth: 800,
    direction: 'left',
    onResize: setAIPanelWidth
  });
  useEffect(() => {
    if (Math.abs(aiPanel.width - aiPanelWidth) > 1) {
      setAIPanelWidth(aiPanel.width);
    }
  }, [aiPanel.width, aiPanelWidth, setAIPanelWidth]);

  // Helper function to check if editor is focused
  const isEditorFocused = () => {
    return document.activeElement?.closest('.monaco-editor') !== null;
  };
  useEffect(() => {
    // Apply zoom to the entire app by scaling the root element
    // This scales everything including layout, similar to VSCode
    const root = document.documentElement;
    root.style.setProperty('--zoom-level', zoomLevel.toString());
    
    // Apply zoom using transform on body for proper scaling
    const app = document.querySelector(`.${styles.app}`) as HTMLElement;
    if (app) {
      app.style.transform = `scale(${zoomLevel})`;
      app.style.transformOrigin = 'top left';
      // Ensure no gaps by using exact viewport dimensions
      // Account for the fixed MenuBar height (40px)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuBarHeight = 40;
      app.style.width = `${viewportWidth / zoomLevel}px`;
      app.style.height = `${(viewportHeight - menuBarHeight) / zoomLevel + menuBarHeight}px`;
      app.style.minWidth = `${viewportWidth / zoomLevel}px`;
      app.style.minHeight = `${(viewportHeight - menuBarHeight) / zoomLevel + menuBarHeight}px`;
    }
  }, [zoomLevel]);

  // Handle window resize to update zoom dimensions
  useEffect(() => {
    const handleResize = () => {
      const app = document.querySelector(`.${styles.app}`) as HTMLElement;
      if (app) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const menuBarHeight = 40;
        app.style.width = `${viewportWidth / zoomLevel}px`;
        app.style.height = `${(viewportHeight - menuBarHeight) / zoomLevel + menuBarHeight}px`;
        app.style.minWidth = `${viewportWidth / zoomLevel}px`;
        app.style.minHeight = `${(viewportHeight - menuBarHeight) / zoomLevel + menuBarHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomLevel]);

  // Handle initial state from CLI arguments and load last workspace
  useEffect(() => {
    console.log('App useEffect for initialization called');
    const initializeApp = async () => {
      try {
        console.log('App initialization starting...');
        // Initialize AI models
        console.log('About to call initializeModels...');
        await initializeModels();
        console.log('initializeModels completed');

        // Initialize API keys from backend
        console.log('About to call initializeApiKeys...');
        await initializeApiKeys();
        console.log('initializeApiKeys completed');

        // Initialize AgentRouter if API key is already set
        initializeAgentRouter();

        // First try to get initial state from CLI arguments
        const state = await tauriApi.getInitialState();
        if (state.workspace) {
          await setWorkspace(state.workspace);
          return;
        }

        // If no workspace from CLI, try to load last workspace
        const workspaceInitialized = await useProjectStore.getState().initWorkspace();

        if (!workspaceInitialized) {
          console.log('No previous workspace found');
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
      }
    };

    initializeApp();
  }, [setWorkspace, initializeAgentRouter, initializeModels, initializeApiKeys]);

  useEffect(() => {
    const unlisten = listen('select-all', () => {
      selectAll();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectAll]);

  // Listen for file system events from the watcher
  useEffect(() => {
    console.log('[FileWatcher] Setting up file-change event listener');
    
    // Helper to normalize paths for comparison
    const normalizePath = (path: string) => {
      return path.replace(/\\/g, '/').toLowerCase();
    };
    
    const unlistenFsEvents = listen('file-change', (event: any) => {
      const { kind, paths } = event.payload as { kind: string; paths: string[] };
      console.log(`[FileWatcher] File system event received [${kind}]:`, paths);

      const { markPathDeleted, markPathRestored, markPathsDeletedByPrefix, openFiles } = useProjectStore.getState();
      
      if (kind.includes('remove') || kind.includes('delete') || kind.includes('Remove')) {
        console.log('[FileWatcher] Processing delete event for paths:', paths);
        paths.forEach((eventPath: string) => {
          const normalizedEventPath = normalizePath(eventPath);
          
          // Check if any open file matches this path
          openFiles.forEach((openFile: string) => {
            const normalizedOpenFile = normalizePath(openFile);
            if (normalizedOpenFile === normalizedEventPath) {
              console.log('[FileWatcher] Marking file as deleted:', openFile);
              markPathDeleted(openFile);
            }
          });
          
          // Also mark the exact path
          markPathDeleted(eventPath);
          
          // If it's a directory, mark all files under it as deleted
          markPathsDeletedByPrefix(eventPath);
        });
      } else if (kind.includes('create') || kind.includes('Create')) {
        console.log('[FileWatcher] Processing create event for paths:', paths);
        paths.forEach((eventPath: string) => {
          const normalizedEventPath = normalizePath(eventPath);
          
          // Check if any open file matches this path
          openFiles.forEach((openFile: string) => {
            const normalizedOpenFile = normalizePath(openFile);
            if (normalizedOpenFile === normalizedEventPath) {
              console.log('[FileWatcher] Marking file as restored:', openFile);
              markPathRestored(openFile);
            }
          });
          
          markPathRestored(eventPath);
        });
      } else if (kind.includes('modify') || kind.includes('write') || kind.includes('Modify')) {
        // For modified files, just refresh workspace to update any UI state
        console.log('[FileWatcher] File modified:', paths);
      }

      // For all file system events, trigger a workspace refresh
      // We use a small debounce to prevent too many rapid refreshes
      const { refreshWorkspace } = useProjectStore.getState();
      if (fsRefreshTimerRef.current !== null) {
        window.clearTimeout(fsRefreshTimerRef.current);
      }
      fsRefreshTimerRef.current = window.setTimeout(() => {
        console.log('[FileWatcher] Refreshing workspace after file system event');
        refreshWorkspace().catch(console.error);
      }, 150);
    });

    // This is a backup in case the file-system-event doesn't catch everything
    const unlistenRefreshNeeded = listen('workspace-refresh-needed', async () => {
      console.log('Workspace refresh needed, refreshing...');
      const { refreshWorkspace } = useProjectStore.getState();
      await refreshWorkspace();
    });

    return () => {
      unlistenFsEvents.then(fn => fn());
      unlistenRefreshNeeded.then(fn => fn());
      if (fsRefreshTimerRef.current !== null) {
        window.clearTimeout(fsRefreshTimerRef.current);
        fsRefreshTimerRef.current = null;
      }
    };
  }, []);

  // Handle Ctrl+Wheel for zoom
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

  const handleOpenSettings = () => {
    openSettingsTab();
  };

  const handleNewFileModalOpen = () => {
    setIsNewFileModalOpen(true);
  };

  const handleFileTypeSelect = async (type: 'text' | 'notebook' | string, extension?: string) => {
    if (type === 'text') {
      await newTextFile();
    } else if (type === 'notebook') {
      await newFileWithExtension('.ipynb');
    } else if (type === 'custom' && extension) {
      // Custom file name with extension provided by user
      await createCustomFile(extension);
    } else {
      // Custom file type with extension
      await newFileWithExtension(extension);
    }
    setIsNewFileModalOpen(false);
  };

  // Override the store's openNewFileModal function with our implementation
  useEffect(() => {
    const store = useProjectStore.getState();
    store.openNewFileModal = handleNewFileModalOpen;
  }, [handleNewFileModalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+W - Close current tab (KeyW works on all layouts)
      if (event.ctrlKey && event.code === 'KeyW') {
        event.preventDefault();
        if (activeFile) {
          closeFile(activeFile);
        }
      }
      // Ctrl+= or Ctrl++ - Zoom In (support both code and key for different layouts)
      else if (event.ctrlKey && !event.shiftKey && !event.altKey && (
        event.code === 'Equal' ||
        event.code === 'NumpadAdd' ||
        event.key === '+' ||
        event.key === '='
      )) {
        event.preventDefault();
        event.stopPropagation();
        zoomIn();
      }
      // Ctrl+- - Zoom Out (support both code and key for different layouts)
      else if (event.ctrlKey && !event.shiftKey && !event.altKey && (
        event.code === 'Minus' ||
        event.code === 'NumpadSubtract' ||
        event.key === '-'
      )) {
        event.preventDefault();
        event.stopPropagation();
        zoomOut();
      }
      // Ctrl+0 - Reset Zoom
      else if (event.ctrlKey && !event.shiftKey && !event.altKey && (
        event.code === 'Digit0' ||
        event.code === 'Numpad0' ||
        event.key === '0'
      )) {
        event.preventDefault();
        event.stopPropagation();
        resetZoom();
      }
      // Ctrl+` - Toggle Terminal
      else if (event.ctrlKey && event.code === 'Backquote') {
        event.preventDefault();
        setTerminalOpen(!showTerminal);
      }
      // Ctrl+Shift+` - Open Ports
      else if (event.ctrlKey && event.shiftKey && event.code === 'Backquote') {
        event.preventDefault();
        openPorts();
      }
      // Ctrl+, - Settings
      else if (event.ctrlKey && event.code === 'Comma') {
        event.preventDefault();
        openSettingsTab();
      }
      // Ctrl+Shift+A - Toggle Assistant
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        toggleAssistant();
      }
      // Ctrl+A - Select All (only when not focused in editor)
      else if (event.ctrlKey && event.code === 'KeyA' && !isEditorFocused()) {
        event.preventDefault();
        selectAll();
      }
      // Ctrl+P - Command Palette
      else if (event.ctrlKey && event.code === 'KeyP' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        return;
      }
      // Let MenuBar handle this - prevent default to avoid conflicts
      else if (event.ctrlKey && event.code === 'KeyP') {
        event.preventDefault();
        return;
      }
      // Ctrl+O - Open Folder (KeyO works on all layouts)
      else if (event.ctrlKey && event.code === 'KeyO') {
        event.preventDefault();
        openFileDialog();
      }
      // Ctrl+N - New File Modal (KeyN works on all layouts, but not Ctrl+Alt+N or Ctrl+Shift+N)
      else if (event.ctrlKey && event.code === 'KeyN' && !event.altKey && !event.shiftKey) {
        console.log('App.tsx: Ctrl+N detected');
        event.preventDefault();
        handleNewFileModalOpen();
      }
      // Ctrl+Shift+N - New Window
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyN') {
        console.log('App.tsx: Ctrl+Shift+N detected');
        event.preventDefault();
        tauriApi.openNewWindow('', 'default').catch(console.error);
      }
      // Alt+Left - Navigate Back
      else if (event.altKey && (event.code === 'ArrowLeft' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        event.stopPropagation();
        navigateHistory('back');
      }
      // Alt+Right - Navigate Forward  
      else if (event.altKey && (event.code === 'ArrowRight' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        navigateHistory('forward');
      }
    };

    // Handle window focus loss for AutoSave
    const handleWindowBlur = async () => {
      if (saveOnFocusLoss) {
        await saveAllUnsaved();
      }
    };

    // Use capture phase to ensure it runs before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeFile, closeFile, zoomIn, zoomOut, resetZoom, showTerminal, setTerminalOpen, openPorts, openSettingsTab, toggleAssistant, selectAll, openFileDialog, newFile, handleNewFileModalOpen, setActiveActivity, uiStore, saveOnFocusLoss, saveAllUnsaved, navigateHistory]);

  const handleOpenKeyboardShortcuts = () => {
    openSettingsTab('keybindings');
  };

  const handleOpenProfiles = () => {
    openProfilesTab();
  };

  const handleActivityChange = (activity: ActivityId) => {
    setActiveActivity(activity);
  };

  // Show welcome screen when no workspace is open
  if (!currentWorkspace) {
    return (
      <div className={styles.app}>
        <MenuBar
          onOpenSettings={handleOpenSettings}
          onOpenKeyboardShortcuts={handleOpenKeyboardShortcuts}
          onOpenProfiles={handleOpenProfiles}
        />
        <WelcomeScreen />
        <StatusBar />
        {/* New File Modal */}
        <NewFileModal
          isOpen={isNewFileModalOpen}
          onClose={() => setIsNewFileModalOpen(false)}
          onSelectFileType={handleFileTypeSelect}
        />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Menu Bar */}
      <MenuBar
        onOpenSettings={handleOpenSettings}
        onOpenKeyboardShortcuts={handleOpenKeyboardShortcuts}
        onOpenProfiles={handleOpenProfiles}
      />

      {/* Main Workspace Area */}
      <div className={styles.main}>
        {/* Activity Bar (Leftmost narrow strip) */}
        <ActivityBar
          activeItem={activeActivity}
          onActivityChange={handleActivityChange}
          gitChangesCount={gitFiles.length}
        />

        {/* Sidebar - logic to show/hide based on activity could go here */}
        {showSidebar && activeActivity === 'files' && <Sidebar />}
        {showSidebar && activeActivity === 'search' && <SearchPane />}
        {showSidebar && activeActivity === 'git' && <GitPane />}

        {/* Main Content Area */}
        <div className={styles.content}>
          <TabBar />
          {/* BreadcrumbBar moved inside CodeEditor */}
          <CodeEditor />
          {showTerminal && <TerminalPanel />}
        </div>

        {/* Debug logging for assistant state */}
        {(() => { console.log('App render - isAssistantOpen:', isAssistantOpen, 'currentWorkspace:', !!currentWorkspace); return null; })()}

        {isAssistantOpen && (
          <div
            ref={aiPanel.panelRef}
            className={styles.aiPanelWrapper}
            style={{ width: aiPanel.width }}
          >
            <div
              className={clsx(styles.aiResizeHandle, aiPanel.isResizing && styles.isResizing)}
              onMouseDown={aiPanel.handleMouseDown}
            />
            <div className={styles.aiPanel}>
              <AIAssistant />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* New File Modal */}
      <NewFileModal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        onSelectFileType={handleFileTypeSelect}
      />
    </div>
  );
}

export default App;
