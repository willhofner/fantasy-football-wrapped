"""
Waiver Wire Analyzer
Derives transactions from week-over-week roster diffs.
ESPN's transaction history requires auth, so we reconstruct it from roster snapshots.
"""
from collections import defaultdict
from espn_api import POSITION_MAP, PLAYER_POSITION_MAP, fetch_league_data, get_team_name_map


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
                'teams': [team_map.get(t, f'Team {t}') for t in jm_teams],
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
            'team': team_map.get(best_pickup['to_team'], 'Unknown'),
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
            'team': team_map.get(diamond['to_team'], 'Unknown'),
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
            'team': team_map.get(tinkerer_tid, 'Unknown'),
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
            'team': team_map.get(saf_tid, 'Unknown'),
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
            'dropped_by': team_map.get(graveyard['from_team'], 'Unknown'),
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
                    'team': team_map.get(txn['from_team'], 'Unknown'),
                    'add_week': add_txn['week'],
                    'drop_week': txn['week'],
                })

    awards['flipped_count'] = len(flipped)
    if flipped:
        awards['flipped_example'] = flipped[0]

    return awards


def _build_weekly_summary(transactions, team_map):
    """Group transactions by week for the frontend."""
    by_week = defaultdict(list)
    for txn in transactions:
        by_week[txn['week']].append({
            'player_name': txn['player_name'],
            'position': txn['position'],
            'type': txn['type'],
            'to_team': team_map.get(txn['to_team'], None) if txn['to_team'] else None,
            'from_team': team_map.get(txn['from_team'], None) if txn['from_team'] else None,
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
            'team_name': team_map.get(tid, f'Team {tid}'),
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
        'transactions': [{
            'player_name': t['player_name'],
            'position': t['position'],
            'type': t['type'],
            'week': t['week'],
            'to_team': team_map.get(t['to_team']) if t['to_team'] else None,
            'from_team': team_map.get(t['from_team']) if t['from_team'] else None,
            'to_team_id': t['to_team'],
            'from_team_id': t['from_team'],
            'points_after': t.get('points_after', 0),
        } for t in transactions],
    }, None
