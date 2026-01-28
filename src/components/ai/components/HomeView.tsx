import { X, Settings, Bot, MessageSquare, History } from 'lucide-react';
import { AIInput } from './Input';
import { HistoryModal } from '../History.tsx';

interface HomeViewProps {
  projectName: string;
  conversations: any[];
  inputValue: string;
  setInputValue: (value: string) => void;
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  isHistoryModalOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setIsHistoryModalOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  setCurrentView: (view: 'home' | 'chat' | 'settings') => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  styles: any;
}

export const HomeView: React.FC<HomeViewProps> = ({
  projectName,
  conversations,
  inputValue,
  setInputValue,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  isHistoryModalOpen,
  availableModels,
  getModelStatus,
  setModel,
  setIsModelDropdownOpen,
  setIsHistoryModalOpen,
  setAssistantOpen,
  setActiveConversation,
  setCurrentView,
  onSend,
  onStop,
  onKeyDown,
  textareaRef,
  dropdownRef,
  isLoading,
  styles
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcons} style={{ marginLeft: 'auto' }}>
          <button onClick={() => setIsHistoryModalOpen(true)} title="History">
            <History size={18} />
          </button>
          <button onClick={() => setCurrentView('settings')} title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={() => setAssistantOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.homeContent}>
        <div className={styles.centerHero}>
          <div className={styles.logoContainer}>
            <img src="/icon.ico" className={styles.heroLogo} alt="Cognitive" />
          </div>
          <h1 className={styles.heroTitle}>Work with Cognitive</h1>
          <p className={styles.heroSubtitle}>Automates routine development tasks end-to-end for faster and more efficient delivery.</p>
        </div>

        <div className={styles.bottomArea}>
          {conversations.length > 0 && (
            <div className={styles.recentConversations}>
              <div className={styles.recentHeader}>Past Conversations</div>
              <div className={styles.recentList}>
                {conversations.slice(0, 3).map(conv => (
                  <div
                    key={conv.id}
                    className={styles.recentItem}
                    onClick={() => setActiveConversation(conv.id)}
                  >
                    <MessageSquare size={14} className={styles.recentIcon} />
                    <span className={styles.recentTitle}>{conv.title}</span>
                    <span className={styles.recentTime}>
                      {(() => {
                        const diff = Date.now() - conv.timestamp;
                        const secs = Math.floor(diff / 1000);
                        if (secs < 60) return `Just now`;
                        if (secs < 3600) return `Today`;
                        if (secs < 86400) return `Today`;
                        return `Yesterday`; // Simplified for the requirement
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.homeInputWrapper}>
            <AIInput
              variant="home"
              inputValue={inputValue}
              setInputValue={setInputValue}
              activeModelName={activeModelName}
              activeModelId={activeModelId}
              isModelDropdownOpen={isModelDropdownOpen}
              availableModels={availableModels}
              getModelStatus={getModelStatus}
              setModel={setModel}
              setIsModelDropdownOpen={setIsModelDropdownOpen}
              onSend={onSend}
              onStop={onStop}
              onKeyDown={onKeyDown}
              textareaRef={textareaRef}
              dropdownRef={dropdownRef}
              isLoading={isLoading}
              styles={styles}
            />
          </div>
        </div>
      </div>

      {isHistoryModalOpen && (
        <HistoryModal onClose={() => setIsHistoryModalOpen(false)} />
      )}
    </div>
  );
};
