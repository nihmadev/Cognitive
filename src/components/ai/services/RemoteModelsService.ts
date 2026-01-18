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
  
  async getAllModels(): Promise<RemoteModel[]> {
    return [];
  }

  async getModelsByProvider(_provider: string): Promise<RemoteModel[]> {
    return [];
  }

  clearCache(): void {
    
  }
}

export const remoteModelsService = new RemoteModelsService();
