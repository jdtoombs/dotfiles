# Parallel Worktree Workflow

Run multiple Claude Code sessions in parallel using git worktrees and tmux.

## Commands

| Command | Type | Description |
|---------|------|-------------|
| `worktrees [base-branch]` | bash (~/bin) | Creates 4 worktrees and opens them in a 2x2 tmux grid |
| `worktrees-clean` | bash (~/bin) | Kills the tmux session, removes all worktrees and branches |
| `/worktrees-merge` | claude command | Merges worker branches back with guided conflict resolution |

## Flow

1. **Start** - `cd` into your repo and run `worktrees`
   - Creates `.worktrees/worker-{1..4}` directories
   - Each gets a branch `worker-{1..4}` based off the base branch (default: `main`)
   - Opens a tmux session with 4 labeled panes

2. **Work** - Run Claude Code in each pane with separate tasks
   - Each worker operates on its own branch in its own directory
   - Commit your changes in each worker when done

3. **Merge** - Go back to the main repo and run `/worktrees-merge`
   - Summarizes what each worker changed
   - Detects overlapping file changes and suggests merge order
   - Merges one branch at a time with confirmation
   - Walks you through conflicts interactively if they arise
   - Offers to clean up when done

## Notes

- Base branch defaults to `main` but can be overridden: `worktrees develop`
- If a merge has conflicts, resolve them with Claude's help, then re-run `/worktrees-merge` to continue with remaining workers
- `worktrees-clean` force-removes worktrees so make sure changes are committed or merged first
