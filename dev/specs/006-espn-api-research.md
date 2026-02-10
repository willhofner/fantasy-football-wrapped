# 006: ESPN Fantasy Football API Research

**Date:** 2026-02-10
**Purpose:** Comprehensive catalog of all available ESPN Fantasy Football API data beyond what the project currently uses, plus creative stat ideas for Wrapped.

---

## Current Usage

The project currently fetches from this base URL:
```
https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}
```

Views currently used:
- `mMatchup` — Weekly matchup results with full roster data
- `mRoster` — Team rosters with player details
- `mTeam` — Team metadata, records, transaction counters
- `mSettings` — League settings (name, schedule, roster slots)

Additional APIs used:
- ESPN NFL Scoreboard (`site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`)
- ESPN Search API (player images)

---

## All Available API Views

### Views Confirmed Working (Public Leagues, No Auth)

| View | Top-Level Keys Added | What It Returns |
|------|---------------------|-----------------|
| `mMatchup` | `schedule`, `teams` | Full matchup data with rosters for each scoring period. Includes `rosterForMatchupPeriod` and `rosterForCurrentScoringPeriod` with player stats (actual + projected). |
| `mRoster` | `teams[].roster` | Current roster snapshot for specified `scoringPeriodId`. Includes `acquisitionDate`, `acquisitionType`, `pendingTransactionIds`, `injuryStatus`. Each player has `keeperValue`, `keeperValueFuture`, `ratings`. |
| `mTeam` | `teams`, `members`, `settings` | Full team data: name, abbrev, logo, divisionId, owners, record (overall/home/away/division), `transactionCounter`, `valuesByStat`, `draftDayProjectedRank`, `playoffSeed`, `rankCalculatedFinal`, `waiverRank`, `points`, `pointsAdjusted`. |
| `mSettings` | `settings` | League configuration: `acquisitionSettings`, `draftSettings`, `financeSettings`, `rosterSettings`, `scheduleSettings`, `scoringSettings`, `tradeSettings`. |
| `mDraftDetail` | `draftDetail` | Complete draft data: `picks[]` with round, pick number, playerId, teamId, keeper status, autoDraftTypeId, bidAmount, nominatingTeamId. Also `completeDate`, `drafted`, `inProgress`. |
| `mBoxscore` | `schedule` (with detailed roster stats) | Per-matchup boxscore with full individual stat breakdowns. Each player has `statSourceId=0` (actual) and `statSourceId=1` (projected) entries with granular stat dictionaries. |
| `mMatchupScore` | `schedule` | Matchup scores including `playoffTierType` (NONE, WINNERS_BRACKET, LOSERS_CONSOLATION_LADDER, WINNERS_CONSOLATION_LADDER), `winner`, `adjustment`, `tiebreak`, `cumulativeScore` with `scoreByStat`. |
| `mNav` | `members` | Member details: `displayName`, `firstName`, `lastName`, `id`, `isLeagueCreator`, `isLeagueManager`. |
| `mStatus` | `status` | League status: `activatedDate`, `currentMatchupPeriod`, `finalScoringPeriod`, `previousSeasons[]`, `waiverLastExecutionDate`, `waiverProcessStatus` (dates with claim counts), `isActive`, `isFull`, `teamsJoined`. |
| `mLiveScoring` | `schedule` | Live scoring data (primarily useful during active games; returns sparse data for completed weeks). |
| `mStandings` | `schedule`, `teams` | Standings data (returns minimal team data in testing; may need specific period context). |
| `mScoreboard` | `schedule`, `teams`, `settings` | Scoreboard view combining schedule with team abbrevs, records, and scoring settings. |
| `mPositionalRatings` | `positionAgainstOpponent` | Strength-of-schedule data by position. For each position (QB=1, RB=2, WR=3, TE=4, K=5, D/ST=16), shows average fantasy points allowed by each NFL team with rankings. |
| `kona_player_info` | `players` | Top 50 players with full stats, ownership data, draft ranks, and projections. |
| `mPendingTransactions` | (minimal) | Pending transaction data (appears to require auth or only populates during active waiver periods). |
| `mSchedule` | (minimal) | Schedule skeleton without scores (limited utility). |
| `player_wl` | `teams` (minimal) | Player watchlist data (minimal without auth). |
| `mPendingMoveTx` | `teams`, `members` | Pending move transactions (minimal without auth). |

### Views That Can Be Combined

