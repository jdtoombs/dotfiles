# ~/.bashrc - Custom configuration with git branch and purple/blue theme

# Homebrew and nvm must be before interactive check so they're always available
[ -x /home/linuxbrew/.linuxbrew/bin/brew ] && eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/nvm.sh" ] && nvm use --silent default

[[ $- != *i* ]] && return

# History settings
HISTCONTROL=ignoreboth
HISTSIZE=1000
HISTFILESIZE=2000
shopt -s histappend
shopt -s checkwinsize

PURPLE='\033[0;35m'
LIGHT_PURPLE='\033[1;35m'
BLUE='\033[0;34m'
LIGHT_BLUE='\033[1;34m'
CYAN='\033[0;36m'
LIGHT_CYAN='\033[1;36m'
WHITE='\033[1;37m'
LIGHT_GRAY='\033[0;37m'
DARK_GRAY='\033[1;30m'
GREEN='\033[0;32m'
LIGHT_GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

git_branch() {
    git branch 2>/dev/null | grep '^*' | colrm 1 2 | sed 's/^/ on /'
}

git_status() {
    local git_status_output
    git_status_output=$(git status --porcelain 2>/dev/null)
    if [[ -n "$git_status_output" ]]; then
        echo -e " ${YELLOW}*${RESET}"
    fi
}

PS1="\[${LIGHT_BLUE}\]\u\[${RESET}\] \[${LIGHT_GRAY}\]in \[${CYAN}\]\w\[${RESET}\]\[${GREEN}\]\$(git_branch)\[${RESET}\]\$(git_status)\n\[${LIGHT_PURPLE}\]❯\[${RESET}\] "

# PATH additions
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

if [ -d "$HOME/.dotnet" ] ; then
    PATH="$PATH:$HOME/.dotnet"
fi

export EDITOR=nvim
export VISUAL=nvim

export LS_COLORS='di=1;34:ln=1;36:so=1;35:pi=1;33:ex=1;32:bd=1;33:cd=1;33:su=1;31:sg=1;31:tw=1;34:ow=1;34'

echo -e "${LIGHT_PURPLE}Welcome back, ${LIGHT_BLUE}$(whoami)${LIGHT_PURPLE}!${RESET}"
echo -e "${LIGHT_GRAY}$(date)${RESET}"
echo ""

[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

alias cc="claude --continue"
alias cr="claude --resume"
alias rde="docker compose down && docker system prune && docker compose up --build -d && npm start"
alias lg="lazygit"
command -v zoxide &>/dev/null && eval "$(zoxide init bash)"
export PATH="$PATH:/opt/mssql-tools18/bin"
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

alias pil="pi --landing"
alias pir="pi --continue"
