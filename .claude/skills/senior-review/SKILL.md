---
name: senior-review
description: Autonomous senior engineer review — find bugs, fix them, optimize code, clean up, document. Runs without user input.
argument-hint: [optional scope, e.g. "backend" or "frontend"]
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task
---

# Senior Review — Autonomous Code Quality Audit

You are a senior engineer conducting a thorough code review of the entire project (or a scoped subset). This runs fully autonomously — do not ask the user questions. Make your best judgment calls and document everything.

## Scope

If the user provided a scope argument (e.g., "backend", "frontend", "stats"), limit your review to that area. Otherwise, review the entire project.

Scope mapping:
- `backend` → `backend/` directory
- `frontend` → `frontend/` directory
- `stats` → `backend/stats/` directory
- `css` → `frontend/static/css/` directory
- `js` → `frontend/static/js/` directory
- No argument → everything

## Review Process

Work through these phases in order. Be thorough — this is meant to be a comprehensive quality pass.

### Phase 1: Survey

Get a full picture of the codebase state before making changes.

1. Read the project structure (`CLAUDE.md`, key config files)
2. List all source files in scope
3. Check `git status` and `git log --oneline -20` for recent context
4. Read every file in scope (yes, all of them — you need full context to catch cross-file issues)

### Phase 2: Bug Hunt

Look for actual bugs — things that would cause incorrect behavior, crashes, or data corruption.

**Check for:**
- Null/undefined access without guards
- Race conditions (async operations, PubSub timing)
- Off-by-one errors in loops or array indexing
- Incorrect API response handling (missing fields, wrong types)
- Broken data flows (frontend expects field X, backend sends field Y)
- Dead code paths that look like they should be live
- Hardcoded values that should be configurable
- Error handling that swallows errors silently
- Security issues (injection, XSS, exposed secrets)

**For each bug found:** Fix it immediately. Note what you found and what you changed.

### Phase 3: Code Quality

Improve readability, maintainability, and professionalism.

**Do:**
- Remove dead code (unused functions, commented-out blocks, orphaned imports)
- Remove debug artifacts (`console.log` for debugging, `print()` statements, TODO comments that are done)
- Fix inconsistent naming (camelCase vs snake_case within same file)
- Simplify overly complex logic where the intent is clear
- Add docstrings/comments ONLY where the logic is genuinely non-obvious
- Fix obvious style issues (inconsistent indentation, trailing whitespace)

**Do NOT:**
- Refactor working code for aesthetic preferences
- Add type annotations everywhere
- Rewrite functions that work fine just because you'd write them differently
- Add error handling for impossible scenarios
- Change the architecture or patterns

### Phase 4: Optimization

Look for performance issues that would affect real users.

**Check for:**
- N+1 query patterns or redundant API calls
- Unnecessary re-renders or DOM manipulation
- Large data structures being copied unnecessarily
- Missing caching where the same expensive operation runs repeatedly
- Unoptimized loops (O(n²) where O(n) is possible)
- Assets that could be lazy-loaded

**Only fix optimizations that are clearly worthwhile.** Don't micro-optimize.

### Phase 5: Documentation

Ensure the codebase documentation is accurate and helpful.

1. **Check CLAUDE.md** — Does the project structure match reality? Are all endpoints listed? Any stale information?
2. **Check ROADMAP.md** — Are completed items marked done? Any items that should be added or removed?
3. **Fix any stale docs** — Update what's wrong, remove what's outdated

### Phase 6: Report

After all changes are made, update MEETING_NOTES.md with a comprehensive summary.

Format:

```markdown
### YYYY-MM-DD — Senior Review [Scope or "Full"]

**Scope:** [What was reviewed]

**Bugs found and fixed:**
- [File:line] [Description of bug] → [What was fixed]

**Code quality improvements:**
- [File] [What was cleaned up]

**Optimizations:**
- [File] [What was optimized and why]

**Documentation updates:**
- [File] [What was updated]

**Overall assessment:**
[2-3 sentences on the health of the codebase. What's in good shape. What needs attention.]

**Recommended follow-ups:**
- [ ] [Things that need human decision-making or are too risky for autonomous changes]
```

## Guidelines

- **Fix bugs, don't just report them.** You have write access — use it.
- **Be conservative with refactors.** If it works, a senior review is not the time to rewrite it.
- **Don't break things.** If you're unsure a change is safe, skip it and note it in "Recommended follow-ups."
- **Commit your changes.** After all fixes, create a single commit: `"Senior review: [N] bugs fixed, [N] quality improvements"`.
- **This should feel like a real senior engineer reviewed the PR.** Meaningful catches, not nitpicks.
