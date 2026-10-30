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


def refresh_slate(force=False, only_missing=False, week=None):
    """Pull this week's slate. Returns (slate, error).

    only_missing: keep props already pulled for a game and only ask for games that had none
    (DraftKings posts some props midweek), so a second pull costs a few credits, not ~90.
    week: pull game lines only for that upcoming week (right after a slip goes in, before Tuesday's
    full pull). One call, ~3 credits; nothing is written if DraftKings hasn't posted that week yet."""
    if not os.environ.get('ODDS_API_KEY'):
        return None, 'ODDS_API_KEY is not set on the server'
    with _lock:
        old = _read('slate.json', None)
        if old and not force and not only_missing and time.time() - old.get('fetchedTs', 0) < REFRESH_COOLDOWN:
            return old, None
        if old and old.get('creditsLeft') is not None and old['creditsLeft'] < MIN_CREDITS_LEFT:
            return old, f"Only {old['creditsLeft']} API credits left this month; not pulling again"
        try:
            games, left = _call(f'{API}/odds', {'bookmakers': BOOK, 'markets': GAME_MARKETS, 'oddsFormat': 'american'})
            now = datetime.now(timezone.utc)
            games = sorted(games, key=lambda e: e['commence_time'])
            if week:
                games = [e for e in games if _week_key([{'start': e['commence_time']}]) >= week]
                if not games:
                    return old, f'DraftKings has no lines up for the week of {week} yet'
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
                prior = next((x for x in (old or {}).get('games', []) if x['id'] == ev['id']), None) if only_missing else None
                if prior and prior.get('props'):
                    g['props'] = prior['props']
                elif start > now and not week:  # props only for games that haven't kicked off
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
        lines_only = bool(week)
        week = _week_key(slate)
        out = _this_week({'fetched': now.isoformat(), 'fetchedTs': time.time(), 'creditsLeft': left, 'week': week, 'games': slate,
                          **({'linesOnly': True} if lines_only else {})})
        _write('slate.json', out)
        print(f"[Odds] pulled {len(slate)} games, {left} credits left")
        return out, None


def start_refresh(only_missing=False, force=False, week=None):
    """Run a pull in the background so the web worker stays free (a full slate is ~15 API calls)."""
    if _status['pulling']:
        return False
    _status.update(pulling=True, error=None)

    def run():
        try:
            _, err = refresh_slate(force=force, only_missing=only_missing, week=week)
            _status['error'] = err
        except Exception as e:  # never leave the flag stuck
            _status['error'] = f'Pull failed: {e}'
            print(f"[Odds] pull crashed: {e}")
        finally:
            _status['pulling'] = False
    threading.Thread(target=run, daemon=True).start()
    return True


def _now_et():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo('America/New_York')).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow() - timedelta(hours=5)


def auto_schedule(now_et, slate):
    """What the weekly schedule wants right now: 'full', 'fill' or None.

    Tuesday 10am ET: pull the new week (game lines + every prop DraftKings has up).
    Wednesday 10am ET: one cheap top-up for games whose props weren't posted Tuesday.
    """
    tue = (now_et - timedelta(days=(now_et.weekday() - 1) % 7)).replace(hour=10, minute=0, second=0, microsecond=0)
    if tue > now_et:
        tue -= timedelta(days=7)
    if not slate or (slate.get('week') or '') < tue.date().isoformat():
        return 'full'
    if slate.get('linesOnly') and slate.get('week') == tue.date().isoformat():
        return 'full'   # lines were pulled early after last week's slip went in; now get the props
    wed = tue + timedelta(days=1)
    fetched_et = datetime.fromisoformat(slate['fetched']).astimezone(timezone.utc).replace(tzinfo=None) - timedelta(hours=5)
    future_without_props = [g for g in slate.get('games', []) if not g.get('props')
                            and datetime.fromisoformat(g['start'].replace('Z', '+00:00')) > datetime.now(timezone.utc)]
    if now_et >= wed and fetched_et < wed and future_without_props:
        return 'fill'
    return None


def maybe_auto_refresh():
    """Called on page loads; nobody presses a button. At most one attempt an hour."""
    if not os.environ.get('ODDS_API_KEY') or _status['pulling'] or time.time() - _status.get('autoTried', 0) < 3600:
        return
    slate = get_slate()
    want = auto_schedule(_now_et(), slate)
    if want:
        _status['autoTried'] = time.time()
        print(f"[Odds] scheduled {want} pull")
        start_refresh(only_missing=(want == 'fill'), force=True)
        return
    # last week's slip is in, so picks moved on: get next week's game lines early (twice a day at most)
    pw = pick_week()
    if slate and pw and slate.get('week') != pw and time.time() - _status.get('earlyTried', 0) > 12 * 3600:
        _status['earlyTried'] = _status['autoTried'] = time.time()
        print(f"[Odds] early lines pull for {pw}")
        start_refresh(force=True, week=pw)


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


