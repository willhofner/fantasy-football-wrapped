"""
League-Wide Statistics Calculator
Includes full superlatives system (16 awards).
"""
import statistics


def _tm(team_map, team_id, field='manager_name', default=None):
    """Extract name from team map (handles dict or string values)."""
    info = team_map.get(team_id)
    if info is None:
        return default or f"Team {team_id}"
    if isinstance(info, dict):
        return info.get(field, default or f"Team {team_id}")
    return info


def calculate_league_stats(team_stats, team_name_map):
    """
    Calculate league-wide statistics from all team data.

    Args:
        team_stats: Dictionary mapping team_id to team stats
        team_name_map: Dictionary mapping team_id to team name

    Returns:
        Dictionary of league-wide statistics including superlatives
    """
    if not team_stats:
        return {}

    team_count = len(team_stats)

    # Aggregate stats
    total_errors = sum(s['errors'] for s in team_stats.values())
    total_points_lost = sum(s['points_lost'] for s in team_stats.values())
    total_perfect_weeks = sum(len(s['perfect_weeks']) for s in team_stats.values())

    # Best / Worst manager (fewest / most errors)
    best_manager_id = min(team_stats.keys(), key=lambda x: team_stats[x]['errors'])
    worst_manager_id = max(team_stats.keys(), key=lambda x: team_stats[x]['errors'])

    # Most perfect weeks
    most_perfect_id = max(team_stats.keys(), key=lambda x: len(team_stats[x]['perfect_weeks']))
    most_perfect_count = len(team_stats[most_perfect_id]['perfect_weeks'])

    # Biggest underperformer / luckiest
    biggest_underperformer_id = max(
        team_stats.keys(),
        key=lambda x: team_stats[x]['optimal_vs_actual_wins'] - team_stats[x]['actual_wins']
    )
    underperformer_diff = (
        team_stats[biggest_underperformer_id]['optimal_vs_actual_wins']
        - team_stats[biggest_underperformer_id]['actual_wins']
    )
    luckiest_id = max(
        team_stats.keys(),
        key=lambda x: team_stats[x]['actual_wins'] - team_stats[x]['optimal_vs_actual_wins']
    )
    luckiest_diff = (
        team_stats[luckiest_id]['actual_wins']
        - team_stats[luckiest_id]['optimal_vs_actual_wins']
    )

    # Standings
    standings = sorted(
        team_stats.keys(),
        key=lambda x: (team_stats[x]['actual_wins'], team_stats[x]['total_points']),
        reverse=True,
    )
    standings_map = {tid: rank + 1 for rank, tid in enumerate(standings)}

    # ── Superlatives ──────────────────────────────────────────────────
    awards = _calculate_superlatives(team_stats, team_name_map)

    # ── Roster Strength Rankings ──────────────────────────────────────
    roster_rankings = _calculate_roster_rankings(team_stats, team_name_map)

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
            'name': _tm(team_name_map, best_manager_id),
            'errors': team_stats[best_manager_id]['errors'],
        },
        'worst_manager': {
            'team_id': worst_manager_id,
            'name': _tm(team_name_map, worst_manager_id),
            'errors': team_stats[worst_manager_id]['errors'],
        },
        'most_perfect_weeks': {
            'team_id': most_perfect_id,
            'name': _tm(team_name_map, most_perfect_id),
            'count': most_perfect_count,
        },
        'biggest_underperformer': {
            'team_id': biggest_underperformer_id,
            'name': _tm(team_name_map, biggest_underperformer_id),
            'win_difference': underperformer_diff,
        },
        'luckiest_team': {
            'team_id': luckiest_id,
            'name': _tm(team_name_map, luckiest_id),
            'win_difference': luckiest_diff,
        },
        'awards': awards,
        'roster_rankings': roster_rankings,
    }


# ======================================================================
# Superlatives System — 16 league-wide awards
# ======================================================================

