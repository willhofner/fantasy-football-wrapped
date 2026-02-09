# Meeting Notes

Living changelog. Reverse chronological. Bulleted and scannable.

---

## Session Log

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

