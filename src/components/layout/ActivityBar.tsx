import { Files, Search, Bug, Monitor, Blocks } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import styles from './ActivityBar.module.css';

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${Math.floor(num / 1000000)}M+`;
  } else if (num >= 1000) {
    return `${Math.floor(num / 1000)}K+`;
  }
  return num.toString();
};

export type ActivityId = 'files' | 'search' | 'git' | 'debug' | 'remote' | 'extensions';

interface ActivityBarItem {
  id: ActivityId;
  icon: React.ReactNode;
  title: string;
}

const activityBarItems: ActivityBarItem[] = [
  {
    id: 'files',
    icon: <Files size={20} strokeWidth={1.5} style={{ transform: 'scaleX(-1)' }} />,
    title: 'Files'
  },
  {
    id: 'git',
    icon: <FontAwesomeIcon icon={faCodeBranch} style={{ fontSize: '20px' }} />,
    title: 'Source Control'
  },
  {
    id: 'search',
    icon: <Search size={20} strokeWidth={1.5} style={{ transform: 'scaleX(-1)' }} />,
    title: 'Search'
  },
  {
    id: 'debug',
    icon: <Bug size={20} strokeWidth={1.5} />,
    title: 'Debug'
  },
  {
    id: 'extensions',
    icon: <Blocks size={20} strokeWidth={1.5} />,
    title: 'Extensions'
  },
  {
    id: 'remote',
    icon: <Monitor size={20} strokeWidth={1.5} />,
    title: 'Remote Explorer'
  }
];

export const ActivityBar = ({
  activeItem,
  onActivityChange,
  gitChangesCount = 0,
}: {
  activeItem: ActivityId;
  onActivityChange: (id: ActivityId) => void;
  gitChangesCount?: number;
}) => {

  return (
    <div className={styles.activityBar}>
      {activityBarItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.activityBarItem} ${activeItem === item.id ? styles.active : ''}`}
          title={item.id === 'git' 
            ? `Source Control (Ctrl+Shift+G)${gitChangesCount > 0 ? ` - ${gitChangesCount} pending changes` : ''}`
            : item.title
          }
          onClick={() => onActivityChange(item.id)}
        >
          {item.icon}
          {item.id === 'git' && gitChangesCount > 0 && (
            <span className={styles.badge}>{formatNumber(gitChangesCount)}</span>
          )}
        </button>
      ))}
    </div>
  );
};
