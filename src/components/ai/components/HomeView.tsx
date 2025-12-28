import { Plus, History, MoreHorizontal, X, Settings } from 'lucide-react';
import { AIInput } from './AIInput';
import { HistoryModal } from '../HistoryModal';
import { ThinkingAnimation } from './ThinkingAnimation';

interface HomeViewProps {
  projectName: string;
  conversations: any[];
  inputValue: string;
  setInputValue: (value: string) => void;
  activeMode: 'responder' | 'agent';
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  isModeDropdownOpen: boolean;
  isHistoryModalOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setMode: (mode: 'responder' | 'agent') => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setIsModeDropdownOpen: (open: boolean) => void;
  setIsHistoryModalOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  setCurrentView: (view: 'home' | 'chat' | 'settings') => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  modeDropdownRef: React.RefObject<HTMLDivElement>;
  extendedModeDropdownRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  styles: any;
}

export const HomeView: React.FC<HomeViewProps> = ({
  projectName,
  conversations,
  inputValue,
  setInputValue,
  activeMode,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  isModeDropdownOpen,
  isHistoryModalOpen,
  availableModels,
  getModelStatus,
  setModel,
  setMode,
  setIsModelDropdownOpen,
  setIsModeDropdownOpen,
  setIsHistoryModalOpen,
  setAssistantOpen,
  setActiveConversation,
  setCurrentView,
  onSend,
  onStop,
  onKeyDown,
  textareaRef,
  dropdownRef,
  modeDropdownRef,
  extendedModeDropdownRef,
  isLoading,
  styles
}) => {  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcons}>
          <button onClick={() => setActiveConversation(null)} title="New Chat">
            <Plus size={18} />
          </button>
          <button onClick={() => setIsHistoryModalOpen(true)} title="History">
            <History size={18} />
          </button>
          <button onClick={() => setCurrentView('settings')} title="Settings">
            <Settings size={18} />
          </button>
          <button title="More">
            <MoreHorizontal size={18} />
          </button>
          <button onClick={() => setAssistantOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.brandTitle}>{projectName}</div>
        <AIInput
          variant="home"
          inputValue={inputValue}
          setInputValue={setInputValue}
          activeMode={activeMode}
          activeModelName={activeModelName}
          activeModelId={activeModelId}
          isModelDropdownOpen={isModelDropdownOpen}
          isModeDropdownOpen={isModeDropdownOpen}
          availableModels={availableModels}
          getModelStatus={getModelStatus}
          setModel={setModel}
          setMode={setMode}
          setIsModelDropdownOpen={setIsModelDropdownOpen}
          setIsModeDropdownOpen={setIsModeDropdownOpen}
          onSend={onSend}
          onStop={onStop}
          onKeyDown={onKeyDown}
          textareaRef={textareaRef}
          dropdownRef={dropdownRef}
          modeDropdownRef={modeDropdownRef}
          extendedModeDropdownRef={extendedModeDropdownRef}
          isLoading={isLoading}
          styles={styles}
        />
        {isLoading && <ThinkingAnimation styles={styles} />}
      </div>

      <div className={styles.historyContainer}>
        {conversations.length > 0 && (
          <>
            <div className={styles.historyList}>
              {conversations.slice(0, 3).map(conv => (
                <div
                  key={conv.id}
                  className={styles.historyItem}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <span className={styles.historyTitle}>{conv.title}</span>
                  <span className={styles.historyTime}>
                    {(() => {
                      const diff = Date.now() - conv.timestamp;
                      const secs = Math.floor(diff / 1000);
                      if (secs < 60) return `${secs}s`;
                      const mins = Math.floor(secs / 60);
                      if (mins < 60) return `${mins}m`;
                      const hours = Math.floor(mins / 60);
                      if (hours < 24) return `${hours}h`;
                      return `${Math.floor(hours / 24)}d`;
                    })()}
                  </span>
                </div>
              ))}
            </div>
            <button
              className={styles.seeAllBtn}
              onClick={() => setIsHistoryModalOpen(true)}
            >
              See all
            </button>
          </>
        )}
      </div>

      {isHistoryModalOpen && (
        <HistoryModal onClose={() => setIsHistoryModalOpen(false)} />
      )}
    </div>
  );
};
