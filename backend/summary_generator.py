"""
LLM Summary Generator using Claude API
Generates NFL and Fantasy League weekly summaries
"""
import os
import json
from pathlib import Path
from anthropic import Anthropic, APIStatusError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
client = None

if ANTHROPIC_API_KEY:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    print(f"[Summaries] Claude API client initialized (key: ...{ANTHROPIC_API_KEY[-8:]})")
else:
    print("[Summaries] No ANTHROPIC_API_KEY found — using fallback summaries")


def _classify_api_error(e):
    """Classify API errors into actionable categories. Returns (reason, log_msg)."""
    if isinstance(e, APIStatusError):
        msg = str(e)
        if 'credit balance' in msg.lower() or 'billing' in msg.lower():
            return 'billing', f"[Summaries] OUT OF CREDITS — add funds at console.anthropic.com/settings/billing"
        if e.status_code == 401:
            return 'auth', f"[Summaries] INVALID API KEY — check ANTHROPIC_API_KEY in .env"
        if e.status_code == 429:
            return 'rate_limit', f"[Summaries] RATE LIMITED — too many requests, will retry on next load"
        if e.status_code >= 500:
            return 'server', f"[Summaries] Anthropic API down (HTTP {e.status_code}) — try again later"
        return 'api_error', f"[Summaries] API error (HTTP {e.status_code}): {msg[:200]}"
    if 'timeout' in str(e).lower():
        return 'timeout', f"[Summaries] API request timed out"
    return 'unknown', f"[Summaries] Unexpected error: {e}"

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
        return generate_nfl_fallback(nfl_data, reason='no_key')

    # Build prompt
    prompt = build_nfl_prompt(nfl_data)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=400,
            temperature=0.9,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        summary = response.content[0].text
        save_summary_to_cache('nfl', 'nfl', year, week, summary)
        print(f"[Summaries] NFL Week {week} summary generated ({len(summary)} chars)")
        return summary

    except Exception as e:
        reason, log_msg = _classify_api_error(e)
        print(log_msg)
        return generate_nfl_fallback(nfl_data, reason=reason)


_NFL_PERSONAS = [
    "You're a laid-back color commentator who keeps it casual and breezy.",
    "You're a dramatic play-by-play broadcaster who loves the spectacle.",
    "You're a snarky podcaster who lives for hot takes.",
    "You're a chill buddy recapping games over beers.",
    "You're an old-school football purist who appreciates good defense.",
    "You're a hype man who gets excited about every big play.",
    "You're a deadpan analyst who delivers zingers with a straight face.",
    "You're a fantasy football addict who relates everything back to rosters.",
    "You're a local beat reporter who knows every team's storylines.",
    "You're a comedic writer who finds the humor in every game.",
    "You're a grizzled ex-coach breaking down the tape.",
    "You're a stats nerd who can't help dropping one key number.",
    "You're a trash-talking friend who picks favorites and isn't subtle.",
    "You're a storyteller who weaves the week into a single narrative.",
]


def build_nfl_prompt(nfl_data):
    """Build prompt for NFL summary generation"""
    games = nfl_data.get('games', [])
    blowouts = nfl_data.get('blowouts', [])
    close_games = nfl_data.get('close_games', [])
    week = nfl_data.get('week')
    year = nfl_data.get('year')

    # Rotate persona by week for variety
    persona = _NFL_PERSONAS[(week - 1) % len(_NFL_PERSONAS)]

    # Format game results
    game_results = []
    for game in games:
        home = game['home']
        away = game['away']
        result = f"{away['abbreviation']} {away['score']} @ {home['abbreviation']} {home['score']}"
        game_results.append(result)

    prompt = f"""{persona}

Write a SHORT recap of Week {week}, {year} NFL season. One tight paragraph only — 3-5 sentences max.

SCORES:
{chr(10).join(game_results)}

BLOWOUTS (20+): {', '.join([f"{g['away']['abbreviation']}@{g['home']['abbreviation']}" for g in blowouts]) if blowouts else 'None'}
CLOSE (≤7): {', '.join([f"{g['away']['abbreviation']}@{g['home']['abbreviation']}" for g in close_games]) if close_games else 'None'}

Rules:
- ONE paragraph, 3-5 sentences. Be punchy.
- Focus on narrative and vibe, not a stats dump. Mention 1-2 specific scores MAX.
- Vary your language — never start with "Week X was..." or "What a week..."
- Write in past tense. Don't invent player names or stats not in the data.
- Match the persona above — let your voice come through.

Write it:"""

    return prompt


_FALLBACK_MESSAGES = {
    'no_key': "AI summaries not configured — set ANTHROPIC_API_KEY in .env to enable.",
    'billing': "AI summaries paused — API credits exhausted. Add funds at console.anthropic.com.",
    'auth': "AI summaries unavailable — invalid API key. Check ANTHROPIC_API_KEY in .env.",
    'rate_limit': "AI summaries temporarily unavailable — rate limited. Try again in a minute.",
    'server': "AI summaries temporarily unavailable — Anthropic API is down. Try again later.",
    'timeout': "AI summaries temporarily unavailable — request timed out. Try again.",
}


