export interface RemoteModel {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  context_window?: number;
  max_tokens?: number;
  provider: string;
}

class RemoteModelsService {
  // This service is deprecated - models are now statically defined in OpenAIModelsService
  async getAllModels(): Promise<RemoteModel[]> {
    return [];
  }

  async getModelsByProvider(_provider: string): Promise<RemoteModel[]> {
    return [];
  }

  clearCache(): void {
    // No-op - cache removed
  }
}

export const remoteModelsService = new RemoteModelsService();
