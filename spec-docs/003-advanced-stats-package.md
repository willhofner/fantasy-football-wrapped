# Spec 003: Advanced Stats Package

**Status:** Backlog
**Priority:** P1 (High Impact)
**Effort:** Large (50+ stats across multiple categories)
**Created:** 2026-02-09
**Last Updated:** 2026-02-09

---

## Overview

Expand the statistical analysis engine with emotionally powerful, shareable stats that reveal manager tendencies, decision patterns, and "what if" scenarios. Focus on stats that fuel trash talk, create "remember when" moments, and expose both strengths and embarrassing failures.

**Tagline:** "The omniscient roast machine knows every decision you made all season."

---

## Emotional Design Principles

Every stat should answer at least one of these questions:
1. **Does it make you feel something?** (shame, pride, frustration, validation)
2. **Is it screenshot-worthy?** (group chat ammunition)
3. **Does it reveal a pattern?** (tendencies, habits, blind spots)
4. **Does it tell a story?** (narrative arc, character development)
5. **Is it comparative?** (you vs league, you vs specific opponents)

---

## Stat Categories & Implementation Priority

### **Tier 1: Quick Wins** (High Impact, Low Complexity)
Stats we can calculate with existing data structures. Ship first.

### **Tier 2: Medium Effort** (High Impact, Medium Complexity)
Requires new aggregations or week-by-week analysis.

### **Tier 3: Complex** (High Impact, High Complexity)
Requires new data collection, external APIs, or significant refactoring.

---

## Tier 1: Quick Wins (Ship First)

### **1. Consistency & Volatility**

#### **Standard Deviation of Weekly Scores**
- **What:** Measure of score reliability vs chaos
- **Calc:** `std_dev(weekly_points)`
- **Display:** "Your scores ranged from 87 to 156. Chaos level: 8/10"
- **Roast angle:** High volatility = unpredictable, low = boring

#### **Boom-Bust Ratio**
- **What:** Weeks >120pts vs weeks <80pts
- **Calc:** `count(weeks > 120) / count(weeks < 80)`
- **Display:** "3 explosions, 5 duds. Ratio: 0.6"
- **Roast angle:** All over the place vs consistent

#### **Predictability Percentile**
- **What:** How often you scored near your season average (±10pts)
- **Calc:** `count(weeks within avg ± 10pts) / total_weeks * 100`
- **Display:** "You scored 95-105 in 9/14 weeks. Predictability: 64%"
- **League rank:** Most/least predictable team

#### **Week-by-Week Error Tracking**
- **What:** Visual chart of lineup errors across the season
- **Calc:** Track `errors_per_week = optimal_count - starter_count` for each week
- **Display:** Bar chart showing errors per week (0-9 scale), highlight worst week
- **League comparison:** "Week 8 was the most unpredictable week league-wide (avg 3.2 errors)"
- **Data:** Already tracked in `weekly_data`, just needs aggregation + visualization
- **Roast angle:** "Week 7: 5 errors. Week 11: 6 errors. You never learned."

---

### **2. Position-Specific Intelligence**

#### **Errors by Position**
- **What:** Which position you're worst at managing
- **Calc:** Count benched optimal players by position
- **Display:** "7 RB errors, 3 WR errors, 1 QB error. Your weakness: Running backs"
- **Roast angle:** Position-specific shaming

#### **FLEX Graveyard**
- **What:** Points lost specifically to bad FLEX decisions
- **Calc:** Sum of (optimal_flex_points - actual_flex_points) across all weeks
- **Display:** "FLEX mistakes cost you 47.3 points and 2 games"
- **Roast angle:** "Where the sausage is made"

---

### **3. Win/Loss Context**

#### **Close Game Record**
- **What:** W-L in games decided by <10 points
- **Calc:** Filter matchups where `abs(my_score - opp_score) < 10`
- **Display:** "2-5 in close games. Choke artist confirmed."
- **Roast angle:** Clutch vs choke

#### **Blowout Record**
- **What:** W-L in games decided by >30 points
- **Calc:** Filter matchups where `abs(my_score - opp_score) > 30`
- **Display:** "5-1 in blowouts. You either dominate or disappear."

#### **Nail-Biters**
- **What:** Games decided by <3 points
- **Calc:** Filter matchups where `abs(my_score - opp_score) < 3`
- **Display:** "3 games decided by less than 3 points. Heart rate: deceased."

---

### **4. Bench Narratives**

