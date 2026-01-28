import clsx from 'clsx';
import { Terminal, Play } from 'lucide-react';
import styles from '../TerminalPanel.module.css';
import { useTerminalStore } from '../../../../store/terminalStore';
import { PlusIcon, CloseIcon, PowerShellIcon } from '../Icons';

type TabId = 'problems' | 'output' | 'debug' | 'terminal' | 'ports';

interface TerminalTabsProps {
    activeTab: TabId;
}

export const TerminalTabs = ({ activeTab }: TerminalTabsProps) => {
    const {
        terminals,
        activeTerminalId,
        addTerminal,
        removeTerminal,
        setActiveTerminal,
        getTerminalTypeLabel,
    } = useTerminalStore();

    return (
        <div className={styles.terminalTabs}>
            {terminals.map((t) => (
                <button
                    key={t.id}
                    className={clsx(
                        styles.terminalTab,
                        activeTerminalId === t.id && styles.terminalTabActive
                    )}
                    onClick={() => setActiveTerminal(t.id)}
                    title={t.pid && t.processName ? `PID: ${t.pid}, Process: ${t.processName}` : undefined}
                >
                    {t.type === 'powershell' ? (
                        <PowerShellIcon />
                    ) : t.type === 'bash' ? (
                        <Play size={14} />
                    ) : (
                        <Terminal size={14} />
                    )}
                    <span>{t.name || getTerminalTypeLabel(t.type)}</span>
                    <div
                        className={styles.terminalTabClose}
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTerminal(t.id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                removeTerminal(t.id);
                            }
                        }}
                    >
                        <CloseIcon />
                    </div>
                </button>
            ))}
            <button
                className={styles.terminalTabAdd}
                onClick={() => {
                    if (activeTab === 'terminal') {
                        addTerminal('powershell');
                    }
                }}
                title="New Terminal"
            >
                <PlusIcon />
            </button>
        </div>
    );
};
