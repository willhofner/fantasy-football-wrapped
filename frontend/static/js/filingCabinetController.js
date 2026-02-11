/* Filing Cabinet Controller — detective/office themed weekly explorer */

const FC_TAGLINES = [
    'Dusting off the files...',
    'Opening the evidence locker...',
    'Reviewing the case files...',
    'Checking the dossiers...',
    'Cross-referencing the records...',
    'Pulling the manila folders...',
    'Stamping the documents...',
    'Filing the incident reports...',
    'Interviewing the witnesses...',
    'Unlocking the cabinet...',
    'Scanning the fingerprints...',
    'Cracking the code...',
];

const FilingCabinet = {
    state: {
        leagueId: null,
        year: null,
        teamId: null,
        teamName: null,
        startWeek: 1,
        endWeek: 14,
        teams: [],
        weekData: {},
        weekResults: {},
        currentWeek: null,
    },

    _taglineInterval: null,

    _startTaglineCycle() {
        const el = document.getElementById('loading-tagline');
        if (!el) return;
        let idx = 0;
        el.textContent = FC_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % FC_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = FC_TAGLINES[idx]; el.style.opacity = '1'; }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) { clearInterval(this._taglineInterval); this._taglineInterval = null; }
    },

    /* ── Init ── */
    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;
        this.state.startWeek = parseInt(params.get('startWeek')) || 1;
        this.state.endWeek = parseInt(params.get('endWeek')) || 14;

        const teamIdParam = params.get('teamId');
        const teamNameParam = params.get('team');

        // Bind close button + Escape key
        document.getElementById('fileClose').addEventListener('click', () => this.closeFile());
        document.getElementById('fileViewer').addEventListener('click', (e) => {
            if (e.target.id === 'fileViewer') this.closeFile();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeFile();
        });

        if (this.state.leagueId && teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            this._showLoading();
            await this._loadAllWeeks();
        } else if (this.state.leagueId && teamNameParam) {
            this._showLoading();
            await this._findTeamByName(teamNameParam);
        } else if (this.state.leagueId) {
            await this._showTeamSelection();
        } else {
            this._setupForm();
        }
    },

    /* ── Setup Form (no URL params) ── */
    _setupForm() {
        document.getElementById('fetchTeamsBtn').addEventListener('click', () => this._onFetchTeams());
        document.getElementById('leagueIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this._onFetchTeams();
        });
    },

    async _onFetchTeams() {
        const leagueId = document.getElementById('leagueIdInput').value.trim();
        const year = document.getElementById('yearInput').value;
        if (!leagueId) {
            document.getElementById('setup-error').textContent = 'Please enter a league ID';
            return;
        }
        this.state.leagueId = leagueId;
        this.state.year = parseInt(year);
        await this._showTeamSelection();
    },

    /* ── Team Selection ── */
    async _showTeamSelection() {
        document.getElementById('setup-step-league').style.display = 'none';
        document.getElementById('setup-step-team').style.display = 'block';

        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);

            this.state.teams = data.teams;
            const grid = document.getElementById('teamList');
            grid.innerHTML = this.state.teams.map(t =>
                `<button class="team-btn" data-id="${t.team_id}" onclick="FilingCabinet.selectTeam(${t.team_id}, '${escapeHtml(t.team_name).replace(/'/g, "\\'")}')">${escapeHtml(t.team_name)}</button>`
            ).join('');
        } catch (err) {
            document.getElementById('setup-error').textContent = err.message;
        }
    },

    selectTeam(teamId, teamName) {
        this.state.teamId = teamId;
        this.state.teamName = teamName;
        document.querySelectorAll('.team-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.id) === teamId));
        document.getElementById('startBtn').disabled = false;
        document.getElementById('startBtn').onclick = () => this._onStart();
    },

    async _onStart() {
        document.getElementById('setup-screen').style.display = 'none';
        this._showLoading();

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('leagueId', this.state.leagueId);
        url.searchParams.set('year', this.state.year);
        url.searchParams.set('teamId', this.state.teamId);
        window.history.replaceState({}, '', url);

        await this._loadAllWeeks();
    },

    async _findTeamByName(name) {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);
            const team = data.teams.find(t => t.team_name.toLowerCase().includes(name.toLowerCase()));
            if (!team) throw new Error(`Team "${name}" not found`);
            this.state.teamId = team.team_id;
            this.state.teamName = team.team_name;
            await this._loadAllWeeks();
        } catch (err) {
            this._showError(err.message);
        }
    },

    /* ── Loading ── */
    _showLoading() {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('loading').style.display = 'flex';
        this._startTaglineCycle();
    },

    _showError(msg) {
        this._stopTaglineCycle();
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-message').textContent = msg;
        document.getElementById('error-screen').style.display = 'flex';
    },

    /* ── Data Loading ── */
    async _loadAllWeeks() {
        try {
            // Load first week, then show cabinet while rest loads
            await this._fetchWeek(this.state.startWeek);
            this._extractResult(this.state.startWeek);

            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            document.getElementById('cabinetYear').textContent = this.state.year;
            this._renderFolderTabs();

            // Pre-fetch remaining weeks in background
            const promises = [];
            for (let w = this.state.startWeek + 1; w <= this.state.endWeek; w++) {
                promises.push(
                    this._fetchWeek(w)
                        .then(() => this._extractResult(w))
                        .catch(() => {})
                );
            }
            await Promise.all(promises);
            this._renderFolderTabs();
        } catch (err) {
            this._showError(err.message);
        }
    },

    async _fetchWeek(week) {
        if (this.state.weekData[week]) return;
        const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/week/${week}/deep-dive?year=${this.state.year}&team_id=${this.state.teamId}&include_summaries=false`;
        const { data, error } = await apiFetch(url);
        if (error) throw new Error(error);
        this.state.weekData[week] = data;
    },

    _extractResult(week) {
        const data = this.state.weekData[week];
        if (!data || !data.my_matchup) return;
        const my = data.my_matchup.my_team;
        const opp = data.my_matchup.opponent;
        if (my == null || opp == null) return;
        this.state.weekResults[week] = {
            won: !!my.won,
            myScore: my.score || 0,
            oppScore: opp.score || 0,
            oppName: opp.team_name || 'Opponent',
        };
    },

    /* ── Folder Tabs ── */
    _renderFolderTabs() {
        const container = document.getElementById('folderTabs');
        container.innerHTML = '';

        for (let w = this.state.startWeek; w <= this.state.endWeek; w++) {
            const tab = document.createElement('div');
            tab.className = 'folder-tab' + (w === this.state.currentWeek ? ' active' : '');
            tab.dataset.week = w;

            const result = this.state.weekResults[w];
            if (result) {
                const wl = result.won ? 'W' : 'L';
                const wlClass = result.won ? 'win' : 'loss';
                tab.innerHTML = `WK ${w}<span class="folder-tab-wl"><span class="${wlClass}">${wl}</span> ${result.myScore.toFixed(1)}-${result.oppScore.toFixed(1)}</span>`;
            } else {
                tab.textContent = `WK ${w}`;
            }

            tab.addEventListener('click', () => this.openFile(w));
            container.appendChild(tab);
        }
    },

    /* ── File Viewer ── */
    async openFile(week) {
        this.state.currentWeek = week;
        this._renderFolderTabs();

        // Load if needed
        if (!this.state.weekData[week]) {
            try { await this._fetchWeek(week); this._extractResult(week); }
            catch (err) { console.error('[FC] Failed to load week', week, err); return; }
        }

        const data = this.state.weekData[week];
        document.getElementById('folderTopTab').textContent = `WEEK ${week}`;
        document.getElementById('filePages').innerHTML = this._renderFilePages(data, week);

        const viewer = document.getElementById('fileViewer');
        viewer.classList.add('open');
    },

    closeFile() {
        document.getElementById('fileViewer').classList.remove('open');
    },

    /* ── File Content ── */
    _renderFilePages(data, week) {
        let html = '';

        // Matchup stamp
        const my = data.my_matchup?.my_team;
        const opp = data.my_matchup?.opponent;
        if (my && opp) {
            const stampClass = my.won ? 'win' : 'loss';
            const stampText = my.won ? 'VICTORY' : 'DEFEAT';
            html += `<div class="page-section">
                <div class="page-stamp ${stampClass}">${stampText}</div>
                <div class="page-title">Week ${week} — Matchup Report</div>
                <div class="page-stat"><span class="page-stat-label">Your Score</span><span class="page-stat-value">${my.score.toFixed(1)}</span></div>
                <div class="page-stat"><span class="page-stat-label">Opponent</span><span class="page-stat-value">${escapeHtml(opp.team_name || 'Opponent')}</span></div>
                <div class="page-stat"><span class="page-stat-label">Opp Score</span><span class="page-stat-value">${opp.score.toFixed(1)}</span></div>
                <div class="page-stat"><span class="page-stat-label">Margin</span><span class="page-stat-value">${(my.score - opp.score).toFixed(1)}</span></div>
            </div>`;
        }

        // Your Roster
        if (my && my.starters && my.starters.length > 0) {
            html += `<div class="page-section">
                <div class="page-title">Your Lineup</div>
                <div class="page-roster">
                    ${my.starters.map(p => `<div class="page-player">
                        <span class="page-player-name">${escapeHtml(p.name)}</span>
                        <span class="page-player-pos">${p.position || ''}</span>
                        <span class="page-player-pts">${p.points.toFixed(1)}</span>
                    </div>`).join('')}
                </div>
            </div>`;
        }

        // Opponent Roster
        if (opp && opp.starters && opp.starters.length > 0) {
            html += `<div class="page-section">
                <div class="page-title">Opponent Lineup — ${escapeHtml(opp.team_name || 'Opponent')}</div>
                <div class="page-roster">
                    ${opp.starters.map(p => `<div class="page-player">
                        <span class="page-player-name">${escapeHtml(p.name)}</span>
                        <span class="page-player-pos">${p.position || ''}</span>
                        <span class="page-player-pts">${p.points.toFixed(1)}</span>
                    </div>`).join('')}
                </div>
            </div>`;
        }

        // Bench (if available)
        if (my && my.bench && my.bench.length > 0) {
            html += `<div class="page-section">
                <div class="page-title">Your Bench</div>
                <div class="page-roster">
                    ${my.bench.map(p => `<div class="page-player">
                        <span class="page-player-name">${escapeHtml(p.name)}</span>
                        <span class="page-player-pos">${p.position || ''}</span>
                        <span class="page-player-pts">${p.points.toFixed(1)}</span>
                    </div>`).join('')}
                </div>
            </div>`;
        }

        // Standings snapshot
        if (data.standings && data.standings.length > 0) {
            html += `<div class="page-section">
                <div class="page-title">League Standings — Week ${week}</div>
                <div class="page-roster">
                    ${data.standings.map((t, i) => {
                        const isMine = t.team_id === this.state.teamId;
                        const bold = isMine ? 'font-weight: 700;' : '';
                        return `<div class="page-player" style="${bold}">
                            <span class="page-player-name">${i + 1}. ${escapeHtml(t.team_name)}</span>
                            <span class="page-player-pos">${t.wins}-${t.losses}</span>
                            <span class="page-player-pts">${t.points_for ? t.points_for.toFixed(1) : ''}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        // Other matchups
        if (data.all_matchups && data.all_matchups.length > 0) {
            const others = data.all_matchups.filter(m => {
                const teamIds = [m.team_a?.team_id, m.team_b?.team_id];
                return !teamIds.includes(this.state.teamId);
            });
            if (others.length > 0) {
                html += `<div class="page-section">
                    <div class="page-title">Other Matchups</div>
                    <div class="page-roster">
                        ${others.map(m => {
                            const a = m.team_a || {};
                            const b = m.team_b || {};
                            return `<div class="page-player">
                                <span class="page-player-name">${escapeHtml(a.team_name || '?')} vs ${escapeHtml(b.team_name || '?')}</span>
                                <span class="page-player-pts">${(a.score || 0).toFixed(1)}-${(b.score || 0).toFixed(1)}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            }
        }

        if (!html) {
            html = '<div class="page-section"><div class="page-title">No Data</div><p>No matchup data available for this week.</p></div>';
        }

        return html;
    },
};

// Init
document.addEventListener('DOMContentLoaded', () => FilingCabinet.init());
