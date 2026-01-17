# GitHub Workflows Configuration

## Основные изменения

### 1. Агрессивное кэширование
- **Rust dependencies**: Используется `Swatinem/rust-cache@v2` с `cache-all-crates: true` и уникальными `shared-key` для каждой платформы
- **Node modules**: Встроенное кэширование npm через `cache: 'npm'` в `setup-node`
- **APT пакеты** (Linux): Кэширование системных зависимостей через `awalsh128/cache-apt-pkgs-action`
- **Условное сохранение**: Кэш сохраняется только для main ветки (`save-if: ${{ github.ref == 'refs/heads/main' }}`)

### 2. Исправления иконок
- Добавлены недостающие иконки: `16x16.png`, `48x48.png`, `256x256.png`, `512x512.png`
- Исправлена ошибка сборки на macOS из-за отсутствующих иконок

### 3. Форматы сборки

#### Windows (`build-windows`)
- MSI installer
- NSIS installer (EXE)

#### Linux (`build-linux`)
- DEB пакет (Debian/Ubuntu)
- RPM пакет (Fedora/RHEL/openSUSE)
- AppImage **исключен** из основной сборки (вынесен в отдельный workflow)

#### macOS (`build-macos`)
- DMG образ
- .app bundle **исключен** из артефактов (не загружается)
- Поддержка обеих архитектур: `aarch64-apple-darwin`, `x86_64-apple-darwin`

### 4. Отдельный workflow для AppImage
Файл: `.github/workflows/linux-appimage.yml`
- Запускается отдельно для избежания проблем с linuxdeploy
- Можно запустить вручную через `workflow_dispatch`
- Использует собственный кэш с ключом `linux-appimage`

## Исправленные проблемы

### Rust warnings
Удалены неиспользуемые импорты в:
- `src-tauri/src/api_keys.rs`
- `src-tauri/src/git/mod.rs`
- `src-tauri/src/session/mod.rs`
- `src-tauri/src/settings/mod.rs`
- `src-tauri/src/settings/store.rs`
- `src-tauri/src/settings/watcher.rs`

### AppImage build failure
- Вынесен в отдельный workflow
- Добавлены необходимые зависимости: `libfuse2`, `file`
- Используется прямая команда Tauri вместо кастомного скрипта

## Производительность

Ожидаемое ускорение сборки:
- **Первая сборка**: ~15-20 минут (без кэша)
- **Последующие сборки** (с кэшем): ~5-8 минут
- **Экономия времени**: ~60-70%

Кэш сохраняется между запусками и восстанавливается автоматически при совпадении:
- Cargo.lock (Rust зависимости)
- package-lock.json (npm зависимости)
- Системные пакеты (Linux)
