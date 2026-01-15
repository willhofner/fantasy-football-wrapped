/* ===== MODAL FUNCTIONS ===== */

/**
 * Show week detail modal
 */
async function showWeekDetail(weekNum) {
    if (!wrappedData?.weekly_data) {
        console.error('No weekly data available');
        return;
    }
    
    const weekData = wrappedData.weekly_data.find(w => w.week === weekNum);
    if (!weekData) {
        console.error(`Week ${weekNum} not found in data`);
        return;
    }

    const oppName = getOpponentName(weekData.opponent_id, wrappedData.team_names);
    const result = weekData.won ? 'WIN' : 'LOSS';
    const resultClass = weekData.won ? 'win' : 'loss';

    // Build lineup HTML
    let lineupHtml = '<div class="lineup-grid">';
    for (const player of weekData.starters) {
        const img = await getPlayerHeadshot(player.name);
        lineupHtml += `
            <div class="lineup-player">
                <img class="lineup-player-img" 
                     src="${img || getPlaceholderImage(player.name, 50)}" 
                     alt="${player.name}"
                     onerror="this.src='${getPlaceholderImage(player.name, 50)}'">
                <div class="lineup-player-info">
                    <div class="lineup-player-name">${player.name}</div>
                    <div class="lineup-player-pos">${player.position}</div>
                </div>
                <div class="lineup-player-points">${player.points}</div>
            </div>
        `;
    }
    lineupHtml += '</div>';

    // Build bench HTML (optional, can add if desired)
    let benchHtml = '';
    if (weekData.bench && weekData.bench.length > 0) {
        benchHtml = '<h3 style="margin-top: 20px; margin-bottom: 15px;">Your Bench</h3>';
        benchHtml += '<div class="lineup-grid">';
        for (const player of weekData.bench) {
            const img = await getPlayerHeadshot(player.name);
            benchHtml += `
                <div class="lineup-player" style="opacity: 0.7;">
                    <img class="lineup-player-img" 
                         src="${img || getPlaceholderImage(player.name, 50)}" 
                         alt="${player.name}"
                         onerror="this.src='${getPlaceholderImage(player.name, 50)}'">
                    <div class="lineup-player-info">
                        <div class="lineup-player-name">${player.name}</div>
                        <div class="lineup-player-pos">${player.position}</div>
                    </div>
                    <div class="lineup-player-points">${player.points}</div>
                </div>
            `;
        }
        benchHtml += '</div>';
    }

    // Populate modal content
    document.getElementById('modalContent').innerHTML = `
        <div class="modal-title">Week ${weekNum}${weekData.is_perfect ? ' - Perfect Lineup! ✨' : ''}</div>
        <div class="matchup-display" style="margin-bottom: 20px; opacity: 1; animation: none;">
            <div class="matchup-scores">
                <div class="matchup-team">
                    <div class="matchup-score">${weekData.my_score}</div>
                    <div class="matchup-name">You</div>
                </div>
                <div class="matchup-vs">vs</div>
                <div class="matchup-team">
                    <div class="matchup-score">${weekData.opp_score}</div>
                    <div class="matchup-name">${oppName}</div>
                </div>
            </div>
            <div class="matchup-result ${resultClass}">${result}</div>
        </div>
        <h3 style="margin-bottom: 15px;">Your Starters</h3>
        ${lineupHtml}
        ${benchHtml}
    `;

    // Show modal
    openModal();
}

/**
 * Open the modal
 */
