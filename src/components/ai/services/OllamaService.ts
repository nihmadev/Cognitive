import { BaseAIService, StreamConfig } from './BaseAIService';
import { tauriApi } from '../../../lib/tauri-api';

export class OllamaService extends BaseAIService {
  protected getStreamConfig(): StreamConfig {
    return {
      eventName: 'ollama-stream',
      streamFn: (modelId, messages) => tauriApi.ollamaChatStream(modelId, messages),
      completeFn: (modelId, messages) => tauriApi.ollamaChatComplete(modelId, messages),
      providerName: 'Ollama',
    };
  }
}
