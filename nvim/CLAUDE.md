# Neovim Configuration - CLAUDE.md

## Repository Overview
This is a personal Neovim configuration using the Lazy.nvim plugin manager. The configuration is modular and well-organized with custom plugins and thoughtful keymaps.

## Directory Structure
```
├── init.lua                 # Entry point - loads config
├── lazy-lock.json          # Lazy.nvim lockfile
├── lua/
│   ├── config/             # Core configuration
│   │   ├── init.lua        # Loads all config modules
│   │   ├── lazy.lua        # Lazy.nvim bootstrap & setup
│   │   ├── opts.lua        # Neovim options
│   │   ├── remaps.lua      # Custom keymaps
│   │   ├── goodies.lua     # Additional utilities
│   │   └── utils/
│   │       └── helpers.lua # Helper functions
│   ├── plugins/            # Individual plugin configurations
│   └── wrapem/             # Custom word-wrapping plugin
│       ├── init.lua        # Plugin entry point
│       └── core.lua        # Core functionality
```

## Configuration Details

### Core Settings (`lua/config/`)
- **Leader Key**: Space (`vim.g.mapleader = " "`)
- **Tab Settings**: 2 spaces, expandtab enabled
- **Line Numbers**: Relative numbers enabled
- **Clipboard**: System clipboard integration (`unnamedplus`)
- **Search**: No highlight search, incremental search enabled
- **Cursor**: Cursor line highlighting enabled

### Plugin Management
- **Manager**: Lazy.nvim with automatic installation
- **Structure**: Each plugin has its own file in `lua/plugins/`
- **Loading**: Lazy loading configured for performance
- **Change Detection**: Notifications disabled

### Key Plugins
- **LSP**: lsp-zero with Mason (lua_ls, rust_analyzer pre-configured)
- **Completion**: nvim-cmp with Copilot integration
- **File Navigation**: Telescope with fzf-native
- **Theme**: Tokyo Night colorscheme
- **Git**: Various git plugins in git_plugs.lua
- **Formatting**: Conform.nvim for code formatting
- **Linting**: Configured linter setup

### Custom Plugin: WrapEM
Location: `lua/wrapem/`
- **Purpose**: Wrap words with brackets, quotes, or other characters
- **Keymap**: `<leader>w` - prompts for character to wrap with
- **Supported**: `()`, `{}`, `[]`, `<>`, `"`, `` ` ``
- **Behavior**: Finds word boundaries and wraps current word

## Important Keymaps
- `<leader>w` - Wrap word with brackets/quotes (WrapEM)
- `<leader>pf` - Find files (Telescope)
- `<leader>ps` - Live grep (Telescope)
- `<leader>nc` - Search Neovim config files (Telescope)
- `<leader>s` - Replace current word globally
- `<leader>fh` - Help tags (Telescope)
- `<C-d>/<C-u>` - Half page down/up with cursor centered
- `J/K` (visual) - Move selected lines up/down
- `d/dd` - Delete to void register (doesn't overwrite clipboard)

## Development Patterns
- **Plugin Configuration**: Each plugin in separate file returning lazy.nvim spec
- **Keymaps**: Defined in plugin config files or central remaps.lua
- **Options**: Centralized in opts.lua
- **Custom Code**: Separated into dedicated modules (like wrapem/)

## Recent Changes
- Removed `goaterm` plugin (was work in progress)
- Enhanced `wrapem` plugin with better word detection
- Updated completion, themes, and treesitter configurations
- Modified line plugin settings

## Testing/Building
- No specific build commands - Neovim config loads directly
- Plugin management through Lazy.nvim interface (`:Lazy`)
- LSP management through Mason (`:Mason`)

## Common Tasks
- **Add Plugin**: Create new file in `lua/plugins/` returning lazy spec
- **Modify Keymaps**: Edit `lua/config/remaps.lua` or plugin-specific configs
- **Update Options**: Edit `lua/config/opts.lua`
- **Custom Functions**: Add to `lua/config/goodies.lua` or create new module