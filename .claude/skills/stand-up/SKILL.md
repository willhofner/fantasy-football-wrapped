---
name: stand-up
description: Quick standup meeting — recent progress, open questions, and proposed next steps. Generates a numbered standup doc.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Stand-Up — Quick Status Meeting

You are running a quick standup. Review the project state, summarize recent progress, surface open questions, and propose next steps.

## Process

### Step 1: Gather Context

Read these files to understand current state:
1. `MEETING_NOTES.md` — What happened recently
2. `ROADMAP.md` — Current priorities and backlog
3. `spec-docs/` — Any recent spec docs (check modification dates)
4. `bug-reports/` — Any open bug reports
5. `git log --oneline -15` — Recent commits
6. `git status` — Any uncommitted work

### Step 2: Generate Standup Doc

Save to `planning/stand-ups/` with naming convention: `NNN-YYYY-MM-DD.md` (zero-padded 3-digit number, incrementing from last standup in folder).

Check existing files in `planning/stand-ups/` to determine the next number. If the folder is empty, start at `001`.

Format:

```markdown
# Stand-Up NNN — YYYY-MM-DD

## Recent Progress
_What we built or specced since last standup._

- [Item] — [Brief description, link to spec doc or commit if relevant]
- ...

## Open Questions
_Things I need your input on before moving forward._

1. **[Topic]** — [Question]. [Why it matters / what's blocked.]
2. ...

## Current State
_Where things stand right now._

- **In progress:** [What's actively being worked on, if anything]
- **Blocked on:** [What's waiting for a decision or input]
- **Ready to build:** [Spec'd features that are ready for implementation]

## Proposed Next Steps
_What I recommend we tackle next, in priority order._

1. **[Task]** — [Why this is next. Link to spec or roadmap item.]
2. **[Task]** — [Why.]
3. **[Task]** — [Why.]

## Notes
[Anything else worth flagging — risks, dependencies, ideas that came up.]
```

### Step 3: Present & Discuss

After generating the doc, present the standup to the user conversationally. Don't just dump the doc — highlight the most important items:

- Lead with open questions (these need the user's input)
- Summarize proposed next steps and ask if the priority order feels right
- Flag anything that seems off or risky

Wait for the user's responses to open questions before moving on.

## Guidelines

- **Keep it brief.** This is a standup, not a retrospective. 5-minute read max.
- **Be opinionated about next steps.** Don't just list options — recommend a path.
- **Surface blockers early.** If something is stuck, lead with it.
- **Link to artifacts.** Reference spec docs, bug reports, and roadmap items by path.
- **Update MEETING_NOTES.md** after the standup conversation concludes, noting any decisions made.
