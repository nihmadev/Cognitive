import { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminalStore } from '../../../store/terminalStore';
import { useProjectStore } from '../../../store/projectStore';
import { tauriApi } from '../../../lib/tauri-api';
import { listen } from '@tauri-apps/api/event';
import styles from './styles/terminal.module.css';

interface TerminalViewProps {
    terminalId: string;
    isActive: boolean;
}

interface TerminalLine {
    id: number;
    content: string;
    html: string;
}

// ANSI color codes to CSS
const ANSI_COLORS: Record<number, string> = {
    30: '#000000', 31: '#f14c4c', 32: '#4caf50', 33: '#e3d14a',
    34: '#1e90ff', 35: '#d33682', 36: '#2aa198', 37: '#cccccc',
    90: '#666666', 91: '#f14c4c', 92: '#4caf50', 93: '#e3d14a',
    94: '#1e90ff', 95: '#d33682', 96: '#2aa198', 97: '#ffffff',
};

const ANSI_BG_COLORS: Record<number, string> = {
    40: '#000000', 41: '#f14c4c', 42: '#4caf50', 43: '#e3d14a',
    44: '#1e90ff', 45: '#d33682', 46: '#2aa198', 47: '#cccccc',
    100: '#666666', 101: '#f14c4c', 102: '#4caf50', 103: '#e3d14a',
    104: '#1e90ff', 105: '#d33682', 106: '#2aa198', 107: '#ffffff',
};

function parseAnsiToHtml(text: string): string {
    let result = '';
    let currentStyles: string[] = [];
    let i = 0;

    const escapeHtml = (str: string) => 
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    while (i < text.length) {
        if (text[i] === '\x1b' && text[i + 1] === '[') {
            let j = i + 2;
            let params = '';
            while (j < text.length && /[\d;]/.test(text[j])) {
                params += text[j];
                j++;
            }
            const cmd = text[j];
            
            if (cmd === 'm') {
                const codes = params ? params.split(';').map(Number) : [0];
                for (const code of codes) {
                    if (code === 0) {
                        currentStyles = [];
                    } else if (code === 1) {
                        currentStyles.push('font-weight:bold');
                    } else if (code === 3) {
                        currentStyles.push('font-style:italic');
                    } else if (code === 4) {
                        currentStyles.push('text-decoration:underline');
                    } else if (ANSI_COLORS[code]) {
                        currentStyles = currentStyles.filter(s => !s.startsWith('color:'));
                        currentStyles.push(`color:${ANSI_COLORS[code]}`);
                    } else if (ANSI_BG_COLORS[code]) {
                        currentStyles = currentStyles.filter(s => !s.startsWith('background:'));
                        currentStyles.push(`background:${ANSI_BG_COLORS[code]}`);
                    }
                }
            }
            i = j + 1;
        } else {
            const style = currentStyles.length > 0 ? ` style="${currentStyles.join(';')}"` : '';
            result += `<span${style}>${escapeHtml(text[i])}</span>`;
            i++;
        }
    }
    return result;
}

