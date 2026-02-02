# Card System Design Document

**Created:** 2026-02-02
**Author:** Claude (Sprint Session)
**Status:** In Development

---

## Overview

The card pack system reimagines the Fantasy Football Wrapped experience as a collectible card game. Instead of slideshow presentations, users "open packs" to reveal their season highlights as collectible player cards, moment cards, and superlative awards.

### Design Philosophy

1. **Tactile & Physical** — Cards should feel like real objects you can flip, collect, and share
2. **Reward Discovery** — Each card reveal should feel like a mini-dopamine hit
3. **Screenshot-Worthy** — Every card is designed to be shared in group chats
4. **Roast-Ready** — Cards expose failures as much as celebrate wins

---

## Card Types

### 1. Player Cards

Individual player cards featuring roster highlights. These are the core collectible.

| Card | Data Source | Rarity Logic |
|------|-------------|--------------|
| **MVP** | Top scorer for the season | Epic/Legendary based on points |
| **Bust** | Most overrated player | Common (the shame) |
| **Sleeper** | Most slept on player | Rare (hidden gem) |
| **Breakout** | Single best weekly performance | Epic if 30+ pts |
| **Benchwarmer** | Highest benched performance | Rare (painful) |

**Card Layout:**
```
┌─────────────────────────────┐
│  [Rarity Glow Border]       │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   [Player Image]      │  │
│  │                       │  │
│  └───────────────────────┘  │
│  [Position Badge]           │
│  [Player Name]              │
│  ─────────────────────────  │
│  [Primary Stat]             │
│  [Secondary Stats Grid]     │
│  ─────────────────────────  │
│  [Card Title/Type]          │
│  [Rarity Badge]             │
└─────────────────────────────┘
```

### 2. Moment Cards

Capture specific memorable matchups or events from the season.

| Card | Criteria | Visual Treatment |
|------|----------|------------------|
| **Lucky Win** | Lowest scoring win | Green glow, horseshoe icon |
| **Tough Loss** | Highest scoring loss | Blue/sad tone |
| **Perfect Week** | Optimal lineup achieved | Gold shimmer |
| **Close Call** | Narrowest margin (win or loss) | Split gradient |
| **Blowout** | Biggest margin (win or loss) | Explosion effect |

**Card Layout:**
```
┌─────────────────────────────┐
│  WEEK [X]                   │
│  ┌───────────────────────┐  │
│  │   [Match Graphic]     │  │
│  │   YOU vs OPPONENT     │  │
│  │   120.5   115.2       │  │
│  └───────────────────────┘  │
│  [Moment Title]             │
│  [Context/Roast Line]       │
│  ─────────────────────────  │
│  [Key Stats]                │
│  [Outcome Badge]            │
└─────────────────────────────┘
```

### 3. Superlative Cards (League Awards)

League-wide awards given to managers. These have an interactive reveal mechanic.

| Award | Icon | Vibe | Rarity |
|-------|------|------|--------|
| Clown | 🤡 | Roast | Common |
| Speedrunner | 🏃 | Neutral | Uncommon |
| Snail | 🐌 | Roast | Common |
| Sniper | 🎯 | Praise | Rare |
| Draft King | 👑 | Praise | Epic |
| Blue Chip | 💎 | Praise | Rare |
| Skull | 💀 | Roast | Common |
| Dice Roll | 🎲 | Neutral | Uncommon |
| Top Heavy | ⚖️ | Neutral | Uncommon |
| Home Grown | 🌱 | Praise | Rare |
| Waiver Wire MVP | 📈 | Praise | Epic |
| Bench Warmer | 🪑 | Roast | Common |
| Lucky | 🍀 | Neutral | Uncommon |
| Unlucky | 😢 | Sympathy | Uncommon |
| Heartbreak Kid | 💔 | Sympathy | Uncommon |
| Perfect Week Club | ✨ | Praise | Legendary |

---

## Rarity System

### Tiers

