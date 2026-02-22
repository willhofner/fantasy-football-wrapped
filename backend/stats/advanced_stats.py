"""
Advanced Statistics Package — Phase 1 (Tier 1)
20 stats across 8 categories computed from existing season data.
"""
import statistics


def calculate_advanced_stats(stats, all_team_stats, team_name_map):
    """
    Calculate all advanced statistics for one team (Phase 1 + Phase 2).

    Args:
        stats: Single team's stats dict (after post_season_stats)
        all_team_stats: All teams' stats dict (for league comparisons)
        team_name_map: Team name mapping

    Returns:
        Dict with all advanced stat categories
    """
    # Phase 1
    result = {
        'consistency': _calc_consistency(stats),
        'position_iq': _calc_position_iq(stats),
        'clutch_factor': _calc_clutch_factor(stats, team_name_map),
        'bench_narratives': _calc_bench_narratives(stats),
        'extreme_moments': _calc_extreme_moments(stats, team_name_map),
        'league_comparison': _calc_league_comparisons(stats, all_team_stats),
        'streaks': _calc_streaks(stats),
        'what_if': _calc_what_if(stats, team_name_map),
    }

    # Phase 2
    result['head_to_head'] = _calc_head_to_head(stats, all_team_stats, team_name_map)
    result['roster_tenure'] = _calc_roster_tenure(stats, all_team_stats)
    result['season_splits'] = _calc_season_splits(stats)
    result['manager_archetype'] = _calc_manager_archetype(stats, all_team_stats, result)
    result['coach_vs_gm'] = _calc_coach_vs_gm(stats, all_team_stats)

    return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_name(team_name_map, team_id):
    """Resolve team name from map (handles dict or string)."""
    info = team_name_map.get(team_id)
    if info is None:
        return f"Team {team_id}"
    if isinstance(info, dict):
        return info.get('manager_name', f"Team {team_id}")
    return info


def _get_optimal_names(week_data):
    """Extract set of optimal player names from weekly data."""
    names = set()
    for item in week_data.get('optimal_lineup', []):
        if isinstance(item, dict):
            names.add(item['player']['name'])
        else:
            names.add(item[1]['name'])
    return names


def _get_optimal_player(week_data, position_label):
    """Get the optimal player dict for a given position slot."""
    for item in week_data.get('optimal_lineup', []):
        if isinstance(item, dict):
            if item.get('position') == position_label:
                return item['player']
        else:
            if item[0] == position_label:
                return item[1]
    return None


# ---------------------------------------------------------------------------
# Category 1: Consistency & Volatility
# ---------------------------------------------------------------------------

def _calc_consistency(stats):
    weekly = stats.get('weekly_points', [])
    if not weekly:
        return {}

    avg = statistics.mean(weekly)
    std = statistics.stdev(weekly) if len(weekly) > 1 else 0.0

    boom_count = sum(1 for w in weekly if w > 120)
    bust_count = sum(1 for w in weekly if w < 80)
    ratio = round(boom_count / bust_count, 2) if bust_count > 0 else float(boom_count)

    predictable = sum(1 for w in weekly if abs(w - avg) <= 10)

    # Errors by week
    errors_by_week = []
    for wd in stats.get('weekly_data', []):
        optimal_names = _get_optimal_names(wd)
        starter_names = set(p['name'] for p in wd.get('starters', []))
        errors_by_week.append(len(optimal_names - starter_names))

    worst_idx = errors_by_week.index(max(errors_by_week)) if errors_by_week else 0
    weeks = [wd['week'] for wd in stats.get('weekly_data', [])]

    return {
        'std_dev': round(std, 2),
        'min_score': round(min(weekly), 2),
        'max_score': round(max(weekly), 2),
        'avg_score': round(avg, 2),
        'boom_count': boom_count,
        'bust_count': bust_count,
        'boom_bust_ratio': ratio,
        'predictability_pct': round((predictable / len(weekly)) * 100) if weekly else 0,
        'predictable_weeks': predictable,
        'total_weeks': len(weekly),
        'errors_by_week': errors_by_week,
        'error_weeks': weeks,
        'worst_error_week': weeks[worst_idx] if weeks else 0,
        'worst_error_count': max(errors_by_week) if errors_by_week else 0,
    }


