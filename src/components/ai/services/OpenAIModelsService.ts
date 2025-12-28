import { invoke } from '@tauri-apps/api/core';

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
  private cache: Map<string, { models: OpenAIModel[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchAvailableModels(apiKey?: string): Promise<OpenAIModel[]> {
    try {
      console.log('OpenAIModelsService: Fetching models from OpenAI API via backend...');
      
      // Check cache first
      const cacheKey = apiKey || 'public';
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('OpenAIModelsService: Using cached models:', cached.models.length);
        return cached.models;
      }
      
      // Use Tauri backend to avoid CORS issues
      const models = await invoke<any[]>('openai_list_models');
      console.log('OpenAIModelsService: Received models from backend:', models.length);
      
      // Filter for GPT models and transform to our format
      const chatModels = models
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => this.transformModelData(model));
      
      console.log('OpenAIModelsService: Filtered GPT models:', chatModels.length);
      console.log('OpenAIModelsService: Chat model IDs:', chatModels.map((m: OpenAIModel) => m.id));

      // Cache the results
      this.cache.set(cacheKey, {
        models: chatModels,
        timestamp: Date.now()
      });

      return chatModels;
    } catch (error: any) {
      console.error('OpenAIModelsService: Failed to fetch OpenAI models:', error);
      console.error('OpenAIModelsService: Error details:', {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
        apiKeyProvided: !!apiKey,
        errorString: JSON.stringify(error, null, 2)
      });
      
      // Return fallback models if API fails
      console.log('OpenAIModelsService: Returning fallback models');
      return await this.getFallbackModels();
    }
  }

  private async getFallbackModels(): Promise<OpenAIModel[]> {
    try {
      // Try to get models from remote service first
      const { remoteModelsService } = await import('./RemoteModelsService');
      const remoteModels = await remoteModelsService.getModelsByProvider('openai');
      
      // Transform remote models to OpenAIModel format
      return remoteModels.map(model => ({
        id: model.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'openai',
        name: model.name,
        description: model.description || '',
        capabilities: model.capabilities || [],
        context_window: model.context_window || 128000,
        max_tokens: model.max_tokens || 4096,
        pricing: { prompt: 0.01, completion: 0.03 } // Default pricing
      }));
    } catch (error) {
      console.error('Failed to fetch models from remote service, using minimal fallback:', error);
      // Minimal fallback - just basic model info
      return [
        {
          id: 'gpt-5-mini',
          name: 'GPT-5 Mini',
          description: 'Balanced GPT-5 model for everyday tasks',
          capabilities: ['text', 'function-calling', 'code-generation'],
          context_window: 128000,
          max_tokens: 8192,
          pricing: { prompt: 0.0005, completion: 0.001 }
        }
      ];
    }
  }

  private transformModelData(model: any): OpenAIModel {
    // Extract model family and capabilities from ID
    const capabilities = this.extractCapabilities(model.id);
    const description = this.generateDescription();
    const pricing = this.getPricing(model.id);
    
    return {
      id: model.id,
      name: this.formatModelName(model.id),
      description,
      capabilities,
      context_window: this.getContextWindow(),
      max_tokens: this.getMaxTokens(model.id),
      pricing
    };
  }

  private getPricing(modelId: string): { prompt: number; completion: number } | undefined {
    // Use simplified pricing - remote service should provide this data
    if (modelId.includes('nano')) return { prompt: 0.0001, completion: 0.0002 };
    if (modelId.includes('mini')) return { prompt: 0.0005, completion: 0.001 };
    if (modelId.includes('pro') || modelId.includes('deep-research')) return { prompt: 0.02, completion: 0.06 };
    if (modelId.includes('image')) return { prompt: 0.025, completion: 0.05 };
    return { prompt: 0.01, completion: 0.03 }; // Standard pricing
  }

  private extractCapabilities(modelId: string): string[] {
    const capabilities = ['text']; // All models support text
    
    // Add specific capabilities based on model type
    if (modelId.includes('Codex')) {
      capabilities.push('code-generation', 'function-calling');
    }
    
    if (modelId.includes('image')) {
      capabilities.push('vision');
    }
    
    if (modelId.includes('realtime')) {
      capabilities.push('realtime', 'function-calling');
    }
    
    if (modelId.includes('deep-research') || modelId.includes('gpt-5') || modelId.includes('gpt-4.1')) {
      capabilities.push('analysis', 'function-calling');
      if (!modelId.includes('nano') && !modelId.includes('mini')) {
        capabilities.push('code-generation');
      }
    }
    
    return capabilities;
  }

  private formatModelName(modelId: string): string {
    return modelId
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private generateDescription(): string {
    // Use remote service data for descriptions when available
    // This is a simplified fallback
    return 'General purpose language model';
  }

  private getContextWindow(): number {
    // Use standard context window - remote service should provide this data
    return 128000; // Standard for modern models
  }

  private getMaxTokens(modelId: string): number {
    // Use standard max tokens - remote service should provide this data
    if (modelId.includes('nano')) return 4096;
    if (modelId.includes('mini')) return 8192;
    if (modelId.includes('pro') || modelId.includes('deep-research')) return 32768;
    return 16384; // Standard for most models
  }

  // Get model details by ID
  async getModelDetails(apiKey: string, modelId: string): Promise<OpenAIModel | null> {
    try {
      const models = await this.fetchAvailableModels(apiKey);
      return models.find(model => model.id === modelId) || null;
    } catch (error) {
      console.error(`Failed to get model details for ${modelId}:`, error);
      return null;
    }
  }

  // Get models by capability
  async getModelsByCapability(apiKey: string, capability: string): Promise<OpenAIModel[]> {
    try {
      const models = await this.fetchAvailableModels(apiKey);
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

  // Clear cache manually
  clearCache(): void {
    this.cache.clear();
    console.log('OpenAIModelsService: Cache cleared');
  }

  // Get cache status
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Force refresh models
  async refreshModels(apiKey?: string): Promise<OpenAIModel[]> {
    // Clear cache for this API key
    const cacheKey = apiKey || 'public';
    this.cache.delete(cacheKey);
    
    // Fetch fresh models
    return this.fetchAvailableModels(apiKey);
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
