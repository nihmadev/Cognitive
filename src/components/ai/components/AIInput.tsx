import { ChevronDown, Plus, Mic, ArrowRight, Square } from 'lucide-react';

interface AIInputProps {
  variant: 'home' | 'chat';
  inputValue: string;
  setInputValue: (value: string) => void;
  activeMode: 'responder' | 'agent';
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  isModeDropdownOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setMode: (mode: 'responder' | 'agent') => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setIsModeDropdownOpen: (open: boolean) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  modeDropdownRef: React.RefObject<HTMLDivElement>;
  extendedModeDropdownRef: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  styles: any;
}

export const AIInput: React.FC<AIInputProps> = ({
  variant,
  inputValue,
  setInputValue,
  activeMode,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  isModeDropdownOpen,
  availableModels,
  getModelStatus,
  setModel,
  setMode,
  setIsModelDropdownOpen,
  setIsModeDropdownOpen,
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
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={styles.inputWrapper}>
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={variant === 'home' 
          ? (activeMode === 'responder' ? "Ask anything (Ctrl+L)" : "Agent mode: AI can take actions and execute tasks")
          : (activeMode === 'responder' ? "Ask a question..." : "Give the agent a task...")
        }
        className={styles.textArea}
        rows={1}
      />

      <div className={styles.inputFooter}>
        <div className={styles.inputTools}>
          <button className={styles.toolBtn} title="Add attachment">
            <Plus size={16} />
          </button>

          <div ref={modeDropdownRef} className={styles.modelSelectorWrapper}>
            <button
              className={`${styles.modelTag} ${isModeDropdownOpen ? styles.active : ''}`}
              onClick={() => {
                if (isModeDropdownOpen) {
                  setIsModeDropdownOpen(false);
                } else {
                  setIsModelDropdownOpen(false);
                  setIsModeDropdownOpen(true);
                }
              }}
              title="Select Mode"
            >
              <ChevronDown size={14} />
              <span>{activeMode === 'responder' ? 'Responder' : 'Agent'}</span>
            </button>

            {isModeDropdownOpen && (
              <div ref={extendedModeDropdownRef} className={`${styles.dropdownMenu} ${styles.modeDropdownMenu} ${styles.show}`}>
                <div className={styles.dropdownHeader}>Conversation mode</div>
                {[
                  {
                    mode: 'responder',
                    title: 'Responder',
                    description: 'Get quick answers and assistance. Use for simple questions, explanations, or when you need direct help.'
                  },
                  {
                    mode: 'agent',
                    title: 'Agent',
                    description: 'AI can take actions and execute tasks. Use for coding, file operations, or complex workflows.'
                  }
                ].map(({ mode, title, description }) => (
                  <div
                    key={mode}
                    className={`${styles.modeItem} ${activeMode === mode ? styles.modeItemActive : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMode(mode as 'responder' | 'agent');
                      setIsModeDropdownOpen(false);
                    }}
                  >
                    <div className={styles.modeTitle}>{title}</div>
                    <div className={styles.modeDescription}>{description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div ref={dropdownRef} className={styles.modelSelectorWrapper}>
            <button
              className={`${styles.modelTag} ${isModelDropdownOpen ? styles.active : ''}`}
              onClick={() => {
                if (isModelDropdownOpen) {
                  setIsModelDropdownOpen(false);
                } else {
                  setIsModeDropdownOpen(false);
                  setIsModelDropdownOpen(true);
                }
              }}
            >
              <ChevronDown size={14} />
              <span>{activeModelName}</span>
            </button>

            {isModelDropdownOpen && (
              <div className={`${styles.dropdownMenu} ${styles.modelDropdownMenu} ${styles.show} ${styles.scrollable}`}>
                {availableModels.map(model => {
                  const status = getModelStatus(model.id);
                  const isRed = status === 'no-api-key' || status === 'not-downloaded';
                  
                  return (
                    <div
                      key={model.id}
                      className={`${styles.dropdownItem} ${activeModelId === model.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => {
                        setModel(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      style={{ color: isRed ? '#ef4444' : undefined }}
                    >
                      <span style={{ color: isRed ? '#ef4444' : undefined }}>
                        {model.name}
                      </span>
                      {isRed && (
                        <span style={{ 
                          fontSize: '11px', 
                          marginLeft: '8px', 
                          opacity: 0.7,
                          color: '#ef4444'
                        }}>
                          {status === 'no-api-key' ? '(No API key)' : '(Not downloaded)'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.inputActions}>
          <button className={styles.iconBtn}>
            <Mic size={18} />
          </button>
          {isLoading ? (
            <button
              onClick={onStop}
              className={styles.stopIconBtn}
              title="Stop generation"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!inputValue.trim()}
              className={styles.sendIconBtn}
            >
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