# ---------------------------------------------------------------------------
# Category 2: Position-Specific Intelligence
# ---------------------------------------------------------------------------

def _calc_position_iq(stats):
    errors_by_pos = {}
    flex_points_lost = 0.0
    flex_errors = 0
    flex_games_cost = 0
    worst_flex = None

    for wd in stats.get('weekly_data', []):
        optimal_names = _get_optimal_names(wd)
        starter_names = set(p['name'] for p in wd.get('starters', []))

        # Build optimal name->position map
        optimal_map = {}
        for item in wd.get('optimal_lineup', []):
            if isinstance(item, dict):
                name = item['player']['name']
                pos = item['player'].get('actual_position', 'Unknown')
            else:
                name = item[1]['name']
                pos = item[1].get('actual_position', 'Unknown')
            optimal_map[name] = pos

        # Errors by position
        for name in optimal_names - starter_names:
            pos = optimal_map.get(name, 'Unknown')
            errors_by_pos[pos] = errors_by_pos.get(pos, 0) + 1

        # FLEX analysis
        flex_starter = None
        for s in wd.get('starters', []):
            if s.get('position') == 'FLEX' or s.get('slot_id') == 23:
                flex_starter = s
                break

        if flex_starter:
            optimal_flex = _get_optimal_player(wd, 'FLEX')
            if optimal_flex and optimal_flex['name'] != flex_starter['name']:
                diff = optimal_flex['points'] - flex_starter['points']
                if diff > 0:
                    flex_points_lost += diff
                    flex_errors += 1
                    margin = wd['opp_score'] - wd['my_score']
                    if not wd['won'] and diff >= margin:
                        flex_games_cost += 1
                    if worst_flex is None or diff > worst_flex['points_lost']:
                        worst_flex = {
                            'week': wd['week'],
                            'points_lost': round(diff, 2),
                            'started': flex_starter['name'],
                            'should_have_started': optimal_flex['name'],
                        }

    weakest = max(errors_by_pos, key=errors_by_pos.get) if errors_by_pos else None

    return {
        'errors_by_position': errors_by_pos,
        'weakest_position': weakest,
        'weakness_count': errors_by_pos.get(weakest, 0) if weakest else 0,
        'flex_points_lost': round(flex_points_lost, 2),
        'flex_errors_count': flex_errors,
        'games_cost_by_flex': flex_games_cost,
        'worst_flex_week': worst_flex,
    }


# ---------------------------------------------------------------------------
# Category 3: Win/Loss Context (Clutch Factor)
# ---------------------------------------------------------------------------

def _calc_clutch_factor(stats, team_name_map):
    close_wins = close_losses = 0
    blowout_wins = blowout_losses = 0
    nailbiter_wins = nailbiter_losses = 0
    closest_game = None

    for wd in stats.get('weekly_data', []):
        margin = abs(wd['my_score'] - wd['opp_score'])

        if margin < 3:
            if wd['won']:
                nailbiter_wins += 1
            else:
                nailbiter_losses += 1
            if closest_game is None or margin < closest_game['margin']:
                closest_game = {
                    'week': wd['week'],
                    'margin': round(margin, 2),
                    'won': wd['won'],
                    'my_score': wd['my_score'],
                    'opp_score': wd['opp_score'],
                    'opponent': _resolve_name(team_name_map, wd['opponent_id']),
                }

        if margin < 10:
            if wd['won']:
                close_wins += 1
            else:
                close_losses += 1

        if margin > 30:
            if wd['won']:
                blowout_wins += 1
            else:
                blowout_losses += 1

    return {
        'close_game_wins': close_wins,
        'close_game_losses': close_losses,
        'close_game_record': f"{close_wins}-{close_losses}",
        'blowout_wins': blowout_wins,
        'blowout_losses': blowout_losses,
        'blowout_record': f"{blowout_wins}-{blowout_losses}",
        'nailbiter_wins': nailbiter_wins,
        'nailbiter_losses': nailbiter_losses,
        'total_nailbiters': nailbiter_wins + nailbiter_losses,
        'closest_game': closest_game,
    }


# ---------------------------------------------------------------------------
# Category 4: Bench Narratives
# ---------------------------------------------------------------------------

