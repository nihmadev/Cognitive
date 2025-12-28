/**
 * Configure Monaco Editor's TypeScript language service
 * to match the project's tsconfig.json settings
 */
export function configureMonacoTypeScript(monaco: any) {
    // Get the TypeScript defaults
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    // Configure compiler options to match tsconfig.json
    const compilerOptions = {
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs, // Bundler not available, use NodeJs

        // Allow importing TypeScript extensions (for Vite)
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,

        // JSX settings
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        jsxImportSource: 'react',

        // Module interop
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,

        // Strict type checking
        strict: true,
        noUnusedLocals: false, // Disable to reduce noise in editor
        noUnusedParameters: false, // Disable to reduce noise in editor
        noFallthroughCasesInSwitch: true,

        // Additional settings
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,

        // Base URL for module resolution
        baseUrl: '.',

        // Paths are handled by the bundler, but we can hint Monaco
        // Note: Monaco doesn't fully support path mapping, but we configure it anyway
        paths: {
            '@/*': ['src/*']
        }
    };

    // Apply settings to TypeScript
    tsDefaults.setCompilerOptions(compilerOptions);

    // Apply settings to JavaScript
    jsDefaults.setCompilerOptions({
        ...compilerOptions,
        allowJs: true,
        checkJs: false
    });

    // Configure diagnostics options
    const diagnosticsOptions = {
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,

        // Customize which diagnostics to show
        diagnosticCodesToIgnore: [
            // Ignore "Cannot find module" errors for CSS modules
            2307, // Cannot find module or its corresponding type declarations
            // Ignore some common false positives
            6133, // Variable is declared but never used (we disabled this in compiler options)
            6192, // All imports in import declaration are unused
        ]
    };

    tsDefaults.setDiagnosticsOptions(diagnosticsOptions);
    jsDefaults.setDiagnosticsOptions(diagnosticsOptions);

    // Enable IntelliSense features
    tsDefaults.setEagerModelSync(true);
    jsDefaults.setEagerModelSync(true);

    // Configure worker handling to prevent source file errors
    monaco.languages.typescript.javascriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
    });
    monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
    });

    // Add extra libraries for better IntelliSense
    // This helps Monaco understand CSS modules and other special imports
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

    // Add the CSS module declarations to Monaco's extra libs
    tsDefaults.addExtraLib(cssModuleDeclaration, 'file:///node_modules/@types/css-modules/index.d.ts');
    jsDefaults.addExtraLib(cssModuleDeclaration, 'file:///node_modules/@types/css-modules/index.d.ts');

    console.log('Monaco TypeScript configuration applied');
}
