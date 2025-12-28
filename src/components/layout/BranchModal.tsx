import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, GitCommit, X } from 'lucide-react';
import { tauriApi, GitBranch as GitBranchType } from '../../lib/tauri-api';
import { useProjectStore } from '../../store/projectStore';
import styles from './BranchModal.module.css';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateBranchRequest {
  name: string;
  from_branch?: string;
  from_commit?: string;
}

export const BranchModal: React.FC<BranchModalProps> = ({ isOpen, onClose }) => {
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSourceBranch, setSelectedSourceBranch] = useState<string>('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { currentWorkspace } = useProjectStore();

  useEffect(() => {
    if (isOpen && currentWorkspace) {
      loadBranches();
      
      // Find search-bar and calculate position like CloneRepoModal
      const searchBar = 
        (document.querySelector('[class*="searchBar"]') as HTMLElement) ||
        (document.querySelector('.searchBar') as HTMLElement);
      
      if (searchBar) {
        const rect = searchBar.getBoundingClientRect();
        const modalWidth = 600; // Same as in CSS
        const searchBarWidth = rect.width;
        
        // Calculate symmetric position: modal should extend equally on both sides
        const offset = (modalWidth - searchBarWidth) / 2;
        let left = rect.left - offset;
        
        // Ensure modal doesn't go off-screen
        const minLeft = 8; // Minimum margin from screen edge
        const maxLeft = window.innerWidth - modalWidth - minLeft;
        left = Math.max(minLeft, Math.min(left, maxLeft));
        
        setPosition({
          top: rect.bottom + 4,
          left: left,
          width: modalWidth
        });
      } else {
        // Fallback to center if search-bar not found
        setPosition(null);
      }
    }
  }, [isOpen, currentWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCreateForm) {
          setShowCreateForm(false);
          setNewBranchName('');
          setSelectedSourceBranch('');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCreateForm, onClose]);

  const loadBranches = async () => {
    if (!currentWorkspace) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const branchList = await tauriApi.gitListBranches(currentWorkspace);
      setBranches(branchList);
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!currentWorkspace || !newBranchName.trim()) return;

    try {
      setIsCreatingBranch(true);
      setError(null);
      
      const request: CreateBranchRequest = {
        name: newBranchName.trim(),
        from_branch: selectedSourceBranch || undefined,
      };

      await tauriApi.gitCreateBranch(currentWorkspace, request);
      
      // Reset form and refresh branches
      setNewBranchName('');
      setSelectedSourceBranch('');
      setShowCreateForm(false);
      await loadBranches();
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    if (!currentWorkspace) return;

    try {
      await tauriApi.gitCheckoutBranch(currentWorkspace, branchName);
      onClose();
      // Refresh git info in status bar by triggering a reload
      window.dispatchEvent(new CustomEvent('git-branch-changed'));
    } catch (err: any) {
      setError(err.message || 'Failed to checkout branch');
    }
  };

  const handleCheckoutDetached = async () => {
    if (!currentWorkspace) return;

    try {
      // Get the latest commit hash for detached checkout
      const log = await tauriApi.gitLog(currentWorkspace, 1);
      if (log.length > 0) {
        await handleCheckoutBranch(log[0].hash);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to checkout detached HEAD');
    }
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return `${Math.floor(diff / 604800)} weeks ago`;
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const localBranches = filteredBranches.filter(b => !b.is_remote);
  const remoteBranches = filteredBranches.filter(b => b.is_remote);

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
            {!showCreateForm ? (
              <>
                {/* Search/Input */}
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search branches..."
                    className={styles.input}
                    autoFocus
                  />
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  <div 
                    className={styles.actionItem}
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className={styles.actionIcon} />
                    <span>Create new branch...</span>
                  </div>
                  <div 
                    className={styles.actionItem}
                    onClick={() => setShowCreateForm(true)}
                  >
                    <GitBranch className={styles.actionIcon} />
                    <span>Create new branch from...</span>
                  </div>
                  <div 
                    className={styles.actionItem}
                    onClick={handleCheckoutDetached}
                  >
                    <GitCommit className={styles.actionIcon} />
                    <span>Checkout detached...</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className={styles.error}>
                    {error}
                  </div>
                )}

                {/* Branches */}
                <div className={styles.branchList}>
                  {isLoading ? (
                    <div className={styles.loading}>Loading branches...</div>
                  ) : (
                    <>
                      {localBranches.length > 0 && (
                        <div className={styles.branchGroup}>
                          <div className={styles.groupTitle}>branches</div>
                          {localBranches.map((branch) => (
                            <div
                              key={branch.name}
                              className={`${styles.branchItem} ${branch.is_head ? styles.currentBranch : ''}`}
                              onClick={() => handleCheckoutBranch(branch.name)}
                            >
                              <div className={styles.branchInfo}>
                                <div className={styles.branchName}>
                                  {branch.name}
                                  {branch.is_head && <span className={styles.currentIndicator}>●</span>}
                                </div>
                                <div className={styles.branchMeta}>
                                  {branch.commit_message && (
                                    <span className={styles.commitMessage}>{branch.commit_message}</span>
                                  )}
                                  <span className={styles.commitTime}>
                                    {formatRelativeTime(branch.last_commit_time)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {remoteBranches.length > 0 && (
                        <div className={styles.branchGroup}>
                          <div className={styles.groupTitle}>remote branches</div>
                          {remoteBranches.map((branch) => (
                            <div
                              key={branch.name}
                              className={styles.branchItem}
                              onClick={() => handleCheckoutBranch(branch.name)}
                            >
                              <div className={styles.branchInfo}>
                                <div className={styles.branchName}>{branch.name}</div>
                                <div className={styles.branchMeta}>
                                  {branch.commit_message && (
                                    <span className={styles.commitMessage}>{branch.commit_message}</span>
                                  )}
                                  <span className={styles.commitTime}>
                                    {formatRelativeTime(branch.last_commit_time)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Create Branch Form */
              <div className={styles.createForm}>
                <div className={styles.formHeader}>
                  <h3>Create New Branch</h3>
                  <button 
                    className={styles.closeButton}
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBranchName('');
                      setSelectedSourceBranch('');
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className={styles.formContent}>
                  <div className={styles.field}>
                    <label>Branch Name</label>
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Enter branch name..."
                      className={styles.input}
                      autoFocus
                    />
                  </div>

                  <div className={styles.field}>
                    <label>From Branch (optional)</label>
                    <select
                      value={selectedSourceBranch}
                      onChange={(e) => setSelectedSourceBranch(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">Current HEAD</option>
                      {localBranches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewBranchName('');
                      setSelectedSourceBranch('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.createButton}
                    onClick={handleCreateBranch}
                    disabled={!newBranchName.trim() || isCreatingBranch}
                  >
                    {isCreatingBranch ? 'Creating...' : 'Create Branch'}
                  </button>
                </div>

                {error && (
                  <div className={styles.error}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
