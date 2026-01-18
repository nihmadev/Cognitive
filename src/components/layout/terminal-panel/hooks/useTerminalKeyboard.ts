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
            
            if (e.code === 'Delete' && selectedTerminalId) {
                e.preventDefault();
                removeTerminal(selectedTerminalId);
                setSelectedTerminalId(null);
            }

            
            if (e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
                e.preventDefault();
                addTerminal('powershell');
            }

            
            if (e.ctrlKey && e.shiftKey && e.code === 'Digit5' && !e.altKey) {
                e.preventDefault();
                console.log('Split terminal');
            }

            
            if (e.altKey && e.ctrlKey && e.shiftKey && e.code === 'Backquote') {
                e.preventDefault();
                console.log('New terminal window');
            }

            
            if (e.ctrlKey && e.code === 'PageDown' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                if (terminals.length > 1 && activeTerminalId) {
                    const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
                    const nextIndex = (currentIndex + 1) % terminals.length;
                    setActiveTerminal(terminals[nextIndex].id);
                }
            }

            
            if (e.ctrlKey && e.code === 'PageUp' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                if (terminals.length > 1 && activeTerminalId) {
                    const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
                    const prevIndex = (currentIndex - 1 + terminals.length) % terminals.length;
                    setActiveTerminal(terminals[prevIndex].id);
                }
            }

            
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyW') {
                e.preventDefault();
                if (activeTerminalId) {
                    removeTerminal(activeTerminalId);
                }
            }

            
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
