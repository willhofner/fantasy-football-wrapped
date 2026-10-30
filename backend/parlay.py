"""
League parlay tracker: one placed DraftKings ticket, legs linked to real games.

The ticket lives in parlay_data/<slug>.json (games + ticket, same shape the
frontend renders). Games that carry an "espn" block get refreshed from ESPN's
public site API on every request (cached ~20s), so live scores, inning state,
and each leg's running stat flow through without anyone touching the file.

Leg "metric" types handled live:
  anytime_td   NFL player rush + rec TDs (also pulls the scoring play for the diagram)
  pass_yds     NFL player passing yards (plus passing line + team receivers)
  total_bases  MLB batter total bases, parsed from play-by-play
  rush_yds     NFL player rushing yards
  rec_yds      NFL player receiving yards
  ml           moneyline, side = home/away
  spread       side = home/away, line = that side's spread (e.g. -3.5)
  goals_total  game total (any sport)
"""
import json
import os
import re
import time
from datetime import datetime, timezone

import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), 'parlay_data')
ESPN = 'https://site.api.espn.com/apis/site/v2/sports/{path}/{kind}'
_cache = {}
TTL_SECONDS = 20

PERIOD_LABELS = {
    'football/nfl': ['Q1', 'Q2', 'Q3', 'Q4'],
    'basketball/nba': ['Q1', 'Q2', 'Q3', 'Q4'],
    'hockey/nhl': ['P1', 'P2', 'P3'],
}
HALF = {'top': 'top', 'bot': 'bottom', 'bottom': 'bottom', 'mid': 'mid', 'middle': 'mid', 'end': 'end'}
TB_VERBS = [('homered', 4), ('tripled', 3), ('ground-rule doubled', 2), ('doubled', 2), ('singled', 1)]


def _get(path, kind, params):
    key = (path, kind, tuple(sorted(params.items())))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < TTL_SECONDS:
        return hit[1]
    try:
        r = requests.get(ESPN.format(path=path, kind=kind), params=params, timeout=8)
        r.raise_for_status()
        data = r.json()
    except Exception as e:  # keep the last good copy if ESPN hiccups
        print(f"[Parlay] ESPN {kind} fetch failed for {path} {params}: {e}")
        return hit[1] if hit else None
    _cache[key] = (time.time(), data)
    return data


def _norm(name):
    return re.sub(r'[^a-z]', '', (name or '').lower())


def _find_event(game):
    e = game['espn']
    board = _get(e['path'], 'scoreboard', {'dates': e['date']})
    if not board:
        return None
    for ev in board.get('events', []):
        comp = ev['competitions'][0]
        abbrs = {c['homeAway']: c['team']['abbreviation'] for c in comp['competitors']}
        if abbrs.get('away') == game['away'] and abbrs.get('home') == game['home']:
            return ev
    return None


def _apply_event(game, ev):
    """Copy status, score by period, and MLB situation onto the game dict."""
    path = game['espn']['path']
    comp = ev['competitions'][0]
    status = ev['status']['type']
    game['eventId'] = ev['id']
    game['state'] = status['state']            # pre / in / post
    game['detail'] = status.get('shortDetail')
    game['start'] = ev.get('date', game.get('start'))
    side = {c['homeAway']: c for c in comp['competitors']}
    if status['state'] in ('in', 'post'):
        game['a'] = [int(l.get('value', 0)) for l in side['away'].get('linescores', [])]
        game['h'] = [int(l.get('value', 0)) for l in side['home'].get('linescores', [])]
        labels = PERIOD_LABELS.get(path)
        if path == 'baseball/mlb':
            game['per'] = [str(i) for i in range(1, max(len(game['a']), len(game['h']), 9) + 1)]
        elif labels:
            n = max(len(game['a']), len(game['h']), len(labels))
            game['per'] = labels + [f'OT{i}' if i > 1 else 'OT' for i in range(1, n - len(labels) + 1)]
    game['final'] = status['state'] == 'post'
    if path == 'baseball/mlb' and status['state'] == 'in':
        sit = comp.get('situation', {}) or {}
        word = (game['detail'] or '').split(' ')[0].lower()
        game['live'] = {
            'half': HALF.get(word, 'top'),
            'inning': ev['status'].get('period', 1),
            'outs': sit.get('outs', 0),
            'bases': [int(bool(sit.get('onFirst'))), int(bool(sit.get('onSecond'))), int(bool(sit.get('onThird')))],
            'a': game.get('a', []), 'h': game.get('h', []),
            'batter': ((sit.get('batter') or {}).get('athlete') or {}).get('displayName'),
            'pitcher': ((sit.get('pitcher') or {}).get('athlete') or {}).get('displayName'),
        }
    else:
        game.pop('live', None)
    game.pop('gc', None)
    if path == 'football/nfl' and status['state'] == 'in':
        try:
            gc = _gamecast(game, comp)
            if gc:
                game['gc'] = gc
        except Exception as e:  # the gamecast is decoration; never let it break the ticket
            print(f"[Parlay] gamecast skipped: {e}")


