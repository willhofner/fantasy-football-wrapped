# Meeting Notes

Living changelog. Reverse chronological. Bulleted and scannable.

---

## Session Log

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

