const defaultTheme = require("tailwindcss/defaultTheme");

// Embedded theme.ts logic to avoid TS require issues in CommonJS config
const THEME_COLORS = {
  background: {
    vars: [
      "--vscode-sideBar-background",
      "--vscode-editor-background",
      "--vscode-panel-background",
    ],
    default: "#1e1e1e", // dark gray
  },
  foreground: {
    vars: [
      "--vscode-sideBar-foreground",
      "--vscode-editor-foreground",
      "--vscode-panel-foreground",
    ],
    default: "#e6e6e6", // light gray
  },
  "editor-background": {
    vars: ["--vscode-editor-background"],
    default: "#1e1e1e", // dark gray
  },
  "editor-foreground": {
    vars: ["--vscode-editor-foreground"],
    default: "#e6e6e6", // light gray
  },
  "primary-background": {
    vars: ["--vscode-button-background"],
    default: "#2c5aa0", // medium blue
  },
  "primary-foreground": {
    vars: ["--vscode-button-foreground"],
    default: "#ffffff", // white
  },
  "primary-hover": {
    vars: ["--vscode-button-hoverBackground"],
    default: "#3a6db3", // lighter blue
  },
  "secondary-background": {
    vars: ["--vscode-button-secondaryBackground"],
    default: "#303030",
  },
  "secondary-foreground": {
    vars: ["--vscode-button-secondaryForeground"],
    default: "#e6e6e6", // light gray
  },
  "secondary-hover": {
    vars: ["--vscode-button-secondaryHoverBackground"],
    default: "#3a3a3a", // medium gray
  },
  border: {
    vars: ["--vscode-sideBar-border", "--vscode-panel-border"],
    default: "#2a2a2a", // dark gray border
  },
  "border-focus": {
    vars: ["--vscode-focusBorder"],
    default: "#3a6db3", // lighter blue
  },
  "command-background": {
    vars: ["--vscode-commandCenter-background"],
    default: "#252525", // dark gray
  },
  "command-foreground": {
    vars: ["--vscode-commandCenter-foreground"],
    default: "#e6e6e6", // light gray
  },
  "command-border": {
    vars: ["--vscode-commandCenter-inactiveBorder"],
    default: "#555555", // medium gray
  },
  "command-border-focus": {
    vars: ["--vscode-commandCenter-activeBorder"],
    default: "#4d8bf0", // bright blue
  },
  description: {
    vars: ["--vscode-descriptionForeground"],
    default: "#b3b3b3", // medium light gray
  },
  "description-muted": {
    vars: ["--vscode-list-deemphasizedForeground"],
    default: "#8c8c8c", // medium gray
  },
  "input-background": {
    vars: ["--vscode-input-background"],
    default: "#2d2d2d", // dark gray
  },
  "input-foreground": {
    vars: ["--vscode-input-foreground"],
    default: "#e6e6e6", // light gray
  },
  "input-border": {
    vars: [
      "--vscode-input-border",
      "--vscode-commandCenter-inactiveBorder",
      "vscode-border",
    ],
    default: "#555555", // medium gray
  },
  "input-placeholder": {
    vars: ["--vscode-input-placeholderForeground"],
    default: "#9e9e9e", // medium light gray
  },
  "table-oddRow": {
    vars: ["--vscode-tree-tableOddRowsBackground"],
    default: "#2d2d2d", // dark gray
  },
  "badge-background": {
    vars: ["--vscode-badge-background"],
    default: "#4d4d4d", // medium dark gray
  },
  "badge-foreground": {
    vars: ["--vscode-badge-foreground"],
    default: "#ffffff", // white
  },
  info: {
    vars: [
      "--vscode-charts-blue",
      "--vscode-notebookStatusRunningIcon-foreground",
    ],
    default: "#2196f3", // blue
  },
  success: {
    vars: [
      "--vscode-notebookStatusSuccessIcon-foreground",
      "--vscode-testing-iconPassed",
      "--vscode-gitDecoration-addedResourceForeground",
      "--vscode-charts-green",
    ],
    default: "#4caf50", // green
  },
  warning: {
    vars: [
      "--vscode-editorWarning-foreground",
      "--vscode-list-warningForeground",
    ],
    default: "#ffb74d", // amber/yellow
  },
  error: {
    vars: ["--vscode-editorError-foreground", "--vscode-list-errorForeground"],
    default: "#f44336", // red
  },
  link: {
    vars: ["--vscode-textLink-foreground"],
    default: "#5c9ce6", // medium blue
  },
  terminal: {
    vars: ["--vscode-terminal-ansiGreen"],
    default: "#0dbc79", // green
  },
  textCodeBlockBackground: {
    vars: ["--vscode-textCodeBlock-background"],
    default: "#1e1e1e", // same as editor-background
  },
  accent: {
    vars: ["--vscode-tab-activeBorderTop", "--vscode-focusBorder"],
    default: "#4d8bf0", // bright blue
  },
  "find-match": {
    vars: ["--vscode-editor-findMatchBackground"], // Can't get "var(--vscode-editor-findMatchBackground, rgba(237, 18, 146, 0.5))" to work
    default: "#264f7840", // translucent blue
  },
  "find-match-selected": {
    vars: ["--vscode-editor-findMatchHighlightBackground"],
    default: "#ffb74d40", // translucent amber
  },
  "list-hover": {
    // --vscode-tab-hoverBackground
    vars: ["--vscode-list-hoverBackground"],
    default: "#383838", // medium dark gray
  },
  "list-active": {
    vars: ["--vscode-list-activeSelectionBackground"],
    default: "#2c5aa050", // translucent medium blue
  },
  "list-active-foreground": {
    vars: ["--vscode-list-activeSelectionForeground"],
    default: "#ffffff", // white
  },
};

