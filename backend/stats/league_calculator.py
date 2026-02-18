"""
League-Wide Statistics Calculator
"""


def _tm(team_map, team_id, field='manager_name', default=None):
    """Extract name from team map (handles dict or string values)."""
    info = team_map.get(team_id)
    if info is None:
        return default or f"Team {team_id}"
    if isinstance(info, dict):
        return info.get(field, default or f"Team {team_id}")
    return info


def calculate_league_stats(team_stats, team_name_map):
    """
    Calculate league-wide statistics from all team data
    
    Args:
        team_stats: Dictionary mapping team_id to team stats
        team_name_map: Dictionary mapping team_id to team name
        
    Returns:
        Dictionary of league-wide statistics
    """
    if not team_stats:
        return {}
    
    team_count = len(team_stats)
    
    # Aggregate stats
    total_errors = sum(stats['errors'] for stats in team_stats.values())
    total_points_lost = sum(stats['points_lost'] for stats in team_stats.values())
    total_perfect_weeks = sum(
        len(stats['perfect_weeks']) for stats in team_stats.values()
    )
    
    # Best manager (fewest errors)
    best_manager_id = min(team_stats.keys(), key=lambda x: team_stats[x]['errors'])
    best_manager_errors = team_stats[best_manager_id]['errors']
    
    # Worst manager (most errors)
    worst_manager_id = max(team_stats.keys(), key=lambda x: team_stats[x]['errors'])
    worst_manager_errors = team_stats[worst_manager_id]['errors']
    
    # Most perfect weeks
    most_perfect_id = max(
        team_stats.keys(), 
        key=lambda x: len(team_stats[x]['perfect_weeks'])
    )
    most_perfect_count = len(team_stats[most_perfect_id]['perfect_weeks'])
    
    # Biggest underperformer (optimal wins - actual wins)
    biggest_underperformer_id = max(
        team_stats.keys(), 
        key=lambda x: (
            team_stats[x]['optimal_vs_actual_wins'] - 
            team_stats[x]['actual_wins']
        )
    )
    underperformer_diff = (
        team_stats[biggest_underperformer_id]['optimal_vs_actual_wins'] - 
        team_stats[biggest_underperformer_id]['actual_wins']
    )
    
    # Luckiest team (actual wins - optimal wins)
    luckiest_id = max(
        team_stats.keys(),
        key=lambda x: (
            team_stats[x]['actual_wins'] - 
            team_stats[x]['optimal_vs_actual_wins']
        )
    )
    luckiest_diff = (
        team_stats[luckiest_id]['actual_wins'] - 
        team_stats[luckiest_id]['optimal_vs_actual_wins']
    )
    
    # Calculate standings by actual wins, then total points
    standings = sorted(
        team_stats.keys(),
        key=lambda x: (
            team_stats[x]['actual_wins'], 
            team_stats[x]['total_points']
        ),
        reverse=True
    )
    
    # Create standings map (team_id -> rank)
    standings_map = {team_id: rank + 1 for rank, team_id in enumerate(standings)}
    
    return {
        'total_errors': total_errors,
        'total_points_lost': round(total_points_lost, 2),
        'total_perfect_weeks': total_perfect_weeks,
        'avg_errors_per_team': round(total_errors / team_count, 1),
        'avg_points_lost_per_team': round(total_points_lost / team_count, 2),
        'team_count': team_count,
        'standings': standings_map,
        'best_manager': {
            'team_id': best_manager_id,
            'name': _tm(team_name_map, best_manager_id),
            'errors': best_manager_errors
        },
        'worst_manager': {
            'team_id': worst_manager_id,
            'name': _tm(team_name_map, worst_manager_id),
            'errors': worst_manager_errors
        },
        'most_perfect_weeks': {
            'team_id': most_perfect_id,
            'name': _tm(team_name_map, most_perfect_id),
            'count': most_perfect_count
        },
        'biggest_underperformer': {
            'team_id': biggest_underperformer_id,
            'name': _tm(team_name_map, biggest_underperformer_id),
            'win_difference': underperformer_diff
        },
        'luckiest_team': {
            'team_id': luckiest_id,
            'name': _tm(team_name_map, luckiest_id),
            'win_difference': luckiest_diff
        }
    }
