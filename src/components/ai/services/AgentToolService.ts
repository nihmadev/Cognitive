import { ToolExecutor, ToolResult } from './ToolExecutor';
import { parseToolCalls, ParsedToolCall, hasToolCalls } from './ToolParser';

export interface ToolExecutionResult {
  call: ParsedToolCall;
  result: ToolResult;
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxCallsPerMinute: 30,
  maxCallsPerSession: 100,
  cooldownMs: 2000, // Minimum time between calls
};

interface RateLimitState {
  callsInLastMinute: number[];
  totalCallsInSession: number;
  lastCallTime: number;
}

/**
 * Service for handling AI agent tool execution
 * Detects tool calls in AI responses and executes them
 */
export class AgentToolService {
  private executor: ToolExecutor;
  private pendingBuffer: string = '';
  private executedCalls: Set<string> = new Set();
  private rateLimitState: RateLimitState = {
    callsInLastMinute: [],
    totalCallsInSession: 0,
    lastCallTime: 0,
  };

  constructor(workspace: string) {
    this.executor = new ToolExecutor(workspace);
  }

  /**
   * Check if rate limit is exceeded
   */
  private checkRateLimit(): { allowed: boolean; error?: string } {
    const now = Date.now();
    
    // Clean up old timestamps (older than 1 minute)
    this.rateLimitState.callsInLastMinute = this.rateLimitState.callsInLastMinute.filter(
      time => now - time < 60000
    );

    // Check session limit
    if (this.rateLimitState.totalCallsInSession >= RATE_LIMIT_CONFIG.maxCallsPerSession) {
      return { 
        allowed: false, 
        error: `Session limit exceeded: maximum ${RATE_LIMIT_CONFIG.maxCallsPerSession} tool calls per session` 
      };
    }

    // Check per-minute limit
    if (this.rateLimitState.callsInLastMinute.length >= RATE_LIMIT_CONFIG.maxCallsPerMinute) {
      return { 
        allowed: false, 
        error: `Rate limit exceeded: maximum ${RATE_LIMIT_CONFIG.maxCallsPerMinute} tool calls per minute` 
      };
    }

    // Check cooldown
    if (now - this.rateLimitState.lastCallTime < RATE_LIMIT_CONFIG.cooldownMs) {
      return { 
        allowed: false, 
        error: `Cooldown active: please wait ${RATE_LIMIT_CONFIG.cooldownMs}ms between calls` 
      };
    }

    return { allowed: true };
  }

  /**
   * Record a tool call for rate limiting
   */
  private recordToolCall(): void {
    const now = Date.now();
    this.rateLimitState.callsInLastMinute.push(now);
    this.rateLimitState.totalCallsInSession++;
    this.rateLimitState.lastCallTime = now;
  }

  /**
   * Process a chunk of AI response and detect/execute tool calls
   * Returns the processed text and any tool results
   */
  async processChunk(
    chunk: string,
    onToolStart?: (tool: string, args: Record<string, any>) => void,
    onToolResult?: (tool: string, result: ToolResult) => void
  ): Promise<{ text: string; toolResults: ToolExecutionResult[] }> {
    this.pendingBuffer += chunk;
    const toolResults: ToolExecutionResult[] = [];

    // Check for complete tool calls
    const calls = parseToolCalls(this.pendingBuffer);
    
    for (const call of calls) {
      // Create unique key for this call
      const callKey = `${call.tool}:${JSON.stringify(call.args)}:${call.startIndex}`;
      
      if (this.executedCalls.has(callKey)) {
        continue;
      }

      // Check rate limit before execution
      const rateLimitCheck = this.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        onToolResult?.(call.tool, { 
          success: false, 
          error: rateLimitCheck.error 
        });
        toolResults.push({ 
          call, 
          result: { success: false, error: rateLimitCheck.error } 
        });
        continue;
      }

      // Mark as executed
      this.executedCalls.add(callKey);

      // Record for rate limiting
      this.recordToolCall();

      // Notify about tool start
      onToolStart?.(call.tool, call.args);

      // Execute the tool
      const result = await this.executor.execute(call.tool, call.args);

      // Notify about result
      onToolResult?.(call.tool, result);

      toolResults.push({ call, result });
    }

