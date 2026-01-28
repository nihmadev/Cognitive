import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  ListTodo, 
  ChevronRight, 
  Loader2, 
  ChevronDown, 
  Check, 
  X, 
  FileText, 
  Folder, 
  Search, 
  Eye,
  Glasses,
  XCircle
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getFileIcon, getFolderIcon } from "../../../utils/fileIcons";
import { useAIStore, ToolCall } from "../../../store/aiStore";
import { useProjectStore } from "../../../store/projectStore";
import styles from "./AgentComponents.module.css";

// Helper for conditional classes
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

export const FileReadIndicator = ({ filename }: { filename: string }) => {
  const openFile = useProjectStore(state => state.openFile);
  const currentWorkspace = useProjectStore(state => state.currentWorkspace);
  const baseName = filename.split(/[\\/]/).pop() || filename;

  const handleClick = () => {
    const fullPath = filename.startsWith('/')
      ? filename
      : currentWorkspace
        ? `${currentWorkspace}/${filename}`
        : filename;
    openFile(fullPath);
  };

  return (
    <div className={styles.fileReadIndicator} onClick={handleClick}>
      <Glasses size={14} style={{ color: 'var(--theme-foreground)', flexShrink: 0 }} />
      <span className={styles.fileReadFilename}>
        {baseName}
      </span>
    </div>
  );
};

export const ListDirIndicator = ({ path }: { path: string }) => {
  // Extract folder name from path
  const folderName = path === '.' ? 'root' : path.split(/[/\\]/).filter(Boolean).pop() || 'folder';
  
  return (
    <div className={styles.listDirIndicator}>
      <span className={styles.listDirLabel}>Analyzed</span>
      <div className={styles.listDirIcon}>
        {getFolderIcon(folderName, false, path)}
      </div>
      <span className={styles.listDirPath}>
        {path}
      </span>
    </div>
  );
};

// Глобальное хранилище для отслеживания полностью анимированных думаний
const animatedThinkingBlocks = new Set<string>();

// Простая хеш-функция для создания уникального ключа из контента
const createThinkingKey = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Очистка хранилища если слишком много думаний (чтобы избежать утечки памяти)
const cleanupAnimatedBlocks = () => {
  if (animatedThinkingBlocks.size > 100) {
    const entries = Array.from(animatedThinkingBlocks);
    // Оставляем только последние 50 думаний
    const toKeep = entries.slice(-50);
    animatedThinkingBlocks.clear();
    toKeep.forEach(key => animatedThinkingBlocks.add(key));
  }
};