#### **Bench Explosion Week**
- **What:** Week your bench outscored your starters
- **Calc:** Find week where `sum(bench_points) > sum(starter_points)`
- **Display:** "Week 7: Bench scored 134, starters scored 98. Pain."
- **Roast angle:** Ultimate failure

#### **Goose Egg Count**
- **What:** Total 0-point performances in starting lineup
- **Calc:** Count starters with `points == 0` across all weeks
- **Display:** "5 goose eggs this season. 🤡"
- **League rank:** "Clown" superlative

---

### **5. Extreme Margins**

#### **Biggest Win & Most Painful Loss**
- **What:** Largest margin of victory/defeat
- **Calc:** `max(my_score - opp_score)` and `min(my_score - opp_score)`
- **Display:** "Biggest win: 47 pts (Week 3 vs Jake). Worst loss: -52 pts (Week 9 vs Sarah)"

#### **Blown Lead**
- **What:** Times you were ahead Sunday at 4pm and lost (requires game time data)
- **Calc:** Compare scores before/after SNF/MNF games
- **Display:** "Week 11: Up 12 before Monday Night. Lost by 3. Heartbreaking."
- **Note:** Tier 3 if we need play-by-play data, Tier 2 if we approximate with player game times

---

### **6. League Comparative Stats**

#### **Strength of Schedule**
- **What:** Average opponent score vs league average
- **Calc:** `avg(opponent_scores) vs league_avg_score`
- **Display:** "Opponents averaged 112.3 (league avg: 105.7). Toughest schedule: 3rd"
- **Roast angle:** Excuses vs reality

#### **Unluckiest Loss Analysis**
- **What:** Times you lost but would've beaten 80%+ of league
- **Calc:** For each loss, count how many teams you outscored that week
- **Display:** "Week 5: Scored 128, lost. Would've beaten 9/10 other teams."

#### **Luckiest Win Analysis**
- **What:** Times you won but 80%+ of league outscored you
- **Calc:** For each win, count how many teams outscored you
- **Display:** "Week 2: Scored 89, won. 8/10 teams scored more. Lucky bastard."

---

### **7. Streaks & Momentum**

#### **Longest Win/Loss Streaks**
- **What:** Peak and valley narratives
- **Calc:** Find longest consecutive W or L
- **Display:** "5-game win streak (Weeks 3-7). 3-game skid (Weeks 10-12)."

#### **Peak Performance Window**
- **What:** Best 3-week stretch (total points)
- **Calc:** Find max `sum(week_i, week_i+1, week_i+2)`
- **Display:** "Peak: Weeks 5-7 (387 points). Rock bottom: Weeks 11-13 (251 points)."

---

### **8. Would've/Could've/Should've (Emotional Damage)**

#### **Perfect Season Record**
- **What:** Your record if you started optimal every week
- **Calc:** Compare optimal_score vs opponent_actual_score for each week
- **Display:** "Actual: 7-7. Optimal: 11-3. You cost yourself 4 wins."
- **Roast angle:** Self-sabotage

#### **One-Player-Away Count**
- **What:** Games lost by 1 wrong decision
- **Calc:** For losses, check if swapping 1 benched player would've changed outcome
- **Display:** "5 losses where 1 roster swap wins the game. Pain index: Maximum."

#### **Cumulative Cost of Errors**
- **What:** Total games lost specifically due to lineup mistakes
- **Calc:** Losses where `my_optimal > opp_actual`
- **Display:** "Errors cost you 3 games. You'd be 10-4 instead of 7-7."

---

## Tier 2: Medium Effort

### **9. Head-to-Head Dynamics**

#### **Your Nemesis / Your Victim**
- **What:** Manager who beats/loses to you most often
- **Calc:** Build H2H matrix, find max wins against you and max losses against you
- **Display:** "Your nemesis: Jake (0-2). Your victim: Mike (2-0)."
- **Data needed:** Opponent IDs tracked across weeks (already have in `weekly_data`)

#### **Record vs Top 3 / Bottom 3**
- **What:** How you fare against best/worst teams
- **Calc:** Identify top/bottom 3 by standings, filter your games against them
- **Display:** "1-3 vs top teams. 3-0 vs bottom feeders. You beat who you should."

---

### **10. Positional Depth Analysis**

#### **Shallow Position**
- **What:** Position with fewest startable options
- **Calc:** For each position, count players with >50% start rate
- **Display:** "RB depth: 2 startable. WR depth: 5 startable. Thin at RB."

