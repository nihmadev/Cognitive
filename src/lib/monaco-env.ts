// Monaco Editor environment configuration for production builds
// This ensures Monaco workers load correctly in Tauri production mode

export function setupMonacoEnvironment() {
  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.MonacoEnvironment = {
      getWorkerUrl: function (_moduleId: string, label: string) {
        // In production, workers are bundled by vite-plugin-monaco-editor
        // The plugin handles worker paths automatically, but we need to ensure
        // they're loaded from the correct location in Tauri
        const base = import.meta.env.PROD ? './' : '/';
        
        if (label === 'json') {
          return `${base}monacoeditorwork/json.worker.js`;
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return `${base}monacoeditorwork/css.worker.js`;
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return `${base}monacoeditorwork/html.worker.js`;
        }
        if (label === 'typescript' || label === 'javascript') {
          return `${base}monacoeditorwork/ts.worker.js`;
        }
        return `${base}monacoeditorwork/editor.worker.js`;
      }
    };
  }
}
