import { useEffect, useRef } from 'react';
import React from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { spawn } from 'tauri-pty';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore, themes } from '../../../store/uiStore';
import { useTerminalStore } from '../../../store/terminalStore';
import '@xterm/xterm/css/xterm.css';
import styles from './styles/terminal.module.css';

interface TerminalViewProps {
    terminalId: string;
    isActive: boolean;
}

const TerminalViewComponent = ({ terminalId, isActive }: TerminalViewProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const ptyRef = useRef<any>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const dataUnsubscribeRef = useRef<any>(null);
    const termDataUnsubscribeRef = useRef<any>(null);
    const isInitializedRef = useRef(false);

    const { currentWorkspace } = useProjectStore();
    const { theme: currentTheme, isTerminalMaximized } = useUIStore();
    const workspaceRef = useRef(currentWorkspace);
    const { updateTerminal } = useTerminalStore();
    
    // Обновляем ref при изменении workspace
    useEffect(() => {
        workspaceRef.current = currentWorkspace;
    }, [currentWorkspace]);

    // Force resize when maximized state changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (fitAddonRef.current && xtermRef.current && ptyRef.current && isActive) {
                try {
                    fitAddonRef.current.fit();
                    const { cols, rows } = xtermRef.current;
                    if (cols > 0 && rows > 0) {
                        ptyRef.current.resize(cols, rows);
                    }
                } catch (err) {
                    // Ignore resize errors
                }
            }
        }, 100); // Give it a bit of time for CSS transitions if any
        return () => clearTimeout(timer);
    }, [isTerminalMaximized, isActive]);

    // Initialize Terminal (XTerm + PTY)
    useEffect(() => {
        if (!terminalRef.current || isInitializedRef.current) return;
        
        isInitializedRef.current = true;
        let isMounted = true;
        let ptyInstance: any = null;
        let dataUnsubscribe: any = null;

        const isWindows = window.navigator.userAgent.includes('Windows');
        const themeColors = themes[currentTheme].colors;
        
        // Добавляем прозрачность к фону выделения, если её нет
        const selectionBg = themeColors.selection.startsWith('#') && themeColors.selection.length === 7 
            ? `${themeColors.selection}80` 
            : themeColors.selection;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            theme: {
                background: themeColors.background,
                foreground: themeColors.foreground,
                cursor: themeColors.accent,
                cursorAccent: themeColors.background,
                selectionBackground: selectionBg,
                selectionForeground: themeColors.foreground,
                black: themeColors.backgroundTertiary,
                red: themeColors.error,
                green: themeColors.success,
                yellow: themeColors.warning,
                blue: themeColors.info,
                magenta: themeColors.syntaxKeyword,
                cyan: themeColors.syntaxType,
                white: themeColors.foreground,
                brightBlack: themeColors.foregroundSubtle,
                brightRed: themeColors.gitDeleted,
                brightGreen: themeColors.gitAdded,
                brightYellow: themeColors.syntaxString,
                brightBlue: themeColors.accent,
                brightMagenta: themeColors.syntaxFunction,
                brightCyan: themeColors.syntaxVariable,
                brightWhite: themeColors.foreground,
            },
            allowProposedApi: true,
            convertEol: true,
            windowsMode: isWindows,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const initPty = async () => {
            if (!isMounted) return;
            
            try {
                const isWindows = window.navigator.userAgent.includes('Windows');
                const shell = isWindows ? 'powershell.exe' : 'bash';
                const args = isWindows ? ['-NoExit', '-NoLogo'] : [];
                const cwd = workspaceRef.current && workspaceRef.current.trim() !== '' 
                    ? workspaceRef.current 
                    : undefined;

                ptyInstance = await spawn(shell, args, {
                    cols: term.cols || 80,
                    rows: term.rows || 24,
                    cwd: cwd,
                });

                if (!isMounted) {
                    ptyInstance.kill();
                    return;
                }

                ptyRef.current = ptyInstance;
                
                // PTY -> XTerm
                const unlisten = ptyInstance.onData((data: any) => {
                    if (!isMounted) return;
                    try {
                        let text: string;
                        if (typeof data === 'string') {
                            text = data;
                        } else {
                            const bytes = data.buffer ? new Uint8Array(data.buffer) : new Uint8Array(Object.values(data));
                            text = new TextDecoder().decode(bytes);
                        }
                        term.write(text);
                    } catch (err) {
                        // Ignore PTY output errors
                    }
                });

                if (unlisten instanceof Promise) {
                    unlisten.then(unsub => {
                        if (isMounted) dataUnsubscribeRef.current = unsub;
                        else if (typeof unsub === 'function') unsub();
                    });
                } else {
                    dataUnsubscribeRef.current = unlisten;
                }

                // XTerm -> PTY
                termDataUnsubscribeRef.current = term.onData((data) => {
                    if (!isMounted || !ptyRef.current) return;
                    try {
                        // Проверяем, что PTY еще жив перед записью
                        const res = ptyRef.current.write(data);
                        if (res instanceof Promise) {
                            res.catch(err => {
                                // Если ошибка "Invalid handle" или "WSAEWOULDBLOCK", игнорируем или логируем
                                if (err.message?.includes('os error 6') || err.message?.includes('os error 10035')) {
                                    return;
                                }
                            });
                        }
                    } catch (err: any) {
                        // Ignore XTerm data errors
                    }
                });

                // Initial layout
                setTimeout(() => {
                    if (isMounted && xtermRef.current && ptyRef.current) {
                        try {
                            fitAddon.fit();
                            if (xtermRef.current.cols > 0 && xtermRef.current.rows > 0) {
                                ptyRef.current.resize(xtermRef.current.cols, xtermRef.current.rows);
                            }
                            // Второй вызов для гарантии точности
                            setTimeout(() => {
                                if (isMounted && fitAddonRef.current) fitAddonRef.current.fit();
                            }, 100);
                        } catch (err) {
                            // Ignore initial layout error
                        }
                    }
                }, 500);

                if (isActive) term.focus();

            } catch (err) {
                term.write(`\r\nFailed to spawn PTY: ${err}\r\n`);
            }
        };

        initPty();

        return () => {
            isMounted = false;
            isInitializedRef.current = false;

            if (dataUnsubscribeRef.current) {
                if (typeof dataUnsubscribeRef.current === 'function') dataUnsubscribeRef.current();
                else if (dataUnsubscribeRef.current.dispose) dataUnsubscribeRef.current.dispose();
                dataUnsubscribeRef.current = null;
            }

            if (termDataUnsubscribeRef.current) {
                if (termDataUnsubscribeRef.current.dispose) termDataUnsubscribeRef.current.dispose();
                termDataUnsubscribeRef.current = null;
            }

            if (ptyRef.current) {
                ptyRef.current.kill();
                ptyRef.current = null;
            }

            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
        };
    }, [terminalId]);

    // Обновляем тему терминала при смене темы
    useEffect(() => {
        if (!xtermRef.current) return;

        const themeColors = themes[currentTheme].colors;
        
        // Добавляем прозрачность к фону выделения, если её нет
        const selectionBg = themeColors.selection.startsWith('#') && themeColors.selection.length === 7 
            ? `${themeColors.selection}80` 
            : themeColors.selection;

        xtermRef.current.options.theme = {
            background: themeColors.background,
            foreground: themeColors.foreground,
            cursor: themeColors.accent,
            cursorAccent: themeColors.background,
            selectionBackground: selectionBg,
            selectionForeground: themeColors.foreground,
            
            // ANSI Colors
            black: themeColors.backgroundTertiary,
            red: themeColors.error,
            green: themeColors.success,
            yellow: themeColors.warning,
            blue: themeColors.info,
            magenta: themeColors.syntaxKeyword,
            cyan: themeColors.syntaxType,
            white: themeColors.foreground,
            
            // Bright ANSI Colors
            brightBlack: themeColors.foregroundSubtle,
            brightRed: themeColors.gitDeleted,
            brightGreen: themeColors.gitAdded,
            brightYellow: themeColors.syntaxString,
            brightBlue: themeColors.accent,
            brightMagenta: themeColors.syntaxFunction,
            brightCyan: themeColors.syntaxVariable,
            brightWhite: themeColors.foreground,
        };
    }, [currentTheme]);

    // Handle Active state (focus)
    useEffect(() => {
        if (isActive && xtermRef.current) {
            xtermRef.current.focus();
        }
    }, [isActive]);

    // Handle Resize with ResizeObserver
    useEffect(() => {
        if (!terminalRef.current) return;

        const handleResize = () => {
            if (fitAddonRef.current && xtermRef.current && ptyRef.current && isActive) {
                try {
                    fitAddonRef.current.fit();
                    const { cols, rows } = xtermRef.current;
                    if (cols > 0 && rows > 0) {
                        ptyRef.current.resize(cols, rows);
                    }
                } catch (err) {
                    // Ignore resize errors
                }
            }
        };

        // Debounce resize to avoid too many calls
        let resizeTimeout: number | null = null;
        const resizeObserver = new ResizeObserver(() => {
            if (resizeTimeout !== null) {
                window.clearTimeout(resizeTimeout);
            }
            resizeTimeout = window.setTimeout(handleResize, 100);
        });

        resizeObserver.observe(terminalRef.current);

        return () => {
            resizeObserver.disconnect();
            if (resizeTimeout !== null) {
                window.clearTimeout(resizeTimeout);
            }
        };
    }, [isActive]);

    // Also fit when isActive changes (e.g. tab switch)
    useEffect(() => {
        if (isActive && fitAddonRef.current && xtermRef.current && ptyRef.current) {
            // Small delay to ensure layout is complete and container has dimensions
            const timeout = setTimeout(() => {
                try {
                    if (fitAddonRef.current && xtermRef.current) {
                        fitAddonRef.current.fit();
                        const { cols, rows } = xtermRef.current;
                        if (cols > 0 && rows > 0 && ptyRef.current) {
                            ptyRef.current.resize(cols, rows);
                        }
                    }
                } catch (err) {
                    console.error('Fit on active error:', err);
                }
            }, 50);

            return () => clearTimeout(timeout);
        }
    }, [isActive]);

    return (
        <div
            className={styles.terminalView}
            style={{ display: isActive ? 'flex' : 'none' }}
        >
            <div
                ref={terminalRef}
                className={styles.xtermContainer}
            />
        </div>
    );
};

export const TerminalView = React.memo(TerminalViewComponent);
