import { ArrowLeft, X, Eye, Search, FolderOpen, FileText, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { AIInput } from './AIInput';
import { ThinkingAnimation } from './ThinkingAnimation';
import { getFileIcon } from '../../../utils/fileIcons';
import { useProjectStore } from '../../../store/projectStore';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface SearchResultFile {
  name: string;
  path: string;
  fullPath: string;
  matchCount?: number;
  isDir?: boolean;
  matches?: Array<{ line: number; text: string }>;
}

interface SearchResultData {
  type: 'search-results' | 'find-results';
  query?: string;
  pattern?: string;
  path: string;
  totalFiles: number;
  totalMatches?: number;
  files: SearchResultFile[];
}


type ContentPart = 
  | { type: 'text'; content: string }
  | { type: 'file-read'; content: string; filename: string }
  | { type: 'tool-result'; content: string; tool: string; isError: boolean }
  | { type: 'search-result'; data: SearchResultData };


const tryParseSearchResult = (content: string): SearchResultData | null => {
  try {
    const data = JSON.parse(content);
    if (data.type === 'search-results' || data.type === 'find-results') {
      return data as SearchResultData;
    }
  } catch {
    
  }
  return null;
};



const parseMessageContent = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  
  
  const combinedMarkerRegex = /\[\[TOOL_(RESULT|ERROR):(\w+):([\s\S]*?)\]\]|(?:📊|❌)\s*\*\*(\w+)\s*(result|error):\*\*\n([\s\S]*?)(?=(?:📊|❌)\s*\*\*|\[\[TOOL_|$)|\[\[(READ_FILE|READ):([^\]]+)\]\]/g;
  
  
  
  const toolCallRemoveRegex = /```[\s\S]*?(?:grep|find|list_dir|search|read_file)\s*\([^)]*\)[\s\S]*?```|\b(grep|Grep|search|find|find_by_name|list_dir|ls|read_file|readFile)\s*\(\s*(?:{[\s\S]*?}|"[^"]*"|'[^']*'|[^)]*)\s*\)|\[\[(GREP|FIND|LIST_DIR|SEARCH):[^\]]+\]\]|`(?:grep|find|list_dir|search|read_file)\s*\([^`]*\)`|```\s*```|```\s+```|\{\s*"tool"\s*:\s*"(?:grep|find_by_name|list_dir|read_file|readFile|find|search)"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}|\n\s*\{\s*"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\}\s*\n/gi;
  
  
  const toolResults: Array<{ tool: string; isError: boolean; content: string }> = [];
  const fileReads: string[] = [];
  let match;
  
  while ((match = combinedMarkerRegex.exec(content)) !== null) {
    if (match[1]) {
      
      toolResults.push({
        tool: match[2],
        isError: match[1] === 'ERROR',
        content: match[3].trim()
      });
    } else if (match[4]) {
      
      toolResults.push({
        tool: match[4],
        isError: match[5] === 'error',
        content: match[6].trim()
      });
    } else if (match[7]) {
      
      fileReads.push(match[8].trim());
    }
  }
  
  
  let processedContent = content
    .replace(combinedMarkerRegex, '')
    .replace(toolCallRemoveRegex, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/---\s*\n\s*---/g, '---')
    .trim();
  
  
  
  
  for (const filename of fileReads) {
    parts.push({ type: 'file-read', content: '', filename });
  }
  
  
  for (const tr of toolResults) {
    const searchData = tryParseSearchResult(tr.content);
    if (searchData) {
      parts.push({ type: 'search-result', data: searchData });
    } else {
      parts.push({ 
        type: 'tool-result', 
        content: tr.content,
        tool: tr.tool,
        isError: tr.isError
      });
    }
  }
  
  
  if (processedContent && processedContent !== '---') {
    parts.push({ type: 'text', content: processedContent });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: content }];
};


const FileReadIndicator = ({ filename, styles }: { filename: string; styles: any }) => {
  const { openFile, currentWorkspace } = useProjectStore();
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
    <div className={styles.fileReadIndicator}>
      <Eye size={14} className={styles.fileReadIcon} />
      <span className={styles.fileReadLabel}>Read file(s)</span>
      <span className={styles.fileReadFilename} onClick={handleClick}>
        <span className={styles.fileReadFileIcon}>{getFileIcon(baseName, filename)}</span>
        {baseName}
      </span>
    </div>
  );
};


