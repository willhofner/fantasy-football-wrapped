# 005 — Overnight: Weekly Deep Dive V2 + Draft Board

**Date:** 2026-02-10
**Type:** Overnight autonomous session
**Priority:** High — user-facing improvements + new experience

---

## Items (9 total, in priority order)

### 1. Roster Spacing Bug Fix
**Problem:** Weird vertical gap appears above each player with a red `!` triangle (error indicator). The gap sits between that player and the player above them.
**Root Cause:** TBD — likely margin/padding on `.player-row.error` or the error indicator element.
**Fix:** Remove unwanted spacing while preserving the error highlight.

### 2. Visually Distinguish Starters vs Bench
**Goal:** Add subtle visual distinction between starter and bench sections in the roster view.
**Approach:** Subtle background shading difference, divider line, and/or section labeling. Design decision made autonomously.

### 3. Top Scorers Scrolling Ticker
**Goal:** Side-scrolling panel (like the NFL scores ticker) showing top fantasy scorers by position that week.
**Spec:**
- Top 3 scorers at each position: QB, RB, WR, TE, K, D/ST (in that order)
- Grouped by position, decreasing score within each group
- Each entry: large headshot (left), fantasy score (right), player name + fantasy team name (small, below score)
- Uses same NFL headshot logic from slides experience (`getPlayerHeadshot()`)
- Same scrolling/ticker animation as NFL scores section
**Data needed:** Backend must return top scorers by position per week. New data in deep-dive endpoint or new endpoint.

### 4. Headshots in League Matchups
**Goal:** In league matchup cards, the 3 highest-scoring NFL players under each manager's name currently show circles with initials. Replace with actual NFL player headshots.
**Approach:** Use same `getPlayerHeadshot()` from slides. The `_renderTopScorers()` method in weeklyRenderer.js needs to fetch and display headshot images instead of initial circles.

### 5. Team Selection Required Before Weekly Deep Dive
**Goal:** User must select their team before proceeding to the deep dive. Currently auto-selects first team.
**Spec:**
- After entering league ID + year, show team selection screen
- User picks their team from the list
- Apply across all experiences, not just weekly deep dive
- Store selection in URL params for persistence

### 6. Better Loading/Generating Screen
**Goal:** Replace "Loading your season..." with engaging football-themed loading screen.
**Spec:**
- Cycling taglines: "Crunching the numbers...", "Reviewing the tape...", "Checking the script...", "Calling the script writers...", etc.
- Football-themed CSS animation (cartoon football spinning/flying, or similar)
- Smooth transitions between taglines

### 7. Improved Week Selector
**Goal:** Week selector boxes show W/L result and final scores.
**Spec:**
- Each week box shows: "Week N" (top), user's score (small left), big "W" or "L" (center), opponent's score (small right)
- Selected week box is visually larger/prominent
- Clear selection state indicator
**Data needed:** Week selector needs access to matchup results (win/loss + scores). May need to pre-fetch or include in initial data load.

### 8. ESPN Fantasy API Research
**Goal:** Research what other data is available from ESPN's API for future stat ideas.
**Output:** Document at `dev/specs/espn-api-research.md` with available endpoints, views, and 15-20 creative stat ideas.
**Status:** Research-only, delegated to background agent.

### 9. Draft Board — New Experience
**Goal:** New experience accessible from the homescreen showing every draft pick with stats.
**Spec:**
- Lists every draft pick in order (Round 1, Pick 1 through end)
- Per pick: Name, Draft Position, Total Fantasy Points, Avg Points/Week, Drafting Team, Last-Week Rostering Team, Start %, Dropped?
- Grading: Only label absolute gems (late round + high production) and absolute busts (early round + low production/dropped). Don't grade every pick.
- Uses same league/year/team config, including team selection
- Focus on data availability over polish
**Data needed:** ESPN draft data (mDraftDetail view), transaction history, roster snapshots across weeks.

---

## Technical Notes

- **Test config:** League 17810260, Year 2025, Team Will
- **Server:** localhost:5001
- **Headshot source:** ESPN search API via `getPlayerHeadshot()` in slides experience
- **Both requirements.txt files must stay in sync** if new deps are added
- **Always use python3/pip3**

---

## Dependencies & Ordering

```
1 (roster spacing) → independent, do first
2 (starter/bench) → independent, do after 1
3 (top scorers ticker) → needs backend data + frontend component
4 (headshots in matchups) → independent frontend change
5 (team selection) → independent, affects all flows
6 (loading screen) → independent CSS/JS
7 (week selector) → needs matchup result data in week nav
8 (ESPN research) → background, independent
9 (draft board) → needs backend endpoint + frontend page
```

Items 1, 2, 4, 5, 6 are frontend-only or mostly frontend.
Items 3, 7, 9 need backend changes.
Item 8 is research-only.
