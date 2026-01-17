export interface OpenAIModel {
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

export class OpenAIModelsService {
  async fetchAvailableModels(_apiKey?: string): Promise<OpenAIModel[]> {
    console.log('OpenAIModelsService: Returning predefined OpenAI models...');
    return await this.getFallbackModels();
  }

  private async getFallbackModels(): Promise<OpenAIModel[]> {
    // Return the specified OpenAI models
    return [
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        description: 'Latest GPT-5.2 model with advanced reasoning capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 200000,
        max_tokens: 32768,
        pricing: { prompt: 0.02, completion: 0.06 }
      },
      {
        id: 'gpt-5.2-chat-latest',
        name: 'GPT-5.2 Chat Latest',
        description: 'Latest GPT-5.2 chat model optimized for conversations',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 200000,
        max_tokens: 32768,
        pricing: { prompt: 0.02, completion: 0.06 }
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'Advanced GPT-5 model with enhanced capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 128000,
        max_tokens: 16384,
        pricing: { prompt: 0.015, completion: 0.045 }
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        description: 'Efficient GPT-5 mini model for everyday tasks',
        capabilities: ['text', 'function-calling'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.0005, completion: 0.001 }
      },
      {
        id: 'gpt-5-nano',
        name: 'GPT-5 Nano',
        description: 'Compact GPT-5 nano model for lightweight tasks',
        capabilities: ['text'],
        context_window: 64000,
        max_tokens: 4096,
        pricing: { prompt: 0.0001, completion: 0.0002 }
      },
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'Enhanced GPT-4.1 model with improved reasoning',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 16384,
        pricing: { prompt: 0.01, completion: 0.03 }
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        description: 'Efficient GPT-4.1 mini model',
        capabilities: ['text', 'function-calling'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.0003, completion: 0.0006 }
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        description: 'Compact GPT-4.1 nano model',
        capabilities: ['text'],
        context_window: 64000,
        max_tokens: 4096,
        pricing: { prompt: 0.0001, completion: 0.0002 }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Multimodal GPT-4o model with vision capabilities',
        capabilities: ['text', 'vision', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 16384,
        pricing: { prompt: 0.005, completion: 0.015 }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Efficient multimodal GPT-4o mini model',
        capabilities: ['text', 'vision', 'function-calling'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.00015, completion: 0.0006 }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High-performance GPT-4 Turbo model',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 16384,
        pricing: { prompt: 0.01, completion: 0.03 }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Original GPT-4 model with reliable performance',
        capabilities: ['text', 'function-calling'],
        context_window: 8192,
        max_tokens: 8192,
        pricing: { prompt: 0.03, completion: 0.06 }
      }
    ];
  }


  // Get model details by ID
  async getModelDetails(_apiKey: string, modelId: string): Promise<OpenAIModel | null> {
    try {
      const models = await this.fetchAvailableModels();
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      console.error(`Failed to get model details for ${modelId}:`, error);
      return null;
    }
  }

  // Get models by capability
  async getModelsByCapability(_apiKey: string, capability: string): Promise<OpenAIModel[]> {
    try {
      const models = await this.fetchAvailableModels();
      return models.filter(model => model.capabilities.includes(capability));
    } catch (error) {
      console.error(`Failed to get models by capability ${capability}:`, error);
      return [];
    }
  }

  // Get recommended model for specific use case
  getRecommendedModel(models: OpenAIModel[], useCase: 'coding' | 'analysis' | 'general' | 'vision' | 'cost-effective'): string {
    const availableModels = models.filter(model => 
      model.capabilities.includes(useCase === 'vision' ? 'vision' : 'text')
    );

    if (availableModels.length === 0) {
      return models[0]?.id || 'gpt-5-mini';
    }

    switch (useCase) {
      case 'coding':
        return availableModels.find(m => m.id.includes('Codex'))?.id || 
               availableModels.find(m => m.capabilities.includes('code-generation'))?.id ||
               availableModels[0].id;
      
      case 'analysis':
        return availableModels.find(m => m.id.includes('deep-research'))?.id ||
               availableModels.find(m => m.id.includes('gpt-5.2-pro'))?.id ||
               availableModels[0].id;
      
      case 'vision':
        return availableModels.find(m => m.capabilities.includes('vision'))?.id ||
               availableModels[0].id;
      
      case 'cost-effective':
        return availableModels.find(m => m.id.includes('nano'))?.id ||
               availableModels.find(m => m.id.includes('mini'))?.id ||
               availableModels[0].id;
      
      case 'general':
      default:
        return availableModels.find(m => m.id.includes('gpt-5-mini'))?.id ||
               availableModels[0].id;
    }
  }

  // Clear cache manually (no-op since we don't use cache anymore)
  clearCache(): void {
    console.log('OpenAIModelsService: Cache cleared (no-op)');
  }

  // Get cache status (no-op since we don't use cache anymore)
  getCacheStatus(): { size: number; keys: string[] } {
    return { size: 0, keys: [] };
  }

  // Force refresh models
  async refreshModels(_apiKey?: string): Promise<OpenAIModel[]> {
    return this.fetchAvailableModels();
  }

  // Get models by category
  getModelsByCategory(models: OpenAIModel[], category: 'reasoning' | 'multimodal' | 'cost-effective' | 'general'): OpenAIModel[] {
    switch (category) {
      case 'reasoning':
        return models.filter(m => m.id.includes('deep-research'));
      case 'multimodal':
        return models.filter(m => m.capabilities.includes('vision'));
      case 'cost-effective':
        return models.filter(m => m.id.includes('nano') || m.id.includes('mini'));
      case 'general':
      default:
        return models.filter(m => !m.id.includes('deep-research') && !m.id.includes('image'));
    }
  }

  // Get model statistics
  getModelStats(models: OpenAIModel[]): {
    total: number;
    withVision: number;
    reasoning: number;
    costEffective: number;
  } {
    return {
      total: models.length,
      withVision: models.filter(m => m.capabilities.includes('vision')).length,
      reasoning: models.filter(m => m.id.includes('deep-research')).length,
      costEffective: models.filter(m => m.id.includes('nano') || m.id.includes('mini')).length
    };
  }
}

// Export singleton instance
export const openAIModelsService = new OpenAIModelsService();
