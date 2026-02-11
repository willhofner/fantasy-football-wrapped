"""
Draft Analyzer
Fetches draft data from ESPN and grades picks on a 5-star scale.
Includes: BYE week adjustment, league draft grades, position group grades,
poacher detection, and LLM draft synopses.
"""
import os
import json
import math
from pathlib import Path
from collections import defaultdict

import requests
from espn_api import PLAYER_POSITION_MAP, POSITION_MAP

# ---------------------------------------------------------------------------
# LLM integration (import pattern from summary_generator.py)
# ---------------------------------------------------------------------------
try:
    from anthropic import Anthropic, APIStatusError
    from dotenv import load_dotenv
    load_dotenv()
    _ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    _llm_client = Anthropic(api_key=_ANTHROPIC_API_KEY) if _ANTHROPIC_API_KEY else None
except ImportError:
    _llm_client = None

CACHE_DIR = Path(__file__).parent.parent / 'cache' / 'summaries'
CACHE_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# ESPN data fetching
# ---------------------------------------------------------------------------

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
    - Per-week points for BYE detection

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
                'weekly_points': {week: float},
                'weekly_slots': {week: int},
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
                            'weekly_points': {},
                            'weekly_slots': {},
                        }

                    p = players[player_id]
                    p['total_points'] += points

                    # Track weekly points and slots
                    p['weekly_points'][week] = points
                    p['weekly_slots'][week] = lineup_slot

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


# ---------------------------------------------------------------------------
# BYE week detection
# ---------------------------------------------------------------------------

def detect_bye_weeks(player_data, start_week, end_week):
    """
    Detect BYE weeks for each player.
    A BYE week = player scored 0 points AND was not started by any team that week.
    Returns: {player_id: set of bye weeks}
    """
    bye_weeks = {}
    all_weeks = set(range(start_week, end_week + 1))

    for player_id, pdata in player_data.items():
        byes = set()
        weekly_points = pdata.get('weekly_points', {})
        started_by = pdata.get('started_by', {})

        # Collect all weeks this player was started by anyone
        started_weeks = set()
        for team_id, weeks in started_by.items():
            started_weeks.update(weeks)

        for week in all_weeks:
            pts = weekly_points.get(week, None)
            # Player not on any roster this week, or scored 0 and not started
            if pts is None:
                # Not on any roster = could be BYE or just not rostered
                # Only count as BYE if they were rostered in adjacent weeks
                rostered_weeks = set()
                for team_id, weeks in pdata.get('rostered_by', {}).items():
                    rostered_weeks.update(weeks)
                if week - 1 in rostered_weeks or week + 1 in rostered_weeks:
                    byes.add(week)
            elif pts == 0 and week not in started_weeks:
                # Scored 0 and nobody started them = likely BYE
                byes.add(week)

        bye_weeks[player_id] = byes

    return bye_weeks


# ---------------------------------------------------------------------------
# Star grading system
# ---------------------------------------------------------------------------

def compute_star_ratings(picks, bye_weeks_map):
    """
    Grade every pick on a 0.5 - 5.0 star scale.
    Factors:
      1. Expected value by round (actual vs round average)
      2. Positional ranking among all drafted players at same position
      3. Start % (BYE-adjusted)
      4. Dropped penalty
    Sets 'stars' (float) and updates 'grade' (GEM/BUST/None) on each pick.
    """
    if not picks:
        return

    # --- Compute round averages ---
    round_points = defaultdict(list)
    for p in picks:
        if p['total_points'] > 0:
            round_points[p['round']].append(p['total_points'])

    round_avg = {}
    for rnd, pts_list in round_points.items():
        round_avg[rnd] = sum(pts_list) / len(pts_list) if pts_list else 0

    # --- Compute positional rankings ---
    pos_groups = defaultdict(list)
    for p in picks:
        pos_groups[p['position']].append(p)

    pos_rank = {}  # player_id -> percentile 0-1 (1 = best)
    for pos, group in pos_groups.items():
        sorted_group = sorted(group, key=lambda x: x['total_points'], reverse=True)
        n = len(sorted_group)
        for i, player in enumerate(sorted_group):
            # Top player = 1.0, worst = ~0
            pos_rank[player['player_id']] = (n - i) / n if n > 0 else 0.5

    # --- Score each pick ---
    for pick in picks:
        player_id = pick['player_id']
        rnd = pick['round']
        total_pts = pick['total_points']
        start_pct = pick['start_pct']
        dropped = pick['was_dropped']

        # Factor 1: Value vs round expectation (0-2.0 points)
        avg = round_avg.get(rnd, 0)
        if avg > 0:
            value_ratio = total_pts / avg
        else:
            value_ratio = 1.0
        # Clamp: 0x = 0 pts, 1x = 1.0 pts, 2x+ = 2.0 pts
        value_score = min(value_ratio, 2.0)

        # Factor 2: Positional ranking (0-1.5 points)
        percentile = pos_rank.get(player_id, 0.5)
        pos_score = percentile * 1.5

        # Factor 3: Start % (0-1.0 points)
        start_score = (start_pct / 100.0) * 1.0

        # Factor 4: Dropped penalty (-0.5)
        drop_penalty = -0.5 if dropped else 0

        raw_score = value_score + pos_score + start_score + drop_penalty

        # Map to 0.5 - 5.0 scale (raw range ~0 to 4.5)
        # Normalize: raw 0 -> 0.5, raw 4.5 -> 5.0
        stars = 0.5 + (raw_score / 4.5) * 4.5
        # Round to nearest 0.5
        stars = round(stars * 2) / 2
        stars = max(0.5, min(5.0, stars))

        pick['stars'] = stars

        # Set grade labels for extremes
        if stars >= 5.0:
            pick['grade'] = 'GEM'
        elif stars <= 1.0:
            pick['grade'] = 'BUST'
        else:
            pick['grade'] = None


