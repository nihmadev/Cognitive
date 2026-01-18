import { AIService, ChatMessage } from './types';
import { listen } from '@tauri-apps/api/event';


export interface StreamConfig {
  
  eventName: string;
  
  streamFn: (modelId: string, messages: any[]) => Promise<string>;
  
  completeFn: (modelId: string, messages: any[]) => Promise<string>;
  
  transformMessages?: (messages: ChatMessage[]) => any[];
  
  providerName: string;
}


export abstract class BaseAIService implements AIService {
  protected abstract getStreamConfig(): StreamConfig;

  
  protected validateModel(modelId: string): boolean {
    return Boolean(modelId && modelId.trim().length > 0);
  }

  async sendChatRequest(
    modelId: string,
    messages: ChatMessage[],
    onStreamChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const config = this.getStreamConfig();
    let unlisten: (() => void) | undefined;

    try {
      
      if (!this.validateModel(modelId)) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      
      if (signal?.aborted) {
        return;
      }

      
      unlisten = await listen<string>(config.eventName, (event) => {
        if (signal?.aborted) {
          if (unlisten) unlisten();
          return;
        }
        onStreamChunk(event.payload);
      });

      
      const abortHandler = () => {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }
      };
      signal?.addEventListener('abort', abortHandler);

      
      console.log(`${config.providerName} using model: ${modelId}`);

      
      const transformedMessages = config.transformMessages 
        ? config.transformMessages(messages)
        : messages;

      
      await config.streamFn(modelId, transformedMessages);

      
      signal?.removeEventListener('abort', abortHandler);
    } catch (error) {
      if (signal?.aborted) {
        return; 
      }
      console.error(`${config.providerName} API error:`, error);
      onStreamChunk(`[Error: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      if (unlisten) unlisten();
    }
  }

  async generateTitle(
    modelId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    const config = this.getStreamConfig();

    try {
      
      if (!this.validateModel(modelId)) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      const titlePrompt = `Generate a concise, descriptive title (max 5 words) for this conversation:

User: ${userMessage}
Assistant: ${assistantResponse}

The title should:
- Be short and catchy
- Reflect the main topic
- Be in the same language as the user's message
- Not include quotes or special characters

Title:`;

      const messages: ChatMessage[] = [
        { role: 'user', content: titlePrompt }
      ];

      
      const transformedMessages = config.transformMessages 
        ? config.transformMessages(messages)
        : messages;

      const response = await config.completeFn(modelId, transformedMessages);
      return response.trim().replace(/^["']|["']$/g, '').slice(0, 50);
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback to a more meaningful title based on user message
      return this.generateFallbackTitle(userMessage);
    }
  }

  /**
   * Generate a fallback title from the user message
   */
  protected generateFallbackTitle(userMessage: string): string {
    const words = userMessage.split(' ').slice(0, 4);
    const fallbackTitle = words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
    return fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
  }
}
