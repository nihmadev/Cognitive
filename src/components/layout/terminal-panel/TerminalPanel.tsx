import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { tauriApi } from '../../../lib/tauri-api';
import styles from './styles';
import {
    TerminalHeader,
    ProblemsPanel,
    PortsPanel,
} from './components';

type TabId = 'problems' | 'output' | 'debug' | 'ports';

export const TerminalPanel = () => {
    const currentWorkspace = useProjectStore((state) => state.currentWorkspace);
    const { bottomPanelTab, setBottomPanelTab } = useUIStore();

    const [activeTab, setActiveTab] = useState<TabId>(bottomPanelTab);
    const [problemsCount, setProblemsCount] = useState(0);

    // Sync with store
    useEffect(() => {
        setActiveTab(bottomPanelTab);
    }, [bottomPanelTab]);

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab);
        setBottomPanelTab(tab);
    };

    // Fetch problems count for badge
    const fetchProblemsCount = useCallback(async () => {
        if (!currentWorkspace) {
            setProblemsCount(0);
            return;
        }
        try {
            const result = await tauriApi.getProblems(currentWorkspace);
            setProblemsCount(result.total_errors + result.total_warnings);
        } catch {
            // Ignore errors for badge count
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
                <div className={styles.content}>
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
                </div>
            </div>
        </div>
    );
};
