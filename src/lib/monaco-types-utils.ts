// Утилиты для работы с типами Monaco Editor
import * as monaco from 'monaco-editor';

export function setupMonacoTypeDefinitions(monacoInstance: any) {
    const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults;
    const jsDefaults = monacoInstance.languages.typescript.javascriptDefaults;

    // Добавляем основные типы пакетов из node_modules
    const packageTypes = [
        // React экосистема
        'react',
        'react-dom', 
        '@types/react',
        '@types/react-dom',
        
        // Основные Node.js типы
        '@types/node',
        
        // UI библиотеки из проекта
        '@monaco-editor/react',
        '@reduxjs/toolkit',
        'react-redux',
        'lucide-react',
        'tailwindcss',
        
        // Другие важные пакеты
        'axios',
        'lodash',
        'uuid'
    ];

    packageTypes.forEach(packageName => {
        try {
            // Пытаемся добавить базовые объявления типов
            const typeDeclaration = generateTypeDeclaration(packageName);
            tsDefaults.addExtraLib(typeDeclaration, `file:///node_modules/${packageName}/index.d.ts`);
            jsDefaults.addExtraLib(typeDeclaration, `file:///node_modules/${packageName}/index.d.ts`);
        } catch (error) {
            console.warn(`Failed to add types for ${packageName}:`, error);
        }
    });

    // Добавляем глобальные объявления для улучшенного автокомплита
    const globalDeclarations = `
// Глобальные типы для улучшенной работы в Monaco
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            [key: string]: string | undefined;
        }
    }
    
    interface Window {
        [key: string]: any;
    }
}

// Расширения для React
declare namespace React {
    interface CSSProperties {
        [key: string]: string | number | undefined;
    }
}

// Типы для событий
interface Event {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget;
    currentTarget: EventTarget;
}

interface MouseEvent extends Event {
    clientX: number;
    clientY: number;
    button: number;
}

interface KeyboardEvent extends Event {
    key: string;
    code: string;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
}
`;

    tsDefaults.addExtraLib(globalDeclarations, 'file:///global-types.d.ts');
    jsDefaults.addExtraLib(globalDeclarations, 'file:///global-types.d.ts');
}

function generateTypeDeclaration(packageName: string): string {
    // Генерируем базовые объявления для популярных пакетов
    const commonDeclarations: Record<string, string> = {
        'react': `
declare module 'react' {
    export interface ReactElement {
        type: any;
        props: any;
        key: any;
    }
    
    export interface Component<P = {}, S = {}> {
        props: P;
        state: S;
        render(): ReactElement | null;
    }
    
    export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
    export const Fragment: any;
    export const useState: <S>(initialState: S | (() => S)) => [S, (value: S) => void];
    export const useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
    export const useRef: <T>(initialValue: T) => { current: T };
    export const useCallback: <T extends Function>(callback: T, deps: any[]) => T;
    export const useMemo: <T>(factory: () => T, deps: any[]) => T;
}`,
        
        'react-dom': `
declare module 'react-dom' {
    export function render(element: any, container: Element): void;
    export const createRoot: (container: Element) => { render: (element: any) => void };
}`,
        
        '@reduxjs/toolkit': `
declare module '@reduxjs/toolkit' {
    export interface ConfigureStoreOptions {
        reducer: any;
        middleware?: any[];
        devTools?: boolean;
    }
    
    export function configureStore(options: ConfigureStoreOptions): any;
    export function createSlice<T>(config: {
        name: string;
        initialState: T;
        reducers: any;
    }): any;
}`,
        
        'axios': `
declare module 'axios' {
    export interface AxiosResponse<T = any> {
        data: T;
        status: number;
        statusText: string;
        headers: any;
    }
    
    export interface AxiosRequestConfig {
        url?: string;
        method?: string;
        data?: any;
        params?: any;
        headers?: any;
    }
    
    export function get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    export function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    export function put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    export function delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}`,
        
        'lodash': `
declare module 'lodash' {
    export function get(object: any, path: string, defaultValue?: any): any;
    export function set(object: any, path: string, value: any): any;
    export function merge(object: any, ...sources: any[]): any;
    export function cloneDeep(value: any): any;
    export function debounce(func: Function, wait: number): Function;
    export function throttle(func: Function, wait: number): Function;
}`,
        
        'uuid': `
declare module 'uuid' {
    export function v4(): string;
    export function v5(name: string, namespace: string): string;
}`
    };

    return commonDeclarations[packageName] || `
// Базовые объявления для ${packageName}
declare module '${packageName}' {
    export * from '${packageName}';
}`;
}

// Функция для динамической загрузки типов из node_modules
export async function loadTypesFromNodeModules(monacoInstance: any, packageName: string) {
    try {
        // В реальном приложении здесь можно было бы загружать реальные .d.ts файлы
        // из node_modules через fetch или другой механизм
        const typeDeclaration = generateTypeDeclaration(packageName);
        
        monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
            typeDeclaration, 
            `file:///node_modules/${packageName}/index.d.ts`
        );
        
        monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
            typeDeclaration, 
            `file:///node_modules/${packageName}/index.d.ts`
        );
        
        return true;
    } catch (error) {
        console.warn(`Failed to load types for ${packageName}:`, error);
        return false;
    }
}
