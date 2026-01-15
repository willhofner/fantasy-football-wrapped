"""
Team-Level Statistics Calculator
"""
from collections import defaultdict, Counter


def initialize_team_stats():
    """Initialize empty team stats dictionary"""
    return {
        'errors': 0,
        'points_lost': 0.0,
        'actual_wins': 0,
        'actual_losses': 0,
        'ties': 0,
        'optimal_wins': 0,
        'optimal_losses': 0,
        'optimal_vs_actual_wins': 0,
        'optimal_vs_actual_losses': 0,
        'actual_beats_opp_optimal': 0,
        'optimal_loses_to_opp_actual': 0,
        'benched_stars': [],
        'started_busts': [],
        'perfect_weeks': [],
        'weekly_points': [],
        'weekly_optimal_points': [],
        'weekly_data': [],
        'total_points': 0.0,
        'total_optimal_points': 0.0,
        'player_season_points': defaultdict(float),
        'highest_scorer_week': None,
        'highest_bench_week': None,
    }


def calculate_post_season_stats(team_stats):
    """
    Calculate derived stats after all weeks are processed
    
    Args:
        team_stats: Dictionary of team statistics
        
    Returns:
        Modified team_stats with additional calculated fields
    """
    stats = team_stats
    
    # Convert defaultdict to regular dict for JSON serialization
    stats['player_season_points'] = dict(stats['player_season_points'])
    
    # Find top 3 scorers
    sorted_players = sorted(
        stats['player_season_points'].items(), 
        key=lambda x: x[1], 
        reverse=True
    )
    stats['top_scorers'] = [
        {'name': name, 'points': round(pts, 2)} 
        for name, pts in sorted_players[:3]
    ]
    
    # Lucky break (lowest score in a win)
    wins = [w for w in stats['weekly_data'] if w['won']]
    if wins:
        lucky_break = min(wins, key=lambda x: x['my_score'])
        stats['lucky_break'] = {
            'week': lucky_break['week'],
            'my_score': lucky_break['my_score'],
            'opp_score': lucky_break['opp_score'],
            'opponent_id': lucky_break['opponent_id'],
            'opp_zeros': lucky_break['opp_zeros']
        }
    else:
        stats['lucky_break'] = None
    
    # Tough luck (highest score in a loss)
    losses = [w for w in stats['weekly_data'] if not w['won']]
    if losses:
        tough_luck = max(losses, key=lambda x: x['my_score'])
        stats['tough_luck'] = {
            'week': tough_luck['week'],
            'my_score': tough_luck['my_score'],
            'opp_score': tough_luck['opp_score'],
            'opponent_id': tough_luck['opponent_id']
        }
    else:
        stats['tough_luck'] = None
    
    # Highest and lowest scoring weeks
    if stats['weekly_data']:
        highest_week = max(stats['weekly_data'], key=lambda x: x['my_score'])
        lowest_week = min(stats['weekly_data'], key=lambda x: x['my_score'])
        
        stats['highest_week'] = {
            'week': highest_week['week'],
            'score': highest_week['my_score'],
            'opponent_id': highest_week['opponent_id'],
            'opp_score': highest_week['opp_score'],
            'won': highest_week['won']
        }
        
        stats['lowest_week'] = {
            'week': lowest_week['week'],
            'score': lowest_week['my_score'],
            'opponent_id': lowest_week['opponent_id'],
            'opp_score': lowest_week['opp_score'],
            'won': lowest_week['won']
        }
    
    # Most slept on player (most frequently benched when optimal)
    if stats['benched_stars']:
        benched_counter = Counter(p['name'] for p in stats['benched_stars'])
        most_benched = benched_counter.most_common(1)[0]
        total_pts = sum(
            p['points'] for p in stats['benched_stars'] 
            if p['name'] == most_benched[0]
        )
        weeks = [
            p['week'] for p in stats['benched_stars'] 
            if p['name'] == most_benched[0]
        ]
        stats['most_slept_on'] = {
            'name': most_benched[0],
            'times_benched': most_benched[1],
            'points_missed': round(total_pts, 2),
            'weeks': weeks
        }
    else:
        stats['most_slept_on'] = None
    
    # Most overrated player (most frequently started when shouldn't)
    if stats['started_busts']:
        bust_counter = Counter(p['name'] for p in stats['started_busts'])
        most_overrated = bust_counter.most_common(1)[0]
        total_pts = sum(
            p['points'] for p in stats['started_busts'] 
            if p['name'] == most_overrated[0]
        )
        weeks = [
            p['week'] for p in stats['started_busts'] 
            if p['name'] == most_overrated[0]
        ]
        stats['most_overrated'] = {
            'name': most_overrated[0],
            'times_started': most_overrated[1],
            'points_from_starts': round(total_pts, 2),
            'weeks': weeks
        }
    else:
        stats['most_overrated'] = None
    
    # Convert optimal_lineup tuples to serializable format
    for week_data in stats['weekly_data']:
        week_data['optimal_lineup'] = [
            {'position': pos, 'player': player} 
            for pos, player in week_data['optimal_lineup']
        ]
    
    return stats
