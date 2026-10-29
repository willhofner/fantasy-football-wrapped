"""
Fantasy Football Wrapped - Flask API
"""
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from espn_api import (
    get_team_name_map,
    fetch_league_data,
    get_league_info
)
from stats import analyze_season, format_team_wrapped
from stats.weekly_analyzer import analyze_week, generate_week_summaries, find_one_player_away_losses
from stats.draft_analyzer import analyze_draft, calculate_draft_alternatives
from stats.waiver_analyzer import analyze_waivers
from stats.team_calculator import detect_undefeated_optimal, detect_perfect_lineup_losses
from live import get_live_week
from parlay import get_ticket
from parlay_og import render as render_parlay_og
import odds
import accounts

# Get the path to the frontend directory (one level up from backend)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'))
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 40 * 1024 * 1024  # a few phone screenshots

# Configuration
DEFAULT_YEAR = 2025


def current_season_year():
    """NFL season year: a season that kicks off in September belongs to that calendar year."""
    from datetime import date
    today = date.today()
    return today.year if today.month >= 8 else today.year - 1

DEFAULT_START_WEEK = 1
# Domains whose homepage is the league parlay tracker
PARLAY_HOSTS = {'pandolfi.bet', 'www.pandolfi.bet'}
# Set SITE=parlay on a Railway service to make that whole deploy the parlay site
PARLAY_SITE = os.environ.get('SITE', '').lower() == 'parlay'
DEFAULT_END_WEEK = 14


# ===== Frontend Routes =====

@app.route('/')
def serve_frontend():
    """Serve the main frontend page (pandolfi.bet gets the parlay tracker instead)"""
    host = (request.host or '').split(':')[0].lower()
    if PARLAY_SITE or host in PARLAY_HOSTS:
        return send_from_directory(FRONTEND_DIR, 'parlay.html')
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/slides.html')
def serve_slides():
    return send_from_directory(FRONTEND_DIR, 'slides.html')


@app.route('/pack-opening.html')
def serve_pack_opening():
    return send_from_directory(FRONTEND_DIR, 'pack-opening.html')


@app.route('/arcade.html')
def serve_arcade():
    return send_from_directory(FRONTEND_DIR, 'arcade.html')


@app.route('/index-vr.html')
def serve_vr():
    return send_from_directory(FRONTEND_DIR, 'index-vr.html')


@app.route('/live.html')
def serve_live():
    return send_from_directory(FRONTEND_DIR, 'live.html')


@app.route('/weekly.html')
def serve_weekly():
    return send_from_directory(FRONTEND_DIR, 'weekly.html')


@app.route('/draft.html')
def serve_draft():
    return send_from_directory(FRONTEND_DIR, 'draft.html')


@app.route('/mario.html')
def serve_mario():
    return send_from_directory(FRONTEND_DIR, 'mario.html')


@app.route('/madden.html')
def serve_madden():
    return send_from_directory(FRONTEND_DIR, 'madden.html')


@app.route('/pokemon.html')
def serve_pokemon():
    return send_from_directory(FRONTEND_DIR, 'pokemon.html')


@app.route('/waiver.html')
def serve_waiver():
    return send_from_directory(FRONTEND_DIR, 'waiver.html')


@app.route('/filing-cabinet.html')
def serve_filing_cabinet():
    return send_from_directory(FRONTEND_DIR, 'filing-cabinet.html')


@app.route('/number-art.html')
def serve_number_art():
    return send_from_directory(FRONTEND_DIR, 'number-art.html')


@app.route('/parlay')
@app.route('/parlay.html')
def serve_parlay():
    """League parlay tracker (live ticket)"""
    return send_from_directory(FRONTEND_DIR, 'parlay.html')


@app.route('/picks')
@app.route('/picks.html')
def serve_picks():
    """Weekly pick sheet (demo, not linked yet)"""
    return send_from_directory(FRONTEND_DIR, 'picks.html')


@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS)"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'static'), filename)


# ===== API Routes =====

@app.route('/og/picks.png', methods=['GET'])
def picks_og_image():
    """Link-preview image of the pick sheet: this week's slate."""
    from flask import Response
    from picks_og import render as render_picks_og
    return Response(render_picks_og(), mimetype='image/png', headers={'Cache-Control': 'public, max-age=600'})


