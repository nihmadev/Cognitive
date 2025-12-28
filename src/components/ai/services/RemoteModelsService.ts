export interface RemoteModel {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  context_window?: number;
  max_tokens?: number;
  provider: string;
}

export interface RemoteModelsResponse {
  models: {
    openai: RemoteModel[];
    xai: RemoteModel[];
    anthropic: RemoteModel[];
    google: RemoteModel[];
  };
  total: number;
  timestamp: string;
}

class RemoteModelsService {
  private baseUrl: string;
  private cache: { data: RemoteModelsResponse | null; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = 'https://proxy-production-3918.up.railway.app') {
    this.baseUrl = baseUrl;
  }

  async fetchModels(): Promise<RemoteModelsResponse> {
    // Check cache first
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
      return this.cache.data!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RemoteModelsResponse = await response.json();
      
      // Update cache
      this.cache = {
        data,
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Failed to fetch models from remote server:', error);
      throw error;
    }
  }

  async getModelsByProvider(provider: string): Promise<RemoteModel[]> {
    const data = await this.fetchModels();
    return data.models[provider as keyof typeof data.models] || [];
  }

  async getAllModels(): Promise<RemoteModel[]> {
    const data = await this.fetchModels();
    return Object.values(data.models).flat();
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const remoteModelsService = new RemoteModelsService();
