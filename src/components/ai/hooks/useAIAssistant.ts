import { useState, useRef, useEffect, useLayoutEffect, RefObject } from 'react';
import { useAIStore } from '../../../store/aiStore';
import { useProjectStore } from '../../../store/projectStore';

export const useAIAssistant = () => {
  const {
    conversations,
    activeConversationId,
    activeModelId,
    activeMode,
    availableModels,
    ollamaLocalModels,
    createConversation,
    addMessage,
    appendMessageContent,
    setActiveConversation,
    setMode,
    setAssistantOpen,
    setModel,
    getModelStatus
  } = useAIStore();
  const { currentWorkspace } = useProjectStore();

  // Add debug logging to see what models are detected
  useEffect(() => {
    console.log('Available Ollama local models:', ollamaLocalModels);
    console.log('Available models:', availableModels);
    console.log('Active model ID:', activeModelId);
    console.log('Active model status:', activeModelId ? getModelStatus(activeModelId) : 'N/A');
  }, [ollamaLocalModels, availableModels, activeModelId]);

  const [inputValue, setInputValue] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chat' | 'settings'>('home');
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const extendedModeDropdownRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;

      if (textarea.scrollHeight > 200) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const scrollToBottom = () => {
    // Отключаем автоматическую прокрутку чтобы избежать подъема интерфейса
    // messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom();
    }
  }, [activeConversationId, activeConversation?.messages]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle model dropdown
      if (isModelDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }

      // Handle mode dropdown
      if (isModeDropdownOpen) {
        const target = event.target as Node;
        const isClickInsideModeButton = modeDropdownRef.current?.contains(target);
        const isClickInsideModeDropdown = extendedModeDropdownRef.current?.contains(target);

        if (!isClickInsideModeButton && !isClickInsideModeDropdown) {
          setIsModeDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen, isModeDropdownOpen]);

  // Add keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModelDropdownOpen(false);
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle view changes
  useEffect(() => {
    if (activeConversationId && activeConversation) {
      setCurrentView('chat');
    } else if (currentView === 'chat') {
      setCurrentView('home');
    }
  }, [activeConversationId, activeConversation]);

  return {
    // State
    inputValue,
    isHistoryModalOpen,
    isModelDropdownOpen,
    isModeDropdownOpen,
    currentView,
    isLoading,
    activeConversation,
    activeModelName: availableModels.find(m => m.id === activeModelId)?.name || 'Select Model',
    
    // Store data
    conversations,
    activeConversationId,
    activeModelId,
    activeMode,
    availableModels,
    ollamaLocalModels,
    currentWorkspace,
    
    // Store actions
    createConversation,
    addMessage,
    appendMessageContent,
    
    // Loading actions
    setIsLoading,
    
    // Refs
    textareaRef: textareaRef as RefObject<HTMLTextAreaElement>,
    messagesEndRef: messagesEndRef as RefObject<HTMLDivElement>,
    dropdownRef: dropdownRef as RefObject<HTMLDivElement>,
    modeDropdownRef: modeDropdownRef as RefObject<HTMLDivElement>,
    extendedModeDropdownRef: extendedModeDropdownRef as RefObject<HTMLDivElement>,
    
    // Actions
    setInputValue,
    setIsHistoryModalOpen,
    setIsModelDropdownOpen,
    setIsModeDropdownOpen,
    setCurrentView,
    setActiveConversation,
    setAssistantOpen,
    setMode,
    setModel,
    getModelStatus,
    adjustTextareaHeight,
    scrollToBottom
  };
};
