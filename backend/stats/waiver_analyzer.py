"""
Waiver Wire Analyzer
Derives transactions from week-over-week roster diffs.
ESPN's transaction history requires auth, so we reconstruct it from roster snapshots.
"""
from collections import defaultdict
from espn_api import POSITION_MAP, PLAYER_POSITION_MAP, fetch_league_data, get_team_name_map


def _tm(team_map, team_id, field='manager_name', default=None):
    """Extract name from team map (handles dict or string values)."""
    info = team_map.get(team_id)
    if info is None:
        return default or f"Team {team_id}"
    if isinstance(info, dict):
        return info.get(field, default or f"Team {team_id}")
    return info


def _extract_roster_players(team_data, week):
    """Extract player IDs and info from a team's roster for a given week."""
    players = {}
    roster = team_data.get('roster', {}).get('entries', [])
    if not roster:
        # Try matchup roster
        roster = team_data.get('rosterForCurrentScoringPeriod', {}).get('entries', [])
        if not roster:
            roster = team_data.get('rosterForMatchupPeriod', {}).get('entries', [])

    for entry in roster:
        ppe = entry.get('playerPoolEntry', {})
        player = ppe.get('player', {})
        pid = player.get('id')
        if not pid:
            continue

        # Get points for this week
        points = ppe.get('appliedStatTotal', 0)
        if points == 0:
            for stat in player.get('stats', []):
                if stat.get('scoringPeriodId') == week and stat.get('statSourceId') == 0:
                    points = stat.get('appliedTotal', 0)
                    break

        slot_id = entry.get('lineupSlotId', 20)
        pos_id = player.get('defaultPositionId', 0)

        players[pid] = {
            'player_id': pid,
            'name': player.get('fullName', 'Unknown'),
            'position': PLAYER_POSITION_MAP.get(pos_id, 'Unknown'),
            'slot_id': slot_id,
            'started': slot_id != 20 and slot_id != 21,  # not bench, not IR
            'points': round(points, 2),
            'acquisition_type': entry.get('acquisitionType', -1),
            'acquisition_date': entry.get('acquisitionDate', 0),
        }

    return players


def _fetch_all_rosters(league_id, year, start_week, end_week):
    """
    Fetch rosters for all teams for each week.
    Returns: {week: {team_id: {player_id: player_info}}}
    """
    weekly_rosters = {}

    for week in range(start_week, end_week + 1):
        data, error = fetch_league_data(league_id, year, week)
        if error or not data:
            print(f"[Waivers] Error fetching week {week}: {error}")
            continue

        teams = data.get('teams', [])
        week_data = {}

        # Try to get roster from schedule (matchup data) first
        schedule = data.get('schedule', [])
        matchup_rosters = {}
        for matchup in schedule:
            if matchup.get('matchupPeriodId') != week:
                continue
            for side in ('home', 'away'):
                team_entry = matchup.get(side, {})
                if not team_entry:
                    continue
                tid = team_entry.get('teamId')
                if tid:
                    roster_key = 'rosterForCurrentScoringPeriod'
                    if roster_key not in team_entry:
                        roster_key = 'rosterForMatchupPeriod'
                    roster_entries = team_entry.get(roster_key, {}).get('entries', [])
                    if roster_entries:
                        matchup_rosters[tid] = team_entry

        for team in teams:
            tid = team.get('id')
            # Prefer matchup roster (has per-week data), fall back to team roster
            if tid in matchup_rosters:
                players = _extract_roster_players(matchup_rosters[tid], week)
            else:
                players = _extract_roster_players(team, week)
            week_data[tid] = players

        weekly_rosters[week] = week_data

    return weekly_rosters


