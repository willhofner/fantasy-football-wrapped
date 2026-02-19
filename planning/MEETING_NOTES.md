# Meeting Notes

Living changelog. Reverse chronological. Bulleted and scannable.

---

## Session Log

### 2026-02-18 — Number Art: Particle system demo + denser homepage rain

**Homepage:**
- Increased golden number rain density: column spacing 48→28px, added 3-character trails, slightly more opaque

**Number Art Demo (new page):**
- Created `number-art.html` — canvas-based particle system where 600 falling digits morph into football shapes
- 8 shapes: Football, Lombardi Trophy, The Catch (Odell), Form Tackle, Goalpost, Helmet, #1 Champion, Star
- Auto-cycle mode: shapes form → scatter → reform into next shape
- Manual controls: click any shape, adjust morph speed
- Particles glow brighter when settled into shape
- Background rain effect behind the shape art
- Added route in app.py, added to "Choose a Different Vibe" modal on hub page
- Purpose: demo for choosing loading screen animations

---

### 2026-02-18 — Overnight: UI Feedback Fixes (Start/Sit, Draft, Waiver, Homepage)

**12 targeted fixes based on user QA feedback across all sections.**

**Start/Sit Section:**
- Removed duplicate "back to dashboard" button (kept fixed header one, removed inline one)
- Player headshots in rotating ticker panel enlarged 2.5x (48px → 120px)
- D/ST players now show team logos instead of generic avatars (NFL_TEAM_ABBREVS mapping + getDSTLogoUrl helper)
- D/ST logos use rounded rectangle styling instead of circular crop

**Homepage:**
- Fixed golden number rain invisible — z-index was -1 (behind bg-gradient at z-index 0), changed to z-index 1

**Draft Section:**
- Fixed subtitle showing `[object Object]` — team_map values are dicts not strings, now extracts manager_name
- Fixed all teamMap references that could produce [object Object] (subtitle, leaderboard, modal)
- Removed duplicate back-to-dashboard button, fixed remaining one to use `/` not `index.html`
- Column headers default fallback updated from 68px to 130px, added requestAnimationFrame remeasure
- Draft alternatives now filter by SAME POSITION only + limit to next 3 picks (backend rewrite)
- Position value analysis now shows draft round for best player at each position

**Waiver Section:**
- Grading curve completely reworked: now uses league-relative percentile ranking (top 15% = A, next 20% = B, etc.)
- "Diamond Finder" and "Churner" traits now use league-relative thresholds (75th percentile)
- Non-swap transactions (standalone add/drop) now use same position display format as swaps

---

### 2026-02-18 — Overnight: Full Feature Build (Waivers, Draft, Caching, Polish)

**Massive overnight session addressing 8 user priorities + 10 bonus improvements.**

**User Feedback Incorporated:**
- Updated CLAUDE.md with new preferences: never defer frontend, always finish full spec, cache aggressively, show two-sided waiver transactions, team-specific stats first, more stats is better

**Quick Fixes (Items 5, 6, 7):**
- Fixed homepage falling numbers animation: slowed speed (0.15-0.4x instead of 1x), reduced density (36px spacing vs 16px), lowered opacity (0.5 head, 0.12 trail), moved to z-index:-1, throttled to 30fps
- Fixed Start/Sit red triangle gap: reduced .player-info gap 12px→8px, removed error-indicator margin-left, tightened player-row padding and line-height, reduced h3 margin

**Major Features Shipped:**
- **Waiver two-sided transactions**: Added `_pair_transactions()` to backend — groups adds/drops by team+week, matches by position first, then by order. Returns swap/add/drop entries.
- **12 new waiver stats**: Added `_compute_advanced_stats()` — waiver MVP, most active week, best ROI (PPW), dropped too early (50+ pts after), streaming king (D/ST+K), position breakdown, early vs late season, longest hold, buyer/seller, hot hand, regret drops (100+ pts after). All returned under `advanced_stats`.
- **My Team tab (frontend)**: New tab in waiver.html, hidden unless `teamId` URL param present. Shows waiver grade (A-F), summary stats, comparison bar vs league avg, best pickup, biggest regret, full swap list.
- **Stats tab (frontend)**: New tab showing all advanced stats — stat cards, early/late bar, position breakdown bars, dropped-too-early list, regret drops list, buyer/seller breakdown.
- **Paired transaction display**: By Week and All tabs now show SWAP rows (`Dropped X -> Added Y | +pts`) instead of separate ADD/DROP rows.
- **Team highlighting**: When `teamId` is present, user's team rows get subtle accent border across all tabs.

**Major Features Shipped (continued):**
- **Draft alternatives UI + Insights tab**: New "Insights" tab on Draft Board. Shows draft alternatives (who you could have picked), pick value over expected chart, draft grade leaderboard across all teams, loyalty stats. 12 new draft stats total.
- **Data caching system**: `dataCache.js` — in-memory + sessionStorage caching. Dashboard preloads all 3 pillar APIs in background. Revisiting pages is instant.
- **Spec 007 items completed**: One-player-away display in weekly matchup detail, back-to-dashboard nav on all experience pages, dynamic week range from ESPN API, gasp preview cards on dashboard
- **Loading skeletons**: Replaced spinners with loading skeletons across all experiences

**10 Bonus Improvements (Session 2):**
1. **Year defaults fixed**: All controllers (weekly, draft, waiver) changed from `2024` to `2025` as default fallback
2. **Falling number speed reset bug**: Numbers recycling at canvas bottom reset to fast speed — fixed to maintain slow speed
3. **Season record tracker**: New persistent bar in weekly header showing running W-L record + streak (e.g., "8-6 | 3W streak")
4. **Perfect lineup loss banner**: Purple banner in weekly deep dive when user started optimal lineup but still lost ("Nothing you could have done")
5. **Draft grade leaderboard**: All teams ranked by draft grade with total points bar chart in Insights tab
6. **Waiver grade leaderboard**: All teams ranked by computed waiver grade with activity bar in Stats tab
7. **Dashboard points-left-on-bench gasp**: Enhanced gasp preview to show total points left on bench (e.g., "234 points left on your bench")
8. **Draft value over expected chart**: Per-pick bar chart showing points vs round average with diff indicator
9. **Waiver manager profiles**: Personality traits per team (Churner, Diamond Finder, Hoarder, Streamer, etc.)
10. **Mobile responsive fixes**: All new components (leaderboards, profiles, banners, record tracker) have mobile breakpoints

---

### 2026-02-18 — Overnight: 3-Pillar UX Revamp + Gasp Moment Stats

**Major overnight session. Restructured the entire app around 3 pillars with new gasp moment features.**

**Phase 1: UX Revamp**
- Rewrote `frontend/index.html` — premium 3-stage animated entry flow (league ID → team selection → 3-pillar dashboard)
- 3D card hover effects with `translateZ`, cascade entrance animations, animated gradient background
- Smart team name display: shows manager name as primary when no custom team name set (handles "Team N" fallback)
- "Choose a Different Vibe" modal for 7 secondary experiences (slides, cards, arcade, mario, madden, pokemon, VR)
- Dynamic week range from ESPN API `final_week` — no more hardcoded 14
- Updated default year to 2025 in `config.js` and `app.py`
- Added "← Back to Dashboard" navigation to all experience pages (weekly, draft, waiver, mario, madden, pokemon) preserving URL params
- Fixed waiver page hardcoded year 2024 → 2025

**Phase 2: New Gasp Moment Features (Backend)**
- `calculate_draft_alternatives()` in `draft_analyzer.py` — finds all players taken between your picks that outscored yours. Biggest miss: Jayden Daniels → could have had Jonathan Taylor (+207.82 pts)
- `find_one_player_away_losses()` in `weekly_analyzer.py` — identifies losses that ONE bench→starter swap would have flipped. FLEX-aware via `_swap_compatible()` helper
- `detect_undefeated_optimal()` in `team_calculator.py` — compares optimal vs actual record, calculates wins left on bench
- `detect_perfect_lineup_losses()` in `team_calculator.py` — finds weeks with perfect lineup that still lost (ultimate bad luck)
- **Gasp preview endpoint** (`/api/league/<id>/team/<team_id>/gasp-previews`) — aggregates all gasp data for dashboard cards

**New API Endpoints:**
- `GET /api/league/<id>/draft/alternatives?team_id=N` — draft alternatives analysis
- `GET /api/league/<id>/team/<team_id>/gasp-previews` — dashboard gasp previews

**Tested all with real league data (17810260, 2025). All endpoints returning correct data.**

---

### 2026-02-18 — Team Name Map Migration: All Backend Consumers Updated

**Migrated all backend consumers of `get_team_name_map()` to handle the new dict format.**

`get_team_name_map()` now returns `{team_id: {"team_name": "...", "manager_name": "..."}}` instead of `{team_id: "string"}`.

**Files updated (6 total):**
- `backend/stats/league_calculator.py` — Added `_tm()` helper, replaced 5 `.get()` calls
- `backend/stats/wrapped_formatter.py` — Added `_tm()` helper, replaced `.get()` calls, added `team_info` field (full dict) alongside backward-compat `team_names` (string map)
- `backend/stats/weekly_analyzer.py` — Added `_tm()` helper, replaced 3 `.get()` calls (analyze_week + calculate_standings)
- `backend/stats/waiver_analyzer.py` — Added `_tm()` helper, replaced 11 `.get()` calls throughout (awards, summaries, transactions)
- `backend/stats/draft_analyzer.py` — Added `_tm()` helper, updated internal `team_map` construction to new format (now extracts `location + nickname`), replaced 3 `.get()` calls
- `backend/app.py` — Updated `/api/league/<id>/teams` endpoint to return `team_name` + `manager_name` fields

