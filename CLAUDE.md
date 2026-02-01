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

## Project Structure

```
fantasy-football-wrapped/
├── CLAUDE.md              <- You are here (START HERE, ALWAYS)
├── backend/               <- Python Flask API (data & analysis)
│   ├── app.py            <- API routes and server config
│   ├── espn_api.py       <- ESPN Fantasy API integration
│   ├── requirements.txt  <- Python dependencies
│   ├── stats/            <- Statistical analysis modules
│   │   ├── season_analyzer.py   <- Main analysis orchestration
│   │   ├── team_calculator.py   <- Team-level statistics
│   │   ├── league_calculator.py <- League-wide statistics
│   │   ├── lineup_optimizer.py  <- Optimal lineup calculation
│   │   └── wrapped_formatter.py <- JSON formatting for frontend
│   └── utils/
│       └── helpers.py    <- Utility functions
└── frontend/              <- Web presentation layer
    ├── index.html        <- Single-page application
    └── static/
        ├── js/
        │   ├── config.js      <- Configuration constants
        │   ├── api.js         <- Backend API communication
        │   ├── utils.js       <- Utility functions
        │   ├── setup.js       <- Onboarding flow
        │   ├── slideBuilder.js <- Slide content generation
        │   ├── slideRenderer.js <- DOM rendering
        │   ├── navigation.js  <- Slide navigation
        │   └── modal.js       <- Modal dialogs
        └── css/
            ├── base.css       <- Design tokens & utilities
            ├── setup.css      <- Setup screen styles
            ├── slides.css     <- Slide styles & backgrounds
            └── animations.css <- CSS animations
```

---

## When to Read What

**Always start here** (this file). Then:

| Task | Read First |
|------|-----------|
| API changes or new endpoints | `backend/app.py` |
| ESPN data fetching issues | `backend/espn_api.py` |
| Adding new statistics | `backend/stats/season_analyzer.py` + `team_calculator.py` |
| Optimal lineup logic | `backend/stats/lineup_optimizer.py` |
| League-wide comparisons | `backend/stats/league_calculator.py` |
| Formatting wrapped output | `backend/stats/wrapped_formatter.py` |
| Adding new slides | `frontend/static/js/slideBuilder.js` |
| Slide styling/backgrounds | `frontend/static/css/slides.css` |
| Navigation or UX flow | `frontend/static/js/navigation.js` + `setup.js` |
| Configuration changes | `frontend/static/js/config.js` |
| Animation tweaks | `frontend/static/css/animations.css` |
| Modal or popup features | `frontend/static/js/modal.js` |

**Don't load everything upfront.** Read what you need when you need it. The backend stats modules are independent—only read the specific calculator you're modifying.

---

## The Product (Quick Reference)

**One-liner**: "Spotify Wrapped for Fantasy Football" — A shareable recap of your fantasy football season.

**Tagline**: "Relive your fantasy season. Roast your friends."

**Core Loop**: Enter League ID -> Select Team -> Watch Animated Presentation -> Share Results -> Roast League Mates

**Why it works**:
1. Fantasy managers are obsessed with their stats
2. "What if" scenarios (optimal lineups) create emotional engagement
3. Shareable slides = viral potential
4. End-of-season timing creates urgency and FOMO
5. Roasting friends is universal entertainment

---

## Current State

- **Stack**: Python/Flask backend + Vanilla JS frontend
- **Data Source**: ESPN Fantasy Football API (public leagues)
- **Default Season**: 2024, Weeks 1-14 (regular season)
- **Server**: localhost:5001

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

Query params: `year`, `start_week`, `end_week`

---

## External Dependencies

### ESPN Fantasy API
- Base: `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}`
- Public leagues only (no auth required)
- Query params: `view=mMatchup`, `view=mRoster`, `scoringPeriodId`

### ESPN Search API (Player Images)
- `https://site.web.api.espn.com/apis/common/v3/search?query={name}&limit=1&mode=prefix&type=player&sport=football`
- Fallback: UI Avatars API

---

## Working Together

**When implementing**: Follow existing code patterns, maintain separation between backend stats and frontend presentation, suggest performance improvements.

**When advising on product**: Be opinionated about what's shareable vs what's noise, push back on feature creep, think about viral mechanics.

**When debugging**: Start with the data flow (ESPN API -> stats modules -> formatter -> frontend), isolate which layer has the issue.

---

## Quick Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py                    # Start server on :5001

# Frontend
# Just open frontend/index.html in browser
# Or use a simple server:
cd frontend && python -m http.server 8000
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

---

## Future Ideas (Backlog)

- [ ] Private league support (ESPN cookies/SWID)
- [ ] Yahoo/Sleeper league support
- [ ] Downloadable summary image
- [ ] Head-to-head comparisons
- [ ] Historical season comparisons
- [ ] Playoff bracket analysis
- [ ] Trade analysis slides
- [ ] Sound effects and music
