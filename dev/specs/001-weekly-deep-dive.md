# Weekly Deep Dive

**Spec:** 001
**Date:** 2026-02-07
**Status:** Draft

## Overview

A week-by-week season explorer that lets users navigate chronologically through their fantasy season with rich detail: NFL context, full matchup breakdowns, lineup editing, league summaries, standings, and all matchups. Think of it as an editorial magazine for your fantasy season — one issue per week — written by an AI "ball knower" who watched every game and knows every roster decision.

This is a second product surface alongside Wrapped. Wrapped is a linear entertainment experience (watch your recap). Weekly Deep Dive is a browsable reference experience (explore your season).

## User Story

As a fantasy manager, I want to click through my season week by week and see what happened in the NFL, how my matchup played out, what mistakes I made, and what went down across the league — so I can relive the season in detail, understand my decisions, and have ammunition for the group chat.

## Detailed Behavior

### Entry Point

From the hub page, after completing setup (league ID, year, team selection), the user sees "Weekly Deep Dive" as an experience option alongside Slideshow, Card Pack, Arcade, and VR HUD. Clicking it navigates to `weekly.html` with league config passed via URL params (same pattern as other experiences).

### Week Navigation

A horizontal week selector at the top of the page (see fantasywrapped.com reference). Weeks 1-14 (regular season). Clicking a week loads that week's content. Current/selected week is visually highlighted. The page defaults to Week 1 on first load.

### Page Layout (Per Week)

Magazine-style editorial layout. Dark theme consistent with existing design system. Content sections stack vertically with clear visual separation:

---

#### Section 1: NFL Weekly Summary

**What it shows:** A 2-3 paragraph written summary of what happened in the NFL that week. Players who went off. Injuries. Bye teams. Upsets. Big storylines. Written in a fun, opinionated "ball knower" voice — like your friend who watches every game and has strong takes.

**Data source:** ESPN public NFL scoreboard API for actual game scores and results. Supplemented with fantasy performance data (big scoring weeks, injuries inferred from DNPs/zeros).

**Generation:** Claude API generates the summary from structured NFL + fantasy data. The prompt should produce prose that reads like a real football analyst — conversational, opinionated, entertaining. Not robotic.

**Fallback for MVP:** If LLM integration isn't ready, show a styled placeholder box: "NFL Summary coming soon — Week {N}, {year}" with the structured data displayed as bullet points instead.

---

#### Section 2: Fantasy Matchup Detail

**What it shows:** Your full matchup for the week — side by side.

**Layout:** Two-column roster comparison (you vs opponent).

Each side shows:
- Team name and owner
- Final score (prominently displayed)
- Win/loss indicator — the entire section should have a visual "vibe" (green/celebratory for wins, red/somber for losses)
- **Starters:** Each player with name, position, actual points, projected points (if available)
- **Bench:** Each player with name, position, actual points, projected points (if available)
- **Lineup errors highlighted:** If a bench player outscored a starter at the same position, flag it visually (red highlight, icon, or badge). Show how many points were left on the table.
- **Optimal score:** "You could have scored X" line beneath each roster

**Projected points:** Fetch from ESPN API (`appliedProjectedTotal` in player stats). If unavailable for historical weeks, omit gracefully — don't show a column of zeros.

---

#### Section 2A: Lineup Editor (Interactive)

**What it does:** Lets the user tap a bench player, then tap a starter to swap them. The matchup score updates in real-time to show "what if."

**Behavior:**
1. User taps a bench player → player highlights as "selected"
2. User taps a valid starter (same position eligibility) → players swap
3. Score recalculates instantly. New score shown alongside original. Delta displayed ("You would have scored 12.4 more points" or "This swap would have won you the game")
4. A "Reset" button restores original lineup
5. Works for both your roster AND opponent's roster (so you can test "what if they played their optimal?")

**Position validation:** Same constraints as optimal lineup calculator (QB can only swap with QB, FLEX eligible for RB/WR/TE, etc.)

**Scope:** Tap-to-swap only. No drag-and-drop. No adding/dropping players from outside the roster.

---

#### Section 2B: Fantasy League Weekly Summary