export const ThinkingBlock = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedContent, setDisplayedContent] = useState("");
  
  // Создаем уникальный ключ для этого думанья на основе его контента
  const thinkingKey = createThinkingKey(content);

  useEffect(() => {
    if (!content) {
      setDisplayedContent("");
      return;
    }

    // Если блок не развернут, мы не обновляем displayedContent, 
    // чтобы при открытии анимация началась с того места, где остановилась (или с 0)
    if (!isExpanded) {
      return;
    }

    // Если это думанье уже было полностью анимировано ранее, показываем полный контент сразу
    if (animatedThinkingBlocks.has(thinkingKey)) {
      setDisplayedContent(content);
      return;
    }

    // Если контент стал короче (например, новая сессия), сбрасываем отображение
    if (content.length < displayedContent.length) {
      setDisplayedContent(content);
      return;
    }

    // Эффект печати: постепенно догоняем основной контент
    if (displayedContent.length < content.length) {
      const timer = setTimeout(() => {
        const diff = content.length - displayedContent.length;
        // Уменьшили скорость: теперь добавляем меньше символов за раз
        const charsToAdd = diff > 100 ? Math.ceil(diff / 10) : (diff > 50 ? 2 : 1);
        
        const newDisplayedContent = content.substring(0, displayedContent.length + charsToAdd);
        setDisplayedContent(newDisplayedContent);
        
        // Если контент полностью отображен, добавляем в хранилище анимированных думаний
        if (newDisplayedContent.length === content.length) {
          cleanupAnimatedBlocks(); // Очищаем старые записи перед добавлением новой
          animatedThinkingBlocks.add(thinkingKey);
        }
      }, 25); // Увеличили задержку для более спокойной печати
      
      return () => clearTimeout(timer);
    }
  }, [content, displayedContent, isExpanded, thinkingKey]);

  return (
    <div className={cn(styles.thinkingBlock, isExpanded && styles.thinkingBlockExpanded, isExpanded && styles.expanded)}>
      <div 
        className={styles.thinkingHeader} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.thinkingTitle}>
          {isExpanded ? <ChevronDown size={14} className={styles.thinkingIcon} /> : <ChevronRight size={14} className={styles.thinkingIcon} />}
          <span>Thought</span>
        </div>
      </div>
      {isExpanded && (
        <div className={styles.thinkingContent}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayedContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export interface SearchResultFile {
  name: string;
  path: string;
  fullPath: string;
  matchCount?: number;
  isDir?: boolean;
  matches?: Array<{ line: number; text: string }>;
}

export interface SearchResultData {
  type: 'search-results' | 'find-results';
  query?: string;
  pattern?: string;
  path: string;
  totalFiles: number;
  totalMatches?: number;
  files: SearchResultFile[];
}

export const SearchResultsBlock = ({ data }: { data: SearchResultData }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { openFile } = useProjectStore();

  const isSearch = data.type === 'search-results';
  const headerText = isSearch
    ? `Searched ${data.query || '*'} in ${data.path}`
    : `Searched ${data.pattern || '*'} in ${data.path}`;
  const count = isSearch ? data.totalMatches || data.totalFiles : data.totalFiles;

  const handleFileClick = (file: SearchResultFile) => {
    openFile(file.fullPath);
  };

  return (
    <div className={cn(styles.searchResultsBlock, isExpanded && styles.expanded)}>
      <div
        className={styles.searchResultsHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <div className={styles.icon}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <span className={styles.searchResultsTitle}>
            <Search size={13} style={{ marginRight: 4 }} />
            {headerText}
          </span>
        </div>
        <span className={styles.searchResultMatchCount}>{count}</span>
      </div>

      {isExpanded && (
        <div className={cn(styles.searchResultsList, !isExpanded && styles.collapsed)}>
          {data.files.map((file, index) => (
            <div
              key={index}
              className={styles.searchResultItem}
              onClick={() => handleFileClick(file)}
            >
              <div className={styles.icon} style={{ width: 16 }}>
                {getFileIcon(file.name)}
              </div>
              <span className={styles.searchResultPath}>
                {file.path}
              </span>
              {file.matchCount && file.matchCount > 1 && (
                <span className={styles.searchResultMatchCount}>
                  {file.matchCount}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ToolResultBlock = ({ tool, content, isError }: {
  tool: string;
  content: string;
  isError: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolIcon = () => {
    switch (tool.toLowerCase()) {
      case 'grep':
      case 'search':
      case 'search_files':
        return <Search size={14} className={styles.toolResultIcon} />;
      case 'find_by_name':
      case 'find':
      case 'list_dir':
      case 'ls':
        return <Folder size={14} className={styles.toolResultIcon} />;
      case 'read_file':
        return <FileText size={14} className={styles.toolResultIcon} />;
      default:
        return isError 
          ? <XCircle size={14} className={styles.toolResultIcon} /> 
          : <Check size={14} className={styles.toolResultIcon} />;
    }
  };

  const getToolLabel = () => {
    switch (tool.toLowerCase()) {
      case 'grep':
      case 'search':
      case 'search_files':
        return 'Search';
      case 'find_by_name':
      case 'find':
        return 'Find';
      case 'list_dir':
      case 'ls':
        return 'List';
      case 'read_file':
        return 'Read';
      default:
        return isError ? 'Error' : 'Result';
    }
  };

  const truncatedContent = content.length > 300 && !isExpanded 
    ? content.substring(0, 300) + '...' 
    : content;

  return (
    <div className={cn(styles.toolResultBlock, isError && styles.toolError, isExpanded && styles.expanded)}>
      <div 
        className={styles.toolResultHeader} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {getToolIcon()}
        <span className={styles.toolResultTitle}>{getToolLabel()}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      
      {(isExpanded || tool.toLowerCase() !== 'read_file') && (
        <div className={styles.toolResultContent}>
          {truncatedContent}
          {content.length > 300 && (
            <div 
              style={{ 
                marginTop: 8, 
                color: 'var(--theme-accent)', 
                fontSize: '11px', 
                cursor: 'pointer',
                fontWeight: 600 
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? 'SHOW LESS' : 'SHOW MORE'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TodoComponent = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const todos = useAIStore(state => state.todos);
  const refreshTodos = useAIStore(state => state.refreshTodos);

  useEffect(() => {
    refreshTodos();
    const interval = setInterval(refreshTodos, 3000);
    return () => clearInterval(interval);
  }, [refreshTodos]);

  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;
  const headerText = `${completedCount}/${totalCount} Done`;

  const renderIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={14} className={styles.icon + " " + styles.success} />;
      case 'in_progress':
        return <Loader2 size={14} className={styles.spinnerIcon} />;
      case 'pending':
        return <Circle size={14} className={styles.icon} />;
      default:
        return <Circle size={14} className={styles.icon} />;
    }
  };

  if (todos.length === 0) {
    return (
      <div className={styles.todoList}>
        <div className={styles.cardHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className={styles.cardTitle}>
            <ListTodo size={14} className={styles.icon} />
            <span>0/0 Done</span>
          </div>
          <div className={styles.collapseIcon}>
            {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
          </div>
        </div>

        <div className={cn(styles.todoItemsContainer, isCollapsed && styles.collapsed)}>
          <div className={styles.todoItems}>
            <div className={styles.emptyTodos}>No tasks tracked.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.todoList}>
      <div className={styles.cardHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className={styles.cardTitle}>
          <ListTodo size={14} className={styles.icon} />
          <span>{headerText}</span>
        </div>
        <div className={styles.collapseIcon}>
          {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
        </div>
      </div>

      <div className={cn(styles.todoItemsContainer, isCollapsed && styles.collapsed)}>
        <div className={styles.todoItems}>
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(styles.todoItem, todo.status === 'completed' && styles.completed)}
            >
              <span className={styles.todoCheckbox}>
                {renderIcon(todo.status)}
              </span>
              <span className={styles.todoText}>
                {todo.text}
              </span>
            </div>
          ))}
          {todos.length === 0 && (
            <div className={styles.emptyTodos}>No tasks tracked.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SearchComponent = ({ toolCalls }: { toolCalls?: ToolCall[] }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeToolCalls = useAIStore(state => state.activeToolCalls);
  const openFile = useProjectStore(state => state.openFile);
  const currentWorkspace = useProjectStore(state => state.currentWorkspace);

  const displayToolCalls = toolCalls || activeToolCalls;

  // Get search tool calls from tool calls
  const searchToolCalls = displayToolCalls.filter(tc => 
    tc.name === 'search_files' || tc.name === 'grep' || tc.name === 'search_codebase' || tc.name === 'index_codebase'
  );

  if (searchToolCalls.length === 0) {
    return null;
  }

  const getHeader = () => {
    if (searchToolCalls.length === 1) {
      const firstCall = searchToolCalls[0];
      const toolName = firstCall.name;
      const params = firstCall.parameters || {};
      
      if (toolName === 'search_codebase' || toolName === 'search_files' || toolName === 'grep') {
        const query = params.query || params.pattern || '';
        // Считаем только непустые параметры
        const paramCount = Object.entries(params).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        ).length;
        const countText = paramCount > 1 ? ` [${paramCount} query]` : '';
        
        // Упрощенная логика - только два варианта заголовка
        let toolLabel = toolName === 'search_codebase' ? 'Search in codebase' : 'Search';
        
        return (
          <>
            {toolLabel}
            {query && (
              <span style={{ 
                opacity: 0.6,
                color: 'var(--theme-foreground-muted)'
              }}>
                {' '}{query}{countText}
              </span>
            )}
          </>
        );
      }
      if (toolName === 'index_codebase') return `Indexing codebase`;
      return `Search results`;
    } else {
      // Для нескольких поисковых вызовов
      return `Search results (${searchToolCalls.length})`;
    }
  };

  const getSearchResults = (toolCall: ToolCall) => {
    if (!toolCall.result) return null;
    
    try {
      return JSON.parse(toolCall.result);
    } catch {
      return null;
    }
  };

  const handleFileClick = (filePath: string) => {
    const fullPath = filePath.startsWith('/')
      ? filePath
      : currentWorkspace
        ? `${currentWorkspace}/${filePath}`
        : filePath;
    openFile(fullPath);
  };

  return (
    <div className={cn(styles.searchResultsBlock, isExpanded && styles.expanded)}>
      <div className={styles.searchResultsHeader} onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <div 
            className={styles.icon} 
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <span className={styles.cardTitle} style={{ gap: 4 }}>
            {getHeader()}
            {searchToolCalls.some(tc => tc.status === 'executing' || tc.status === 'pending') && (
              <Loader2 size={12} className={styles.spinnerIcon} />
            )}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.searchResultsList}>
          {searchToolCalls.map((toolCall, index) => {
            const searchResults = getSearchResults(toolCall);
            
            return (
              <div key={toolCall.id}>
                  {searchResults && Array.isArray(searchResults) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {searchResults.slice(0, 10).map((result: any, resultIndex: number) => {
                      const filePath = result.file_path || (result.file && result.file.path) || result.path || result.name;
                      const matchCount = Array.isArray(result.matches) ? result.matches.length : result.matches;

                      return (
                        <div 
                          key={resultIndex} 
                          className={styles.searchResultItem}
                          onClick={() => handleFileClick(filePath)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={styles.icon} style={{ width: 14 }}>
                            {getFileIcon(filePath)}
                          </div>
                          <span className={styles.searchResultPath} title={filePath} style={{ color: 'var(--theme-foreground)', opacity: 0.8 }}>
                            {filePath}
                          </span>
                          {result.start_line && (
                            <span className={styles.searchResultMatchCount} style={{ fontSize: '10px', opacity: 0.5 }}>
                              L{result.start_line}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {searchResults.length > 10 && (
                      <div className={styles.searchResultItem} style={{ color: 'var(--theme-foreground-muted)', fontStyle: 'italic', fontSize: '11px', paddingLeft: 22 }}>
                        + {searchResults.length - 10} more matches...
                      </div>
                    )}
                  </div>
                )}

                {toolCall.error && (
                  <div style={{ color: 'var(--error)', fontSize: '12px', opacity: 0.8 }}>
                    {toolCall.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ReadComponent = ({ toolCalls }: { toolCalls?: ToolCall[] }) => {
  const activeToolCalls = useAIStore(state => state.activeToolCalls);
  const openFile = useProjectStore(state => state.openFile);
  const currentWorkspace = useProjectStore(state => state.currentWorkspace);

  const displayToolCalls = toolCalls || activeToolCalls;
  const readToolCalls = displayToolCalls.filter(tc => tc.name === 'read_file');

  if (readToolCalls.length === 0) return null;

  const handleFileClick = (filename: string) => {
    const fullPath = filename.startsWith('/')
      ? filename
      : currentWorkspace
        ? `${currentWorkspace}/${filename}`
        : filename;
    openFile(fullPath);
  };

  return (
    <div className={styles.searchResultsList} style={{ padding: 0, gap: 0, marginLeft: 0 }}>
      {readToolCalls.map((toolCall) => {
        const filePath = toolCall.parameters.path || 'Unknown file';
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        const isExecuting = toolCall.status === 'executing' || toolCall.status === 'pending';
        
        return (
          <div 
            key={toolCall.id} 
            className={styles.fileReadIndicator}
            onClick={() => handleFileClick(filePath)}
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: 0
            }}
          >
            <Eye size={14} style={{ color: 'var(--theme-foreground)', flexShrink: 0 }} />
            <div className={styles.fileReadIcon} style={{ display: 'flex', alignItems: 'center' }}>
              {isExecuting ? (
                <Loader2 size={14} className={styles.spinnerIcon} />
              ) : (
                getFileIcon(fileName)
              )}
            </div>
            <span className={styles.fileReadFilename} style={{ fontSize: '13px', opacity: 0.9 }}>
              {filePath}
            </span>
            {(toolCall.parameters.start_line || toolCall.parameters.end_line) && (
              <span style={{ 
                marginLeft: '4px', 
                color: 'var(--theme-foreground-muted)', 
                fontSize: '11px',
                fontFamily: 'Segoe UI',
                opacity: 0.5
              }}>
                #L{toolCall.parameters.start_line || 1}{toolCall.parameters.end_line ? `-${toolCall.parameters.end_line}` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ListDirComponent = ({ toolCalls }: { toolCalls?: ToolCall[] }) => {
  const activeToolCalls = useAIStore(state => state.activeToolCalls);
  const displayToolCalls = toolCalls || activeToolCalls;

  // Get list_dir tool calls
  const listToolCalls = displayToolCalls.filter(tc => tc.name === 'list_dir');

  if (listToolCalls.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {listToolCalls.map((toolCall) => (
        <ListDirIndicator key={toolCall.id} path={toolCall.parameters.path || toolCall.parameters.directory || '.'} />
      ))}
    </div>
  );
};

export const ToolComponent = ({ toolCalls }: { toolCalls?: ToolCall[] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeToolCalls = useAIStore(state => state.activeToolCalls);
  
  const displayToolCalls = toolCalls || activeToolCalls;

  const getToolIcon = (toolName: string) => {
    switch (toolName.toLowerCase()) {
      case 'read_file':
        return <FileText size={16} />;
      case 'search_files':
      case 'grep':
        return <Search size={16} />;
      case 'list_dir':
      case 'ls':
        return <Folder size={16} />;
      case 'write_file':
        return <FileText size={16} />;
      case 'todo_add':
      case 'todo_list':
      case 'todo_complete':
        return <ListTodo size={16} />;
      default:
        return <Loader2 size={16} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Circle size={14} className={styles.icon} />;
      case 'executing':
        return <Loader2 size={14} className={styles.spinnerIcon} />;
      case 'completed':
        return <CheckCircle2 size={14} className={styles.icon + " " + styles.success} />;
      case 'error':
        return <XCircle size={14} className={styles.icon + " " + styles.error} />;
      default:
        return <Circle size={14} className={styles.icon} />;
    }
  };

  const getToolLabel = (toolName: string) => {
    switch (toolName.toLowerCase()) {
      case 'read_file':
        return 'Read File';
      case 'search_files':
        return 'Search Files';
      case 'grep':
        return 'Search';
      case 'list_dir':
        return 'List Directory';
      case 'write_file':
        return 'Write File';
      case 'todo_add':
        return 'Add Todo';
      case 'todo_list':
        return 'List Todos';
      case 'todo_complete':
        return 'Complete Todo';
      default:
        return toolName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatParameters = (parameters: Record<string, any>) => {
    const entries = Object.entries(parameters);
    if (entries.length === 0) return null;
    
    return (
      <div className={styles.toolParameters}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.toolParameter}>
            <span className={styles.parameterKey}>{key}:</span>
            <span className={styles.parameterValue}>
              {typeof value === 'string' && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : String(value)
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (displayToolCalls.length === 0) {
    return null;
  }

  const getHeader = () => {
    if (displayToolCalls.length === 1) {
      return getToolLabel(displayToolCalls[0].name);
    }
    return 'Tools';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {displayToolCalls.map((toolCall) => (
        <div key={toolCall.id} className={styles.toolExecutionIndicator} style={{ margin: '2px 0', padding: '4px 0' }}>
          <div className={styles.toolIcon} style={{ width: 14 }}>
            {getToolIcon(toolCall.name)}
          </div>
          <span className={styles.toolName} style={{ fontSize: '13px', color: 'var(--theme-foreground-muted)', fontWeight: 400 }}>
            {toolCall.name}
          </span>
          {toolCall.error && (
            <span style={{ color: 'var(--error)', fontSize: '12px', opacity: 0.8, marginLeft: 8 }}>
              {toolCall.error}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};