def generate_nfl_fallback(nfl_data, reason='unknown'):
    """Generate fallback summary when LLM unavailable"""
    week = nfl_data.get('week')
    year = nfl_data.get('year')
    total_games = nfl_data.get('total_games', 0)
    blowouts = nfl_data.get('blowouts', [])
    close_games = nfl_data.get('close_games', [])

    summary = f"Week {week} of the {year} NFL season featured {total_games} games."

    if blowouts:
        summary += f" {len(blowouts)} blowouts (20+ point margins)."

    if close_games:
        summary += f" {len(close_games)} nail-biters decided by 7 points or less."

    note = _FALLBACK_MESSAGES.get(reason, "AI-generated summaries coming soon — check back later for the full recap!")
    summary += f"\n\n({note})"

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
        return generate_fantasy_fallback(league_data, reason='no_key')

    # Build prompt
    prompt = build_fantasy_prompt(league_data)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            temperature=0.9,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        summary = response.content[0].text
        save_summary_to_cache('fantasy', league_id, year, week, summary)
        print(f"[Summaries] Fantasy Week {week} summary generated ({len(summary)} chars)")
        return summary

    except Exception as e:
        reason, log_msg = _classify_api_error(e)
        print(log_msg)
        return generate_fantasy_fallback(league_data, reason=reason)


_FANTASY_PERSONAS = [
    "You're the league's trash-talking group chat instigator.",
    "You're a straight-faced analyst who lets the numbers do the roasting.",
    "You're an ESPN anchor giving the league its own SportsCenter segment.",
    "You're a sarcastic friend who's seen every bad roster decision.",
    "You're a hype man celebrating winners and consoling losers (barely).",
    "You're a conspiracy theorist who sees patterns everywhere.",
    "You're a disappointed parent reviewing their kid's fantasy choices.",
    "You're a poet who finds beauty in blowouts and heartbreak in close losses.",
    "You're a courtroom prosecutor building a case against bad managers.",
    "You're a weatherman forecasting each team's playoff chances.",
    "You're a reality TV narrator adding dramatic flair to every matchup.",
    "You're a stand-up comedian roasting the league at their awards banquet.",
    "You're a motivational speaker trying to find the positive in a 2-8 team.",
    "You're a sports radio caller with strong opinions on everyone.",
]


def build_fantasy_prompt(league_data):
    """Build prompt for fantasy league summary generation"""
    week = league_data.get('week')
    year = league_data.get('year')
    matchups = league_data.get('matchups', [])
    standings = league_data.get('standings', [])
    league_name = league_data.get('league_name', 'the league')

    # Rotate persona by week (offset from NFL to avoid matching)
    persona = _FANTASY_PERSONAS[(week + 6) % len(_FANTASY_PERSONAS)]

    # Format matchup results
    matchup_results = []
    for matchup in matchups:
        home = matchup['home']
        away = matchup['away']
        winner = home if home['won'] else away
        loser = away if home['won'] else home

        result = f"{winner['team_name']} {winner['score']:.1f} def. {loser['team_name']} {loser['score']:.1f}"

        margin = abs(home['score'] - away['score'])
        if margin < 5:
            result += " (NAIL-BITER)"
        elif margin > 40:
            result += " (BLOWOUT)"

        # Lineup errors
        for side in (home, away):
            if side.get('errors') and len(side['errors']) > 0:
                pts = sum(err['points_lost'] for err in side['errors'])
                result += f" [{side['team_name']} left {pts:.0f} on bench]"

        matchup_results.append(result)

    # Format standings (compact)
    standings_text = [f"{t['rank']}. {t['team_name']} ({t['record']})" for t in standings[:5]]

    prompt = f"""{persona}

Write a SHORT recap of Week {week} in "{league_name}". One tight paragraph — 3-5 sentences max.

RESULTS:
{chr(10).join(matchup_results)}

TOP 5: {' | '.join(standings_text)}

Rules:
- ONE paragraph, 3-5 sentences. Tight and punchy.
- Use actual team names. Reference 1-2 specific matchups max, not all of them.
- Focus on the story — who's hot, who's embarrassing themselves, what matters.
- If someone left big points on the bench, roast them (with love).
- Don't start with "Week X" or "What a week." Vary your openings.
- Match the persona above. Let your voice come through.
- Don't invent player names not in the data.

Write it:"""

    return prompt


def generate_fantasy_fallback(league_data, reason='unknown'):
    """Generate fallback summary when LLM unavailable"""
    week = league_data.get('week')
    matchups = league_data.get('matchups', [])
    league_name = league_data.get('league_name', 'the league')

    summary = f"Week {week} in {league_name} featured {len(matchups)} matchups."

    blowouts = [m for m in matchups if abs(m['home']['score'] - m['away']['score']) > 40]
    close_games = [m for m in matchups if abs(m['home']['score'] - m['away']['score']) < 5]

    if blowouts:
        summary += f" {len(blowouts)} blowout{'s' if len(blowouts) > 1 else ''}."

    if close_games:
        summary += f" {len(close_games)} nail-biter{'s' if len(close_games) > 1 else ''}."

    note = _FALLBACK_MESSAGES.get(reason, "AI-generated league summaries coming soon — the roasts will be epic!")
    summary += f"\n\n({note})"

    return summary
