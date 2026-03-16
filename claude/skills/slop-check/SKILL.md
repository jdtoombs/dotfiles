---
name: slop-check
description: Invoke code-quality-reviewer on recent changes (staged or all uncommitted)
argument-hint: "[staged]"
---

## Context

First, determine which changes to review based on the argument.

If the user provided "staged" as an argument, run: `git diff --cached`
Otherwise, run: `git diff HEAD`

Then use the Task tool to launch the code-quality-reviewer agent to analyze the diff comprehensively. The agent should check for:

- Security vulnerabilities
- Performance bottlenecks
- Code redundancies and duplication
- Readability issues
- Best practices violations

Focus the review on the changes shown in the diff.
