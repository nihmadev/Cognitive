import React from 'react';
import styles from './AgentComponents.module.css';

interface ThinkingAnimationProps {
  styles?: any; // Keep prop for compatibility but ignore it
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = () => {
  return (
    <div style={{ padding: '0 20px', display: 'flex' }}>
      <div className={styles.thinkingContainer}>
        <div className={styles.thinkingText}>
          Planning next moves...
        </div>
      </div>
    </div>
  );
};
