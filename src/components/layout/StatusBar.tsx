import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch, faMagnifyingGlassPlus, faMagnifyingGlassMinus, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { XCircle, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useGitStore } from '../../store/gitStore';
import { tauriApi } from '../../lib/tauri-api';
import { BranchModal } from './BranchModal';
import { 
    BINARY_EXTENSIONS 
} from './Editor/editorConfig';
import styles from '../../App.module.css';

interface GitInfo {
    branch: string;
    hasChanges: boolean;
}

export const StatusBar = () => {
    const { 
        activeFile, 
        currentWorkspace, 
        cursorPosition, 
        errors, 
        warnings,
        setFileErrors,
        setFileWarnings
    } = useProjectStore();
    
    const { zoomLevel, zoomIn, zoomOut, resetZoom, insertMode, toggleInsertMode, setBottomPanelTab, setTerminalOpen } = useUIStore();
    
    const { isPushing, push: pushToRemote, stageAll, commit, setCommitMessage } = useGitStore();
    
    const [gitInfo, setGitInfo] = useState<GitInfo>({ branch: 'main', hasChanges: false });
    const [language, setLanguage] = useState<string>('Plain Text');
    const [lineCount, setLineCount] = useState<number>(0);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

    // Update Git branch information
    const updateGitInfo = useCallback(async () => {
        if (!currentWorkspace) return;
        
        try {
            const [branchInfo, statusInfo] = await Promise.all([
                tauriApi.gitInfo(currentWorkspace).catch(() => ({ branch: 'main' })),
                tauriApi.gitStatus(currentWorkspace).catch(() => [])
            ]);
            
            setGitInfo({
                branch: branchInfo.branch || 'main',
                hasChanges: statusInfo.length > 0
            });
        } catch (error) {
            console.error('Failed to update git info:', error);
            setGitInfo({ branch: 'main', hasChanges: false });
        }
    }, [currentWorkspace]);

    // Generate random commit message
    const generateRandomCommitMessage = (): string => {
        const prefixes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert'];
        const actions = [
            'add', 'update', 'remove', 'fix', 'improve', 'optimize', 'refactor', 'clean', 'update', 'modify',
            'enhance', 'simplify', 'streamline', 'revamp', 'overhaul', 'tweak', 'adjust', 'correct', 'rectify'
        ];
        const objects = [
            'functionality', 'feature', 'component', 'module', 'service', 'handler', 'utility', 'helper',
            'logic', 'implementation', 'interface', 'api', 'ui', 'style', 'config', 'setting', 'behavior'
        ];
        const suffixes = [
            'for better performance', 'to improve user experience', 'for consistency', 'to fix bugs',
            'for better maintainability', 'to optimize workflow', 'for clarity', 'to enhance functionality',
            'for reliability', 'to streamline process', 'for efficiency', 'to improve code quality'
        ];

        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const object = objects[Math.floor(Math.random() * objects.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

        return `${prefix}: ${action} ${object} ${suffix}`;
    };

    // Handle push operation
    const handlePush = useCallback(async () => {
        if (!currentWorkspace || !gitInfo.hasChanges) return;
        
        try {
            // Stage all changes
            await stageAll(currentWorkspace);
            
            // Generate random commit message and commit
            const randomMessage = generateRandomCommitMessage();
            setCommitMessage(randomMessage);
            await commit(currentWorkspace);
            
            // Push to remote
            await pushToRemote(currentWorkspace);
            
            // Update git info after push
            updateGitInfo();
        } catch (error) {
            console.error('Commit and push failed:', error);
        }
    }, [currentWorkspace, gitInfo.hasChanges, stageAll, commit, setCommitMessage, pushToRemote, updateGitInfo]);

    // Analyze file content for errors and warnings
    const analyzeFile = useCallback(async (filePath: string) => {
        try {
            // Skip analysis for binary/video files to prevent UTF-8 errors
            const extension = filePath.split('.').pop()?.toLowerCase() || '';
            const videoExtensions = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v', '3gp', 'ts'];
            const allBinaryExtensions = [...BINARY_EXTENSIONS, ...videoExtensions];
            
            if (allBinaryExtensions.includes(extension)) {
                setLineCount(0);
                setLanguage('Binary');
                setFileErrors(filePath, 0);
                setFileWarnings(filePath, 0);
                return;
            }

            const content = await tauriApi.readFile(filePath);
            const lines = content.split('\n');
            setLineCount(lines.length);

            // Determine language from file extension
            const detectedLanguage = getLanguageFromExtension(extension);
            setLanguage(detectedLanguage);

            // Count errors and warnings (simplified example)
            const { errorCount, warningCount } = countIssues(content, detectedLanguage);
            setFileErrors(filePath, errorCount);
            setFileWarnings(filePath, warningCount);
            
        } catch (error) {
            console.error('Failed to analyze file:', error);
            setFileErrors(filePath, 0);
            setFileWarnings(filePath, 0);
        }
    }, [setFileErrors, setFileWarnings]);

    // Update when active file changes
    useEffect(() => {
        if (activeFile) {
            analyzeFile(activeFile);
        } else {
            setLineCount(0);
            setLanguage('Plain Text');
        }
    }, [activeFile, analyzeFile]);

    // Update git info when workspace changes
    useEffect(() => {
        updateGitInfo();
        
        // Set up polling for git status (every 5 seconds)
        const interval = setInterval(updateGitInfo, 5000);
        
        // Listen for git branch changes
        const handleGitBranchChanged = () => {
            updateGitInfo();
        };
        window.addEventListener('git-branch-changed', handleGitBranchChanged);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('git-branch-changed', handleGitBranchChanged);
        };
    }, [updateGitInfo]);

    const getLanguageFromExtension = (extension: string): string => {
        const languageMap: { [key: string]: string } = {
            // Web Technologies
            'ts': 'TypeScript', 'tsx': 'TypeScript React', 'js': 'JavaScript', 'jsx': 'JavaScript React',
            'html': 'HTML', 'htm': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS', 'less': 'Less',
            'vue': 'Vue', 'svelte': 'Svelte',
            
            // Backend Languages
            'py': 'Python', 'pyw': 'Python', 'pyi': 'Python',
            'rs': 'Rust', 'go': 'Go', 'java': 'Java', 'kt': 'Kotlin', 'kts': 'Kotlin',
            'scala': 'Scala', 'sc': 'Scala', 'clj': 'Clojure', 'cljs': 'ClojureScript',
            'hs': 'Haskell', 'lhs': 'Haskell', 'ml': 'OCaml', 'eliom': 'OCaml',
            'fs': 'F#', 'fsx': 'F#', 'fsi': 'F#',
            'elm': 'Elm', 'purs': 'PureScript', 'idr': 'Idris', 'ldr': 'Idris',
            
            // C/C++ Family
            'c': 'C', 'cpp': 'C++', 'cxx': 'C++', 'cc': 'C++', 'c++': 'C++',
            'h': 'C Header', 'hpp': 'C++ Header', 'hxx': 'C++ Header', 'hh': 'C++ Header',
            'cs': 'C#', 'csx': 'C#',
            'm': 'Objective-C', 'mm': 'Objective-C++',
            'vala': 'Vala', 'vapi': 'Vala',
            
            // Scripting Languages
            'rb': 'Ruby', 'rbw': 'Ruby', 'gemspec': 'Ruby',
            'php': 'PHP', 'phtml': 'PHP', 'php3': 'PHP', 'php4': 'PHP', 'php5': 'PHP', 'php7': 'PHP',
            'pl': 'Perl', 'pm': 'Perl', 't': 'Perl', 'pod': 'Perl',
            'lua': 'Lua', 'luac': 'Lua',
            'tcl': 'Tcl', 'tk': 'Tcl',
            'r': 'R', 'R': 'R',
            
            // Shell & System
            'sh': 'Shell', 'bash': 'Bash', 'zsh': 'Zsh', 'fish': 'Fish',
            'ps1': 'PowerShell', 'psm1': 'PowerShell', 'psd1': 'PowerShell',
            'bat': 'Batch', 'cmd': 'Batch',
            'reg': 'Registry',
            
            // Data & Configuration
            'json': 'JSON', 'jsonc': 'JSON', 'json5': 'JSON5',
            'xml': 'XML', 'xaml': 'XAML', 'xsl': 'XSLT', 'xsd': 'XSD',
            'yaml': 'YAML', 'yml': 'YAML',
            'toml': 'TOML', 'ini': 'INI', 'cfg': 'Config', 'conf': 'Config',
            'env': 'Environment', 'dotenv': 'Environment',
            
            // Documentation
            'md': 'Markdown', 'markdown': 'Markdown', 'mdx': 'MDX',
            'rst': 'reStructuredText', 'txt': 'Plain Text',
            'tex': 'LaTeX', 'latex': 'LaTeX', 'bib': 'BibTeX',
            
            // Database
            'sql': 'SQL', 'ddl': 'SQL', 'dml': 'SQL',
            'prql': 'PRQL',
            
            // Build & DevOps
            'dockerfile': 'Docker', 'dockerignore': 'Docker',
            'makefile': 'Makefile', 'mk': 'Makefile',
            'cmake': 'CMake',
            'gradle': 'Gradle',
            'pom': 'Maven', 'build': 'Bazel',
            'bzl': 'Bazel', 'bazel': 'Bazel',
            'nix': 'Nix',
            'justfile': 'Just',
            
            // Version Control
            'gitignore': 'Git', 'gitmodules': 'Git', 'gitattributes': 'Git',
            'hgignore': 'Mercurial',
            
            // Web Assets
            'svg': 'SVG', 'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF',
            'ico': 'Icon', 'webp': 'WebP',
            'css.map': 'Source Map', 'js.map': 'Source Map',
            
            // Mobile Development
            'swift': 'Swift', 'dart': 'Dart',
            
            // Game Development
            'gd': 'GDScript',
            
            // Scientific & Academic
            'jl': 'Julia', 'matlab': 'MATLAB', 'fig': 'FIG',
            'stan': 'Stan',
            
            // Other Languages
            'nim': 'Nim', 'nimble': 'Nim',
            'cr': 'Crystal',
            'v': 'V', 'vsh': 'V',
            'zig': 'Zig',
            'wasm': 'WebAssembly', 'wat': 'WebAssembly',
            'ebnf': 'EBNF',
            'peg': 'PEG',
            'proto': 'Protocol Buffers',
            'thrift': 'Thrift',
            'avdl': 'Avro',
            'graphql': 'GraphQL', 'gql': 'GraphQL',
            'prisma': 'Prisma',
            
            // Template Languages
            'hbs': 'Handlebars', 'handlebars': 'Handlebars',
            'mustache': 'Mustache',
            'erb': 'ERB', 'rhtml': 'ERB',
            'ejs': 'EJS',
            'jinja': 'Jinja', 'jinja2': 'Jinja',
            'twig': 'Twig',
            'liquid': 'Liquid',
            
            // CSS Frameworks
            'styl': 'Stylus',
            'pcss': 'PostCSS',
            
            // Testing
            'spec': 'Spec', 'test': 'Test', 'tests': 'Test',
            
            // Misc
            'lock': 'Lock File', 'log': 'Log',
            'patch': 'Patch', 'diff': 'Diff',
            'rej': 'Reject',
            'bak': 'Backup', 'tmp': 'Temporary',
            'swp': 'Swap',
        };
        return languageMap[extension] || 'Plain Text';
    };

    const countIssues = (content: string, lang: string): { errorCount: number; warningCount: number } => {
        let errorCount = 0;
        let warningCount = 0;
        
        // Check for syntax issues (simplified example)
        const lines = content.split('\n');
        
        // Count potential issues based on language
        if (lang.includes('TypeScript') || lang.includes('JavaScript')) {
            lines.forEach(line => {
                // Example: Count console.log as warnings (for demonstration)
                if (line.includes('console.log')) {
                    warningCount++;
                }
                
                // Check for common issues
                if (line.includes('any') && !line.includes('//')) {
                    warningCount++;
                }
                
                // Count potential template literals without expressions
                const templateLiterals = line.match(/`[^`]*\$\{[^}]*\}[^`]*`/g) || [];
                warningCount += templateLiterals.length;
            });
            
            // Check for unclosed brackets/braces/parentheses
            const openBrackets = (content.match(/\(/g) || []).length;
            const closeBrackets = (content.match(/\)/g) || []).length;
            errorCount += Math.abs(openBrackets - closeBrackets);
            
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            errorCount += Math.abs(openBraces - closeBraces);
            
            const openSquare = (content.match(/\[/g) || []).length;
            const closeSquare = (content.match(/\]/g) || []).length;
            errorCount += Math.abs(openSquare - closeSquare);
        }
        
        return { errorCount, warningCount };
    };

    const errorCount = activeFile ? errors[activeFile] || 0 : 0;
    const warningCount = activeFile ? warnings[activeFile] || 0 : 0;

    return (
        <>
            <div className={styles.statusBar}>
                <div className={styles.statusLeft}>
                    <div 
                        className={`${styles.statusItem} ${gitInfo.hasChanges ? styles.gitChanged : ''}`}
                        onClick={() => setIsBranchModalOpen(true)}
                        style={{ cursor: 'pointer' }}
                        title="Click to manage branches"
                    >
                        <FontAwesomeIcon 
                            icon={faCodeBranch} 
                            style={{
                                fontSize: '16px',
                                marginRight: '4px'
                            }} 
                        />
                        <span style={{ verticalAlign: 'middle' }}>
                            {gitInfo.branch} {gitInfo.hasChanges && '*'}
                        </span>
                        
                        {/* Push button - show only when there are changes */}
                        {gitInfo.hasChanges && (
                            <button
                                className={styles.pushButton}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePush();
                                }}
                                disabled={isPushing}
                                style={{ 
                                    cursor: isPushing ? 'not-allowed' : 'pointer',
                                    opacity: isPushing ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    border: 'none',
                                    background: 'none',
                                    color: 'inherit',
                                    marginLeft: '4px'
                                }}
                                title={isPushing ? 'Committing and pushing...' : 'Commit changes with random message and push to remote'}
                            >
                                <FontAwesomeIcon 
                                    icon={faCloudArrowUp} 
                                    style={{ fontSize: '14px' }}
                                />
                            </button>
                        )}
                    </div>
                {activeFile && (
                    <span className={styles.statusItem}>
                        <span 
                            className={styles.error}
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => {
                                setTerminalOpen(true);
                                setBottomPanelTab('problems');
                            }}
                            title={`${errorCount} error${errorCount !== 1 ? 's' : ''} - Click to open Problems panel`}
                        >
                            <XCircle size={16} style={{ marginRight: '4px' }} />
                            {errorCount}
                        </span>
                        <span 
                            className={styles.warning}
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}
                            onClick={() => {
                                setTerminalOpen(true);
                                setBottomPanelTab('problems');
                            }}
                            title={`${warningCount} warning${warningCount !== 1 ? 's' : ''} - Click to open Problems panel`}
                        >
                            <AlertTriangle size={16} style={{ marginRight: '4px' }} />
                            {warningCount}
                        </span>
                    </span>
                )}
            </div>

            <div className={styles.statusRight}>
                {/* Insert mode indicator */}
                <span 
                    className={styles.statusItem} 
                    onClick={toggleInsertMode}
                    style={{ cursor: 'pointer', minWidth: '32px', textAlign: 'center' }}
                    title="Toggle Insert/Overtype mode (Insert key)"
                >
                    {insertMode ? 'INS' : 'OVR'}
                </span>
                
                {/* Zoom controls */}
                <span className={styles.statusItem} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                        onClick={zoomOut}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '0 2px',
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Zoom Out (Ctrl+-)"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlassMinus} style={{ fontSize: '12px' }} />
                    </button>
                    <span 
                        onClick={resetZoom}
                        style={{ cursor: 'pointer', minWidth: '40px', textAlign: 'center' }}
                        title="Reset Zoom (Ctrl+0)"
                    >
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                        onClick={zoomIn}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '0 2px',
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Zoom In (Ctrl++)"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlassPlus} style={{ fontSize: '12px' }} />
                    </button>
                </span>
                
                {activeFile && (
                    <>
                        <span className={styles.statusItem}>
                            Ln {cursorPosition.line}, Col {cursorPosition.column}
                        </span>
                        <span className={styles.statusItem}>UTF-8</span>
                        <span className={styles.statusItem}>{language}</span>
                        <span className={styles.statusItem}>Lines: {lineCount}</span>
                    </>
                )}
            </div>
            </div>
            
            <BranchModal 
                isOpen={isBranchModalOpen} 
                onClose={() => setIsBranchModalOpen(false)} 
            />
        </>
    );
};