# ---------------------------------------------------------------------------
# League draft grades (A+ to F)
# ---------------------------------------------------------------------------

GRADE_SCALE = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']


def _score_to_letter(score, scores):
    """Convert a numeric score to a letter grade based on distribution."""
    if not scores:
        return 'C'
    sorted_scores = sorted(scores, reverse=True)
    n = len(sorted_scores)
    rank = sorted_scores.index(score) if score in sorted_scores else n - 1
    percentile = rank / max(n - 1, 1)
    idx = min(int(percentile * len(GRADE_SCALE)), len(GRADE_SCALE) - 1)
    return GRADE_SCALE[idx]


def compute_team_draft_grades(picks, team_map):
    """
    Grade each team's overall draft: A+ to F.
    Based on: total points from drafted players, average star rating, GEM/BUST counts.
    Returns: {team_id: {'grade': str, 'score': float, 'total_points': float,
              'avg_stars': float, 'gem_count': int, 'bust_count': int, 'pick_count': int}}
    """
    team_data = defaultdict(lambda: {
        'total_points': 0, 'star_sum': 0, 'count': 0, 'gems': 0, 'busts': 0
    })

    for p in picks:
        tid = p['team_id']
        td = team_data[tid]
        td['total_points'] += p['total_points']
        td['star_sum'] += p.get('stars', 2.5)
        td['count'] += 1
        if p.get('grade') == 'GEM':
            td['gems'] += 1
        if p.get('grade') == 'BUST':
            td['busts'] += 1

    # Composite score: 50% total points (normalized), 30% avg stars, 20% gem-bust ratio
    all_totals = [td['total_points'] for td in team_data.values()]
    max_total = max(all_totals) if all_totals else 1
    min_total = min(all_totals) if all_totals else 0
    total_range = max_total - min_total if max_total != min_total else 1

    composite_scores = {}
    for tid, td in team_data.items():
        avg_stars = td['star_sum'] / td['count'] if td['count'] > 0 else 2.5
        pts_norm = (td['total_points'] - min_total) / total_range  # 0-1
        stars_norm = (avg_stars - 0.5) / 4.5  # 0-1
        gem_bust_ratio = (td['gems'] - td['busts']) / max(td['count'], 1)
        gb_norm = (gem_bust_ratio + 1) / 2  # -1..1 -> 0..1

        composite = pts_norm * 0.5 + stars_norm * 0.3 + gb_norm * 0.2
        composite_scores[tid] = composite

    # Assign letter grades
    all_composites = sorted(composite_scores.values(), reverse=True)
    result = {}
    for tid, td in team_data.items():
        score = composite_scores[tid]
        grade = _score_to_letter(score, all_composites)
        avg_stars = round(td['star_sum'] / td['count'], 1) if td['count'] > 0 else 0
        result[tid] = {
            'grade': grade,
            'score': round(score, 3),
            'total_points': round(td['total_points'], 1),
            'avg_stars': avg_stars,
            'gem_count': td['gems'],
            'bust_count': td['busts'],
            'pick_count': td['count'],
        }

    return result


# ---------------------------------------------------------------------------
# Position group grades
# ---------------------------------------------------------------------------

