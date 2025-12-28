import clsx from 'clsx';
import styles from '../TerminalPanel.module.css';
import { useTerminalStore } from '../../../../store/terminalStore';
import {
    PlusIcon,
    ChevronDownIcon,
    SplitIcon,
    TerminalIcon,
    WindowIcon,
    BugIcon,
    SettingsIcon,
    ProfileIcon,
    TaskIcon,
} from '../Icons';

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
                <PlusIcon />
            </button>
            <button
                className={clsx(styles.actionButton, styles.dropdownArrow)}
                onClick={() => setShowActionDropdown(!showActionDropdown)}
                title="Terminal Actions"
            >
                <ChevronDownIcon />
            </button>
            {showActionDropdown && (
                <div className={styles.actionDropdownMenu}>
                    <button className={styles.actionDropdownItem} onClick={() => handleAddTerminal()}>
                        <TerminalIcon /> New Terminal
                        <span className={styles.keyboardShortcut}>Ctrl+Shift+`</span>
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <WindowIcon /> New Terminal Window
                        <span className={styles.keyboardShortcut}>Ctrl+Shift+Alt+`</span>
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SplitIcon /> Split Terminal
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
                        <BugIcon /> JavaScript Debug Terminal
                    </button>
                    <hr className={styles.dropdownDivider} />
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SplitIcon /> Split Terminal with Profile
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SettingsIcon /> Configure Terminal Settings
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <ProfileIcon /> Select Default Profile
                    </button>
                    <hr className={styles.dropdownDivider} />
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <TaskIcon /> Run Task...
                    </button>
                    <button
                        className={styles.actionDropdownItem}
                        onClick={() => setShowActionDropdown(false)}
                    >
                        <SettingsIcon /> Configure Tasks...
                    </button>
                </div>
            )}
        </div>
    );
};
