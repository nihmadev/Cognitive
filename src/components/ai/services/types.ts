export interface AIService {
  sendChatRequest(
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    onStreamChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void>;
  generateTitle(
    modelId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<string>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}
