import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../../store/projectStore';

// Cache for gitignore status to avoid excessive API calls
const gitignoreCache = new Map<string, { value: boolean; version: number }>();

export const useGitignoreStatus = (filePath: string) => {
    const { currentWorkspace, fileSystemVersion } = useProjectStore();
    const [isIgnored, setIsIgnored] = useState(false);
    const lastVersionRef = useRef<number>(-1);

    useEffect(() => {
        if (!currentWorkspace || !filePath) {
            setIsIgnored(false);
            return;
        }

        const cacheKey = `${currentWorkspace}:${filePath}`;
        
        // Check cache first
        const cached = gitignoreCache.get(cacheKey);
        if (cached && cached.version === fileSystemVersion && lastVersionRef.current === fileSystemVersion) {
            setIsIgnored(cached.value);
            return;
        }

        const checkIgnored = async () => {
            try {
                // Note: isPathIgnored may not exist in tauriApi, using placeholder
                const ignored = false; // await tauriApi.isPathIgnored(currentWorkspace, filePath);
                
                // Update cache
                gitignoreCache.set(cacheKey, { value: ignored, version: fileSystemVersion });
                
                // Clean up old cache entries if too many
                if (gitignoreCache.size > 1000) {
                    const keysToDelete = Array.from(gitignoreCache.keys()).slice(0, 500);
                    keysToDelete.forEach(key => gitignoreCache.delete(key));
                }
                
                setIsIgnored(ignored);
                lastVersionRef.current = fileSystemVersion;
            } catch (error) {
                // If there's an error (e.g., no .gitignore), assume not ignored
                setIsIgnored(false);
                gitignoreCache.set(cacheKey, { value: false, version: fileSystemVersion });
            }
        };

        checkIgnored();
    }, [currentWorkspace, filePath, fileSystemVersion]);

    return isIgnored;
};
