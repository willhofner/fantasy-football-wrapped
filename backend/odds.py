"""
Weekly NFL slate from The Odds API (DraftKings lines) + the league's pick sheet.

One pull = featured game lines for every game (1 call) + one call per game for player
props. The Odds API bills markets x regions per call, so a full Sunday slate is roughly
3 + games x len(PROP_MARKETS) credits (~90 on a 14-game week). Pulls only happen when
someone presses refresh, never on page load, and are rate-limited by REFRESH_COOLDOWN.

Storage is plain JSON in DATA_DIR. On Railway that directory is wiped by every deploy
unless ODDS_DATA_DIR points at a mounted volume.
"""
import json
import os
import threading
import time
from datetime import datetime, timedelta, timezone

import requests

API = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
BOOK = 'draftkings'
GAME_MARKETS = 'h2h,spreads,totals'
PROP_MARKETS = {
    'player_pass_yds': ('pass_yds', 'Passing Yards'),
    'player_pass_tds': ('pass_tds', 'Passing TDs'),
    'player_rush_yds': ('rush_yds', 'Rushing Yards'),
    'player_reception_yds': ('rec_yds', 'Receiving Yards'),
    'player_receptions': ('receptions', 'Receptions'),
    'player_anytime_td': ('atd', 'Anytime TD Scorer'),
}
REFRESH_COOLDOWN = 6 * 3600
MIN_CREDITS_LEFT = 60
DATA_DIR = os.environ.get('ODDS_DATA_DIR') or os.path.join(os.path.dirname(__file__), 'odds_data')
MANAGERS = ['Noah', 'Lou', 'Pandolfi', 'Hof', 'TJ', 'Zach', 'Allan', 'Willy']
_lock = threading.Lock()
_status = {'pulling': False, 'error': None}

TEAMS = {
    'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL', 'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI', 'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL', 'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX', 'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC', 'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN', 'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
    'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT', 'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB', 'Tennessee Titans': 'TEN', 'Washington Commanders': 'WSH',
}


def _path(name):
    os.makedirs(DATA_DIR, exist_ok=True)
    return os.path.join(DATA_DIR, name)


def _read(name, default):
    try:
        with open(_path(name)) as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return default


def _write(name, data):
    tmp = _path(name + '.tmp')
    with open(tmp, 'w') as f:
        json.dump(data, f)
    os.replace(tmp, _path(name))


# ---------- slate ----------

def _short(name):
    return TEAMS.get(name, name.split()[-1][:3].upper())


def _game_lines(markets, away, home):
    lines = {}
    for m in markets:
        oc = m.get('outcomes', [])
        if m['key'] == 'h2h':
            lines['ml'] = {('away' if o['name'] == away else 'home'): o['price'] for o in oc}
        elif m['key'] == 'spreads':
            lines['spread'] = {('away' if o['name'] == away else 'home'): {'pt': o.get('point'), 'price': o['price']} for o in oc}
        elif m['key'] == 'totals':
            t = {'pt': None}
            for o in oc:
                t['pt'] = o.get('point')
                t[o['name'].lower()] = o['price']
            lines['total'] = t
    return lines


def _props(markets):
    """{key: [{player, pt, over, under}] or [{player, price}] for anytime TD}"""
    out = {}
    for m in markets:
        if m['key'] not in PROP_MARKETS:
            continue
        key = PROP_MARKETS[m['key']][0]
        rows = {}
        for o in m.get('outcomes', []):
            player = o.get('description') or o.get('name')
            if key == 'atd':
                if (o.get('name') or '').lower() in ('no', 'under'):
                    continue
                rows[player] = {'player': player, 'price': o['price']}
                continue
            side = (o.get('name') or '').lower()
            if side not in ('over', 'under'):
                continue
            # if a book lists more than one number for a player, keep the most balanced one
            r = rows.setdefault((player, o.get('point')), {'player': player, 'pt': o.get('point')})
            r[side] = o['price']
        if key == 'atd':
            out[key] = sorted(rows.values(), key=lambda r: r['price'])
            continue
        best = {}
        for r in rows.values():
            if 'over' not in r or 'under' not in r:
                continue
            gap = abs(abs(r['over']) - abs(r['under']))
            if r['player'] not in best or gap < best[r['player']][0]:
                best[r['player']] = (gap, r)
        out[key] = sorted((b[1] for b in best.values()), key=lambda r: -(r['pt'] or 0))
    return out


def _call(url, params):
    r = requests.get(url, params=dict(params, apiKey=os.environ['ODDS_API_KEY']), timeout=20)
    left = r.headers.get('x-requests-remaining')
    r.raise_for_status()
    return r.json(), (int(float(left)) if left not in (None, '') else None)


