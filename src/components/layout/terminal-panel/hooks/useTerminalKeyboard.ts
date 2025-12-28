import { useEffect } from 'react';
import { useTerminalStore } from '../../../../store/terminalStore';

interface UseTerminalKeyboardProps {
    selectedTerminalId: string | null;
    setSelectedTerminalId: (id: string | null) => void;
    showActionDropdown: boolean;
    setShowActionDropdown: (show: boolean) => void;
}

export const useTerminalKeyboard = ({
    selectedTerminalId,
    setSelectedTerminalId,
    showActionDropdown,
    setShowActionDropdown,
}: UseTerminalKeyboardProps) => {
    const { 
        terminals, 
        activeTerminalId, 
        removeTerminal, 
        addTerminal, 
        setActiveTerminal 
    } = useTerminalStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete - удалить выбранный терминал
            if (e.code === 'Delete' && selectedTerminalId) {
                e.preventDefault();
                removeTerminal(selectedTerminalId);
                setSelectedTerminalId(null);
            }

            // Ctrl+Shift+` - создать новый терминал
            if (e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
                e.preventDefault();
                addTerminal('powershell');
            }

            // Ctrl+Shift+5 - разделить терминал
            if (e.ctrlKey && e.shiftKey && e.code === 'Digit5' && !e.altKey) {
                e.preventDefault();
                console.log('Split terminal');
            }

            // Alt+Ctrl+Shift+` - новое окно терминала
            if (e.altKey && e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
                e.preventDefault();
                console.log('New terminal window');
            }

            // Ctrl+PageDown - следующий терминал
            if (e.ctrlKey && e.code === 'PageDown' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                if (terminals.length > 1 && activeTerminalId) {
                    const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
                    const nextIndex = (currentIndex + 1) % terminals.length;
                    setActiveTerminal(terminals[nextIndex].id);
                }
            }

            // Ctrl+PageUp - предыдущий терминал
            if (e.ctrlKey && e.code === 'PageUp' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                if (terminals.length > 1 && activeTerminalId) {
                    const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
                    const prevIndex = (currentIndex - 1 + terminals.length) % terminals.length;
                    setActiveTerminal(terminals[prevIndex].id);
                }
            }

            // Ctrl+Shift+W - закрыть активный терминал
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
                e.preventDefault();
                if (activeTerminalId) {
                    removeTerminal(activeTerminalId);
                }
            }

            // Escape - закрыть dropdown
            if (e.code === 'Escape' && showActionDropdown) {
                setShowActionDropdown(false);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.actionDropdown')) {
                setShowActionDropdown(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [
        terminals,
        activeTerminalId,
        selectedTerminalId, 
        removeTerminal, 
        addTerminal, 
        setActiveTerminal,
        showActionDropdown, 
        setSelectedTerminalId, 
        setShowActionDropdown
    ]);
};
