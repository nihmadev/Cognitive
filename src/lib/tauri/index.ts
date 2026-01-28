import * as fs from './filesystem';
import * as git from './git';
import * as search from './search';
import * as diagnostics from './diagnostics';
import * as lsp from './lsp';
import * as cssLsp from './css-lsp';
import * as timeline from './timeline';
import * as npm from './npm';
import * as audio from './audio';
import * as system from './system';
import * as ai from './ai';

// Re-export all types
export * from './filesystem';
export * from './git';
export * from './diagnostics';
export * from './lsp';
export * from './css-lsp';
export * from './timeline';
export * from './npm';
export * from './audio';
export * from './system';
export * from './ai';

// Assemble the tauriApi object for backward compatibility and centralized access
export const tauriApi = {
    ...fs,
    ...git,
    ...search,
    ...diagnostics,
    ...lsp,
    ...cssLsp,
    ...timeline,
    ...npm,
    ...audio,
    ...system,
    ...ai,
};