Multiple views can be passed in a single request:
```
?view=mMatchup&view=mTeam&view=mDraftDetail
```
This merges all returned keys into a single response, reducing API calls.

---

## Data Structure Deep Dives

### Draft Data (`mDraftDetail`)

```json
{
  "draftDetail": {
    "completeDate": 1723246833375,
    "drafted": true,
    "inProgress": false,
    "picks": [
      {
        "autoDraftTypeId": 0,       // 0=manual, >0=auto-draft
        "bidAmount": 0,             // Auction bid (0 for snake drafts)
        "id": 1,
        "keeper": false,            // Whether this was a keeper pick
        "lineupSlotId": 4,          // Position slot assigned
        "nominatingTeamId": 0,      // For auction: who nominated
        "overallPickNumber": 1,
        "playerId": 3116406,        // ESPN player ID
        "reservedForKeeper": false,
        "roundId": 1,
        "roundPickNumber": 1,
        "teamId": 5,
        "tradeLocked": false
      }
    ]
  }
}
```

**Key fields:**
- `keeper` — Identifies keeper picks (for keeper/dynasty leagues)
- `autoDraftTypeId` — Whether the pick was auto-drafted (0 = manual)
- `bidAmount` — Auction draft bid amount
- `nominatingTeamId` — Who nominated the player in auction
- `overallPickNumber` / `roundId` / `roundPickNumber` — Full draft position

**Player ID Resolution:**
Player IDs can be resolved to names via:
```
https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{playerId}
```
Returns: name, position, team, headshot URL, college, age, experience, jersey number.

### Draft Settings (`mSettings.draftSettings`)

```json
{
  "auctionBudget": 200,
  "isTradingEnabled": false,
  "keeperCount": 0,
  "keeperCountFuture": 0,
  "keeperOrderType": "TRADITIONAL",
  "leagueSubType": "NONE",
  "orderType": "MANUAL",         // MANUAL, SNAKE, AUCTION
  "pickOrder": [5, 3, 7, 8, 6, 2, 1, 9],
  "timePerSelection": 90,
  "type": "OFFLINE"              // OFFLINE, ONLINE, AUTOPICK
}
```

### Transaction Counters (`mTeam.transactionCounter`)

```json
{
  "acquisitionBudgetSpent": 0,
  "acquisitions": 24,
  "drops": 23,
  "matchupAcquisitionTotals": {
    "2": 3, "5": 2, "6": 2, ...  // week: count
  },
  "misc": 0,
  "moveToActive": 65,
  "moveToIR": 4,
  "paid": 0.0,
  "teamCharges": 0.0,
  "trades": 0
}
```

**Available per team:** acquisitions, drops, trades, IR moves, FAAB budget spent, and acquisitions broken down by matchup period.

### Keeper Values (`mRoster` player entries)

```json
{
  "playerPoolEntry": {
    "keeperValue": 3,         // Draft round cost to keep
    "keeperValueFuture": 1,   // Future keeper cost
    ...
  }
}
```

Available for every rostered player. Shows what round it would cost to keep each player.

### Player Projections vs Actuals (`mBoxscore` / `kona_player_info`)

Each player's `stats` array contains entries differentiated by:

| `statSourceId` | `statSplitTypeId` | Meaning |
|---|---|---|
| 0 | 0 | Actual stats, full season |
| 0 | 1 | Actual stats, specific week |
| 1 | 0 | Projected stats, full season |
| 1 | 1 | Projected stats, specific week |
| 1 | 2 | Projected stats, "last X" rolling |

Each entry has `appliedTotal` (fantasy points) and a `stats` dictionary with granular stat values.

### Player Ownership Data (`kona_player_info`)

```json
{
  "ownership": {
    "auctionValueAverage": 0.0,
    "averageDraftPosition": 23.2,
    "averageDraftPositionPercentChange": 0.0,
    "percentOwned": 99.29,
    "percentStarted": 91.37,
    "percentChange": -0.14
  }
}
```

### Positional Ratings / Strength of Schedule (`mPositionalRatings`)

```json
{
  "positionAgainstOpponent": {
    "positionalRatings": {
      "1": {  // QB
        "average": 16.3,
        "ratingsByOpponent": {
          "1": { "average": 19.96, "rank": 29 },  // ATL allows 19.96 ppg to QBs, ranked 29th
          "2": { "average": 15.66, "rank": 8 },    // BUF
          ...
        }
      },
      "2": { ... },  // RB
      "3": { ... },  // WR
      "4": { ... },  // TE
      "5": { ... },  // K
      "16": { ... }  // D/ST
    }
  }
}
```

