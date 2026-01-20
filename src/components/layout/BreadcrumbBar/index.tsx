import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useEditorStore } from '../../../store/editorStore';
import { getFileIcon, getFolderIcon } from '../../../utils/fileIcons';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { tauriApi } from '../../../lib/tauri-api';
import clsx from 'clsx';
import styles from './styles.module.css';

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
}

interface BreadcrumbBarProps {
  filePath?: string;
  className?: string;
}

const MiniExplorerItem = ({ item, level, onOpenFile, onClose }: {
  item: FileSystemItem;
  level: number;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!item.is_dir) return;

    setIsLoading(true);
    try {
      const items = await tauriApi.readDir(item.path);
      const sortedItems = items.sort((a: any, b: any) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      });
      setChildren(sortedItems);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [item.path, item.is_dir]);

  useEffect(() => {
    if (isOpen && children.length === 0) {
      loadChildren();
    }
  }, [isOpen, loadChildren, children.length]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.is_dir) {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(item.path);
      onClose();
    }
  };

  return (
    <>
      <div
        className={styles.miniExplorerItem}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {item.is_dir && (
          <span
            className={styles.expandIcon}
            onClick={handleToggle}
            style={{ marginLeft: -4 }}
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {!item.is_dir && <div style={{ width: 12, marginRight: 4 }} />}

        <span className={styles.miniExplorerItemIcon}>
          {item.is_dir ? (
            getFolderIcon(item.name, isOpen)
          ) : (
            getFileIcon(item.name)
          )}
        </span>
        <span className={styles.miniExplorerItemName}>{item.name}</span>
      </div>
      {isOpen && (
        <div>
          {isLoading ? (
            <div style={{ paddingLeft: `${(level + 1) * 16 + 12}px`, fontSize: 11, opacity: 0.7, padding: '4px 0' }}>
              Loading...
            </div>
          ) : (
            children.map((child) => (
              <MiniExplorerItem
                key={child.path}
                item={child}
                level={level + 1}
                onOpenFile={onOpenFile}
                onClose={onClose}
              />
            ))
          )}
        </div>
      )}
    </>
  );
};

export const BreadcrumbBar = ({ filePath, className }: BreadcrumbBarProps) => {
  const { activeFile, currentWorkspace, openFile } = useProjectStore();
  const { getCurrentSymbol, getSymbolHierarchy, editorInstance } = useEditorStore();

  const targetFile = filePath || activeFile;

  const [symbolHierarchy, setSymbolHierarchy] = useState<Array<{
    name: string;
    kind: any;
    detail?: string;
    range: any;
    selectionRange: any;
  }>>([]);

  const [miniExplorerOpen, setMiniExplorerOpen] = useState(false);
  const [miniExplorerPath, setMiniExplorerPath] = useState<string>('');
  const [rootItems, setRootItems] = useState<FileSystemItem[]>([]);
  const [miniExplorerPosition, setMiniExplorerPosition] = useState({ x: 0, y: 0 });
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  const isActive = targetFile === activeFile;

  useEffect(() => {
    if (!editorInstance || !isActive) return;

    const updateSymbols = async () => {
      try {
        const hierarchy = await getSymbolHierarchy();
        setSymbolHierarchy(hierarchy || []);
      } catch (error) {
        setSymbolHierarchy([]);
      }
    };

    updateSymbols();

    // Check if onDidChangeCursorPosition exists before trying to access it
    // Some older monaco versions or different editor objects might not have it exposed directly on the root instance in this way
    // But assuming it works as before.
    const disposable = editorInstance.onDidChangeCursorPosition?.(updateSymbols);
    const model = editorInstance.getModel();
    const modelChangeDisposable = model?.onDidChangeContent(updateSymbols);

    return () => {
      disposable?.dispose();
      modelChangeDisposable?.dispose();
    };
  }, [editorInstance, getCurrentSymbol, getSymbolHierarchy, isActive]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside the breadcrumb popup or the breadcrumb bar itself
      const target = event.target as Element;
      const isInsidePopup = target.closest(`.${styles.miniExplorer}`);
      const isInsideBar = breadcrumbRef.current && breadcrumbRef.current.contains(target as Node);

      if (!isInsidePopup && !isInsideBar) {
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

  const generatePathSegments = (filePath: string): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [];

    let relativePath = filePath;
    let fullPath = currentWorkspace || '';

    if (currentWorkspace && filePath.startsWith(currentWorkspace)) {
      relativePath = filePath.slice(currentWorkspace.length);
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.slice(1);
      }
    }

    const pathParts = relativePath.split(/[\\/]/);

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i]) {
        fullPath = fullPath + '/' + pathParts[i];
        segments.push({
          name: pathParts[i],
          type: 'folder',
          fullPath: fullPath.replace(/\/\//g, '/') // Ensure cleanly formatted path
        });
      }
    }

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

  const pathSegments = generatePathSegments(targetFile);

  if (pathSegments.length === 1) {
    return null;
  }

  const handleFolderClick = async (segment: BreadcrumbSegment, event: React.MouseEvent) => {
    if (segment.type === 'folder' && segment.fullPath) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      // Ensure we don't go off screen
      const x = rect.left;
      const y = rect.bottom + 5;

      setMiniExplorerPosition({ x, y });
      setMiniExplorerPath(segment.fullPath);

      try {
        const items = await tauriApi.readDir(segment.fullPath);
        const sortedItems = items.sort((a: any, b: any) => {
          if (a.is_dir && !b.is_dir) return -1;
          if (!a.is_dir && b.is_dir) return 1;
          return a.name.localeCompare(b.name);
        });
        setRootItems(sortedItems);
        setMiniExplorerOpen(true);
      } catch (e) {
      }
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
            {rootItems.map((item) => (
              <MiniExplorerItem
                key={item.path}
                item={item}
                level={0}
                onOpenFile={openFile}
                onClose={() => setMiniExplorerOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

