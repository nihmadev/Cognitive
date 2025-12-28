import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export type AIModel = {
    id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'zhipu' | 'yandex' | 'gigachat' | 'ollama' | 'agentrouter';
};

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
};

export type Conversation = {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
    modelId: string;
    mode: 'responder' | 'agent';
};

export type ApiKeys = {
    openai: string;
    anthropic: string;
    google: string;
    xai: string;
    zhipu: string;
    yandex: string;
    gigachat: string;
    agentrouter: string;
};

export type OllamaLocalModel = {
    name: string;
    size: string;
    digest: string;
};

interface AIState {
    conversations: Conversation[];
    activeConversationId: string | null;
    availableModels: AIModel[];
    activeModelId: string;
    activeMode: 'responder' | 'agent';
    apiKeys: ApiKeys;
    ollamaLocalModels: OllamaLocalModel[];
    isAssistantOpen: boolean;
    isLoadingModels: boolean;
    
    // Actions
    addMessage: (conversationId: string, message: Message) => void;
    appendMessageContent: (conversationId: string, content: string) => void;
    createConversation: () => string;
    setActiveConversation: (id: string | null) => void;
    setMode: (mode: 'responder' | 'agent') => void;
    setModel: (modelId: string) => void;
    clearConversation: (id: string) => void;
    deleteConversation: (id: string) => void;
    deleteMultipleConversations: (ids: string[]) => void;
    updateConversationTitle: (id: string, title: string) => void;
    toggleAssistant: () => void;
    setAssistantOpen: (open: boolean) => void;
    setApiKeys: (keys: Partial<ApiKeys>) => void;
    refreshOllamaModels: () => Promise<void>;
    refreshOpenAIModels: () => Promise<void>;
    forceRefreshOpenAIModels: () => Promise<void>;
    refreshProxyModels: () => Promise<void>;
    addXAIModels: () => void;
    initializeAgentRouter: () => Promise<void>;
    initializeApiKeys: () => Promise<void>;
    initializeModels: () => Promise<void>;
    
    // Getters
    getModelStatus: (modelId: string) => 'available' | 'no-api-key' | 'not-downloaded';
}

