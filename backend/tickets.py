"""
Placed tickets built automatically when the slip goes up.

1. The moment Pandolfi uploads the DraftKings screenshots, a ticket is built from that week's
   pick sheet (every leg already knows its game, player and line), so the tracker shows the
   new week right away.
2. Then, in the background, Claude reads the screenshots (if ANTHROPIC_API_KEY is set) and
   swaps in what was actually placed: the slip's odds, alt lines (50+ instead of O 55.5),
   same-game-parlay groups, legs that were never on the pick sheet, the total and payout.

Tickets live on the volume (DATA_DIR/tickets/<slug>.json) next to the picks; older hand-made
ones stay in parlay_data/ in the repo.
"""
import base64
import json
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import fantasy
import odds

TICKET_DIR = os.path.join(odds.DATA_DIR, 'tickets')
REPO_DIR = os.path.join(os.path.dirname(__file__), 'parlay_data')
TEAM = {'ARI': 'Cardinals', 'ATL': 'Falcons', 'BAL': 'Ravens', 'BUF': 'Bills', 'CAR': 'Panthers', 'CHI': 'Bears',
        'CIN': 'Bengals', 'CLE': 'Browns', 'DAL': 'Cowboys', 'DEN': 'Broncos', 'DET': 'Lions', 'GB': 'Packers',
        'HOU': 'Texans', 'IND': 'Colts', 'JAX': 'Jaguars', 'KC': 'Chiefs', 'LV': 'Raiders', 'LAC': 'Chargers',
        'LAR': 'Rams', 'MIA': 'Dolphins', 'MIN': 'Vikings', 'NE': 'Patriots', 'NO': 'Saints', 'NYG': 'Giants',
        'NYJ': 'Jets', 'PHI': 'Eagles', 'PIT': 'Steelers', 'SF': '49ers', 'SEA': 'Seahawks', 'TB': 'Buccaneers',
        'TEN': 'Titans', 'WSH': 'Commanders'}
PROP_UNIT = {'pass_yds': 'yds', 'rush_yds': 'yds', 'rec_yds': 'yds', 'receptions': 'rec', 'pass_tds': 'pass TD',
             'rush_rec_yds': 'yds', 'pass_rush_yds': 'yds', 'tds_over': 'TD', 'pass_att': 'att', 'pass_cmp': 'cmp',
             'pass_int': 'INT', 'rush_att': 'car'}
MODELS = ('claude-sonnet-5-5', 'claude-sonnet-4-5-20250929')
_status = {}   # slug -> {'reading': bool, 'error': str|None, 'at': iso}


def slug_for(week_key):
    return f"week{fantasy.nfl_week(week_key)}" + ('-test' if week_key.endswith('-test') else '')


def path_for(slug):
    os.makedirs(TICKET_DIR, exist_ok=True)
    return os.path.join(TICKET_DIR, f'{slug}.json')


def find(slug):
    """Volume first (auto-built), then the repo (hand-made)."""
    for folder in (TICKET_DIR, REPO_DIR):
        p = os.path.join(folder, f'{slug}.json')
        if os.path.exists(p):
            return p
    return None


def all_slugs(include_test=False):
    out = set()
    for folder in (TICKET_DIR, REPO_DIR):
        if os.path.isdir(folder):
            out |= {f[:-5] for f in os.listdir(folder) if re.fullmatch(r'week\d+(-test)?\.json', f)}
    out = [s for s in out if include_test or not s.endswith('-test')]
    return sorted(out, key=lambda s: (-int(re.search(r'\d+', s).group()), not s.endswith('-test')))


def _save(slug, data):
    p = path_for(slug)
    with open(p + '.tmp', 'w') as f:
        json.dump(data, f, indent=1)
    os.replace(p + '.tmp', p)


def _et(dt):
    try:
        from zoneinfo import ZoneInfo
        return dt.astimezone(ZoneInfo('America/New_York'))
    except Exception:
        return dt - timedelta(hours=5)


def _dec(o):
    return 1 + o / 100 if o > 0 else 1 + 100 / -o


def _american(dec):
    return round((dec - 1) * 100) if dec >= 2 else round(-100 / (dec - 1))


