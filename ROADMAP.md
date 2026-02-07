# ROADMAP.md

Living document for ideas, feedback, and priorities. Dump ideas here freely—we'll organize and prioritize as we go.

---

## Now (Active Focus)

_What we're working on right now._

- [x] **Card Pack Experience** — Collectible card pack opening with rarity tiers (SHIPPED - see index-v2.html)
- [ ] Test card pack with real league data
- [ ] Polish animations and timing
- [ ] Add more superlatives to card system
- [ ] **Weekly Deep Dive** — Week-by-week season explorer with NFL summaries, full matchup breakdowns, lineup editor, league recaps, standings, and all matchups. Magazine-style editorial experience. ([Spec: 001](spec-docs/001-weekly-deep-dive.md))

---

## Next (Up Soon)

_Queued up and ready to tackle. See prioritization rationale at bottom._

### P0 — High Impact, Ship Soon
- [ ] **League-Wide Superlatives System** — Awards for every manager (see superlatives list below)
- [ ] **Luckiest Win / Heartbreaking Loss slides** — Lowest win margin, ranked lowest but still won, multiple close losses
- [ ] **Week-by-Week Error Chart** — Visual bar chart of lineup errors across the season, league-wide "most unpredictable week"
- [ ] **FLEX Analysis Slide** — "Where the sausage is made" — your FLEX decisions and their impact

### P1 — Strong Ideas, Medium Complexity
- [ ] **Free Agent Analysis Package** — Highest scoring pickup, Practice Squad (FA who never started), most roster moves
- [ ] **Draft Analysis Package** — Roster turnover %, best late-round pickup, highest scoring draft class
- [ ] **Best Manager Metrics Refinement** — Wins cost yourself, points cost yourself, total errors
- [ ] **Coach vs GM Rating Split** — Coach = starting decisions, GM = draft + acquisitions

### P2 — Cool But Complex
- [ ] **Roster Strength Rankings** — "If everyone played optimally" → true power rankings
- [x] **Pokemon Card Flip UX** — Holographic collectible cards that flip to reveal superlatives ✅ DONE (see Card Pack Experience)
- [ ] **Position Depth Analysis** — Avg points per position, depth charts
- [ ] **Bye Week Heroes** — Who excelled when stars were on bye

---

## Later (Backlog)

_Good ideas we'll get to eventually._

### Platform Expansion
- [ ] Private league support (ESPN cookies/SWID authentication)
- [ ] Yahoo Fantasy league support
- [ ] Sleeper league support

### External Data Integration (Requires Research)
- [ ] **ESPN-Wide Start %** — Show league-wide start % for players you benched ("You benched him when 94% of managers started him")
- [ ] **Good Calls Slide** — Went against projections/consensus and it paid off
- [ ] **League vs Globe** — Your league's avg scores vs worldwide with same settings
- [ ] **Average Points Benchmarks** — How your league compares to others of same size
- [ ] **Game Highlights Integration** — Video clips of breakout performances

### New Slides & Content
- [ ] Head-to-head rivalry slides (your record vs each opponent)
- [ ] Trade analysis slides (who won each trade?)
- [ ] Playoff bracket analysis
- [ ] Historical season comparisons (if user has multiple years)
- [ ] Injury impact analysis
- [ ] Defense matchup context (who D/ST played each week)
- [ ] "Home Grown Talent" — % of starts from drafted players vs FA pickups
- [ ] "Top Heavy" — What % of your points came from top 2-3 players
- [ ] Breakout player narratives (e.g., "Trey Henderson exploded his first week after you grabbed him")

### Polish & UX
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

- Explore entire season's worth of matchups in an interactive way
- Highest ranked player at any position on your roster
- "Practice Squad" — Free agent with most attempted claims by other teams (competitive angle)
- Narrative-driven slides that tell the story of a player's arc on your team

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