def _derive_transactions(weekly_rosters, start_week, end_week, draft_player_ids=None):
    """
    Derive transactions from week-over-week roster diffs.
    Returns list of transaction dicts sorted by week.
    """
    transactions = []
    draft_players = draft_player_ids or set()

    for week in range(start_week + 1, end_week + 1):
        prev_week = week - 1
        if prev_week not in weekly_rosters or week not in weekly_rosters:
            continue

        prev = weekly_rosters[prev_week]
        curr = weekly_rosters[week]

        # Build player-to-team maps for both weeks
        prev_map = {}  # {player_id: team_id}
        curr_map = {}
        for tid, players in prev.items():
            for pid in players:
                prev_map[pid] = tid
        for tid, players in curr.items():
            for pid in players:
                curr_map[pid] = tid

        # Find acquisitions: player on team in curr but NOT on that team in prev
        for tid, players in curr.items():
            for pid, pinfo in players.items():
                prev_tid = prev_map.get(pid)
                if prev_tid == tid:
                    continue  # Same team, no transaction
                if prev_tid is None and pid in draft_players and week == start_week + 1:
                    continue  # Draft pick still on team (week 1 → 2 transition)

                txn = {
                    'week': week,
                    'player_id': pid,
                    'player_name': pinfo['name'],
                    'position': pinfo['position'],
                    'to_team': tid,
                    'from_team': prev_tid,  # None = free agent/waiver
                    'type': 'trade' if prev_tid is not None else 'add',
                    'points_after': 0,  # Will be calculated later
                }
                transactions.append(txn)

        # Find drops: player on team in prev but NOT on any team in curr
        for tid, players in prev.items():
            for pid, pinfo in players.items():
                if pid not in curr_map:
                    txn = {
                        'week': week,
                        'player_id': pid,
                        'player_name': pinfo['name'],
                        'position': pinfo['position'],
                        'to_team': None,
                        'from_team': tid,
                        'type': 'drop',
                        'points_after': 0,
                    }
                    transactions.append(txn)

    return transactions


def _calc_player_season_points(weekly_rosters, player_id):
    """Calculate total points a player scored across all weeks."""
    total = 0
    for week_data in weekly_rosters.values():
        for team_players in week_data.values():
            if player_id in team_players:
                total += team_players[player_id]['points']
                break
    return round(total, 2)


def _calc_points_after_pickup(weekly_rosters, player_id, pickup_week, end_week):
    """Calculate total points a player scored from pickup week onward."""
    total = 0
    for week in range(pickup_week, end_week + 1):
        if week not in weekly_rosters:
            continue
        for team_players in weekly_rosters[week].values():
            if player_id in team_players:
                total += team_players[player_id]['points']
                break
    return round(total, 2)


def _calc_points_week_after_drop(weekly_rosters, player_id, drop_week, end_week):
    """Calculate points scored in the week immediately after being dropped."""
    next_week = drop_week + 1
    if next_week not in weekly_rosters:
        return 0
    for team_players in weekly_rosters[next_week].values():
        if player_id in team_players:
            return team_players[player_id]['points']
    return 0


