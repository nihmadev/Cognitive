import clsx from 'clsx';
import styles from '../TerminalPanel.module.css';
import { useTerminalStore } from '../../../../store/terminalStore';
import { CloseIcon } from '../Icons';

interface TerminalSidebarProps {
    setShowTerminalSidebar: (show: boolean) => void;
    setSelectedTerminalId: (id: string | null) => void;
}

export const TerminalSidebar = ({
    setShowTerminalSidebar,
    setSelectedTerminalId,
}: TerminalSidebarProps) => {
    const {
        terminals,
        activeTerminalId,
        removeTerminal,
        setActiveTerminal,
        getTerminalTypeLabel,
    } = useTerminalStore();

    return (
        <div className={styles.terminalSidebar}>
            <div className={styles.sidebarHeader}>
                <h4>Terminals</h4>
                <button
                    className={styles.sidebarCloseButton}
                    onClick={() => setShowTerminalSidebar(false)}
                >
                    <CloseIcon />
                </button>
            </div>
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
                        title={
                            terminal.pid && terminal.processName
                                ? `PID: ${terminal.pid}, Process: ${terminal.processName}`
                                : undefined
                        }
                    >
                        <div className={styles.terminalItemInfo}>
                            <div className={styles.terminalItemName}>
                                {getTerminalTypeLabel(terminal.type)}
                            </div>
                            <div className={styles.terminalItemStatus}>
                                {terminal.pid && terminal.processName ? `PID: ${terminal.pid}` : 'Ready'}
                            </div>
                        </div>
                        <button
                            className={styles.terminalItemClose}
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTerminal(terminal.id);
                            }}
                        >
                            <CloseIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
