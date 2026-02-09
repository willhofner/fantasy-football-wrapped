# Test Skill

**Invocation:** `/test [scope]`

**Purpose:** End-to-end quality assurance — test core user flows with real data, validate frontend works in browser, report bugs found.

---

## What This Skill Does

This skill validates that shipped features actually work from a user's perspective. It:
1. Identifies what needs testing (new features, changed flows, or full regression)
2. Starts the server if needed
3. Guides you through manual browser testing with a clear checklist
4. Documents test results in a numbered report
5. Reports bugs found (creates bug reports if needed)
6. Gives a clear ship/don't-ship recommendation

---

## When to Use This Skill

| Trigger | Example |
|---------|---------|
| After `/overnight` ships frontend changes | "Weekly Deep Dive overnight session finished — run `/test`" |
| Before considering a feature "done" | "Card pack is coded but untested — run `/test`" |
| When user reports something isn't working | "Hub page broken — run `/test` to reproduce" |
| Before cutting a release / major demo | "Going to show this to friends — run `/test` for regression" |
| When spec doc exists for a feature | "We have spec 001, code is written — run `/test` against spec" |

**Don't use for:**
- Unit testing (use pytest or similar)
- Backend-only changes (use curl/API testing instead)
- Trivial fixes (typos, CSS tweaks) — just verify manually

---

## Workflow

### Phase 1: Scope Definition (Interactive)

Ask the user:
1. **What should I test?**
   - Specific feature (e.g., "Weekly Deep Dive")
   - Specific page (e.g., "Hub page")
   - Full regression (all experiences)
2. **What league config should I use?**
   - Default to memory config (League 17810260, Year 2025, Team "Will")
   - Or user provides specific league/year/team
3. **Are there spec docs to validate against?**
   - Check `dev/specs/` for relevant specs
   - If found, use spec as test requirements doc

### Phase 2: Test Execution (Autonomous)

1. **Start the server** (if not already running)
   - `cd backend && python3 app.py`
   - Verify server responds at localhost:5001

2. **Create test checklist** based on scope
   - For each user flow: setup → action → expected outcome
   - Reference spec docs if they exist
   - Focus on happy path first, then edge cases

3. **Execute manual browser tests** (guided checklist)
   - Provide exact URLs to test
   - Describe what to look for
   - Ask user to confirm pass/fail for each step
   - Use AskUserQuestion for each test item

4. **API validation** (automated where possible)
   - curl relevant endpoints
   - Verify responses match expected structure
   - Check error handling (invalid IDs, missing params)

5. **Console/network check**
   - Ask user to open DevTools and report:
     - JavaScript errors in console
     - Failed network requests (404s, 500s)
     - CSS/asset loading issues

### Phase 3: Report Generation (Autonomous)

1. **Create numbered test report** in `dev/test-reports/`
   - Format: `NNN-YYYY-MM-DD-scope.md`
   - Example: `001-2026-02-09-weekly-deep-dive.md`

2. **Report structure:**
   ```markdown
   # Test Report NNN — [Scope]

   **Date:** YYYY-MM-DD
   **Tester:** Claude + User
   **League Config:** [ID / Year / Team]
   **Spec Reference:** [Link to spec doc if exists]

   ## Summary

   [Pass/Fail + key findings]

   ## Test Environment

   - Server: localhost:5001
   - Browser: [User reports]
   - League: [Config used]

   ## Tests Executed

   | Test | Flow | Result | Notes |
   |------|------|--------|-------|
   | 1 | [Description] | ✅ Pass / ❌ Fail | [Details] |

   ## Bugs Found

   | Bug | Severity | Description |
   |-----|----------|-------------|
   | 1 | High/Med/Low | [Details] |

   ## Recommendation

   - [ ] **Ship** — All critical flows work, bugs are minor/cosmetic
   - [ ] **Don't Ship** — Blocking bugs found, needs fixes first
   - [ ] **Ship with caveats** — Works but has known limitations

   ## Next Steps

   [Recommended actions based on findings]
   ```