def _spot_x(text, away, home):
    """'NYJ 37' -> yards from the away team's goal line (0-100). '50' -> 50."""
    parts = (text or '').split()
    if len(parts) == 1 and parts[0].isdigit():
        return int(parts[0])
    if len(parts) != 2 or not parts[1].isdigit():
        return None
    side, yd = parts[0], int(parts[1])
    if side == away:
        return yd
    if side == home:
        return 100 - yd
    return None


NO_ARROW = ('kickoff', 'extra point', 'field goal', 'two-point', 'timeout', 'end period', 'end of', 'penalty', 'two minute')


def _gamecast(game, comp):
    """Ball spot, down & distance and the last play, on a 0-100 axis from the away goal line."""
    sit = comp.get('situation') or {}
    if not sit:
        return None
    ids = {c['team']['id']: c['team']['abbreviation'] for c in comp['competitors']}
    away, home = game['away'], game['home']
    off = ids.get(str(sit.get('possession', '')))
    x = _spot_x(sit.get('possessionText'), away, home)
    gc = {'off': off, 'x': x, 'dd': sit.get('shortDownDistanceText') or '', 'spot': sit.get('possessionText') or '',
          'dist': sit.get('distance'), 'goal': 'goal' in (sit.get('shortDownDistanceText') or '').lower()}
    lp = sit.get('lastPlay') or {}
    if lp.get('text'):
        kind = ((lp.get('type') or {}).get('text') or '')
        last = {'id': str(lp.get('id') or lp['text'][:40]), 'text': lp['text'], 'type': kind}
        team = ids.get(str((lp.get('team') or {}).get('id', '')))
        yds = lp.get('statYardage')
        # arrow only for scrimmage plays that end where the next snap starts
        if x is not None and team in (away, home) and isinstance(yds, (int, float)) and not any(k in kind.lower() for k in NO_ARROW) and team == off:
            d = 1 if team == away else -1
            last.update({'team': team, 'yds': int(yds), 'to': x, 'from': max(0, min(100, x - d * int(yds)))})
        gc['last'] = last
    return gc if (x is not None or gc.get('last')) else None


def _nfl_player(summary, name):
    """Return {team, stats: {'passing': {label: value}, 'rushing': ..., 'receiving': ...}}."""
    target = _norm(name)
    for team in (summary.get('boxscore') or {}).get('players', []):
        found = {}
        for group in team.get('statistics', []):
            for a in group.get('athletes', []):
                if _norm(a['athlete'].get('displayName')) == target:
                    found[group['name']] = dict(zip(group.get('labels', []), a.get('stats', [])))
        if found:
            return {'team': team['team']['abbreviation'], 'stats': found, 'teamGroups': team.get('statistics', [])}
    return None


def _num(v):
    try:
        return float(str(v).replace(',', ''))
    except (TypeError, ValueError):
        return 0.0


def _settle(leg, game, value):
    leg['actual'] = int(value) if float(value).is_integer() else value
    over = leg['actual'] >= leg['target']
    if over:
        leg['result'] = 'hit'
    elif game.get('final'):
        leg['result'] = 'miss'
    else:
        leg.pop('result', None)


