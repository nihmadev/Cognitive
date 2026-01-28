import { create } from 'zustand';

interface AudioState {
    isPlaying: boolean;
    currentPath: string | null;
    title: string | null;
    volume: number;
    currentTime: number;
    duration: number;
    seekTime: number | null;
    playlist: string[];
    currentIndex: number;
    setPlaying: (isPlaying: boolean) => void;
    play: (path: string, title?: string) => void;
    pause: () => void;
    stop: () => void;
    setVolume: (volume: number) => void;
    setProgress: (currentTime: number, duration: number) => void;
    seek: (time: number) => void;
    setPlaylist: (playlist: string[]) => void;
    playNext: () => void;
    playPrevious: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
    isPlaying: false,
    currentPath: null,
    title: null,
    volume: 1,
    currentTime: 0,
    duration: 0,
    seekTime: null,
    playlist: [],
    currentIndex: -1,
    setPlaying: (isPlaying) => set({ isPlaying }),
    play: (path, title) => {
        const { playlist } = get();
        // Находим индекс текущего файла в плейлисте
        const index = playlist.indexOf(path);
        set({ 
            currentPath: path, 
            isPlaying: true, 
            title: title || path.split(/[\\/]/).pop() || null, 
            currentTime: 0, 
            duration: 0, 
            seekTime: null,
            currentIndex: index >= 0 ? index : -1
        });
    },
    pause: () => set({ isPlaying: false }),
    stop: () => set({ isPlaying: false, currentPath: null, title: null, currentTime: 0, duration: 0, seekTime: null, playlist: [], currentIndex: -1 }),
    setVolume: (volume) => set({ volume }),
    setProgress: (currentTime, duration) => set({ currentTime, duration }),
    seek: (time) => set({ seekTime: time }),
    setPlaylist: (playlist) => {
        const { currentPath } = get();
        // Если есть текущий путь, обновляем индекс
        const index = currentPath ? playlist.indexOf(currentPath) : -1;
        set({ playlist, currentIndex: index >= 0 ? index : -1 });
    },
    playNext: () => {
        const { playlist, currentIndex, currentPath } = get();
        if (playlist.length === 0) return;
        
        // Если индекс не установлен, пытаемся найти текущий файл в плейлисте
        let actualIndex = currentIndex;
        if (actualIndex < 0 && currentPath) {
            actualIndex = playlist.indexOf(currentPath);
        }
        
        const nextIndex = (actualIndex + 1) % playlist.length;
        const nextPath = playlist[nextIndex];
        const title = nextPath.split(/[\\/]/).pop() || null;
        
        set({ 
            currentPath: nextPath, 
            isPlaying: true, 
            title, 
            currentTime: 0, 
            duration: 0, 
            seekTime: null,
            currentIndex: nextIndex
        });
    },
    playPrevious: () => {
        const { playlist, currentIndex, currentPath } = get();
        if (playlist.length === 0) return;
        
        // Если индекс не установлен, пытаемся найти текущий файл в плейлисте
        let actualIndex = currentIndex;
        if (actualIndex < 0 && currentPath) {
            actualIndex = playlist.indexOf(currentPath);
        }
        
        const prevIndex = actualIndex - 1 < 0 ? playlist.length - 1 : actualIndex - 1;
        const prevPath = playlist[prevIndex];
        const title = prevPath.split(/[\\/]/).pop() || null;
        
        set({ 
            currentPath: prevPath, 
            isPlaying: true, 
            title, 
            currentTime: 0, 
            duration: 0, 
            seekTime: null,
            currentIndex: prevIndex
        });
    },
}));
