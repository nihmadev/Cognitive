import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CHATGPT_ICON, GEMINI_ICON } from '../assets/modelIcons';
import { agentService } from '../lib/ai/agentService';

export type AIModel = {
    id: string;
    name: string;
    provider: 'chatgpt' | 'google' | 'ollama';
    icon?: string;
};

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isComponent?: boolean;
    component?: 'todo' | 'search' | 'read' | 'tool' | 'list';
    toolCalls?: ToolCall[];
};

export type Conversation = {
    id: string;
    title: string;
    timestamp: number;
    messages: Message[];
    modelId: string;
    mode: 'agent';
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
    ollama: string;
};

export type OllamaLocalModel = {
    name: string;
    size: number;
    digest: string;
};

export type TodoItem = {
    id: number;
    text: string;
    status: 'pending' | 'completed' | 'in_progress';
};

export type ToolCall = {
    id: string;
    name: string;
    parameters: Record<string, any>;
    status: 'pending' | 'executing' | 'completed' | 'error';
    result?: string;
    error?: string;
    timestamp: number;
};

interface AIState {
    conversations: Conversation[];
    activeConversationId: string | null;
    availableModels: AIModel[];
    activeModelId: string;
    activeMode: 'agent';
    apiKeys: ApiKeys;
    ollamaLocalModels: OllamaLocalModel[];
    isAssistantOpen: boolean;
    isLoadingModels: boolean;
    todos: TodoItem[];
    activeToolCalls: ToolCall[];

    setTodos: (todos: TodoItem[]) => void;
    refreshTodos: () => Promise<void>;
    addToolCall: (toolCall: ToolCall) => void;
    updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
    clearToolCalls: () => void;
    addMessage: (conversationId: string, message: Message) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
    appendMessageContent: (conversationId: string, content: string, messageId?: string) => void;
    createConversation: () => string;
    setActiveConversation: (id: string | null) => void;
    setMode: (mode: 'agent') => void;
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
    refreshGoogleModels: () => Promise<void>;
    initializeAgentRouter: () => Promise<void>;
    initializeApiKeys: () => Promise<void>;
    initializeModels: () => Promise<void>;
    sendMessageStream: (conversationId: string, modelId: string, messages: Message[]) => Promise<void>;
    generateChatTitle: (conversationId: string) => Promise<void>;

    getModelStatus: (modelId: string) => 'available' | 'no-api-key' | 'not-downloaded';
}

const formatAIError = (error: any): string => {
    let errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    
    // Try to extract JSON from string if it looks like "[Error: ... { ... } ]" or similar
    try {
        const jsonMatch = errorStr.match(/\{.*\}/s);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error?.message) {
                errorStr = parsed.error.message;
            } else if (parsed.error?.code) {
                errorStr = parsed.error.code;
            }
        }
    } catch (e) {
        // Fallback to original string if JSON parsing fails
    }

    const lowerError = errorStr.toLowerCase();
    
    // Rate limits
    if (lowerError.includes('429') || lowerError.includes('rate_limit_exceeded') || lowerError.includes('too many requests') || lowerError.includes('rate limit reached')) {
        return 'Rate limit reached. Please try again later.';
    }
    
    // Auth errors
    if (lowerError.includes('401') || lowerError.includes('invalid_api_key') || lowerError.includes('incorrect api key') || lowerError.includes('unauthorized')) {
        return 'Authentication error. Please check your API key in settings.';
    }
    
    // Server errors
    if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503') || lowerError.includes('504') || lowerError.includes('server_error') || lowerError.includes('bad gateway')) {
        return 'Server error. Please try again later or switch to a different model.';
    }
    
    // Billing / Insufficient funds
    if (lowerError.includes('insufficient_quota') || lowerError.includes('billing_not_active') || lowerError.includes('quota exceeded')) {
        return 'Insufficient funds or quota exceeded. Please check your billing status.';
    }

    // Connection errors
    if (lowerError.includes('fetch failed') || lowerError.includes('connection refused') || lowerError.includes('failed to fetch') || lowerError.includes('network error')) {
        return 'Connection failed. Please check your internet connection or if the local model provider is running.';
    }

    // Model not found
    if (lowerError.includes('404') || lowerError.includes('model_not_found') || lowerError.includes('does not exist')) {
        return 'Model not found or unavailable.';
    }

    // Context length exceeded
    if (lowerError.includes('context_length_exceeded') || lowerError.includes('maximum context length')) {
        return 'Context limit exceeded. Try a shorter message or clear history.';
    }

    // Safety / Filter
    if (lowerError.includes('safety') || lowerError.includes('blocked') || lowerError.includes('filtered')) {
        return 'Message blocked by safety filters.';
    }

    return errorStr;
};

