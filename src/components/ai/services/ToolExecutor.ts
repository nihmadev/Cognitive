import { tauriApi, SearchOptions, SearchResult } from '../../../lib/tauri-api';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  formatted?: string;
}

// Security constants
const BLOCKED_PATH_PATTERNS = [
  /\.\./, // Path traversal
  /^\/etc\//i,
  /^\/var\//i,
  /^\/root\//i,
  /^\/proc\//i,
  /^\/sys\//i,
  /^\/dev\//i,
  /^\/boot\//i,
  /^\/bin\//i,
  /^\/sbin\//i,
  /^\/lib\//i,
  /^~\/\.\w+/i, // Hidden config files in home
];

const ALLOWED_ABSOLUTE_PREFIXES = ['/home', '/usr', '/tmp', '/Users'];

/**
 * Sanitize and validate file path to prevent path traversal attacks
 */
function sanitizePath(filePath: string, workspace: string): { valid: boolean; path: string; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, path: '', error: 'Invalid path: path must be a non-empty string' };
  }

  let cleanPath = filePath.trim();
  
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(cleanPath)) {
      return { valid: false, path: '', error: `Access denied: path contains blocked pattern` };
    }
  }

  // Normalize the path - remove redundant slashes
  cleanPath = cleanPath.replace(/\/+/g, '/');
  
  // If path starts with / but is not an allowed absolute path, treat as relative
  if (cleanPath.startsWith('/')) {
    const isAllowedAbsolute = ALLOWED_ABSOLUTE_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
    if (!isAllowedAbsolute) {
      cleanPath = cleanPath.substring(1);
    }
  }

  // Build full path
  const fullPath = cleanPath.startsWith('/') ? cleanPath : `${workspace}/${cleanPath}`;
  
  // Normalize and verify the path stays within allowed boundaries
  const normalizedPath = normalizePath(fullPath);
  
  // Verify the normalized path is within workspace or allowed directories
  const isWithinWorkspace = normalizedPath.startsWith(workspace);
  const isAllowedAbsolute = ALLOWED_ABSOLUTE_PREFIXES.some(prefix => normalizedPath.startsWith(prefix));
  
  if (!isWithinWorkspace && !isAllowedAbsolute) {
    return { valid: false, path: '', error: 'Access denied: path is outside allowed directories' };
  }

  return { valid: true, path: normalizedPath };
}

/**
 * Normalize path by resolving . and .. segments
 */
function normalizePath(path: string): string {
  const parts = path.split('/');
  const normalized: string[] = [];
  
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      normalized.pop();
    } else {
      normalized.push(part);
    }
  }
  
  return '/' + normalized.join('/');
}

export interface GrepOptions {
  query: string;
  path?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
  contextLines?: number;
}

export interface FindOptions {
  pattern: string;
  path?: string;
  type?: 'file' | 'dir' | 'all';
  maxDepth?: number;
  maxResults?: number;
}

export interface ListDirOptions {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
  showHidden?: boolean;
}

type ToolHandler = (args: Record<string, any>) => Promise<ToolResult>;

/**
 * Powerful tool executor for AI model
 * Provides grep, find, list_dir and other file system operations
 */
