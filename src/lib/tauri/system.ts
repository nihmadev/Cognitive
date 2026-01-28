import { invoke } from '@tauri-apps/api/core';
import { openUrl as openUrlTauri } from '@tauri-apps/plugin-opener';

export type PortInfo = {
    port: number;
    protocol: string;
    pid: number | null;
    process_name: string | null;
    local_address: string;
    state: string;
};

export type InitialState = {
    workspace: string | null;
    profile: string | null;
};

export const getInitialState = () => invoke<InitialState>('get_initial_state');
export const getListeningPorts = async (): Promise<PortInfo[]> => {
    try {
        return await invoke<PortInfo[]>('get_listening_ports');
    } catch (error) {
        // Return empty array as fallback
        return [];
    }
};

export const getPortChanges = async (): Promise<PortInfo[]> => {
    try {
        return await invoke<PortInfo[]>('get_port_changes');
    } catch (error) {
        // Return empty array as fallback
        return [];
    }
};
export const openUrl = (url: string) => openUrlTauri(url);
export const openNewWindow = (folderPath: string, profileName: string) =>
    invoke<void>('open_new_window', { folderPath, profileName });
