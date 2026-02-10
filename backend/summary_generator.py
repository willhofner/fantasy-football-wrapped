"""
LLM Summary Generator using Claude API
Generates NFL and Fantasy League weekly summaries
"""
import os
import json
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
client = None

if ANTHROPIC_API_KEY:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)

# Cache directory
CACHE_DIR = Path(__file__).parent / 'cache' / 'summaries'
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def get_cache_path(cache_type, league_id, year, week):
    """
    Get file path for cached summary

    Args:
        cache_type: 'nfl' or 'fantasy'
        league_id: League ID (or 'nfl' for NFL summaries)
        year: Season year
        week: Week number

    Returns:
        Path object
    """
    if cache_type == 'nfl':
        # NFL summaries are shared across all users
        cache_file = CACHE_DIR / f"nfl_{year}_week_{week}.json"
    else:
        # Fantasy summaries are per-league
        league_dir = CACHE_DIR / str(league_id) / str(year)
        league_dir.mkdir(parents=True, exist_ok=True)
        cache_file = league_dir / f"fantasy_week_{week}.json"

    return cache_file


def load_cached_summary(cache_type, league_id, year, week):
    """Load summary from cache if it exists"""
    cache_path = get_cache_path(cache_type, league_id, year, week)

    if cache_path.exists():
        try:
            with open(cache_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

    return None


def save_summary_to_cache(cache_type, league_id, year, week, summary_text):
    """Save generated summary to cache"""
    cache_path = get_cache_path(cache_type, league_id, year, week)

    cache_data = {
        'summary': summary_text,
        'week': week,
        'year': year,
        'cache_type': cache_type
    }

    try:
        with open(cache_path, 'w') as f:
            json.dump(cache_data, f, indent=2)
    except IOError as e:
        print(f"Warning: Failed to cache summary: {e}")


def generate_nfl_summary(nfl_data, force_regenerate=False):
    """
    Generate NFL weekly summary using Claude API

    Args:
        nfl_data: Dict with NFL scores and game data
        force_regenerate: If True, bypass cache and regenerate

    Returns:
        str: Generated summary or fallback text if API unavailable
    """
    year = nfl_data.get('year')
    week = nfl_data.get('week')

    # Check cache first
    if not force_regenerate:
        cached = load_cached_summary('nfl', 'nfl', year, week)
        if cached:
            return cached['summary']

    # If no API key, return placeholder
    if not client:
        return generate_nfl_fallback(nfl_data)

    # Build prompt
    prompt = build_nfl_prompt(nfl_data)

    try:
        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        summary = response.content[0].text

        # Cache the result
        save_summary_to_cache('nfl', 'nfl', year, week, summary)

        return summary

    except Exception as e:
        print(f"Error generating NFL summary: {e}")
        return generate_nfl_fallback(nfl_data)


def build_nfl_prompt(nfl_data):
    """Build prompt for NFL summary generation"""
    games = nfl_data.get('games', [])
    blowouts = nfl_data.get('blowouts', [])
    close_games = nfl_data.get('close_games', [])
    week = nfl_data.get('week')
    year = nfl_data.get('year')

    # Format game results
    game_results = []
    for game in games:
        home = game['home']
        away = game['away']
        result = f"{away['abbreviation']} {away['score']} @ {home['abbreviation']} {home['score']}"
        game_results.append(result)

    prompt = f"""You are a fun, opinionated NFL analyst writing a weekly recap for fantasy football players.

Write a 2-3 paragraph summary of Week {week} of the {year} NFL season.

Here's what happened:

GAME RESULTS:
{chr(10).join(game_results)}

BLOWOUTS (20+ point margin):
{chr(10).join([f"{g['away']['abbreviation']} {g['away']['score']} @ {g['home']['abbreviation']} {g['home']['score']}" for g in blowouts]) if blowouts else 'None'}

CLOSE GAMES (7 points or less):
{chr(10).join([f"{g['away']['abbreviation']} {g['away']['score']} @ {g['home']['abbreviation']} {g['home']['score']}" for g in close_games]) if close_games else 'None'}

Your summary should:
- Be conversational and entertaining (like talking to a friend who watches every game)
- Highlight standout performances and big upsets
- Mention blowouts and nail-biters
- Note any notable streaks or patterns you can infer from scores
- Keep it brief but engaging (2-3 short paragraphs max)
- Write in past tense (the week already happened)

Do NOT:
- Make up specific player names or stats you don't have
- Invent injuries or events not shown in the scores
- Be overly formal or robotic

Write the summary now:"""

    return prompt


def generate_nfl_fallback(nfl_data):
    """Generate fallback summary when LLM unavailable"""
    week = nfl_data.get('week')
    year = nfl_data.get('year')
    total_games = nfl_data.get('total_games', 0)
    blowouts = nfl_data.get('blowouts', [])
    close_games = nfl_data.get('close_games', [])

    summary = f"Week {week} of the {year} NFL season featured {total_games} games. "

    if blowouts:
        summary += f"{len(blowouts)} blowouts (20+ point margins). "

    if close_games:
        summary += f"{len(close_games)} nail-biters decided by 7 points or less. "

    summary += "\n\n(AI-generated summaries coming soon — check back later for the full recap!)"

    return summary


def generate_fantasy_league_summary(league_data, force_regenerate=False):
    """
    Generate fantasy league weekly summary using Claude API

    Args:
        league_data: Dict with all fantasy matchups, standings, errors
        force_regenerate: If True, bypass cache and regenerate

    Returns:
        str: Generated summary or fallback text if API unavailable
    """
    league_id = league_data.get('league_id')
    year = league_data.get('year')
    week = league_data.get('week')

    # Check cache first
    if not force_regenerate:
        cached = load_cached_summary('fantasy', league_id, year, week)
        if cached:
            return cached['summary']

    # If no API key, return placeholder
    if not client:
        return generate_fantasy_fallback(league_data)

    # Build prompt
    prompt = build_fantasy_prompt(league_data)

    try:
        # Call Claude API
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1536,
            temperature=0.8,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        summary = response.content[0].text

        # Cache the result
        save_summary_to_cache('fantasy', league_id, year, week, summary)

        return summary

    except Exception as e:
        print(f"Error generating fantasy summary: {e}")
        return generate_fantasy_fallback(league_data)


def build_fantasy_prompt(league_data):
    """Build prompt for fantasy league summary generation"""
    week = league_data.get('week')
    year = league_data.get('year')
    matchups = league_data.get('matchups', [])
    standings = league_data.get('standings', [])
    league_name = league_data.get('league_name', 'the league')

    # Format matchup results
    matchup_results = []
    for matchup in matchups:
        home = matchup['home']
        away = matchup['away']
        winner = home if home['won'] else away
        loser = away if home['won'] else home

        result = f"{winner['team_name']} {winner['score']:.1f} def. {loser['team_name']} {loser['score']:.1f}"

        # Add context
        margin = abs(home['score'] - away['score'])
        if margin < 5:
            result += " (NAIL-BITER)"
        elif margin > 40:
            result += " (BLOWOUT)"

        # Lineup errors
        if home.get('errors') and len(home['errors']) > 0:
            points_lost = sum(err['points_lost'] for err in home['errors'])
            result += f" [{home['team_name']} left {points_lost:.1f} pts on bench]"

        if away.get('errors') and len(away['errors']) > 0:
            points_lost = sum(err['points_lost'] for err in away['errors'])
            result += f" [{away['team_name']} left {points_lost:.1f} pts on bench]"

        matchup_results.append(result)

    # Format standings
    standings_text = []
    for team in standings[:5]:  # Top 5
        standings_text.append(f"{team['rank']}. {team['team_name']} ({team['record']}, {team['points_for']} PF)")

    prompt = f"""You are the beat reporter for "{league_name}" fantasy football league. You watch every game, know every roster decision, and aren't afraid to call people out.

Write a 2-3 paragraph summary of Week {week} for this league.

MATCHUP RESULTS:
{chr(10).join(matchup_results)}

STANDINGS (after this week):
{chr(10).join(standings_text)}

Your summary should:
- Be conversational, witty, and opinionated (like writing for the group chat)
- Call out blowouts, nail-biters, and upset wins
- Highlight managers who left points on the bench (they deserve it)
- Mention players who went off or managers who got carried
- Note standings implications (who's climbing, who's falling, playoff picture)
- Be specific with team names and scores
- Keep it brief but entertaining (2-3 paragraphs max)

Do NOT:
- Make up player names not shown in the data
- Be mean-spirited (roast with love)
- Write generically — use actual team names and scores

Write the summary now:"""

    return prompt


def generate_fantasy_fallback(league_data):
    """Generate fallback summary when LLM unavailable"""
    week = league_data.get('week')
    matchups = league_data.get('matchups', [])
    league_name = league_data.get('league_name', 'the league')

    summary = f"Week {week} in {league_name} featured {len(matchups)} matchups. "

    blowouts = [m for m in matchups if abs(m['home']['score'] - m['away']['score']) > 40]
    close_games = [m for m in matchups if abs(m['home']['score'] - m['away']['score']) < 5]

    if blowouts:
        summary += f"{len(blowouts)} blowout{'s' if len(blowouts) > 1 else ''}. "

    if close_games:
        summary += f"{len(close_games)} nail-biter{'s' if len(close_games) > 1 else ''}. "

    summary += "\n\n(AI-generated league summaries coming soon — the roasts will be epic!)"

    return summary
