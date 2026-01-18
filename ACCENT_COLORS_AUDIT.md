# Аудит акцентных цветов

## Проблема
Многие компоненты используют жестко заданные цвета вместо акцентных переменных из тем. Это приводит к тому, что при смене темы акцентные элементы не меняют свой цвет.

## Места, требующие исправления

### 1. Command Palette (`src/components/layout/CommandPalette.module.css`)

**Проблемные места:**
- `.item:hover` и `.item.selected` - используют `#04395e` вместо `var(--theme-accent)` или `var(--theme-hover-overlay)`
- `.palette` - фон `#252526`, границы `#454545`, `#333333`
- `.key` - фон `#333333`, граница `#3c3c3c`
- Все цвета текста: `#cccccc`, `#6b7280`, `#d1d5db`, `#9ca3af`

**Рекомендации:**
```css
.item:hover,
.item.selected {
  background: var(--theme-accent-muted); /* или var(--theme-hover-overlay) */
}

.palette {
  background: var(--theme-background-secondary);
  border: 1px solid var(--theme-border);
  color: var(--theme-foreground);
}

.input {
  color: var(--theme-foreground);
}

.input::placeholder {
  color: var(--theme-foreground-subtle);
}

.key {
  background: var(--theme-background-tertiary);
  border: 1px solid var(--theme-border);
  color: var(--theme-foreground-muted);
}
```

---

### 2. Go To File Modal (`src/components/layout/GoToFileModal.module.css`)

**Проблемные места:**
- Идентичны Command Palette
- `.item:hover` и `.item.selected` - `#04395e`
- `.modal` - фон `#252526`, границы `#454545`, `#333333`
- Все цвета текста

**Рекомендации:**
Те же, что и для Command Palette

---

### 3. Terminal Panel (`src/components/layout/terminal-panel/TerminalPanel.module.css`)

**Проблемные места:**
- `.panel` - фон `#1e1e1e`, граница `#333333`
- `.header` - фон `#252526`, граница `#333333`
- `.tab`, `.tabActive` - цвета `#cccccc`, `#ffffff`, акцент `#007acc`
- `.badge` - фон `#cc3e3e` (красный для ошибок - можно оставить)
- `.actionDropdownMenu` - фон `#2d2d30`, граница `#3e3e42`
- `.actionDropdownItem:hover` - фон `#094771` (должен быть акцентный)
- `.terminalTabs` - фон `#2d2d30`, граница `#3e3e42`
- `.terminalTabActive` - акцент `#007acc`

**Рекомендации:**
```css
.panel {
  background: var(--theme-background-primary);
  border-top: 1px solid var(--theme-border);
}

.header {
  background: var(--theme-background-secondary);
  border-bottom: 1px solid var(--theme-border);
}

.tab {
  color: var(--theme-foreground-muted);
}

.tabActive {
  background-color: var(--theme-background-primary);
  color: var(--theme-foreground);
  border-bottom-color: var(--theme-accent);
}

.actionDropdownMenu {
  background: var(--theme-background-tertiary);
  border: 1px solid var(--theme-border);
}

.actionDropdownItem:hover {
  background-color: var(--theme-accent-muted);
}

.terminalTabActive {
  border-bottom-color: var(--theme-accent);
}
```

---

### 4. Problems Panel (`src/components/layout/terminal-panel/components/ProblemsPanel.module.css`)

**Проблемные места:**
- `.problemsPanel` - фон `#1e1e1e`
- `.retryButton` - фон `#0e639c`, hover `#1177bb` (акцентные цвета)
- `.fileGroup` - граница `#2d2d30`
- `.fileHeader:hover` - фон `#2a2d2e`
- `.problemItem:hover` - фон `#2a2d2e`
- `.problemItem:active` - фон `#094771` (акцентный)
- `.errorIcon` - `#f14c4c` (можно оставить)
- `.warningIcon` - `#cca700` (можно оставить)
- Все цвета текста

**Рекомендации:**
```css
.problemsPanel {
  background: var(--theme-background-primary);
}

.retryButton {
  background: var(--theme-accent);
  color: var(--theme-foreground);
}

.retryButton:hover {
  background: var(--theme-accent-hover);
}

.fileGroup {
  border-bottom: 1px solid var(--theme-border);
}

.fileHeader:hover {
  background: var(--theme-hover-overlay);
}

.problemItem:hover {
  background: var(--theme-hover-overlay);
}

.problemItem:active {
  background: var(--theme-accent-muted);
}
```

---

### 5. Clone Repo Modal (`src/components/layout/WelcomeScreen/CloneRepoModal.module.css`)

**Проблемные места:**
- `.modal` - фон `#252526`, граница `#454545`
- `.inputWrapper` - граница `#3c3c3c`
- `.input` - цвет `#cccccc`
- `.sourceOption:hover` - цвет `#ffffff`
- Все цвета текста

**Рекомендации:**
```css
.modal {
  background: var(--theme-background-secondary);
  border: 1px solid var(--theme-border);
  color: var(--theme-foreground);
}

.inputWrapper {
  border-bottom: 1px solid var(--theme-border);
}

.input {
  color: var(--theme-foreground);
}

.input::placeholder {
  color: var(--theme-foreground-subtle);
}

.sourceOption:hover {
  color: var(--theme-foreground);
}
```

---

### 6. Timeline Diff Editor (`src/components/layout/Timeline/TimelineDiffEditor.module.css`)

**Проблемные места:**
- `.container` - фон `#1e1e1e`
- `.header` - фон `#252526`, граница `#3c3c3c`
- `.label` - фон `#3c3c3c`
- Все цвета текста