# ---------- from the pick sheet ----------

def _game(away, home, start_iso):
    start = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
    an, hn = TEAM.get(away, away), TEAM.get(home, home)
    return {'away': away, 'home': home, 'name': f'{an} @ {hn}', 'short': f'{away} @ {home}', 'start': start_iso,
            'showTime': True, 'espn': {'path': 'football/nfl', 'date': _et(start).strftime('%Y%m%d')},
            'an': f'{away} {an}', 'hn': f'{home} {hn}'}


def leg_from(kind, who, sel, mkt, o, player=None, pt=None, side=None, game_short=None):
    """One tracker leg from pick-sheet style fields."""
    leg = {'id': re.sub(r'[^a-z0-9]+', '-', f"{who}-{player or sel}".lower()).strip('-'), 'who': who,
           'sel': sel, 'mkt': (mkt or '').replace(f' · {game_short}', '') if game_short else mkt, 'odds': o}
    if kind == 'spread':
        leg.update(kind='spread', side=side, line=pt, metric='spread')
    elif kind == 'total':
        leg.update(kind='total', target=pt, over=side != 'under', unit='pts', actual=0, metric='goals_total')
    elif kind == 'ml':
        leg.update(kind='ml', side=side, metric='ml')
    elif kind == 'atd':
        leg.update(kind='count', target=1, unit='TD', actual=0, player=player, noBoard=True, metric='anytime_td')
    elif kind == 'first_td':
        leg.update(kind='count', target=1, unit='1st TD', actual=0, player=player, noBoard=True, metric='first_td')
    elif kind in PROP_UNIT:
        leg.update(kind='count', target=pt, over=side != 'under', unit=PROP_UNIT[kind], actual=0, player=player, metric=kind)
    else:
        leg.update(kind='custom')
    return leg


def build_from_picks(week_key, picks, slips_at=None, jail=()):
    """Slip legs come from everyone not in Parlay Jail; jailed managers' picks become escape picks."""
    escape_picks = {w: p for w, p in picks.items() if w in jail}
    picks = {w: p for w, p in picks.items() if w not in jail}
    data = _build(week_key, picks, slips_at, jail)
    # wager = $10 per payer: the low scorer(s) plus whoever just went to Parlay Jail (the slip, once read, wins)
    try:
        import jail as jail_mod
        wk = fantasy.nfl_week(week_key)
        payers = len(fantasy.funder(wk) or [None]) + len(jail_mod.new_inmates(wk))
        t = data['ticket']
        if t.get('toPay') and payers > 1:
            t['toPay'] = round(t['toPay'] * payers, 2)
        t['wager'] = 10 * payers
    except Exception as e:
        print(f'[Tickets] wager: {e}')
    add_escapes(data, escape_picks)
    return data


def add_escapes(data, escape_picks):
    """Escape picks aren't on the DraftKings slip, so the pick sheet is the source of truth,
    with that bet's latest line."""
    slate = odds.get_slate() or {}
    cur = odds.with_current_lines(escape_picks, slate)
    by_id = {g['id']: g for g in slate.get('games', [])}
    out = []
    for who, p in cur.items():
        if p.get('game') and ' @ ' in p['game']:
            away, home = p['game'].split(' @ ')
            gkey = (away + home).lower()
            g = by_id.get(p.get('gameId'))
            start = (g or {}).get('start') or p.get('start')
            if gkey not in data['games'] and start:   # a game already on the ticket keeps its live state
                data['games'][gkey] = _game(away, home, start)
            elif gkey not in data['games']:
                gkey = _writein_game(data['games'], data['weekKey'])
        else:
            gkey = _writein_game(data['games'], data['weekKey'])
        leg = leg_from(p.get('kind'), who, p['sel'], p['mkt'], p['odds'], p.get('player'), p.get('pt'), p.get('side'), p.get('game'))
        leg.update(game=gkey, escape=True, id=leg['id'] + '-escape')
        out.append(leg)
    data['ticket']['escape'] = out
    return data


