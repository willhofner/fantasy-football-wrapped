"""
Draft Analyzer
Fetches draft data from ESPN and grades picks as GEM, BUST, or neutral.
"""
import requests
from espn_api import PLAYER_POSITION_MAP, POSITION_MAP


def fetch_draft_data(league_id, year):
    """
    Fetch draft picks from ESPN Fantasy API using mDraftDetail view.

    Returns:
        tuple: (picks list, error string or None)
    """
    url = (
        f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/"
        f"seasons/{year}/segments/0/leagues/{league_id}"
    )
    params = {'view': ['mDraftDetail', 'mTeam']}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        return None, str(e)

    draft_detail = data.get('draftDetail', {})
    picks = draft_detail.get('picks', [])

    if not picks:
        return None, 'No draft data found for this league/year'

    # Build team name map from same response
    member_lookup = {}
    for member in data.get('members', []):
        mid = member.get('id')
        if mid:
            first = member.get('firstName', '').capitalize()
            last = member.get('lastName', '').capitalize()
            member_lookup[mid] = f"{first} {last}".strip()

    team_map = {}
    for team in data.get('teams', []):
        tid = team.get('id')
        owner_name = None
        for oid in team.get('owners', []):
            if oid in member_lookup:
                owner_name = member_lookup[oid]
                break
        team_map[tid] = owner_name or f"Team {tid}"

    return {'picks': picks, 'team_map': team_map}, None


def fetch_season_player_data(league_id, year, start_week=1, end_week=14):
    """
    Fetch per-week roster data to compute:
    - Total/avg fantasy points per player
    - Start % (weeks on a starting roster across ALL teams)
    - Whether the original drafter dropped them
    - Final week roster ownership

    Returns:
        dict: {
            player_id: {
                'name': str,
                'position': str,
                'total_points': float,
                'weeks_played': int,
                'weeks_started': int,
                'total_weeks': int,
                'rostered_by': {team_id: set of weeks},
                'started_by': {team_id: set of weeks},
                'final_team_id': int or None,
            }
        }
    """
    url = (
        f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/"
        f"seasons/{year}/segments/0/leagues/{league_id}"
    )

    players = {}
    total_weeks = end_week - start_week + 1

    for week in range(start_week, end_week + 1):
        params = {
            'view': ['mMatchup', 'mRoster'],
            'scoringPeriodId': week
        }

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException:
            continue

        schedule = data.get('schedule', [])
        matchups = [m for m in schedule if m.get('matchupPeriodId') == week]

        for matchup in matchups:
            for side in ('home', 'away'):
                team_data = matchup.get(side, {})
                team_id = team_data.get('teamId')
                if not team_id:
                    continue

                roster = (
                    team_data
                    .get('rosterForCurrentScoringPeriod', {})
                    .get('entries', [])
                )

                for entry in roster:
                    pool_entry = entry.get('playerPoolEntry', {})
                    player = pool_entry.get('player', {})
                    player_id = player.get('id')
                    if not player_id:
                        continue

                    player_name = player.get('fullName', 'Unknown')
                    pos_id = player.get('defaultPositionId', 0)
                    position = PLAYER_POSITION_MAP.get(pos_id, 'Unknown')
                    lineup_slot = entry.get('lineupSlotId')

                    # Get points
                    points = pool_entry.get('appliedStatTotal', 0)
                    if points == 0:
                        for stat in player.get('stats', []):
                            if stat.get('scoringPeriodId') == week:
                                points = stat.get('appliedTotal', 0)
                                if points > 0:
                                    break

                    if player_id not in players:
                        players[player_id] = {
                            'name': player_name,
                            'position': position,
                            'total_points': 0.0,
                            'weeks_played': 0,
                            'weeks_started': 0,
                            'total_weeks': total_weeks,
                            'rostered_by': {},
                            'started_by': {},
                            'final_team_id': None,
                        }

                    p = players[player_id]
                    p['total_points'] += points

                    # Track roster ownership
                    if team_id not in p['rostered_by']:
                        p['rostered_by'][team_id] = set()
                    p['rostered_by'][team_id].add(week)

                    # Is this player starting? (not bench=20, not IR=21)
                    is_starting = lineup_slot not in (20, 21)
                    if is_starting:
                        p['weeks_started'] += 1
                        if team_id not in p['started_by']:
                            p['started_by'][team_id] = set()
                        p['started_by'][team_id].add(week)

                    p['weeks_played'] += 1

                    # Track final week ownership
                    if week == end_week:
                        p['final_team_id'] = team_id

    return players


