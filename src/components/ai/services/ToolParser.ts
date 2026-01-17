/**
 * Tool call parser for AI responses
 * Parses tool calls in various formats and extracts arguments
 */

export interface ParsedToolCall {
  tool: string;
  args: Record<string, any>;
  raw: string;
  startIndex: number;
  endIndex: number;
}

export interface ToolCallPattern {
  name: string;
  aliases: string[];
  argPatterns: ArgPattern[];
}

export interface ArgPattern {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
  maxLength?: number; // For string validation
  min?: number; // For number validation
  max?: number; // For number validation
}

// Validation constants
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 100;
const MAX_PATH_LENGTH = 500;

// Tool definitions with argument patterns
const TOOL_DEFINITIONS: ToolCallPattern[] = [
  {
    name: 'grep',
    aliases: ['Grep', 'GREP', 'search', 'Search', 'grep_search', 'grepSearch'],
    argPatterns: [
      { name: 'query', type: 'string', required: true, maxLength: 1000 },
      { name: 'path', type: 'string', default: '.', maxLength: MAX_PATH_LENGTH },
      { name: 'caseSensitive', type: 'boolean', default: false },
      { name: 'wholeWord', type: 'boolean', default: false },
      { name: 'regex', type: 'boolean', default: false },
      { name: 'includePattern', type: 'string', default: '', maxLength: 200 },
      { name: 'excludePattern', type: 'string', default: '', maxLength: 200 },
      { name: 'maxResults', type: 'number', default: 100, min: 1, max: 500 }
    ]
  },
  {
    name: 'find_by_name',
    aliases: ['find', 'Find', 'FIND', 'find_file', 'findFile'],
    argPatterns: [
      { name: 'pattern', type: 'string', required: true, maxLength: 200 },
      { name: 'path', type: 'string', default: '.', maxLength: MAX_PATH_LENGTH },
      { name: 'type', type: 'string', default: 'all' },
      { name: 'maxDepth', type: 'number', default: 10, min: 1, max: 20 },
      { name: 'maxResults', type: 'number', default: 50, min: 1, max: 200 }
    ]
  },
  {
    name: 'list_dir',
    aliases: ['ls', 'listDir', 'list_directory', 'dir'],
    argPatterns: [
      { name: 'path', type: 'string', required: true, maxLength: MAX_PATH_LENGTH },
      { name: 'recursive', type: 'boolean', default: false },
      { name: 'maxDepth', type: 'number', default: 3, min: 1, max: 10 },
      { name: 'showHidden', type: 'boolean', default: false }
    ]
  },
  {
    name: 'read_file',
    aliases: ['readFile', 'read', 'cat', 'READ'],
    argPatterns: [
      { name: 'path', type: 'string', required: true, maxLength: MAX_PATH_LENGTH }
    ]
  },
  {
    name: 'file_info',
    aliases: ['fileInfo', 'stat', 'info'],
    argPatterns: [
      { name: 'path', type: 'string', required: true, maxLength: MAX_PATH_LENGTH }
    ]
  }
];

// Generate tool name patterns from definitions (cached)
const ALL_TOOL_NAMES = TOOL_DEFINITIONS.flatMap(def => [def.name, ...def.aliases]);
const TOOL_NAMES_PATTERN = ALL_TOOL_NAMES.join('|');
const SIMPLE_TOOL_NAMES = TOOL_DEFINITIONS.map(d => d.name.toUpperCase()).join('|');

// Pre-compiled regex patterns (created once, reused)
const PATTERNS = {
  // Pattern 1: Function call style - tool_name(args) or tool_name({ json })
  funcCall: new RegExp(`\\b(${TOOL_NAMES_PATTERN})\\s*\\(\\s*({[\\s\\S]*?}|[^)]+)\\s*\\)`, 'gi'),
  // Pattern 2: JSON style - { "tool": "name", "args": {...} }
  jsonTool: /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\s*\}/gi,
  // Pattern 3: Simple format - [[TOOL:arg]] or [[TOOL:arg1,arg2]]
  simple: new RegExp(`\\[\\[(${SIMPLE_TOOL_NAMES}|READ):([^\\]]+)\\]\\]`, 'gi'),
  // Pattern 4: Markdown code block with tool call
  // Accept any language tag or no tag after ```
  codeBlock: /```(?:[\\w+-]+)?\\s*\\n?([\\s\\S]*?)\\n?```/gi,
};

/**
 * Parse tool calls from AI response text
 */
