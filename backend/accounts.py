"""
League sign-in without passwords: one personal invite link per manager, locked to the
first phone that claims it.

- Will makes an invite (admin). The raw invite code exists only in the link he texts out;
  the server keeps a SHA-256 of it.
- Opening the link shows a "Sign in as TJ on this phone" button. Tapping it (not merely
  loading the page, so link-preview bots and curious taps never claim it) swaps the invite
  for a device secret stored in a long-lived HttpOnly cookie, and marks the invite used.
- Any later open of that link, on any device, is refused and logged so Will can see it.
- Every pick is saved under the name the cookie belongs to; the browser never says who it is.
- Will can reset someone: their device is signed out and a fresh link is issued.

Stored in DATA_DIR/accounts.json (the Railway volume), never in the repo.
"""
import hashlib
import json
import os
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone

from odds import DATA_DIR, MANAGERS

ROLES = {'Hof': 'admin', 'Pandolfi': 'slip'}   # Will = Hof; Pandolfi uploads the placed slip
COOKIE = 'pb_dev'
_lock = threading.Lock()
_fails = {}   # ip -> [timestamps] of bad invite codes


def _h(s):
    return hashlib.sha256(s.encode()).hexdigest()


def _file():
    os.makedirs(DATA_DIR, exist_ok=True)
    return os.path.join(DATA_DIR, 'accounts.json')


def _load():
    try:
        with open(_file()) as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return {}


def _save(data):
    tmp = _file() + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f, indent=1)
    os.replace(tmp, _file())


def _now():
    return datetime.now(timezone.utc).isoformat()


def device_label(ua):
    ua = ua or ''
    os_ = 'iPhone' if 'iPhone' in ua else 'iPad' if 'iPad' in ua else 'Android' if 'Android' in ua else \
        'Mac' if 'Macintosh' in ua else 'Windows' if 'Windows' in ua else 'Linux' if 'Linux' in ua else 'Unknown device'
    app = 'Instagram' if 'Instagram' in ua else 'Facebook' if 'FBAN' in ua or 'FBAV' in ua else \
        'Chrome' if 'CriOS' in ua or 'Chrome' in ua else 'Firefox' if 'FxiOS' in ua or 'Firefox' in ua else \
        'Safari' if 'Safari' in ua else 'in-app browser'
    return f'{os_} · {app}'


def _event(acct, kind, ua='', ip=''):
    """Every open of a person's link, kept for Will (last 100)."""
    acct.setdefault('events', []).append({'at': _now(), 'kind': kind, 'device': device_label(ua) if ua else '',
                                          'ua': (ua or '')[:300], 'ip': ip or ''})
    acct['events'] = acct['events'][-100:]


def log_open(code, kind, ua, ip):
    """Opens that never reach a sign-in (desktop, in-app browser, already signed in here)."""
    hc = _h(code or '')
    with _lock:
        data = _load()
        for name, acct in data.items():
            if acct.get('invite') == hc:
                _event(acct, kind, ua, ip)
                _save(data)
                return name
    return None


VISIT = 'Visited the pick sheet (recognized as signed in)'


def log_visit(name, ua, ip):
    """A signed-in phone loaded the pick sheet. Collapsed to one entry per 10 minutes so polling doesn't flood the log."""
    with _lock:
        data = _load()
        acct = data.get(name)
        if not acct:
            return
        last = next((e for e in reversed(acct.get('events', [])) if e['kind'] == VISIT), None)
        if last and datetime.fromisoformat(last['at']) > datetime.now(timezone.utc) - timedelta(minutes=10):
            return
        _event(acct, VISIT, ua, ip)
        _save(data)


# ---------- every page load, for Will's visit feed ----------

def log_access(name, page, ua, ip):
    """One line per page load of the tracker or pick sheet. Reloads within a minute collapse."""
    entry = {'at': _now(), 'who': name, 'page': page, 'device': device_label(ua), 'ip': ip or ''}
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, 'access.json')
    with _lock:
        try:
            with open(path) as f:
                log = json.load(f)
        except (FileNotFoundError, ValueError):
            log = []
        last = next((e for e in reversed(log[-50:]) if e['who'] == name and e['page'] == page and e['ip'] == entry['ip']), None)
        if last and datetime.fromisoformat(last['at']) > datetime.now(timezone.utc) - timedelta(minutes=1):
            return
        log = (log + [entry])[-5000:]
        with open(path + '.tmp', 'w') as f:
            json.dump(log, f)
        os.replace(path + '.tmp', path)


def access_log(limit=400):
    try:
        with open(os.path.join(DATA_DIR, 'access.json')) as f:
            return list(reversed(json.load(f)))[:limit]
    except (FileNotFoundError, ValueError):
        return []


