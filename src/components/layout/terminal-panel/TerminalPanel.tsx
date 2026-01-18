import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { tauriApi } from '../../../lib/tauri-api';
import styles from './TerminalPanel.module.css';
import { TerminalView } from './TerminalView';
import { useTerminalStore } from '../../../store/terminalStore';
import {
    TerminalHeader,
    ProblemsPanel,
    PortsPanel,
    TerminalSidebar,
} from './components';

type TabId = 'problems' | 'output' | 'debug' | 'ports' | 'terminal';

export const TerminalPanel = () => {
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);
    const { bottomPanelTab, setBottomPanelTab } = useUIStore();
    const { terminals, activeTerminalId, addTerminal } = useTerminalStore();

    const [activeTab, setActiveTab] = useState<TabId>(bottomPanelTab);
    const [problemsCount, setProblemsCount] = useState(0);

    // Sidebar state - mimicking VS Code, often persistent if you have terminals
    const [showTerminalSidebar, setShowTerminalSidebar] = useState(true);

    useEffect(() => {
        setActiveTab(bottomPanelTab);
    }, [bottomPanelTab]);

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab);
        setBottomPanelTab(tab);
    };

    const fetchProblemsCount = useCallback(async () => {
        if (!currentWorkspace) {
            setProblemsCount(0);
            return;
        }
        try {
            const result = await tauriApi.getProblems(currentWorkspace);
            setProblemsCount(result.total_errors + result.total_warnings);
        } catch {
            // ignore
        }
    }, [currentWorkspace]);

    useEffect(() => {
        fetchProblemsCount();
        const interval = setInterval(fetchProblemsCount, 10000);
        return () => clearInterval(interval);
    }, [fetchProblemsCount]);

    return (
        <div className={styles.panel}>
            <TerminalHeader
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                problemsCount={problemsCount}
            />

            <div className={styles.mainContent}>
                {activeTab === 'problems' && <ProblemsPanel />}

                {activeTab === 'output' && (
                    <div className={styles.placeholderContent}>
                        <div className={styles.placeholderText}>Output panel</div>
                    </div>
                )}
                {activeTab === 'debug' && (
                    <div className={styles.placeholderContent}>
                        <div className={styles.placeholderText}>Debug Console panel</div>
                    </div>
                )}
                {activeTab === 'ports' && <PortsPanel />}

                {activeTab === 'terminal' && (
                    <div className={styles.terminalContainer}>
                        <div className={styles.terminalsWrapper}>
                            {terminals.map((t) => (
                                <TerminalView
                                    key={t.id}
                                    terminalId={t.id}
                                    isActive={activeTerminalId === t.id}
                                />
                            ))}
                            {terminals.length === 0 && (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyStateText}>No active terminals</div>
                                    <button
                                        className={styles.createTerminalButton}
                                        onClick={() => addTerminal('powershell')}
                                    >
                                        New Terminal
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Always show sidebar if there are terminals, or just if terminals > 1? VS Code usually shows if configured or > 1 */}
                        {terminals.length > 0 && (
                            <TerminalSidebar
                                setShowTerminalSidebar={setShowTerminalSidebar}
                                setSelectedTerminalId={() => { }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
