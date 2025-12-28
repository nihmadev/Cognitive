# Colbex - Project Structure

```
├── src/                      # React frontend
│   ├── components/
│   │   ├── ai/               # AI Assistant feature
│   │   │   ├── components/   # Chat UI components
│   │   │   ├── hooks/        # AI-specific hooks
│   │   │   ├── models/       # AI model definitions
│   │   │   ├── services/     # AI provider services (OpenAI, Anthropic, etc.)
│   │   │   └── utils/        # AI utilities (system prompts, etc.)
│   │   ├── layout/           # Main UI components
│   │   │   ├── Editor/       # Monaco editor wrapper
│   │   │   ├── Git/          # Git panel
│   │   │   ├── Search/       # Search pane
│   │   │   ├── Sidebar/      # File explorer
│   │   │   ├── Settings/     # Settings panel
│   │   │   └── terminal-panel/
│   │   └── ui/               # Shared UI components
│   ├── store/                # Zustand stores
│   │   ├── slices/           # Store slices (files, tabs, settings, profiles)
│   │   ├── aiStore.ts        # AI state
│   │   ├── projectStore.ts   # Workspace/file state
│   │   └── uiStore.ts        # UI state (panels, zoom, etc.)
│   ├── themes/               # Editor themes
│   ├── hooks/                # Shared React hooks
│   ├── lib/                  # Utilities (tauri-api, monaco-config)
│   └── utils/                # Helper functions
│
├── src-tauri/                # Rust backend
│   └── src/
│       ├── fs/               # File system operations
│       ├── git/              # Git commands
│       ├── outline/          # Code outline/symbols
│       ├── problems/         # Diagnostics/linting
│       ├── timeline/         # File history
│       ├── ports/            # Port monitoring
│       ├── ollama.rs         # Ollama integration
│       ├── openai.rs         # OpenAI streaming
│       ├── anthropic.rs      # Anthropic streaming
│       └── api_keys.rs       # API key management
│
├── public/icons/             # File/folder icons (VS Code style)
└── openai-proxy-server/      # Optional proxy server for AI APIs
```

## Key Patterns

- **AI Services**: Factory pattern (`AIServiceFactory`) with base class (`BaseAIService`) for streaming
- **State**: Zustand stores with persistence, accessed via hooks (`useProjectStore`, `useAIStore`, etc.)
- **Tauri IPC**: Commands defined in Rust, called via `invoke()` from `@tauri-apps/api/core`
- **Styling**: CSS Modules (`.module.css`) with `clsx` for conditional classes
- **Components**: Feature-based organization under `components/layout/` and `components/ai/`
