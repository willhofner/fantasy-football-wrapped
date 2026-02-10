"""
ESPN Fantasy Football API Interface
"""
import requests

POSITION_MAP = {
    0: "QB", 2: "RB", 4: "WR", 6: "TE", 
    16: "D/ST", 17: "K", 23: "FLEX", 20: "BENCH", 21: "IR"
}

PLAYER_POSITION_MAP = {
    1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST"
}


def get_team_name_map(league_id, year):
    """
    Automatically build team name map using owner first/last names.
    Returns dict: {team_id: "Firstname Lastname"}
    """
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
    params = {'view': ['mTeam']}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching team names: {e}")
        return None, str(e)
    
    # Build member lookup by ID
    member_lookup = {}
    for member in data.get('members', []):
        member_id = member.get('id')
        if member_id:
            first_name = member.get('firstName', '').capitalize()
            last_name = member.get('lastName', '').capitalize()
            full_name = f"{first_name} {last_name}".strip()
            member_lookup[member_id] = full_name
    
    # Map teams to owner names
    team_map = {}
    for team in data.get('teams', []):
        team_id = team.get('id')
        owner_name = None
        for owner_id in team.get('owners', []):
            if owner_id in member_lookup:
                owner_name = member_lookup[owner_id]
                break
        team_map[team_id] = owner_name or f"Team {team_id}"
    
    return team_map, None


def fetch_league_data(league_id, year, week, include_transactions=False):
    """
    Fetch league data from ESPN API for a specific week

    Args:
        league_id: ESPN league ID
        year: Season year
        week: Week number
        include_transactions: If True, include mPendingTransactions view

    Returns:
        tuple: (data dict, error string or None)
    """
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"

    views = ['mMatchup', 'mRoster', 'mTeam']
    if include_transactions:
        views.append('mPendingTransactions')

    params = {
        'view': views,
        'scoringPeriodId': week
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json(), None
    except requests.exceptions.RequestException as e:
        return None, str(e)


def get_league_info(league_id, year):
    """Get basic league information"""
    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
    params = {'view': ['mTeam', 'mSettings']}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        settings = data.get('settings', {})
        teams = data.get('teams', [])
        
        return {
            'league_name': settings.get('name', 'Unknown League'),
            'team_count': len(teams),
            'current_week': data.get('scoringPeriodId', 1),
            'final_week': settings.get('scheduleSettings', {}).get('matchupPeriodCount', 14)
        }, None
    except requests.exceptions.RequestException as e:
        return None, str(e)