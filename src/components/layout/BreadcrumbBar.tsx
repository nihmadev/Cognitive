import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useEditorStore } from '../../store/editorStore';
import { getFileIcon } from '../../utils/fileIcons';
import { ChevronRight, Code, Braces, Component, Layers, Cpu } from 'lucide-react';
import styles from './BreadcrumbBar.module.css';

interface BreadcrumbSegment {
  name: string;
  type: 'folder' | 'file' | 'symbol';
}

// Helper function to get symbol icon based on symbol name and context
const getSymbolIcon = (symbolName: string) => {
  const name = symbolName.toLowerCase();
  
  // React hooks
  if (name.startsWith('use')) {
    return <Cpu size={12} />;
  }
  
  // React components (start with uppercase)
  if (/^[A-Z]/.test(symbolName)) {
    return <Component size={12} />;
  }
  
  // Decorators
  if (symbolName.startsWith('@')) {
    return <Layers size={12} />;
  }
  
  // Interfaces and types
  if (name.includes('interface') || name.includes('type')) {
    return <Braces size={12} />;
  }
  
  // Default function/method icon
  return <Code size={12} />;
};

export const BreadcrumbBar = () => {
  const { activeFile } = useProjectStore();
  const { getCurrentSymbol, getSymbolHierarchy, editorInstance } = useEditorStore();
  const [symbolHierarchy, setSymbolHierarchy] = useState<Array<{
    name: string;
    kind: any;
    detail?: string;
    range: any;
    selectionRange: any;
  }>>([]);

  // Update current symbol and hierarchy when cursor moves
  useEffect(() => {
    if (!editorInstance) return;

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
  }, [editorInstance, getCurrentSymbol, getSymbolHierarchy]);

  if (!activeFile) {
    return null;
  }

  // Generate path segments from the file path
  const generatePathSegments = (): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [];
    
    // Get relative path from workspace root
    const { currentWorkspace } = useProjectStore.getState();
    let relativePath = activeFile;
    
    if (currentWorkspace && activeFile.startsWith(currentWorkspace)) {
      // Remove workspace path and leading slash to get relative path
      relativePath = activeFile.slice(currentWorkspace.length);
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.slice(1);
      }
    }
    
    // Split path and create folder segments
    const pathParts = relativePath.split(/[\\/]/);
    
    // Add folder segments (excluding the file name)
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i]) {
        segments.push({
          name: pathParts[i],
          type: 'folder'
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

  const pathSegments = generatePathSegments();

  return (
    <div className={styles.breadcrumbBar}>
      <div className={styles.breadcrumbContent}>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight size={12} className={styles.separator} />
            )}
            <span
              className={`${styles.segment} ${
                segment.type === 'file' ? styles.fileSegment : ''
              }`}
            >
              <span className={styles.segmentIcon}>
                {segment.type === 'file' ? (
                  getFileIcon(segment.name, activeFile)
                ) : (
                  <Layers size={12} />
                )}
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
                    <span className={styles.segmentIcon}>
                      {getSymbolIcon(symbol.name)}
                    </span>
                    {symbol.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