def set_escape(slug, who, pick):
    """LM Tools: add, change or clear one jailed manager's escape pick on an already-placed ticket
    (e.g. they never entered one before the slip went in). It's tracked live like the rest, but stays off the slip."""
    p = find(slug)
    if not p:
        raise KeyError(slug)
    with open(p) as f:
        data = json.load(f)
    legs = [l for l in data['ticket'].get('escape') or [] if l.get('who') != who]
    if pick:
        tmp = {'games': data['games'], 'weekKey': data['weekKey'], 'ticket': {}}
        add_escapes(tmp, {who: pick})
        legs += tmp['ticket']['escape']
    data['ticket']['escape'] = legs
    _save(slug, data)
    return data


def _build(week_key, picks, slips_at=None, jail=()):
    slate = odds.get_slate() or {}
    by_id = {g['id']: g for g in slate.get('games', [])}
    games, items = {}, []
    for who in odds.MANAGERS:
        p = picks.get(who)
        if not p:
            continue
        gkey = None
        if p.get('game') and ' @ ' in p['game']:
            away, home = p['game'].split(' @ ')
            gkey = (away + home).lower()
            g = by_id.get(p.get('gameId'))
            games.setdefault(gkey, _game(away, home, (g or {}).get('start') or p.get('start')))
        leg = leg_from(p.get('kind'), who, p['sel'], p['mkt'], p['odds'], p.get('player'), p.get('pt'), p.get('side'), p.get('game'))
        if gkey:
            leg['game'] = gkey
        else:
            leg['game'] = _writein_game(games, week_key)
        items.append(leg)
    items.sort(key=lambda l: games[l['game']]['start'])
    total = 1.0
    for l in items:
        total *= _dec(l['odds'])
    placed = _et(slips_at or datetime.now(timezone.utc))
    wk = fantasy.nfl_week(week_key)
    return {'slug': slug_for(week_key), 'week': wk, 'weekKey': week_key, 'title': f'Week {wk} Parlay', 'games': games,
            'ticket': {'title': f'{len(items)} Pick Parlay', 'odds': _american(total) if items else None, 'wager': 10,
                       'toPay': round(10 * total, 2) if items else None, 'split': len(items),
                       'placed': 'Placed ' + placed.strftime('%a %b %-d, %-I:%M %p'),
                       'noPick': [m for m in odds.MANAGERS if m not in picks and m not in jail], 'items': items,
                       'jail': list(jail), 'escape': []},
            'source': 'picks', 'built': datetime.now(timezone.utc).isoformat()}


def _writein_game(games, week_key):
    """Write-ins not tied to a game still need somewhere to sit (Sunday 1 PM of that week)."""
    if 'writein' not in games:
        sun = datetime.fromisoformat(week_key[:10]) + timedelta(days=5, hours=17)
        games['writein'] = {'away': '', 'home': '', 'name': 'Write-in', 'short': 'Write-in',
                            'start': sun.replace(tzinfo=timezone.utc).isoformat(), 'showTime': False}
    return 'writein'


# ---------- from the slip screenshots ----------

PROMPT = """These are screenshots of one DraftKings parlay our 8-person league placed together. Each league member picked one leg.

Here are the legs from our pick sheet (who picked what, with the line they saw when picking):
{picks}

Read the slip and return ONLY a JSON object, no other text:
{{
  "total_odds": <the parlay's American odds as an integer, e.g. 9085 for +9085>,
  "wager": <wager in dollars>,
  "to_pay": <"To Pay" amount in dollars>,
  "legs": [
    {{
      "who": "<the pick-sheet name this leg belongs to, or null if it matches nobody>",
      "kind": "<spread | total | ml | atd | first_td | tds_over | pass_yds | rush_yds | rec_yds | receptions | pass_tds | rush_rec_yds | pass_rush_yds | pass_att | pass_cmp | pass_int | rush_att | other>",
      "sel": "<the big text on the slip, e.g. '50+', 'Over 47.5', 'Josh Allen', 'GB Packers -3.5'>",
      "mkt": "<the small text, e.g. 'Garrett Wilson Receiving Yards', 'Total', 'Anytime TD Scorer', 'Spread'>",
      "player": "<player name for player bets, else null>",
      "line": <the number the leg needs: 50 for '50+', 47.5 for 'Over 47.5', -3.5 for a -3.5 spread; null for moneyline and TD scorer>,
      "side": "<over | under for totals and yardage; home | away for spreads and moneylines; null otherwise>",
      "game": "<AWAY @ HOME team abbreviations as shown on the slip, e.g. 'CAR @ GB'>",
      "odds": <this leg's American odds as an integer; null if the slip doesn't show odds for it (legs inside a same-game parlay usually don't)>,
      "sgp": <null, or a number shared by every leg inside the same same-game-parlay group>
    }}
  ],
  "sgp_groups": [{{"sgp": <number>, "odds": <the group's American odds>}}]
}}
Rules: list every leg on the slip exactly once, in slip order. Match a leg to a pick-sheet name when it is the same bet (the line can differ: '50+' on the slip for an 'Over 55.5' pick is the same person's bet). A leg in a same-game parlay that matches no pick still gets listed with who null."""


