# Overnight 007 — Game Experience Overhauls

**Date:** 2026-02-11
**Type:** Overnight Spec (feedback-driven overhaul, not new feature)
**Status:** In Progress

---

## User Feedback & Requirements

### Mario World Experience
1. **Bug: X button overlap** — The close (X) button on the stats popup overlaps with the "Next" button for quick-jumping to the next week. Must reposition so they don't conflict.
2. **Free roam overhaul** — Current path-constrained movement feels unrealistic. Requirements:
   - Full free-roam movement in any direction (not on predetermined lines)
   - More realistic world with animations and movement
   - Reference: `planning/references/mario_super_sluggers_ui.jpg` (Mario Super Sluggers)
   - Toad and other characters must look EXACTLY like their game counterparts
   - World should feel like actually playing Mario Super Sluggers
   - Need animated environment elements (water, trees, particles, etc.)

### Pokemon World Experience
1. **Free roam overhaul** — Current movement is too limited. Requirements:
   - Full free-roam in any direction with proper collision detection
   - Walls/obstacles the player can't walk through
   - NPCs the player can interact with
   - Simulated Pokemon-style battle sequence
   - Reference: `planning/references/pokemon_gameboy_ui.webp` (Pokemon Red/Blue for Gameboy)
   - Must feel EXACTLY like playing Pokemon on the Gameboy
   - Tile-based movement, proper sprite work, menu systems

### Madden Console Experience
1. **UI overhaul** — Current UI doesn't look enough like actual Madden. Requirements:
   - Reference: `planning/references/madden25_ui.webp` (Madden 25 for Xbox)
   - Xbox boot logo must be EXACT replica
   - Stadium overview aesthetic, dark panels with gold/yellow accents
   - Menu system should match Madden 25's actual layout
   - Must feel EXACTLY like starting up an Xbox and playing Madden

---

## Implementation Plan

### Phase 1: Mario World Overhaul
- [ ] Fix X button / Next button overlap in stats popup
- [ ] Remove path-constrained movement system
- [ ] Implement free-roam 2D movement with collision detection
- [ ] Redesign world map inspired by Mario Super Sluggers island hub
- [ ] Redraw Toad sprite to match official Nintendo Toad exactly
- [ ] Add NPC characters (Mario, Luigi, Peach, etc.) at locations
- [ ] Add environmental animations (water, clouds, trees swaying)
- [ ] Add location markers that match Mario Super Sluggers stadium/area style

### Phase 2: Pokemon World Overhaul
- [ ] Implement true grid-based free-roam movement (4-directional, tile-snapping)
- [ ] Add proper collision map (walls, water, trees block movement)
- [ ] Add NPC sprites that player can interact with (face them, press action)
- [ ] Add Pokemon-style text box / dialogue system
- [ ] Implement simulated Pokemon battle sequence for weekly matchups
- [ ] Match Gameboy Pokemon color palette (4-shade green/blue tint)
- [ ] Add Pokemon-style menu system (START menu)
- [ ] Proper door/building entry transitions

### Phase 3: Madden UI Overhaul
- [ ] Redesign Xbox boot sequence to match real Xbox startup exactly
- [ ] Redesign Madden title screen to match Madden 25 aesthetic
- [ ] Overhaul menu system to match Madden 25 layout (stadium overview style)
- [ ] Dark panels, proper Madden typography, gold/yellow accent colors
- [ ] Rating badges, stat cards matching Madden's UI language
- [ ] Social feed / mentions panel style from reference
- [ ] Controller prompt bar matching Xbox button icons exactly

---

## Research Needed
- Mario Super Sluggers hub world layout, character sprites, color palette
- Pokemon Red/Blue exact tile sizes, movement speed, UI elements, battle system
- Madden 25 exact menu layouts, typography, color codes, Xbox boot sequence

---

## Files to Modify
- `frontend/static/js/marioController.js` — Movement system overhaul
- `frontend/static/js/marioRenderer.js` — World & sprite rendering overhaul
- `frontend/static/css/mario.css` — Style updates
- `frontend/static/js/pokemonController.js` — Movement & interaction overhaul
- `frontend/static/js/pokemonRenderer.js` — Tile map, sprites, battle system
- `frontend/static/css/pokemon.css` — Style updates
- `frontend/static/js/maddenController.js` — Menu system overhaul
- `frontend/static/js/maddenRenderer.js` — UI rendering overhaul
- `frontend/static/css/madden.css` — Complete style overhaul
