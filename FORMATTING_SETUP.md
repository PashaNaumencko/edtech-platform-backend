# Code Formatting Setup

This project uses **EditorConfig** and **ESLint** for consistent code formatting. EditorConfig handles basic formatting rules (indentation, line endings, etc.) while ESLint handles code quality and TypeScript-specific rules.

## ✅ **What's Configured**

- ✅ **EditorConfig** - Basic formatting rules (indentation, line endings, charset)
- ✅ **ESLint** - Code quality and TypeScript linting rules

## 🛠️ **Editor Setup**

### **Visual Studio Code**

1. **Install Required Extensions**
   - **ESLint** (`ms-vscode.vscode-eslint`)
   - **EditorConfig for VS Code** (`EditorConfig.EditorConfig`)

2. **Configure Settings** (`.vscode/settings.json`)
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### **JetBrains IDEs (WebStorm/IntelliJ)**

1. **Enable EditorConfig**
   - Go to `Preferences > Editor > Code Style`
   - Check "Enable EditorConfig support"

2. **Enable ESLint**
   - Go to `Preferences > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint`
   - Check "Automatic ESLint configuration"
   - Set ESLint package: `./node_modules/eslint`

### **Vim/Neovim**

```vim
" Install vim-editorconfig plugin
Plug 'editorconfig/editorconfig-vim'

" Install ESLint plugin
Plug 'dense-analysis/ale'

" Configure ALE for ESLint
let g:ale_linters = {'typescript': ['eslint']}
let g:ale_fixers = {'typescript': ['eslint']}
let g:ale_fix_on_save = 1
```

### **Emacs**

```elisp
;; Install editorconfig package
(use-package editorconfig
  :ensure t
  :config (editorconfig-mode 1))

;; Install flycheck for ESLint
(use-package flycheck
  :ensure t
  :init (global-flycheck-mode))
```

### **Sublime Text**

1. Install "EditorConfig" package
2. Install "ESLint" package
3. Configure ESLint package settings:
```json
{
  "node_path": "./node_modules/.bin/eslint"
}
```

## 🚀 **Available Commands**

```bash
# Lint and fix code issues
npm run lint

# Check for linting issues (no auto-fix)
npm run lint:check

# Build and check types
npm run build:check
```

## 📋 **Manual Formatting Commands**

If needed, you can manually run:

```bash
# Fix ESLint issues in specific files
npx eslint --fix apps/user-service/src/main.ts

# Check specific files without fixing
npx eslint apps/user-service/src/main.ts
```

## 🛠️ **Troubleshooting**

### **ESLint not working?**

1. **Check if ESLint extension is installed and enabled**
   ```bash
   # For VS Code
   code --list-extensions | grep eslint
   ```

2. **Restart your editor** after installing extensions

3. **Check ESLint configuration**
   - Make sure `eslint.config.mjs` is present in the root
   - TypeScript project configuration should be automatic

### **EditorConfig not applying?**

1. **Check if EditorConfig extension is installed**
2. **Restart your editor**
3. **Check .editorconfig file exists** in the project root

## 📁 **Project Structure**

```
edtech-platform-backend/
├── .editorconfig              # Basic formatting rules
├── eslint.config.mjs          # ESLint configuration
├── .vscode/                   # VS Code settings
│   └── settings.json
└── FORMATTING_SETUP.md        # This file
```

## 📖 **Configuration Files**

### **EditorConfig (`.editorconfig`)**
- ✅ Indentation: 2 spaces
- ✅ Line endings: LF (Unix-style)
- ✅ Charset: UTF-8
- ✅ Trim trailing whitespace
- ✅ Insert final newline

### **ESLint (`eslint.config.mjs`)**
- ✅ TypeScript support with type checking
- ✅ Recommended ESLint rules
- ✅ Jest testing environment
- ✅ Node.js globals

The combination of EditorConfig and ESLint provides comprehensive code formatting and quality checks without the need for additional formatters.
