import { tauriApi } from '../../../lib/tauri-api';
import { useProjectStore } from '../../../store/projectStore';
import styles from './SidebarLayout.module.css';

export const NoWorkspaceView = () => {
    const { setWorkspace } = useProjectStore();

    const openFolder = async () => {
        try {
            const selectedFolder = await tauriApi.openFolderDialog();
            if (selectedFolder) {
                setWorkspace(selectedFolder);
            }
        } catch (error) {
        }
    };

    return (
        <div className={styles.noWorkspace}>
            <p className={styles.noWorkspaceText}>You have not yet opened a folder.</p>
            <button
                onClick={openFolder}
                className={styles.openFolderBtn}
            >
                Open Folder
            </button>
        </div>
    );
};