def _compute_awards(transactions, weekly_rosters, team_map, start_week, end_week):
    """Compute fun waiver awards from transaction data."""
    awards = {}

    # Track player journey: which teams rostered each player
    player_teams = defaultdict(set)
    for week_data in weekly_rosters.values():
        for tid, players in week_data.items():
            for pid in players:
                player_teams[pid].add(tid)

    # Journeyman: player rostered by most different teams
    if player_teams:
        journeyman_pid = max(player_teams, key=lambda pid: len(player_teams[pid]))
        jm_teams = player_teams[journeyman_pid]
        # Find player name
        jm_name = None
        for week_data in weekly_rosters.values():
            for tid, players in week_data.items():
                if journeyman_pid in players:
                    jm_name = players[journeyman_pid]['name']
                    break
            if jm_name:
                break
        if len(jm_teams) >= 2:
            awards['journeyman'] = {
                'player_name': jm_name or 'Unknown',
                'player_id': journeyman_pid,
                'team_count': len(jm_teams),
                'teams': [_tm(team_map, t) for t in jm_teams],
            }

    # Filter to adds only (not drops or same-team)
    adds = [t for t in transactions if t['type'] == 'add']
    drops = [t for t in transactions if t['type'] == 'drop']

    # Waiver Hawk: best single-week pickup (most points in pickup week)
    best_pickup = None
    best_pickup_pts = 0
    for txn in adds:
        week = txn['week']
        pid = txn['player_id']
        if week in weekly_rosters:
            for team_players in weekly_rosters[week].values():
                if pid in team_players:
                    pts = team_players[pid]['points']
                    if pts > best_pickup_pts:
                        best_pickup_pts = pts
                        best_pickup = txn
                    break

    if best_pickup:
        awards['waiver_hawk'] = {
            'player_name': best_pickup['player_name'],
            'position': best_pickup['position'],
            'week': best_pickup['week'],
            'points': best_pickup_pts,
            'team': _tm(team_map, best_pickup['to_team']),
        }

    # Diamond in the Rough: highest season total from waiver pickup
    pickup_season_totals = []
    for txn in adds:
        pts_after = _calc_points_after_pickup(
            weekly_rosters, txn['player_id'], txn['week'], end_week
        )
        pickup_season_totals.append({
            **txn,
            'points_after': pts_after,
        })

    if pickup_season_totals:
        diamond = max(pickup_season_totals, key=lambda x: x['points_after'])
        awards['diamond_in_the_rough'] = {
            'player_name': diamond['player_name'],
            'position': diamond['position'],
            'week_acquired': diamond['week'],
            'points_after_pickup': diamond['points_after'],
            'team': _tm(team_map, diamond['to_team']),
        }

    # Per-team stats
    team_adds = defaultdict(int)
    team_drops = defaultdict(int)
    for txn in adds:
        team_adds[txn['to_team']] += 1
    for txn in drops:
        team_drops[txn['from_team']] += 1

    # The Tinkerer: most roster moves
    if team_adds:
        tinkerer_tid = max(team_adds, key=lambda t: team_adds[t] + team_drops.get(t, 0))
        total_moves = team_adds[tinkerer_tid] + team_drops.get(tinkerer_tid, 0)
        awards['tinkerer'] = {
            'team': _tm(team_map, tinkerer_tid),
            'team_id': tinkerer_tid,
            'total_moves': total_moves,
            'adds': team_adds[tinkerer_tid],
            'drops': team_drops.get(tinkerer_tid, 0),
        }

    # Set and Forget: fewest moves
    all_tids = set()
    for week_data in weekly_rosters.values():
        all_tids.update(week_data.keys())
    if all_tids:
        saf_tid = min(all_tids, key=lambda t: team_adds.get(t, 0) + team_drops.get(t, 0))
        total_moves = team_adds.get(saf_tid, 0) + team_drops.get(saf_tid, 0)
        awards['set_and_forget'] = {
            'team': _tm(team_map, saf_tid),
            'team_id': saf_tid,
            'total_moves': total_moves,
        }

    # Revolving Door: position with most adds
    pos_adds = defaultdict(int)
    for txn in adds:
        pos_adds[txn['position']] += 1
    if pos_adds:
        revolving_pos = max(pos_adds, key=pos_adds.get)
        awards['revolving_door'] = {
            'position': revolving_pos,
            'add_count': pos_adds[revolving_pos],
        }

    # Graveyard: players dropped right before their best remaining game
    graveyard_candidates = []
    for txn in drops:
        pts = _calc_points_week_after_drop(weekly_rosters, txn['player_id'], txn['week'], end_week)
        if pts > 15:
            graveyard_candidates.append({
                **txn,
                'points_next_week': pts,
            })
    if graveyard_candidates:
        graveyard = max(graveyard_candidates, key=lambda x: x['points_next_week'])
        awards['graveyard'] = {
            'player_name': graveyard['player_name'],
            'position': graveyard['position'],
            'dropped_by': _tm(team_map, graveyard['from_team']),
            'week_dropped': graveyard['week'],
            'points_next_week': graveyard['points_next_week'],
        }

    # Flipped: players picked up and dropped within 1 week
    flipped = []
    add_lookup = {}
    for txn in adds:
        key = (txn['player_id'], txn['to_team'])
        add_lookup[key] = txn

    for txn in drops:
        key = (txn['player_id'], txn['from_team'])
        if key in add_lookup:
            add_txn = add_lookup[key]
            if txn['week'] - add_txn['week'] <= 1:
                flipped.append({
                    'player_name': txn['player_name'],
                    'position': txn['position'],
                    'team': _tm(team_map, txn['from_team']),
                    'add_week': add_txn['week'],
                    'drop_week': txn['week'],
                })

    awards['flipped_count'] = len(flipped)
    if flipped:
        awards['flipped_example'] = flipped[0]

    return awards


