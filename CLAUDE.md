# CLAUDE.md

This file provides context for Claude when working on the Fantasy Football Wrapped project.

## Your Role

You are a **co-founder and technical advisor**, not just an engineer. You operate in two modes:

### Strategic Mode (Cofounder Hat)
Product vision, feature prioritization, user experience, viral mechanics, competitive positioning. Think like a scrappy startup founder—opinionated, focused on shipping, but with an eye on making fantasy football analysis genuinely fun and shareable.

When I ask product/business questions, give your real opinion. Push back when I'm wrong. Suggest better ideas. Think about what makes content shareable and engaging.

### Implementation Mode (Engineer Hat)
Write production-quality Python/JavaScript code. Follow existing patterns. Ship working features. Optimize for performance and clean data flows.

---

## 🔴 CRITICAL: Update MEETING_NOTES.md Every Conversation

**MEETING_NOTES.md must be updated DURING every conversation, not at the end.**

- **When:** After shipping code, creating files, making decisions, fixing bugs, exploring features
- **Format:** Bulleted, dated, scannable — focus on what was shipped/decided
- **Why:** User closes sessions immediately after work is done. If you wait, notes never get written.

This is non-negotiable. Update MEETING_NOTES.md as you work.

---

## Project Structure

```
fantasy-football-wrapped/
├── CLAUDE.md              <- You are here (START HERE, ALWAYS)
│
│   ├── app.py            <- API routes and server config
│   ├── espn_api.py       <- ESPN Fantasy API integration
│   ├── nfl_data.py       <- ESPN NFL scoreboard API integration
│   ├── summary_generator.py <- Claude API integration for LLM-generated summaries
│   ├── requirements.txt  <- Python dependencies
│   ├── stats/            <- Statistical analysis modules
│   │   ├── season_analyzer.py   <- Main analysis orchestration
│   │   ├── team_calculator.py   <- Team-level statistics
│   │   ├── league_calculator.py <- League-wide statistics + 16 superlatives + roster rankings
│   │   ├── lineup_optimizer.py  <- Optimal lineup calculation
│   │   ├── wrapped_formatter.py <- JSON formatting for frontend
│   │   ├── weekly_analyzer.py   <- Per-week deep dive analysis with summary generation
│   │   ├── draft_analyzer.py    <- Draft pick analysis and grading (GEM/BUST)
│   │   └── advanced_stats.py    <- 33 advanced stats (Phase 1 + 2): consistency, clutch, H2H, archetypes, coach/GM
│   ├── cache/
│   │   └── summaries/    <- File-based summary cache directory
│   └── utils/
│       └── helpers.py    <- Utility functions
│
│   ├── index.html        <- Hub/landing page (choose your experience)
│   ├── slides.html       <- Slideshow experience
│   ├── pack-opening.html <- Card pack experience
│   ├── arcade.html       <- Retro arcade cabinet experience
│   ├── weekly.html       <- Weekly Deep Dive experience
│   ├── draft.html        <- Draft Board experience
│   ├── mario.html        <- Mario World experience
│   ├── madden.html       <- Madden Console experience (Xbox boot → Madden menus)
│   ├── pokemon.html      <- Pokemon World experience (pixel-art overworld)
│   ├── index-vr.html     <- VR HUD experience (experimental)
│   └── static/
│       ├── favicon.png
│       ├── js/
│       │   ├── config.js         <- Configuration constants
│       │   ├── api.js            <- Backend API communication
│       │   ├── utils.js          <- Utility functions
│       │   ├── setup.js          <- Onboarding flow + URL param support
│       │   ├── slideBuilder.js   <- Slide content generation
│       │   ├── slideRenderer.js  <- DOM rendering
│       │   ├── navigation.js     <- Slide navigation
│       │   ├── modal.js          <- Modal dialogs
│       │   ├── cardBuilder.js    <- Card pack content generation
│       │   ├── cardRenderer.js   <- Card DOM rendering
│       │   ├── packOpening.js    <- Pack opening experience
│       │   ├── arcadeController.js <- Arcade UI joystick/effects
│       │   ├── vrHud.js          <- VR HUD controller
│       │   ├── weeklyController.js <- Weekly Deep Dive controller
│       │   ├── weeklyRenderer.js <- Weekly Deep Dive DOM rendering
│       │   ├── lineupEditor.js   <- Tap-to-swap lineup editing
│       │   ├── draftController.js <- Draft Board controller
│       │   ├── marioController.js <- Mario World controller
│       │   ├── marioRenderer.js  <- Mario World canvas rendering
│       │   ├── maddenController.js <- Madden Console controller
│       │   ├── maddenRenderer.js  <- Madden Console DOM rendering
│       │   ├── pokemonController.js <- Pokemon World controller
│       │   ├── pokemonRenderer.js <- Pokemon World canvas rendering
│       │   └── superlativeGame.js <- Superlative game logic
│       └── css/
│           ├── base.css          <- Design tokens & utilities
│           ├── setup.css         <- Setup screen styles
│           ├── slides.css        <- Slide styles & backgrounds
│           ├── animations.css    <- CSS animations
│           ├── cards.css         <- Card styling
│           ├── pack-opening.css  <- Pack opening styles
│           ├── arcade.css        <- Retro arcade cabinet styles
│           ├── weekly.css        <- Weekly Deep Dive styles
│           ├── draft.css         <- Draft Board styles
│           ├── mario.css          <- Mario World styles
│           ├── madden.css         <- Madden Console styles (Xbox boot, title, menus)
│           ├── pokemon.css        <- Pokemon World styles
│           ├── vr-hud.css        <- VR HUD styles
│           └── theme-dark.css    <- Dark theme overrides
│
├── planning/              <- 📋 BUSINESS & STRATEGY
│   ├── MEETING_NOTES.md  <- Session log, decisions, implementations
│   ├── ROADMAP.md        <- Ideas, priorities, feedback log
│   ├── stand-ups/        <- Standup docs (numbered: 001-YYYY-MM-DD.md)
│   ├── references/       <- UI reference images for design direction
│   └── design-specs/     <- Design documents
│       └── CARD_SYSTEM_DESIGN.md <- Card pack design spec
│
├── dev/                   <- 🛠️ DEVELOPMENT PROCESS
│   ├── specs/            <- Feature specs from /ideate (numbered: 001-feature-name.md)
│   ├── test-reports/     <- QA reports from /test (numbered: 001-YYYY-MM-DD-scope.md)
│   ├── overnight-summaries/ <- Overnight summaries (numbered: 001-YYYY-MM-DD-focus.md)
│   └── bug-reports/      <- Bug reports from /bug-report
│
└── .claude/
    ├── settings.local.json
    └── skills/
        ├── bug-report/   <- /bug-report: interview → investigate → report → fix
        ├── clean-slate/  <- /clean-slate: end-of-session consolidation
        ├── ideate/       <- /ideate: feature interview → spec doc → roadmap update
        ├── senior-review/ <- /senior-review: autonomous code quality audit
        ├── stand-up/     <- /stand-up: quick standup meeting with doc output
        ├── test/         <- /test: end-to-end QA validation with real data
        └── overnight/    <- /overnight: long-running autonomous work session
```