@app.route('/og/<slug>.png', methods=['GET'])
def parlay_og_image(slug):
    """Link-preview image of a parlay ticket, drawn from live data."""
    import re
    from flask import Response
    if not re.fullmatch(r'[a-z0-9-]{1,40}', slug):
        return jsonify({'error': 'Unknown ticket'}), 404
    try:
        png = render_parlay_og(slug)
    except FileNotFoundError:
        return jsonify({'error': 'Unknown ticket'}), 404
    return Response(png, mimetype='image/png', headers={'Cache-Control': 'public, max-age=300'})


@app.route('/api/parlay/<slug>', methods=['GET'])
def parlay_ticket(slug):
    """One placed parlay ticket with live ESPN data merged in."""
    import re
    if not re.fullmatch(r'[a-z0-9-]{1,40}', slug):
        return jsonify({'error': 'Unknown ticket'}), 404
    try:
        data = get_ticket(slug)
    except FileNotFoundError:
        return jsonify({'error': 'Unknown ticket'}), 404
    resp = jsonify(data)
    resp.headers['Cache-Control'] = 'no-store'
    return resp


@app.route('/api/odds/nfl', methods=['GET'])
def odds_slate():
    """This week's NFL slate (DraftKings lines) from the last pull, plus everyone's picks."""
    me = _me()
    if not me and not _pick_role():
        return jsonify({'error': 'Open your personal link on your phone to see this week’s lines'}), 401
    if me:
        accounts.touch(me)
    odds.maybe_auto_refresh()
    slate = odds.get_slate()
    resp = jsonify({'slate': slate, 'picks': odds.get_picks(_week_for(slate)),
                    'managers': odds.MANAGERS, 'keySet': bool(os.environ.get('ODDS_API_KEY')), **odds.status()})
    resp.headers['Cache-Control'] = 'no-store'
    return resp


def _week_for(slate):
    """This week's key; ?sandbox=1 (or sandbox in the body) uses a separate test copy nobody else sees."""
    week = slate and slate.get('week')
    body = request.get_json(silent=True) if request.method == 'POST' and request.is_json else {}
    sandbox = request.args.get('sandbox') == '1' or (body or {}).get('sandbox')
    return f'{week}-test' if week and sandbox else week


def _me():
    """The manager this browser is signed in as (from the device cookie), or None."""
    return accounts.who(request.cookies.get(accounts.COOKIE))


def _pick_role():
    key = request.headers.get('X-Pick-Key')
    if key:
        return odds.role_for(key)
    return accounts.ROLES.get(_me())


@app.route('/api/whoami', methods=['GET'])
def pick_whoami():
    """Who this phone is signed in as, and which league tools that unlocks."""
    name = _me()
    if name:
        accounts.touch(name)
        ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
        accounts.log_visit(name, request.headers.get('User-Agent'), ip)
    return jsonify({'name': name, 'role': _pick_role()})


@app.route('/api/invite/<code>', methods=['GET'])
def invite_peek(code):
    """Sign-in screen: whose link this is and whether it's already been used. Doesn't claim it."""
    name, device = accounts.peek_invite(code)
    if not name:
        return jsonify({'error': 'This link isn’t valid. Ask Will for a new one.'}), 404
    return jsonify({'name': name, 'used': bool(device), 'device': (device or {}).get('label'), 'claimed': (device or {}).get('claimed')})


@app.route('/api/invite/<code>/claim', methods=['POST'])
def invite_claim(code):
    """Tap 'Sign in as X': lock this invite to this phone with a long-lived cookie."""
    ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
    ua = request.headers.get('User-Agent') or ''
    if not any(k in ua for k in ('iPhone', 'iPad', 'Android', 'Mobile')):
        accounts.log_open(code, 'Blocked: not a phone', ua, ip)
        return jsonify({'error': 'Open this on your phone'}), 403
    name, secret, error = accounts.claim(code, request.headers.get('User-Agent'), ip)
    if error == 'used':
        return jsonify({'error': f'This link was already used on another phone. Ask Will to reset it.', 'name': name}), 409
    if error:
        return jsonify({'error': 'This link isn’t valid. Ask Will for a new one.' if error == 'bad' else error}), 404 if error == 'bad' else 429
    resp = jsonify({'name': name, 'role': accounts.ROLES.get(name)})
    resp.set_cookie(accounts.COOKIE, secret, max_age=400 * 86400, httponly=True, secure=True, samesite='Lax')
    return resp


