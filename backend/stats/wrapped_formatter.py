"""
Wrapped Data Formatter
Formats team statistics for presentation in Wrapped style
"""


def _tm(team_map, team_id, field='manager_name', default=None):
    """Extract name from team map (handles dict or string values)."""
    info = team_map.get(team_id)
    if info is None:
        return default or f"Team {team_id}"
    if isinstance(info, dict):
        return info.get(field, default or f"Team {team_id}")
    return info


def format_team_wrapped(team_id, team_stats, team_name_map, league_stats):
    """
    Format a team's data for the Wrapped presentation
    
    Args:
        team_id: ID of the team
        team_stats: Dictionary of all team statistics
        team_name_map: Mapping of team IDs to names
        league_stats: League-wide statistics
        
    Returns:
        Formatted dictionary ready for frontend consumption
    """
    stats = team_stats[team_id]
    team_name = _tm(team_name_map, team_id)
    
    # Calculate error ranking
    all_errors = [s['errors'] for s in team_stats.values()]
    all_errors_sorted = sorted(all_errors)
    error_rank = all_errors_sorted.index(stats['errors']) + 1
    error_percentile = round((error_rank / len(all_errors)) * 100)
    
    # Get standing from league stats
    standing = league_stats['standings'].get(team_id, len(team_stats))
    
    # Calculate average points per week
    weeks_played = len(stats['weekly_data'])
    avg_points = (
        round(stats['total_points'] / weeks_played, 2) 
        if weeks_played > 0 else 0
    )
    
    return {
        'team_id': team_id,
        'team_name': team_name,
        'team_names': {str(tid): _tm(team_name_map, tid) for tid in team_name_map},  # Backward-compat string map
        'team_info': {str(tid): info if isinstance(info, dict) else {'team_name': info, 'manager_name': info} for tid, info in team_name_map.items()},  # Full dict for new features
        'overview': {
            'total_errors': stats['errors'],
            'total_points_lost': round(stats['points_lost'], 2),
            'total_points': round(stats['total_points'], 2),
            'total_optimal_points': round(stats['total_optimal_points'], 2),
            'avg_points_per_week': avg_points,
            'perfect_weeks': stats['perfect_weeks'],
            'perfect_week_count': len(stats['perfect_weeks']),
            'error_rank': error_rank,
            'error_percentile': error_percentile,
            'standing': standing
        },
        'records': {
            'actual': {
                'wins': stats['actual_wins'],
                'losses': stats['actual_losses'],
                'ties': stats.get('ties', 0)
            },
            'optimal': {
                'wins': stats['optimal_wins'],
                'losses': stats['optimal_losses']
            },
            'optimal_vs_actual': {
                'wins': stats['optimal_vs_actual_wins'],
                'losses': stats['optimal_vs_actual_losses']
            },
            'win_difference': stats['optimal_vs_actual_wins'] - stats['actual_wins']
        },
        'cross_comparisons': {
            'actual_beats_opp_optimal': stats['actual_beats_opp_optimal'],
            'optimal_loses_to_opp_actual': stats['optimal_loses_to_opp_actual']
        },
        'top_scorers': stats['top_scorers'],
        'highest_week': stats.get('highest_week'),
        'lowest_week': stats.get('lowest_week'),
        'lucky_break': stats.get('lucky_break'),
        'tough_luck': stats.get('tough_luck'),
        'highest_scorer_week': stats.get('highest_scorer_week'),
        'highest_bench_week': stats.get('highest_bench_week'),
        'most_slept_on': stats.get('most_slept_on'),
        'most_overrated': stats.get('most_overrated'),
        'weekly_data': stats['weekly_data'],
        'weekly_performance': {
            'actual_points': stats['weekly_points'],
            'optimal_points': stats['weekly_optimal_points']
        },
        'advanced_stats': stats.get('advanced_stats', {}),
    }
