# Meeting Notes

Running log of our conversations, decisions, implementations, and things we decided against. Updated after each session.

---

## How to Use This File

- **After each chat**: Claude updates this file with key decisions and outcomes
- **After shipping code**: Check if CLAUDE.md, ROADMAP.md, or this file needs updates
- **Format**: Reverse chronological (newest first)

---

## Session Log

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

---

## Template for Future Sessions

```markdown
### YYYY-MM-DD — [Session Topic]

**What we discussed:**
- ...

**Decisions made:**
- ...

**Implemented:**
- [x] ...

**Decided against:**
- ...

**Next steps:**
- ...
```

---

## Quick Reference: Decision Categories

| Category | Examples |
|----------|----------|
| **Feature decisions** | What to build, what to skip, scope changes |
| **Technical decisions** | Architecture choices, API design, data structures |
| **Product decisions** | UX changes, slide content, copy/messaging |
| **Process decisions** | Workflow changes, documentation updates |
| **Rejected ideas** | Ideas we considered but decided against (and why) |
