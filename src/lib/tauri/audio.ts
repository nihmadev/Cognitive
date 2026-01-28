import { invoke } from '@tauri-apps/api/core';

export const getCachedAudio = (key: string) => invoke<number[] | null>('get_cached_audio', { key });
export const cacheAudio = (key: string, data: number[]) => invoke<void>('cache_audio', { key, data });
export const clearAudioCache = () => invoke<void>('clear_audio_cache');
export const getAudioCacheStats = () => invoke<[number, number, number]>('get_audio_cache_stats');

export const getAudioCoverArt = (filePath: string) => invoke<string | null>('get_audio_cover_art', { filePath });
export const getAudioMetadata = (filePath: string) => invoke<any>('get_audio_metadata', { filePath });

export const audioLoadFile = (path: string) => invoke<void>('audio_load_file', { path });
export const audioGetState = () => invoke<any>('audio_get_state');
export const audioPlay = () => invoke<void>('audio_play');
export const audioPause = () => invoke<void>('audio_pause');
export const audioStop = () => invoke<void>('audio_stop');
export const audioSeek = (position: number) => invoke<void>('audio_seek', { position });
export const audioSetVolume = (volume: number) => invoke<void>('audio_set_volume', { volume });
