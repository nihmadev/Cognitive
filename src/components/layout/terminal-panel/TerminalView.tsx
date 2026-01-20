import { useEffect, useRef } from 'react';
import React from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { spawn } from 'tauri-pty';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore, themes } from '../../../store/uiStore';
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
    const { currentWorkspace } = useProjectStore();
    const { theme: currentTheme } = useUIStore();
    const workspaceRef = useRef(currentWorkspace);
    
    // Обновляем ref при изменении workspace
    useEffect(() => {
        workspaceRef.current = currentWorkspace;
    }, [currentWorkspace]);

    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return;


        // Получаем цвета из текущей темы
        const themeColors = themes[currentTheme].colors;

        // Initialize xterm.js с цветами из темы
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            theme: {
                background: themeColors.background,
                foreground: themeColors.foreground,
                cursor: themeColors.accent,
                cursorAccent: themeColors.background,
                selectionBackground: themeColors.selection,
                selectionForeground: themeColors.foreground,
                
                // ANSI Colors - используем цвета из темы
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
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Initialize PTY
        const initPty = async () => {
            try {
                // Определяем shell в зависимости от ОС
                const isWindows = window.navigator.userAgent.includes('Windows');
                const shell = isWindows ? 'powershell.exe' : 'bash';
                const args = isWindows ? ['-NoLogo'] : [];

                // Spawn PTY process используя tauri-pty API
                const pty = spawn(shell, args, {
                    cols: term.cols,
                    rows: term.rows,
                    cwd: workspaceRef.current || undefined,
                });

                ptyRef.current = pty;

                // Listen for PTY output
                pty.onData((data: any) => {
                    try {
                        let text: string;
                        
                        if (typeof data === 'string') {
                            text = data;
                        } else if (data instanceof Uint8Array) {
                            text = new TextDecoder().decode(data);
                        } else if (Array.isArray(data)) {
                            const uint8Array = new Uint8Array(data);
                            text = new TextDecoder().decode(uint8Array);
                        } else if (data && typeof data === 'object' && data.buffer) {
                            text = new TextDecoder().decode(new Uint8Array(data.buffer || data));
                        } else {
                            return;
                        }
                        
                        term.write(text);
                    } catch (err) {
                    }
                });

                // Handle terminal input
                term.onData((data) => {
                    try {
                        pty.write(data);
                    } catch (err) {
                    }
                });

            } catch (err) {
                term.write(`\r\n\x1b[31mFailed to spawn PTY: ${err}\x1b[0m\r\n`);
                term.write(`\r\nPlease check that PowerShell is installed and accessible.\r\n`);
            }
        };

        initPty();

        return () => {
            if (ptyRef.current) {
                ptyRef.current.kill();
            }
            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
        };
    }, [terminalId]); // Убрали currentWorkspace из зависимостей чтобы избежать двойной инициализации

    // Обновляем тему терминала при смене темы
    useEffect(() => {
        if (!xtermRef.current) return;

        const themeColors = themes[currentTheme].colors;
        
        xtermRef.current.options.theme = {
            background: themeColors.background,
            foreground: themeColors.foreground,
            cursor: themeColors.accent,
            cursorAccent: themeColors.background,
            selectionBackground: themeColors.selection,
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

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (fitAddonRef.current && xtermRef.current && ptyRef.current) {
                try {
                    fitAddonRef.current.fit();
                    const { cols, rows } = xtermRef.current;
                    ptyRef.current.resize(cols, rows);
                } catch (err) {
                }
            }
        };

        // Debounce resize to avoid too many calls
        let resizeTimeout: number | null = null;
        const debouncedResize = () => {
            if (resizeTimeout !== null) {
                window.clearTimeout(resizeTimeout);
            }
            resizeTimeout = window.setTimeout(handleResize, 100);
        };

        window.addEventListener('resize', debouncedResize);

        // Initial fit after a short delay to ensure container is rendered
        const timeout = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', debouncedResize);
            clearTimeout(timeout);
            if (resizeTimeout !== null) {
                window.clearTimeout(resizeTimeout);
            }
        };
    }, []);

    // Also fit when isActive changes (e.g. tab switch) or when terminal panel is resized
    useEffect(() => {
        if (isActive && fitAddonRef.current && xtermRef.current && ptyRef.current) {
            // Small delay to ensure layout is complete
            const timeout = setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                    const { cols, rows } = xtermRef.current!;
                    ptyRef.current?.resize(cols, rows);
                } catch (err) {
                }
            }, 50);

            return () => clearTimeout(timeout);
        }
    }, [isActive]);

    return (
        <div
            className={styles.terminalView}
            style={{ display: isActive ? 'flex' : 'none', height: '100%', width: '100%' }}
        >
            <div
                ref={terminalRef}
                style={{
                    flex: 1,
                    height: '100%',
                    width: '100%',
                }}
            />
        </div>
    );
};

export const TerminalView = React.memo(TerminalViewComponent);