def _calc_bench_narratives(stats):
    bench_explosions = []
    goose_egg_weeks = []
    total_goose_eggs = 0

    for wd in stats.get('weekly_data', []):
        starter_pts = sum(s['points'] for s in wd.get('starters', []))
        bench_pts = sum(b['points'] for b in wd.get('bench', []))

        if bench_pts > starter_pts:
            bench_explosions.append({
                'week': wd['week'],
                'bench_points': round(bench_pts, 2),
                'starter_points': round(starter_pts, 2),
                'differential': round(bench_pts - starter_pts, 2),
            })

        week_eggs = sum(1 for s in wd.get('starters', []) if s['points'] == 0)
        if week_eggs > 0:
            goose_egg_weeks.append({'week': wd['week'], 'count': week_eggs})
            total_goose_eggs += week_eggs

    worst_explosion = max(bench_explosions, key=lambda x: x['differential']) if bench_explosions else None

    return {
        'bench_explosion_happened': len(bench_explosions) > 0,
        'bench_explosion_count': len(bench_explosions),
        'worst_bench_explosion': worst_explosion,
        'total_goose_eggs': total_goose_eggs,
        'goose_egg_weeks': goose_egg_weeks,
    }


# ---------------------------------------------------------------------------
# Category 5: Extreme Moments
# ---------------------------------------------------------------------------

def _calc_extreme_moments(stats, team_name_map):
    biggest_win = None
    worst_loss = None

    for wd in stats.get('weekly_data', []):
        margin = wd['my_score'] - wd['opp_score']
        opp_name = _resolve_name(team_name_map, wd['opponent_id'])

        if wd['won']:
            if biggest_win is None or margin > biggest_win['margin']:
                biggest_win = {
                    'week': wd['week'],
                    'margin': round(margin, 2),
                    'my_score': wd['my_score'],
                    'opp_score': wd['opp_score'],
                    'opponent': opp_name,
                }
        else:
            if worst_loss is None or margin < worst_loss['margin']:
                worst_loss = {
                    'week': wd['week'],
                    'margin': round(margin, 2),
                    'my_score': wd['my_score'],
                    'opp_score': wd['opp_score'],
                    'opponent': opp_name,
                }

    return {
        'biggest_win': biggest_win,
        'worst_loss': worst_loss,
    }


# ---------------------------------------------------------------------------
# Category 6: League Comparative Stats
# ---------------------------------------------------------------------------

def _calc_league_comparisons(stats, all_team_stats):
    # Build weekly scoreboard: {week: [score1, score2, ...]}
    weekly_scores = {}
    for _tid, ts in all_team_stats.items():
        for wd in ts.get('weekly_data', []):
            week = wd['week']
            weekly_scores.setdefault(week, []).append(wd['my_score'])

    # Strength of schedule
    opp_scores = [wd['opp_score'] for wd in stats.get('weekly_data', [])]
    avg_opp = statistics.mean(opp_scores) if opp_scores else 0.0
    all_scores = [s for scores in weekly_scores.values() for s in scores]
    league_avg = statistics.mean(all_scores) if all_scores else 0.0

    # Rank schedule difficulty across all teams
    team_avg_opps = {}
    for tid, ts in all_team_stats.items():
        opps = [wd['opp_score'] for wd in ts.get('weekly_data', [])]
        team_avg_opps[tid] = statistics.mean(opps) if opps else 0.0
    sorted_sos = sorted(team_avg_opps.values(), reverse=True)
    sos_rank = 1
    for i, val in enumerate(sorted_sos):
        if abs(val - avg_opp) < 0.01:
            sos_rank = i + 1
            break

    # Lucky wins / unlucky losses
    lucky_wins = []
    unlucky_losses = []

    for wd in stats.get('weekly_data', []):
        week = wd['week']
        scores_that_week = weekly_scores.get(week, [])
        if not scores_that_week:
            continue
        my_rank = sum(1 for s in scores_that_week if s < wd['my_score'])
        total = len(scores_that_week)
        percentile = round((my_rank / total) * 100) if total > 0 else 50

        if wd['won'] and percentile <= 30:
            lucky_wins.append({
                'week': wd['week'],
                'your_score': wd['my_score'],
                'opponent_score': wd['opp_score'],
                'teams_scored_more': total - my_rank - 1,
                'percentile': percentile,
            })
        elif not wd['won'] and percentile >= 70:
            unlucky_losses.append({
                'week': wd['week'],
                'your_score': wd['my_score'],
                'opponent_score': wd['opp_score'],
                'teams_beaten': my_rank,
                'percentile': percentile,
            })

    return {
        'avg_opponent_score': round(avg_opp, 2),
        'league_avg_score': round(league_avg, 2),
        'schedule_difficulty_rank': sos_rank,
        'total_teams': len(all_team_stats),
        'lucky_wins': sorted(lucky_wins, key=lambda x: x['percentile']),
        'lucky_win_count': len(lucky_wins),
        'unlucky_losses': sorted(unlucky_losses, key=lambda x: -x['percentile']),
        'unlucky_loss_count': len(unlucky_losses),
    }


