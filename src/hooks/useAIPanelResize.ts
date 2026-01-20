import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useResizablePanel } from './useResizablePanel';

export const useAIPanelResize = () => {
  const { aiPanelWidth, setAIPanelWidth } = useUIStore();

  const aiPanel = useResizablePanel({
    defaultWidth: aiPanelWidth,
    minWidth: 300,
    maxWidth: 800,
    direction: 'left',
    onResize: setAIPanelWidth
  });

  useEffect(() => {
    if (Math.abs(aiPanel.width - aiPanelWidth) > 1) {
      setAIPanelWidth(aiPanel.width);
    }
  }, [aiPanel.width, aiPanelWidth, setAIPanelWidth]);

  return aiPanel;
};
