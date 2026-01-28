import { useCallback } from 'react';
import * as storage from '../lib/tauri/storage';
import { useAppStore } from '../store';

export const useStorage = () => {
  const { tabs, activeTabId, workspacePath } = useAppStore((state) => ({
    tabs: state.tabs.tabs,
    activeTabId: state.tabs.activeTabId,
    workspacePath: state.project.workspacePath,
  }));

  const persistWorkspaceState = useCallback(async () => {
    if (!workspacePath) return;

    const buffers: storage.WorkspaceBuffer[] = tabs.map((tab, index) => ({
      workspace_id: workspacePath,
      file_path: tab.path,
      cursor_line: tab.cursorPosition?.line || 0,
      cursor_column: tab.cursorPosition?.column || 0,
      scroll_top: tab.scrollPosition || 0,
      is_active: tab.id === activeTabId,
      order_index: index,
    }));

    try {
      await storage.saveWorkspaceState(buffers);
    } catch (error) {
      // Failed to save workspace state
    }
  }, [workspacePath, tabs, activeTabId]);

  const restoreWorkspaceState = useCallback(async (path: string) => {
    try {
      const buffers = await storage.loadWorkspaceState(path);
      return buffers;
    } catch (error) {
      // Failed to load workspace state
      return [];
    }
  }, []);

  const saveUnsavedChanges = useCallback(async (filePath: string, content: string) => {
    if (!workspacePath) return;
    const bufferId = `${workspacePath}:${filePath}`;
    try {
      await storage.saveUnsavedBuffer(bufferId, content);
    } catch (error) {
      // Failed to save unsaved changes
    }
  }, [workspacePath]);

  return {
    persistWorkspaceState,
    restoreWorkspaceState,
    saveUnsavedChanges,
    getRecentProjects: storage.getRecentProjects,
    saveProject: storage.saveProject,
    getUserSetting: storage.getUserSetting,
    setUserSetting: storage.setUserSetting,
    getInstalledExtensions: storage.getInstalledExtensions,
    toggleExtension: storage.toggleExtension,
  };
};
