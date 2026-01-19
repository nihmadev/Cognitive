import { invoke } from '@tauri-apps/api/core';

export type GoogleMessage = {
    role: string;
    parts: { text: string }[];
};

export type AgentRouterMessage = {
    role: string;
    content: string;
    name?: string;
};

export type AgentRouterChatRequest = {
    model: string;
    messages: AgentRouterMessage[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop?: string | string[];
    tools?: AgentRouterTool[];
    tool_choice?: AgentRouterToolChoice;
    response_format?: AgentRouterResponseFormat;
};

export type AgentRouterTool = {
    type: string;
    function: AgentRouterFunction;
};

export type AgentRouterFunction = {
    name: string;
    description?: string;
    parameters: any;
};

export type AgentRouterToolChoice = string | {
    type: string;
    function: { name: string };
};

export type AgentRouterResponseFormat = {
    type: string;
};

export type AgentRouterChatResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: AgentRouterChoice[];
    usage: AgentRouterUsage;
};

export type AgentRouterChoice = {
    index: number;
    message: AgentRouterMessage;
    finish_reason?: string;
};

export type AgentRouterUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
};

export type AgentRouterModel = {
    id: string;
    object: string;
    created: number;
    owned_by: string;
};

export type AgentRouterModelsResponse = {
    object: string;
    data: AgentRouterModel[];
};

export const ollamaChat = (model: string, messages: any[], options?: any) =>
    invoke<any>('ollama_chat', { model, messages, options });
export const ollamaChatStream = (model: string, messages: any[], options?: any) =>
    invoke<string>('ollama_chat_stream', { model, messages, options });
export const ollamaChatComplete = (model: string, messages: any[], options?: any) =>
    invoke<string>('ollama_chat_complete', { model, messages, options });
export const ollamaListModels = () => invoke<any[]>('ollama_list_models');
export const ollamaPullModel = (model: string) => invoke<void>('ollama_pull_model', { model });
export const ollamaGenerate = (prompt: string, model: string) =>
    invoke<string>('ollama_generate', { prompt, model });
export const ollamaListLocalModels = () => invoke<any[]>('ollama_list_local_models');

export const agentrouterConfigure = (apiKey: string, baseUrl?: string) =>
    invoke<void>('agentrouter_configure', { apiKey, baseUrl });
export const agentrouterChat = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number, topP?: number) =>
    invoke<AgentRouterChatResponse>('agentrouter_chat', { model, messages, maxTokens, temperature, topP });
export const agentrouterChatStream = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number, topP?: number, tools?: AgentRouterTool[], toolChoice?: AgentRouterToolChoice) =>
    invoke<string>('agentrouter_chat_stream', { model, messages, maxTokens, temperature, topP, tools, toolChoice });
export const agentrouterChatComplete = (model: string, messages: any[], maxTokens?: number) =>
    invoke<string>('agentrouter_chat_complete', { model, messages, maxTokens });
export const agentrouterCreateFile = (filePath: string, content?: string) =>
    invoke<string>('agentrouter_create_file', { filePath, content });
export const agentrouterListModels = () => invoke<AgentRouterModelsResponse>('agentrouter_list_models');

export const openaiChat = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('openai_chat', { model, messages, maxTokens, temperature });
export const openaiChatStream = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('openai_chat_stream', { model, messages, maxTokens, temperature });
export const openaiChatStreamWithTools = (model: string, messages: AgentRouterMessage[], tools?: any[], toolChoice?: any, maxTokens?: number, temperature?: number) =>
    invoke<string>('openai_chat_stream_with_tools', { model, messages, tools, toolChoice, maxTokens, temperature });
export const openaiChatComplete = (model: string, messages: any[], maxTokens?: number) =>
    invoke<string>('openai_chat_complete', { model, messages, maxTokens });

export const anthropicChat = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('anthropic_chat', { model, messages, maxTokens, temperature });
export const anthropicChatStream = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('anthropic_chat_stream', { model, messages, maxTokens, temperature });
export const anthropicChatComplete = (model: string, messages: any[], maxTokens?: number) =>
    invoke<string>('anthropic_chat_complete', { model, messages, maxTokens });

export const googleChat = (model: string, messages: GoogleMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('google_chat', { model, messages, maxTokens, temperature });
export const googleChatStream = (model: string, messages: GoogleMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('google_chat_stream', { model, messages, maxTokens, temperature });
export const googleChatComplete = (model: string, messages: GoogleMessage[], maxTokens?: number) =>
    invoke<string>('google_chat_complete', { model, messages, maxTokens });

export const xaiChat = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('xai_chat', { model, messages, maxTokens, temperature });
export const xaiChatStream = (model: string, messages: AgentRouterMessage[], maxTokens?: number, temperature?: number) =>
    invoke<string>('xai_chat_stream', { model, messages, maxTokens, temperature });
export const xaiChatComplete = (model: string, messages: any[], maxTokens?: number) =>
    invoke<string>('xai_chat_complete', { model, messages, maxTokens });

export const setApiKey = (provider: string, key: string) =>
    invoke<void>('set_api_key', { provider, key });
export const getApiKeys = () => invoke<Record<string, boolean>>('get_api_keys');
