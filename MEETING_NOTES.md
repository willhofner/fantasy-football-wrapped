# Meeting Notes

Living changelog. Reverse chronological. Bulleted and scannable.

---

## Session Log

### 2026-02-09 — Advanced Stats Package Ideation, Spec & Consolidation

**What happened:**
- User requested ideation on emotionally powerful, shareable stats
- Brainstormed 50+ stat ideas organized by emotional impact and shareability
- Created comprehensive spec doc: `spec-docs/003-advanced-stats-package.md`
- Consolidated overlapping ROADMAP items into the spec (merged duplicates)
- Restructured ROADMAP priorities to reference spec phases (1/2/3)

**Stat categories explored:**
- **Decision Patterns** — When/why you make mistakes (Sunday panic, consistency vs chaos, clutch gene)
- **Positional Intelligence** — Error rates by position, FLEX graveyard, depth IQ
- **Risk Analysis** — Ceiling chasers vs floor seekers, injury risk tolerance
- **League Context** — Strength of schedule, nemesis/victim, unluckiest losses
- **Timing & Momentum** — Streaks, peak windows, early vs late season
- **Anomaly Detection** — Goose eggs, bench explosions, extreme margins
- **Would've/Could've/Should've** — Perfect season record, one-player-away games, cost of errors
- **Manager Archetypes** — The Gambler, The Tinkerer, The Lucky Bastard, etc.

**Top 15 priority stats identified:**
1. Close game record (clutch or choke?)
2. Position error breakdown
3. Strength of schedule
4. Nemesis/victim (head-to-head)
5. Longest win/loss streaks
6. Bench explosion week
7. Goose egg count
8. One-player-away count
9. Perfect season record
10. Volatility ranking
11. Draft vs waiver MVP
12. Projection deviation
13. Manager archetype classification
14. Nail-biters count (<3pt games)
15. Boom-bust ratio

**Spec details:**
- Organized into 3 tiers by implementation complexity
- **Tier 1 (Quick Wins):** 16 stats using existing data — consistency, position errors, clutch factor, bench narratives, extreme margins, perfect season analysis
- **Tier 2 (Medium Effort):** Head-to-head matrix, positional depth, roster tenure, season splits, archetype classification
- **Tier 3 (Complex):** Draft/acquisition analysis, injury tracking, projection comparison (requires new ESPN API data)
- MVP scope: Phase 1 only (Tier 1 stats) = 3-4 new slides, ~16 stats, 1 overnight session
- Implementation plan includes backend module updates and new `advanced_analyzer.py`

