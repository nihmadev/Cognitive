import { BINARY_EXTENSIONS } from '../Editor/editorConfig';

export const languageMap: { [key: string]: string } = {
    'ts': 'TypeScript', 'tsx': 'TypeScript React', 'js': 'JavaScript', 'jsx': 'JavaScript React',
    'html': 'HTML', 'htm': 'HTML', 'css': 'CSS', 'scss': 'SCSS', 'sass': 'SASS', 'less': 'Less',
    'vue': 'Vue', 'svelte': 'Svelte',
    'py': 'Python', 'pyw': 'Python', 'pyi': 'Python',
    'rs': 'Rust', 'go': 'Go', 'java': 'Java', 'kt': 'Kotlin', 'kts': 'Kotlin',
    'scala': 'Scala', 'sc': 'Scala', 'clj': 'Clojure', 'cljs': 'ClojureScript',
    'hs': 'Haskell', 'lhs': 'Haskell', 'ml': 'OCaml', 'eliom': 'OCaml',
    'fs': 'F#', 'fsx': 'F#', 'fsi': 'F#',
    'elm': 'Elm', 'purs': 'PureScript', 'idr': 'Idris', 'ldr': 'Idris',
    'c': 'C', 'cpp': 'C++', 'cxx': 'C++', 'cc': 'C++', 'c++': 'C++',
    'h': 'C Header', 'hpp': 'C++ Header', 'hxx': 'C++ Header', 'hh': 'C++ Header',
    'cs': 'C#', 'csx': 'C#',
    'm': 'Objective-C', 'mm': 'Objective-C++',
    'vala': 'Vala', 'vapi': 'Vala',
    'rb': 'Ruby', 'rbw': 'Ruby', 'gemspec': 'Ruby',
    'php': 'PHP', 'phtml': 'PHP', 'php3': 'PHP', 'php4': 'PHP', 'php5': 'PHP', 'php7': 'PHP',
    'pl': 'Perl', 'pm': 'Perl', 't': 'Perl', 'pod': 'Perl',
    'lua': 'Lua', 'luac': 'Lua',
    'tcl': 'Tcl', 'tk': 'Tcl',
    'r': 'R', 'R': 'R',
    'sh': 'Shell', 'bash': 'Bash', 'zsh': 'Zsh', 'fish': 'Fish',
    'ps1': 'PowerShell', 'psm1': 'PowerShell', 'psd1': 'PowerShell',
    'bat': 'Batch', 'cmd': 'Batch',
    'reg': 'Registry',
    'json': 'JSON', 'jsonc': 'JSON', 'json5': 'JSON5',
    'xml': 'XML', 'xaml': 'XAML', 'xsl': 'XSLT', 'xsd': 'XSD',
    'yaml': 'YAML', 'yml': 'YAML',
    'toml': 'TOML', 'ini': 'INI', 'cfg': 'Config', 'conf': 'Config',
    'env': 'Environment', 'dotenv': 'Environment',
    'md': 'Markdown', 'markdown': 'Markdown', 'mdx': 'MDX',
    'rst': 'reStructuredText', 'txt': 'Plain Text',
    'tex': 'LaTeX', 'latex': 'LaTeX', 'bib': 'BibTeX',
    'sql': 'SQL', 'ddl': 'SQL', 'dml': 'SQL',
    'prql': 'PRQL',
    'dockerfile': 'Docker', 'dockerignore': 'Docker',
    'makefile': 'Makefile', 'mk': 'Makefile',
    'cmake': 'CMake',
    'gradle': 'Gradle',
    'pom': 'Maven', 'build': 'Bazel',
    'bzl': 'Bazel', 'bazel': 'Bazel',
    'nix': 'Nix',
    'justfile': 'Just',

    'gitignore': 'Git', 'gitmodules': 'Git', 'gitattributes': 'Git',
    'hgignore': 'Mercurial',

    'svg': 'SVG', 'png': 'PNG', 'jpg': 'JPEG', 'jpeg': 'JPEG', 'gif': 'GIF',
    'ico': 'Icon', 'webp': 'WebP',
    'css.map': 'Source Map', 'js.map': 'Source Map',
    'swift': 'Swift', 'dart': 'Dart',
    'gd': 'GDScript',

    'jl': 'Julia', 'matlab': 'MATLAB', 'fig': 'FIG',
    'stan': 'Stan',

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

    'hbs': 'Handlebars', 'handlebars': 'Handlebars',
    'mustache': 'Mustache',
    'erb': 'ERB', 'rhtml': 'ERB',
    'ejs': 'EJS',
    'jinja': 'Jinja', 'jinja2': 'Jinja',
    'twig': 'Twig',
    'liquid': 'Liquid',

    'styl': 'Stylus',
    'pcss': 'PostCSS',

    'spec': 'Spec', 'test': 'Test', 'tests': 'Test',

    'lock': 'Lock File', 'log': 'Log',
    'patch': 'Patch', 'diff': 'Diff',
    'rej': 'Reject',
    'bak': 'Backup', 'tmp': 'Temporary',
    'swp': 'Swap',
};

export const getLanguageFromExtension = (extension: string): string => {
    return languageMap[extension] || 'Plain Text';
};

export const countIssues = (content: string, lang: string): { errorCount: number; warningCount: number } => {
    let errorCount = 0;
    let warningCount = 0;

    const lines = content.split('\n');

    if (lang.includes('TypeScript') || lang.includes('JavaScript')) {
        lines.forEach(line => {
            if (line.includes('console.log')) {
                warningCount++;
            }
            if (line.includes('any') && !line.includes('//')) {
                warningCount++;
            }
            const templateLiterals = line.match(/`[^`]*\$\{[^}]*\}[^`]*`/g) || [];
            warningCount += templateLiterals.length;
        });

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

export const generateRandomCommitMessage = (): string => {
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

export const getVideoExtensions = () => ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v', '3gp', 'ts'];

export const isBinaryFile = (extension: string) => {
    const videoExtensions = getVideoExtensions();
    const allBinaryExtensions = [...BINARY_EXTENSIONS, ...videoExtensions];
    return allBinaryExtensions.includes(extension);
};
