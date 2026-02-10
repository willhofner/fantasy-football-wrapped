/* Weekly Deep Dive Renderer */

/** Format fantasy points to 1 decimal place. NFL scores (integers) should NOT use this. */
function formatPts(n) {
    if (n === null || n === undefined) return '0.0';
    return Number(n).toFixed(1);
}

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
    /**
     * Sort starters in ESPN display order and bench by points descending
     */
    sortRoster(team) {
        const posOrder = { 'QB': 0, 'RB': 1, 'WR': 2, 'TE': 3, 'FLEX': 4, 'D/ST': 5, 'K': 6 };
        const sorted = [...team.starters].sort((a, b) => {
            const aOrd = posOrder[a.position] ?? 99;
            const bOrd = posOrder[b.position] ?? 99;
            if (aOrd !== bOrd) return aOrd - bOrd;
            return b.points - a.points;
        });
        const bench = [...team.bench].sort((a, b) => b.points - a.points);
        return { starters: sorted, bench };
    },

    renderTeamColumn(team, isMyTeam) {
        const { starters, bench } = this.sortRoster(team);
        const errorCount = team.errors.length;
        const pointsLost = team.errors.reduce((sum, err) => sum + err.points_lost, 0);

        let html = `
            <div class="team-header">
                <div>
                    <div class="team-name">${team.team_name}</div>
                    ${isMyTeam ? '<div class="team-label">Your Team</div>' : ''}
                </div>
                <div>
                    <div class="team-score">${formatPts(team.score)}</div>
                    <div class="optimal-score">Optimal: ${formatPts(team.optimal_score)}</div>
                </div>
            </div>
        `;

        // Starters
        html += `
            <div class="roster-section starters">
                <h3>Starters</h3>
                <div class="player-list">
        `;

        starters.forEach(player => {
            const hasError = team.errors.some(err => err.should_replace === player.name);
            html += `
                <div class="player-row ${hasError ? 'error' : ''}">
                    <div class="player-info">
                        <span class="player-position">${player.position}</span>
                        <span class="player-name">${player.name}</span>
                        ${hasError ? '<span class="error-indicator">⚠</span>' : ''}
                    </div>
                    <span class="player-points">${formatPts(player.points)}</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        // Bench
        html += `
            <div class="roster-section bench">
                <h3>Bench</h3>
                <div class="player-list">
        `;

        bench.forEach(player => {
            const isInError = team.errors.some(err => err.bench_player === player.name);
            html += `
                <div class="player-row ${isInError ? 'error' : ''}">
                    <div class="player-info">
                        <span class="player-position">${player.actual_position}</span>
                        <span class="player-name">${player.name}</span>
                        ${isInError ? '<span class="error-indicator">⚠</span>' : ''}
                    </div>
                    <span class="player-points">${formatPts(player.points)}</span>
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
    // Standings sort state
    _standingsSortCol: null,
    _standingsSortAsc: false,
    _standingsData: null,
    _standingsMyTeamId: null,

    renderStandings(standings, myTeamId) {
        if (!standings || standings.length === 0) return;

        this._standingsData = standings;
        this._standingsMyTeamId = myTeamId;
        this._standingsSortCol = null;
        this._standingsSortAsc = false;
        this._renderStandingsTable(standings, myTeamId);
    },

    _sortStandings(col) {
        if (this._standingsSortCol === col) {
            this._standingsSortAsc = !this._standingsSortAsc;
        } else {
            this._standingsSortCol = col;
            // Default: ascending for rank/errors, descending for points/perfect weeks
            this._standingsSortAsc = (col === 'rank' || col === 'errors');
        }
        const sorted = [...this._standingsData].sort((a, b) => {
            let aVal, bVal;
            switch (col) {
                case 'rank': aVal = a.rank; bVal = b.rank; break;
                case 'team': aVal = a.team_name.toLowerCase(); bVal = b.team_name.toLowerCase(); break;
                case 'record': aVal = a.wins; bVal = b.wins; break;
                case 'points_for': aVal = a.points_for; bVal = b.points_for; break;
                case 'errors': aVal = a.errors || 0; bVal = b.errors || 0; break;
                case 'lost_points': aVal = a.lost_points || 0; bVal = b.lost_points || 0; break;
                case 'perfect_weeks': aVal = (a.perfect_weeks || []).length; bVal = (b.perfect_weeks || []).length; break;
                default: return 0;
            }
            if (aVal < bVal) return this._standingsSortAsc ? -1 : 1;
            if (aVal > bVal) return this._standingsSortAsc ? 1 : -1;
            return 0;
        });
        this._renderStandingsTable(sorted, this._standingsMyTeamId);
    },

    _renderStandingsTable(standings, myTeamId) {
        const container = document.getElementById('standingsTable');
        const sortIcon = (col) => {
            if (this._standingsSortCol !== col) return '';
            return this._standingsSortAsc ? ' ▲' : ' ▼';
        };

        let html = `
            <table>
                <thead>
                    <tr>
                        <th class="sortable" data-sort="rank">Rank${sortIcon('rank')}</th>
                        <th class="sortable" data-sort="team">Team${sortIcon('team')}</th>
                        <th class="sortable" data-sort="record">Record${sortIcon('record')}</th>
                        <th class="sortable" data-sort="points_for">Points For${sortIcon('points_for')}</th>
                        <th class="sortable" data-sort="errors">Errors${sortIcon('errors')}</th>
                        <th class="sortable" data-sort="lost_points">Lost Pts${sortIcon('lost_points')}</th>
                        <th class="sortable" data-sort="perfect_weeks">Perfect${sortIcon('perfect_weeks')}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        standings.forEach(team => {
            const isMyTeam = team.team_id === myTeamId;
            const rc = team.rank_change || 0;
            let rankChangeHtml = '';
            if (rc > 0) {
                rankChangeHtml = `<span class="rank-up">▲+${rc}</span>`;
            } else if (rc < 0) {
                rankChangeHtml = `<span class="rank-down">▼${rc}</span>`;
            }

            const perfectCount = (team.perfect_weeks || []).length;
            const stars = perfectCount > 0 ? '★'.repeat(perfectCount) : '';

            html += `
                <tr class="${isMyTeam ? 'my-team' : ''}">
                    <td class="rank">${team.rank} ${rankChangeHtml}</td>
                    <td>${team.team_name}</td>
                    <td class="record">${team.record}</td>
                    <td>${formatPts(team.points_for)}</td>
                    <td class="errors-col">${team.errors || 0}</td>
                    <td class="lost-pts-col">${formatPts(team.lost_points || 0)}</td>
                    <td class="perfect-col">${stars}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

        // Attach sort handlers
        container.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                this._sortStandings(th.dataset.sort);
            });
        });
    },

    /**
     * Render all matchups list
     */
    _getTopScorers(team, n = 3) {
        const sorted = [...team.starters].sort((a, b) => b.points - a.points);
        return sorted.slice(0, n);
    },

    _getPlayerImageUrl(name) {
        return `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=1&mode=prefix&type=player&sport=football`;
    },

    _renderTopScorers(team) {
        const top = this._getTopScorers(team);
        const html = `<div class="top-scorers">${top.map(p =>
            `<div class="top-scorer">
                <img src="${getPlaceholderImage(p.name, 36)}"
                     alt="${p.name}" class="scorer-headshot"
                     data-player-name="${p.name.replace(/"/g, '&quot;')}">
                <span class="scorer-pts">${formatPts(p.points)}</span>
            </div>`
        ).join('')}</div>`;
        // Async load real headshots after render
        setTimeout(() => {
            top.forEach(p => {
                const imgs = document.querySelectorAll(`img.scorer-headshot[data-player-name="${p.name.replace(/"/g, '&quot;')}"]`);
                if (imgs.length > 0) {
                    getPlayerHeadshot(p.name).then(url => {
                        if (url) imgs.forEach(img => {
                            img.src = url;
                            img.onerror = () => { img.src = getPlaceholderImage(p.name, 36); };
                        });
                    });
                }
            });
        }, 50);
        return html;
    },

    _calcLostPoints(team) {
        return team.errors ? team.errors.reduce((sum, err) => sum + err.points_lost, 0) : 0;
    },

    renderAllMatchups(matchups) {
        if (!matchups || matchups.length === 0) return;

        const container = document.getElementById('allMatchupsContent');
        let html = '';

        matchups.forEach((matchup, idx) => {
            const homeWinner = matchup.home.won;
            const awayWinner = matchup.away.won;
            const homeLost = this._calcLostPoints(matchup.home);
            const awayLost = this._calcLostPoints(matchup.away);

            html += `
                <div class="matchup-card" data-matchup-idx="${idx}">
                    <div class="matchup-team ${homeWinner ? 'winner' : ''}">
                        <div class="matchup-team-info">
                            <span class="matchup-team-name">${matchup.home.team_name}</span>
                            ${this._renderTopScorers(matchup.home)}
                        </div>
                        <div class="matchup-team-scores">
                            <span class="matchup-team-score">${formatPts(matchup.home.score)}</span>
                            ${homeLost > 0 ? `<span class="matchup-lost-pts">-${formatPts(homeLost)}</span>` : ''}
                        </div>
                    </div>
                    <span class="matchup-vs">vs</span>
                    <div class="matchup-team ${awayWinner ? 'winner' : ''}">
                        <div class="matchup-team-info">
                            <span class="matchup-team-name">${matchup.away.team_name}</span>
                            ${this._renderTopScorers(matchup.away)}
                        </div>
                        <div class="matchup-team-scores">
                            <span class="matchup-team-score">${formatPts(matchup.away.score)}</span>
                            ${awayLost > 0 ? `<span class="matchup-lost-pts">-${formatPts(awayLost)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="matchup-expanded" id="matchupExpanded-${idx}" style="display:none;">
                    <div class="matchup-container">
                        <div class="team-column ${homeWinner ? 'win' : 'loss'}" id="expandedHome-${idx}"></div>
                        <div class="team-column ${awayWinner ? 'win' : 'loss'}" id="expandedAway-${idx}"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Attach click handlers
        container.querySelectorAll('.matchup-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.matchupIdx);
                const expanded = document.getElementById(`matchupExpanded-${idx}`);
                const isVisible = expanded.style.display !== 'none';

                if (isVisible) {
                    expanded.style.display = 'none';
                    card.classList.remove('expanded');
                } else {
                    // Render full rosters on first expand
                    const homeCol = document.getElementById(`expandedHome-${idx}`);
                    const awayCol = document.getElementById(`expandedAway-${idx}`);
                    if (!homeCol.innerHTML) {
                        homeCol.innerHTML = this.renderTeamColumn(matchups[idx].home, false);
                        awayCol.innerHTML = this.renderTeamColumn(matchups[idx].away, false);
                    }
                    expanded.style.display = 'block';
                    card.classList.add('expanded');
                }
            });
        });
    },

    /**
     * Render top fantasy scorers ticker by position
     */
    renderTopScorers(allMatchups) {
        const container = document.getElementById('topScorersContent');
        if (!allMatchups || allMatchups.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Top scorers unavailable.</p>';
            return;
        }

        // Collect all starters from all teams
        const allPlayers = [];
        allMatchups.forEach(m => {
            [m.home, m.away].forEach(team => {
                if (team.starters) {
                    team.starters.forEach(p => {
                        allPlayers.push({
                            name: p.name,
                            position: p.actual_position || p.position,
                            points: p.points,
                            teamName: team.team_name
                        });
                    });
                }
            });
        });

        // Group by position and get top 3
        const posOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'];
        let cardsHtml = '';

        posOrder.forEach((pos, posIdx) => {
            const posPlayers = allPlayers
                .filter(p => p.position === pos || (pos === 'D/ST' && p.position === 'D/ST'))
                .sort((a, b) => b.points - a.points)
                .slice(0, 3);

            if (posPlayers.length === 0) return;

            if (posIdx > 0) {
                cardsHtml += '<div class="position-divider"></div>';
            }

            cardsHtml += `<div class="position-group">`;
            cardsHtml += `<span class="position-label">${pos}</span>`;

            posPlayers.forEach(p => {
                const placeholder = getPlaceholderImage(p.name, 48);
                cardsHtml += `
                    <div class="scorer-card">
                        <img src="${placeholder}"
                             alt="${p.name}" class="scorer-card-img"
                             data-scorer-name="${p.name.replace(/"/g, '&quot;')}">
                        <div class="scorer-card-info">
                            <span class="scorer-card-pts">${formatPts(p.points)}</span>
                            <span class="scorer-card-name">${p.name}</span>
                            <span class="scorer-card-team">${p.teamName}</span>
                        </div>
                    </div>
                `;
            });

            cardsHtml += `</div>`;
        });

        // Duplicate for seamless scroll
        const html = `
            <div class="fantasy-ticker-wrapper">
                <div class="fantasy-ticker-track">
                    ${cardsHtml}
                    ${cardsHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Pause on hover
        const wrapper = container.querySelector('.fantasy-ticker-wrapper');
        const track = container.querySelector('.fantasy-ticker-track');
        if (wrapper && track) {
            wrapper.addEventListener('mouseenter', () => {
                track.style.animationPlayState = 'paused';
            });
            wrapper.addEventListener('mouseleave', () => {
                track.style.animationPlayState = 'running';
            });
        }

        // Async load headshots
        const allNames = [...new Set(allPlayers.map(p => p.name))];
        allNames.forEach(name => {
            getPlayerHeadshot(name).then(url => {
                if (url) {
                    const imgs = container.querySelectorAll(`img.scorer-card-img[data-scorer-name="${name.replace(/"/g, '&quot;')}"]`);
                    imgs.forEach(img => {
                        img.src = url;
                        img.onerror = () => { img.src = getPlaceholderImage(name, 48); };
                    });
                }
            });
        });
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

        // Split summary into paragraphs and render safely
        container.innerHTML = '';
        summary.split('\n\n').filter(p => p.trim().length > 0).forEach(para => {
            const p = document.createElement('p');
            p.textContent = para.trim();
            container.appendChild(p);
        });
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

        // Split summary into paragraphs and render safely
        container.innerHTML = '';
        summary.split('\n\n').filter(p => p.trim().length > 0).forEach(para => {
            const p = document.createElement('p');
            p.textContent = para.trim();
            container.appendChild(p);
        });
    },

    /**
     * Render NFL scores
     */
    _nflLogoUrl(abbr) {
        return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
    },

    renderNFLScores(scores) {
        const container = document.getElementById('nflScoresContent');

        if (!scores || scores.length === 0) {
            container.innerHTML = '<p class="placeholder-text">NFL scores unavailable.</p>';
            return;
        }

        let cardsHtml = '';

        scores.forEach(game => {
            const homeWinner = game.home.winner;
            const awayWinner = game.away.winner;

            cardsHtml += `
                <div class="nfl-game-card ${game.is_final ? 'final' : 'in-progress'}">
                    <div class="nfl-team-row ${awayWinner ? 'winner' : 'loser'}">
                        <img src="${this._nflLogoUrl(game.away.abbreviation)}"
                             alt="${game.away.abbreviation}" class="nfl-logo"
                             onerror="this.style.display='none'">
                        <span class="team-abbr">${game.away.abbreviation}</span>
                        <span class="team-score">${game.away.score}</span>
                    </div>
                    <div class="nfl-divider"></div>
                    <div class="nfl-team-row ${homeWinner ? 'winner' : 'loser'}">
                        <img src="${this._nflLogoUrl(game.home.abbreviation)}"
                             alt="${game.home.abbreviation}" class="nfl-logo"
                             onerror="this.style.display='none'">
                        <span class="team-abbr">${game.home.abbreviation}</span>
                        <span class="team-score">${game.home.score}</span>
                    </div>
                </div>
            `;
        });

        // Duplicate cards for seamless infinite scroll
        const html = `
            <div class="nfl-ticker-wrapper">
                <div class="nfl-ticker-track">
                    ${cardsHtml}
                    ${cardsHtml}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Pause ticker on hover, allow manual scroll
        const wrapper = container.querySelector('.nfl-ticker-wrapper');
        const track = container.querySelector('.nfl-ticker-track');
        if (wrapper && track) {
            wrapper.addEventListener('mouseenter', () => {
                track.style.animationPlayState = 'paused';
            });
            wrapper.addEventListener('mouseleave', () => {
                track.style.animationPlayState = 'running';
            });
        }
    }
};