export const TerminalView = ({ terminalId, isActive }: TerminalViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const backendTerminalIdRef = useRef<string | null>(null);
    const unlistenRef = useRef<(() => void) | null>(null);
    const isInitializedRef = useRef(false);
    const lineIdRef = useRef(0);
    const cursorPosRef = useRef(0);
    
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [currentLine, setCurrentLine] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);
    
    const { terminals, updateTerminal } = useTerminalStore();
    const { currentWorkspace } = useProjectStore();
    const terminal = terminals.find((t) => t.id === terminalId);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines, currentLine]);

    // Cursor blink
    useEffect(() => {
        const interval = setInterval(() => setCursorVisible(v => !v), 530);
        return () => clearInterval(interval);
    }, []);

    // Focus input when active
    useEffect(() => {
        if (isActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isActive]);

    const appendOutput = useCallback((data: string) => {
        // Handle carriage return and newlines
        const parts = data.split(/(\r\n|\n|\r)/);
        
        setCurrentLine(prevCurrentLine => {
            let tempCurrentLine = prevCurrentLine;
            let tempCursorPos = cursorPosRef.current;
            const newLines: TerminalLine[] = [];
            
            for (const part of parts) {
                if (part === '\r\n' || part === '\n') {
                    // New line
                    newLines.push({
                        id: lineIdRef.current++,
                        content: tempCurrentLine,
                        html: parseAnsiToHtml(tempCurrentLine)
                    });
                    tempCurrentLine = '';
                    tempCursorPos = 0;
                } else if (part === '\r') {
                    // Carriage return - move cursor to start
                    tempCursorPos = 0;
                } else if (part) {
                    // Handle backspace and regular characters
                    for (const char of part) {
                        if (char === '\b') {
                            if (tempCursorPos > 0) {
                                tempCursorPos--;
                            }
                        } else {
                            const before = tempCurrentLine.slice(0, tempCursorPos);
                            const after = tempCurrentLine.slice(tempCursorPos + 1);
                            tempCurrentLine = before + char + after;
                            tempCursorPos++;
                        }
                    }
                }
            }
            
            // Update cursor position ref
            cursorPosRef.current = tempCursorPos;
            
            // Add new lines if any
            if (newLines.length > 0) {
                setLines(prev => {
                    const combined = [...prev, ...newLines];
                    // Limit lines to prevent memory issues
                    if (combined.length > 5000) {
                        return combined.slice(-4000);
                    }
                    return combined;
                });
            }
            
            return tempCurrentLine;
        });
    }, []);

    // Initialize terminal
    useEffect(() => {
        if (!terminal || isInitializedRef.current) return;
        isInitializedRef.current = true;
        backendTerminalIdRef.current = terminal.backendTerminalId;

        const setupTerminal = async () => {
            // Listen for output
            const unlisten = await listen('terminal-output', (event: any) => {
                const output = event.payload as { terminal_id: string; data: string };
                if (backendTerminalIdRef.current && output.terminal_id === backendTerminalIdRef.current) {
                    appendOutput(output.data);
                }
            });
            unlistenRef.current = unlisten;

            // Create backend terminal
            try {
                const terminalInfo = await tauriApi.createTerminal(
                    terminal.type,
                    currentWorkspace || undefined,
                    { rows: 24, cols: 120 }
                );
                backendTerminalIdRef.current = terminalInfo.terminal_id;
                updateTerminal(terminalId, {
                    backendTerminalId: terminalInfo.terminal_id,
                    pid: terminalInfo.pid,
                    processName: terminalInfo.process_name
                });
            } catch (err) {
                console.error('Failed to create terminal:', err);
                appendOutput(`\x1b[31mError: Failed to create terminal - ${err}\x1b[0m\n`);
            }
        };

        setupTerminal();

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
            backendTerminalIdRef.current = null;
            isInitializedRef.current = false;
        };
    }, [terminalId, terminal, currentWorkspace, updateTerminal, appendOutput]);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        const currentId = backendTerminalIdRef.current;
        if (!currentId) return;

        try {
            if (e.key === 'Enter') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, inputValue + '\r\n');
                setInputValue('');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\t');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[A');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[B');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[D');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[C');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x7f');
            } else if (e.key === 'Delete') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[3~');
            } else if (e.key === 'Home') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[H');
            } else if (e.key === 'End') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b[F');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                await tauriApi.writeTerminal(currentId, '\x1b');
            } else if (e.ctrlKey) {
                e.preventDefault();
                if (e.key === 'c') {
                    await tauriApi.writeTerminal(currentId, '\x03');
                } else if (e.key === 'd') {
                    await tauriApi.writeTerminal(currentId, '\x04');
                } else if (e.key === 'l') {
                    setLines([]);
                    setCurrentLine('');
                    cursorPosRef.current = 0;
                    await tauriApi.writeTerminal(currentId, '\x0c');
                } else if (e.key === 'z') {
                    await tauriApi.writeTerminal(currentId, '\x1a');
                } else if (e.key === 'a') {
                    await tauriApi.writeTerminal(currentId, '\x01');
                } else if (e.key === 'e') {
                    await tauriApi.writeTerminal(currentId, '\x05');
                } else if (e.key === 'u') {
                    await tauriApi.writeTerminal(currentId, '\x15');
                } else if (e.key === 'k') {
                    await tauriApi.writeTerminal(currentId, '\x0b');
                } else if (e.key === 'w') {
                    await tauriApi.writeTerminal(currentId, '\x17');
                }
            }
        } catch (err) {
            console.error('Failed to write to terminal:', err);
        }
    };

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const diff = newValue.slice(inputValue.length);
        setInputValue(newValue);
        
        if (diff && backendTerminalIdRef.current) {
            try {
                await tauriApi.writeTerminal(backendTerminalIdRef.current, diff);
            } catch (err) {
                console.error('Failed to write to terminal:', err);
            }
        }
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div
            className={styles.terminalView}
            ref={containerRef}
            onClick={handleContainerClick}
            style={{ display: isActive ? 'flex' : 'none' }}
        >
            <div className={styles.output} ref={outputRef}>
                {lines.map(line => (
                    <div 
                        key={line.id} 
                        className={styles.line}
                        dangerouslySetInnerHTML={{ __html: line.html || '&nbsp;' }}
                    />
                ))}
                <div className={styles.line}>
                    {currentLine && (
                        <span dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(currentLine) }} />
                    )}
                    <span className={`${styles.cursor} ${cursorVisible ? styles.visible : ''}`}>█</span>
                </div>
            </div>
            <input
                ref={inputRef}
                type="text"
                className={styles.hiddenInput}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
            />
        </div>
    );
};
