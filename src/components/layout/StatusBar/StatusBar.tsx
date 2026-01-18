import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { useGitStore } from '../../../store/gitStore';
import { tauriApi } from '../../../lib/tauri-api';
import { BranchModal } from '../BranchModal';
import styles from '../../../App.module.css';

import { GitSection } from './GitSection';
import { ProblemsSection } from './ProblemsSection';
import { UIControlsSection } from './UIControlsSection';
import { EditorInfoSection } from './EditorInfoSection';
import {
    getLanguageFromExtension,
    countIssues,
    generateRandomCommitMessage,
    isBinaryFile
} from './statusBarUtils';

interface GitInfo {
    branch: string;
    hasChanges: boolean;
}

export const StatusBar = () => {
    const {
        activeFile,
        currentWorkspace,
        cursorPosition,
        errors,
        warnings,
        setFileErrors,
        setFileWarnings
    } = useProjectStore();

    const {
        zoomLevel,
        zoomIn,
        zoomOut,
        resetZoom,
        insertMode,
        toggleInsertMode,
        setBottomPanelTab,
        setTerminalOpen
    } = useUIStore();

    const { isPushing, push: pushToRemote, stageAll, commit, setCommitMessage } = useGitStore();

    const [gitInfo, setGitInfo] = useState<GitInfo>({ branch: 'main', hasChanges: false });
    const [language, setLanguage] = useState<string>('Plain Text');
    const [lineCount, setLineCount] = useState<number>(0);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

    const updateGitInfo = useCallback(async () => {
        if (!currentWorkspace) return;

        try {
            const [branchInfo, statusInfo] = await Promise.all([
                tauriApi.gitInfo(currentWorkspace).catch(() => ({ branch: 'main' })),
                tauriApi.gitStatus(currentWorkspace).catch(() => [])
            ]);

            setGitInfo({
                branch: branchInfo.branch || 'main',
                hasChanges: statusInfo.length > 0
            });
        } catch (error) {
            console.error('Failed to update git info:', error);
            setGitInfo({ branch: 'main', hasChanges: false });
        }
    }, [currentWorkspace]);

    const handlePush = useCallback(async () => {
        if (!currentWorkspace || !gitInfo.hasChanges) return;

        try {
            await stageAll(currentWorkspace);
            const randomMessage = generateRandomCommitMessage();
            setCommitMessage(randomMessage);
            await commit(currentWorkspace);
            await pushToRemote(currentWorkspace);
            updateGitInfo();
        } catch (error) {
            console.error('Commit and push failed:', error);
        }
    }, [currentWorkspace, gitInfo.hasChanges, stageAll, commit, setCommitMessage, pushToRemote, updateGitInfo]);

    const analyzeFile = useCallback(async (filePath: string) => {
        try {
            const extension = filePath.split('.').pop()?.toLowerCase() || '';

            if (isBinaryFile(extension)) {
                setLineCount(0);
                setLanguage('Binary');
                setFileErrors(filePath, 0);
                setFileWarnings(filePath, 0);
                return;
            }

            const content = await tauriApi.readFile(filePath);
            const lines = content.split('\n');
            setLineCount(lines.length);

            const detectedLanguage = getLanguageFromExtension(extension);
            setLanguage(detectedLanguage);

            const { errorCount, warningCount } = countIssues(content, detectedLanguage);
            setFileErrors(filePath, errorCount);
            setFileWarnings(filePath, warningCount);

        } catch (error) {
            console.error('Failed to analyze file:', error);
            setFileErrors(filePath, 0);
            setFileWarnings(filePath, 0);
        }
    }, [setFileErrors, setFileWarnings]);

    useEffect(() => {
        if (activeFile) {
            analyzeFile(activeFile);
        } else {
            setLineCount(0);
            setLanguage('Plain Text');
        }
    }, [activeFile, analyzeFile]);

    useEffect(() => {
        updateGitInfo();
        const interval = setInterval(updateGitInfo, 5000);
        const handleGitBranchChanged = () => updateGitInfo();
        window.addEventListener('git-branch-changed', handleGitBranchChanged);

        return () => {
            clearInterval(interval);
            window.removeEventListener('git-branch-changed', handleGitBranchChanged);
        };
    }, [updateGitInfo]);

    const errorCount = activeFile ? errors[activeFile] || 0 : 0;
    const warningCount = activeFile ? warnings[activeFile] || 0 : 0;

    const handleOpenProblems = () => {
        setTerminalOpen(true);
        setBottomPanelTab('problems');
    };

    return (
        <>
            <div className={styles.statusBar}>
                <div className={styles.statusLeft}>
                    <GitSection
                        branch={gitInfo.branch}
                        hasChanges={gitInfo.hasChanges}
                        isPushing={isPushing}
                        onPush={handlePush}
                        onOpenBranchModal={() => setIsBranchModalOpen(true)}
                    />
                    {activeFile && (
                        <ProblemsSection
                            errorCount={errorCount}
                            warningCount={warningCount}
                            onOpenProblems={handleOpenProblems}
                        />
                    )}
                </div>

                <div className={styles.statusRight}>
                    <UIControlsSection
                        insertMode={insertMode}
                        zoomLevel={zoomLevel}
                        onToggleInsertMode={toggleInsertMode}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onResetZoom={resetZoom}
                    />

                    {activeFile && (
                        <EditorInfoSection
                            line={cursorPosition.line}
                            column={cursorPosition.column}
                            language={language}
                            lineCount={lineCount}
                        />
                    )}
                </div>
            </div>

            <BranchModal
                isOpen={isBranchModalOpen}
                onClose={() => setIsBranchModalOpen(false)}
            />
        </>
    );
};
