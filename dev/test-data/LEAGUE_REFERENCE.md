# Test League Reference Data

**League:** r/GeedStreetBets IIX
**League ID:** 17810260
**Year:** 2025
**Teams:** 8
**Regular Season:** Weeks 1-15 (final_week = 15)
**Current Week:** 19 (season over)

This file documents real data from our test league for development reference. Use this to understand what real fantasy data looks like and to validate new features.

---

## League Standings (Final)

| Rank | Team | Manager | Record | Points | Optimal Pts | Pts Lost | Errors | Top Scorer |
|------|------|---------|--------|--------|-------------|----------|--------|------------|
| 1 | ? | Lou Chrisos | 10-4 | 1,791.0 | 1,988.0 | 197.0 | 25 | JSN (268.0) |
| 2 | ? | Noah Ip | 9-5 | 1,919.3 | 2,144.0 | 224.7 | 29 | CMC (328.5) |
| 3 | ? | Alex Pandolfi | 9-5 | 1,907.9 | 2,118.4 | 210.5 | 27 | J. Taylor (309.0) |
| 4 | ? | Allan Baut | 8-6 | 1,835.3 | 2,029.5 | 194.2 | 23 | J. Allen (310.0) |
| 5 | ? | Tj Fenton | 7-7 | 1,613.8 | 1,975.5 | 361.8 | 30 | Achane (252.5) |
| 6 | ? | Zach Mouser | 6-8 | 1,727.4 | 1,961.9 | 234.4 | 25 | Chase (221.9) |
| 7 | ? | Will Hofner | 4-10 | 1,596.2 | 1,853.8 | 257.6 | 28 | K. Williams (186.3) |
| 8 | ? | Will Chrisos | 3-11 | 1,479.8 | 1,825.3 | 345.5 | 39 | B. Robinson (264.3) |

**Note:** Team names (column "?") are not currently returned by the API — this is the `get_team_name_map()` change needed in spec 007.

---

## League Superlatives

| Award | Winner | Stat |
|-------|--------|------|
| Best Manager (fewest errors) | Allan Baut | 23 errors |
| Worst Manager (most errors) | Will Chrisos | 39 errors |
| Biggest Underperformer | Zach Mouser | 8 win difference from optimal |
| Luckiest Team | Lou Chrisos | 0 win difference from optimal |
| Most Perfect Weeks | Alex Pandolfi | 2 perfect weeks |

**League totals:** 226 errors, 7 perfect weeks, 2,025.6 points left on bench

---

## Will Hofner's Season (Team ID: 1) — Deep Dive