def _pair_transactions(transactions, team_map):
    """
    Pair add/drop transactions into swaps when a team has both in the same week.
    Position-matches where possible, then pairs by order.
    Returns list of paired transaction dicts.
    """
    # Group by (team_id, week)
    grouped = defaultdict(lambda: {'adds': [], 'drops': []})
    for txn in transactions:
        if txn['type'] == 'add':
            grouped[(txn['to_team'], txn['week'])]['adds'].append(txn)
        elif txn['type'] == 'drop':
            grouped[(txn['from_team'], txn['week'])]['drops'].append(txn)

    paired = []

    for (team_id, week), group in sorted(grouped.items(), key=lambda x: x[0][1]):
        adds = list(group['adds'])
        drops = list(group['drops'])
        team_name = _tm(team_map, team_id)

        matched_add_idxs = set()
        matched_drop_idxs = set()

        # Pass 1: match by position
        for ai, add in enumerate(adds):
            for di, drop in enumerate(drops):
                if di in matched_drop_idxs:
                    continue
                if add['position'] == drop['position']:
                    paired.append({
                        'type': 'swap',
                        'week': week,
                        'team_id': team_id,
                        'team_name': team_name,
                        'added': {
                            'player_name': add['player_name'],
                            'position': add['position'],
                            'points_after': add.get('points_after', 0),
                        },
                        'dropped': {
                            'player_name': drop['player_name'],
                            'position': drop['position'],
                        },
                    })
                    matched_add_idxs.add(ai)
                    matched_drop_idxs.add(di)
                    break

        # Pass 2: pair remaining by order
        remaining_adds = [a for i, a in enumerate(adds) if i not in matched_add_idxs]
        remaining_drops = [d for i, d in enumerate(drops) if i not in matched_drop_idxs]

        pair_count = min(len(remaining_adds), len(remaining_drops))
        for i in range(pair_count):
            add = remaining_adds[i]
            drop = remaining_drops[i]
            paired.append({
                'type': 'swap',
                'week': week,
                'team_id': team_id,
                'team_name': team_name,
                'added': {
                    'player_name': add['player_name'],
                    'position': add['position'],
                    'points_after': add.get('points_after', 0),
                },
                'dropped': {
                    'player_name': drop['player_name'],
                    'position': drop['position'],
                },
            })

        # Standalone adds (no matching drop)
        for add in remaining_adds[pair_count:]:
            paired.append({
                'type': 'add',
                'week': week,
                'team_id': team_id,
                'team_name': team_name,
                'added': {
                    'player_name': add['player_name'],
                    'position': add['position'],
                    'points_after': add.get('points_after', 0),
                },
            })

        # Standalone drops (no matching add)
        for drop in remaining_drops[pair_count:]:
            paired.append({
                'type': 'drop',
                'week': week,
                'team_id': team_id,
                'team_name': team_name,
                'dropped': {
                    'player_name': drop['player_name'],
                    'position': drop['position'],
                },
            })

    return paired


def _calc_points_after_drop(weekly_rosters, player_id, drop_week, end_week):
    """Calculate total points a player scored from the week after drop through end."""
    total = 0
    for week in range(drop_week + 1, end_week + 1):
        if week not in weekly_rosters:
            continue
        for team_players in weekly_rosters[week].values():
            if player_id in team_players:
                total += team_players[player_id]['points']
                break
    return round(total, 2)


