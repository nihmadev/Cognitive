export interface GoogleModel {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  max_tokens?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
  capabilities: string[];
}

export class GoogleModelsService {
  async fetchAvailableModels(_apiKey?: string): Promise<GoogleModel[]> {
    console.log('GoogleModelsService: Returning predefined Gemini models...');
    return await this.getFallbackModels();
  }

  private async getFallbackModels(): Promise<GoogleModel[]> {
    
    return [
      {
        id: 'gemini-3.0-pro',
        name: 'Gemini 3.0 Pro',
        description: 'Latest Gemini 3.0 Pro model with advanced reasoning capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 2000000,
        max_tokens: 8192,
        pricing: { prompt: 0.0125, completion: 0.0375 }
      },
      {
        id: 'gemini-3.0-flash',
        name: 'Gemini 3.0 Flash',
        description: 'Fast Gemini 3.0 Flash model for quick responses',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 1000000,
        max_tokens: 8192,
        pricing: { prompt: 0.000075, completion: 0.0003 }
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Enhanced Gemini 2.5 Pro model with improved performance',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 2000000,
        max_tokens: 8192,
        pricing: { prompt: 0.00625, completion: 0.01875 }
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Efficient Gemini 2.5 Flash model for everyday tasks',
        capabilities: ['text', 'function-calling'],
        context_window: 1000000,
        max_tokens: 8192,
        pricing: { prompt: 0.0000375, completion: 0.00015 }
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Fast Gemini 2.0 Flash model optimized for speed',
        capabilities: ['text', 'function-calling'],
        context_window: 1000000,
        max_tokens: 8192,
        pricing: { prompt: 0.000025, completion: 0.0001 }
      }
    ];
  }

  
  async getModelDetails(_apiKey: string, modelId: string): Promise<GoogleModel | null> {
    try {
      const models = await this.fetchAvailableModels();
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      console.error(`Failed to get model details for ${modelId}:`, error);
      return null;
    }
  }

  
  async getModelsByCapability(_apiKey: string, capability: string): Promise<GoogleModel[]> {
    try {
      const models = await this.fetchAvailableModels();
      return models.filter(model => model.capabilities.includes(capability));
    } catch (error) {
      console.error(`Failed to get models by capability ${capability}:`, error);
      return [];
    }
  }

  
  getRecommendedModel(models: GoogleModel[], useCase: 'coding' | 'analysis' | 'general' | 'cost-effective'): string {
    const availableModels = models.filter(model => 
      model.capabilities.includes('text')
    );

    if (availableModels.length === 0) {
      return models[0]?.id || 'gemini-2.5-flash';
    }

    switch (useCase) {
      case 'coding':
        return availableModels.find(m => m.capabilities.includes('code-generation'))?.id ||
               availableModels.find(m => m.id.includes('pro'))?.id ||
               availableModels[0].id;
      
      case 'analysis':
        return availableModels.find(m => m.id.includes('3.0-pro'))?.id ||
               availableModels.find(m => m.id.includes('pro'))?.id ||
               availableModels[0].id;
      
      case 'cost-effective':
        return availableModels.find(m => m.id.includes('flash'))?.id ||
               availableModels[0].id;
      
      case 'general':
      default:
        return availableModels.find(m => m.id.includes('2.5-flash'))?.id ||
               availableModels[0].id;
    }
  }

  
  clearCache(): void {
    console.log('GoogleModelsService: Cache cleared (no-op)');
  }

  
  getCacheStatus(): { size: number; keys: string[] } {
    return { size: 0, keys: [] };
  }

  
  async refreshModels(_apiKey?: string): Promise<GoogleModel[]> {
    return this.fetchAvailableModels();
  }

  
  getModelsByCategory(models: GoogleModel[], category: 'reasoning' | 'multimodal' | 'cost-effective' | 'general'): GoogleModel[] {
    switch (category) {
      case 'reasoning':
        return models.filter(m => m.id.includes('pro') || m.id.includes('3.0'));
      case 'multimodal':
        return models.filter(m => m.capabilities.includes('vision'));
      case 'cost-effective':
        return models.filter(m => m.id.includes('flash'));
      case 'general':
      default:
        return models;
    }
  }

  
  getModelStats(models: GoogleModel[]): {
    total: number;
    withVision: number;
    reasoning: number;
    costEffective: number;
  } {
    return {
      total: models.length,
      withVision: models.filter(m => m.capabilities.includes('vision')).length,
      reasoning: models.filter(m => m.id.includes('pro') || m.id.includes('3.0')).length,
      costEffective: models.filter(m => m.id.includes('flash')).length
    };
  }
}


export const googleModelsService = new GoogleModelsService();