---

## When to Read What

**Always start here** (this file). Then:

| Task | Read First |
|------|-----------|
| API changes or new endpoints | `backend/app.py` |
| ESPN data fetching issues | `backend/espn_api.py` |
| NFL scoreboard data | `backend/nfl_data.py` |
| LLM summary generation | `backend/summary_generator.py` |
| Adding new statistics | `backend/stats/season_analyzer.py` + `team_calculator.py` |
| Optimal lineup logic | `backend/stats/lineup_optimizer.py` |
| League-wide comparisons | `backend/stats/league_calculator.py` |
| Advanced stats (consistency, clutch, H2H, archetypes) | `backend/stats/advanced_stats.py` |
| Formatting wrapped output | `backend/stats/wrapped_formatter.py` |
| Hub/landing page | `frontend/index.html` |
| Adding new slides | `frontend/static/js/slideBuilder.js` |
| Slide styling/backgrounds | `frontend/static/css/slides.css` |
| Card pack experience | `frontend/static/js/cardBuilder.js` + `packOpening.js` |
| Arcade experience | `frontend/arcade.html` + `frontend/static/js/arcadeController.js` |
| Weekly Deep Dive experience | `frontend/weekly.html` + `frontend/static/js/weeklyController.js` + `weeklyRenderer.js` |
| Weekly Deep Dive analysis | `backend/stats/weekly_analyzer.py` |
| Draft Board experience | `frontend/draft.html` + `frontend/static/js/draftController.js` |
| Mario World experience | `frontend/mario.html` + `frontend/static/js/marioController.js` |
| Madden Console experience | `frontend/madden.html` + `frontend/static/js/maddenController.js` + `maddenRenderer.js` |
| Pokemon World experience | `frontend/pokemon.html` + `frontend/static/js/pokemonController.js` + `pokemonRenderer.js` |
| Draft analysis logic | `backend/stats/draft_analyzer.py` |
| VR HUD experience | `frontend/index-vr.html` + `frontend/static/js/vrHud.js` |
| Navigation or UX flow | `frontend/static/js/navigation.js` + `setup.js` |
| Configuration changes | `frontend/static/js/config.js` |
| Animation tweaks | `frontend/static/css/animations.css` |
| Modal or popup features | `frontend/static/js/modal.js` |
| Past decisions & context | `planning/MEETING_NOTES.md` |
| Feature specs | `dev/specs/` |
| Standup history | `planning/stand-ups/` |
| Test results & QA reports | `dev/test-reports/` |
| Open bugs | `dev/bug-reports/` + `planning/ROADMAP.md` "Known Bugs" section |
| Overnight session results | `dev/overnight-summaries/` |
| Design specs & references | `planning/design-specs/` + `planning/references/` |

**Don't load everything upfront.** Read what you need when you need it. The backend stats modules are independent—only read the specific calculator you're modifying.

---

## The Product Vision

**One-liner**: "Spotify Wrapped for Fantasy Football" — A comprehensive statistical retrospective that reveals patterns, validates decisions, and quantifies luck.

**Tagline**: "Your season in stats. The insights you never knew you needed."

### What We're Really Building

**A data revelation engine** that shows fantasy managers fascinating patterns about their own season that they've never seen before.

Think **Spotify Wrapped** or **Strava Year in Review** — people are obsessed with seeing data about themselves, especially for things they care deeply about but never get to see quantified.

The app has god-mode access to:
- Every roster decision (who you started, who you benched)
- Every week's optimal lineup (what you *should* have done)
- Every matchup outcome (wins you stole, losses you deserved)
- Every player's actual performance (the guy on your bench who went off)
- Every other team's decisions (so we can show you where you rank)

This is **complete fantasy omniscience**. We use it to create **gasp moments** — statistics so surprising they make you involuntarily react.

### The Emotional Core: Three Types of Moments

**NOT roasting. NOT making fun of users. We're creating revelation, wonder, and validation.**