def _next(week):
    return (datetime.fromisoformat(week[:10]) + timedelta(days=7)).date().isoformat()


def pick_week(sandbox=False):
    """The week the pick sheet is collecting legs for. Once a week's slip is uploaded, picks move on
    to the next week (and start empty), even before next week's lines are pulled."""
    slate = get_slate() or {}
    w = slate.get('week')
    if not w:
        return None
    sfx = '-test' if sandbox else ''
    for _ in range(4):
        if not list_slips(w + sfx):
            break
        w = _next(w)
    return w


def placed_week(sandbox=False):
    """Most recent week with a slip uploaded (where extra screenshots go once picks have moved on)."""
    pw = pick_week(sandbox)
    if not pw:
        return None
    prev = (datetime.fromisoformat(pw) - timedelta(days=7)).date().isoformat()
    return prev if list_slips(prev + ('-test' if sandbox else '')) else None


def _this_week(slate):
    """Drop games past the Monday night that closes the week (a pull on Thursday can see next week's TNF)."""
    if not slate or not slate.get('week'):
        return slate
    end = datetime.fromisoformat(slate['week']).replace(tzinfo=timezone.utc) + timedelta(days=7, hours=9)
    return dict(slate, games=[g for g in slate['games'] if datetime.fromisoformat(g['start'].replace('Z', '+00:00')) < end])


# ---------- API key for Claude's own checks (people use accounts.py) ----------

ROLE_HASHES = {
    'e4520057eb0f1e6e934e559af9fa77d410b3551bfd3d9822337532a251e8c334': 'admin',   # Claude's API key (server-to-server checks); people sign in with personal links (accounts.py)
}


def role_for(key):
    import hashlib
    if not key:
        return None
    return ROLE_HASHES.get(hashlib.sha256(key.encode()).hexdigest())


# ---------- placed slips ----------

SLIP_TYPES = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp'}


def save_slips(week, files):
    folder = _path(os.path.join('slips', week or 'unknown'))
    os.makedirs(folder, exist_ok=True)
    saved = []
    for f in files:
        ext = SLIP_TYPES.get((f.mimetype or '').lower())
        if not ext:
            continue
        name = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f') + '.' + ext
        f.save(os.path.join(folder, name))
        saved.append(name)
    return saved


def list_slips(week):
    folder = _path(os.path.join('slips', week or 'unknown'))
    return sorted(os.listdir(folder)) if os.path.isdir(folder) else []


def slip_dir(week):
    return _path(os.path.join('slips', week or 'unknown'))


def get_slate():
    return _this_week(_read('slate.json', None))


# ---------- picks ----------

def get_picks(week):  # week may carry a '-test' suffix for sandbox mode
    return _read(f'picks-{week}.json', {}) if week else {}


def leg_key(p):
    """Same bet = same key (mirrors legKey in picks.html). One leg per bet: no duplicates on the slip."""
    if p.get('kind') == 'custom':
        return 'custom|' + ' '.join(str(p.get('sel') or '').lower().split())
    return '|'.join(str(p.get(k) or '') for k in ('gameId', 'kind', 'player', 'side'))


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
            if p['kind'] == 'custom':
                # write-in bet: their own words and odds, optionally tied to a game on the slate
                p['sel'] = str(p['sel'] or '').strip()[:140]
                p['mkt'] = 'Write-in'
                if not p['sel']:
                    return None, 'Write out the bet first'
                if not isinstance(p['odds'], int) or -100 < p['odds'] < 100 or not -100000 <= p['odds'] <= 1000000:
                    return None, 'Odds need to look like -150 or +400'
            if not isinstance(p['odds'], (int, float)) or not p['sel'] or not p['mkt']:
                return None, 'Bad pick'
            taken = next((w for w, q in picks.items() if w != who and leg_key(q) == leg_key(p)), None)
            if taken:
                return None, f'{taken} already has that one. Pick a different leg.'
            p['at'] = datetime.now(timezone.utc).isoformat()
            picks[who] = p
        _write(f'picks-{week}.json', picks)
        return picks, None
