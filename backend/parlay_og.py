"""
Link-preview image for a parlay ticket: a 1200x630 PNG drawn from the live ticket
data, laid out like the ticket on the page (header, payout, pips, one row per leg).
"""
import io
import os
import time

from PIL import Image, ImageDraw, ImageFont

from parlay import get_ticket

W, H = 1200, 630
BG, CARD, LINE = (11, 11, 11), (28, 28, 28), (46, 46, 46)
FG, MUTED, FAINT = (255, 255, 255), (168, 168, 168), (110, 110, 110)
GREEN, GREEN_TINT, GREEN_INK = (83, 211, 55), (23, 40, 20), (10, 26, 5)
RED, RED_TINT = (255, 81, 71), (42, 21, 19)
YELLOW, YELLOW_TINT, LIVE_TINT = (245, 192, 46), (58, 48, 14), (42, 37, 16)
FONT_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
_cache = {}
TTL_SECONDS = 60


def _font(weight, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f'Inter-{weight}.otf'), size)


def _odds(o):
    return f'+{o}' if o > 0 else str(o)


def _started(game):
    return game.get('state') == 'in'


def _leg_state(leg, game):
    if leg.get('result'):
        return leg['result']
    return 'live' if _started(game) else 'open'


def _rows(data):
    """One row per ticket item, in kickoff order; an SGP is one row."""
    games = data['games']
    items = sorted(data['ticket']['items'], key=lambda it: games[it['game']].get('start', ''))
    rows = []
    for it in items:
        g = games[it['game']]
        if it.get('legs'):
            states = [_leg_state(l, g) for l in it['legs']]
            st = 'miss' if 'miss' in states else 'hit' if all(s == 'hit' for s in states) else ('live' if _started(g) else 'open')
            rows.append({'sel': it['group'], 'mkt': ' · '.join(l['sel'] for l in it['legs']), 'odds': it['odds'], 'state': st})
        else:
            rows.append({'sel': it['sel'], 'mkt': it['mkt'], 'odds': it['odds'], 'state': _leg_state(it, g)})
    return rows


def _icon(d, cx, cy, state):
    r = 17
    if state == 'hit':
        d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], 9, fill=(31, 58, 25))
        d.line([(cx - 8, cy + 1), (cx - 2, cy + 7), (cx + 9, cy - 6)], fill=GREEN, width=5, joint='curve')
    elif state == 'miss':
        d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], 9, fill=RED_TINT)
        d.line([(cx - 7, cy - 7), (cx + 7, cy + 7)], fill=RED, width=5)
        d.line([(cx + 7, cy - 7), (cx - 7, cy + 7)], fill=RED, width=5)
    else:
        d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=YELLOW, width=4,
                  fill=YELLOW_TINT if state == 'live' else None)


def _fit(d, text, font, max_w):
    if d.textlength(text, font=font) <= max_w:
        return text
    while text and d.textlength(text + '…', font=font) > max_w:
        text = text[:-1]
    return text.rstrip() + '…'


