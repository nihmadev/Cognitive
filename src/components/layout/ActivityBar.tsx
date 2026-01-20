import { Files, Search, Bug, Monitor } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import styles from './ActivityBar.module.css';

export type ActivityId = 'files' | 'search' | 'git' | 'debug' | 'remote';

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
          title={item.title}
          onClick={() => onActivityChange(item.id)}
        >
          {item.icon}
          {item.id === 'git' && gitChangesCount > 0 && (
            <span className={styles.badge}>{gitChangesCount}</span>
          )}
        </button>
      ))}
    </div>
  );
};