export const useAIStore = create<AIState>()(
    persist(
        (set, get): AIState => {
            // Shared OpenAI models array to avoid duplication
            const openaiModels: AIModel[] = [
                { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-5', name: 'GPT-5', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4', name: 'GPT-4', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'o1', name: 'o1', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'o1-mini', name: 'o1 Mini', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4o', name: 'GPT-4o', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'o3-pro', name: 'o3 Pro', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'o3', name: 'o3', provider: 'chatgpt', icon: CHATGPT_ICON },
                { id: 'o4-mini', name: 'o4 Mini', provider: 'chatgpt', icon: CHATGPT_ICON }
            ];

            return {
                conversations: [],
                activeConversationId: null,
                availableModels: [],
                activeModelId: '',
                activeMode: 'agent',
                apiKeys: {
                    openai: '',
                    anthropic: '',
                    google: '',
                    xai: '',
                    zhipu: '',
                    yandex: '',
                    gigachat: '',
                    agentrouter: '',
                    ollama: '',
                },
                ollamaLocalModels: [],
                isAssistantOpen: false,
                isLoadingModels: false,
                todos: [],
                activeToolCalls: [],

                setTodos: (todos: TodoItem[]) => set({ todos }),
                refreshTodos: async () => {
                    try {
                        const todosJson = await invoke<string>('cognitive_get_todos');
                        const todos = JSON.parse(todosJson);
                        set({ todos });
                    } catch (error) {
                        // Failed to refresh todos
                    }
                },

                addToolCall: (toolCall: ToolCall) => set((state) => ({
                    activeToolCalls: [...state.activeToolCalls, toolCall]
                })),

                updateToolCall: (id: string, updates: Partial<ToolCall>) => set((state) => {
                    const exists = state.activeToolCalls.some(tc => tc.id === id);
                    if (!exists) {
                        return {
                            activeToolCalls: [...state.activeToolCalls, { id, ...updates } as ToolCall]
                        };
                    }
                    return {
                        activeToolCalls: state.activeToolCalls.map(tc => 
                            tc.id === id ? { ...tc, ...updates } : tc
                        )
                    };
                }),

                clearToolCalls: () => set({ activeToolCalls: [] }),

                toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),
                setAssistantOpen: (open: boolean) => set({ isAssistantOpen: open }),

                setApiKeys: async (keys: Partial<ApiKeys>) => {
                    set((state) => {
                        const newApiKeys = { ...state.apiKeys, ...keys };

                        Object.entries(keys).forEach(([provider, key]) => {
                            if (key !== undefined) {
                                invoke('set_api_key', { provider, key: key.trim() }).catch(() => { });
                            }
                        });

                        // Configure agentrouter if relevant keys changed
                        if (keys.openai !== undefined || keys.google !== undefined || keys.agentrouter !== undefined || keys.ollama !== undefined) {
                            invoke('agentrouter_configure', {
                                openaiApiKey: newApiKeys.openai || null,
                                geminiApiKey: newApiKeys.google || null,
                                baseUrl: newApiKeys.agentrouter || null,
                                ollamaBaseUrl: newApiKeys.ollama || null
                            }).catch(err => { });
                        }

                        return { apiKeys: newApiKeys };
                    });

                    if (keys.openai && keys.openai.trim()) {
                        const state = get();
                        setTimeout(() => {
                            state.refreshOpenAIModels();
                        }, 100);
                    }
                },

                initializeAgentRouter: async () => {
                    const state = get();
                    try {
                        await invoke('agentrouter_configure', {
                            openaiApiKey: state.apiKeys.openai || null,
                            geminiApiKey: state.apiKeys.google || null,
                            baseUrl: state.apiKeys.agentrouter || null,
                            ollamaBaseUrl: state.apiKeys.ollama || null
                        });
                    } catch (error) {
                        // Failed to initialize agentrouter
                    }
                },

                initializeModels: async () => {
                    const state = get();

                    try {
                        await state.initializeAgentRouter();
                        await state.refreshOpenAIModels();
                        await state.refreshGoogleModels();
                        await state.refreshOllamaModels();
                    } catch (error) {
                        // Failed to initialize models
                        set({
                            availableModels: [],
                            activeModelId: ''
                        });
                    }
                },

                initializeApiKeys: async () => {
                    try {
                        const state = get();

                        const syncPromises = Object.entries(state.apiKeys).map(async ([provider, key]) => {
                            if (key && key.trim()) {
                                try {
                                    await invoke('set_api_key', { provider, key: key.trim() });
                                } catch (error) {
                                    // Failed to sync API key
                                }
                            }
                        });

                        await Promise.all(syncPromises);
                        await state.initializeAgentRouter();
                    } catch (error) {
                        // Failed to initialize API keys
                    }
                },

                sendMessageStream: async (conversationId: string, modelId: string, messages: Message[]) => {
                    const state = get();
                    const conversation = state.conversations.find(c => c.id === conversationId);
                    if (!conversation) return;

                    // Clear any previous tool calls
                    state.clearToolCalls();

                    let currentAssistantMessageId = crypto.randomUUID();
                    let currentToolMessageId: string | null = null;
                    let lastPhase: 'text' | 'tool' = 'text';

                    // Create first assistant message
                    state.addMessage(conversationId, {
                        id: currentAssistantMessageId,
                        role: 'assistant',
                        content: '',
                        timestamp: Date.now()
                    });

                    try {
                        await agentService.run({
                            model: modelId,
                            messages,
                            apiKeys: state.apiKeys,
                            onChunk: (chunk) => {
                                // If we were in tool phase and now getting text, start a new text message
                                if (lastPhase === 'tool') {
                                    currentAssistantMessageId = crypto.randomUUID();
                                    state.addMessage(conversationId, {
                                        id: currentAssistantMessageId,
                                        role: 'assistant',
                                        content: '',
                                        timestamp: Date.now()
                                    });
                                    currentToolMessageId = null; // Reset tool message for this new segment
                                }
                                lastPhase = 'text';
                                state.appendMessageContent(conversationId, chunk, currentAssistantMessageId);
                            },
                            onToolStart: (newToolCall) => {
                                state.addToolCall(newToolCall);
                                lastPhase = 'tool';

                                // Determine component type based on tool name
                                let componentType: 'tool' | 'search' | 'read' | 'todo' | 'list' = 'tool';
                                if (['search_files', 'grep', 'search_codebase', 'index_codebase'].includes(newToolCall.name)) {
                                    componentType = 'search';
                                } else if (newToolCall.name === 'read_file') {
                                    componentType = 'read';
                                } else if (newToolCall.name === 'list_dir') {
                                    componentType = 'list';
                                } else if (newToolCall.name.startsWith('todo_')) {
                                    componentType = 'todo';
                                }

                                // If this is the first tool in this phase
                                if (!currentToolMessageId) {
                                    currentToolMessageId = crypto.randomUUID();
                                    state.addMessage(conversationId, {
                                        id: currentToolMessageId,
                                        role: 'assistant',
                                        content: '',
                                        timestamp: Date.now(),
                                        isComponent: true,
                                        component: componentType,
                                        toolCalls: [newToolCall]
                                    });
                                } else {
                                    const conversation = get().conversations.find(c => c.id === conversationId);
                                    const toolMessage = conversation?.messages.find(m => m.id === currentToolMessageId);
                                    
                                    const currentToolCalls = toolMessage?.toolCalls || [];
                                    const toolCallExists = currentToolCalls.some(tc => tc.id === newToolCall.id);
                                    
                                    state.updateMessage(conversationId, currentToolMessageId, {
                                        component: componentType, // Update type if it changed
                                        toolCalls: toolCallExists 
                                            ? currentToolCalls.map(tc => tc.id === newToolCall.id ? newToolCall : tc)
                                            : [...currentToolCalls, newToolCall]
                                    });
                                }
                            },
                            onToolResult: (id, name, result) => {
                                state.updateToolCall(id, { 
                                    status: 'completed', 
                                    result: result 
                                });

                                // Update tool message with completed status
                                if (currentToolMessageId) {
                                    const conversation = get().conversations.find(c => c.id === conversationId);
                                    const toolMessage = conversation?.messages.find(m => m.id === currentToolMessageId);
                                    
                                    if (toolMessage?.toolCalls) {
                                        state.updateMessage(conversationId, currentToolMessageId, {
                                            toolCalls: toolMessage.toolCalls.map(tc => 
                                                tc.id === id ? { ...tc, status: 'completed', result: result } : tc
                                            )
                                        });
                                    }
                                }

                                if (name.startsWith('todo_')) {
                                    state.refreshTodos();
                                }
                            },
                            onToolError: (id, name, error) => {
                                state.updateToolCall(id, { 
                                    status: 'error', 
                                    error: error 
                                });

                                // Update tool message with error status
                                if (currentToolMessageId) {
                                    const conversation = get().conversations.find(c => c.id === conversationId);
                                    const toolMessage = conversation?.messages.find(m => m.id === currentToolMessageId);
                                    
                                    if (toolMessage?.toolCalls) {
                                        state.updateMessage(conversationId, currentToolMessageId, {
                                            toolCalls: toolMessage.toolCalls.map(tc => 
                                                tc.id === id ? { ...tc, status: 'error', error: error } : tc
                                            )
                                        });
                                    }
                                }
                            }
                        });
                    } catch (error) {
                        // Streaming error
                        const friendlyError = formatAIError(error);
                        state.appendMessageContent(conversationId, `\n\n${friendlyError}`, currentAssistantMessageId);
                    }
                },

                generateChatTitle: async (conversationId: string) => {
                    const state = get();
                    const conversation = state.conversations.find(c => c.id === conversationId);
                    if (!conversation || conversation.messages.length < 2) return;

                    try {
                        const modelId = conversation.modelId || state.activeModelId;
                        const userMessage = conversation.messages.find(m => m.role === 'user')?.content || '';
                        const assistantMessage = conversation.messages.find(m => m.role === 'assistant')?.content || '';

                        const prompt = `Create a very short, concise title (max 5 words) for this chat based on the following exchange. Use the same language as the user.
                        
                        User: ${userMessage}
                        Assistant: ${assistantMessage.slice(0, 500)}...
                        
                        Title:`;

                        // Use a simple fetch for title generation instead of invoke
                        let title = '';
                        const stream = agentService.callAIStream(modelId, [{ role: 'user', content: prompt }], {
                            model: modelId,
                            messages: [],
                            apiKeys: state.apiKeys,
                            onChunk: () => {},
                            onToolStart: () => {},
                            onToolResult: () => {},
                            onToolError: () => {}
                        });

                        for await (const chunk of stream) {
                            title += chunk;
                        }

                        if (title) {
                            state.updateConversationTitle(conversationId, title.replace(/["']/g, '').trim());
                        }
                    } catch (error) {
                        // Failed to generate title
                    }
                },

                refreshOllamaModels: async () => {
                    const state = get();
                    try {
                        const models = await invoke<OllamaLocalModel[]>('agentrouter_list_ollama_models');
                        set({ ollamaLocalModels: models });

                        set((state) => {
                            // Сохраняем модели других провайдеров
                            const otherModels = state.availableModels.filter(m => m.provider !== 'ollama');

                            const localOllamaModels = models.map(localModel => ({
                                id: localModel.name,
                                name: `${localModel.name} (Local)`,
                                provider: 'ollama' as const
                            }));

                            const allModels = [...otherModels, ...localOllamaModels];
                            return { availableModels: allModels };
                        });
                    } catch (error) {
                        // Failed to refresh Ollama models
                    }
                },

                getModelStatus: (modelId: string): 'available' | 'no-api-key' | 'not-downloaded' => {
                    const state = get();
                    const model = state.availableModels.find(m => m.id === modelId);
                    if (!model) return 'available';

                    if (model.provider === 'ollama') {
                        const isDownloaded = state.ollamaLocalModels.some(localModel =>
                            localModel.name === modelId
                        );
                        return isDownloaded ? 'available' : 'not-downloaded';
                    } else {
                        const hasApiKey = state.apiKeys[model.provider === 'chatgpt' ? 'openai' : 'google'];
                        return hasApiKey && hasApiKey.trim() ? 'available' : 'no-api-key';
                    }
                },

                addMessage: (conversationId: string, message: Message) => {
                    set((state) => {
                        const conversations = state.conversations.map((c) => {
                            if (c.id !== conversationId) return c;

                            let newTitle = c.title;
                            if (c.messages.length === 0 && message.role === 'user') {
                                newTitle = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
                            }

                            return { ...c, title: newTitle, messages: [...c.messages, message] };
                        });
                        
                        return { conversations };
                    });
                },

                updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
                    set((state) => {
                        const conversations = state.conversations.map((c) => {
                            if (c.id !== conversationId) return c;
                            return {
                                ...c,
                                messages: c.messages.map((m) =>
                                    m.id === messageId ? { ...m, ...updates } : m
                                ),
                            };
                        });

                        return { conversations };
                    });
                },

                appendMessageContent: (conversationId: string, content: string, messageId?: string) => {
                    set((state) => {
                        const conversations = state.conversations.map((c) => {
                            if (c.id !== conversationId) return c;
                            const messages = [...c.messages];
                            if (messages.length === 0) return c;

                            let messageIndex = -1;
                            if (messageId) {
                                messageIndex = messages.findIndex(m => m.id === messageId);
                            } else {
                                messageIndex = messages.length - 1;
                            }

                            if (messageIndex === -1) return c;

                            const targetMessage = { ...messages[messageIndex] };
                            targetMessage.content += content;
                            messages[messageIndex] = targetMessage;

                            return { ...c, messages };
                        });

                        return { conversations };
                    });
                },

                createConversation: () => {
                    const id = crypto.randomUUID();
                    const newConv: Conversation = {
                        id,
                        title: 'New Chat...',
                        timestamp: Date.now(),
                        messages: [],
                        modelId: get().activeModelId,
                        mode: get().activeMode,
                    };
                    set((state) => ({
                        conversations: [newConv, ...state.conversations],
                        activeConversationId: id
                    }));
                    return id;
                },

                setActiveConversation: (id: string | null) => {
                    set({ activeConversationId: id });
                },
                setMode: (mode: 'agent') => set({ activeMode: mode }),
                setModel: (modelId: string) => {
                    set({ activeModelId: modelId });
                },

                clearConversation: (id: string) => set((state) => {
                    const conversations = state.conversations.map((c) =>
                        c.id === id ? { ...c, messages: [] } : c
                    );
                    
                    return { conversations };
                }),
                deleteConversation: (id: string) => set((state) => {
                    const conversations = state.conversations.filter((c) => c.id !== id);
                    const newActiveId = state.activeConversationId === id ? null : state.activeConversationId;
                    
                    return { 
                        conversations, 
                        activeConversationId: newActiveId
                    };
                }),

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
                        set((state) => {
                            const googleModels = state.availableModels.filter(m => m.provider === 'google');
                            const ollamaModels = state.availableModels.filter(m => m.provider === 'ollama');

                            const allModels = [...openaiModels, ...googleModels, ...ollamaModels];

                            let newActiveModelId = state.activeModelId;
                            if (!state.activeModelId) {
                                newActiveModelId = 'gpt-5-nano';
                            }

                            return {
                                availableModels: allModels,
                                activeModelId: newActiveModelId
                            };
                        });

                    } catch (error) {
                        // Failed to refresh OpenAI models
                    } finally {
                        set({ isLoadingModels: false });
                    }
                },

                forceRefreshOpenAIModels: async () => {
                    set({ isLoadingModels: true });
                    try {
                        set((state) => {
                            const googleModels = state.availableModels.filter(m => m.provider === 'google');
                            const ollamaModels = state.availableModels.filter(m => m.provider === 'ollama');

                            const allModels = [...openaiModels, ...googleModels, ...ollamaModels];

                            return {
                                availableModels: allModels,
                                activeModelId: state.activeModelId || 'gpt-5-nano'
                            };
                        });
                    } finally {
                        set({ isLoadingModels: false });
                    }
                },

                refreshGoogleModels: async () => {
                    // Static Google models for visual purposes
                    const googleModels: AIModel[] = [
                        { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'google', icon: GEMINI_ICON },
                        { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'google', icon: GEMINI_ICON },
                        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', icon: GEMINI_ICON },
                        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', icon: GEMINI_ICON }
                    ];

                    set((state) => {
                        const openaiModels = state.availableModels.filter(m => m.provider === 'chatgpt');
                        const ollamaModels = state.availableModels.filter(m => m.provider === 'ollama');

                        const allModels = [...openaiModels, ...googleModels, ...ollamaModels];

                        return {
                            availableModels: allModels
                        };
                    });
                },
            };
        },
        {
            name: 'storage-v13',
            version: 33,
            partialize: (state) => ({
                // Сохраняем разговоры и активный разговор
                conversations: state.conversations,
                activeConversationId: state.activeConversationId,

                // Сохраняем выбранную модель и режим
                activeModelId: state.activeModelId,
                activeMode: state.activeMode,

                // Сохраняем API ключи
                apiKeys: state.apiKeys,

                // Сохраняем состояние видимости ассистента
                isAssistantOpen: state.isAssistantOpen,
            }),
            migrate: (persistedState: any, version: number) => {
                if (version < 12) {
                    return {
                        conversations: [],
                        activeConversationId: null,
                        activeModelId: '',
                        activeMode: 'agent',
                        apiKeys: {
                            openai: '',
                            anthropic: '',
                            google: '',
                            xai: '',
                            zhipu: '',
                            yandex: '',
                            gigachat: '',
                            agentrouter: ''
                        },
                        availableModels: [],
                        ollamaLocalModels: [],
                        isAssistantOpen: false,
                        isLoadingModels: false,
                    };
                }
                return persistedState;
            },
        }
    )
)