const getRecursiveVar = (vars, defaultColor) => {
  return [...vars].reverse().reduce((curr, varName) => {
    return `var(${varName}, ${curr})`;
  }, defaultColor);
};

const varWithFallback = (colorName) => {
  const themeVals = THEME_COLORS[colorName];
  if (!themeVals) {
    throw new Error(`Invalid theme color name ${colorName}`);
  }
  return getRecursiveVar(themeVals.vars, themeVals.default);
};

module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "Segoe UI",
          "SegoeUI",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "Liberation Sans",
          "sans-serif",
        ],
      },
      colors: {
        // Cognitive Colors (Base)
        border: {
            DEFAULT: "hsl(var(--border))",
            focus: varWithFallback("border-focus"),
        },
        input: {
            DEFAULT: "hsl(var(--input))",
            foreground: varWithFallback("input-foreground"),
            border: varWithFallback("input-border"),
            placeholder: varWithFallback("input-placeholder"),
        },
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: varWithFallback("primary-hover"),
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: varWithFallback("secondary-hover"),
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "editor-bg": "#1e1e1e",
        "sidebar-bg": "#252526",
        "activity-bar-bg": "#333333",
        "status-bar-bg": "#007acc",

        // Continue Colors (Extension)
        editor: {
          DEFAULT: varWithFallback("editor-background"),
          foreground: varWithFallback("editor-foreground"),
        },
        command: {
          DEFAULT: varWithFallback("command-background"),
          foreground: varWithFallback("command-foreground"),
          border: {
            DEFAULT: varWithFallback("command-border"),
            focus: varWithFallback("command-border-focus"),
          },
        },
        description: {
          DEFAULT: varWithFallback("description"),
          muted: varWithFallback("description-muted"),
        },
        table: {
          oddRow: varWithFallback("table-oddRow"),
        },
        badge: {
          DEFAULT: varWithFallback("badge-background"),
          foreground: varWithFallback("badge-foreground"),
        },
        info: varWithFallback("info"),
        success: varWithFallback("success"),
        warning: varWithFallback("warning"),
        error: varWithFallback("error"),
        link: varWithFallback("link"),
        terminal: varWithFallback("terminal"),
        findMatch: {
          DEFAULT: THEME_COLORS["find-match"].default,
          selected: varWithFallback("find-match-selected"),
        },
        list: {
          hover: varWithFallback("list-hover"),
          active: {
            DEFAULT: varWithFallback("list-active"),
            foreground: varWithFallback("list-active-foreground"),
          },
        },
        
        // DEPRECATED Continue Colors
        lightgray: "#999998",
        "vsc-input-background": varWithFallback("input-background"),
        "vsc-background": varWithFallback("background"),
        "vsc-foreground": varWithFallback("editor-foreground"),
        "vsc-editor-background": varWithFallback("editor-background"),
        "vsc-input-border": varWithFallback("input-border"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
