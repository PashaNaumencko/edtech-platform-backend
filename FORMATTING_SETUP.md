# 🎨 Automatic Code Formatting Setup

This project is configured with **automatic code formatting** using Prettier, ESLint, and EditorConfig. Here's how to enable automatic formatting in your editor.

## ✅ What's Already Configured

- ✅ **Prettier** - Code formatting rules
- ✅ **ESLint** - Code linting and auto-fixing
- ✅ **EditorConfig** - Basic editor settings
- ✅ **lint-staged** - Format files on git commit
- ✅ **Husky pre-commit hook** - Automatically format before committing

## 🔧 VS Code Setup (Recommended)

### 1. Install Required Extensions

The project includes recommended extensions. VS Code should prompt you to install them, or install manually:

- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **EditorConfig for VS Code** (`editorconfig.editorconfig`)

### 2. Workspace Settings

The project includes `.vscode/settings.json` with optimal settings:

- ✅ Format on save enabled
- ✅ Format on paste enabled
- ✅ ESLint auto-fix on save
- ✅ Auto-organize imports
- ✅ Prettier as default formatter

### 3. Test Automatic Formatting

1. Open any TypeScript file
2. Add some messy formatting:
   ```typescript
   const test = { a: 1, b: 2, c: 3 };
   ```
3. Press `Cmd+S` (Mac) or `Ctrl+S` (Windows) to save
4. The code should automatically format to:
   ```typescript
   const test = { a: 1, b: 2, c: 3 };
   ```

## 🔧 Other Editors

### WebStorm/IntelliJ IDEA

1. **Install Prettier Plugin**
   - Go to `Preferences > Plugins`
   - Install "Prettier" plugin

2. **Configure Prettier**
   - Go to `Preferences > Languages & Frameworks > JavaScript > Prettier`
   - Set Prettier package: `./node_modules/prettier`
   - Check "On 'Reformat Code' action"
   - Check "On save"

3. **Configure ESLint**
   - Go to `Preferences > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint`
   - Check "Automatic ESLint configuration"
   - Check "Run eslint --fix on save"

### Vim/Neovim

Add to your config:

```vim
" Install vim-prettier plugin
Plug 'prettier/vim-prettier', { 'do': 'yarn install' }

" Auto-format on save
let g:prettier#autoformat = 1
let g:prettier#autoformat_require_pragma = 0
```

### Emacs

```elisp
;; Install prettier-js package
(use-package prettier-js
  :ensure t
  :hook (js-mode . prettier-js-mode)
  :hook (typescript-mode . prettier-js-mode))
```

### Sublime Text

1. Install Package Control
2. Install "JsPrettier" package
3. Configure in `Preferences > Package Settings > JsPrettier > Settings`:

```json
{
  "auto_format_on_save": true,
  "prettier_cli_path": "./node_modules/.bin/prettier"
}
```

## 📋 Manual Formatting Commands

If automatic formatting isn't working, you can run these commands:

```bash
# Format all TypeScript files
npm run format

# Lint and fix all issues
npm run lint

# Check formatting without changing files
npx prettier --check "apps/**/*.ts" "libs/**/*.ts"

# Format specific file
npx prettier --write apps/user-service/src/main.ts
```

## 🔍 Troubleshooting

### ❌ Formatting Not Working in VS Code

1. **Check if Prettier extension is installed and enabled**

   ```bash
   code --list-extensions | grep prettier
   ```

2. **Check VS Code settings** (press `Cmd+,` or `Ctrl+,`):
   - `editor.formatOnSave` should be `true`
   - `editor.defaultFormatter` should be `esbenp.prettier-vscode`

3. **Check for conflicting formatters**:
   - Disable other formatting extensions temporarily
   - Check if workspace settings override user settings

4. **Restart VS Code**:
   - Close and reopen VS Code
   - Reload window: `Cmd+Shift+P > Developer: Reload Window`

### ❌ ESLint Errors Not Auto-Fixing

1. **Check ESLint extension is installed**
2. **Check output panel**: `View > Output > ESLint`
3. **Manually run ESLint**:
   ```bash
   npm run lint
   ```

### ❌ Git Hooks Not Working

1. **Reinstall Husky**:

   ```bash
   npm run prepare
   ```

2. **Check hook permissions**:

   ```bash
   chmod +x .husky/pre-commit
   ```

3. **Test the hook manually**:
   ```bash
   .husky/pre-commit
   ```

## 🎯 Configuration Files

- **`.prettierrc`** - Prettier formatting rules
- **`.prettierignore`** - Files to exclude from formatting
- **`.editorconfig`** - Basic editor settings
- **`.vscode/settings.json`** - VS Code workspace settings
- **`.vscode/extensions.json`** - Recommended VS Code extensions
- **`.husky/pre-commit`** - Git pre-commit hook
- **`package.json`** - lint-staged configuration

## 🚀 Benefits

Once set up, you'll get:

- ✅ **Consistent code style** across the entire team
- ✅ **Automatic formatting** on every save
- ✅ **Import organization** and cleanup
- ✅ **ESLint auto-fixes** for common issues
- ✅ **Pre-commit formatting** ensures clean commits
- ✅ **Zero configuration** - just save and it works!

## 📞 Need Help?

If automatic formatting still isn't working:

1. Check the troubleshooting section above
2. Verify your editor has the required extensions
3. Try the manual formatting commands
4. Create an issue with your editor details and error messages

Happy coding! 🎉