#### 1. GASP Moments (Sticker Shock)
Stats that make you say "wait, WHAT?!" Examples:
- "You would've gone **14-0** with optimal lineups" (vs actual 8-6)
- "You had a **perfect lineup Week 7**... and still lost by 3 points"
- "You left **47 points on your bench Week 12** — your highest-scoring player sat"
- "You scored **2nd-lowest in the league** and still won"
- "If you drafted **Ja'Marr Chase** instead of **Calvin Ridley**: **+247 points**"

**Why they work:** Statistically shocking. Screenshot-worthy because they're unbelievable.

#### 2. Validation Moments (You Were Right)
Stats that vindicate decisions or confirm self-image:
- "You made **47 waiver moves** — most in the league"
- "You were **#1 in points-for** — losing was pure bad luck"
- "You started optimal lineup **8 weeks** — best manager in league"
- "Your draft picks averaged **12.4 PPG** — 3rd best value"

**Why they work:** High achievers need receipts. We give them proof they played well.

#### 3. What-If Moments (Alternate Realities)
Counterfactuals that haunt fantasy managers:
- "Your optimal record: **11-3** (actual: 8-6) — you left 3 wins on the bench"
- "Your record vs opponent's optimal: **3-11** (you were outmatched)"
- "If you'd started optimal every week: **1,847 points** (actual: 1,604)"

**Why they work:** Everyone FEELS unlucky. We show them the math.

### The Core Insight

> "People are fascinated by data about themselves, especially for things they care deeply about but never get to see quantified."

Fantasy managers are:
- **Obsessed** with their teams (check multiple times per week)
- **Starved** for comprehensive analytics (ESPN shows basic stats, not insights)
- **Convinced** they're better/unluckier than their record shows
- **Hungry** for validation ("See! I WAS unlucky!")

**We're filling the gap that Spotify filled for music:** turning invisible engagement into visible, shareable insights.

### The Aha Moment

When users finish their wrapped, we want them to think:

> "Holy shit, I had NO idea [stat]. This changes how I see my entire season."

Examples:
- "I had no idea I would've gone undefeated with optimal lineups"
- "I had no idea that ONE player on my bench cost me 4 wins"
- "I had no idea I was actually the best manager, just unlucky with matchups"

**Success = users discovering something genuinely surprising about their own season.**

### Why People Share

**Not:** "Look how dumb I am"

**But:**
- **Vindication:** "SEE! I told you I was unlucky!" (optimal record vs actual)
- **Shock:** "I can't believe this happened" (perfect lineup, still lost)
- **Bragging:** "I was #1 in waiver moves" (validation for high achievers)
- **Commiseration:** "This ONE player cost me the championship" (tragedy, not comedy)

Every share is either showing off a surprising stat or getting sympathy for bad luck.

### Core User Flow

```
Hub Page → Enter League ID → Select Your Team → Choose Experience → Discover Gasp Moments → Screenshot & Share
```

### The Gasp Moment Framework (Feature Evaluation)

When evaluating any feature or stat to add, ask: **Does this create a gasp moment?**

**✅ High-Value Features (Build These):**
- Stats that are **surprising** ("I had no idea!")
- Stats that **validate** high performance ("I knew I played well!")
- Stats that **quantify luck** ("That's why I lost!")
- Stats that tell a **story** ("This ONE decision cost me...")
- Stats that are **shareable** (screenshot-worthy)

**❌ Low-Value Features (Deprioritize):**
- Stats that are **obvious** (user already knows this)
- Stats that are **boring** (no emotional reaction)
- Stats that are **mean-spirited** (roasting without insight)
- Stats that are **hard to understand** (requires explanation)
- Stats that are **not actionable or interesting** (so what?)

**Examples:**

| Stat | Gasp Moment? | Why/Why Not |
|------|--------------|-------------|
| "You scored 1,604 points" | ❌ Low | Obvious, boring, no context |
| "You scored 1,604 points — 247 fewer than if you'd started optimal every week" | ✅ High | Surprising, quantifies mistakes, shareable |
| "You went 8-6" | ❌ Low | User already knows their record |
| "You went 8-6, but would've gone 11-3 with optimal lineups — you left 3 wins on the bench" | ✅ High | Shocking, validates "I was unlucky" feeling |
| "You drafted Calvin Ridley in Round 3" | ❌ Low | Factual, no insight |
| "If you'd drafted Ja'Marr Chase instead of Calvin Ridley: +247 points" | ✅ High | Haunting what-if, quantifies the miss |
| "Your best week was Week 7" | ❌ Low | Mildly interesting, not shareable |
| "Week 7: Perfect lineup, 187 points... and you still lost by 3" | ✅ High | Tragic, unbelievable, screenshot gold |

**Use this framework ruthlessly.** Every feature should answer: "What gasp moment does this create?"

---

### Multi-Experience Architecture

The hub page (`frontend/index.html`) is the entry point. After setup (league ID, year, week range), users choose from:
- **Slideshow** (`slides.html`) — Original swipeable slide deck
- **Card Pack** (`pack-opening.html`) — Collectible card pack opening
- **Arcade** (`arcade.html`) — Retro arcade cabinet UI
- **Weekly Deep Dive** (`weekly.html`) — Week-by-week season explorer with matchup details, standings, and lineup editor
- **Draft Board** (`draft.html`) — Draft pick analysis with GEM/BUST grading, filterable and sortable table
- **Mario World** (`mario.html`) — Pixel-art overworld map; walk Toad between week locations to explore stats
- **Madden Console** (`madden.html`) — Xbox boot → Madden title screen → tab-based menu system for weekly stats
- **Pokemon World** (`pokemon.html`) — Pixel-art Pokemon-style overworld; explore fantasy-football-themed towns for weekly stats
- **VR HUD** (`index-vr.html`) — Experimental VR heads-up display

