import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../../../store/audioStore';
import { tauriApi } from '../../../lib/tauri-api';

export const GlobalAudioPlayer = () => {
    const {
        currentPath,
        isPlaying,
        volume,
        setPlaying,
        setProgress,
        seekTime,
        playNext,
        title,
    } = useAudioStore();

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = volume;
    }, [volume]);

    useEffect(() => {
        if (!audioRef.current || !resolvedUrl) return;

        if (isPlaying) {
            audioRef.current.play().catch(() => {
                setPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, resolvedUrl]);

    useEffect(() => {
        if (audioRef.current && seekTime !== null) {
            audioRef.current.currentTime = seekTime;
            // Clear seekTime after applying
            useAudioStore.setState({ seekTime: null });
        }
    }, [seekTime]);

    useEffect(() => {
        if (!currentPath) {
            setResolvedUrl(null);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            document.title = 'Cognitive';
            return;
        }

        const loadAudioSource = async () => {
            try {
                const assetUrl = tauriApi.getAssetUrl(currentPath);
                setResolvedUrl(assetUrl);
            } catch (e) {
            }
        };

        loadAudioSource();
    }, [currentPath]);

    useEffect(() => {
        if (title && isPlaying) {
            const newTitle = `${title} - Cognitive`;
            document.title = newTitle;
        } else {
            document.title = 'Cognitive';
        }
    }, [title, isPlaying]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime, audioRef.current.duration || 0);
        }
    };

    const handleEnded = () => {
        playNext();
    };

    return (
        <audio
            ref={audioRef}
            src={resolvedUrl || undefined}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{ display: 'none' }}
        />
    );
};
