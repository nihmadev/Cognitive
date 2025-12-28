import clsx from 'clsx';
import styles from '../styles';
import { MaximizeIcon, CloseIcon } from '../Icons';
import { useUIStore } from '../../../../store/uiStore';

type TabId = 'problems' | 'output' | 'debug' | 'ports';

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
    
    const tabs: Tab[] = [
        { id: 'problems', label: 'Problems', badge: problemsCount > 0 ? problemsCount : undefined },
        { id: 'output', label: 'Output' },
        { id: 'debug', label: 'Debug Console' },
        { id: 'ports', label: 'Ports' },
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
                <button className={styles.actionButton} title="Maximize">
                    <MaximizeIcon />
                </button>
                <button 
                    className={styles.actionButton} 
                    title="Close"
                    onClick={() => setTerminalOpen(false)}
                >
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
};
