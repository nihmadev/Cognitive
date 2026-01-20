import { useProjectStore } from '../../store/projectStore';
import { useAIAssistant } from './hooks/useAIAssistant';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import { AISettings } from './components/AISettings';
import { getProjectName } from './utils/aiHelpers';
import { ChatService } from './services/ChatService';
import { useAIStore } from '../../store/aiStore';
import { useRef, useEffect } from 'react';
import styles from './AIAssistant.module.css';
export const AIAssistant = () => {
  
  const aiAssistantData = useAIAssistant();
  
  const aiStore = useAIStore();
  const { currentWorkspace } = useProjectStore();
  const chatServiceRef = useRef<ChatService | null>(null);
  
  const {
    inputValue,
    isHistoryModalOpen,
    isModelDropdownOpen,
    isModeDropdownOpen,
    currentView,
    isLoading,
    activeConversation,
    activeConversationId,
    activeModelName,
    conversations,
    activeModelId,
    activeMode,
    availableModels,
    textareaRef,
    messagesEndRef,
    dropdownRef,
    modeDropdownRef,
    extendedModeDropdownRef,
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
    createConversation,
    addMessage,
    appendMessageContent,
    setIsLoading
  } = aiAssistantData;
  
  const handleStop = () => {
    if (chatServiceRef.current) {
      chatServiceRef.current.abort();
      chatServiceRef.current = null;
    }
    setIsLoading(false);
  };
  
  
  useEffect(() => {
    if (chatServiceRef.current && currentWorkspace) {
      chatServiceRef.current.setWorkspace(currentWorkspace);
    }
  }, [currentWorkspace]);
  
  
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const content = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    
    let convId = activeConversationId;
    let isNewConversation = false;
    
    
    if (!convId) {
      convId = createConversation();
      isNewConversation = true;
    } else {
    }
    
    
    if (convId) {
      const userMsg = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: content,
        timestamp: Date.now()
      };
      addMessage(convId, userMsg);
      
      
      const assistantMsgId = (Date.now() + 1).toString();
      addMessage(convId, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      });
      
      
      const currentModel = availableModels.find(m => m.id === activeModelId);
      
      if (currentModel) {
        try {
          
          const conv = conversations.find(c => c.id === convId);
          let messages = conv?.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })) || [];
          
          
          if (messages.length === 0 || messages[messages.length - 1].content !== content) {
            messages.push({
              role: 'user',
              content: content
            });
          }
          
          let fullAssistantResponse = '';
          
          
          const chatService = new ChatService();
          chatServiceRef.current = chatService;
          
          
          if (currentWorkspace) {
            chatService.setWorkspace(currentWorkspace);
          }
          
          await chatService.sendMessage(
            currentModel,
            messages,
            activeMode,
            (chunk: string) => {
              fullAssistantResponse += chunk;
              appendMessageContent(convId, chunk);
            },
            
            (_tool: string, _isStart: boolean, _result?: string) => {
              // Tool execution callback
            }
          );
          
          chatServiceRef.current = null;
          
          
          const currentConv = conversations.find(c => c.id === convId);
          const shouldGenerateTitle = isNewConversation || (currentConv && currentConv.title === 'New Chat...');
          
          if (shouldGenerateTitle && fullAssistantResponse.trim()) {
            try {
              const generatedTitle = await chatService.generateTitle(
                currentModel,
                content,
                fullAssistantResponse
              );
              
              aiStore.updateConversationTitle(convId, generatedTitle);
            } catch (titleError) {
              
            }
          }
        } catch (error) {
          appendMessageContent(convId, `\n\n[Error: ${error instanceof Error ? error.message : String(error)}]`);
        }
      } else {
        appendMessageContent(convId, 'Error: No model selected');
      }
    }
    
    chatServiceRef.current = null;
    setIsLoading(false);
  };
  
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      return; 
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const projectName = getProjectName(currentWorkspace);
  if (currentView === 'settings') {
    return <AISettings onBack={() => setCurrentView('home')} onClose={() => setAssistantOpen(false)} styles={styles} />;
  }
  if (currentView === 'chat') {
    return (
      <ChatView
        activeConversation={activeConversation}
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
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        messagesEndRef={messagesEndRef}
        dropdownRef={dropdownRef}
        modeDropdownRef={modeDropdownRef}
        extendedModeDropdownRef={extendedModeDropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    );
  }
  if (currentView === 'home') {
    return (
      <HomeView
        projectName={projectName}
        conversations={conversations}
        inputValue={inputValue}
        setInputValue={setInputValue}
        activeMode={activeMode}
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        isModeDropdownOpen={isModeDropdownOpen}
        isHistoryModalOpen={isHistoryModalOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setMode={setMode}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsModeDropdownOpen={setIsModeDropdownOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        setCurrentView={setCurrentView}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        dropdownRef={dropdownRef}
        modeDropdownRef={modeDropdownRef}
        extendedModeDropdownRef={extendedModeDropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    );
  }
  
  return null;
};
