# Spec 007: 3-Pillar UX Revamp + Draft Alternatives + Gasp Moments

**Created:** 2026-02-16
**Updated:** 2026-02-17 (Full rewrite based on codebase review + product decisions)
**Status:** Ready for Implementation
**Priority:** HIGH — Phase 1 (UX) + Phase 2 (Stats) in single overnight session

---

## Executive Summary

Restructure the entire app around **3 core pillars** (Start/Sit, Draft, Waiver) with a premium animated entry flow, then add killer gasp-moment stats on top. Everything else moves to a secondary "Choose a Different Vibe" menu.

**What exists today:** 10 flat, equally-weighted experiences. No hierarchy. No shared state. Hub feels like a developer tool, not a consumer product.

**What we're building:** A sleek, animated 3-tab dashboard that feels like a premium product. Enter league → pick team → explore your season across 3 pillars without ever going back.

---

## Part 1: Premium Entry Flow + 3-Pillar Dashboard

### 1A: Landing Page (League ID Input)

**Current state:** Plain form with League ID, Year, Start Week, End Week inputs. Functional but ugly.

**New design:**

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│           ✦ FANTASY WRAPPED ✦                        │
│           Your Season in Stats                        │
│                                                       │
│     ┌─────────────────────────────────────┐          │
│     │  Enter your ESPN League ID          │          │
│     │  [________________________] [GO →]  │          │
│     └─────────────────────────────────────┘          │
│                                                       │
│              ⚙️ Advanced Settings ▾                   │
│              (Year: 2025, Week range)                 │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Requirements:**
- Slick entrance animation on page load (fade-in with subtle parallax or scale-up)
- League ID is the ONLY visible input. Clean, minimal, inviting.
- Year defaults to **2025**. Hidden behind "Advanced Settings" collapsible.
- Start/End Week also hidden behind Advanced Settings (auto-detected — see Part 3).
- The GO button triggers a transition animation to team selection.
- **Future:** Login button for returning users (saves league IDs). Not in this phase.

**Animation spec:**
- Page load: Background gradient slowly shifts. Logo/title fades in with slight upward motion (0.6s ease-out). Input field slides up from below (0.3s delay).
- On submit: Input card shrinks and flies upward while team selection cards cascade in from below.

---

### 1B: Team Selection Screen

**Current state:** Each experience handles team selection independently. Inconsistent. No team names (just owner names).

**New design:**

```
┌─────────────────────────────────────────────────────┐
│  FANTASY WRAPPED — [League Name]                     │
│  Choose Your Team                                    │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Mahomes  │ │ Da Bears │ │ Team     │ │ Kelce  │ │
│  │ Alone    │ │          │ │ Rocket   │ │ Gang   │ │
│  │          │ │          │ │          │ │        │ │
│  │ Will H.  │ │ Mike S.  │ │ Jake T.  │ │ Sam R. │ │
│  │          │ │          │ │          │ │        │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ ...      │ │ ...      │ │ ...      │ │ ...    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                       │
│  ⟵ Change League                                     │
└─────────────────────────────────────────────────────┘
```

**Requirements:**
- Cards show **team name** (large, primary) with **manager name** (smaller, below)
- Requires backend change: extract both `location + nickname` AND owner name from ESPN API
- Cards have 3D hover effect: slight translateZ + shadow increase on hover, returns on mouse-off
- CSS `perspective` on container, `transform: translateZ(8px)` on hover with `transition: transform 0.2s ease`
- Clicking a team triggers animation transition to dashboard
- "Change League" link in corner returns to league ID input

**Animation spec:**
- Team cards cascade in with staggered timing (50ms per card)
- On team click: selected card scales up slightly, other cards fade out, dashboard slides in

**Backend change needed:**
Update `get_team_name_map()` in `espn_api.py` to return both:
```python
# Returns: {team_id: {"team_name": "Mahomes Alone", "manager_name": "Will Hofner"}}
team['location'] + ' ' + team['nickname']  # → "Mahomes Alone"
member_lookup[owner_id]                     # → "Will Hofner"
```

Update ALL team selectors across experiences to show team name + manager name using this new data structure.

---

### 1C: 3-Pillar Dashboard

**Current state:** Doesn't exist. Users pick one experience and are stuck there.