export class ToolExecutor {
  private workspace: string;
  private toolHandlers: Map<string, ToolHandler>;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.toolHandlers = this.createToolHandlers();
  }

  /**
   * Create tool handlers registry
   * To add a new tool, simply add it to this map
   */
  private createToolHandlers(): Map<string, ToolHandler> {
    const handlers = new Map<string, ToolHandler>();
    
    // Search tools
    handlers.set('grep', (args) => this.grep(args as GrepOptions));
    handlers.set('search', (args) => this.grep(args as GrepOptions));
    
    // Find tools
    handlers.set('find', (args) => this.findByName(args as FindOptions));
    handlers.set('find_by_name', (args) => this.findByName(args as FindOptions));
    
    // Directory tools
    handlers.set('list_dir', (args) => this.listDir(args as ListDirOptions));
    handlers.set('ls', (args) => this.listDir(args as ListDirOptions));
    
    // File tools
    handlers.set('read_file', (args) => this.readFile(args.path));
    handlers.set('file_info', (args) => this.getFileInfo(args.path));
    
    return handlers;
  }

  /**
   * Register a custom tool handler
   */
  registerTool(name: string, handler: ToolHandler): void {
    this.toolHandlers.set(name.toLowerCase(), handler);
  }

  /**
   * Get all available tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.toolHandlers.keys());
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    try {
      const handler = this.toolHandlers.get(toolName.toLowerCase());
      
      if (!handler) {
        return { success: false, error: `Unknown tool: ${toolName}` };
      }
      
      return await handler(args);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Powerful grep search with context
   */
  async grep(options: GrepOptions): Promise<ToolResult> {
    const {
      query,
      path = this.workspace,
      caseSensitive = false,
      wholeWord = false,
      regex = false,
      includePattern = '',
      excludePattern = '',
      maxResults = 100
    } = options;

    if (!query || query.trim() === '') {
      return { success: false, error: 'Query is required' };
    }

    // Sanitize and validate path
    const sanitized = sanitizePath(path, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }
    
    const rootPath = sanitized.path;

    const searchOptions: SearchOptions = {
      query,
      is_case_sensitive: caseSensitive,
      is_whole_word: wholeWord,
      is_regex: regex,
      include_pattern: includePattern,
      exclude_pattern: excludePattern,
      filter_pattern: ''
    };

    const results = await tauriApi.searchInFiles(rootPath, searchOptions);

    // Limit results
    let totalMatches = 0;
    const limitedResults: SearchResult[] = [];
    
    for (const result of results) {
      if (totalMatches >= maxResults) break;
      
      const remainingSlots = maxResults - totalMatches;
      const limitedMatches = result.matches.slice(0, remainingSlots);
      
      if (limitedMatches.length > 0) {
        limitedResults.push({
          ...result,
          matches: limitedMatches
        });
        totalMatches += limitedMatches.length;
      }
    }

    // Format results for AI
    const formatted = this.formatGrepResults(limitedResults, query, rootPath);

    return {
      success: true,
      data: {
        results: limitedResults,
        totalFiles: limitedResults.length,
        totalMatches,
        truncated: totalMatches >= maxResults
      },
      formatted
    };
  }

  /**
   * Find files by name pattern
   */
  async findByName(options: FindOptions): Promise<ToolResult> {
    const {
      pattern,
      path = this.workspace,
      type = 'all',
      maxDepth = 10,
      maxResults = 50
    } = options;

    if (!pattern || pattern.trim() === '') {
      return { success: false, error: 'Pattern is required' };
    }

    // Sanitize and validate path
    const sanitized = sanitizePath(path, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }
    
    const rootPath = sanitized.path;
    
    // Get all files
    const allFiles = await tauriApi.getAllFiles(rootPath);
    
    // Convert pattern to regex
    const regexPattern = this.patternToRegex(pattern);
    const regex = new RegExp(regexPattern, 'i');
    
    // Filter files
    const matches: Array<{ name: string; path: string; isDir: boolean; depth: number }> = [];
    
    const processEntry = (entry: any, depth: number) => {
      if (depth > maxDepth || matches.length >= maxResults) return;
      
      const name = entry.name || '';
      const entryPath = entry.path || '';
      const isDir = entry.is_dir || false;
      
      // Check type filter
      if (type === 'file' && isDir) return;
      if (type === 'dir' && !isDir) return;
      
      // Check pattern match
      if (regex.test(name)) {
        matches.push({
          name,
          path: entryPath,
          isDir,
          depth
        });
      }
      
      // Process children
      if (entry.children && Array.isArray(entry.children)) {
        for (const child of entry.children) {
          if (matches.length >= maxResults) break;
          processEntry(child, depth + 1);
        }
      }
    };
    
    for (const entry of allFiles) {
      if (matches.length >= maxResults) break;
      processEntry(entry, 0);
    }

    // Format results
    const formatted = this.formatFindResults(matches, pattern, rootPath);

    return {
      success: true,
      data: {
        matches,
        total: matches.length,
        truncated: matches.length >= maxResults
      },
      formatted
    };
  }

  /**
   * List directory contents
   */
  async listDir(options: ListDirOptions): Promise<ToolResult> {
    const {
      path,
      recursive = false,
      maxDepth = 3,
      showHidden = false
    } = options;

    // Sanitize and validate path
    const sanitized = sanitizePath(path, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }
    
    const fullPath = sanitized.path;
    
    const entries = await tauriApi.readDir(fullPath);
    
    // Filter and process entries
    const processedEntries = this.processDirectoryEntries(
      entries, 
      recursive, 
      maxDepth, 
      showHidden, 
      0
    );

    // Format results
    const formatted = this.formatListDirResults(processedEntries, path);

    return {
      success: true,
      data: {
        path: fullPath,
        entries: processedEntries,
        total: this.countEntries(processedEntries)
      },
      formatted
    };
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<ToolResult> {
    // Sanitize and validate path
    const sanitized = sanitizePath(filePath, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }
    
    const fullPath = sanitized.path;
    
    try {
      const content = await tauriApi.readFile(fullPath);
      const lines = content.split('\n');
      
      // Return the clean relative path for display
      const displayPath = fullPath.replace(this.workspace + '/', '');
      
      return {
        success: true,
        data: {
          path: fullPath,
          content,
          lines: lines.length,
          size: content.length
        },
        formatted: `📄 ${displayPath} (${lines.length} lines)\n\`\`\`\n${content}\n\`\`\``
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<ToolResult> {
    // Sanitize and validate path
    const sanitized = sanitizePath(filePath, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }
    
    const fullPath = sanitized.path;
    
    try {
      const size = await tauriApi.getFileSize(fullPath);
      const name = filePath.split('/').pop() || filePath;
      
      return {
        success: true,
        data: {
          path: fullPath,
          name,
          size,
          sizeFormatted: this.formatFileSize(size)
        },
        formatted: `📄 ${name}: ${this.formatFileSize(size)}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file info: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Helper methods

  private formatGrepResults(results: SearchResult[], query?: string, searchPath?: string): string {
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    const displayPath = searchPath ? searchPath.replace(this.workspace, '~') : '~';
    
    if (results.length === 0) {
      return JSON.stringify({
        type: 'search-results',
        query: query || '',
        path: displayPath,
        totalFiles: 0,
        totalMatches: 0,
        files: []
      });
    }

    const files = results.map(result => {
      const relativePath = result.file.path.replace(this.workspace + '/', '');
      return {
        name: result.file.name,
        path: relativePath,
        fullPath: result.file.path,
        matchCount: result.matches.length,
        matches: result.matches.slice(0, 5).map(m => ({
          line: m.line,
          text: m.line_text.trim().slice(0, 200)
        }))
      };
    });

    return JSON.stringify({
      type: 'search-results',
      query: query || '',
      path: displayPath,
      totalFiles: results.length,
      totalMatches,
      files
    });
  }

  private formatFindResults(matches: Array<{ name: string; path: string; isDir: boolean }>, pattern?: string, searchPath?: string): string {
    const displayPath = searchPath ? searchPath.replace(this.workspace, '~') : '~';
    
    if (matches.length === 0) {
      return JSON.stringify({
        type: 'find-results',
        pattern: pattern || '*',
        path: displayPath,
        totalFiles: 0,
        files: []
      });
    }

    const files = matches.map(match => {
      const relativePath = match.path.replace(this.workspace + '/', '');
      return {
        name: match.name,
        path: relativePath,
        fullPath: match.path,
        isDir: match.isDir
      };
    });

    return JSON.stringify({
      type: 'find-results',
      pattern: pattern || '*',
      path: displayPath,
      totalFiles: matches.length,
      files
    });
  }

  private formatListDirResults(entries: any[], path: string): string {
    const displayPath = path.replace(this.workspace, '~');
    
    if (entries.length === 0) {
      return JSON.stringify({
        type: 'list-dir-results',
        path: displayPath,
        totalItems: 0,
        files: []
      });
    }

    const flattenEntries = (items: any[], prefix: string = ''): Array<{ name: string; path: string; fullPath: string; isDir?: boolean }> => {
      const result: Array<{ name: string; path: string; fullPath: string; isDir?: boolean }> = [];
      for (const item of items) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
        result.push({
          name: item.name,
          path: itemPath,
          fullPath: item.path,
          isDir: item.is_dir
        });
        if (item.children && item.children.length > 0) {
          result.push(...flattenEntries(item.children, itemPath));
        }
      }
      return result;
    };

    const files = flattenEntries(entries);

    return JSON.stringify({
      type: 'find-results', // Use same type for consistent rendering
      pattern: '*',
      path: displayPath,
      totalFiles: files.length,
      files
    });
  }

  private processDirectoryEntries(
    entries: any[], 
    recursive: boolean, 
    maxDepth: number, 
    showHidden: boolean,
    currentDepth: number
  ): any[] {
    return entries
      .filter(entry => showHidden || !entry.name.startsWith('.'))
      .map(entry => {
        const processed: any = {
          name: entry.name,
          path: entry.path,
          is_dir: entry.is_dir
        };
        
        if (recursive && entry.is_dir && currentDepth < maxDepth && entry.children) {
          processed.children = this.processDirectoryEntries(
            entry.children,
            recursive,
            maxDepth,
            showHidden,
            currentDepth + 1
          );
        }
        
        return processed;
      })
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  private countEntries(entries: any[]): number {
    let count = entries.length;
    for (const entry of entries) {
      if (entry.children) {
        count += this.countEntries(entry.children);
      }
    }
    return count;
  }

  private patternToRegex(pattern: string): string {
    // Convert glob pattern to regex
    return pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  }
}