const SearchResultsBlock = ({ data, styles }: { data: SearchResultData; styles: any }) => {
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
    <div className={styles.searchResultsBlock}>
      <div 
        className={styles.searchResultsHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className={styles.searchResultsTitle}>
          {headerText}
        </span>
        <span className={styles.searchResultsCount}>({count})</span>
      </div>
      
      {isExpanded && (
        <div className={styles.searchResultsList}>
          {data.files.map((file, index) => (
            <div 
              key={index} 
              className={`${styles.searchResultItem} ${file.isDir ? styles.searchResultItemDir : ''}`}
              onClick={() => handleFileClick(file)}
            >
              <span className={styles.searchResultIcon}>
                {getFileIcon(file.name, file.path)}
              </span>
              <span className={`${styles.searchResultPath} ${file.isDir ? styles.searchResultPathDir : ''}`}>
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


const ToolResultBlock = ({ tool, content, isError, styles }: { 
  tool: string; 
  content: string; 
  isError: boolean;
  styles: any;
}) => {
  const { openFile, currentWorkspace } = useProjectStore();
  
  const getToolIcon = () => {
    switch (tool.toLowerCase()) {
      case 'grep':
      case 'search':
        return <Search size={16} />;
      case 'find_by_name':
      case 'find':
        return <FolderOpen size={16} />;
      case 'list_dir':
      case 'ls':
        return <FolderOpen size={16} />;
      case 'read_file':
        return <FileText size={16} />;
      default:
        return isError ? <XCircle size={16} /> : <CheckCircle size={16} />;
    }
  };
  
  
  const parseFilePath = () => {
    
    const fileMatch = content.match(/📄\s*([^\s(]+)\s*\((\d+)\s*lines?\)/);
    if (fileMatch) {
      return {
        path: fileMatch[1],
        lines: parseInt(fileMatch[2])
      };
    }
    return null;
  };
  
  const getToolLabel = () => {
    switch (tool.toLowerCase()) {
      case 'grep':
      case 'search':
        return 'Search Results';
      case 'find_by_name':
      case 'find':
        return 'Found Files';
      case 'list_dir':
      case 'ls':
        return 'Directory Contents';
      case 'read_file':
        return 'Read file';
      default:
        return isError ? 'Error' : 'Result';
    }
  };
  
  
  if (tool.toLowerCase() === 'read_file' && !isError) {
    const fileInfo = parseFilePath();
    const filePath = fileInfo?.path || '';
    const fileName = filePath.split('/').pop() || filePath;
    
    const handleFileClick = () => {
      const fullPath = filePath.startsWith('/') 
        ? filePath 
        : currentWorkspace 
          ? `${currentWorkspace}/${filePath}` 
          : filePath;
      openFile(fullPath);
    };
    
    return (
      <div className={styles.fileReadIndicator}>
        <Eye size={14} className={styles.fileReadIcon} />
        <span className={styles.fileReadLabel}>Read file</span>
        <span className={styles.fileReadFilename} onClick={handleFileClick}>
          <span className={styles.fileReadFileIcon}>{getFileIcon(fileName, filePath)}</span>
          {filePath}
        </span>
        {fileInfo?.lines && (
          <span style={{ opacity: 0.6, marginLeft: 8, fontSize: '12px' }}>
            ({fileInfo.lines} lines)
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className={`${styles.toolResultBlock} ${isError ? styles.toolError : ''}`}>
      <div className={styles.toolResultHeader}>
        <span className={styles.toolResultIcon}>{getToolIcon()}</span>
        <span className={styles.toolResultTitle}>{getToolLabel()}</span>
      </div>
      <div className={styles.toolResultContent}>
        {content}
      </div>
    </div>
  );
};

interface ChatViewProps {
  activeConversation: any;
  inputValue: string;
  setInputValue: (value: string) => void;
  activeMode: 'responder' | 'agent';
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  isModeDropdownOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setMode: (mode: 'responder' | 'agent') => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setIsModeDropdownOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  modeDropdownRef: React.RefObject<HTMLDivElement>;
  extendedModeDropdownRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  styles: any;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeConversation,
  inputValue,
  setInputValue,
  activeMode,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  isModeDropdownOpen,
  availableModels,
  getModelStatus,
  setModel,
  setMode,
  setIsModelDropdownOpen,
  setIsModeDropdownOpen,
  setAssistantOpen,
  setActiveConversation,
  onSend,
  onStop,
  onKeyDown,
  textareaRef,
  messagesEndRef,
  dropdownRef,
  modeDropdownRef,
  extendedModeDropdownRef,
  isLoading,
  styles
}) => {
  const goBack = () => {
    setActiveConversation(null);
  };

  return (
    <div className={`${styles.container} ${styles.chatContainer}`}>
      <div className={styles.chatHeader}>
        <button onClick={goBack} className={styles.backBtn}>
          <ArrowLeft size={16} />
        </button>
        <button onClick={() => setAssistantOpen(false)} className={styles.closeBtn} title="Close Chat">
          <X size={16} />
        </button>
      </div>

      {}
      <div className={styles.chatMessages}>
        {activeConversation?.messages?.map((msg: any, index: number) => (
          <div key={msg.id}>
            {(index === 0 || index === 1) && msg.role === 'user' ? (
              index === 0 ? (
                <div className={styles.firstUserMessage}>
                  <p>{msg.content}</p>
                </div>
              ) : (
                <div 
                  className={styles.userMessageWrapper}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '70%',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '0 20px'
                  }}
                >
                  <div className={styles.secondUserMessage}>
                    <p>{msg.content}</p>
                  </div>
                </div>
              )
            ) : (
              <div className={msg.role === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper}>
                {msg.role === 'user' ? (
                  <div className={styles.userBubble}>
                    <p>{msg.content}</p>
                  </div>
                ) : msg.content.trim() ? (
                  <div className={styles.aiContent}>
                    {parseMessageContent(msg.content).map((part, partIndex) => {
                      if (part.type === 'file-read') {
                        return <FileReadIndicator key={partIndex} filename={part.filename} styles={styles} />;
                      }
                      if (part.type === 'search-result') {
                        return <SearchResultsBlock key={partIndex} data={part.data} styles={styles} />;
                      }
                      if (part.type === 'tool-result') {
                        return <ToolResultBlock key={partIndex} tool={part.tool} content={part.content} isError={part.isError} styles={styles} />;
                      }
                      return (
                        <div key={partIndex} className={styles.markdownContent}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ className, children, ...props }) => {
                                const isInline = !className;
                                return isInline ? (
                                  <code className={styles.inlineCode} {...props}>{children}</code>
                                ) : (
                                  <code className={className} {...props}>{children}</code>
                                );
                              },
                              pre: ({ children }) => (
                                <pre className={styles.codeBlock}>{children}</pre>
                              ),
                              p: ({ children }) => (
                                <p className={styles.paragraph}>{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className={styles.list}>{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className={styles.orderedList}>{children}</ol>
                              ),
                              li: ({ children }) => (
                                <li className={styles.listItem}>{children}</li>
                              ),
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{children}</a>
                              ),
                              strong: ({ children }) => (
                                <strong className={styles.bold}>{children}</strong>
                              ),
                              em: ({ children }) => (
                                <em className={styles.italic}>{children}</em>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className={styles.blockquote}>{children}</blockquote>
                              ),
                              h1: ({ children }) => <h3 className={styles.heading}>{children}</h3>,
                              h2: ({ children }) => <h4 className={styles.heading}>{children}</h4>,
                              h3: ({ children }) => <h5 className={styles.heading}>{children}</h5>,
                            }}
                          >
                            {part.content}
                          </ReactMarkdown>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
        {isLoading && <ThinkingAnimation styles={styles} />}
        <div ref={messagesEndRef} />
      </div>

      <AIInput
        variant="chat"
        inputValue={inputValue}
        setInputValue={setInputValue}
        activeMode={activeMode}
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        isModeDropdownOpen={isModeDropdownOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setMode={setMode}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        setIsModeDropdownOpen={setIsModeDropdownOpen}
        onSend={onSend}
        onStop={onStop}
        onKeyDown={onKeyDown}
        textareaRef={textareaRef}
        dropdownRef={dropdownRef}
        modeDropdownRef={modeDropdownRef}
        extendedModeDropdownRef={extendedModeDropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
    </div>
  );
};