**Рекомендации:**
```css
.container {
  background-color: var(--theme-background-primary);
}

.header {
  background-color: var(--theme-background-secondary);
  border-bottom: 1px solid var(--theme-border);
  color: var(--theme-foreground);
}

.label {
  background-color: var(--theme-background-tertiary);
}
```

---

### 7. Tabs (`src/components/layout/Tabs.module.css`)

**Проблемные места:**
- Git статусы используют жестко заданные цвета:
  - `.gitConflicted`, `.gitDeleted` - `#f85149`
  - `.gitModified` - `#e3b341`
  - `.gitUntracked`, `.gitStaged` - `#73c991`

**Рекомендации:**
Эти цвета можно оставить, так как они семантические (красный = конфликт/удаление, желтый = изменение, зеленый = новый/staged). Но можно добавить переменные темы для них:
```css
.gitConflicted,
.gitDeleted {
  color: var(--theme-git-deleted, #f85149) !important;
}

.gitModified {
  color: var(--theme-git-modified, #e3b341) !important;
}

.gitUntracked,
.gitStaged {
  color: var(--theme-git-added, #73c991) !important;
}
```

---

### 8. Tab Actions (`src/components/layout/TabActions.module.css`)

**Проблемные места:**
- Dropdown меню - фон `#2d2d30`, граница `#464647`

**Рекомендации:**
```css
.dropdown {
  background: var(--theme-background-tertiary);
  border: 1px solid var(--theme-border);
}
```

---

### 9. App.module.css

**Проблемные места:**
- `.titlebar` - фон `#1e1e1e`, граница `#333`
- `.statusBar` - фон `#1e1e1e`, граница `#333333`
- Все цвета текста

**Рекомендации:**
```css
.titlebar {
  background-color: var(--theme-background-secondary);
  border-bottom: 1px solid var(--theme-border);
}

.statusBar {
  background: var(--theme-background-secondary);
  color: var(--theme-foreground);
  border-top: 1px solid var(--theme-border);
}
```

---

### 10. index.css (глобальные стили)

**Проблемные места:**
- Scrollbar - фон `#424242`, hover `#4f4f4f`
- `.problem-line-highlight` - граница `#f59e0b`

**Рекомендации:**
```css
::-webkit-scrollbar-thumb {
  background: var(--theme-scrollbar-thumb);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--theme-scrollbar-thumb-hover);
}

.problem-line-highlight {
  border-left: 3px solid var(--theme-warning, #f59e0b) !important;
}
```

---

## Приоритет исправлений

### Высокий приоритет (акцентные цвета для интерактивных элементов):
1. ✅ Command Palette - hover/selected состояния
2. ✅ Go To File Modal - hover/selected состояния
3. ✅ Terminal Panel - активные табы и hover состояния
4. ✅ Problems Panel - активные элементы

### Средний приоритет (фоны и границы):
5. ✅ Все модальные окна - фоны и границы
6. ✅ Terminal Panel - фоны панелей
7. ✅ App - title bar и status bar

### Низкий приоритет (цвета текста):
8. ✅ Все компоненты - замена жестко заданных цветов текста на переменные

---

## Статус выполнения

### ✅ Полностью исправлено:
- **CommandPalette.module.css** - все цвета заменены на переменные тем
- **GoToFileModal.module.css** - все цвета заменены на переменные тем
- **TerminalPanel.module.css** - акцентные цвета, фоны, границы
- **ProblemsPanel.module.css** - hover состояния, фоны
- **App.module.css** - title bar и status bar
- **index.css** - scrollbar и problem-line-highlight
- **CloneRepoModal.module.css** - все цвета заменены
- **TimelineDiffEditor.module.css** - все цвета заменены
- **TabActions.module.css** - dropdown меню
- **Tabs.module.css** - Git статусы теперь используют переменные с fallback
- **themes/index.ts** - добавлены Git цвета во все темы
- **uiStore.ts** - Git переменные применяются к документу

### ⚠️ Семантические цвета (оставлены с fallback):
- **ProblemsPanel.module.css** - errorIcon (#f14c4c) и warningIcon (#cca700) - семантические цвета для ошибок/предупреждений
- **TerminalPanel.module.css** - badge (#cc3e3e) - семантический красный для ошибок

---

## Итоги

Все компоненты теперь используют CSS переменные тем вместо жестко заданных цветов. При смене темы:

1. ✅ Акцентные элементы (hover, selected) меняют цвет
2. ✅ Фоны и границы адаптируются под тему
3. ✅ Цвета текста соответствуют теме
4. ✅ Git статусы используют тематические цвета с fallback
5. ✅ Scrollbar адаптируется под тему

Семантические цвета (ошибки, предупреждения) оставлены как есть или с fallback значениями, так как они должны быть узнаваемыми независимо от темы.

---

## Необходимые переменные темы

Убедитесь, что в темах определены следующие переменные:

```css
--theme-accent: /* основной акцентный цвет */
--theme-accent-hover: /* акцент при hover */
--theme-accent-muted: /* приглушенный акцент для фонов */
--theme-hover-overlay: /* полупрозрачный overlay для hover */
--theme-background-primary: /* основной фон */
--theme-background-secondary: /* вторичный фон */
--theme-background-tertiary: /* третичный фон */
--theme-border: /* цвет границ */
--theme-foreground: /* основной цвет текста */
--theme-foreground-muted: /* приглушенный текст */
--theme-foreground-subtle: /* едва заметный текст */
--theme-scrollbar-thumb: /* цвет скроллбара */
--theme-scrollbar-thumb-hover: /* цвет скроллбара при hover */
```

---

## Примечания

- **NewFileModal** уже использует переменные темы правильно ✅
- **SidebarLayout** уже использует переменные темы правильно ✅
- Git статусы и семантические цвета (ошибки, предупреждения) можно оставить жестко заданными или сделать опциональными через fallback значения
