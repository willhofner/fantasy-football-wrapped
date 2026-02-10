/* ===== MARIO WORLD CONTROLLER ===== */
/* Handles game logic, input, state management, API integration */

const MARIO_TAGLINES = [
    'Building your world...',
    'Placing mushrooms...',
    'Drawing the map...',
    'Summoning Toad...',
    'Loading your season...',
    'Preparing the Mushroom Kingdom...',
    'Polishing the pipes...',
    'Waking up the Goombas...',
];

const MarioController = {
    state: {
        leagueId: null, year: null, teamId: null, teamName: null,
        startWeek: 1, endWeek: 14, teams: [],
        playerX: 0, playerY: 0, playerDir: "down", isMoving: false, playerSpeed: 1.5,
        weekData: {}, weekResults: {},
        nearLocation: null, overlayWeek: null, overlayOpen: false, gameRunning: false,
        totalWins: 0, totalLosses: 0,
    },
    keys: {},
    _taglineInterval: null,
    _animFrameId: null,
    _prefetchStarted: false,

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;
        this.state.startWeek = parseInt(params.get('startWeek')) || 1;
        this.state.endWeek = parseInt(params.get('endWeek')) || 14;
        const teamIdParam = params.get('teamId');
        const teamNameParam = params.get('team');
        if (!this.state.leagueId) { this.showError('Missing league ID. Please start from the hub page.'); return; }
        if (teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            this._showLoading();
            await this.startGame();
        } else if (teamNameParam) {
            this._showLoading();
            await this.findTeamByName(teamNameParam);
        } else {
            await this.showTeamSelection();
        }
    },

    _showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('team-select-screen').style.display = 'none';
        this._startTaglineCycle();
    },

    _startTaglineCycle() {
        const el = document.getElementById('loadingTagline');
        if (!el) return;
        let idx = 0;
        el.textContent = MARIO_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % MARIO_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = MARIO_TAGLINES[idx]; el.style.opacity = '1'; }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) { clearInterval(this._taglineInterval); this._taglineInterval = null; }
    },

    async showTeamSelection() {
        document.getElementById('loading').style.display = 'flex';
        this._startTaglineCycle();
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);
            this.state.teams = data.teams;
            if (this.state.teams.length === 0) throw new Error('No teams found in league');
            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            const grid = document.getElementById('teamGrid');
            grid.innerHTML = this.state.teams.map(t => `
                <div class="team-card" data-team-id="${t.team_id}" onclick="MarioController.selectTeam(${t.team_id}, '${escapeHtml(t.team_name).replace(/'/g, "\\'")}')">
                    <span class="team-card-name">${escapeHtml(t.team_name)}</span>
                </div>
            `).join('');
            document.getElementById('team-select-screen').style.display = 'flex';
        } catch (err) { this._stopTaglineCycle(); this.showError(err.message); }
    },

    selectTeam(teamId, teamName) {
        this.state.teamId = teamId;
        this.state.teamName = teamName;
        document.querySelectorAll('.team-card').forEach(card => {
            card.classList.toggle("selected", parseInt(card.dataset.teamId) === teamId);
        });
        document.getElementById('teamSelectBtn').disabled = false;
    },

    async confirmTeamSelection() {
        if (!this.state.teamId) return;
        document.getElementById('team-select-screen').style.display = 'none';
        this._showLoading();
        const url = new URL(window.location);
        url.searchParams.set('teamId', this.state.teamId);
        window.history.replaceState({}, '', url);
        await this.startGame();
    },

    async findTeamByName(teamName) {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);
            const team = data.teams.find(t => t.team_name.toLowerCase().includes(teamName.toLowerCase()));
            if (!team) throw new Error("Team not found: " + teamName);
            this.state.teamId = team.team_id;
            this.state.teamName = team.team_name;
            await this.startGame();
        } catch (err) { this._stopTaglineCycle(); this.showError(err.message); }
    },

    async startGame() {
        try {
            await this._fetchWeekData(this.state.startWeek);
            this._extractWeekResult(this.state.startWeek);
            const canvas = document.getElementById('gameCanvas');
            MarioRenderer.init(canvas);
            const startLoc = MarioRenderer.getLocationCenter(this.state.startWeek);
            this.state.playerX = startLoc.x;
            this.state.playerY = startLoc.y;
            this._updateHUD();
            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            this._setupInput();
            this.state.gameRunning = true;
            this._gameLoop();
            this._prefetchAllWeeks();
        } catch (err) { this._stopTaglineCycle(); this.showError(err.message); }
    },

    async _fetchWeekData(week) {
        if (this.state.weekData[week]) return;
        const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/week/${week}/deep-dive?year=${this.state.year}&team_id=${this.state.teamId}&include_summaries=true`;
        const { data, error } = await apiFetch(url);
        if (error) throw new Error(error);
        this.state.weekData[week] = data;
    },

    _extractWeekResult(week) {
        const data = this.state.weekData[week];
        if (!data || !data.my_matchup) return;
        const my = data.my_matchup.my_team;
        const opp = data.my_matchup.opponent;
        this.state.weekResults[week] = { won: my.won, myScore: my.score, oppScore: opp.score };
        this._recalcRecord();
    },

    _recalcRecord() {
        let w = 0, l = 0;
        for (const wk in this.state.weekResults) { if (this.state.weekResults[wk].won) w++; else l++; }
        this.state.totalWins = w;
        this.state.totalLosses = l;
        this._updateHUD();
    },

    _updateHUD() {
        const wE = document.getElementById('hud-wins');
        const lE = document.getElementById('hud-losses');
        const tE = document.getElementById('hud-team-name');
        if (wE) wE.textContent = this.state.totalWins;
        if (lE) lE.textContent = this.state.totalLosses;
        if (tE) tE.textContent = this.state.teamName || '';
    },

    async _prefetchAllWeeks() {
        if (this._prefetchStarted) return;
        this._prefetchStarted = true;
        for (let w = this.state.startWeek; w <= this.state.endWeek; w++) {
            if (this.state.weekData[w]) { this._extractWeekResult(w); continue; }
            try { await this._fetchWeekData(w); this._extractWeekResult(w); } catch (e) { console.warn('Prefetch fail week', w, e); }
        }
    },

    _setupInput() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        this._setupTouch();
    },

    _onKeyDown(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        if (key === 'enter' && this.state.nearLocation && !this.state.overlayOpen) { e.preventDefault(); this.openOverlay(this.state.nearLocation); }
        if (key === 'escape' && this.state.overlayOpen) { e.preventDefault(); this.closeOverlay(); }
        if (this.state.overlayOpen) {
            if (key === 'arrowleft') { e.preventDefault(); this.overlayPrevWeek(); }
            if (key === 'arrowright') { e.preventDefault(); this.overlayNextWeek(); }
        }
        if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key) && !this.state.overlayOpen) e.preventDefault();
    },

    _onKeyUp(e) { this.keys[e.key.toLowerCase()] = false; },

    _setupTouch() {
        let touchStartX = 0, touchStartY = 0, touchActive = false;
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        canvas.addEventListener('touchstart', (e) => {
            const t = e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY; touchActive = true; e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            if (!touchActive) return;
            const t = e.touches[0]; const dx = t.clientX - touchStartX; const dy = t.clientY - touchStartY;
            this.keys['arrowup']=false; this.keys['arrowdown']=false; this.keys['arrowleft']=false; this.keys['arrowright']=false;
            const threshold = 15;
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                if (Math.abs(dx) > Math.abs(dy)) this.keys[dx > 0 ? 'arrowright' : 'arrowleft'] = true;
                else this.keys[dy > 0 ? 'arrowdown' : 'arrowup'] = true;
            }
            e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchend', () => {
            touchActive = false; this.keys['arrowup']=false; this.keys['arrowdown']=false; this.keys['arrowleft']=false; this.keys['arrowright']=false;
        });
        canvas.addEventListener('click', () => { if (this.state.nearLocation && !this.state.overlayOpen) this.openOverlay(this.state.nearLocation); });
    },

    _gameLoop() {
        if (!this.state.gameRunning) return;
        if (!this.state.overlayOpen) this._updatePlayer();
        MarioRenderer.updateCamera(this.state.playerX, this.state.playerY);
        MarioRenderer.render(this.state);
        this._animFrameId = requestAnimationFrame(() => this._gameLoop());
    },

    _updatePlayer() {
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy = -1;
        if (this.keys['s'] || this.keys['arrowdown']) dy = 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
        if (this.keys['d'] || this.keys['arrowright']) dx = 1;
        this.state.isMoving = (dx !== 0 || dy !== 0);
        if (this.state.isMoving) {
            if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
            if (Math.abs(dx) > Math.abs(dy)) this.state.playerDir = dx > 0 ? 'right' : 'left';
            else this.state.playerDir = dy > 0 ? 'down' : 'up';
            const newX = this.state.playerX + dx * this.state.playerSpeed;
            const newY = this.state.playerY + dy * this.state.playerSpeed;
            const nearest = MarioRenderer.getNearestPathPoint(newX, newY);
            if (nearest && nearest.dist < MarioRenderer.tileSize * 3) {
                const pull = Math.max(0, 1 - nearest.dist / (MarioRenderer.tileSize * 3));
                this.state.playerX = newX + (nearest.x - newX) * pull * 0.3;
                this.state.playerY = newY + (nearest.y - newY) * pull * 0.3;
            } else if (nearest) {
                this.state.playerX += (nearest.x - this.state.playerX) * 0.1;
                this.state.playerY += (nearest.y - this.state.playerY) * 0.1;
            }
            this.state.playerX = Math.max(0, Math.min(this.state.playerX, MarioRenderer.mapWidth * MarioRenderer.tileSize));
            this.state.playerY = Math.max(0, Math.min(this.state.playerY, MarioRenderer.mapHeight * MarioRenderer.tileSize));
        }
        const nearWeek = MarioRenderer.getLocationAt(this.state.playerX, this.state.playerY, MarioRenderer.tileSize * 1.8);
        if (nearWeek !== this.state.nearLocation) { this.state.nearLocation = nearWeek; this._updatePrompt(); }
    },

    _updatePrompt() {
        const prompt = document.getElementById('enter-prompt');
        const locSpan = document.getElementById('prompt-location');
        if (this.state.nearLocation) {
            const loc = MarioRenderer.getLocation(this.state.nearLocation);
            locSpan.textContent = 'Week ' + loc.week + ': ' + loc.name;
            prompt.style.display = 'block';
        } else { prompt.style.display = 'none'; }
    },

    async openOverlay(week) {
        this.state.overlayOpen = true;
        this.state.overlayWeek = week;
        document.getElementById('stats-overlay').style.display = 'flex';
        document.getElementById('enter-prompt').style.display = 'none';
        if (!this.state.weekData[week]) {
            document.getElementById('stats-body').innerHTML = '<p style="text-align:center;padding:40px;font-size:0.6em;">Loading week data...</p>';
            try { await this._fetchWeekData(week); this._extractWeekResult(week); }
            catch (e) { document.getElementById('stats-body').innerHTML = '<p style="text-align:center;padding:40px;font-size:0.6em;color:#e52521;">Failed: ' + escapeHtml(e.message) + '</p>'; return; }
        }
        this._renderOverlay(week);
    },

    closeOverlay() {
        this.state.overlayOpen = false;
        this.state.overlayWeek = null;
        document.getElementById('stats-overlay').style.display = 'none';
        this._updatePrompt();
    },

    overlayPrevWeek() { if (this.state.overlayWeek && this.state.overlayWeek - 1 >= this.state.startWeek) this.openOverlay(this.state.overlayWeek - 1); },
    overlayNextWeek() { if (this.state.overlayWeek && this.state.overlayWeek + 1 <= this.state.endWeek) this.openOverlay(this.state.overlayWeek + 1); },

    _renderOverlay(week) {
        const data = this.state.weekData[week];
        if (!data) return;
        const loc = MarioRenderer.getLocation(week);
        const locName = loc ? loc.name : 'Week ' + week;
        document.getElementById('stats-title').textContent = 'Week ' + week + ' - ' + locName;
        document.getElementById('stats-prev').disabled = (week <= this.state.startWeek);
        document.getElementById('stats-next').disabled = (week >= this.state.endWeek);
        const body = document.getElementById('stats-body');
        let html = '';
        const my = data.my_matchup ? data.my_matchup.my_team : null;
        const opp = data.my_matchup ? data.my_matchup.opponent : null;
        if (my && opp) {
            const won = my.won;
            html += `<div class="stat-week-header"><h2>${locName}</h2><span class="stat-week-result ${won ? 'win' : 'loss'}">${won ? 'VICTORY' : 'DEFEAT'} &mdash; ${this._fmtPts(my.score)} to ${this._fmtPts(opp.score)}</span></div>`;
            html += `<div class="stat-matchup"><div class="stat-team"><span class="stat-team-name">${escapeHtml(my.team_name)}</span><span class="stat-team-score">${this._fmtPts(my.score)}</span><span class="stat-team-optimal">Optimal: ${this._fmtPts(my.optimal_score)}</span></div><div class="stat-vs">VS</div><div class="stat-team"><span class="stat-team-name">${escapeHtml(opp.team_name)}</span><span class="stat-team-score">${this._fmtPts(opp.score)}</span><span class="stat-team-optimal">Optimal: ${this._fmtPts(opp.optimal_score)}</span></div></div>`;
            if (my.errors && my.errors.length > 0) {
                const totalLost = my.errors.reduce((s, e) => s + e.points_lost, 0);
                html += `<div class="stat-errors"><h3>Lineup Errors (-${this._fmtPts(totalLost)} pts)</h3>`;
                my.errors.forEach(err => { html += `<div class="stat-error-row"><span class="stat-error-swap">Bench ${escapeHtml(err.bench_player)} for ${escapeHtml(err.should_replace)}</span><span class="stat-error-pts">-${this._fmtPts(err.points_lost)}</span></div>`; });
                html += '</div>';
            }
        }
        if (data.fantasy_summary) {
            html += '<div class="stat-summary-section"><h3>League Recap</h3>';
            data.fantasy_summary.split('\n\n').filter(p => p.trim()).forEach(para => { html += '<p>' + escapeHtml(para.trim()) + '</p>'; });
            html += '</div>';
        }
        if (data.standings && data.standings.length > 0) {
            html += '<div class="stat-standings"><h3>Standings</h3>';
            data.standings.forEach(team => {
                const isMy = team.team_id === this.state.teamId;
                html += `<div class="stat-standing-row ${isMy ? 'my-team' : ''}"><span class="stat-standing-rank">${team.rank}</span><span class="stat-standing-name">${escapeHtml(team.team_name)}</span><span class="stat-standing-record">${team.record}</span><span class="stat-standing-pts">${this._fmtPts(team.points_for)}</span></div>`;
            });
            html += '</div>';
        }
        if (data.nfl_scores && data.nfl_scores.length > 0) {
            html += '<div class="stat-nfl-scores"><h3>NFL Scores</h3><div class="stat-nfl-grid">';
            data.nfl_scores.forEach(game => {
                html += `<div class="stat-nfl-game"><div class="stat-nfl-team ${game.away.winner ? 'winner' : 'loser'}"><span>${game.away.abbreviation}</span><span>${game.away.score}</span></div><div class="stat-nfl-team ${game.home.winner ? 'winner' : 'loser'}"><span>${game.home.abbreviation}</span><span>${game.home.score}</span></div></div>`;
            });
            html += '</div></div>';
        }
        if (data.nfl_summary) {
            html += '<div class="stat-summary-section"><h3>NFL Week ' + week + ' Recap</h3>';
            data.nfl_summary.split('\n\n').filter(p => p.trim()).forEach(para => { html += '<p>' + escapeHtml(para.trim()) + '</p>'; });
            html += '</div>';
        }
        if (data.all_matchups && data.all_matchups.length > 0) {
            html += '<div class="stat-all-matchups"><h3>All Matchups</h3>';
            data.all_matchups.forEach(m => {
                const hw = m.home.won;
                html += `<div class="stat-matchup-mini"><span class="stat-mini-name ${hw ? 'winner' : 'loser'}">${escapeHtml(m.home.team_name)}</span><span class="stat-mini-score">${this._fmtPts(m.home.score)}</span><span class="stat-mini-vs">vs</span><span class="stat-mini-score">${this._fmtPts(m.away.score)}</span><span class="stat-mini-name ${!hw ? 'winner' : 'loser'}">${escapeHtml(m.away.team_name)}</span></div>`;
            });
            html += '</div>';
        }
        body.innerHTML = html;
    },

    _fmtPts(n) { if (n === null || n === undefined) return '0.0'; return Number(n).toFixed(1); },

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('team-select-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-screen').style.display = 'flex';
    }
};

document.addEventListener('DOMContentLoaded', () => { MarioController.init(); });