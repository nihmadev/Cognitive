import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAIStore } from '../store/aiStore';
import { useUIStore } from '../store/uiStore';
import { useEditorStore } from '../store/editorStore';
import { tauriApi } from '../lib/tauri-api';

interface UseKeyboardShortcutsProps {
  onNewFileModalOpen: () => void;
}

const isEditorFocused = () => {
  return document.activeElement?.closest('.monaco-editor') !== null;
};

export const useKeyboardShortcuts = ({ onNewFileModalOpen }: UseKeyboardShortcutsProps) => {
  const { activeFile, closeFile, openSettingsTab, openFileDialog, navigateHistory } = useProjectStore();
  const { toggleAssistant } = useAIStore();
  const { showTerminal, setTerminalOpen, openPorts, zoomIn, zoomOut, resetZoom } = useUIStore();
  const { selectAll } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'KeyW') {
        event.preventDefault();
        if (activeFile) {
          closeFile(activeFile);
        }
      }
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
      else if (event.ctrlKey && !event.shiftKey && !event.altKey && (
        event.code === 'Minus' ||
        event.code === 'NumpadSubtract' ||
        event.key === '-'
      )) {
        event.preventDefault();
        event.stopPropagation();
        zoomOut();
      }
      else if (event.ctrlKey && !event.shiftKey && !event.altKey && (
        event.code === 'Digit0' ||
        event.code === 'Numpad0' ||
        event.key === '0'
      )) {
        event.preventDefault();
        event.stopPropagation();
        resetZoom();
      }
      else if (event.ctrlKey && event.code === 'Backquote') {
        event.preventDefault();
        setTerminalOpen(!showTerminal);
      }
      else if (event.ctrlKey && event.shiftKey && event.code === 'Backquote') {
        event.preventDefault();
        openPorts();
      }
      else if (event.ctrlKey && event.code === 'Comma') {
        event.preventDefault();
        openSettingsTab();
      }
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        toggleAssistant();
      }
      else if (event.ctrlKey && event.code === 'KeyA' && !isEditorFocused()) {
        event.preventDefault();
        selectAll();
      }
      else if (event.ctrlKey && event.code === 'KeyP' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        return;
      }
      else if (event.ctrlKey && event.code === 'KeyP') {
        event.preventDefault();
        return;
      }
      else if (event.ctrlKey && event.code === 'KeyO') {
        event.preventDefault();
        openFileDialog();
      }
      else if (event.ctrlKey && event.code === 'KeyN' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        onNewFileModalOpen();
      }
      else if (event.ctrlKey && event.shiftKey && event.code === 'KeyN') {
        event.preventDefault();
        tauriApi.openNewWindow('', 'default').catch(() => {});
      }
      else if (event.altKey && (event.code === 'ArrowLeft' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        event.stopPropagation();
        navigateHistory('back');
      }
      else if (event.altKey && (event.code === 'ArrowRight' || event.key === 'ArrowRight')) {
        event.preventDefault();
        event.stopPropagation();
        navigateHistory('forward');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeFile,
    closeFile,
    zoomIn,
    zoomOut,
    resetZoom,
    showTerminal,
    setTerminalOpen,
    openPorts,
    openSettingsTab,
    toggleAssistant,
    selectAll,
    openFileDialog,
    onNewFileModalOpen,
    navigateHistory
  ]);
};
