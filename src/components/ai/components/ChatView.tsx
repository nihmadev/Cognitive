import { ArrowLeft, X, Eye, Search, FolderOpen, FileText, CheckCircle, XCircle, ChevronDown, ChevronRight, History, Settings, Copy, Check, RotateCcw } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import { AIInput } from './Input';
import { ThinkingAnimation } from './ThinkingAnimation';
import { getFileIcon, getFolderIcon } from '../../../utils/fileIcons';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
import { configureMonacoTypeScript } from '../../../lib/monaco-config';
import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileReadIndicator, 
  ListDirIndicator,
  SearchResultsBlock, 
  ToolResultBlock,
  TodoComponent, 
  SearchComponent, 
  ReadComponent, 
  ToolComponent,
  ThinkingBlock,
  SearchResultData,
  SearchResultFile,
  ListDirComponent
} from './AgentComponents';
import { HistoryModal } from '../History';


type ContentPart =
  | { type: 'text'; content: string }
  | { type: 'file-read'; content: string; filename: string }
  | { type: 'list-dir'; path: string }
  | { type: 'tool-result'; content: string; tool: string; isError: boolean }
  | { type: 'thinking'; content: string }
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


  const combinedMarkerRegex = /\[\[TOOL_(RESULT|ERROR):(\w+):([\s\S]*?)\]\]|(?:📊|❌)\s*\*\*(\w+)\s*(result|error):\*\*\n([\s\S]*?)(?=(?:📊|❌)\s*\*\*|\[\[TOOL_|$)|\[\[(READ_FILE|READ):([^\]]+)\]\]|\[\[(LIST_DIR):([^\]]+)\]\]|Tool execution results:\n([\s\S]*?)(?=(?:📊|❌)\s*\*\*|\[\[TOOL_|$)/g;



  const toolCallRemoveRegex = /<invoke\b[^>]*>[\s\S]*?<\/invoke>|<invoke\b[^>]*>[\s\S]*?$|<parameter\b[^>]*>[\s\S]*?<\/parameter>|<parameter\b[^>]*>[\s\S]*?$|<(read_file|search_files|search_codebase|grep|write_file|list_dir|todo_add|todo_list|todo_complete)\b[^>]*\/?>|```[\s\S]*?(?:grep|find|list_dir|search|read_file|write_file|search_codebase|index_codebase)\s*\([^)]*\)[\s\S]*?```|\{\s*"(?:tool|name)"\s*:\s*"[^"]+"\s*,\s*"(?:args|parameters)"\s*:\s*\{[\s\S]*?\}\s*\}|\[\[(GREP|FIND|LIST_DIR|SEARCH|SEARCH_CODEBASE|INDEX_CODEBASE):[^\]]+\]\]|```\s*```|```\s+```/gi;

  const toolResults: Array<{ tool: string; isError: boolean; content: string }> = [];
  const fileReads: string[] = [];
  const listDirs: string[] = [];
  const thinkingBlocks: string[] = [];
  let match;

  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/gi;
  let thoughtMatch;
  while ((thoughtMatch = thoughtRegex.exec(content)) !== null) {
    thinkingBlocks.push(thoughtMatch[1].trim());
  }

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
    } else if (match[9]) {
      listDirs.push(match[10].trim());
    } else if (match[11]) {
      // Handle the new "Tool execution results:" format
      toolResults.push({
        tool: 'Tool Results',
        isError: false,
        content: match[11].trim()
      });
    }
  }


  let processedContent = content
    .replace(combinedMarkerRegex, '')
    .replace(toolCallRemoveRegex, '')
    .replace(thoughtRegex, '')
    .replace(/<invoke\b[^>]*>[\s\S]*?<\/invoke>/gi, '')
    .replace(/<invoke\b[^>]*>[\s\S]*?$/gi, '')
    .replace(/<parameter\b[^>]*>[\s\S]*?<\/parameter>/gi, '')
    .replace(/<parameter\b[^>]*>[\s\S]*?$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/---\s*\n\s*---/g, '---')
    .trim();


  // Additional cleanup for any remaining XML-like tags that might have slipped through
  processedContent = processedContent.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, (match) => {
    const toolNames = ['read_file', 'search_files', 'search_codebase', 'grep', 'write_file', 'list_dir', 'todo_add', 'todo_list', 'todo_complete'];
    const lowerMatch = match.toLowerCase();
    if (lowerMatch.includes('invoke') || lowerMatch.includes('parameter') || toolNames.some(name => lowerMatch.includes(`<${name}`))) {
      return '';
    }
    return match;
  });

  processedContent = processedContent.replace(/<(read_file|search_files|search_codebase|grep|write_file|list_dir|todo_add|todo_list|todo_complete)\b[^>]*\/?>/gi, '');




  for (const filename of fileReads) {
    parts.push({ type: 'file-read', content: '', filename });
  }

  for (const path of listDirs) {
    parts.push({ type: 'list-dir', path });
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

  for (const thought of thinkingBlocks) {
    parts.push({ type: 'thinking', content: thought });
  }


  if (processedContent && processedContent !== '---') {
    parts.push({ type: 'text', content: processedContent });
  }

  return parts;
};


