import { create } from 'zustand';

interface AudioState {
    isPlaying: boolean;
    currentPath: string | null;
    title: string | null;
    volume: number;
    currentTime: number;
    duration: number;
    seekTime: number | null;
    setPlaying: (isPlaying: boolean) => void;
    play: (path: string, title?: string) => void;
    pause: () => void;
    stop: () => void;
    setVolume: (volume: number) => void;
    setProgress: (currentTime: number, duration: number) => void;
    seek: (time: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
    isPlaying: false,
    currentPath: null,
    title: null,
    volume: 1,
    currentTime: 0,
    duration: 0,
    seekTime: null,
    setPlaying: (isPlaying) => set({ isPlaying }),
    play: (path, title) => set({ currentPath: path, isPlaying: true, title: title || path.split(/[\\/]/).pop() || null, currentTime: 0, duration: 0, seekTime: null }),
    pause: () => set({ isPlaying: false }),
    stop: () => set({ isPlaying: false, currentPath: null, title: null, currentTime: 0, duration: 0, seekTime: null }),
    setVolume: (volume) => set({ volume }),
    setProgress: (currentTime, duration) => set({ currentTime, duration }),
    seek: (time) => set({ seekTime: time }),
}));
