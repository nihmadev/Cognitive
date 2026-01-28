
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSearchStore } from '../../../store/searchStore';
import { useProjectStore } from '../../../store/projectStore';
import { ChevronRight, MoreHorizontal, CaseSensitive, WholeWord, Regex, Replace, RefreshCw, X, FileText, FolderTree, ChevronsDownUp } from 'lucide-react';
import clsx from 'clsx';
import { getFileIcon } from '../../../utils/fileIcons';
import { TreeView } from './TreeView';
import styles from './SearchPane.module.css';

const INITIAL_VISIBLE_FILES = 50;
const LOAD_MORE_COUNT = 30;

export const SearchPane = () => {
    const {
        query, replaceQuery, isCaseSensitive, isWholeWord, isRegex, preserveCase,
        includePattern, excludePattern, filterPattern, results, isSearching,
        setQuery, setReplaceQuery, setIncludePattern, setExcludePattern, setFilterPattern,
        toggleCaseSensitive, toggleWholeWord, toggleRegex, togglePreserveCase,
        performSearch, replaceAll, clearResults, openSearchEditor
    } = useSearchStore();

    const { currentWorkspace, openFile, activeFile } = useProjectStore();
    const [showDetails, setShowDetails] = useState(false);
    const [replaceExpanded, setReplaceExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_FILES);
    const [viewAsTree, setViewAsTree] = useState(true);
    const [allCollapsed, setAllCollapsed] = useState(false);
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
        if (!currentWorkspace) return;
        await replaceAll(currentWorkspace);
    };

    const handleRefresh = () => {
        if (currentWorkspace && query) {
            performSearch(currentWorkspace);
        }
    };

    const handleClearResults = () => {
        clearResults();
    };

    const handleOpenSearchEditor = () => {
        openSearchEditor();
    };

    const handleToggleViewAsTree = () => {
        setViewAsTree(!viewAsTree);
    };

    const handleCollapseAll = () => {
        setAllCollapsed(!allCollapsed);
    };

    return (
        <div className={styles.searchPane}>
            <div className={styles.header}>
                <span>Search</span>
                <div className={styles.headerActions}>
                    <button className={styles.headerBtn} title="Refresh" onClick={handleRefresh}>
                        <RefreshCw size={14} />
                    </button>
                    <button className={styles.headerBtn} title="Clear Search Results" onClick={handleClearResults}>
                        <X size={14} />
                    </button>
                    <button className={styles.headerBtn} title="Open New Search Editor" onClick={handleOpenSearchEditor}>
                        <FileText size={14} />
                    </button>
                    <button 
                        className={clsx(styles.headerBtn, viewAsTree && styles.active)} 
                        title="View As Tree" 
                        onClick={handleToggleViewAsTree}
                    >
                        <FolderTree size={14} />
                    </button>
                    <button className={styles.headerBtn} title="Collapse All" onClick={handleCollapseAll}>
                        <ChevronsDownUp size={14} />
                    </button>
                </div>
            </div>

            <div className={styles.searchInputs}>
                {}
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

                {}
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
                                <button className={styles.actionBtn} title="Replace All" onClick={handleReplaceAll}>
                                    <Replace size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {}
                <div className={styles.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
                    <MoreHorizontal size={14} />
                    <span>files to include/exclude</span>
                </div>

                {showDetails && (
                    <div className={styles.detailsContent}>
                        <input
                            className={styles.detailInput}
                            placeholder="e.g. *.ts, src/**/include"
                            value={includePattern}
                            onChange={(e) => setIncludePattern(e.target.value)}
                        />
                        <input
                            className={styles.detailInput}
                            placeholder="e.g. node_modules, *.test.ts"
                            value={excludePattern}
                            onChange={(e) => setExcludePattern(e.target.value)}
                        />
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
                        results={visibleResults}
                        openFile={openFile}
                        forceCollapsed={allCollapsed}
                        showContext={true}
                        workspacePath={currentWorkspace}
                    />
                )}

                {!isSearching && !viewAsTree && visibleResults.map((result) => (
                    <FlatFileResult key={result.file.path} result={result} openFile={openFile} workspacePath={currentWorkspace} />
                ))}
                
                {!isSearching && hasMore && (
                    <div style={{ padding: 8, textAlign: 'center', color: '#71717a', fontSize: 12 }}>
                        Showing {visibleCount} of {results.length} files (scroll for more)
                    </div>
                )}
            </div>
        </div>
    );
};

const FlatFileResult = ({ result, openFile, workspacePath }: { result: any, openFile: (path: string) => void, workspacePath?: string }) => {
    const handleMatchClick = (match: any) => {
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
        }, 300);
    };

    return (
        <div className={styles.flatFileResult}>
            <div className={styles.flatFileHeader}>
                <span style={{ marginRight: 6 }}>
                    {getFileIcon(result.file.name, result.file.path)}
                </span>
                <span className={styles.flatFileName}>{result.file.path}</span>
                <span className={styles.matchCount}>{result.matches.length}</span>
            </div>
            <div className={styles.matches}>
                {result.matches.map((match: any, idx: number) => (
                    <div key={idx} className={styles.matchItem} onClick={() => handleMatchClick(match)}>
                        <span className={styles.lineNum}>{match.line}:</span>
                        <HighlightText text={match.lineText} range={[match.charStart, match.charEnd]} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const HighlightText = ({ text, range }: { text: string, range: [number, number] }) => {
    const start = range[0];
    const end = range[1];

    if (start < 0 || end > text.length) return <span title={text}>{text}</span>;

    const match = text.substring(start, end);
    
    // Показываем контекст: 20 символов до и 50 после найденного слова
    const contextBefore = 20;
    const contextAfter = 50;
    
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