#### **Bye Week Pain Position**
- **What:** Which position hurt most during bye weeks
- **Calc:** Track errors during bye weeks by position
- **Display:** "Week 7 bye: Started RB3, scored 4 pts. Bye week pain: RB."
- **Data needed:** Bye week info (not currently tracked)

---

### **11. Roster Tenure & Player Stories**

#### **Iron Man**
- **What:** Player started most weeks for you
- **Calc:** `max(count(player in starters))`
- **Display:** "Josh Allen: 14/14 starts. Your iron man."

#### **Flash in the Pan**
- **What:** Player started once then never again
- **Calc:** Find players with exactly 1 start
- **Display:** "Zach Charbonnet: 1 start (Week 3, 6 pts). Never seen again."

#### **Draft vs Waiver MVPs**
- **What:** Best draft pick vs best waiver add (by points)
- **Calc:** Requires draft/acquisition tracking (not currently available)
- **Display:** "Best draft pick: Jahmyr Gibbs (187 pts). Best waiver add: Jayden Reed (156 pts)."
- **Data needed:** Draft round, acquisition type

#### **Top Heavy**
- **What:** What % of your points came from top 2-3 players
- **Calc:** `sum(top_3_player_points) / total_points * 100`
- **Display:** "52% of your points from 3 players. Top heavy confirmed."
- **Data needed:** Player season totals (already have in `player_season_points`)
- **Roast angle:** Overreliance vs balanced roster

#### **Crown Jewel**
- **What:** Highest ranked player at any position on your roster (by season points)
- **Calc:** `max(player_season_points)` across all players, find league-wide rank
- **Display:** "Ja'Marr Chase: 247 pts. League-wide WR #3. Your crown jewel."
- **Data needed:** Player season totals (already have), league-wide player rankings (would need to aggregate)
- **Roast angle:** "Your best player was mid" vs "You had the league's #1 RB"

---

### **12. Manager Archetype Classification**

Auto-classify each manager based on stats:

| Archetype | Criteria |
|-----------|----------|
| **The Tinkerer** | Most lineup changes (low repeat starter %) |
| **The Sleeper** | Lowest error count |
| **The Gambler** | Highest boom-bust ratio |
| **The Steady Eddie** | Lowest score std dev |
| **The Lucky Bastard** | Actual wins >> expected wins (Pythagorean) |
| **The Snakebitten** | Actual wins << expected wins |
| **The Ceiling Chaser** | High % of low-floor, high-ceiling starts |
| **The Floor Seeker** | High % of safe, consistent starts |

**Display:** "Your archetype: The Gambler. Boom or bust, no in-between."

**Note:** Manager archetypes complement the league-wide superlatives system (see ROADMAP.md). Many superlatives can be awarded based on stats from this package:
- Clown (goose eggs) → Tier 1
- Blue Chip / Skull (extreme margins) → Tier 1
- Dice Roll / Heartbreak Kid (close games) → Tier 1
- Lucky / Unlucky (luckiest win/unluckiest loss) → Tier 1
- Bench Warmer (points lost) → Tier 1
- Top Heavy → Tier 2
- Draft King / Home Grown / Waiver MVP → Tier 3

---

### **13. Early Season vs Late Season**

#### **Season Splits**
- **What:** Compare first half vs second half performance
- **Calc:** Split weeks in half, compare avg points
- **Display:** "First 7 weeks: 108 ppg. Last 7 weeks: 98 ppg. You faded."

---

## Tier 3: Complex (Requires New Data)

### **14. Draft & Acquisition Analysis**

**Data needed:** Draft results, waiver claims, trades, drops (ESPN API may provide)

- **Draft picks still rostered** — % of drafted players remaining
- **Roster turnover %** — How much roster has changed since draft
- **Best late-round pick** — Drafted in round 8+ who became starter
- **Waiver wire MVP** — Free agent who outscored your top draft pick
- **Trade wins** — Trades where you got more points than gave up
- **Panic drop** — Player you dropped who immediately went off
- **Practice Squad** — Free agent with most attempted claims by other teams (never started for you but was highly competitive on waivers)

---

### **15. Injury & Risk Management**

**Data needed:** Injury status tags (Q, D, O, IR) from ESPN API

- **Questionable starters** — Times you started a "Q" tag player
- **Q-tag success rate** — Did risky starts pay off?
- **Late scratch casualties** — Players ruled out after lineup lock
- **Injury replacement success** — Did you correctly pivot when star went down?

---

### **16. Projection Analysis**

