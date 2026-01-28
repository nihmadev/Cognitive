import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { useEditorStore } from '../../../store/editorStore';
import { useAutoSaveStore } from '../../../store/autoSaveStore';
import { useLspIntegration } from '../../../hooks/useLspIntegration';
import { useCssLspIntegration } from '../../../hooks/useCssLspIntegration';
import { usePythonLspIntegration } from '../../../hooks/usePythonLspIntegration';
import { tauriApi } from '../../../lib/tauri-api';
import { configureMonacoTypeScript } from '../../../lib/monaco-config';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
import { themes } from '../../../themes';
import { ImageViewer } from '../ImageViewer';
import { DiffEditor } from '../Git/DiffEditor';
import { TimelineDiffEditor } from '../Timeline';
import { SettingsPane } from '../Settings';
import { ProfilesPane } from '../Profiles';
import { EditorWelcome } from './EditorWelcome';
import { BinaryWarning } from './BinaryWarning';
import { useEditorEvents } from './useEditorEvents';
import { AudioViewer } from '../AudioViewer';
import { VideoViewer } from '../VideoViewer';
import { BreadcrumbBar } from '../BreadcrumbBar';
import {
    getEditorOptions,
    getFileExtension,
    isImageFile,
    isAudioFile,
    isVideoFile,
    isBinaryExtension,
    getLanguageFromExtension,
    isBinaryContent,
} from './editorConfig';
import styles from './Editor.module.css';

