"""
The league itself (ESPN r/GeedStreetBets, 8 teams): live fantasy scores for the pick sheet's
"who pays" view, and each week's lowest scorer, who funds the next week's parlay.

Week numbers line up: fantasy matchup N = NFL week N, and parlay week N+1 is paid for
by the lowest scorer of week N (a tie means both pay).
"""
import time
from datetime import date, timedelta

import requests

LEAGUE_ID = '17810260'
SEASON = 2026
# ESPN team id -> the name the league uses on pandolfi.bet (checked against every funder Weeks 2-7)
TEAM_MANAGER = {1: 'Hof', 2: 'Zach', 3: 'TJ', 5: 'Lou', 6: 'Allan', 7: 'Pandolfi', 8: 'Noah', 9: 'Willy'}
WEEK1_TUESDAY = date(2026, 9, 8)   # Tuesday before the 2026 opener; pick-sheet week keys are Tuesdays
URL = f'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{SEASON}/segments/0/leagues/{LEAGUE_ID}'

_cache = {}


def nfl_week(week_key):
    """'2026-10-27' (a pick-sheet week key, maybe with '-test') -> 8."""
    return (date.fromisoformat(week_key[:10]) - WEEK1_TUESDAY).days // 7 + 1


def week_key(n):
    return (WEEK1_TUESDAY + timedelta(days=7 * (n - 1))).isoformat()


def _cached(key, ttl, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = fn()
    _cache[key] = (time.time(), val)
    return val


def _season():
    """Every matchup's final total for the season so far, in one call."""
    def load():
        r = requests.get(URL, params={'view': ['mMatchupScore', 'mTeam']}, timeout=20)
        r.raise_for_status()
        return r.json()
    return _cached('season', 120, load)


def lows():
    """Lowest scorer of every finished week: [{week, managers, points}]."""
    d = _season()
    current = (d.get('status') or {}).get('currentMatchupPeriod') or d.get('scoringPeriodId') or 1
    by_week = {}
    for m in d.get('schedule', []):
        w = m.get('matchupPeriodId')
        if not w or w >= current:
            continue
        for side in ('home', 'away'):
            if side in m:
                by_week.setdefault(w, []).append((round(m[side].get('totalPoints', 0), 2), TEAM_MANAGER.get(m[side]['teamId'], '?')))
    out = []
    for w in sorted(by_week):
        low = min(p for p, _ in by_week[w])
        out.append({'week': w, 'points': low, 'managers': [n for p, n in by_week[w] if p == low]})
    return out


def funder(parlay_week):
    """Who pays for parlay week N: the lowest scorer(s) of fantasy week N-1, once that week is final."""
    hit = next((x for x in lows() if x['week'] == parlay_week - 1), None)
    if hit:
        return hit['managers']
    # ESPN rolls its current week over a day or two after Monday night; the scoreboard knows sooner
    try:
        s = scores(parlay_week - 1)
        if s['final'] and s['week'] == parlay_week - 1 and s['teams']:
            low = s['teams'][0]['points']
            return [t['manager'] for t in s['teams'] if t['points'] == low]
    except Exception:
        pass
    return None


def scores(week=None):
    """Live scoreboard for one week, lowest first."""
    from live import get_live_week

    def load():
        d = get_live_week(LEAGUE_ID, SEASON, week)
        teams = []
        for mu in d['matchups']:
            for side, other in (('home', 'away'), ('away', 'home')):
                t, o = mu[side], mu[other]
                teams.append({'manager': TEAM_MANAGER.get(t['team_id'], t.get('owner') or '?'), 'team': (t['name'] or '').strip(),
                              'points': t['points'], 'projected': t['projected'], 'yetToPlay': t['yet_to_play'],
                              'playing': t['in_play'], 'done': t['finished'], 'starters': t['starter_count'],
                              'opponent': TEAM_MANAGER.get(o['team_id'], '?'), 'oppPoints': o['points'],
                              'live': [{'name': p['name'], 'pos': p['slot'], 'pts': p['points'], 'state': p['game_state'], 'detail': p['game_detail']}
                                       for p in t['players'] if p['starter']]})
        teams.sort(key=lambda x: x['points'])
        return {'week': d['week'], 'phase': d['phase'], 'teams': teams, 'final': d['phase'] == 'final'}
    out = _cached(f'scores-{week}', 30, load)
    return dict(out, lows=lows())