def render(slug):
    hit = _cache.get(slug)
    if hit and time.time() - hit[0] < TTL_SECONDS:
        return hit[1]
    data = get_ticket(slug)
    t = data['ticket']
    rows = _rows(data)
    games = data['games']
    picks = []
    for it in t['items']:
        g = games[it['game']]
        for leg in it.get('legs', [it]):
            picks.append(_leg_state(leg, g))
    won, lost = picks.count('hit'), picks.count('miss')
    status = 'Lost' if lost else 'Won' if won == len(picks) else 'Open'

    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    card_fill = GREEN_TINT if status == 'Won' else RED_TINT if status == 'Lost' else CARD
    d.rounded_rectangle([40, 30, W - 40, H - 30], 26, fill=card_fill, outline=GREEN if status == 'Won' else LINE, width=2)

    x0, x1 = 80, W - 80
    # header
    f_title, f_odds = _font('Bold', 40), _font('Bold', 40)
    d.text((x0, 62), t['title'], font=f_title, fill=FG)
    tw = d.textlength(t['title'], font=f_title)
    d.line([(x0 + tw + 22, 70), (x0 + tw + 22, 104)], fill=FAINT, width=2)
    d.text((x0 + tw + 44, 62), _odds(t['odds']), font=f_odds, fill=FG)
    f_pill = _font('Bold', 26)
    pw = d.textlength(status, font=f_pill) + 44
    pill_fill, pill_fg = {'Open': (YELLOW_TINT, YELLOW), 'Won': (GREEN, GREEN_INK), 'Lost': (RED, (26, 5, 4))}[status]
    d.rounded_rectangle([x1 - pw, 64, x1, 106], 21, fill=pill_fill)
    d.text((x1 - pw / 2, 85), status, font=f_pill, fill=pill_fg, anchor='mm')

    # money
    f_lab, f_amt = _font('SemiBold', 22), _font('Bold', 34)
    cols = [('Wager', f"${t['wager']:,.2f}", FG), ('To pay', f"${t['toPay']:,.2f}", GREEN),
            (f"Each (÷{t['split']})", f"${t['toPay'] / t['split']:,.2f}", FG)]
    for i, (lab, amt, col) in enumerate(cols):
        x = x0 + i * 300
        d.text((x, 128), lab, font=f_lab, fill=MUTED)
        d.text((x, 156), amt, font=f_amt, fill=col)
    f_won = _font('SemiBold', 24)
    d.text((x1, 140), f'{won} of {len(picks)} won', font=f_won, fill=FG, anchor='ra')

    # pips
    order = []
    for it in sorted(t['items'], key=lambda it: games[it['game']].get('start', '')):
        g = games[it['game']]
        order += [_leg_state(l, g) for l in it.get('legs', [it])]
    gap, n = 10, len(order)
    pw_ = (x1 - x0 - gap * (n - 1)) / n
    for i, s in enumerate(order):
        col = {'hit': GREEN, 'miss': RED, 'live': YELLOW}.get(s, (38, 38, 38))
        xs = x0 + i * (pw_ + gap)
        d.rounded_rectangle([xs, 214, xs + pw_, 222], 4, fill=col)

    # legs
    top, bottom = 244, H - 52
    rh = (bottom - top) / max(len(rows), 1)
    f_sel, f_mkt, f_o = _font('Bold', 26), _font('Medium', 20), _font('SemiBold', 24)
    for i, r in enumerate(rows):
        y = top + i * rh
        tint = {'hit': GREEN_TINT, 'miss': RED_TINT, 'live': LIVE_TINT}.get(r['state'])
        if tint and status == 'Open':
            d.rectangle([42, y, W - 42, y + rh], fill=tint)
        d.line([(42, y), (W - 42, y)], fill=LINE, width=1)
        cy = y + rh / 2
        _icon(d, x0 + 17, cy, r['state'])
        odds_txt = _odds(r['odds'])
        ow = d.textlength(odds_txt, font=f_o)
        text_w = x1 - (x0 + 56) - ow - 24
        d.text((x0 + 56, cy + 1), _fit(d, r['sel'], f_sel, text_w * 0.55), font=f_sel, fill=FG, anchor='ls')
        sel_w = d.textlength(_fit(d, r['sel'], f_sel, text_w * 0.55), font=f_sel)
        d.text((x0 + 56 + sel_w + 14, cy), _fit(d, r['mkt'], f_mkt, text_w - sel_w - 14), font=f_mkt, fill=MUTED, anchor='ls')
        d.text((x1, cy + 1), odds_txt, font=f_o, fill=GREEN if r['state'] == 'hit' else MUTED, anchor='rs')
        live_txt = {'hit': 'Hit', 'miss': 'Missed', 'live': 'Live', 'open': 'Open'}[r['state']]
        d.text((x0 + 56, cy + 22), live_txt, font=_font('SemiBold', 16),
               fill={'hit': GREEN, 'miss': RED, 'live': YELLOW}.get(r['state'], FAINT), anchor='ls')

    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    png = buf.getvalue()
    _cache[slug] = (time.time(), png)
    return png