**New design:**

```
┌─────────────────────────────────────────────────────────┐
│  FANTASY WRAPPED                                         │
│  Mahomes Alone (Will H.) — The League of Legends        │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  📊 START   │  │  🎯 DRAFT   │  │  🔄 WAIVER  │     │
│  │   / SIT     │  │  REPORT     │  │  WIRE       │     │
│  │             │  │  CARD       │  │             │     │
│  │  Gasp stat  │  │  Gasp stat  │  │  Gasp stat  │     │
│  │  preview    │  │  preview    │  │  preview    │     │
│  │             │  │             │  │             │     │
│  │ [Explore →] │  │ [Explore →] │  │ [Explore →] │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  🎮 Choose a Different Vibe →                            │
│  ⟵ Change Team  |  🔄 Change League                     │
└─────────────────────────────────────────────────────────┘
```

**Requirements:**
- 3 large cards with 3D hover effect (same as team selection)
- Each card shows a **gasp moment preview** pulled from API (see Part 2D)
- Clicking a card navigates to that pillar's experience with all params + back button
- **"Choose a Different Vibe"** opens a secondary menu/modal with the other 7 experiences (Slideshow, Card Pack, Arcade, Mario, Madden, Pokemon, Filing Cabinet)
- "Change Team" returns to team selection
- "Change League" returns to league ID input
- Dashboard remembers team selection via URL params

**3D card effect spec:**
```css
.pillar-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  transform-style: preserve-3d;
}
.pillar-card:hover {
  transform: translateY(-6px) translateZ(12px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
```

**Animation spec:**
- Cards slide in from bottom with stagger (100ms between each)
- Gasp previews fade in after cards land (gives time for API call)

---

### 1D: "Choose a Different Vibe" Menu

When clicked, opens a modal or slide-out panel:

```
┌─────────────────────────────────────────┐
│  Choose a Different Vibe                 │
│                                          │
│  📊 Slideshow    🎴 Card Pack           │
│  🕹️ Arcade       🍄 Mario World        │
│  🎮 Madden       ⚡ Pokemon World       │
│  🗄️ Filing Cabinet                      │
│                                          │
│                          [Close ✕]       │
└─────────────────────────────────────────┘
```

- Smaller cards, grid layout
- Same 3D hover effect but subtler (translateZ(4px))
- Clicking navigates to that experience with league/team/year params pre-filled

---

### 1E: Navigation & State

**URL param contract (all experiences):**
```
?leagueId=X&year=Y&startWeek=Z&endWeek=W&teamId=T&teamName=N
```

**New:** `teamName` param so experiences can display it without re-fetching.

**Back navigation:**
- Every experience page gets a "← Back to Dashboard" link
- Dashboard URL: `index.html?leagueId=X&year=Y&startWeek=Z&endWeek=W&teamId=T&teamName=N`
- If all params are present, skip league ID + team selection, go straight to dashboard

**State flow:**
```
index.html (no params)        → Show league ID input
index.html (?leagueId)        → Show team selection
index.html (?leagueId&teamId) → Show 3-pillar dashboard
```

---

## Part 2: New Gasp Moment Stats

### 2A: Draft Alternative Pick Analysis

**What it does:** For each of your draft picks, show what players were available but taken before your next pick. Quantify the point differential.

**Framing:** "These players were on the board when you picked. Someone else grabbed them before your next turn."

**Algorithm:**