**Data needed:** ESPN pre-game projections for each player

- **Projection deviation %** — How often you ignored ESPN projections
- **Fade projections success** — When you went against projections, did it work?
- **Projection sheep score** — % of weeks you started exactly who ESPN said

---

### **17. Timing & Submission Analysis**

**Data needed:** Lineup lock timestamps (if ESPN provides)

- **Sunday morning panic %** — Lineups set <2hrs before kickoff
- **Wednesday warrior %** — Lineups set 3+ days early
- **Late-week tinkering** — Lineups changed Sat/Sun vs set early

---

## Backend Implementation Plan

### **Phase 1: Extend Existing Calculators (Tier 1 Stats)**

**File:** `backend/stats/team_calculator.py`

Add to `calculate_post_season_stats()`:
- `consistency_metrics` (std dev, boom-bust, predictability)
- `position_errors` (errors by position, FLEX graveyard)
- `close_game_record` (W-L in <10pt games)
- `nail_biters` (games <3pts)
- `bench_explosion_week`
- `goose_egg_count`
- `extreme_margins` (biggest win/loss)
- `streaks` (longest win/loss, peak 3-week)
- `perfect_season_record`
- `one_player_away_count`
- `cumulative_cost`

**File:** `backend/stats/league_calculator.py`

Add to `calculate_league_stats()`:
- `volatility_rankings` (most/least predictable)
- `strength_of_schedule`
- `unluckiest_losses`
- `luckiest_wins`
- `manager_archetypes` (classification for each team)

---

### **Phase 2: New Analysis Module (Tier 2 Stats)**

**New file:** `backend/stats/advanced_analyzer.py`

Functions:
- `calculate_head_to_head_matrix(team_stats, weekly_data)` → nemesis/victim
- `calculate_positional_depth(weekly_data)` → shallow/deep positions
- `calculate_roster_tenure(weekly_data)` → iron man, flash in pan
- `calculate_season_splits(weekly_data)` → early vs late performance
- `classify_manager_archetype(team_stats)` → return archetype string

---

### **Phase 3: External Data Integration (Tier 3 Stats)**

**New files:**
- `backend/draft_analyzer.py` — Pull draft results from ESPN, track acquisitions
- `backend/injury_tracker.py` — Track injury status tags from rosters
- `backend/projection_analyzer.py` — Pull ESPN projections, compare to actuals

**API additions:**
- Fetch draft results: `ESPN API mDraftDetail view`
- Fetch transaction history: `ESPN API mTransactions2 view`
- Fetch player projections: Already in player stats (projectedPointsTotal)

---

## Frontend Display Strategy

### **New Slide Categories**

**Consistency Slide** (Tier 1)
- Standard deviation chart
- Boom-bust ratio
- Predictability percentile
- League volatility ranking

**Position IQ Slide** (Tier 1)
- Errors by position bar chart
- "Your weakness: RB" callout
- FLEX graveyard highlight

**Clutch Factor Slide** (Tier 1)
- Close game record
- Nail-biters count
- "Clutch or choke?" verdict

**Extreme Moments Slide** (Tier 1)
- Biggest win (opponent name, margin)
- Most painful loss
- Bench explosion week

**Perfect Season Slide** (Tier 1)
- "What if you were perfect?"
- Actual vs optimal record comparison
- "You cost yourself X wins"

**Head-to-Head Slide** (Tier 2)
- Your nemesis (photo, record)
- Your victim (photo, record)
- Record vs top/bottom teams

**Manager Archetype Slide** (Tier 2)
- Big archetype label (e.g., "THE GAMBLER")
- Supporting stats explaining classification
- Roast copy tailored to archetype

---

## Wrapped Formatter Updates

**File:** `backend/stats/wrapped_formatter.py`

Add to output:
```python
'consistency': {
    'std_dev': ...,
    'boom_bust_ratio': ...,
    'predictability_pct': ...,
    'volatility_rank': ...
},
'position_iq': {
    'errors_by_position': {...},
    'flex_graveyard_points': ...,
    'weakest_position': ...
},
'clutch_factor': {
    'close_game_record': {'wins': ..., 'losses': ...},
    'nail_biters': ...,
    'verdict': 'clutch' | 'choke'
},
'extreme_moments': {
    'biggest_win': {...},
    'worst_loss': {...},
    'bench_explosion_week': {...}
},
'perfect_season': {
    'actual_record': ...,
    'optimal_record': ...,
    'games_cost': ...
},
'head_to_head': {
    'nemesis': {...},
    'victim': {...},
    'vs_top_teams': {...},
    'vs_bottom_teams': {...}
},
'manager_archetype': 'The Gambler'
```