const LANGUAGE_MAP: Record<string, string> = {
  'ts': 'Typescript',
  'js': 'Javascript',
  'typescript': 'Typescript',
  'javascript': 'Javascript',
  'tsx': 'Typescript React',
  'jsx': 'Javascript React',
  'py': 'Python',
  'python': 'Python',
  'rs': 'Rust',
  'rust': 'Rust',
  'go': 'Go',
  'cpp': 'C++',
  'c++': 'C++',
  'cs': 'C#',
  'csharp': 'C#',
  'html': 'Html',
  'css': 'Css',
  'json': 'Json',
  'md': 'Markdown',
  'markdown': 'Markdown',
  'sh': 'Shell',
  'bash': 'Bash',
  'sql': 'Sql',
  'yaml': 'Yaml',
  'yml': 'Yaml',
  'rb': 'Ruby',
  'ruby': 'Ruby',
  'php': 'Php',
  'java': 'Java',
  'kt': 'Kotlin',
  'kotlin': 'Kotlin',
  'swift': 'Swift',
  'dart': 'Dart',
  'dockerfile': 'Dockerfile',
  'docker': 'Dockerfile',
  'makefile': 'Makefile',
  'xml': 'Xml',
  'toml': 'Toml',
  'lua': 'Lua',
  'powershell': 'Powershell',
  'ps1': 'Powershell',
  'scss': 'Scss',
  'sass': 'Sass',
  'less': 'Less',
  'stylus': 'Stylus',
  'coffee': 'Coffeescript',
  'perl': 'Perl',
  'r': 'R',
  'julia': 'Julia',
  'elixir': 'Elixir',
  'erlang': 'Erlang',
  'clojure': 'Clojure',
  'lisp': 'Lisp',
  'scheme': 'Scheme',
  'racket': 'Racket',
  'fsharp': 'F#',
  'fs': 'F#',
  'vb': 'Visual basic',
  'vba': 'Vba',
  'vbnet': 'Vb.net',
  'pascal': 'Pascal',
  'delphi': 'Delphi',
  'ada': 'Ada',
  'fortran': 'Fortran',
  'cobol': 'Cobol',
};