Shows how many fantasy points each NFL team allows to each position. Useful for strength-of-schedule analysis.

### Playoff Bracket Data (`mMatchupScore`)

Each matchup includes:
- `playoffTierType`: `NONE`, `WINNERS_BRACKET`, `LOSERS_CONSOLATION_LADDER`, `WINNERS_CONSOLATION_LADDER`
- `winner`: `HOME`, `AWAY`, `UNDECIDED`
- Matchups in periods beyond regular season (e.g., periods 15-17 for playoffs)

Bracket structure can be reconstructed from matchup progression across weeks.

### Team Records (`mTeam.record`)

Four record types per team:
- `overall` — Full season W-L-T with PF/PA, streak, games back
- `home` — Home matchups only
- `away` — Away matchups only
- `division` — Intra-division matchups only

Each includes: `wins`, `losses`, `ties`, `percentage`, `pointsFor`, `pointsAgainst`, `streakLength`, `streakType`, `gamesBack`.

### Historical Seasons

Previous season data is accessible by changing the `year` in the URL. The `status.previousSeasons` array lists available years. Full team data, rosters, matchups, and draft data are all available for past seasons.

### Cumulative Score by Stat Category (`mMatchup.cumulativeScore`)

Each matchup side includes a `scoreByStat` dictionary breaking down the score by stat category (e.g., how many points came from passing yards vs rushing TDs vs defense). Useful for "how did you win?" analysis.

---

## ESPN Stat ID Reference

### Offense
| ID | Stat |
|----|------|
| 0 | Passing Attempts |
| 1 | Passing Completions |
| 2 | Passing Incompletions |
| 3 | Passing Yards |
| 4 | Passing TDs |
| 15 | Passing TDs 40+ yards |
| 16 | Passing TDs 50+ yards |
| 17 | Passing 300+ yard games |
| 18 | Passing 350+ yard games |
| 19 | Passing Interceptions |
| 20 | Passing 2pt Conversions |
| 23 | Rushing Attempts |
| 24 | Rushing Yards |
| 25 | Rushing TDs |
| 26 | Rushing 2pt Conversions |
| 28 | Rushing TDs 40+ yards |
| 29 | Rushing TDs 50+ yards |
| 30 | Rushing 100+ yard games |
| 31 | Rushing 200+ yard games |
| 39 | Reception PPR value |
| 40 | Receiving Targets |
| 41 | Receptions |
| 42 | Receiving Yards |
| 43 | Receiving TDs |
| 44 | Receiving 2pt Conversions |
| 47 | Receiving TDs 40+ yards |
| 48 | Receiving TDs 50+ yards |
| 49 | Receiving 100+ yard games |
| 50 | Receiving 200+ yard games |
| 53 | Receiving Receptions |
| 58 | Return TDs |
| 63 | Return Yards |
| 68 | Fumble Recovery TD |
| 72 | Lost Fumbles |
| 73 | Fumbles |

### Kicking
| ID | Stat |
|----|------|
| 77 | FG Made 0-39 yards |
| 78 | FG Made 40-49 yards |
| 79 | FG Made 50+ yards |
| 80 | FG Attempted |
| 83 | FG Missed |
| 85 | FG Made (total) |
| 86 | Extra Points Made |
| 87 | Extra Points Attempted |
| 88 | Extra Points Missed |

### Defense/Special Teams
| ID | Stat |
|----|------|
| 89 | Sacks |
| 90 | Interceptions |
| 91 | Fumble Recoveries |
| 92 | Blocked Kicks |
| 93 | Defensive TDs |
| 95 | Safeties |
| 96 | Interception Return TDs |
| 97 | Fumble Recovery TDs |
| 98 | Blocked Kick TDs |
| 99 | Tackles for Loss |
| 101 | Kickoff Return TDs |
| 102 | Punt Return TDs |
| 103 | Forced Fumbles |
| 104 | Stuffs |
| 120 | Points Allowed |
| 123-125 | Points Allowed tiers (0, 1-6, 7-13) |
| 128-136 | Yards Allowed tiers (100, 199, 299, 349, 399, 449, 499, 549, 550+) |
| 198 | Offensive Fumble Recovery |
| 206 | INT Return Yards |
| 209 | Sack Yards |

---

## Additional ESPN API Endpoints

### Player/Athlete Info
```
GET https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{playerId}
```
Returns: displayName, position, team, headshot URL, college, age, experience, jersey, displayDraft, injuries, statsSummary.

