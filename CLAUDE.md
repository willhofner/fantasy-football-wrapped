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
│   │   ├── league_calculator.py <- League-wide statistics
│   │   ├── lineup_optimizer.py  <- Optimal lineup calculation
│   │   ├── wrapped_formatter.py <- JSON formatting for frontend
│   │   └── weekly_analyzer.py   <- Per-week deep dive analysis with summary generation
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
| Formatting wrapped output | `backend/stats/wrapped_formatter.py` |
| Hub/landing page | `frontend/index.html` |
| Adding new slides | `frontend/static/js/slideBuilder.js` |
| Slide styling/backgrounds | `frontend/static/css/slides.css` |
| Card pack experience | `frontend/static/js/cardBuilder.js` + `packOpening.js` |
| Arcade experience | `frontend/arcade.html` + `frontend/static/js/arcadeController.js` |
| Weekly Deep Dive experience | `frontend/weekly.html` + `frontend/static/js/weeklyController.js` + `weeklyRenderer.js` |
| Weekly Deep Dive analysis | `backend/stats/weekly_analyzer.py` |
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

**One-liner**: "Spotify Wrapped for Fantasy Football" — A shareable, roast-worthy recap of your fantasy season.

**Tagline**: "Relive your fantasy season. Roast your friends."

### What We're Really Building

An **omniscient roast machine** that knows every decision every manager made all season—and isn't afraid to call them out.

Think about it: the app has access to:
- Every roster decision (who you started, who you benched)
- Every week's optimal lineup (what you *should* have done)
- Every matchup outcome (wins you stole, losses you deserved)
- Every player's actual performance (the guy on your bench who went off)
- Every other team's decisions (so we can compare your failures to theirs)

This is **god-mode for fantasy analysis**. We see everything. And we use it to tell the story of your season—the good, the bad, and the embarrassing.

### The Emotional Core

