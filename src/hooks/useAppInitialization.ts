import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAIStore } from '../store/aiStore';
import { tauriApi } from '../lib/tauri-api';

export const useAppInitialization = () => {
  const { setWorkspace, initWorkspace, openFiles } = useProjectStore();
  const { initializeAgentRouter, initializeModels, initializeApiKeys } = useAIStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeModels();
        await initializeApiKeys();
        initializeAgentRouter();

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
                console.warn(`Failed to restore file: ${filePath}`, err);
              }
            }
          }
          
          return;
        }

        await initWorkspace();
      } catch (err) {
      }
    };

    initializeApp();
  }, [setWorkspace, initWorkspace, initializeAgentRouter, initializeModels, initializeApiKeys]);
};
