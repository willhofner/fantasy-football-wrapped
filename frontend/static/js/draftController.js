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
            // All params present — skip setup
            this.state.teamId = parseInt(teamIdParam);
            document.getElementById('setup-screen').style.display = 'none';
            await this.loadDraftData();
        } else if (this.state.leagueId) {
            // Have league ID but no team — show team selection
            document.getElementById('leagueIdInput').value = this.state.leagueId;
            document.getElementById('yearInput').value = this.state.year;
            await this.fetchTeamsForSetup();
        } else {
            // Show full setup
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

            // Render team buttons
            const teamList = document.getElementById('teamList');
            teamList.innerHTML = teams.map(t => `
                <button class="team-btn" data-team-id="${t.team_id}" data-team-name="${escapeHtml(t.team_name)}">
                    ${escapeHtml(t.team_name)}
                </button>
            `).join('');

            // Add click handlers
            teamList.querySelectorAll('.team-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    teamList.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.state.teamId = parseInt(btn.dataset.teamId);
                    this.state.teamName = btn.dataset.teamName;
                    document.getElementById('startBtn').disabled = false;
                });
            });

            // Show team selection step
            document.getElementById('setup-step-league').style.display = 'none';
            document.getElementById('setup-step-team').style.display = 'block';

            // Start button
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

            // If we don't have a team name yet, look it up
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

        // Subtitle
        document.getElementById('draftSubtitle').textContent =
            `${this.state.teamName || 'Your Team'} | ${this.state.year} Season`;

        this.renderSummaryCards();
        this.renderTable();
        this.bindFilterButtons();
        this.bindSortHeaders();
    },

    /**
     * Render summary stat cards
     */
    renderSummaryCards() {
        const picks = this.state.picks;
        const myPicks = picks.filter(p => p.team_id === this.state.teamId);
        const gems = picks.filter(p => p.grade === 'GEM');
        const busts = picks.filter(p => p.grade === 'BUST');
        const myGems = myPicks.filter(p => p.grade === 'GEM');
        const myBusts = myPicks.filter(p => p.grade === 'BUST');

        // Best value pick (highest avg points from rounds 8+)
        const latePicks = myPicks.filter(p => p.round >= 8 && p.total_points > 0);
        const bestValue = latePicks.sort((a, b) => b.avg_points - a.avg_points)[0];

        // Biggest bust (lowest avg points from rounds 1-4)
        const earlyPicks = myPicks.filter(p => p.round <= 4);
        const biggestBust = earlyPicks.sort((a, b) => a.avg_points - b.avg_points)[0];

        const container = document.getElementById('summaryCards');
        container.innerHTML = `
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
                <div class="summary-value">${bestValue.player_name}</div>
                <div class="summary-label">Your Best Value (Rd ${bestValue.round}, ${bestValue.avg_points} avg)</div>
            </div>` : ''}
            ${biggestBust ? `
            <div class="summary-card bust">
                <div class="summary-value">${biggestBust.player_name}</div>
                <div class="summary-label">Your Worst Pick (Rd ${biggestBust.round}, ${biggestBust.avg_points} avg)</div>
            </div>` : ''}
        `;
    },

    /**
     * Render the draft table
     */
    renderTable() {
        let picks = [...this.state.picks];

        // Apply filter
        picks = this.applyFilter(picks);

        // Apply sort
        picks = this.applySort(picks);

        const tbody = document.getElementById('draftTableBody');
        tbody.innerHTML = picks.map(p => {
            const isMyTeam = p.team_id === this.state.teamId;
            const rowClass = [
                isMyTeam ? 'my-team' : '',
                p.grade === 'GEM' ? 'grade-gem' : '',
                p.grade === 'BUST' ? 'grade-bust' : '',
            ].filter(Boolean).join(' ');

            return `
                <tr class="${rowClass}">
                    <td class="pick-col">${p.round}.${String(p.pick).padStart(2, '0')}</td>
                    <td class="player-col">${escapeHtml(p.player_name)}</td>
                    <td class="pos-col"><span class="pos-badge pos-${escapeHtml(p.position).toLowerCase()}">${escapeHtml(p.position)}</span></td>
                    <td class="team-col">${escapeHtml(p.team_name)}</td>
                    <td class="pts-col">${p.total_points}</td>
                    <td class="avg-col">${p.avg_points}</td>
                    <td class="start-col">${p.start_pct}%</td>
                    <td class="dropped-col">${p.was_dropped ? '<span class="dropped-badge">Yes</span>' : ''}</td>
                    <td class="last-team-col">${escapeHtml(p.final_team_name)}</td>
                    <td class="grade-col">${this.renderGradeBadge(p.grade)}</td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render a grade badge
     */
    renderGradeBadge(grade) {
        if (grade === 'GEM') return '<span class="grade-badge gem">GEM</span>';
        if (grade === 'BUST') return '<span class="grade-badge bust">BUST</span>';
        return '';
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
                // Update sort indicators
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