def compute_position_group_grades(picks, team_map):
    """
    Grade each team's draft by position group.
    Returns: {team_id: {position: {'grade': str, 'picks': int, 'total_points': float, 'avg_stars': float}}}
    """
    # Collect per-team per-position data
    team_pos = defaultdict(lambda: defaultdict(lambda: {
        'total_points': 0, 'star_sum': 0, 'count': 0, 'players': []
    }))

    for p in picks:
        tid = p['team_id']
        pos = p['position']
        tpd = team_pos[tid][pos]
        tpd['total_points'] += p['total_points']
        tpd['star_sum'] += p.get('stars', 2.5)
        tpd['count'] += 1
        tpd['players'].append(p['player_name'])

    # For grading, compare each team's position group to the league avg for that position
    # Collect league-wide position averages
    league_pos = defaultdict(lambda: {'total_points': [], 'avg_stars': []})
    for tid, positions in team_pos.items():
        for pos, data in positions.items():
            league_pos[pos]['total_points'].append(data['total_points'])
            avg_s = data['star_sum'] / data['count'] if data['count'] > 0 else 2.5
            league_pos[pos]['avg_stars'].append(avg_s)

    result = {}
    for tid in team_pos:
        result[tid] = {}
        for pos, data in team_pos[tid].items():
            avg_stars = round(data['star_sum'] / data['count'], 1) if data['count'] > 0 else 0
            total_pts = round(data['total_points'], 1)

            # Grade relative to league
            pos_totals = league_pos[pos]['total_points']
            sorted_totals = sorted(pos_totals, reverse=True)
            rank = sorted_totals.index(total_pts) if total_pts in sorted_totals else len(sorted_totals) - 1
            percentile = rank / max(len(sorted_totals) - 1, 1)
            grade_idx = min(int(percentile * len(GRADE_SCALE)), len(GRADE_SCALE) - 1)
            grade = GRADE_SCALE[grade_idx]

            result[tid][pos] = {
                'grade': grade,
                'picks': data['count'],
                'total_points': total_pts,
                'avg_stars': avg_stars,
                'players': data['players'],
            }

    return result


# ---------------------------------------------------------------------------
# Poacher detection
# ---------------------------------------------------------------------------

def detect_poachers(picks, player_data):
    """
    Track which managers picked up players drafted by another team then dropped.
    Returns: {team_id: {poacher_team_name: [player_names]}}
    (Only includes teams that picked up 2+ players from the same drafter.)
    """
    # Map player_id -> drafter_team_id
    drafter_map = {}
    player_name_map = {}
    for p in picks:
        drafter_map[p['player_id']] = p['team_id']
        player_name_map[p['player_id']] = p['player_name']

    # For each player, if final_team != drafter, the final team "poached" them
    poach_data = defaultdict(lambda: defaultdict(list))  # final_team -> drafter_team -> [names]

    for p in picks:
        player_id = p['player_id']
        drafter_tid = p['team_id']
        pdata = player_data.get(player_id)
        if not pdata:
            continue

        final_tid = pdata.get('final_team_id')
        if final_tid and final_tid != drafter_tid:
            poach_data[final_tid][drafter_tid].append(p['player_name'])

    # Filter: only include where a team poached 2+ from the same drafter
    result = {}
    for poacher_tid, sources in poach_data.items():
        filtered = {str(drafter_tid): names for drafter_tid, names in sources.items() if len(names) >= 2}
        if filtered:
            result[str(poacher_tid)] = filtered

    return result


# ---------------------------------------------------------------------------
# LLM draft synopses
# ---------------------------------------------------------------------------

def _get_draft_synopsis_cache_path(league_id, year, team_id):
    cache_dir = CACHE_DIR / str(league_id) / str(year)
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / f"draft_synopsis_team_{team_id}.json"


def generate_team_draft_synopses(picks, team_map, team_grades, league_id, year, force_regenerate=False):
    """
    Generate 2-sentence LLM synopsis for each team's draft.
    Returns: {team_id: synopsis_string}
    """
    synopses = {}

    # Group picks by team
    team_picks = defaultdict(list)
    for p in picks:
        team_picks[p['team_id']].append(p)

    for tid, tpicks in team_picks.items():
        team_name = team_map.get(tid, f'Team {tid}')

        # Check cache
        cache_path = _get_draft_synopsis_cache_path(league_id, year, tid)
        if not force_regenerate and cache_path.exists():
            try:
                cached = json.loads(cache_path.read_text())
                synopses[str(tid)] = cached.get('synopsis', '')
                continue
            except (json.JSONDecodeError, IOError):
                pass

        # Sort picks by stars to find best/worst
        sorted_picks = sorted(tpicks, key=lambda x: x.get('stars', 2.5), reverse=True)
        best = sorted_picks[0] if sorted_picks else None
        worst = sorted_picks[-1] if sorted_picks else None
        grade_info = team_grades.get(tid, {})

        # Try LLM
        synopsis = _generate_synopsis_llm(team_name, best, worst, grade_info)
        if not synopsis:
            synopsis = _generate_synopsis_fallback(team_name, best, worst, grade_info)

        # Cache it
        try:
            cache_path.write_text(json.dumps({'synopsis': synopsis, 'team_id': tid}))
        except IOError:
            pass

        synopses[str(tid)] = synopsis

    return synopses