@app.route('/api/invite/<code>/seen', methods=['POST'])
def invite_seen(code):
    """The page opened a link but didn't sign in (desktop, in-app browser, or already signed in here). Logged for Will."""
    ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
    why = {'desktop': 'Blocked: not a phone', 'inapp': 'Blocked: in-app browser', 'same': 'Reopened on the signed-in phone'}.get(
        (request.get_json(silent=True) or {}).get('why'), 'Opened')
    accounts.log_open(code, why, request.headers.get('User-Agent'), ip)
    return jsonify({'ok': True})


@app.route('/api/admin/accounts', methods=['GET'])
def admin_accounts():
    if _pick_role() != 'admin':
        return jsonify({'error': 'Only Will can see this'}), 403
    return jsonify({'accounts': accounts.overview()})


@app.route('/api/admin/accounts/<name>/reset', methods=['POST'])
def admin_reset(name):
    """New link for one manager; their current phone is signed out."""
    if _pick_role() != 'admin':
        return jsonify({'error': 'Only Will can do that'}), 403
    code = accounts.new_invite(name)
    if not code:
        return jsonify({'error': 'Unknown manager'}), 404
    return jsonify({'name': name, 'link': f'https://pandolfi.bet/picks?invite={code}'})


@app.route('/api/slips', methods=['GET', 'POST'])
def pick_slips():
    """Upload (POST, field 'slip') or list this week's placed-bet screenshots. Will + Pandolfi only."""
    if _pick_role() not in ('admin', 'slip'):
        return jsonify({'error': 'Only Will and Pandolfi can do that'}), 403
    week = _week_for(odds.get_slate() or {})
    if request.method == 'POST':
        saved = odds.save_slips(week, request.files.getlist('slip'))
        if not saved:
            return jsonify({'error': 'Send a PNG, JPG, HEIC or WebP screenshot'}), 400
    return jsonify({'week': week, 'slips': odds.list_slips(week)})


@app.route('/api/slips/<week>/<name>', methods=['GET'])
def pick_slip_file(week, name):
    import re
    if _pick_role() not in ('admin', 'slip'):
        return jsonify({'error': 'Only Will and Pandolfi can do that'}), 403
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}(-test)?', week) or not re.fullmatch(r'[\w.-]+', name):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(odds.slip_dir(week), name)


@app.route('/api/odds/nfl/refresh', methods=['POST'])
def odds_refresh():
    """Pull a fresh slate (rate-limited; costs Odds API credits). Will only."""
    if _pick_role() != 'admin':
        return jsonify({'error': 'Only Will can pull new lines'}), 403
    if not os.environ.get('ODDS_API_KEY'):
        return jsonify({'error': 'ODDS_API_KEY is not set on the server'}), 503
    odds.start_refresh()
    return jsonify(odds.status()), 202


@app.route('/api/picks', methods=['POST'])
def save_pick():
    """Set (or clear, with pick=null) one manager's leg for this week."""
    body = request.get_json(silent=True) or {}
    slate = odds.get_slate()
    who = _me()
    # Will (and Claude's key) may pick for anyone, but only in test mode
    if body.get('sandbox') and _pick_role() == 'admin' and body.get('who'):
        who = body['who']
    # Claude's key can fix a real pick (e.g. one entered under the wrong name)
    if request.headers.get('X-Pick-Key') and _pick_role() == 'admin' and body.get('who'):
        who = body['who']
    if not who:
        return jsonify({'error': 'Open your personal link from Will to make picks'}), 401
    picks, error = odds.save_pick(_week_for(slate), who, body.get('pick'))
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'picks': picks})


@app.route('/api/league/<league_id>/info', methods=['GET'])
def league_info(league_id):
    """Get basic league information"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    
    info, error = get_league_info(league_id, year)
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify(info)


@app.route('/api/league/<league_id>/teams', methods=['GET'])
def league_teams(league_id):
    """Get all teams in the league"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    
    team_map, error = get_team_name_map(league_id, year)
    
    if error:
        return jsonify({'error': error}), 400
    
    teams = [
        {
            'team_id': team_id,
            'team_name': info['team_name'] if isinstance(info, dict) else info,
            'manager_name': info['manager_name'] if isinstance(info, dict) else info
        }
        for team_id, info in team_map.items()
    ]
    
    return jsonify({'teams': teams})