def _apply_leg(leg, game):
    stat = leg.get('metric')
    if not stat or game.get('state') == 'pre' or not game.get('eventId'):
        return
    path = game['espn']['path']

    if stat == 'ml':
        if game.get('final'):
            a, h = sum(game.get('a', [])), sum(game.get('h', []))
            mine, theirs = (h, a) if leg.get('side') == 'home' else (a, h)
            leg['result'] = 'hit' if mine > theirs else 'miss'
        return
    if stat == 'spread':
        if game.get('final'):
            a, h = sum(game.get('a', [])), sum(game.get('h', []))
            margin = (h - a if leg.get('side') == 'home' else a - h) + leg['line']
            leg['result'] = 'hit' if margin > 0 else 'void' if margin == 0 else 'miss'
        return
    if stat == 'goals_total':
        _settle(leg, game, sum(game.get('a', [])) + sum(game.get('h', [])))
        return

    summary = _get(path, 'summary', {'event': game['eventId']})
    if not summary:
        return

    if stat == 'total_bases':
        last = leg['player'].split(' ')[-1]
        pas, tb = [], 0
        for p in summary.get('plays', []):
            text = p.get('text') or ''
            if (p.get('type') or {}).get('text') != 'Play Result' or not text.startswith(last + ' '):
                continue
            rest = text[len(last) + 1:]
            bases = next((n for verb, n in TB_VERBS if rest.startswith(verb)), 0)
            tb += bases
            inning = ((p.get('period') or {}).get('displayValue') or '').replace(' Inning', '')
            pas.append([inning, text.rstrip('.'), bases])
        leg['pas'] = pas
        _settle(leg, game, tb)
        return

    player = _nfl_player(summary, leg['player'])
    if not player:
        if game.get('final'):
            _settle(leg, game, 0)
        return
    s = player['stats']

    if stat == 'pass_yds':
        p = s.get('passing', {})
        _settle(leg, game, _num(p.get('YDS')))
        leg['passing'] = [['C/ATT', p.get('C/ATT', '0/0')], ['TD', p.get('TD', '0')], ['INT', p.get('INT', '0')]]
        rec = next((g for g in player['teamGroups'] if g['name'] == 'receiving'), None)
        if rec:
            ix = {k: i for i, k in enumerate(rec.get('labels', []))}
            rows = [[a['athlete']['displayName'], int(_num(a['stats'][ix['REC']])), int(_num(a['stats'][ix['YDS']])), int(_num(a['stats'][ix['TD']]))]
                    for a in rec.get('athletes', []) if 'REC' in ix]
            leg['receivers'] = sorted(rows, key=lambda r: -r[2])
        return

    if stat in ('rush_yds', 'rec_yds'):
        ru, re_ = s.get('rushing', {}), s.get('receiving', {})
        _settle(leg, game, _num((ru if stat == 'rush_yds' else re_).get('YDS')))
        box = []
        if ru:
            box.append(['Rushing', int(_num(ru.get('CAR'))), int(_num(ru.get('YDS'))), ru.get('AVG', '0'), int(_num(ru.get('TD')))])
        if re_:
            box.append(['Receiving', int(_num(re_.get('REC'))), int(_num(re_.get('YDS'))), re_.get('AVG', '0'), int(_num(re_.get('TD')))])
        leg['box'] = box
        return

    if stat == 'anytime_td':
        ru, re_ = s.get('rushing', {}), s.get('receiving', {})
        _settle(leg, game, _num(ru.get('TD')) + _num(re_.get('TD')))
        box = []
        if ru:
            box.append(['Rushing', int(_num(ru.get('CAR'))), int(_num(ru.get('YDS'))), ru.get('AVG', '0'), int(_num(ru.get('TD')))])
        if re_:
            box.append(['Receiving', int(_num(re_.get('REC'))), int(_num(re_.get('YDS'))), re_.get('AVG', '0'), int(_num(re_.get('TD')))])
        leg['box'] = box
        leg['noBoard'] = True
        first = leg['player'].split(' ')[0]
        last = leg['player'].split(' ')[-1]
        tds = []
        for sp in summary.get('scoringPlays', []):
            text = sp.get('text') or ''
            if text.startswith(first) and last in text.split(' Yd')[0]:
                m = re.search(r'(\d+)\s*Yd', text)
                tds.append({
                    'yds': int(m.group(1)) if m else 1,
                    'how': 'TD catch' if ' pass ' in text else 'TD run',
                    'q': f"Q{(sp.get('period') or {}).get('number', '')}",
                    'clock': (sp.get('clock') or {}).get('displayValue', ''),
                    'team': player['team'],
                })
        if tds:  # every TD gets a diagram; 'td' stays for the link-preview image
            leg['tds'] = tds
            leg['td'] = tds[0]
        return


def get_ticket(slug):
    with open(os.path.join(DATA_DIR, f'{slug}.json')) as f:
        data = json.load(f)
    games = data['games']
    for game in games.values():
        if game.get('espn') and not game.get('final'):
            ev = _find_event(game)
            if ev:
                _apply_event(game, ev)
    for item in data['ticket']['items']:
        for leg in item.get('legs', [item]):
            game = games.get(item['game'])
            if game and game.get('espn'):
                _apply_leg(leg, game)
    data['asOf'] = datetime.now(timezone.utc).isoformat()
    return data