```python
def calculate_draft_alternatives(league_id, year, team_id):
    """
    For each pick, find all players taken between this pick and the team's
    next pick. These are the 'realistic alternatives' — available when you
    picked, but gone before you picked again.
    """
    draft_picks = fetch_draft_data(league_id, year)
    player_stats = fetch_season_player_data(league_id, year)

    # Get this team's picks in order
    team_picks = sorted(
        [p for p in draft_picks if p['team_id'] == team_id],
        key=lambda p: p['overall_pick']
    )

    results = []
    for i, pick in enumerate(team_picks):
        current_overall = pick['overall_pick']

        # Next pick by this team (or end of draft)
        if i + 1 < len(team_picks):
            next_overall = team_picks[i + 1]['overall_pick']
        else:
            next_overall = current_overall + team_count  # One more "round"

        # All picks between current and next (the alternatives)
        alternatives = [
            p for p in draft_picks
            if current_overall < p['overall_pick'] < next_overall
        ]

        your_points = player_stats.get(pick['player_id'], {}).get('total_points', 0)

        alt_results = []
        for alt in alternatives:
            alt_points = player_stats.get(alt['player_id'], {}).get('total_points', 0)
            differential = alt_points - your_points
            alt_results.append({
                'name': alt['player_name'],
                'position': alt['position'],
                'pick_number': alt['overall_pick'],
                'total_points': alt_points,
                'point_differential': differential,
                'drafted_by': alt['team_name']
            })

        # Sort by differential descending (biggest miss first)
        alt_results.sort(key=lambda x: x['point_differential'], reverse=True)

        biggest_miss = alt_results[0] if alt_results else None

        results.append({
            'round': pick['round'],
            'overall_pick': current_overall,
            'your_player': pick['player_name'],
            'your_position': pick['position'],
            'your_points': your_points,
            'alternatives': alt_results,
            'biggest_miss': biggest_miss
        })

    return results
```

**Performance note:** In a 12-team league, each pick compares against ~11 alternatives. Trivial — no performance concern.

**API endpoint:**
```
GET /api/league/<id>/draft/alternatives?year=Y&team_id=T&start_week=SW&end_week=EW
```

**Frontend integration:**
- Add "Alternatives" view to Draft Board (new tab or expandable rows)
- Highlight biggest miss per round in red
- Show gasp string: "If you drafted Ja'Marr Chase instead of Calvin Ridley: +247 points"
- Summary card: "Your Biggest Draft Miss" with the single worst differential

---

### 2B: "One Player Away" Analysis

**What it does:** For each loss, check if swapping ANY single bench player for ANY compatible starter would have flipped the result.

**Critical: Must handle FLEX correctly.** A bench RB can replace a starter WR if the WR is in the FLEX slot. Use `positions_compatible()` from `lineup_optimizer.py`.

```python
def find_one_player_away_losses(matchup_data):
    """
    For each loss, find if ONE swap would have won.
    Uses positions_compatible() to respect FLEX rules.
    """
    one_player_away = []

    for week_data in matchup_data:
        if week_data['my_team']['won']:
            continue

        my_score = week_data['my_team']['score']
        opp_score = week_data['opponent']['score']
        margin = opp_score - my_score

        starters = week_data['my_team']['starters']
        bench = week_data['my_team']['bench']

        saving_swaps = []
        for bench_player in bench:
            for starter in starters:
                if not positions_compatible(
                    bench_player['position'], starter['actual_position']
                ):
                    continue

                swap_gain = bench_player['points'] - starter['points']
                if swap_gain > margin:
                    saving_swaps.append({
                        'bench_player': bench_player['name'],
                        'bench_points': bench_player['points'],
                        'replaced_starter': starter['name'],
                        'starter_points': starter['points'],
                        'swap_gain': swap_gain,
                        'new_score': my_score + swap_gain,
                        'would_have_won_by': swap_gain - margin
                    })

        if saving_swaps:
            closest_swap = min(saving_swaps, key=lambda s: s['swap_gain'])
            one_player_away.append({
                'week': week_data['week'],
                'actual_score': my_score,
                'opponent_score': opp_score,
                'margin': margin,
                'saving_swap': closest_swap,
                'all_saving_swaps': saving_swaps,
                'gasp_moment': (
                    f"Week {week_data['week']}: {closest_swap['bench_player']} "
                    f"scored {closest_swap['bench_points']} on your bench. "
                    f"You lost by {margin:.1f}. ONE swap away."
                )
            })

    return one_player_away
```

**Frontend integration:**
- Surface in Weekly Deep Dive matchup detail (banner on loss weeks)
- Dashboard gasp preview: "X weeks where ONE swap would've changed everything"

---

### 2C: "Undefeated with Optimal" + "Perfect Lineup Loss"

**Both use dynamic season length** from ESPN's `matchupPeriodCount` — NOT hardcoded 14.