| Rarity | Border Color | Background | Effects |
|--------|--------------|------------|---------|
| **Common** | Gray (#6b7280) | Matte dark | None |
| **Uncommon** | Green (#22c55e) | Subtle gradient | Soft glow |
| **Rare** | Blue (#3b82f6) | Gradient | Shimmer on hover |
| **Epic** | Purple (#a855f7) | Animated gradient | Particle effects |
| **Legendary** | Gold (#f59e0b) | Holographic | Full prismatic, animated border |

### Rarity Assignment Logic

**Player Cards:**
- Legendary: 40+ total points in a single week, or season MVP with 250+ total
- Epic: 30-39 points single week, or top 3 scorer
- Rare: 20-29 points single week, or notable stat
- Uncommon: 15-19 points
- Common: Below 15 points or negative stats (busts)

**Moment Cards:**
- Legendary: Perfect Week
- Epic: Win/loss margin > 50 points
- Rare: Win/loss margin 30-50 points
- Uncommon: Win/loss margin 15-30 points
- Common: Standard moments

---

## Visual Design System

### Color Palette (Dark & Sleek)

```css
/* Background */
--bg-primary: #0a0a0f;      /* Near black */
--bg-secondary: #12121a;    /* Slightly lighter */
--bg-card: #1a1a24;         /* Card base */
--bg-elevated: #252530;     /* Hover states */

/* Accents */
--accent-gold: #f59e0b;
--accent-purple: #a855f7;
--accent-blue: #3b82f6;
--accent-green: #22c55e;
--accent-red: #ef4444;

/* Text */
--text-primary: #ffffff;
--text-secondary: #a1a1aa;
--text-muted: #71717a;

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-accent: rgba(255, 255, 255, 0.2);
```

### Typography

- **Headlines:** Bold, slightly condensed (Impact or similar for that sports card feel)
- **Stats:** Monospace for numbers (adds authenticity)
- **Body:** Clean sans-serif

### Card Dimensions

- **Aspect Ratio:** 2.5:3.5 (standard trading card)
- **Mobile:** ~280px x 392px
- **Desktop:** ~320px x 448px

---

## Interaction Patterns

### 1. Pack Opening Sequence

```
[User taps pack]
    ↓
[Pack shakes/glows]
    ↓
[Pack tears open animation]
    ↓
[Cards fan out (backs showing)]
    ↓
[User taps each card to flip]
    ↓
[Card flips with 3D rotation]
    ↓
[Rarity-appropriate celebration]
    ↓
[Continue to next card or gallery]
```

### 2. Card Flip Animation

- Duration: 600ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Y-axis rotation: 0° → 180°
- Slight scale up at midpoint (1.05x)
- Holographic shimmer reveals on flip

### 3. Superlative Guessing Game

```
[Cards laid face-down on table]
    ↓
[Prompt: "Which award did you win?"]
    ↓
[User selects a card]
    ↓
[Card flips to reveal]
    ↓
[Correct? Celebration animation]
[Wrong? Shows correct card, roast message]
```

---

## Pack Contents

### Standard Season Pack (10-12 cards)

1. **Season Overview Card** (always first)
2. **Top Scorer / MVP Card**
3. **2nd Best Player Card**
4. **3rd Best Player Card**
5. **Bust Card** (most overrated)
6. **Sleeper Card** (most slept on)
7. **Best Moment Card** (lucky win or big blowout)
8. **Worst Moment Card** (tough loss or choke)
9. **Breakout Performance Card**
10. **Wasted Potential Card** (benchwarmer)
11. **Manager Rating Card**
12. **Superlative Award Card**

### Card Order Strategy

- Start strong (MVP hooks them)
- Alternate between praise and roast
- End with superlative reveal (memorable)

---

## Technical Implementation

### File Structure

```
frontend/
├── static/
│   ├── css/
│   │   ├── cards.css         <- Card component styles
│   │   └── pack-opening.css  <- Pack animation styles
│   └── js/
│       ├── cardBuilder.js    <- Card data → HTML
│       ├── packOpening.js    <- Pack interaction logic
│       └── cardAnimations.js <- Animation utilities
```

### Data Flow

```
Wrapped API Response
    ↓
cardBuilder.js (transform to card objects)
    ↓
packOpening.js (sequence and reveal logic)
    ↓
cardAnimations.js (visual effects)
```

### Card Object Schema

```javascript
{
  id: 'mvp-player-123',
  type: 'player',           // player | moment | superlative
  rarity: 'epic',           // common | uncommon | rare | epic | legendary
  title: 'Season MVP',
  subtitle: 'Your top performer',

  // Player-specific
  player: {
    name: 'Ja\'Marr Chase',
    position: 'WR',
    team: 'CIN',
    imageUrl: '...'
  },

  // Stats array (flexible for different card types)
  stats: [
    { label: 'Total Points', value: '287.4', highlight: true },
    { label: 'Games Played', value: '14' },
    { label: 'Avg/Game', value: '20.5' }
  ],

  // Flavor text (roast or praise)
  flavorText: 'Carried your sorry team all season.',

  // Moment-specific (optional)
  moment: {
    week: 8,
    opponent: 'Team Name',
    yourScore: 142.5,
    oppScore: 138.2,
    outcome: 'win'
  }
}
```

---

## Decisions Made

### Why Pack Opening Instead of Slideshow?

1. **Tactile engagement** — Tapping to reveal is more engaging than swiping through slides
2. **Collectible psychology** — "What did I get?" creates anticipation
3. **Natural shareability** — Individual cards are easier to screenshot than full slides
4. **Extensibility** — Can add more card types, packs, trading mechanics later

### Why Dark Theme?

1. **User preference** — Explicitly requested dark and sleek
2. **Card pop** — Bright card elements contrast better on dark
3. **Premium feel** — Dark themes signal quality in gaming contexts
4. **Eye comfort** — Fantasy analysis often happens at night

### Why 2.5:3.5 Card Ratio?

1. **Familiar** — Standard trading card dimensions
2. **Mobile-friendly** — Fits well in portrait view
3. **Content balance** — Enough room for image and stats

---

## Open Questions (For User)

1. **Sound effects?** — Pack opening sounds, card flip sounds, rarity reveals?
2. **Card back design?** — Generic or personalized with team/league info?
3. **Save/collect mechanic?** — Should users be able to "save" their cards?
4. **Multi-team packs?** — Should users be able to open packs for other teams?

---

## Next Steps

1. [x] Document system design (this file)
2. [ ] Create base CSS design system (dark theme tokens)
3. [ ] Build card component HTML/CSS
4. [ ] Implement rarity visual effects
5. [ ] Build pack opening animation
6. [ ] Connect to existing wrapped data
7. [ ] Add superlative guessing game
8. [ ] Test with real league data

---

## References

- Spotify Wrapped (anticipation/reveal pattern)
- Pokémon TCG (holographic effects, rarity tiers)
- NBA Top Shot (digital collectible presentation)
- FIFA Ultimate Team (pack opening UX)