export function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  let match;

  // Reset regex lastIndex before each use (required for global regex reuse)
  PATTERNS.funcCall.lastIndex = 0;
  PATTERNS.jsonTool.lastIndex = 0;
  PATTERNS.simple.lastIndex = 0;
  PATTERNS.codeBlock.lastIndex = 0;

  // Parse function call style
  while ((match = PATTERNS.funcCall.exec(text)) !== null) {
    const toolName = normalizeToolName(match[1]);
    const argsStr = match[2].trim();
    const args = parseArgs(toolName, argsStr);

    if (args) {
      calls.push({
        tool: toolName,
        args,
        raw: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  // Parse JSON style - try to find complete JSON objects
  // First try the regex pattern (faster for simple cases)
  PATTERNS.jsonTool.lastIndex = 0;
  while ((match = PATTERNS.jsonTool.exec(text)) !== null) {
    const toolName = normalizeToolName(match[1]);
    try {
      const args = JSON.parse(match[2]);
      calls.push({
        tool: toolName,
        args,
        raw: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    } catch (e) {
      // Invalid JSON, try manual parsing for nested objects
      try {
        // Try to find the complete JSON object by parsing from the start
        const startPos = match.index;
        const jsonStart = text.indexOf('{', startPos);
        if (jsonStart !== -1) {
          // Find the matching closing brace
          let braceCount = 0;
          let jsonEnd = jsonStart;
          for (let i = jsonStart; i < text.length; i++) {
            if (text[i] === '{') braceCount++;
            if (text[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }
          if (jsonEnd > jsonStart) {
            const fullJson = text.substring(jsonStart, jsonEnd);
            const parsed = safeJsonParse(fullJson);
            if (parsed && isValidToolCallObject(parsed)) {
              const validatedArgs = validateAndSanitizeArgs(normalizeToolName(parsed.tool), parsed.args);
              if (validatedArgs) {
                calls.push({
                  tool: normalizeToolName(parsed.tool),
                  args: validatedArgs,
                  raw: fullJson,
                  startIndex: jsonStart,
                  endIndex: jsonEnd
                });
              }
            }
          }
        }
      } catch (e2) {
        // Invalid JSON, skip
      }
    }
  }

  // Parse simple format
  while ((match = PATTERNS.simple.exec(text)) !== null) {
    const toolName = normalizeToolName(match[1]);
    const argsStr = match[2].trim();
    const args = parseSimpleArgs(toolName, argsStr);

    if (args) {
      calls.push({
        tool: toolName,
        args,
        raw: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  // Parse code blocks
  while ((match = PATTERNS.codeBlock.exec(text)) !== null) {
    const content = match[1].trim();
    try {
      const parsed = safeJsonParse(content);
      if (parsed && isValidToolCallObject(parsed)) {
        const validatedArgs = validateAndSanitizeArgs(normalizeToolName(parsed.tool), parsed.args);
        if (validatedArgs) {
          calls.push({
            tool: normalizeToolName(parsed.tool),
            args: validatedArgs,
            raw: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
    } catch (e) {
      // Not valid JSON, try other parsing
    }
  }

  // Remove duplicates based on position
  return calls.filter((call, index, self) =>
    index === self.findIndex(c => c.startIndex === call.startIndex)
  );
}

/**
 * Safe JSON parse with size limit
 */
function safeJsonParse(content: string): any {
  // Limit JSON size to prevent DoS
  if (content.length > MAX_STRING_LENGTH) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Validate that parsed object is a valid tool call
 */
function isValidToolCallObject(obj: any): obj is { tool: string; args: Record<string, any> } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.tool === 'string' &&
    obj.tool.length > 0 &&
    obj.tool.length <= 50 &&
    typeof obj.args === 'object' &&
    obj.args !== null &&
    !Array.isArray(obj.args)
  );
}

/**
 * Validate and sanitize arguments based on tool definition
 */
function validateAndSanitizeArgs(toolName: string, args: Record<string, any>): Record<string, any> | null {
  const def = TOOL_DEFINITIONS.find(d => d.name === toolName);
  if (!def) return null;

  const sanitized: Record<string, any> = {};

  for (const argDef of def.argPatterns) {
    // Try exact match first
    let value = args[argDef.name];

    // Try case-insensitive match if not found
    if (value === undefined) {
      const lowerName = argDef.name.toLowerCase();
      const key = Object.keys(args).find(k => k.toLowerCase() === lowerName);
      if (key) {
        value = args[key];
      }
    }

    // Check specific aliases for common tools
    if (value === undefined) {
      if (argDef.name === 'path') {
        value = args['file_path'] || args['filePath'] || args['DirectoryPath'] || args['SearchDirectory'] || args['SearchPath'];
      }
    }

    // Use default if not provided
    if (value === undefined) {
      if (argDef.required) {
        return null; // Missing required argument
      }
      if (argDef.default !== undefined) {
        sanitized[argDef.name] = argDef.default;
      }
      continue;
    }

    // Validate and convert type
    const validated = validateValue(value, argDef);
    if (validated === null && argDef.required) {
      return null; // Invalid required argument
    }

    if (validated !== null) {
      sanitized[argDef.name] = validated;
    } else if (argDef.default !== undefined) {
      sanitized[argDef.name] = argDef.default;
    }
  }

  return sanitized;
}

/**
 * Validate a single value against its definition
 */
function validateValue(value: any, argDef: ArgPattern): any {
  switch (argDef.type) {
    case 'string': {
      if (typeof value !== 'string') {
        value = String(value);
      }
      const maxLen = argDef.maxLength || MAX_STRING_LENGTH;
      if (value.length > maxLen) {
        value = value.slice(0, maxLen);
      }
      return value;
    }
    case 'number': {
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (isNaN(num)) return null;

      let result = num;
      if (argDef.min !== undefined && result < argDef.min) result = argDef.min;
      if (argDef.max !== undefined && result > argDef.max) result = argDef.max;
      return result;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value === 'true' || value === '1' || value === 'yes';
      }
      return Boolean(value);
    }
    case 'array': {
      if (!Array.isArray(value)) {
        if (typeof value === 'string') {
          value = value.split(',').map(v => v.trim());
        } else {
          return null;
        }
      }
      // Limit array length
      return value.slice(0, MAX_ARRAY_LENGTH);
    }
    default:
      return null;
  }
}

/**
 * Normalize tool name to standard format
 */
function normalizeToolName(name: string): string {
  const lowerName = name.toLowerCase();

  for (const def of TOOL_DEFINITIONS) {
    if (def.name === lowerName || def.aliases.map(a => a.toLowerCase()).includes(lowerName)) {
      return def.name;
    }
  }

  return lowerName;
}

/**
 * Parse arguments from string
 */
function parseArgs(toolName: string, argsStr: string): Record<string, any> | null {
  // Try JSON first
  if (argsStr.startsWith('{')) {
    try {
      return JSON.parse(argsStr);
    } catch (e) {
      // Not valid JSON
    }
  }

  // Try key=value pairs
  const args: Record<string, any> = {};
  const def = TOOL_DEFINITIONS.find(d => d.name === toolName);

  if (!def) return null;

  // Simple string argument (first required arg)
  if (!argsStr.includes('=') && !argsStr.includes(':')) {
    const firstRequired = def.argPatterns.find(p => p.required);
    if (firstRequired) {
      args[firstRequired.name] = argsStr.replace(/^["']|["']$/g, '');
      return args;
    }
  }

  // Parse key=value or key:value pairs
  const pairRegex = /(\w+)\s*[=:]\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let pairMatch;

  while ((pairMatch = pairRegex.exec(argsStr)) !== null) {
    const key = pairMatch[1];
    const value = pairMatch[2] || pairMatch[3] || pairMatch[4];

    const argDef = def.argPatterns.find(p => p.name === key);
    if (argDef) {
      args[key] = convertValue(value, argDef.type);
    } else {
      args[key] = value;
    }
  }

  // Apply defaults
  for (const argDef of def.argPatterns) {
    if (args[argDef.name] === undefined && argDef.default !== undefined) {
      args[argDef.name] = argDef.default;
    }
  }

  return Object.keys(args).length > 0 ? args : null;
}

/**
 * Parse simple format arguments (comma-separated)
 */
function parseSimpleArgs(toolName: string, argsStr: string): Record<string, any> | null {
  const def = TOOL_DEFINITIONS.find(d => d.name === toolName);
  if (!def) return null;

  const args: Record<string, any> = {};
  const parts = argsStr.split(',').map(p => p.trim());

  // Map positional arguments to named arguments
  for (let i = 0; i < parts.length && i < def.argPatterns.length; i++) {
    const argDef = def.argPatterns[i];
    args[argDef.name] = convertValue(parts[i], argDef.type);
  }

  // Apply defaults
  for (const argDef of def.argPatterns) {
    if (args[argDef.name] === undefined && argDef.default !== undefined) {
      args[argDef.name] = argDef.default;
    }
  }

  return Object.keys(args).length > 0 ? args : null;
}

/**
 * Convert string value to appropriate type
 */
function convertValue(value: string, type: string): any {
  switch (type) {
    case 'number':
      return parseInt(value, 10) || 0;
    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes';
    case 'array':
      return value.split(',').map(v => v.trim());
    default:
      return value.replace(/^["']|["']$/g, '');
  }
}

/**
 * Check if text contains any tool calls
 */
export function hasToolCalls(text: string): boolean {
  // Single combined pattern for quick check
  const quickCheckPattern = new RegExp(
    `\\b(${TOOL_NAMES_PATTERN})\\s*\\(|\\[\\[(${SIMPLE_TOOL_NAMES}|READ):|\\{\\s*"tool"\\s*:`,
    'i'
  );
  return quickCheckPattern.test(text);
}

/**
 * Replace tool calls in text with results
 */
export function replaceToolCalls(text: string, calls: ParsedToolCall[], results: Map<number, string>): string {
  // Sort by position descending to replace from end
  const sortedCalls = [...calls].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;

  for (let i = 0; i < sortedCalls.length; i++) {
    const call = sortedCalls[i];
    const callResult = results.get(calls.indexOf(call));

    if (callResult !== undefined) {
      result = result.slice(0, call.startIndex) + callResult + result.slice(call.endIndex);
    }
  }

  return result;
}
