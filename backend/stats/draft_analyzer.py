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


def _tm(team_map, team_id, field='manager_name', default=None):
    """Extract name from team map (handles dict or string values)."""
    info = team_map.get(team_id)
    if info is None:
        return default or f"Team {team_id}"
    if isinstance(info, dict):
        return info.get(field, default or f"Team {team_id}")
    return info

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
        # Build team name from location + nickname (same as espn_api.py)
        location = (team.get('location', '') or '').strip()
        nickname = (team.get('nickname', '') or '').strip()
        team_name = f"{location} {nickname}".strip() or f"Team {tid}"

        owner_name = None
        for oid in team.get('owners', []):
            if oid in member_lookup:
                owner_name = member_lookup[oid]
                break
        team_map[tid] = {
            'team_name': team_name,
            'manager_name': owner_name or f"Manager {tid}"
        }

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
        team_name = _tm(team_map, tid)

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
# Draft alternatives ("What if you drafted X instead of Y?")
# ---------------------------------------------------------------------------

def calculate_draft_alternatives(picks, team_id):
    """
    For each of a team's draft picks, find the next 3 players of the SAME
    POSITION drafted after that pick who scored MORE than the player chosen.

    Only same-position alternatives make sense — a QB alternative for a WR pick
    isn't actionable if you already have a QB.
    """
    team_picks = sorted(
        [p for p in picks if p['team_id'] == team_id],
        key=lambda p: p['overall_pick']
    )

    if not team_picks:
        return []

    # Sort all picks by overall_pick for scanning
    all_sorted = sorted(picks, key=lambda p: p['overall_pick'])

    result = []
    for pick in team_picks:
        current_overall = pick['overall_pick']
        pick_position = pick['position']

        # Find the next 3 players of the SAME position drafted after this pick
        same_pos_after = []
        for p in all_sorted:
            if p['overall_pick'] <= current_overall:
                continue
            if p['position'] != pick_position:
                continue
            same_pos_after.append(p)
            if len(same_pos_after) >= 3:
                break

        # Filter to only those who outscored the pick
        alternatives = []
        for alt in same_pos_after:
            point_diff = round(alt['total_points'] - pick['total_points'], 2)
            if point_diff <= 0:
                continue
            alternatives.append({
                'player_name': alt['player_name'],
                'position': alt['position'],
                'overall_pick': alt['overall_pick'],
                'round': alt['round'],
                'pick': alt['pick'],
                'total_points': alt['total_points'],
                'avg_points': alt['avg_points'],
                'point_diff': point_diff,
                'team_name': alt['team_name'],
            })

        alternatives.sort(key=lambda a: a['total_points'], reverse=True)

        best_alt = alternatives[0] if alternatives else None
        missed_points = round(best_alt['point_diff'], 2) if best_alt else 0

        result.append({
            'your_pick': pick,
            'alternatives': alternatives,
            'best_alternative': best_alt,
            'missed_points': missed_points,
        })

    return result


# ---------------------------------------------------------------------------
# Advanced draft statistics (10+ fun stats)
# ---------------------------------------------------------------------------