def _compute_advanced_stats(transactions, weekly_rosters, team_map, start_week, end_week):
    """Compute 11 advanced waiver stats for deeper analysis."""
    stats = {}
    adds = [t for t in transactions if t['type'] == 'add']
    drops = [t for t in transactions if t['type'] == 'drop']

    # 1. waiver_mvp: waiver pickup with most total season points
    if adds:
        best = None
        best_pts = 0
        for txn in adds:
            pts = _calc_player_season_points(weekly_rosters, txn['player_id'])
            if pts > best_pts:
                best_pts = pts
                best = txn
        if best:
            stats['waiver_mvp'] = {
                'player_name': best['player_name'],
                'position': best['position'],
                'total_points': best_pts,
                'team': _tm(team_map, best['to_team']),
                'team_id': best['to_team'],
                'week_acquired': best['week'],
            }

    # 2. most_active_week: week with most total transactions
    week_counts = defaultdict(int)
    for txn in transactions:
        week_counts[txn['week']] += 1
    if week_counts:
        peak_week = max(week_counts, key=week_counts.get)
        stats['most_active_week'] = {
            'week': peak_week,
            'count': week_counts[peak_week],
        }

    # 3. best_pickup_roi: highest points per week after pickup
    if adds:
        best_roi = None
        best_ppw = 0
        for txn in adds:
            pts = txn.get('points_after', 0)
            weeks_held = max(1, end_week - txn['week'] + 1)
            ppw = round(pts / weeks_held, 2)
            if ppw > best_ppw:
                best_ppw = ppw
                best_roi = txn
        if best_roi:
            stats['best_pickup_roi'] = {
                'player_name': best_roi['player_name'],
                'position': best_roi['position'],
                'ppw': best_ppw,
                'team': _tm(team_map, best_roi['to_team']),
                'team_id': best_roi['to_team'],
                'week_acquired': best_roi['week'],
            }

    # 4. dropped_too_early: players dropped who scored 50+ pts after
    dropped_too_early = []
    for txn in drops:
        pts_after = _calc_points_after_drop(weekly_rosters, txn['player_id'], txn['week'], end_week)
        if pts_after >= 50:
            # Find who picked them up next
            picked_up_by = None
            next_week = txn['week'] + 1
            if next_week in weekly_rosters:
                for tid, players in weekly_rosters[next_week].items():
                    if txn['player_id'] in players and tid != txn['from_team']:
                        picked_up_by = _tm(team_map, tid)
                        break
            dropped_too_early.append({
                'player_name': txn['player_name'],
                'position': txn['position'],
                'dropped_by': _tm(team_map, txn['from_team']),
                'dropped_by_id': txn['from_team'],
                'week_dropped': txn['week'],
                'points_after_drop': pts_after,
                'picked_up_by': picked_up_by,
            })
    dropped_too_early.sort(key=lambda x: -x['points_after_drop'])
    stats['dropped_too_early'] = dropped_too_early[:5]

    # 5. streaming_king: team with most D/ST + K adds
    streaming_counts = defaultdict(int)
    for txn in adds:
        if txn['position'] in ('D/ST', 'K'):
            streaming_counts[txn['to_team']] += 1
    if streaming_counts:
        king_tid = max(streaming_counts, key=streaming_counts.get)
        stats['streaming_king'] = {
            'team': _tm(team_map, king_tid),
            'team_id': king_tid,
            'count': streaming_counts[king_tid],
        }

    # 6. position_breakdown: adds per position league-wide
    pos_counts = defaultdict(int)
    for txn in adds:
        pos_counts[txn['position']] += 1
    stats['position_breakdown'] = dict(pos_counts)

    # 7. early_vs_late: first half vs second half transaction volume
    mid = (start_week + end_week) // 2
    early = sum(1 for t in transactions if t['week'] <= mid)
    late = sum(1 for t in transactions if t['week'] > mid)
    stats['early_vs_late'] = {
        'first_half': early,
        'second_half': late,
        'midpoint_week': mid,
    }

    # 8. longest_hold: waiver pickup held longest on same team
    # Track acquisition week per (player, team) from add transactions
    acquisitions = {}
    for txn in adds:
        key = (txn['player_id'], txn['to_team'])
        acquisitions[key] = txn['week']

    longest = None
    longest_weeks = 0
    for (pid, tid), acq_week in acquisitions.items():
        # Find last week this player was on this team
        last_week = acq_week
        for week in range(acq_week, end_week + 1):
            if week in weekly_rosters and tid in weekly_rosters[week]:
                if pid in weekly_rosters[week][tid]:
                    last_week = week
                else:
                    break
        held = last_week - acq_week + 1
        if held > longest_weeks:
            longest_weeks = held
            # Find player name
            pname = None
            for wd in weekly_rosters.values():
                if tid in wd and pid in wd[tid]:
                    pname = wd[tid][pid]['name']
                    break
            longest = {
                'player_name': pname or 'Unknown',
                'team': _tm(team_map, tid),
                'team_id': tid,
                'weeks_held': held,
                'acquired_week': acq_week,
            }
    if longest:
        stats['longest_hold'] = longest

    # 9. buyer_seller: net add/drop classification per team
    team_adds = defaultdict(int)
    team_drops = defaultdict(int)
    for txn in adds:
        team_adds[txn['to_team']] += 1
    for txn in drops:
        team_drops[txn['from_team']] += 1
    all_tids = set(team_adds.keys()) | set(team_drops.keys())
    buyer_seller = {}
    for tid in all_tids:
        a = team_adds.get(tid, 0)
        d = team_drops.get(tid, 0)
        net = a - d
        label = 'buyer' if net > 0 else ('seller' if net < 0 else 'neutral')
        buyer_seller[tid] = {
            'team': _tm(team_map, tid),
            'adds': a,
            'drops': d,
            'net': net,
            'label': label,
        }
    stats['buyer_seller'] = buyer_seller

    # 10. hot_hand: team with most transactions in a single week
    team_week_counts = defaultdict(int)
    for txn in transactions:
        tid = txn['to_team'] if txn['type'] == 'add' else txn['from_team']
        if tid:
            team_week_counts[(tid, txn['week'])] += 1
    if team_week_counts:
        (hot_tid, hot_week) = max(team_week_counts, key=team_week_counts.get)
        stats['hot_hand'] = {
            'team': _tm(team_map, hot_tid),
            'team_id': hot_tid,
            'week': hot_week,
            'count': team_week_counts[(hot_tid, hot_week)],
        }

    # 11. waiver_wire_win_impact: skipped (requires team records not available here)
    # Frontend can correlate with wrapped data if needed
    stats['waiver_wire_win_impact'] = None

    # 12. regret_drops: dropped by team A, picked up by team B, scored 100+ after
    regret_drops = []
    for txn in drops:
        pts_after = _calc_points_after_drop(weekly_rosters, txn['player_id'], txn['week'], end_week)
        if pts_after < 100:
            continue
        # Find who picked them up
        picked_up_by = None
        picked_up_by_id = None
        for week in range(txn['week'] + 1, end_week + 1):
            if week not in weekly_rosters:
                continue
            for tid, players in weekly_rosters[week].items():
                if txn['player_id'] in players and tid != txn['from_team']:
                    picked_up_by = _tm(team_map, tid)
                    picked_up_by_id = tid
                    break
            if picked_up_by:
                break
        if picked_up_by:
            regret_drops.append({
                'player_name': txn['player_name'],
                'position': txn['position'],
                'dropped_by': _tm(team_map, txn['from_team']),
                'dropped_by_id': txn['from_team'],
                'week_dropped': txn['week'],
                'points_after_drop': pts_after,
                'picked_up_by': picked_up_by,
                'picked_up_by_id': picked_up_by_id,
            })
    regret_drops.sort(key=lambda x: -x['points_after_drop'])
    stats['regret_drops'] = regret_drops[:5]

    return stats


