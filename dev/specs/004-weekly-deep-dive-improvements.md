# Spec 004: Weekly Deep Dive Improvements

**Created:** 2026-02-10
**Type:** Overnight batch spec
**Status:** Ready for implementation

---

## Overview

Seven improvements to the Weekly Deep Dive experience, ranging from bug fixes (AI summaries) to UI enhancements (NFL logos, clickable matchups) to data quality (precision, roster ordering).

---

## Objectives

### 1. Fix AI Summaries (Priority: CRITICAL)

**Problem:** Production at wrapped.football shows fallback text "(AI summaries not configured — set ANTHROPIC_API_KEY in .env to enable.)" for both NFL and fantasy summaries. The `ANTHROPIC_API_KEY` environment variable is not set in Railway.

**Requirements:**
- Ensure `ANTHROPIC_API_KEY` is configured in the Railway environment
- NFL summaries: Generate for all weeks and cache them. These are league-agnostic so they can be pre-generated and shared across all users.
- Fantasy summaries: Generated on-demand after league is selected. Cache per league/year/week.
- Both summary types must actually call the Claude API and return real generated text
- Fallback gracefully if API fails (rate limit, billing, etc.) — but the primary path should work

**Investigation findings:**
- `summary_generator.py` initializes `client = None` when no key found
- NFL summaries cache to `backend/cache/summaries/nfl_{year}_week_{week}.json`
- Fantasy summaries cache to `backend/cache/summaries/{league_id}/{year}/fantasy_week_{week}.json`
- Model: `claude-sonnet-4-5-20250929`

**Tasks:**
- [ ] Verify ANTHROPIC_API_KEY is set in Railway dashboard (manual step — document for user)
- [ ] Test summary generation locally with API key in `.env`
- [ ] Add a pre-generation script/endpoint for NFL summaries (all weeks for a given year)
- [ ] Ensure fantasy summaries generate correctly on first deep-dive load per league/week
- [ ] Verify caching works so subsequent loads don't re-call the API

**Optimization note:** NFL summaries can be batch-generated ahead of time since they don't depend on any league. Fantasy summaries must be per-league but are cached after first generation. Loading time is not a concern per user request.

---

### 2. Roster Display Order (Priority: HIGH)

**Problem:** Starting rosters display in whatever order ESPN returns them, which is inconsistent.

**Required order (matches ESPN UI):**
```
QB → RB → RB → WR → WR → TE → FLEX → D/ST → K
```

**Bench order:** Highest scoring to lowest scoring.

**Scope:** All teams, all weeks, everywhere starting rosters appear in weekly deep dives.

**Investigation findings:**
- `weeklyRenderer.js` `renderTeamColumn()` iterates through `team.starters` with `.forEach()` — no sorting
- Backend `process_team_roster()` in `season_analyzer.py` appends starters in ESPN API order
- Position data available via `player.position` (slot position for starters)

**Tasks:**
- [ ] Add sort function for starters based on position: QB(0) → RB(1,2) → WR(3,4) → TE(5) → FLEX(6) → D/ST(7) → K(8)
- [ ] Add sort function for bench: descending by points
- [ ] Apply sorting either in backend (weekly_analyzer.py) or frontend (weeklyRenderer.js)
- [ ] Verify order is consistent across all matchup views

---

### 3. Standings Rank Change Indicator (Priority: MEDIUM)

**Problem:** League standings show rank but no movement indicators.

**Requirements:**
- Show rank change since previous week (green up arrow + "+N" or red down arrow + "-N")
- Week 1 shows no indicator (no previous week)
- No change = no indicator (or subtle "—")

**Implementation approach:**
- Backend: Calculate standings for current week AND previous week
- Include `rank_change` field in standings data (+N, -N, or 0)
- Frontend: Render colored arrows next to rank

**Tasks:**
- [ ] Modify `calculate_standings_through_week()` to also compute previous week standings
- [ ] Add `rank_change` field to each team's standings entry
- [ ] Render rank change indicator in `renderStandings()` with appropriate color/arrow

---

### 4. Standings: Errors, Lost Points, Perfect Weeks Columns (Priority: MEDIUM)

**Problem:** Standings only show Rank, Team, Record, Points For.

**New columns:**
- **Errors** — Total lineup errors through current week
- **Lost Points** — Total fantasy points lost from lineup errors through current week
- **Perfect Weeks** — Gold stars for each perfect lineup week (0 errors)

**Additional feature:** All columns sortable by clicking header.

**Implementation approach:**
- Backend: Aggregate error/lost-points/perfect-week data across all weeks for each team
- Frontend: Add columns, implement click-to-sort on all column headers

**Tasks:**
- [ ] Extend standings calculation to include cumulative errors, lost_points, perfect_weeks per team
- [ ] This requires running optimal lineup analysis for ALL teams for ALL weeks through current (computationally expensive — may need caching)
- [ ] Add Errors, Lost Points, Perfect Weeks columns to standings table
- [ ] Implement column header click-to-sort (ascending/descending toggle)
- [ ] Style perfect weeks as gold stars
- [ ] Style errors/lost points appropriately (red-ish for high values?)