def _calculate_superlatives(team_stats, team_name_map):
    """
    Compute all 16 league-wide superlatives.
    Returns dict keyed by award id with winner info + value.
    """
    if not team_stats:
        return {}

    team_ids = list(team_stats.keys())

    # Build weekly scoreboard for luck calculations
    weekly_scores = {}  # {week: [(team_id, score), ...]}
    for tid, ts in team_stats.items():
        for wd in ts.get('weekly_data', []):
            weekly_scores.setdefault(wd['week'], []).append((tid, wd['my_score']))

    awards = {}

    # ── 1. Clown: Most goose eggs (0-point starters) ─────────────────
    goose_eggs = {}
    for tid, ts in team_stats.items():
        count = 0
        for wd in ts.get('weekly_data', []):
            count += sum(1 for s in wd.get('starters', []) if s['points'] == 0)
        goose_eggs[tid] = count
    winner = max(team_ids, key=lambda t: goose_eggs[t])
    if goose_eggs[winner] > 0:
        awards['clown'] = _award(team_name_map, winner, goose_eggs[winner], f"{goose_eggs[winner]} goose eggs")

    # ── 2. Blue Chip: Highest avg win margin ─────────────────────────
    avg_win_margin = {}
    for tid, ts in team_stats.items():
        margins = [wd['my_score'] - wd['opp_score'] for wd in ts.get('weekly_data', []) if wd['won']]
        avg_win_margin[tid] = statistics.mean(margins) if margins else 0
    winner = max(team_ids, key=lambda t: avg_win_margin[t])
    if avg_win_margin[winner] > 0:
        awards['blue_chip'] = _award(team_name_map, winner, round(avg_win_margin[winner], 1), f"Avg win margin: {round(avg_win_margin[winner], 1)} pts")

    # ── 3. Skull: Highest avg loss margin ────────────────────────────
    avg_loss_margin = {}
    for tid, ts in team_stats.items():
        margins = [wd['opp_score'] - wd['my_score'] for wd in ts.get('weekly_data', []) if not wd['won']]
        avg_loss_margin[tid] = statistics.mean(margins) if margins else 0
    winner = max(team_ids, key=lambda t: avg_loss_margin[t])
    if avg_loss_margin[winner] > 0:
        awards['skull'] = _award(team_name_map, winner, round(avg_loss_margin[winner], 1), f"Avg loss margin: {round(avg_loss_margin[winner], 1)} pts")

    # ── 4. Dice Roll: Lowest avg absolute margin ─────────────────────
    avg_abs_margin = {}
    for tid, ts in team_stats.items():
        margins = [abs(wd['my_score'] - wd['opp_score']) for wd in ts.get('weekly_data', [])]
        avg_abs_margin[tid] = statistics.mean(margins) if margins else 999
    winner = min(team_ids, key=lambda t: avg_abs_margin[t])
    awards['dice_roll'] = _award(team_name_map, winner, round(avg_abs_margin[winner], 1), f"Avg margin: {round(avg_abs_margin[winner], 1)} pts")

    # ── 5. Top Heavy: Highest % of points from top 2 players ────────
    top_heavy_pct = {}
    for tid, ts in team_stats.items():
        top2 = sum(p['points'] for p in ts.get('top_scorers', [])[:2])
        total = ts.get('total_points', 1)
        top_heavy_pct[tid] = round((top2 / total) * 100, 1) if total > 0 else 0
    winner = max(team_ids, key=lambda t: top_heavy_pct[t])
    awards['top_heavy'] = _award(team_name_map, winner, top_heavy_pct[winner], f"{top_heavy_pct[winner]}% from top 2 players")

    # ── 6. Bench Warmer: Most points left on bench ───────────────────
    winner = max(team_ids, key=lambda t: team_stats[t]['points_lost'])
    val = round(team_stats[winner]['points_lost'], 1)
    awards['bench_warmer'] = _award(team_name_map, winner, val, f"{val} points left on bench")

    # ── 7. Heartbreak Kid: Most losses by < 10 pts ───────────────────
    close_losses = {}
    for tid, ts in team_stats.items():
        count = sum(
            1 for wd in ts.get('weekly_data', [])
            if not wd['won'] and abs(wd['my_score'] - wd['opp_score']) < 10
        )
        close_losses[tid] = count
    winner = max(team_ids, key=lambda t: close_losses[t])
    if close_losses[winner] > 0:
        awards['heartbreak'] = _award(team_name_map, winner, close_losses[winner], f"{close_losses[winner]} losses by <10 pts")

    # ── 8. Perfect Week Club: Most perfect lineups ───────────────────
    winner = max(team_ids, key=lambda t: len(team_stats[t]['perfect_weeks']))
    count = len(team_stats[winner]['perfect_weeks'])
    if count > 0:
        awards['perfect_club'] = _award(team_name_map, winner, count, f"{count} perfect lineup(s)")

    # ── 9. Best Manager: Fewest errors ───────────────────────────────
    winner = min(team_ids, key=lambda t: team_stats[t]['errors'])
    awards['best_manager'] = _award(team_name_map, winner, team_stats[winner]['errors'], f"Only {team_stats[winner]['errors']} lineup errors")

    # ── 10. Worst Manager: Most errors ───────────────────────────────
    winner = max(team_ids, key=lambda t: team_stats[t]['errors'])
    awards['worst_manager'] = _award(team_name_map, winner, team_stats[winner]['errors'], f"{team_stats[winner]['errors']} lineup errors")

    # ── 11. Lucky: Most wins where outscored by 6+ other teams ───────
    lucky_counts = {}
    for tid, ts in team_stats.items():
        count = 0
        for wd in ts.get('weekly_data', []):
            if not wd['won']:
                continue
            week = wd['week']
            scores = weekly_scores.get(week, [])
            teams_higher = sum(1 for _, s in scores if s > wd['my_score'])
            if teams_higher >= 6:
                count += 1
        lucky_counts[tid] = count
    winner = max(team_ids, key=lambda t: lucky_counts[t])
    if lucky_counts[winner] > 0:
        awards['lucky'] = _award(team_name_map, winner, lucky_counts[winner], f"{lucky_counts[winner]} wins when outscored by 6+ teams")

    # ── 12. Unlucky: Most losses where outscored 6+ other teams ──────
    unlucky_counts = {}
    for tid, ts in team_stats.items():
        count = 0
        for wd in ts.get('weekly_data', []):
            if wd['won']:
                continue
            week = wd['week']
            scores = weekly_scores.get(week, [])
            teams_lower = sum(1 for _, s in scores if s < wd['my_score'])
            if teams_lower >= 6:
                count += 1
        unlucky_counts[tid] = count
    winner = max(team_ids, key=lambda t: unlucky_counts[t])
    if unlucky_counts[winner] > 0:
        awards['unlucky'] = _award(team_name_map, winner, unlucky_counts[winner], f"{unlucky_counts[winner]} losses despite outscoring 6+ teams")

    # ── 13. Speedrunner: Most unique players used ────────────────────
    # Approximation: count unique player names across all weeks
    unique_players = {}
    for tid, ts in team_stats.items():
        names = set()
        for wd in ts.get('weekly_data', []):
            for s in wd.get('starters', []):
                names.add(s['name'])
            for b in wd.get('bench', []):
                names.add(b['name'])
        unique_players[tid] = len(names)
    winner = max(team_ids, key=lambda t: unique_players[t])
    awards['speedrunner'] = _award(team_name_map, winner, unique_players[winner], f"{unique_players[winner]} unique players rostered")

    # ── 14. Snail: Fewest unique players used ────────────────────────
    winner = min(team_ids, key=lambda t: unique_players[t])
    awards['snail'] = _award(team_name_map, winner, unique_players[winner], f"Only {unique_players[winner]} unique players rostered")

    # ── 15. Sniper: Highest single-week bench player score ───────────
    # (Best bench explosion — proxy for "found a diamond")
    best_bench = {}
    for tid, ts in team_stats.items():
        hw = ts.get('highest_bench_week')
        best_bench[tid] = hw['points'] if hw else 0
    winner = max(team_ids, key=lambda t: best_bench[t])
    if best_bench[winner] > 0:
        hw = team_stats[winner].get('highest_bench_week', {})
        awards['sniper'] = _award(
            team_name_map, winner, round(best_bench[winner], 1),
            f"{hw.get('name', '?')} scored {round(best_bench[winner], 1)} pts on their bench"
        )

    # ── 16. Draft King: Highest total points from top scorers ────────
    # Proxy: sum of top 3 scorers (drafted or otherwise)
    top3_total = {}
    for tid, ts in team_stats.items():
        top3_total[tid] = sum(p['points'] for p in ts.get('top_scorers', [])[:3])
    winner = max(team_ids, key=lambda t: top3_total[t])
    awards['draft_king'] = _award(team_name_map, winner, round(top3_total[winner], 1), f"Top 3 scorers combined: {round(top3_total[winner], 1)} pts")

    return awards


