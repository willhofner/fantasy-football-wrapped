"""
Fantasy Football Statistics Calculator
"""
from collections import defaultdict, Counter
from espn_api import POSITION_MAP, PLAYER_POSITION_MAP


def process_team_roster(team_roster, week):
    """Process roster and return starters, bench with full player details"""
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
        
        if lineup_slot_id == 20:
            bench.append(player_info)
        elif lineup_slot_id != 21:  # Skip IR
            starters.append(player_info)
    
    return starters, bench


def calculate_optimal_lineup(starters, bench):
    """Calculate optimal lineup"""
    all_players = starters + bench
    
    qbs = sorted([p for p in all_players if p['actual_position'] == 'QB'], 
                 key=lambda x: x['points'], reverse=True)
    rbs = sorted([p for p in all_players if p['actual_position'] == 'RB'], 
                 key=lambda x: x['points'], reverse=True)
    wrs = sorted([p for p in all_players if p['actual_position'] == 'WR'], 
                 key=lambda x: x['points'], reverse=True)
    tes = sorted([p for p in all_players if p['actual_position'] == 'TE'], 
                 key=lambda x: x['points'], reverse=True)
    dsts = sorted([p for p in all_players if p['actual_position'] == 'D/ST'], 
                  key=lambda x: x['points'], reverse=True)
    ks = sorted([p for p in all_players if p['actual_position'] == 'K'], 
                key=lambda x: x['points'], reverse=True)
    
    optimal = []
    used = set()
    
    if qbs:
        optimal.append(('QB', qbs[0]))
        used.add(qbs[0]['name'])
    
    for i in range(min(2, len(rbs))):
        optimal.append(('RB', rbs[i]))
        used.add(rbs[i]['name'])
    
    for i in range(min(2, len(wrs))):
        optimal.append(('WR', wrs[i]))
        used.add(wrs[i]['name'])
    
    if tes:
        optimal.append(('TE', tes[0]))
        used.add(tes[0]['name'])
    
    flex = []
    for rb in rbs:
        if rb['name'] not in used:
            flex.append(rb)
    for wr in wrs:
        if wr['name'] not in used:
            flex.append(wr)
    for te in tes:
        if te['name'] not in used:
            flex.append(te)
    
    flex.sort(key=lambda x: x['points'], reverse=True)
    if flex:
        optimal.append(('FLEX', flex[0]))
        used.add(flex[0]['name'])
    
    if dsts:
        optimal.append(('D/ST', dsts[0]))
        used.add(dsts[0]['name'])
    
    if ks:
        optimal.append(('K', ks[0]))
        used.add(ks[0]['name'])
    
    return optimal