def compute_advanced_draft_stats(picks, team_map, num_teams):
    """
    Compute 10+ advanced draft stats for the Insights tab.
    Returns a dict with all computed stats.
    """
    if not picks:
        return {}

    # --- Precompute round averages ---
    round_points = defaultdict(list)
    for p in picks:
        round_points[p['round']].append(p['total_points'])

    round_avg = {}
    for rnd, pts_list in round_points.items():
        round_avg[rnd] = sum(pts_list) / len(pts_list) if pts_list else 0

    # --- 1. Draft Steal of the Year ---
    # Pick with highest points relative to round expectation
    steal_of_year = None
    best_surplus = -float('inf')
    for p in picks:
        avg = round_avg.get(p['round'], 0)
        surplus = p['total_points'] - avg
        if surplus > best_surplus:
            best_surplus = surplus
            steal_of_year = {
                'player_name': p['player_name'],
                'position': p['position'],
                'team_name': p['team_name'],
                'round': p['round'],
                'pick': p['pick'],
                'overall_pick': p['overall_pick'],
                'total_points': p['total_points'],
                'round_avg': round(avg, 1),
                'surplus': round(surplus, 1),
                'stars': p.get('stars', 0),
            }

    # --- 2. Biggest Bust by Round ---
    bust_by_round = {}
    for rnd in sorted(round_points.keys()):
        rnd_picks = [p for p in picks if p['round'] == rnd and p['total_points'] >= 0]
        if rnd_picks:
            worst = min(rnd_picks, key=lambda p: p['total_points'])
            bust_by_round[rnd] = {
                'player_name': worst['player_name'],
                'position': worst['position'],
                'team_name': worst['team_name'],
                'total_points': worst['total_points'],
                'round_avg': round(round_avg.get(rnd, 0), 1),
            }

    # --- 3. Position Value Analysis ---
    pos_points = defaultdict(list)
    for p in picks:
        if p['position'] not in ('Unknown',):
            pos_points[p['position']].append(p['total_points'])

    position_value = {}
    for pos, pts_list in pos_points.items():
        position_value[pos] = {
            'avg_points': round(sum(pts_list) / len(pts_list), 1) if pts_list else 0,
            'total_points': round(sum(pts_list), 1),
            'count': len(pts_list),
            'best_player': None,
        }
        # Find best player at position
        pos_picks = [p for p in picks if p['position'] == pos]
        if pos_picks:
            best = max(pos_picks, key=lambda p: p['total_points'])
            position_value[pos]['best_player'] = {
                'name': best['player_name'],
                'points': best['total_points'],
                'team_name': best['team_name'],
                'round': best['round'],
                'pick': best['pick'],
            }

    # Sort by avg_points descending
    position_value = dict(sorted(
        position_value.items(),
        key=lambda x: x[1]['avg_points'],
        reverse=True
    ))

    # --- 4. Reach Picks (players well below round average) ---
    reach_picks = []
    for p in picks:
        avg = round_avg.get(p['round'], 0)
        if avg > 0 and p['total_points'] < avg * 0.4 and p['round'] <= 8:
            reach_picks.append({
                'player_name': p['player_name'],
                'position': p['position'],
                'team_name': p['team_name'],
                'round': p['round'],
                'overall_pick': p['overall_pick'],
                'total_points': p['total_points'],
                'round_avg': round(avg, 1),
                'deficit': round(avg - p['total_points'], 1),
            })
    reach_picks.sort(key=lambda x: x['deficit'], reverse=True)
    reach_picks = reach_picks[:10]  # Top 10 reaches

    # --- 5. Best/Worst Value Picks ---
    # Stars relative to expected stars for round
    # Expected: Round 1 expects ~4.5 stars, Round 16 expects ~1.0 star
    total_rounds = max(p['round'] for p in picks) if picks else 16
    value_picks = []
    for p in picks:
        expected_stars = 4.5 - ((p['round'] - 1) / max(total_rounds - 1, 1)) * 4.0
        star_surplus = p.get('stars', 2.5) - expected_stars
        value_picks.append({
            'player_name': p['player_name'],
            'position': p['position'],
            'team_name': p['team_name'],
            'round': p['round'],
            'overall_pick': p['overall_pick'],
            'total_points': p['total_points'],
            'stars': p.get('stars', 2.5),
            'expected_stars': round(expected_stars, 1),
            'star_surplus': round(star_surplus, 1),
        })
    value_picks.sort(key=lambda x: x['star_surplus'], reverse=True)
    best_value = value_picks[:5]
    worst_value = value_picks[-5:][::-1]  # Reverse so worst is first

    # --- 6. What If You Autodrafted ---
    # For each team, simulate: at each pick, take the player with highest
    # total_points who is still available.
    team_picks_map = defaultdict(list)
    for p in picks:
        team_picks_map[p['team_id']].append(p)

    # Sort all picks by overall_pick to simulate draft order
    sorted_all = sorted(picks, key=lambda p: p['overall_pick'])
    # Pre-sort available pool by total_points descending
    pool_by_points = sorted(picks, key=lambda p: p['total_points'], reverse=True)

    autodraft_results = {}
    for tid, tpicks in team_picks_map.items():
        actual_total = sum(p['total_points'] for p in tpicks)
        # Simulate: at each of this team's pick slots, take best available
        taken = set()
        auto_total = 0
        auto_picks_detail = []
        pick_slots = sorted(tpicks, key=lambda p: p['overall_pick'])

        for slot in pick_slots:
            # Find best available player (not yet taken in simulation)
            best_available = None
            for candidate in pool_by_points:
                if candidate['overall_pick'] not in taken:
                    best_available = candidate
                    break
            if best_available:
                taken.add(best_available['overall_pick'])
                auto_total += best_available['total_points']
                auto_picks_detail.append({
                    'round': slot['round'],
                    'actual_player': slot['player_name'],
                    'actual_points': slot['total_points'],
                    'auto_player': best_available['player_name'],
                    'auto_points': best_available['total_points'],
                })
            else:
                taken.add(slot['overall_pick'])
                auto_total += slot['total_points']

        diff = round(auto_total - actual_total, 1)
        team_name = _tm(team_map, tid)
        autodraft_results[str(tid)] = {
            'team_name': team_name,
            'actual_total': round(actual_total, 1),
            'auto_total': round(auto_total, 1),
            'diff': diff,
            'diff_pct': round((diff / actual_total * 100), 1) if actual_total > 0 else 0,
        }

    # Sort by diff descending (who benefited most from skill)
    autodraft_sorted = sorted(
        autodraft_results.values(),
        key=lambda x: x['diff']
    )

    # --- 7. Snake Draft Position Advantage ---
    # Group teams by their first pick position (1st, 2nd, etc.)
    draft_position_stats = {}
    for tid, tpicks in team_picks_map.items():
        first_pick = min(tpicks, key=lambda p: p['overall_pick'])
        draft_pos = first_pick['overall_pick']  # 1-indexed draft position
        total_pts = sum(p['total_points'] for p in tpicks)
        avg_stars = sum(p.get('stars', 2.5) for p in tpicks) / len(tpicks) if tpicks else 0
        team_name = _tm(team_map, tid)
        draft_position_stats[draft_pos] = {
            'draft_position': draft_pos,
            'team_name': team_name,
            'total_points': round(total_pts, 1),
            'avg_stars': round(avg_stars, 1),
            'pick_count': len(tpicks),
        }

    draft_position_sorted = sorted(
        draft_position_stats.values(),
        key=lambda x: x['total_points'],
        reverse=True
    )

    # --- 8. Round-by-Round Efficiency ---
    round_efficiency = {}
    for rnd in sorted(round_points.keys()):
        pts = round_points[rnd]
        round_efficiency[rnd] = {
            'round': rnd,
            'avg_points': round(sum(pts) / len(pts), 1) if pts else 0,
            'total_points': round(sum(pts), 1),
            'pick_count': len(pts),
            'best_pick': None,
        }
        rnd_picks = [p for p in picks if p['round'] == rnd]
        if rnd_picks:
            best = max(rnd_picks, key=lambda p: p['total_points'])
            round_efficiency[rnd]['best_pick'] = {
                'name': best['player_name'],
                'points': best['total_points'],
                'team_name': best['team_name'],
            }

    # --- 9. Drafter Personality Profiles ---
    drafter_profiles = {}
    for tid, tpicks in team_picks_map.items():
        pos_counts = defaultdict(int)
        for p in tpicks:
            pos_counts[p['position']] += 1

        # Classify
        traits = []
        rb_count = pos_counts.get('RB', 0)
        wr_count = pos_counts.get('WR', 0)
        qb_count = pos_counts.get('QB', 0)

        if rb_count >= 4:
            traits.append('RB Heavy')
        if wr_count >= 4:
            traits.append('WR Stack')

        # Early QB: took QB in rounds 1-3
        early_qb = any(p['position'] == 'QB' and p['round'] <= 3 for p in tpicks)
        if early_qb:
            traits.append('Early QB')

        # Late Round Hero: 2+ picks with 4+ stars in rounds 8+
        late_gems = [p for p in tpicks if p['round'] >= 8 and p.get('stars', 0) >= 4.0]
        if len(late_gems) >= 2:
            traits.append('Late Round Hero')

        # Balanced: no position has 2x more picks than another key position
        key_positions = {pos: pos_counts.get(pos, 0) for pos in ['QB', 'RB', 'WR', 'TE']}
        non_zero = [v for v in key_positions.values() if v > 0]
        if non_zero and max(non_zero) <= min(non_zero) * 2:
            traits.append('Balanced')

        if not traits:
            traits.append('Standard')

        team_name = _tm(team_map, tid)
        drafter_profiles[str(tid)] = {
            'team_name': team_name,
            'traits': traits,
            'position_counts': dict(pos_counts),
            'primary_trait': traits[0] if traits else 'Standard',
        }

    # --- 10. Keeper/Bust Ratio by Team ---
    loyalty_stats = {}
    for tid, tpicks in team_picks_map.items():
        kept = [p for p in tpicks if not p['was_dropped']]
        dropped = [p for p in tpicks if p['was_dropped']]
        team_name = _tm(team_map, tid)
        loyalty_stats[str(tid)] = {
            'team_name': team_name,
            'kept_count': len(kept),
            'dropped_count': len(dropped),
            'total': len(tpicks),
            'loyalty_pct': round(len(kept) / len(tpicks) * 100, 1) if tpicks else 0,
        }

    return {
        'steal_of_year': steal_of_year,
        'bust_by_round': {str(k): v for k, v in bust_by_round.items()},
        'position_value': position_value,
        'reach_picks': reach_picks,
        'best_value': best_value,
        'worst_value': worst_value,
        'autodraft': autodraft_sorted,
        'draft_position_advantage': draft_position_sorted,
        'round_efficiency': {str(k): v for k, v in round_efficiency.items()},
        'drafter_profiles': drafter_profiles,
        'loyalty_stats': loyalty_stats,
    }


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
        final_team_name = _tm(team_map, final_team_id, default='FA') if final_team_id else 'FA'

        draft_picks.append({
            'player_id': player_id,
            'player_name': player_name,
            'position': position,
            'round': round_num,
            'pick': round_pick,
            'overall_pick': overall_pick,
            'team_id': drafter_team_id,
            'team_name': _tm(team_map, drafter_team_id),
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

    # Compute advanced draft stats
    num_teams = len(team_map)
    advanced_stats = compute_advanced_draft_stats(draft_picks, team_map, num_teams)

    return {
        'picks': draft_picks,
        'team_map': str_team_map,
        'total_weeks': total_weeks,
        'team_grades': str_team_grades,
        'position_grades': str_position_grades,
        'poachers': poachers,
        'team_synopses': team_synopses,
        'advanced_stats': advanced_stats,
    }, None
