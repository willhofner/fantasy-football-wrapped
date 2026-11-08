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
    """Fresh for `ttl` seconds. ESPN hiccups (timeouts, 5xx) get one retry; if that fails too,
    the last good answer is served (marked stale) rather than an error page."""
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    for attempt in (1, 2):
        try:
            val = fn()
            break
        except Exception as e:
            print(f'[Fantasy] ESPN {key} attempt {attempt} failed: {e}')
            if attempt == 2:
                if hit:
                    return dict(hit[1], stale=True) if isinstance(hit[1], dict) else hit[1]
                raise
            time.sleep(0.8)
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
        out.append({'week': w, 'points': low, 'managers': [n for p, n in by_week[w] if p == low],
                    'scores': [{'manager': n, 'points': p} for p, n in sorted(by_week[w])]})
    return out


def schedule():
    """Every finished week's score and opponent per manager, for the Scores page's "schedule swap"
    (your scores against someone else's opponents). {weeks, score: {mgr: {week: pts}}, opp: {mgr: {week: mgr}}}"""
    d = _season()
    current = (d.get('status') or {}).get('currentMatchupPeriod') or d.get('scoringPeriodId') or 1
    score, opp, weeks = {}, {}, set()
    for m in d.get('schedule', []):
        w = m.get('matchupPeriodId')
        if not w or w >= current or 'home' not in m or 'away' not in m:
            continue
        h, a = TEAM_MANAGER.get(m['home']['teamId'], '?'), TEAM_MANAGER.get(m['away']['teamId'], '?')
        score.setdefault(h, {})[w] = round(m['home'].get('totalPoints', 0), 2)
        score.setdefault(a, {})[w] = round(m['away'].get('totalPoints', 0), 2)
        opp.setdefault(h, {})[w], opp.setdefault(a, {})[w] = a, h
        weeks.add(w)
    return {'weeks': sorted(weeks), 'score': score, 'opp': opp}


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
        # lowest first. Projection only orders teams still on exactly 0; once you score, real points are all that count
        teams.sort(key=lambda x: (x['points'], x['projected'] if x['points'] == 0 else 0))
        return {'week': d['week'], 'phase': d['phase'], 'teams': teams, 'final': d['phase'] == 'final'}
    out = _cached(f'scores-{week}', 30, load)
    try:
        past = lows()
    except Exception as e:   # the scoreboard still shows without the past weeks' lows
        print(f'[Fantasy] lows failed: {e}')
        past = []
    try:
        sched = schedule()
    except Exception as e:
        print(f'[Fantasy] schedule failed: {e}')
        sched = None
    return dict(out, lows=past, sched=sched)
