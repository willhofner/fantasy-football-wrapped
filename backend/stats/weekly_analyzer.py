"""
Weekly Deep Dive Analyzer
Per-week analysis with detailed matchup breakdowns, league standings, and all matchups
"""
from collections import defaultdict
from .lineup_optimizer import calculate_optimal_lineup, get_optimal_total
from .season_analyzer import process_team_roster


def analyze_week(league_id, year, week, team_id, team_name_map, fetch_data_func):
    """
    Analyze a single week in detail for the Weekly Deep Dive experience

    Args:
        league_id: ESPN league ID
        year: Season year
        week: Week number to analyze
        team_id: ID of the team to analyze (for "my matchup" context)
        team_name_map: Dictionary mapping team IDs to names
        fetch_data_func: Function to fetch data (allows dependency injection)

    Returns:
        Dictionary containing:
            - my_matchup: Detailed matchup data for the selected team
            - all_matchups: List of all matchups this week
            - standings: League standings through this week
            - error: Error message if any
    """
    # Fetch data for this week
    data, error = fetch_data_func(league_id, year, week)

    if error or not data:
        return {'error': error or 'No data available'}

    schedule = data.get('schedule', [])
    matchups = [m for m in schedule if m.get('matchupPeriodId') == week]

    if not matchups:
        return {'error': f'No matchups found for week {week}'}

    # Process all matchups
    all_matchups_data = []
    my_matchup_data = None

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

        # Identify lineup errors (bench players who should have started)
        home_errors = find_lineup_errors(home_starters, home_bench, home_optimal)
        away_errors = find_lineup_errors(away_starters, away_bench, away_optimal)

        # Build matchup data structure
        matchup_data = {
            'home': {
                'team_id': home_id,
                'team_name': team_name_map.get(home_id, f'Team {home_id}'),
                'score': round(home_actual, 2),
                'optimal_score': round(home_opt_total, 2),
                'starters': home_starters,
                'bench': home_bench,
                'optimal_lineup': [(pos, p) for pos, p in home_optimal],
                'errors': home_errors,
                'won': home_actual > away_actual
            },
            'away': {
                'team_id': away_id,
                'team_name': team_name_map.get(away_id, f'Team {away_id}'),
                'score': round(away_actual, 2),
                'optimal_score': round(away_opt_total, 2),
                'starters': away_starters,
                'bench': away_bench,
                'optimal_lineup': [(pos, p) for pos, p in away_optimal],
                'errors': away_errors,
                'won': away_actual > home_actual
            }
        }

        all_matchups_data.append(matchup_data)

        # Check if this is the selected team's matchup
        if team_id == home_id or team_id == away_id:
            # Determine which side is "mine" vs "opponent"
            if team_id == home_id:
                my_matchup_data = {
                    'my_team': matchup_data['home'],
                    'opponent': matchup_data['away']
                }
            else:
                my_matchup_data = {
                    'my_team': matchup_data['away'],
                    'opponent': matchup_data['home']
                }

    # Calculate standings through this week
    standings = calculate_standings_through_week(league_id, year, week, team_name_map, fetch_data_func)

    return {
        'week': week,
        'my_matchup': my_matchup_data,
        'all_matchups': all_matchups_data,
        'standings': standings,
        'error': None
    }


def find_lineup_errors(starters, bench, optimal_lineup):
    """
    Find lineup errors: bench players who should have started

    Returns:
        List of dicts with 'bench_player', 'should_replace', 'points_lost'
    """
    optimal_names = set(player[1]['name'] for player in optimal_lineup)
    starter_names = set(p['name'] for p in starters)

    errors = []

    for bench_player in bench:
        if bench_player['name'] in optimal_names:
            # This bench player should have started
            # Find which starter they should have replaced
            replaced_starter = None
            for starter in starters:
                if starter['name'] not in optimal_names:
                    # Check if positions are compatible
                    if positions_compatible(bench_player, starter):
                        if replaced_starter is None or starter['points'] < replaced_starter['points']:
                            replaced_starter = starter

            if replaced_starter:
                errors.append({
                    'bench_player': bench_player['name'],
                    'bench_points': bench_player['points'],
                    'should_replace': replaced_starter['name'],
                    'starter_points': replaced_starter['points'],
                    'points_lost': round(bench_player['points'] - replaced_starter['points'], 2)
                })

    return errors


def positions_compatible(player1, player2):
    """Check if two players can swap positions"""
    pos1 = player1['actual_position']
    pos2 = player2['actual_position']
    slot2 = player2['position']

    # Same position
    if pos1 == pos2:
        return True

    # FLEX can take RB/WR/TE
    if slot2 == 'FLEX' and pos1 in ['RB', 'WR', 'TE']:
        return True

    return False


def calculate_standings_through_week(league_id, year, target_week, team_name_map, fetch_data_func):
    """
    Calculate league standings through a specific week

    Args:
        league_id: ESPN league ID
        year: Season year
        target_week: Week number to calculate standings through
        team_name_map: Dictionary mapping team IDs to names
        fetch_data_func: Function to fetch data

    Returns:
        List of standings dicts sorted by record
    """
    # Initialize records
    records = defaultdict(lambda: {'wins': 0, 'losses': 0, 'ties': 0, 'points_for': 0.0})

    # Process each week up to and including target week
    for week in range(1, target_week + 1):
        data, error = fetch_data_func(league_id, year, week)

        if error or not data:
            continue

        schedule = data.get('schedule', [])
        matchups = [m for m in schedule if m.get('matchupPeriodId') == week]

        for matchup in matchups:
            home = matchup.get('home', {})
            away = matchup.get('away', {})

            home_id = home.get('teamId')
            away_id = away.get('teamId')

            if not home_id or not away_id:
                continue

            # Get rosters and calculate scores
            home_roster = home.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
            away_roster = away.get('rosterForCurrentScoringPeriod', {}).get('entries', [])

            home_starters, _ = process_team_roster(home_roster, week)
            away_starters, _ = process_team_roster(away_roster, week)

            home_score = sum(p['points'] for p in home_starters)
            away_score = sum(p['points'] for p in away_starters)

            # Update records
            records[home_id]['points_for'] += home_score
            records[away_id]['points_for'] += away_score

            if home_score > away_score:
                records[home_id]['wins'] += 1
                records[away_id]['losses'] += 1
            elif away_score > home_score:
                records[away_id]['wins'] += 1
                records[home_id]['losses'] += 1
            else:
                records[home_id]['ties'] += 1
                records[away_id]['ties'] += 1

    # Build standings list
    standings = []
    for team_id, record in records.items():
        standings.append({
            'team_id': team_id,
            'team_name': team_name_map.get(team_id, f'Team {team_id}'),
            'wins': record['wins'],
            'losses': record['losses'],
            'ties': record['ties'],
            'record': f"{record['wins']}-{record['losses']}" + (f"-{record['ties']}" if record['ties'] > 0 else ""),
            'points_for': round(record['points_for'], 2)
        })

    # Sort by wins (desc), then points for (desc)
    standings.sort(key=lambda x: (x['wins'], x['points_for']), reverse=True)

    # Add rank
    for i, team in enumerate(standings):
        team['rank'] = i + 1

    return standings
