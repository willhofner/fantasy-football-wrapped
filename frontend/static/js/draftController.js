/* Draft Board Controller */

const DraftController = {
    // State
    state: {
        leagueId: null,
        year: null,
        teamId: null,
        teamName: null,
        picks: [],
        teamMap: {},
        teamGrades: {},
        positionGrades: {},
        poachers: {},
        teamSynopses: {},
        currentFilter: 'all',
        currentSort: 'overall_pick',
        sortAsc: true,
    },

    LOADING_TAGLINES: [
        'Analyzing every draft pick...',
        'Grading your war room decisions...',
        'Finding the steals and the reaches...',
        'Calculating season-long value...',
        'Separating gems from busts...',
    ],

    /**
     * Initialize from URL params or show setup
     */
    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;

        const teamIdParam = params.get('teamId');

        if (this.state.leagueId && teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            document.getElementById('setup-screen').style.display = 'none';
            await this.loadDraftData();
        } else if (this.state.leagueId) {
            document.getElementById('leagueIdInput').value = this.state.leagueId;
            document.getElementById('yearInput').value = this.state.year;
            await this.fetchTeamsForSetup();
        } else {
            this.setupEventListeners();
        }
    },

    /**
     * Bind setup screen event listeners
     */
    setupEventListeners() {
        document.getElementById('fetchTeamsBtn').addEventListener('click', () => this.fetchTeamsForSetup());
        document.getElementById('leagueIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchTeamsForSetup();
        });
    },

    /**
     * Fetch teams and show team selection step
     */
    async fetchTeamsForSetup() {
        const leagueId = document.getElementById('leagueIdInput').value.trim();
        const year = parseInt(document.getElementById('yearInput').value) || 2024;
        const errorEl = document.getElementById('setup-error');

        if (!leagueId) {
            errorEl.textContent = 'Please enter your ESPN League ID';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        this.state.leagueId = leagueId;
        this.state.year = year;

        try {
            const { data, error } = await fetchLeagueTeams(leagueId, year);
            if (error) throw new Error(error);

            const teams = data.teams;
            if (!teams || teams.length === 0) {
                throw new Error('No teams found in this league');
            }

            const teamList = document.getElementById('teamList');
            teamList.innerHTML = teams.map(t => `
                <button class="team-btn" data-team-id="${t.team_id}" data-team-name="${escapeHtml(t.team_name)}">
                    ${escapeHtml(t.team_name)}
                </button>
            `).join('');

            teamList.querySelectorAll('.team-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    teamList.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.state.teamId = parseInt(btn.dataset.teamId);
                    this.state.teamName = btn.dataset.teamName;
                    document.getElementById('startBtn').disabled = false;
                });
            });

            document.getElementById('setup-step-league').style.display = 'none';
            document.getElementById('setup-step-team').style.display = 'block';

            document.getElementById('startBtn').addEventListener('click', () => {
                if (this.state.teamId) {
                    document.getElementById('setup-screen').style.display = 'none';
                    this.loadDraftData();
                }
            });

        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    },

    /**
     * Load draft data from API
     */
    async loadDraftData() {
        this.showLoading();

        try {
            const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/draft?year=${this.state.year}`;
            const { data, error } = await apiFetch(url);

            if (error) throw new Error(error);

            this.state.picks = data.picks;
            this.state.teamMap = data.team_map;
            this.state.teamGrades = data.team_grades || {};
            this.state.positionGrades = data.position_grades || {};
            this.state.poachers = data.poachers || {};
            this.state.teamSynopses = data.team_synopses || {};

            if (!this.state.teamName && this.state.teamId) {
                this.state.teamName = this.state.teamMap[String(this.state.teamId)] || `Team ${this.state.teamId}`;
            }

            this.render();
        } catch (err) {
            this.showError(err.message);
        }
    },

    /**
     * Render all components
     */
    render() {
        if (this._taglineInterval) {
            clearInterval(this._taglineInterval);
            this._taglineInterval = null;
        }
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        document.getElementById('draftSubtitle').textContent =
            `${this.state.teamName || 'Your Team'} | ${this.state.year} Season`;

        this.renderSummaryCards();
        this.renderTable();
        this.bindFilterButtons();
        this.bindSortHeaders();
        this.measureHeaderAndSetCSS();
    },

    /**
     * Measure the actual header height and set CSS variable for sticky thead
     */
    measureHeaderAndSetCSS() {
        const header = document.querySelector('.draft-header');
        if (header) {
            const height = header.offsetHeight;
            document.documentElement.style.setProperty('--draft-header-height', height + 'px');
        }
    },

    /**
     * Render summary stat cards (with draft grade)
     */
    renderSummaryCards() {
        const picks = this.state.picks;
        const myPicks = picks.filter(p => p.team_id === this.state.teamId);
        const gems = picks.filter(p => p.grade === 'GEM');
        const busts = picks.filter(p => p.grade === 'BUST');
        const myGems = myPicks.filter(p => p.grade === 'GEM');
        const myBusts = myPicks.filter(p => p.grade === 'BUST');

        // My team draft grade
        const myGrade = this.state.teamGrades[String(this.state.teamId)];
        const myGradeLetter = myGrade ? myGrade.grade : '?';
        const myAvgStars = myGrade ? myGrade.avg_stars : 0;

        // Best value pick (highest stars from rounds 8+)
        const latePicks = myPicks.filter(p => p.round >= 8 && p.total_points > 0);
        const bestValue = latePicks.sort((a, b) => (b.stars || 0) - (a.stars || 0))[0];

        // Biggest bust (lowest stars from rounds 1-4)
        const earlyPicks = myPicks.filter(p => p.round <= 4);
        const biggestBust = earlyPicks.sort((a, b) => (a.stars || 5) - (b.stars || 5))[0];

        const container = document.getElementById('summaryCards');
        container.innerHTML = `
            <div class="summary-card grade-card">
                <div class="summary-value">${escapeHtml(myGradeLetter)}</div>
                <div class="summary-label">Your Draft Grade</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${picks.length}</div>
                <div class="summary-label">Total Picks</div>
            </div>
            <div class="summary-card gem">
                <div class="summary-value">${gems.length}</div>
                <div class="summary-label">League Gems</div>
            </div>
            <div class="summary-card bust">
                <div class="summary-value">${busts.length}</div>
                <div class="summary-label">League Busts</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${myGems.length} / ${myBusts.length}</div>
                <div class="summary-label">Your Gems / Busts</div>
            </div>
            ${bestValue ? `
            <div class="summary-card gem">
                <div class="summary-value">${escapeHtml(bestValue.player_name)}</div>
                <div class="summary-label">Best Value (Rd ${bestValue.round}, ${this.renderStarsText(bestValue.stars)})</div>
            </div>` : ''}
            ${biggestBust ? `
            <div class="summary-card bust">
                <div class="summary-value">${escapeHtml(biggestBust.player_name)}</div>
                <div class="summary-label">Worst Pick (Rd ${biggestBust.round}, ${this.renderStarsText(biggestBust.stars)})</div>
            </div>` : ''}
        `;
    },

    /**
     * Render the draft table with round separators
     */
    renderTable() {
        let picks = [...this.state.picks];

        // Apply filter
        picks = this.applyFilter(picks);

        // Apply sort
        picks = this.applySort(picks);

        const tbody = document.getElementById('draftTableBody');
        let html = '';
        let lastRound = null;
        const showRoundSeparators = this.state.currentSort === 'overall_pick' && this.state.currentFilter === 'all';

        for (const p of picks) {
            // Insert round separator if sorting by pick order
            if (showRoundSeparators && p.round !== lastRound) {
                if (lastRound !== null) {
                    html += `<tr class="round-separator"><td colspan="10">\u2014\u2014 Round ${p.round} \u2014\u2014</td></tr>`;
                }
                lastRound = p.round;
            }

            const isMyTeam = p.team_id === this.state.teamId;
            const rowClass = [
                isMyTeam ? 'my-team' : '',
                p.grade === 'GEM' ? 'grade-gem' : '',
                p.grade === 'BUST' ? 'grade-bust' : '',
            ].filter(Boolean).join(' ');

            html += `
                <tr class="${rowClass}">
                    <td class="pick-col">${p.round}.${String(p.pick).padStart(2, '0')}</td>
                    <td class="player-col">${escapeHtml(p.player_name)}</td>
                    <td class="pos-col"><span class="pos-badge pos-${escapeHtml(p.position).toLowerCase()}">${escapeHtml(p.position)}</span></td>
                    <td class="team-col"><span class="team-link" data-team-id="${p.team_id}">${escapeHtml(p.team_name)}</span></td>
                    <td class="pts-col">${p.total_points}</td>
                    <td class="avg-col">${p.avg_points}</td>
                    <td class="start-col">${p.start_pct}%</td>
                    <td class="dropped-col">${p.was_dropped ? '<span class="dropped-badge">Yes</span>' : ''}</td>
                    <td class="last-team-col">${escapeHtml(p.final_team_name)}</td>
                    <td class="grade-col">${this.renderStarRating(p.stars, p.grade)}</td>
                </tr>
            `;
        }

        tbody.innerHTML = html;

        // Bind team name clicks for modal
        tbody.querySelectorAll('.team-link').forEach(el => {
            el.addEventListener('click', (e) => {
                const teamId = parseInt(e.target.dataset.teamId);
                this.showTeamModal(teamId);
            });
        });
    },

    /**
     * Render star rating HTML for a cell
     */
    renderStarRating(stars, grade) {
        const fullStars = Math.floor(stars);
        const hasHalf = (stars % 1) >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

        let html = '<span class="star-rating">';
        for (let i = 0; i < fullStars; i++) {
            html += '<span class="star filled">\u2605</span>';
        }
        if (hasHalf) {
            // Use a half-star character approach: filled star with CSS or unicode
            html += '<span class="star half">\u00BD</span>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<span class="star empty">\u2605</span>';
        }
        html += '</span>';

        // Add GEM/BUST label for extremes
        if (grade === 'GEM') {
            html += '<span class="star-label gem-label">GEM</span>';
        } else if (grade === 'BUST') {
            html += '<span class="star-label bust-label">BUST</span>';
        }

        return html;
    },

    /**
     * Render stars as text (for summary cards)
     */
    renderStarsText(stars) {
        if (!stars && stars !== 0) return '?';
        return stars.toFixed(1) + '\u2605';
    },

    /**
     * Show team modal overlay
     */
    showTeamModal(teamId) {
        const teamName = this.state.teamMap[String(teamId)] || `Team ${teamId}`;
        const gradeInfo = this.state.teamGrades[String(teamId)] || {};
        const posGrades = this.state.positionGrades[String(teamId)] || {};
        const synopsis = this.state.teamSynopses[String(teamId)] || '';
        const teamPicks = this.state.picks.filter(p => p.team_id === teamId);

        // Sort by round/pick
        const sortedPicks = [...teamPicks].sort((a, b) => a.overall_pick - b.overall_pick);

        // Best and worst pick
        const byStars = [...teamPicks].sort((a, b) => (b.stars || 0) - (a.stars || 0));
        const best = byStars[0];
        const worst = byStars[byStars.length - 1];

        // Position group grades HTML
        const posOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'];
        let posGradesHtml = '';
        for (const pos of posOrder) {
            const pg = posGrades[pos];
            if (pg) {
                posGradesHtml += `
                    <div class="pos-grade-card">
                        <div class="pos-grade-letter">${escapeHtml(pg.grade)}</div>
                        <div class="pos-grade-name">${escapeHtml(pos)}</div>
                        <div class="pos-grade-detail">${pg.picks} pick${pg.picks !== 1 ? 's' : ''}, ${pg.total_points} pts</div>
                    </div>
                `;
            }
        }
        // Also include any positions not in posOrder
        for (const [pos, pg] of Object.entries(posGrades)) {
            if (!posOrder.includes(pos)) {
                posGradesHtml += `
                    <div class="pos-grade-card">
                        <div class="pos-grade-letter">${escapeHtml(pg.grade)}</div>
                        <div class="pos-grade-name">${escapeHtml(pos)}</div>
                        <div class="pos-grade-detail">${pg.picks} pick${pg.picks !== 1 ? 's' : ''}, ${pg.total_points} pts</div>
                    </div>
                `;
            }
        }

        // Picks table
        let picksTableHtml = sortedPicks.map(p => `
            <tr>
                <td>${p.round}.${String(p.pick).padStart(2, '0')}</td>
                <td>${escapeHtml(p.player_name)}</td>
                <td><span class="pos-badge pos-${escapeHtml(p.position).toLowerCase()}">${escapeHtml(p.position)}</span></td>
                <td>${p.total_points}</td>
                <td>${this.renderStarRating(p.stars, p.grade)}</td>
            </tr>
        `).join('');

        // Remove existing modal if any
        const existing = document.getElementById('teamModal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'teamModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-header">
                    <div class="modal-team-name">${escapeHtml(teamName)}</div>
                    <div>
                        <span class="modal-draft-grade">${escapeHtml(gradeInfo.grade || '?')}</span>
                        <span class="modal-grade-label">Draft Grade &mdash; ${gradeInfo.avg_stars || 0} avg stars, ${gradeInfo.total_points || 0} total pts</span>
                    </div>
                    ${synopsis ? `<div class="modal-synopsis">${escapeHtml(synopsis)}</div>` : ''}
                </div>

                ${best && worst ? `
                <div class="modal-highlight">
                    <div class="highlight-card best">
                        <div class="hl-label">Best Pick</div>
                        <div class="hl-name">${escapeHtml(best.player_name)}</div>
                        <div class="hl-detail">Rd ${best.round} &bull; ${best.total_points} pts &bull; ${this.renderStarsText(best.stars)}</div>
                    </div>
                    <div class="highlight-card worst">
                        <div class="hl-label">Worst Pick</div>
                        <div class="hl-name">${escapeHtml(worst.player_name)}</div>
                        <div class="hl-detail">Rd ${worst.round} &bull; ${worst.total_points} pts &bull; ${this.renderStarsText(worst.stars)}</div>
                    </div>
                </div>
                ` : ''}

                ${posGradesHtml ? `
                <div class="modal-section-title">Position Groups</div>
                <div class="pos-grades-grid">${posGradesHtml}</div>
                ` : ''}

                <div class="modal-section-title">All Picks</div>
                <table class="modal-picks-table">
                    <thead>
                        <tr>
                            <th>Pick</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th>Total Pts</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${picksTableHtml}
                    </tbody>
                </table>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close handlers
        overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Close on Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    /**
     * Apply current filter to picks
     */
    applyFilter(picks) {
        switch (this.state.currentFilter) {
            case 'gem':
                return picks.filter(p => p.grade === 'GEM');
            case 'bust':
                return picks.filter(p => p.grade === 'BUST');
            case 'my-team':
                return picks.filter(p => p.team_id === this.state.teamId);
            default:
                return picks;
        }
    },

    /**
     * Apply current sort to picks
     */
    applySort(picks) {
        const key = this.state.currentSort;
        const asc = this.state.sortAsc;

        return picks.sort((a, b) => {
            let va = a[key];
            let vb = b[key];
            if (typeof va === 'string') {
                return asc ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            return asc ? va - vb : vb - va;
        });
    },

    /**
     * Bind filter button click handlers
     */
    bindFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.currentFilter = btn.dataset.filter;
                this.renderTable();
            });
        });
    },

    /**
     * Bind sortable table header click handlers
     */
    bindSortHeaders() {
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                if (this.state.currentSort === sortKey) {
                    this.state.sortAsc = !this.state.sortAsc;
                } else {
                    this.state.currentSort = sortKey;
                    this.state.sortAsc = true;
                }
                document.querySelectorAll('.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
                th.classList.add(this.state.sortAsc ? 'sort-asc' : 'sort-desc');
                this.renderTable();
            });
        });
    },

    /**
     * Show loading screen with rotating taglines
     */
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        const taglineEl = document.getElementById('loading-tagline');
        let idx = 0;
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % this.LOADING_TAGLINES.length;
            taglineEl.textContent = this.LOADING_TAGLINES[idx];
        }, 2500);
    },

    /**
     * Show error screen
     */
    showError(message) {
        if (this._taglineInterval) clearInterval(this._taglineInterval);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-screen').style.display = 'flex';
    },
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    DraftController.init();
});
