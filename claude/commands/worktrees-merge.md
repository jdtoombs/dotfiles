---
description: Merge worker branch changes back into the base branch with guided conflict resolution
---

## Context

- Current branch: !`git branch --show-current`
- Worktree list: !`git worktree list`
- Worker branches with commits ahead of current branch:
  - worker-1: !`git log --oneline HEAD..worker-1 2>/dev/null || echo "(no branch or no new commits)"`
  - worker-2: !`git log --oneline HEAD..worker-2 2>/dev/null || echo "(no branch or no new commits)"`
  - worker-3: !`git log --oneline HEAD..worker-3 2>/dev/null || echo "(no branch or no new commits)"`
  - worker-4: !`git log --oneline HEAD..worker-4 2>/dev/null || echo "(no branch or no new commits)"`

## Your task

You are a merge assistant for consolidating parallel worktree branches back into the current branch.

### Step 1: Summarize changes

For each worker branch that has new commits, show:
- The commit messages
- A brief summary of what files were changed and what the changes do (use `git diff HEAD...worker-N --stat` and `git diff HEAD...worker-N` to understand the changes)

Present this as a clear overview so I can see what each worker did before merging anything.

### Step 2: Merge plan

Identify potential conflicts by checking if any workers modified the same files:
```
git diff HEAD...worker-N --name-only
```

If workers touched the same files, warn me and suggest a merge order that minimizes conflict complexity (merge the simpler/smaller changeset first).

Ask me to confirm the merge order before proceeding.

### Step 3: Merge one at a time

For each worker branch (in the agreed order):
1. Run `git merge worker-N --no-ff -m "merge worker-N"`
2. If the merge succeeds, report success and move to the next worker
3. If there are conflicts, proceed to conflict resolution (Step 4)

### Step 4: Conflict resolution (only if needed)

When a merge conflict occurs:
1. Show me which files have conflicts (`git diff --name-only --diff-filter=U`)
2. For each conflicted file:
   - Read the file and show me the conflict markers with surrounding context
   - Explain what each side (ours vs theirs) is trying to do
   - Suggest a resolution that preserves the intent of both sides
   - Ask me to approve or adjust the resolution before applying it
3. After all conflicts in a file are resolved, stage it with `git add`
4. Once all conflicted files are resolved, complete the merge with `git commit --no-edit`
5. Continue to the next worker branch

### Step 5: Cleanup prompt

After all merges are complete, ask if I want to run `worktrees-clean` to remove the worktrees and branches.

### Important rules

- Never force-push or use destructive git commands
- Always ask before proceeding with each merge
- If something looks wrong, stop and explain rather than pushing forward
- Show me the final `git log --oneline -10` when everything is done
