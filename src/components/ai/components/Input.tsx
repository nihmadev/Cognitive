import { ChevronDown, ChevronUp, Mic, ArrowRight, Square, Hash, Image as ImageIcon, Check } from 'lucide-react';
import inputStyles from '../Input.module.css';

interface AIInputProps {
  variant: 'home' | 'chat';
  inputValue: string;
  setInputValue: (value: string) => void;
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  isLoading?: boolean;
  styles: any;
}

export const AIInput: React.FC<AIInputProps> = ({
  variant,
  inputValue,
  setInputValue,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  availableModels,
  getModelStatus,
  setModel,
  setIsModelDropdownOpen,
  onSend,
  onStop,
  onKeyDown,
  textareaRef,
  dropdownRef,
  isLoading,
  styles
}) => {
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={inputStyles.inputWrapper}>
      <div className={inputStyles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={variant === 'home'
            ? "Your are chatting with Cognitive now"
            : "Your are chatting with Cognitive now"
          }
          className={inputStyles.textArea}
          rows={1}
        />
      </div>

      <div className={inputStyles.inputFooter}>
        <div className={inputStyles.inputTools}>
          <button className={inputStyles.toolBtn} title="Add context">
            <Hash size={16} />
          </button>
          <button className={inputStyles.toolBtn} title="Add image">
            <ImageIcon size={16} />
          </button>

          <div ref={dropdownRef} className={styles.modelSelectorWrapper}>
            <button
              className={`${inputStyles.modelTag} ${isModelDropdownOpen ? inputStyles.active : ''}`}
              onClick={() => {
                if (isModelDropdownOpen) {
                  setIsModelDropdownOpen(false);
                } else {
                  setIsModelDropdownOpen(true);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(() => {
                  const currentModel = availableModels.find(m => m.id === activeModelId);
                  return currentModel?.icon ? (
                    <span 
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                      dangerouslySetInnerHTML={{ __html: currentModel.icon }}
                    />
                  ) : null;
                })()}
                <span>{activeModelName}</span>
              </div>
              {isModelDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {model.icon && (
                          <span 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}
                            dangerouslySetInnerHTML={{ __html: model.icon }}
                          />
                        )}
                        <span style={{ color: 'white' }}>
                          {model.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeModelId === model.id && (
                          <Check size={14} color="var(--theme-accent)" />
                        )}
                        {isRed && (
                          <span style={{
                            fontSize: '11px',
                            opacity: 0.7,
                            color: '#ef4444'
                          }}>
                            {status === 'no-api-key' ? '(No API key)' : '(Not downloaded)'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={inputStyles.inputActions}>
          <button className={inputStyles.iconBtn}>
            <Mic size={18} />
          </button>
          {isLoading ? (
            <button
              onClick={onStop}
              className={inputStyles.stopIconBtn}
              title="Stop generation"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!inputValue.trim()}
              className={inputStyles.sendIconBtn}
            >
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