def analyze_draft(league_id, year, start_week=1, end_week=14):
    """
    Full draft analysis: fetch draft picks, season data, compute grades.

    Returns:
        tuple: (result dict, error string or None)
    """
    # Fetch draft data
    draft_result, error = fetch_draft_data(league_id, year)
    if error:
        return None, error

    picks = draft_result['picks']
    team_map = draft_result['team_map']

    # Fetch season player data
    player_data = fetch_season_player_data(league_id, year, start_week, end_week)

    total_weeks = end_week - start_week + 1

    # Build pick list with season stats
    draft_picks = []
    for pick in picks:
        player_id = pick.get('playerId')
        round_num = pick.get('roundId', 0)
        round_pick = pick.get('roundPickNumber', 0)
        overall_pick = pick.get('overallPickNumber', 0)
        drafter_team_id = pick.get('teamId')

        # Get season data for this player
        pdata = player_data.get(player_id, {})
        player_name = pdata.get('name', f'Player {player_id}')
        position = pdata.get('position', 'Unknown')
        total_points = round(pdata.get('total_points', 0), 2)
        weeks_started = pdata.get('weeks_started', 0)
        start_pct = round((weeks_started / total_weeks) * 100, 1) if total_weeks > 0 else 0
        avg_points = round(total_points / total_weeks, 2) if total_weeks > 0 else 0

        # Was player dropped by the drafter?
        rostered_by = pdata.get('rostered_by', {})
        drafter_weeks = rostered_by.get(drafter_team_id, set())
        # Dropped = drafter had them at some point but not in the final week
        was_dropped = len(drafter_weeks) > 0 and end_week not in drafter_weeks
        # Edge case: drafter never had them on roster in data (pick before season)
        if len(drafter_weeks) == 0:
            was_dropped = True  # never appeared on drafter roster = likely dropped early

        final_team_id = pdata.get('final_team_id')
        final_team_name = team_map.get(final_team_id, 'FA') if final_team_id else 'FA'

        draft_picks.append({
            'player_id': player_id,
            'player_name': player_name,
            'position': position,
            'round': round_num,
            'pick': round_pick,
            'overall_pick': overall_pick,
            'team_id': drafter_team_id,
            'team_name': team_map.get(drafter_team_id, f'Team {drafter_team_id}'),
            'total_points': total_points,
            'avg_points': avg_points,
            'start_pct': start_pct,
            'was_dropped': was_dropped,
            'final_team_id': final_team_id,
            'final_team_name': final_team_name,
            'grade': None,  # filled in below
        })

    # Grade picks
    grade_picks(draft_picks)

    return {
        'picks': draft_picks,
        'team_map': team_map,
        'total_weeks': total_weeks,
    }, None


def grade_picks(picks):
    """
    Grade only the extremes:
    - GEM: Late round (8+) with high avg points (top 30%) or high start % (70%+)
    - BUST: Early round (1-4) that was dropped OR low start % (<30%) OR low avg points (bottom 30%)
    Mutates picks in place.
    """
    if not picks:
        return

    # Calculate thresholds based on all drafted players with non-zero points
    scored_picks = [p for p in picks if p['total_points'] > 0]
    if not scored_picks:
        return

    avg_points_list = sorted([p['avg_points'] for p in scored_picks])
    n = len(avg_points_list)

    top_30_threshold = avg_points_list[int(n * 0.7)] if n > 0 else 0
    bottom_30_threshold = avg_points_list[int(n * 0.3)] if n > 0 else 0

    for pick in picks:
        round_num = pick['round']
        avg_pts = pick['avg_points']
        start_pct = pick['start_pct']
        dropped = pick['was_dropped']

        # GEM: Late round, high performer
        if round_num >= 8:
            if avg_pts >= top_30_threshold or start_pct >= 70:
                pick['grade'] = 'GEM'
                continue

        # BUST: Early round, poor performer
        if round_num <= 4:
            if dropped or start_pct < 30 or avg_pts <= bottom_30_threshold:
                pick['grade'] = 'BUST'
                continue
