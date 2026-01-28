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

export const ai = {
    ollamaChat: (model: string, messages: any[], options?: any) =>
        invoke<any>('ollama_chat', { model, messages, options }),
    ollamaChatStream: (model: string, messages: any[], options?: any) =>
        invoke<string>('ollama_chat_stream', { model, messages, options }),
    ollamaChatComplete: (model: string, messages: any[], options?: any) =>
        invoke<string>('ollama_chat_complete', { model, messages, options }),
    ollamaListModels: () => invoke<any[]>('ollama_list_models'),
    ollamaPullModel: (model: string) => invoke<void>('ollama_pull_model', { model }),
    ollamaGenerate: (prompt: string, model: string) =>
        invoke<string>('ollama_generate', { prompt, model }),
    ollamaListLocalModels: () => invoke<any[]>('ollama_list_local_models'),

    agentrouterConfigure: (apiKey: string, baseUrl?: string) =>
        invoke<void>('agentrouter_configure', { apiKey, baseUrl }),
    agentrouterChatStream: (model: string, messages: AgentRouterMessage[]) =>
        invoke<string>('agentrouter_chat_stream', { model, messages }),
    agentrouterChatComplete: (model: string, messages: any[]) =>
        invoke<string>('agentrouter_chat_complete', { model, messages }),
    agentrouterCreateFile: (filePath: string, content?: string) =>
        invoke<string>('agentrouter_create_file', { filePath, content }),
    agentrouterListModels: () => invoke<AgentRouterModelsResponse>('agentrouter_list_models'),
    agentrouterGetSystemPrompt: (userQuery?: string) => 
        invoke<string>('agentrouter_get_system_prompt', { userQuery }),

    agentSetWorkspace: (workspace: string) => invoke<void>('agent_set_workspace', { workspace }),
    agentExecuteTool: (tool: string, args: any) => invoke<any>('agent_execute_tool', { tool, args }),
    agentGenerateSystemPrompt: (context: { user_os: string; user_query?: string; workspace?: string }) =>
        invoke<string>('agent_generate_system_prompt', { context }),

    setApiKey: (provider: string, key: string) =>
        invoke<void>('set_api_key', { provider, key }),
    getApiKeys: () => invoke<Record<string, boolean>>('get_api_keys'),
};
