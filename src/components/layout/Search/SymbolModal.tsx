import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Code } from 'lucide-react';
import { useOutlineStore, OutlineSymbol } from '../../../store/outlineStore';
import { useProjectStore } from '../../../store/projectStore';
import { useEditorStore } from '../../../store/editorStore';
import clsx from 'clsx';
import styles from './SymbolModal.module.css';

interface SymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Flatten symbols for search
const flattenSymbols = (symbols: OutlineSymbol[]): OutlineSymbol[] => {
  const result: OutlineSymbol[] = [];
  
  const traverse = (symbols: OutlineSymbol[], depth = 0) => {
    for (const symbol of symbols) {
      result.push(symbol);
      if (symbol.children && symbol.children.length > 0) {
        traverse(symbol.children, depth + 1);
      }
    }
  };
  
  traverse(symbols);
  return result;
};

// Symbol icon component (simplified version from OutlineSection)
const SymbolIcon = ({ kind }: { kind: string }) => {
  const colorMap: Record<string, string> = {
    file: '#cccccc',
    module: '#c586c0',
    namespace: '#4ec9b0',
    package: '#c586c0',
    class: '#4ec9b0',
    method: '#dcdcaa',
    property: '#9cdcfe',
    field: '#9cdcfe',
    constructor: '#dcdcaa',
    enum: '#4ec9b0',
    interface: '#4ec9b0',
    function: '#dcdcaa',
    variable: '#9cdcfe',
    constant: '#4fc1ff',
    string: '#ce9178',
    number: '#b5cea8',
    boolean: '#569cd6',
    array: '#9cdcfe',
    object: '#9cdcfe',
    key: '#9cdcfe',
    null: '#569cd6',
    enumMember: '#4fc1ff',
    struct: '#4ec9b0',
    event: '#dcdcaa',
    operator: '#d4d4d4',
    typeParameter: '#4ec9b0',
  };

  const iconMap: Record<string, React.ReactElement> = {
    class: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.class} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.class} fontSize="8" fontWeight="bold">C</text>
      </svg>
    ),
    interface: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke={colorMap.interface} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.interface} fontSize="8" fontWeight="bold">I</text>
      </svg>
    ),
    function: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.function} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.function} fontSize="8" fontWeight="bold">f</text>
      </svg>
    ),
    method: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.method} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.method} fontSize="8" fontWeight="bold">m</text>
      </svg>
    ),
    variable: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.variable} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.variable} fontSize="8" fontWeight="bold">v</text>
      </svg>
    ),
    constant: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.constant} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.constant} fontSize="8" fontWeight="bold">c</text>
      </svg>
    ),
    property: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.property} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.property} fontSize="8" fontWeight="bold">p</text>
      </svg>
    ),
    field: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.field} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.field} fontSize="8" fontWeight="bold">f</text>
      </svg>
    ),
    enum: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.enum} strokeWidth="1.5" fill="none" />
        <text x="8" y="11" textAnchor="middle" fill={colorMap.enum} fontSize="8" fontWeight="bold">E</text>
      </svg>
    ),
    constructor: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polygon points="8,2 14,14 2,14" stroke={(colorMap.constructor as unknown as string)} strokeWidth="1.5" fill="none" />
      </svg>
    ),
  };

  return (
    <span className={styles.symbolIcon}>
      {iconMap[kind] || <span style={{ color: colorMap[kind] || '#cccccc' }}>•</span>}
    </span>
  );
};

export const SymbolModal: React.FC<SymbolModalProps> = ({ isOpen, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { symbols, isLoading } = useOutlineStore();
  const { activeFile } = useProjectStore();
  const { editorInstance } = useEditorStore();

  // Flatten symbols for searchable list
  const flatSymbols = useMemo(() => flattenSymbols(symbols), [symbols]);

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    if (!searchQuery.trim()) return flatSymbols;
    
    const query = searchQuery.toLowerCase();
    return flatSymbols.filter(symbol => 
      symbol.name.toLowerCase().includes(query) ||
      symbol.kind.toLowerCase().includes(query) ||
      (symbol.detail && symbol.detail.toLowerCase().includes(query))
    );
  }, [flatSymbols, searchQuery]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredSymbols]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredSymbols.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredSymbols.length) % filteredSymbols.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSymbols[selectedIndex]) {
          handleSymbolSelect(filteredSymbols[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredSymbols]);

  const handleSymbolSelect = (symbol: OutlineSymbol) => {
    if (editorInstance) {
      editorInstance.revealLineInCenter(symbol.selectionRange.startLine + 1);
      editorInstance.setPosition({ 
        lineNumber: symbol.selectionRange.startLine + 1, 
        column: symbol.selectionRange.startColumn + 1 
      });
      editorInstance.focus();
    }
    onClose();
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
          <h3>Go to Symbol in Editor</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <div className={styles.searchIcon}>
              <Code size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Type to search for a symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.resultsContainer}>
          {isLoading ? (
            <div className={styles.loading}>Loading symbols...</div>
          ) : !activeFile ? (
            <div className={styles.empty}>No file open</div>
          ) : filteredSymbols.length === 0 ? (
            <div className={styles.empty}>
              {searchQuery.trim() ? 'No symbols found' : 'No symbols in current file'}
            </div>
          ) : (
            <div className={styles.resultsList}>
              {filteredSymbols.map((symbol, index) => (
                <div
                  key={`${symbol.name}-${symbol.selectionRange.startLine}-${index}`}
                  className={clsx(
                    styles.symbolItem,
                    index === selectedIndex && styles.selected
                  )}
                  onClick={() => handleSymbolSelect(symbol)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={styles.symbolLeft}>
                    <SymbolIcon kind={symbol.kind} />
                    <div className={styles.symbolInfo}>
                      <div className={styles.symbolName}>{symbol.name}</div>
                      <div className={styles.symbolKind}>{symbol.kind}</div>
                    </div>
                  </div>
                  <div className={styles.symbolRight}>
                    <div className={styles.symbolLocation}>
                      Line {symbol.selectionRange.startLine + 1}
                    </div>
                    {symbol.detail && (
                      <div className={styles.symbolDetail}>{symbol.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span>Use arrow keys to navigate</span>
          <span>Enter to go to symbol</span>
        </div>
      </motion.div>
    </div>
  );
};
