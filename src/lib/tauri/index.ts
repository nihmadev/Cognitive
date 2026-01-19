import * as fs from './filesystem';
import * as git from './git';
import * as search from './search';
import * as diagnostics from './diagnostics';
import * as lsp from './lsp';
import * as timeline from './timeline';
import * as npm from './npm';
import * as audio from './audio';
import * as ai from './ai';
import * as system from './system';

// Re-export all types
export * from './filesystem';
export * from './git';
export * from './search';
export * from './diagnostics';
export * from './lsp';
export * from './timeline';
export * from './npm';
export * from './audio';
export * from './ai';
export * from './system';

// Assemble the tauriApi object for backward compatibility and centralized access
export const tauriApi = {
    ...fs,
    ...git,
    ...search,
    ...diagnostics,
    ...lsp,
    ...timeline,
    ...npm,
    ...audio,
    ...ai,
    ...system,
};
