import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface LspDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  code?: string | number;
  source?: string;
}

export interface LspDiagnosticsPayload {
  uri: string;
  diagnostics: LspDiagnostic[];
}

export const lspInitialize = (projectPath: string) => invoke<void>('lsp_initialize', { projectPath });
export const lspDidOpen = (path: string, content: string) => invoke<void>('lsp_did_open', { path, content });
export const lspDidChange = (path: string, content: string, version: number) => invoke<void>('lsp_did_change', { path, content, version });

/**
 * Listen to LSP diagnostics events from the backend
 */
export async function listenToLspDiagnostics(
  callback: (payload: LspDiagnosticsPayload) => void
): Promise<UnlistenFn> {
  return listen<LspDiagnosticsPayload>('lsp:diagnostics', (event) => {
    callback(event.payload);
  });
}
