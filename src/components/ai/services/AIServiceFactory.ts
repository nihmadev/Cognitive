import { AIService } from './types';
import { OllamaService } from './OllamaService';
import { OpenAIService } from './OpenAIService';
import { AnthropicService } from './AnthropicService';
import { GoogleService } from './GoogleService';
import { xAIService } from './xAIService';
import { AgentRouterService } from './AgentRouterService';
import { FileAgentService } from './FileAgentService';

type ServiceConstructor = new () => AIService;

/**
 * Registry of AI service providers
 * To add a new provider, simply add it to this registry
 */
const serviceRegistry: Record<string, ServiceConstructor> = {
  ollama: OllamaService,
  openai: OpenAIService,
  chatgpt: OpenAIService, // ChatGPT uses the same OpenAI service
  anthropic: AnthropicService,
  google: GoogleService,
  xai: xAIService,
  agentrouter: AgentRouterService,
  fileagent: FileAgentService,
};

export class AIServiceFactory {
  private static serviceCache = new Map<string, AIService>();

  static createService(provider: string): AIService {
    // Check cache first
    const cached = this.serviceCache.get(provider);
    if (cached) {
      return cached;
    }

    const ServiceClass = serviceRegistry[provider];
    if (!ServiceClass) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const service = new ServiceClass();
    this.serviceCache.set(provider, service);
    return service;
  }

  /**
   * Register a new AI service provider
   */
  static registerProvider(name: string, serviceClass: ServiceConstructor): void {
    serviceRegistry[name] = serviceClass;
  }

  /**
   * Get all available providers
   */
  static getAvailableProviders(): string[] {
    return Object.keys(serviceRegistry);
  }

  /**
   * Clear the service cache (useful for testing or reconfiguration)
   */
  static clearCache(): void {
    this.serviceCache.clear();
  }
}