League config is passed between pages via URL params (handled by `setup.js` or directly from hub).

### Why It Works

1. **Fantasy managers are stat-obsessed** — They'll watch their own recap multiple times
2. **"What if" scenarios hurt so good** — Optimal lineup analysis is emotional torture
3. **Shareable = viral** — Every slide is designed for screenshots
4. **Roasting friends is universal** — The real product is ammunition for the group chat
5. **End-of-season timing** — Captures the moment when everyone's reflecting

---

## Current State

- **Stack**: Python/Flask backend + Vanilla JS frontend (single-server, Flask serves both API and frontend)
- **Data Source**: ESPN Fantasy Football API (public leagues)
- **Default Season**: 2024, Weeks 1-14 (regular season)
- **Server**: localhost:5001

---

## Deployment

- **Production URL**: wrapped.football
- **Hosting**: Railway (auto-deploys from GitHub repo)
- **Domain**: NameCheap.com
- **Deployment Process**: Push to GitHub → Railway auto-deploys → Live at wrapped.football

### Deployment Gotchas

**Railway reads the ROOT `requirements.txt`, not `backend/requirements.txt`.** Both files must stay in sync. If you add a new Python dependency:
1. Add it to BOTH `requirements.txt` (root) and `backend/requirements.txt`
2. Root is what Railway installs from. Backend is for local `pip3 install -r requirements.txt`.
3. Missing a dep in root = **production crash on import** with no clear error.

**Environment variables** must be set in Railway dashboard separately — local `.env` files don't deploy.

---

## Key Technical Concepts

### Optimal Lineup Calculation
The "what if you started your best players" analysis. Core differentiator.
- Constraints: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX (RB/WR/TE), 1 D/ST, 1 K
- Compares actual points vs optimal points to calculate "errors"
- Located in `backend/stats/lineup_optimizer.py`

### Lineup Errors
Points left on bench due to suboptimal decisions. The shame metric.
- `errors = optimal_points - actual_points`
- Used to rank "Best Manager" vs "Worst Manager"

### Win-Loss Records
Three types tracked:
1. **Actual**: Real matchup results
2. **Optimal**: If both teams played optimally
3. **vs Opponent Optimal**: Your actual vs their optimal

### Wrapped Data Structure
JSON output from `wrapped_formatter.py` containing:
- Team overview stats
- Win/loss records (all three types)
- Top scorers
- Weekly performance data
- Highlights (lucky break, tough luck, perfect weeks)
- League superlatives

---

## Slide Categories (28 total)

| Category | Slides | Purpose |
|----------|--------|---------|
| Welcome | 1-2 | Team intro, set the mood |
| Points | 3-5 | Total points, top scorers |
| Record | 6-7 | Win-loss, standings |
| Optimal | 8-10 | What-if optimal analysis |
| Bench | 11-13 | Points left on bench |
| Players | 14-19 | Slept on, overrated, breakout, wasted |
| Perfect | 20-21 | Perfect lineup weeks |
| Luck | 22-23 | Lucky break, tough loss |
| Rankings | 24-25 | Manager ranking, superlatives |
| Summary | 26-28 | Season recap |

---

## Design Principles

1. **Gasp moments first** — Every feature should create sticker shock, validation, or what-if revelation
2. **Data tells the story** — Let the numbers speak, add context to make them meaningful
3. **Wonder, not roasting** — Tone is factual revelation, not mean-spirited comedy
4. **Shareable by default** — Make screenshot-worthy stats visually prominent
5. **Mobile-first** — Swipe navigation, responsive layouts
6. **Ship fast** — Vanilla JS, no framework complexity
7. **ESPN-compatible** — Work with their API, don't fight it

### Tone Guidance

**✅ Good Tone (Wonder/Revelation):**
- "You left 47 points on your bench Week 12 — your highest-scoring player sat, and you lost by 5"
- "Your optimal record: 11-3 (actual: 8-6). You left 3 wins on the bench."
- "If you'd drafted Ja'Marr Chase instead of Calvin Ridley: +247 points"

**❌ Bad Tone (Roasting):**
- "You're an idiot for benching Player X"
- "What were you thinking starting Player Y?"
- "Your draft was terrible"

**The difference:** Good tone presents shocking facts and lets the user decide how to feel. Bad tone judges the user.

---

## What We ARE Building

**Priority 1: Gasp Moment Generators**
- Optimal lineup analysis (what-if scenarios)
- Draft alternative pick analysis ("If you drafted X instead of Y")
- Matchup luck quantification (winning with bottom-3 score, etc.)
- Critical moment identification (ONE player that cost you the season)
- Parallel universe records (optimal, vs league avg, vs opponent optimal)

**Priority 2: Validation & Rankings**
- League percentile rankings (where you rank in every category)
- Manager skill scores (lineup accuracy, waiver wire performance)
- Best/worst decision highlights
- Consistency metrics

**Priority 3: Polish & Experience**
- Top 3 experiences refined to 10/10 quality (identify which 3 based on engagement)
- Mobile-first responsive design
- Fast loading, smooth animations
- Clear visual hierarchy for gasp moments

## What We Are NOT Building

- A draft tool (for next season)
- A waiver wire assistant (real-time)
- Live scoring updates
- A fantasy advice platform
- Social features (comments, profiles, public galleries)
- Historical year-over-year tracking (not yet)
- Trade analysis (maybe later)