@app.route('/api/league/<league_id>/analyze', methods=['GET'])
def analyze_league(league_id):
    """Analyze full season for all teams"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)
    
    team_name_map, error = get_team_name_map(league_id, year)
    if error:
        return jsonify({'error': error}), 400
    
    try:
        results = analyze_season(
            league_id, 
            year, 
            start_week, 
            end_week,
            team_name_map,
            fetch_league_data
        )
        
        return jsonify({
            'league_id': league_id,
            'year': year,
            'weeks_analyzed': f"{start_week}-{end_week}",
            'team_stats': results['team_stats'],
            'league_stats': results['league_stats'],
            'team_names': team_name_map,
            'processing_errors': results['processing_errors']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/<league_id>/team/<int:team_id>/wrapped', methods=['GET'])
def team_wrapped(league_id, team_id):
    """Get Wrapped-style data for a specific team"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)

    team_name_map, error = get_team_name_map(league_id, year)
    if error:
        return jsonify({'error': error}), 400

    try:
        results = analyze_season(
            league_id,
            year,
            start_week,
            end_week,
            team_name_map,
            fetch_league_data
        )

        if team_id not in results['team_stats']:
            return jsonify({'error': f'Team {team_id} not found in league'}), 404

        wrapped_data = format_team_wrapped(
            team_id,
            results['team_stats'],
            team_name_map,
            results['league_stats']
        )

        wrapped_data['league_context'] = results['league_stats']

        return jsonify(wrapped_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/<league_id>/live', methods=['GET'])
def league_live(league_id):
    """Live state of the current (or a given) week: scores, projections, who is still to play."""
    year = request.args.get('year', type=int) or current_season_year()
    week = request.args.get('week', type=int)
    try:
        result = get_live_week(league_id, year, week)
    except Exception as e:
        return jsonify({'error': f'Could not load live week: {e}'}), 502
    resp = jsonify(result)
    resp.headers['Cache-Control'] = 'no-store'
    return resp


@app.route('/api/league/<league_id>/week/<int:week>/deep-dive', methods=['GET'])
def week_deep_dive(league_id, week):
    """Get deep dive data for a specific week including summaries"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    team_id = request.args.get('team_id', type=int)
    include_summaries = request.args.get('include_summaries', 'true').lower() == 'true'
    force_regenerate = request.args.get('force_regenerate', 'false').lower() == 'true'

    if not team_id:
        return jsonify({'error': 'team_id query parameter is required'}), 400

    team_name_map, error = get_team_name_map(league_id, year)
    if error:
        return jsonify({'error': error}), 400

    try:
        # Get week analysis (matchups, standings, etc.)
        result = analyze_week(
            league_id,
            year,
            week,
            team_id,
            team_name_map,
            fetch_league_data
        )

        if result.get('error'):
            return jsonify({'error': result['error']}), 400

        # Add summaries if requested
        if include_summaries:
            league_info, _ = get_league_info(league_id, year)
            league_name = league_info.get('league_name', 'Unknown League') if league_info else 'Unknown League'

            summaries = generate_week_summaries(
                league_id,
                league_name,
                year,
                week,
                result['all_matchups'],
                result['standings'],
                force_regenerate=force_regenerate
            )

            result['nfl_summary'] = summaries['nfl_summary']
            result['fantasy_summary'] = summaries['fantasy_summary']
            result['nfl_scores'] = summaries['nfl_scores']

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/<league_id>/draft', methods=['GET'])
def league_draft(league_id):
    """Get draft analysis for the league"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)

    try:
        result, error = analyze_draft(league_id, year, start_week, end_week)

        if error:
            return jsonify({'error': error}), 400

        return jsonify({
            'league_id': league_id,
            'year': year,
            'picks': result['picks'],
            'team_map': result['team_map'],
            'total_weeks': result['total_weeks'],
            'team_grades': result.get('team_grades', {}),
            'position_grades': result.get('position_grades', {}),
            'poachers': result.get('poachers', {}),
            'team_synopses': result.get('team_synopses', {}),
            'advanced_stats': result.get('advanced_stats', {}),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/<league_id>/draft/alternatives', methods=['GET'])
def league_draft_alternatives(league_id):
    """Get draft alternative analysis for a specific team"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)
    team_id = request.args.get('team_id', type=int)

    if not team_id:
        return jsonify({'error': 'team_id query parameter is required'}), 400

    try:
        result, error = analyze_draft(league_id, year, start_week, end_week)

        if error:
            return jsonify({'error': error}), 400

        alternatives = calculate_draft_alternatives(result['picks'], team_id)

        return jsonify({
            'league_id': league_id,
            'year': year,
            'team_id': team_id,
            'alternatives': alternatives,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/league/<league_id>/team/<int:team_id>/gasp-previews', methods=['GET'])
def team_gasp_previews(league_id, team_id):
    """Get gasp moment previews for dashboard cards"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)

    team_name_map, error = get_team_name_map(league_id, year)
    if error:
        return jsonify({'error': error}), 400

    previews = {'start_sit': None, 'draft': None, 'waiver': None}

    try:
        # Start/Sit pillar: optimal record + one-player-away count
        results = analyze_season(
            league_id, year, start_week, end_week,
            team_name_map, fetch_league_data
        )
        if team_id in results['team_stats']:
            ts = results['team_stats'][team_id]
            optimal = detect_undefeated_optimal(team_id, results['team_stats'])
            perfect_losses = detect_perfect_lineup_losses(team_id, results['team_stats'], team_name_map)
            total_pts_lost = round(ts.get('points_lost', 0), 1)
            previews['start_sit'] = {
                'optimal_record': f"{optimal['optimal_wins']}-{optimal['optimal_losses']}",
                'actual_record': f"{optimal['actual_wins']}-{optimal['actual_losses']}",
                'wins_left_on_bench': optimal['wins_left_on_bench'],
                'undefeated_optimal': optimal['undefeated'],
                'perfect_lineup_losses': len(perfect_losses),
                'total_points_lost': total_pts_lost,
            }

        # Draft pillar: biggest miss
        draft_result, draft_error = analyze_draft(league_id, year, start_week, end_week)
        if not draft_error:
            alternatives = calculate_draft_alternatives(draft_result['picks'], team_id)
            biggest_miss = max(alternatives, key=lambda a: a['missed_points']) if alternatives else None
            if biggest_miss and biggest_miss['missed_points'] > 0:
                previews['draft'] = {
                    'biggest_miss_player': biggest_miss['your_pick']['player_name'],
                    'best_alternative': biggest_miss['best_alternative']['player_name'],
                    'missed_points': biggest_miss['missed_points'],
                    'round': biggest_miss['your_pick']['round'],
                }

        # Waiver pillar: transaction count + best pickup
        waiver_result, waiver_error = analyze_waivers(league_id, year, start_week, end_week)
        if not waiver_error:
            team_txns = [t for t in waiver_result.get('transactions', []) if t.get('to_team_id') == team_id]
            awards = waiver_result.get('awards', {})
            previews['waiver'] = {
                'total_moves': len(team_txns),
                'league_total_moves': len(waiver_result.get('transactions', [])),
                'diamond': awards.get('diamond_in_the_rough', {}).get('player_name') if awards.get('diamond_in_the_rough') else None,
            }

    except Exception as e:
        # Return partial previews even if some fail
        previews['error'] = str(e)

    return jsonify(previews)


@app.route('/api/league/<league_id>/waivers', methods=['GET'])
def league_waivers(league_id):
    """Get waiver wire analysis for the league"""
    year = request.args.get('year', DEFAULT_YEAR, type=int)
    start_week = request.args.get('start_week', DEFAULT_START_WEEK, type=int)
    end_week = request.args.get('end_week', DEFAULT_END_WEEK, type=int)

    try:
        result, error = analyze_waivers(league_id, year, start_week, end_week)

        if error:
            return jsonify({'error': error}), 400

        return jsonify({
            'league_id': league_id,
            'year': year,
            **result,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'
    print(f"Starting Fantasy Football Wrapped API on port {port}...")
    app.run(debug=debug, host='0.0.0.0', port=port)
