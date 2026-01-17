import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useEditorStore } from '../../store/editorStore';
import { getFileIcon, getFolderIcon } from '../../utils/fileIcons';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { tauriApi } from '../../lib/tauri-api';
import clsx from 'clsx';
import styles from './BreadcrumbBar.module.css';

interface BreadcrumbSegment {
  name: string;
  type: 'folder' | 'file' | 'symbol';
  fullPath?: string;
}

interface FileSystemItem {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileSystemItem[];
  isExpanded?: boolean;
  level?: number;
}

interface BreadcrumbBarProps {
  filePath?: string;
  className?: string; // Allow custom styling from parent
}

export const BreadcrumbBar = ({ filePath, className }: BreadcrumbBarProps) => {
  const { activeFile, currentWorkspace, openFile } = useProjectStore();
  const { getCurrentSymbol, getSymbolHierarchy, editorInstance } = useEditorStore();

  // Use passed filePath or fall back to activeFile
  const targetFile = filePath || activeFile;

  const [symbolHierarchy, setSymbolHierarchy] = useState<Array<{
    name: string;
    kind: any;
    detail?: string;
    range: any;
    selectionRange: any;
  }>>([]);

  // Mini-explorer state
  const [miniExplorerOpen, setMiniExplorerOpen] = useState(false);
  const [miniExplorerPath, setMiniExplorerPath] = useState<string>('');
  const [miniExplorerItems, setMiniExplorerItems] = useState<FileSystemItem[]>([]);
  const [miniExplorerPosition, setMiniExplorerPosition] = useState({ x: 0, y: 0 });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  // Update current symbol and hierarchy when cursor moves
  // Note: Symbols might only be relevant for the *active* editor (where cursor is).
  // If we have two editors, we might only want to show symbols for the focused one.
  // For now, we'll keep it simple and only show symbols if this breadcrumb corresponds to the active file.
  const isActive = targetFile === activeFile;

  useEffect(() => {
    if (!editorInstance || !isActive) return;

    const updateSymbols = async () => {
      try {
        const hierarchy = await getSymbolHierarchy();
        setSymbolHierarchy(hierarchy || []);
      } catch (error) {
        console.error('Error updating symbols:', error);
        setSymbolHierarchy([]);
      }
    };

    // Initial update
    updateSymbols();

    // Listen for cursor position changes
    const disposable = editorInstance.onDidChangeCursorPosition(updateSymbols);

    // Also listen for model content changes
    const model = editorInstance.getModel();
    const modelChangeDisposable = model?.onDidChangeContent(updateSymbols);

    return () => {
      disposable?.dispose();
      modelChangeDisposable?.dispose();
    };
  }, [editorInstance, getCurrentSymbol, getSymbolHierarchy, isActive]);

  // Close mini-explorer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (breadcrumbRef.current && !breadcrumbRef.current.contains(event.target as Node)) {
        setMiniExplorerOpen(false);
      }
    };

    if (miniExplorerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [miniExplorerOpen]);

  // Generate path segments from the file path
  const generatePathSegments = (filePath: string): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [];

    // Get relative path from workspace root
    let relativePath = filePath;
    let fullPath = currentWorkspace || '';

    if (currentWorkspace && filePath.startsWith(currentWorkspace)) {
      // Remove workspace path and leading slash to get relative path
      relativePath = filePath.slice(currentWorkspace.length);
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.slice(1);
      }
    }

    // Split path and create folder segments
    const pathParts = relativePath.split(/[\\/]/);

    // Add folder segments (excluding the file name)
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i]) {
        fullPath = fullPath + '/' + pathParts[i];
        segments.push({
          name: pathParts[i],
          type: 'folder',
          fullPath: fullPath
        });
      }
    }

    // Add file segment
    const fileName = pathParts[pathParts.length - 1];
    segments.push({
      name: fileName,
      type: 'file'
    });

    return segments;
  };

  if (!targetFile) {
    return null;
  }

  // Removed internal split view logic. This component now renders for a single file.

  const pathSegments = generatePathSegments(targetFile);

  // Don't show breadcrumb bar if file is in root (no path, only filename)
  if (pathSegments.length === 1) {
    return null;
  }

  // Load directory contents for mini-explorer
  const loadDirectoryContents = async (path: string, level: number = 0): Promise<FileSystemItem[]> => {
    try {
      const items = await tauriApi.readDir(path);
      const sortedItems = items.sort((a: any, b: any) => {
        // Directories first, then files
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });

      return sortedItems.map((item: any) => ({
        ...item,
        level,
        isExpanded: expandedFolders.has(item.path)
      }));
    } catch (error) {
      console.error('Error loading directory contents:', error);
      return [];
    }
  };

  // Handle folder click in breadcrumb
  const handleFolderClick = async (segment: BreadcrumbSegment, event: React.MouseEvent) => {
    if (segment.type === 'folder' && segment.fullPath) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setMiniExplorerPosition({
        x: rect.left,
        y: rect.bottom + 2
      });
      setMiniExplorerPath(segment.fullPath);
      const items = await loadDirectoryContents(segment.fullPath);
      setMiniExplorerItems(items);
      setMiniExplorerOpen(true);
    }
  };

  // Toggle folder expansion
  const toggleFolderExpansion = async (item: FileSystemItem, event: React.MouseEvent) => {
    event.stopPropagation();

    const newExpandedFolders = new Set(expandedFolders);

    if (expandedFolders.has(item.path)) {
      // Collapse folder
      newExpandedFolders.delete(item.path);
      setExpandedFolders(newExpandedFolders);

      // Remove children from the items array
      const removeChildren = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.filter(i => !i.path.startsWith(item.path + '/'));
      };
      setMiniExplorerItems(removeChildren(miniExplorerItems));
    } else {
      // Expand folder
      newExpandedFolders.add(item.path);
      setExpandedFolders(newExpandedFolders);

      // Load children and insert them after the parent
      const children = await loadDirectoryContents(item.path, (item.level || 0) + 1);

      const insertChildren = (items: FileSystemItem[]): FileSystemItem[] => {
        const result: FileSystemItem[] = [];
        for (const i of items) {
          result.push(i);
          if (i.path === item.path) {
            result.push(...children);
          }
        }
        return result;
      };

      setMiniExplorerItems(insertChildren(miniExplorerItems));
    }
  };

  // Handle item click in mini-explorer
  const handleItemClick = (item: FileSystemItem) => {
    if (item.is_dir) {
      // Toggle expansion on folder click (except when clicking the expand icon)
      toggleFolderExpansion(item, { stopPropagation: () => { } } as React.MouseEvent);
    } else {
      // Open file using the project store's openFile function
      openFile(item.path || '');
      setMiniExplorerOpen(false);
    }
  };

  return (
    <div className={clsx(styles.breadcrumbBar, className)} ref={breadcrumbRef}>
      <div className={styles.breadcrumbContent}>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight size={12} className={styles.separator} />
            )}
            <span
              className={`${styles.segment} ${segment.type === 'file' ? styles.fileSegment : styles.folderSegment
                }`}
              onClick={(e) => handleFolderClick(segment, e)}
            >
              <span className={styles.segmentIcon}>
                {segment.type === 'file' ? (
                  getFileIcon(segment.name, activeFile || undefined)
                ) : segment.type === 'folder' ? (
                  getFolderIcon(segment.name)
                ) : null}
              </span>
              {segment.name}
            </span>
          </React.Fragment>
        ))}

        {symbolHierarchy && symbolHierarchy.length > 0 && (
          <>
            <ChevronRight size={12} className={styles.separator} />
            <div className={styles.symbolHierarchy}>
              {symbolHierarchy.map((symbol, index) => (
                <React.Fragment key={`symbol-${index}`}>
                  {index > 0 && <ChevronRight size={12} className={styles.separator} />}
                  <span className={`${styles.segment} ${styles.symbolSegment}`}>
                    {symbol.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mini-explorer popup */}
      {miniExplorerOpen && (
        <div
          className={styles.miniExplorer}
          style={{
            left: `${miniExplorerPosition.x}px`,
            top: `${miniExplorerPosition.y}px`
          }}
        >
          <div className={styles.miniExplorerHeader}>
            <span className={styles.miniExplorerPath}>{miniExplorerPath}</span>
          </div>
          <div className={styles.miniExplorerContent}>
            {miniExplorerItems.map((item) => (
              <div
                key={item.path}
                className={`${styles.miniExplorerItem} ${styles.treeItem}`}
                style={{ paddingLeft: `${(item.level || 0) * 16 + 12}px` }}
                onClick={() => handleItemClick(item)}
              >
                {item.is_dir && (
                  <span
                    className={styles.expandIcon}
                    onClick={(e) => toggleFolderExpansion(item, e)}
                  >
                    {expandedFolders.has(item.path) ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                  </span>
                )}
                <span className={styles.miniExplorerItemIcon}>
                  {item.is_dir ? (
                    getFolderIcon(item.name, expandedFolders.has(item.path))
                  ) : (
                    getFileIcon(item.name)
                  )}
                </span>
                <span className={styles.miniExplorerItemName}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
