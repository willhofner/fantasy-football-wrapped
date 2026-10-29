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
from datetime import datetime, timezone

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
    with _lock:
        data = _load()
        dev = (data.get(name) or {}).get('device')
        if dev:
            dev['lastSeen'] = _now()
            _save(data)


def overview():
    """Everything Will needs to see who's linked where (no secrets)."""
    data = _load()
    out = []
    for name in MANAGERS:
        acct = data.get(name) or {}
        dev = acct.get('device') or {}
        out.append({'name': name, 'invited': bool(acct.get('invite')), 'inviteMade': acct.get('inviteMade'),
                    'device': dev.get('label'), 'claimed': dev.get('claimed'), 'lastSeen': dev.get('lastSeen'),
                    'attempts': acct.get('attempts', [])[-5:], 'role': ROLES.get(name),
                    'deviceIp': dev.get('ip'), 'deviceUa': dev.get('ua'), 'events': acct.get('events', [])})
    return out
