import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Search, RefreshCw } from 'lucide-react';
import { useSearchStore } from '../../../store/searchStore';
import { useProjectStore } from '../../../store/projectStore';
import { getFileIcon } from '../../../utils/fileIcons';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, performSearch, isSearching, results } = useSearchStore();
  const { currentWorkspace, openFile } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      // Focus the input when the modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentWorkspace && query.trim()) {
      performSearch(currentWorkspace);
    }
  };

  const handleFileOpen = (filePath: string) => {
    openFile(filePath);
    onClose(); // Close the modal after opening the file
  };

  const handleFileOpenAtLine = (filePath: string, _line: number) => {
    openFile(filePath);
    // TODO: Navigate to specific line - this would need to be implemented in the editor
    onClose(); // Close the modal after opening the file
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <motion.div 
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <div className={styles.modalHeader}>
          <h3>Search in Files</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInputContainer}>
            <div className={styles.searchInputWrapper}>
              <div className={styles.searchIcon}>
                <Search size={20} />
                <RefreshCw size={12} className={styles.refreshIcon} />
              </div>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Enter a term to search for across your files."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className={styles.searchButton}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              {results.length} results found
            </div>
            <div className={styles.resultsList}>
              {results.map((result, index) => (
                <div key={index} className={styles.resultItem}>
                  <div 
                    className={styles.resultPath} 
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => handleFileOpen(result.file.path)}
                    title="Click to open file"
                  >
                    {getFileIcon(result.file.name, result.file.path)}
                    <span style={{ marginLeft: '8px' }}>{result.file.path}</span>
                  </div>
                  <div className={styles.resultContent}>
                    {result.matches.map((match, matchIndex) => (
                      <div 
                        key={matchIndex} 
                        className={styles.matchLine}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleFileOpenAtLine(result.file.path, match.line)}
                        title="Click to open file at this line"
                      >
                        <span className={styles.lineNumber}>{match.line}:</span>
                        <span className={styles.lineText}>
                          {match.lineText.substring(0, match.charStart)}
                          <span className={styles.highlight}>
                            {match.lineText.substring(match.charStart, match.charEnd)}
                          </span>
                          {match.lineText.substring(match.charEnd)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