**Approach:** Copied a private `_tm()` helper into each stats file (6 lines, avoids import path issues). Handles both old string and new dict formats for backward compat.

---

### 2026-02-17 — Spec 007 Full Rewrite: 3-Pillar UX Revamp

**Reviewed codebase, identified what's already built, rewrote spec from scratch.**

**Codebase review findings:**
- Draft Board: fully built. ESPN `mDraftDetail` view integrated. Has pick order, points, grades, synopses. Draft alternatives is purely additive — NOT blocked.
- Waiver Bot: fully built. 8 awards, by-week/by-team breakdowns, transaction reconstruction from roster diffs. Solid waiver pillar foundation.
- Weekly Deep Dive: substantial. Optimal lineups, errors, standings, AI summaries. FLEX handled correctly. Missing: "one player away" and "perfect lineup loss."
- Hub: 10 flat experiences, no hierarchy. `final_week` from ESPN API exists but is never used (hardcoded 14).
- `get_team_name_map()` only returns owner names. ESPN provides team `location + nickname` fields too.

**Key product decisions:**
- Chrome extension **deprioritized** to future sprint
- UX restructured around 3 pillars: Start/Sit (Weekly), Draft (Draft Board), Waiver (Waiver Bot)
- Other 7 experiences move to "Choose a Different Vibe" modal
- Premium animated entry flow: league ID → team selection → 3-tab dashboard
- 3D card hover effects (translateZ + shadow) throughout
- Draft alternatives: compare against full round (N-1 picks) not just next 3
- One Player Away must handle FLEX correctly via `positions_compatible()`
- Dynamic season length from ESPN `matchupPeriodCount` (no more hardcoded 14)
- Default year changed from 2024 → 2025
- Team names + manager names (new `get_team_name_map()` return format — breaking change)

**Spec rewritten:** `dev/specs/007-ui-revamp.md` — ready for overnight implementation (Phase 1: UX + Phase 2: Stats)

---

### 2026-02-16 — Spec Created: 3-Pillar UX + ESPN Chrome Extension

**Created comprehensive overnight spec** for the next major phase of development.

**ESPN Authentication Decision:**
- ❌ Rejected manual cookie input (poor UX)
- ✅ Approved Chrome extension approach (best UX, matches competitors like FantasyPros)
- Investigated direct ESPN login (headless browser) — deferred due to complexity/security concerns

**3-Pillar Framework Finalized:**
1. **📊 Weekly Performance** — Start/sit analysis, optimal lineups, bench errors
2. **🎯 Draft Report Card** — Alternative pick analysis, biggest misses, value picks
3. **🔄 Waiver Wire Mastery** — Move count, pickups impact, league ranking

**Spec Created:** `dev/specs/002-3-pillar-ux-espn-auth.md`
- Chrome extension implementation (manifest v3, cookie extraction, league sync)
- Backend changes to accept espn_s2 + SWID cookies
- 3-pillar hub redesign with gasp moment preview cards
- Draft alternative picks: "If you drafted X instead of Y: +247 points" (next 3 picks only)
- Key gasp moment features: One Player Away, Undefeated with Optimal, Perfect Lineup Loss
- Testing strategy and success criteria

**Draft Analysis Refinement:**
- Focus on next ~3 picks after each selection (realistic alternatives)
- Don't show late-round sleepers (meaningless noise)
- User's hypothesis: "Those were on your radar at the time"

**Todo List Updated (14 tasks):**
- Chrome extension build + submission
- ESPN cookie backend integration
- 3-pillar hub design + gasp preview API
- Draft alternatives feature
- Gasp moment detectors (One Player Away, Undefeated Optimal, Perfect Loss)
- Mobile testing + Chrome Web Store submission

**Next Step:** Pass spec to overnight agent for implementation.

---

### 2026-02-16 — Spec Reprioritized: Product First, Access Expansion Later

**User directive:** Focus on product improvements (draft alternatives, gasp moments, 3-pillar UX) **before** tackling ESPN auth.

**Revised Implementation Plan:**

**Phase 1 (HIGHEST PRIORITY):** Draft Alternative Pick Analysis
- Build calculator for next 3 picks after each selection
- Add API endpoint for alternatives
- Update Draft Board with expandable alternatives column
- Add "Biggest Draft Miss" slide to slideshow

**Phase 2:** Key Gasp Moment Features
- One Player Away analysis (weeks lost by ONE bench swap)
- Undefeated with Optimal flag (14-0 in alternate universe)
- Perfect Lineup Loss detection (perfect week but still lost)
- Integrate all three into slideshow + experiences

**Phase 3:** 3-Pillar Hub Redesign
- Gasp moment preview cards for Weekly/Draft/Waiver
- Secondary carousel for themed experiences
- Mobile-responsive layout

**Phase 4 (OPTIONAL):** Weekly Experience Consolidation
- Decide: merge Weekly Deep Dive + Filing Cabinet, or keep both

**Phase 5 (DEFERRED):** Chrome Extension for ESPN Auth
- Fully spec'd but deferred until Phases 1-3 are complete
- Will unlock private league access after core product is polished

**Rationale:** Better to have a killer product for public leagues than a mediocre product for all leagues.

**Spec Updated:** `dev/specs/002-3-pillar-ux-espn-auth.md` now reflects new priority order.

**Todo List Updated (14 tasks):**
- Draft alternatives (highest priority)
- Gasp moment features
- 3-pillar hub redesign
- Chrome extension marked as [DEFERRED]

**Next Step:** Ready for overnight agent to execute Phases 1-3.

---

### 2026-02-16 — Vision Refinement: Gasp Moments Over Roasting

**Major vision clarification conversation** that fundamentally reframed the entire product direction.

**Key Insight:** The product is NOT about roasting users. It's about **data revelation** — like Spotify Wrapped or Strava Year in Review. People love seeing fascinating statistics about themselves, especially for things they care deeply about but never get to see quantified.

**The Three Emotional Payoffs:**
1. **GASP Moments** (sticker shock) — "You would've gone 14-0 with optimal lineups"
2. **Validation Moments** (you were right) — "You were #1 in points-for, losing was bad luck"
3. **What-If Moments** (alternate realities) — "If you drafted Chase instead of Ridley: +247 points"

**Tone Shift:**
- ❌ OLD: "You're an idiot for benching Player X" (roasting, judgmental)
- ✅ NEW: "You left 47 points on bench Week 12 and lost by 5" (factual revelation)

**Changes to CLAUDE.md:**
- Completely rewrote "The Product Vision" section with corrected emotional core
- Added **"The Gasp Moment Framework"** — feature evaluation rubric based on whether it creates sticker shock/validation/what-if
- Added **tone guidance** with good/bad examples
- Updated Design Principles to prioritize "gasp moments first" and "wonder, not roasting"
- Clarified "What We ARE Building" vs "What We Are NOT Building" with priorities

**Todo List Created (27 tasks):**
- Audit slide copy for roast tone → rewrite to wonder/revelation
- Build missing gasp moment features: "One Player Away" analysis, "Undefeated with Optimal" flag, matchup luck, percentile rankings
- Enhance Draft Board with "Alternative Pick" analysis (biggest feature identified: "If you drafted X instead of Y: +247 points")
- Add Critical Moments section, Parallel Universe Records, enhanced luck quantification
- Polish top 3 experiences, improve shareability, add narrative context to stats

**Product Clarity Achieved:** Future Claude instances should now understand we're building a **data revelation engine**, not a roast machine. Every feature must answer: "What gasp moment does this create?"

---

### 2026-02-15 — CLAUDE.md Enhancement: Conductor/Orchestrator Mindset

**Major rewrite of parallelism section** to challenge Claude instances to behave like a project manager orchestrating subagents, not a solo engineer.

**Changes to CLAUDE.md:**
- Added **"🎼 YOU ARE THE CONDUCTOR"** section with orchestra metaphor — frames Claude as conductor coordinating specialist subagents, not solo musician
- Completely rewrote parallelism patterns with much stronger, imperative language:
  - "Sequential work is a failure mode"
  - "NEVER work sequentially when parallelization is possible"
  - "If you're not spawning subagents on nearly every multi-part task, you're underperforming"
- Added **"The Project Manager's Checklist"** — 5 questions to ask before every response
- Added **"Performance Scorecard"** — A+/B/C/F grading system for self-evaluation after each response
- Added **"The Why Am I Doing This Myself? Test"** — challenge to delegate instead of doing manually
- Expanded examples with more aggressive ❌/✅ comparisons
- Added **"Rules of Engagement"** section with explicit ALWAYS/NEVER lists
- Strengthened language throughout: "MANDATORY PATTERNS", "Default assumption", "Challenge yourself"

**Goal:** Push Claude instances to maximize parallelism, think like an orchestrator with a team of specialists, and treat sequential work as the exception rather than the rule.

---

### 2026-02-11 — Overnight Session Part 2: Loading Screens, Waiver Bot, Filing Cabinet

Continuation of overnight session after context ran out. Completed remaining tasks from the 7-area overnight spec.

