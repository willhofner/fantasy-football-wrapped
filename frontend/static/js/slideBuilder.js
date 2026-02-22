/* ===== SLIDE BUILDER ===== */

// Global slides array
let slides = [];
let wrappedData = null;

/**
 * Main function to build all slides from wrapped data
 */
async function buildSlides(data) {
    wrappedData = data;
    slides = [];
    
    const league = data.league_context;
    
    // 1. Welcome (suspense)
    slides.push({
        id: 'welcome',
        class: SLIDE_CLASSES.WELCOME,
        content: `
            <div class="slide-emoji">🏈</div>
            <div class="suspense-text">Your ${setupState.currentYear} Fantasy Season...</div>
        `
    });

    // 2. Welcome Reveal
    slides.push({
        id: 'welcome-reveal',
        class: SLIDE_CLASSES.WELCOME,
        content: `
            <div class="slide-emoji">🏈</div>
            <div class="slide-title">Your</div>
            <div class="slide-big-number">${setupState.currentYear}</div>
            <div class="slide-subtitle">Fantasy Football Season, Unwrapped</div>
            <div class="slide-detail">${data.team_name}</div>
        `
    });

    // 3. Total Points (suspense)
    slides.push({
        id: 'points',
        class: SLIDE_CLASSES.POINTS,
        content: `
            <div class="slide-emoji">📊</div>
            <div class="suspense-text">This season, you scored...</div>
        `
    });

    // 4. Total Points Reveal (with top scorers, avg, high/low weeks)
    const topScorersHtml = await buildTopScorersHtml(data.top_scorers);
    const highWeek = data.highest_week;
    const lowWeek = data.lowest_week;
    
    slides.push({
        id: 'points-reveal',
        class: SLIDE_CLASSES.POINTS_REVEAL,
        content: `
            <div class="slide-emoji">📊</div>
            <div class="reveal-content">
                <div class="slide-big-number">${formatNumber(data.overview.total_points)}</div>
                <div class="slide-subtitle">total points</div>
                <div class="top-scorers-row">${topScorersHtml}</div>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-label">Avg Per Week</div>
                        <div class="stat-value">${data.overview.avg_points_per_week}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Best Week</div>
                        <div class="stat-value">${highWeek?.score || '-'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">vs ${highWeek ? getOpponentName(highWeek.opponent_id, data.team_names) : '-'}</div>
                        <div class="stat-value">${highWeek?.won ? '✅ W' : '❌ L'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Worst Week</div>
                        <div class="stat-value">${lowWeek?.score || '-'}</div>
                    </div>
                </div>
            </div>
        `
    });

    // 5. Record (suspense)
    slides.push({
        id: 'record',
        class: SLIDE_CLASSES.RECORD,
        content: `
            <div class="slide-emoji">🏆</div>
            <div class="suspense-text">Your final record was...</div>
        `
    });

    // 6. Record Reveal (with standing)
    const standing = data.overview.standing;
    const teamCount = league.team_count;
    
    slides.push({
        id: 'record-reveal',
        class: SLIDE_CLASSES.RECORD_REVEAL,
        content: `
            <div class="slide-emoji">🏆</div>
            <div class="reveal-content">
                <div class="record-display">
                    <div>
                        <div class="record-number">${data.records.actual.wins}</div>
                        <div class="record-label">Wins</div>
                    </div>
                    <div class="record-separator">-</div>
                    <div>
                        <div class="record-number">${data.records.actual.losses}</div>
                        <div class="record-label">Losses</div>
                    </div>
                </div>
                <div class="slide-subtitle">You finished ${ordinalSuffix(standing)} out of ${teamCount} teams</div>
            </div>
        `
    });

    // 7. Optimal Record (suspense)
    slides.push({
        id: 'optimal',
        class: SLIDE_CLASSES.OPTIMAL,
        content: `
            <div class="slide-emoji">🤔</div>
            <div class="suspense-text">But if you had started your perfect lineup every week...</div>
        `
    });

    // 8. Optimal Record Reveal
    const optWins = data.records.optimal_vs_actual.wins;
    const optLosses = data.records.optimal_vs_actual.losses;
    const winDiff = data.records.win_difference;
    
    let winDiffClass = 'neutral';
    let winDiffText = 'Your record matched your potential!';
    if (winDiff > 0) {
        winDiffClass = 'negative';
        winDiffText = `You left ${winDiff} win${winDiff > 1 ? 's' : ''} on the table 😬`;
    } else if (winDiff < 0) {
        winDiffClass = 'positive';
        winDiffText = `You exceeded your optimal by ${Math.abs(winDiff)} win${Math.abs(winDiff) > 1 ? 's' : ''}! 🍀`;
    }

    slides.push({
        id: 'optimal-reveal',
        class: SLIDE_CLASSES.OPTIMAL_REVEAL,
        content: `
            <div class="slide-emoji">🤔</div>
            <div class="reveal-content">
                <div class="record-display">
                    <div>
                        <div class="record-number">${optWins}</div>
                        <div class="record-label">Wins</div>
                    </div>
                    <div class="record-separator">-</div>
                    <div>
                        <div class="record-number">${optLosses}</div>
                        <div class="record-label">Losses</div>
                    </div>
                </div>
                <div class="win-diff ${winDiffClass}">${winDiffText}</div>
            </div>
        `
    });

    // 9. Points Left on Bench (suspense)
    slides.push({
        id: 'bench',
        class: SLIDE_CLASSES.BENCH,
        content: `
            <div class="slide-emoji">🤡</div>
            <div class="suspense-text">Your dumbass coaching decisions cost you...</div>
        `
    });

    // 10. Points Left on Bench Reveal
    slides.push({
        id: 'bench-reveal',
        class: SLIDE_CLASSES.BENCH_REVEAL,
        content: `
            <div class="slide-emoji">🤡</div>
            <div class="reveal-content">
                <div class="slide-big-number">${formatNumber(data.overview.total_points_lost)}</div>
                <div class="slide-subtitle">points on the year</div>
                <div class="slide-detail">
                    With your optimal lineup each week, you would have scored 
                    <strong>${formatNumber(data.overview.total_optimal_points)}</strong> points
                </div>
                <div class="slide-detail">${data.overview.total_errors} lineup mistakes across the season</div>
            </div>
        `
    });

    // 11-12. Most Slept On (suspense + reveal)
    if (data.most_slept_on) {
        slides.push({
            id: 'slept-on',
            class: SLIDE_CLASSES.SLEPT_ON,
            content: `
                <div class="slide-emoji">😴</div>
                <div class="suspense-text">Your most slept on player was...</div>
            `
        });

        const sleptOnImg = await getPlayerHeadshot(data.most_slept_on.name);
        slides.push({
            id: 'slept-on-reveal',
            class: SLIDE_CLASSES.SLEPT_ON_REVEAL,
            content: `
                <div class="reveal-content">
                    <div class="player-card">
                        <img class="player-headshot" 
                             src="${sleptOnImg || getPlaceholderImage(data.most_slept_on.name)}" 
                             alt="${data.most_slept_on.name}"
                             onerror="this.src='${getPlaceholderImage(data.most_slept_on.name)}'">
                        <div class="player-name">${data.most_slept_on.name}</div>
                        <div class="player-stat">Benched ${data.most_slept_on.times_benched} time${data.most_slept_on.times_benched > 1 ? 's' : ''} when he would have outscored a starter</div>
                    </div>
                    <div class="slide-detail">${formatNumber(data.most_slept_on.points_missed)} points left on your bench</div>
                </div>
            `
        });
    }

    // 13-14. Most Overrated (suspense + reveal)
    if (data.most_overrated) {
        slides.push({
            id: 'overrated',
            class: SLIDE_CLASSES.OVERRATED,
            content: `
                <div class="slide-emoji">📉</div>
                <div class="suspense-text">Your most overrated player was...</div>
            `
        });

        const overratedImg = await getPlayerHeadshot(data.most_overrated.name);
        slides.push({
            id: 'overrated-reveal',
            class: SLIDE_CLASSES.OVERRATED_REVEAL,
            content: `
                <div class="reveal-content">
                    <div class="player-card">
                        <img class="player-headshot" 
                             src="${overratedImg || getPlaceholderImage(data.most_overrated.name)}" 
                             alt="${data.most_overrated.name}"
                             onerror="this.src='${getPlaceholderImage(data.most_overrated.name)}'">
                        <div class="player-name">${data.most_overrated.name}</div>
                        <div class="player-stat">Started ${data.most_overrated.times_started} time${data.most_overrated.times_started > 1 ? 's' : ''} when you shouldn't have</div>
                    </div>
                    <div class="slide-detail">Only scored ${formatNumber(data.most_overrated.points_from_starts)} points in those starts</div>
                </div>
            `
        });
    }

    // 15-16. Perfect Weeks (suspense + reveal)
    slides.push({
        id: 'perfect',
        class: SLIDE_CLASSES.PERFECT,
        content: `
            <div class="slide-emoji">✨</div>
            <div class="suspense-text">You set the perfect lineup...</div>
        `
    });

    const perfectCount = data.overview.perfect_week_count;
    const perfectEmoji = perfectCount === 0 ? '💀' : '✨';
    const perfectSubtitle = perfectCount === 0 ? 'times... not once!' : 
                            perfectCount === 1 ? 'time this season' : 'times this season';
    
    let perfectWeeksHtml = '';
    if (data.overview.perfect_weeks?.length > 0) {
        perfectWeeksHtml = '<div class="weeks-list">';
        data.overview.perfect_weeks.forEach(week => {
            perfectWeeksHtml += `<span class="week-badge" onclick="showWeekDetail(${week})">Week ${week}</span>`;
        });
        perfectWeeksHtml += '</div>';
        perfectWeeksHtml += '<div class="slide-detail" style="margin-top: 15px;">Click a week to see your lineup</div>';
    }

    slides.push({
        id: 'perfect-reveal',
        class: SLIDE_CLASSES.PERFECT_REVEAL,
        content: `
            <div class="slide-emoji">${perfectEmoji}</div>
            <div class="reveal-content">
                <div class="slide-big-number">${perfectCount}</div>
                <div class="slide-subtitle">${perfectSubtitle}</div>
                ${perfectWeeksHtml}
            </div>
        `
    });

    // 17-18. Lucky Break (suspense + reveal)
    if (data.lucky_break) {
        slides.push({
            id: 'lucky',
            class: SLIDE_CLASSES.LUCKY,
            content: `
                <div class="slide-emoji">🍀</div>
                <div class="suspense-text">Your luckiest win of the season...</div>
            `
        });

        const luckyOpp = getOpponentName(data.lucky_break.opponent_id, data.team_names);
        const zerosHtml = data.lucky_break.opp_zeros > 0 ? 
            `<div class="zeros-badge">Your opponent had ${data.lucky_break.opp_zeros} player${data.lucky_break.opp_zeros > 1 ? 's' : ''} score 0 points</div>` : '';
        
        slides.push({
            id: 'lucky-reveal',
            class: SLIDE_CLASSES.LUCKY_REVEAL,
            content: `
                <div class="slide-emoji">🍀</div>
                <div class="reveal-content">
                    <div class="slide-title">Week ${data.lucky_break.week}</div>
                    <div class="matchup-display">
                        <div class="matchup-scores">
                            <div class="matchup-team">
                                <div class="matchup-score">${data.lucky_break.my_score}</div>
                                <div class="matchup-name">You</div>
                            </div>
                            <div class="matchup-vs">vs</div>
                            <div class="matchup-team">
                                <div class="matchup-score">${data.lucky_break.opp_score}</div>
                                <div class="matchup-name">${luckyOpp}</div>
                            </div>
                        </div>
                        <div class="matchup-result win">WIN</div>
                        ${zerosHtml}
                    </div>
                    <div class="slide-subtitle">Your lowest scoring win of the season</div>
                </div>
            `
        });
    }

    // 19-20. Tough Luck (suspense + reveal)
    if (data.tough_luck) {
        slides.push({
            id: 'tough',
            class: SLIDE_CLASSES.TOUGH,
            content: `
                <div class="slide-emoji">😢</div>
                <div class="suspense-text">Your most heartbreaking loss...</div>
            `
        });

        const toughOpp = getOpponentName(data.tough_luck.opponent_id, data.team_names);
        slides.push({
            id: 'tough-reveal',
            class: SLIDE_CLASSES.TOUGH_REVEAL,
            content: `
                <div class="slide-emoji">😢</div>
                <div class="reveal-content">
                    <div class="slide-title">Week ${data.tough_luck.week}</div>
                    <div class="matchup-display">
                        <div class="matchup-scores">
                            <div class="matchup-team">
                                <div class="matchup-score">${data.tough_luck.my_score}</div>
                                <div class="matchup-name">You</div>
                            </div>
                            <div class="matchup-vs">vs</div>
                            <div class="matchup-team">
                                <div class="matchup-score">${data.tough_luck.opp_score}</div>
                                <div class="matchup-name">${toughOpp}</div>
                            </div>
                        </div>
                        <div class="matchup-result loss">LOSS</div>
                    </div>
                    <div class="slide-subtitle">Your highest scoring loss of the season</div>
                </div>
            `
        });
    }

    // 21-22. Breakout Performance (suspense + reveal)
    if (data.highest_scorer_week) {
        slides.push({
            id: 'breakout',
            class: SLIDE_CLASSES.BREAKOUT,
            content: `
                <div class="slide-emoji">🚀</div>
                <div class="suspense-text">Your single best player performance...</div>
            `
        });

        const breakoutImg = await getPlayerHeadshot(data.highest_scorer_week.name);
        const breakoutOpp = getOpponentName(data.highest_scorer_week.opponent_id, data.team_names);
        const breakoutResult = data.highest_scorer_week.won ? 
            '<span class="matchup-result win">WIN</span>' : 
            '<span class="matchup-result loss">LOSS</span>';

        slides.push({
            id: 'breakout-reveal',
            class: SLIDE_CLASSES.BREAKOUT_REVEAL,
            content: `
                <div class="reveal-content">
                    <div class="slide-title">Week ${data.highest_scorer_week.week}</div>
                    <div class="player-card">
                        <img class="player-headshot" 
                             src="${breakoutImg || getPlaceholderImage(data.highest_scorer_week.name)}" 
                             alt="${data.highest_scorer_week.name}"
                             onerror="this.src='${getPlaceholderImage(data.highest_scorer_week.name)}'">
                        <div class="player-name">${data.highest_scorer_week.name}</div>
                        <div class="player-stat">${data.highest_scorer_week.points} points</div>
                    </div>
                    <div class="matchup-display">
                        <div class="matchup-scores">
                            <div class="matchup-team">
                                <div class="matchup-score">${data.highest_scorer_week.my_score}</div>
                                <div class="matchup-name">You</div>
                            </div>
                            <div class="matchup-vs">vs</div>
                            <div class="matchup-team">
                                <div class="matchup-score">${data.highest_scorer_week.opp_score}</div>
                                <div class="matchup-name">${breakoutOpp}</div>
                            </div>
                        </div>
                        ${breakoutResult}
                    </div>
                </div>
            `
        });
    }

    // 23-24. Wasted Potential (suspense + reveal)
    if (data.highest_bench_week) {
        slides.push({
            id: 'wasted',
            class: SLIDE_CLASSES.WASTED,
            content: `
                <div class="slide-emoji">💔</div>
                <div class="suspense-text">Your biggest wasted potential...</div>
            `
        });

        const wastedImg = await getPlayerHeadshot(data.highest_bench_week.name);
        const wastedOpp = getOpponentName(data.highest_bench_week.opponent_id, data.team_names);
        
        let wastedOutcome = '';
        if (data.highest_bench_week.won_anyway) {
            wastedOutcome = `<div class="slide-detail">You won anyway, but imagine the margin!</div>`;
        } else if (data.highest_bench_week.would_have_won) {
            wastedOutcome = `<div class="slide-detail" style="color: #ff6b6b;">If you had started him, you would have WON 😭</div>`;
        } else if (data.highest_bench_week.would_have_won === false) {
            wastedOutcome = `<div class="slide-detail">Wouldn't have mattered - you still would have lost</div>`;
        }

        slides.push({
            id: 'wasted-reveal',
            class: SLIDE_CLASSES.WASTED_REVEAL,
            content: `
                <div class="reveal-content">
                    <div class="slide-title">Week ${data.highest_bench_week.week} - On Your Bench</div>
                    <div class="player-card">
                        <img class="player-headshot" 
                             src="${wastedImg || getPlaceholderImage(data.highest_bench_week.name)}" 
                             alt="${data.highest_bench_week.name}"
                             onerror="this.src='${getPlaceholderImage(data.highest_bench_week.name)}'">
                        <div class="player-name">${data.highest_bench_week.name}</div>
                        <div class="player-stat">${data.highest_bench_week.points} points on your bench</div>
                    </div>
                    <div class="matchup-display">
                        <div class="matchup-scores">
                            <div class="matchup-team">
                                <div class="matchup-score">${data.highest_bench_week.my_score}</div>
                                <div class="matchup-name">You</div>
                            </div>
                            <div class="matchup-vs">vs</div>
                            <div class="matchup-team">
                                <div class="matchup-score">${data.highest_bench_week.opp_score}</div>
                                <div class="matchup-name">${wastedOpp}</div>
                            </div>
                        </div>
                        <div class="matchup-result ${data.highest_bench_week.won_anyway ? 'win' : 'loss'}">
                            ${data.highest_bench_week.won_anyway ? 'WIN' : 'LOSS'}
                        </div>
                    </div>
                    ${wastedOutcome}
                </div>
            `
        });
    }

    // 25. Manager Ranking (suspense)
    slides.push({
        id: 'ranking',
        class: SLIDE_CLASSES.RANKING,
        content: `
            <div class="slide-emoji">📋</div>
            <div class="suspense-text">As a manager, you ranked...</div>
        `
    });

    // 26. Manager Ranking Reveal
    const rank = data.overview.error_rank;
    const totalTeams = league.team_count;
    let rankComment = '';
    if (rank === 1) {
        rankComment = '🏆 Best manager in the league!';
    } else if (rank === 2) {
        rankComment = '🥈 So close to the top!';
    } else if (rank === 3) {
        rankComment = '🥉 Top 3 manager!';
    } else if (rank <= Math.ceil(totalTeams / 2)) {
        rankComment = '👍 Upper half of the league';
    } else if (rank === totalTeams) {
        rankComment = '🤡 Worst manager in the league... yikes';
    } else {
        rankComment = '📈 Room for improvement next year';
    }

    slides.push({
        id: 'ranking-reveal',
        class: SLIDE_CLASSES.RANKING,
        content: `
            <div class="slide-emoji">📋</div>
            <div class="reveal-content">
                <div class="slide-big-number">#${rank}</div>
                <div class="slide-subtitle">out of ${totalTeams} managers</div>
                <div class="slide-detail">${rankComment}</div>
                <div class="slide-detail" style="margin-top: 10px; opacity: 0.7;">Based on lineup decisions (fewest errors = best)</div>
            </div>
        `
    });

    // 27. Advanced Stats — Consistency & Clutch
    const adv = data.advanced_stats || {};
    const consistency = adv.consistency || {};
    const clutch = adv.clutch_factor || {};
    const streaks = adv.streaks || {};
    const whatIf = adv.what_if || {};
    const benchNarr = adv.bench_narratives || {};
    const posIQ = adv.position_iq || {};
    const extreme = adv.extreme_moments || {};

    if (Object.keys(consistency).length > 0 || Object.keys(clutch).length > 0) {
        slides.push({
            id: 'advanced-stats',
            class: SLIDE_CLASSES.OPTIMAL,
            content: `
                <div class="slide-emoji">📈</div>
                <div class="slide-title">Deep Dive: Your Season Profile</div>
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="stat-box">
                        <div class="stat-label">Consistency</div>
                        <div class="stat-value">${consistency.std_dev || '—'}</div>
                        <div class="stat-sublabel">std dev (lower = steadier)</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Boom / Bust</div>
                        <div class="stat-value">${consistency.boom_count || 0} / ${consistency.bust_count || 0}</div>
                        <div class="stat-sublabel">weeks >120 / <80 pts</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Close Games</div>
                        <div class="stat-value">${clutch.close_game_record || '—'}</div>
                        <div class="stat-sublabel">decided by <10 pts</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Blowouts</div>
                        <div class="stat-value">${clutch.blowout_record || '—'}</div>
                        <div class="stat-sublabel">decided by 30+ pts</div>
                    </div>
                </div>
                ${clutch.closest_game ? `<div class="slide-detail" style="margin-top:12px;">Closest game: Week ${clutch.closest_game.week} — ${clutch.closest_game.won ? 'won' : 'lost'} by ${clutch.closest_game.margin} pts vs ${clutch.closest_game.opponent}</div>` : ''}
            `
        });
    }

    // 27b. Streaks & Momentum
    if (Object.keys(streaks).length > 0) {
        const ws = streaks.longest_win_streak || {};
        const ls = streaks.longest_loss_streak || {};
        const peak = streaks.peak_3week || {};
        const worst3 = streaks.worst_3week || {};

        slides.push({
            id: 'streaks',
            class: SLIDE_CLASSES.RECORD,
            content: `
                <div class="slide-emoji">🔥</div>
                <div class="slide-title">Streaks & Momentum</div>
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="stat-box">
                        <div class="stat-label">Best Win Streak</div>
                        <div class="stat-value">${ws.length || 0} games</div>
                        <div class="stat-sublabel">${ws.length > 0 ? `Weeks ${ws.start}-${ws.end}` : 'No streak'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Worst Losing Streak</div>
                        <div class="stat-value">${ls.length || 0} games</div>
                        <div class="stat-sublabel">${ls.length > 0 ? `Weeks ${ls.start}-${ls.end}` : 'No streak'}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Peak 3-Week</div>
                        <div class="stat-value">${peak.total || '—'} pts</div>
                        <div class="stat-sublabel">${peak.weeks?.length ? `Weeks ${peak.weeks.join(', ')}` : ''}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Rock Bottom 3-Week</div>
                        <div class="stat-value">${worst3.total || '—'} pts</div>
                        <div class="stat-sublabel">${worst3.weeks?.length ? `Weeks ${worst3.weeks.join(', ')}` : ''}</div>
                    </div>
                </div>
            `
        });
    }

    // 27c. What-If: The Alternate Universe
    if (Object.keys(whatIf).length > 0) {
        slides.push({
            id: 'what-if',
            class: SLIDE_CLASSES.BENCH,
            content: `
                <div class="slide-emoji">🌀</div>
                <div class="slide-title">The Alternate Universe</div>
                <div class="reveal-content">
                    <div class="record-display">
                        <div>
                            <div class="record-number" style="font-size: 2rem;">${whatIf.actual_record || '—'}</div>
                            <div class="record-label">Actual</div>
                        </div>
                        <div class="record-separator">→</div>
                        <div>
                            <div class="record-number" style="font-size: 2rem;">${whatIf.optimal_record || '—'}</div>
                            <div class="record-label">If Optimal</div>
                        </div>
                    </div>
                    <div class="stats-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
                        <div class="stat-box">
                            <div class="stat-label">Wins Left on Bench</div>
                            <div class="stat-value" style="color: #ff6b6b;">${whatIf.games_cost_by_errors || 0}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">One-Player-Away</div>
                            <div class="stat-value" style="color: #ffa500;">${whatIf.one_player_away_losses || 0}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Lost to Errors</div>
                            <div class="stat-value" style="color: #ff6b6b;">${whatIf.games_lost_to_errors || 0}</div>
                        </div>
                    </div>
                    ${whatIf.one_player_away_losses > 0 ? `<div class="slide-detail" style="margin-top:12px;">${whatIf.one_player_away_losses} loss${whatIf.one_player_away_losses > 1 ? 'es' : ''} where ONE roster swap would have won the game</div>` : ''}
                </div>
            `
        });
    }

    // 27d. Extreme Moments
    if (extreme.biggest_win || extreme.worst_loss) {
        let extremeHtml = '<div class="slide-emoji">⚡</div><div class="slide-title">Extreme Moments</div>';
        if (extreme.biggest_win) {
            extremeHtml += `
                <div class="matchup-display" style="margin-bottom: 15px;">
                    <div class="slide-subtitle" style="margin-bottom: 5px;">Biggest Win — Week ${extreme.biggest_win.week}</div>
                    <div class="matchup-scores">
                        <div class="matchup-team">
                            <div class="matchup-score">${extreme.biggest_win.my_score}</div>
                            <div class="matchup-name">You</div>
                        </div>
                        <div class="matchup-vs">vs</div>
                        <div class="matchup-team">
                            <div class="matchup-score">${extreme.biggest_win.opp_score}</div>
                            <div class="matchup-name">${extreme.biggest_win.opponent}</div>
                        </div>
                    </div>
                    <div class="matchup-result win">+${extreme.biggest_win.margin}</div>
                </div>`;
        }
        if (extreme.worst_loss) {
            extremeHtml += `
                <div class="matchup-display">
                    <div class="slide-subtitle" style="margin-bottom: 5px;">Worst Loss — Week ${extreme.worst_loss.week}</div>
                    <div class="matchup-scores">
                        <div class="matchup-team">
                            <div class="matchup-score">${extreme.worst_loss.my_score}</div>
                            <div class="matchup-name">You</div>
                        </div>
                        <div class="matchup-vs">vs</div>
                        <div class="matchup-team">
                            <div class="matchup-score">${extreme.worst_loss.opp_score}</div>
                            <div class="matchup-name">${extreme.worst_loss.opponent}</div>
                        </div>
                    </div>
                    <div class="matchup-result loss">${extreme.worst_loss.margin}</div>
                </div>`;
        }
        slides.push({ id: 'extreme-moments', class: SLIDE_CLASSES.BENCH_REVEAL, content: extremeHtml });
    }

    // 27e. Position IQ
    if (posIQ.weakest_position) {
        const posBars = Object.entries(posIQ.errors_by_position || {})
            .sort((a, b) => b[1] - a[1])
            .map(([pos, count]) => {
                const pct = Math.min(count * 10, 100);
                return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                    <span style="width:30px;font-weight:bold;">${pos}</span>
                    <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:4px;height:20px;">
                        <div style="width:${pct}%;background:linear-gradient(90deg,#ff6b6b,#ffa500);border-radius:4px;height:100%;min-width:${count > 0 ? '20px' : '0'};display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:0.75rem;">${count}</div>
                    </div>
                </div>`;
            }).join('');

        slides.push({
            id: 'position-iq',
            class: SLIDE_CLASSES.OPTIMAL,
            content: `
                <div class="slide-emoji">🧩</div>
                <div class="slide-title">Position IQ</div>
                <div class="slide-detail" style="margin-bottom: 12px;">Your weakest position: <strong>${posIQ.weakest_position}</strong> (${posIQ.weakness_count} errors)</div>
                <div style="max-width: 350px; margin: 0 auto;">${posBars}</div>
                ${posIQ.flex_points_lost > 0 ? `<div class="slide-detail" style="margin-top:12px;">FLEX mistakes cost you <strong>${posIQ.flex_points_lost}</strong> points${posIQ.games_cost_by_flex > 0 ? ` and <strong>${posIQ.games_cost_by_flex}</strong> game${posIQ.games_cost_by_flex > 1 ? 's' : ''}` : ''}</div>` : ''}
            `
        });
    }

    // ─── Phase 2 Slides ────────────────────────────────────────────

    // Head-to-Head Rivalries
    const h2h = adv.head_to_head || {};
    if (h2h.nemesis || h2h.victim) {
        let h2hHtml = '<div class="slide-emoji">⚔️</div><div class="slide-title">Head-to-Head Rivalries</div>';

        if (h2h.nemesis) {
            h2hHtml += `
                <div class="stat-box" style="margin: 8px 0; padding: 12px;">
                    <div class="stat-label">Your Nemesis</div>
                    <div class="stat-value" style="color: #ff6b6b;">${h2h.nemesis.name}</div>
                    <div class="stat-sublabel">${h2h.nemesis.record} against you</div>
                </div>`;
        }
        if (h2h.victim) {
            h2hHtml += `
                <div class="stat-box" style="margin: 8px 0; padding: 12px;">
                    <div class="stat-label">Your Victim</div>
                    <div class="stat-value" style="color: #22c55e;">${h2h.victim.name}</div>
                    <div class="stat-sublabel">${h2h.victim.record} in your favor</div>
                </div>`;
        }

        h2hHtml += `
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
                <div class="stat-box">
                    <div class="stat-label">vs Top 3 Teams</div>
                    <div class="stat-value">${h2h.vs_top_3?.record || '—'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">vs Bottom 3 Teams</div>
                    <div class="stat-value">${h2h.vs_bottom_3?.record || '—'}</div>
                </div>
            </div>`;

        slides.push({ id: 'head-to-head', class: SLIDE_CLASSES.RECORD, content: h2hHtml });
    }

    // Manager Archetype
    const archetype = adv.manager_archetype || {};
    if (archetype.archetype) {
        const archetypeEmojis = {
            'The Sleeper': '🧠', 'The Gambler': '🎰', 'The Steady Eddie': '🪨',
            'The Wildcard': '🃏', 'The Lucky Bastard': '🍀', 'The Snakebitten': '🐍',
            'The Tinkerer': '🔧', 'The Closer': '🧊', 'The Competitor': '💪',
        };
        const archEmoji = archetypeEmojis[archetype.archetype] || '🏷️';

        let supportingHtml = '';
        if (archetype.supporting_stats?.length) {
            supportingHtml = archetype.supporting_stats.map(s =>
                `<div class="slide-detail" style="margin: 4px 0;">${s}</div>`
            ).join('');
        }

        slides.push({
            id: 'archetype',
            class: SLIDE_CLASSES.SUPERLATIVES,
            content: `
                <div class="slide-emoji">${archEmoji}</div>
                <div class="slide-title">Your Manager Archetype</div>
                <div class="slide-big-number" style="font-size: 2.5rem; margin: 15px 0;">${archetype.archetype}</div>
                <div class="slide-subtitle">${archetype.description}</div>
                ${supportingHtml}
            `
        });
    }

    // Season Splits — First Half vs Second Half
    const splits = adv.season_splits || {};
    if (splits.first_half && splits.second_half) {
        const trendEmojis = { improving: '📈', fading: '📉', consistent: '➡️' };
        const trendColors = { improving: '#22c55e', fading: '#ff6b6b', consistent: '#60a5fa' };

        slides.push({
            id: 'season-splits',
            class: SLIDE_CLASSES.RECORD,
            content: `
                <div class="slide-emoji">${trendEmojis[splits.trend] || '📊'}</div>
                <div class="slide-title">Season Trajectory</div>
                <div class="reveal-content">
                    <div class="record-display">
                        <div>
                            <div class="record-number" style="font-size: 2rem;">${splits.first_half.avg_ppg}</div>
                            <div class="record-label">First Half PPG</div>
                            <div class="record-label" style="opacity: 0.6;">${splits.first_half.record}</div>
                        </div>
                        <div class="record-separator">→</div>
                        <div>
                            <div class="record-number" style="font-size: 2rem; color: ${trendColors[splits.trend] || '#fff'};">${splits.second_half.avg_ppg}</div>
                            <div class="record-label">Second Half PPG</div>
                            <div class="record-label" style="opacity: 0.6;">${splits.second_half.record}</div>
                        </div>
                    </div>
                    <div class="slide-detail" style="margin-top: 15px;">${splits.narrative}</div>
                </div>
            `
        });
    }

    // Roster Tenure — Iron Man, Crown Jewel, Flash in Pan
    const tenure = adv.roster_tenure || {};
    if (tenure.iron_man || tenure.crown_jewel) {
        let tenureHtml = '<div class="slide-emoji">👑</div><div class="slide-title">Roster Stories</div>';

        if (tenure.iron_man) {
            tenureHtml += `
                <div class="stat-box" style="margin: 8px 0; padding: 12px;">
                    <div class="stat-label">🦾 Iron Man</div>
                    <div class="stat-value">${tenure.iron_man.player}</div>
                    <div class="stat-sublabel">${tenure.iron_man.starts}/${tenure.iron_man.total_weeks} starts — ${tenure.iron_man.total_points} pts</div>
                </div>`;
        }
        if (tenure.crown_jewel) {
            tenureHtml += `
                <div class="stat-box" style="margin: 8px 0; padding: 12px;">
                    <div class="stat-label">💎 Crown Jewel</div>
                    <div class="stat-value">${tenure.crown_jewel.player}</div>
                    <div class="stat-sublabel">${tenure.crown_jewel.points} pts — Rank #${tenure.crown_jewel.league_rank} in the league</div>
                </div>`;
        }
        if (tenure.flash_in_pan?.length > 0) {
            const flashList = tenure.flash_in_pan.slice(0, 3).map(f =>
                `<div style="margin: 2px 0; font-size: 0.85rem;">${f.player} — Week ${f.week}, ${f.points} pts</div>`
            ).join('');
            tenureHtml += `
                <div class="stat-box" style="margin: 8px 0; padding: 12px;">
                    <div class="stat-label">⚡ Flash in the Pan</div>
                    <div class="stat-sublabel">Started once, never again</div>
                    ${flashList}
                </div>`;
        }
        tenureHtml += `<div class="slide-detail" style="margin-top: 8px;">${tenure.unique_starters || 0} unique starters used this season</div>`;

        slides.push({ id: 'roster-tenure', class: SLIDE_CLASSES.POINTS, content: tenureHtml });
    }

    // Coach vs GM Rating Split
    const cvg = adv.coach_vs_gm || {};
    if (cvg.coach && cvg.gm) {
        const gradeColors = {
            'A+': '#22c55e', 'A': '#22c55e', 'B': '#60a5fa', 'C': '#fbbf24', 'D': '#f97316', 'F': '#ff6b6b',
        };

        slides.push({
            id: 'coach-vs-gm',
            class: SLIDE_CLASSES.OPTIMAL,
            content: `
                <div class="slide-emoji">📊</div>
                <div class="slide-title">Coach vs GM Rating</div>
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 16px; margin: 15px 0;">
                    <div class="stat-box" style="padding: 16px;">
                        <div class="stat-label">🎯 Coach Rating</div>
                        <div class="stat-value" style="font-size: 3rem; color: ${gradeColors[cvg.coach.grade] || '#fff'};">${cvg.coach.grade}</div>
                        <div class="stat-sublabel">${cvg.coach.accuracy_pct}% lineup accuracy</div>
                        <div class="stat-sublabel">${cvg.coach.total_errors} errors, ${cvg.coach.perfect_weeks} perfect weeks</div>
                    </div>
                    <div class="stat-box" style="padding: 16px;">
                        <div class="stat-label">📋 GM Rating</div>
                        <div class="stat-value" style="font-size: 3rem; color: ${gradeColors[cvg.gm.grade] || '#fff'};">${cvg.gm.grade}</div>
                        <div class="stat-sublabel">Roster ceiling rank: #${cvg.gm.roster_ceiling_rank}</div>
                        <div class="stat-sublabel">${cvg.gm.optimal_total} optimal pts</div>
                    </div>
                </div>
                <div class="slide-detail" style="margin-top: 10px;">${cvg.narrative}</div>
            `
        });
    }

    // Roster Strength Rankings (League-Wide)
    const rosterRankings = league.roster_rankings || [];
    if (rosterRankings.length > 0) {
        const teamId = data.team_id;
        const rankingsHtml = rosterRankings.map(r => {
            const isMe = r.team_id === teamId;
            const diffStr = r.rank_diff > 0 ? `<span style="color:#22c55e;">↑${r.rank_diff}</span>` :
                            r.rank_diff < 0 ? `<span style="color:#ff6b6b;">↓${Math.abs(r.rank_diff)}</span>` :
                            '<span style="opacity:0.5;">—</span>';
            return `
                <div style="display:grid;grid-template-columns:2rem 1fr 3.5rem 3.5rem 3rem;gap:6px;align-items:center;padding:6px 8px;border-radius:6px;${isMe ? 'background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.3);' : 'background:rgba(255,255,255,0.03);'}">
                    <span style="font-weight:bold;opacity:0.7;">#${r.power_rank}</span>
                    <span${isMe ? ' style="color:#ffd700;font-weight:bold;"' : ''}>${r.name}${isMe ? ' ⭐' : ''}</span>
                    <span style="text-align:right;font-size:0.85rem;">${r.optimal_avg}</span>
                    <span style="text-align:right;font-size:0.85rem;">${r.efficiency}%</span>
                    <span style="text-align:right;font-size:0.85rem;">${diffStr}</span>
                </div>`;
        }).join('');

        slides.push({
            id: 'roster-rankings',
            class: SLIDE_CLASSES.RANKING,
            content: `
                <div class="slide-emoji">💪</div>
                <div class="slide-title">Roster Strength Rankings</div>
                <div class="slide-detail" style="margin-bottom: 8px;">If everyone played optimal lineups every week</div>
                <div style="display:grid;grid-template-columns:2rem 1fr 3.5rem 3.5rem 3rem;gap:6px;padding:0 8px;font-size:0.7rem;opacity:0.5;margin-bottom:4px;">
                    <span>#</span><span>Team</span><span style="text-align:right;">Opt PPG</span><span style="text-align:right;">Eff%</span><span style="text-align:right;">vs Actual</span>
                </div>
                <div style="max-height: 55vh; overflow-y: auto;">
                    ${rankingsHtml}
                </div>
            `
        });
    }

    // ─── End Phase 2 Slides ──────────────────────────────────────────

    // 28. League Superlatives — Full 16-award system
    const awards = league.awards || {};
    const awardDefs = {
        best_manager: { icon: '🧠', title: 'Best Manager' },
        worst_manager: { icon: '🤡', title: 'Worst Manager' },
        clown: { icon: '🤡', title: 'The Clown' },
        blue_chip: { icon: '💎', title: 'Blue Chip' },
        skull: { icon: '💀', title: 'Walking L' },
        dice_roll: { icon: '🎲', title: 'Dice Roll' },
        top_heavy: { icon: '⚖️', title: 'Top Heavy' },
        bench_warmer: { icon: '🪑', title: 'Bench Warmer' },
        heartbreak: { icon: '💔', title: 'Heartbreak Kid' },
        perfect_club: { icon: '✨', title: 'Perfect Week Club' },
        lucky: { icon: '🍀', title: 'Lucky Charm' },
        unlucky: { icon: '😢', title: 'Unlucky' },
        speedrunner: { icon: '🏃', title: 'Speedrunner' },
        snail: { icon: '🐌', title: 'The Snail' },
        sniper: { icon: '🎯', title: 'The Sniper' },
        draft_king: { icon: '👑', title: 'Draft King' },
    };

    // Build award cards HTML — show all earned awards
    let awardsHtml = '';
    for (const [awardId, def] of Object.entries(awardDefs)) {
        const awardData = awards[awardId];
        if (!awardData) continue;
        const isMe = awardData.team_id === data.team_id;
        awardsHtml += `
            <div class="superlative-card${isMe ? ' superlative-card--mine' : ''}">
                <div class="superlative-title">${def.icon} ${def.title}</div>
                <div class="superlative-name">${awardData.name}${isMe ? ' (You!)' : ''}</div>
                <div class="superlative-stat">${awardData.description}</div>
            </div>
        `;
    }

    slides.push({
        id: 'superlatives',
        class: SLIDE_CLASSES.SUPERLATIVES,
        content: `
            <div class="slide-emoji">🏅</div>
            <div class="slide-title">League Awards</div>
            <div class="superlative-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); max-height: 65vh; overflow-y: auto; padding: 4px;">
                ${awardsHtml}
            </div>
        `
    });

    // 28. Summary
    slides.push({
        id: 'summary',
        class: SLIDE_CLASSES.SUMMARY,
        content: `
            <div class="slide-emoji">📱</div>
            <div class="slide-title">${data.team_name}'s ${setupState.currentYear} Season</div>
            <div class="summary-card">
                <div class="summary-row">
                    <span class="summary-label">Record</span>
                    <span class="summary-value">${data.records.actual.wins}-${data.records.actual.losses}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Standing</span>
                    <span class="summary-value">${ordinalSuffix(standing)} place</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Total Points</span>
                    <span class="summary-value">${formatNumber(data.overview.total_points)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Points Left on Bench</span>
                    <span class="summary-value">${formatNumber(data.overview.total_points_lost)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Perfect Lineups</span>
                    <span class="summary-value">${perfectCount}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Manager Rank</span>
                    <span class="summary-value">#${rank} of ${totalTeams}</span>
                </div>
            </div>
            <div class="slide-detail" style="margin-top: 25px; opacity: 0; animation: fadeIn 0.5s ease-out 1s forwards;">
                Thanks for using Fantasy Wrapped! 🏈
            </div>
        `
    });

    return slides;
}

/**
 * Build top scorers HTML with player images
 */
async function buildTopScorersHtml(topScorers) {
    if (!topScorers || topScorers.length === 0) return '';
    
    let html = '';
    for (const player of topScorers) {
        const img = await getPlayerHeadshot(player.name);
        html += `
            <div class="top-scorer-item">
                <img class="player-headshot-small" 
                     src="${img || getPlaceholderImage(player.name)}" 
                     alt="${player.name}"
                     onerror="this.src='${getPlaceholderImage(player.name)}'">
                <div class="top-scorer-name">${player.name}</div>
                <div class="top-scorer-points">${formatNumber(player.points)} pts</div>
            </div>
        `;
    }
    return html;
}

/**
 * Wrapper function called from setup.js
 */
async function buildAndRenderSlides(data) {
    log('Building slides...');
    await buildSlides(data);
    log('Slides built:', slides.length);
    renderSlides();
}