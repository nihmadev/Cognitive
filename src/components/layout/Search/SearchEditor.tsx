import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSearchStore } from '../../../store/searchStore';
import { useProjectStore } from '../../../store/projectStore';
import { ChevronRight, MoreHorizontal, CaseSensitive, WholeWord, Regex, Replace, RefreshCw, X, ChevronsDownUp, AlignLeft, FolderTree, ReplaceAll } from 'lucide-react';
import clsx from 'clsx';
import { getFileIcon } from '../../../utils/fileIcons';
import { TreeView } from './TreeView';
import styles from './SearchEditor.module.css';

const INITIAL_VISIBLE_FILES = 50;
const LOAD_MORE_COUNT = 30;

export const SearchEditor = () => {
    const {
        query, replaceQuery, isCaseSensitive, isWholeWord, isRegex, preserveCase,
        includePattern, excludePattern, filterPattern, results, isSearching,
        setQuery, setReplaceQuery, setIncludePattern, setExcludePattern, setFilterPattern,
        toggleCaseSensitive, toggleWholeWord, toggleRegex, togglePreserveCase,
        performSearch, replaceAll, replaceInFile, clearResults, clearIncludePattern, clearExcludePattern
    } = useSearchStore();

    const { currentWorkspace, openFile, activeFile } = useProjectStore();
    const [showDetails, setShowDetails] = useState(false);
    const [replaceExpanded, setReplaceExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_FILES);
    const [viewAsTree, setViewAsTree] = useState(true);
    const [collapseKey, setCollapseKey] = useState(0); // Ключ для принудительного обновления
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showContextLines, setShowContextLines] = useState(true);
    const resultsListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_FILES);
    }, [results]);

    const visibleResults = useMemo(() => {
        return results.slice(0, visibleCount);
    }, [results, visibleCount]);

    const hasMore = visibleCount < results.length;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200;
        if (nearBottom && hasMore && !isSearching) {
            setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, results.length));
        }
    }, [hasMore, isSearching, results.length]);

    const activeFileMatches = useMemo(() => {
        if (!activeFile) return null;
        const r = results.find((x) => x.file.path === activeFile);
        return r ? r.matches : null;
    }, [activeFile, results]);

    useEffect(() => {
        if (!activeFile) return;
        if (activeFileMatches && activeFileMatches.length > 0) {
            window.dispatchEvent(new CustomEvent('editor-apply-search-decorations', {
                detail: { path: activeFile, matches: activeFileMatches }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('editor-clear-search-decorations', {
                detail: { path: activeFile }
            }));
        }
    }, [activeFile, activeFileMatches]);

    const searchTimeoutRef = useRef<number | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setQuery(e.target.value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (e.target.value && currentWorkspace) {
                performSearch(currentWorkspace);
            } else {
                clearResults();
            }
        }, 600) as unknown as number;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Пропускаем горячие клавиши для переключения табов и другие системные комбинации
        if (e.ctrlKey || e.altKey || e.metaKey) {
            // Не блокируем системные комбинации клавиш
            return;
        }
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentWorkspace) {
                performSearch(currentWorkspace);
            }
        }
    };

    const toggleReplace = () => {
        setReplaceExpanded(!replaceExpanded);
    };

    const handleReplaceAll = async () => {
        if (!currentWorkspace || !replaceExpanded) return;
        await replaceAll(currentWorkspace);
    };

    const handleReplaceInFile = async (filePath: string) => {
        if (!currentWorkspace || !replaceExpanded) return;
        await replaceInFile(currentWorkspace, filePath);
    };

    const handleClearInclude = () => {
        clearIncludePattern();
    };

    const handleClearExclude = () => {
        clearExcludePattern();
    };

    const handleRefresh = () => {
        if (currentWorkspace && query) {
            performSearch(currentWorkspace);
        }
    };

    const handleClearResults = () => {
        clearResults();
    };

    const handleToggleViewAsTree = () => {
        setViewAsTree(!viewAsTree);
    };

    const handleCollapseAll = () => {
        setIsCollapsed(!isCollapsed);
        setCollapseKey(prev => prev + 1); // Принудительное обновление
    };

    const handleToggleContextLines = () => {
        setShowContextLines(!showContextLines);
    };

    return (
        <div className={styles.searchEditor}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <span className={styles.title}>Search</span>
                </div>
                <div className={styles.toolbarRight}>
                    <button className={styles.toolbarBtn} title="Refresh" onClick={handleRefresh}>
                        <RefreshCw size={16} />
                    </button>
                    <button className={styles.toolbarBtn} title="Clear Search Results" onClick={handleClearResults}>
                        <X size={16} />
                    </button>
                    <button 
                        className={clsx(styles.toolbarBtn, viewAsTree && styles.active)} 
                        title="View As Tree" 
                        onClick={handleToggleViewAsTree}
                    >
                        <FolderTree size={16} />
                    </button>
                    <button className={styles.toolbarBtn} title="Collapse All" onClick={handleCollapseAll}>
                        <ChevronsDownUp size={16} />
                    </button>
                    <button 
                        className={clsx(styles.toolbarBtn, showContextLines && styles.active)} 
                        title="Toggle Context Lines" 
                        onClick={handleToggleContextLines}
                    >
                        <AlignLeft size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.searchInputs}>
                    <div className={styles.inputGroup}>
                        <div className={styles.inputWrapper}>
                            <div className={styles.replaceToggle} onClick={toggleReplace} style={{ marginRight: 6, cursor: 'pointer', color: replaceExpanded ? '#e4e4e7' : '#71717a' }}>
                                <ChevronRight size={14} style={{ transform: replaceExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }} />
                            </div>
                            <textarea
                                className={styles.textArea}
                                placeholder="Search"
                                value={query}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                rows={1}
                            />
                            <div className={styles.inputActions}>
                                <button
                                    className={clsx(styles.actionBtn, isCaseSensitive && styles.active)}
                                    title="Match Case"
                                    onClick={toggleCaseSensitive}
                                >
                                    <CaseSensitive size={14} />
                                </button>
                                <button
                                    className={clsx(styles.actionBtn, isWholeWord && styles.active)}
                                    title="Match Whole Word"
                                    onClick={toggleWholeWord}
                                >
                                    <WholeWord size={14} />
                                </button>
                                <button
                                    className={clsx(styles.actionBtn, isRegex && styles.active)}
                                    title="Use Regular Expression"
                                    onClick={toggleRegex}
                                >
                                    <Regex size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {replaceExpanded && (
                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <div style={{ width: 20 }}></div>
                                <textarea
                                    className={styles.textArea}
                                    placeholder="Replace"
                                    value={replaceQuery}
                                    onChange={(e) => setReplaceQuery(e.target.value)}
                                    rows={1}
                                />
                                <div className={styles.inputActions}>
                                    <button
                                        className={clsx(styles.actionBtn, preserveCase && styles.active)}
                                        title="Preserve Case"
                                        onClick={togglePreserveCase}
                                    >
                                        <CaseSensitive size={14} />
                                    </button>
                                    <button 
                                        className={styles.actionBtn} 
                                        title="Replace All" 
                                        onClick={handleReplaceAll}
                                        disabled={!replaceQuery}
                                    >
                                        <ReplaceAll size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
                        <MoreHorizontal size={14} />
                        <span>files to include/exclude</span>
                    </div>

                    {showDetails && (
                        <div className={styles.detailsContent}>
                            <div className={styles.detailInputWrapper}>
                                <input
                                    className={styles.detailInput}
                                    placeholder="e.g. *.ts, src/**/include"
                                    value={includePattern}
                                    onChange={(e) => setIncludePattern(e.target.value)}
                                />
                                {includePattern && (
                                    <button className={styles.clearBtn} onClick={handleClearInclude} title="Clear">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <div className={styles.detailInputWrapper}>
                                <input
                                    className={styles.detailInput}
                                    placeholder="e.g. node_modules, *.test.ts"
                                    value={excludePattern}
                                    onChange={(e) => setExcludePattern(e.target.value)}
                                />
                                {excludePattern && (
                                    <button className={styles.clearBtn} onClick={handleClearExclude} title="Clear">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <input
                                className={styles.detailInput}
                                placeholder="files to filter (optional), e.g. src/**"
                                value={filterPattern}
                                onChange={(e) => setFilterPattern(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {results.length > 0 && (
                    <div className={styles.resultsHeader}>
                        {results.reduce((acc, curr) => acc + curr.matches.length, 0)} results in {results.length} files
                    </div>
                )}

                <div className={styles.resultsList} ref={resultsListRef} onScroll={handleScroll}>
                    {isSearching && <div style={{ padding: 16, textAlign: 'center', color: '#71717a' }}>Searching...</div>}

                    {!isSearching && viewAsTree && (
                        <TreeView 
                            key={collapseKey}
                            results={visibleResults} 
                            openFile={openFile} 
                            forceCollapsed={isCollapsed}
                            showContext={showContextLines}
                            workspacePath={currentWorkspace || undefined}
                            replaceEnabled={replaceExpanded && !!replaceQuery}
                            onReplaceInFile={handleReplaceInFile}
                        />
                    )}

                    {!isSearching && !viewAsTree && visibleResults.map((result) => (
                        <FlatFileResult 
                            key={result.file.path} 
                            result={result} 
                            openFile={openFile} 
                            showContext={showContextLines} 
                            workspacePath={currentWorkspace || undefined}
                            replaceEnabled={replaceExpanded && !!replaceQuery}
                            onReplaceInFile={handleReplaceInFile}
                        />
                    ))}
                    
                    {!isSearching && hasMore && (
                        <div style={{ padding: 8, textAlign: 'center', color: '#71717a', fontSize: 12 }}>
                            Showing {visibleCount} of {results.length} files (scroll for more)
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FlatFileResult = ({ result, openFile, showContext, workspacePath, replaceEnabled, onReplaceInFile }: { 
    result: any, 
    openFile: (path: string) => void, 
    showContext: boolean, 
    workspacePath?: string,
    replaceEnabled?: boolean,
    onReplaceInFile?: (filePath: string) => void
}) => {
    const handleMatchClick = (match: any) => {
        // Формируем полный путь для открытия файла
        const fullPath = workspacePath 
            ? `${workspacePath}/${result.file.path}`.replace(/\\/g, '/').replace(/\/+/g, '/')
            : result.file.path;
            
        openFile(fullPath);
        window.dispatchEvent(new CustomEvent('editor-apply-search-decorations', {
            detail: { path: fullPath, matches: result.matches }
        }));
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('editor-reveal-line', {
                detail: { path: fullPath, line: match.line, start: match.charStart, end: match.charEnd }
            }));
        }, 100);
    };

    // Путь уже относительный от бэкенда
    const displayPath = result.file.path;
    
    const handleReplaceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReplaceInFile && workspacePath) {
            const fullPath = `${workspacePath}/${result.file.path}`.replace(/\\/g, '/').replace(/\/+/g, '/');
            onReplaceInFile(fullPath);
        }
    };

    return (
        <div className={styles.flatFileResult}>
            <div className={styles.flatFileHeader}>
                <span style={{ marginRight: 6 }}>
                    {getFileIcon(result.file.name, result.file.path)}
                </span>
                <span className={styles.flatFileName}>{displayPath}</span>
                <span className={styles.matchCount}>{result.matches.length}</span>
                {replaceEnabled && (
                    <button 
                        className={styles.replaceFileBtn} 
                        onClick={handleReplaceClick}
                        title="Replace All in File"
                    >
                        <Replace size={14} />
                    </button>
                )}
            </div>
            <div className={styles.matches}>
                {result.matches.map((match: any, idx: number) => (
                    <div key={idx} className={styles.matchItem} onClick={() => handleMatchClick(match)}>
                        <span className={styles.lineNum}>{match.line}:</span>
                        <HighlightText text={match.lineText} range={[match.charStart, match.charEnd]} showContext={showContext} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const HighlightText = ({ text, range, showContext }: { text: string, range: [number, number], showContext: boolean }) => {
    const start = range[0];
    const end = range[1];

    if (start < 0 || end > text.length) return <span title={text}>{text}</span>;

    const match = text.substring(start, end);
    
    // Для очень длинных строк (например, SVG) всегда показываем контекст
    const MAX_LINE_LENGTH = 200;
    const isLongLine = text.length > MAX_LINE_LENGTH;
    
    if (!showContext && !isLongLine) {
        return (
            <span title={text}>
                <span className={styles.highlight}>{match}</span>
            </span>
        );
    }

    // Для длинных строк используем больший контекст
    const contextBefore = isLongLine ? 40 : 20;
    const contextAfter = isLongLine ? 60 : 50;
    
    const actualStart = Math.max(0, start - contextBefore);
    const actualEnd = Math.min(text.length, end + contextAfter);
    
    const before = text.substring(actualStart, start);
    const after = text.substring(end, actualEnd);
    
    const showStartEllipsis = actualStart > 0;
    const showEndEllipsis = actualEnd < text.length;

    return (
        <span title={text}>
            {showStartEllipsis && '...'}
            {before}
            <span className={styles.highlight}>{match}</span>
            {after}
            {showEndEllipsis && '...'}
        </span>
    );
};
