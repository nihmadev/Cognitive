import React, { useState, useRef } from 'react';
import {
    ChevronRight, ChevronDown, ExternalLink,
    MoreHorizontal, RefreshCw, Target, ArrowDownToLine, ArrowDown, CloudUpload, Check, ChevronsDownUp
} from 'lucide-react';
import { GraphSectionProps } from '../types';
import styles from './GraphSection.module.css';
import { tauriApi, CommitFile } from '../../../../lib/tauri-api';
import { useProjectStore } from '../../../../store/projectStore';
import { getFileIcon, getFolderIcon } from '../../../../utils/fileIcons';

export const GraphSection = ({
    commits,
    graphOpen,
    remoteName,
    workspacePath: workspacePathProp,
    onToggle,
    onCommitHover,
    onCommitLeave,
    onPull,
    onPush,
    onFetch,
    onRefresh
}: GraphSectionProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
    const [commitFiles, setCommitFiles] = useState<Record<string, CommitFile[]>>({});
    const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const commitsListRef = useRef<HTMLDivElement>(null);
    const headCommitRef = useRef<HTMLDivElement>(null);
    const workspacePathFromStore = useProjectStore((state) => state.currentWorkspace);
    const openCommitDiffTab = useProjectStore((state) => state.openCommitDiffTab);
    const workspacePath = workspacePathProp || workspacePathFromStore;

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ x: rect.right - 160, y: rect.bottom + 5 });
        setShowMenu(true);
    };

    const handleGoToHead = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Find HEAD commit in the list
        const headCommit = commits.find(c => c.is_head);
        
        if (!headCommit) {
            return;
        }
        
        // Try to scroll using ref first
        if (headCommitRef.current) {
            headCommitRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Fallback: scroll to top if HEAD is the first commit
            if (commitsListRef.current && commits[0]?.is_head) {
                commitsListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const handleFetch = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onFetch) {
            await onFetch();
        }
    };

    const handlePull = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPull) {
            await onPull();
        }
    };

    const handlePush = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPush) {
            await onPush();
        }
    };

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRefresh) {
            await onRefresh();
        }
    };

    const handleCollapseCommitFolders = (e: React.MouseEvent, commitHash: string) => {
        e.stopPropagation();
        // Add all folders for this commit to expandedFolders (to collapse them)
        const newExpanded = new Set(expandedFolders);
        
        // Find all folder keys for this commit and add them to collapse
        const files = commitFiles[commitHash];
        if (files) {
            const tree = buildFileTree(files);
            const addFoldersToCollapse = (obj: Record<string, any>, prefix = '') => {
                Object.entries(obj).forEach(([name, node]) => {
                    if (node.isFolder) {
                        const fullPath = prefix ? `${prefix}/${name}` : name;
                        const key = `${commitHash}-${fullPath}`;
                        newExpanded.add(key);
                        addFoldersToCollapse(node.children, fullPath);
                    }
                });
            };
            addFoldersToCollapse(tree);
        }
        
        setExpandedFolders(newExpanded);
    };

    const handleFileClick = async (filePath: string, commitHash: string, status: string) => {
        if (!workspacePath) return;
        
        try {
            // Get file content at commit (new content)
            const newContent = await tauriApi.gitFileAtCommit(workspacePath, commitHash, filePath);
            
            // Get file content at parent commit (old content)
            let oldContent = '';
            if (status !== 'A') { // If not added, get parent version
                try {
                    oldContent = await tauriApi.gitFileAtParentCommit(workspacePath, commitHash, filePath);
                } catch (error) {
                    oldContent = '';
                }
            }
            
            // Find commit message
            const commit = commits.find(c => c.hash === commitHash);
            const commitMessage = commit?.message || 'Unknown commit';
            
            // Open diff tab
            openCommitDiffTab(filePath, commitHash, commitMessage, oldContent, newContent);
        } catch (error) {
            // Failed to open diff
        }
    };

    const handleCommitClick = async (commitHash: string) => {
        if (expandedCommits.has(commitHash)) {
            // Collapse
            const newExpanded = new Set(expandedCommits);
            newExpanded.delete(commitHash);
            setExpandedCommits(newExpanded);
        } else {
            // Expand and load files if not loaded
            const newExpanded = new Set(expandedCommits);
            newExpanded.add(commitHash);
            setExpandedCommits(newExpanded);
            
            if (!commitFiles[commitHash] && workspacePath) {
                setLoadingFiles(prev => {
                    const newSet = new Set(prev);
                    newSet.add(commitHash);
                    return newSet;
                });
                
                try {
                    const files = await tauriApi.gitCommitFiles(workspacePath, commitHash);
                    setCommitFiles(prev => ({ ...prev, [commitHash]: files }));
                } catch (error) {
                    // Failed to load commit files
                    // Set empty array on error so we don't keep trying
                    setCommitFiles(prev => ({ ...prev, [commitHash]: [] }));
                } finally {
                    setLoadingFiles(prev => {
                        const newLoading = new Set(prev);
                        newLoading.delete(commitHash);
                        return newLoading;
                    });
                }
            }
        }
    };

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            // Remove from set = expand (since we use inverted logic)
            newExpanded.delete(path);
        } else {
            // Add to set = collapse
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const buildFileTree = (files: CommitFile[]) => {
        const tree: Record<string, any> = {};
        
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // File
                    current[part] = { ...file, isFile: true };
                } else {
                    // Folder
                    if (!current[part]) {
                        current[part] = { isFolder: true, children: {} };
                    }
                    current = current[part].children;
                }
            });
        });
        
        return tree;
    };

    const renderFileTree = (tree: Record<string, any>, commitHash: string, prefix = '') => {
        const entries = Object.entries(tree);
        
        // Sort: folders first, then files
        entries.sort(([nameA, nodeA], [nameB, nodeB]) => {
            if (nodeA.isFolder && !nodeB.isFolder) return -1;
            if (!nodeA.isFolder && nodeB.isFolder) return 1;
            return nameA.localeCompare(nameB);
        });
        
        return entries.map(([name, node]) => {
            const fullPath = prefix ? `${prefix}/${name}` : name;
            const key = `${commitHash}-${fullPath}`;
            
            if (node.isFile) {
                const statusLabels: Record<string, string> = {
                    'A': 'Added',
                    'M': 'Modified',
                    'D': 'Deleted',
                    'R': 'Renamed',
                    'C': 'Copied',
                };
                
                return (
                    <div 
                        key={key} 
                        className={`${styles.fileItem} ${node.status === 'D' ? styles.deleted : ''}`}
                        onClick={() => handleFileClick(node.path, commitHash, node.status)}
                    >
                        {getFileIcon(name)}
                        <span className={styles.fileName}>{name}</span>
                        <span className={`${styles.fileStatus} ${styles['status' + node.status]}`} title={statusLabels[node.status]}>
                            {node.status}
                        </span>
                    </div>
                );
            } else {
                // Auto-expand folders by default (if not explicitly collapsed)
                const isExpanded = !expandedFolders.has(key); // true by default, false if in set
                return (
                    <div key={key} className={styles.folderItem}>
                        <div className={styles.folderHeader} onClick={() => toggleFolder(key)}>
                            {getFolderIcon(name, isExpanded)}
                            <span className={styles.folderName}>{name}</span>
                        </div>
                        {isExpanded && (
                            <div className={styles.folderChildren}>
                                {renderFileTree(node.children, commitHash, fullPath)}
                            </div>
                        )}
                    </div>
                );
            }
        });
    };

    const hasRemote = !!remoteName;
    const hasHeadCommit = commits.some(c => c.is_head);

    return (
        <div className={`${styles.graphSection} ${graphOpen ? styles.open : ''}`}>
            <div className={styles.sectionHeader} onClick={onToggle}>
                <div className={styles.sectionTitle}>
                    {graphOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Graph</span>
                </div>
                {graphOpen && (
                    <div className={styles.graphActions}>
                        <button 
                            className={styles.graphIconBtn} 
                            title="Go To Current History Item"
                            onClick={handleGoToHead}
                            disabled={!hasHeadCommit}
                        >
                            <Target size={14} />
                        </button>
                        <button 
                            className={styles.graphIconBtn} 
                            title="Fetch From All Remotes"
                            onClick={handleFetch}
                            disabled={!hasRemote}
                        >
                            <ArrowDownToLine size={14} />
                        </button>
                        <button 
                            className={styles.graphIconBtn} 
                            title="Pull"
                            onClick={handlePull}
                            disabled={!hasRemote}
                        >
                            <ArrowDown size={14} />
                        </button>
                        <button 
                            className={styles.graphIconBtn} 
                            title="Publish Branch"
                            onClick={handlePush}
                            disabled={!hasRemote}
                        >
                            <CloudUpload size={14} />
                        </button>
                        <button 
                            className={styles.graphIconBtn} 
                            title="Refresh"
                            onClick={handleRefresh}
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            className={styles.graphIconBtn}
                            title="More"
                            onClick={handleMenuClick}
                        >
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                )}
            </div>

            {showMenu && (
                <>
                    <div className={styles.menuOverlay} onClick={() => setShowMenu(false)} />
                    <div className={styles.dropdownMenu} style={{ left: menuPos.x, top: menuPos.y }}>
                        <div
                            className={styles.menuItem}
                            onClick={(e) => { e.stopPropagation(); setViewMode('list'); setShowMenu(false); }}
                        >
                            <div className={styles.menuItemIcon}>
                                {viewMode === 'list' && <Check size={14} />}
                            </div>
                            <span>View as List</span>
                        </div>
                        <div
                            className={styles.menuItem}
                            onClick={(e) => { e.stopPropagation(); setViewMode('tree'); setShowMenu(false); }}
                        >
                            <div className={styles.menuItemIcon}>
                                {viewMode === 'tree' && <Check size={14} />}
                            </div>
                            <span>View as Tree</span>
                        </div>
                    </div>
                </>
            )}

            {graphOpen && (
                <div className={styles.graphContent}>
                    <div className={styles.commitsList} ref={commitsListRef}>
                        {commits.map((c, index) => {
                            const isExpanded = expandedCommits.has(c.hash);
                            const files = commitFiles[c.hash];
                            const isLoading = loadingFiles.has(c.hash);
                            
                            return (
                                <div key={c.hash} className={styles.commitContainer}>
                                    <div className={styles.commitWithGraph}>
                                        <div className={styles.graphLineWrapper}>
                                            <div className={`${styles.graphNode} ${c.is_head ? styles.graphNodeHead : ''}`} />
                                            {index < commits.length - 1 && <div className={styles.graphConnector} />}
                                        </div>
                                        <div className={styles.commitContent}>
                                            <div
                                                ref={c.is_head ? headCommitRef : null}
                                                className={`${styles.commitRow} ${c.is_head ? styles.headCommit : ''}`}
                                                onMouseEnter={(e) => onCommitHover(c, e)}
                                                onMouseLeave={onCommitLeave}
                                                onClick={() => handleCommitClick(c.hash)}
                                            >
                                                <div className={styles.commitInfo}>
                                                    <span className={styles.commitNumber}>{commits.length - index}</span>
                                                    <span className={styles.commitMessage}>{c.message || c.author_name}</span>
                                                </div>
                                                {(c.branches?.length ?? 0) > 0 && c.is_head && (
                                                    <button 
                                                        className={styles.pushBtn} 
                                                        title="Push"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onPush) {
                                                                onPush();
                                                            }
                                                        }}
                                                    >
                                                        <ExternalLink size={12} />
                                                    </button>
                                                )}
                                                <div className={styles.expandIcon}>
                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className={styles.commitFilesContainer}>
                                                    {isLoading ? (
                                                        <div className={styles.loadingFiles}>Loading files...</div>
                                                    ) : files && files.length > 0 ? (
                                                        <div className={styles.fileTree}>
                                                            <div className={styles.filesHeader}>
                                                                <span>{files.length} file{files.length !== 1 ? 's' : ''} changed</span>
                                                                <button 
                                                                    className={styles.collapseAllBtn}
                                                                    onClick={(e) => handleCollapseCommitFolders(e, c.hash)}
                                                                    title="Collapse All Folders"
                                                                >
                                                                    <ChevronsDownUp size={12} />
                                                                    Collapse All
                                                                </button>
                                                            </div>
                                                            {renderFileTree(buildFileTree(files), c.hash)}
                                                        </div>
                                                    ) : files && files.length === 0 ? (
                                                        <div className={styles.noFiles}>No files changed</div>
                                                    ) : (
                                                        <div className={styles.noFiles}>Loading...</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
