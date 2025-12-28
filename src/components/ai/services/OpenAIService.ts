import { BaseAIService, StreamConfig } from './BaseAIService';
import { tauriApi } from '../../../lib/tauri-api';

export class OpenAIService extends BaseAIService {
  protected getStreamConfig(): StreamConfig {
    return {
      eventName: 'openai-stream',
      streamFn: (modelId, messages) => tauriApi.openaiChatStream(modelId, messages),
      completeFn: (modelId, messages) => tauriApi.openaiChatComplete(modelId, messages),
      providerName: 'OpenAI',
    };
  }

  /**
   * Get model details dynamically
   */
  async getModelDetails(apiKey: string, modelId: string) {
    try {
      const { openAIModelsService } = await import('./OpenAIModelsService');
      return await openAIModelsService.getModelDetails(apiKey, modelId);
    } catch (error) {
      console.error(`Failed to get model details for ${modelId}:`, error);
      return null;
    }
  }
}