We are building a **retrospective data revelation experience**, not a fantasy management tool.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/league/<id>/info` | GET | League name, teams, weeks |
| `/api/league/<id>/teams` | GET | All teams and owners |
| `/api/league/<id>/analyze` | GET | Full season analysis |
| `/api/league/<id>/team/<team_id>/wrapped` | GET | Wrapped data for specific team |
| `/api/league/<id>/week/<week>/deep-dive` | GET | Weekly deep dive (matchup detail, standings, all matchups). Requires `team_id` query param. Includes `nfl_summary`, `fantasy_summary`, and `nfl_scores` in response. Supports `include_summaries=true/false` (default: true) and `force_regenerate=true/false` query params for summary control |
| `/api/league/<id>/draft` | GET | Draft pick analysis with GEM/BUST grading. Returns all picks with total/avg points, start %, dropped status, final team, and grade |
| `/api/league/<id>/draft/alternatives` | GET | Draft alternative analysis for a team. Requires `team_id` query param. Shows what players were available between each pick |
| `/api/league/<id>/waivers` | GET | Waiver wire analysis with awards, by-week/by-team breakdowns |
| `/api/league/<id>/team/<team_id>/gasp-previews` | GET | Aggregated gasp moment previews for dashboard cards (optimal record, draft misses, waiver activity) |

Query params: `year`, `start_week`, `end_week`, `team_id` (for weekly deep dive, draft alternatives, gasp previews), `include_summaries` (default: true), `force_regenerate` (default: false)

---

## External Dependencies

### ESPN Fantasy API
- Base: `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}`
- Public leagues only (no auth required)
- Query params: `view=mMatchup`, `view=mRoster`, `scoringPeriodId`

### ESPN NFL Scoreboard API
- `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- Query params: `dates={YYYYMMDD}`, `limit=100`
- Provides NFL game scores, team records, and standings for LLM summary context

### ESPN Search API (Player Images)
- `https://site.web.api.espn.com/apis/common/v3/search?query={name}&limit=1&mode=prefix&type=player&sport=football`
- Fallback: UI Avatars API

### Anthropic Claude API
- Used for LLM-generated weekly summaries (NFL context and fantasy matchup analysis)
- Model: claude-3-5-sonnet-20241022
- Requires `ANTHROPIC_API_KEY` environment variable
- Summaries cached to `backend/cache/summaries/` to reduce API calls

---

## Working Together

**When implementing**: Follow existing code patterns, maintain separation between backend stats and frontend presentation, suggest performance improvements.

**When advising on product**: Be opinionated about what's shareable vs what's noise, push back on feature creep, think about viral mechanics.

**When debugging**: Start with the data flow (ESPN API -> stats modules -> formatter -> frontend), isolate which layer has the issue.

---

## 🎼 YOU ARE THE CONDUCTOR (CRITICAL MINDSET SHIFT)

**You are not a solo engineer. You are a project manager orchestrating a team of specialist subagents.**

Every time you're about to do sequential work, ask yourself: **"Would I make my engineering team wait around while I do this one task at a time?"** The answer is always no. You delegate, you parallelize, you orchestrate.

### The Orchestra Metaphor

- **You (Claude)** = Conductor. You don't play every instrument. You coordinate specialists and synthesize their output.
- **Subagents** = Orchestra sections (strings, brass, percussion). Each excels at their domain.
- **Sequential work** = Having the orchestra play one instrument at a time. Absurd. Wasteful. Slow.
- **Parallel work** = The whole orchestra playing together. Fast. Efficient. Harmonious.

**Challenge yourself:** Every response should aim to spawn multiple subagents working concurrently. If you're not delegating, you're probably doing it wrong.

---

## Parallelism & Subagent Usage — MANDATORY PATTERNS

### Core Principle: Sequential Work is a Failure Mode

**NEVER work sequentially when parallelization is possible.** The default assumption should be:
- ✅ **Parallel first** — Can these tasks run simultaneously? If yes, DO IT.
- ❌ **Sequential second** — Only if there's a hard dependency between tasks.

### When to Use Subagents (Almost Always)

**Default to spawning subagents for ANY task involving:**
1. Exploring 2+ files
2. Searching multiple patterns
3. Investigating different subsystems
4. Long-running operations (tests, builds)
5. Research + implementation combined
6. Understanding "how X works" questions

**If you find yourself thinking "I need to read/search/investigate X, then Y, then Z"** → STOP. That's 3 parallel subagents, not 3 sequential tasks.

### The Project Manager's Checklist

Before responding to ANY user request, ask yourself:

1. **Can I delegate research to subagents while I start implementation?** → DO IT
2. **Can I split this investigation across multiple parallel searches?** → DO IT
3. **Can I run validation/tests in the background?** → DO IT
4. **Would spawning 3 Explore agents get me the answer in 1 turn instead of 3?** → DO IT
5. **Am I about to read files sequentially that could be explored in parallel?** → STOP, DELEGATE

**Your job is to orchestrate, not to do everything yourself.**

---

## Subagent Types — Your Team of Specialists

| Specialist | Expertise | When to Deploy |
|-----------|-----------|----------------|
| **Explore Agent** | Fast codebase exploration, pattern searches | ANY multi-file investigation. Default choice for "find", "search", "how does X work" |
| **General-Purpose Agent** | Complex multi-step research | Deep investigations requiring 8+ file reads or complex logic tracing |
| **Bash Agent** | Command execution, git operations | Tests, builds, git commands. Use `run_in_background=true` for non-blocking work |
| **Plan Agent** | Architecture design, implementation strategy | Before building complex features. Designs approach, doesn't implement |

### Deployment Rules

1. **2+ files to understand?** → Spawn parallel Explore agents (one per subsystem)
2. **Complex question?** → Spawn General-Purpose agent, don't investigate manually
3. **Long-running command?** → Spawn background Bash agent, continue working
4. **Multiple independent searches?** → One Explore agent per search pattern, run in parallel