def _generate_synopsis_llm(team_name, best, worst, grade_info):
    """Try to generate synopsis via Claude API."""
    if not _llm_client:
        return None

    grade = grade_info.get('grade', '?')
    best_desc = f"{best['player_name']} (Rd {best['round']}, {best['stars']} stars, {best['total_points']} pts)" if best else "N/A"
    worst_desc = f"{worst['player_name']} (Rd {worst['round']}, {worst['stars']} stars, {worst['total_points']} pts)" if worst else "N/A"

    prompt = f"""Write exactly 2 sentences about {team_name}'s fantasy football draft (grade: {grade}).
Sentence 1: Their best pick — {best_desc} — and why it was great.
Sentence 2: Their worst pick — {worst_desc} — and why it hurt.
Be punchy, specific, and a little snarky. Use actual names and numbers. No filler."""

    try:
        response = _llm_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=150,
            temperature=0.8,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[DraftSynopsis] LLM failed for {team_name}: {e}")
        return None


def _generate_synopsis_fallback(team_name, best, worst, grade_info):
    """Fallback synopsis when LLM unavailable."""
    parts = []
    if best and best.get('stars', 0) >= 4.0:
        parts.append(f"{best['player_name']} in Round {best['round']} was a steal at {best['total_points']} total points.")
    elif best:
        parts.append(f"{best['player_name']} (Rd {best['round']}) led the draft class with {best['total_points']} points.")
    else:
        parts.append(f"{team_name} had a quiet draft.")

    if worst and worst.get('stars', 0) <= 2.0:
        parts.append(f"{worst['player_name']} in Round {worst['round']} disappointed with only {worst['total_points']} points.")
    elif worst:
        parts.append(f"{worst['player_name']} (Rd {worst['round']}) underperformed at {worst['total_points']} points.")
    else:
        parts.append("No major busts to report.")

    return ' '.join(parts)


# ---------------------------------------------------------------------------
# Main analysis entry point
# ---------------------------------------------------------------------------

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

    # Detect BYE weeks
    bye_weeks_map = detect_bye_weeks(player_data, start_week, end_week)

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

        # BYE-adjusted start %
        player_byes = len(bye_weeks_map.get(player_id, set()))
        adjusted_weeks = total_weeks - player_byes
        start_pct = round((weeks_started / adjusted_weeks) * 100, 1) if adjusted_weeks > 0 else 0
        # Cap at 100%
        start_pct = min(start_pct, 100.0)

        avg_points = round(total_points / adjusted_weeks, 2) if adjusted_weeks > 0 else 0

        # Was player dropped by the drafter?
        rostered_by = pdata.get('rostered_by', {})
        drafter_weeks = rostered_by.get(drafter_team_id, set())
        was_dropped = len(drafter_weeks) > 0 and end_week not in drafter_weeks
        if len(drafter_weeks) == 0:
            was_dropped = True

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
            'bye_weeks': player_byes,
            'grade': None,
            'stars': 2.5,
        })

    # Compute star ratings (replaces old grade_picks)
    compute_star_ratings(draft_picks, bye_weeks_map)

    # Compute team draft grades
    team_grades = compute_team_draft_grades(draft_picks, team_map)

    # Compute position group grades
    position_grades = compute_position_group_grades(draft_picks, team_map)

    # Detect poachers
    poachers = detect_poachers(draft_picks, player_data)

    # Generate LLM synopses
    team_synopses = generate_team_draft_synopses(
        draft_picks, team_map, team_grades, league_id, year
    )

    # Convert team_map keys to strings for JSON
    str_team_map = {str(k): v for k, v in team_map.items()}
    str_team_grades = {str(k): v for k, v in team_grades.items()}
    str_position_grades = {str(k): {pos: data for pos, data in positions.items()}
                           for k, positions in position_grades.items()}

    return {
        'picks': draft_picks,
        'team_map': str_team_map,
        'total_weeks': total_weeks,
        'team_grades': str_team_grades,
        'position_grades': str_position_grades,
        'poachers': poachers,
        'team_synopses': team_synopses,
    }, None
