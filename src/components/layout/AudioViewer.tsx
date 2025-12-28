import { useEffect, useMemo, useRef, useState } from 'react';
import { tauriApi } from '../../lib/tauri-api';

interface AudioViewerProps {
    path: string;
}

const getMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
        case 'mp3':
            return 'audio/mpeg';
        case 'wav':
            return 'audio/wav';
        case 'm4a':
            return 'audio/mp4';
        case 'aac':
            return 'audio/aac';
        case 'flac':
            return 'audio/flac';
        case 'ogg':
        case 'oga':
            return 'audio/ogg';
        case 'opus':
            return 'audio/opus';
        case 'weba':
            return 'audio/webm';
        default:
            return 'audio/*';
    }
};

class AudioStreamer {
    private path: string;
    private mimeType: string;
    private mediaSource: MediaSource;
    private sourceBuffer: SourceBuffer | null = null;
    private isStreaming = false;
    private chunkSize = 64 * 1024; // 64KB chunks
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
                    this.streamNextChunk();
                }
            });

            await this.streamNextChunk();
        } catch (error) {
            console.error('Failed to start streaming:', error);
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
                return;
            }

            const uint8Array = new Uint8Array(chunk);
            
            if (this.sourceBuffer.updating) {
                this.sourceBuffer.addEventListener('updateend', () => {
                    this.appendChunk(uint8Array);
                }, { once: true });
            } else {
                this.appendChunk(uint8Array);
            }

            this.offset += chunk.length;
        } catch (error) {
            console.error('Streaming error:', error);
            this.isStreaming = false;
        }
    }

    private appendChunk(chunk: Uint8Array): void {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
                this.sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
            } catch (error) {
                console.error('Buffer append error:', error);
                this.isStreaming = false;
            }
        }
    }

    stopStreaming(): void {
        this.isStreaming = false;
    }
}

export const AudioViewer = ({ path }: AudioViewerProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [srcUrl, setSrcUrl] = useState<string | null>(null);
    const [useStreaming, setUseStreaming] = useState(false);
    const objectUrlRef = useRef<string | null>(null);
    const streamerRef = useRef<AudioStreamer | null>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceTypeRef = useRef<'asset' | 'blob' | 'stream' | null>(null);
    const attemptedBlobFallbackRef = useRef<boolean>(false);

    const fileName = useMemo(() => path.split(/[\\/]/).pop() || path, [path]);
    const mimeType = useMemo(() => getMimeType(path), [path]);

    const startStreaming = async (isMountedRef: { current: boolean }) => {
        if (!MediaSource.isTypeSupported(mimeType)) {
            console.warn('Streaming not supported for MIME type:', mimeType);
            return false;
        }

        try {
            const mediaSource = new MediaSource();
            mediaSourceRef.current = mediaSource;
            
            const streamer = new AudioStreamer(path, mimeType, mediaSource);
            streamerRef.current = streamer;
            
            const objectUrl = URL.createObjectURL(mediaSource);
            objectUrlRef.current = objectUrl;
            
            // Set up sourceopen handler before setting the URL
            return new Promise<boolean>((resolve) => {
                const handleSourceOpen = async () => {
                    try {
                        console.log('MediaSource opened, starting streaming');
                        await streamer.startStreaming();
                        if (isMountedRef.current) {
                            setSrcUrl(objectUrl);
                            sourceTypeRef.current = 'stream';
                            setLoading(false);
                            setUseStreaming(true);
                            resolve(true);
                        }
                    } catch (error) {
                        console.error('Failed to start streaming:', error);
                        mediaSource.removeEventListener('sourceopen', handleSourceOpen);
                        resolve(false);
                    }
                };

                mediaSource.addEventListener('sourceopen', handleSourceOpen, { once: true });
                
                // Set a timeout in case sourceopen never fires
                setTimeout(() => {
                    if (mediaSource.readyState === 'closed') {
                        console.warn('MediaSource timeout - sourceopen never fired');
                        mediaSource.removeEventListener('sourceopen', handleSourceOpen);
                        resolve(false);
                    }
                }, 3000);
            });
        } catch (error) {
            console.error('Failed to initialize streaming:', error);
            return false;
        }
    };

    const fallbackToBlob = async () => {
        try {
            // Try cache first
            const cachedData = await tauriApi.getCachedAudio(path);
            let binaryData: number[];
            
            if (cachedData) {
                binaryData = cachedData;
            } else {
                binaryData = await tauriApi.readFileBinary(path);
                // Cache the data for future use
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
            setError('Failed to load audio file');
            setErrorDetails(`Streaming failed and blob fallback also failed.\n${details}`);
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

        const loadAudio = async () => {
            setLoading(true);
            setError(null);
            setErrorDetails(null);
            setSrcUrl(null);
            setUseStreaming(false);

            try {
                // Skip asset URL attempt and go directly to streaming first
                console.log('Attempting streaming for:', path);
                const streamingStarted = await startStreaming(isMountedRef);
                
                if (!streamingStarted && isMountedRef.current) {
                    console.log('Streaming failed, falling back to blob');
                    await fallbackToBlob();
                }
            } catch (e) {
                console.error('Audio loading failed completely:', e);
                const details = e instanceof Error ? e.message : String(e);
                setError('Failed to load audio file');
                setErrorDetails(`All loading methods failed.\n${details}`);
                setLoading(false);
            }
        };

        loadAudio();

        return () => {
            isMountedRef.current = false;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            if (streamerRef.current) {
                streamerRef.current.stopStreaming();
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
                Loading audio…
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
                    <div>{error || 'No audio source'}</div>
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
            <audio
                key={srcUrl}
                controls
                style={{ width: '100%' }}
                src={srcUrl}
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
                                setError('Audio playback error');
                                setErrorDetails(`Failed to decode asset URL, and all fallbacks failed.\n${details}`);
                            }
                        })();
                        return;
                    }

                    setError('Audio playback error');
                    setErrorDetails('The audio element failed to load or decode this source.');
                }}
            />
        </div>
    );
};