def refresh_slate(force=False):
    """Pull this week's slate. Returns (slate, error)."""
    if not os.environ.get('ODDS_API_KEY'):
        return None, 'ODDS_API_KEY is not set on the server'
    with _lock:
        old = _read('slate.json', None)
        if old and not force and time.time() - old.get('fetchedTs', 0) < REFRESH_COOLDOWN:
            return old, None
        if old and old.get('creditsLeft') is not None and old['creditsLeft'] < MIN_CREDITS_LEFT:
            return old, f"Only {old['creditsLeft']} API credits left this month; not pulling again"
        try:
            games, left = _call(f'{API}/odds', {'bookmakers': BOOK, 'markets': GAME_MARKETS, 'oddsFormat': 'american'})
            now = datetime.now(timezone.utc)
            games = sorted(games, key=lambda e: e['commence_time'])
            first = _week_key([{'start': games[0]['commence_time']}]) if games else None
            # stop at the Monday night game; don't spend credits on next week's Thursday game
            horizon = (datetime.fromisoformat(first).replace(tzinfo=timezone.utc) + timedelta(days=7, hours=9)) if first else now
            slate = []
            for ev in games:
                start = datetime.fromisoformat(ev['commence_time'].replace('Z', '+00:00'))
                if start > horizon:
                    continue
                book = next((b for b in ev.get('bookmakers', []) if b['key'] == BOOK), None)
                g = {'id': ev['id'], 'start': ev['commence_time'], 'away': _short(ev['away_team']), 'home': _short(ev['home_team']),
                     'awayName': ev['away_team'], 'homeName': ev['home_team'],
                     'lines': _game_lines(book['markets'], ev['away_team'], ev['home_team']) if book else {}, 'props': {}}
                if start > now:  # props only for games that haven't kicked off
                    try:
                        data, left2 = _call(f"{API}/events/{ev['id']}/odds",
                                            {'bookmakers': BOOK, 'markets': ','.join(PROP_MARKETS), 'oddsFormat': 'american'})
                        left = left2 if left2 is not None else left
                        pb = next((b for b in data.get('bookmakers', []) if b['key'] == BOOK), None)
                        if pb:
                            g['props'] = _props(pb['markets'])
                    except requests.RequestException as e:
                        print(f"[Odds] props failed for {g['away']}@{g['home']}: {e}")
                slate.append(g)
        except requests.RequestException as e:
            return old, f'Odds API request failed: {e}'
        week = _week_key(slate)
        out = _this_week({'fetched': now.isoformat(), 'fetchedTs': time.time(), 'creditsLeft': left, 'week': week, 'games': slate})
        _write('slate.json', out)
        print(f"[Odds] pulled {len(slate)} games, {left} credits left")
        return out, None


def start_refresh():
    """Run a pull in the background so the web worker stays free (a full slate is ~15 API calls)."""
    if _status['pulling']:
        return False
    _status.update(pulling=True, error=None)

    def run():
        try:
            _, err = refresh_slate()
            _status['error'] = err
        except Exception as e:  # never leave the flag stuck
            _status['error'] = f'Pull failed: {e}'
            print(f"[Odds] pull crashed: {e}")
        finally:
            _status['pulling'] = False
    threading.Thread(target=run, daemon=True).start()
    return True


def status():
    return {'pulling': _status['pulling'], 'error': _status['error'],
            'persistent': bool(os.environ.get('ODDS_DATA_DIR'))}


def _week_key(slate):
    """Week id = the Tuesday that opens the betting window (ET), e.g. '2026-11-03'."""
    if not slate:
        return None
    first = datetime.fromisoformat(slate[0]['start'].replace('Z', '+00:00')) - timedelta(hours=4)
    tue = first - timedelta(days=(first.weekday() - 1) % 7)
    return tue.date().isoformat()


def _this_week(slate):
    """Drop games past the Monday night that closes the week (a pull on Thursday can see next week's TNF)."""
    if not slate or not slate.get('week'):
        return slate
    end = datetime.fromisoformat(slate['week']).replace(tzinfo=timezone.utc) + timedelta(days=7, hours=9)
    return dict(slate, games=[g for g in slate['games'] if datetime.fromisoformat(g['start'].replace('Z', '+00:00')) < end])


def get_slate():
    return _this_week(_read('slate.json', None))


# ---------- picks ----------

def get_picks(week):
    return _read(f'picks-{week}.json', {}) if week else {}


def save_pick(week, who, pick):
    if who not in MANAGERS:
        return None, 'Unknown manager'
    if not week:
        return None, 'No slate loaded yet'
    with _lock:
        picks = get_picks(week)
        if pick is None:
            picks.pop(who, None)
        else:
            keep = ('gameId', 'game', 'sel', 'mkt', 'odds', 'kind', 'player', 'pt', 'side', 'start')
            p = {k: pick.get(k) for k in keep}
            if not isinstance(p['odds'], (int, float)) or not p['sel'] or not p['mkt']:
                return None, 'Bad pick'
            p['at'] = datetime.now(timezone.utc).isoformat()
            picks[who] = p
        _write(f'picks-{week}.json', picks)
        return picks, None
