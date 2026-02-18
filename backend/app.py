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

# Get the path to the frontend directory (one level up from backend)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'))
CORS(app)

# Configuration
DEFAULT_YEAR = 2025
DEFAULT_START_WEEK = 1
DEFAULT_END_WEEK = 14


# ===== Frontend Routes =====

@app.route('/')
def serve_frontend():
    """Serve the main frontend page"""
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


@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS)"""
    return send_from_directory(os.path.join(FRONTEND_DIR, 'static'), filename)


# ===== API Routes =====

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