    return {
      text: this.pendingBuffer,
      toolResults
    };
  }

  /**
   * Process complete AI response and execute all tool calls
   */
  async processResponse(
    response: string,
    onToolStart?: (tool: string, args: Record<string, any>) => void,
    onToolResult?: (tool: string, result: ToolResult) => void
  ): Promise<{ processedText: string; toolResults: ToolExecutionResult[] }> {
    const toolResults: ToolExecutionResult[] = [];
    
    if (!hasToolCalls(response)) {
      return { processedText: response, toolResults };
    }

    const calls = parseToolCalls(response);
    let processedText = response;

    for (const call of calls) {
      // Check rate limit before execution
      const rateLimitCheck = this.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        onToolResult?.(call.tool, { 
          success: false, 
          error: rateLimitCheck.error 
        });
        toolResults.push({ 
          call, 
          result: { success: false, error: rateLimitCheck.error } 
        });
        continue;
      }

      // Record for rate limiting
      this.recordToolCall();

      onToolStart?.(call.tool, call.args);
      
      const result = await this.executor.execute(call.tool, call.args);
      
      onToolResult?.(call.tool, result);
      
      toolResults.push({ call, result });

      // Replace tool call with result in text
      if (result.formatted) {
        processedText = processedText.replace(call.raw, `\n${result.formatted}\n`);
      }
    }

    return { processedText, toolResults };
  }

  /**
   * Execute a single tool call directly
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolResult> {
    // Check rate limit
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    // Record for rate limiting
    this.recordToolCall();

    return this.executor.execute(toolName, args);
  }

  /**
   * Reset the service state
   */
  reset(): void {
    this.pendingBuffer = '';
    this.executedCalls.clear();
    // Reset rate limit state for new session
    this.rateLimitState = {
      callsInLastMinute: [],
      totalCallsInSession: 0,
      lastCallTime: 0,
    };
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { 
    callsInLastMinute: number; 
    totalCallsInSession: number; 
    remainingInMinute: number;
    remainingInSession: number;
  } {
    const now = Date.now();
    const recentCalls = this.rateLimitState.callsInLastMinute.filter(
      time => now - time < 60000
    ).length;

    return {
      callsInLastMinute: recentCalls,
      totalCallsInSession: this.rateLimitState.totalCallsInSession,
      remainingInMinute: Math.max(0, RATE_LIMIT_CONFIG.maxCallsPerMinute - recentCalls),
      remainingInSession: Math.max(0, RATE_LIMIT_CONFIG.maxCallsPerSession - this.rateLimitState.totalCallsInSession),
    };
  }

  /**
   * Get available tools info for system prompt
   */
  static getToolsDescription(): string {
    return `
## Available Tools

### grep(query, [options])
Search for text patterns in files. Very fast, uses ripgrep.
- query: Search pattern (required)
- path: Directory to search (default: workspace root)
- caseSensitive: Case sensitive search (default: false)
- wholeWord: Match whole words only (default: false)
- regex: Treat query as regex (default: false)
- includePattern: Glob pattern for files to include (e.g., "*.ts")
- excludePattern: Glob pattern for files to exclude
- maxResults: Maximum results (default: 100)

Examples:
- grep("useState")
- grep({ query: "function", includePattern: "*.ts" })
- [[GREP:useState]]

### find_by_name(pattern, [options])
Find files by name pattern.
- pattern: File name pattern with wildcards (required)
- path: Directory to search (default: workspace root)
- type: "file", "dir", or "all" (default: "all")
- maxDepth: Maximum directory depth (default: 10)
- maxResults: Maximum results (default: 50)

Examples:
- find_by_name("*.tsx")
- find_by_name({ pattern: "test*", type: "file" })
- [[FIND:*.config.js]]

### list_dir(path, [options])
List directory contents.
- path: Directory path (required)
- recursive: List recursively (default: false)
- maxDepth: Maximum depth for recursive (default: 3)
- showHidden: Show hidden files (default: false)

Examples:
- list_dir("src")
- list_dir({ path: "src/components", recursive: true })
- [[LIST_DIR:src]]

### read_file(path)
Read file content.
- path: File path (required)

Examples:
- read_file("src/App.tsx")
- [[READ:package.json]]
- [[READ_FILE:src/index.ts]]
`;
  }
}

/**
 * Create a tool-aware message processor
 */
export function createToolProcessor(workspace: string) {
  const service = new AgentToolService(workspace);
  
  return {
    service,
    
    /**
     * Process streaming response with tool execution
     */
    async processStream(
      onChunk: (chunk: string) => void,
      onToolStart?: (tool: string) => void,
      onToolComplete?: (tool: string, result: string) => void
    ) {
      return async (chunk: string) => {
        const { toolResults } = await service.processChunk(
          chunk,
          (tool) => onToolStart?.(tool),
          (tool, result) => {
            if (result.formatted) {
              onToolComplete?.(tool, result.formatted);
            }
          }
        );
        
        onChunk(chunk);
        
        // If we have tool results, append them
        for (const { result } of toolResults) {
          if (result.formatted) {
            onChunk(`\n\n${result.formatted}\n`);
          }
        }
      };
    },
    
    reset: () => service.reset()
  };
}