**Undefeated with Optimal:**
```python
def check_undefeated_optimal(team_data, total_regular_season_weeks):
    optimal_record = calculate_optimal_record(team_data)

    if (optimal_record['wins'] == total_regular_season_weeks
            and optimal_record['losses'] == 0):
        return {
            'is_undefeated_optimal': True,
            'optimal_record': f"{optimal_record['wins']}-0",
            'actual_record': f"{team_data['wins']}-{team_data['losses']}",
            'gasp_moment': (
                f"You would've gone {optimal_record['wins']}-0 with optimal "
                f"lineups (actual: {team_data['wins']}-{team_data['losses']})"
            )
        }
    return {'is_undefeated_optimal': False}
```

**Perfect Lineup Loss:**
```python
def find_perfect_lineup_losses(matchup_data):
    perfect_losses = []
    for week_data in matchup_data:
        errors = week_data['my_team'].get('errors', [])
        won = week_data['my_team']['won']

        if len(errors) == 0 and not won:
            margin = week_data['opponent']['score'] - week_data['my_team']['score']
            perfect_losses.append({
                'week': week_data['week'],
                'your_score': week_data['my_team']['score'],
                'opponent_score': week_data['opponent']['score'],
                'margin': margin,
                'gasp_moment': (
                    f"Week {week_data['week']}: Perfect lineup "
                    f"({week_data['my_team']['score']:.1f} pts) "
                    f"and still lost by {margin:.1f}"
                )
            })
    return perfect_losses
```

---

### 2D: Gasp Preview API (for Dashboard Cards)

**New endpoint:**
```
GET /api/league/<id>/team/<team_id>/gasp-previews?year=Y&start_week=SW&end_week=EW
```

**Response:**
```json
{
    "start_sit": {
        "headline": "247 points left on bench",
        "subtext": "3 weeks where ONE swap would've won"
    },
    "draft": {
        "headline": "If you drafted Chase instead of Ridley: +247 pts",
        "subtext": "Your biggest draft miss was in Round 3"
    },
    "waiver": {
        "headline": "47 moves (most in league)",
        "subtext": "+312 points from pickups"
    }
}
```

Lightweight summary-level calculations. Should load in <2 seconds.

---

## Part 3: Dynamic League Metadata

### Problem
Week count (1-14) is hardcoded everywhere. Different leagues have different regular season lengths.

### Solution
On league ID submission, call `/api/league/<id>/info` which already returns `final_week` from ESPN's `matchupPeriodCount`.

**Changes needed:**
1. **Frontend:** After league ID submit, fetch league info and use `final_week` as `endWeek` default
2. **Config:** Update `DEFAULT_YEAR` from 2024 → **2025** in both `config.js` and `app.py`
3. **Config:** `DEFAULT_END_WEEK` becomes fallback only, not primary source
4. **Team count:** Already returned by league info. Pass to draft alternatives for N-1 calculation.

---

## Part 4: Team Name + Manager Name

### Problem
`get_team_name_map()` only returns owner names. No fantasy team names shown anywhere.

### Solution
Update to return both names from ESPN's team `location` + `nickname` fields:

```python
# New return format:
# {team_id: {"team_name": "Mahomes Alone", "manager_name": "Will Hofner"}}
```

**Breaking change** — all consumers of `get_team_name_map()` must be updated:
- `season_analyzer.py`, `weekly_analyzer.py`, `draft_analyzer.py`
- `waiver_analyzer.py`, `wrapped_formatter.py`, `app.py`
- All frontend team selectors

Clean break preferred (update everything at once, no backward-compat shim).

---

## Implementation Plan (Single Overnight Session)

### Phase 1: UX Revamp

| Step | What | Files |
|------|------|-------|
| 1.1 | Update `get_team_name_map()` → return team_name + manager_name | `espn_api.py` + all consumers |
| 1.2 | Update default year 2024 → 2025 | `config.js`, `app.py` |
| 1.3 | Redesign `index.html` as 3-stage animated flow | `index.html`, new CSS |
| 1.4 | Build 3-pillar dashboard with 3D card effects | `index.html`, new CSS |
| 1.5 | Build "Choose a Different Vibe" modal | `index.html` |
| 1.6 | Add "← Back to Dashboard" to all experience pages | All experience HTML files |
| 1.7 | Dynamic week range from `/api/league/<id>/info` | `index.html` JS |

### Phase 1.5: Real Data Exploration & Insight Mining