### Player Image (headshot)
```
https://a.espncdn.com/i/headshots/nfl/players/full/{playerId}.png
```
Direct image URL. No API call needed.

### Player Search
```
GET https://site.web.api.espn.com/apis/common/v3/search?query={name}&limit=1&mode=prefix&type=player&sport=football
```

### NFL Scoreboard
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={YYYYMMDD}-{YYYYMMDD}&limit=100
```

### NFL Team Info
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}
```

---

## What's NOT Available (Public Leagues)

1. **Individual transaction history** — `mPendingTransactions` and `mTransactions2` return minimal data without auth. Transaction *counts* are available per team via `transactionCounter`, but individual add/drop/trade details require authentication cookies (`espn_s2` + `SWID`).

2. **Trade details** — Trade count is in `transactionCounter.trades`, but the specific players involved in trades require auth.

3. **Waiver order** — `waiverRank` is available per team, but the full waiver wire order and claim details need auth.

4. **Message board / league chat** — The `communication` endpoint returns empty without auth.

5. **League Manager Notes** — Requires auth.

6. **Real-time live scoring breakdown** — `mLiveScoring` returns sparse data for completed weeks. Primarily useful during live games.

---

## Stat Ideas for Fantasy Football Wrapped

### Draft Analysis (NEW - uses `mDraftDetail`)

1. **Draft Report Card** — Grade each team's draft based on total season points produced by their picks vs ADP expectations. "Your 1st round pick (Tyreek Hill, #1 overall) finished as WR12. Grade: C+." Show which rounds hit and which busted.

2. **Steal of the Draft** — Find the pick with the highest fantasy points relative to their draft position. "Round 12 Pick: Brock Bowers (TE) scored 215 points. Best value pick in the league."

3. **Draft Day Bust** — Highest-drafted player with the worst production. "Your #2 pick CMC played 4 games and scored 38 points. Ouch."

4. **Roster Turnover Rate** — Compare Week 1 roster to final roster. "You only kept 13 of your 16 drafted players. Your rival kept just 8 — they basically drafted a whole new team on the waiver wire."

5. **Draft Position Destiny** — Compare `draftDayProjectedRank` to `rankCalculatedFinal`. "ESPN projected you'd finish 7th. You finished 2nd. Overachiever."

### Projection Accuracy (NEW - uses projected vs actual stats)

6. **The Crystal Ball Award** — Which manager's actual weekly scores most closely matched projections? "Your team averaged only 3.2 points off projections — you were the most predictable team in the league."

7. **The Chaos Agent** — Which manager's scores deviated most from projections? "Your team outscored projections by 15+ points 4 times and underscored by 15+ points 3 times. Pure chaos."

8. **Boom/Bust Player Tracker** — For each player on a roster, calculate weeks they exceeded projections by 50%+ (booms) vs fell 50%+ short (busts). "De'Von Achane boomed 8 times and busted 3 times."

9. **The Projection Liar** — Player who was most consistently over-projected all season. "Travis Kelce was projected for 14+ points 10 times but only hit that mark twice."

### Scoring Breakdown (NEW - uses `cumulativeScore.scoreByStat`)

10. **How You Won** — Break down a team's total points by category: what percentage came from passing, rushing, receiving, defense, kicking. "72% of your points came from the ground game. You were a run-first fantasy team."

11. **The One-Trick Pony** — Team most reliant on a single stat category. "85% of your points came from receiving yards and TDs. When your WRs went cold, so did your team."

### Waiver Wire / Roster Management (uses `transactionCounter` + roster comparisons)

12. **The Tinkerer vs The Set-It-And-Forget-It** — Rank managers by total roster moves (acquisitions + drops + IR moves). "You made 65 roster moves. The league average was 28. You spent more time on waivers than watching games."

13. **Waiver Wire MVP** — Track which undrafted players (acquired via waivers) scored the most points for each team. Compare Week 1 roster to later weeks, identify additions, and sum their contributions.

14. **Panic Dropper** — Find players dropped early who later produced. Cross-reference players on Week 1 rosters that ended up being top scorers elsewhere.

### Matchup Drama (enhanced with boxscore data)

15. **Monday Night Miracle / Meltdown** — Using `pointsByScoringPeriod` and player `proTeamId` mapped to game times, identify matchups that were decided by the last game of the week. "You were down 12 going into Monday Night. Your Lamar Jackson scored 25.1. Miracle."

