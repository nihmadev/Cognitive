
import styles from '../styles';
import { ThemeSection, FontsSection, CursorSection, TerminalSection } from '../sections';

export const SettingsSearch = ({ searchQuery }: { searchQuery: string }) => {
    const query = searchQuery.toLowerCase();
    const searchItems = [
        { id: 'workbench-appearance', title: 'Workbench: Color Theme', component: ThemeSection },
        { id: 'editor-font', title: 'Editor: Font Family', component: FontsSection },
        { id: 'editor-cursor', title: 'Editor: Cursor', component: CursorSection },
        { id: 'features-terminal', title: 'Terminal', component: TerminalSection },
    ];

    const matches = searchItems.filter(s => s.title.toLowerCase().includes(query));

    if (matches.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>No settings found matching "{searchQuery}"</div>
            </div>
        );
    }

    return (
        <div className={styles.searchResults}>
            {matches.map(m => (
                <div key={m.id} className={styles.searchResultSection}>
                    <div className={styles.searchResultHeader} style={{ fontSize: '12px', color: '#007acc', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #3c3c3c' }}>{m.title}</div>
                    <m.component />
                </div>
            ))}
        </div>
    );
};
