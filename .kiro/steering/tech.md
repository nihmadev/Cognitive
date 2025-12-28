# Colbex - Tech Stack

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **State Management**: Zustand with persist middleware
- **Styling**: CSS Modules + Tailwind CSS
- **Editor**: Monaco Editor (@monaco-editor/react)
- **Icons**: Lucide React, FontAwesome, Iconify, VS Code Codicons
- **Markdown**: react-markdown with remark-gfm

## Backend (Tauri)

- **Runtime**: Tauri 2.0 (Rust)
- **Key Crates**:
  - `git2` - Git operations
  - `tokio` - Async runtime
  - `reqwest` - HTTP client
  - `walkdir` - Directory traversal
  - `oxc` - JavaScript/TypeScript parsing (outline)
  - `notify` - File system watching
  - `grep-searcher/grep-regex` - Fast file search
  - `portable-pty/alacritty_terminal` - Terminal emulation

## AI Providers

Services in `src/components/ai/services/`:
- OpenAI, Anthropic, Google, xAI, Ollama (local), AgentRouter

## Common Commands

```bash
# Development
bun run dev          # Start Vite dev server
bun run tauri dev    # Start Tauri development mode

# Build
bun run build        # Build frontend
bun run tauri build  # Build full application

# Platform-specific builds
bun run build:msi      # Windows MSI
bun run build:deb      # Linux DEB
bun run build:appimage # Linux AppImage
```

## Project Configuration

- TypeScript: Strict mode, ES2020 target, bundler module resolution
- Path alias: `@/*` maps to `src/*`
- Vite dev server: Port 1420 (HMR on 1421)
