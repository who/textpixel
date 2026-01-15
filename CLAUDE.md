# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Guidance

* After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding.
* For maximum efficiency, invoke multiple independent operations simultaneously rather than sequentially.
* Before you finish, verify your solution.
* Do what has been asked; nothing more, nothing less.
* NEVER create files unless absolutely necessary for achieving your goal.
* ALWAYS prefer editing an existing file to creating a new one.
* NEVER proactively create documentation files (*.md) or README files unless explicitly requested.

## Project Overview

<!-- TODO: Describe your project here -->

## Technology Stack

<!-- TODO: List your technologies -->
- **Framework**:
- **Frontend**:
- **Backend**:
- **Database**:
- **Styling**:
- **Build Tool**:
- **Deployment**:

## Development Guidelines

### Code Standards

* Linting: Run linter before commits
* Testing: All new features need tests
* TypeScript: Project uses strict TypeScript settings
* ESLint with Prettier for code quality

### Before Committing

1. Run tests
2. Run linter
3. Update docs if you changed behavior
4. Stage changes appropriately

## Command Reference

### Development

```bash
# TODO: Add your development commands
npm run dev             # Start development server
npm run build           # Build for production
npm test                # Run tests
```

### File Operations - Use Fast Tools

```bash
# List files (FAST)
fd . -t f           # All files recursively
rg --files          # All files (respects .gitignore)
fd . -t d           # All directories

# Search content (FAST)
rg "search_term"                # Search in all files
rg -i "case_insensitive"        # Case-insensitive
rg "pattern" -t py              # Only Python files
rg "pattern" -g "*.md"          # Only Markdown
rg -l "pattern"                 # Filenames with matches
rg -c "pattern"                 # Count matches per file
rg -n "pattern"                 # Show line numbers
rg -A 3 -B 3 "pattern"          # Context lines

# Find files by name (FAST)
fd "filename"                   # Find by name pattern
fd -e js                        # All .js files
```

### Banned Commands - Avoid These Slow Tools

* `tree` - use `fd` instead
* `find` - use `fd` or `rg --files`
* `grep` or `grep -r` - use `rg` instead
* `ls -R` - use `rg --files` or `fd`
* `cat file | grep` - use `rg pattern file`

### Search Strategy

1. Start broad, then narrow: `rg "partial" | rg "specific"`
2. Filter by type early: `rg -t python "def function_name"`
3. Batch patterns: `rg "(pattern1|pattern2|pattern3)"`
4. Limit scope: `rg "pattern" src/`

## Project Architecture

### File Structure

<!-- TODO: Document your file structure -->
- `src/` - Application source code

## Issue Tracking

We use **beads** (`bd`) for issue tracking.

```bash
# Find and claim work
bd ready                    # Find ready work (no blockers)
bd ready --include-deferred # Include future deferred issues
bd update <id> --status in_progress

# Create issues
bd create "Title" -t bug|feature|task -p 0-4 -d "Description"
bd create "Task" --due=+6h              # Due in 6 hours
bd create "Task" --defer=tomorrow       # Hidden until tomorrow

# Complete work
bd close <id> --reason "Done"

# Query and explore
bd list                     # List all issues
bd show <id>                # Get issue details
bd dep tree <id>            # Show dependency tree
bd stats                    # Overall progress
```

### Workflow

1. Check for ready work: `bd ready`
2. Claim your task: `bd update <id> --status in_progress`
3. Implement, test, document
4. If you discover new work, create issues and link them
5. Complete and close: `bd close <id> --reason "Done"`

### Session Completion

**When ending a work session**, complete ALL steps below. Work is NOT complete until `git push` succeeds.

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Push to remote**:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Hand off** - Provide context for next session

**Critical:** Work is NOT complete until `git push` succeeds. Never stop before pushing.

### Issue Priorities

* `0` - Critical (security, data loss, broken builds)
* `1` - High (major features, important bugs)
* `2` - Medium (nice-to-have features, minor bugs)
* `3` - Low (polish, optimization)
* `4` - Backlog (future ideas)

## Development Workflow

<!-- TODO: Document your development workflow -->

## Important Notes

<!-- TODO: Add project-specific notes -->

## Important Files

<!-- TODO: List important files -->
* **CLAUDE.md** - AI agent instructions (this file)

## Pro Tips for AI Agents

* Always use `--json` flags when available for programmatic use
* Check ready work queue before asking "what next?"
* Use dependency trees to understand complex relationships
* Higher priority issues (0-1) are usually more important than lower (2-4)
* Link discovered issues to maintain context

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
