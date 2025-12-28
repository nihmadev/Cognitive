import { AIService, ChatMessage } from './types';
import { tauriApi } from '../../../lib/tauri-api';
import { listen } from '@tauri-apps/api/event';

export interface FileAgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

export class FileAgentService implements AIService {
  private isChatGPTModel(modelId: string): boolean {
    // All models are now dynamic, so we check if it's an OpenAI-style model
    return modelId.includes('gpt') || modelId.includes('chat');
  }

  private tools: FileAgentTool[] = [
    {
      name: 'create_file',
      description: 'Create a new file with optional content',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path where the file should be created'
          },
          content: {
            type: 'string',
            description: 'Optional content to write to the file'
          }
        },
        required: ['file_path']
      }
    },
    {
      name: 'create_folder',
      description: 'Create a new folder/directory',
      parameters: {
        type: 'object',
        properties: {
          folder_path: {
            type: 'string',
            description: 'The path where the folder should be created'
          }
        },
        required: ['folder_path']
      }
    },
    {
      name: 'write_file',
      description: 'Write content to a file (creates if doesn\'t exist)',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path to the file'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['file_path', 'content']
      }
    }
  ];

  async sendChatRequest(
    modelId: string,
    messages: ChatMessage[],
    onStreamChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let unlisten: (() => void) | undefined;
    
    try {
      // Check if already aborted
      if (signal?.aborted) {
        return;
      }

      // Check if using ChatGPT model
      if (this.isChatGPTModel(modelId)) {
        console.log(`FileAgentService using ChatGPT model: ${modelId}`);
        // For ChatGPT models, we can use OpenAI service with tools
        unlisten = await listen<string>('openai-stream', (event) => {
          if (signal?.aborted) {
            if (unlisten) unlisten();
            return;
          }
          onStreamChunk(event.payload);
        });

        // Setup abort handler
        const abortHandler = () => {
          if (unlisten) {
            unlisten();
            unlisten = undefined;
          }
        };
        signal?.addEventListener('abort', abortHandler);
        
        // Convert tools to OpenAI format
        const openAITools = this.tools.map(tool => ({
          type: "function" as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        }));
        
        await tauriApi.openaiChatStreamWithTools(modelId, messages, openAITools);
        signal?.removeEventListener('abort', abortHandler);
        return;
      }

      // Setup listener for streaming events (AgentRouter fallback)
      unlisten = await listen<string>('agentrouter-stream', (event) => {
        if (signal?.aborted) {
          if (unlisten) unlisten();
          return;
        }
        onStreamChunk(event.payload);
      });

      // Setup abort handler
      const abortHandler = () => {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }
      };
      signal?.addEventListener('abort', abortHandler);
      
      // Convert tools to AgentRouter format
      const agentRouterTools = this.tools.map(tool => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      
      // Call AgentRouter API with tools - fix toolChoice parameter
      await tauriApi.agentrouterChatStream(
        modelId, 
        messages, 
        undefined, 
        undefined, 
        undefined, 
        agentRouterTools, 
        { type: "auto", function: { name: "create_file" } }
      );
      
      signal?.removeEventListener('abort', abortHandler);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('FileAgentService API error:', error);
      onStreamChunk(`[Error: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      if (unlisten) unlisten();
    }
  }

  async generateTitle(
    modelId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    try {
      // Check if using ChatGPT model
      if (this.isChatGPTModel(modelId)) {
        console.log(`FileAgentService generating title with ChatGPT model: ${modelId}`);
        
        const titlePrompt = `Generate a concise, descriptive title (max 5 words) for this conversation:

User: ${userMessage}
Assistant: ${assistantResponse}

The title should:
- Be short and catchy
- Reflect the main topic
- Be in the same language as the user's message
- Not include quotes or special characters

Title:`;

        const messages = [
          { role: 'user', content: titlePrompt }
        ];

        const response = await tauriApi.openaiChatComplete(modelId, messages);
        return response.trim().replace(/^["']|["']$/g, '').slice(0, 50);
      }

      // Fallback to AgentRouter
      const titlePrompt = `Generate a concise, descriptive title (max 5 words) for this conversation:

User: ${userMessage}
Assistant: ${assistantResponse}

The title should:
- Be short and catchy
- Reflect the main topic
- Be in the same language as the user's message
- Not include quotes or special characters

Title:`;

      const messages = [
        { role: 'user', content: titlePrompt }
      ];

      const response = await tauriApi.agentrouterChatComplete(modelId, messages);
      return response.trim().replace(/^"'|"'$/g, '').slice(0, 50);
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback to a more meaningful title based on user message
      const words = userMessage.split(' ').slice(0, 4);
      const fallbackTitle = words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
      return fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
    }
  }

  async executeTool(toolName: string, parameters: any): Promise<string> {
    switch (toolName) {
      case 'create_file':
        return await this.createFile(parameters.file_path, parameters.content);
      case 'create_folder':
        return await this.createFolder(parameters.folder_path);
      case 'write_file':
        return await this.writeFile(parameters.file_path, parameters.content);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async createFile(filePath: string, content?: string): Promise<string> {
    try {
      const result = await tauriApi.agentrouterCreateFile(filePath, content);
      return result;
    } catch (error) {
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createFolder(folderPath: string): Promise<string> {
    try {
      await tauriApi.createFolder(folderPath);
      return `Folder created successfully: ${folderPath}`;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<string> {
    try {
      await tauriApi.writeFile(filePath, content);
      return `File written successfully: ${filePath}`;
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getAvailableTools(): FileAgentTool[] {
    return this.tools;
  }
}