16. **The Margin of Pain** — Closest losses across the season. "Your 3 closest losses totaled a combined 4.7 points. That's the difference between 11-3 and 8-6."

17. **If Only...** — For each loss, show the single bench player swap that would have changed the outcome. "In Week 5, starting Brock Bowers instead of Travis Kelce would have won you the matchup by 0.3 points."

### Position Strength Analysis (uses positional ratings)

18. **Strength of Schedule Luck** — Using `mPositionalRatings`, calculate which teams faced the easiest vs hardest schedule for their strongest positions. "Your opponents' defenses allowed the 3rd most points to WRs. Your WR-heavy roster had it easy."

### Dynasty / Keeper Insights (uses keeper values)

19. **Keeper Value Report** — Show each team's best keeper values (low cost, high production). "Brock Bowers can be kept in round 12 next year after scoring 215 points. That's the steal of the offseason."

### Season Arc / Narrative Stats

20. **The Hot Streak / Cold Streak** — Already partially available via `streakLength`/`streakType` in records, but enhance with scoring context. "Your 6-game win streak from Weeks 7-12 was fueled by an average score of 148.3. Then you scored 88.9 in Week 13 and it all fell apart."

21. **Home vs Away Performance** — Using `record.home` and `record.away`, highlight discrepancies. "You were 6-1 at home but 2-5 on the road. Your team had home field advantage in fantasy football somehow."

22. **Division Domination** — Using `record.division`, find who owned their division. "You went 6-0 against your division. Your divisional rivals scored a combined 12 fewer points per game against you."

23. **Points For vs Points Against Gap** — "You scored the 2nd most points in the league but allowed the most. Your matchups were barn burners — your average game had 267 combined points."

24. **The Playoff Path** — Reconstruct the playoff bracket from `playoffTierType` matchups. "Semifinals: Beat Team 8 by 14. Championship: Lost to Team 2 by 11. So close."

25. **Season Momentum Chart** — Plot cumulative points-above-average by week to show a team's momentum arc. "You started 2-3 but finished 9-5. Your turning point was Week 6 when you scored 159 points."

### Cross-Season Analysis (uses historical season access)

26. **Year-Over-Year Growth** — Compare this season to previous seasons (available via `status.previousSeasons`). "Your 2024 record of 11-3 is your best ever. In 2023 you went 7-7, and 2022 was 5-9."

27. **The Dynasty Builder** — Track which teams have been consistently good across multiple seasons using historical `rankCalculatedFinal` data.

---

## API Usage Notes

- **Rate Limits:** No documented rate limits, but be respectful. ESPN could throttle or block excessive requests.
- **Caching:** Data for completed weeks doesn't change. Cache aggressively for historical data.
- **Combined Views:** Use multiple `view` params in one request to reduce calls. `?view=mMatchup&view=mTeam&view=mDraftDetail` works.
- **Player ID Resolution:** Cache player name lookups. The athlete endpoint is separate from the fantasy API.
- **Headshot URLs:** Direct image URLs (`a.espncdn.com/i/headshots/nfl/players/full/{id}.png`) don't need API calls.
- **Historical Data:** All views work with any previous season year. Go back as far as the league has existed.
- **Scoring Period:** Pass `scoringPeriodId` to get week-specific roster snapshots and stats.

---

## Priority Recommendations for Wrapped

### High Value, Low Effort (use data already being fetched)
- Draft Report Card (#1) — just need `mDraftDetail` + resolve player IDs
- Draft Position Destiny (#5) — `draftDayProjectedRank` is already in `mTeam`
- The Tinkerer (#12) — `transactionCounter` is already in `mTeam`
- Home vs Away (#21) — record data already in `mTeam`
- Division Domination (#22) — record data already in `mTeam`

### High Value, Medium Effort (one new API call)
- Projection Accuracy (#6, #7) — need `mBoxscore` with `statSourceId` filter
- Boom/Bust Tracker (#8) — need projected + actual per player per week
- Roster Turnover (#4) — compare Week 1 vs final `mRoster` snapshots
- Season Momentum Chart (#25) — weekly scores already available, just need visualization

### High Value, Higher Effort (multiple new calls or complex logic)
- Steal of the Draft / Draft Bust (#2, #3) — need draft picks + season-long player performance
- Monday Night Miracle (#15) — need player proTeamId + NFL schedule mapping
- Waiver Wire MVP (#13) — need week-by-week roster diffs
- Cross-Season Analysis (#26, #27) — need to fetch multiple years
