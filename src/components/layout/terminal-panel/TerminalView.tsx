import { useEffect, useRef } from 'react';
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

export const TerminalView = ({ terminalId, isActive }: TerminalViewProps) => {
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

        console.log('Initializing terminal:', terminalId);

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

                console.log('Spawning PTY with shell:', shell);

                // Spawn PTY process используя tauri-pty API
                const pty = spawn(shell, args, {
                    cols: term.cols,
                    rows: term.rows,
                    cwd: workspaceRef.current || undefined,
                });

                ptyRef.current = pty;
                console.log('PTY spawning...');

                // Listen for PTY output
                pty.onData((data: any) => {
                    console.log('Received PTY data, type:', typeof data, 'isArray:', Array.isArray(data));
                    
                    try {
                        let text: string;
                        
                        if (typeof data === 'string') {
                            // Данные уже строка
                            text = data;
                        } else if (data instanceof Uint8Array) {
                            // Uint8Array
                            text = new TextDecoder().decode(data);
                        } else if (Array.isArray(data)) {
                            // Массив чисел
                            const uint8Array = new Uint8Array(data);
                            text = new TextDecoder().decode(uint8Array);
                        } else if (data && typeof data === 'object' && data.buffer) {
                            // ArrayBuffer или похожий объект
                            text = new TextDecoder().decode(new Uint8Array(data.buffer || data));
                        } else {
                            console.warn('Unknown data format:', data);
                            return;
                        }
                        
                        term.write(text);
                    } catch (err) {
                        console.error('Failed to decode PTY data:', err, data);
                    }
                });

                // Handle terminal input
                term.onData((data) => {
                    console.log('Writing to PTY:', data);
                    pty.write(data);
                });

                term.write('\x1b[32mTerminal ready\x1b[0m\r\n');

            } catch (err) {
                term.write(`\r\n\x1b[31mFailed to spawn PTY: ${err}\x1b[0m\r\n`);
                console.error('PTY spawn error:', err);
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
                fitAddonRef.current.fit();
                const { cols, rows } = xtermRef.current;
                ptyRef.current.resize(cols, rows);
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial fit after a short delay to ensure container is rendered
        const timeout = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeout);
        };
    }, []);

    // Also fit when isActive changes (e.g. tab switch)
    useEffect(() => {
        if (isActive && fitAddonRef.current && xtermRef.current && ptyRef.current) {
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            ptyRef.current.resize(cols, rows);
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
