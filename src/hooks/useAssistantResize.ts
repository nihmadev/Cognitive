import { useRef, useEffect, useState } from 'react';

export const useAssistantResize = () => {
  const [isResizing, setIsResizing] = useState(false);
  const assistantRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!resizeHandleRef.current?.contains(e.target as Node)) return;
      
      e.preventDefault();
      setIsResizing(true);
      
      const startX = e.clientX;
      const startWidth = assistantRef.current?.offsetWidth || 0;
      
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = startX - e.clientX;
        const newWidth = Math.max(320, Math.min(window.innerWidth * 0.5, startWidth + deltaX));
        
        if (assistantRef.current) {
          assistantRef.current.style.width = `${newWidth}px`;
          assistantRef.current.style.flex = '0 0 auto';
        }
      };
      
      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      if (isResizing) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizing]);

  return {
    assistantRef,
    resizeHandleRef,
    isResizing
  };
};
