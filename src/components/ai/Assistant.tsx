import { useProjectStore } from '../../store/projectStore';
import { useAIAssistant } from './hooks/useAIAssistant';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import { AISettings } from './components/Settings';
import { getProjectName } from './utils/aiHelpers';
import { getFolderIcon } from '../../utils/fileIcons';
import { useAIStore } from '../../store/aiStore';
import { useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './Assistant.module.css';
import { TodoComponent, SearchComponent, ReadComponent, ToolComponent, ListDirComponent } from './components/AgentComponents';
export const AIAssistant = () => {

  const aiAssistantData = useAIAssistant();

  const aiStore = useAIStore();
  const { currentWorkspace } = useProjectStore();
  const { addToolCall } = aiStore;

  const {
    inputValue,
    isHistoryModalOpen,
    isModelDropdownOpen,
    currentView,
    isLoading,
    activeConversation,
    activeConversationId,
    activeModelName,
    conversations,
    activeModelId,
    availableModels,
    textareaRef,
    messagesEndRef,
    dropdownRef,
    setInputValue,
    setIsHistoryModalOpen,
    setIsModelDropdownOpen,
    setCurrentView,
    setActiveConversation,
    setAssistantOpen,
    setModel,
    getModelStatus,
    createConversation,
    addMessage,
    appendMessageContent,
    setIsLoading,
    sendMessageStream
  } = aiAssistantData;

  const handleStop = () => {
    // Current streaming doesn't have an explicit stop command yet,
    // but we can at least stop the loading state.
    setIsLoading(false);
  };


  useEffect(() => {
    if (currentWorkspace) {
      invoke('agentrouter_set_workspace', { workspacePath: currentWorkspace })
        .catch(err => { /* Failed to set workspace for agent */ });
    }
  }, [currentWorkspace]);


  const handleSend = async (overrideContent?: string) => {
    const content = (overrideContent || inputValue).trim();
    if (!content || isLoading) return;

    if (!overrideContent) {
      setInputValue('');
    }
    setIsLoading(true);

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }

    if (convId) {
      const userMsg = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: content,
        timestamp: Date.now()
      };
      addMessage(convId, userMsg);

      const currentModel = availableModels.find(m => m.id === activeModelId);

      if (currentModel) {
        try {
          const conv = conversations.find(c => c.id === convId);
          let messages = conv?.messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })) || [];

          // Add current message if not already there
          if (messages.length === 0 || messages[messages.length - 1].content !== content) {
            messages.push(userMsg);
          }

          await sendMessageStream(convId, activeModelId, messages);

        } catch (error) {
          appendMessageContent(convId, `\n\n[Error: ${error instanceof Error ? error.message : String(error)}]`);
        }
      } else {
        appendMessageContent(convId, 'Error: No model selected');
      }
    }

    setIsLoading(false);
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const projectName = getProjectName(currentWorkspace);
  if (currentView === 'settings') {
    return <AISettings 
      onBack={() => setCurrentView(activeConversation ? 'chat' : 'home')} 
      onClose={() => setAssistantOpen(false)} 
      setIsHistoryModalOpen={setIsHistoryModalOpen} 
      fromView={activeConversation ? 'chat' : 'home'}
      styles={styles} 
    />;
  }
  if (currentView === 'chat') {
    return (
      <ChatView
        activeConversation={activeConversation}
        inputValue={inputValue}
        setInputValue={setInputValue}
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        isHistoryModalOpen={isHistoryModalOpen}
        setCurrentView={setCurrentView}
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        messagesEndRef={messagesEndRef}
        dropdownRef={dropdownRef}
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
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        isHistoryModalOpen={isHistoryModalOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setAssistantOpen={setAssistantOpen}
        setActiveConversation={setActiveConversation}
        setCurrentView={setCurrentView}
        onSend={handleSend}
        onStop={handleStop}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        dropdownRef={dropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    );
  }

  return null;
};