### Overview
- **Record:** 4-10 (7th of 8)
- **Optimal Record:** 4-10 (same — he was genuinely outmatched)
- **Optimal vs Actual:** 8-8 (would've won 4 more with optimal lineups)
- **Total Points:** 1,596.2 | **Optimal:** 1,853.8 | **Left on bench:** 257.6
- **Errors:** 28 (62nd percentile — slightly below average)
- **Perfect Weeks:** 0

### Key Moments
| Moment | Details |
|--------|---------|
| Best Week | Week 9: 138.04 pts (beat Noah Ip 138-125, one of only 4 wins) |
| Worst Week | Week 12: 82.5 pts (lost to Lou Chrisos 82-142) |
| Lucky Break | Week 1: Won 108-93 vs Zach Mouser |
| Tough Luck | Week 2: Lost 128-160 vs Noah Ip (scored well, opponent exploded) |
| Most Slept On | Quinshon Judkins: benched 5 weeks, missed 97.0 points |
| Most Overrated | Nico Collins: started 6 weeks, only produced 61.3 pts from those starts |
| Highest Bench Player | Week 12: Wan'Dale Robinson (30.6 pts on bench, +22.1 gain) |

### Records Analysis
- **Actual:** 4-10 → **Optimal:** 4-10 (same!) → Even with perfect lineups, this team was outmatched
- **Optimal vs Opponent Actual:** 8-8 → 4 more wins possible with optimal lineups
- **Cross-comparisons:** Beat opponent's optimal only 1 time; would've lost to opponent's optimal 6 times

**Gasp moment potential:** "Even with perfect lineups every week, you would've still gone 4-10. You weren't unlucky — you were outmatched." (This is a validating/sobering moment, not a roast.)

---

## Draft Data — Full Board (First 3 Rounds)

| Pick | Player | Pos | Total Pts | Stars | Manager |
|------|--------|-----|-----------|-------|---------|
| #1 | Jahmyr Gibbs | RB | 307.6 | 4.5★ | Allan Baut |
| #2 | Ja'Marr Chase | WR | 221.9 | 3.0★ | Zach Mouser |
| #3 | Saquon Barkley | RB | 187.1 | 2.0★ | Tj Fenton |
| #4 | Bijan Robinson | RB | 264.3 | 4.0★ | Will Chrisos |
| #5 | Justin Jefferson | WR | 157.4 | 2.0★ | Lou Chrisos |
| #6 | **CeeDee Lamb** | **WR** | **161.7** | **3.0★** | **Will Hofner** |
| #7 | Derrick Henry | RB | 188.5 | 2.5★ | Alex Pandolfi |
| #8 | Christian McCaffrey | RB | 328.5 | 5.0★ | Noah Ip |
| #9 | Amon-Ra St. Brown | WR | 233.5 | 3.5★ | Noah Ip |
| #10 | Puka Nacua | WR | 258.9 | 4.0★ | Alex Pandolfi |
| #11 | **Nico Collins** | **WR** | **184.1** | **3.5★** | **Will Hofner** |
| #12 | Ashton Jeanty | RB | 183.4 | 2.5★ | Lou Chrisos |
| #13 | Brian Thomas Jr. | WR | 102.1 | 1.0★ | Will Chrisos |
| #14 | De'Von Achane | RB | 271.9 | 4.5★ | Tj Fenton |
| #15 | Drake London | WR | 177.0 | 2.5★ | Zach Mouser |
| #16 | Brock Bowers | TE | 153.1 | 2.5★ | Allan Baut |
| #17 | Josh Allen | QB | 310.0 | 5.0★ | Allan Baut |
| #18 | Josh Jacobs | RB | 207.8 | 3.0★ | Zach Mouser |
| #19 | A.J. Brown | WR | 177.9 | 3.0★ | Tj Fenton |
| #20 | Lamar Jackson | QB | 175.1 | 2.5★ | Will Chrisos |
| #21 | Bucky Irving | RB | 104.2 | 1.5★ | Lou Chrisos |
| #22 | **Jayden Daniels** | **QB** | **114.3** | **2.5★** | **Will Hofner** |
| #23 | Jonathan Taylor | RB | 309.0 | 5.0★ | Alex Pandolfi |
| #24 | Chase Brown | RB | 185.6 | 3.0★ | Noah Ip |

---

## Will Hofner's Draft Picks (All 16 Rounds)

| Round | Pick | Player | Pos | Total Pts | Stars | Grade |
|-------|------|--------|-----|-----------|-------|-------|
| 1 | #6 | CeeDee Lamb | WR | 161.7 | 3.0★ | — |
| 2 | #11 | Nico Collins | WR | 184.1 | 3.5★ | — |
| 3 | #22 | Jayden Daniels | QB | 114.3 | 2.5★ | — |
| 4 | #27 | Kyren Williams | RB | 202.9 | 4.0★ | — |
| 5 | #38 | George Kittle | TE | 106.3 | 2.5★ | — |
| 6 | #43 | James Conner | RB | 33.3 | 0.5★ | BUST |
| 7 | #54 | Rashee Rice | WR | 138.0 | 3.0★ | — |
| 8 | #59 | Travis Hunter | WR | 24.8 | 0.5★ | BUST |
| 9 | #70 | Quinshon Judkins | RB | 155.0 | 3.5★ | — |
| 10 | #75 | Stefon Diggs | WR | 152.5 | 3.0★ | — |
| 11 | #86 | Jaylen Warren | RB | 158.9 | 3.5★ | — |
| 12 | #91 | C.J. Stroud | QB | 124.2 | 2.0★ | — |
| 13 | #102 | Mark Andrews | TE | 12.3 | 0.5★ | BUST |
| 14 | #107 | Jake Elliott | K | 44.0 | 1.0★ | BUST |
| 15 | #118 | Eagles D/ST | D/ST | 66.0 | 2.5★ | — |
| 16 | #123 | Deebo Samuel | WR | 159.0 | 3.5★ | — |

**4 BUSTs:** James Conner (33.3), Travis Hunter (24.8), Mark Andrews (12.3), Jake Elliott (44.0)
**0 GEMs** — No breakout late-round picks

---

## Draft Alternatives Preview (Will Hofner)

What the new draft alternatives feature would show. For each pick, these are the players taken between this pick and Will's next pick:

### Biggest Misses (Top 5 by Point Differential)

| Round | Your Pick | Pts | Missed Player | Pts | Differential | Picked By |
|-------|-----------|-----|---------------|-----|--------------|-----------|
| 3 | Jayden Daniels | 114.3 | **Jonathan Taylor** | 309.0 | **+194.7** | Alex Pandolfi |
| 14 | Jake Elliott | 44.0 | **Caleb Williams** | 221.6 | **+177.6** | Lou Chrisos |
| 13 | Mark Andrews | 12.3 | **Baker Mayfield** | 186.5 | **+174.2** | Noah Ip |
| 1 | CeeDee Lamb | 161.7 | **Christian McCaffrey** | 328.5 | **+166.8** | Noah Ip |
| 8 | Travis Hunter | 24.8 | **Travis Etienne Jr.** | 189.8 | **+165.0** | Will Chrisos |

**Headline gasp moment:** "If you drafted Jonathan Taylor instead of Jayden Daniels in Round 3: **+194.7 points**"

### Full Alternatives Breakdown

| Rd | Your Pick (Pts) | Biggest Alternative (Pts) | Diff | Notes |
|----|-----------------|---------------------------|------|-------|
| 1 | CeeDee Lamb (161.7) | CMC (328.5) | +166.8 | CMC was 2 picks later! |
| 2 | Nico Collins (184.1) | Josh Allen (310.0) | +125.9 | QB in round 2 would've been bold |
| 3 | Jayden Daniels (114.3) | Jonathan Taylor (309.0) | +194.7 | **BIGGEST MISS OF DRAFT** |
| 4 | Kyren Williams (202.9) | Trey McBride (234.7) | +31.8 | Solid pick, small miss |
| 5 | George Kittle (106.3) | Davante Adams (211.8) | +105.5 | |
| 6 | James Conner (33.3) | Jaylen Waddle (176.6) | +143.3 | BUST pick, big miss |
| 7 | Rashee Rice (138.0) | Patrick Mahomes (272.6) | +134.6 | |
| 8 | Travis Hunter (24.8) | Travis Etienne (189.8) | +165.0 | BUST pick, huge miss |
| 9 | Quinshon Judkins (155.0) | Zay Flowers (163.5) | +8.5 | Good pick, tiny miss |
| 10 | Stefon Diggs (152.5) | JSN (287.4) | +134.9 | JSN was league's top scorer! |
| 11 | Jaylen Warren (158.9) | George Pickens (245.9) | +87.0 | |
| 12 | C.J. Stroud (124.2) | Jordan Love (217.4) | +93.2 | |
| 13 | Mark Andrews (12.3) | Baker Mayfield (186.5) | +174.2 | BUST, massive miss |
| 14 | Jake Elliott (44.0) | Caleb Williams (221.6) | +177.6 | K pick, QB available |
| 15 | Eagles D/ST (66.0) | Seahawks D/ST (159.0) | +93.0 | |
| 16 | Deebo Samuel (159.0) | — | — | Best pick of his round! |

---

## Waiver Wire Activity

| Award | Winner | Detail |
|-------|--------|--------|
| Diamond in the Rough | Zach Mouser | Drake Maye pickup → 217.5 pts |
| The Tinkerer | Zach Mouser | 48 total moves (24 adds, 24 drops) |
| Set and Forget | Tj Fenton | 11 total moves (6 adds, 5 drops) |
| The Journeyman | C.J. Stroud | Rostered by 3 different teams |
| Revolving Door | D/ST position | 29 adds league-wide |

### Moves by Team
| Manager | Adds | Drops | Total Moves |
|---------|------|-------|-------------|
| Zach Mouser | 24 | 24 | 48 |
| Noah Ip | 23 | 21 | 44 |
| Will Chrisos | 18 | 15 | 33 |
| Will Hofner | 14 | 14 | 28 |
| Allan Baut | 14 | 13 | 27 |
| Lou Chrisos | 14 | 12 | 26 |
| Alex Pandolfi | 12 | 11 | 23 |
| Tj Fenton | 6 | 5 | 11 |

---

## Observations for Feature Development

### What Makes This League Interesting for Testing

1. **8-team league** — Different dynamics than 10/12. Rosters are stacked, waiver wire has more talent. Draft alternatives should compare against 7 picks (not 11).

2. **15-week regular season** (not 14) — Validates the need for dynamic week detection from ESPN API.

3. **Will Hofner went 4-10 actual AND 4-10 optimal** — Rare case where optimal record equals actual. "Even playing perfectly, you would've gone 4-10." This is a unique gasp moment type (not unlucky, just outmatched).

4. **Zach Mouser: biggest underperformer** — 6-8 actual but optimal would've been 14-0(?) or much better. 8 win difference from optimal is massive. Great "One Player Away" candidate.

5. **Lou Chrisos: luckiest team** — 10-4 with 0 win difference from optimal. Record matched optimal exactly. "Your lineup decisions didn't cost you a single game."

6. **Round 3 is the biggest draft miss** — Jayden Daniels (114.3) vs Jonathan Taylor (309.0) = +194.7. This is EXACTLY the kind of haunting what-if the draft alternatives feature is designed to surface.

7. **4 BUSTs, 0 GEMs for Will** — Draft wasn't great. James Conner (33.3), Travis Hunter (24.8), Mark Andrews (12.3), Jake Elliott (44.0). Three of those were in rounds 6-14 where alternatives were all dramatically better.

8. **CMC at pick #8 scored 328.5** — Highest scorer in the league. Was available when Will picked CeeDee Lamb at #6. That's a +166.8 miss that will haunt.

9. **Waiver wire is active** — 48 moves by Zach Mouser, 44 by Noah Ip. D/ST streaming was rampant (29 adds). Good variety for waiver analysis.

10. **Season ended at week 19** (current_week) — Indicates playoffs ran weeks 16-19. We should only analyze regular season (1-15) by default.
