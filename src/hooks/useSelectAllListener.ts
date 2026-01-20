import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useEditorStore } from '../store/editorStore';

export const useSelectAllListener = () => {
  const { selectAll } = useEditorStore();

  useEffect(() => {
    const unlisten = listen('select-all', () => {
      selectAll();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectAll]);
};
