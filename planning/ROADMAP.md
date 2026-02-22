# ROADMAP.md

Living document for ideas, feedback, and priorities. Dump ideas here freely—we'll organize and prioritize as we go.

---

## Now (Active Focus)

_What we're working on right now._

- [x] **3-Pillar UX Revamp** — Hub redesigned around Start/Sit, Draft, Waiver pillars with gasp preview cards and animated entry flow
- [x] **Waiver Wire Mastery** — Two-sided transactions, 12 advanced stats, team-specific My Team tab, waiver grades, manager profiles
- [x] **Draft Report Card** — Alternatives analysis, 12 new stats, grade leaderboard, value over expected chart, Insights tab
- [x] **Data Caching System** — In-memory + sessionStorage caching, dashboard preloading, instant revisits
- [x] **Gasp Moment Features** — One-player-away, undefeated-with-optimal, perfect-lineup-loss, gasp preview API + dashboard cards
- [ ] Test all new features with real league data in browser (run `/test`)
- [ ] Polish: card pack with real data, animations/timing, more superlatives

---

## Next (Up Soon)

_Queued up and ready to tackle. See prioritization rationale at bottom._

### P0 — High Impact, Ship Soon
- [x] **League-Wide Superlatives System** — 16 awards for every manager (clown, blue_chip, skull, dice_roll, top_heavy, bench_warmer, heartbreak, perfect_club, best/worst_manager, lucky, unlucky, speedrunner, snail, sniper, draft_king)
- [x] **Advanced Stats Package (Phase 1)** — 20 stats across 8 categories: consistency, position IQ, clutch factor, bench narratives, extreme moments, league comparisons, streaks, what-if. ([Spec: 003](spec-docs/003-advanced-stats-package.md))

### P1 — Strong Ideas, Medium Complexity
- [x] **Advanced Stats Package (Phase 2)** — Head-to-head dynamics (nemesis/victim), manager archetypes (9 types), positional depth, roster tenure (Iron Man/Flash in Pan/Crown Jewel), season splits. ([Spec: 003](spec-docs/003-advanced-stats-package.md))
- [x] **Coach vs GM Rating Split** — Coach rating (lineup accuracy, errors, perfect weeks) + GM rating (roster ceiling, optimal points) with letter grades A+ through F

### P2 — Cool But Complex
- [ ] **Advanced Stats Package (Phase 3)** — Draft/waiver analysis, injury tracking, projection deviation (requires ESPN API exploration). ([Spec: 003](spec-docs/003-advanced-stats-package.md))
- [x] **Roster Strength Rankings** — All teams ranked by optimal PPG with efficiency %, power rank vs actual rank comparison
- [x] **Pokemon Card Flip UX** — Holographic collectible cards that flip to reveal superlatives ✅ DONE (see Card Pack Experience)

---

## Later (Backlog)

_Good ideas we'll get to eventually._

### Platform Expansion
- [ ] Private league support (ESPN cookies/SWID authentication)
- [ ] Yahoo Fantasy league support
- [ ] Sleeper league support

### External Data Integration (Requires Research)
- [ ] **ESPN-Wide Start %** — Show league-wide start % for players you benched ("You benched him when 94% of managers started him")
- [ ] **League vs Globe** — Your league's avg scores vs worldwide with same settings
- [ ] **Average Points Benchmarks** — How your league compares to others of same size
- [ ] **Game Highlights Integration** — Video clips of breakout performances

### New Slides & Content
- [ ] Playoff bracket analysis
- [ ] Historical season comparisons (if user has multiple years)
- [ ] Defense matchup context (who D/ST played each week)
- [ ] Breakout player narratives (e.g., "Trey Henderson exploded his first week after you grabbed him")

**Note:** Many stats previously listed here (head-to-head rivalry, trade analysis, injury impact, home grown talent, top heavy, good calls vs projections) are now consolidated in [Advanced Stats Package (Spec 003)](spec-docs/003-advanced-stats-package.md).

### Polish & UX
- [ ] **Arcade Visual Realism Overhaul** — Super realistic 3D arcade cabinet with wood grain, metallic textures, authentic materials, and depth effects. ([Spec: 002](spec-docs/002-arcade-visual-realism.md))
- [ ] Downloadable summary image (single shareable graphic)
- [ ] Sound effects and music
- [ ] Improved mobile swipe gestures
- [ ] Loading state animations
- [ ] Slide transition improvements
- [ ] Sub team logos for defenses

### Roast & Entertainment
- [ ] AI-generated roast commentary per slide
- [ ] "Worst Decision of the Season" highlight
- [ ] "What Were You Thinking?" moments
- [ ] League-wide "Hall of Shame" slides

---

## Superlatives Master List

_Awards to give out to managers. Each should have an icon/emoji and roast-worthy copy._

