import { BaseAIService, StreamConfig } from './BaseAIService';
import { ChatMessage } from './types';
import { tauriApi } from '../../../lib/tauri-api';

export class GoogleService extends BaseAIService {
  protected getStreamConfig(): StreamConfig {
    return {
      eventName: 'google-stream',
      streamFn: (modelId, messages) => tauriApi.googleChatStream(modelId, messages),
      completeFn: (modelId, messages) => tauriApi.googleChatComplete(modelId, messages),
      providerName: 'Google',
      transformMessages: this.transformToGoogleFormat,
    };
  }

  /**
   * Transform standard ChatMessage format to Google's format with parts
   */
  private transformToGoogleFormat(messages: ChatMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini doesn't support system messages
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));
  }
}
