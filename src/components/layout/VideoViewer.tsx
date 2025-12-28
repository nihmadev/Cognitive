import { useEffect, useMemo, useRef, useState } from 'react';
import { tauriApi } from '../../lib/tauri-api';

interface VideoViewerProps {
    path: string;
}

const getMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
        case 'ogv':
            return 'video/ogg';
        case 'mov':
            return 'video/quicktime';
        case 'avi':
            return 'video/x-msvideo';
        case 'wmv':
            return 'video/x-ms-wmv';
        case 'flv':
            return 'video/x-flv';
        case 'mkv':
            return 'video/x-matroska';
        case 'm4v':
            return 'video/mp4';
        case '3gp':
            return 'video/3gpp';
        case 'ts':
            return 'video/mp2t';
        default:
            return 'video/*';
    }
};

class VideoStreamer {
    private path: string;
    private mimeType: string;
    private mediaSource: MediaSource;
    private sourceBuffer: SourceBuffer | null = null;
    private isStreaming = false;
    private chunkSize = 2 * 1024 * 1024; // 2MB chunks for much better performance
    private offset = 0;

    constructor(path: string, mimeType: string, mediaSource: MediaSource) {
        this.path = path;
        this.mimeType = mimeType;
        this.mediaSource = mediaSource;
    }

    async startStreaming(): Promise<void> {
        if (this.isStreaming) return;
        this.isStreaming = true;
        this.offset = 0;

        try {
            this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeType);
            
            this.sourceBuffer.addEventListener('updateend', () => {
                if (this.isStreaming && this.sourceBuffer) {
                    // Stream next chunk immediately without waiting
                    this.streamNextChunk();
                }
            });

            await this.streamNextChunk();
        } catch (error) {
            console.error('Failed to start video streaming:', error);
            this.isStreaming = false;
            throw error;
        }
    }

    private async streamNextChunk(): Promise<void> {
        if (!this.isStreaming || !this.sourceBuffer) return;

        try {
            const chunk = await tauriApi.readFileBinaryChunked(this.path, this.offset, this.chunkSize);
            
            if (chunk.length === 0) {
                this.isStreaming = false;
                // Signal end of stream
                if (this.mediaSource.readyState === 'open') {
                    try {
                        this.mediaSource.endOfStream();
                    } catch (e) {
                        // Stream might already be ended
                    }
                }
                return;
            }

            const uint8Array = new Uint8Array(chunk);
            
            // Wait for buffer to be ready before appending
            if (this.sourceBuffer.updating) {
                this.sourceBuffer.addEventListener('updateend', () => {
                    this.appendChunk(uint8Array);
                }, { once: true });
            } else {
                this.appendChunk(uint8Array);
            }

            this.offset += chunk.length;
            
            // Continue streaming immediately for better performance
            if (this.isStreaming) {
                requestAnimationFrame(() => this.streamNextChunk());
            }
        } catch (error) {
            console.error('Video streaming error:', error);
            this.isStreaming = false;
            // Try to end stream gracefully
            if (this.mediaSource.readyState === 'open') {
                try {
                    this.mediaSource.endOfStream('network');
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }

    private appendChunk(chunk: Uint8Array): void {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
                this.sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
            } catch (error) {
                console.error('Video buffer append error:', error);
                this.isStreaming = false;
            }
        }
    }

    stopStreaming(): void {
        this.isStreaming = false;
    }
}

