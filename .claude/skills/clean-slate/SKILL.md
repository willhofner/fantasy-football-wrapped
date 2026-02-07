---
name: clean-slate
description: End-of-session consolidation — merge all branches, document everything, flag unfinished work, update all docs. Safe to close every Claude tab after running this.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Clean Slate — Session Consolidation

You are running an end-of-session consolidation. The user has multiple Claude instances running with partially shipped work across branches. Your job is to merge everything into a clean state, document all changes, flag anything half-baked, and update all project docs so the user can safely close every tab and pick up tomorrow (or immediately in a fresh session) with zero context loss.

## Process

Work through these phases in order. Be thorough — this is the last thing that runs before the user walks away.

---

### Phase 1: Survey the Landscape

**Understand what exists across all branches.**

1. Run `git branch -a` to see all local and remote branches
2. Run `git log --oneline --all --graph` (last ~30 commits) to understand the branch topology
3. For each non-main branch, run `git log main..<branch> --oneline` to see what it contains
4. Run `git stash list` to check for stashed work
5. Run `git status` on the current branch

**Present a summary to the user:**
- List every branch with a 1-line description of what it contains
- Flag any branches with merge conflicts against main
- Flag any stashed work
- Note any uncommitted changes on any branch
- Ask the user if there are branches they want to SKIP (not merge)

Wait for user confirmation before proceeding to merges.

---

### Phase 2: Merge Everything

**Merge branches into main one at a time, in dependency order.**

For each branch:
1. `git checkout main`
2. `git merge <branch> --no-ff` (preserve branch history)
3. If there are conflicts:
   - Show the user the conflicting files and the nature of each conflict
   - Ask how they want to resolve (theirs, ours, or manual guidance)
   - Resolve and complete the merge
4. After successful merge, note what was merged

If a branch is clearly experimental/throwaway, confirm with the user before merging.

**Do NOT delete branches yet** — wait until the user confirms everything looks good at the end.

---

### Phase 3: Audit the Merged State

**After all merges, examine the full diff from before to after.**

1. Run `git diff <pre-merge-sha>..HEAD --stat` to see all files changed
2. Read through changed files to understand what was built
3. Run any quick sanity checks:
   - `python3 -c "import backend.app"` or similar import check if applicable
   - Check that HTML files reference valid JS/CSS paths
   - Look for obvious broken references, orphaned imports, debug code left in

**Categorize everything into:**
- **Fully shipped**: Complete features, working code, ready for production
- **Partially baked**: Started but not finished — needs more work
- **Experimental**: Prototypes, explorations, might keep or might discard
- **Broken**: Merge artifacts, conflicts, or things that clearly don't work

---

### Phase 4: Document Changes

**Update MEETING_NOTES.md with a consolidation entry.**

Add a new session entry with the format:

```markdown
### YYYY-MM-DD — Clean Slate Consolidation

**Branches merged:**
- `branch-name` — Description of what it contained

**What was shipped (complete):**
- [x] Feature/change description — files affected

**What is partially baked (needs follow-up):**
- [ ] Feature/change description — what's done, what's left, which files
  - Current state: [description]
  - Remaining work: [specific tasks]
  - Key files: [paths]

**What is experimental (decision needed):**
- [ ] Feature/change description — keep, iterate, or discard?

**Known issues introduced:**
- [ ] Issue description — where it lives, how to reproduce

**Branches cleaned up:**
- `branch-name` — merged and deleted (or kept, with reason)

**Stashed work:**
- Description of any stashes applied or discarded
```

---

### Phase 5: Update CLAUDE.md

**Ensure CLAUDE.md reflects the current state of the project.**

Check and update as needed:
- **Project Structure tree** — Any new files or directories?
- **When to Read What table** — Any new entry points?
- **Multi-Experience Architecture** — Any new experiences?
- **API Endpoints** — Any new or changed endpoints?
- **Quick Commands** — Any new URLs or commands?
- **Common Issues** — Any new known issues?
- **Custom Skills** — Any new skills?

---

### Phase 6: Update ROADMAP.md

**Sync the roadmap with reality.**

1. Move completed items to the "Completed" section
2. Add any new ideas or tasks that emerged from the merged work
3. Update "Now" section to reflect actual current priorities
4. Add any new partially-baked items to the appropriate priority level with a note about current state

---

### Phase 7: Final Checklist

**Present this to the user before finishing:**

```
CLEAN SLATE SUMMARY
===================

Branches merged:     [N]
Branches skipped:    [N]
Branches to delete:  [list — confirm with user]

Files changed:       [N]
Features shipped:    [N]
Items needing work:  [N]

Docs updated:
  [x] MEETING_NOTES.md
  [x] CLAUDE.md
  [x] ROADMAP.md

Unfinished threads (pickup points):
  1. [Description] — see [file/section]
  2. [Description] — see [file/section]

Safe to close all tabs: YES / NO (explain if no)
```

**Ask the user:**
1. Want me to delete the merged branches? (list them)
2. Want me to push main to remote?
3. Anything else before you close out?

---

## Guidelines

- **Never force-push or rewrite history.** Use `--no-ff` merges to preserve context.
- **Always ask before deleting.** Branches, stashes, files — confirm first.
- **Be honest about broken things.** Don't paper over issues. If something merged badly, say so.
- **Err on the side of over-documenting.** The whole point is that the user (or a fresh Claude) can pick up with zero context loss.
- **One commit for the doc updates.** After all merges, commit the MEETING_NOTES/CLAUDE.md/ROADMAP.md updates as a single "Clean slate: document consolidation" commit.
