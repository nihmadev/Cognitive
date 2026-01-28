import clsx from 'clsx';
import {
    Plus,
    ChevronDown,
    SplitSquareHorizontal,
    Terminal,
    AppWindow,
    Bug,
    Settings,
    User,
    Play
} from 'lucide-react';
import styles from '../TerminalPanel.module.css';
import { useTerminalStore } from '../../../../store/terminalStore';

type TabId = 'problems' | 'output' | 'debug' | 'terminal' | 'ports';

interface TerminalActionDropdownProps {
    activeTab: TabId;
    showActionDropdown: boolean;
    setShowActionDropdown: (show: boolean) => void;
}

export const TerminalActionDropdown = ({
    activeTab,
    showActionDropdown,
    setShowActionDropdown,
}: TerminalActionDropdownProps) => {
    const { addTerminal } = useTerminalStore();

    const handleAddTerminal = (type: 'powershell' | 'cmd' = 'powershell') => {
        if (activeTab === 'terminal') {
            addTerminal(type);
        }
        setShowActionDropdown(false);
    };

    return (
        <div className={clsx(styles.actionDropdown, 'actionDropdown')}>
            <button
                className={styles.actionButton}
                onClick={() => handleAddTerminal()}
                title="Add Terminal"
            >
                <Plus size={16} />
            </button>
            <button
                className={clsx(styles.actionButton, styles.dropdownArrow)}
                onClick={() => setShowActionDropdown(!showActionDropdown)}
                title="Terminal Actions"
            >
                <ChevronDown size={14} />
            </button>
            {showActionDropdown && (
                <div className={styles.actionDropdownMenu}>
                    <button className={styles.actionDropdownItem} onClick={() => handleAddTerminal()}>
                        <Terminal size={14} /> New Terminal
                        <span className={styles.keyboardShortcut}>Ctrl+Shift+`</span>
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <AppWindow size={14} /> New Terminal Window
                        <span className={styles.keyboardShortcut}>Ctrl+Shift+Alt+`</span>
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SplitSquareHorizontal size={14} /> Split Terminal
                        <span className={styles.keyboardShortcut}>Ctrl+Shift+5</span>
                    </button>
                    <hr className={styles.dropdownDivider} />
                    <button className={styles.actionDropdownItem} onClick={() => handleAddTerminal('powershell')}>
                        PowerShell
                    </button>
                    <button className={styles.actionDropdownItem} onClick={() => handleAddTerminal('cmd')}>
                        Command Prompt
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <Bug size={14} /> JavaScript Debug Terminal
                    </button>
                    <hr className={styles.dropdownDivider} />
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SplitSquareHorizontal size={14} /> Split Terminal with Profile
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <Settings size={14} /> Configure Terminal Settings
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <User size={14} /> Select Default Profile
                    </button>
                    <hr className={styles.dropdownDivider} />
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <Play size={14} /> Run Task...
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <Settings size={14} /> Configure Tasks...
                    </button>
                </div>
            )}
        </div>
    );
};