# ---------------------------------------------------------------------------
# Category 7: Streaks & Momentum
# ---------------------------------------------------------------------------

def _calc_streaks(stats):
    weekly = stats.get('weekly_data', [])
    if not weekly:
        return {}

    best_win = {'length': 0, 'start': 0, 'end': 0}
    best_loss = {'length': 0, 'start': 0, 'end': 0}
    cur_len = 0
    cur_type = None
    streak_start = 0

    for wd in weekly:
        won = wd['won']
        if won == cur_type:
            cur_len += 1
        else:
            cur_len = 1
            cur_type = won
            streak_start = wd['week']

        target = best_win if won else best_loss
        if cur_len > target['length']:
            target['length'] = cur_len
            target['start'] = streak_start
            target['end'] = wd['week']

    # Peak / worst 3-week windows
    points = stats.get('weekly_points', [])
    weeks = [wd['week'] for wd in weekly]
    peak = {'weeks': [], 'total': 0, 'avg': 0}
    worst = {'weeks': [], 'total': float('inf'), 'avg': 0}

    if len(points) >= 3:
        for i in range(len(points) - 2):
            total = sum(points[i:i + 3])
            if total > peak['total']:
                peak = {'weeks': weeks[i:i + 3], 'total': round(total, 2), 'avg': round(total / 3, 2)}
            if total < worst['total']:
                worst = {'weeks': weeks[i:i + 3], 'total': round(total, 2), 'avg': round(total / 3, 2)}

    if worst['total'] == float('inf'):
        worst = {'weeks': [], 'total': 0, 'avg': 0}

    return {
        'longest_win_streak': best_win,
        'longest_loss_streak': best_loss,
        'peak_3week': peak,
        'worst_3week': worst,
    }


# ---------------------------------------------------------------------------
# Category 8: Would've / Could've / Should've
# ---------------------------------------------------------------------------

def _calc_what_if(stats, team_name_map):
    actual_wins = stats.get('actual_wins', 0)
    actual_losses = stats.get('actual_losses', 0)
    optimal_wins = stats.get('optimal_vs_actual_wins', 0)
    optimal_losses = stats.get('optimal_vs_actual_losses', 0)
    games_cost = max(optimal_wins - actual_wins, 0)

    # One-player-away losses
    one_player_away = []
    for wd in stats.get('weekly_data', []):
        if wd['won']:
            continue
        margin = wd['opp_score'] - wd['my_score']
        if margin <= 0:
            continue

        best_swap = None
        for b in wd.get('bench', []):
            for s in wd.get('starters', []):
                compatible = (
                    s.get('actual_position') == b.get('actual_position')
                    or s.get('position') == 'FLEX'
                    or s.get('slot_id') == 23
                )
                if not compatible:
                    continue
                gain = b['points'] - s['points']
                if gain >= margin:
                    if best_swap is None or gain < best_swap['gain']:
                        best_swap = {
                            'bench_player': b['name'],
                            'bench_points': round(b['points'], 2),
                            'starter_replaced': s['name'],
                            'starter_points': round(s['points'], 2),
                            'gain': round(gain, 2),
                        }

        if best_swap:
            one_player_away.append({
                'week': wd['week'],
                'my_score': wd['my_score'],
                'opp_score': wd['opp_score'],
                'margin': round(margin, 2),
                'opponent': _resolve_name(team_name_map, wd['opponent_id']),
                **best_swap,
            })

    # Games lost to errors (optimal would have won)
    games_lost_to_errors = 0
    for wd in stats.get('weekly_data', []):
        if not wd['won'] and wd.get('my_optimal', 0) > wd['opp_score']:
            games_lost_to_errors += 1

    return {
        'actual_record': f"{actual_wins}-{actual_losses}",
        'optimal_record': f"{optimal_wins}-{optimal_losses}",
        'games_cost_by_errors': games_cost,
        'one_player_away_losses': len(one_player_away),
        'one_player_away_details': one_player_away,
        'games_lost_to_errors': games_lost_to_errors,
    }


