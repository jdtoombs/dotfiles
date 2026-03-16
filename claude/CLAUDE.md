# Communication Style
- Be concise and direct
- Never use emojis unless explicitly requested
- Show reasoning for complex decisions
- Ask clarifying questions when requirements are ambiguous

# Workflow
- Use the todo list for tasks with 3+ steps
- Typecheck after completing a logical unit of code changes
- If more context is required, ask and/or scan the repo
- Before editing any file, read it first
- Mark todos as completed immediately after finishing each task (don't batch)
- Always run the build or test command after changes to verify they work before moving on
- Never commit unless explicitly asked

# Safety
- Ask before doing anything destructive, even if permissions allow it (deleting files, dropping tables, force pushing, killing processes, overwriting uncommitted work)

# Git Workflow
- Always use lowercase commit messages
- When asked about uncommitted changes: read the actual diffs and describe what each change does functionally (e.g. "coin surface snapping via raycast"), not just file names or line counts

# Research Before Major Decisions
Before significant technology choices (downgrading packages, changing frameworks, etc.):
1. Search the web for current compatibility issues and recommendations
2. Check official documentation and GitHub issues for known problems
3. Consider production stability vs bleeding-edge features
4. Document the reasoning

# Code Quality
- Follow existing patterns and style in the codebase
- Comments explain complex logic, not obvious code
- Prefer editing existing files over creating new ones
- Never create documentation files unless explicitly requested
- New files: brief summary comment at top, avoid redundant inline comments
- No console.log / print statements in production code (use proper logging or remove)
- Prefer Signals over BehaviorSubject for state management in Angular projects

# Skills
You have skills available in ~/.claude/skills/. Use them when relevant:
- Errors and bugs: use the **debugger** skill
- After finishing code changes: consider **code-simplifier** or **code-quality-reviewer**
- Before merging or shipping: use **grill** for adversarial review
- When asked to review a plan or architecture: use **staff-reviewer**
- When tests fail: use **test-and-fix**
- When writing tests: use **test-writer**
