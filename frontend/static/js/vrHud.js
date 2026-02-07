/**
 * ============================================================================
 * FANTASY WRAPPED - VR HUD EXPERIENCE
 * ============================================================================
 *
 * A futuristic VR headset-style interface for viewing Fantasy Wrapped data.
 * Same slide content and flow as the original experience, presented in a
 * floating holographic HUD aesthetic.
 *
 * ============================================================================
 */

/* ===== STATE ===== */

const VRHudState = {
    wrappedData: null,
    slides: [],
    currentIndex: 0,
    viewedSlides: new Set(),
    isActive: false
};

/* ===== DOM REFERENCES ===== */

let vrHudEl = null;
let vrContentEl = null;
let vrDotsEl = null;

/* ===== INITIALIZATION ===== */

/**
 * Initialize the VR HUD experience
 * @param {Object} wrappedData - Wrapped data from API
 */
async function initVRHud(wrappedData) {
    console.log('[VRHud] Initializing with data:', wrappedData);

    VRHudState.wrappedData = wrappedData;
    VRHudState.currentIndex = 0;
    VRHudState.viewedSlides = new Set();
    VRHudState.isActive = true;

    // Build slides
    await buildVRSlides(wrappedData);
    console.log('[VRHud] Built slides:', VRHudState.slides.length);

    // Create DOM structure
    createVRHudDOM();

    // Show the experience
    showVRHud();

    // Display first slide
    showVRSlide(0);
}

/**
 * Build all slides from wrapped data (same content as slideBuilder.js)
 */