const formatLanguageName = (name: string): string => {
  if (!name) return '';
  const mapped = LANGUAGE_MAP[name.toLowerCase()];
  if (mapped) return mapped;
  
  // Default capitalization: First letter upper, rest lower
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const MarkdownCodeBlock = ({ className, children, styles }: { className?: string; children: any; styles: any }) => {
  const [copied, setCopied] = useState(false);
  const [editorHeight, setEditorHeight] = useState(60);
  const { theme } = useUIStore();
  const themesRegisteredRef = useRef(false);
  const monacoConfiguredRef = useRef(false);
  
  // Extract language from className (e.g., "language-javascript")
  const rawLanguage = className ? className.replace(/language-/, '') : '';
  
  // Check if it's a real language or just text
  const isRealLanguage = rawLanguage && !rawLanguage.includes(' ') && rawLanguage.length < 20;
  
  // Get formatted language name
  const languageName = isRealLanguage ? formatLanguageName(rawLanguage) : '';
  
  const handleCopy = useCallback(() => {
    const textToCopy = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const renderIcon = () => {
    if (!isRealLanguage) return null;
    
    // Use the raw language for icon lookup as it's more likely to match extension/languageId
    const icon = getFileIcon(`file.${rawLanguage.toLowerCase()}`);
    return (
      <span className={styles.codeBlockIcon}>
        {icon}
      </span>
    );
  };

  const codeValue = String(children).replace(/\n$/, '');
  const lineHeight = 19;
  const padding = 24; // top + bottom padding (12 + 12)

  const handleEditorDidMount = (editor: any) => {
    const updateHeight = () => {
      const contentHeight = editor.getContentHeight();
      setEditorHeight(contentHeight);
    };
    
    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
  };

  return (
    <div className={styles.codeBlockContainer}>
      <div className={styles.codeBlockHeader}>
        <div className={styles.codeBlockInfo}>
          {renderIcon()}
          <span className={styles.codeBlockLanguage}>{languageName || 'code'}</span>
        </div>
        <button className={styles.copyButton} onClick={handleCopy} title="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className={styles.monacoWrapper} style={{ height: `${editorHeight}px` }}>
        <MonacoEditor
          height="100%"
          language={rawLanguage.toLowerCase() === 'typescript' || rawLanguage.toLowerCase() === 'ts' ? 'typescript' : (rawLanguage.toLowerCase() === 'javascript' || rawLanguage.toLowerCase() === 'js' ? 'javascript' : rawLanguage.toLowerCase())}
          value={codeValue}
          theme={getMonacoThemeName(theme)}
          onMount={handleEditorDidMount}
          beforeMount={(monaco) => {
            if (!themesRegisteredRef.current) {
              registerMonacoThemes(monaco);
              themesRegisteredRef.current = true;
            }
            if (!monacoConfiguredRef.current) {
              configureMonacoTypeScript(monaco);
              monacoConfiguredRef.current = true;
            }
          }}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: lineHeight,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'auto',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              alwaysConsumeMouseWheel: false,
            },
            renderLineHighlight: 'none',
            contextmenu: false,
            folding: false,
            lineNumbers: 'on',
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            fixedOverflowWidgets: true,
            domReadOnly: true,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            renderWhitespace: 'none',
            selectionHighlight: false,
          }}
        />
      </div>
      {!isRealLanguage && rawLanguage && (
        <div className={styles.codeBlockNote}>
          {rawLanguage}
        </div>
      )}
    </div>
  );
};

