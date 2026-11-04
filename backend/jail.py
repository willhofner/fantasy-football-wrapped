"""
Parlay Jail (League Constitution §7, from the Week 8 slip on).

- Solo miss: yours is the only losing leg on a settled slip → you're in jail from the next week.
  That next week you pay $10 alongside the lowest scorer (that's the only time you pay).
- In jail you have no leg on the slip and no share of winnings (a hit just returns your $10).
- Each week in jail you submit an escape pick. It hits → you're back on the slip the week after.
- Jail stacks: several managers can be in at once.
Worked out from the tickets themselves, so there's nothing to keep in sync by hand.
"""
import re
import time

SOLO_FROM = 8
_cache = {}


def _legs(t):
    return [l for it in t['items'] for l in it.get('legs', [it])]


def inmates(week_no):
    """Managers in Parlay Jail for that week, in the order they went in."""
    return [w for w, since in details(week_no)]


def new_inmates(week_no):
    """Who went in this week (their solo miss was last week): the only ones who pay the extra $10."""
    return [w for w, since in details(week_no) if since == week_no]


def details(week_no):
    """[(manager, first week in jail)] for that week."""
    hit = _cache.get(week_no)
    if hit and time.time() - hit[0] < 300:
        return hit[1]
    import parlay
    import tickets
    jailed = {}
    slugs = sorted((s for s in tickets.all_slugs() if int(re.search(r'\d+', s).group()) >= SOLO_FROM),
                   key=lambda s: int(re.search(r'\d+', s).group()))
    for slug in slugs:
        wk = int(re.search(r'\d+', slug).group())
        if wk >= week_no:
            break
        try:
            t = parlay.get_ticket(slug)['ticket']
        except Exception as e:
            print(f'[Jail] {slug}: {e}')
            continue
        for leg in t.get('escape', []):
            if leg.get('result') == 'hit':
                jailed.pop(leg.get('who'), None)
        legs = _legs(t)
        misses = [l for l in legs if l.get('result') == 'miss']
        if legs and all(l.get('result') for l in legs) and len(misses) == 1 and misses[0].get('who') not in (None, '?'):
            jailed.setdefault(misses[0]['who'], wk + 1)
    out = [(w, since) for w, since in sorted(jailed.items(), key=lambda x: x[1]) if since <= week_no]
    _cache[week_no] = (time.time(), out)
    return out
