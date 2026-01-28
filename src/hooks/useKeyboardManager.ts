import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useUIStore } from '../store/uiStore';
import { useAutoSaveStore } from '../store/autoSaveStore';
import { useKeyboardLayout } from './useKeyboardLayout';
import { tauriApi } from '../lib/tauri-api';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface KeyboardManagerProps {
  onNewFileModalOpen: () => void;
  onToggleGitPanel?: () => void;
  menuStructure?: any[];
}

const KEYBINDING_MAP: Record<string, string> = {
  'KeyZ': 'z',
  'KeyY': 'y',
  'KeyC': 'c',
  'KeyV': 'v',
  'KeyX': 'x',
  'KeyA': 'a',
  'KeyF': 'f',
  'KeyH': 'h',
  'KeyD': 'd',
  'KeyL': 'l',
  'KeyK': 'k',
  'KeyG': 'g',
  'KeyP': 'p',
  'KeyS': 's',
  'KeyW': 'w',
  'KeyO': 'o',
  'KeyN': 'n',
  'KeyM': 'm',
  'Comma': ',',
  'Period': '.',
  'Slash': '/',
  'Backquote': '`',
  'Minus': '-',
  'Equal': '=',
  'BracketLeft': '[',
  'BracketRight': ']',
  'Semicolon': ';',
  'Quote': "'",
  'Backslash': '\\',
  'Digit0': '0',
  'Digit1': '1',
  'Digit2': '2',
  'Digit3': '3',
  'Digit4': '4',
  'Digit5': '5',
  'Digit6': '6',
  'Digit7': '7',
  'Digit8': '8',
  'Digit9': '9',
  'F2': 'f2',
  'F8': 'f8',
  'F12': 'f12',
};

const isEditorFocused = () => {
  return document.activeElement?.closest('.monaco-editor') !== null;
};

const isInputElement = (target: EventTarget | null) => {
  return target instanceof HTMLInputElement || 
         target instanceof HTMLTextAreaElement ||
         target instanceof HTMLSelectElement;
};

