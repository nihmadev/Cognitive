import { AIServiceFactory } from './AIServiceFactory';
import { ChatMessage, AIModel } from './types';
import { generateSystemPrompt } from '../utils/systemPrompt';
import { AgentToolService } from './AgentToolService';
import { parseToolCalls, hasToolCalls } from './ToolParser';

const MAX_AGENT_ITERATIONS = 10; 

export class ChatService {
  private abortController: AbortController | null = null;
  private toolService: AgentToolService | null = null;

  setWorkspace(workspace: string): void {
    this.toolService = new AgentToolService(workspace);
  }

  async sendMessage(
    model: AIModel,
    messages: ChatMessage[],
    mode: 'responder' | 'agent',
    onStreamChunk: (chunk: string) => void,
    onToolExecution?: (tool: string, isStart: boolean, result?: string) => void
  ): Promise<void> {
    
    this.abortController = new AbortController();

    
    if (this.toolService) {
      this.toolService.reset();
    }

    
    const systemPrompt = generateSystemPrompt({
      mode,
      user_os: 'windows',
      user_query: messages[messages.length - 1]?.content || ''
    });

    
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    
    if (mode === 'responder') {
      const service = AIServiceFactory.createService(model.provider);
      await service.sendChatRequest(
        model.id,
        conversationMessages,
        onStreamChunk,
        this.abortController.signal
      );
      return;
    }

    
    let iteration = 0;

    while (iteration < MAX_AGENT_ITERATIONS) {
      iteration++;

      
      if (this.abortController?.signal.aborted) {
        break;
      }

      
      let responseBuffer = '';

      const collectChunk = (chunk: string) => {
        responseBuffer += chunk;
        
        
        
        const toolCallPattern = /\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}/g;
        let filteredChunk = chunk.replace(toolCallPattern, '');
        // Also remove standalone tool call JSON on separate lines
        filteredChunk = filteredChunk.replace(/^\s*\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}\s*$/gm, '');
        
        filteredChunk = filteredChunk.replace(/\n{3,}/g, '\n\n');
        
        if (filteredChunk.trim()) {
          onStreamChunk(filteredChunk);
        }
      };

      
      const service = AIServiceFactory.createService(model.provider);
      await service.sendChatRequest(
        model.id,
        conversationMessages,
        collectChunk,
        this.abortController.signal
      );

      
      if (!hasToolCalls(responseBuffer) || !this.toolService) {
        
        break;
      }

      
      const calls = parseToolCalls(responseBuffer);

      if (calls.length === 0) {
        break;
      }

      
      const toolResults: string[] = [];

      for (const call of calls) {
        
        onToolExecution?.(call.tool, true);

        
        const result = await this.toolService.executeTool(call.tool, call.args);

        
        onToolExecution?.(call.tool, false, result.formatted);

        
        if (result.formatted) {
          
          const resultText = `\n\n[[TOOL_RESULT:${call.tool}:${result.formatted}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nResult:\n${result.formatted}`);
        } else if (result.error) {
          const resultText = `\n\n[[TOOL_ERROR:${call.tool}:${result.error}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nError: ${result.error}`);
        }
      }

      
      
      let cleanedResponse = responseBuffer;
      if (calls.length > 0) {
        
        for (const call of calls) {
          cleanedResponse = cleanedResponse.replace(call.raw, '');
        }
        
        cleanedResponse = cleanedResponse.replace(/\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[^}]*\}\s*\}/g, '');
        
        cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n').trim();
      }

      
      if (cleanedResponse.trim()) {
        conversationMessages.push({
          role: 'assistant',
          content: cleanedResponse
        });
      }

      
      
      const formattedToolResults = toolResults.map(result => {
        
        if (result.startsWith('Tool: read_file')) {
          
          
          
          let fileMatch = result.match(/Tool: read_file\nResult:\n📄\s*([^\s(]+)\s*\((\d+)\s*lines?\)\n```\n([\s\S]*?)\n```/);
          if (!fileMatch) {
            
            fileMatch = result.match(/Tool: read_file\nResult:\n([^\s(]+)\s*\((\d+)\s*lines?\)\n```\n([\s\S]*?)\n```/);
          }
          if (!fileMatch) {
            
            fileMatch = result.match(/Tool: read_file\nResult:[\s\S]*?([^\s(]+)\s*\((\d+)\s*lines?\)[\s\S]*?```\n([\s\S]*?)\n```/);
          }
          if (fileMatch) {
            const [, filePath, lineCount, content] = fileMatch;
            
            return `Tool: read_file executed successfully.

File: ${filePath}
Lines: ${lineCount}

ACTUAL FILE CONTENT (use this real content, not assumptions):
\`\`\`
${content}
\`\`\`

IMPORTANT: The content above is the REAL, ACTUAL content of the file ${filePath}. Use this exact content to analyze and answer the user's question. Do not make up or guess what the file contains.`;
          }
          
          return result + '\n\n[Note: File content was read but could not be parsed. Please use the actual file content shown above.]';
        }
        return result;
      });

      const toolResultsMessage = `Tool execution completed. Results:\n\n${formattedToolResults.join('\n\n---\n\n')}\n\nNow analyze these results and provide your answer to the user's original question. Use the ACTUAL file content and search results provided above. Do not call more tools unless absolutely necessary.`;

      conversationMessages.push({
        role: 'user',
        content: toolResultsMessage
      });

      
      onStreamChunk('\n\n---\n\n');
    }

    if (iteration >= MAX_AGENT_ITERATIONS) {
      onStreamChunk('\n\n⚠️ Maximum iterations reached. Stopping agent loop.\n');
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async generateTitle(
    model: AIModel,
    userMessage: string,
    assistantResponse: string
  ): Promise<string> {
    const service = AIServiceFactory.createService(model.provider);
    return await service.generateTitle(model.id, userMessage, assistantResponse);
  }

  
  async executeTool(toolName: string, args: Record<string, any>): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.toolService) {
      return { success: false, error: 'Tool service not initialized. Set workspace first.' };
    }

    const result = await this.toolService.executeTool(toolName, args);

    return {
      success: result.success,
      result: result.formatted,
      error: result.error
    };
  }
}
