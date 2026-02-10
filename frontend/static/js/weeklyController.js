/* Weekly Deep Dive Controller */

const LOADING_TAGLINES = [
    'Crunching the numbers...',
    'Reviewing the tape...',
    'Checking the script...',
    'Calling the script writers...',
    'Analyzing every roster decision...',
    'Counting your bench points...',
    'Judging your lineup choices...',
    'Measuring your fantasy IQ...',
    'Comparing you to the league...',
    'Calculating what could have been...',
    'Digging through the box scores...',
    'Scouting the waiver wire...',
    'Breaking down the film...',
    'Running the simulations...',
];

const WeeklyController = {
    // State
    state: {
        leagueId: null,
        year: null,
        teamId: null,
        teamName: null,
        currentWeek: 1,
        weekData: {},
        startWeek: 1,
        endWeek: 14,
        teams: [],
        weekResults: {} // {week: {won, myScore, oppScore}}
    },

    _taglineInterval: null,

    /** Start cycling loading taglines */
    _startTaglineCycle() {
        const el = document.getElementById('loadingTagline');
        if (!el) return;
        let idx = 0;
        el.textContent = LOADING_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % LOADING_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = LOADING_TAGLINES[idx];
                el.style.opacity = '1';
            }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) {
            clearInterval(this._taglineInterval);
            this._taglineInterval = null;
        }
    },

    /**
     * Initialize the controller from URL params
     */
    async init() {
        const params = new URLSearchParams(window.location.search);

        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;
        this.state.startWeek = parseInt(params.get('startWeek')) || 1;
        this.state.endWeek = parseInt(params.get('endWeek')) || 14;

        const teamIdParam = params.get('teamId');
        const teamNameParam = params.get('team');

        if (!this.state.leagueId) {
            this.showError('Missing league ID. Please start from the hub page.');
            return;
        }

        // If team ID is provided via URL, skip selection
        if (teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            this._showLoading();
            await this.loadWeeklyData();
        } else if (teamNameParam) {
            this._showLoading();
            await this.findTeamByName(teamNameParam);
        } else {
            // Show team selection
            await this.showTeamSelection();
        }
    },

    _showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('team-select-screen').style.display = 'none';
        this._startTaglineCycle();
    },

    /**
     * Fetch teams and show selection UI
     */
    async showTeamSelection() {
        document.getElementById('loading').style.display = 'flex';
        this._startTaglineCycle();

        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);

            this.state.teams = data.teams;
            if (this.state.teams.length === 0) {
                throw new Error('No teams found in league');
            }

            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';

            // Render team selection grid
            const grid = document.getElementById('teamGrid');
            grid.innerHTML = this.state.teams.map(t => `
                <div class="team-card" data-team-id="${t.team_id}" onclick="WeeklyController.selectTeam(${t.team_id}, '${escapeHtml(t.team_name).replace(/'/g, "\\'")}')">
                    <span class="team-card-name">${escapeHtml(t.team_name)}</span>
                </div>
            `).join('');

            document.getElementById('team-select-screen').style.display = 'flex';
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    /**
     * Handle team card click
     */
    selectTeam(teamId, teamName) {
        this.state.teamId = teamId;
        this.state.teamName = teamName;

        // Update visual selection
        document.querySelectorAll('.team-card').forEach(card => {
            card.classList.toggle('selected', parseInt(card.dataset.teamId) === teamId);
        });

        document.getElementById('teamSelectBtn').disabled = false;
    },

    /**
     * Confirm team selection and load data
     */
    async confirmTeamSelection() {
        if (!this.state.teamId) return;

        document.getElementById('team-select-screen').style.display = 'none';
        this._showLoading();

        // Update URL with team selection
        const url = new URL(window.location);
        url.searchParams.set('teamId', this.state.teamId);
        window.history.replaceState({}, '', url);

        await this.loadWeeklyData();
    },

    /**
     * Find team by owner name
     */
    async findTeamByName(teamName) {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);

            const team = data.teams.find(t =>
                t.team_name.toLowerCase().includes(teamName.toLowerCase())
            );

            if (!team) {
                throw new Error(`Team "${teamName}" not found`);
            }

            this.state.teamId = team.team_id;
            this.state.teamName = team.team_name;

            await this.loadWeeklyData();
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    /**
     * Load weekly data and render week navigation
     */
    async loadWeeklyData() {
        try {
            // Load first week
            await this.loadWeek(this.state.currentWeek);

            // Pre-fetch all week results in background for the week nav
            this._prefetchWeekResults();

            // Render week navigation (initially without results, will update as data comes in)
            this._renderWeekNav();

            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    /**
     * Pre-fetch all week results for the week navigation
     */
    async _prefetchWeekResults() {
        for (let w = this.state.startWeek; w <= this.state.endWeek; w++) {
            if (this.state.weekData[w]) {
                this._extractWeekResult(w);
                continue;
            }
            // Fetch data only (no render) for background prefetch
            this._fetchWeekData(w).then(() => {
                this._extractWeekResult(w);
                this._renderWeekNav();
            }).catch(() => {});
        }
    },

    /**
     * Fetch and cache week data without rendering
     */
    async _fetchWeekData(week) {
        if (this.state.weekData[week]) return;

        const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/week/${week}/deep-dive?year=${this.state.year}&team_id=${this.state.teamId}`;
        const { data, error } = await apiFetch(url);

        if (error) throw new Error(error);

        this.state.weekData[week] = data;
    },

    /**
     * Extract W/L result from cached week data
     */
    _extractWeekResult(week) {
        const data = this.state.weekData[week];
        if (!data || !data.my_matchup) return;

        const my = data.my_matchup.my_team;
        const opp = data.my_matchup.opponent;
        this.state.weekResults[week] = {
            won: my.won,
            myScore: my.score,
            oppScore: opp.score
        };
    },

    /**
     * Render the week navigation bar with W/L and scores
     */
    _renderWeekNav() {
        const container = document.getElementById('weekNavigation');
        container.innerHTML = '';

        for (let week = this.state.startWeek; week <= this.state.endWeek; week++) {
            const btn = document.createElement('button');
            const isActive = week === this.state.currentWeek;
            btn.className = 'week-btn' + (isActive ? ' active' : '');
            btn.dataset.week = week;

            const result = this.state.weekResults[week];
            if (result) {
                const wl = result.won ? 'W' : 'L';
                const wlClass = result.won ? 'week-win' : 'week-loss';
                btn.innerHTML = `
                    <span class="week-label">Week ${week}</span>
                    <span class="week-result">
                        <span class="week-my-score">${formatPts(result.myScore)}</span>
                        <span class="week-wl ${wlClass}">${wl}</span>
                        <span class="week-opp-score">${formatPts(result.oppScore)}</span>
                    </span>
                `;
            } else {
                btn.innerHTML = `<span class="week-label">Week ${week}</span>`;
            }

            btn.onclick = () => this.navigateToWeek(week);
            container.appendChild(btn);
        }

        // Scroll active button into view
        const activeBtn = container.querySelector('.week-btn.active');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    },

    /**
     * Load data for a specific week
     */
    async loadWeek(week) {
        // Check cache first
        if (this.state.weekData[week]) {
            this.renderWeek(week);
            return;
        }

        // Fetch and cache data
        await this._fetchWeekData(week);

        // Extract result for nav
        this._extractWeekResult(week);

        // Render the week
        this.renderWeek(week);
    },

    /**
     * Render a week's data
     */
    renderWeek(week) {
        this.state.currentWeek = week;

        const data = this.state.weekData[week];
        if (!data) return;

        // Update week nav
        this._renderWeekNav();

        // Render sections
        WeeklyRenderer.renderNFLSummary(week, data.nfl_summary);
        WeeklyRenderer.renderTopScorers(data.all_matchups);
        WeeklyRenderer.renderMatchupDetail(data.my_matchup, this.state.teamId);
        WeeklyRenderer.renderFantasyLeagueSummary(data.fantasy_summary);
        WeeklyRenderer.renderStandings(data.standings, this.state.teamId);
        WeeklyRenderer.renderNFLScores(data.nfl_scores);
        WeeklyRenderer.renderAllMatchups(data.all_matchups);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Navigate to a different week
     */
    navigateToWeek(week) {
        this.loadWeek(week);
    },

    /**
     * Show error screen
     */
    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('team-select-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-screen').style.display = 'flex';
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    WeeklyController.init();
});
