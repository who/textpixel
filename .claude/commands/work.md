---
allowed-tools:
  - Bash(bd ready:*)
  - Bash(bd show:*)
  - Bash(bd update:*)
  - Bash(bd close:*)
  - Bash(bd list:*)
  - Bash(npm run build:*)
  - Bash(npm test:*)
  - Bash(npm run lint:*)
---

Check bd for ready work and start on the highest priority actionable item.

**Important**: Skip epics (type=epic) - they are containers for sub-tasks, not directly actionable work. Focus on: task, feature, bug, chore types.

## Workflow

1. Run `bd ready` to find unblocked work
2. Skip epics and find the highest priority actionable issue (task/feature/bug)
3. Run `bd show <id>` to get full context on the selected issue
4. Mark it in progress: `bd update <id> --status in_progress`
5. Implement the work described in the issue

## MANDATORY: Build Verification Before Closing

**NEVER close a task or commit code without passing these checks:**

6. **Run build verification**: `npm run build`
   - This MUST succeed before proceeding
   - If it fails, fix the errors before closing the task
   - Do NOT commit broken code

7. **Run tests**: `npm test`
   - All tests MUST pass before proceeding
   - If tests fail, fix them before closing the task

8. **Run linter**: `npm run lint`
   - Fix any linting errors before proceeding

9. **Only after build + tests + lint pass**: Close the task with `bd close <id> --reason "Done: <brief summary>"`

## Failure Recovery

If build, tests, or lint fail:
- DO NOT close the task
- DO NOT commit the code
- Fix the issues first
- Re-run verification steps
- Only proceed when all checks pass

If no actionable work is ready (only epics remain), report that only epics are available and suggest checking their sub-tasks with `bd show <epic-id>`.