---

## Card Pack Integration

**New card types:**
- **Archetype Card** (Legendary) — "THE GAMBLER" reveal
- **Nemesis Card** (Rare) — Opponent who owns you
- **Clutch Factor Card** (Epic/Rare) — Close game record
- **Perfect Season Card** (Epic) — What could have been
- **Bench Explosion Card** (Uncommon/Roast) — Week bench beat starters

---

## Testing & Validation

**Test league:** 17810260, Year: 2025, Team: Will

**Validation checklist:**
- [ ] Consistency metrics calculate correctly
- [ ] Position errors sum matches total errors
- [ ] Close game filtering works (<10pt threshold)
- [ ] Goose egg count verified manually
- [ ] Perfect season record logic tested
- [ ] Archetype classification makes sense for all teams
- [ ] Frontend displays all new stats without layout breaks

---

## Success Metrics

**Engagement:**
- Do users screenshot/share new stat slides?
- Which stats get most screenshots? (Track via analytics if possible)

**Roast effectiveness:**
- Do stats generate group chat activity?
- Are archetypes accurate/funny?

**Emotional impact:**
- Do "what if" stats (perfect season, one player away) resonate?
- Do users say "oh shit" when seeing their stats?

---

## Open Questions

1. **ESPN API limitations** — Can we get draft results, transactions, projections easily?
2. **Performance impact** — Will 40+ new stats slow down analysis? (Probably not, but test)
3. **Slide count** — Do we add 10+ slides or integrate into existing slides?
4. **Archetype accuracy** — Do classifications feel right or forced?
5. **Mobile display** — How do complex charts render on mobile?

---

## MVP Scope (Phase 1 Only)

**Ship first:**
- Consistency metrics (4 stats: std dev, boom-bust, predictability, week-by-week error tracking)
- Position errors (2 stats: errors by position, FLEX graveyard)
- Close game record (3 stats: close games, blowouts, nail-biters)
- Goose eggs (1 stat)
- Extreme margins (2 stats: biggest win, worst loss)
- Perfect season (3 stats: perfect season record, one-player-away, cumulative cost)
- Streaks (2 stats: win/loss streaks, peak 3-week window)
- League comparisons (3 stats: strength of schedule, unluckiest loss, luckiest win)

**Total:** ~20 new stats, 3-4 new slides, backend changes only to existing calculators.

**Timeline:** 1 overnight session or 2-3 focused work sessions.

---

## Future Expansion Ideas

- **Multi-season analysis** — Compare this year to past years
- **League-wide heatmaps** — Visualize error patterns across all managers
- **Play-by-play analysis** — If ESPN provides, track Monday Night miracles in real-time
- **Video highlights** — Embed NFL clips of breakout performances
- **Custom roast generator** — LLM-generated personalized trash talk based on stats

---

## Notes

This spec **consolidates and organizes 50+ stat ideas** from brainstorming and existing ROADMAP items. Organized by implementation difficulty, the phased approach ensures we can ship value incrementally while building toward a comprehensive statistical analysis engine.

**Consolidated from ROADMAP:**
- Luckiest Win / Heartbreaking Loss → Tier 1 (Extreme Margins + Unluckiest Loss Analysis)
- FLEX Analysis Slide → Tier 1 (FLEX Graveyard)
- Week-by-Week Error Chart → Tier 1 (Week-by-Week Error Tracking)
- Free Agent / Draft Analysis → Tier 3 (Draft & Acquisition Analysis)
- Position Depth Analysis → Tier 2 (Positional Depth Analysis)
- Bye Week Heroes → Tier 2 (Bye Week Pain Position)
- Head-to-head rivalry → Tier 2 (Head-to-Head Dynamics)
- Trade analysis → Tier 3 (Draft & Acquisition Analysis)
- Injury impact → Tier 3 (Injury & Risk Management)
- Home Grown Talent → Tier 3 (Draft vs Waiver MVPs)
- Top Heavy → Tier 2 (added from ROADMAP)
- Good Calls vs Projections → Tier 3 (Projection Analysis)
- Highest ranked player → Tier 2 (Crown Jewel)
- Practice Squad → Tier 3 (Draft & Acquisition Analysis)

**Remember:** Every stat should answer: "Does this make me want to screenshot and roast my friends?" If not, cut it.