def new_invite(name):
    """Issue a fresh link for a manager; signs out whatever device they had. Returns the raw code."""
    if name not in MANAGERS:
        return None
    code = secrets.token_urlsafe(16)
    with _lock:
        data = _load()
        acct = data.setdefault(name, {})
        acct.update(invite=_h(code), inviteMade=_now(), device=None, attempts=[])
        _event(acct, 'New link issued (old phone signed out)')
        _save(data)
    return code


def peek_invite(code):
    """Who an invite belongs to and whether it's still unclaimed (for the sign-in screen)."""
    if not code:
        return None, None
    hc = _h(code)
    for name, acct in _load().items():
        if acct.get('invite') == hc:
            return name, acct.get('device')
    return None, None


def _too_many_fails(ip):
    now = time.time()
    hits = [t for t in _fails.get(ip, []) if now - t < 3600]
    _fails[ip] = hits
    return len(hits) >= 20


def claim(code, ua, ip):
    """Swap an unclaimed invite for a device secret. Returns (name, secret, error)."""
    if _too_many_fails(ip):
        return None, None, 'Too many tries. Wait an hour.'
    hc = _h(code or '')
    with _lock:
        data = _load()
        for name, acct in data.items():
            if acct.get('invite') != hc:
                continue
            if acct.get('device'):
                acct.setdefault('attempts', []).append({'at': _now(), 'device': device_label(ua), 'ip': ip})
                acct['attempts'] = acct['attempts'][-20:]
                _event(acct, 'Refused: link already used', ua, ip)
                _save(data)
                return name, None, 'used'
            secret = secrets.token_urlsafe(32)
            acct['device'] = {'hash': _h(secret), 'label': device_label(ua), 'ua': (ua or '')[:300], 'ip': ip, 'claimed': _now()}
            _event(acct, 'Signed in (link locked to this browser)', ua, ip)
            _save(data)
            return name, secret, None
    _fails.setdefault(ip, []).append(time.time())
    return None, None, 'bad'


def who(secret):
    """Name for a device cookie, or None."""
    if not secret:
        return None
    hs = _h(secret)
    for name, acct in _load().items():
        if (acct.get('device') or {}).get('hash') == hs:
            return name
    return None


def touch(name):
    """Last time this person's signed-in phone used the site (written at most once a minute)."""
    with _lock:
        data = _load()
        dev = (data.get(name) or {}).get('device')
        if dev and (not dev.get('lastSeen') or datetime.fromisoformat(dev['lastSeen']) < datetime.now(timezone.utc) - timedelta(minutes=1)):
            dev['lastSeen'] = _now()
            _save(data)


def _backfill(data):
    """Accounts that signed in before the open log existed: rebuild their history from what was saved."""
    changed = False
    for acct in data.values():
        dev = acct.get('device') or {}
        # visits from before visits were logged: keep the last one we know about
        if dev.get('lastSeen') and not any(e['kind'] == VISIT for e in acct.get('events', [])):
            acct.setdefault('events', []).append({'at': dev['lastSeen'], 'kind': VISIT, 'device': dev.get('label', ''), 'ua': '', 'ip': ''})
            acct['events'].sort(key=lambda e: e['at'])
            changed = True
        if acct.get('events'):
            continue
        ev = []
        if acct.get('inviteMade'):
            ev.append({'at': acct['inviteMade'], 'kind': 'New link issued (old phone signed out)', 'device': '', 'ua': '', 'ip': ''})
        dev = acct.get('device') or {}
        if dev.get('claimed'):
            ev.append({'at': dev['claimed'], 'kind': 'Signed in (link locked to this browser)', 'device': dev.get('label', ''),
                       'ua': dev.get('ua', ''), 'ip': dev.get('ip', '')})
        for a in acct.get('attempts', []):
            ev.append({'at': a['at'], 'kind': 'Refused: link already used', 'device': a.get('device', ''), 'ua': '', 'ip': a.get('ip', '')})
        if ev:
            acct['events'] = sorted(ev, key=lambda e: e['at'])
            changed = True
    return changed


def overview():
    """Everything Will needs to see who's linked where (no secrets)."""
    with _lock:
        data = _load()
        if _backfill(data):
            _save(data)
    out = []
    for name in MANAGERS:
        acct = data.get(name) or {}
        dev = acct.get('device') or {}
        out.append({'name': name, 'invited': bool(acct.get('invite')), 'inviteMade': acct.get('inviteMade'),
                    'device': dev.get('label'), 'claimed': dev.get('claimed'), 'lastSeen': dev.get('lastSeen'),
                    'attempts': acct.get('attempts', [])[-5:], 'role': ROLES.get(name),
                    'deviceIp': dev.get('ip'), 'deviceUa': dev.get('ua'), 'events': acct.get('events', [])})
    return out