interface ChatViewProps {
  activeConversation: any;
  inputValue: string;
  setInputValue: (value: string) => void;
  activeModelName: string;
  activeModelId: string;
  isModelDropdownOpen: boolean;
  availableModels: any[];
  getModelStatus: (modelId: string) => string;
  setModel: (modelId: string) => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  setIsHistoryModalOpen: (open: boolean) => void;
  isHistoryModalOpen: boolean;
  setCurrentView: (view: 'home' | 'chat' | 'settings') => void;
  setAssistantOpen: (open: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  onSend: (content?: string) => void;
  onStop: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  styles: any;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeConversation,
  inputValue,
  setInputValue,
  activeModelName,
  activeModelId,
  isModelDropdownOpen,
  availableModels,
  getModelStatus,
  setModel,
  setIsModelDropdownOpen,
  setIsHistoryModalOpen,
  isHistoryModalOpen,
  setCurrentView,
  setAssistantOpen,
  setActiveConversation,
  onSend,
  onStop,
  onKeyDown,
  textareaRef,
  messagesEndRef,
  dropdownRef,
  isLoading,
  styles
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (activeConversation && activeConversation.messages.length >= 2) {
      const lastUserMsg = [...activeConversation.messages].reverse().find((m: any) => m.role === 'user');
      if (lastUserMsg) {
        onSend(lastUserMsg.content);
      }
    }
  }, [activeConversation, onSend]);

  // Handle responsive input based on container width
  useEffect(() => {
    const updateContainerAttributes = () => {
      if (!chatContainerRef.current) return;
      
      const width = chatContainerRef.current.clientWidth;
      
      // Remove existing attributes
      chatContainerRef.current.removeAttribute('data-narrow');
      chatContainerRef.current.removeAttribute('data-very-narrow');
      
      // Set appropriate attributes based on width
      if (width < 400) {
        chatContainerRef.current.setAttribute('data-very-narrow', 'true');
      } else if (width < 600) {
        chatContainerRef.current.setAttribute('data-narrow', 'true');
      }
    };

    updateContainerAttributes();
    
    // Add resize observer to track container size changes
    const resizeObserver = new ResizeObserver(updateContainerAttributes);
    if (chatContainerRef.current) {
      resizeObserver.observe(chatContainerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const goBack = () => {
    setActiveConversation(null);
  };

  return (
    <div ref={chatContainerRef} className={`${styles.container} ${styles.chatContainer}`}>
      <div className={styles.chatHeader}>
        <button onClick={goBack} className={styles.backBtn}>
          <ArrowLeft size={16} />
        </button>
        <div className={styles.headerIcons} style={{ marginLeft: 'auto' }}>
          <button onClick={() => setIsHistoryModalOpen(true)} title="History">
            <History size={17} />
          </button>
          <button onClick={() => setCurrentView('settings')} title="Settings">
            <Settings size={17} />
          </button>
          <button onClick={() => setAssistantOpen(false)} className={styles.closeBtn} title="Close Chat">
            <X size={17} />
          </button>
        </div>
      </div>

      { }
      <div className={styles.chatMessages}>
        {activeConversation?.messages?.map((msg: any, index: number) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className={styles.userMessageWrapper}>
                <div className={styles.userBubble}>
                  <p>{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className={styles.aiMessageWrapper}>
                {msg.isComponent ? (
                  <div className={styles.aiContent}>
                    {msg.component === 'todo' && <TodoComponent />}
                    {msg.component === 'search' && <SearchComponent toolCalls={msg.toolCalls} />}
                    {msg.component === 'read' && <ReadComponent toolCalls={msg.toolCalls} />}
                    {msg.component === 'list' && <ListDirComponent toolCalls={msg.toolCalls} />}
                    {msg.component === 'tool' && <ToolComponent toolCalls={msg.toolCalls} />}
                  </div>
                ) : msg.content.trim() ? (
                  <div className={styles.aiContent}>
                    {parseMessageContent(msg.content).map((part, partIndex) => {
                      if (part.type === 'thinking') {
                        return <ThinkingBlock key={partIndex} content={part.content} />;
                      }
                      
                      // We no longer render inline tool indicators (file-read, list-dir, search-result, tool-result)
                      // because we use specialized component messages instead.
                      if (['file-read', 'list-dir', 'search-result', 'tool-result'].includes(part.type)) {
                        return null;
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
                                  <MarkdownCodeBlock className={className} styles={styles}>{children}</MarkdownCodeBlock>
                                );
                              },
                              pre: ({ children }) => <>{children}</>,
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
                              h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
                              h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
                              h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
                              h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
                              h5: ({ children }) => <h5 className={styles.h5}>{children}</h5>,
                              h6: ({ children }) => <h6 className={styles.h6}>{children}</h6>,
                              hr: () => <hr className={styles.hr} />,
                            }}
                          >
                            {part.content}
                          </ReactMarkdown>
                        </div>
                      );
                    })}
                    {!isLoading && index === activeConversation.messages.length - 1 && (
                      <div className={styles.messageFooter}>
                        <div className={styles.statusBadge}>
                          <CheckCircle size={14} className={styles.statusIcon} />
                          <span>Completed</span>
                        </div>
                        <div className={styles.actionButtons}>
                          <button 
                            className={styles.actionButton} 
                            onClick={() => handleCopyMessage(msg.id, msg.content)} 
                            title="Copy message"
                          >
                            {copiedMessageId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button 
                            className={styles.actionButton} 
                            onClick={handleRegenerate} 
                            title="Regenerate response"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>
                    )}
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
        activeModelName={activeModelName}
        activeModelId={activeModelId}
        isModelDropdownOpen={isModelDropdownOpen}
        availableModels={availableModels}
        getModelStatus={getModelStatus}
        setModel={setModel}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
        onSend={onSend}
        onStop={onStop}
        onKeyDown={onKeyDown}
        textareaRef={textareaRef}
        dropdownRef={dropdownRef}
        isLoading={isLoading}
        styles={styles}
      />
      
      {isHistoryModalOpen && (
        <HistoryModal onClose={() => setIsHistoryModalOpen(false)} />
      )}
    </div>
  );
};
