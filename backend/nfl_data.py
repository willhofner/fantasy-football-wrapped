"""
ESPN NFL Scoreboard API Integration
Fetches real NFL game scores and results for a given week
"""
import requests
from datetime import datetime, timedelta

NFL_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"


def get_week_dates(year, week):
    """
    Calculate date range for a given NFL week.
    Uses Labor Day (first Monday in September) as anchor — Week 1
    starts the Thursday before Labor Day weekend.

    Returns a Thu-Tue window to capture all game slots:
    Thursday Night, Sunday early/late/night, Monday Night.
    """
    # Find Labor Day: first Monday in September
    sept1 = datetime(year, 9, 1)
    # Days until Monday (0=Mon): (7 - sept1.weekday()) % 7, but if sept1 is Mon that's 0
    days_to_monday = (7 - sept1.weekday()) % 7
    labor_day = sept1 + timedelta(days=days_to_monday)

    # Week 1 starts the Thursday before Labor Day (4 days earlier)
    week1_start = labor_day - timedelta(days=4)

    # Each subsequent week is 7 days later
    week_start = week1_start + timedelta(weeks=week - 1)
    # Thu through Tue = 6 days covers all game windows
    week_end = week_start + timedelta(days=5)

    return week_start, week_end


def fetch_nfl_scores(year, week):
    """
    Fetch NFL scores for a specific week using date-range query.
    ESPN's season/seasontype params are unreliable for historical data,
    so we use the dates param instead.

    Args:
        year: Season year
        week: Week number (1-18)

    Returns:
        tuple: (list of game dicts, error message or None)
    """
    try:
        week_start, week_end = get_week_dates(year, week)
        start_str = week_start.strftime('%Y%m%d')
        end_str = week_end.strftime('%Y%m%d')

        params = {
            'dates': f'{start_str}-{end_str}',
            'limit': 100
        }

        response = requests.get(NFL_SCOREBOARD_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        games = []
        for event in data.get('events', []):
            competition = event.get('competitions', [{}])[0]
            competitors = competition.get('competitors', [])

            if len(competitors) != 2:
                continue

            # Competitors[0] is usually home, competitors[1] is away
            # But check the 'homeAway' field to be sure
            home_team = None
            away_team = None

            for comp in competitors:
                team_info = {
                    'name': comp.get('team', {}).get('displayName', 'Unknown'),
                    'abbreviation': comp.get('team', {}).get('abbreviation', 'UNK'),
                    'score': int(comp.get('score', 0)),
                    'winner': comp.get('winner', False)
                }

                if comp.get('homeAway') == 'home':
                    home_team = team_info
                else:
                    away_team = team_info

            # If homeAway field missing, fall back to index-based assignment
            if not home_team or not away_team:
                home_team = {
                    'name': competitors[0].get('team', {}).get('displayName', 'Unknown'),
                    'abbreviation': competitors[0].get('team', {}).get('abbreviation', 'UNK'),
                    'score': int(competitors[0].get('score', 0)),
                    'winner': competitors[0].get('winner', False)
                }
                away_team = {
                    'name': competitors[1].get('team', {}).get('displayName', 'Unknown'),
                    'abbreviation': competitors[1].get('team', {}).get('abbreviation', 'UNK'),
                    'score': int(competitors[1].get('score', 0)),
                    'winner': competitors[1].get('winner', False)
                }

            game = {
                'home': home_team,
                'away': away_team,
                'status': competition.get('status', {}).get('type', {}).get('description', 'Unknown'),
                'is_final': competition.get('status', {}).get('type', {}).get('completed', False)
            }

            games.append(game)

        return games, None

    except requests.exceptions.Timeout:
        return None, "NFL API request timed out"
    except requests.exceptions.RequestException as e:
        return None, f"Failed to fetch NFL scores: {str(e)}"
    except (KeyError, ValueError) as e:
        return None, f"Failed to parse NFL scores: {str(e)}"


def calculate_score_differential(game):
    """Calculate score differential (absolute value)"""
    return abs(game['home']['score'] - game['away']['score'])


def detect_blowouts(games, threshold=20):
    """
    Detect blowout games (score differential > threshold)

    Args:
        games: List of game dicts from fetch_nfl_scores
        threshold: Point differential to consider a blowout

    Returns:
        list: Games that were blowouts
    """
    blowouts = []
    for game in games:
        if game['is_final'] and calculate_score_differential(game) >= threshold:
            blowouts.append(game)
    return blowouts


def detect_close_games(games, threshold=7):
    """
    Detect close games (score differential <= threshold)

    Args:
        games: List of game dicts from fetch_nfl_scores
        threshold: Point differential to consider a close game

    Returns:
        list: Games that were close
    """
    close_games = []
    for game in games:
        if game['is_final'] and calculate_score_differential(game) <= threshold:
            close_games.append(game)
    return close_games


def get_nfl_week_summary_data(year, week):
    """
    Get all NFL data for a week formatted for summary generation

    Args:
        year: Season year
        week: Week number

    Returns:
        dict: Summary data including games, blowouts, close games
    """
    games, error = fetch_nfl_scores(year, week)

    if error:
        return {'error': error}

    return {
        'week': week,
        'year': year,
        'total_games': len(games),
        'games': games,
        'blowouts': detect_blowouts(games),
        'close_games': detect_close_games(games),
        'completed_games': [g for g in games if g['is_final']]
    }
