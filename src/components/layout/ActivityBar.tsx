import { Files, Search, GitBranch, Bug, Monitor } from 'lucide-react';
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
    icon: <Files size={16} strokeWidth={1.5} />,
    title: 'Files'
  },
  {
    id: 'search',
    icon: <Search size={16} strokeWidth={1.5} />,
    title: 'Search'
  },
  {
    id: 'git',
    icon: <GitBranch size={16} strokeWidth={1.5} />,
    title: 'Source Control'
  },
  {
    id: 'debug',
    icon: <Bug size={16} strokeWidth={1.5} />,
    title: 'Debug'
  },
  {
    id: 'remote',
    icon: <Monitor size={16} strokeWidth={1.5} />,
    title: 'Remote Explorer'
  }
];

export const ActivityBar = ({
  activeItem,
  onActivityChange,
}: {
  activeItem: ActivityId;
  onActivityChange: (id: ActivityId) => void;
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
        </button>
      ))}
    </div>
  );
};