**Loading Screen Customization (ALL experiences):**
- Added tagline cycling infrastructure to `setup.js` — `_startSetupTaglineCycle()` / `_stopSetupTaglineCycle()` with 2.5s interval and fade transitions
- Default taglines for slides/pack-opening/arcade: "Analyzing 1,000+ roster decisions...", "Calculating your biggest mistakes...", etc.
- Page-specific overrides via `window.SETUP_TAGLINES` set before `setup.js` loads:
  - Pack Opening: card-themed ("Shuffling the deck...", "Minting holographic cards...")
  - Arcade: ALL CAPS retro ("INSERTING QUARTERS...", "WARMING UP THE CRT...")
- Enhanced existing tagline arrays for Mario (+7), Madden (+6), Pokemon (+7)
- Updated `slides.html`, `pack-opening.html`, `arcade.html` with `id="setupLoadingTagline"` on step4 `<p>` tags

**NEW: Waiver Bot Experience (full build):**
- **Backend:** `backend/stats/waiver_analyzer.py` — Derives transactions from week-over-week roster diffs (ESPN doesn't expose transaction history for public leagues). Computes 7 awards: Journeyman, Waiver Hawk, Diamond in the Rough, Tinkerer, Set and Forget, Revolving Door, Graveyard, plus Flipped count
- **API:** `/api/league/<id>/waivers` endpoint with year, start_week, end_week params
- **Frontend:** `frontend/waiver.html` + `waiver.css` + `waiverController.js` — Dark theme, 4 tabs (Awards, By Week, By Team, All Transactions), type-colored badges (ADD/DROP/TRADE), team cards with top pickups
- Added to hub page (`index.html`)

**NEW: Filing Cabinet Experience (full build):**
- **Frontend:** `frontend/filing-cabinet.html` + `filing-cabinet.css` + `filingCabinetController.js`
- Detective/office aesthetic: wood desk, metal cabinet drawer, manila folder tabs, paper pages with red margin lines, paperclip decoration, typewriter font
- Uses weekly deep-dive API (`/api/league/<id>/week/<week>/deep-dive`) — same backend as Weekly Deep Dive
- Folder tabs show W/L and scores per week; clicking opens manila folder overlay with matchup report, lineups, bench, standings, other matchups
- Added `/filing-cabinet.html` route to `app.py` and hub page entry

**Files created:**
- `frontend/waiver.html`, `frontend/static/css/waiver.css`, `frontend/static/js/waiverController.js`
- `backend/stats/waiver_analyzer.py`
- `frontend/filing-cabinet.html`, `frontend/static/css/filing-cabinet.css`, `frontend/static/js/filingCabinetController.js`

**Files modified:**
- `backend/app.py` — Added waiver + filing-cabinet routes and API endpoint
- `frontend/index.html` — Added Waiver Bot + Filing Cabinet to hub
- `frontend/static/js/setup.js` — Tagline cycling infrastructure
- `frontend/slides.html`, `frontend/pack-opening.html`, `frontend/arcade.html` — Loading tagline IDs
- `frontend/static/js/marioController.js`, `maddenController.js`, `pokemonController.js` — Enhanced tagline arrays

---

### 2026-02-11 — Draft Board V2: Major Feature Overhaul

- **5-star grading system:** Replaced simple GEM/BUST with 0.5-5.0 star scale. Formula factors: expected value by round, positional ranking, BYE-adjusted start %, dropped penalty. Stars displayed as filled/half/empty star characters with GEM/BUST labels on extremes only (5.0 and 1.0).
- **BYE week adjustment:** Start % and avg points now account for player BYE weeks. Detects BYEs by checking weeks where player scored 0 and was not started by any team, or was absent but rostered in adjacent weeks.
- **League draft grades (A+ to F):** Each team graded on composite: 50% total points (normalized), 30% avg stars, 20% gem-bust ratio. Displayed in summary cards and team modal.
- **Position group grades:** Each team graded per position (QB, RB, WR, TE, K, D/ST) relative to league averages. Displayed in modal as grid of grade cards.
- **Clickable team roster modals:** Click any team name in the table to open a modal with: draft grade, LLM synopsis, best/worst pick highlights, position group grades grid, full pick list with star ratings. Close via X button, click-outside, or Escape key.
- **Visual round separators:** When sorted by pick order (default), styled separator rows ("-- Round 2 --") appear between rounds with amber accent styling.
- **LLM draft synopses:** 2-sentence AI-generated analysis per team highlighting best/worst picks. Uses Claude API with file-based caching. Falls back to template text when API unavailable.
- **Poacher detection:** Tracks which managers picked up 2+ players originally drafted by the same other manager. Data included in API response.
- **Sticky header fix:** Replaced hardcoded `top: 80px` with CSS variable `--draft-header-height` that JS measures and sets dynamically after render. Header padding reduced from 20px to 16px.
- **Grade column sortable:** Stars column now sortable in the table header.
- **Summary cards updated:** New "Your Draft Grade" card with large amber letter grade. Best value and worst pick cards now show star ratings.
- **Files modified:**
  - `backend/stats/draft_analyzer.py` — Major rewrite: BYE detection, star grading, team grades, position grades, poacher detection, LLM synopses with caching
  - `backend/app.py` — Draft endpoint returns new fields: team_grades, position_grades, poachers, team_synopses
  - `frontend/static/js/draftController.js` — Major rewrite: star rendering, round separators, team modal, dynamic header measurement, new state fields
  - `frontend/static/css/draft.css` — Added: star ratings, round separators, team modal with all sub-components, grade-card style, team-link clickable style, CSS variable for header height
  - `frontend/draft.html` — Grade column now sortable

---

### 2026-02-11 — Mario World: Sprint Mechanic + Wii-era Realism Overhaul

- **Sprint mechanic:** Hold Space bar to sprint at 3.5x speed (normal: 1.5). Emits dust particles behind Toad while running, bigger/more frequent dust clouds when sprinting. isSprinting state tracked in controller.
- **Particle system:** Full particle engine with 4 types: dust clouds (walking/sprinting), sparkles (near location buildings), falling leaves (from trees), and water ripples (at shorelines). Particles have physics (velocity, gravity/sway), alpha fade-out, and are capped at 200 for performance.
- **Depth sorting:** All drawable objects (trees, buildings, NPCs, player, butterflies, dandelion seeds) are Y-sorted each frame so Toad properly walks behind/in front of objects. Replaced flat layer-by-layer rendering with unified depth-sorted draw pass.
- **Parallax mountains:** Distant mountain/hill silhouette layer behind clouds, scrolls at 0.5x camera speed. Taller mountains have pixel-art snow caps. Adds real depth to the scene.
- **Tree shadows:** All trees and bushes now cast dark ellipse ground shadows beneath them. Palm tree fronds now sway with 4 independent organic phases per tree (front/back/left/right fronds move differently). Added trunk segmentation detail and drooping frond tips.
- **Ambient creatures:** 3-5 butterflies flutter around randomly with wing-flap animation and direction changes. 8 dandelion seeds drift across the map with gentle sway. Both are depth-sorted with world objects.
- **Improved water:** Animated shimmer/reflection highlights move across water surfaces. Foam lines appear at water-to-land tile boundaries with gentle wave motion.
- **Atmospheric lighting:** Screen-space vignette (radial gradient darker at edges). Subtle blue tint around water tiles. Warm orange glow around lava tiles.
- **Building improvements:** All location buildings now have ground shadows. Sparkle particles emit near buildings periodically.
- **Files modified:**
  - `frontend/static/js/marioController.js` — Sprint mechanic (Space key tracking, speed toggle, dust particle emission)
  - `frontend/static/js/marioRenderer.js` — Major additions: particle system, depth sorting, parallax mountains, ambient creatures, water effects, atmospheric lighting, tree shadows, improved palm trees (grew from 1660 to 2383 lines)

---

### 2026-02-11 — Pokemon World V2: Full Gameboy Overhaul

- **Major overhaul: Pokemon World experience** rewritten from scratch to feel like authentic Pokemon Red/Blue on the Gameboy Color
- **True grid-based movement:** Player snaps to tile grid, one tile per step, 4-directional only (up/down/left/right). Smooth interpolation between tiles for walk animation. Step counter tracks movement.
- **Proper collision detection:** Trees, buildings, water, rocks, fences, mountains, caves all block movement. Only grass, paths, bridges, doors, sand, snow, flowers, signs, ledges are walkable. NPC positions also block.
- **NPC system:** 1-2 NPCs placed per town with 4-directional sprites. Face player when interacted. Context-aware dialogue: win/loss-specific, margin-specific, and generic fantasy football commentary. Displayed in Pokemon-style text box with typewriter animation.
- **Pokemon battle system:** Walking onto a door tile triggers fade-to-black transition into battle screen. Shows "Wild [OPPONENT] appeared!" with HP bars, monster sprites. Auto-plays attacks using actual starter performances as "moves" (SPLASH for <5 pts, HYPER BEAM for 30+). HP bars animate down. Shake effect on hit. Shows win/loss result with actual scores. Press ENTER after battle to see full stats overlay.
- **Gameboy Color palette:** Entire rendering switched to authentic blue-tint 4-color palette (#C4D8F8, #6890B8, #305878, #081820) with green alternate for grass areas (#88C070, #346856). All tiles, sprites, text boxes, battle screen use this palette.
- **START menu:** Press ESC/X to open Pokemon-style menu on right side of screen with POKeDEX (season stats), POKeMON (team roster), BAG (week data), SAVE (joke), EXIT options. Arrow keys navigate, Z/Enter selects.
- **Text box system:** Canvas-rendered double-bordered text box at bottom 30% of screen. Typewriter text animation at 1 char/frame. Blinking triangle advance indicator. Press Z/Enter to fast-forward or dismiss.
- **Screen transitions:** Fade-to-black transitions between overworld and battle screen, with callback-based state switching.
- **Location banners:** Pokemon-style location name appears when entering a new town area.
- **Controls updated:** Z = Action/Interact/Advance text, X/ESC = START menu, Arrow keys = Grid movement, Enter also works for action
- **All existing features preserved:** API integration, stats overlay, team selection, loading screen, HUD, background week data prefetch, touch support
- **Files modified:**
  - `frontend/static/js/pokemonRenderer.js` — Complete rewrite: GB palette, grid rendering, NPC sprites (villager + trainer types), battle screen renderer with HP bars/monster sprites/move menu, text box renderer, location banner, screen transitions, START menu renderer
  - `frontend/static/js/pokemonController.js` — Complete rewrite: Grid-based step movement, interaction system (face NPC/sign/door), text box state machine with typewriter, battle state machine (intro -> fighting -> result -> done), START menu with 5 options, input routing by game mode
  - `frontend/static/css/pokemon.css` — Restyled entirely with GB Color palette CSS variables, all UI elements use --gb-lightest/light/dark/darkest
  - `frontend/pokemon.html` — Updated HUD controls hint, prompt text for new Z/X keybinds

---

### 2026-02-11 — Game Experience Overhauls (Feedback-Driven)

- **Overnight spec created:** `dev/overnight-summaries/007-2026-02-11-game-experience-overhauls.md` — Documents all user feedback and implementation plan
- **Bug fix: Mario/Pokemon popup X button overlap** — Added right padding to `.stats-nav` so the close (X) button no longer overlaps the Next Week navigation button. Fixed in both `mario.css` and `pokemon.css`.
- **Mario World overhaul (SHIPPED):**
  - Complete rewrite of `marioRenderer.js` (1660 lines) and `marioController.js` (391 lines)
  - **Free-roam movement:** Removed path attraction system. Player moves freely with WASD/arrows. Collision detection against tile-based collision map blocks water, trees, rocks.
  - **Island hub world:** Procedurally generated island surrounded by ocean. Uses value noise for organic coastline. 100x70 tile map with 12 tile types (deep water, water, sand, grass, dark grass, path, bridge, stone, lava, snow, dirt, flower grass).
  - **14 themed biomes:** Each week location has a unique biome patch (desert for Dry Bones Desert, dark grass for haunted areas, stone for fortresses, flowers for Peach's Garden, etc.)
  - **Path network:** Bresenham-style paths carved between locations with 3-tile width. Bridges auto-placed over water crossings.
  - **8 NPC characters:** Mario, Luigi, Peach, Toadette, Yoshi, DK, Bowser, Wario placed around the island as static sprites with idle bob animation and name labels.
  - **Accurate Toad sprite:** White mushroom cap with 3 red spots (left, right, top center), rosy cheeks, blue vest with gold buttons, white diaper-like shorts, brown shoes with darker soles. Direction-dependent eyes with pupils, walking leg animation, arm swing.
  - **Environmental animations:** Animated water tiles with sine-wave color shifts, parallax cloud layer (15 clouds at different speeds), swaying palm tree fronds, flickering haunted house windows, floating ghosts, animated waterfalls, pulsing lava, gold mine sparkles.
  - **Collision system:** `isWalkable(px, py)` and `isWalkableRect(px, py, hw, hh)` check tile collision map. Controller uses axis-separated collision (slide along walls). Player hitbox is 8x8px centered on feet.
  - **Preserved:** All API integration, overlay system, team selection, HUD, touch controls, week data prefetching.
  - Reference: `planning/references/mario_super_sluggers_ui.jpg`
- **Pokemon World overhaul (in progress):**
  - Adding true grid-based movement (tile-snapping, 4-directional)
  - Adding proper collision detection (walls, water, trees block movement)
  - Adding NPC interaction system with Pokemon-style text boxes (typewriter effect)
  - Adding Pokemon battle simulation for weekly matchups
  - Adding START menu system
  - Matching Gameboy Color aesthetic/palette
  - Reference: `planning/references/pokemon_gameboy_ui.webp`
- **Madden Console overhaul (SHIPPED):**
  - Complete redesign to match Madden 25 for Xbox aesthetic
  - **Xbox boot sequence:** Replaced simple X bars with proper SVG sphere (curved crossing strokes inside circle with glow/pulse). Green glow animation, thin loading bar.
  - **Title screen:** Added EA SPORTS badge, dramatic light rays on backdrop, gold year badge (solid background), more particles.
  - **HOME tab = Stadium Overview (3-column layout):** Left panel with owner photo/initials, stats table (LVL/RTG format like Parking/Team Store in Madden), total points as "Available Funds", fan feedback quote. Center panel with team header, rating badges (Rating/Grade/Record), weekly performance bar chart (green=W, red=L, clickable), Madden-style action buttons (VIEW WEEK, FULL SEASON, LEAGUE STANDINGS). Right panel with @Mentions social feed auto-generated from season highlights (best week, worst week, streaks, blowouts, close games).
  - **Standings:** Rank numbers in colored circles, striped rows, bold uppercase team names.
  - **Controller bar:** Xbox A/B/X/Y button circles (colored: green/red/blue/yellow) instead of plain kbd badges.
  - **Top bar:** "STADIUM OVERVIEW" header (changes per tab), owner info, EA SPORTS branding.
  - **Color system:** Darker base (#0a0a0f), new surface/card hierarchy, --madden-accent-red (#C41E3A), --madden-border-light.
  - **Typography:** font-weight: 900, font-style: italic for headers throughout.
  - **Files modified:** `madden.html`, `madden.css` (complete rewrite), `maddenRenderer.js` (complete rewrite), `maddenController.js` (minor update to use new renderer).
  - Reference: `planning/references/madden25_ui.webp`

---

### 2026-02-10 — Pokemon World Experience (New)

- **New experience:** Built complete "Pokemon World" experience — a canvas-rendered pixel-art overworld inspired by Pokemon Red/Blue where the user plays as a Pokemon trainer exploring a Kanto-style map with 14 themed locations, one per week of the fantasy season.
- **Files created:**
  - `frontend/pokemon.html` — Main HTML page with team selection (pokeball-themed), loading screen with spinning pokeball, error screen, canvas, HUD, stats overlay
  - `frontend/static/css/pokemon.css` — Full Pokemon-themed styling: red/blue/yellow color scheme, Press Start 2P pixel font, pokeball loading animation, blue-bordered UI elements, stats overlay with Pokemon color palette
  - `frontend/static/js/pokemonRenderer.js` — Canvas rendering with full tile map system: 20 tile types (grass, tall grass, water, trees, buildings, roofs, doors, fences, flowers, sand, rock, snow, cave, bridge, mountain), procedural 100x70 map generation, L-shaped path routing between locations, themed town generation for each location, animated water/grass tiles, Pokemon trainer sprite (Red-style with hat, jacket, jeans) with 4-direction walk animation, camera system
  - `frontend/static/js/pokemonController.js` — Game logic: URL param parsing, team selection flow, WASD/arrow key movement with path attraction, location proximity detection, stats overlay with full weekly deep dive data (matchup scores, lineup errors, standings, NFL scores, league recap), background data prefetch, touch support for mobile
- **Files modified:**
  - `frontend/index.html` — Added Pokemon World as 8th experience option with lightning bolt icon and red-to-yellow gradient
  - `backend/app.py` — Added Flask routes for both `/pokemon.html` and `/madden.html` (madden route was also missing)
- **14 Pokemon-themed locations:** Pallet Town, Viridian City, Pewter City, Cerulean City, Vermilion City, Lavender Town, Celadon City, Fuchsia City, Saffron City, Cinnabar Island, Seafoam Islands, Victory Road, Indigo Plateau, Pokemon League
- **Tile map features:** Each town has unique decorations matching its theme (water tiles near Cerulean, rocks near Pewter, flowers near Celadon, snow near Seafoam, cave entrance near Victory Road, grand building at Pokemon League)
- **Reuses existing backend:** Same `/api/league/<id>/week/<week>/deep-dive` endpoint as Weekly Deep Dive and Mario World

---

### 2026-02-10 — Madden Console Experience (New)

- **New experience:** Built complete "Madden Console" experience — simulates a full Xbox boot sequence into a Madden-style menu system for exploring weekly fantasy stats.
- **Files created:**
  - `frontend/madden.html` — Main HTML page with Xbox boot, Madden title screen, team selection, loading, error, tabbed main menu, week detail overlay, controller prompt bar
  - `frontend/static/css/madden.css` — Full Madden-inspired dark UI: Xbox green boot animation, metallic gold title text with CSS gradients, floating particles, dark card system, gold accent highlights, tab navigation with active underlines, week carousel cards with W/L coloring, side-panel week detail overlay, standings table with rank changes, NFL score cards with team logos, responsive breakpoints, controller prompt bar
  - `frontend/static/js/maddenRenderer.js` — All DOM rendering: title particles, team grid, home hero card (record/total points/win rate/best week), week carousel, season grid, standings table, NFL scores grid, full week detail overlay with side-by-side rosters and lineup error highlighting
  - `frontend/static/js/maddenController.js` — State management and boot sequence: 3-second Xbox boot with CSS animated green X logo and loading bar, Madden title screen with "Press START" blink, team selection with auto-confirm, tab navigation (HOME/SEASON/STANDINGS/SCORES), background data prefetch for all weeks, keyboard navigation (arrows to browse weeks, Enter to select, Tab to switch tabs, Escape to close/go back), week detail overlay with prev/next week navigation
- **Files modified:**
  - `frontend/index.html` — Added Madden Console as 7th experience option with gamepad icon, added CSS gradient for option styling, added route to pages map
- **Boot Sequence:** Xbox green X logo fade-in with glow -> loading bar animation -> fade to black -> Madden title with dramatic radial gradient backdrop, metallic gold text, floating gold particles -> "Press START" blink -> fade to team selection or main menu
- **Four Menu Tabs:** HOME (hero card + horizontal week carousel), SEASON (full week grid), STANDINGS (week-selectable standings table), SCORES (NFL score cards with team logos)
- **Week Detail:** Slide-in panel from right with score comparison, full roster display, lineup error highlighting, fantasy summary, prev/next week navigation

---

### 2026-02-10 — Mario World Experience (New)

- **New experience:** Built complete "Mario World" experience — a canvas-rendered pixel-art overworld where the user plays as Toad running between 14 themed locations, one per week of the fantasy season.
- **Files created:**
  - `frontend/mario.html` — Main HTML page with team selection, loading, error, canvas, HUD, stats overlay
  - `frontend/static/css/mario.css` — All styles (Mario-themed team select, pixel font, HUD, stats overlay with retro styling)
  - `frontend/static/js/marioRenderer.js` — Canvas rendering: sky/terrain, paths, 14 unique location buildings (mushroom house, beach hut, haunted house, pyramid, castle, etc.), Toad sprite with walking animation, camera system, decorative trees
  - `frontend/static/js/marioController.js` — Game logic: URL param parsing, team selection, WASD/arrow key movement, path-constrained player movement, location proximity detection, stats overlay with full weekly deep dive data, background data prefetch, touch support
- **Files modified:**
  - `frontend/index.html` — Added Mario World as 6th experience option with mushroom icon
- **14 Themed Locations:** Mushroom Village, Koopa Beach, Piranha Plains, Boo's Haunted House, Chain Chomp Canyon, Shy Guy Falls, Bob-omb Battlefield, Lakitu Cloud Palace, Dry Bones Desert, Thwomp Fortress, Luigi's Mansion, Daisy's Garden, Wario's Gold Mine, Bowser's Castle
- **Features:** Smooth camera follow, pixel-art scaling, W/L indicators on map, HUD with running record, Enter to open location overlay, Escape to close, arrow keys to navigate weeks in overlay, background prefetch of all week data

---

### 2026-02-10 — ESPN API Research

- **Research task:** Comprehensive exploration of all ESPN Fantasy Football API views and data endpoints beyond what the project currently uses.
- **Method:** Direct API calls against real league data (league 17810260, 2024 season) to map every view parameter, data structure, and field.
- **Findings documented:** Created `dev/specs/006-espn-api-research.md` with:
  - 16+ API views cataloged with their returned data
  - Full draft data structure (picks, keepers, auction bids, auto-draft detection)
  - Player projections vs actuals (statSourceId 0 vs 1)
  - Scoring stat ID reference table (45+ stat categories)
  - Keeper value data, positional strength-of-schedule ratings
  - Transaction counter data per team (acquisitions, drops, trades, IR moves, FAAB)
  - Historical season access (all past years accessible)
  - Playoff bracket reconstruction from playoffTierType
  - 27 creative stat ideas for Wrapped, prioritized by effort level
- **Key discoveries:** Draft data (`mDraftDetail`), player projections (`mBoxscore` statSourceId=1), draftDayProjectedRank vs actual rank, cumulative score by stat category, division/home/away records, keeper values, and positional ratings are all freely available without auth.
- **Limitation:** Individual transaction history (specific add/drop/trade details) requires authentication cookies. Only aggregate counts are public.

---

### 2026-02-10 — Overnight Session: Weekly Deep Dive V2 (Items 1-7)

**What was shipped (7 of 9 items):**

- **Item 1: Roster Spacing Bug Fix** — Fixed weird vertical gap above players with red `!` triangle. Root cause: error indicator had `display: inline-block` + `font-size: 16px` causing extra height. Changed to `display: inline-flex`, `font-size: 13px`, `line-height: 1`. Also reduced `.player-list` gap from 8px to 4px.
- **Item 2: Starters vs Bench Visual Distinction** — Starters get subtle white background tint. Bench section gets dashed border-top separator, dimmed opacity (0.75), and muted point colors. Section labels "Starters" and "Bench" added.
- **Item 3: Top Scorers Scrolling Ticker** — New horizontally-scrolling ticker showing top 3 fantasy scorers at each position (QB → RB → WR → TE → K → D/ST). Each card shows ESPN headshot, score, player name, and fantasy team. Uses same infinite scroll animation pattern as NFL scores ticker. Async headshot loading with placeholders.
- **Item 4: Headshots in League Matchups** — Replaced UI Avatars initial circles with real ESPN player headshots for top 3 scorers in matchup cards. Uses async `getPlayerHeadshot()` with graceful fallback to placeholder images.
- **Item 5: Team Selection Required** — New team selection screen shown before deep dive. Users pick their team from a grid of team cards. Selection stored in URL params. Works with both `teamId` and `team` (name) URL params.
- **Item 6: Better Loading Screen** — Replaced static loading text with cycling football-themed taglines (14 messages). Added spinning football emoji animation. Smooth fade transitions between taglines every 2.5 seconds.
- **Item 7: Improved Week Selector** — Week buttons now show "Week N" label + score/W-L/score. Active week visually larger (scale 1.08). W = green, L = red. Pre-fetches all week results in background for progressive nav updates.

**Files modified:**
- `frontend/static/css/weekly.css` — All CSS for items 1-7
- `frontend/static/js/weeklyRenderer.js` — Starters/bench classes, headshot loading, top scorers ticker
- `frontend/static/js/weeklyController.js` — Complete rewrite: team selection, loading taglines, W/L week nav
- `frontend/weekly.html` — Team selection screen, loading animation, top scorers section

**Files created:**
- `dev/specs/005-overnight-weekly-deep-dive-v2.md` — Overnight spec document for all 9 items

**Still in progress (sub-agents):**
- Item 8: ESPN API research → `dev/specs/espn-api-research.md`
- Item 9: Draft Board experience → see entry below

---

### 2026-02-10 — Draft Board Feature (New Experience)

**What was shipped:**

- **New Draft Board experience** — Full end-to-end feature: backend draft analysis + frontend Draft Board page
- **Backend: `GET /api/league/<id>/draft`** endpoint with `year` query param
  - Fetches ESPN `mDraftDetail` view for draft picks
  - Loops through all weeks to compute per-player: total points, avg points, start %, dropped status, final team
  - Grades picks as GEM (late round + high performer) or BUST (early round + dropped/low performer)
  - New file: `backend/stats/draft_analyzer.py`
- **Frontend: `draft.html`** — New experience page with:
  - Setup screen (league ID + year input, team selection)
  - Loading screen with rotating taglines
  - Summary stat cards (total picks, league gems/busts, your gems/busts, best value pick, worst pick)
  - Full draft table: Pick, Player, Pos, Team, Total Pts, Avg Pts, Start %, Dropped?, Last Team, Grade
  - Filter bar: All / Gems / Busts / My Team
  - Sortable columns (Pick, Total Pts, Avg Pts, Start %)
  - Alternating row backgrounds, user's team highlighted with amber accent
  - GEM (green) and BUST (red) grade badges
  - Position-colored badges (QB red, RB blue, WR green, TE amber, K purple, D/ST gray)
- **Hub page updated** — Draft Board added as 5th experience option on `frontend/index.html`

**New files created:**
- `backend/stats/draft_analyzer.py` — Draft analysis logic (fetch, compute, grade)
- `frontend/draft.html` — Draft Board page
- `frontend/static/js/draftController.js` — Draft Board controller
- `frontend/static/css/draft.css` — Draft Board styles

**Files modified:**
- `backend/app.py` — Added draft route + API endpoint
- `frontend/index.html` — Added Draft Board as 5th experience option

---

### 2026-02-10 — Weekly Deep Dive Improvements Batch (Overnight)

**What was shipped:**

- **Number Precision** — Added `formatPts()` helper in `weeklyRenderer.js`. All fantasy point displays now use `.toFixed(1)`. NFL integer scores untouched.
- **Roster Display Order** — Added `sortRoster()` method. Starters sorted: QB → RB → RB → WR → WR → TE → FLEX → D/ST → K. Bench sorted by points descending.
- **Clickable Matchups** — Matchup cards in "All Matchups" section now expand inline on click to show full rosters for both teams. Lazy-renders on first click. Includes collapse/expand toggle.
  - **Bonus: Top 3 Scorers** — Each team in matchup cards shows headshot avatars of top 3 scorers (UI Avatars)
  - **Bonus: Lost Points** — Red "-X.X" lost points shown next to team scores in matchup cards
- **Standings Enhancements (Backend)** — Rewrote `calculate_standings_through_week()` in `weekly_analyzer.py`:
  - Now calculates optimal lineups for ALL teams ALL weeks (not just the user's team)
  - Tracks cumulative errors, lost_points, and perfect_weeks per team
  - Computes previous week rankings for rank_change calculation
- **Standings Enhancements (Frontend)** — Enhanced standings table:
  - New columns: Errors (orange), Lost Pts (red), Perfect (gold stars)
  - Rank change indicators: green ▲+N / red ▼-N arrows
  - All 7 columns sortable by clicking headers (ascending/descending toggle)
- **NFL Team Logos** — Team logos from ESPN CDN (`a.espncdn.com/i/teamlogos/nfl/500/`) next to abbreviations in scores section
- **NFL Scores Redesign** — Completely new layout:
  - Horizontal ticker with auto-scroll animation (60s loop, duplicated cards for seamless scroll)
  - Bigger cards with 36px logos, larger scores
  - Losing team greyed out (grayscale filter + reduced opacity)
  - Pauses on hover, manual horizontal scroll enabled

**Files modified:**
- `frontend/static/js/weeklyRenderer.js` — All 7 features
- `frontend/static/css/weekly.css` — New styles for standings, matchups, NFL scores
- `backend/stats/weekly_analyzer.py` — Enhanced standings with errors/lost_points/perfect_weeks/rank_change

**Tested:** API verified with League 17810260, Year 2025. Standings data correct across weeks 1-8. Rank changes verified between weeks. Perfect weeks and error counts accumulate correctly.

**Note:** AI summaries (objective 1) skipped per user request — user handling ANTHROPIC_API_KEY Railway env var separately.

**Key decision:** Player headshots use UI Avatars (initials) rather than ESPN headshots, since ESPN headshots require player IDs we don't have in the data flow. Reliable fallback that always works.

---

### 2026-02-09 — Railway Fix, Process Improvements, Permissions

**What happened:**
- **Fixed Railway production crash** — `anthropic` and `python-dotenv` were in `backend/requirements.txt` but NOT root `requirements.txt`. Railway only reads root. App crashed on import at startup. Both files now synced.
- **Broadened permissions** in `.claude/settings.local.json` — added common dev commands (`nohup`, `lsof`, `kill`, `sleep`, `ls`, `mkdir`, `rm`, etc.) plus all skills. Overnight sessions were halting on permission prompts for basic commands.
- **Updated `/overnight` skill** with:
  - "Test As You Build" section — test every feature locally before moving on, fix bugs immediately, don't batch testing
  - Senior review runs at end of consolidation phase
  - Deployment readiness checks (root requirements.txt, env vars)
  - Updated completion checklist
- **Updated CLAUDE.md** with:
  - Deployment gotchas section (root vs backend requirements.txt, env vars)
  - New common issues (Railway crash, LLM fallback, NFL scores empty)

**Key decision:** Permissions are now broad enough for fully autonomous overnight sessions. All common bash commands and all skills are pre-approved.

---

### 2026-02-09 — LLM Summaries Working End-to-End

**What happened:**
- **Fixed NFL scores not loading** — ESPN's `season`/`seasontype` params return 0 events for historical data. Switched `nfl_data.py` to use `dates` param with Labor Day-anchored week calculation. Now returns all 16 games per week.
- **Tested full summary pipeline** — NFL + Fantasy summaries generating via Claude API (Sonnet 4.5). Both cached to disk for instant reloads.
- **Added $5 API credits** — previous key had zero balance, causing silent fallback. Now funded and working.
- **Improved error handling in `summary_generator.py`**:
  - API errors now classified (billing, auth, rate limit, server down, timeout)
  - Clear `[Summaries]` log lines at startup and on errors
  - Fallback text tells you *why* summaries aren't loading (e.g. "API credits exhausted" vs "invalid key" vs "not configured")
  - Imported `APIStatusError` from anthropic for proper error classification

**Key files changed:**
- `backend/nfl_data.py` — date-based ESPN API query, Labor Day anchor for week calculation
- `backend/summary_generator.py` — error classification, descriptive fallbacks, startup logging

---

### 2026-02-09 — LLM Summary Integration Setup & ESPN API Research

**What happened:**
- Set up Anthropic API key for Claude-generated NFL and fantasy summaries
  - Created `backend/.env` with `ANTHROPIC_API_KEY`
  - Already in `.gitignore`, secure from git commits
- Researched ESPN Fantasy API to understand available data for rich summaries
  - **Found:** `mPendingTransactions` view exposes waiver wire activity
  - **Found:** `injuryStatus` field in player data (detect injured players in lineups)
  - **Found:** Additional views: `mBoxScore`, `mDraftDetail`, `mLiveScoring`, `mPositionalRatings`
  - **Limitations:** No NFL play-by-play, no pre-game odds (can't detect "upsets" technically)
- Updated `dev/specs/001-weekly-deep-dive.md` with:
  - Implementation decisions (API key storage, caching strategy, generation approach)
  - ESPN API data availability research findings
  - Content strategy for NFL and fantasy summaries based on available data
  - Resolved open questions section

**Ready for implementation:**
- API key configured and secure
- Data sources documented
- Clear content strategy for what summaries should include
- Next: `/overnight` to build `summary_generator.py` and integrate LLM summaries

**Overnight session scope confirmed:**
- Build backend: `summary_generator.py`, `nfl_data.py`, update `weekly_analyzer.py`
- Implement ESPN API extensions: `mPendingTransactions` (waiver wire), `injuryStatus` (injuries)
- Add NFL Scores section (Section 4) - data already pulled for summaries
- File-based caching with force-regenerate capability
- Full frontend integration: add summary sections to `weekly.html`, rendering functions
- Test with league 17810260, year 2025, team "Will"
- **Deferred:** Lineup editor (tap-to-swap) - placeholder exists, implement later

**LLM summary implementation completed:**
- Built `backend/nfl_data.py` - ESPN NFL scoreboard API integration
- Built `backend/summary_generator.py` - Claude API integration with file-based caching
- Enhanced `backend/stats/weekly_analyzer.py` with summary generation
- Updated weekly deep dive API endpoint to include summaries and NFL scores
- Added frontend rendering in `weekly.html` (NFL summary, fantasy summary, NFL scores grid)
- Cache directory: `backend/cache/summaries/` (auto-created, in `.gitignore`)
- API supports `include_summaries=true/false` and `force_regenerate=true/false` params
- **Documentation updated:** CLAUDE.md now includes new files, API changes, and external dependencies

---

### 2026-02-09 — File System Reorganization

**What happened:**
- Reorganized project to clearly separate app code from planning/strategy docs
- Created `planning/` folder for business & strategy (MEETING_NOTES.md, ROADMAP.md, stand-ups/, references/, design-specs/)
- Created `dev/` folder for development artifacts (specs/, test-reports/, overnight-summaries/, bug-reports/)
- Moved all files to new locations
- Updated CLAUDE.md with new folder structure and paths
- Updated all skill SKILL.md files with new paths (.claude/skills/*)

**New structure:**
```
├── backend/              # App code
├── frontend/             # App code
├── planning/             # Business & strategy
│   ├── MEETING_NOTES.md
│   ├── ROADMAP.md
│   ├── stand-ups/
│   ├── references/
│   └── design-specs/
└── dev/                  # Development process
    ├── specs/
    ├── test-reports/
    ├── overnight-summaries/
    └── bug-reports/
```

**Benefits:**
- Clear visual separation: app code vs planning vs dev artifacts
- Easier to navigate: "where's the strategy stuff?" → planning/
- Cleaner root directory
- Future-proof for scaling documentation

---

### 2026-02-09 — Advanced Stats Package Ideation, Spec & Consolidation

**What happened:**
- User requested ideation on emotionally powerful, shareable stats
- Brainstormed 50+ stat ideas organized by emotional impact and shareability
- Created comprehensive spec doc: `spec-docs/003-advanced-stats-package.md`
- Consolidated overlapping ROADMAP items into the spec (merged duplicates)
- Restructured ROADMAP priorities to reference spec phases (1/2/3)

**Stat categories explored:**
- **Decision Patterns** — When/why you make mistakes (Sunday panic, consistency vs chaos, clutch gene)
- **Positional Intelligence** — Error rates by position, FLEX graveyard, depth IQ
- **Risk Analysis** — Ceiling chasers vs floor seekers, injury risk tolerance
- **League Context** — Strength of schedule, nemesis/victim, unluckiest losses
- **Timing & Momentum** — Streaks, peak windows, early vs late season
- **Anomaly Detection** — Goose eggs, bench explosions, extreme margins
- **Would've/Could've/Should've** — Perfect season record, one-player-away games, cost of errors
- **Manager Archetypes** — The Gambler, The Tinkerer, The Lucky Bastard, etc.

**Top 15 priority stats identified:**
1. Close game record (clutch or choke?)
2. Position error breakdown
3. Strength of schedule
4. Nemesis/victim (head-to-head)
5. Longest win/loss streaks
6. Bench explosion week
7. Goose egg count
8. One-player-away count
9. Perfect season record
10. Volatility ranking
11. Draft vs waiver MVP
12. Projection deviation
13. Manager archetype classification
14. Nail-biters count (<3pt games)
15. Boom-bust ratio

**Spec details:**
- Organized into 3 tiers by implementation complexity
- **Tier 1 (Quick Wins):** 16 stats using existing data — consistency, position errors, clutch factor, bench narratives, extreme margins, perfect season analysis
- **Tier 2 (Medium Effort):** Head-to-head matrix, positional depth, roster tenure, season splits, archetype classification
- **Tier 3 (Complex):** Draft/acquisition analysis, injury tracking, projection comparison (requires new ESPN API data)
- MVP scope: Phase 1 only (Tier 1 stats) = 3-4 new slides, ~16 stats, 1 overnight session
- Implementation plan includes backend module updates and new `advanced_analyzer.py`

**Consolidation changes:**
- Removed duplicate items from ROADMAP P0/P1/P2 now covered in spec
- ROADMAP P0 → Advanced Stats Package Phase 1 (Tier 1 quick wins)
- ROADMAP P1 → Advanced Stats Package Phase 2 (Tier 2 medium effort)
- ROADMAP P2 → Advanced Stats Package Phase 3 (Tier 3 complex)
- Added note to "Later" section pointing to spec for consolidated items
- Added "Top Heavy" stat to spec Tier 2 (wasn't originally included)

**Items consolidated:**
- Luckiest Win / Heartbreaking Loss → Spec Tier 1
- FLEX Analysis → Spec Tier 1 (FLEX Graveyard)
- Week-by-Week Error Chart → Spec Tier 1 (consistency metrics)
- Free Agent / Draft Analysis → Spec Tier 3
- Position Depth Analysis → Spec Tier 2
- Bye Week Heroes → Spec Tier 2
- Head-to-head rivalry → Spec Tier 2
- Trade analysis → Spec Tier 3
- Injury impact → Spec Tier 3
- Home Grown Talent → Spec Tier 3
- Good Calls vs Projections → Spec Tier 3

**Files created:**
- `spec-docs/003-advanced-stats-package.md`

**Files modified:**
- `ROADMAP.md` — Consolidated duplicate stat items, restructured priorities by spec phases, updated "Ideas" section
- `spec-docs/003-advanced-stats-package.md` — Added missing stats: "Top Heavy" (Tier 2), "Week-by-Week Error Tracking" (Tier 1), "Crown Jewel" (Tier 2), "Practice Squad" (Tier 3), added consolidation notes

**Verification pass:**
- Systematically checked all ROADMAP items are captured in spec
- Added 4 missing stats to ensure complete coverage
- Updated consolidation notes with all items

**Key design principle:**
"Every stat should answer: Does this make me want to screenshot and roast my friends? If not, cut it."

**Next steps (when prioritized):**
1. Implement Tier 1 stats (Phase 1)
2. Test with league 17810260, validate accuracy
3. Design/implement new slide layouts
4. Integrate into card pack experience
5. Phase 2/3 after MVP ships

---

### 2026-02-09 — CLAUDE.md Updated: Parallelism & Subagent Usage

**What happened:**
- Added comprehensive "Parallelism & Subagent Usage" section to CLAUDE.md
- New guidance encourages aggressive use of subagents and parallel exploration
- Includes concrete examples, patterns, and rules of thumb

**Key additions:**
- **When to use subagents**: Codebase exploration, multi-part investigations, background tasks, complex research
- **Parallelism patterns**: Parallel exploration (3+ Explore agents), background delegation, parallel file modifications
- **Available agent types**: Explore, general-purpose, Bash, Plan (with usage examples)
- **Project-specific examples**: Pack opening animation analysis, new experience development, bug investigation
- **Rules of thumb**: >2 files = parallel agents, complex questions = multiple subsystem agents, default to parallelization

**Files modified:**
- `CLAUDE.md` — Added 150-line section after "Working Together", before "Personal Preferences"

**Rationale:**
- User observed hype about parallel Claude instances but wasn't sure how to optimize usage
- Subagents enable 3-5x speedup for exploration/investigation tasks
- Future Claude instances will now default to aggressive parallelism instead of sequential work

---

### 2026-02-09 — Arcade Visual Realism Spec Created

**What happened:**
- Created spec doc for arcade cabinet visual realism overhaul (`spec-docs/002-arcade-visual-realism.md`)
- Spec defines "super realistic" 3D arcade cabinet with authentic materials, textures, and depth
- Marked as backlog item — requires design ideation session before implementation

**Key details:**
- Target: Photorealistic arcade cabinet using CSS, pseudo-elements, gradients, shadows
- Enhancements: 3D perspective with visible side panels, wood grain textures, metallic screen housing, authentic control panel, T-molding, speaker grilles, wear/scuff marks
- Open questions flagged: Exact 3D angle, wood grain placement, color palette, marquee design, reference cabinet
- Out of scope: No functional changes, purely visual polish

**Files created:**
- `spec-docs/002-arcade-visual-realism.md`

**Files modified:**
- `ROADMAP.md` — Added arcade visual realism to "Polish & UX" backlog section

**Priority:** Backlog — "Someday make it perfect" polish pass, not urgent for launch

---

### 2026-02-09 — Arcade Cabinet Sizing Bug Fix

**What happened:**
- Fixed arcade cabinet cutoff bug on 14" MacBooks (bug-reports/003-arcade-cabinet-cutoff-macbook.md)
- Implemented Option A (Dynamic Height Scaling) from bug report
- Added responsive media queries for smaller laptop screens

**Bug:** Arcade cabinet was 90vh with max-height 850px, causing bottom control panel to be cut off on 14" MacBooks (~900px viewport height)

**Fix implemented:**
- Changed `.arcade-cabinet` height to `min(90vh, 750px)` with max-height 750px
- Added `@media (max-height: 900px)` breakpoint: 85vh / 750px max
- Added `@media (max-height: 800px)` breakpoint: 80vh / 650px max

**Files modified:**
- `frontend/static/css/arcade.css` — lines 62-70, added responsive breakpoints

**Result:** Cabinet now fits properly on 13", 14", 15", 16" laptop screens without requiring scrolling

---

### 2026-02-09 — Senior Review Session

**What happened:**
- User requested `/senior-review` on current codebase
- Completed autonomous full-codebase audit (all backend, frontend, docs)
- Found and fixed 3 bugs, 2 quality improvements
- Committed changes with descriptive commit message
- User reminded: **Always update meeting notes every conversation** (don't wait until end of session)

**Scope:** Full codebase — backend + frontend + documentation

**Bugs found and fixed:**
- [backend/app.py:36-39] Dead code route `/v2` referenced non-existent `index-v2.html` file from old architecture → Removed route entirely
- [frontend/static/js/setup.js:199-202] Obsolete code checking for `currentExperienceMode` variable and calling `PackOpening.start()` from legacy architecture → Removed conditional, simplified to direct slideshow initialization
- [frontend/static/js/weeklyController.js:132] Using raw `fetch()` instead of `apiFetch()` wrapper → Switched to `apiFetch()` for consistent error handling with descriptive messages

**Code quality improvements:**
- [ROADMAP.md] Updated Card Pack Experience reference from non-existent `index-v2.html` to correct `pack-opening.html`

**Documentation updates:**
- None needed — CLAUDE.md project structure accurately reflects reality

**Overall assessment:**
Codebase is in excellent shape. No critical bugs, no security issues, no performance problems. The multi-experience architecture (slides, cards, arcade, weekly, VR) is well-organized with clear separation of concerns. Error handling is comprehensive (especially the `apiFetch` wrapper with descriptive error messages). Only issues found were minor remnants from architectural evolution (dead code referencing old file names).

**Recommended follow-ups:**
- None — codebase is production-ready

---

### 2026-02-09 — Test Skill Creation & Skill Usage Guidelines

- Created `/test` skill for end-to-end QA validation
- Updated `/overnight` skill to recommend `/test` after shipping frontend changes
- Added "When to Use Each Skill" section to CLAUDE.md with:
  - Situation-based skill selection guide
  - Common skill chains (workflows)
  - Skill usage rules
- Updated CLAUDE.md project structure to include `test-reports/` directory
- Updated "When to Read What" table to include test reports

**What was shipped:**
- ✅ `.claude/skills/test/SKILL.md` — new skill for manual browser testing + API validation
- ✅ `test-reports/.gitkeep` — directory for numbered test reports
- ✅ Updated `.claude/skills/overnight/SKILL.md` — added frontend testing reminder
- ✅ Updated `CLAUDE.md` — project structure, custom skills table, "When to Use Each Skill" section

**Key decisions:**
- Test skill is semi-automated: API tests run via curl, browser tests via guided checklist with user confirmation
- Test reports numbered like other docs: `001-YYYY-MM-DD-scope.md`
- Test skill validates against spec docs when they exist
- Overnight must recommend `/test` if frontend code shipped

**How to use `/test`:**
1. Run after `/overnight` ships frontend changes
2. Run before considering a feature "done"
3. Run before showing features to others
4. Run to validate against spec requirements
5. Can test specific feature, specific page, or full regression

**Next steps (as requested by user):**
1. Run `/senior-review` on current codebase
2. Run `/test` on Weekly Deep Dive

---

### 2026-02-09 — Weekly Deep Dive Implementation (Overnight Session)

- Built core Weekly Deep Dive feature from `spec-docs/001-weekly-deep-dive.md`
- Implemented backend weekly analyzer + API endpoint
- Implemented frontend week navigation + matchup detail + standings
- Wired into hub page as 4th experience option
- Tested end-to-end with league 17810260, year 2025, team Will Hofner

**What was shipped:**
- ✅ Backend: `weekly_analyzer.py` — per-week analysis (matchups, rosters, standings, lineup errors)
- ✅ API endpoint: `/api/league/<id>/week/<week>/deep-dive` (requires `team_id` param)
- ✅ Frontend: `weekly.html` — week navigation, matchup detail, standings, all matchups list
- ✅ JS modules: `weeklyController.js` (data fetching, week nav), `weeklyRenderer.js` (DOM rendering)
- ✅ Stub: `lineupEditor.js` (placeholder for tap-to-swap functionality)
- ✅ CSS: `weekly.css` — magazine layout, responsive, dark theme
- ✅ Hub integration: added "Weekly Deep Dive" option to experience picker (4th card, 2x2 grid)

**Deferred to later:**
- Tap-to-swap lineup editor (stub created, not implemented)
- Projected points parsing from ESPN API
- NFL scores (Section 4 — `nfl_data.py` + ESPN scoreboard API)
- LLM-generated summaries (Sections 1 & 2B — Claude API integration)
- Expandable matchup cards in "All Matchups" section

**Key decisions:**
- Team selection: If no `team` or `teamId` param in URL, controller fetches teams and uses first one
  - **Why:** Simpler for MVP. Other experiences have full setup flow, Weekly can add later.
  - **Reversible:** Yes, can add team selector UI later
- Skip LLM summaries for now: Use placeholder/fallback per spec's MVP guidance
  - **Why:** User has Anthropic Max subscription but API key not configured yet
  - **Revisit:** When API key is configured
- Core loop first, NFL/LLM later: Prioritized matchup detail + standings + week nav
  - **Why:** User specified "core loop first, then NFL scores, then fantasy matchups"
  - **Result:** Core experience works, can layer in enhancements progressively

**Files created:**
- `backend/stats/weekly_analyzer.py`
- `frontend/weekly.html`
- `frontend/static/js/weeklyController.js`
- `frontend/static/js/weeklyRenderer.js`
- `frontend/static/js/lineupEditor.js` (stub)
- `frontend/static/css/weekly.css`

**Files modified:**
- `backend/app.py` (added `/api/league/<id>/week/<week>/deep-dive` endpoint, added `weekly.html` route)
- `frontend/index.html` (added Weekly Deep Dive option, updated grid to 2x2, added weekly icon/styles)
- `CLAUDE.md` (updated project structure, API endpoints, "When to Read What" table, Multi-Experience Architecture)

**Testing:**
- Verified API returns correct data for weeks 1, 2, 3, 5, 10 (league 17810260, year 2025)
- Verified team lookup works (Will Hofner = team_id 1)
- Verified standings calculation through each week
- Verified lineup errors detection
- Frontend loads correctly (HTML served, no 404s)

**Next steps (when user resumes):**
1. Implement tap-to-swap lineup editor (Section 2A)
2. Add NFL scores (Section 4 — `nfl_data.py`)
3. Add projected points parsing to `espn_api.py`
4. Add LLM summary generation (Sections 1 & 2B) when API key configured
5. Make "All Matchups" cards expandable to show full rosters

---

### 2026-02-07 — Weekly Deep Dive Feature Ideation

- Ideated "Weekly Deep Dive" — a week-by-week season explorer, second product surface alongside Wrapped
- Inspired by fantasywrapped.com (EPL equivalent) — editorial magazine feel, week navigation
- Core sections: NFL summary, fantasy matchup detail, lineup editor, league summary, standings, NFL scores, all fantasy matchups
- Decided on Claude API for LLM-generated summaries (NFL weekly + fantasy league weekly)
- Decided on ESPN public NFL scoreboard API for real game scores
- Decided on magazine/editorial layout (dark theme, readable, not flashy)
- Decided on tap-to-swap lineup editing (not drag-and-drop)
- Decided this is a standalone page (`weekly.html`) accessible from hub after setup
- Generated spec: `spec-docs/001-weekly-deep-dive.md`
- Added to ROADMAP under "Now (Active Focus)"

**Key architecture decisions:**
- New backend modules: `nfl_data.py`, `weekly_analyzer.py`, `summary_generator.py`
- New API endpoints for weekly deep dive data, NFL scores, and LLM summaries
- Progressive loading: fast data first, LLM summaries load async last
- LLM summaries have placeholder fallback if API isn't ready

---

### 2026-02-07 — Workflow & Skills Overhaul

- Defined 5 workflow types: bug fix, feature ideation, feature building, senior review, stand-up
- Overhauled `/bug-report` skill → full flow: interview → investigate → report → offer fix → add to ROADMAP if deferred
- Created `/ideate` skill → feature interview → numbered spec doc in `spec-docs/` → update ROADMAP
- Created `/senior-review` skill → autonomous code quality audit, optional scope, commits its own fixes
- Created `/stand-up` skill → quick standup meeting, generates numbered doc in `stand-ups/`
- Created `spec-docs/` and `stand-ups/` directories
- Updated CLAUDE.md: project structure, skills table, When to Read What, meeting notes behavioral directive
- Established continuous changelog workflow — update MEETING_NOTES.md as we go, not end of session
- Created `/overnight` skill → interview for priorities → autonomous execution → numbered summary doc
- Created `overnight-summaries/` directory
- Migrated `SPRINT_SUMMARY.md` → `overnight-summaries/001-2026-02-02-card-pack-experience.md` (reformatted to new summary template)
- Deleted old `SPRINT_SUMMARY.md`

**Decisions:**
- Bug reports that aren't immediately fixed get added to ROADMAP under "Known Bugs"
- Spec docs numbered `001-feature-name.md`, standups numbered `001-YYYY-MM-DD.md`, overnight summaries numbered `001-YYYY-MM-DD-focus.md`
- Senior review runs fully autonomous (no user input needed)
- Overnight skill: interactive interview phase, then fully autonomous. Never asks questions after kickoff.
- Meeting notes = scannable bulleted changelog, not exhaustive action log

**Files created:**
- `.claude/skills/ideate/SKILL.md`
- `.claude/skills/senior-review/SKILL.md`
- `.claude/skills/stand-up/SKILL.md`
- `.claude/skills/overnight/SKILL.md`
- `spec-docs/.gitkeep`
- `stand-ups/.gitkeep`
- `overnight-summaries/001-2026-02-02-card-pack-experience.md` (migrated from SPRINT_SUMMARY.md)

**Files modified:**
- `.claude/skills/bug-report/SKILL.md` (overhauled)
- `CLAUDE.md` (project structure, skills, workflow directives)
- `MEETING_NOTES.md` (this entry + format update)

**Files deleted:**
- `SPRINT_SUMMARY.md` (content migrated to overnight-summaries/)

- Ran first `/stand-up` → `stand-ups/001-2026-02-07.md`

---

### 2026-02-02 — Card Pack Experience Sprint

**What we discussed:**
- Project kickoff interview - clarified product vision and priorities
- Visual direction: dark/sleek theme, collectible card aesthetic
- Pack opening metaphor: Pokémon-style card reveals with rarity tiers
- Platform strategy: web-first but mobile-native design
- ESPN auth: prefer OAuth but accept public-only for now
- Multiple presentation modes: pack opening AND slideshow

**Decisions made:**
- Build pack opening as primary new experience (not replace slides)
- Dark theme with near-black backgrounds (#08080c base)
- 5 rarity tiers: Common → Uncommon → Rare → Epic → Legendary
- Standard trading card ratio (2.5:3.5)
- Separate data transform layer (CardBuilder) from rendering
- Holographic/prismatic effects for legendary cards
- Mode toggle to switch between Pack and Slideshow experiences

**Implemented:**
- [x] Dark theme design system (theme-dark.css)
- [x] Card component with rarity effects (cards.css)
- [x] Pack opening animations (pack-opening.css)
- [x] Card builder - transforms API data to card objects (cardBuilder.js)
- [x] Card renderer - generates HTML from cards (cardRenderer.js)
- [x] Pack opening controller (packOpening.js)
- [x] Superlative guessing game (superlativeGame.js)
- [x] New frontend with mode toggle (index-v2.html)
- [x] Card system design documentation (docs/CARD_SYSTEM_DESIGN.md)
- [x] Sprint summary (SPRINT_SUMMARY.md)

**Decided against:**
- Modifying original slideshow files (kept as separate mode)
- ESPN cookie/SWID auth (too janky, prefer public leagues for now)
- Sound effects (deferred - need user preference toggle)
- Pixelated/Game Boy style (went with sleek/premium instead)

**Questions for user:**
- Sound effects for pack opening?
- Card back design - generic or team-branded?
- Share/download individual cards?
- Superlative game mandatory or optional?

**Next steps:**
- Test with real league data in production
- Polish animations based on feel
- Add more superlatives
- Consider Madden UI exploration

**Files created this session:**
- `docs/CARD_SYSTEM_DESIGN.md`
- `frontend/static/css/theme-dark.css`
- `frontend/static/css/cards.css`
- `frontend/static/css/pack-opening.css`
- `frontend/static/js/cardBuilder.js`
- `frontend/static/js/cardRenderer.js`
- `frontend/static/js/packOpening.js`
- `frontend/static/js/superlativeGame.js`
- `frontend/index-v2.html`
- `SPRINT_SUMMARY.md`

---

### 2026-02-02 — Project Documentation Setup

**What we discussed:**
- Establishing a meeting notes workflow to track decisions across sessions
- Creating a system for keeping documentation in sync after shipping code

**Decisions made:**
- Created MEETING_NOTES.md as the central log for conversations
- After each chat: Update meeting notes with decisions, implementations, and rejections
- After shipping code: Review and update CLAUDE.md, ROADMAP.md, and MEETING_NOTES.md as needed

**Implemented:**
- [x] Created MEETING_NOTES.md
- [x] Updated CLAUDE.md with meeting notes workflow

**Decided against:**
- (None this session)

**Next steps:**
- Continue building features per ROADMAP.md priorities

