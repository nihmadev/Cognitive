import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { useEditorStore } from '../../../store/editorStore';
import { useAutoSaveStore } from '../../../store/autoSaveStore';
import { tauriApi } from '../../../lib/tauri-api';
import { configureMonacoTypeScript } from '../../../lib/monaco-config';
import { registerMonacoThemes, getMonacoThemeName } from '../../../themes/monaco-themes';
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
    } = useProjectStore();

    // Debug: log on every render (using error to ensure visibility)
    // console.error('=== CodeEditor RENDER ===', { activeSettingsTab, openSettingsTabs, activeFile });

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

    const { collectDiagnostics, updateOutlineDebounced } = useEditorEvents({
        activeFile,
        currentWorkspace,
        editorRef,
        monacoRef,
    });

    // Update cursor style based on insert mode
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                cursorStyle: insertMode ? 'line' : 'block',
            });
        }
    }, [insertMode]);

    // Update font settings when they change
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

    // Update tab size when it changes
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                tabSize: tabSize,
                indentSize: tabSize,
            });
        }
    }, [tabSize]);

    // Update Monaco theme when app theme changes
    useEffect(() => {
        if (monacoRef.current && themesRegisteredRef.current) {
            monacoRef.current.editor.setTheme(getMonacoThemeName(theme));
        }
    }, [theme]);

    // Find active tabs
    const activeDiff = activeDiffTab ? openDiffTabs.find(t => t.id === activeDiffTab) : null;
    const activeSettings = activeSettingsTab ? openSettingsTabs.find(t => t.id === activeSettingsTab) : null;
    const activeProfiles = activeProfilesTab ? openProfilesTabs.find(t => t.id === activeProfilesTab) : null;
    const activeTimelineDiff = activeTimelineDiffTab ? openTimelineDiffTabs.find(t => t.id === activeTimelineDiffTab) : null;

    // Debug: log settings state
    // console.log('Editor render - activeSettingsTab:', activeSettingsTab, 'openSettingsTabs:', openSettingsTabs, 'activeSettings:', activeSettings);

    // Load file content
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
                console.error('Invalid file path:', activeFile);
                setCode("// Invalid file path");
                setLanguage('plaintext');
                setIsBinary(false);
                return;
            }

            const ext = getFileExtension(activeFile);
            const isImg = isImageFile(activeFile);
            const isAud = isAudioFile(activeFile);
            const isVid = isVideoFile(activeFile);

            // Debug all states for mp4 files
            // if (activeFile && activeFile.includes('.mp4')) {
            //     console.log('MP4 file debug - isImg:', isImg, 'isAud:', isAud, 'isVid:', isVid);
            // }

            if (isImg) {
                // console.log('Returning early for image file:', activeFile);
                setIsBinary(false);
                return;
            }

            if (isVid) {
                // console.log('Returning early for video file:', activeFile);
                setIsBinary(false);
                return;
            }

            if (isAud) {
                // console.log('Returning early for audio file:', activeFile);
                setIsBinary(false);
                return;
            }

            if (isBinaryExtension(activeFile)) {
                setIsBinary(true);
                return;
            }

            try {
                // console.log('About to read file as text - this should not happen for media files:', activeFile);
                // Double-check before reading as text
                if (isVideoFile(activeFile) || isAudioFile(activeFile) || isImageFile(activeFile)) {
                    console.error('Attempting to read media file as text:', activeFile);
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
                console.error('Failed to load file:', activeFile, error);
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

    // Show profiles pane
    if (activeProfiles) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <ProfilesPane />
                </div>
            </div>
        );
    }

    // Show settings pane
    if (activeSettings) {
        return (
            <div className={styles.root}>
                <div className={styles.container}>
                    <SettingsPane initialSection={activeSettings.section} />
                </div>
            </div>
        );
    }

    // Show diff editor
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

    // Show timeline diff editor
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

    // Show welcome screen
    if (!activeFile) {
        return <EditorWelcome />;
    }

    // Show image viewer
    if (isImageFile(activeFile || '')) {
        return <ImageViewer path={activeFile} />;
    }

    // Show video viewer (priority over audio for overlapping extensions)
    if (isVideoFile(activeFile || '')) {
        return <VideoViewer path={activeFile} />;
    }

    // Show audio viewer
    if (isAudioFile(activeFile || '')) {
        return <AudioViewer path={activeFile} />;
    }

    // Show binary warning
    if (isBinary) {
        const fileName = activeFile.split(/[\\/]/).pop() || activeFile;
        return <BinaryWarning fileName={fileName} />;
    }

    // Render editor with split view support
    const editorContent = (
        <MonacoEditor
            key={`${activeFile}-${editorVersion}-${fontSettings.fontFamily}-${fontSettings.fontSize}-${fontSettings.lineHeight}`}
            height="100%"
            language={language}
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

                    // Schedule AutoSave if enabled and there are unsaved changes
                    if (autoSaveEnabled && unsavedChanges[activeFile]) {
                        scheduleAutoSave(activeFile);
                    }
                }
            }}
            onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                // Store instances globally for Outline access
                setEditorInstance(editor);
                setMonacoInstance(monaco);

                if (!monacoConfiguredRef.current) {
                    configureMonacoTypeScript(monaco);
                    monacoConfiguredRef.current = true;
                }

                // Fix line highlight border color - override after theme is applied
                const currentThemeName = getMonacoThemeName(theme);
                const themeData = (monaco.editor as any)._themeService?._theme?.themeData;
                if (themeData) {
                    themeData.colors = themeData.colors || {};
                    themeData.colors['editor.lineHighlightBorder'] = '#00000000';
                }
                // Re-apply theme to ensure changes take effect
                monaco.editor.setTheme(currentThemeName);

                const disposable = editor.onDidChangeCursorPosition((e: any) => {
                    const position = e.position;
                    setCursorPosition({
                        line: position.lineNumber,
                        column: position.column
                    });
                });

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
                    // Also update outline on marker changes (indicates parsing complete)
                    updateOutlineDebounced();
                });

                // Initial diagnostics and outline collection
                setTimeout(collectDiagnostics, 300);
                // Trigger outline collection immediately on mount
                updateOutlineDebounced();

                return () => {
                    disposable.dispose();
                    if (diagnosticsListenerRef.current) {
                        diagnosticsListenerRef.current.dispose();
                    }
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
