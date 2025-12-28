import { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, Play, Square, RefreshCw, Wrench, Bug } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import { tauriApi, type NpmScript } from '../../../lib/tauri-api';
import { getFileIcon } from '../../../utils/fileIcons';
import clsx from 'clsx';
import styles from './NpmScriptsSection.module.css';

interface ScriptItemProps {
    script: NpmScript;
    isRunning: boolean;
    onRun: (scriptName: string) => void;
    onStop: (scriptName: string) => void;
}

const ScriptItem = ({ script, isRunning, onRun, onStop }: ScriptItemProps) => {
    const [showOptions, setShowOptions] = useState(false);

    return (
        <div 
            className={styles.scriptItem}
            onMouseEnter={() => setShowOptions(true)}
            onMouseLeave={() => setShowOptions(false)}
        >
            <div className={styles.scriptRow}>
                <div className={styles.scriptInfo}>
                    <Wrench size={12} className={styles.scriptIcon} />
                    <span className={styles.scriptName}>{script.name}</span>
                </div>
                {showOptions && (
                    <div className={styles.scriptActions}>
                        <button
                            className={clsx(styles.scriptBtn, styles.runBtn)}
                            title="Run script"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRun(script.name);
                            }}
                        >
                            <Play size={10} />
                        </button>
                        <button
                            className={clsx(styles.scriptBtn, styles.debugBtn)}
                            title="Debug script"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRun(script.name);
                            }}
                        >
                            <Bug size={10} />
                        </button>
                        {isRunning && (
                            <button
                                className={clsx(styles.scriptBtn, styles.stopBtn)}
                                title="Stop script"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStop(script.name);
                                }}
                            >
                                <Square size={10} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface NpmScriptsSectionProps {
    // No props needed - uses global store
}

export const NpmScriptsSection = ({}: NpmScriptsSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [scripts, setScripts] = useState<NpmScript[]>([]);
    const [runningScripts, setRunningScripts] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { currentWorkspace } = useProjectStore();

    const loadScripts = useCallback(async () => {
        if (!currentWorkspace) return;

        setIsLoading(true);
        setError(null);

        try {
            const npmScripts = await tauriApi.npmGetScripts(currentWorkspace);
            setScripts(npmScripts);
        } catch (err) {
            console.error('Failed to load NPM scripts:', err);
            setError('Failed to load NPM scripts');
            setScripts([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace]);

    const runScript = useCallback(async (scriptName: string) => {
        if (!currentWorkspace) return;

        try {
            const result = await tauriApi.npmRunScriptInTerminal(currentWorkspace, scriptName);
            console.log('Script started in terminal:', result);
        } catch (err) {
            console.error('Failed to run script in terminal:', err);
        }
    }, [currentWorkspace]);

    const stopScript = useCallback(async (scriptName: string) => {
        try {
            await tauriApi.npmStopScript(scriptName);
            setRunningScripts(prev => {
                const next = new Set(prev);
                next.delete(scriptName);
                return next;
            });
        } catch (err) {
            console.error('Failed to stop script:', err);
        }
    }, []);

    const updateRunningScripts = useCallback(async () => {
        try {
            const running = await tauriApi.npmGetRunningScripts();
            setRunningScripts(new Set(running.map(script => script.name)));
        } catch (err) {
            console.error('Failed to get running scripts:', err);
        }
    }, []);

    useEffect(() => {
        loadScripts();
        updateRunningScripts();
    }, [loadScripts, updateRunningScripts]);

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
                <div className={styles.sectionTitle}>
                    <span className={styles.chev}>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    {isOpen ? (
                        <>
                            {getFileIcon('package.json')}
                            <span>package.json</span>
                        </>
                    ) : (
                        <span>NPM Scripts</span>
                    )}
                </div>
                {isOpen && (
                    <div className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.actionBtn}
                            title="Refresh Scripts"
                            onClick={loadScripts}
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                )}
            </div>
            {isOpen && (
                <div className={styles.sectionBody}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading scripts...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : scripts.length === 0 ? (
                        <div className={styles.empty}>No scripts found</div>
                    ) : (
                        <div className={styles.scriptList}>
                            {scripts.map((script) => (
                                <ScriptItem
                                    key={script.name}
                                    script={script}
                                    isRunning={runningScripts.has(script.name)}
                                    onRun={runScript}
                                    onStop={stopScript}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
