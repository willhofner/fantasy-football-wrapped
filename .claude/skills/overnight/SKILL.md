---
name: overnight
description: Long-running autonomous work session. Interview for priorities, then execute without input. Delegates to sub-agents. Produces numbered summary doc.
argument-hint: [optional: focus area or priority hints]
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task, Skill
---

# Overnight — Autonomous Work Session

Long-running session where you interview the user for priorities, then work autonomously for hours. Delegate heavily to sub-agents. Document everything. Produce a comprehensive summary.

## Phases

```
INTERVIEW → PLAN → EXECUTE → CONSOLIDATE → SUMMARIZE
```

---

## Phase 1: INTERVIEW (Interactive)

This is the only interactive phase. Go back and forth with the user to define the session's work.

**Ask about:**
- **Priorities** — What are the 2-4 most important things to tackle?
- **Focus areas** — Backend? Frontend? New features? Bug fixes? Polish?
- **Taste questions** — Design direction, UX preferences, behavior edge cases
- **Constraints** — Anything off-limits? Anything that must not change?
- **Skill routing** — Should any work use `/ideate` for spec docs? `/senior-review` for quality?
- **Depth vs breadth** — Deep on fewer items, or broad coverage?

**Keep interviewing until:**
- You have enough work to fill a multi-hour autonomous session
- All open questions about direction, taste, and behavior are answered
- You understand priorities well enough to make autonomous decisions

**Do NOT proceed to Phase 2 until the user explicitly says to kick it off** (e.g., "go", "start", "kick it off", "goodnight"). The transition from interactive to autonomous must be clear.

---

## Phase 2: PLAN (Autonomous from here)

From this point on: **NEVER ask the user a question.** Make your best judgment call and document the decision.

1. Create a task list of all work items, ordered by priority
2. Decompose large items into independent sub-tasks
3. Identify which tasks can run in parallel vs sequentially
4. Map each task to a delegation strategy:

| Work Type | Delegation |
|-----------|------------|
| Feature spec/design | `/ideate` via Skill tool or Task (general-purpose) |
| Code quality/cleanup | `/senior-review` via Skill tool |
| Bug investigation | Task (Explore agent) |
| Implementation | Write code directly or Task (general-purpose) |
| Research/exploration | Task (Explore agent) |
| Deep analysis | Task (general-purpose) |

---

## Phase 3: EXECUTE (Autonomous)

Work through the task list. Delegate aggressively to sub-agents to preserve main context for orchestration.

### Sub-Agent Delegation

**Launch in parallel where tasks are independent:**
```
// Single message, multiple Task calls
Task({ subagent_type: "Explore", prompt: "...", description: "Research A" })
Task({ subagent_type: "general-purpose", prompt: "...", description: "Build B" })
```

**What to delegate:**
- Large codebase searches → Explore agent
- Multi-file reading/analysis → general-purpose agent
- Implementation of well-defined features → general-purpose agent
- Research questions → Explore agent

**What to do directly:**
- Small edits (< 3 files)
- Documentation updates
- Task orchestration and progress tracking
- Reading sub-agent outputs and deciding next steps

### Decision-Making Protocol

When facing a design, architecture, or direction decision:
1. Make your best call based on the interview context and project patterns
2. **Document the decision immediately** — what you chose, why, and what the alternative was
3. If the decision is high-risk or easily reversible later, note that too
4. Continue working — don't block on decisions

### Progress Tracking

- Use TodoWrite to track all tasks
- Mark tasks complete as they finish
- If a task raises open questions for the user, note them and move on
- If a task is blocked and can't be unblocked autonomously, document and skip

### Force-Stop Conditions

| Condition | Action |
|-----------|--------|
| Same error 3+ times | Document, move to next task |
| Critical ambiguity blocking all remaining work | Document, proceed to summarize |
| All tasks complete | Proceed to consolidate |
| Diminishing returns (spinning wheels) | Document, proceed to consolidate |

