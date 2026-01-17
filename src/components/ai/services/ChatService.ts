import { AIServiceFactory } from './AIServiceFactory';
import { ChatMessage, AIModel } from './types';
import { generateSystemPrompt } from '../utils/systemPrompt';
import { AgentToolService } from './AgentToolService';
import { parseToolCalls, hasToolCalls } from './ToolParser';

const MAX_AGENT_ITERATIONS = 10; // Prevent infinite loops

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
    // Create new abort controller for this request
    this.abortController = new AbortController();

    // Reset tool service for new message
    if (this.toolService) {
      this.toolService.reset();
    }

    // Add system prompt based on mode
    const systemPrompt = generateSystemPrompt({
      mode,
      user_os: 'windows',
      user_query: messages[messages.length - 1]?.content || ''
    });

    // Build conversation messages (will be mutated in agent loop)
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // For responder mode - single request, no tool execution
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

    // Agent mode - agentic loop with tool execution
    let iteration = 0;

    while (iteration < MAX_AGENT_ITERATIONS) {
      iteration++;

      // Check if aborted
      if (this.abortController?.signal.aborted) {
        break;
      }

      // Collect full response for this iteration
      let responseBuffer = '';

      const collectChunk = (chunk: string) => {
        responseBuffer += chunk;
        // Filter out tool call JSON from user-visible stream
        // Tool calls in format: {"tool":"name","args":{...}} (may span multiple lines)
        // Match JSON objects that look like tool calls
        const toolCallPattern = /\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}/g;
        let filteredChunk = chunk.replace(toolCallPattern, '');
        // Also remove standalone tool call JSON on separate lines
        filteredChunk = filteredChunk.replace(/^\s*\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}\s*$/gm, '');
        // Clean up extra newlines
        filteredChunk = filteredChunk.replace(/\n{3,}/g, '\n\n');
        // Only send non-empty chunks to user
        if (filteredChunk.trim()) {
          onStreamChunk(filteredChunk);
        }
      };

      // Send request to model
      const service = AIServiceFactory.createService(model.provider);
      await service.sendChatRequest(
        model.id,
        conversationMessages,
        collectChunk,
        this.abortController.signal
      );

      // Check if response contains tool calls
      if (!hasToolCalls(responseBuffer) || !this.toolService) {
        // No tool calls - agent is done
        break;
      }

      // Parse and execute tool calls
      const calls = parseToolCalls(responseBuffer);

      if (calls.length === 0) {
        break;
      }

      // Execute all tools and collect results
      const toolResults: string[] = [];

      for (const call of calls) {
        // Notify about tool execution start
        onToolExecution?.(call.tool, true);

        // Execute the tool
        const result = await this.toolService.executeTool(call.tool, call.args);

        // Notify about tool execution complete
        onToolExecution?.(call.tool, false, result.formatted);

        // Show result in UI using special markers that ChatView can parse
        if (result.formatted) {
          // Use special marker format that ChatView will parse and render nicely
          const resultText = `\n\n[[TOOL_RESULT:${call.tool}:${result.formatted}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nResult:\n${result.formatted}`);
        } else if (result.error) {
          const resultText = `\n\n[[TOOL_ERROR:${call.tool}:${result.error}]]\n`;
          onStreamChunk(resultText);
          toolResults.push(`Tool: ${call.tool}\nError: ${result.error}`);
        }
      }

      // Remove tool calls from response buffer before adding to conversation
      // This prevents tool call JSON from appearing in the final message
      let cleanedResponse = responseBuffer;
      if (calls.length > 0) {
        // Remove all parsed tool calls from the response
        for (const call of calls) {
          cleanedResponse = cleanedResponse.replace(call.raw, '');
        }
        // Clean up any remaining JSON tool call patterns
        cleanedResponse = cleanedResponse.replace(/\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[^}]*\}\s*\}/g, '');
        // Clean up extra whitespace
        cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n').trim();
      }

      // Add assistant response (without tool calls) to conversation
      if (cleanedResponse.trim()) {
        conversationMessages.push({
          role: 'assistant',
          content: cleanedResponse
        });
      }

      // Add tool results as a user message (simulating tool response)
      // For read_file, include the actual file content so the agent can use it
      const formattedToolResults = toolResults.map(result => {
        // If it's a read_file result, format it more clearly for the agent
        if (result.startsWith('Tool: read_file')) {
          // Extract file path and content from the formatted result
          // Format: Tool: read_file\nResult:\n📄 path (X lines)\n```\ncontent\n```
          // Try multiple regex patterns to handle different formatting
          let fileMatch = result.match(/Tool: read_file\nResult:\n📄\s*([^\s(]+)\s*\((\d+)\s*lines?\)\n```\n([\s\S]*?)\n```/);
          if (!fileMatch) {
            // Try without emoji
            fileMatch = result.match(/Tool: read_file\nResult:\n([^\s(]+)\s*\((\d+)\s*lines?\)\n```\n([\s\S]*?)\n```/);
          }
          if (!fileMatch) {
            // Try more flexible pattern
            fileMatch = result.match(/Tool: read_file\nResult:[\s\S]*?([^\s(]+)\s*\((\d+)\s*lines?\)[\s\S]*?```\n([\s\S]*?)\n```/);
          }
          if (fileMatch) {
            const [, filePath, lineCount, content] = fileMatch;
            // Format clearly for the agent with explicit instructions
            return `Tool: read_file executed successfully.

File: ${filePath}
Lines: ${lineCount}

ACTUAL FILE CONTENT (use this real content, not assumptions):
\`\`\`
${content}
\`\`\`

IMPORTANT: The content above is the REAL, ACTUAL content of the file ${filePath}. Use this exact content to analyze and answer the user's question. Do not make up or guess what the file contains.`;
          }
          // Fallback if regex doesn't match - return original but add warning
          return result + '\n\n[Note: File content was read but could not be parsed. Please use the actual file content shown above.]';
        }
        return result;
      });

      const toolResultsMessage = `Tool execution completed. Results:\n\n${formattedToolResults.join('\n\n---\n\n')}\n\nNow analyze these results and provide your answer to the user's original question. Use the ACTUAL file content and search results provided above. Do not call more tools unless absolutely necessary.`;

      conversationMessages.push({
        role: 'user',
        content: toolResultsMessage
      });

      // Add visual separator for next iteration
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

  /**
   * Execute a tool directly (for manual tool calls)
   */
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