**What it shows:** A 2-3 paragraph written summary of what happened across the entire fantasy league that week. Written with full context:
- Everyone's record going into the week
- Every matchup result
- Blowouts and nail-biters
- Players who carried teams
- Lineup errors (managers who left studs on the bench)
- BYE week or injured players left in starting lineups ("unfocused manager" callouts)
- Recurring narratives ("Mahomes continued his reign on Noah's team with another 30-bomb")
- Standings implications ("With this loss, Team X falls to 3-5 and is now on the playoff bubble")

**Generation:** Claude API, same as NFL summary. Fed structured data about all matchups, all rosters, standings, and any notable patterns.

**Voice:** Same ball knower tone. This is the fantasy league's beat reporter. Knows everything, isn't afraid to call people out.

**Fallback for MVP:** Same as Section 1 — styled placeholder with bullet-point data.

---

#### Section 3: League Standings

**What it shows:** A leaderboard table showing all teams ranked by record after this week.

**Columns:**
- Rank
- Team name + owner
- Record (W-L or W-L-T)
- Change from previous week (up/down arrow + number of positions moved)
- Points for (cumulative through this week)

**Style:** Clean table, dark theme. See fantasywrapped.com reference — simple, readable, no clutter. Highlight the user's team row.

---

#### Section 4: NFL Scores

**What it shows:** A list of all real NFL games played that week with final scores.

**Layout:** Simple card grid or list. Each game shows:
- Away team @ Home team
- Final score
- Winner highlighted

**Stretch: Clickable box scores.** Tapping a game expands or navigates to show the box score (key player stats). This is a nice-to-have — for MVP, just showing final scores is sufficient.

**Data source:** ESPN public NFL scoreboard API.

---

#### Section 5: Fantasy Matchups

**What it shows:** A list of all fantasy matchups in the league for that week with scores.

**Layout:** Card grid or list, similar to what you'd see on the ESPN fantasy league page. Each matchup shows:
- Team A vs Team B (names + owners)
- Final scores
- Winner highlighted

