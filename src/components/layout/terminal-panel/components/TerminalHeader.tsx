import clsx from 'clsx';
import {
    Plus,
    ChevronDown,
    SplitSquareHorizontal,
    MoreHorizontal,
    Maximize2,
    X
} from 'lucide-react';
import styles from '../TerminalPanel.module.css';
import { useUIStore } from '../../../../store/uiStore';
import { useTerminalStore } from '../../../../store/terminalStore';

type TabId = 'problems' | 'output' | 'debug' | 'ports' | 'terminal';

interface Tab {
    id: TabId;
    label: string;
    badge?: number;
}

interface TerminalHeaderProps {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
    problemsCount?: number;
}

export const TerminalHeader = ({
    activeTab,
    setActiveTab,
    problemsCount = 0,
}: TerminalHeaderProps) => {
    const { setTerminalOpen } = useUIStore();
    const { addTerminal } = useTerminalStore();

    const tabs: Tab[] = [
        { id: 'problems', label: 'PROBLEMS', badge: problemsCount > 0 ? problemsCount : undefined },
        { id: 'output', label: 'OUTPUT' },
        { id: 'debug', label: 'DEBUG CONSOLE' },
        { id: 'terminal', label: 'TERMINAL' },
        { id: 'ports', label: 'PORTS' },
    ];

    return (
        <div className={styles.header}>
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.badge && <span className={styles.badge}>{tab.badge}</span>}
                    </button>
                ))}
            </div>

            <div className={styles.controls}>
                {activeTab === 'terminal' && (
                    <>
                        <div className={styles.actionDropdown}>
                            <button
                                className={styles.actionButton}
                                title="New Terminal"
                                onClick={() => addTerminal('powershell')}
                            >
                                <Plus size={16} />
                            </button>
                            <button className={clsx(styles.actionButton, styles.dropdownArrow)} title="Select Default Profile">
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <button className={styles.actionButton} title="Split Terminal" onClick={() => addTerminal('powershell')}>
                            <SplitSquareHorizontal size={16} />
                        </button>
                        <button className={styles.actionButton} title="More Actions">
                            <MoreHorizontal size={16} />
                        </button>
                    </>
                )}
                <button className={styles.actionButton} title="Maximize">
                    <Maximize2 size={16} />
                </button>
                <button
                    className={styles.actionButton}
                    title="Close"
                    onClick={() => setTerminalOpen(false)}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
