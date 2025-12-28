import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react';

interface UseResizablePanelOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  direction?: 'left' | 'right';
  onResize?: (width: number) => void;
}

interface UseResizablePanelReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
  panelRef: React.RefObject<HTMLDivElement>;
}

export const useResizablePanel = ({
  defaultWidth = 400,
  minWidth = 200,
  maxWidth = 800,
  direction = 'right',
  onResize,
}: UseResizablePanelOptions = {}): UseResizablePanelReturn => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isResizing) return;

    const deltaX = direction === 'right' 
      ? e.clientX - startX.current
      : startX.current - e.clientX;

    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
    setWidth(newWidth);
    onResize?.(newWidth);

    // Prevent text selection during resize
    e.preventDefault();
  }, [isResizing, direction, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;

    // Change cursor and prevent selection during resize
    document.body.style.cursor = direction === 'right' ? 'col-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, direction]);

  // Set up global mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Clean up cursor styles on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return {
    width,
    isResizing,
    handleMouseDown,
    panelRef: panelRef as React.RefObject<HTMLDivElement>
  };
};