**Clickable detail:** Tapping a matchup expands to show full rosters (starters + bench) for both teams in that matchup. Same roster display format as Section 2 but read-only (no lineup editor for other people's matchups).

---

## Design & UX

### Visual Direction

Magazine/editorial feel. Dark theme (#08080c base, consistent with existing dark theme). Clean typography. Readable. This is a reference tool, not a flashy animation experience.

**Key design principles:**
- **Scannable** — Headers, clear sections, visual hierarchy
- **Week-centric** — The week selector is always visible, navigation is instant
- **Win/loss vibe** — Section 2 (your matchup) should feel green/celebratory on wins, red/muted on losses. Subtle but clear.
- **Mobile-responsive** — Stacks to single column on mobile. Week selector becomes horizontally scrollable.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  [W1] [W2] [W3] [W4] [W5] ... [W14]   Week Nav    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  NFL WEEKLY SUMMARY                                 │
│  [2-3 paragraphs of generated prose]                │
│                                                     │
├───────────────────────┬─────────────────────────────┤
│                       │                             │
│  YOUR TEAM            │  OPPONENT                   │
│  Score: 124.5         │  Score: 118.2               │
│                       │                             │
│  Starters:            │  Starters:                  │
│  QB: Mahomes  28.4    │  QB: Allen    22.1          │
│  RB: Henry    18.2    │  RB: CMC      24.8          │
│  ...                  │  ...                        │
│                       │                             │
│  Bench:               │  Bench:                     │
│  RB: Robinson  22.1 ⚠│  WR: Chase    8.4           │
│  ...                  │  ...                        │
│                       │                             │
│  [Edit Lineup]        │  [Edit Lineup]              │
│                       │                             │
├───────────────────────┴─────────────────────────────┤
│                                                     │
│  FANTASY LEAGUE WEEKLY SUMMARY                      │
│  [2-3 paragraphs of generated prose]                │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  LEAGUE STANDINGS          NFL SCORES               │
│  1. Team A  8-2            NYG 17 @ PHI 28          │
│  2. Team B  7-3            KC 45 @ LV 20            │
│  ...                       ...                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  FANTASY MATCHUPS THIS WEEK                         │
│  Team A 124.5 vs Team B 118.2  [▼ Expand]          │
│  Team C 98.1  vs Team D 142.7  [▼ Expand]          │
│  ...                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Shareability

- The matchup detail (Section 2) with lineup errors highlighted is prime screenshot material for the group chat ("Look at this clown leaving Robinson on the bench")
- League standings with movement arrows show the narrative of the season ("We were 8-2 after Week 10!")
- The AI summaries, if good, are the most shareable part — a witty recap you'd send to the league group chat
- The lineup editor creates "what if" moments ("If you had just started Chase, you would have won by 2")

## Technical Approach

### Data Requirements

**Already available (existing ESPN Fantasy API calls):**
- Per-week rosters (starters + bench) for all teams
- Matchup pairings and scores
- Player names, positions, actual points
- Win/loss results
- Optimal lineup calculations (for user's team)

**Need to add to ESPN Fantasy API parsing:**
- Projected points (`appliedProjectedTotal` from player stats — likely already in API response, just not parsed)
- Opponent's optimal lineup calculation (use existing `lineup_optimizer.py` logic, run it for opponent too)
- All matchups per week (not just user's matchup — need to process all teams)
- Cumulative standings per week (calculate from matchup results)

**New external data source — NFL scores:**
- ESPN public scoreboard: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD&week=N&seasontype=2`
- Returns game scores, teams, status. Free, public, no auth.
- For box scores (stretch): `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=GAME_ID`

**New dependency — LLM summaries:**
- Claude API (Anthropic SDK) for generating NFL and fantasy league summaries
- Input: structured JSON of week's data (scores, rosters, standings, notable performances)
- Output: 2-3 paragraphs of prose
- Can be generated on-demand or pre-generated and cached

### Architecture

**Backend additions:**

New module: `backend/nfl_data.py`
- Fetches real NFL scores from ESPN scoreboard API
- Parses game results, teams, scores
- Caches results (NFL scores don't change after games are final)

New module: `backend/stats/weekly_analyzer.py`
- Orchestrates per-week deep dive data:
  - User's matchup detail (both rosters, both optimal lineups, errors)
  - All league matchups for the week
  - League standings through that week
  - Notable performances, lineup errors across league
- Uses existing `lineup_optimizer.py` for optimal calculations

New module: `backend/summary_generator.py`
- Interfaces with Claude API
- Builds prompts from structured weekly data
- Generates NFL summary and fantasy league summary
- Handles API errors gracefully (returns null if generation fails)

New API endpoints:
- `GET /api/league/<id>/week/<week>/deep-dive?team_id=X` — All data for a single week
- `GET /api/nfl/week/<week>/scores?year=Y` — NFL scores for a week
- `GET /api/league/<id>/week/<week>/summary?team_id=X` — LLM-generated summaries (separate endpoint so they can load async)

**Frontend additions:**

New page: `frontend/weekly.html`
- Week navigation bar
- Section containers for each content area
- Dark theme, magazine layout

New JS modules:
- `frontend/static/js/weeklyController.js` — Main controller, fetches data, manages week navigation
- `frontend/static/js/weeklyRenderer.js` — Renders all sections from data
- `frontend/static/js/lineupEditor.js` — Tap-to-swap lineup editing logic + score recalculation

New CSS:
- `frontend/static/css/weekly.css` — Magazine layout, matchup display, standings table, section styling

### Key Implementation Details

**Lineup Editor Score Recalculation:**
When a user swaps players, recalculate the score client-side. The weekly data already includes each player's points — just sum the starters. No API call needed for swaps.

**Position Swap Validation:**
Reuse the position eligibility rules from `lineup_optimizer.py` but implement in JS:
- QB ↔ QB only
- RB ↔ RB, or RB ↔ FLEX
- WR ↔ WR, or WR ↔ FLEX
- TE ↔ TE, or TE ↔ FLEX
- FLEX ↔ RB/WR/TE
- D/ST ↔ D/ST only
- K ↔ K only
- Any starter ↔ eligible bench player

**Standings Calculation:**
Calculate cumulative standings week-by-week from matchup results. For Week N, aggregate all results from Weeks 1 through N. Store as array so any week's standings can be displayed instantly.

**LLM Summary Prompt Strategy:**
Feed structured data, not raw text. Example prompt shape:
```
You are a fun, opinionated NFL analyst writing a weekly recap.
Here's what happened in Week {N} of the {year} NFL season:
{structured JSON: games, scores, notable performances, injuries, bye teams}
Write 2-3 short paragraphs summarizing the week. Be conversational and entertaining.
Focus on: big upsets, standout performances, injury impacts, bye week effects.
```

**Caching:**
- NFL scores: cache aggressively (scores are immutable after games end)
- LLM summaries: cache after first generation (same data = same summary)
- Fantasy data: use existing caching from season_analyzer

**Loading Strategy:**
Load sections progressively:
1. Week nav + matchup data loads first (fast, already have this data)
2. NFL scores load next (fast API call)
3. Standings render (calculated from existing data)
4. LLM summaries load last (slowest, async)

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `frontend/weekly.html` | Create | Weekly deep dive page |
| `frontend/static/js/weeklyController.js` | Create | Main controller — data fetching, week navigation, section orchestration |
| `frontend/static/js/weeklyRenderer.js` | Create | DOM rendering for all sections (NFL summary, matchup, standings, scores, matchups list) |
| `frontend/static/js/lineupEditor.js` | Create | Tap-to-swap lineup editing with client-side score recalculation |
| `frontend/static/css/weekly.css` | Create | Magazine layout, matchup display, standings table, all section styles |
| `backend/nfl_data.py` | Create | ESPN NFL scoreboard API integration — fetch real game scores |
| `backend/stats/weekly_analyzer.py` | Create | Per-week deep dive data orchestration — both rosters, all matchups, standings |
| `backend/summary_generator.py` | Create | Claude API integration for generating NFL + fantasy league summaries |
| `backend/app.py` | Modify | Add new API endpoints for weekly deep dive, NFL scores, summaries |
| `backend/stats/lineup_optimizer.py` | Modify | Expose optimize function for any team's roster (not just selected team) |
| `backend/espn_api.py` | Modify | Parse projected points from API response if available |
| `frontend/index.html` | Modify | Add Weekly Deep Dive as an experience option on hub page |
| `frontend/static/js/setup.js` | Modify | Handle navigation to weekly.html with URL params |
| `backend/requirements.txt` | Modify | Add `anthropic` SDK dependency |

## Edge Cases & Constraints

- **Private leagues:** Same limitation as rest of app — public ESPN leagues only
- **Missing projected points:** ESPN may not return projections for historical weeks. If `appliedProjectedTotal` is null/zero, omit the projections column entirely. Don't show misleading zeros.
- **NFL scoreboard API reliability:** This is an unofficial public API. If it fails, show "NFL scores unavailable" and skip Section 1 and Section 4. The fantasy data sections should still work independently.
- **LLM API failures:** If Claude API is down or errors, show the placeholder/fallback (bullet-point data). Never block the page on LLM generation.
- **Small leagues:** Standings and matchup list work fine with any league size. Summaries should adapt tone (4-team league vs 14-team league).
- **Bye weeks with few games:** Some NFL weeks have fewer games (bye weeks). Summaries should note this naturally.
- **Playoff weeks:** Only show Weeks 1-14 (regular season) initially. Playoff matchups have different structures (byes, multi-week matchups) — out of scope.
- **LLM cost:** Each summary generation costs ~$0.01-0.05. Two summaries per week × 14 weeks = 28 generations per user session. Consider caching aggressively and generating lazily (only when user navigates to a week).
- **Rate limiting:** ESPN's public APIs have informal rate limits. Batch requests where possible. NFL scores for all weeks could be fetched once and cached.
- **Opponent roster for other matchups (Section 5):** Need to ensure we fetch/process ALL team rosters per week, not just the user's team and opponent. Current `season_analyzer.py` may only process the selected team.

## Implementation Decisions (Resolved 2026-02-09)

### LLM Integration
- ✅ **API Key:** Stored in `backend/.env` as `ANTHROPIC_API_KEY`
- ✅ **Fallback behavior:** Gracefully degrade to placeholder text when API key missing or API fails
- ✅ **Caching:** File-based caching for NFL summaries (same summary for all users per week)
- ✅ **Generation strategy:** Lazy/on-demand when user clicks a week, cache result to disk

### ESPN API Data Availability Research

**Available Views (beyond current `mMatchup`, `mRoster`, `mTeam`, `mSettings`):**
- `mPendingTransactions` - **Waiver wire activity IS available**
- `mBoxScore` - More detailed matchup stats
- `mDraftDetail` - Draft information
- `mLiveScoring` - Real-time scoring data
- `mPositionalRatings` - Position rankings

**Player Data Available:**
- `injuryStatus` field in player objects (values: "NORMAL", "OUT", "QUESTIONABLE", "DOUBTFUL", etc.)
- `appliedStatTotal` for actual points (already using)
- `appliedProjectedTotal` for projected points (mentioned in spec, need to verify availability)
- Player stats indexed by `scoringPeriodId`

**What We CAN Detect:**
- ✅ Injuries: via `injuryStatus` field
- ✅ Waiver pickups: via `mPendingTransactions` view
- ✅ Players started while injured/BYE: cross-reference `injuryStatus` with starter status
- ✅ Blowouts: calculate from score differential
- ✅ Win streaks: calculate from historical results
- ✅ Close games: detect from score differential

**What We Need to INFER (no direct API data):**
- ❌ NFL upsets: no pre-game odds available, but can note unexpected results
- ❌ Crazy plays: no play-by-play data
- ❌ Game-winning plays: no play-by-play, but can detect close final scores

### NFL Summary Content Strategy
With ESPN NFL Scoreboard API only, focus on:
- Big performances (high-scoring players visible in fantasy data)
- Blowouts (score differential > 20 points)
- Close games (score differential < 7 points)
- Injuries (inferred from player DNPs/zeros in fantasy data)
- Bye teams (from NFL schedule)
- Notable results (division matchups, undefeated streaks if detectable)

### Fantasy Summary Content Strategy
With full ESPN Fantasy API access, include:
- Fantasy upsets (worse record beats better record)
- Players who went off (top scorers of the week)
- Win streaks (calculate from results)
- Blowouts and nail-biters (score differential thresholds)
- Managers caught sleeping (injured/BYE players in starting lineup via `injuryStatus`)
- Waiver pickups that paid off (via `mPendingTransactions` + high scores)
- Lineup errors (bench players outscoring starters)
- Standings implications (playoff bubble, clinching scenarios)

## Open Questions (Remaining)

1. **NFL scoreboard API — historical availability:** Need to verify ESPN scoreboard API returns complete 2024/2025 season data
2. **Projected points historical availability:** Confirm `appliedProjectedTotal` exists for completed weeks (may only be available for current/upcoming weeks)
3. **Transaction data for public leagues:** Verify `mPendingTransactions` works for public leagues without auth

## Out of Scope

- **Playoff weeks** — Different matchup structure, would complicate the MVP
- **Trade/waiver history** — Would be cool context for summaries but requires new ESPN API views
- **Player images in roster display** — Already have this pattern from card pack, but skip for MVP to keep it clean
- **Drag-and-drop lineup editing** — Tap-to-swap only
- **Editing lineups for other teams' matchups (Section 5)** — Read-only expansion only
- **Cross-week comparisons** — "Your Week 5 vs your Week 10" type analysis
- **Custom week ranges** — Always shows full regular season (Weeks 1-14)
- **Sound effects or animations** — Magazine feel, not flashy

## Implementation Order

For the implementer — build in this order:

1. **Backend: weekly_analyzer.py + new API endpoint** — Get the data pipeline working. All matchups, both rosters, opponent optimal, standings per week.
2. **Frontend: weekly.html + weeklyController.js + weeklyRenderer.js** — Page shell, week nav, Section 2 (matchup) and Section 3 (standings). This is the core loop.
3. **Backend: espn_api.py projected points** — Add projection parsing if available.
4. **Frontend: lineupEditor.js** — Tap-to-swap with client-side recalculation (Section 2A).
5. **Backend: nfl_data.py + NFL scores endpoint** — Fetch real NFL scores (Section 4).
6. **Frontend: NFL scores section + all fantasy matchups section** — Render Sections 4 and 5.
7. **Backend: summary_generator.py** — Claude API integration for written summaries.
8. **Frontend: Summary sections** — Wire up Sections 1 and 2B with generated or placeholder text.
9. **Hub page integration** — Add Weekly Deep Dive to experience picker.