def _award(team_name_map, team_id, value, description):
    """Build a standardized award dict."""
    return {
        'team_id': team_id,
        'name': _tm(team_name_map, team_id),
        'value': value,
        'description': description,
    }


# ======================================================================
# Roster Strength Rankings — "If Everyone Played Optimally"
# ======================================================================

def _calculate_roster_rankings(team_stats, team_name_map):
    """
    Rank teams by optimal (ceiling) performance to show true roster strength.
    Compares actual standings vs "power rankings" based on optimal points.
    """
    if not team_stats:
        return []

    rankings = []
    for tid, ts in team_stats.items():
        opt_total = ts.get('total_optimal_points', 0)
        actual_total = ts.get('total_points', 0)
        weeks = len(ts.get('weekly_data', []))
        opt_avg = round(opt_total / weeks, 2) if weeks else 0
        actual_avg = round(actual_total / weeks, 2) if weeks else 0
        efficiency = round((actual_total / opt_total) * 100, 1) if opt_total > 0 else 0

        rankings.append({
            'team_id': tid,
            'name': _tm(team_name_map, tid),
            'optimal_total': round(opt_total, 2),
            'actual_total': round(actual_total, 2),
            'optimal_avg': opt_avg,
            'actual_avg': actual_avg,
            'efficiency': efficiency,
            'actual_wins': ts.get('actual_wins', 0),
            'actual_losses': ts.get('actual_losses', 0),
            'optimal_wins': ts.get('optimal_vs_actual_wins', 0),
            'optimal_losses': ts.get('optimal_vs_actual_losses', 0),
        })

    # Sort by optimal total (true roster power)
    rankings.sort(key=lambda r: r['optimal_total'], reverse=True)

    # Add power rank and standing comparison
    # Get actual standings order
    actual_order = sorted(rankings, key=lambda r: (r['actual_wins'], r['actual_total']), reverse=True)
    actual_rank_map = {r['team_id']: idx + 1 for idx, r in enumerate(actual_order)}

    for idx, r in enumerate(rankings):
        r['power_rank'] = idx + 1
        r['actual_rank'] = actual_rank_map[r['team_id']]
        r['rank_diff'] = r['actual_rank'] - r['power_rank']  # positive = overperforming

    return rankings