| Award | Criteria | Vibe |
|-------|----------|------|
| **Clown** | Most goose eggs (0-point performances) in starting lineup | Roast |
| **Speedrunner** | Most free agent roster moves | Neutral |
| **Snail** | Fewest free agent roster moves | Roast |
| **Sniper** | Highest-scoring single free agent pickup | Praise |
| **Draft King** | Lowest draft turnover + highest scoring draft class | Praise |
| **Blue Chip** | Highest average win margin | Praise |
| **Skull** | Highest average loss margin (got blown out) | Roast |
| **Dice Roll** | Lowest average margins (always close games) | Neutral |
| **Top Heavy** | Highest % of points from top 2 players | Neutral |
| **Home Grown** | Highest % of starts from drafted players | Praise |
| **Waiver Wire MVP** | Most points from FA pickups | Praise |
| **Bench Warmer** | Most points left on bench all season | Roast |
| **Lucky** | Most wins where you were outscored by 6+ other teams | Roast |
| **Unlucky** | Most losses where you outscored 6+ other teams | Sympathy |
| **Heartbreak Kid** | Multiple losses by <10 points | Sympathy |
| **Perfect Week Club** | Had a "perfect" lineup (with BYE/OUT/INJ context) | Praise |

---

## Ideas (Unsorted)

_Raw ideas that need more thought before categorizing._

- Explore entire season's worth of matchups in an interactive way (see: Weekly Deep Dive feature)
- Narrative-driven slides that tell the story of a player's arc on your team

**Note:** "Highest ranked player" (Crown Jewel) and "Practice Squad" are now in [Advanced Stats Package (Spec 003)](spec-docs/003-advanced-stats-package.md).

---

## Feedback Log

_User feedback, bug reports, and observations. Date them._

### Template
```
**Date:** YYYY-MM-DD
**Source:** (self / user / testing)
**Type:** (bug / ux / feature request / observation)
**Notes:** ...
```

---

## Completed

_Done! Move items here when shipped._

### Sprint 2026-02-20: Full Stats Engine Build (Superlatives + Advanced Stats + Coach/GM + Roster Rankings)
- [x] **16 League-Wide Superlatives** — Full awards system in `league_calculator.py`, frontend slides + card pack + superlative guessing game
- [x] **Advanced Stats Phase 1** — 20 stats across 8 categories in `advanced_stats.py`, 6 new slideshow slides, 6 new card pack cards
- [x] **Advanced Stats Phase 2** — Head-to-head, roster tenure, season splits, manager archetypes, positional depth. 6 new slides
- [x] **Coach vs GM Rating Split** — Letter grades (A+ to F) for lineup accuracy vs roster construction
- [x] **Roster Strength Rankings** — League-wide power rankings by optimal PPG with efficiency and rank diff
- [x] **Card Pack Enhancement** — Superlative cards, Archetype card, Coach vs GM card, Iron Man card, Consistency card, streaks/clutch cards

### Sprint 2026-02-18: 3-Pillar UX Revamp + Full Feature Build (2 sessions)
- [x] **3-Pillar Hub Redesign** — Premium animated entry flow, 3D card hovers, gasp preview cards, "Choose a Different Vibe" modal
- [x] **Waiver Two-Sided Transactions** — `_pair_transactions()` matches adds/drops into swaps by team+week
- [x] **12 Waiver Advanced Stats** — MVP, most active week, best ROI, dropped too early, streaming king, position breakdown, early/late, longest hold, buyer/seller, hot hand, regret drops
- [x] **Waiver My Team Tab** — Grade, summary stats, comparison bar, best pickup, biggest regret, full swap list
- [x] **Waiver Grade Leaderboard** — All teams ranked by computed waiver grade with activity bar
- [x] **Waiver Manager Profiles** — Personality traits: Churner, Diamond Finder, Hoarder, Streamer, Set and Forget, Balanced
- [x] **Draft Alternatives Analysis** — Backend `calculate_draft_alternatives()` + frontend Insights tab with expandable rows
- [x] **12 Draft Advanced Stats** — Position value, draft steal, biggest bust, reach picks, draft efficiency, round grades, etc.
- [x] **Draft Grade Leaderboard** — All teams sorted by draft grade with total points bar chart
- [x] **Draft Value Over Expected Chart** — Per-pick bar chart showing points vs round average
- [x] **Data Caching System** — `dataCache.js` with memory + sessionStorage, dashboard preloading
- [x] **Gasp Preview API** — `/api/league/<id>/team/<team_id>/gasp-previews` aggregating all 3 pillars
- [x] **One-Player-Away Detection** — Weekly losses that ONE bench swap would have flipped (FLEX-aware)
- [x] **Perfect Lineup Loss Detection** — Weeks with optimal lineup that still lost
- [x] **Undefeated With Optimal** — Flag teams whose optimal lineups would have gone undefeated
- [x] **Season Record Tracker** — Running W-L + streak in weekly header
- [x] **Perfect Loss Banner** — Purple banner in weekly when optimal lineup still lost
- [x] **Homepage Falling Numbers Fix** — Slowed speed, reduced density, fixed z-index, fixed speed reset bug
- [x] **Red Triangle Gap Fix** — Reduced gaps around error indicators in weekly lineup
- [x] **Year Defaults Fixed** — All controllers updated from 2024 to 2025
- [x] **Mobile Responsive** — All new components have mobile breakpoints
- [x] **Dynamic Week Range** — ESPN `matchupPeriodCount` replaces hardcoded 14
- [x] **Back-to-Dashboard Nav** — All experience pages link back with URL params preserved

