"""
Season Analyzer - Main orchestration of fantasy football analysis
"""
from collections import defaultdict
from .lineup_optimizer import (
    calculate_optimal_lineup, 
    get_optimal_total, 
    get_optimal_player_names
)
from .team_calculator import (
    initialize_team_stats, 
    calculate_post_season_stats
)
from .league_calculator import calculate_league_stats
from ..espn_api import POSITION_MAP, PLAYER_POSITION_MAP


def process_team_roster(team_roster, week):
    """
    Process roster and return starters and bench with full player details
    
    Args:
        team_roster: List of roster entries from ESPN API
        week: Week number being processed
        
    Returns:
        Tuple of (starters, bench) - lists of player dicts
    """
    starters = []
    bench = []
    
    for entry in team_roster:
        player = entry.get('playerPoolEntry', {}).get('player', {})
        player_name = player.get('fullName', 'Unknown')
        lineup_slot_id = entry.get('lineupSlotId')
        position = POSITION_MAP.get(lineup_slot_id, f"Slot_{lineup_slot_id}")
        
        player_position_id = player.get('defaultPositionId', 0)
        actual_position = PLAYER_POSITION_MAP.get(player_position_id, "Unknown")
        
        points = entry.get('playerPoolEntry', {}).get('appliedStatTotal', 0)
        
        # Fallback: look in player stats if points not in entry
        if points == 0:
            stats = player.get('stats', [])
            for stat in stats:
                if stat.get('scoringPeriodId') == week:
                    points = stat.get('appliedTotal', 0)
                    if points > 0:
                        break
        
        player_info = {
            'name': player_name,
            'position': position,
            'actual_position': actual_position,
            'slot_id': lineup_slot_id,
            'points': round(points, 2)
        }
        
        if lineup_slot_id == 20:  # Bench
            bench.append(player_info)
        elif lineup_slot_id != 21:  # Not IR
            starters.append(player_info)
    
    return starters, bench


def update_team_week_stats(
    team_stats, 
    team_id, 
    starters, 
    bench, 
    optimal_lineup,
    actual_score,
    optimal_score,
    week,
    opponent_id,
    opponent_score,
    opponent_zeros,
    won
):
    """
    Update team statistics for a single week
    
    Args:
        team_stats: Team stats dictionary to update
        team_id: ID of the team
        starters: List of starter players
        bench: List of bench players
        optimal_lineup: Optimal lineup for this week
        actual_score: Actual score for the week
        optimal_score: Optimal score for the week
        week: Week number
        opponent_id: Opponent team ID
        opponent_score: Opponent's score
        opponent_zeros: Number of zeros in opponent's lineup
        won: Boolean indicating if team won
    """
    stats = team_stats[team_id]
    
    # Update totals
    stats['total_points'] += actual_score
    stats['total_optimal_points'] += optimal_score
    stats['weekly_points'].append(actual_score)
    stats['weekly_optimal_points'].append(optimal_score)
    
    # Track player season totals
    for starter in starters:
        stats['player_season_points'][starter['name']] += starter['points']
    
    # Track highest scoring starter this week
    for starter in starters:
        current_high = stats['highest_scorer_week']
        if current_high is None or starter['points'] > current_high['points']:
            stats['highest_scorer_week'] = {
                'name': starter['name'],
                'points': starter['points'],
                'week': week,
                'opponent_id': opponent_id,
                'my_score': actual_score,
                'opp_score': opponent_score,
                'won': won
            }
    
    # Track highest scoring bench player this week
    for bench_player in bench:
        current_high = stats['highest_bench_week']
        if current_high is None or bench_player['points'] > current_high['points']:
            # Find potential replacement
            replaceable_starters = [
                s for s in starters 
                if s['actual_position'] == bench_player['actual_position']
                or s['position'] == 'FLEX'
            ]
            lowest_starter = min(
                replaceable_starters, 
                key=lambda x: x['points']
            ) if replaceable_starters else None
            
            potential_gain = bench_player['points'] - (
                lowest_starter['points'] if lowest_starter else 0
            )
            would_have_won = (
                (actual_score + potential_gain) > opponent_score 
                if lowest_starter else None
            )
            
            stats['highest_bench_week'] = {
                'name': bench_player['name'],
                'points': bench_player['points'],
                'week': week,
                'opponent_id': opponent_id,
                'my_score': actual_score,
                'opp_score': opponent_score,
                'won_anyway': won,
                'would_have_won': would_have_won,
                'potential_gain': potential_gain,
                'replaced_player': lowest_starter['name'] if lowest_starter else None
            }
    
    # Check for perfect lineup
    optimal_names = get_optimal_player_names(optimal_lineup)
    starter_names = set(p['name'] for p in starters)
    is_perfect = optimal_names == starter_names
    
    if is_perfect:
        stats['perfect_weeks'].append(week)
    
    # Store detailed weekly data
    stats['weekly_data'].append({
        'week': week,
        'opponent_id': opponent_id,
        'my_score': round(actual_score, 2),
        'opp_score': round(opponent_score, 2),
        'my_optimal': round(optimal_score, 2),
        'won': won,
        'starters': starters,
        'bench': bench,
        'optimal_lineup': [(pos, p) for pos, p in optimal_lineup],
        'is_perfect': is_perfect,
        'opp_zeros': opponent_zeros
    })
    
    # Count lineup errors
    errors = len(optimal_names - starter_names)
    points_lost = optimal_score - actual_score
    
    stats['errors'] += errors
    stats['points_lost'] += points_lost
    
    # Track benched stars and started busts
    for opt_pos, opt_player in optimal_lineup:
        if opt_player['name'] not in starter_names:
            stats['benched_stars'].append({
                'name': opt_player['name'],
                'points': opt_player['points'],
                'week': week
            })
    
    for starter in starters:
        if starter['name'] not in optimal_names:
            stats['started_busts'].append({
                'name': starter['name'],
                'points': starter['points'],
                'week': week
            })