function openModal() {
    const modal = document.getElementById('weekModal');
    if (modal) {
        modal.classList.add('active');
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close the modal
 */
function closeModal() {
    const modal = document.getElementById('weekModal');
    if (modal) {
        modal.classList.remove('active');
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

/**
 * Close modal when clicking outside content
 */
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('weekModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
});

/**
 * Show optimal lineup comparison modal (future feature)
 */
async function showOptimalComparison(weekNum) {
    const weekData = wrappedData.weekly_data.find(w => w.week === weekNum);
    if (!weekData) return;
    
    // Build side-by-side comparison of actual vs optimal
    let comparisonHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
    
    // Actual lineup
    comparisonHtml += '<div><h3>Your Lineup</h3><div class="lineup-grid">';
    for (const player of weekData.starters) {
        comparisonHtml += `
            <div class="lineup-player">
                <div class="lineup-player-info">
                    <div class="lineup-player-name">${player.name}</div>
                    <div class="lineup-player-pos">${player.position}</div>
                </div>
                <div class="lineup-player-points">${player.points}</div>
            </div>
        `;
    }
    comparisonHtml += '</div></div>';
    
    // Optimal lineup
    comparisonHtml += '<div><h3>Optimal Lineup</h3><div class="lineup-grid">';
    for (const slot of weekData.optimal_lineup) {
        const player = slot.player;
        comparisonHtml += `
            <div class="lineup-player">
                <div class="lineup-player-info">
                    <div class="lineup-player-name">${player.name}</div>
                    <div class="lineup-player-pos">${slot.position}</div>
                </div>
                <div class="lineup-player-points">${player.points}</div>
            </div>
        `;
    }
    comparisonHtml += '</div></div>';
    
    comparisonHtml += '</div>';
    
    document.getElementById('modalContent').innerHTML = `
        <div class="modal-title">Week ${weekNum} - Actual vs Optimal</div>
        ${comparisonHtml}
        <div style="text-align: center; margin-top: 20px;">
            <strong>Actual:</strong> ${weekData.my_score} pts | 
            <strong>Optimal:</strong> ${weekData.my_optimal} pts | 
            <strong>Difference:</strong> ${(weekData.my_optimal - weekData.my_score).toFixed(2)} pts
        </div>
    `;
    
    openModal();
}

/**
 * Show player detail modal (future feature)
 */
async function showPlayerDetail(playerName) {
    if (!wrappedData) return;
    
    // Find all weeks this player appeared
    const playerWeeks = [];
    wrappedData.weekly_data.forEach(week => {
        const starter = week.starters.find(p => p.name === playerName);
        const bench = week.bench.find(p => p.name === playerName);
        
        if (starter) {
            playerWeeks.push({
                week: week.week,
                status: 'Started',
                points: starter.points,
                teamScore: week.my_score,
                won: week.won
            });
        } else if (bench) {
            playerWeeks.push({
                week: week.week,
                status: 'Benched',
                points: bench.points,
                teamScore: week.my_score,
                won: week.won
            });
        }
    });
    
    // Calculate stats
    const totalPoints = playerWeeks.reduce((sum, w) => sum + w.points, 0);
    const avgPoints = totalPoints / playerWeeks.length;
    const timesStarted = playerWeeks.filter(w => w.status === 'Started').length;
    const timesBenched = playerWeeks.filter(w => w.status === 'Benched').length;
    
    // Build week-by-week breakdown
    let weeksHtml = '<div class="lineup-grid" style="margin-top: 20px;">';
    playerWeeks.forEach(w => {
        weeksHtml += `
            <div class="lineup-player">
                <div class="lineup-player-info">
                    <div class="lineup-player-name">Week ${w.week}</div>
                    <div class="lineup-player-pos">${w.status} | ${w.won ? '✅ W' : '❌ L'}</div>
                </div>
                <div class="lineup-player-points">${w.points} pts</div>
            </div>
        `;
    });
    weeksHtml += '</div>';
    
    const img = await getPlayerHeadshot(playerName);
    
    document.getElementById('modalContent').innerHTML = `
        <div class="modal-title">${playerName}</div>
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${img || getPlaceholderImage(playerName)}" 
                 style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid white;"
                 onerror="this.src='${getPlaceholderImage(playerName)}'">
        </div>
        <div class="stats-grid" style="opacity: 1; animation: none;">
            <div class="stat-box">
                <div class="stat-label">Total Points</div>
                <div class="stat-value">${totalPoints.toFixed(1)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg Points</div>
                <div class="stat-value">${avgPoints.toFixed(1)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Times Started</div>
                <div class="stat-value">${timesStarted}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Times Benched</div>
                <div class="stat-value">${timesBenched}</div>
            </div>
        </div>
        <h3 style="margin-top: 20px;">Week-by-Week</h3>
        ${weeksHtml}
    `;
    
    openModal();
}