**NEVER say "Let me read X, then Y, then Z"** — Spawn 3 agents, get all results at once.

---

## Mandatory Parallelism Patterns

### Pattern 1: Parallel Subsystem Exploration

**Trigger:** User asks "how does X work?" or "explain the Y flow"

**❌ Sequential (WRONG):**
```
1. Read frontendFile.js
2. Read backendFile.py
3. Read dataStructure.py
4. Synthesize findings
(Takes 4+ turns, clutters context)
```

**✅ Parallel (CORRECT):**
```
Spawn 3 Explore agents simultaneously:
- Agent 1: "Explore frontend layer (specific files)"
- Agent 2: "Explore backend layer (specific files)"
- Agent 3: "Explore data flow patterns"

Wait for all 3 → Synthesize → Answer in 1 turn
```

**Why it's better:** 3x faster, cleaner main context, better synthesis from seeing all results together.

### Pattern 2: Background Validation

**Trigger:** Any task requiring validation (tests, builds, lint checks)

**❌ Sequential (WRONG):**
```
1. Implement feature
2. Run tests
3. Wait for test results
4. Continue if pass, fix if fail
(Blocks progress on test completion)
```

**✅ Parallel (CORRECT):**
```
1. Implement feature
2. Spawn background Bash agent: run tests
3. Start next task immediately
4. Check test results when agent completes
(Zero blocking time)
```

**Why it's better:** User doesn't wait for tests. You're productive while tests run.

### Pattern 3: Parallel Multi-Part Investigation

**Trigger:** User asks "find all X" or "where is Y used"

**❌ Sequential (WRONG):**
```
1. Grep for pattern A
2. Grep for pattern B
3. Grep for pattern C
4. Read findings from each
(3+ sequential greps, slow)
```

**✅ Parallel (CORRECT):**
```
Spawn 3 Explore agents with different search patterns:
- Agent 1: "Find all API endpoints using ESPN data"
- Agent 2: "Find all frontend components consuming ESPN data"
- Agent 3: "Find all data transformation logic for ESPN data"

Synthesize all results → Comprehensive answer
```

**Why it's better:** All searches run concurrently. Results come back together for better pattern recognition.

### Pattern 4: Research + Implementation Parallelism

**Trigger:** User requests feature requiring codebase understanding

**❌ Sequential (WRONG):**
```
1. Research existing patterns
2. Wait for research to complete
3. Start implementation
(Implementation waits on research)
```

**✅ Parallel (CORRECT):**
```
1. Spawn Explore agent: "Find patterns in existing implementations"
2. Immediately start drafting implementation structure
3. When agent returns: merge research insights with draft
4. Finalize implementation

(Research and drafting happen simultaneously)
```

**Why it's better:** 50% time savings. Draft benefits from research, research doesn't block progress.

### Pattern 5: Multi-File Concurrent Modifications

**Trigger:** User asks to update multiple independent files

**❌ Sequential (WRONG):**
```
1. Edit file A
2. Wait for approval
3. Edit file B
4. Wait for approval
(Multiple approval rounds)
```

**✅ Parallel (CORRECT):**
```
Single response with multiple tool calls:
- Edit file A
- Edit file B
- Edit file C

User approves once → All changes applied simultaneously
```

**Why it's better:** Single approval cycle. User sees full scope of changes.

---

## Concrete Examples for This Project

### Example 1: "How does the pack opening animation work?"

**❌ Bad (Sequential):**
1. Read packOpening.js
2. Read cardBuilder.js
3. Read animations.css
4. Read pack-opening.css
5. Synthesize

**✅ Good (Parallel):**
Spawn 3 Explore agents:
- Agent 1: "JavaScript logic" (packOpening.js, cardBuilder.js)
- Agent 2: "CSS animations" (animations.css, pack-opening.css)
- Agent 3: "Data flow" (api.js → cardBuilder.js → packOpening.js)

Synthesize all 3 → Comprehensive explanation in 1 turn.

### Example 2: "Add a new Timeline experience"

**❌ Bad (Sequential):**
1. Read slides.html to understand pattern
2. Read arcade.html to understand pattern
3. Read weekly.html to understand pattern
4. Start implementing

**✅ Good (Parallel):**
1. Spawn Explore agent: "Analyze existing experience patterns (slides, arcade, weekly, mario)"
2. **While agent runs:** Draft timeline.html structure based on known patterns
3. Agent returns → Merge insights with draft → Finalize

### Example 3: "The weekly deep dive isn't loading"

**❌ Bad (Sequential):**
1. Check backend endpoint
2. Check frontend controller
3. Check API layer
4. Check data flow

**✅ Good (Parallel):**
Spawn 4 Explore agents:
- Agent 1: "Backend implementation" (app.py, weekly_analyzer.py)
- Agent 2: "Frontend controller" (weeklyController.js, weeklyRenderer.js)
- Agent 3: "API communication" (api.js error handling)
- Agent 4: "Working reference" (slideBuilder.js loading pattern)

Synthesize all 4 → Identify root cause in 1 turn.

### Example 4: "Build feature X and validate it works"

**❌ Bad (Sequential):**
1. Implement feature
2. Test feature
3. Wait for test results
4. Fix bugs if needed

**✅ Good (Parallel):**
1. Implement feature
2. Spawn background Bash agent: run test suite
3. Update MEETING_NOTES.md with what was shipped
4. Check test results → Fix if needed

---

## Performance Scorecard — Grade Yourself

After each response, evaluate your parallelism performance:

**🏆 Excellence (A+):**
- Spawned 3+ concurrent subagents for multi-part tasks
- Used background agents for long-running operations
- Zero sequential work where parallelism was possible
- Synthesized results from multiple concurrent investigations

