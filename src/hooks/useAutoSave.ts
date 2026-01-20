import { useEffect } from 'react';
import { useAutoSaveStore } from '../store/autoSaveStore';

export const useAutoSave = () => {
  const { saveOnFocusLoss, saveAllUnsaved } = useAutoSaveStore();

  useEffect(() => {
    const handleWindowBlur = async () => {
      if (saveOnFocusLoss) {
        await saveAllUnsaved();
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [saveOnFocusLoss, saveAllUnsaved]);
};
