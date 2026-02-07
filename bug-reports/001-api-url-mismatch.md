# Bug Report: API calls hit wrong server — all experiences get HTML 404 instead of JSON

## Priority
Critical
- All three experiences (slides, pack-opening, arcade) are completely broken. No user can get past the League ID entry screen.

## Summary
When the hub page (index.html) redirects to any experience page (slides.html, pack-opening.html, arcade.html), the frontend's API calls use a relative `/api` path. Since these pages are served by Python's SimpleHTTPServer on port 8000 (not the Flask backend on port 5001), all API requests return a 404 HTML page instead of JSON. JavaScript then fails trying to parse `<!DOCTYPE HTML...` as JSON, producing `Unexpected token '<'`.

## Steps to Reproduce
1. Start the Flask backend: `cd backend && python3 app.py` (runs on port 5001)
2. Start the frontend: `cd frontend && python3 -m http.server 8000`
3. Open `http://localhost:8000/` in a browser
4. Enter a valid ESPN League ID (e.g., `17810260`), year `2024`
5. Select "Slideshow" experience and click "Continue"
6. Page redirects to `http://localhost:8000/slides.html?leagueId=17810260&year=2024&...`
7. Red error appears: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Environment:** Any browser, any device. Affects slides.html, pack-opening.html, and arcade.html.
**Reproducibility:** Always

## Expected Behavior
After clicking "Continue", the app should fetch league info from the Flask API, display team selection, and proceed through the experience.

## Actual Behavior
- **Slides & Card Pack:** Red error box appears with `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- **Arcade:** Page appears to do nothing (see separate bug report 002 for why error is hidden in arcade)

## Error Details
Console shows:
```
API Error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

The network request to `/api/league/17810260/info?year=2024` returns HTTP 404 with HTML body from SimpleHTTPServer, not JSON from Flask.

## Relevant Code Paths

### Data Flow
1. Hub page (`frontend/index.html`) → `startExperience()` (line 357) redirects to `slides.html?leagueId=...`
2. `frontend/static/js/setup.js:initFromUrlParams()` (line 239) reads URL params, calls `fetchLeague()` (line 268-270)
3. `fetchLeague()` (line 54) → calls `fetchLeagueInfo(leagueId, year)` (line 84)
4. `frontend/static/js/api.js:fetchLeagueInfo()` (line 32) builds URL: `` `${CONFIG.API_BASE_URL}/league/${leagueId}/info?year=${year}` ``
5. `CONFIG.API_BASE_URL` is `/api` (relative) → resolves to `http://localhost:8000/api/...` (wrong server)
6. `api.js:apiFetch()` (line 6) → `response.json()` (line 16) fails parsing HTML as JSON
7. Error caught, `setup.js:showError('step1', error.message)` (line 99) displays the raw JSON parse error

### Files to Examine
| File | Why |
|------|-----|
| `frontend/static/js/config.js:6` | `API_BASE_URL: '/api'` — the root cause. Relative path hits port 8000 instead of 5001 |
| `backend/app.py:29-44` | Flask only serves `index.html` and `index-v2.html`. Missing routes for `slides.html`, `pack-opening.html`, `arcade.html` |
| `frontend/static/js/api.js:6-16` | `apiFetch()` doesn't check if response is HTML before calling `.json()` |

### Suspect Code

```javascript
// frontend/static/js/config.js:6
// Relative URL only works if frontend and API are on the same server
API_BASE_URL: '/api',
```

```python
# backend/app.py:29-44
# Only two HTML routes exist — the experience pages are missing
@app.route('/')
def serve_frontend():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/v2')
def serve_frontend_v2():
    return send_from_directory(FRONTEND_DIR, 'index-v2.html')

# MISSING: /slides.html, /pack-opening.html, /arcade.html
```

```javascript
// frontend/static/js/api.js:16
// Blindly calls .json() without checking Content-Type or response.ok first
const data = await response.json();
```

## Root Cause Hypothesis
The app has a **two-server architecture problem**. The frontend is served from SimpleHTTPServer on port 8000, but `config.js` uses `API_BASE_URL: '/api'` (relative), so all fetch requests go to `localhost:8000/api/...` instead of `localhost:5001/api/...`. SimpleHTTPServer has no API routes and returns a 404 HTML page. `apiFetch()` then tries to parse that HTML as JSON and fails.

## Suggested Fix Direction
**Best fix — single-server approach:** Add Flask routes for all experience HTML pages so everything runs from port 5001. This makes the relative `/api` URL work correctly:

```python
# Add to backend/app.py — catch-all for HTML files in frontend dir
@app.route('/<path:filename>')
def serve_frontend_pages(filename):
    if filename.endswith('.html'):
        return send_from_directory(FRONTEND_DIR, filename)
    abort(404)
```

Or add individual routes:
```python
@app.route('/slides.html')
def serve_slides():
    return send_from_directory(FRONTEND_DIR, 'slides.html')

@app.route('/pack-opening.html')
def serve_pack_opening():
    return send_from_directory(FRONTEND_DIR, 'pack-opening.html')

@app.route('/arcade.html')
def serve_arcade():
    return send_from_directory(FRONTEND_DIR, 'arcade.html')
```

**Also fix `apiFetch()`** to check `response.ok` BEFORE calling `.json()`, and check Content-Type to provide a descriptive error message like "API server unreachable — got HTML instead of JSON" instead of a raw parse error.

## Additional Context
- The hub page (`index.html`) works fine because Flask serves it at `/`
- The CLAUDE.md Quick Commands section documents the two-server setup (`python3 app.py` on 5001, `python3 -m http.server 8000` on 8000) — this architecture is the root cause
- CORS is configured in Flask (`flask_cors`), so cross-origin requests from port 8000 to 5001 would work if the URL were correct
