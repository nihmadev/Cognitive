import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  path: string;
  name: string;
  last_opened?: string;
}

export interface WorkspaceBuffer {
  workspace_id: string;
  file_path: string;
  cursor_line: number;
  cursor_column: number;
  scroll_top: number;
  is_active: boolean;
  order_index: number;
}

export const getRecentProjects = async (): Promise<Project[]> => {
  return await invoke("get_recent_projects");
};

export const saveProject = async (project: Project): Promise<void> => {
  await invoke("save_project", { project });
};

export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export const getInstalledExtensions = async (): Promise<ExtensionMetadata[]> => {
  return await invoke("get_installed_extensions");
};

export const toggleExtension = async (id: string, enabled: boolean): Promise<void> => {
  await invoke("toggle_extension", { id, enabled });
};

export const loadWorkspaceState = async (workspaceId: string): Promise<WorkspaceBuffer[]> => {
  return await invoke("load_workspace_state", { workspaceId });
};

export const saveWorkspaceState = async (buffers: WorkspaceBuffer[]): Promise<void> => {
  await invoke("save_workspace_state", { buffers });
};

export const saveUnsavedBuffer = async (bufferId: string, content: string): Promise<void> => {
  await invoke("save_unsaved_buffer", { bufferId, content });
};

export const getUnsavedBuffer = async (bufferId: string): Promise<string | null> => {
  return await invoke("get_unsaved_buffer", { bufferId });
};

export const getUserSetting = async (key: string): Promise<string | null> => {
  return await invoke("get_user_setting", { key });
};

export const setUserSetting = async (key: string, valueJson: string): Promise<void> => {
  await invoke("set_user_setting", { key, valueJson });
};
