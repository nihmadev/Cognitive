import { tauriApi, SearchOptions, SearchResult } from '../../../lib/tauri-api';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  formatted?: string;
}


const BLOCKED_PATH_PATTERNS = [
  /\.\./, 
  /^\/etc\//,
  /^\/var\//,
  /^\/root\//,
  /^\/proc\//,
  /^\/sys\//,
  /^\/dev\//,
  /^\/boot\//,
  /^\/bin\//,
  /^\/sbin\//,
  /^\/lib\//,
  /^~\/\.\w+/i, 
];

const ALLOWED_ABSOLUTE_PREFIXES = ['/home', '/usr', '/tmp', '/Users'];


function sanitizePath(filePath: string, workspace: string): { valid: boolean; path: string; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, path: '', error: 'Invalid path: path must be a non-empty string' };
  }

  let cleanPath = filePath.trim();

  
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(cleanPath)) {
      return { valid: false, path: '', error: `Access denied: path contains blocked pattern` };
    }
  }

  
  cleanPath = cleanPath.replace(/\/+/g, '/');

  
  if (cleanPath.startsWith('/')) {
    const isAllowedAbsolute = ALLOWED_ABSOLUTE_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
    if (!isAllowedAbsolute) {
      cleanPath = cleanPath.substring(1);
    }
  }

  
  const fullPath = cleanPath.startsWith('/') ? cleanPath : `${workspace}/${cleanPath}`;

  
  const normalizedPath = normalizePath(fullPath);

  
  const isWithinWorkspace = normalizedPath.startsWith(workspace);
  const isAllowedAbsolute = ALLOWED_ABSOLUTE_PREFIXES.some(prefix => normalizedPath.startsWith(prefix));

  if (!isWithinWorkspace && !isAllowedAbsolute) {
    return { valid: false, path: '', error: 'Access denied: path is outside allowed directories' };
  }

  return { valid: true, path: normalizedPath };
}


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


export class ToolExecutor {
  private workspace: string;
  private toolHandlers: Map<string, ToolHandler>;

  constructor(workspace: string) {
    this.workspace = workspace;
    this.toolHandlers = this.createToolHandlers();
  }

  
  private createToolHandlers(): Map<string, ToolHandler> {
    const handlers = new Map<string, ToolHandler>();

    
    handlers.set('grep', (args) => this.grep(args as GrepOptions));
    handlers.set('search', (args) => this.grep(args as GrepOptions));
    handlers.set('grep_search', (args) => this.grep(args as GrepOptions));

    
    handlers.set('find', (args) => this.findByName(args as FindOptions));
    handlers.set('find_by_name', (args) => this.findByName(args as FindOptions));

    
    handlers.set('list_dir', (args) => this.listDir(args as ListDirOptions));
    handlers.set('ls', (args) => this.listDir(args as ListDirOptions));

    
    handlers.set('read_file', (args) => this.readFile(args.path || args.file_path || args.FilePath));
    handlers.set('file_info', (args) => this.getFileInfo(args.path || args.file_path || args.FilePath));

    return handlers;
  }

  
  registerTool(name: string, handler: ToolHandler): void {
    this.toolHandlers.set(name.toLowerCase(), handler);
  }

  
  getAvailableTools(): string[] {
    return Array.from(this.toolHandlers.keys());
  }

  
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

  
  
  async grep(options: GrepOptions): Promise<ToolResult> {
    
    const {
      query: _query,
      path: _path,
      caseSensitive: _caseSensitive,
      wholeWord: _wholeWord,
      regex: _regex,
      includePattern: _includePattern,
      excludePattern: _excludePattern,
      maxResults: _maxResults
    } = options;

    
    const query = _query || (options as any).Query || '';
    const path = _path || (options as any).Path || (options as any).SearchPath || this.workspace;
    const caseSensitive = _caseSensitive ?? (options as any).CaseSensitive ?? false;
    const wholeWord = _wholeWord ?? (options as any).WholeWord ?? false;
    const regex = _regex ?? (options as any).Regex ?? (options as any).FixedStrings === false ?? false;
    const includePattern = _includePattern || (options as any).Includes || (options as any).include || '';
    const excludePattern = _excludePattern || (options as any).Excludes || (options as any).exclude || '';
    const maxResults = _maxResults || (options as any).MaxResults || 100;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return { success: false, error: 'Query is required' };
    }

    
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

  
  async findByName(options: FindOptions): Promise<ToolResult> {
    const {
      pattern: _pattern,
      path: _path,
      type: _type,
      maxDepth: _maxDepth,
      maxResults: _maxResults
    } = options;

    const pattern = _pattern || (options as any).Pattern;
    const path = _path || (options as any).Path || (options as any).SearchDirectory || this.workspace;
    const type = (_type || (options as any).Type || 'all').toLowerCase();
    const maxDepth = _maxDepth || (options as any).MaxDepth || 10;
    const maxResults = _maxResults || (options as any).MaxResults || 50;

    if (!pattern || pattern.trim() === '') {
      return { success: false, error: 'Pattern is required' };
    }

    
    const sanitized = sanitizePath(path, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }

    const rootPath = sanitized.path;

    
    const allFiles = await tauriApi.getAllFiles(rootPath);

    
    const regexPattern = this.patternToRegex(pattern);
    const regex = new RegExp(regexPattern, 'i');

    
    const matches: Array<{ name: string; path: string; isDir: boolean; depth: number }> = [];

    const processEntry = (entry: any, depth: number) => {
      if (depth > maxDepth || matches.length >= maxResults) return;

      const name = entry.name || '';
      const entryPath = entry.path || '';
      const isDir = entry.is_dir || false;

      
      if (type === 'file' && isDir) return;
      if (type === 'dir' && !isDir) return;

      
      if (regex.test(name)) {
        matches.push({
          name,
          path: entryPath,
          isDir,
          depth
        });
      }

      
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

  
  async listDir(options: ListDirOptions): Promise<ToolResult> {
    const {
      path: _path,
      recursive = false,
      maxDepth = 3,
      showHidden = false
    } = options;

    const path = _path || (options as any).DirectoryPath || (options as any).Path || this.workspace;

    
    const sanitized = sanitizePath(path, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }

    const fullPath = sanitized.path;

    const entries = await tauriApi.readDir(fullPath);

    
    const processedEntries = this.processDirectoryEntries(
      entries,
      recursive,
      maxDepth,
      showHidden,
      0
    );

    
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

  
  async readFile(filePath: string): Promise<ToolResult> {
    
    const sanitized = sanitizePath(filePath, this.workspace);
    if (!sanitized.valid) {
      return { success: false, error: sanitized.error };
    }

    const fullPath = sanitized.path;

    try {
      const content = await tauriApi.readFile(fullPath);
      const lines = content.split('\n');

      
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

  
  async getFileInfo(filePath: string): Promise<ToolResult> {
    
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
      type: 'find-results', 
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
