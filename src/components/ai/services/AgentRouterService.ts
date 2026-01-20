import { AIService, ChatMessage } from './types';
import { tauriApi, AgentRouterTool } from '../../../lib/tauri-api';
import { listen } from '@tauri-apps/api/event';

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}


const AGENT_ROUTER_TOOLS: AgentRouterTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the entire content of a file. Use this to examine code, configuration files, or any text file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to read (relative to workspace root or absolute path)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search for text patterns across files in the project. Very fast, uses ripgrep. Use this to find where functions, variables, or patterns are used.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search pattern (required)'
          },
          path: {
            type: 'string',
            description: 'Directory to search (default: workspace root)'
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Case sensitive search (default: false)'
          },
          wholeWord: {
            type: 'boolean',
            description: 'Match whole words only (default: false)'
          },
          regex: {
            type: 'boolean',
            description: 'Treat query as regex (default: false)'
          },
          includePattern: {
            type: 'string',
            description: 'Glob pattern for files to include (e.g., "*.ts", "*.rs")'
          },
          excludePattern: {
            type: 'string',
            description: 'Glob pattern for files to exclude'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results to return (default: 100)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_by_name',
      description: 'Find files or directories by name pattern. Use this to locate specific files in the project.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'File name pattern with wildcards (e.g., "*.rs", "parser.*", "test_*.ts")'
          },
          path: {
            type: 'string',
            description: 'Directory to search (default: workspace root)'
          },
          type: {
            type: 'string',
            enum: ['file', 'dir', 'all'],
            description: 'Type of items to find (default: "all")'
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum directory depth (default: 10)'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results to return (default: 50)'
          }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List directory contents. Use this to explore the project structure and see what files and folders exist.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (required)'
          },
          recursive: {
            type: 'boolean',
            description: 'List recursively (default: false)'
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum depth for recursive listing (default: 3)'
          },
          showHidden: {
            type: 'boolean',
            description: 'Show hidden files (default: false)'
          }
        },
        required: ['path']
      }
    }
  }
];

export class AgentRouterService implements AIService {
  async sendChatRequest(
    modelId: string,
    messages: ChatMessage[],
    onStreamChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let unlistenStream: (() => void) | undefined;
    let unlistenToolCalls: (() => void) | undefined;
    
    try {
      
      if (signal?.aborted) {
        return;
      }

      
      
      const systemMessage = messages.find(m => m.role === 'system');
      const isAgentMode = systemMessage?.content.includes('autonomous coding agent') || 
                         systemMessage?.content.includes('You are an autonomous coding agent');
      const isResponderMode = systemMessage?.content.includes('concise coding assistant') ||
                             systemMessage?.content.includes('Do not use or mention tools');

      
      const shouldUseTools = isAgentMode && !isResponderMode;

      
      unlistenStream = await listen<string>('agentrouter-stream', (event) => {
        if (signal?.aborted) {
          if (unlistenStream) unlistenStream();
          if (unlistenToolCalls) unlistenToolCalls();
          return;
        }
        const chunk = event.payload;
        onStreamChunk(chunk);
      });

      
      if (shouldUseTools) {
        unlistenToolCalls = await listen<string>('agentrouter-tool-call', (event) => {
          if (signal?.aborted) {
            return;
          }
          try {
            const toolCall: ToolCall = JSON.parse(event.payload);
            
            const args = JSON.parse(toolCall.function.arguments);
            
            
            const toolCallJson = JSON.stringify({
              tool: toolCall.function.name,
              args: args
            });
            
            
            onStreamChunk(`\n${toolCallJson}\n`);
          } catch (error) {
          }
        });
      }

      
      const abortHandler = () => {
        if (unlistenStream) {
          unlistenStream();
          unlistenStream = undefined;
        }
        if (unlistenToolCalls) {
          unlistenToolCalls();
          unlistenToolCalls = undefined;
        }
      };
      signal?.addEventListener('abort', abortHandler);
      
      
      await tauriApi.agentrouterChatStream(
        modelId, 
        messages, 
        undefined, 
        undefined, 
        undefined, 
        shouldUseTools ? AGENT_ROUTER_TOOLS : undefined, 
        shouldUseTools ? 'auto' : undefined 
      );
      
      signal?.removeEventListener('abort', abortHandler);
      
    } catch (error) {
      if (signal?.aborted) return;
      onStreamChunk(`[Error: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      if (unlistenStream) unlistenStream();
      if (unlistenToolCalls) unlistenToolCalls();
    }
  }

  async generateTitle(
    modelId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    try {
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
      const words = userMessage.split(' ').slice(0, 4);
      const fallbackTitle = words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
      return fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
    }
  }

  async executeTool(toolName: string, parameters: any): Promise<string> {
    switch (toolName) {
      case 'create_file':
        return await this.createFile(parameters.file_path, parameters.content);
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
}