def update_win_loss_records(
    team_stats,
    home_id,
    away_id,
    home_actual,
    away_actual,
    home_optimal,
    away_optimal
):
    """
    Update win-loss records for both teams
    
    Args:
        team_stats: Dictionary of team statistics
        home_id: Home team ID
        away_id: Away team ID
        home_actual: Home team actual score
        away_actual: Away team actual score
        home_optimal: Home team optimal score
        away_optimal: Away team optimal score
    """
    # Actual win/loss
    if home_actual > away_actual:
        team_stats[home_id]['actual_wins'] += 1
        team_stats[away_id]['actual_losses'] += 1
    elif away_actual > home_actual:
        team_stats[away_id]['actual_wins'] += 1
        team_stats[home_id]['actual_losses'] += 1
    else:  # Tie
        team_stats[home_id]['ties'] += 1
        team_stats[away_id]['ties'] += 1
    
    # Optimal win/loss (both teams optimal)
    if home_optimal > away_optimal:
        team_stats[home_id]['optimal_wins'] += 1
        team_stats[away_id]['optimal_losses'] += 1
    elif away_optimal > home_optimal:
        team_stats[away_id]['optimal_wins'] += 1
        team_stats[home_id]['optimal_losses'] += 1
    
    # My optimal vs opponent's actual
    if home_optimal > away_actual:
        team_stats[home_id]['optimal_vs_actual_wins'] += 1
    elif home_optimal < away_actual:
        team_stats[home_id]['optimal_vs_actual_losses'] += 1
    
    if away_optimal > home_actual:
        team_stats[away_id]['optimal_vs_actual_wins'] += 1
    elif away_optimal < home_actual:
        team_stats[away_id]['optimal_vs_actual_losses'] += 1
    
    # Cross comparisons
    if home_actual > away_optimal:
        team_stats[home_id]['actual_beats_opp_optimal'] += 1
    if home_optimal < away_actual:
        team_stats[home_id]['optimal_loses_to_opp_actual'] += 1
    if away_actual > home_optimal:
        team_stats[away_id]['actual_beats_opp_optimal'] += 1
    if away_optimal < home_actual:
        team_stats[away_id]['optimal_loses_to_opp_actual'] += 1


def analyze_season(league_id, year, start_week, end_week, team_name_map, fetch_data_func):
    """
    Analyze full season and return comprehensive statistics
    
    Args:
        league_id: ESPN league ID
        year: Season year
        start_week: First week to analyze
        end_week: Last week to analyze
        team_name_map: Dictionary mapping team IDs to names
        fetch_data_func: Function to fetch data (allows dependency injection)
        
    Returns:
        Dictionary containing:
            - team_stats: Stats for each team
            - league_stats: League-wide statistics
            - processing_errors: List of any errors encountered
    """
    team_stats = defaultdict(initialize_team_stats)
    processing_errors = []
    
    # Process each week
    for week in range(start_week, end_week + 1):
        data, error = fetch_data_func(league_id, year, week)
        
        if error or not data:
            processing_errors.append(f"Week {week}: {error or 'No data'}")
            continue
        
        schedule = data.get('schedule', [])
        matchups = [m for m in schedule if m.get('matchupPeriodId') == week]
        
        if not matchups:
            processing_errors.append(f"Week {week}: No matchups found")
            continue
        
        # Process each matchup
        for matchup in matchups:
            home = matchup.get('home', {})
            away = matchup.get('away', {})
            
            home_id = home.get('teamId')
            away_id = away.get('teamId')
            
            if not home_id or not away_id:
                continue
            
            # Get rosters
            home_roster = home.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
            away_roster = away.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
            
            # Process rosters
            home_starters, home_bench = process_team_roster(home_roster, week)
            away_starters, away_bench = process_team_roster(away_roster, week)
            
            # Calculate optimal lineups
            home_optimal = calculate_optimal_lineup(home_starters, home_bench)
            away_optimal = calculate_optimal_lineup(away_starters, away_bench)
            
            # Calculate scores
            home_actual = sum(p['points'] for p in home_starters)
            away_actual = sum(p['points'] for p in away_starters)
            home_opt_total = get_optimal_total(home_optimal)
            away_opt_total = get_optimal_total(away_optimal)
            
            # Count zeros in opponent lineups
            home_zeros = sum(1 for p in home_starters if p['points'] == 0)
            away_zeros = sum(1 for p in away_starters if p['points'] == 0)
            
            # Determine winners
            home_won = home_actual > away_actual
            away_won = away_actual > home_actual
            
            # Update team statistics
            update_team_week_stats(
                team_stats, home_id, home_starters, home_bench, 
                home_optimal, home_actual, home_opt_total, week,
                away_id, away_actual, away_zeros, home_won
            )
            
            update_team_week_stats(
                team_stats, away_id, away_starters, away_bench,
                away_optimal, away_actual, away_opt_total, week,
                home_id, home_actual, home_zeros, away_won
            )
            
            # Update win-loss records
            update_win_loss_records(
                team_stats, home_id, away_id,
                home_actual, away_actual, home_opt_total, away_opt_total
            )
    
    # Post-process all team stats
    for team_id in team_stats:
        team_stats[team_id] = calculate_post_season_stats(team_stats[team_id])
    
    # Calculate league-wide stats
    league_stats = calculate_league_stats(team_stats, team_name_map)
    
    return {
        'team_stats': dict(team_stats),
        'league_stats': league_stats,
        'processing_errors': processing_errors
    }