def analyze_season(league_id, year, start_week, end_week, team_name_map, fetch_data_func):
    """
    Analyze full season and return comprehensive statistics
    """
    team_stats = defaultdict(lambda: {
        'errors': 0,
        'points_lost': 0.0,
        'actual_wins': 0,
        'actual_losses': 0,
        'optimal_wins': 0,
        'optimal_losses': 0,
        'optimal_vs_actual_wins': 0,  # NEW: If I played optimal, vs opponent's actual
        'optimal_vs_actual_losses': 0,
        'actual_beats_opp_optimal': 0,
        'optimal_loses_to_opp_actual': 0,
        'benched_stars': [],
        'started_busts': [],
        'perfect_weeks': [],
        'weekly_points': [],
        'weekly_optimal_points': [],
        'weekly_data': [],  # NEW: Detailed weekly data
        'total_points': 0.0,
        'total_optimal_points': 0.0,  # NEW
        'player_season_points': defaultdict(float),  # NEW: Total points per player
        'highest_scorer_week': None,  # NEW: Single highest scoring starter
        'highest_bench_week': None,  # NEW: Single highest scoring bench player
    })
    
    processing_errors = []
    
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
        
        for matchup in matchups:
            home = matchup.get('home', {})
            away = matchup.get('away', {})
            
            home_id = home.get('teamId')
            away_id = away.get('teamId')
            
            if not home_id or not away_id:
                continue
            
            home_roster = home.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
            away_roster = away.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
            
            home_starters, home_bench = process_team_roster(home_roster, week)
            away_starters, away_bench = process_team_roster(away_roster, week)
            
            home_optimal = calculate_optimal_lineup(home_starters, home_bench)
            away_optimal = calculate_optimal_lineup(away_starters, away_bench)
            
            home_actual = sum(p['points'] for p in home_starters)
            away_actual = sum(p['points'] for p in away_starters)
            
            home_opt_total = sum(p[1]['points'] for p in home_optimal)
            away_opt_total = sum(p[1]['points'] for p in away_optimal)
            
            # Track total points
            team_stats[home_id]['total_points'] += home_actual
            team_stats[home_id]['total_optimal_points'] += home_opt_total
            team_stats[away_id]['total_points'] += away_actual
            team_stats[away_id]['total_optimal_points'] += away_opt_total
            
            # Track weekly points
            team_stats[home_id]['weekly_points'].append(home_actual)
            team_stats[home_id]['weekly_optimal_points'].append(home_opt_total)
            team_stats[away_id]['weekly_points'].append(away_actual)
            team_stats[away_id]['weekly_optimal_points'].append(away_opt_total)
            
            # Track player season totals
            for starter in home_starters:
                team_stats[home_id]['player_season_points'][starter['name']] += starter['points']
            for starter in away_starters:
                team_stats[away_id]['player_season_points'][starter['name']] += starter['points']
            
            # Track highest single-week scorer (starter)
            for starter in home_starters:
                current_high = team_stats[home_id]['highest_scorer_week']
                if current_high is None or starter['points'] > current_high['points']:
                    team_stats[home_id]['highest_scorer_week'] = {
                        'name': starter['name'],
                        'points': starter['points'],
                        'week': week,
                        'opponent_id': away_id,
                        'my_score': home_actual,
                        'opp_score': away_actual,
                        'won': home_actual > away_actual
                    }
            
            for starter in away_starters:
                current_high = team_stats[away_id]['highest_scorer_week']
                if current_high is None or starter['points'] > current_high['points']:
                    team_stats[away_id]['highest_scorer_week'] = {
                        'name': starter['name'],
                        'points': starter['points'],
                        'week': week,
                        'opponent_id': home_id,
                        'my_score': away_actual,
                        'opp_score': home_actual,
                        'won': away_actual > home_actual
                    }
            
            # Track highest single-week bench scorer
            for bench_player in home_bench:
                current_high = team_stats[home_id]['highest_bench_week']
                if current_high is None or bench_player['points'] > current_high['points']:
                    # Find the lowest starter that this player could have replaced
                    replaceable_starters = [s for s in home_starters 
                                           if s['actual_position'] == bench_player['actual_position']
                                           or s['position'] == 'FLEX']
                    lowest_starter = min(replaceable_starters, key=lambda x: x['points']) if replaceable_starters else None
                    
                    potential_gain = bench_player['points'] - (lowest_starter['points'] if lowest_starter else 0)
                    would_have_won = (home_actual + potential_gain) > away_actual if lowest_starter else None
                    
                    team_stats[home_id]['highest_bench_week'] = {
                        'name': bench_player['name'],
                        'points': bench_player['points'],
                        'week': week,
                        'opponent_id': away_id,
                        'my_score': home_actual,
                        'opp_score': away_actual,
                        'won_anyway': home_actual > away_actual,
                        'would_have_won': would_have_won,
                        'potential_gain': potential_gain,
                        'replaced_player': lowest_starter['name'] if lowest_starter else None
                    }
            
            for bench_player in away_bench:
                current_high = team_stats[away_id]['highest_bench_week']
                if current_high is None or bench_player['points'] > current_high['points']:
                    replaceable_starters = [s for s in away_starters 
                                           if s['actual_position'] == bench_player['actual_position']
                                           or s['position'] == 'FLEX']
                    lowest_starter = min(replaceable_starters, key=lambda x: x['points']) if replaceable_starters else None
                    
                    potential_gain = bench_player['points'] - (lowest_starter['points'] if lowest_starter else 0)
                    would_have_won = (away_actual + potential_gain) > home_actual if lowest_starter else None
                    
                    team_stats[away_id]['highest_bench_week'] = {
                        'name': bench_player['name'],
                        'points': bench_player['points'],
                        'week': week,
                        'opponent_id': home_id,
                        'my_score': away_actual,
                        'opp_score': home_actual,
                        'won_anyway': away_actual > home_actual,
                        'would_have_won': would_have_won,
                        'potential_gain': potential_gain,
                        'replaced_player': lowest_starter['name'] if lowest_starter else None
                    }
            
            # Determine win/loss
            home_won = home_actual > away_actual
            away_won = away_actual > home_actual
            
            # Count zeros in opponent's lineup
            home_zeros = sum(1 for p in home_starters if p['points'] == 0)
            away_zeros = sum(1 for p in away_starters if p['points'] == 0)
            
            # Check for perfect lineups
            home_optimal_names = set(p[1]['name'] for p in home_optimal)
            away_optimal_names = set(p[1]['name'] for p in away_optimal)
            home_starter_names = set(p['name'] for p in home_starters)
            away_starter_names = set(p['name'] for p in away_starters)
            
            home_is_perfect = home_optimal_names == home_starter_names
            away_is_perfect = away_optimal_names == away_starter_names
            
            if home_is_perfect:
                team_stats[home_id]['perfect_weeks'].append(week)
            if away_is_perfect:
                team_stats[away_id]['perfect_weeks'].append(week)
            
            # Store detailed weekly data
            home_weekly = {
                'week': week,
                'opponent_id': away_id,
                'my_score': round(home_actual, 2),
                'opp_score': round(away_actual, 2),
                'my_optimal': round(home_opt_total, 2),
                'won': home_won,
                'starters': home_starters,
                'bench': home_bench,
                'optimal_lineup': [(pos, p) for pos, p in home_optimal],
                'is_perfect': home_is_perfect,
                'opp_zeros': away_zeros
            }
            team_stats[home_id]['weekly_data'].append(home_weekly)
            
            away_weekly = {
                'week': week,
                'opponent_id': home_id,
                'my_score': round(away_actual, 2),
                'opp_score': round(home_actual, 2),
                'my_optimal': round(away_opt_total, 2),
                'won': away_won,
                'starters': away_starters,
                'bench': away_bench,
                'optimal_lineup': [(pos, p) for pos, p in away_optimal],
                'is_perfect': away_is_perfect,
                'opp_zeros': home_zeros
            }
            team_stats[away_id]['weekly_data'].append(away_weekly)
            
            # Count errors
            home_errors = len(home_optimal_names - home_starter_names)
            away_errors = len(away_optimal_names - away_starter_names)
            
            home_points_lost = home_opt_total - home_actual
            away_points_lost = away_opt_total - away_actual
            
            team_stats[home_id]['errors'] += home_errors
            team_stats[home_id]['points_lost'] += home_points_lost
            team_stats[away_id]['errors'] += away_errors
            team_stats[away_id]['points_lost'] += away_points_lost
            
            # Track benched/started players
            for opt_pos, opt_player in home_optimal:
                if opt_player['name'] not in home_starter_names:
                    team_stats[home_id]['benched_stars'].append({
                        'name': opt_player['name'],
                        'points': opt_player['points'],
                        'week': week
                    })
            
            for starter in home_starters:
                if starter['name'] not in home_optimal_names:
                    team_stats[home_id]['started_busts'].append({
                        'name': starter['name'],
                        'points': starter['points'],
                        'week': week
                    })
            
            for opt_pos, opt_player in away_optimal:
                if opt_player['name'] not in away_starter_names:
                    team_stats[away_id]['benched_stars'].append({
                        'name': opt_player['name'],
                        'points': opt_player['points'],
                        'week': week
                    })
            
            for starter in away_starters:
                if starter['name'] not in away_optimal_names:
                    team_stats[away_id]['started_busts'].append({
                        'name': starter['name'],
                        'points': starter['points'],
                        'week': week
                    })
            
            # Win-loss records (actual)
            if home_actual > away_actual:
                team_stats[home_id]['actual_wins'] += 1
                team_stats[away_id]['actual_losses'] += 1
            elif away_actual > home_actual:
                team_stats[away_id]['actual_wins'] += 1
                team_stats[home_id]['actual_losses'] += 1
            
            # Win-loss records (both optimal)
            if home_opt_total > away_opt_total:
                team_stats[home_id]['optimal_wins'] += 1
                team_stats[away_id]['optimal_losses'] += 1
            elif away_opt_total > home_opt_total:
                team_stats[away_id]['optimal_wins'] += 1
                team_stats[home_id]['optimal_losses'] += 1
            
            # NEW: Win-loss if I played optimal vs opponent's actual
            if home_opt_total > away_actual:
                team_stats[home_id]['optimal_vs_actual_wins'] += 1
            elif home_opt_total < away_actual:
                team_stats[home_id]['optimal_vs_actual_losses'] += 1
            
            if away_opt_total > home_actual:
                team_stats[away_id]['optimal_vs_actual_wins'] += 1
            elif away_opt_total < home_actual:
                team_stats[away_id]['optimal_vs_actual_losses'] += 1
            
            # Cross comparisons
            if home_actual > away_opt_total:
                team_stats[home_id]['actual_beats_opp_optimal'] += 1
            if home_opt_total < away_actual:
                team_stats[home_id]['optimal_loses_to_opp_actual'] += 1
            if away_actual > home_opt_total:
                team_stats[away_id]['actual_beats_opp_optimal'] += 1
            if away_opt_total < home_actual:
                team_stats[away_id]['optimal_loses_to_opp_actual'] += 1
    
    # Post-process: Calculate additional stats
    for team_id in team_stats:
        stats = team_stats[team_id]
        
        # Convert defaultdict to regular dict for JSON serialization
        stats['player_season_points'] = dict(stats['player_season_points'])
        
        # Find top 3 scorers
        sorted_players = sorted(stats['player_season_points'].items(), key=lambda x: x[1], reverse=True)
        stats['top_scorers'] = [{'name': name, 'points': round(pts, 2)} for name, pts in sorted_players[:3]]
        
        # Find lucky break (lowest score in a win)
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
        
        # Find tough luck (highest score in a loss)
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
        
        # Find highest and lowest scoring weeks
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
        
        # Most slept on player
        if stats['benched_stars']:
            benched_counter = Counter(p['name'] for p in stats['benched_stars'])
            most_benched = benched_counter.most_common(1)[0]
            total_pts = sum(p['points'] for p in stats['benched_stars'] if p['name'] == most_benched[0])
            weeks = [p['week'] for p in stats['benched_stars'] if p['name'] == most_benched[0]]
            stats['most_slept_on'] = {
                'name': most_benched[0],
                'times_benched': most_benched[1],
                'points_missed': round(total_pts, 2),
                'weeks': weeks
            }
        
        # Most overrated player
        if stats['started_busts']:
            bust_counter = Counter(p['name'] for p in stats['started_busts'])
            most_overrated = bust_counter.most_common(1)[0]
            total_pts = sum(p['points'] for p in stats['started_busts'] if p['name'] == most_overrated[0])
            weeks = [p['week'] for p in stats['started_busts'] if p['name'] == most_overrated[0]]
            stats['most_overrated'] = {
                'name': most_overrated[0],
                'times_started': most_overrated[1],
                'points_from_starts': round(total_pts, 2),
                'weeks': weeks
            }
        
        # Convert optimal_lineup tuples to serializable format
        for week_data in stats['weekly_data']:
            week_data['optimal_lineup'] = [
                {'position': pos, 'player': player} 
                for pos, player in week_data['optimal_lineup']
            ]
    
    league_stats = calculate_league_stats(team_stats, team_name_map)
    
    return {
        'team_stats': dict(team_stats),
        'league_stats': league_stats,
        'processing_errors': processing_errors
    }


