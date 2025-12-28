import { BaseAIService, StreamConfig } from './BaseAIService';
import { tauriApi } from '../../../lib/tauri-api';

export class AnthropicService extends BaseAIService {
  protected getStreamConfig(): StreamConfig {
    return {
      eventName: 'anthropic-stream',
      streamFn: (modelId, messages) => tauriApi.anthropicChatStream(modelId, messages),
      completeFn: (modelId, messages) => tauriApi.anthropicChatComplete(modelId, messages),
      providerName: 'Anthropic',
    };
  }
}
