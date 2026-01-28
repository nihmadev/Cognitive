import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useProjectStore } from '../store/projectStore';
import { useGitStore } from '../store/gitStore';
import { useOutlineStore } from '../store/outlineStore';

const normalizePath = (path: string) => {
  return path.replace(/\\/g, '/').toLowerCase();
};

export const useFileWatcher = () => {
  const fsRefreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unlistenFsEvents = listen('file-change', (event: any) => {
      const { kind, paths } = event.payload as { kind: string; paths: string[] };

      const { markPathDeleted, markPathRestored, markPathsDeletedByPrefix, openFiles, refreshWorkspace, currentWorkspace } = useProjectStore.getState();
      const { refresh: refreshGit } = useGitStore.getState();
      const { invalidateCache } = useOutlineStore.getState();

      if (kind.includes('remove') || kind.includes('delete') || kind.includes('Remove')) {
        paths.forEach((eventPath: string) => {
          const normalizedEventPath = normalizePath(eventPath);

          openFiles.forEach((openFile: string) => {
            const normalizedOpenFile = normalizePath(openFile);
            if (normalizedOpenFile === normalizedEventPath) {
              markPathDeleted(openFile);
            }
          });

          markPathDeleted(eventPath);
          markPathsDeletedByPrefix(eventPath);
        });
      } else if (kind.includes('create') || kind.includes('Create')) {
        paths.forEach((eventPath: string) => {
          const normalizedEventPath = normalizePath(eventPath);

          openFiles.forEach((openFile: string) => {
            const normalizedOpenFile = normalizePath(openFile);
            if (normalizedOpenFile === normalizedEventPath) {
              markPathRestored(openFile);
            }
          });

          markPathRestored(eventPath);
        });
      } else if (kind.includes('modify') || kind.includes('write') || kind.includes('Modify')) {
        paths.forEach((path: string) => {
          invalidateCache(path);
        });
      }

      if (fsRefreshTimerRef.current !== null) {
        window.clearTimeout(fsRefreshTimerRef.current);
      }
      fsRefreshTimerRef.current = window.setTimeout(() => {
        refreshWorkspace().catch(() => {});
        if (currentWorkspace) {
          refreshGit(currentWorkspace).catch(() => {});
        }
      }, 50);
    });

    const unlistenRefreshNeeded = listen('workspace-refresh-needed', async () => {
      const { refreshWorkspace } = useProjectStore.getState();
      await refreshWorkspace();
    });

    return () => {
      unlistenFsEvents.then(fn => fn());
      unlistenRefreshNeeded.then(fn => fn());
      if (fsRefreshTimerRef.current !== null) {
        window.clearTimeout(fsRefreshTimerRef.current);
        fsRefreshTimerRef.current = null;
      }
    };
  }, []);
};