def calculate_league_stats(team_stats, team_name_map):
    """Calculate league-wide statistics"""
    if not team_stats:
        return {}
    
    total_errors = sum(stats['errors'] for stats in team_stats.values())
    total_points_lost = sum(stats['points_lost'] for stats in team_stats.values())
    total_perfect_weeks = sum(len(stats['perfect_weeks']) for stats in team_stats.values())
    
    team_count = len(team_stats)
    
    best_manager_id = min(team_stats.keys(), key=lambda x: team_stats[x]['errors'])
    best_manager_errors = team_stats[best_manager_id]['errors']
    
    worst_manager_id = max(team_stats.keys(), key=lambda x: team_stats[x]['errors'])
    worst_manager_errors = team_stats[worst_manager_id]['errors']
    
    most_perfect_id = max(team_stats.keys(), key=lambda x: len(team_stats[x]['perfect_weeks']))
    most_perfect_count = len(team_stats[most_perfect_id]['perfect_weeks'])
    
    biggest_underperformer_id = max(
        team_stats.keys(), 
        key=lambda x: (team_stats[x]['optimal_vs_actual_wins'] - team_stats[x]['actual_wins'])
    )
    underperformer_diff = (
        team_stats[biggest_underperformer_id]['optimal_vs_actual_wins'] - 
        team_stats[biggest_underperformer_id]['actual_wins']
    )
    
    luckiest_id = max(
        team_stats.keys(),
        key=lambda x: (team_stats[x]['actual_wins'] - team_stats[x]['optimal_vs_actual_wins'])
    )
    luckiest_diff = (
        team_stats[luckiest_id]['actual_wins'] - 
        team_stats[luckiest_id]['optimal_vs_actual_wins']
    )
    
    # Calculate standings by actual wins
    standings = sorted(
        team_stats.keys(),
        key=lambda x: (team_stats[x]['actual_wins'], team_stats[x]['total_points']),
        reverse=True
    )
    
    # Create standings map
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
            'name': team_name_map.get(best_manager_id, f"Team {best_manager_id}"),
            'errors': best_manager_errors
        },
        'worst_manager': {
            'team_id': worst_manager_id,
            'name': team_name_map.get(worst_manager_id, f"Team {worst_manager_id}"),
            'errors': worst_manager_errors
        },
        'most_perfect_weeks': {
            'team_id': most_perfect_id,
            'name': team_name_map.get(most_perfect_id, f"Team {most_perfect_id}"),
            'count': most_perfect_count
        },
        'biggest_underperformer': {
            'team_id': biggest_underperformer_id,
            'name': team_name_map.get(biggest_underperformer_id, f"Team {biggest_underperformer_id}"),
            'win_difference': underperformer_diff
        },
        'luckiest_team': {
            'team_id': luckiest_id,
            'name': team_name_map.get(luckiest_id, f"Team {luckiest_id}"),
            'win_difference': luckiest_diff
        }
    }


def format_team_wrapped(team_id, team_stats, team_name_map, league_stats):
    """Format a team's data for the Wrapped presentation"""
    stats = team_stats[team_id]
    team_name = team_name_map.get(team_id, f"Team {team_id}")
    
    all_errors = [s['errors'] for s in team_stats.values()]
    all_errors_sorted = sorted(all_errors)
    error_rank = all_errors_sorted.index(stats['errors']) + 1
    error_percentile = round((error_rank / len(all_errors)) * 100)
    
    # Get standing
    standing = league_stats['standings'].get(team_id, len(team_stats))
    
    # Calculate average points per week
    avg_points = round(stats['total_points'] / len(stats['weekly_data']), 2) if stats['weekly_data'] else 0
    
    return {
        'team_id': team_id,
        'team_name': team_name,
        'team_names': team_name_map,  # Include all team names for opponent lookups
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
                'losses': stats['actual_losses']
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
        }
    }