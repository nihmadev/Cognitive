import { invoke } from '@tauri-apps/api/core';

export type NpmScript = {
    name: string;
    command: string;
    description?: string;
};

export type RunningScript = {
    name: string;
    pid: number;
    start_time: string;
};

export const npmGetScripts = (workspace: string) => invoke<NpmScript[]>('npm_get_scripts', { workspace });
export const npmRunScript = (workspace: string, scriptName: string) => invoke<string>('npm_run_script', { workspace, scriptName });
export const npmStopScript = (scriptName: string) => invoke<string>('npm_stop_script', { scriptName });
export const npmGetRunningScripts = () => invoke<RunningScript[]>('npm_get_running_scripts');
export const npmRunScriptInTerminal = (workspace: string, scriptName: string) => invoke<string>('npm_run_script_in_terminal', { workspace, scriptName });
