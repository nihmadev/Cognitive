import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAIStore } from '../store/aiStore';
import { useUIStore } from '../store/uiStore';
import { tauriApi } from '../lib/tauri-api';

export const useAppInitialization = () => {
  const { setWorkspace, initWorkspace, openFiles } = useProjectStore();
  const { initializeModels, initializeApiKeys } = useAIStore();
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const state = await tauriApi.getInitialState();
        if (state.workspace) {
          await setWorkspace(state.workspace);
          
          // Восстанавливаем содержимое открытых файлов
          if (openFiles.length > 0) {
            const { forceUpdateContent } = useProjectStore.getState();
            
            for (const filePath of openFiles) {
              try {
                const content = await tauriApi.readFile(filePath);
                // Используем forceUpdateContent чтобы не помечать файлы как измененные
                forceUpdateContent(filePath, content);
              } catch (err) {
                // Файл может быть удален, пропускаем
              }
            }
          }
          
          // Initialize AI models and API keys after workspace is set
      try {
        await initializeApiKeys();
        await initializeModels();
      } catch (err) {
      }
      
      // Принудительно применяем тему после инициализации
      if (theme) {
        setTheme(theme);
      }
      
      return;
        }

        await initWorkspace();
      } catch (err) {
      }

      // Initialize AI models and API keys
      try {
        await initializeApiKeys();
        await initializeModels();
      } catch (err) {
      }
    };

    initializeApp();
  }, [setWorkspace, initWorkspace, initializeApiKeys, initializeModels, theme]);
};
