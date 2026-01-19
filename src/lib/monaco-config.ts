
export function configureMonacoTypeScript(monaco: any) {
    
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    
    const compilerOptions = {
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        lib: ['ES2020', 'ES2019', 'ES2018', 'ES2017', 'ES2016', 'ES2015', 'DOM', 'DOM.Iterable'],
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs, 

        
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,

        
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        jsxImportSource: 'react',

        
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,

        
        strict: true,
        noUnusedLocals: false, 
        noUnusedParameters: false, 
        noFallthroughCasesInSwitch: true,

        
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,

        
        baseUrl: '.',

        
        
        paths: {
            '@/*': ['src/*']
        }
    };

    
    tsDefaults.setCompilerOptions(compilerOptions);

    
    jsDefaults.setCompilerOptions({
        ...compilerOptions,
        allowJs: true,
        checkJs: false
    });

    
    // Отключаем встроенную диагностику Monaco, полагаемся только на LSP (как в VSCode)
    const diagnosticsOptions = {
        noSemanticValidation: true,  // Отключаем семантическую валидацию Monaco
        noSyntaxValidation: false,   // Оставляем только синтаксическую валидацию
        noSuggestionDiagnostics: true, // Отключаем подсказки Monaco
    };

    tsDefaults.setDiagnosticsOptions(diagnosticsOptions);
    jsDefaults.setDiagnosticsOptions(diagnosticsOptions);

    
    tsDefaults.setEagerModelSync(true);
    jsDefaults.setEagerModelSync(true);

    console.log('Monaco TypeScript configuration applied (LSP-only mode, like VSCode)');

    // Добавляем типы для CSS модулей и других ассетов
    const cssModuleDeclaration = `
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

declare module '*.sass' {
  const content: string;
  export default content;
}

declare module '*.less' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.bmp' {
  const content: string;
  export default content;
}
`;

    
    tsDefaults.addExtraLib(cssModuleDeclaration, 'file:///node_modules/@types/css-modules/index.d.ts');
    jsDefaults.addExtraLib(cssModuleDeclaration, 'file:///node_modules/@types/css-modules/index.d.ts');
}
