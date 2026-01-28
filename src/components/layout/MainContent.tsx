import { ActivityBar, type ActivityId } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { SearchPane } from './Search/SearchPane';
import { SearchEditor } from './Search/SearchEditor';
import { GitPane } from './Git/GitPane';
import { ExtensionsPane } from './Extensions/ExtensionsPane';
import { TabBar } from './Tabs';
import { CodeEditor } from './Editor';
import { TerminalPanel } from './terminal-panel';
import { useUIStore } from '../../store/uiStore';
import { useGitStore } from '../../store/gitStore';
import { useProjectStore } from '../../store/projectStore';
import clsx from 'clsx';
import styles from '../../App.module.css';

interface MainContentProps {
  activeActivity: ActivityId;
  onActivityChange: (activity: ActivityId) => void;
}

export const MainContent = ({
  activeActivity,
  onActivityChange
}: MainContentProps) => {
  const { showSidebar, showTerminal, isTerminalMaximized } = useUIStore();
  const { files: gitFiles } = useGitStore();
  const { activeSearchTab } = useProjectStore();

  // Filter out ignored files and directories for accurate count
  const actualChangesCount = gitFiles.filter(file => 
    !(file as any).is_ignored && !(file as any).is_dir
  ).length;

  return (
    <div className={styles.main}>
      <ActivityBar
        activeItem={activeActivity}
        onActivityChange={onActivityChange}
        gitChangesCount={actualChangesCount}
      />

      {showSidebar && activeActivity === 'files' && <Sidebar />}
      {showSidebar && activeActivity === 'search' && <SearchPane />}
      {showSidebar && activeActivity === 'git' && <GitPane />}
      {showSidebar && activeActivity === 'extensions' && <ExtensionsPane />}

      <div className={styles.content}>
        {!isTerminalMaximized && <TabBar />}
        {!isTerminalMaximized && !activeSearchTab && <CodeEditor />}
        {!isTerminalMaximized && activeSearchTab && <SearchEditor />}
        <div style={{ display: showTerminal ? 'contents' : 'none' }}>
          <TerminalPanel />
        </div>
      </div>
    </div>
  );
};