export const VideoViewer = ({ path }: VideoViewerProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [srcUrl, setSrcUrl] = useState<string | null>(null);
    const [useStreaming, setUseStreaming] = useState(false);
    const objectUrlRef = useRef<string | null>(null);
    const streamerRef = useRef<VideoStreamer | null>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceTypeRef = useRef<'asset' | 'blob' | 'stream' | null>(null);
    const attemptedBlobFallbackRef = useRef<boolean>(false);

    const fileName = useMemo(() => path.split(/[\\/]/).pop() || path, [path]);
    const mimeType = useMemo(() => getMimeType(path), [path]);

    const startStreaming = async (isMountedRef: { current: boolean }) => {
        if (!MediaSource.isTypeSupported(mimeType)) {
            console.warn('Video streaming not supported for MIME type:', mimeType);
            return false;
        }

        try {
            const mediaSource = new MediaSource();
            mediaSourceRef.current = mediaSource;
            
            const streamer = new VideoStreamer(path, mimeType, mediaSource);
            streamerRef.current = streamer;
            
            const objectUrl = URL.createObjectURL(mediaSource);
            objectUrlRef.current = objectUrl;
            
            // Set up sourceopen handler before setting the URL
            return new Promise<boolean>((resolve) => {
                const handleSourceOpen = async () => {
                    try {
                        console.log('Video MediaSource opened, starting streaming');
                        await streamer.startStreaming();
                        if (isMountedRef.current) {
                            setSrcUrl(objectUrl);
                            sourceTypeRef.current = 'stream';
                            setLoading(false);
                            setUseStreaming(true);
                            resolve(true);
                        }
                    } catch (error) {
                        console.error('Failed to start video streaming:', error);
                        mediaSource.removeEventListener('sourceopen', handleSourceOpen);
                        resolve(false);
                    }
                };

                mediaSource.addEventListener('sourceopen', handleSourceOpen, { once: true });
                
                // Set a timeout in case sourceopen never fires
                setTimeout(() => {
                    if (mediaSource.readyState === 'closed') {
                        console.warn('Video MediaSource timeout - sourceopen never fired');
                        mediaSource.removeEventListener('sourceopen', handleSourceOpen);
                        resolve(false);
                    }
                }, 5000); // Longer timeout for video
            });
        } catch (error) {
            console.error('Failed to initialize video streaming:', error);
            return false;
        }
    };

    const fallbackToBlob = async () => {
        try {
            // Check cache first with video-specific cache limits
            const cachedData = await tauriApi.getCachedAudio(path);
            let binaryData: number[];
            
            if (cachedData) {
                binaryData = cachedData;
            } else {
                // For large videos, use streaming instead of loading all at once
                const fileSize = await tauriApi.getFileSize(path);
                if (fileSize > 50 * 1024 * 1024) { // 50MB threshold
                    console.warn('Large video file detected, using streaming instead of blob');
                    throw new Error('File too large for blob fallback');
                }
                
                binaryData = await tauriApi.readFileBinary(path);
                // Cache with size limits for video
                await tauriApi.cacheAudio(path, binaryData);
            }
            
            const byteArray = new Uint8Array(binaryData);
            const blob = new Blob([byteArray], { type: mimeType });
            const objectUrl = URL.createObjectURL(blob);
            objectUrlRef.current = objectUrl;
            setSrcUrl(objectUrl);
            sourceTypeRef.current = 'blob';
            attemptedBlobFallbackRef.current = true;
            setLoading(false);
        } catch (e) {
            const details = e instanceof Error ? e.message : String(e);
            setError('Failed to load video file');
            setErrorDetails(`Video streaming failed and blob fallback also failed.\n${details}`);
            setSrcUrl(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        const isMountedRef = { current: true };

        attemptedBlobFallbackRef.current = false;
        sourceTypeRef.current = null;

        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }

        if (streamerRef.current) {
            streamerRef.current.stopStreaming();
            streamerRef.current = null;
        }

        if (mediaSourceRef.current) {
            mediaSourceRef.current = null;
        }

        const loadVideo = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);
            setSrcUrl(null);
            setUseStreaming(false);

            try {
                // Try streaming first for better performance with large video files
                console.log('Attempting video streaming for:', path);
                const streamingStarted = await startStreaming(isMountedRef);
                
                if (!streamingStarted && isMountedRef.current) {
                    console.log('Video streaming failed, falling back to blob');
                    await fallbackToBlob();
                }
            } catch (e) {
                console.error('Video loading failed completely:', e);
                const details = e instanceof Error ? e.message : String(e);
                setError('Failed to load video file');
                setErrorDetails(`All video loading methods failed.\n${details}`);
                setLoading(false);
            }
        };

        loadVideo();

        return () => {
            isMountedRef.current = false;
            
            // Clean up streaming resources
            if (streamerRef.current) {
                streamerRef.current.stopStreaming();
                streamerRef.current = null;
            }
            
            // Clean up MediaSource
            if (mediaSourceRef.current) {
                try {
                    if (mediaSourceRef.current.readyState === 'open') {
                        mediaSourceRef.current.endOfStream();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
                mediaSourceRef.current = null;
            }
            
            // Clean up object URLs
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [path, mimeType]);

    if (loading) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--theme-background)',
                color: 'var(--theme-foreground-muted)',
                padding: 16,
            }}>
                Loading video…
            </div>
        );
    }

    if (error || !srcUrl) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--theme-background)',
                color: 'var(--theme-foreground-muted)',
                padding: 16,
                textAlign: 'center',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
                    <div>{error || 'No video source'}</div>
                    {errorDetails ? (
                        <pre style={{
                            margin: 0,
                            padding: 12,
                            background: 'var(--theme-background-secondary)',
                            border: '1px solid var(--theme-border)',
                            borderRadius: 6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 220,
                            overflow: 'auto',
                            color: 'var(--theme-foreground)',
                            fontSize: 12,
                        }}>
                            {errorDetails}
                        </pre>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: 'var(--theme-background)',
            color: 'var(--theme-foreground)',
            minHeight: 0,
        }}>
            <div style={{
                fontSize: 12,
                color: 'var(--theme-foreground-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }} title={path}>
                {fileName}
            </div>
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 0,
            }}>
                <video
                    key={srcUrl}
                    controls
                    preload="auto"
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                    src={srcUrl}
                    onLoadedMetadata={() => {
                        // Start buffering more aggressively
                        const video = document.querySelector('video') as HTMLVideoElement;
                        if (video) {
                            video.play().then(() => {
                                video.pause(); // Pause immediately to start buffering
                            }).catch(() => {
                                // Ignore autoplay errors
                            });
                        }
                    }}
                    onError={() => {
                        const sourceType = sourceTypeRef.current;
                        const alreadyTriedBlob = attemptedBlobFallbackRef.current;

                        if (sourceType === 'asset' && !alreadyTriedBlob && !useStreaming) {
                            attemptedBlobFallbackRef.current = true;
                            (async () => {
                                try {
                                    if (objectUrlRef.current) {
                                        URL.revokeObjectURL(objectUrlRef.current);
                                        objectUrlRef.current = null;
                                    }

                                    const isMountedRef = { current: true };
                                    const streamingStarted = await startStreaming(isMountedRef);
                                    if (!streamingStarted) {
                                        await fallbackToBlob();
                                    }
                                } catch (e) {
                                    const details = e instanceof Error ? e.message : String(e);
                                    setError('Video playback error');
                                    setErrorDetails(`Failed to decode video asset URL, and all fallbacks failed.\n${details}`);
                                }
                            })();
                            return;
                        }

                        setError('Video playback error');
                        setErrorDetails('The video element failed to load or decode this source.');
                    }}
                />
            </div>
        </div>
    );
};
