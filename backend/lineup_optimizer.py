"""
Optimal Lineup Calculator
Determines the best possible lineup from available players
"""

def calculate_optimal_lineup(starters, bench):
    """
    Calculate optimal lineup from starters and bench players
    
    Args:
        starters: List of starter player dicts
        bench: List of bench player dicts
        
    Returns:
        List of tuples (position, player_dict) representing optimal lineup
    """
    all_players = starters + bench
    
    # Separate by position
    qbs = sorted([p for p in all_players if p['actual_position'] == 'QB'], 
                 key=lambda x: x['points'], reverse=True)
    rbs = sorted([p for p in all_players if p['actual_position'] == 'RB'], 
                 key=lambda x: x['points'], reverse=True)
    wrs = sorted([p for p in all_players if p['actual_position'] == 'WR'], 
                 key=lambda x: x['points'], reverse=True)
    tes = sorted([p for p in all_players if p['actual_position'] == 'TE'], 
                 key=lambda x: x['points'], reverse=True)
    dsts = sorted([p for p in all_players if p['actual_position'] == 'D/ST'], 
                  key=lambda x: x['points'], reverse=True)
    ks = sorted([p for p in all_players if p['actual_position'] == 'K'], 
                key=lambda x: x['points'], reverse=True)
    
    optimal = []
    used = set()
    
    # 1 QB
    if qbs:
        optimal.append(('QB', qbs[0]))
        used.add(qbs[0]['name'])
    
    # 2 RBs
    for i in range(min(2, len(rbs))):
        optimal.append(('RB', rbs[i]))
        used.add(rbs[i]['name'])
    
    # 2 WRs
    for i in range(min(2, len(wrs))):
        optimal.append(('WR', wrs[i]))
        used.add(wrs[i]['name'])
    
    # 1 TE
    if tes:
        optimal.append(('TE', tes[0]))
        used.add(tes[0]['name'])
    
    # 1 FLEX (best remaining RB/WR/TE)
    flex = []
    for rb in rbs:
        if rb['name'] not in used:
            flex.append(rb)
    for wr in wrs:
        if wr['name'] not in used:
            flex.append(wr)
    for te in tes:
        if te['name'] not in used:
            flex.append(te)
    
    flex.sort(key=lambda x: x['points'], reverse=True)
    if flex:
        optimal.append(('FLEX', flex[0]))
        used.add(flex[0]['name'])
    
    # 1 D/ST
    if dsts:
        optimal.append(('D/ST', dsts[0]))
        used.add(dsts[0]['name'])
    
    # 1 K
    if ks:
        optimal.append(('K', ks[0]))
        used.add(ks[0]['name'])
    
    return optimal


def get_optimal_total(optimal_lineup):
    """Calculate total points from optimal lineup"""
    return sum(player[1]['points'] for player in optimal_lineup)


def get_optimal_player_names(optimal_lineup):
    """Get set of player names in optimal lineup"""
    return set(player[1]['name'] for player in optimal_lineup)
