import React from 'react';

interface ThinkingAnimationProps {
  styles: any;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ styles }) => {
  return (
    <div className={styles.aiMessageWrapper}>
      <div className={styles.thinkingContainer}>
        <div className={styles.thinkingLoader}></div>
        <div className={styles.thinkingText}>
          Thinking...
        </div>
      </div>
    </div>
  );
};