### Sprint 2026-02-10: Three Game Experiences (Mario, Madden, Pokemon)
- [x] **Mario World Experience** — Canvas pixel-art overworld with Toad sprite, 14 themed locations (Mushroom Village → Bowser's Castle), WASD movement, stats overlay
- [x] **Madden Console Experience** — Full Xbox boot → Madden title screen → tabbed menu system (Home/Season/Standings/Scores), week detail overlay, keyboard nav
- [x] **Pokemon World Experience** — Canvas pixel-art overworld with trainer sprite, 14 fantasy-football-themed towns (Draft Day Village → Fantasy Finals Colosseum), grid-based movement, Pokemon-style text boxes
- [x] **Hub Page Updated** — All 3 new experiences added to hub page with themed icon gradients

### Sprint 2026-02-10: Weekly Deep Dive V2 + Draft Board
- [x] **Roster Spacing Bug Fix** — Fixed vertical gap above error indicator players
- [x] **Starters vs Bench Visual Distinction** — Subtle shading, dashed divider, section labels
- [x] **Top Scorers Scrolling Ticker** — Position-grouped top 3 scorers with ESPN headshots
- [x] **Headshots in League Matchups** — Real ESPN player headshots replace initial circles
- [x] **Team Selection Required** — Users must pick their team before entering any experience
- [x] **Better Loading Screen** — Cycling football-themed taglines with spinning football animation
- [x] **Improved Week Selector** — W/L results with scores, active week visually prominent
- [x] **ESPN API Research** — 16+ views cataloged, 27 creative stat ideas documented (`dev/specs/006-espn-api-research.md`)
- [x] **Draft Board Experience** — New experience: full draft analysis with GEM/BUST grades, sortable table, filters

### Sprint 2026-02-02: Card Pack Experience
- [x] **Card Pack Opening UX** — Collectible card reveals with pack opening animation
- [x] **5-Tier Rarity System** — Common, Uncommon, Rare, Epic, Legendary with visual effects
- [x] **Dark Theme Design System** — Premium dark UI with gold accents
- [x] **Holographic Card Effects** — Prismatic shimmer, glow borders, particle effects
- [x] **Superlative Guessing Game** — Interactive "which award did you win?" game
- [x] **Dual-Mode Architecture** — Toggle between Card Pack and Slideshow experiences
- [x] **Card Types** — Player cards, Moment cards, Superlative cards, Overview cards

### Original Features
- [x] Basic ESPN league integration
- [x] Team selection flow
- [x] 28-slide presentation structure
- [x] Optimal lineup calculation
- [x] Points left on bench analysis
- [x] Win-loss record comparisons (actual, optimal, vs opponent optimal)
- [x] Player highlights (top scorers, slept on, overrated)
- [x] Mobile-responsive design

---

## Prioritization Rationale

**Why this order?**

### P0 — High Impact, Ship Soon
These are the "roast multipliers" — features that dramatically increase shareability and trash talk potential with relatively straightforward implementation:

1. **League-Wide Superlatives** — Every manager gets called out. Instant group chat content. Most of the data we already have.
2. **Luckiest Win / Heartbreaking Loss** — Emotional hooks that make people feel something. Easy to calculate from existing matchup data.
3. **Week-by-Week Error Chart** — Visual + comparative + roast potential ("Week 8 was a disaster for you").
4. **FLEX Analysis** — Untapped insight, great hook ("FLEX is where the sausage is made"), uses existing optimal lineup logic.

### P1 — Strong Ideas, Medium Complexity
These require new data collection or more complex analysis but have clear value:

- **Free Agent Analysis** — Need to track acquisition dates and source (draft vs FA)
- **Draft Analysis** — Need to map original draft picks to current roster
- **Coach vs GM Split** — Interesting framing, requires separating two rating systems

### P2 — Cool But Complex
High effort or UX experimentation:

- **Pokemon Card Flip** — Awesome UX idea but significant frontend work
- **Roster Strength Rankings** — Need to run optimal analysis for ALL teams
- **External Data** — Requires ESPN APIs we haven't explored yet

---

## Notes

**Prioritization criteria:**
1. Does it make content more shareable?
2. Does it increase roast potential?
3. Is it technically feasible with current ESPN API data?
4. Does it add new emotional hooks?

**What we're NOT building:** Draft tools, waiver advice, live scoring, anything requiring real-time data. This is a retrospective entertainment product.