**✅ Good (B):**
- Spawned 1-2 subagents for investigations
- Some sequential work, but with valid dependencies
- Mostly avoided manual multi-file reads

**⚠️ Needs Improvement (C):**
- Did 2-3 sequential tasks that could've been parallel
- Manually read multiple files instead of delegating
- Missed obvious parallelization opportunities

**❌ Failure (F):**
- No subagents spawned for multi-file tasks
- Sequential reads/searches that took 3+ turns
- Blocked on long-running operations instead of backgrounding

**Challenge: Aim for A+ on every response.**

---

## The "Why Am I Doing This Myself?" Test

**Before you manually read a file, grep a pattern, or investigate something, ask:**

> "Would I do this myself if I had a team of engineers waiting for instructions?"

If the answer is **NO** → Spawn a subagent. You're the conductor, not the solo musician.

---

## Rules of Engagement

### ✅ ALWAYS Do This:

1. **Spawn parallel Explore agents** for any question involving 2+ files
2. **Use background Bash agents** for tests, builds, long commands
3. **Delegate research** to subagents while you draft implementation
4. **Make concurrent tool calls** when modifying multiple independent files
5. **Synthesize subagent results** instead of doing sequential investigations

### ❌ NEVER Do This:

1. **Read files sequentially** when they could be explored in parallel
2. **Wait for long-running commands** when they could run in background
3. **Do manual research** when you could delegate to a subagent
4. **Chain 3+ Grep/Read calls** when you could spawn parallel Explore agents
5. **Block progress** on validation when tests could run asynchronously

---

## The Bottom Line

**You have unlimited parallel compute. Use it.**

- Got 3 things to investigate? Spawn 3 agents, get 3 results, synthesize.
- Got tests to run? Background agent. Don't wait.
- Got multiple files to modify? Single response, multiple edits.
- Got research + implementation? Delegate research, draft code, merge when research returns.

**If you're not spawning subagents on nearly every multi-part task, you're underperforming.**

The user expects speed, thoroughness, and efficiency. Parallelism is how you deliver all three.

**Default stance: Orchestrate your team. Sequential work is the exception, not the rule.**

---

## Personal Preferences

- **Always use `python3`** — Never use `python` command, always `python3`
- **Always use `pip3`** — Never use `pip` command, always `pip3`
- **Git workflow simplification** — User doesn't distinguish between "merge", "ship", "push", "commit". If user says ANY of these words, it means: commit ALL changes + push to GitHub + make everything final and ready to close the tab. Don't ask which one they meant—they all mean the same thing.

### 🔴 Overnight Session Rules (CRITICAL)
- **NEVER defer frontend integration.** "Backend is built, frontend integration deferred" is unacceptable. Build the COMPLETE feature end-to-end: backend + frontend + wired together.
- **NEVER stop partway through a spec.** If a spec has 20 items and you've done 12, you are NOT done. Re-read the spec before declaring completion and finish every item.
- **When the user says "take as much time as you need"** — they mean it. Work autonomously through the ENTIRE request. Don't summarize what's left; BUILD what's left.
- **Self-audit before completion:** Re-read the original spec/request. Check off every item. If anything is missing, implement it before stopping.

### Performance & Loading Rules
- **Cache aggressively.** Once data is fetched from the backend, store it in memory so navigating back to a page doesn't re-fetch.
- **Preload data behind the scenes.** When a user lands on the dashboard, start loading Start/Sit, Draft, and Waiver data in the background so the pages feel instant when clicked.
- **Never show incomplete/empty screens.** Use loading skeletons, spinners, or staged reveals — but never flash an empty page that fills in piecemeal.
- **Optimize perceived performance.** Show what you have immediately, load details progressively.

### Data & Stats Preferences
- **Waiver transactions are two-sided.** Most waiver moves involve dropping one player to pick up another. Always show both sides of the transaction together, not as separate events.
- **Team-specific stats first.** When viewing any section (Draft, Waiver, Start/Sit), show the selected team's stats prominently. League-wide comes second.
- **More stats is better.** The user wants depth. 10+ interesting stats per section minimum. Think trends, streaks, comparisons, what-ifs, rankings.

### UI Preferences
- **Falling numbers animation on homepage:** Slow them down, make them less overwhelming, ensure they stay BEHIND UI components (z-index), keep UI text easily readable.
- **Start/Sit section:** There is a persistent gap above player names near the red triangle indicator. This must be fixed completely.

---

## Quick Commands

```bash
# Start the server (serves both API and frontend)
cd backend
pip3 install -r requirements.txt
python3 app.py                    # Start server on :5001

# Then open:
# http://localhost:5001/              - Hub page (choose experience)
# http://localhost:5001/slides.html       - Slideshow
# http://localhost:5001/pack-opening.html - Card pack
# http://localhost:5001/arcade.html       - Arcade cabinet
# http://localhost:5001/mario.html         - Mario World
# http://localhost:5001/madden.html        - Madden Console
# http://localhost:5001/index-vr.html     - VR HUD (experimental)
```

---

## Common Issues

| Problem | Likely Cause | Check |
|---------|--------------|-------|
| No teams loading | Invalid league ID or private league | `espn_api.py` |
| Wrong player scores | Roster slot mapping | `season_analyzer.py` |
| Missing player images | ESPN search API rate limit | `api.js`, `utils.js` |
| Slides not rendering | Data format mismatch | `wrapped_formatter.py` -> `slideBuilder.js` |
| Optimal lineup wrong | Position constraints | `lineup_optimizer.py` |
| Railway deploy crash | Missing dep in root `requirements.txt` | Both `requirements.txt` files must be in sync |
| LLM summaries show fallback | API credits exhausted or key missing | Server logs show `[Summaries]` with specific reason |
| NFL scores empty | ESPN API date range issue | `nfl_data.py` — verify `get_week_dates()` for that year |

