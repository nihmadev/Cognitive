export interface GLMModel {
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

export class GLMModelsService {
  async fetchAvailableModels(_apiKey?: string): Promise<GLMModel[]> {
    return await this.getFallbackModels();
  }

  private async getFallbackModels(): Promise<GLMModel[]> {
    
    return [
      {
        id: 'GLM-4',
        name: 'GLM-4',
        description: 'General purpose GLM-4 model with balanced capabilities',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.0025, completion: 0.0075 }
      },
      {
        id: 'GLM-4V',
        name: 'GLM-4V',
        description: 'Multimodal GLM-4V model with vision capabilities',
        capabilities: ['text', 'vision', 'function-calling'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.003, completion: 0.009 }
      },
      {
        id: 'GLM-4V-9B',
        name: 'GLM-4V-9B',
        description: 'Efficient 9B parameter GLM-4V model with vision',
        capabilities: ['text', 'vision', 'function-calling'],
        context_window: 128000,
        max_tokens: 4096,
        pricing: { prompt: 0.001, completion: 0.003 }
      },
      {
        id: 'GLM-4-Air',
        name: 'GLM-4-Air',
        description: 'Lightweight GLM-4-Air model optimized for speed',
        capabilities: ['text', 'function-calling'],
        context_window: 128000,
        max_tokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 }
      },
      {
        id: 'GLM-4-9B',
        name: 'GLM-4-9B',
        description: 'Efficient 9B parameter GLM-4 model for general tasks',
        capabilities: ['text', 'function-calling'],
        context_window: 128000,
        max_tokens: 4096,
        pricing: { prompt: 0.0008, completion: 0.0024 }
      },
      {
        id: 'GLM-4-32B',
        name: 'GLM-4-32B',
        description: 'Powerful 32B parameter GLM-4 model for complex tasks',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.004, completion: 0.012 }
      },
      {
        id: 'GLM-4.5',
        name: 'GLM-4.5',
        description: 'Enhanced GLM-4.5 model with improved performance',
        capabilities: ['text', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.0035, completion: 0.0105 }
      },
      {
        id: 'GLM-4.6',
        name: 'GLM-4.6',
        description: 'Advanced GLM-4.6 model with superior capabilities',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.005, completion: 0.015 }
      },
      {
        id: 'GLM-4.6V',
        name: 'GLM-4.6V',
        description: 'Advanced multimodal GLM-4.6V model with enhanced vision',
        capabilities: ['text', 'vision', 'function-calling', 'code-generation'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.006, completion: 0.018 }
      },
      {
        id: 'GLM-4.7',
        name: 'GLM-4.7',
        description: 'Latest GLM-4.7 model with state-of-the-art performance',
        capabilities: ['text', 'function-calling', 'code-generation', 'analysis'],
        context_window: 128000,
        max_tokens: 8192,
        pricing: { prompt: 0.007, completion: 0.021 }
      }
    ];
  }

  
  async getModelDetails(_apiKey: string, modelId: string): Promise<GLMModel | null> {
    try {
      const models = await this.fetchAvailableModels();
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      return null;
    }
  }

  
  async getModelsByCapability(_apiKey: string, capability: string): Promise<GLMModel[]> {
    try {
      const models = await this.fetchAvailableModels();
      return models.filter(model => model.capabilities.includes(capability));
    } catch (error) {
      return [];
    }
  }

  
  getRecommendedModel(models: GLMModel[], useCase: 'coding' | 'analysis' | 'general' | 'vision' | 'cost-effective'): string {
    const availableModels = models.filter(model => 
      model.capabilities.includes('text')
    );

    if (availableModels.length === 0) {
      return models[0]?.id || 'GLM-4';
    }

    switch (useCase) {
      case 'coding':
        return availableModels.find(m => m.capabilities.includes('code-generation'))?.id ||
               availableModels.find(m => m.id.includes('32B') || m.id.includes('4.6') || m.id.includes('4.7'))?.id ||
               availableModels[0].id;
      
      case 'analysis':
        return availableModels.find(m => m.capabilities.includes('analysis'))?.id ||
               availableModels.find(m => m.id.includes('4.7') || m.id.includes('4.6'))?.id ||
               availableModels[0].id;
      
      case 'vision':
        return availableModels.find(m => m.capabilities.includes('vision'))?.id ||
               availableModels.find(m => m.id.includes('V'))?.id ||
               availableModels[0].id;
      
      case 'cost-effective':
        return availableModels.find(m => m.id.includes('Air') || m.id.includes('9B'))?.id ||
               availableModels[0].id;
      
      case 'general':
      default:
        return availableModels.find(m => m.id === 'GLM-4')?.id ||
               availableModels.find(m => m.id.includes('4.5'))?.id ||
               availableModels[0].id;
    }
  }

  
  clearCache(): void {
  }

  
  getCacheStatus(): { size: number; keys: string[] } {
    return { size: 0, keys: [] };
  }

  
  async refreshModels(_apiKey?: string): Promise<GLMModel[]> {
    return this.fetchAvailableModels();
  }

  
  getModelsByCategory(models: GLMModel[], category: 'reasoning' | 'multimodal' | 'cost-effective' | 'general'): GLMModel[] {
    switch (category) {
      case 'reasoning':
        return models.filter(m => m.id.includes('4.7') || m.id.includes('4.6') || m.id.includes('32B'));
      case 'multimodal':
        return models.filter(m => m.capabilities.includes('vision'));
      case 'cost-effective':
        return models.filter(m => m.id.includes('Air') || m.id.includes('9B'));
      case 'general':
      default:
        return models.filter(m => !m.id.includes('V'));
    }
  }

  
  getModelStats(models: GLMModel[]): {
    total: number;
    withVision: number;
    reasoning: number;
    costEffective: number;
  } {
    return {
      total: models.length,
      withVision: models.filter(m => m.capabilities.includes('vision')).length,
      reasoning: models.filter(m => m.id.includes('4.7') || m.id.includes('4.6') || m.id.includes('32B')).length,
      costEffective: models.filter(m => m.id.includes('Air') || m.id.includes('9B')).length
    };
  }
}


export const glmModelsService = new GLMModelsService();
