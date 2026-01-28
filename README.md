# Cognitive

<div align="center">

<img src="public/icon.ico" alt="Cognitive Logo" width="128" height="128">

**Современный кроссплатформенный редактор кода с интегрированным AI-ассистентом**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-white.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)

[Возможности](#возможности) • [Установка](#установка) • [Архитектура](#архитектура) • [Разработка](#разработка) • [Лицензия](#лицензия)

</div>

---

## О проекте

Cognitive это полнофункциональная IDE, построенная на базе Tauri 2.0, предоставляющая опыт разработки, сравнимый с VS Code, но с нативной производительностью и встроенной поддержкой множества AI-провайдеров. Проект сочетает мощь Rust-бэкенда с современным React-интерфейсом.

### Ключевые преимущества

- **Нативная производительность** — Rust-бэкенд обеспечивает молниеносную работу с файлами и Git
- **Мульти-провайдерный AI** — OpenAI, Anthropic, Google, xAI, Ollama (локально)
- **Современный UI** — Monaco Editor, множество тем, кастомизируемый интерфейс
- **Кроссплатформенность** — Windows, Linux, macOS (планируется)

---

## Возможности

### Редактор кода
- **Monaco Editor** — полнофункциональный редактор с поддержкой IntelliSense.
- **LSP Интеграция** — поддержка языковых серверов для TypeScript, Go и Python.
- **Code Outline** — визуализация структуры кода на базе высокопроизводительного парсера OXC.
- **Breadcrumb-навигация** — удобное отслеживание пути к текущему файлу и навигация.
- **Timeline** — локальная история изменений файлов с возможностью просмотра diff-разниц.
- **Встроенные просмотрщики медиа** — поддержка изображений, аудио (с метаданными) и видео прямо в редакторе.

### AI-ассистент (Cognitive AI)
- **Режим Agent** — автономное выполнение задач:
  - Чтение и запись файлов.
  - Поиск по кодовой базе.
  - Управление списком задач (Todo System).
- **RAG Engine** — символьная индексация проекта для обеспечения точного контекста AI без отправки всего кода провайдеру.
- **Мульти-провайдерность** — поддержка OpenAI, Google Gemini, и локальных моделей через Ollama.

### Git-интеграция
- **Визуальный граф коммитов** — наглядное представление истории веток.
- **Diff Editor** — детальное сравнение изменений.
- **Управление ветками и стейджингом** — полноценный рабочий процесс Git.
- **Push/Pull** — синхронизация с удаленными репозиториями.

### Навигация и поиск
- **Command Palette (Ctrl+Shift+P)** — быстрый доступ ко всем командам редактора.
- **Go to File (Ctrl+P)** — мгновенный поиск файлов по проекту.
- **Symbol Search** — поиск классов, функций и переменных.
- **Global Search & Replace** — высокоскоростной поиск на базе ripgrep.

### Терминал и инструменты
- **Встроенный PTY терминал** — поддержка нескольких вкладок и различных оболочек (Bash, PowerShell).
- **Мониторинг портов** — отслеживание активных сетевых соединений проекта.
- **NPM Scripts Runner** — удобный интерфейс для запуска скриптов из package.json.
- **Профили (Profiles)** — возможность создавать изолированные рабочие пространства с разными наборами папок и настроек.
- **Система расширений** — база для дополнения функционала редактора.

---

## Технологический стек

- **Core**: [Tauri 2.0](https://tauri.app) (Rust backend, WebView frontend).
- **Frontend**: [React 19](https://react.dev), [TypeScript 5.6](https://www.typescriptlang.org).
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) (эффективное управление состоянием без лишних перерисовок).
- **Parsing**: [OXC](https://oxc-project.github.io/) (сверхбыстрый парсер для JS/TS).
- **Database**: [SQLite](https://sqlite.org) через [SQLx](https://github.com/launchbadge/sqlx) для хранения настроек и истории.
- **Styles**: [Tailwind CSS](https://tailwindcss.com) + CSS Modules.
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/).

---

## Архитектура
### Структура проекта

- `src/` — React фронтенд (UI компоненты, Zustand сторы, хуки).
- `src-tauri/` — Rust бэкенд (LSP клиент, RAG движок, Git, Файловая система).
- `src-tauri/src/agent/` — Логика AI агента и инструментов.
- `src-tauri/src/storage/` — Слой работы с базой данных SQLite.
- `packages/` — Вспомогательные пакеты (например, terminal-security).

---

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cognitive Application                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Frontend (React 19)                   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │   Monaco    │ │  AI Chat    │ │   File Explorer │    │    │
│  │  │   Editor    │ │  Interface  │ │   & Sidebar     │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │  Git Panel  │ │  Terminal   │ │    Settings     │    │    │
│  │  │             │ │   Panel     │ │     Panel       │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  │                                                         │    │
│  │  ┌───────────────────────────────────────────────────┐  │    │
│  │  │              Zustand State Management             │  │    │
│  │  │  projectStore │ aiStore │ uiStore │ gitStore      │  │    │
│  │  └───────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                        Tauri IPC                                │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Backend (Rust/Tauri 2.0)              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │    FS    │ │   Git    │ │ Outline  │ │ Timeline │    │    │
│  │  │ Module   │ │  Module  │ │  (OXC)   │ │  Module  │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Terminal │ │   AI     │ │  Ports   │ │ Problems │    │    │
│  │  │   PTY    │ │ Streaming│ │ Monitor  │ │  (LSP)   │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Структура проекта

```
cognitive/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── ai/                   # AI Assistant модуль
│   │   │   ├── components/       # UI компоненты чата
│   │   │   ├── hooks/            # React hooks для AI
│   │   │   ├── models/           # Определения AI моделей
│   │   │   ├── services/         # Сервисы провайдеров
│   │   │   └── utils/            # Утилиты (system prompts)
│   │   ├── layout/               # Основные UI компоненты
│   │   │   ├── Editor/           # Monaco Editor wrapper
│   │   │   ├── Git/              # Git панель
│   │   │   ├── Search/           # Поиск по проекту
│   │   │   ├── Sidebar/          # Файловый браузер
│   │   │   ├── Settings/         # Настройки
│   │   │   ├── Timeline/         # История файлов
│   │   │   ├── Outline/          # Структура кода
│   │   │   ├── NPM/              # NPM Scripts
│   │   │   └── terminal-panel/   # Терминал
│   │   └── ui/                   # Переиспользуемые UI компоненты
│   ├── store/                    # Zustand stores
│   │   ├── slices/               # Store slices
│   │   ├── projectStore.ts       # Состояние проекта/файлов
│   │   ├── aiStore.ts            # Состояние AI
│   │   ├── uiStore.ts            # Состояние UI
│   │   ├── gitStore.ts           # Состояние Git
│   │   └── ...
│   ├── themes/                   # Темы редактора
│   ├── hooks/                    # Общие React hooks
│   ├── lib/                      # Утилиты (tauri-api, monaco-config)
│   └── utils/                    # Вспомогательные функции
│
├── src-tauri/                    # Rust Backend
│   └── src/
│       ├── fs/                   # Файловые операции
│       │   ├── file_ops.rs       # CRUD операции
│       │   ├── file_watcher.rs   # Отслеживание изменений
│       │   ├── search.rs         # Поиск по файлам
│       │   └── replace.rs        # Поиск и замена
│       ├── git/                  # Git операции
│       │   ├── status.rs         # Статус репозитория
│       │   ├── staging.rs        # Stage/unstage
│       │   ├── commit.rs         # Коммиты
│       │   ├── branch.rs         # Ветки
│       │   ├── diff.rs           # Diff файлов
│       │   └── log.rs            # История коммитов
│       ├── outline/              # Code outline
│       │   └── parser.rs         # OXC-based парсер
│       ├── timeline/             # История файлов
│       ├── problems/             # Диагностика (TSC)
│       ├── ports/                # Мониторинг портов
│       ├── openai.rs             # OpenAI streaming
│       ├── anthropic.rs          # Anthropic streaming
│       ├── google.rs             # Google AI streaming
│       ├── xai.rs                # xAI streaming
│       ├── ollama.rs             # Ollama (локальный)
│       └── api_keys.rs           # Управление API ключами
│
├── public/                       # Статические ресурсы
│   └── icons/                    # Иконки файлов (VS Code style)
│
└── openai-proxy-server/          # Опциональный прокси-сервер
```

---

## Технологический стек

### Frontend

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 19.1 | UI Framework |
| TypeScript | 5.6 | Типизация |
| Vite | 6.0 | Сборка и dev server |
| Zustand | 4.5 | State Management |
| Monaco Editor | 0.55 | Редактор кода |
| Tailwind CSS | 3.4 | Стилизация |
| Framer Motion | 12.0 | Анимации |
| Lucide React | 0.479 | Иконки |

### Backend (Rust)

| Crate | Назначение |
|-------|------------|
| `tauri` 2.0 | Фреймворк приложения |
| `git2` | Git операции |
| `tokio` | Async runtime |
| `reqwest` | HTTP клиент |
| `oxc` | JS/TS парсинг |
| `grep-searcher` | Быстрый поиск |
| `portable-pty` | Терминал |
| `notify` | File watching |
| `walkdir` | Обход директорий |

---

## AI-архитектура

### Паттерн сервисов

```
┌─────────────────────────────────────────────────────────────┐
│                     AIServiceFactory                        │
│  Создает экземпляры сервисов на основе выбранного провайдера│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BaseAIService                          │
│  Абстрактный базовый класс с общей логикой streaming        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ OpenAIService │    │AnthropicServic   │ GoogleService │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  xAIService   │    │ OllamaService │    │AgentRouterSvc │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Agent Mode

В режиме Agent AI может использовать инструменты:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ChatService   │────▶  ToolParser     ────▶ ToolExecutor      │
│                 │     │ (парсинг XML)   │     │ (выполнение)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ AgentToolService│
                                               │ - read_file     │
                                               │ - write_file    │
                                               │ - search_files  │
                                               │ - run_command   │
                                               └─────────────────┘
```

---

## Установка

### Требования

- Node.js 18+ или Bun
- Rust 1.70+
- Системные зависимости для Tauri:
  - **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`, `libayatana-appindicator3-dev`
  - **Windows**: WebView2 (обычно предустановлен)

### Сборка из исходников

```bash
# Клонирование репозитория
git clone https://github.com/nihmadev/cognitive.git
cd cognitive

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run tauri dev

# Сборка для production
npm run tauri build
```

### Готовые сборки

Скачайте последнюю версию для вашей платформы:

- **Windows**: `cognitive_x.x.x_x64.msi`
- **Linux (DEB)**: `cognitive_x.x.x_amd64.deb`
- **Linux (AppImage)**: `cognitive_x.x.x_amd64.AppImage`

---

## Разработка

### Команды

```bash
# Запуск Vite dev server (только frontend)
npm run dev

# Запуск Tauri в режиме разработки
npm run tauri dev

# Сборка frontend
npm run build

# Сборка приложения
npm run tauri build

# Сборка для конкретной платформы
npm run build:msi      # Windows MSI
npm run build:deb      # Linux DEB
npm run build:appimage # Linux AppImage
```

### Конфигурация

- **Vite**: `vite.config.ts` — dev server на порту 1420
- **TypeScript**: `tsconfig.json` — strict mode, ES2020
- **Tauri**: `src-tauri/tauri.conf.json` — настройки приложения
- **Tailwind**: `tailwind.config.js` — кастомизация стилей

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# AI API Keys (опционально, можно настроить в приложении)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GOOGLE_API_KEY=...
VITE_XAI_API_KEY=...

# Proxy server (опционально)
VITE_PROXY_URL=http://localhost:3001
```

---

## Темы

Cognitive поддерживает множество тем оформления:

- Dark Modern (по умолчанию)
- Dracula
- GitHub Dark
- Nord
- One Dark Pro
- Monokai
- Solarized Dark
- И другие...

Темы находятся в `src/themes/` и применяются к Monaco Editor.

---

## Вклад в проект

Мы приветствуем вклад в развитие Cognitive! 

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

### Рекомендации

- Следуйте существующему стилю кода
- Добавляйте типы TypeScript
- Документируйте новые функции
- Тестируйте на разных платформах

---

## Лицензия

Этот проект распространяется под лицензией Apache-2.0. См. файл [LICENSE](LICENSE) для подробностей.

---

## Благодарности

- [Tauri](https://tauri.app) — за отличный фреймворк
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — за мощный редактор
- [VS Code](https://code.visualstudio.com) — за вдохновение в дизайне
- Всем контрибьюторам и пользователям

---

<div align="center">

**[Наверх](#cognitive)**

Made with love by the Cognitive Team

</div>