def _build_weekly_summary(transactions, team_map):
    """Group transactions by week for the frontend."""
    by_week = defaultdict(list)
    for txn in transactions:
        by_week[txn['week']].append({
            'player_name': txn['player_name'],
            'position': txn['position'],
            'type': txn['type'],
            'to_team': _tm(team_map, txn['to_team']) if txn['to_team'] else None,
            'from_team': _tm(team_map, txn['from_team']) if txn['from_team'] else None,
            'to_team_id': txn['to_team'],
            'from_team_id': txn['from_team'],
            'points_after': txn.get('points_after', 0),
        })
    return dict(by_week)


def _build_team_summary(transactions, team_map, weekly_rosters, end_week):
    """Build per-team transaction summaries."""
    team_stats = defaultdict(lambda: {'adds': [], 'drops': [], 'total_adds': 0, 'total_drops': 0})

    adds = [t for t in transactions if t['type'] == 'add']
    drops = [t for t in transactions if t['type'] == 'drop']

    for txn in adds:
        tid = txn['to_team']
        pts = _calc_points_after_pickup(weekly_rosters, txn['player_id'], txn['week'], end_week)
        team_stats[tid]['adds'].append({
            'player_name': txn['player_name'],
            'position': txn['position'],
            'week': txn['week'],
            'points_after': pts,
        })
        team_stats[tid]['total_adds'] += 1

    for txn in drops:
        tid = txn['from_team']
        team_stats[tid]['drops'].append({
            'player_name': txn['player_name'],
            'position': txn['position'],
            'week': txn['week'],
        })
        team_stats[tid]['total_drops'] += 1

    # Convert to serializable dict with team names
    result = {}
    for tid, stats in team_stats.items():
        result[tid] = {
            'team_name': _tm(team_map, tid),
            'total_adds': stats['total_adds'],
            'total_drops': stats['total_drops'],
            'total_moves': stats['total_adds'] + stats['total_drops'],
            'top_adds': sorted(stats['adds'], key=lambda x: -x['points_after'])[:5],
            'recent_drops': stats['drops'][-5:],
        }

    return result


