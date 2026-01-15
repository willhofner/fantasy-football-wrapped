"""
Fantasy Football Wrapped - Flask API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS

from espn_api import (
    get_team_name_map, 
    fetch_league_data, 
    get_league_info
)
from stats_calculator import (
    analyze_season,
    format_team_wrapped
)

app = Flask(__name__)
CORS(app)

# Configuration
DEFAULT_YEAR = 2025
DEFAULT_START_WEEK = 1
DEFAULT_END_WEEK = 15


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
    print("Starting Fantasy Football Wrapped API...")
    print("Server running at http://localhost:5000")
    app.run(debug=True, port=5001)