export const CodeEditor = () => {
    const {
        activeFile,
        setCursorPosition,
        setFileContent,
        fileContents,
        deletedFiles,
        unsavedChanges,
        editorVersion,
        activeDiffTab,
        openDiffTabs,
        currentWorkspace,
        activeSettingsTab,
        openSettingsTabs,
        activeProfilesTab,
        openProfilesTabs,
        activeTimelineDiffTab,
        openTimelineDiffTabs,
        activeCommitDiffTab,
        openCommitDiffTabs,
    } = useProjectStore();

    
    

    const { insertMode, theme, fontSettings, availableFonts, minimapEnabled, lineNumbersEnabled, tabSize } = useUIStore();
    const { setEditorInstance, setMonacoInstance } = useEditorStore();
    const { scheduleAutoSave, isEnabled: autoSaveEnabled } = useAutoSaveStore();

    const [code, setCode] = useState("// Select a file to view");
    const [language, setLanguage] = useState("plaintext");
    const [isBinary, setIsBinary] = useState(false);

    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const diagnosticsListenerRef = useRef<any>(null);
    const monacoConfiguredRef = useRef<boolean>(false);
    const themesRegisteredRef = useRef<boolean>(false);
    const disposablesRef = useRef<any[]>([]);

    const { collectDiagnostics, updateOutlineDebounced } = useEditorEvents({
        activeFile,
        currentWorkspace,
        editorRef,
        monacoRef,
    });

    // LSP Integration
    useLspIntegration({
        currentWorkspace,
        activeFile,
        editorRef,
        monacoRef,
        fileContent: fileContents[activeFile || ''] || code,
        editorVersion,
    });

    // CSS LSP Integration
    useCssLspIntegration();

    // Python LSP Integration
    usePythonLspIntegration({
        currentWorkspace,
        activeFile,
        editorRef,
        monacoRef,
        fileContent: fileContents[activeFile || ''] || code,
        editorVersion,
    });

    
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                cursorStyle: insertMode ? 'line' : 'block',
            });
        }
    }, [insertMode]);

    
    useEffect(() => {
        if (editorRef.current && availableFonts && availableFonts.length > 0) {
            const font = availableFonts.find((f: { id: string; name: string; stack: string }) => f.id === fontSettings.fontFamily);
            const fontStack = font?.stack || availableFonts[0].stack;

            editorRef.current.updateOptions({
                fontFamily: fontStack,
                fontSize: fontSettings.fontSize,
                lineHeight: fontSettings.fontSize * fontSettings.lineHeight,
            });
        }
    }, [fontSettings, availableFonts]);

    
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                tabSize: tabSize,
                indentSize: tabSize,
            });
        }
    }, [tabSize]);

    
    useEffect(() => {
        if (monacoRef.current && themesRegisteredRef.current) {
            monacoRef.current.editor.setTheme(getMonacoThemeName(theme));
        }
    }, [theme]);

    // Cleanup function for Monaco resources
    useEffect(() => {
        return () => {
            // Dispose all Monaco resources when component unmounts
            disposablesRef.current.forEach(disposable => {
                try {
                    if (disposable && typeof disposable.dispose === 'function') {
                        disposable.dispose();
                    }
                } catch (error) {
                    console.warn('Error disposing Monaco resource:', error);
                }
            });
            disposablesRef.current = [];

            // Clear diagnostics listener
            if (diagnosticsListenerRef.current) {
                try {
                    diagnosticsListenerRef.current.dispose();
                } catch (error) {
                    console.warn('Error disposing diagnostics listener:', error);
                }
                diagnosticsListenerRef.current = null;
            }

            // Clear editor and monaco refs
            editorRef.current = null;
            monacoRef.current = null;
        };
    }, []);

    
    const activeDiff = activeDiffTab ? openDiffTabs.find(t => t.id === activeDiffTab) : null;
    const activeSettings = activeSettingsTab ? openSettingsTabs.find(t => t.id === activeSettingsTab) : null;
    const activeProfiles = activeProfilesTab ? openProfilesTabs.find(t => t.id === activeProfilesTab) : null;
    const activeTimelineDiff = activeTimelineDiffTab ? openTimelineDiffTabs.find(t => t.id === activeTimelineDiffTab) : null;
    const activeCommitDiff = activeCommitDiffTab ? openCommitDiffTabs.find(t => t.id === activeCommitDiffTab) : null;

    
    

    
    useEffect(() => {
        const loadFile = async () => {
            if (!activeFile) {
                setIsBinary(false);
                return;
            }

            if (deletedFiles[activeFile]) {
                setIsBinary(false);
                return;
            }

            if (!activeFile.trim() || activeFile === '/') {
                setCode("// Invalid file path");
                setLanguage('plaintext');
                setIsBinary(false);
                return;
            }

            const ext = getFileExtension(activeFile);
            const isImg = isImageFile(activeFile);
            const isAud = isAudioFile(activeFile);
            const isVid = isVideoFile(activeFile);

            
            
            
            

            if (isImg) {
                
                setIsBinary(false);
                return;
            }

            if (isVid) {
                
                setIsBinary(false);
                return;
            }

            if (isAud) {
                
                setIsBinary(false);
                return;
            }

            if (isBinaryExtension(activeFile)) {
                setIsBinary(true);
                return;
            }

            try {
                
                
                if (isVideoFile(activeFile) || isAudioFile(activeFile) || isImageFile(activeFile)) {
                    setIsBinary(false);
                    return;
                }
                const content = await tauriApi.readFile(activeFile);

                if (isBinaryContent(content)) {
                    setIsBinary(true);
                    return;
                }

                setIsBinary(false);
                setCode(content);
                setFileContent(activeFile, content);
                setLanguage(getLanguageFromExtension(ext));
            } catch (error) {
                const errorStr = String(error);
                if (errorStr.includes('File does not exist')) {
                    const { markPathDeleted } = useProjectStore.getState();
                    markPathDeleted(activeFile);
                    return;
                }
                if (errorStr.includes('stream did not contain valid UTF-8') ||
                    errorStr.includes('invalid utf-8') ||
                    errorStr.toLowerCase().includes('binary')) {
                    setIsBinary(true);
                } else {
                    setCode("// Error loading file");
                    setLanguage('plaintext');
                    setIsBinary(false);
                }
            }
        };
        loadFile();
    }, [activeFile, setFileContent, deletedFiles]);

    
    if (activeProfiles) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <ProfilesPane />
                </div>
            </div>
        );
    }

    
    if (activeSettings) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <SettingsPane initialSection={activeSettings.section} />
                </div>
            </div>
        );
    }

    
    if (activeDiff && currentWorkspace) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <DiffEditor
                        filePath={activeDiff.filePath}
                        isStaged={activeDiff.isStaged}
                        workspacePath={currentWorkspace}
                    />
                </div>
            </div>
        );
    }

    
    if (activeTimelineDiff) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <TimelineDiffEditor
                        filePath={activeTimelineDiff.filePath}
                        oldContent={activeTimelineDiff.oldContent}
                        newContent={activeTimelineDiff.newContent}
                        date={activeTimelineDiff.date}
                    />
                </div>
            </div>
        );
    }

    // Render Commit Diff Editor
    if (activeCommitDiff) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <TimelineDiffEditor
                        filePath={activeCommitDiff.filePath}
                        oldContent={activeCommitDiff.oldContent}
                        newContent={activeCommitDiff.newContent}
                        date={`Commit: ${activeCommitDiff.commitMessage}`}
                    />
                </div>
            </div>
        );
    }

    
    if (!activeFile) {
        return <EditorWelcome />;
    }

    
    if (isImageFile(activeFile || '')) {
        return <ImageViewer path={activeFile} />;
    }

    
    if (isVideoFile(activeFile || '')) {
        return <VideoViewer path={activeFile} />;
    }

    
    if (isAudioFile(activeFile || '')) {
        return <AudioViewer path={activeFile} />;
    }

    
    if (isBinary) {
        const fileName = activeFile.split(/[\\/]/).pop() || activeFile;
        return <BinaryWarning fileName={fileName} />;
    }

    // Нормализуем путь для Monaco Editor (всегда используем прямые слэши)
    const monacoPath = activeFile ? activeFile.replace(/\\/g, '/') : activeFile;

    
    const editorContent = (
        <MonacoEditor
            key={`${activeFile}-${editorVersion}-${fontSettings.fontFamily}-${fontSettings.fontSize}-${fontSettings.lineHeight}`}
            height="100%"
            language={language}
            path={monacoPath} // Используем нормализованный путь для Monaco URI
            value={fileContents[activeFile] || code}
            theme={getMonacoThemeName(theme)}
            options={getEditorOptions(fontSettings, availableFonts, minimapEnabled, lineNumbersEnabled, tabSize)}
            beforeMount={(monaco) => {
                if (!themesRegisteredRef.current) {
                    registerMonacoThemes(monaco);
                    themesRegisteredRef.current = true;
                }
            }}
            onChange={(value) => {
                if (activeFile && value !== undefined) {
                    setCode(value);
                    setFileContent(activeFile, value);

                    
                    if (autoSaveEnabled && unsavedChanges[activeFile]) {
                        scheduleAutoSave(activeFile);
                    }
                }
            }}
            onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                
                setEditorInstance(editor);
                setMonacoInstance(monaco);

                if (!monacoConfiguredRef.current) {
                    configureMonacoTypeScript(monaco);
                    monacoConfiguredRef.current = true;
                }

                
                const currentThemeName = getMonacoThemeName(theme);
                const themeData = (monaco.editor as any)._themeService?._theme?.themeData;
                if (themeData) {
                    themeData.colors = themeData.colors || {};
                    themeData.colors['editor.lineHighlightBorder'] = '#00000000';
                }

                // Get the current theme object and ensure selection colors are set
                const currentThemeObj = themes[theme];
                if (currentThemeObj) {
                    const customTheme = {
                        base: currentThemeObj.type === 'dark' ? 'vs-dark' : 'vs',
                        inherit: true,
                        rules: [],
                        colors: {
                            'editor.background': currentThemeObj.colors.background,
                            'editor.foreground': currentThemeObj.colors.foreground,
                            'editor.selectionBackground': currentThemeObj.colors.selection,
                            'editor.selectionForeground': currentThemeObj.colors.foreground,
                            'editor.inactiveSelectionBackground': currentThemeObj.colors.selection + '80',
                        }
                    };

                    try {
                        monaco.editor.defineTheme(currentThemeName + '-custom', customTheme);
                        monaco.editor.setTheme(currentThemeName + '-custom');

                        // Force update editor to apply selection colors
                        setTimeout(() => {
                            if (editor) {
                                editor.updateOptions({
                                    theme: currentThemeName + '-custom'
                                });
                            }
                        }, 0);
                    } catch (e) {
                        // Fallback to original theme
                        monaco.editor.setTheme(currentThemeName);
                    }
                } else {
                    monaco.editor.setTheme(currentThemeName);
                }

                const cursorPositionDisposable = editor.onDidChangeCursorPosition((e: any) => {
                    const position = e.position;
                    setCursorPosition({
                        line: position.lineNumber,
                        column: position.column
                    });
                });
                disposablesRef.current.push(cursorPositionDisposable);

                const position = editor.getPosition();
                if (position) {
                    setCursorPosition({
                        line: position.lineNumber,
                        column: position.column
                    });
                }

                if (diagnosticsListenerRef.current) {
                    diagnosticsListenerRef.current.dispose();
                }
                diagnosticsListenerRef.current = monaco.editor.onDidChangeMarkers(() => {
                    collectDiagnostics();
                    
                    updateOutlineDebounced();
                });
                disposablesRef.current.push(diagnosticsListenerRef.current);

                
                setTimeout(collectDiagnostics, 300);
                
                updateOutlineDebounced();

                return () => {
                    // Cleanup is handled by the main cleanup effect
                };
            }}
        />
    );

    return (
        <div className={styles.root}>
            <div className={styles.container}>
                <BreadcrumbBar filePath={activeFile} />
                {editorContent}
            </div>
        </div>
    );
};