3. **Create bug reports** for any issues found
   - Use `/bug-report` skill for each significant bug
   - Link test report to bug report

4. **Update ROADMAP** if needed
   - Move items to "Completed" if tests pass
   - Add bugs to "Known Bugs" if not fixed immediately

---

## Test Report Numbering

Test reports are numbered sequentially: `001-2026-02-09-weekly-deep-dive.md`

Check existing reports in `dev/test-reports/` to determine next number.

---

## Integration with Other Skills

**After `/overnight`:**
```
/overnight → ships code → test report recommends /test → run /test
```

**After `/ideate`:**
```
/ideate → spec doc → code built → run /test (validate against spec)
```

**Before `/clean-slate`:**
```
/test → verify everything works → /clean-slate to wrap up session
```

**When bugs found:**
```
/test → finds bugs → creates bug reports → user decides: fix now or defer
```

---

## Key Testing Patterns

### Testing a New Feature

1. Read the spec doc (if exists)
2. Test happy path first:
   - Can user access the feature?
   - Does core flow work end-to-end?
   - Does data load correctly?
3. Test edge cases:
   - Invalid inputs
   - Missing data
   - Slow network (does loading state show?)
4. Test integrations:
   - Links from hub page work?
   - URL params passed correctly?
   - Back button works?

### Testing After Overnight Session

1. Read the overnight summary
2. Focus on "What Was Built" section
3. Validate each file created/modified works as intended
4. Check "Known Limitations" — verify they're acceptable
5. Answer "Open Questions" through testing

### Full Regression Test

Test all experiences in order:
1. Hub page (setup flow, experience links)
2. Slideshow (data loads, navigation works)
3. Card pack (pack opens, cards display)
4. Arcade (UI loads, data populates)
5. Weekly Deep Dive (week nav, matchup detail)
6. VR HUD (if implemented)

---

## Example Test Checklist (Weekly Deep Dive)

Based on `dev/specs/001-weekly-deep-dive.md`:

**Setup:**
- [ ] Navigate to `http://localhost:5001/weekly.html?leagueId=17810260&year=2025&team=Will`
- [ ] Server responds (no 404)
- [ ] Page loads (no white screen)

**Week Navigation (Section: Week Selector):**
- [ ] Week buttons 1-14 visible
- [ ] Week 1 highlighted by default
- [ ] Clicking Week 5 loads Week 5 data
- [ ] URL updates with ?week=5 param

**Matchup Detail (Section 2):**
- [ ] Two-column roster layout displays
- [ ] Team names show correctly (Will Hofner vs opponent)
- [ ] Scores display (actual + optimal)
- [ ] Lineup errors section shows bench/starter pairs
- [ ] Player positions and points accurate

**Standings (Section 3):**
- [ ] Standings table shows all teams
- [ ] Win-loss records accurate for selected week
- [ ] Your team highlighted
- [ ] Sorted by wins descending

**All Matchups (Section 5):**
- [ ] 4 matchups listed for 8-team league
- [ ] Each matchup shows both teams + scores
- [ ] Scores match ESPN data

**Console/Network:**
- [ ] No JavaScript errors in console
- [ ] No failed network requests (404s, 500s)
- [ ] All CSS/JS files load

---

## Output

At the end, you should have:
1. ✅ Numbered test report in `dev/test-reports/`
2. ✅ Bug reports for any issues found (in `dev/bug-reports/`)
3. ✅ Clear ship/don't-ship recommendation
4. ✅ Updated `planning/MEETING_NOTES.md` with test session entry

---

## Notes

- **Manual testing required** — Claude can't automate browser clicks, so this skill guides you through a checklist and asks for user confirmation
- **Focus on user flows** — Not unit tests, not code review. Does it work from a user's perspective?
- **Use real data** — Always test with actual ESPN league data, not mocks
- **Document thoroughly** — Test reports are evidence that features work. Future you will thank you.
