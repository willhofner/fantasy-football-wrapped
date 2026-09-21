"""
Live Week — in-season view of the current scoring period.

Pulls ESPN's live matchup scores, live projections, win probability and each
starter's actual/projected points for one week, then joins every starter to the
real NFL game their team is playing so the page can show who has played, who is
playing right now, and who is still to come.
"""
from datetime import datetime, timezone

import requests

from espn_api import POSITION_MAP, PLAYER_POSITION_MAP
from nfl_data import fetch_nfl_scores

ESPN_LEAGUE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"

# ESPN fantasy proTeamId -> the abbreviation the NFL scoreboard API uses
PRO_TEAM_ABBR = {
    1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
    9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN",
    17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC",
    25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
}

BENCH_SLOTS = {20, 21}  # BENCH, IR

# Order starters the way a lineup card reads
SLOT_ORDER = {0: 0, 2: 1, 4: 2, 6: 3, 23: 4, 16: 5, 17: 6, 20: 7, 21: 8}


def _fetch(league_id, year, week=None):
    params = {"view": ["mMatchupScore", "mScoreboard", "mRoster", "mTeam", "mSettings"]}
    if week:
        params["scoringPeriodId"] = week
    resp = requests.get(ESPN_LEAGUE_URL.format(year=year, league_id=league_id), params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _nfl_game_map(year, week):
    """abbr -> {state, detail, opponent, score} for every NFL game this week."""
    games, err = fetch_nfl_scores(year, week)
    out = {}
    if err or not games:
        return out
    for g in games:
        for side, other in (("home", "away"), ("away", "home")):
            t = g[side]
            out[t["abbreviation"]] = {
                "state": g.get("state", "post" if g.get("is_final") else "pre"),
                "detail": g.get("detail") or g.get("status"),
                "opponent": g[other]["abbreviation"],
                "score": f"{t['score']}-{g[other]['score']}",
                "is_final": g.get("is_final", False),
            }
    return out


def _player(entry, week, nfl):
    ppe = entry.get("playerPoolEntry", {})
    p = ppe.get("player", {})
    slot_id = entry.get("lineupSlotId")
    proj = 0.0
    actual = None
    for s in p.get("stats", []):
        if s.get("scoringPeriodId") != week:
            continue
        if s.get("statSourceId") == 1:
            proj = s.get("appliedTotal", 0.0) or 0.0
        elif s.get("statSourceId") == 0:
            actual = s.get("appliedTotal", 0.0) or 0.0
    pts = ppe.get("appliedStatTotal")
    if pts is None:
        pts = actual or 0.0
    abbr = PRO_TEAM_ABBR.get(p.get("proTeamId"))
    game = nfl.get(abbr) if abbr else None
    state = game["state"] if game else ("bye" if abbr else "unknown")
    return {
        "id": p.get("id"),
        "name": p.get("fullName"),
        "position": PLAYER_POSITION_MAP.get(p.get("defaultPositionId"), "?"),
        "slot": POSITION_MAP.get(slot_id, f"Slot_{slot_id}"),
        "slot_order": SLOT_ORDER.get(slot_id, 9),
        "starter": slot_id not in BENCH_SLOTS,
        "pro_team": abbr,
        "points": round(float(pts), 2),
        "projected": round(float(proj), 2),
        "injury": entry.get("injuryStatus") or p.get("injuryStatus"),
        "game_state": state,           # pre | in | post | bye | unknown
        "game_detail": game["detail"] if game else ("BYE" if state == "bye" else ""),
        "game_score": game["score"] if game else "",
        "opponent": game["opponent"] if game else "",
    }


def _side(side, teams, members, week, nfl):
    team = teams.get(side.get("teamId"), {})
    roster = side.get("rosterForCurrentScoringPeriod", {}).get("entries", [])
    players = sorted((_player(e, week, nfl) for e in roster), key=lambda x: (x["slot_order"], -x["points"]))
    starters = [x for x in players if x["starter"]]
    rec = team.get("record", {}).get("overall", {})
    owner_ids = team.get("owners", [])
    owner = next((members[o] for o in owner_ids if o in members), None)
    live = side.get("totalPointsLive")
    return {
        "team_id": side.get("teamId"),
        "name": team.get("name") or f"{team.get('location', '')} {team.get('nickname', '')}".strip() or f"Team {side.get('teamId')}",
        "abbrev": team.get("abbrev"),
        "logo": team.get("logo"),
        "owner": owner,
        "record": {"wins": rec.get("wins", 0), "losses": rec.get("losses", 0), "ties": rec.get("ties", 0)},
        "points": round(float(live if live is not None else side.get("totalPoints", 0.0) or 0.0), 2),
        "projected": round(float(side.get("totalProjectedPointsLive") or side.get("totalProjectedPoints") or 0.0), 2),
        "win_probability": side.get("winProbability"),
        "yet_to_play": sum(1 for x in starters if x["game_state"] == "pre"),
        "in_play": sum(1 for x in starters if x["game_state"] == "in"),
        "finished": sum(1 for x in starters if x["game_state"] in ("post", "bye")),
        "starter_count": len(starters),
        "players": players,
    }


def get_live_week(league_id, year, week=None):
    """Return the live state of one week for a league. Raises on network errors."""
    data = _fetch(league_id, year, week)
    status = data.get("status", {})
    current = status.get("latestScoringPeriod") or data.get("scoringPeriodId") or 1
    if not week:
        week = current
        if data.get("scoringPeriodId") != week:
            data = _fetch(league_id, year, week)

    teams = {t["id"]: t for t in data.get("teams", [])}
    members = {}
    for m in data.get("members", []):
        full = f"{(m.get('firstName') or '').strip()} {(m.get('lastName') or '').strip()}".strip()
        members[m.get("id")] = full or m.get("displayName")

    nfl = _nfl_game_map(year, week)

    matchups = []
    for m in data.get("schedule", []):
        if m.get("matchupPeriodId") != week or "away" not in m:
            continue
        home = _side(m["home"], teams, members, week, nfl)
        away = _side(m["away"], teams, members, week, nfl)
        matchups.append({
            "id": m.get("id"),
            "home": home,
            "away": away,
            "winner": m.get("winner"),  # HOME | AWAY | UNDECIDED
            "playoff": m.get("playoffTierType") not in (None, "NONE"),
        })

    standings = []
    for t in data.get("teams", []):
        rec = t.get("record", {}).get("overall", {})
        owner = next((members[o] for o in t.get("owners", []) if o in members), None)
        standings.append({
            "team_id": t["id"],
            "name": t.get("name") or f"{t.get('location', '')} {t.get('nickname', '')}".strip(),
            "abbrev": t.get("abbrev"),
            "logo": t.get("logo"),
            "owner": owner,
            "wins": rec.get("wins", 0), "losses": rec.get("losses", 0), "ties": rec.get("ties", 0),
            "points_for": round(rec.get("pointsFor", 0.0), 2),
            "points_against": round(rec.get("pointsAgainst", 0.0), 2),
            "streak": f"{rec.get('streakType', '')[:1]}{rec.get('streakLength', 0)}" if rec.get("streakLength") else "",
            "playoff_seed": t.get("playoffSeed"),
        })
    standings.sort(key=lambda s: (-s["wins"], s["losses"], -s["points_for"]))

    top_scorers = []
    for mu in matchups:
        for side in ("home", "away"):
            for p in mu[side]["players"]:
                if p["starter"]:
                    top_scorers.append({**{k: p[k] for k in ("name", "position", "pro_team", "points", "projected", "game_state", "game_detail")},
                                        "team": mu[side]["name"], "team_id": mu[side]["team_id"]})
    top_scorers.sort(key=lambda p: -p["points"])

    any_live = any(g["state"] == "in" for g in nfl.values())
    all_final = bool(nfl) and all(g["state"] == "post" for g in nfl.values())
    settings = data.get("settings", {})

    return {
        "league_id": league_id,
        "league_name": settings.get("name"),
        "season": year,
        "week": week,
        "current_week": current,
        "is_current_week": week == current,
        "regular_season_weeks": settings.get("scheduleSettings", {}).get("matchupPeriodCount"),
        "phase": "live" if any_live else ("final" if all_final else "pregame"),
        "nfl_games": nfl,
        "matchups": matchups,
        "standings": standings,
        "top_scorers": top_scorers[:12],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
