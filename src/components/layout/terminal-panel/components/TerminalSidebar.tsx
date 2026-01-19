import clsx from 'clsx';
import { Trash2, SplitSquareHorizontal, Terminal } from 'lucide-react';
import styles from '../TerminalPanel.module.css';
import { useTerminalStore } from '../../../../store/terminalStore';

interface TerminalSidebarProps {
    setShowTerminalSidebar: (show: boolean) => void;
    setSelectedTerminalId: (id: string | null) => void;
}

export const TerminalSidebar = ({

    setSelectedTerminalId,
}: TerminalSidebarProps) => {
    const {
        terminals,
        activeTerminalId,
        removeTerminal,
        setActiveTerminal,
        addTerminal,
        getTerminalTypeLabel,
    } = useTerminalStore();

    return (
        <div className={styles.terminalSidebar}>
            <div className={styles.terminalList}>
                {terminals.map((terminal) => (
                    <div
                        key={terminal.id}
                        className={clsx(
                            styles.terminalListItem,
                            activeTerminalId === terminal.id && styles.activeTerminalItem
                        )}
                        onClick={() => {
                            setActiveTerminal(terminal.id);
                            setSelectedTerminalId(terminal.id);
                        }}
                    >
                        <div className={styles.terminalItemMain}>
                            <div className={styles.terminalItemIcon}>
                                {/* Use Lucide Terminal icon or custom logic based on shell type */}
                                <Terminal size={14} />
                            </div>
                            <div className={styles.terminalItemName}>
                                {getTerminalTypeLabel(terminal.type).toLowerCase()}
                            </div>
                        </div>
                        <div className={styles.terminalItemActions}>
                            <button
                                className={styles.terminalItemAction}
                                title="Split Terminal"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addTerminal(terminal.type); // Simple split simulation
                                }}
                            >
                                <SplitSquareHorizontal />
                            </button>
                            <button
                                className={styles.terminalItemAction}
                                title="Kill Terminal"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTerminal(terminal.id);
                                }}
                            >
                                <Trash2 />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
