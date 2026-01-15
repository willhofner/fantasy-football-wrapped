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

    // 27. League Superlatives
    slides.push({
        id: 'superlatives',
        class: SLIDE_CLASSES.SUPERLATIVES,
        content: `
            <div class="slide-emoji">🏅</div>
            <div class="slide-title">League Superlatives</div>
            <div class="superlative-grid">
                <div class="superlative-card">
                    <div class="superlative-title">🧠 Best Manager</div>
                    <div class="superlative-name">${league.best_manager?.name || '-'}</div>
                    <div class="superlative-stat">Only ${league.best_manager?.errors || 0} errors</div>
                </div>
                <div class="superlative-card">
                    <div class="superlative-title">🤡 Worst Manager</div>
                    <div class="superlative-name">${league.worst_manager?.name || '-'}</div>
                    <div class="superlative-stat">${league.worst_manager?.errors || 0} errors</div>
                </div>
                <div class="superlative-card">
                    <div class="superlative-title">🍀 Luckiest Team</div>
                    <div class="superlative-name">${league.luckiest_team?.name || '-'}</div>
                    <div class="superlative-stat">${league.luckiest_team?.win_difference > 0 ? '+' + league.luckiest_team.win_difference + ' wins over expected' : 'Performed as expected'}</div>
                </div>
                <div class="superlative-card">
                    <div class="superlative-title">😢 Unluckiest Team</div>
                    <div class="superlative-name">${league.biggest_underperformer?.name || '-'}</div>
                    <div class="superlative-stat">${league.biggest_underperformer?.win_difference > 0 ? 'Should have won ' + league.biggest_underperformer.win_difference + ' more' : 'Performed as expected'}</div>
                </div>
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