import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface CssDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity?: number; // 1: Error, 2: Warning, 3: Info, 4: Hint
  code?: string | number;
  source?: string;
  message: string;
}

export interface CssPublishDiagnosticsParams {
  uri: string;
  diagnostics: CssDiagnostic[];
}

/**
 * Инициализирует CSS Language Server
 */
export async function cssLspInitialize(projectPath: string): Promise<void> {
  await invoke('css_lsp_initialize', { projectPath });
}

/**
 * Уведомляет CSS LSP об открытии документа
 */
export async function cssLspDidOpen(path: string, content: string): Promise<void> {
  await invoke('css_lsp_did_open', { path, content });
}

/**
 * Уведомляет CSS LSP об изменении документа
 */
export async function cssLspDidChange(
  path: string,
  content: string,
  version: number
): Promise<void> {
  await invoke('css_lsp_did_change', { path, content, version });
}

/**
 * Уведомляет CSS LSP о закрытии документа
 */
export async function cssLspDidClose(path: string): Promise<void> {
  await invoke('css_lsp_did_close', { path });
}

/**
 * Подписывается на диагностику от CSS LSP
 */
export function onCssDiagnostics(
  callback: (params: CssPublishDiagnosticsParams) => void
): () => void {
  const unlisten = listen<CssPublishDiagnosticsParams>('css-lsp:diagnostics', (event) => {
    callback(event.payload);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}

/**
 * Проверяет, является ли файл CSS/SCSS/LESS файлом
 */
export function isCssFile(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop();
  return ext === 'css' || ext === 'scss' || ext === 'less';
}