# ---------------------------------------------------------------------------
# PHASE 2: Head-to-Head Dynamics
# ---------------------------------------------------------------------------

def _calc_head_to_head(stats, all_team_stats, team_name_map):
    """H2H record vs each opponent, nemesis/victim, and vs top/bottom teams."""
    weekly = stats.get('weekly_data', [])
    if not weekly:
        return {}

    # Build H2H matrix
    h2h = {}  # {opponent_id: {'wins': int, 'losses': int}}
    for wd in weekly:
        opp = wd['opponent_id']
        h2h.setdefault(opp, {'wins': 0, 'losses': 0})
        if wd['won']:
            h2h[opp]['wins'] += 1
        else:
            h2h[opp]['losses'] += 1

    # Nemesis (most losses against) and Victim (most wins against)
    nemesis_id = max(h2h, key=lambda t: h2h[t]['losses']) if h2h else None
    victim_id = max(h2h, key=lambda t: h2h[t]['wins']) if h2h else None

    nemesis = None
    if nemesis_id and h2h[nemesis_id]['losses'] > 0:
        nemesis = {
            'team_id': nemesis_id,
            'name': _resolve_name(team_name_map, nemesis_id),
            'wins': h2h[nemesis_id]['wins'],
            'losses': h2h[nemesis_id]['losses'],
            'record': f"{h2h[nemesis_id]['wins']}-{h2h[nemesis_id]['losses']}",
        }

    victim = None
    if victim_id and h2h[victim_id]['wins'] > 0:
        victim = {
            'team_id': victim_id,
            'name': _resolve_name(team_name_map, victim_id),
            'wins': h2h[victim_id]['wins'],
            'losses': h2h[victim_id]['losses'],
            'record': f"{h2h[victim_id]['wins']}-{h2h[victim_id]['losses']}",
        }

    # Record vs top 3 and bottom 3 by total points
    team_totals = sorted(
        all_team_stats.keys(),
        key=lambda t: all_team_stats[t].get('total_points', 0),
        reverse=True,
    )
    top_3 = set(team_totals[:3])
    bottom_3 = set(team_totals[-3:])

    vs_top = {'wins': 0, 'losses': 0}
    vs_bottom = {'wins': 0, 'losses': 0}
    for wd in weekly:
        opp = wd['opponent_id']
        if opp in top_3:
            if wd['won']:
                vs_top['wins'] += 1
            else:
                vs_top['losses'] += 1
        if opp in bottom_3:
            if wd['won']:
                vs_bottom['wins'] += 1
            else:
                vs_bottom['losses'] += 1

    return {
        'nemesis': nemesis,
        'victim': victim,
        'vs_top_3': {
            'record': f"{vs_top['wins']}-{vs_top['losses']}",
            **vs_top,
            'teams': [_resolve_name(team_name_map, t) for t in team_totals[:3]],
        },
        'vs_bottom_3': {
            'record': f"{vs_bottom['wins']}-{vs_bottom['losses']}",
            **vs_bottom,
            'teams': [_resolve_name(team_name_map, t) for t in team_totals[-3:]],
        },
    }


# ---------------------------------------------------------------------------
# PHASE 2: Roster Tenure & Player Stories
# ---------------------------------------------------------------------------

