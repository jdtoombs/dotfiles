#!/usr/bin/env bash
# WSL/bootstrap packages for this dotfiles setup.
# Safe to rerun. Does not install secrets or credentials.

set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24}"
PI_PACKAGE="${PI_PACKAGE:-@earendil-works/pi-coding-agent}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
has() { command -v "$1" >/dev/null 2>&1; }

if ! has sudo; then
  echo "sudo is required" >&2
  exit 1
fi

log "apt packages"
sudo apt-get update
sudo apt-get install -y \
  bash-completion \
  build-essential \
  ca-certificates \
  curl \
  fd-find \
  fzf \
  git \
  jq \
  neovim \
  python3 \
  python3-pip \
  ripgrep \
  tmux \
  unzip \
  wget \
  xclip \
  zip

# Ubuntu/Debian often installs fd as fdfind.
if has fdfind && ! has fd; then
  mkdir -p "$HOME/.local/bin"
  ln -sfn "$(command -v fdfind)" "$HOME/.local/bin/fd"
fi

log "nvm/node"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use default

log "npm globals"
npm install -g "$PI_PACKAGE"

log "optional checks"
for cmd in git tmux nvim rg fd fzf jq node npm pi; do
  if has "$cmd"; then
    printf '  %-8s %s\n' "$cmd" "$(command -v "$cmd")"
  else
    printf '  %-8s missing\n' "$cmd"
  fi
done

cat <<'MSG'

Next steps:
  1. Run ~/dotfiles/install.sh
  2. Restart shell or run: source ~/.bashrc
  3. In tmux, run: tmux source-file ~/.tmux.conf
  4. Authenticate Pi with /login or API keys. Do not commit auth.json/secrets.

MSG
