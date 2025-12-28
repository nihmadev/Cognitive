import { AIService, ChatMessage } from './types';
import { listen } from '@tauri-apps/api/event';

/**
 * Configuration for provider-specific stream handling
 */
export interface StreamConfig {
  /** Event name to listen for (e.g., 'openai-stream', 'anthropic-stream') */
  eventName: string;
  /** Function to call the provider's streaming API */
  streamFn: (modelId: string, messages: any[]) => Promise<string>;
  /** Function to call the provider's completion API for title generation */
  completeFn: (modelId: string, messages: any[]) => Promise<string>;
  /** Optional message transformer for providers with different formats (e.g., Google) */
  transformMessages?: (messages: ChatMessage[]) => any[];
  /** Provider name for logging */
  providerName: string;
}

/**
 * Base class for AI services that handles common streaming logic.
 * Eliminates code duplication across OpenAI, Anthropic, Google, xAI, and Ollama services.
 */
export abstract class BaseAIService implements AIService {
  protected abstract getStreamConfig(): StreamConfig;

  /**
   * Optional model validation - override in subclasses if needed
   */
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
      // Validate model if needed
      if (!this.validateModel(modelId)) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      // Check if already aborted
      if (signal?.aborted) {
        return;
      }

      // Setup listener for streaming events
      unlisten = await listen<string>(config.eventName, (event) => {
        if (signal?.aborted) {
          if (unlisten) unlisten();
          return;
        }
        onStreamChunk(event.payload);
      });

      // Setup abort handler
      const abortHandler = () => {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }
      };
      signal?.addEventListener('abort', abortHandler);

      // Log model usage
      console.log(`${config.providerName} using model: ${modelId}`);

      // Transform messages if needed (e.g., for Google's format)
      const transformedMessages = config.transformMessages 
        ? config.transformMessages(messages)
        : messages;

      // Call provider's streaming API
      await config.streamFn(modelId, transformedMessages);

      // Cleanup abort handler
      signal?.removeEventListener('abort', abortHandler);
    } catch (error) {
      if (signal?.aborted) {
        return; // Silently return if aborted
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
      // Validate model if needed
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

      // Transform messages if needed
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
