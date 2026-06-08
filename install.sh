#!/usr/bin/env bash
# dotfiles installer — symlinks configs and backs up existing files

set -e
shopt -s nullglob

DOTFILES="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$HOME/.dotfiles-backup/$(date +%Y%m%d-%H%M%S)"

link() {
    local src="$1"
    local dest="$2"

    if [ ! -e "$src" ]; then
        echo "  WARN: source not found: $src (skipping)"
        return
    fi

    mkdir -p "$(dirname "$dest")"

    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
        mkdir -p "$BACKUP_DIR"
        mv "$dest" "$BACKUP_DIR/$(basename "$dest")"
        echo "  backed up $(basename "$dest") -> $BACKUP_DIR/"
    fi

    ln -sfn "$src" "$dest"
    echo "  $dest -> $src"
}

echo "installing dotfiles from $DOTFILES"
echo ""

echo "bash:"
link "$DOTFILES/bash/.bashrc" "$HOME/.bashrc"

echo "tmux:"
link "$DOTFILES/tmux/.tmux.conf" "$HOME/.tmux.conf"

echo "alacritty:"
link "$DOTFILES/alacritty/alacritty.toml" "$HOME/.config/alacritty/alacritty.toml"

echo "nvim:"
link "$DOTFILES/nvim" "$HOME/.config/nvim"

echo "claude:"
link "$DOTFILES/claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
link "$DOTFILES/claude/commands" "$HOME/.claude/commands"
link "$DOTFILES/claude/agents" "$HOME/.claude/agents"
link "$DOTFILES/claude/skills" "$HOME/.claude/skills"

echo "bin scripts:"
mkdir -p "$HOME/bin"
for script in "$DOTFILES/bin/"*; do
    link "$script" "$HOME/bin/$(basename "$script")"
done

echo "pi:"
mkdir -p "$HOME/.pi/agent"
link "$DOTFILES/pi/settings.json" "$HOME/.pi/agent/settings.json"
link "$DOTFILES/pi/keybindings.json" "$HOME/.pi/agent/keybindings.json"
link "$DOTFILES/pi/extensions" "$HOME/.pi/agent/extensions"
link "$DOTFILES/pi/prompts" "$HOME/.pi/agent/prompts"
link "$DOTFILES/pi/skills" "$HOME/.pi/agent/skills"
link "$DOTFILES/pi/scripts" "$HOME/.pi/agent/scripts"

echo ""
echo "done. run 'source ~/.bashrc', 'tmux source-file ~/.tmux.conf', and '/reload' in pi to reload."
