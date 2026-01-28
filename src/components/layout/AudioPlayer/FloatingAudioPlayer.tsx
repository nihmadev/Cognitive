import { Play, Pause, Music, X, SkipForward, SkipBack } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAudioStore } from '../../../store/audioStore';
import styles from './FloatingAudioPlayer.module.css';

export const FloatingAudioPlayer = () => {
    const {
        isPlaying,
        title,
        currentPath,
        currentTime,
        duration,
        setPlaying,
        stop,
        playNext,
        playPrevious,
        playlist
    } = useAudioStore();

    if (!currentPath) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <motion.div
            className={styles.floatingPlayer}
            drag
            dragMomentum={true}
            dragElastic={0.1}
            whileDrag={{ scale: 1.02, boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)' }}
            whileTap={{ cursor: 'grabbing' }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
            <div className={styles.iconWrapper}>
                <Music size={14} />
            </div>

            <div className={styles.content}>
                <div className={styles.title} title={title || ''}>
                    {title || 'Unknown Track'}
                </div>
                <div className={styles.progressBarWrapper}>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className={styles.controls}>
                {playlist.length > 1 && (
                    <button
                        className={styles.controlButton}
                        onClick={playPrevious}
                        title="Previous Track"
                    >
                        <SkipBack size={16} />
                    </button>
                )}
                <button
                    className={styles.controlButtonMain}
                    onClick={() => setPlaying(!isPlaying)}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                {playlist.length > 1 && (
                    <button
                        className={styles.controlButton}
                        onClick={playNext}
                        title="Next Track"
                    >
                        <SkipForward size={16} />
                    </button>
                )}
                <button
                    className={styles.closeButton}
                    onClick={stop}
                    title="Close Player"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    );
};