export const useKeyboardManager = ({ 
  onNewFileModalOpen, 
  onToggleGitPanel,
  menuStructure = []
}: KeyboardManagerProps) => {
  const keyboardLayout = useKeyboardLayout();
  
  const { 
    activeFile, 
    closeFile, 
    closeWorkspace, 
    openSettingsTab, 
    openFileDialog, 
    navigateHistory, 
    setWorkspace,
    saveFile,
    unsavedChanges,
    currentWorkspace,
    fileContents,
    activeDiffTab,
    openDiffTabs,
    closeDiffTab,
    activeSettingsTab,
    openSettingsTabs,
    closeSettingsTab,
    activeProfilesTab,
    openProfilesTabs,
    closeProfilesTab,
    activeTimelineDiffTab,
    openTimelineDiffTabs,
    closeTimelineDiffTab,
    activeCommitDiffTab,
    openCommitDiffTabs,
    closeCommitDiffTab
  } = useProjectStore();
  
  const { 
    showTerminal, 
    setTerminalOpen, 
    openPorts, 
    zoomIn, 
    zoomOut, 
    resetZoom,
    toggleInsertMode
  } = useUIStore();
  
  const { selectAll, editorInstance, monacoInstance } = useEditorStore();
  const autoSaveStore = useAutoSaveStore();
  
  const isKPressed = useRef(false);
  const handlersRef = useRef<Map<string, Function>>(new Map());

  // Register keyboard handlers
  const registerHandler = useCallback((key: string, handler: Function) => {
    handlersRef.current.set(key, handler);
  }, []);

  // Menu shortcut handler
  const handleMenuShortcuts = useCallback((e: KeyboardEvent): boolean => {
    if (!menuStructure.length) return false;

    for (const category of menuStructure) {
      for (const item of category.items) {
        if (!item.isSeparator && item.shortcut && item.action) {
          const shortcut = item.shortcut.toLowerCase().replace(/\s+/g, '');
          const keys = [];
          
          if (e.ctrlKey || e.metaKey) keys.push('ctrl');
          if (e.shiftKey) keys.push('shift');
          if (e.altKey) keys.push('alt');
          
          let keyCode = e.code;
          if (keyCode.startsWith('Key')) keyCode = keyCode.substring(3).toLowerCase();
          else if (keyCode.startsWith('Digit')) keyCode = keyCode.substring(5).toLowerCase();
          else if (keyCode === 'PageDown') keyCode = 'pagedown';
          else if (keyCode === 'PageUp') keyCode = 'pageup';
          else if (keyCode === 'ArrowLeft') keyCode = 'left';
          else if (keyCode === 'ArrowRight') keyCode = 'right';
          else keyCode = keyCode.toLowerCase();

          keys.push(keyCode);
          const currentShortcut = keys.join('+');
          
          if (currentShortcut === shortcut) {
            e.preventDefault();
            e.stopPropagation();
            item.action();
            return true;
          }
        }
      }
    }
    return false;
  }, [menuStructure]);

  // Editor-specific shortcuts
  const handleEditorShortcuts = useCallback((e: KeyboardEvent): boolean => {
    if (!editorInstance || !isEditorFocused()) return false;

    const physicalKey = KEYBINDING_MAP[e.code];
    const hasModifier = e.ctrlKey || e.metaKey;

    if (!hasModifier || !physicalKey) return false;

    // Save
    if (physicalKey === 's') {
      e.preventDefault();
      if (activeFile && unsavedChanges[activeFile]) {
        saveFile(activeFile);
      }
      return true;
    }

    // Undo/Redo
    if (physicalKey === 'z' && !e.shiftKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'undo', null);
      return true;
    }

    if (physicalKey === 'z' && e.shiftKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'redo', null);
      return true;
    }

    if (physicalKey === 'y' && !e.shiftKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'redo', null);
      return true;
    }

    // Select All
    if (physicalKey === 'a' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'editor.action.selectAll', null);
      return true;
    }

    // Find
    if (physicalKey === 'f' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'actions.find', null);
      return true;
    }

    // Replace
    if (physicalKey === 'h' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
      return true;
    }

    // Add selection to next find match
    if (physicalKey === 'd' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null);
      return true;
    }

    // Go to line
    if (physicalKey === 'g' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      editorInstance.trigger('keyboard', 'editor.action.gotoLine', null);
      return true;
    }

    // F2 for rename
    if (physicalKey === 'f2' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('start-rename'));
      return true;
    }

    return false;
  }, [editorInstance, activeFile, unsavedChanges, saveFile]);

  // Global shortcuts
  const handleGlobalShortcuts = useCallback((e: KeyboardEvent): boolean => {
    // Handle non-Latin keyboard layouts by using physical key codes
    // This ensures shortcuts work regardless of keyboard layout
    const physicalKey = KEYBINDING_MAP[e.code];
    const hasModifier = e.ctrlKey || e.metaKey;

    // For non-Latin layouts, use physical key detection for all shortcuts
    if (!keyboardLayout.isLatin && physicalKey && hasModifier) {
      // Window controls
      if (e.shiftKey && physicalKey === 'w') {
        e.preventDefault();
        getCurrentWindow().close();
        return true;
      }

      if (physicalKey === 'w') {
        e.preventDefault();
        // Close tabs in priority order: Settings -> Profiles -> Diff -> Timeline -> Commit -> Regular file
        if (activeSettingsTab) {
          closeSettingsTab(activeSettingsTab);
        } else if (activeProfilesTab) {
          closeProfilesTab(activeProfilesTab);
        } else if (activeDiffTab) {
          closeDiffTab(activeDiffTab);
        } else if (activeTimelineDiffTab) {
          closeTimelineDiffTab(activeTimelineDiffTab);
        } else if (activeCommitDiffTab) {
          closeCommitDiffTab(activeCommitDiffTab);
        } else if (activeFile) {
          closeFile(activeFile);
        }
        return true;
      }

      // File operations
      if (physicalKey === 'o') {
        e.preventDefault();
        openFileDialog();
        return true;
      }

      if (e.shiftKey && physicalKey === 'n') {
        e.preventDefault();
        tauriApi.openNewWindow('', 'default').catch(() => {});
        return true;
      }

      if (physicalKey === 'n') {
        e.preventDefault();
        onNewFileModalOpen();
        return true;
      }

      // Settings
      if (physicalKey === ',') {
        e.preventDefault();
        openSettingsTab();
        return true;
      }

      // Terminal
      if (physicalKey === '`') {
        e.preventDefault();
        setTerminalOpen(!showTerminal);
        return true;
      }

      if (e.shiftKey && physicalKey === '`') {
        e.preventDefault();
        openPorts();
        return true;
      }

      // Git panel
      if (e.shiftKey && physicalKey === 'g') {
        e.preventDefault();
        onToggleGitPanel?.();
        return true;
      }

      // Zoom controls
      if (physicalKey === '=' || physicalKey === '+') {
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
        return true;
      }

      if (physicalKey === '-') {
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
        return true;
      }

      if (physicalKey === '0') {
        e.preventDefault();
        e.stopPropagation();
        resetZoom();
        return true;
      }

      // Ctrl+K chords
      if (physicalKey === 'k') {
        isKPressed.current = true;
        return true;
      }
    }

    // Ctrl+K chords (for Latin layouts or when K was pressed)
    if (e.ctrlKey && e.code === 'KeyK') {
      isKPressed.current = true;
      return true;
    }

    if (isKPressed.current) {
      isKPressed.current = false;
      
      if (e.code === 'KeyF') {
        e.preventDefault();
        closeWorkspace();
        return true;
      }
      
      if (e.code === 'KeyS') {
        e.preventDefault();
        autoSaveStore.saveAllUnsaved();
        return true;
      }
      
      if (e.ctrlKey && e.code === 'KeyO') {
        e.preventDefault();
        tauriApi.openFolderDialog().then(path => {
          if (path) setWorkspace(path);
        });
        return true;
      }
      
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        openSettingsTab();
        return true;
      }
    }

    // Window controls (for Latin layouts)
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
      e.preventDefault();
      getCurrentWindow().close();
      return true;
    }

    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault();
      // Close tabs in priority order: Settings -> Profiles -> Diff -> Timeline -> Commit -> Regular file
      if (activeSettingsTab) {
        closeSettingsTab(activeSettingsTab);
      } else if (activeProfilesTab) {
        closeProfilesTab(activeProfilesTab);
      } else if (activeDiffTab) {
        closeDiffTab(activeDiffTab);
      } else if (activeTimelineDiffTab) {
        closeTimelineDiffTab(activeTimelineDiffTab);
      } else if (activeCommitDiffTab) {
        closeCommitDiffTab(activeCommitDiffTab);
      } else if (activeFile) {
        closeFile(activeFile);
      }
      return true;
    }

    // Zoom controls
    if (e.ctrlKey && !e.shiftKey && !e.altKey && (
      e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '+' || e.key === '='
    )) {
      e.preventDefault();
      e.stopPropagation();
      zoomIn();
      return true;
    }

    if (e.ctrlKey && !e.shiftKey && !e.altKey && (
      e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-'
    )) {
      e.preventDefault();
      e.stopPropagation();
      zoomOut();
      return true;
    }

    if (e.ctrlKey && !e.shiftKey && !e.altKey && (
      e.code === 'Digit0' || e.code === 'Numpad0' || e.key === '0'
    )) {
      e.preventDefault();
      e.stopPropagation();
      resetZoom();
      return true;
    }

    // Terminal
    if (e.ctrlKey && e.code === 'Backquote') {
      e.preventDefault();
      setTerminalOpen(!showTerminal);
      return true;
    }

    if (e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
      e.preventDefault();
      openPorts();
      return true;
    }

    // Settings
    if (e.ctrlKey && e.code === 'Comma') {
      e.preventDefault();
      openSettingsTab();
      return true;
    }

    // Select All (when not in editor)
    if (e.ctrlKey && e.code === 'KeyA' && !isEditorFocused()) {
      e.preventDefault();
      selectAll();
      return true;
    }

    // File operations
    if (e.ctrlKey && e.code === 'KeyO') {
      e.preventDefault();
      openFileDialog();
      return true;
    }

    if (e.ctrlKey && e.code === 'KeyN' && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      onNewFileModalOpen();
      return true;
    }

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
      e.preventDefault();
      tauriApi.openNewWindow('', 'default').catch(() => {});
      return true;
    }

    // Git panel
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') {
      e.preventDefault();
      onToggleGitPanel?.();
      return true;
    }

    // Navigation
    if (e.altKey && (e.code === 'ArrowLeft' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      e.stopPropagation();
      navigateHistory('back');
      return true;
    }

    if (e.altKey && (e.code === 'ArrowRight' || e.key === 'ArrowRight')) {
      e.preventDefault();
      e.stopPropagation();
      navigateHistory('forward');
      return true;
    }

    // Insert key
    if (e.code === 'Insert' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      toggleInsertMode();
      return true;
    }

    return false;
  }, [
    activeFile, closeFile, closeWorkspace, openFileDialog, onNewFileModalOpen,
    onToggleGitPanel, navigateHistory, setWorkspace, showTerminal, setTerminalOpen,
    openPorts, openSettingsTab, selectAll, zoomIn, zoomOut, resetZoom,
    autoSaveStore, toggleInsertMode, keyboardLayout, activeDiffTab, activeSettingsTab,
    activeProfilesTab, activeTimelineDiffTab, activeCommitDiffTab, closeDiffTab,
    closeSettingsTab, closeProfilesTab, closeTimelineDiffTab, closeCommitDiffTab
  ]);

  // Main keyboard event handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if in input element
    if (isInputElement(e.target)) {
      return;
    }

    // Log keyboard events for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Keyboard event:', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        layout: keyboardLayout
      });
    }

    // Handle non-Latin keyboard layouts by using physical key codes
    // This ensures shortcuts work regardless of keyboard layout
    const physicalKey = KEYBINDING_MAP[e.code];
    
    // For non-Latin layouts, prioritize physical key detection
    if (!keyboardLayout.isLatin && physicalKey) {
      // Map physical keys to expected behavior for non-Latin layouts
      if (e.ctrlKey && physicalKey === 's') {
        e.preventDefault();
        if (activeFile && unsavedChanges[activeFile]) {
          saveFile(activeFile);
        }
        return;
      }
      
      if (e.ctrlKey && physicalKey === 'a') {
        e.preventDefault();
        if (!isEditorFocused()) {
          selectAll();
        } else if (editorInstance) {
          editorInstance.trigger('keyboard', 'editor.action.selectAll', null);
        }
        return;
      }
      
      if (e.ctrlKey && physicalKey === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (editorInstance) {
          editorInstance.trigger('keyboard', 'undo', null);
        }
        return;
      }
      
      if (e.ctrlKey && physicalKey === 'f') {
        e.preventDefault();
        if (editorInstance) {
          editorInstance.trigger('keyboard', 'actions.find', null);
        }
        return;
      }

      // Navigation shortcuts
      if (e.altKey && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'ArrowLeft') {
          navigateHistory('back');
        } else {
          navigateHistory('forward');
        }
        return;
      }

      // Insert key
      if (e.code === 'Insert' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleInsertMode();
        return;
      }
    }

    // Try handlers in order of priority
    if (handleMenuShortcuts(e)) return;
    if (handleEditorShortcuts(e)) return;
    if (handleGlobalShortcuts(e)) return;
  }, [handleMenuShortcuts, handleEditorShortcuts, handleGlobalShortcuts, keyboardLayout, activeFile, unsavedChanges, saveFile, selectAll, editorInstance, activeDiffTab, activeSettingsTab, activeProfilesTab, activeTimelineDiffTab, activeCommitDiffTab, closeDiffTab, closeSettingsTab, closeProfilesTab, closeTimelineDiffTab, closeCommitDiffTab]);

  useEffect(() => {
    // Add single keyboard event listener
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  return {
    registerHandler,
    isKPressed: isKPressed.current
  };
};
