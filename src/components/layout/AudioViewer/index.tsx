import { useEffect, useRef } from 'react';
import { useAudioStore } from '../../../store/audioStore';
import { Play, Pause, Music, Volume2 } from 'lucide-react';

interface AudioViewerProps {
    path: string;
}

export const AudioViewer = ({ path }: AudioViewerProps) => {
    const {
        currentPath,
        isPlaying,
        currentTime,
        duration,
        play,
        setPlaying,
        setVolume,
        volume,
        seek
    } = useAudioStore();

    const fileName = path.split(/[\\/]/).pop() || path;
    const isThisFile = currentPath === path;
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isThisFile) {
            play(path);
        }
    }, [path, isThisFile, play]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (progressRef.current && duration > 0) {
            const rect = progressRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            seek(percentage * duration);
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--theme-background)',
            color: 'var(--theme-foreground)',
            padding: 40,
        }}>
            <div style={{
                width: '100%',
                maxWidth: 600,
                background: 'var(--theme-background-secondary)',
                border: '1px solid var(--theme-border)',
                borderRadius: 16,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
            }}>
                <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: 24,
                    background: 'var(--theme-accent-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--theme-accent)',
                }}>
                    <Music size={60} />
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                    <h2 style={{
                        margin: '0 0 8px 0',
                        fontSize: 20,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {fileName}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--theme-foreground-muted)'
                    }}>
                        {path}
                    </p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div
                        ref={progressRef}
                        onClick={handleProgressClick}
                        style={{
                            position: 'relative',
                            height: 8,
                            background: 'var(--theme-background-tertiary)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${progress}%`,
                            background: 'var(--theme-accent)',
                            transition: 'width 0.1s linear'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--theme-foreground-muted)' }}>
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <button
                        onClick={() => setPlaying(!isPlaying)}
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'var(--theme-accent)',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: 4 }} />}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 200 }}>
                    <Volume2 size={16} color="var(--theme-foreground-muted)" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{
                            flex: 1,
                            accentColor: 'var(--theme-accent)',
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
