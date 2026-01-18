import { ToolExecutor, ToolResult } from './ToolExecutor';
import { parseToolCalls, ParsedToolCall, hasToolCalls } from './ToolParser';

export interface ToolExecutionResult {
  call: ParsedToolCall;
  result: ToolResult;
}


const RATE_LIMIT_CONFIG = {
  maxCallsPerMinute: 30,
  maxCallsPerSession: 100,
  cooldownMs: 2000, 
};

interface RateLimitState {
  callsInLastMinute: number[];
  totalCallsInSession: number;
  lastCallTime: number;
}


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

  
  private checkRateLimit(): { allowed: boolean; error?: string } {
    const now = Date.now();
    
    
    this.rateLimitState.callsInLastMinute = this.rateLimitState.callsInLastMinute.filter(
      time => now - time < 60000
    );

    
    if (this.rateLimitState.totalCallsInSession >= RATE_LIMIT_CONFIG.maxCallsPerSession) {
      return { 
        allowed: false, 
        error: `Session limit exceeded: maximum ${RATE_LIMIT_CONFIG.maxCallsPerSession} tool calls per session` 
      };
    }

    
    if (this.rateLimitState.callsInLastMinute.length >= RATE_LIMIT_CONFIG.maxCallsPerMinute) {
      return { 
        allowed: false, 
        error: `Rate limit exceeded: maximum ${RATE_LIMIT_CONFIG.maxCallsPerMinute} tool calls per minute` 
      };
    }

    
    if (now - this.rateLimitState.lastCallTime < RATE_LIMIT_CONFIG.cooldownMs) {
      return { 
        allowed: false, 
        error: `Cooldown active: please wait ${RATE_LIMIT_CONFIG.cooldownMs}ms between calls` 
      };
    }

    return { allowed: true };
  }

  
  private recordToolCall(): void {
    const now = Date.now();
    this.rateLimitState.callsInLastMinute.push(now);
    this.rateLimitState.totalCallsInSession++;
    this.rateLimitState.lastCallTime = now;
  }

  
  async processChunk(
    chunk: string,
    onToolStart?: (tool: string, args: Record<string, any>) => void,
    onToolResult?: (tool: string, result: ToolResult) => void
  ): Promise<{ text: string; toolResults: ToolExecutionResult[] }> {
    this.pendingBuffer += chunk;
    const toolResults: ToolExecutionResult[] = [];

    
    const calls = parseToolCalls(this.pendingBuffer);
    
    for (const call of calls) {
      
      const callKey = `${call.tool}:${JSON.stringify(call.args)}:${call.startIndex}`;
      
      if (this.executedCalls.has(callKey)) {
        continue;
      }

      
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

      
      this.executedCalls.add(callKey);

      
      this.recordToolCall();

      
      onToolStart?.(call.tool, call.args);

      
      const result = await this.executor.execute(call.tool, call.args);

      
      onToolResult?.(call.tool, result);

      toolResults.push({ call, result });
    }

    return {
      text: this.pendingBuffer,
      toolResults
    };
  }

  
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

      
      this.recordToolCall();

      onToolStart?.(call.tool, call.args);
      
      const result = await this.executor.execute(call.tool, call.args);
      
      onToolResult?.(call.tool, result);
      
      toolResults.push({ call, result });

      
      if (result.formatted) {
        processedText = processedText.replace(call.raw, `\n${result.formatted}\n`);
      }
    }

    return { processedText, toolResults };
  }

  
  async executeTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolResult> {
    
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    
    this.recordToolCall();

    return this.executor.execute(toolName, args);
  }

  
  reset(): void {
    this.pendingBuffer = '';
    this.executedCalls.clear();
    
    this.rateLimitState = {
      callsInLastMinute: [],
      totalCallsInSession: 0,
      lastCallTime: 0,
    };
  }

  
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


export function createToolProcessor(workspace: string) {
  const service = new AgentToolService(workspace);
  
  return {
    service,
    
    
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
