---
name: bug-report
description: Full bug handling workflow — interview the user, investigate, generate a report, then offer to fix. Adds unfixed bugs to ROADMAP.
argument-hint: [description of what went wrong]
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task
---

# Bug Report — Full Bug Handling Workflow

You are handling a bug report from start to finish. This is a three-phase process: interview, investigate & document, then offer to fix.

## Phase 1: Interview

The user has described a bug. Your job is to ask targeted follow-up questions to fully define the issue. Don't ask obvious questions — if the user said "the slides page crashes," don't ask "which page?"

**You need to understand:**
- **Exact steps to reproduce** (what they did, in what order)
- **Expected vs actual behavior** (what should happen vs what happened)
- **Environment** (browser, device, which experience — slides/pack-opening/arcade/vr-hud)
- **Reproducibility** (every time? intermittent? only with certain leagues?)
- **Console errors** (ask them to check if they haven't)
- **Data context** (which league ID, which team, which week if relevant)

Ask your follow-up questions in a single batch. Be direct: "Can you check the browser console?" or "Does this happen with every league or just yours?"

**Do NOT proceed to Phase 2 until the bug is clearly defined.** If the user's answers raise new questions, ask those too.

## Phase 2: Investigate & Document

Once the bug is defined, investigate the codebase and generate a bug report.

### Investigation

- Read the files involved in the broken flow
- Trace the data flow: user action → frontend JS → API call → backend processing → response → rendering
- Identify specific functions and line numbers likely involved
- Check for obvious causes (null access, wrong variable names, race conditions, missing data)
- Check `git log --oneline -10` for recent changes that might be related

### Generate the Report

Save the report to `bug-reports/` with the naming convention: `YYYY-MM-DD-short-description.md`

Use this format:

```markdown
# Bug Report: [Concise title]

## Priority
[Critical / High / Medium / Low]

## Summary
[2-3 sentences. What happens, when, why it matters.]

## Steps to Reproduce
1. [Exact step]
2. [Exact step]
3. ...

**Environment:** [Browser, device, experience]
**Reproducibility:** [Always / Intermittent / Once]
**League/Team:** [If relevant]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens. Exact error messages, visual description, wrong values.]

## Error Details
[Console errors, network errors, stack traces. If none: "No console errors observed."]

## Relevant Code Paths

### Data Flow
1. User does X → `path/to/file.js:functionName()` (line ~N)
2. API call to `/api/...` → `backend/app.py:handler()` (line ~N)
3. ...

### Files to Examine
| File | Why |
|------|-----|
| `path/to/file` | [What to look for] |

### Suspect Code
[Snippets with file paths and line numbers if you found likely problematic code]

## Root Cause Hypothesis
[Specific hypothesis. "The formatTeamData() function assumes optimal_record exists" — NOT "something is wrong with formatting"]

## Suggested Fix Direction
[High-level approach, not the actual fix code]
```

## Phase 3: Offer to Fix

After generating the report, ask the user:

> "Bug report saved to `bug-reports/[filename].md`. Want me to fix this now?"

**If the user says yes:** Implement the fix. After shipping, update MEETING_NOTES.md.

**If the user says no or defers:** Add the bug to ROADMAP.md under a `## Known Bugs` section (create it if it doesn't exist, place it right after `## Now (Active Focus)`). Format:

```markdown
- [ ] **[Bug title]** — [One-line summary]. See `bug-reports/[filename].md`. ([Priority])
```

## Guidelines

- **Be specific over thorough.** A precise 10-line report beats a vague 50-line report.
- **Include line numbers.** Don't make the fixer search for code you already found.
- **One bug per report.** If the user describes multiple issues, handle them sequentially.
- **Hypothesize boldly.** If you see the likely cause, say so clearly.
- **Update MEETING_NOTES.md** when a bug is reported or fixed — keep the changelog current.
