"""
Link-preview image for the pick sheet (/picks): a 1200x630 PNG of this week's slate,
drawn like the page itself (game cards with spread / total / moneyline buttons).
"""
import io
import time
from datetime import datetime, timezone, timedelta

from PIL import Image, ImageDraw

import odds
from parlay_og import _font, _odds, W, H, BG, CARD, LINE, FG, MUTED, FAINT, GREEN, GREEN_INK

BTN = (38, 38, 38)
TEAM = {'ARI': 'Cardinals', 'ATL': 'Falcons', 'BAL': 'Ravens', 'BUF': 'Bills', 'CAR': 'Panthers', 'CHI': 'Bears',
        'CIN': 'Bengals', 'CLE': 'Browns', 'DAL': 'Cowboys', 'DEN': 'Broncos', 'DET': 'Lions', 'GB': 'Packers',
        'HOU': 'Texans', 'IND': 'Colts', 'JAX': 'Jaguars', 'KC': 'Chiefs', 'LV': 'Raiders', 'LAC': 'Chargers',
        'LAR': 'Rams', 'MIA': 'Dolphins', 'MIN': 'Vikings', 'NE': 'Patriots', 'NO': 'Saints', 'NYG': 'Giants',
        'NYJ': 'Jets', 'PHI': 'Eagles', 'PIT': 'Steelers', 'SF': '49ers', 'SEA': 'Seahawks', 'TB': 'Buccaneers',
        'TEN': 'Titans', 'WSH': 'Commanders'}
_cache = {}
TTL_SECONDS = 600


def _et(iso):
    t = datetime.fromisoformat(iso.replace('Z', '+00:00'))
    return t - timedelta(hours=5 if t.month in (11, 12, 1, 2) or (t.month == 3 and t.day < 8) else 4)


def _when(iso):
    t = _et(iso)
    return t.strftime('%a ') + t.strftime('%I:%M %p').lstrip('0')


def _pt(v):
    return f'+{v:g}' if v > 0 else f'{v:g}'


def _btn(d, x, y, w, h, top, price, picked=False):
    d.rounded_rectangle((x, y, x + w, y + h), 10, fill=GREEN if picked else BTN)
    cx = x + w / 2
    if top:
        d.text((cx, y + 18), top, font=_font('SemiBold', 17), fill=GREEN_INK if picked else MUTED, anchor='mm')
        d.text((cx, y + 43), price, font=_font('Bold', 22), fill=GREEN_INK if picked else GREEN, anchor='mm')
    else:
        d.text((cx, y + h / 2), price, font=_font('Bold', 22), fill=GREEN_INK if picked else GREEN, anchor='mm')


def _card(d, x, y, w, g, pick=None):
    h = 222
    d.rounded_rectangle((x, y, x + w, y + h), 18, fill=CARD, outline=LINE, width=2)
    d.text((x + 24, y + 22), f"{TEAM.get(g['away'], g['away'])} @ {TEAM.get(g['home'], g['home'])}", font=_font('Bold', 25), fill=FG)
    d.text((x + w - 24, y + 25), _when(g['start']), font=_font('Medium', 18), fill=FAINT, anchor='ra')
    L = g.get('lines', {})
    bw, gap = 104, 10
    bx = x + w - 24 - 3 * bw - 2 * gap
    for i, label in enumerate(('SPREAD', 'TOTAL', 'MONEY')):
        d.text((bx + i * (bw + gap) + bw / 2, y + 74), label, font=_font('Bold', 14), fill=FAINT, anchor='mm')
    for r, side in enumerate(('away', 'home')):
        ry = y + 90 + r * 64
        abbr = g[side]
        d.text((x + 24, ry + 28), abbr, font=_font('Bold', 22), fill=FG, anchor='lm')
        sp, t, ml = (L.get('spread') or {}).get(side), L.get('total') or {}, (L.get('ml') or {}).get(side)
        tside = 'over' if side == 'away' else 'under'
        cells = [
            (_pt(sp['pt']), _odds(sp['price'])) if sp and sp.get('pt') is not None else None,
            (f"{'O' if tside == 'over' else 'U'} {t['pt']:g}", _odds(t[tside])) if t.get(tside) is not None and t.get('pt') is not None else None,
            (None, _odds(ml)) if ml is not None else None,
        ]
        for i, c in enumerate(cells):
            if c:
                _btn(d, bx + i * (bw + gap), ry, bw, 56, c[0], c[1], picked=(pick == (side, i)))
    return h


def _render():
    slate = odds.get_slate() or {}
    now = datetime.now(timezone.utc)
    games = [g for g in slate.get('games', []) if datetime.fromisoformat(g['start'].replace('Z', '+00:00')) > now] or slate.get('games', [])
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((48, 40), 'Make your pick', font=_font('ExtraBold', 52), fill=FG)
    n_props = sum(len(v) for g in slate.get('games', []) for v in (g.get('props') or {}).values())
    sub = f"{len(slate.get('games', []))} games · {n_props:,} player props · DraftKings lines" if games else 'This week’s slate, one leg each'
    d.text((48, 108), sub, font=_font('Medium', 24), fill=MUTED)
    d.text((W - 48, 52), 'pandolfi.bet', font=_font('Bold', 26), fill=GREEN, anchor='ra')
    show = games[:4]
    cw, gap = (W - 96 - 24) // 2, 24
    for i, g in enumerate(show):
        cx = 48 + (i % 2) * (cw + gap)
        cy = 152 + (i // 2) * (222 + 18)
        # one button pressed, so it reads as picking
        _card(d, cx, cy, cw, g, pick=('away', 0) if i == 1 else None)
    if not show:
        d.text((48, 200), 'Lines post early in the week.', font=_font('SemiBold', 30), fill=FAINT)
    buf = io.BytesIO()
    img.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def render():
    hit = _cache.get('png')
    if hit and time.time() - hit[0] < TTL_SECONDS:
        return hit[1]
    png = _render()
    _cache['png'] = (time.time(), png)
    return png