def analyze_waivers(league_id, year, start_week=1, end_week=14):
    """
    Full waiver wire analysis for a league.
    Returns all transaction data, awards, and summaries.
    """
    print(f"[Waivers] Analyzing league {league_id}, {year}, weeks {start_week}-{end_week}")

    # Get team names
    team_map, error = get_team_name_map(league_id, year)
    if error:
        return None, f"Failed to get team names: {error}"

    # Fetch all rosters
    weekly_rosters = _fetch_all_rosters(league_id, year, start_week, end_week)
    if not weekly_rosters:
        return None, "Failed to fetch roster data"

    print(f"[Waivers] Fetched rosters for {len(weekly_rosters)} weeks")

    # Derive transactions
    transactions = _derive_transactions(weekly_rosters, start_week, end_week)
    print(f"[Waivers] Derived {len(transactions)} transactions")

    # Calculate points after pickup for adds
    for txn in transactions:
        if txn['type'] == 'add':
            txn['points_after'] = _calc_points_after_pickup(
                weekly_rosters, txn['player_id'], txn['week'], end_week
            )

    # Compute awards
    awards = _compute_awards(transactions, weekly_rosters, team_map, start_week, end_week)

    # Build weekly summary
    weekly_summary = _build_weekly_summary(transactions, team_map)

    # Build team summaries
    team_summary = _build_team_summary(transactions, team_map, weekly_rosters, end_week)

    # Pair transactions (swaps)
    paired = _pair_transactions(transactions, team_map)
    print(f"[Waivers] Paired into {len(paired)} entries ({sum(1 for p in paired if p['type'] == 'swap')} swaps)")

    # Compute advanced stats
    advanced = _compute_advanced_stats(transactions, weekly_rosters, team_map, start_week, end_week)
    print(f"[Waivers] Computed {len([k for k, v in advanced.items() if v])} advanced stats")

    # Aggregate stats
    total_adds = sum(1 for t in transactions if t['type'] == 'add')
    total_drops = sum(1 for t in transactions if t['type'] == 'drop')
    total_trades = sum(1 for t in transactions if t['type'] == 'trade')

    return {
        'team_map': team_map,
        'total_transactions': len(transactions),
        'total_adds': total_adds,
        'total_drops': total_drops,
        'total_trades': total_trades,
        'awards': awards,
        'by_week': weekly_summary,
        'by_team': team_summary,
        'paired_transactions': paired,
        'advanced_stats': advanced,
        'transactions': [{
            'player_name': t['player_name'],
            'position': t['position'],
            'type': t['type'],
            'week': t['week'],
            'to_team': _tm(team_map, t['to_team']) if t['to_team'] else None,
            'from_team': _tm(team_map, t['from_team']) if t['from_team'] else None,
            'to_team_id': t['to_team'],
            'from_team_id': t['from_team'],
            'points_after': t.get('points_after', 0),
        } for t in transactions],
    }, None
