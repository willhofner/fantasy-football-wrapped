/* Madden Console Controller */

const MADDEN_TAGLINES = [
    'Loading game data...',
    'Reviewing the tape...',
    'Calling audibles...',
    'Setting the depth chart...',
    'Analyzing every roster move...',
    'Scouting the competition...',
    'Running pre-game warmups...',
    'Checking the injury report...',
    'Studying the playbook...',
    'Simulating matchups...',
];

const MaddenController = {
    state: {
        leagueId: null,
        year: null,
        teamId: null,
        teamName: null,
        startWeek: 1,
        endWeek: 14,
        currentTab: 'home',
        weekData: {},
        weekResults: {},
        teams: [],
        focusedWeek: 1,
        detailWeek: null,
        standingsWeek: 1,
        scoresWeek: 1,
        phase: 'xbox-boot'
    },

    _taglineInterval: null,

    _startTaglineCycle() {
        const el = document.getElementById('loadingTagline');
        if (!el) return;
        let idx = 0;
        el.textContent = MADDEN_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % MADDEN_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = MADDEN_TAGLINES[idx]; el.style.opacity = '1'; }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) { clearInterval(this._taglineInterval); this._taglineInterval = null; }
    },

    /* ===== Initialization ===== */

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;
        this.state.startWeek = parseInt(params.get('startWeek')) || 1;
        this.state.endWeek = parseInt(params.get('endWeek')) || 14;
        this.state.focusedWeek = this.state.startWeek;
        this.state.standingsWeek = this.state.endWeek;
        this.state.scoresWeek = this.state.startWeek;

        const teamIdParam = params.get('teamId');
        const teamNameParam = params.get('team');

        if (!this.state.leagueId) {
            this.showError('Missing league ID. Please start from the hub page.');
            return;
        }

        // Update year on title screen
        const yearEl = document.getElementById('maddenYear');
        if (yearEl) yearEl.textContent = 'WRAPPED ' + this.state.year;

        // Start boot sequence
        await this._runBootSequence();

        // After title screen, determine flow
        if (teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            this._showLoading();
            await this._loadAndShowMenu();
        } else if (teamNameParam) {
            this._showLoading();
            await this._findTeamByName(teamNameParam);
        } else {
            await this._showTeamSelection();
        }
    },

    /* ===== Boot Sequence ===== */

    async _runBootSequence() {
        // Phase 1: Xbox Boot (3 seconds)
        this._showPhase('xbox-boot');
        await this._delay(3000);

        // Fade out xbox
        document.getElementById('xbox-boot').classList.add('fade-out');
        await this._delay(500);

        // Phase 2: Madden Title
        this._showPhase('madden-title');
        MaddenRenderer.spawnTitleParticles();

        // Wait for user input
        await this._waitForStart();

        // Fade out title
        document.getElementById('madden-title').classList.add('fade-out');
        await this._delay(500);
    },

    _waitForStart() {
        return new Promise(resolve => {
            const handler = (e) => {
                if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
                    document.removeEventListener('keydown', handler);
                    document.getElementById('pressStart').removeEventListener('click', handler);
                    resolve();
                }
            };
            document.addEventListener('keydown', handler);
            document.getElementById('pressStart').addEventListener('click', handler);
        });
    },

    _showPhase(phaseId) {
        document.querySelectorAll('.fullscreen-phase').forEach(p => {
            p.style.display = p.id === phaseId ? 'flex' : 'none';
            p.classList.remove('fade-out');
        });
        // main-content uses flex column layout
        if (phaseId === 'main-content') {
            document.getElementById('main-content').style.display = 'flex';
        }
    },

    _showLoading() {
        this._showPhase('loading');
        this._startTaglineCycle();
    },

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

    /* ===== Team Selection ===== */

    async _showTeamSelection() {
        this._showLoading();
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);
            this.state.teams = data.teams;
            if (!this.state.teams.length) throw new Error('No teams found in league');
            this._stopTaglineCycle();
            MaddenRenderer.renderTeamGrid(this.state.teams);
            this._showPhase('team-select-screen');
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    selectTeam(teamId, teamName) {
        this.state.teamId = teamId;
        this.state.teamName = teamName;
        MaddenRenderer.highlightTeamCard(teamId);
        // Auto-confirm after brief delay for visual feedback
        setTimeout(() => this._confirmTeamSelection(), 300);
    },

    async _confirmTeamSelection() {
        if (!this.state.teamId) return;
        const url = new URL(window.location);
        url.searchParams.set('teamId', this.state.teamId);
        window.history.replaceState({}, '', url);
        this._showLoading();
        await this._loadAndShowMenu();
    },

    async _findTeamByName(name) {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);
            const team = data.teams.find(t => t.team_name.toLowerCase().includes(name.toLowerCase()));
            if (!team) throw new Error('Team "' + name + '" not found');
            this.state.teamId = team.team_id;
            this.state.teamName = team.team_name;
            await this._loadAndShowMenu();
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    /* ===== Main Menu ===== */

    async _loadAndShowMenu() {
        try {
            // Load first week
            await this._fetchWeekData(this.state.startWeek);
            this._extractWeekResult(this.state.startWeek);

            // Set team name from first week data if not set
            if (!this.state.teamName) {
                const d = this.state.weekData[this.state.startWeek];
                if (d && d.my_matchup) this.state.teamName = d.my_matchup.my_team.team_name;
            }

            this._stopTaglineCycle();
            this._showPhase('main-content');
            this._setupTabListeners();
            this._setupKeyboard();
            this._renderCurrentTab();

            // Background prefetch all weeks
            this._prefetchAll();
        } catch (err) {
            this._stopTaglineCycle();
            this.showError(err.message);
        }
    },

    async _fetchWeekData(week) {
        if (this.state.weekData[week]) return;
        const url = CONFIG.API_BASE_URL + '/league/' + this.state.leagueId + '/week/' + week + '/deep-dive?year=' + this.state.year + '&team_id=' + this.state.teamId + '&include_summaries=true';
        const { data, error } = await apiFetch(url);
        if (error) throw new Error(error);
        this.state.weekData[week] = data;
    },

    _extractWeekResult(week) {
        const d = this.state.weekData[week];
        if (!d || !d.my_matchup) return;
        const my = d.my_matchup.my_team;
        const opp = d.my_matchup.opponent;
        this.state.weekResults[week] = {
            won: my.won,
            myScore: my.score,
            oppScore: opp.score,
            oppName: opp.team_name
        };
    },

    async _prefetchAll() {
        for (let w = this.state.startWeek; w <= this.state.endWeek; w++) {
            if (this.state.weekData[w]) { this._extractWeekResult(w); continue; }
            try {
                await this._fetchWeekData(w);
                this._extractWeekResult(w);
                this._renderCurrentTab();
            } catch (e) { /* skip failed weeks */ }
        }
    },

    /* ===== Tab Navigation ===== */

    _setupTabListeners() {
        document.querySelectorAll('.madden-tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });
    },

    switchTab(tabName) {
        this.state.currentTab = tabName;
        MaddenRenderer.setActiveTab(tabName);
        this._renderCurrentTab();
    },

    _renderCurrentTab() {
        const s = this.state;
        switch (s.currentTab) {
            case 'home':
                MaddenRenderer.renderHomeHero(s.teamName || 'Your Team', s.year, s.startWeek, s.endWeek, s.weekResults);
                MaddenRenderer.renderWeekCarousel(s.startWeek, s.endWeek, s.weekResults, s.focusedWeek);
                break;
            case 'season':
                MaddenRenderer.renderSeasonGrid(s.startWeek, s.endWeek, s.weekResults, s.focusedWeek);
                break;
            case 'standings':
                MaddenRenderer.renderStandingsWeekSelector(s.startWeek, s.endWeek, s.standingsWeek);
                this._renderStandingsForWeek(s.standingsWeek);
                break;
            case 'scores':
                MaddenRenderer.renderScoresWeekSelector(s.startWeek, s.endWeek, s.scoresWeek);
                this._renderScoresForWeek(s.scoresWeek);
                break;
        }
    },

    /* ===== Standings & Scores ===== */

    async showStandingsForWeek(week) {
        this.state.standingsWeek = week;
        MaddenRenderer.renderStandingsWeekSelector(this.state.startWeek, this.state.endWeek, week);
        await this._renderStandingsForWeek(week);
    },

    async _renderStandingsForWeek(week) {
        if (!this.state.weekData[week]) {
            try { await this._fetchWeekData(week); this._extractWeekResult(week); } catch(e) {}
        }
        const d = this.state.weekData[week];
        MaddenRenderer.renderStandings(d ? d.standings : null, this.state.teamId);
    },

    async showScoresForWeek(week) {
        this.state.scoresWeek = week;
        MaddenRenderer.renderScoresWeekSelector(this.state.startWeek, this.state.endWeek, week);
        await this._renderScoresForWeek(week);
    },

    async _renderScoresForWeek(week) {
        if (!this.state.weekData[week]) {
            try { await this._fetchWeekData(week); this._extractWeekResult(week); } catch(e) {}
        }
        const d = this.state.weekData[week];
        MaddenRenderer.renderNFLScores(d ? d.nfl_scores : null);
    },

    /* ===== Week Detail ===== */

    async openWeekDetail(week) {
        this.state.detailWeek = week;
        if (!this.state.weekData[week]) {
            try { await this._fetchWeekData(week); this._extractWeekResult(week); } catch(e) { return; }
        }
        const d = this.state.weekData[week];
        if (!d || !d.my_matchup) return;
        MaddenRenderer.openWeekDetail(d, week, this.state.startWeek, this.state.endWeek);
    },

    closeWeekDetail() {
        this.state.detailWeek = null;
        MaddenRenderer.closeWeekDetail();
    },

    async detailPrevWeek() {
        if (this.state.detailWeek > this.state.startWeek) {
            await this.openWeekDetail(this.state.detailWeek - 1);
        }
    },

    async detailNextWeek() {
        if (this.state.detailWeek < this.state.endWeek) {
            await this.openWeekDetail(this.state.detailWeek + 1);
        }
    },

    /* ===== Keyboard Navigation ===== */

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // If detail overlay is open
            if (this.state.detailWeek !== null) {
                if (e.key === 'Escape') { this.closeWeekDetail(); e.preventDefault(); }
                else if (e.key === 'ArrowLeft') { this.detailPrevWeek(); e.preventDefault(); }
                else if (e.key === 'ArrowRight') { this.detailNextWeek(); e.preventDefault(); }
                return;
            }

            // Tab switching
            if (e.key === 'Tab') {
                e.preventDefault();
                const tabs = ['home', 'season', 'standings', 'scores'];
                const idx = tabs.indexOf(this.state.currentTab);
                const next = e.shiftKey ? (idx - 1 + tabs.length) % tabs.length : (idx + 1) % tabs.length;
                this.switchTab(tabs[next]);
                return;
            }

            // Arrow key navigation for week focus (home/season tabs)
            if (this.state.currentTab === 'home' || this.state.currentTab === 'season') {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (this.state.focusedWeek > this.state.startWeek) {
                        this.state.focusedWeek--;
                        this._renderCurrentTab();
                    }
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (this.state.focusedWeek < this.state.endWeek) {
                        this.state.focusedWeek++;
                        this._renderCurrentTab();
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.openWeekDetail(this.state.focusedWeek);
                }
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                window.location.href = '/';
            }
        });
    },

    /* ===== Error ===== */

    showError(message) {
        this._stopTaglineCycle();
        document.querySelectorAll('.fullscreen-phase').forEach(p => p.style.display = 'none');
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-screen').style.display = 'flex';
    }
};

document.addEventListener('DOMContentLoaded', () => { MaddenController.init(); });