def _calc_roster_tenure(stats, all_team_stats):
    """Iron Man, Flash in Pan, Crown Jewel, positional depth."""
    weekly = stats.get('weekly_data', [])
    if not weekly:
        return {}

    # Count starts per player
    starter_counts = {}   # name -> {starts, total_points, position, weeks}
    all_players = {}      # name -> {starts + bench appearances, total_points}

    for wd in weekly:
        for s in wd.get('starters', []):
            name = s['name']
            if name not in starter_counts:
                starter_counts[name] = {
                    'starts': 0, 'total_points': 0.0,
                    'position': s.get('actual_position', ''), 'weeks': [],
                }
            starter_counts[name]['starts'] += 1
            starter_counts[name]['total_points'] += s['points']
            starter_counts[name]['weeks'].append(wd['week'])

        for p in wd.get('starters', []) + wd.get('bench', []):
            name = p['name']
            if name not in all_players:
                all_players[name] = {'appearances': 0, 'total_points': 0.0}
            all_players[name]['appearances'] += 1
            all_players[name]['total_points'] += p['points']

    total_weeks = len(weekly)

    # Iron Man: most starts
    iron_man = None
    if starter_counts:
        im_name = max(starter_counts, key=lambda n: starter_counts[n]['starts'])
        im = starter_counts[im_name]
        iron_man = {
            'player': im_name,
            'position': im['position'],
            'starts': im['starts'],
            'total_weeks': total_weeks,
            'total_points': round(im['total_points'], 2),
        }

    # Flash in Pan: exactly 1 start
    flash_in_pan = []
    for name, data in starter_counts.items():
        if data['starts'] == 1:
            flash_in_pan.append({
                'player': name,
                'position': data['position'],
                'week': data['weeks'][0],
                'points': round(data['total_points'], 2),
            })
    flash_in_pan.sort(key=lambda x: x['points'])

    # Crown Jewel: highest-scoring player on the roster, with league-wide rank
    league_player_totals = {}
    for _tid, ts in all_team_stats.items():
        for name, pts in ts.get('player_season_points', {}).items():
            league_player_totals.setdefault(name, 0.0)
            league_player_totals[name] = max(league_player_totals[name], pts)

    sorted_league = sorted(league_player_totals.items(), key=lambda x: -x[1])
    league_rank_map = {name: rank + 1 for rank, (name, _) in enumerate(sorted_league)}

    crown_jewel = None
    player_pts = stats.get('player_season_points', {})
    if player_pts:
        best_name = max(player_pts, key=player_pts.get)
        crown_jewel = {
            'player': best_name,
            'points': round(player_pts[best_name], 2),
            'league_rank': league_rank_map.get(best_name, 0),
            'total_players': len(sorted_league),
        }

    # Positional depth: count starters per position with >1 start
    pos_depth = {}
    for name, data in starter_counts.items():
        pos = data['position']
        if not pos:
            continue
        pos_depth.setdefault(pos, {'startable': 0, 'total_starts': 0})
        if data['starts'] > 1:
            pos_depth[pos]['startable'] += 1
        pos_depth[pos]['total_starts'] += data['starts']

    thinnest = min(pos_depth, key=lambda p: pos_depth[p]['startable']) if pos_depth else None

    return {
        'iron_man': iron_man,
        'flash_in_pan': flash_in_pan[:5],  # top 5
        'flash_count': len(flash_in_pan),
        'crown_jewel': crown_jewel,
        'positional_depth': pos_depth,
        'thinnest_position': thinnest,
        'unique_starters': len(starter_counts),
        'total_weeks': total_weeks,
    }


# ---------------------------------------------------------------------------
# PHASE 2: Season Splits (First Half vs Second Half)
# ---------------------------------------------------------------------------

def _calc_season_splits(stats):
    """Compare first half vs second half of the season."""
    weekly = stats.get('weekly_data', [])
    points = stats.get('weekly_points', [])
    if not weekly or not points:
        return {}

    mid = len(weekly) // 2
    first_half = weekly[:mid]
    second_half = weekly[mid:]
    first_pts = points[:mid]
    second_pts = points[mid:]

    def _half_stats(wks, pts):
        wins = sum(1 for w in wks if w['won'])
        losses = len(wks) - wins
        avg = round(statistics.mean(pts), 2) if pts else 0
        return {
            'weeks': [w['week'] for w in wks],
            'record': f"{wins}-{losses}",
            'wins': wins,
            'losses': losses,
            'avg_ppg': avg,
            'total_points': round(sum(pts), 2),
        }

    first = _half_stats(first_half, first_pts)
    second = _half_stats(second_half, second_pts)

    diff = second['avg_ppg'] - first['avg_ppg']
    if diff > 3:
        trend = 'improving'
    elif diff < -3:
        trend = 'fading'
    else:
        trend = 'consistent'

    narratives = {
        'improving': f"Strong finish: {second['avg_ppg']} PPG vs {first['avg_ppg']} PPG early on.",
        'fading': f"You faded: {first['avg_ppg']} PPG early → {second['avg_ppg']} PPG late.",
        'consistent': f"Rock steady: {first['avg_ppg']} PPG early, {second['avg_ppg']} PPG late.",
    }

    return {
        'first_half': first,
        'second_half': second,
        'trend': trend,
        'ppg_change': round(diff, 2),
        'narrative': narratives[trend],
    }


