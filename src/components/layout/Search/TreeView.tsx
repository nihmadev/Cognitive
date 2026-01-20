import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Replace } from 'lucide-react';
import { getFileIcon } from '../../../utils/fileIcons';
import styles from './TreeView.module.css';

interface TreeNode {
    name: string;
    path: string;
    type: 'folder' | 'file';
    children?: TreeNode[];
    matches?: any[];
    matchCount?: number;
}

interface TreeViewProps {
    results: any[];
    openFile: (path: string) => void;
    forceCollapsed: boolean;
    showContext: boolean;
    workspacePath?: string;
    replaceEnabled?: boolean;
    onReplaceInFile?: (filePath: string) => void;
}

// Построение дерева из плоского списка файлов
function buildTree(results: any[]): TreeNode {
    const root: TreeNode = {
        name: '',
        path: '',
        type: 'folder',
        children: [],
        matchCount: 0
    };

    results.forEach((result: any) => {
        // Путь уже относительный от бэкенда
        const relativePath = result.file.path;
        
        const parts = relativePath.split(/[\\/]/);
        let currentNode = root;

        parts.forEach((part: string, index: number) => {
            const isFile = index === parts.length - 1;
            const currentPath = parts.slice(0, index + 1).join('/');

            if (!currentNode.children) {
                currentNode.children = [];
            }

            let childNode = currentNode.children.find(child => child.name === part);

            if (!childNode) {
                childNode = {
                    name: part,
                    path: currentPath,
                    type: isFile ? 'file' : 'folder',
                    children: isFile ? undefined : [],
                    matches: isFile ? result.matches : undefined,
                    matchCount: isFile ? result.matches.length : 0
                };
                currentNode.children.push(childNode);
            }

            if (!isFile && childNode.matchCount !== undefined) {
                childNode.matchCount = (childNode.matchCount || 0) + result.matches.length;
            }

            currentNode = childNode;
        });
    });

    // Рекурсивно подсчитываем количество совпадений для папок
    function calculateMatchCount(node: TreeNode): number {
        if (node.type === 'file') {
            return node.matchCount || 0;
        }
        
        let total = 0;
        if (node.children) {
            node.children.forEach(child => {
                total += calculateMatchCount(child);
            });
        }
        node.matchCount = total;
        return total;
    }

    if (root.children) {
        root.children.forEach(child => calculateMatchCount(child));
    }

    return root;
}

export const TreeView = ({ results, openFile, forceCollapsed, showContext, workspacePath, replaceEnabled, onReplaceInFile }: TreeViewProps) => {
    const tree = useMemo(() => buildTree(results), [results]);

    return (
        <div className={styles.treeView}>
            {tree.children?.map(node => (
                <TreeNodeComponent 
                    key={node.path} 
                    node={node} 
                    openFile={openFile} 
                    forceCollapsed={forceCollapsed}
                    showContext={showContext}
                    workspacePath={workspacePath}
                    replaceEnabled={replaceEnabled}
                    onReplaceInFile={onReplaceInFile}
                />
            ))}
        </div>
    );
};

interface TreeNodeComponentProps {
    node: TreeNode;
    openFile: (path: string) => void;
    level?: number;
    forceCollapsed: boolean;
    showContext: boolean;
    workspacePath?: string;
    replaceEnabled?: boolean;
    onReplaceInFile?: (filePath: string) => void;
}

const TreeNodeComponent = ({ node, openFile, level = 0, forceCollapsed, showContext, workspacePath, replaceEnabled, onReplaceInFile }: TreeNodeComponentProps) => {
    const [isOpen, setIsOpen] = useState(!forceCollapsed);

    // Синхронизация с forceCollapsed
    useEffect(() => {
        setIsOpen(!forceCollapsed);
    }, [forceCollapsed]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleMatchClick = (match: any) => {
        // Формируем полный путь для открытия файла
        const fullPath = workspacePath 
            ? `${workspacePath}/${node.path}`.replace(/\\/g, '/').replace(/\/+/g, '/')
            : node.path;
            
        openFile(fullPath);
        window.dispatchEvent(new CustomEvent('editor-apply-search-decorations', {
            detail: { path: fullPath, matches: node.matches }
        }));
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('editor-reveal-line', {
                detail: { path: fullPath, line: match.line, start: match.charStart, end: match.charEnd }
            }));
        }, 100);
    };
    
    const handleReplaceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onReplaceInFile && workspacePath) {
            const fullPath = `${workspacePath}/${node.path}`.replace(/\\/g, '/').replace(/\/+/g, '/');
            onReplaceInFile(fullPath);
        }
    };

    if (node.type === 'folder') {
        return (
            <div className={styles.folderNode}>
                <div 
                    className={styles.folderHeader} 
                    onClick={handleToggle}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    <span className={styles.chevron}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className={styles.folderIcon}>
                        {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </span>
                    <span className={styles.folderName}>{node.name}</span>
                    <span className={styles.matchCount}>{node.matchCount}</span>
                </div>
                {isOpen && node.children && (
                    <div className={styles.folderChildren}>
                        {node.children.map(child => (
                            <TreeNodeComponent 
                                key={child.path} 
                                node={child} 
                                openFile={openFile} 
                                level={level + 1}
                                forceCollapsed={forceCollapsed}
                                showContext={showContext}
                                workspacePath={workspacePath}
                                replaceEnabled={replaceEnabled}
                                onReplaceInFile={onReplaceInFile}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // File node
    return (
        <div className={styles.fileNode}>
            <div 
                className={styles.fileHeader} 
                onClick={handleToggle}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                <span className={styles.chevron}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className={styles.fileIcon}>
                    {getFileIcon(node.name, node.path)}
                </span>
                <span className={styles.fileName}>{node.name}</span>
                <span className={styles.matchCount}>{node.matchCount}</span>
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
            {isOpen && node.matches && (
                <div className={styles.matches}>
                    {node.matches.map((match: any, idx: number) => (
                        <div 
                            key={idx} 
                            className={styles.matchItem} 
                            onClick={() => handleMatchClick(match)}
                            style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
                        >
                            <span className={styles.lineNum}>{match.line}:</span>
                            <HighlightText 
                                text={match.lineText} 
                                range={[match.charStart, match.charEnd]} 
                                showContext={showContext}
                            />
                        </div>
                    ))}
                </div>
            )}
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
