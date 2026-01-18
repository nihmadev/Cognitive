export interface AnthropicModel {
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

export class AnthropicModelsService {
  async fetchAvailableModels(_apiKey?: string): Promise<AnthropicModel[]> {
    console.log('AnthropicModelsService: Returning predefined Claude models...');
    return await this.getFallbackModels();
  }

  private async getFallbackModels(): Promise<AnthropicModel[]> {
    
    return [
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient Claude 3 Haiku model for quick responses',
        capabilities: ['text', 'function-calling'],
        context_window: 200000,
        max_tokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00125 }
      },
      {
        id: 'claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced Claude 3.5 Sonnet model with improved capabilities',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 200000,
        max_tokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 }
      },
      {
        id: 'claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet',
        description: 'Advanced Claude 3.7 Sonnet model with enhanced reasoning',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 8192,
        pricing: { prompt: 0.006, completion: 0.03 }
      },
      {
        id: 'claude-4-haiku',
        name: 'Claude 4 Haiku',
        description: 'Latest Claude 4 Haiku model with improved speed and efficiency',
        capabilities: ['text', 'function-calling'],
        context_window: 200000,
        max_tokens: 4096,
        pricing: { prompt: 0.00015, completion: 0.00075 }
      },
      {
        id: 'claude-4-sonnet',
        name: 'Claude 4 Sonnet',
        description: 'Advanced Claude 4 Sonnet model with superior performance',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 8192,
        pricing: { prompt: 0.0075, completion: 0.0375 }
      },
      {
        id: 'claude-4.5-sonnet',
        name: 'Claude 4.5 Sonnet',
        description: 'Enhanced Claude 4.5 Sonnet model with optimized capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 8192,
        pricing: { prompt: 0.009, completion: 0.045 }
      },
      {
        id: 'claude-4-opus',
        name: 'Claude 4 Opus',
        description: 'Most powerful Claude 4 Opus model for complex tasks',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 8192,
        pricing: { prompt: 0.015, completion: 0.075 }
      },
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: 'Latest Claude Opus 4.5 model with state-of-the-art capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 8192,
        pricing: { prompt: 0.018, completion: 0.09 }
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        description: 'Latest Claude Haiku 4.5 model with optimized performance',
        capabilities: ['text', 'function-calling'],
        context_window: 200000,
        max_tokens: 4096,
        pricing: { prompt: 0.00012, completion: 0.0006 }
      }
    ];
  }

  
  async getModelDetails(_apiKey: string, modelId: string): Promise<AnthropicModel | null> {
    try {
      const models = await this.fetchAvailableModels();
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      console.error(`Failed to get model details for ${modelId}:`, error);
      return null;
    }
  }

  
  async getModelsByCapability(_apiKey: string, capability: string): Promise<AnthropicModel[]> {
    try {
      const models = await this.fetchAvailableModels();
      return models.filter(model => model.capabilities.includes(capability));
    } catch (error) {
      console.error(`Failed to get models by capability ${capability}:`, error);
      return [];
    }
  }

  
  getRecommendedModel(models: AnthropicModel[], useCase: 'coding' | 'analysis' | 'general' | 'cost-effective'): string {
    const availableModels = models.filter(model => 
      model.capabilities.includes('text')
    );

    if (availableModels.length === 0) {
      return models[0]?.id || 'claude-3.5-sonnet';
    }

    switch (useCase) {
      case 'coding':
        return availableModels.find(m => m.capabilities.includes('code-generation'))?.id ||
               availableModels.find(m => m.id.includes('opus'))?.id ||
               availableModels.find(m => m.id.includes('4'))?.id ||
               availableModels[0].id;
      
      case 'analysis':
        return availableModels.find(m => m.id.includes('opus'))?.id ||
               availableModels.find(m => m.id.includes('4.5'))?.id ||
               availableModels.find(m => m.id.includes('4'))?.id ||
               availableModels[0].id;
      
      case 'cost-effective':
        return availableModels.find(m => m.id.includes('haiku'))?.id ||
               availableModels[0].id;
      
      case 'general':
      default:
        return availableModels.find(m => m.id.includes('3.5-sonnet'))?.id ||
               availableModels.find(m => m.id.includes('sonnet'))?.id ||
               availableModels[0].id;
    }
  }

  
  clearCache(): void {
    console.log('AnthropicModelsService: Cache cleared (no-op)');
  }

  
  getCacheStatus(): { size: number; keys: string[] } {
    return { size: 0, keys: [] };
  }

  
  async refreshModels(_apiKey?: string): Promise<AnthropicModel[]> {
    return this.fetchAvailableModels();
  }

  
  getModelsByCategory(models: AnthropicModel[], category: 'reasoning' | 'multimodal' | 'cost-effective' | 'general'): AnthropicModel[] {
    switch (category) {
      case 'reasoning':
        return models.filter(m => m.id.includes('opus') || m.id.includes('4.5') || m.id.includes('3.7'));
      case 'multimodal':
        return models.filter(m => m.capabilities.includes('vision'));
      case 'cost-effective':
        return models.filter(m => m.id.includes('haiku'));
      case 'general':
      default:
        return models.filter(m => m.id.includes('sonnet'));
    }
  }

  
  getModelStats(models: AnthropicModel[]): {
    total: number;
    withVision: number;
    reasoning: number;
    costEffective: number;
  } {
    return {
      total: models.length,
      withVision: models.filter(m => m.capabilities.includes('vision')).length,
      reasoning: models.filter(m => m.id.includes('opus') || m.id.includes('4.5') || m.id.includes('3.7')).length,
      costEffective: models.filter(m => m.id.includes('haiku')).length
    };
  }
}


export const anthropicModelsService = new AnthropicModelsService();
