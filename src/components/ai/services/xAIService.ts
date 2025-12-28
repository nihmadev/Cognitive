import { BaseAIService, StreamConfig } from './BaseAIService';
import { tauriApi } from '../../../lib/tauri-api';

export class xAIService extends BaseAIService {
  protected getStreamConfig(): StreamConfig {
    return {
      eventName: 'xai-stream',
      streamFn: (modelId, messages) => tauriApi.xaiChatStream(modelId, messages),
      completeFn: (modelId, messages) => tauriApi.xaiChatComplete(modelId, messages),
      providerName: 'xAI',
    };
  }
}