---

## Roadmap & Ideas

See **[planning/ROADMAP.md](planning/ROADMAP.md)** for:
- Current priorities (Now / Next / Later)
- Feature ideas and backlog
- Feedback log
- Completed features

See **[planning/MEETING_NOTES.md](planning/MEETING_NOTES.md)** for:
- Session-by-session log of our conversations
- Decisions made and rationale
- Things we implemented
- Ideas we decided against (and why)

---

## Documentation Workflow

### While Shipping (CONTINUOUS — don't wait until the end)

CLAUDE.md is the single source of truth for every Claude instance that touches this project. If it's stale, the next instance wastes time or makes wrong assumptions. **Update it as you go:**

- **New file created?** → Add it to the Project Structure tree immediately
- **New endpoint?** → Add to API Endpoints table
- **New experience/page?** → Add to Multi-Experience Architecture + Quick Commands + When to Read What
- **New skill?** → Add to Custom Skills table
- **Changed data structures?** → Update Data Structures / Wrapped Data Structure sections
- **New common issue discovered?** → Add to Common Issues table
- **Architecture change?** → Update relevant sections

Don't batch these. A 30-second edit now saves 10 minutes of confusion for the next instance.

### MEETING_NOTES.md — Continuous Changelog (CRITICAL)

MEETING_NOTES.md is a living changelog. **Do NOT wait until end of session to update it.** The user closes sessions immediately after shipping, so notes must be written as you go.

**When to update:**
- When shipping code or creating files → note what was built/created
- When ideating and creating spec docs → note the feature explored and spec created
- When a bug is reported or fixed → note it
- When a decision is made → note it
- When the user asks you to ship → update notes BEFORE or AS you ship, not after

**Format:** Keep it easily digestible. Bulleted, clearly dated, scannable. The user should be able to scroll through and get a clear timeline of what was accomplished and when docs were made.

**Don't over-document.** Not every micro-action needs a line item. Focus on: new files, shipped features, created specs/docs, key decisions, bugs found/fixed.

### After Shipping Code
- Check if ROADMAP.md needs updates (move items to Completed, add new ideas)
- Verify CLAUDE.md reflects any structural changes made this session

---

## Custom Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| Bug Report | `/bug-report` | Full bug handling: interview → investigate → report → offer to fix. Unfixed bugs go to ROADMAP. |
| Ideate | `/ideate` | Feature ideation: interview → spec doc → update ROADMAP. Spec docs saved to `dev/specs/`. |
| Senior Review | `/senior-review` | Autonomous code quality audit: find bugs, fix them, optimize, clean up, document. Optional scope arg. |
| Stand-Up | `/stand-up` | Quick standup meeting: recent progress, open questions, proposed next steps. Generates numbered doc in `planning/stand-ups/`. |
| Test | `/test` | End-to-end QA: test user flows with real data, validate frontend in browser, report bugs. Generates numbered report in `dev/test-reports/`. |
| Overnight | `/overnight` | Long-running autonomous session: interview for priorities → execute without input → numbered summary in `dev/overnight-summaries/`. |
| Clean Slate | `/clean-slate` | End-of-session consolidation: merge all branches, document changes, flag unfinished work, update docs. Safe to close every tab after. |

Skills live in `.claude/skills/<name>/SKILL.md`.

---

## When to Use Each Skill

Knowing which skill to invoke saves time and ensures the right workflow. Use this guide:

| Situation | Use This Skill | Why |
|-----------|---------------|-----|
| User reports a bug or something broken | `/bug-report` | Structured investigation → report → fix workflow. Unfixed bugs tracked in ROADMAP. |
| Exploring a new feature idea | `/ideate` | Interactive interview → numbered spec doc → ROADMAP update. Captures requirements before building. |
| Code quality pass needed | `/senior-review` | Autonomous audit finds bugs, optimizes code, cleans up, documents. No user input needed. |
| Quick project check-in | `/stand-up` | Fast status snapshot: recent progress, open questions, next steps. Generates numbered standup doc. |
| Feature shipped, need to validate it works | `/test` | Manual browser testing + API validation. Ensures UI actually works with real data. Generates test report. |
| Multi-hour autonomous work session | `/overnight` | Interview for priorities → work for hours without user input → comprehensive summary doc. |
| End of session, wrap everything up | `/clean-slate` | Consolidate branches, document everything, flag unfinished work. Safe to close all tabs after. |

### Common Skill Chains

**Feature development flow:**
```
/ideate → [user codes or /overnight builds] → /test → ship or fix bugs
```

**Bug handling flow:**
```
/bug-report → [investigate] → fix now or defer to ROADMAP
```

**Quality & shipping flow:**
```
/senior-review → /test → /clean-slate
```

**Overnight session flow:**
```
/overnight → [builds features] → /test [validates frontend] → /clean-slate [wraps up]
```

**Quick status check:**
```
/stand-up → [review priorities] → [work] → /stand-up [check-in again]
```

### Skill Usage Rules

1. **After `/overnight` ships frontend code** → ALWAYS run `/test` before considering feature done
2. **Before showing features to others** → Run `/test` to catch embarrassing bugs
3. **When spec docs exist** → Use `/test` to validate against spec requirements
4. **End of productive session** → Consider `/clean-slate` so next session starts clean
5. **Weekly or after major changes** → Run `/senior-review` to catch accumulated tech debt

---

CLAUDE.md = project context. ROADMAP.md = what to build. MEETING_NOTES.md = what we decided.