---

### 5. NFL Team Logos (Priority: MEDIUM)

**Problem:** NFL scores section shows only text abbreviations (e.g., "KC", "BUF") with no logos.

**Requirements:**
- Display NFL team logo next to each team name/abbreviation in the NFL Scores section.

**Implementation approach:**
- ESPN provides team logos via their CDN: `https://a.espncdn.com/i/teamlogos/nfl/500/{abbreviation}.png`
- Add `<img>` tag with team logo alongside abbreviation
- Small size (24-32px) to fit within score cards

**Tasks:**
- [ ] Add team logo URLs to NFL score data (or construct from abbreviation in frontend)
- [ ] Render logo images in `renderNFLScores()`
- [ ] Handle load failures gracefully (hide broken images)

---

### 6. NFL Scores Layout Redesign (Priority: MEDIUM)

**Problem:** NFL scores displayed as simple grid cards, small and list-like.

**Requirements:**
- Bigger logos, clear scores
- Losing team's logo slightly greyed out
- Full-width grid layout (fill the screen)
- **Bonus:** Horizontal auto-scroll ticker that pauses on hover, with manual scroll

**Implementation approach:**
- Redesign `.nfl-game-card` with larger layout, prominent logos
- Add opacity/grayscale filter to losing team
- **Ticker bonus:** CSS animation for auto-scroll, `overflow-x: auto` for manual, pause on hover via JS

**Tasks:**
- [ ] Redesign NFL game card layout (bigger logos, bigger scores, horizontal orientation)
- [ ] Add greyed-out styling for losing team (CSS filter: grayscale + reduced opacity)
- [ ] Make grid fill full width
- [ ] BONUS: Implement horizontal scroll ticker with auto-scroll animation
- [ ] BONUS: Pause auto-scroll on hover, allow manual horizontal scroll

---

### 7. Clickable Fantasy Matchups (Priority: HIGH)

**Problem:** Matchup cards in "All Matchups" section have hover/cursor styling but no click handler. Cannot view other teams' full rosters.

**Requirements:**
- Click any matchup card to expand/navigate to full matchup view (both teams' starting + bench rosters)
- **Bonus:** Below each team name, show headshots of top 3 scorers (horizontal)
- **Bonus:** Show "Lost Points" next to each team's total score

**Investigation findings:**
- Full roster data for ALL matchups is already returned by the backend (`weekData.matchups` array)
- Currently only the user's matchup gets full rendering via `renderTeamColumn()`
- The existing `renderTeamColumn()` can be reused for expanded matchup views

**Tasks:**
- [ ] Add click handler to matchup cards
- [ ] Create expanded matchup view (reuse `renderTeamColumn()` for both teams)
- [ ] Handle navigation: either inline expand, modal, or replace current matchup view
- [ ] BONUS: Add top 3 scorer headshots below team names in All Matchups
- [ ] BONUS: Add Lost Points display next to team scores in All Matchups

---

### 8. Number Precision (Priority: HIGH)

**Problem:** Numbers display inconsistently — some show 2 decimals, some show 1, some show none depending on actual value.

**Requirement:** ALL fantasy point numbers display with exactly 1 decimal place.
- `127.88` → `127.9`
- `140` → `140.0`
- `0` → `0.0`

**Scope:** All individual player scores, team total scores, optimal scores, lost points — everywhere in weekly deep dive.

**Tasks:**
- [ ] Create/use a formatting helper: `formatPoints(n)` → `n.toFixed(1)`
- [ ] Apply to all player point displays in `renderTeamColumn()`
- [ ] Apply to all team scores in matchup headers
- [ ] Apply to all scores in `renderAllMatchups()`
- [ ] Apply to standings Points For column
- [ ] Apply to Lost Points / Errors columns
- [ ] Verify NFL scores are NOT affected (those are integers and should stay as-is)

---

## Priority Order for Implementation

1. **Fix AI Summaries** — Core broken feature, highest impact
2. **Number Precision** — Quick win, affects everything, do early so all subsequent work inherits it
3. **Roster Display Order** — Data quality fix, quick implementation
4. **Clickable Matchups** — High-value UX improvement, reuses existing code
5. **Standings Enhancements** (rank change + new columns + sorting) — Medium complexity, high value
6. **NFL Team Logos** — Quick visual improvement
7. **NFL Scores Layout Redesign** — Largest visual overhaul, do last

---

## Technical Notes

- Backend changes mainly in `weekly_analyzer.py` (standings enhancements, summary fixes)
- Frontend changes mainly in `weeklyRenderer.js` (all UI changes) and `weekly.css` (styling)
- NFL logos available at ESPN CDN — no new API calls needed
- Sorting the standings table is pure frontend JS
- Clickable matchups can reuse existing `renderTeamColumn()` — the data is already there
- Number precision is a frontend-only change (add `.toFixed(1)` everywhere)