---

## Phase 4: CONSOLIDATE (Autonomous)

After execution is complete (or force-stopped):

1. Read all sub-agent outputs
2. Verify changes work together (no conflicts, broken references)
3. Run a quick sanity check on modified files
4. **Update all project documentation:**
   - CLAUDE.md — new files, endpoints, structure changes
   - ROADMAP.md — completed items, new items discovered
   - MEETING_NOTES.md — comprehensive entry for this session
5. Commit all changes with a clear commit message

---

## Phase 5: SUMMARIZE (Autonomous)

Generate a numbered summary doc in `overnight-summaries/`.

Check existing files to determine the next number. Format: `NNN-YYYY-MM-DD-focus-area.md`

### Summary Doc Format

```markdown
# Overnight Summary NNN — YYYY-MM-DD

**Focus:** [Primary focus area]
**Duration:** [Approximate, e.g. "Multi-hour autonomous session"]
**Work Request:** [Original priorities from interview]

## What Was Built

- [Feature/change] — [Brief description]. Files: `path/to/files`
- ...

## Decisions Made

| Decision | Choice | Rationale | Reversible? |
|----------|--------|-----------|-------------|
| ... | ... | ... | Yes/No |

## Bugs Found & Fixed

- [File:line] [Bug description] → [Fix applied]
- ...

## Open Questions

_Things I need your input on. These blocked work or I made a judgment call you should review._

1. **[Topic]** — [Question]. I went with [choice] because [reason], but you may want to revisit.
2. ...

## What's Next

_Recommended priorities based on what I learned during this session._

1. **[Task]** — [Why it's next]
2. ...

## Files Created
| File | Purpose |
|------|---------|
| `path` | [Description] |

## Files Modified
| File | What Changed |
|------|-------------|
| `path` | [Description] |

## Session Stats

- Tasks completed: N
- Sub-agents spawned: N
- Files created: N
- Files modified: N
- Bugs fixed: N
- Decisions made: N
- Open questions: N
```

### Final Message

After the summary doc is written, present a concise message to the user:

```
Overnight session complete.

Summary: overnight-summaries/NNN-YYYY-MM-DD-focus.md

[N] tasks completed, [N] files changed, [N] decisions documented.

Top items needing your review:
1. [Most important open question]
2. [Second most important]

Recommended reading order:
1. This summary
2. [Any spec docs created]
3. [Key files to review]
```

---

## Context Preservation Rules

Your main context window is precious during a long session. Protect it.

| Action | How | Why |
|--------|-----|-----|
| Research codebase | Task (Explore) | Keeps raw search results in sub-agent |
| Build features | Task (general-purpose) | Implementation details stay in sub-agent |
| Read sub-agent results | Read tool on output | Only pull summaries into main context |
| Track progress | TodoWrite | Lightweight, stays in main |
| Quick edits | Edit/Write directly | Fast, minimal context cost |

**Rule of thumb:** If it involves reading more than 3 files or writing more than 50 lines, delegate it.

---

## Guidelines

- **Bias toward action.** When in doubt, build it and document the decision.
- **Ship > perfect.** Get features working, note polish items for later.
- **Document decisions in real-time.** Don't batch them for the summary — you might forget context.
- **Update MEETING_NOTES.md before the summary.** The summary is for the user's morning review; meeting notes are the permanent record.
- **Don't gold-plate.** If a task is done enough to work, mark it complete and move on.
- **Respect the interview.** The user's priorities from Phase 1 are gospel. Don't go rogue on scope.

---

## Checklist (Before Declaring Complete)

- [ ] All tasks marked completed or documented as blocked
- [ ] Summary doc created in `overnight-summaries/`
- [ ] MEETING_NOTES.md updated with session entry
- [ ] CLAUDE.md updated if project structure changed
- [ ] ROADMAP.md updated with completed/new items
- [ ] All changes committed
- [ ] Open questions clearly listed in summary
- [ ] Next steps provided