# ---------------------------------------------------------------------------
# PHASE 2: Manager Archetype Classification
# ---------------------------------------------------------------------------

def _calc_manager_archetype(stats, all_team_stats, adv_stats):
    """Auto-classify into one of 8 archetypes based on stats patterns."""
    consistency = adv_stats.get('consistency', {})
    clutch = adv_stats.get('clutch_factor', {})
    league_comp = adv_stats.get('league_comparison', {})

    # Gather metrics
    errors = stats.get('errors', 0)
    boom_bust = consistency.get('boom_bust_ratio', 1.0)
    std_dev = consistency.get('std_dev', 15.0)
    boom_count = consistency.get('boom_count', 0)
    bust_count = consistency.get('bust_count', 0)
    lucky_wins = league_comp.get('lucky_win_count', 0)
    unlucky_losses = league_comp.get('unlucky_loss_count', 0)
    close_wins = clutch.get('close_game_wins', 0)
    close_losses = clutch.get('close_game_losses', 0)

    # Count unique starters across weeks (proxy for tinkering)
    unique_starters = set()
    for wd in stats.get('weekly_data', []):
        for s in wd.get('starters', []):
            unique_starters.add(s['name'])

    # League percentiles for each metric
    all_errors = sorted(ts.get('errors', 0) for ts in all_team_stats.values())
    all_stdevs = sorted(
        statistics.stdev(ts.get('weekly_points', [0, 0]))
        for ts in all_team_stats.values()
        if len(ts.get('weekly_points', [])) > 1
    )

    error_pct = _percentile_rank(errors, all_errors)
    std_pct = _percentile_rank(std_dev, all_stdevs)

    # Classification logic (priority order)
    archetype = 'The Competitor'
    description = 'Balanced across all categories. Solid, not spectacular.'
    supporting = []

    if errors <= (all_errors[0] if all_errors else 99) + 2 and error_pct <= 20:
        archetype = 'The Sleeper'
        description = 'Fewest mistakes. Your lineup decisions were elite.'
        supporting = [f"Only {errors} errors", f"Top {100 - error_pct}% in accuracy"]
    elif error_pct >= 80:
        archetype = 'The Gambler'
        description = 'Boom or bust, no in-between.'
        supporting = [f"{boom_count} boom weeks, {bust_count} bust weeks", f"{errors} total errors"]
    elif std_pct <= 15:
        archetype = 'The Steady Eddie'
        description = 'The most predictable scorer in the league.'
        supporting = [f"Std dev: {round(std_dev, 1)}", f"Most predictable in the league"]
    elif std_pct >= 85:
        archetype = 'The Wildcard'
        description = 'Impossible to predict. Chaos incarnate.'
        supporting = [f"Std dev: {round(std_dev, 1)}", f"{boom_count} booms, {bust_count} busts"]
    elif lucky_wins >= 2:
        archetype = 'The Lucky Bastard'
        description = 'Fortune smiled on you all season.'
        supporting = [f"{lucky_wins} lucky wins", f"Won when you shouldn't have"]
    elif unlucky_losses >= 2:
        archetype = 'The Snakebitten'
        description = 'You deserved better. The schedule did you dirty.'
        supporting = [f"{unlucky_losses} unlucky losses", "Outscored most teams and still lost"]
    elif len(unique_starters) >= 20:
        archetype = 'The Tinkerer'
        description = 'Never satisfied. Always tweaking, always changing.'
        supporting = [f"{len(unique_starters)} unique starters", "Most roster churn in the league"]
    elif close_wins > close_losses and close_wins >= 3:
        archetype = 'The Closer'
        description = 'Ice in your veins in close games.'
        supporting = [f"{close_wins}-{close_losses} in close games", "Clutch when it matters"]

    return {
        'archetype': archetype,
        'description': description,
        'supporting_stats': supporting,
    }