| Step | What | Details |
|------|------|---------|
| 1.5.1 | Review `dev/test-data/LEAGUE_REFERENCE.md` | Real data from league 17810260 (2025). 8-team, 15-week season. |
| 1.5.2 | Use real data patterns to inform stat calculations | E.g., Will went 4-10 actual AND 4-10 optimal — unique "outmatched" gasp moment |
| 1.5.3 | Validate all new features against this real league | Draft alternatives, one player away, etc. must produce real output |
| 1.5.4 | Mine for additional stat ideas from the data | What patterns are interesting that we haven't thought of yet? |

**Key data points the overnight agent should know:**
- 8-team league, 15-week regular season (NOT 14)
- Will Hofner (team_id=1): 4-10 actual, 4-10 optimal (outmatched, not unlucky)
- Biggest draft miss: Rd 3 Jayden Daniels (114.3 pts) → Jonathan Taylor was next pick (309.0 pts, +194.7 differential)
- Zach Mouser: biggest underperformer (8 win difference from optimal)
- Lou Chrisos: luckiest (0 win difference — record matched optimal exactly)
- Test endpoint: `http://localhost:5001/api/league/17810260/...?year=2025`

### Phase 2: Gasp Moment Stats

| Step | What | Files |
|------|------|-------|
| 2.1 | Build `calculate_draft_alternatives()` | `draft_analyzer.py` |
| 2.2 | Add `/api/league/<id>/draft/alternatives` endpoint | `app.py` |
| 2.3 | Update Draft Board with alternatives display | `draftController.js` |
| 2.4 | Build `find_one_player_away_losses()` | `weekly_analyzer.py` |
| 2.5 | Integrate One Player Away into weekly deep dive | `weeklyController.js`, `weeklyRenderer.js` |
| 2.6 | Build Undefeated Optimal + Perfect Lineup Loss | `weekly_analyzer.py` or `season_analyzer.py` |
| 2.7 | Build gasp preview endpoint | `app.py` |
| 2.8 | Wire gasp previews to dashboard cards | `index.html` JS |

---

## Testing Strategy

### Phase 1:
- [ ] Team names + manager names display correctly on all selectors
- [ ] 3D hover effects work on all cards
- [ ] Entry animations play smoothly (no jank)
- [ ] Dashboard → Experience → Back navigation works
- [ ] "Choose a Different Vibe" shows all 7 secondary experiences
- [ ] Dynamic week range works for non-14-week leagues
- [ ] URL params persist across all navigation
- [ ] Direct URL with all params skips to dashboard
- [ ] Year defaults to 2025
- [ ] Responsive: cards stack on mobile

### Phase 2:
- [ ] Draft alternatives: correct count for 8-team and 12-team leagues
- [ ] Draft alternatives: point differentials match existing draft board data
- [ ] One Player Away: FLEX swaps correctly identified
- [ ] One Player Away: empty result when no losses qualify
- [ ] Undefeated Optimal: dynamic season length (not hardcoded 14)
- [ ] Perfect Lineup Loss: matches existing error calculation
- [ ] Gasp previews load in <2 seconds
- [ ] All 3 dashboard cards show meaningful stats

---

## Future Work (Not This Sprint)

- **Login/accounts:** Save league IDs for returning users
- **Chrome Extension:** ESPN private league access (deferred)
- **Lineup Editor:** Tap-to-swap what-if tool (`lineupEditor.js` is stubbed)
- **Weekly consolidation:** Filing Cabinet vs Weekly Deep Dive merge decision
- **Slideshow integration:** New gasp stats as slides

---

## Resolved Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Draft alternatives scope? | Full round: N-1 picks where N = team count |
| 2 | Hub structure? | 3-stage flow: league ID → team → 3-tab dashboard |
| 3 | Other experiences? | "Choose a Different Vibe" modal |
| 4 | Phase order? | Both phases in single overnight session |
| 5 | Chrome extension? | Deferred to future sprint |
| 6 | Season length? | Dynamic from ESPN `matchupPeriodCount` |
| 7 | Draft data blocker? | No — `mDraftDetail` already integrated |
| 8 | Team names? | ESPN `location + nickname` fields available |
| 9 | FLEX handling? | Use existing `positions_compatible()` from lineup_optimizer |
| 10 | Performance of full-round alternatives? | Trivial (11 comparisons per pick max) |
