import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIStore } from '../../store/aiStore';
import { Trash2, CheckSquare, AlertTriangle } from 'lucide-react';
import styles from './HistoryModal.module.css';

// Helper for relative time since I can't guarantee date-fns is installed
const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hrs ago`;
    return 'Just now';
};

interface HistoryModalProps {
    onClose: () => void;
}

export const HistoryModal = ({ onClose }: HistoryModalProps) => {
    const { conversations, setActiveConversation, deleteConversation, deleteMultipleConversations } = useAIStore();
    const [search, setSearch] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [isRightButtonPressed, setIsRightButtonPressed] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Filter conversations
    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    // Handle selection with right mouse button
    const handleRightMouseDown = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        setIsRightButtonPressed(true);
        setIsSelecting(true);
        setSelectionStart(index);
        
        const conversationId = filtered[index].id;
        setSelectedItems(new Set([conversationId]));
    }, [filtered]);

    const handleRightMouseUp = useCallback(() => {
        setIsRightButtonPressed(false);
        setIsSelecting(false);
        setSelectionStart(null);
    }, []);

    const handleRightMouseEnter = useCallback((index: number) => {
        if (isSelecting && isRightButtonPressed && selectionStart !== null) {
            const start = Math.min(selectionStart, index);
            const end = Math.max(selectionStart, index);
            
            const newSelection = new Set<string>();
            for (let i = start; i <= end; i++) {
                if (filtered[i]) {
                    newSelection.add(filtered[i].id);
                }
            }
            setSelectedItems(newSelection);
        }
    }, [isSelecting, isRightButtonPressed, selectionStart, filtered]);

    // Handle keyboard events
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Delete' && selectedItems.size > 0) {
            handleDeleteSelected();
        } else if (e.key === 'Escape') {
            setSelectedItems(new Set());
        }
    }, [selectedItems.size]);

    // Clear selection when clicking outside
    const handleModalClick = useCallback((e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            setSelectedItems(new Set());
        }
    }, []);

    // Delete selected conversations
    const handleDeleteSelected = useCallback(() => {
        if (selectedItems.size > 0) {
            deleteMultipleConversations(Array.from(selectedItems));
            setSelectedItems(new Set());
        }
    }, [selectedItems, deleteMultipleConversations]);

    // Delete all conversations
    const handleDeleteAll = useCallback(() => {
        if (conversations.length > 0 && window.confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
            deleteMultipleConversations(conversations.map(c => c.id));
            setSelectedItems(new Set());
        }
    }, [conversations, deleteMultipleConversations]);

    // Toggle individual selection
    const toggleSelection = useCallback((id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        
        const handleGlobalMouseUp = () => {
            setIsRightButtonPressed(false);
            setIsSelecting(false);
            setSelectionStart(null);
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, handleKeyDown]);

    const handleSelect = (id: string) => {
        if (selectedItems.size > 0) {
            // If in selection mode, toggle selection instead of opening
            toggleSelection(id);
        } else {
            setActiveConversation(id);
            onClose();
        }
    };

    const handleItemClick = (id: string, e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
            toggleSelection(id, e);
        } else if (selectedItems.size > 0) {
            toggleSelection(id, e);
        } else {
            handleSelect(id);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteConversation(id);
    };

    return (
        <div className={styles.modalOverlay} onClick={handleModalClick}>
            <div ref={modalRef} className={styles.modalContent}>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <input
                            type="text"
                            placeholder="Select a conversation..."
                            className={styles.searchInput}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {conversations.length > 0 && (
                            <button
                                className={styles.deleteAllBtn}
                                onClick={handleDeleteAll}
                                title="Delete all conversations"
                            >
                                <AlertTriangle size={14} />
                            </button>
                        )}
                    </div>
                    {selectedItems.size > 0 && (
                        <div className={styles.selectionBar}>
                            <span className={styles.selectionCount}>
                                {selectedItems.size} selected
                            </span>
                            <button
                                className={styles.deleteSelectedBtn}
                                onClick={handleDeleteSelected}
                                title="Delete selected (Delete key)"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div ref={listRef} className={styles.listContainer}>
                    {filtered.length > 0 ? (
                        <>
                            <div className={styles.groupHeader}>Recent Conversations</div>
                            {filtered.map((conv, index) => (
                                <div
                                    key={conv.id}
                                    className={`${styles.item} ${selectedItems.has(conv.id) ? styles.selected : ''}`}
                                    onClick={(e) => handleItemClick(conv.id, e)}
                                    onMouseDown={(e) => e.button === 2 ? handleRightMouseDown(e, index) : undefined}
                                    onMouseUp={handleRightMouseUp}
                                    onMouseEnter={() => handleRightMouseEnter(index)}
                                    onContextMenu={(e) => e.preventDefault()}
                                >
                                    <div className={styles.itemTitle}>
                                        <div className={styles.checkbox}>
                                            {selectedItems.has(conv.id) && <CheckSquare size={14} />}
                                        </div>
                                        <div className={styles.itemTitleText}>{conv.title}</div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={styles.itemTime}>{getRelativeTime(conv.timestamp)}</span>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={(e) => handleDelete(e, conv.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="p-4 text-center text-[#808080] text-sm">
                            No conversations found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