**Consolidation changes:**
- Removed duplicate items from ROADMAP P0/P1/P2 now covered in spec
- ROADMAP P0 → Advanced Stats Package Phase 1 (Tier 1 quick wins)
- ROADMAP P1 → Advanced Stats Package Phase 2 (Tier 2 medium effort)
- ROADMAP P2 → Advanced Stats Package Phase 3 (Tier 3 complex)
- Added note to "Later" section pointing to spec for consolidated items
- Added "Top Heavy" stat to spec Tier 2 (wasn't originally included)

**Items consolidated:**
- Luckiest Win / Heartbreaking Loss → Spec Tier 1
- FLEX Analysis → Spec Tier 1 (FLEX Graveyard)
- Week-by-Week Error Chart → Spec Tier 1 (consistency metrics)
- Free Agent / Draft Analysis → Spec Tier 3
- Position Depth Analysis → Spec Tier 2
- Bye Week Heroes → Spec Tier 2
- Head-to-head rivalry → Spec Tier 2
- Trade analysis → Spec Tier 3
- Injury impact → Spec Tier 3
- Home Grown Talent → Spec Tier 3
- Good Calls vs Projections → Spec Tier 3

**Files created:**
- `spec-docs/003-advanced-stats-package.md`

**Files modified:**
- `ROADMAP.md` — Consolidated duplicate stat items, restructured priorities by spec phases, updated "Ideas" section
- `spec-docs/003-advanced-stats-package.md` — Added missing stats: "Top Heavy" (Tier 2), "Week-by-Week Error Tracking" (Tier 1), "Crown Jewel" (Tier 2), "Practice Squad" (Tier 3), added consolidation notes

**Verification pass:**
- Systematically checked all ROADMAP items are captured in spec
- Added 4 missing stats to ensure complete coverage
- Updated consolidation notes with all items

**Key design principle:**
"Every stat should answer: Does this make me want to screenshot and roast my friends? If not, cut it."

**Next steps (when prioritized):**
1. Implement Tier 1 stats (Phase 1)
2. Test with league 17810260, validate accuracy
3. Design/implement new slide layouts
4. Integrate into card pack experience
5. Phase 2/3 after MVP ships

---

### 2026-02-09 — CLAUDE.md Updated: Parallelism & Subagent Usage

**What happened:**
- Added comprehensive "Parallelism & Subagent Usage" section to CLAUDE.md
- New guidance encourages aggressive use of subagents and parallel exploration
- Includes concrete examples, patterns, and rules of thumb

**Key additions:**
- **When to use subagents**: Codebase exploration, multi-part investigations, background tasks, complex research
- **Parallelism patterns**: Parallel exploration (3+ Explore agents), background delegation, parallel file modifications
- **Available agent types**: Explore, general-purpose, Bash, Plan (with usage examples)
- **Project-specific examples**: Pack opening animation analysis, new experience development, bug investigation
- **Rules of thumb**: >2 files = parallel agents, complex questions = multiple subsystem agents, default to parallelization

**Files modified:**
- `CLAUDE.md` — Added 150-line section after "Working Together", before "Personal Preferences"

**Rationale:**
- User observed hype about parallel Claude instances but wasn't sure how to optimize usage
- Subagents enable 3-5x speedup for exploration/investigation tasks
- Future Claude instances will now default to aggressive parallelism instead of sequential work

---

### 2026-02-09 — Arcade Visual Realism Spec Created

**What happened:**
- Created spec doc for arcade cabinet visual realism overhaul (`spec-docs/002-arcade-visual-realism.md`)
- Spec defines "super realistic" 3D arcade cabinet with authentic materials, textures, and depth
- Marked as backlog item — requires design ideation session before implementation

**Key details:**
- Target: Photorealistic arcade cabinet using CSS, pseudo-elements, gradients, shadows
- Enhancements: 3D perspective with visible side panels, wood grain textures, metallic screen housing, authentic control panel, T-molding, speaker grilles, wear/scuff marks
- Open questions flagged: Exact 3D angle, wood grain placement, color palette, marquee design, reference cabinet
- Out of scope: No functional changes, purely visual polish

**Files created:**
- `spec-docs/002-arcade-visual-realism.md`

**Files modified:**
- `ROADMAP.md` — Added arcade visual realism to "Polish & UX" backlog section

**Priority:** Backlog — "Someday make it perfect" polish pass, not urgent for launch

---

### 2026-02-09 — Arcade Cabinet Sizing Bug Fix

**What happened:**
- Fixed arcade cabinet cutoff bug on 14" MacBooks (bug-reports/003-arcade-cabinet-cutoff-macbook.md)
- Implemented Option A (Dynamic Height Scaling) from bug report
- Added responsive media queries for smaller laptop screens

**Bug:** Arcade cabinet was 90vh with max-height 850px, causing bottom control panel to be cut off on 14" MacBooks (~900px viewport height)

**Fix implemented:**
- Changed `.arcade-cabinet` height to `min(90vh, 750px)` with max-height 750px
- Added `@media (max-height: 900px)` breakpoint: 85vh / 750px max
- Added `@media (max-height: 800px)` breakpoint: 80vh / 650px max

**Files modified:**
- `frontend/static/css/arcade.css` — lines 62-70, added responsive breakpoints

**Result:** Cabinet now fits properly on 13", 14", 15", 16" laptop screens without requiring scrolling

---

### 2026-02-09 — Senior Review Session

**What happened:**
- User requested `/senior-review` on current codebase
- Completed autonomous full-codebase audit (all backend, frontend, docs)
- Found and fixed 3 bugs, 2 quality improvements
- Committed changes with descriptive commit message
- User reminded: **Always update meeting notes every conversation** (don't wait until end of session)

**Scope:** Full codebase — backend + frontend + documentation

**Bugs found and fixed:**
- [backend/app.py:36-39] Dead code route `/v2` referenced non-existent `index-v2.html` file from old architecture → Removed route entirely
- [frontend/static/js/setup.js:199-202] Obsolete code checking for `currentExperienceMode` variable and calling `PackOpening.start()` from legacy architecture → Removed conditional, simplified to direct slideshow initialization
- [frontend/static/js/weeklyController.js:132] Using raw `fetch()` instead of `apiFetch()` wrapper → Switched to `apiFetch()` for consistent error handling with descriptive messages

**Code quality improvements:**
- [ROADMAP.md] Updated Card Pack Experience reference from non-existent `index-v2.html` to correct `pack-opening.html`

**Documentation updates:**
- None needed — CLAUDE.md project structure accurately reflects reality

**Overall assessment:**
Codebase is in excellent shape. No critical bugs, no security issues, no performance problems. The multi-experience architecture (slides, cards, arcade, weekly, VR) is well-organized with clear separation of concerns. Error handling is comprehensive (especially the `apiFetch` wrapper with descriptive error messages). Only issues found were minor remnants from architectural evolution (dead code referencing old file names).

**Recommended follow-ups:**
- None — codebase is production-ready

---

### 2026-02-09 — Test Skill Creation & Skill Usage Guidelines

- Created `/test` skill for end-to-end QA validation
- Updated `/overnight` skill to recommend `/test` after shipping frontend changes
- Added "When to Use Each Skill" section to CLAUDE.md with:
  - Situation-based skill selection guide
  - Common skill chains (workflows)
  - Skill usage rules
- Updated CLAUDE.md project structure to include `test-reports/` directory
- Updated "When to Read What" table to include test reports

**What was shipped:**
- ✅ `.claude/skills/test/SKILL.md` — new skill for manual browser testing + API validation
- ✅ `test-reports/.gitkeep` — directory for numbered test reports
- ✅ Updated `.claude/skills/overnight/SKILL.md` — added frontend testing reminder
- ✅ Updated `CLAUDE.md` — project structure, custom skills table, "When to Use Each Skill" section

**Key decisions:**
- Test skill is semi-automated: API tests run via curl, browser tests via guided checklist with user confirmation
- Test reports numbered like other docs: `001-YYYY-MM-DD-scope.md`
- Test skill validates against spec docs when they exist
- Overnight must recommend `/test` if frontend code shipped

**How to use `/test`:**
1. Run after `/overnight` ships frontend changes
2. Run before considering a feature "done"
3. Run before showing features to others
4. Run to validate against spec requirements
5. Can test specific feature, specific page, or full regression

**Next steps (as requested by user):**
1. Run `/senior-review` on current codebase
2. Run `/test` on Weekly Deep Dive

---

### 2026-02-09 — Weekly Deep Dive Implementation (Overnight Session)

- Built core Weekly Deep Dive feature from `spec-docs/001-weekly-deep-dive.md`
- Implemented backend weekly analyzer + API endpoint
- Implemented frontend week navigation + matchup detail + standings
- Wired into hub page as 4th experience option
- Tested end-to-end with league 17810260, year 2025, team Will Hofner

**What was shipped:**
- ✅ Backend: `weekly_analyzer.py` — per-week analysis (matchups, rosters, standings, lineup errors)
- ✅ API endpoint: `/api/league/<id>/week/<week>/deep-dive` (requires `team_id` param)
- ✅ Frontend: `weekly.html` — week navigation, matchup detail, standings, all matchups list
- ✅ JS modules: `weeklyController.js` (data fetching, week nav), `weeklyRenderer.js` (DOM rendering)
- ✅ Stub: `lineupEditor.js` (placeholder for tap-to-swap functionality)
- ✅ CSS: `weekly.css` — magazine layout, responsive, dark theme
- ✅ Hub integration: added "Weekly Deep Dive" option to experience picker (4th card, 2x2 grid)

**Deferred to later:**
- Tap-to-swap lineup editor (stub created, not implemented)
- Projected points parsing from ESPN API
- NFL scores (Section 4 — `nfl_data.py` + ESPN scoreboard API)
- LLM-generated summaries (Sections 1 & 2B — Claude API integration)
- Expandable matchup cards in "All Matchups" section

**Key decisions:**
- Team selection: If no `team` or `teamId` param in URL, controller fetches teams and uses first one
  - **Why:** Simpler for MVP. Other experiences have full setup flow, Weekly can add later.
  - **Reversible:** Yes, can add team selector UI later
- Skip LLM summaries for now: Use placeholder/fallback per spec's MVP guidance
  - **Why:** User has Anthropic Max subscription but API key not configured yet
  - **Revisit:** When API key is configured
- Core loop first, NFL/LLM later: Prioritized matchup detail + standings + week nav
  - **Why:** User specified "core loop first, then NFL scores, then fantasy matchups"
  - **Result:** Core experience works, can layer in enhancements progressively

**Files created:**
- `backend/stats/weekly_analyzer.py`
- `frontend/weekly.html`
- `frontend/static/js/weeklyController.js`
- `frontend/static/js/weeklyRenderer.js`
- `frontend/static/js/lineupEditor.js` (stub)
- `frontend/static/css/weekly.css`

**Files modified:**
- `backend/app.py` (added `/api/league/<id>/week/<week>/deep-dive` endpoint, added `weekly.html` route)
- `frontend/index.html` (added Weekly Deep Dive option, updated grid to 2x2, added weekly icon/styles)
- `CLAUDE.md` (updated project structure, API endpoints, "When to Read What" table, Multi-Experience Architecture)

**Testing:**
- Verified API returns correct data for weeks 1, 2, 3, 5, 10 (league 17810260, year 2025)
- Verified team lookup works (Will Hofner = team_id 1)
- Verified standings calculation through each week
- Verified lineup errors detection
- Frontend loads correctly (HTML served, no 404s)

**Next steps (when user resumes):**
1. Implement tap-to-swap lineup editor (Section 2A)
2. Add NFL scores (Section 4 — `nfl_data.py`)
3. Add projected points parsing to `espn_api.py`
4. Add LLM summary generation (Sections 1 & 2B) when API key configured
5. Make "All Matchups" cards expandable to show full rosters

---

### 2026-02-07 — Weekly Deep Dive Feature Ideation

- Ideated "Weekly Deep Dive" — a week-by-week season explorer, second product surface alongside Wrapped
- Inspired by fantasywrapped.com (EPL equivalent) — editorial magazine feel, week navigation
- Core sections: NFL summary, fantasy matchup detail, lineup editor, league summary, standings, NFL scores, all fantasy matchups
- Decided on Claude API for LLM-generated summaries (NFL weekly + fantasy league weekly)
- Decided on ESPN public NFL scoreboard API for real game scores
- Decided on magazine/editorial layout (dark theme, readable, not flashy)
- Decided on tap-to-swap lineup editing (not drag-and-drop)
- Decided this is a standalone page (`weekly.html`) accessible from hub after setup
- Generated spec: `spec-docs/001-weekly-deep-dive.md`
- Added to ROADMAP under "Now (Active Focus)"

**Key architecture decisions:**
- New backend modules: `nfl_data.py`, `weekly_analyzer.py`, `summary_generator.py`
- New API endpoints for weekly deep dive data, NFL scores, and LLM summaries
- Progressive loading: fast data first, LLM summaries load async last
- LLM summaries have placeholder fallback if API isn't ready

---

### 2026-02-07 — Workflow & Skills Overhaul

- Defined 5 workflow types: bug fix, feature ideation, feature building, senior review, stand-up
- Overhauled `/bug-report` skill → full flow: interview → investigate → report → offer fix → add to ROADMAP if deferred
- Created `/ideate` skill → feature interview → numbered spec doc in `spec-docs/` → update ROADMAP
- Created `/senior-review` skill → autonomous code quality audit, optional scope, commits its own fixes
- Created `/stand-up` skill → quick standup meeting, generates numbered doc in `stand-ups/`
- Created `spec-docs/` and `stand-ups/` directories
- Updated CLAUDE.md: project structure, skills table, When to Read What, meeting notes behavioral directive
- Established continuous changelog workflow — update MEETING_NOTES.md as we go, not end of session
- Created `/overnight` skill → interview for priorities → autonomous execution → numbered summary doc
- Created `overnight-summaries/` directory
- Migrated `SPRINT_SUMMARY.md` → `overnight-summaries/001-2026-02-02-card-pack-experience.md` (reformatted to new summary template)
- Deleted old `SPRINT_SUMMARY.md`

**Decisions:**
- Bug reports that aren't immediately fixed get added to ROADMAP under "Known Bugs"
- Spec docs numbered `001-feature-name.md`, standups numbered `001-YYYY-MM-DD.md`, overnight summaries numbered `001-YYYY-MM-DD-focus.md`
- Senior review runs fully autonomous (no user input needed)
- Overnight skill: interactive interview phase, then fully autonomous. Never asks questions after kickoff.
- Meeting notes = scannable bulleted changelog, not exhaustive action log

**Files created:**
- `.claude/skills/ideate/SKILL.md`
- `.claude/skills/senior-review/SKILL.md`
- `.claude/skills/stand-up/SKILL.md`
- `.claude/skills/overnight/SKILL.md`
- `spec-docs/.gitkeep`
- `stand-ups/.gitkeep`
- `overnight-summaries/001-2026-02-02-card-pack-experience.md` (migrated from SPRINT_SUMMARY.md)

**Files modified:**
- `.claude/skills/bug-report/SKILL.md` (overhauled)
- `CLAUDE.md` (project structure, skills, workflow directives)
- `MEETING_NOTES.md` (this entry + format update)

**Files deleted:**
- `SPRINT_SUMMARY.md` (content migrated to overnight-summaries/)

- Ran first `/stand-up` → `stand-ups/001-2026-02-07.md`

---

### 2026-02-02 — Card Pack Experience Sprint

**What we discussed:**
- Project kickoff interview - clarified product vision and priorities
- Visual direction: dark/sleek theme, collectible card aesthetic
- Pack opening metaphor: Pokémon-style card reveals with rarity tiers
- Platform strategy: web-first but mobile-native design
- ESPN auth: prefer OAuth but accept public-only for now
- Multiple presentation modes: pack opening AND slideshow

**Decisions made:**
- Build pack opening as primary new experience (not replace slides)
- Dark theme with near-black backgrounds (#08080c base)
- 5 rarity tiers: Common → Uncommon → Rare → Epic → Legendary
- Standard trading card ratio (2.5:3.5)
- Separate data transform layer (CardBuilder) from rendering
- Holographic/prismatic effects for legendary cards
- Mode toggle to switch between Pack and Slideshow experiences

**Implemented:**
- [x] Dark theme design system (theme-dark.css)
- [x] Card component with rarity effects (cards.css)
- [x] Pack opening animations (pack-opening.css)
- [x] Card builder - transforms API data to card objects (cardBuilder.js)
- [x] Card renderer - generates HTML from cards (cardRenderer.js)
- [x] Pack opening controller (packOpening.js)
- [x] Superlative guessing game (superlativeGame.js)
- [x] New frontend with mode toggle (index-v2.html)
- [x] Card system design documentation (docs/CARD_SYSTEM_DESIGN.md)
- [x] Sprint summary (SPRINT_SUMMARY.md)

**Decided against:**
- Modifying original slideshow files (kept as separate mode)
- ESPN cookie/SWID auth (too janky, prefer public leagues for now)
- Sound effects (deferred - need user preference toggle)
- Pixelated/Game Boy style (went with sleek/premium instead)

**Questions for user:**
- Sound effects for pack opening?
- Card back design - generic or team-branded?
- Share/download individual cards?
- Superlative game mandatory or optional?

**Next steps:**
- Test with real league data in production
- Polish animations based on feel
- Add more superlatives
- Consider Madden UI exploration

**Files created this session:**
- `docs/CARD_SYSTEM_DESIGN.md`
- `frontend/static/css/theme-dark.css`
- `frontend/static/css/cards.css`
- `frontend/static/css/pack-opening.css`
- `frontend/static/js/cardBuilder.js`
- `frontend/static/js/cardRenderer.js`
- `frontend/static/js/packOpening.js`
- `frontend/static/js/superlativeGame.js`
- `frontend/index-v2.html`
- `SPRINT_SUMMARY.md`

---

### 2026-02-02 — Project Documentation Setup

**What we discussed:**
- Establishing a meeting notes workflow to track decisions across sessions
- Creating a system for keeping documentation in sync after shipping code

**Decisions made:**
- Created MEETING_NOTES.md as the central log for conversations
- After each chat: Update meeting notes with decisions, implementations, and rejections
- After shipping code: Review and update CLAUDE.md, ROADMAP.md, and MEETING_NOTES.md as needed

**Implemented:**
- [x] Created MEETING_NOTES.md
- [x] Updated CLAUDE.md with meeting notes workflow

**Decided against:**
- (None this session)

**Next steps:**
- Continue building features per ROADMAP.md priorities