export const useAIStore = create<AIState>()(
    persist(
        (set, get): AIState => ({
            conversations: [],
            activeConversationId: null,
            availableModels: [],
            activeModelId: '',
            activeMode: 'responder',
            apiKeys: {
                openai: '',
                anthropic: '',
                google: '',
                xai: '',
                zhipu: '',
                yandex: '',
                gigachat: '',
                agentrouter: '',
            },
            ollamaLocalModels: [],
            isAssistantOpen: false,
            isLoadingModels: false,

            toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),
            setAssistantOpen: (open: boolean) => set({ isAssistantOpen: open }),
            
            setApiKeys: async (keys: Partial<ApiKeys>) => {
                set((state) => { 
                    const newApiKeys = { ...state.apiKeys, ...keys };
                    
                    // Call the backend to store API keys
                    Object.entries(keys).forEach(([provider, key]) => {
                        if (key !== undefined) {
                            invoke('set_api_key', { provider, key: key.trim() }).catch(error => {
                                console.error(`Failed to set ${provider} API key:`, error);
                            });
                        }
                    });
                    
                    // Configure AgentRouter if API key is provided
                    if (keys.agentrouter && keys.agentrouter.trim()) {
                        invoke('agentrouter_configure', { 
                            apiKey: keys.agentrouter.trim(),
                            baseUrl: 'https://agentrouter.org/v1'
                        }).catch(error => {
                            console.error('Failed to configure AgentRouter:', error);
                        });
                    }
                    
                    return { apiKeys: newApiKeys };
                });

                // Refresh OpenAI models if OpenAI API key was set
                if (keys.openai && keys.openai.trim()) {
                    const state = get();
                    // Use setTimeout to avoid blocking the UI
                    setTimeout(() => {
                        state.refreshOpenAIModels();
                    }, 100);
                }
            },
            
            // Initialize AgentRouter if API key is already set
            initializeAgentRouter: async () => {
                const state = get();
                if (state.apiKeys.agentrouter && state.apiKeys.agentrouter.trim()) {
                    await invoke('agentrouter_configure', { 
                        apiKey: state.apiKeys.agentrouter.trim(),
                        baseUrl: 'https://agentrouter.org/v1'
                    }).catch(error => {
                        console.error('Failed to initialize AgentRouter:', error);
                    });
                }
            },

            initializeModels: async () => {
                const state = get();
                
                try {
                    // Fetch models from remote server
                    const { remoteModelsService } = await import('../components/ai/services/RemoteModelsService');
                    const remoteModels = await remoteModelsService.getAllModels();
                    
                    // Transform remote models to AIModel format
                    const transformedModels: AIModel[] = remoteModels.map(model => ({
                        id: model.id,
                        name: model.name,
                        provider: model.provider as any
                    }));
                    
                    // Set remote models first
                    set({ 
                        availableModels: transformedModels,
                        activeModelId: transformedModels[0]?.id || ''
                    });
                    
                    // Then add Ollama models (refreshOllamaModels merges with existing models)
                    await get().refreshOllamaModels();
                    
                } catch (error) {
                    console.error('Failed to fetch models from remote server, falling back to defaults:', error);
                    
                    // Fallback to empty models - will be populated by other methods
                    set({ 
                        availableModels: [],
                        activeModelId: ''
                    });
                    
                    // Try to load models through existing fallback methods
                    await state.refreshOpenAIModels();
                    state.addXAIModels();
                    await get().refreshOllamaModels();
                }
            },
            
            initializeApiKeys: async () => {
                try {
                    const state = get();
                    
                    // Sync API keys from frontend store to backend
                    // This ensures backend has the keys that were persisted in localStorage
                    const syncPromises = Object.entries(state.apiKeys).map(async ([provider, key]) => {
                        if (key && key.trim()) {
                            try {
                                await invoke('set_api_key', { provider, key: key.trim() });
                                console.log(`Synced ${provider} API key to backend`);
                            } catch (error) {
                                console.error(`Failed to sync ${provider} API key:`, error);
                            }
                        }
                    });
                    
                    await Promise.all(syncPromises);
                    
                    // Configure AgentRouter if API key exists
                    if (state.apiKeys.agentrouter && state.apiKeys.agentrouter.trim()) {
                        await invoke('agentrouter_configure', { 
                            apiKey: state.apiKeys.agentrouter.trim(),
                            baseUrl: 'https://agentrouter.org/v1'
                        }).catch(error => {
                            console.error('Failed to configure AgentRouter:', error);
                        });
                    }
                } catch (error) {
                    console.error('Failed to initialize API keys:', error);
                }
            },
            
            refreshOllamaModels: async () => {
                try {
                    const models = await invoke<OllamaLocalModel[]>('ollama_list_local_models');
                    set({ ollamaLocalModels: models });
                    
                    // Update available models to include only downloaded local models
                    set((state) => {
                        // Start with non-ollama models
                        const nonOllamaModels = state.availableModels.filter(m => m.provider !== 'ollama');
                        
                        // Add only the downloaded local models
                        const localOllamaModels = models.map(localModel => ({
                            id: localModel.name,
                            name: `${localModel.name} (Local)`,
                            provider: 'ollama' as const
                        }));
                        
                        const allModels = [...nonOllamaModels, ...localOllamaModels];
                        return { availableModels: allModels };
                    });
                } catch (error) {
                    console.error('Failed to refresh Ollama models:', error);
                    // Don't add fallback models - just keep existing models
                }
            },
            
            getModelStatus: (modelId: string): 'available' | 'no-api-key' | 'not-downloaded' => {
                const state = get();
                const model = state.availableModels.find(m => m.id === modelId);
                if (!model) return 'available';
                
                if (model.provider === 'ollama') {
                    // For ollama models, check if they are in the local models list
                    const isDownloaded = state.ollamaLocalModels.some(localModel => 
                        localModel.name === modelId
                    );
                    return isDownloaded ? 'available' : 'not-downloaded';
                } else {
                    const hasApiKey = state.apiKeys[model.provider as keyof ApiKeys];
                    return hasApiKey && hasApiKey.trim() ? 'available' : 'no-api-key';
                }
            },

            addMessage: (conversationId: string, message: Message) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c.id === conversationId
                            ? { ...c, messages: [...c.messages, message] }
                            : c
                    ),
                }));
            },

            appendMessageContent: (conversationId: string, content: string) => {
                set((state) => ({
                    conversations: state.conversations.map((c) => {
                        if (c.id !== conversationId) return c;
                        const messages = [...c.messages];
                        if (messages.length === 0) return c;
                        
                        const lastMessage = { ...messages[messages.length - 1] };
                        lastMessage.content += content;
                        messages[messages.length - 1] = lastMessage;
                        
                        return { ...c, messages };
                    }),
                }));
            },

            createConversation: () => {
                const id = crypto.randomUUID();
                const newConv: Conversation = {
                    id,
                    title: 'New Chat...', // Temporary title, will be updated by AI
                    timestamp: Date.now(),
                    messages: [],
                    modelId: get().activeModelId,
                    mode: get().activeMode,
                };
                set((state) => ({
                    conversations: [newConv, ...state.conversations],
                    activeConversationId: id,
                }));
                return id;
            },

            setActiveConversation: (id: string | null) => set({ activeConversationId: id }),
            setMode: (mode: 'responder' | 'agent') => set({ activeMode: mode }),
            setModel: (modelId: string) => set({ activeModelId: modelId }),

            clearConversation: (id: string) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, messages: [] } : c
                ),
            })),

            deleteConversation: (id: string) => set((state) => ({
                conversations: state.conversations.filter((c) => c.id !== id),
                activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
            })),

            deleteMultipleConversations: (ids: string[]) => set((state) => ({
                conversations: state.conversations.filter((c) => !ids.includes(c.id)),
                activeConversationId: ids.includes(state.activeConversationId || '') ? null : state.activeConversationId
            })),

            updateConversationTitle: (id: string, title: string) => set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === id ? { ...c, title } : c
                ),
            })),

            refreshOpenAIModels: async () => {
                
                set({ isLoadingModels: true });
                try {
                    // Import dynamically to avoid SSR issues
                    const { openAIModelsService } = await import('../components/ai/services/OpenAIModelsService');
                    
                    // Clear cache to ensure fresh models
                    openAIModelsService.clearCache();
                    
                    // Fetch models from OpenAI API without API key
                    console.log('Fetching OpenAI models from API...');
                    const openaiModels = await openAIModelsService.fetchAvailableModels();
                    
                    // Transform OpenAI models to AIModel format
                    const transformedModels: AIModel[] = openaiModels.map(model => ({
                        id: model.id,
                        name: model.name,
                        provider: 'openai' as const
                    }));

                    set((state) => {
                        // Keep non-OpenAI models and update OpenAI models
                        const nonOpenAIModels = state.availableModels.filter(m => m.provider !== 'openai');
                        const allModels = [...transformedModels, ...nonOpenAIModels];
                        
                        // Set active model to first OpenAI model if none is selected
                        let newActiveModelId = state.activeModelId;
                        if (!state.activeModelId) {
                            newActiveModelId = transformedModels[0]?.id || '';
                        }
                        
                        return { 
                            availableModels: allModels,
                            activeModelId: newActiveModelId
                        };
                    });

                    // Log model statistics
                    const stats = openAIModelsService.getModelStats(openaiModels);
                    console.log('OpenAI Models Statistics:', stats);

                } catch (error) {
                    console.error('Failed to refresh OpenAI models:', error);
                    // Don't use fallback - let user see the error
                } finally {
                    set({ isLoadingModels: false });
                }
            },

            // Force refresh OpenAI models (clear cache)
            forceRefreshOpenAIModels: async () => {
                set({ isLoadingModels: true });
                try {
                    const { openAIModelsService } = await import('../components/ai/services/OpenAIModelsService');
                    
                    // Force refresh by clearing cache - WITHOUT API key
                    const openaiModels = await openAIModelsService.refreshModels();
                    
                    // Transform OpenAI models to AIModel format
                    const transformedModels: AIModel[] = openaiModels.map(model => ({
                        id: model.id,
                        name: model.name,
                        provider: 'openai' as const
                    }));

                    set((state) => {
                        const nonOpenAIModels = state.availableModels.filter(m => m.provider !== 'openai');
                        const allModels = [...transformedModels, ...nonOpenAIModels];
                        
                        return { 
                            availableModels: allModels,
                            activeModelId: state.activeModelId || transformedModels[0]?.id || ''
                        };
                    });

                } catch (error) {
                    console.error('Failed to force refresh OpenAI models:', error);
                } finally {
                    set({ isLoadingModels: false });
                }
            },

            addXAIModels: () => {
                // This method is kept for compatibility but models are now fetched from proxy
                console.log('xAI models are now fetched from proxy server');
            },

            refreshProxyModels: async () => {
                try {
                    const { remoteModelsService } = await import('../components/ai/services/RemoteModelsService');
                    const remoteModels = await remoteModelsService.getAllModels();
                    
                    // Transform remote models to AIModel format
                    const transformedModels: AIModel[] = remoteModels.map(model => ({
                        id: model.id,
                        name: model.name,
                        provider: model.provider as any
                    }));
                    
                    set((state) => {
                        // Keep Ollama models, replace others with remote models
                        const ollamaModels = state.availableModels.filter(m => m.provider === 'ollama');
                        const allModels = [...transformedModels, ...ollamaModels];
                        return { 
                            availableModels: allModels,
                            activeModelId: state.activeModelId || transformedModels[0]?.id || ''
                        };
                    });
                    
                } catch (error) {
                    console.error('Failed to refresh models from remote server:', error);
                }
            },
        }),
        {
            name: 'ai-storage-v10', // Update version to force refresh with proxy models
            version: 10,
            migrate: (persistedState: any, version: number) => {
                // Clear old state and return fresh state - models will be loaded dynamically
                if (version < 10) {
                    return {
                        conversations: [],
                        activeConversationId: null,
                        activeModelId: '', // Will be set dynamically when models load
                        activeMode: 'responder',
                        apiKeys: {
                            openai: '',
                            anthropic: '',
                            google: '',
                            xai: '',
                            zhipu: '',
                            yandex: '',
                            gigachat: '',
                            agentrouter: '',
                        },
                        availableModels: [], // Will be populated from proxy
                        ollamaLocalModels: [],
                        isAssistantOpen: false,
                        isLoadingModels: false,
                        agentRouterInitialized: false,
                    };
                }
                return persistedState;
            },
        }
    )
);