Fantasy football is about **bragging rights and trash talk**. The product should:
1. **Celebrate your wins** — You earned them (or got lucky, we'll tell you which)
2. **Expose your mistakes** — That week you benched the league's top scorer? We remember.
3. **Fuel the group chat** — Every slide should be screenshot-and-send worthy
4. **Create "remember when" moments** — The blown lead, the miracle Monday night, the trade that looked dumb

### Core User Flow

```
Hub Page → Enter League ID → Select Your Team → Choose Experience → Watch Your Wrapped → Screenshot & Share
```

### Multi-Experience Architecture

The hub page (`frontend/index.html`) is the entry point. After setup (league ID, year, week range), users choose from:
- **Slideshow** (`slides.html`) — Original swipeable slide deck
- **Card Pack** (`pack-opening.html`) — Collectible card pack opening
- **Arcade** (`arcade.html`) — Retro arcade cabinet UI
- **Weekly Deep Dive** (`weekly.html`) — Week-by-week season explorer with matchup details, standings, and lineup editor
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

1. **Data tells the story** — Let the numbers speak, add personality through copy
2. **Shareable by default** — Every slide should be screenshot-worthy
3. **Roast-friendly** — Highlight failures as much as successes
4. **Mobile-first** — Swipe navigation, responsive layouts
5. **Ship fast** — Vanilla JS, no framework complexity
6. **ESPN-compatible** — Work with their API, don't fight it

---

## What We Are NOT Building

- A draft tool
- A waiver wire assistant
- Live scoring updates
- A fantasy advice platform
- Anything that requires real-time data

We are building a **retrospective entertainment experience**.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/league/<id>/info` | GET | League name, teams, weeks |
| `/api/league/<id>/teams` | GET | All teams and owners |
| `/api/league/<id>/analyze` | GET | Full season analysis |
| `/api/league/<id>/team/<team_id>/wrapped` | GET | Wrapped data for specific team |
| `/api/league/<id>/week/<week>/deep-dive` | GET | Weekly deep dive (matchup detail, standings, all matchups). Requires `team_id` query param. Includes `nfl_summary`, `fantasy_summary`, and `nfl_scores` in response. Supports `include_summaries=true/false` (default: true) and `force_regenerate=true/false` query params for summary control |

Query params: `year`, `start_week`, `end_week`, `team_id` (for weekly deep dive), `include_summaries` (default: true), `force_regenerate` (default: false)

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

## Parallelism & Subagent Usage (CRITICAL)

**Default to aggressive parallelism.** This project benefits massively from concurrent work. Don't do things sequentially when they can happen simultaneously.

### When to Use Subagents (Task Tool)

**Use subagents liberally.** They keep context clean, enable parallelism, and get results faster. Default to spawning subagents for:

1. **Codebase exploration** — Understanding how multiple systems work
   ```
   ❌ Sequential: Read season_analyzer.py → Read team_calculator.py → Read weekly_analyzer.py
   ✅ Parallel: Spawn 3 Explore agents simultaneously, synthesize results
   ```

2. **Multi-part investigations** — Finding patterns across the codebase
   ```
   ❌ Sequential: Grep for ESPN API calls → Grep for data formatters → Grep for error handling
   ✅ Parallel: Spawn 3 Explore agents with different search patterns
   ```

3. **Background tasks** — Long-running operations that don't need immediate results
   ```
   ❌ Blocking: Run tests, wait for results, then continue working
   ✅ Background: Spawn test agent in background, continue implementing next feature
   ```

4. **Complex research** — When the answer requires deep investigation
   ```
   ❌ Manual: Read 10+ files sequentially to understand weekly deep dive flow
   ✅ Delegated: Spawn general-purpose agent to investigate, get comprehensive report
   ```

### Parallelism Patterns to Use

**Pattern 1: Parallel Exploration**
```
User: "How does the weekly deep dive work?"

Instead of:
- Read weeklyController.js
- Read weeklyRenderer.js
- Read weekly_analyzer.py
- (takes 3+ turns sequentially)

Do:
- Spawn 3 Explore agents in parallel:
  - Agent 1: Frontend flow (weeklyController.js, weeklyRenderer.js, weekly.html)
  - Agent 2: Backend API (app.py weekly endpoint, weekly_analyzer.py)
  - Agent 3: Data structures (search for weekly data format patterns)
- Synthesize all 3 reports into comprehensive answer (1 turn)
```

**Pattern 2: Background Delegation**
```
User: "Add feature X and make sure tests pass"

Instead of:
- Implement feature X
- Run tests
- Wait for test results
- Continue

Do:
- Implement feature X
- Spawn Bash agent in background to run tests
- Start implementing next task
- Check test results when agent completes
```

**Pattern 3: Parallel File Modification**
```
User: "Update both the API and the frontend for feature Y"

If changes are independent:
- Make both changes in a single response
- Use multiple Edit/Write tool calls in parallel
- User approves once, both changes applied simultaneously
```

### Available Subagent Types

| Agent Type | When to Use | Example |
|-----------|-------------|---------|
| `Explore` | Fast codebase exploration, pattern searches | "Find all API endpoints that use ESPN data" |
| `general-purpose` | Complex research, multi-step investigations | "Understand how lineup optimization works end-to-end" |
| `Bash` | Git operations, running tests, command execution | "Run full test suite in background" |
| `Plan` | Design implementation strategy before coding | "Plan out the new feature architecture" |

### How to Trigger Maximum Parallelism

**Explicit requests:**
- "Explore this in parallel"
- "Use subagents to investigate"
- "Search multiple areas simultaneously"
- "Run this in the background while you work on X"

**Implicit opportunities (auto-detect these):**
- User asks "how does X work?" → Spawn parallel Explore agents
- User asks "find all places where Y happens" → Spawn parallel search agents
- User requests investigation + implementation → Delegate investigation, start implementation
- Long-running validation needed → Background agent while continuing work

### Concrete Examples for This Project

**Example 1: Understanding a feature**
```
User: "Explain how the pack opening animation works"

Spawn 3 Explore agents in parallel:
- Agent 1: Search for pack opening logic (packOpening.js, cardBuilder.js)
- Agent 2: Search for animation patterns (animations.css, pack-opening.css)
- Agent 3: Search for card data flow (api.js, wrapped_formatter.py)
```

**Example 2: Adding a new experience**
```
User: "Add a new 'Timeline' experience"

Parallel approach:
- Spawn Explore agent: Find patterns in existing experiences (slides, arcade, weekly)
- While agent investigates: Draft the HTML structure for timeline.html
- Synthesize agent results + draft into implementation plan
```

**Example 3: Bug investigation**
```
User: "The weekly deep dive isn't loading"

Spawn 3 Explore agents in parallel:
- Agent 1: Check API endpoint implementation (app.py, weekly_analyzer.py)
- Agent 2: Check frontend error handling (weeklyController.js, api.js)
- Agent 3: Search for similar loading patterns that work (slideBuilder.js, setup.js)
```

### Rules of Thumb

1. **More than 2 files to explore?** → Spawn parallel Explore agents
2. **Complex "how does X work" question?** → Spawn Explore agents for each subsystem
3. **Multiple independent searches needed?** → One Explore agent per search pattern
4. **Long-running validation?** → Background agent
5. **When in doubt?** → Spawn subagents. Worst case: slightly slower. Best case: 3-5x faster.

### Benefits of Aggressive Subagent Use

- **Faster results**: 3 parallel searches vs 3 sequential searches = 3x speedup
- **Cleaner context**: Research noise stays in subagent, main context stays focused
- **Better synthesis**: Seeing all results together enables better pattern recognition
- **Background work**: Don't block on long-running tasks
- **User experience**: Less waiting, more shipping

**Default stance: If the work can be parallelized, parallelize it.**

---

## Personal Preferences

- **Always use `python3`** — Never use `python` command, always `python3`
- **Always use `pip3`** — Never use `pip` command, always `pip3`
- **Git workflow simplification** — User doesn't distinguish between "merge", "ship", "push", "commit". If user says ANY of these words, it means: commit ALL changes + push to GitHub + make everything final and ready to close the tab. Don't ask which one they meant—they all mean the same thing.

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
