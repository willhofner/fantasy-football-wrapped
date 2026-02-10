/* Weekly Deep Dive Renderer */

const WeeklyRenderer = {
    /**
     * Render week navigation buttons
     */
    renderWeekNavigation(startWeek, endWeek, currentWeek) {
        const container = document.getElementById('weekNavigation');
        container.innerHTML = '';

        for (let week = startWeek; week <= endWeek; week++) {
            const btn = document.createElement('button');
            btn.className = 'week-btn';
            if (week === currentWeek) {
                btn.classList.add('active');
            }
            btn.dataset.week = week;
            btn.textContent = `Week ${week}`;
            btn.onclick = () => WeeklyController.navigateToWeek(week);
            container.appendChild(btn);
        }
    },

    /**
     * Render matchup detail section
     */
    renderMatchupDetail(matchupData, myTeamId) {
        if (!matchupData) return;

        const { my_team, opponent } = matchupData;

        // Render my team
        const myTeamColumn = document.getElementById('myTeamColumn');
        myTeamColumn.innerHTML = this.renderTeamColumn(my_team, true);
        myTeamColumn.className = 'team-column ' + (my_team.won ? 'win' : 'loss');

        // Render opponent team
        const oppTeamColumn = document.getElementById('oppTeamColumn');
        oppTeamColumn.innerHTML = this.renderTeamColumn(opponent, false);
        oppTeamColumn.className = 'team-column ' + (opponent.won ? 'win' : 'loss');
    },

    /**
     * Render a team column (my team or opponent)
     */
    renderTeamColumn(team, isMyTeam) {
        const errorCount = team.errors.length;
        const pointsLost = team.errors.reduce((sum, err) => sum + err.points_lost, 0);

        let html = `
            <div class="team-header">
                <div>
                    <div class="team-name">${team.team_name}</div>
                    ${isMyTeam ? '<div class="team-label">Your Team</div>' : ''}
                </div>
                <div>
                    <div class="team-score">${team.score}</div>
                    <div class="optimal-score">Optimal: ${team.optimal_score}</div>
                </div>
            </div>
        `;

        // Starters
        html += `
            <div class="roster-section">
                <h3>Starters</h3>
                <div class="player-list">
        `;

        team.starters.forEach(player => {
            const hasError = team.errors.some(err => err.should_replace === player.name);
            html += `
                <div class="player-row ${hasError ? 'error' : ''}">
                    <div class="player-info">
                        <span class="player-position">${player.position}</span>
                        <span class="player-name">${player.name}</span>
                        ${hasError ? '<span class="error-indicator">⚠</span>' : ''}
                    </div>
                    <span class="player-points">${player.points}</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        // Bench
        html += `
            <div class="roster-section">
                <h3>Bench</h3>
                <div class="player-list">
        `;

        team.bench.forEach(player => {
            const isInError = team.errors.some(err => err.bench_player === player.name);
            html += `
                <div class="player-row ${isInError ? 'error' : ''}">
                    <div class="player-info">
                        <span class="player-position">${player.actual_position}</span>
                        <span class="player-name">${player.name}</span>
                        ${isInError ? '<span class="error-indicator">⚠</span>' : ''}
                    </div>
                    <span class="player-points">${player.points}</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        // Lineup errors summary
        if (errorCount > 0) {
            html += `
                <div class="errors-summary">
                    <p><strong>${errorCount} lineup error${errorCount > 1 ? 's' : ''}</strong> — ${pointsLost.toFixed(1)} points left on bench</p>
                </div>
            `;
        }

        return html;
    },

    /**
     * Render league standings
     */
    renderStandings(standings, myTeamId) {
        if (!standings || standings.length === 0) return;

        const container = document.getElementById('standingsTable');

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Record</th>
                        <th>Points For</th>
                    </tr>
                </thead>
                <tbody>
        `;

        standings.forEach(team => {
            const isMyTeam = team.team_id === myTeamId;
            html += `
                <tr class="${isMyTeam ? 'my-team' : ''}">
                    <td class="rank">${team.rank}</td>
                    <td>${team.team_name}</td>
                    <td class="record">${team.record}</td>
                    <td>${team.points_for}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    /**
     * Render all matchups list
     */
    renderAllMatchups(matchups) {
        if (!matchups || matchups.length === 0) return;

        const container = document.getElementById('allMatchupsContent');
        let html = '';

        matchups.forEach(matchup => {
            const homeWinner = matchup.home.won;
            const awayWinner = matchup.away.won;

            html += `
                <div class="matchup-card">
                    <div class="matchup-team ${homeWinner ? 'winner' : ''}">
                        <span class="matchup-team-name">${matchup.home.team_name}</span>
                        <span class="matchup-team-score">${matchup.home.score}</span>
                    </div>
                    <span class="matchup-vs">vs</span>
                    <div class="matchup-team ${awayWinner ? 'winner' : ''}">
                        <span class="matchup-team-name">${matchup.away.team_name}</span>
                        <span class="matchup-team-score">${matchup.away.score}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Render NFL weekly summary
     */
    renderNFLSummary(week, summary) {
        document.getElementById('nflWeekNumber').textContent = week;
        const container = document.getElementById('nflSummaryContent');

        if (!summary) {
            container.innerHTML = '<p class="placeholder-text">NFL summary unavailable.</p>';
            return;
        }

        // Split summary into paragraphs and render
        const paragraphs = summary.split('\n\n').filter(p => p.trim().length > 0);

        let html = '';
        paragraphs.forEach(para => {
            html += `<p>${para.trim()}</p>`;
        });

        container.innerHTML = html;
    },

    /**
     * Render fantasy league weekly summary
     */
    renderFantasyLeagueSummary(summary) {
        const container = document.getElementById('fantasySummaryContent');

        if (!summary) {
            container.innerHTML = '<p class="placeholder-text">Fantasy league summary unavailable.</p>';
            return;
        }

        // Split summary into paragraphs and render
        const paragraphs = summary.split('\n\n').filter(p => p.trim().length > 0);

        let html = '';
        paragraphs.forEach(para => {
            html += `<p>${para.trim()}</p>`;
        });

        container.innerHTML = html;
    },

    /**
     * Render NFL scores
     */
    renderNFLScores(scores) {
        const container = document.getElementById('nflScoresContent');

        if (!scores || scores.length === 0) {
            container.innerHTML = '<p class="placeholder-text">NFL scores unavailable.</p>';
            return;
        }

        let html = '<div class="scores-grid">';

        scores.forEach(game => {
            const homeWinner = game.home.winner;
            const awayWinner = game.away.winner;

            html += `
                <div class="nfl-game-card ${game.is_final ? 'final' : 'in-progress'}">
                    <div class="nfl-team ${awayWinner ? 'winner' : ''}">
                        <span class="team-abbr">${game.away.abbreviation}</span>
                        <span class="team-score">${game.away.score}</span>
                    </div>
                    <div class="nfl-at">@</div>
                    <div class="nfl-team ${homeWinner ? 'winner' : ''}">
                        <span class="team-abbr">${game.home.abbreviation}</span>
                        <span class="team-score">${game.home.score}</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
};