async function buildVRSlides(data) {
    VRHudState.slides = [];
    const league = data.league_context;

    // 1. Welcome (suspense)
    VRHudState.slides.push({
        id: 'welcome',
        category: 'welcome',
        content: `
            <div class="vr-emoji">🏈</div>
            <div class="vr-suspense">Your ${setupState.currentYear} Fantasy Season...</div>
        `
    });

    // 2. Welcome Reveal
    VRHudState.slides.push({
        id: 'welcome-reveal',
        category: 'welcome',
        content: `
            <div class="vr-emoji vr-scale-in">🏈</div>
            <div class="vr-title vr-fade-in">Your</div>
            <div class="vr-big-number">${setupState.currentYear}</div>
            <div class="vr-subtitle vr-fade-in">Fantasy Football Season, Unwrapped</div>
            <div class="vr-detail vr-fade-in">${data.team_name}</div>
        `
    });

    // 3. Total Points (suspense)
    VRHudState.slides.push({
        id: 'points',
        category: 'points',
        content: `
            <div class="vr-emoji">📊</div>
            <div class="vr-suspense">This season, you scored...</div>
        `
    });

    // 4. Total Points Reveal
    const topScorersHtml = await buildVRTopScorersHtml(data.top_scorers);
    const highWeek = data.highest_week;
    const lowWeek = data.lowest_week;

    VRHudState.slides.push({
        id: 'points-reveal',
        category: 'points',
        content: `
            <div class="vr-emoji vr-scale-in">📊</div>
            <div class="vr-big-number">${formatNumber(data.overview.total_points)}</div>
            <div class="vr-subtitle">total points</div>
            <div class="vr-top-scorers">${topScorersHtml}</div>
            <div class="vr-stats-grid vr-fade-in">
                <div class="vr-stat-box">
                    <div class="vr-stat-label">Avg Per Week</div>
                    <div class="vr-stat-value">${data.overview.avg_points_per_week}</div>
                </div>
                <div class="vr-stat-box">
                    <div class="vr-stat-label">Best Week</div>
                    <div class="vr-stat-value">${highWeek?.score || '-'}</div>
                </div>
                <div class="vr-stat-box">
                    <div class="vr-stat-label">vs ${highWeek ? getOpponentName(highWeek.opponent_id, data.team_names) : '-'}</div>
                    <div class="vr-stat-value">${highWeek?.won ? '✅ W' : '❌ L'}</div>
                </div>
                <div class="vr-stat-box">
                    <div class="vr-stat-label">Worst Week</div>
                    <div class="vr-stat-value">${lowWeek?.score || '-'}</div>
                </div>
            </div>
        `
    });

    // 5. Record (suspense)
    VRHudState.slides.push({
        id: 'record',
        category: 'record',
        content: `
            <div class="vr-emoji">🏆</div>
            <div class="vr-suspense">Your final record was...</div>
        `
    });

    // 6. Record Reveal
    const standing = data.overview.standing;
    const teamCount = league.team_count;

    VRHudState.slides.push({
        id: 'record-reveal',
        category: 'record',
        content: `
            <div class="vr-emoji vr-scale-in">🏆</div>
            <div class="vr-record-display">
                <div>
                    <div class="vr-record-number">${data.records.actual.wins}</div>
                    <div class="vr-record-label">Wins</div>
                </div>
                <div class="vr-record-separator">-</div>
                <div>
                    <div class="vr-record-number">${data.records.actual.losses}</div>
                    <div class="vr-record-label">Losses</div>
                </div>
            </div>
            <div class="vr-subtitle vr-fade-in">You finished ${ordinalSuffix(standing)} out of ${teamCount} teams</div>
        `
    });

    // 7. Optimal Record (suspense)
    VRHudState.slides.push({
        id: 'optimal',
        category: 'optimal',
        content: `
            <div class="vr-emoji">🤔</div>
            <div class="vr-suspense">But if you had started your perfect lineup every week...</div>
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

    VRHudState.slides.push({
        id: 'optimal-reveal',
        category: 'optimal',
        content: `
            <div class="vr-emoji vr-scale-in">🤔</div>
            <div class="vr-record-display">
                <div>
                    <div class="vr-record-number">${optWins}</div>
                    <div class="vr-record-label">Wins</div>
                </div>
                <div class="vr-record-separator">-</div>
                <div>
                    <div class="vr-record-number">${optLosses}</div>
                    <div class="vr-record-label">Losses</div>
                </div>
            </div>
            <div class="vr-win-diff ${winDiffClass} vr-fade-in">${winDiffText}</div>
        `
    });

    // 9. Points Left on Bench (suspense)
    VRHudState.slides.push({
        id: 'bench',
        category: 'bench',
        content: `
            <div class="vr-emoji">🤡</div>
            <div class="vr-suspense">Your dumbass coaching decisions cost you...</div>
        `
    });

    // 10. Points Left on Bench Reveal
    VRHudState.slides.push({
        id: 'bench-reveal',
        category: 'bench',
        content: `
            <div class="vr-emoji vr-scale-in">🤡</div>
            <div class="vr-big-number">${formatNumber(data.overview.total_points_lost)}</div>
            <div class="vr-subtitle">points on the year</div>
            <div class="vr-detail vr-fade-in">
                With your optimal lineup each week, you would have scored
                <strong>${formatNumber(data.overview.total_optimal_points)}</strong> points
            </div>
            <div class="vr-detail vr-fade-in">${data.overview.total_errors} lineup mistakes across the season</div>
        `
    });

    // 11-12. Most Slept On
    if (data.most_slept_on) {
        VRHudState.slides.push({
            id: 'slept-on',
            category: 'players',
            content: `
                <div class="vr-emoji">😴</div>
                <div class="vr-suspense">Your most slept on player was...</div>
            `
        });

        const sleptOnImg = await getPlayerHeadshot(data.most_slept_on.name);
        VRHudState.slides.push({
            id: 'slept-on-reveal',
            category: 'players',
            content: `
                <div class="vr-card vr-player-card vr-scale-in">
                    <img class="vr-player-img"
                         src="${sleptOnImg || getPlaceholderImage(data.most_slept_on.name)}"
                         alt="${data.most_slept_on.name}"
                         onerror="this.src='${getPlaceholderImage(data.most_slept_on.name)}'">
                    <div class="vr-player-name">${data.most_slept_on.name}</div>
                    <div class="vr-player-stat">Benched ${data.most_slept_on.times_benched} time${data.most_slept_on.times_benched > 1 ? 's' : ''} when he would have outscored a starter</div>
                </div>
                <div class="vr-detail vr-fade-in">${formatNumber(data.most_slept_on.points_missed)} points left on your bench</div>
            `
        });
    }

    // 13-14. Most Overrated
    if (data.most_overrated) {
        VRHudState.slides.push({
            id: 'overrated',
            category: 'players',
            content: `
                <div class="vr-emoji">📉</div>
                <div class="vr-suspense">Your most overrated player was...</div>
            `
        });

        const overratedImg = await getPlayerHeadshot(data.most_overrated.name);
        VRHudState.slides.push({
            id: 'overrated-reveal',
            category: 'players',
            content: `
                <div class="vr-card vr-player-card vr-scale-in">
                    <img class="vr-player-img"
                         src="${overratedImg || getPlaceholderImage(data.most_overrated.name)}"
                         alt="${data.most_overrated.name}"
                         onerror="this.src='${getPlaceholderImage(data.most_overrated.name)}'">
                    <div class="vr-player-name">${data.most_overrated.name}</div>
                    <div class="vr-player-stat">Started ${data.most_overrated.times_started} time${data.most_overrated.times_started > 1 ? 's' : ''} when you shouldn't have</div>
                </div>
                <div class="vr-detail vr-fade-in">Only scored ${formatNumber(data.most_overrated.points_from_starts)} points in those starts</div>
            `
        });
    }

    // 15-16. Perfect Weeks
    VRHudState.slides.push({
        id: 'perfect',
        category: 'perfect',
        content: `
            <div class="vr-emoji">✨</div>
            <div class="vr-suspense">You set the perfect lineup...</div>
        `
    });

    const perfectCount = data.overview.perfect_week_count;
    const perfectEmoji = perfectCount === 0 ? '💀' : '✨';
    const perfectSubtitle = perfectCount === 0 ? 'times... not once!' :
        perfectCount === 1 ? 'time this season' : 'times this season';

    let perfectWeeksHtml = '';
    if (data.overview.perfect_weeks?.length > 0) {
        perfectWeeksHtml = '<div class="vr-weeks-list vr-fade-in">';
        data.overview.perfect_weeks.forEach(week => {
            perfectWeeksHtml += `<span class="vr-week-badge" onclick="showWeekDetail(${week})">Week ${week}</span>`;
        });
        perfectWeeksHtml += '</div>';
        perfectWeeksHtml += '<div class="vr-detail" style="margin-top: 15px;">Click a week to see your lineup</div>';
    }

    VRHudState.slides.push({
        id: 'perfect-reveal',
        category: 'perfect',
        content: `
            <div class="vr-emoji vr-scale-in">${perfectEmoji}</div>
            <div class="vr-big-number">${perfectCount}</div>
            <div class="vr-subtitle">${perfectSubtitle}</div>
            ${perfectWeeksHtml}
        `
    });

    // 17-18. Lucky Break
    if (data.lucky_break) {
        VRHudState.slides.push({
            id: 'lucky',
            category: 'luck',
            content: `
                <div class="vr-emoji">🍀</div>
                <div class="vr-suspense">Your luckiest win of the season...</div>
            `
        });

        const luckyOpp = getOpponentName(data.lucky_break.opponent_id, data.team_names);
        const zerosHtml = data.lucky_break.opp_zeros > 0 ?
            `<div class="vr-zeros-badge">Your opponent had ${data.lucky_break.opp_zeros} player${data.lucky_break.opp_zeros > 1 ? 's' : ''} score 0 points</div>` : '';

        VRHudState.slides.push({
            id: 'lucky-reveal',
            category: 'luck',
            content: `
                <div class="vr-emoji vr-scale-in">🍀</div>
                <div class="vr-title">Week ${data.lucky_break.week}</div>
                <div class="vr-matchup vr-fade-in">
                    <div class="vr-matchup-scores">
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.lucky_break.my_score}</div>
                            <div class="vr-matchup-name">You</div>
                        </div>
                        <div class="vr-matchup-vs">VS</div>
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.lucky_break.opp_score}</div>
                            <div class="vr-matchup-name">${luckyOpp}</div>
                        </div>
                    </div>
                    <div class="vr-matchup-result win">WIN</div>
                    ${zerosHtml}
                </div>
                <div class="vr-subtitle">Your lowest scoring win of the season</div>
            `
        });
    }

    // 19-20. Tough Luck
    if (data.tough_luck) {
        VRHudState.slides.push({
            id: 'tough',
            category: 'luck',
            content: `
                <div class="vr-emoji">😢</div>
                <div class="vr-suspense">Your most heartbreaking loss...</div>
            `
        });

        const toughOpp = getOpponentName(data.tough_luck.opponent_id, data.team_names);
        VRHudState.slides.push({
            id: 'tough-reveal',
            category: 'luck',
            content: `
                <div class="vr-emoji vr-scale-in">😢</div>
                <div class="vr-title">Week ${data.tough_luck.week}</div>
                <div class="vr-matchup vr-fade-in">
                    <div class="vr-matchup-scores">
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.tough_luck.my_score}</div>
                            <div class="vr-matchup-name">You</div>
                        </div>
                        <div class="vr-matchup-vs">VS</div>
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.tough_luck.opp_score}</div>
                            <div class="vr-matchup-name">${toughOpp}</div>
                        </div>
                    </div>
                    <div class="vr-matchup-result loss">LOSS</div>
                </div>
                <div class="vr-subtitle">Your highest scoring loss of the season</div>
            `
        });
    }

    // 21-22. Breakout Performance
    if (data.highest_scorer_week) {
        VRHudState.slides.push({
            id: 'breakout',
            category: 'players',
            content: `
                <div class="vr-emoji">🚀</div>
                <div class="vr-suspense">Your single best player performance...</div>
            `
        });

        const breakoutImg = await getPlayerHeadshot(data.highest_scorer_week.name);
        const breakoutOpp = getOpponentName(data.highest_scorer_week.opponent_id, data.team_names);
        const breakoutResultClass = data.highest_scorer_week.won ? 'win' : 'loss';
        const breakoutResultText = data.highest_scorer_week.won ? 'WIN' : 'LOSS';

        VRHudState.slides.push({
            id: 'breakout-reveal',
            category: 'players',
            content: `
                <div class="vr-title vr-fade-in">Week ${data.highest_scorer_week.week}</div>
                <div class="vr-card vr-player-card vr-scale-in">
                    <img class="vr-player-img"
                         src="${breakoutImg || getPlaceholderImage(data.highest_scorer_week.name)}"
                         alt="${data.highest_scorer_week.name}"
                         onerror="this.src='${getPlaceholderImage(data.highest_scorer_week.name)}'">
                    <div class="vr-player-name">${data.highest_scorer_week.name}</div>
                    <div class="vr-player-stat">${data.highest_scorer_week.points} points</div>
                </div>
                <div class="vr-matchup vr-fade-in">
                    <div class="vr-matchup-scores">
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.highest_scorer_week.my_score}</div>
                            <div class="vr-matchup-name">You</div>
                        </div>
                        <div class="vr-matchup-vs">VS</div>
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.highest_scorer_week.opp_score}</div>
                            <div class="vr-matchup-name">${breakoutOpp}</div>
                        </div>
                    </div>
                    <div class="vr-matchup-result ${breakoutResultClass}">${breakoutResultText}</div>
                </div>
            `
        });
    }

    // 23-24. Wasted Potential
    if (data.highest_bench_week) {
        VRHudState.slides.push({
            id: 'wasted',
            category: 'players',
            content: `
                <div class="vr-emoji">💔</div>
                <div class="vr-suspense">Your biggest wasted potential...</div>
            `
        });

        const wastedImg = await getPlayerHeadshot(data.highest_bench_week.name);
        const wastedOpp = getOpponentName(data.highest_bench_week.opponent_id, data.team_names);

        let wastedOutcome = '';
        if (data.highest_bench_week.won_anyway) {
            wastedOutcome = `<div class="vr-detail vr-fade-in">You won anyway, but imagine the margin!</div>`;
        } else if (data.highest_bench_week.would_have_won) {
            wastedOutcome = `<div class="vr-detail vr-fade-in" style="color: var(--vr-danger);">If you had started him, you would have WON 😭</div>`;
        } else if (data.highest_bench_week.would_have_won === false) {
            wastedOutcome = `<div class="vr-detail vr-fade-in">Wouldn't have mattered - you still would have lost</div>`;
        }

        const wastedResultClass = data.highest_bench_week.won_anyway ? 'win' : 'loss';
        const wastedResultText = data.highest_bench_week.won_anyway ? 'WIN' : 'LOSS';

        VRHudState.slides.push({
            id: 'wasted-reveal',
            category: 'players',
            content: `
                <div class="vr-title vr-fade-in">Week ${data.highest_bench_week.week} - On Your Bench</div>
                <div class="vr-card vr-player-card vr-scale-in">
                    <img class="vr-player-img"
                         src="${wastedImg || getPlaceholderImage(data.highest_bench_week.name)}"
                         alt="${data.highest_bench_week.name}"
                         onerror="this.src='${getPlaceholderImage(data.highest_bench_week.name)}'">
                    <div class="vr-player-name">${data.highest_bench_week.name}</div>
                    <div class="vr-player-stat">${data.highest_bench_week.points} points on your bench</div>
                </div>
                <div class="vr-matchup vr-fade-in">
                    <div class="vr-matchup-scores">
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.highest_bench_week.my_score}</div>
                            <div class="vr-matchup-name">You</div>
                        </div>
                        <div class="vr-matchup-vs">VS</div>
                        <div class="vr-matchup-team">
                            <div class="vr-matchup-score">${data.highest_bench_week.opp_score}</div>
                            <div class="vr-matchup-name">${wastedOpp}</div>
                        </div>
                    </div>
                    <div class="vr-matchup-result ${wastedResultClass}">${wastedResultText}</div>
                </div>
                ${wastedOutcome}
            `
        });
    }

    // 25. Manager Ranking (suspense)
    VRHudState.slides.push({
        id: 'ranking',
        category: 'ranking',
        content: `
            <div class="vr-emoji">📋</div>
            <div class="vr-suspense">As a manager, you ranked...</div>
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

    VRHudState.slides.push({
        id: 'ranking-reveal',
        category: 'ranking',
        content: `
            <div class="vr-emoji vr-scale-in">📋</div>
            <div class="vr-big-number">#${rank}</div>
            <div class="vr-subtitle">out of ${totalTeams} managers</div>
            <div class="vr-detail vr-fade-in">${rankComment}</div>
            <div class="vr-detail vr-fade-in" style="opacity: 0.6;">Based on lineup decisions (fewest errors = best)</div>
        `
    });

    // 27. League Superlatives
    VRHudState.slides.push({
        id: 'superlatives',
        category: 'superlatives',
        content: `
            <div class="vr-emoji vr-scale-in">🏅</div>
            <div class="vr-title">League Superlatives</div>
            <div class="vr-superlative-grid vr-fade-in">
                <div class="vr-superlative-card">
                    <div class="vr-superlative-title">🧠 Best Manager</div>
                    <div class="vr-superlative-name">${league.best_manager?.name || '-'}</div>
                    <div class="vr-superlative-stat">Only ${league.best_manager?.errors || 0} errors</div>
                </div>
                <div class="vr-superlative-card">
                    <div class="vr-superlative-title">🤡 Worst Manager</div>
                    <div class="vr-superlative-name">${league.worst_manager?.name || '-'}</div>
                    <div class="vr-superlative-stat">${league.worst_manager?.errors || 0} errors</div>
                </div>
                <div class="vr-superlative-card">
                    <div class="vr-superlative-title">🍀 Luckiest Team</div>
                    <div class="vr-superlative-name">${league.luckiest_team?.name || '-'}</div>
                    <div class="vr-superlative-stat">${league.luckiest_team?.win_difference > 0 ? '+' + league.luckiest_team.win_difference + ' wins over expected' : 'Performed as expected'}</div>
                </div>
                <div class="vr-superlative-card">
                    <div class="vr-superlative-title">😢 Unluckiest Team</div>
                    <div class="vr-superlative-name">${league.biggest_underperformer?.name || '-'}</div>
                    <div class="vr-superlative-stat">${league.biggest_underperformer?.win_difference > 0 ? 'Should have won ' + league.biggest_underperformer.win_difference + ' more' : 'Performed as expected'}</div>
                </div>
            </div>
        `
    });

    // 28. Summary
    VRHudState.slides.push({
        id: 'summary',
        category: 'summary',
        content: `
            <div class="vr-emoji vr-scale-in">📱</div>
            <div class="vr-title">${data.team_name}'s ${setupState.currentYear} Season</div>
            <div class="vr-summary-card vr-fade-in">
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Record</span>
                    <span class="vr-summary-value">${data.records.actual.wins}-${data.records.actual.losses}</span>
                </div>
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Standing</span>
                    <span class="vr-summary-value">${ordinalSuffix(standing)} place</span>
                </div>
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Total Points</span>
                    <span class="vr-summary-value">${formatNumber(data.overview.total_points)}</span>
                </div>
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Points Left on Bench</span>
                    <span class="vr-summary-value">${formatNumber(data.overview.total_points_lost)}</span>
                </div>
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Perfect Lineups</span>
                    <span class="vr-summary-value">${perfectCount}</span>
                </div>
                <div class="vr-summary-row">
                    <span class="vr-summary-label">Manager Rank</span>
                    <span class="vr-summary-value">#${rank} of ${totalTeams}</span>
                </div>
            </div>
            <div class="vr-detail vr-fade-in" style="margin-top: 25px;">
                Thanks for using Fantasy Wrapped! 🏈
            </div>
        `
    });
}

/**
 * Build top scorers HTML for VR HUD
 */
async function buildVRTopScorersHtml(topScorers) {
    if (!topScorers || topScorers.length === 0) return '';

    let html = '';
    for (const player of topScorers) {
        const img = await getPlayerHeadshot(player.name);
        html += `
            <div class="vr-top-scorer">
                <img class="vr-top-scorer-img"
                     src="${img || getPlaceholderImage(player.name)}"
                     alt="${player.name}"
                     onerror="this.src='${getPlaceholderImage(player.name)}'">
                <div class="vr-top-scorer-name">${player.name}</div>
                <div class="vr-top-scorer-points">${formatNumber(player.points)} pts</div>
            </div>
        `;
    }
    return html;
}

/* ===== DOM CREATION ===== */

/**
 * Create the VR HUD DOM structure
 */
function createVRHudDOM() {
    // Remove existing if present
    const existing = document.getElementById('vrHud');
    if (existing) {
        existing.remove();
    }

    // Create main container
    vrHudEl = document.createElement('div');
    vrHudEl.id = 'vrHud';
    vrHudEl.className = 'vr-hud';

    // Grid background
    const gridEl = document.createElement('div');
    gridEl.className = 'vr-grid';

    // Corner decorations
    const corners = ['tl', 'tr', 'bl', 'br'].map(pos => {
        const corner = document.createElement('div');
        corner.className = `vr-corner vr-corner--${pos}`;
        return corner;
    });

    // Exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'vr-exit-btn';
    exitBtn.textContent = '✕ EXIT';
    exitBtn.onclick = closeVRHud;

    // Status bar (top right)
    const statusBar = document.createElement('div');
    statusBar.className = 'vr-status-bar';
    statusBar.innerHTML = `
        <div class="vr-status-item">
            <span class="vr-status-dot"></span>
            <span class="vr-status-label">LIVE</span>
        </div>
        <div class="vr-status-item">
            <span id="vrSlideCounter">1 / ${VRHudState.slides.length}</span>
        </div>
    `;

    // Side panel (left)
    const sidePanel = document.createElement('div');
    sidePanel.className = 'vr-side-panel';
    sidePanel.id = 'vrSidePanel';
    sidePanel.innerHTML = `
        <div class="vr-panel-item">
            <div class="vr-panel-label">Progress</div>
            <div class="vr-panel-value" id="vrProgressText">0%</div>
            <div class="vr-progress-bar">
                <div class="vr-progress-fill" id="vrProgressFill" style="width: 0%"></div>
            </div>
        </div>
        <div class="vr-panel-item">
            <div class="vr-panel-label">Category</div>
            <div class="vr-panel-value" id="vrCategoryText">Welcome</div>
        </div>
        <div class="vr-panel-item">
            <div class="vr-panel-label">Team</div>
            <div class="vr-panel-value" id="vrTeamName" style="font-size: 12px;">${VRHudState.wrappedData?.team_name || '-'}</div>
        </div>
        <div class="vr-panel-item vr-toggle active" id="vrAutoplayToggle" onclick="toggleVRAutoplay()">
            <div class="vr-toggle-switch"></div>
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Auto</span>
        </div>
    `;

    // Main viewport
    const viewport = document.createElement('div');
    viewport.className = 'vr-viewport';

    // Content area inside viewport
    vrContentEl = document.createElement('div');
    vrContentEl.className = 'vr-content';
    vrContentEl.id = 'vrContent';

    viewport.appendChild(vrContentEl);

    // Navigation dots
    vrDotsEl = document.createElement('div');
    vrDotsEl.className = 'vr-dots';
    vrDotsEl.id = 'vrDots';
    createVRDots();

    // Navigation buttons
    const navEl = document.createElement('div');
    navEl.className = 'vr-nav';
    navEl.innerHTML = `
        <button class="vr-nav-btn" id="vrPrevBtn" onclick="prevVRSlide()">← BACK</button>
        <button class="vr-nav-btn vr-nav-btn--primary" id="vrNextBtn" onclick="nextVRSlide()">NEXT →</button>
    `;

    // Assemble
    vrHudEl.appendChild(gridEl);
    corners.forEach(c => vrHudEl.appendChild(c));
    vrHudEl.appendChild(exitBtn);
    vrHudEl.appendChild(statusBar);
    vrHudEl.appendChild(sidePanel);
    vrHudEl.appendChild(viewport);
    vrHudEl.appendChild(vrDotsEl);
    vrHudEl.appendChild(navEl);

    document.body.appendChild(vrHudEl);

    // Setup keyboard navigation
    setupVRKeyboardNav();
}

/**
 * Create navigation dots
 */
function createVRDots() {
    if (!vrDotsEl) return;
    vrDotsEl.innerHTML = '';

    VRHudState.slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'vr-dot';
        if (index === 0) dot.classList.add('active');
        dot.onclick = () => goToVRSlide(index);
        vrDotsEl.appendChild(dot);
    });
}

/* ===== DISPLAY FUNCTIONS ===== */

/**
 * Show the VR HUD experience
 */
function showVRHud() {
    // Hide setup container
    const setupContainer = document.getElementById('setupContainer');
    if (setupContainer) {
        setupContainer.style.display = 'none';
    }

    // Hide slides container
    const wrappedContainer = document.getElementById('wrappedContainer');
    if (wrappedContainer) {
        wrappedContainer.style.display = 'none';
    }

    // Show VR HUD
    vrHudEl.classList.add('active');
}

/**
 * Show a specific slide
 */
function showVRSlide(index) {
    index = Math.max(0, Math.min(index, VRHudState.slides.length - 1));
    VRHudState.currentIndex = index;
    VRHudState.viewedSlides.add(index);

    const slide = VRHudState.slides[index];

    // Add glitch effect on transition
    vrContentEl.classList.add('vr-glitch');
    setTimeout(() => vrContentEl.classList.remove('vr-glitch'), 300);

    // Update content
    vrContentEl.innerHTML = slide.content;

    // Update UI elements
    updateVRUI(index, slide);

    console.log(`[VRHud] Showing slide ${index + 1}/${VRHudState.slides.length}: ${slide.id}`);
}

/**
 * Update all UI elements for current slide
 */
function updateVRUI(index, slide) {
    // Update dots
    const dots = vrDotsEl.querySelectorAll('.vr-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active');
        if (i === index) {
            dot.classList.add('active');
        } else if (VRHudState.viewedSlides.has(i)) {
            dot.classList.add('viewed');
        }
    });

    // Update slide counter
    const counter = document.getElementById('vrSlideCounter');
    if (counter) {
        counter.textContent = `${index + 1} / ${VRHudState.slides.length}`;
    }

    // Update progress
    const progress = Math.round(((index + 1) / VRHudState.slides.length) * 100);
    const progressText = document.getElementById('vrProgressText');
    const progressFill = document.getElementById('vrProgressFill');
    if (progressText) progressText.textContent = `${progress}%`;
    if (progressFill) progressFill.style.width = `${progress}%`;

    // Update category
    const categoryMap = {
        'welcome': 'Welcome',
        'points': 'Points',
        'record': 'Record',
        'optimal': 'Optimal',
        'bench': 'Bench',
        'players': 'Players',
        'perfect': 'Perfect',
        'luck': 'Luck',
        'ranking': 'Ranking',
        'superlatives': 'Awards',
        'summary': 'Summary'
    };
    const categoryText = document.getElementById('vrCategoryText');
    if (categoryText) {
        categoryText.textContent = categoryMap[slide.category] || slide.category;
    }

    // Update nav buttons
    const prevBtn = document.getElementById('vrPrevBtn');
    const nextBtn = document.getElementById('vrNextBtn');
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) {
        nextBtn.textContent = index === VRHudState.slides.length - 1 ? 'FINISH' : 'NEXT →';
    }
}

/* ===== NAVIGATION ===== */

/**
 * Go to next slide
 */
function nextVRSlide() {
    if (VRHudState.currentIndex < VRHudState.slides.length - 1) {
        showVRSlide(VRHudState.currentIndex + 1);
    } else {
        closeVRHud();
    }
}

/**
 * Go to previous slide
 */
function prevVRSlide() {
    if (VRHudState.currentIndex > 0) {
        showVRSlide(VRHudState.currentIndex - 1);
    }
}

/**
 * Go to a specific slide
 */
function goToVRSlide(index) {
    showVRSlide(index);
}

/**
 * Setup keyboard navigation
 */
function setupVRKeyboardNav() {
    document.addEventListener('keydown', handleVRKeyboard);
}

/**
 * Handle keyboard events
 */
function handleVRKeyboard(e) {
    if (!VRHudState.isActive) return;

    switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
            e.preventDefault();
            nextVRSlide();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevVRSlide();
            break;
        case 'Escape':
            e.preventDefault();
            closeVRHud();
            break;
        case 'Home':
            e.preventDefault();
            goToVRSlide(0);
            break;
        case 'End':
            e.preventDefault();
            goToVRSlide(VRHudState.slides.length - 1);
            break;
    }
}

/* ===== AUTOPLAY ===== */

let vrAutoplayInterval = null;
let vrAutoplayEnabled = true;

/**
 * Toggle autoplay
 */
function toggleVRAutoplay() {
    vrAutoplayEnabled = !vrAutoplayEnabled;
    const toggle = document.getElementById('vrAutoplayToggle');
    if (toggle) {
        toggle.classList.toggle('active', vrAutoplayEnabled);
    }

    if (vrAutoplayEnabled) {
        startVRAutoplay();
    } else {
        stopVRAutoplay();
    }
}

/**
 * Start autoplay
 */
function startVRAutoplay() {
    if (!vrAutoplayEnabled) return;
    stopVRAutoplay();

    vrAutoplayInterval = setInterval(() => {
        if (VRHudState.currentIndex >= VRHudState.slides.length - 1) {
            stopVRAutoplay();
        } else {
            nextVRSlide();
        }
    }, 4000);
}

/**
 * Stop autoplay
 */
function stopVRAutoplay() {
    if (vrAutoplayInterval) {
        clearInterval(vrAutoplayInterval);
        vrAutoplayInterval = null;
    }
}

/* ===== CLEANUP ===== */

/**
 * Close the VR HUD experience
 */
function closeVRHud() {
    VRHudState.isActive = false;
    stopVRAutoplay();

    // Hide VR HUD
    if (vrHudEl) {
        vrHudEl.classList.remove('active');
    }

    // Show setup container
    const setupContainer = document.getElementById('setupContainer');
    if (setupContainer) {
        setupContainer.style.display = 'flex';
    }

    // Remove keyboard listener
    document.removeEventListener('keydown', handleVRKeyboard);
}

/* ===== PUBLIC API ===== */

window.VRHud = {
    start: initVRHud,
    close: closeVRHud,
    next: nextVRSlide,
    prev: prevVRSlide,
    goTo: goToVRSlide,
    isActive: () => VRHudState.isActive,
    state: VRHudState
};
