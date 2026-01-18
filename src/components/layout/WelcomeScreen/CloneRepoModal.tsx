import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github } from 'lucide-react';
import { tauriApi } from '../../../lib/tauri-api';
import { useProjectStore } from '../../../store/projectStore';
import styles from './CloneRepoModal.module.css';

interface CloneRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloneRepoModal: React.FC<CloneRepoModalProps> = ({ isOpen, onClose }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { setWorkspace } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setRepoUrl('');
      setError(null);
      
      
      
      const searchBar = 
        (document.querySelector('[class*="searchBar"]') as HTMLElement) ||
        (document.querySelector('.searchBar') as HTMLElement);
      
      if (searchBar) {
        const rect = searchBar.getBoundingClientRect();
        const modalWidth = 600; 
        const searchBarWidth = rect.width;
        
        
        
        const offset = (modalWidth - searchBarWidth) / 2;
        let left = rect.left - offset;
        
        
        const minLeft = 8; 
        const maxLeft = window.innerWidth - modalWidth - minLeft;
        left = Math.max(minLeft, Math.min(left, maxLeft));
        
        setPosition({
          top: rect.bottom + 4,
          left: left,
          width: modalWidth
        });
      } else {
        
        setPosition(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter' && repoUrl.trim() && !isCloning) {
        e.preventDefault();
        e.stopPropagation();
        handleClone();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, repoUrl, isCloning, onClose]);

  const normalizeRepoUrl = (url: string): string => {
    let normalized = url.trim();
    
    
    if (normalized.endsWith('.git')) {
      normalized = normalized.slice(0, -4);
    }
    
    
    if (!normalized.includes('://') && !normalized.startsWith('git@')) {
      
      if (normalized.includes('/') && !normalized.includes('@')) {
        normalized = `https://github.com/${normalized}`;
      }
    }
    
    
    if (normalized.startsWith('github.com/')) {
      normalized = `https://${normalized}`;
    }
    
    
    if (!normalized.endsWith('.git')) {
      normalized = `${normalized}.git`;
    }
    
    return normalized;
  };

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    try {
      setIsCloning(true);
      setError(null);

      
      const normalizedUrl = normalizeRepoUrl(repoUrl);

      
      const selectedFolder = await tauriApi.openFolderDialog();
      if (!selectedFolder) {
        setIsCloning(false);
        return;
      }

      
      const urlParts = normalizedUrl.split('/');
      const repoName = urlParts[urlParts.length - 1].replace('.git', '');
      const clonePath = `${selectedFolder}/${repoName}`;

      
      await tauriApi.gitClone(normalizedUrl, clonePath);

      
      setWorkspace(clonePath);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clone repository');
      console.error('Clone error:', err);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlayRoot}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={styles.backdrop}
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.1 }}
            className={styles.modal}
            style={
              position
                ? {
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    width: `${position.width}px`
                  }
                : undefined
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.inputWrapper}>
              <input
                ref={inputRef}
                type="text"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setError(null);
                }}
                placeholder="Provide repository URL or pick a repository source."
                className={styles.input}
                disabled={isCloning}
                autoFocus
              />
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <div className={styles.footer}>
              <div className={styles.sourceOption} onClick={handleClone}>
                <Github className={styles.githubIcon} />
                <span>{isCloning ? 'Cloning...' : 'Clone from GitHub'}</span>
              </div>
              <span className={styles.remoteSourcesLink}>remote sources</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