def _call_claude(images, picks_text):
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        raise RuntimeError('No ANTHROPIC_API_KEY on the server, so the slip wasn’t read. Odds are from the pick sheet.')
    from anthropic import Anthropic
    client = Anthropic(api_key=key)
    content = [{'type': 'image', 'source': {'type': 'base64', 'media_type': mt, 'data': base64.b64encode(b).decode()}} for b, mt in images]
    content.append({'type': 'text', 'text': PROMPT.format(picks=picks_text)})
    last = None
    for model in MODELS:
        try:
            msg = client.messages.create(model=model, max_tokens=4000, messages=[{'role': 'user', 'content': content}])
            text = ''.join(b.text for b in msg.content if getattr(b, 'type', '') == 'text')
            return json.loads(re.search(r'\{.*\}', text, re.S).group())
        except Exception as e:   # try the next model name
            last = e
    raise RuntimeError(f'Couldn’t read the slip: {last}')


def apply_slip(data, slip, picks):
    """Rebuild the ticket from what the slip says was placed. Pure function (tested offline)."""
    games = dict(data['games'])
    week_key = data['weekKey']
    starts = {g['away'] + ' @ ' + g['home']: g['start'] for g in games.values() if g.get('away')}
    slate = {f"{g['away']} @ {g['home']}": g['start'] for g in (odds.get_slate() or {}).get('games', [])}
    for p in picks.values():
        if p.get('game') and p.get('start'):
            slate.setdefault(p['game'], p['start'])
    seen, items, groups = set(), [], {}
    group_odds = {g.get('sgp'): g.get('odds') for g in slip.get('sgp_groups') or []}
    for i, s in enumerate(slip.get('legs') or []):
        who = s.get('who') if s.get('who') in odds.MANAGERS and s.get('who') not in seen else None
        if who:
            seen.add(who)
        gshort = (s.get('game') or '').upper().replace('  ', ' ')
        if who and picks.get(who, {}).get('game'):
            gshort = picks[who]['game']
        gkey = None
        if ' @ ' in gshort:
            away, home = [x.strip() for x in gshort.split('@')]
            gkey = (away + home).lower()
            if gkey not in games:
                start = starts.get(gshort) or slate.get(gshort)
                if start:
                    games[gkey] = _game(away, home, start)
                else:
                    gkey = None
        kind = s.get('kind') or 'other'
        pick = picks.get(who) or {}
        player = s.get('player') or pick.get('player')
        side = s.get('side') or pick.get('side')
        if kind in ('spread', 'ml') and side not in ('home', 'away') and gkey:
            g = games[gkey]
            side = 'home' if g['home'] in (s.get('sel') or '') else 'away' if g['away'] in (s.get('sel') or '') else pick.get('side')
        line = s.get('line') if s.get('line') is not None else pick.get('pt')
        o = s.get('odds') if isinstance(s.get('odds'), (int, float)) else pick.get('odds')
        leg = leg_from(kind if kind != 'other' else 'custom', who or '?', s.get('sel') or pick.get('sel') or '?',
                       s.get('mkt') or pick.get('mkt') or '', o, player, line, side)
        if kind == 'total' and gkey and leg['mkt'] in ('Total', ''):
            leg['mkt'] = 'Total Points'
        if s.get('odds') is None:
            leg['oddsFromPickSheet'] = True
        leg['id'] = f"{leg['id']}-{i}"
        leg['game'] = gkey or _writein_game(games, week_key)
        if s.get('sgp') is not None:
            groups.setdefault(s['sgp'], []).append(leg)
            if len(groups[s['sgp']]) == 1:
                items.append({'group': None, 'sgp': s['sgp']})
        else:
            items.append(leg)
    # one leg nobody claimed + one manager with no pick: that's almost certainly theirs (sent to Pandolfi directly)
    flat = [l for it in items for l in ([it] if 'kind' in it else groups[it['sgp']])]
    loose, missing = [l for l in flat if l['who'] == '?'], [m for m in odds.MANAGERS if m not in seen and m not in data['ticket'].get('jail', [])]
    if len(loose) == 1 and len(missing) == 1:
        loose[0]['who'], loose[0]['whoGuess'] = missing[0], True
        seen.add(missing[0])
    out = []
    for it in items:
        if 'sgp' in it and it.get('group') is None and 'legs' not in it and 'kind' not in it:
            legs = groups[it['sgp']]
            if len(legs) == 1:
                out.append(legs[0])
                continue
            out.append({'group': f'{len(legs)} Pick SGP', 'odds': group_odds.get(it['sgp']), 'who': '?', 'game': legs[0]['game'], 'legs': legs})
        else:
            out.append(it)
    out.sort(key=lambda it: games[it['game']]['start'])
    n = sum(len(it.get('legs', [it])) for it in out)
    t = dict(data['ticket'], title=f'{n} Pick Parlay', items=out, split=n,
             noPick=[m for m in odds.MANAGERS if m not in seen and m not in data['ticket'].get('jail', [])])
    if slip.get('total_odds'):
        t['odds'] = int(slip['total_odds'])
    if slip.get('wager'):
        t['wager'] = float(slip['wager'])
    if slip.get('to_pay'):
        t['toPay'] = float(slip['to_pay'])
    return dict(data, games=games, ticket=t, source='slip', read=datetime.now(timezone.utc).isoformat())


