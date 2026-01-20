import { ActivityBar, type ActivityId } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { SearchPane } from './Search/SearchPane';
import { SearchEditor } from './Search/SearchEditor';
import { GitPane } from './Git/GitPane';
import { TabBar } from './Tabs';
import { CodeEditor } from './Editor';
import { TerminalPanel } from './terminal-panel';
import { AIAssistant } from '../ai';
import { useUIStore } from '../../store/uiStore';
import { useGitStore } from '../../store/gitStore';
import { useProjectStore } from '../../store/projectStore';
import clsx from 'clsx';
import styles from '../../App.module.css';

interface MainContentProps {
  activeActivity: ActivityId;
  onActivityChange: (activity: ActivityId) => void;
  aiPanelRef: React.RefObject<HTMLDivElement>;
  aiPanelWidth: number;
  isAIResizing: boolean;
  onAIResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const MainContent = ({
  activeActivity,
  onActivityChange,
  aiPanelRef,
  aiPanelWidth,
  isAIResizing,
  onAIResizeStart
}: MainContentProps) => {
  const { showSidebar, showTerminal, isTerminalMaximized } = useUIStore();
  const isAssistantOpen = useUIStore(state => state.aiPanelWidth > 0); // Derive from aiPanelWidth
  const { files: gitFiles } = useGitStore();
  const { activeSearchTab } = useProjectStore();

  return (
    <div className={styles.main}>
      <ActivityBar
        activeItem={activeActivity}
        onActivityChange={onActivityChange}
        gitChangesCount={gitFiles.length}
      />

      {showSidebar && activeActivity === 'files' && <Sidebar />}
      {showSidebar && activeActivity === 'search' && <SearchPane />}
      {showSidebar && activeActivity === 'git' && <GitPane />}

      <div className={styles.content}>
        {!isTerminalMaximized && <TabBar />}
        {!isTerminalMaximized && !activeSearchTab && <CodeEditor />}
        {!isTerminalMaximized && activeSearchTab && <SearchEditor />}
        {showTerminal && <TerminalPanel />}
      </div>

      {isAssistantOpen && (
        <div
          ref={aiPanelRef}
          className={styles.aiPanelWrapper}
          style={{ width: aiPanelWidth }}
        >
          <div
            className={clsx(styles.aiResizeHandle, isAIResizing && styles.isResizing)}
            onMouseDown={onAIResizeStart}
          />
          <div className={styles.aiPanel}>
            <AIAssistant />
          </div>
        </div>
      )}
    </div>
  );
};