def _percentile_rank(value, sorted_values):
    """Return the percentile rank (0-100) of value within sorted list."""
    if not sorted_values:
        return 50
    count_below = sum(1 for v in sorted_values if v < value)
    return round((count_below / len(sorted_values)) * 100)


# ---------------------------------------------------------------------------
# PHASE 2: Coach vs GM Rating Split
# ---------------------------------------------------------------------------

def _calc_coach_vs_gm(stats, all_team_stats):
    """
    Coach = in-season lineup decisions (errors, optimal %).
    GM = roster construction quality (player value, depth).
    """
    weekly = stats.get('weekly_data', [])
    if not weekly:
        return {}

    total_weeks = len(weekly)
    errors = stats.get('errors', 0)
    perfect_weeks = len(stats.get('perfect_weeks', []))
    points_lost = stats.get('points_lost', 0.0)
    total_pts = stats.get('total_points', 1.0)
    optimal_pts = stats.get('total_optimal_points', 1.0)

    # Coach metrics
    accuracy_pct = round((1 - points_lost / optimal_pts) * 100, 1) if optimal_pts > 0 else 0
    errors_per_week = round(errors / total_weeks, 2) if total_weeks > 0 else 0

    # League percentile for coach
    all_accuracy = sorted(
        round((1 - ts.get('points_lost', 0) / max(ts.get('total_optimal_points', 1), 1)) * 100, 1)
        for ts in all_team_stats.values()
    )
    coach_pct = _percentile_rank(accuracy_pct, all_accuracy)

    # Coach grade (A-F)
    if coach_pct >= 90:
        coach_grade = 'A+'
    elif coach_pct >= 75:
        coach_grade = 'A'
    elif coach_pct >= 60:
        coach_grade = 'B'
    elif coach_pct >= 40:
        coach_grade = 'C'
    elif coach_pct >= 20:
        coach_grade = 'D'
    else:
        coach_grade = 'F'

    # GM metrics: roster ceiling (optimal points) relative to league
    all_optimal = sorted(
        ts.get('total_optimal_points', 0)
        for ts in all_team_stats.values()
    )
    gm_pct = _percentile_rank(optimal_pts, all_optimal)

    if gm_pct >= 90:
        gm_grade = 'A+'
    elif gm_pct >= 75:
        gm_grade = 'A'
    elif gm_pct >= 60:
        gm_grade = 'B'
    elif gm_pct >= 40:
        gm_grade = 'C'
    elif gm_pct >= 20:
        gm_grade = 'D'
    else:
        gm_grade = 'F'

    # Overall composite
    composite = round((coach_pct + gm_pct) / 2)

    return {
        'coach': {
            'grade': coach_grade,
            'accuracy_pct': accuracy_pct,
            'errors_per_week': errors_per_week,
            'perfect_weeks': perfect_weeks,
            'percentile': coach_pct,
            'total_errors': errors,
            'points_lost': round(points_lost, 2),
        },
        'gm': {
            'grade': gm_grade,
            'optimal_total': round(optimal_pts, 2),
            'percentile': gm_pct,
            'roster_ceiling_rank': len(all_optimal) - sum(1 for v in all_optimal if v >= optimal_pts) + 1,
        },
        'composite_percentile': composite,
        'narrative': _coach_gm_narrative(coach_grade, gm_grade),
    }


def _coach_gm_narrative(coach_grade, gm_grade):
    """Generate a narrative comparing coach vs GM performance."""
    coach_good = coach_grade in ('A+', 'A', 'B')
    gm_good = gm_grade in ('A+', 'A', 'B')

    if coach_good and gm_good:
        return "Great roster AND great decisions. The total package."
    elif coach_good and not gm_good:
        return "You made the most of a mediocre roster. Coaching carried."
    elif not coach_good and gm_good:
        return "Elite roster, questionable decisions. Talent wasted."
    else:
        return "Rough all around. Better luck next year."
