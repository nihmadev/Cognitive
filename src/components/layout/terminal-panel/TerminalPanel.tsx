import { useState } from 'react';
import React from 'react';
import { useUIStore } from '../../../store/uiStore';
import { useDiagnosticsStore } from '../../../store/diagnosticsStore';
import styles from './TerminalPanel.module.css';
import { TerminalView } from './TerminalView';
import { useTerminalStore } from '../../../store/terminalStore';
import clsx from 'clsx';
import {
    TerminalHeader,
    ProblemsPanel,
    PortsPanel,
    TerminalSidebar,
} from './components';

type TabId = 'problems' | 'output' | 'debug' | 'ports' | 'terminal';

const TerminalPanelComponent = () => {
    const { bottomPanelTab, setBottomPanelTab, isTerminalMaximized, setTerminalOpen } = useUIStore();
    const { terminals, activeTerminalId, addTerminal } = useTerminalStore();
    
    // Используем диагностику из Monaco вместо медленного tsc
    const errors = useDiagnosticsStore((state) => state.getErrorCount());
    const warnings = useDiagnosticsStore((state) => state.getWarningCount());
    const problemsCount = errors + warnings;

    // Sidebar state - mimicking VS Code, often persistent if you have terminals
    const [, setShowTerminalSidebar] = useState(true);

    // Listen for terminal exit event
    React.useEffect(() => {
        const handleTerminalExit = () => {
            setTerminalOpen(false);
        };

        window.addEventListener('closeTerminalPanel', handleTerminalExit);
        return () => {
            window.removeEventListener('closeTerminalPanel', handleTerminalExit);
        };
    }, [setTerminalOpen]);

    const handleTabChange = (tab: TabId) => {
        setBottomPanelTab(tab);
    };

    return (
        <div className={clsx(styles.panel, isTerminalMaximized && styles.panelMaximized)}>
            <TerminalHeader
                activeTab={bottomPanelTab}
                setActiveTab={handleTabChange}
                problemsCount={problemsCount}
            />

            <div className={styles.mainContent}>
                <div 
                    className={styles.content} 
                    style={{ display: bottomPanelTab === 'problems' ? 'flex' : 'none' }}
                >
                    <ProblemsPanel />
                </div>

                <div 
                    className={styles.content} 
                    style={{ display: bottomPanelTab === 'output' ? 'flex' : 'none' }}
                >
                    <div className={styles.placeholderContent}>
                        <div className={styles.placeholderText}>Output panel</div>
                    </div>
                </div>

                <div 
                    className={styles.content} 
                    style={{ display: bottomPanelTab === 'debug' ? 'flex' : 'none' }}
                >
                    <div className={styles.placeholderContent}>
                        <div className={styles.placeholderText}>Debug Console panel</div>
                    </div>
                </div>

                <div 
                    className={styles.content} 
                    style={{ display: bottomPanelTab === 'ports' ? 'flex' : 'none' }}
                >
                    <PortsPanel />
                </div>

                <div 
                    className={styles.terminalContainer}
                    style={{ display: bottomPanelTab === 'terminal' ? 'flex' : 'none' }}
                >
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
            </div>
        </div>
    );
};

export const TerminalPanel = React.memo(TerminalPanelComponent);