def _picks_text(picks):
    return '\n'.join(f"- {w}: {p['sel']} | {p['mkt']} | {p.get('game') or 'no game'} | {p['odds']:+d}" for w, p in picks.items()) or '(none)'


def place(week_key, picks, slip_files, jail=()):
    """Called right after a slip upload: build the ticket now, read the screenshots in the background."""
    slug = slug_for(week_key)
    existing = find(slug)
    if not existing or not existing.startswith(TICKET_DIR):
        if existing:          # a hand-made ticket in the repo wins; don't overwrite it
            return slug
        _save(slug, build_from_picks(week_key, picks, jail=jail))
    _status[slug] = {'reading': True, 'error': None, 'at': datetime.now(timezone.utc).isoformat()}

    def run():
        try:
            folder = odds.slip_dir(week_key)
            images = []
            for name in slip_files:
                ext = name.rsplit('.', 1)[-1].lower()
                mt = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'}.get(ext)
                if mt:
                    with open(os.path.join(folder, name), 'rb') as f:
                        images.append((f.read(), mt))
            if not images:
                raise RuntimeError('No readable screenshots (HEIC can’t be read; send PNG or JPG)')
            slip_picks = {w: p for w, p in picks.items() if w not in jail}
            slip = _call_claude(images, _picks_text(slip_picks))
            with open(path_for(slug)) as f:
                data = json.load(f)
            _save(slug, apply_slip(build_from_picks(week_key, picks, jail=jail), slip, slip_picks))
            _status[slug] = {'reading': False, 'error': None, 'at': datetime.now(timezone.utc).isoformat()}
            print(f'[Tickets] {slug}: slip read, {len(slip.get("legs") or [])} legs')
        except Exception as e:
            _status[slug] = {'reading': False, 'error': str(e), 'at': datetime.now(timezone.utc).isoformat()}
            print(f'[Tickets] {slug}: {e}')
    threading.Thread(target=run, daemon=True).start()
    return slug


def status(slug):
    return _status.get(slug)
