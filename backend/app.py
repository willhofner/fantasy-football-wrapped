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

# Get the path to the frontend directory (one level up from backend)
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'))
CORS(app)

# Configuration
DEFAULT_YEAR = 2024
DEFAULT_START_WEEK = 1
DEFAULT_END_WEEK = 14


# ===== Frontend Routes =====

@app.route('/')
def serve_frontend():
    """Serve the main frontend page"""
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/v2')
def serve_frontend_v2():
    """Serve the v2 frontend (card pack experience)"""
    return send_from_directory(FRONTEND_DIR, 'index-v2.html')


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
        {'team_id': team_id, 'team_name': name}
        for team_id, name in team_map.items()
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


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') != 'production'
    print(f"Starting Fantasy Football Wrapped API on port {port}...")
    app.run(debug=debug, host='0.0.0.0', port=port)
