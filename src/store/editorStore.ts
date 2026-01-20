import { create } from 'zustand';
import { tauriApi } from '../lib/tauri-api';
import { useProjectStore } from './projectStore';


const getCurrentCssSymbol = (model: any, position: any): string | null => {
    try {
        const line = position.lineNumber;
        const column = position.column;
        const lineContent = model.getLineContent(line);
        
        
        const classMatch = lineContent.match(/\.([a-zA-Z][\w-]*)/);
        if (classMatch) {
            const classStart = lineContent.indexOf(classMatch[0]);
            const classEnd = classStart + classMatch[0].length;
            if (column >= classStart && column <= classEnd) {
                return `.${classMatch[1]}`;
            }
        }
        
        
        const idMatch = lineContent.match(/#([a-zA-Z][\w-]*)/);
        if (idMatch) {
            const idStart = lineContent.indexOf(idMatch[0]);
            const idEnd = idStart + idMatch[0].length;
            if (column >= idStart && column <= idEnd) {
                return `#${idMatch[1]}`;
            }
        }
        
        
        const elementMatch = lineContent.match(/([a-zA-Z][\w-]*)\s*{/);
        if (elementMatch) {
            const elementStart = lineContent.indexOf(elementMatch[1]);
            const elementEnd = elementStart + elementMatch[1].length;
            if (column >= elementStart && column <= elementEnd) {
                return elementMatch[1];
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
};


const getCurrentTsJsSymbol = (monaco: any, model: any, position: any): string | null => {
    try {
        
        if (monaco.languages && monaco.languages.getDocumentSymbols) {
            try {
                const symbols = monaco.languages.getDocumentSymbols(model);
                if (symbols && symbols.length > 0) {
                    
                    let bestMatch: any = null;
                    let smallestRange = Infinity;
                    
                    for (const symbol of symbols) {
                        if (symbol.range && 
                            position.lineNumber >= symbol.range.startLineNumber &&
                            position.lineNumber <= symbol.range.endLineNumber &&
                            position.column >= symbol.range.startColumn &&
                            position.column <= symbol.range.endColumn) {
                            
                            
                            const rangeSize = (symbol.range.endLineNumber - symbol.range.startLineNumber) * 1000 + 
                                           (symbol.range.endColumn - symbol.range.startColumn);
                            
                            if (rangeSize < smallestRange) {
                                smallestRange = rangeSize;
                                bestMatch = symbol;
                            }
                        }
                    }
                    
                    if (bestMatch) {
                        return bestMatch.name;
                    }
                }
            } catch (symbolError) {
            }
        }
        
        
        const currentLine = position.lineNumber;
        const currentColumn = position.column;
        
        
        const startLine = Math.max(1, currentLine - 5);
        const endLine = Math.min(model.getLineCount(), currentLine + 5);
        
        
        const candidates: Array<{name: string, line: number, startCol: number, endCol: number, priority: number}> = [];
        
        for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
            const lineContent = model.getLineContent(lineNum);
            const lineTrimmed = lineContent.trim();
            
            
            if (!lineTrimmed || lineTrimmed.startsWith('//') || lineTrimmed.startsWith('/*')) {
                continue;
            }
            
            
            const hookMatch = lineContent.match(/(use\w+|React\.\w+)\s*\(/);
            if (hookMatch) {
                const startCol = lineContent.indexOf(hookMatch[1]) + 1;
                const endCol = startCol + hookMatch[1].length;
                candidates.push({
                    name: hookMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const funcMatch = lineContent.match(/function\s+(\w+)\s*\(/);
            if (funcMatch) {
                const startCol = lineContent.indexOf(funcMatch[1]) + 1;
                const endCol = startCol + funcMatch[1].length;
                candidates.push({
                    name: funcMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const arrowFuncMatch = lineContent.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|\w+\s*\([^)]*\))/);
            if (arrowFuncMatch) {
                const startCol = lineContent.indexOf(arrowFuncMatch[1]) + 1;
                const endCol = startCol + arrowFuncMatch[1].length;
                candidates.push({
                    name: arrowFuncMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const classMatch = lineContent.match(/class\s+(\w+)/);
            if (classMatch) {
                const startCol = lineContent.indexOf(classMatch[1]) + 1;
                const endCol = startCol + classMatch[1].length;
                candidates.push({
                    name: classMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const interfaceMatch = lineContent.match(/interface\s+(\w+)/);
            if (interfaceMatch) {
                const startCol = lineContent.indexOf(interfaceMatch[1]) + 1;
                const endCol = startCol + interfaceMatch[1].length;
                candidates.push({
                    name: interfaceMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const typeMatch = lineContent.match(/type\s+(\w+)/);
            if (typeMatch) {
                const startCol = lineContent.indexOf(typeMatch[1]) + 1;
                const endCol = startCol + typeMatch[1].length;
                candidates.push({
                    name: typeMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const componentMatch = lineContent.match(/(?:const|let|var)\s+([A-Z]\w*)\s*=/);
            if (componentMatch) {
                const startCol = lineContent.indexOf(componentMatch[1]) + 1;
                const endCol = startCol + componentMatch[1].length;
                candidates.push({
                    name: componentMatch[1],
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
            
            
            const decoratorMatch = lineContent.match(/@([a-zA-Z][\w-]*)/);
            if (decoratorMatch) {
                const startCol = lineContent.indexOf(decoratorMatch[0]) + 1;
                const endCol = startCol + decoratorMatch[0].length;
                candidates.push({
                    name: `@${decoratorMatch[1]}`,
                    line: lineNum,
                    startCol,
                    endCol,
                    priority: lineNum === currentLine && currentColumn >= startCol && currentColumn <= endCol ? 100 : 50
                });
            }
        }
        
        
        if (candidates.length > 0) {
            
            candidates.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                
                const distanceA = Math.abs(a.line - currentLine);
                const distanceB = Math.abs(b.line - currentLine);
                return distanceA - distanceB;
            });
            
            return candidates[0].name;
        }
        
        
        const wordAtPosition = model.getWordAtPosition(position);
        if (wordAtPosition && wordAtPosition.word) {
            return wordAtPosition.word;
        }
        
        return null;
    } catch (error) {
        return null;
    }
};

interface EditorStore {
    editorInstance: any | null;
    monacoInstance: any | null;
    currentFilePath: string | null;
    setEditorInstance: (editor: any) => void;
    setMonacoInstance: (monaco: any) => void;
    setCurrentFilePath: (path: string | null) => void;
    selectAll: () => void;
    save: () => Promise<void>;
    saveAs: () => Promise<void>;
    getCurrentSymbol: () => string | null;
    getSymbolHierarchy: () => Promise<any[]>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
    editorInstance: null,
    monacoInstance: null,
    currentFilePath: null,
    setEditorInstance: (editor) => set({ editorInstance: editor }),
    setMonacoInstance: (monaco) => set({ monacoInstance: monaco }),
    setCurrentFilePath: (path) => set({ currentFilePath: path }),
    selectAll: () => {
        const { editorInstance } = get();
        if (editorInstance) {
            try {
                editorInstance.getAction('editor.action.selectAll').run();
            } catch (error) {
                
                editorInstance.setSelection(editorInstance.getModel().getFullModelRange());
            }
        }
    },
    save: async () => {
        const { editorInstance, currentFilePath } = get();
        if (!editorInstance) {
            return;
        }

        const content = editorInstance.getValue();
        
        
        const projectStore = useProjectStore.getState();
        const activeFilePath = projectStore.activeFile || currentFilePath;
        
        if (activeFilePath) {
            try {
                await tauriApi.writeFile(activeFilePath, content);
                
                projectStore.setFileContent(activeFilePath, content);
                projectStore.markFileAsSaved(activeFilePath);
            } catch (error) {
            }
        } else {
            
            await get().saveAs();
        }
    },
    saveAs: async () => {
        const { editorInstance } = get();
        if (!editorInstance) {
            return;
        }

        const content = editorInstance.getValue();
        
        try {
            const filePath = await tauriApi.saveFileDialog();
            if (filePath) {
                await tauriApi.writeFile(filePath, content);
                
                
                const projectStore = useProjectStore.getState();
                projectStore.openFile(filePath);
                projectStore.setFileContent(filePath, content);
                projectStore.markFileAsSaved(filePath);
                
                set({ currentFilePath: filePath });
            }
        } catch (error) {
        }
    },
    getCurrentSymbol: () => {
        const { editorInstance, monacoInstance } = get();
        if (!editorInstance || !monacoInstance) {
            return null;
        }

        try {
            const model = editorInstance.getModel();
            if (!model) {
                return null;
            }

            const position = editorInstance.getPosition();
            if (!position) {
                return null;
            }

            
            const languageId = model.getLanguageId();
            
            
            if (languageId === 'css') {
                return getCurrentCssSymbol(model, position);
            }
            
            
            if (['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)) {
                return getCurrentTsJsSymbol(monacoInstance, model, position);
            }

            
            const word = model.getWordAtPosition(position);
            return word ? word.word : null;
        } catch (error) {
            return null;
        }
    },
    getSymbolHierarchy: async () => {
        const { editorInstance, monacoInstance } = get();
        if (!editorInstance || !monacoInstance) {
            return [];
        }

        try {
            const model = editorInstance.getModel();
            if (!model) {
                return [];
            }

            const position = editorInstance.getPosition();
            if (!position) {
                return [];
            }

            
            const languageId = model.getLanguageId();
            
            
            if (!['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId)) {
                return [];
            }

            try {
                // Check if this is an in-memory model
                if (model.uri.scheme === 'inmemory') {
                    return [];
                }
                
                // Проверяем что это TypeScript/JavaScript файл по расширению
                const uriPath = model.uri.path;
                const ext = uriPath.split('.').pop()?.toLowerCase();
                if (!ext || !['ts', 'tsx', 'js', 'jsx', 'mts', 'cts', 'mjs', 'cjs'].includes(ext)) {
                    return [];
                }
                
                const worker = await monacoInstance.languages.typescript.getTypeScriptWorker();
                const client = await worker(model.uri);
                
                // Если worker вернул null (файл отфильтрован), возвращаем пустой массив
                if (!client) {
                    return [];
                }
                
                if (!client || typeof client.getNavigationBarItems !== 'function') {
                    return [];
                }
                
                const symbols = await client.getNavigationBarItems(model.uri.toString());
                if (!symbols || symbols.length === 0) {
                    return [];
                }

                
                const containingSymbols: Array<{
                    name: string;
                    kind: any;
                    detail: string;
                    range: any;
                    selectionRange: any;
                }> = [];
                const currentLine = position.lineNumber;
                const currentColumn = position.column;

                const processSymbols = (items: any[]) => {
                    for (const item of items) {
                        const range = item.spans?.[0];
                        if (!range) continue;

                        const isInRange = 
                            currentLine >= range.start.line &&
                            currentLine <= range.end.line &&
                            (currentLine > range.start.line || currentColumn >= range.start.column) &&
                            (currentLine < range.end.line || currentColumn <= range.end.column);

                        if (isInRange) {
                            containingSymbols.push({
                                name: item.text,
                                kind: item.kind,
                                detail: item.kind,
                                range: {
                                    startLineNumber: range.start.line,
                                    startColumn: range.start.column,
                                    endLineNumber: range.end.line,
                                    endColumn: range.end.column
                                },
                                selectionRange: {
                                    startLineNumber: range.start.line,
                                    startColumn: range.start.column,
                                    endLineNumber: range.end.line,
                                    endColumn: range.end.column
                                }
                            });

                            
                            if (item.childItems && item.childItems.length > 0) {
                                processSymbols(item.childItems);
                            }
                            break;
                        }
                    }
                };

                processSymbols(symbols);

                
                containingSymbols.sort((a, b) => {
                    const sizeA = (a.range.endLineNumber - a.range.startLineNumber) * 1000 + 
                                 (a.range.endColumn - a.range.startColumn);
                    const sizeB = (b.range.endLineNumber - b.range.startLineNumber) * 1000 + 
                                 (b.range.endColumn - b.range.startColumn);
                    return sizeA - sizeB;
                });

                return containingSymbols;
            } catch (tsError: any) {
                
                
                if (tsError.message && tsError.message.includes('Could not find source file')) {
                    return [];
                }
                
                if (monacoInstance.languages && monacoInstance.languages.getDocumentSymbols) {
                    const symbols = monacoInstance.languages.getDocumentSymbols(model);
                    if (symbols && symbols.length > 0) {
                        return symbols
                            .filter((symbol: any) => {
                                const range = symbol.range;
                                return (
                                    range &&
                                    position.lineNumber >= range.startLineNumber &&
                                    position.lineNumber <= range.endLineNumber &&
                                    position.column >= range.startColumn &&
                                    position.column <= range.endColumn
                                );
                            })
                            .map((symbol: any) => ({
                                name: symbol.name,
                                kind: symbol.kind,
                                detail: symbol.detail,
                                range: symbol.range,
                                selectionRange: symbol.selectionRange
                            }))
                            .sort((a: any, b: any) => {
                                const sizeA = (a.range.endLineNumber - a.range.startLineNumber) * 1000 + 
                                             (a.range.endColumn - a.range.startColumn);
                                const sizeB = (b.range.endLineNumber - b.range.startLineNumber) * 1000 + 
                                             (b.range.endColumn - b.range.startColumn);
                                return sizeA - sizeB;
                            });
                    }
                }
                return [];
            }
        } catch (error) {
            return [];
        }
    },
}));
