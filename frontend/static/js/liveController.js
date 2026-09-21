/* Live This Week — in-season controller */

const LiveController = {
    state: {
        leagueId: null,
        year: null,
        week: null,
        teamId: null,
        data: null,
        expanded: new Set(),
        timer: null,
        auto: true,
    },

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || this._currentSeason();
        this.state.week = parseInt(params.get('week')) || null;
        this.state.teamId = parseInt(params.get('teamId')) || null;

        if (!this.state.leagueId) {
            this.showError('Missing league ID. Start from the hub and enter your league.');
            return;
        }
        await this.refresh();
        this.toggleAuto(true);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.auto) this.refresh();
        });
    },

    _currentSeason() {
        const now = new Date();
        return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    },

    async refresh(manual = false) {
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.classList.add('spinning');
        const q = new URLSearchParams({ year: this.state.year });
        if (this.state.week) q.set('week', this.state.week);
        const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/live?${q.toString()}`;
        const { data, error } = await apiFetch(url);
        if (btn) btn.classList.remove('spinning');
        if (error) {
            if (!this.state.data) this.showError(error);
            return;
        }
        this.state.data = data;
        this.state.week = data.week;
        if (!this.state.teamId && data.matchups.length) {
            this.state.teamId = data.matchups[0].home.team_id;
        }
        this.render();
        this._scheduleNext();
    },

    _scheduleNext() {
        clearTimeout(this.state.timer);
        if (!this.state.auto || !this.state.data) return;
        // Poll fast while games are in progress, slowly otherwise.
        const ms = this.state.data.phase === 'live' ? 60_000 : 5 * 60_000;
        this.state.timer = setTimeout(() => this.refresh(), ms);
    },

    toggleAuto(on) {
        this.state.auto = on;
        const box = document.getElementById('autoRefresh');
        if (box) box.checked = on;
        this._scheduleNext();
    },

    changeWeek(week) {
        this.state.week = parseInt(week);
        this._syncUrl();
        this.refresh();
    },

    changeTeam(teamId) {
        this.state.teamId = parseInt(teamId);
        this._syncUrl();
        this.render();
    },

    _syncUrl() {
        const p = new URLSearchParams(window.location.search);
        p.set('year', this.state.year);
        if (this.state.week) p.set('week', this.state.week);
        if (this.state.teamId) p.set('teamId', this.state.teamId);
        history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
    },

    showError(msg) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        const box = document.getElementById('error-screen');
        box.style.display = 'block';
        document.getElementById('error-message').textContent = msg;
    },

    toggleExpand(id) {
        if (this.state.expanded.has(id)) this.state.expanded.delete(id); else this.state.expanded.add(id);
        this.render();
    },

    // ===== Rendering =====

    render() {
        const d = this.state.data;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        document.getElementById('leagueName').textContent = `${d.league_name || 'League'} · ${d.season}`;
        document.getElementById('weekNumber').textContent = d.week;
        const badge = document.getElementById('phaseBadge');
        badge.textContent = d.phase === 'live' ? 'LIVE' : d.phase === 'final' ? 'FINAL' : 'PREGAME';
        badge.className = `live-phase phase-${d.phase}`;
        const when = new Date(d.generated_at);
        document.getElementById('updatedAt').textContent = `Updated ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${d.is_current_week ? '' : ' · past week'}`;

        this._renderSelects(d);
        this._renderMyMatchup(d);
        this._renderAllMatchups(d);
        this._renderStandings(d);
        this._renderTopScorers(d);
        this._renderNfl(d);
    },

    _renderSelects(d) {
        const weekSel = document.getElementById('weekSelect');
        const weeks = d.regular_season_weeks || 17;
        weekSel.innerHTML = Array.from({ length: Math.max(weeks, d.current_week) }, (_, i) => i + 1)
            .filter(w => w <= d.current_week)
            .map(w => `<option value="${w}" ${w === d.week ? 'selected' : ''}>Week ${w}${w === d.current_week ? ' (current)' : ''}</option>`).join('');
        const teamSel = document.getElementById('teamSelect');
        teamSel.innerHTML = d.standings.map(t => `<option value="${t.team_id}" ${t.team_id === this.state.teamId ? 'selected' : ''}>${this._esc(t.name)}</option>`).join('');
    },

    _renderMyMatchup(d) {
        const mine = d.matchups.find(m => m.home.team_id === this.state.teamId || m.away.team_id === this.state.teamId);
        const box = document.getElementById('myMatchup');
        if (!mine) { box.innerHTML = '<p class="live-muted">No matchup for this team this week (bye).</p>'; return; }
        const me = mine.home.team_id === this.state.teamId ? mine.home : mine.away;
        const opp = me === mine.home ? mine.away : mine.home;
        box.innerHTML = `
            <div class="hero-card">
                <div class="hero-scoreline">
                    ${this._teamBlock(me, true, opp)}
                    <div class="hero-vs">
                        ${this._winBar(me, opp)}
                        <div class="hero-proj">proj ${this._pts(me.projected)} – ${this._pts(opp.projected)}</div>
                    </div>
                    ${this._teamBlock(opp, false, me)}
                </div>
                <div class="hero-rosters">
                    ${this._rosterTable(me)}
                    ${this._rosterTable(opp)}
                </div>
            </div>`;
    },

    _renderAllMatchups(d) {
        const box = document.getElementById('allMatchups');
        box.innerHTML = d.matchups.map(m => {
            const open = this.state.expanded.has(m.id);
            const leader = m.home.points === m.away.points ? null : (m.home.points > m.away.points ? 'home' : 'away');
            return `
            <div class="matchup-card ${open ? 'open' : ''}" onclick="LiveController.toggleExpand(${m.id})">
                ${this._matchupRow(m.away, leader === 'away', m.away.team_id === this.state.teamId)}
                ${this._matchupRow(m.home, leader === 'home', m.home.team_id === this.state.teamId)}
                <div class="matchup-foot">
                    <span>${this._pctLabel(m.away)} · ${this._pctLabel(m.home)}</span>
                    <span class="matchup-toggle">${open ? 'hide rosters' : 'rosters'}</span>
                </div>
                ${open ? `<div class="hero-rosters compact" onclick="event.stopPropagation()">${this._rosterTable(m.away)}${this._rosterTable(m.home)}</div>` : ''}
            </div>`;
        }).join('');
    },

    _matchupRow(t, leading, mine) {
        return `
        <div class="matchup-row ${leading ? 'leading' : ''} ${mine ? 'mine' : ''}">
            ${t.logo ? `<img class="team-logo" src="${t.logo}" alt="" onerror="this.style.visibility='hidden'">` : '<span class="team-logo placeholder"></span>'}
            <div class="matchup-team">
                <div class="matchup-name">${this._esc(t.name)}</div>
                <div class="matchup-sub">${this._esc(t.owner || '')} · ${t.record.wins}-${t.record.losses}${t.record.ties ? '-' + t.record.ties : ''}</div>
            </div>
            <div class="matchup-ytp" title="starters yet to play / in progress">${this._ytp(t)}</div>
            <div class="matchup-score"><div class="score-live">${this._pts(t.points)}</div><div class="score-proj">proj ${this._pts(t.projected)}</div></div>
        </div>`;
    },

    _teamBlock(t, isMe, other) {
        return `
        <div class="hero-team ${isMe ? 'me' : ''}">
            ${t.logo ? `<img class="hero-logo" src="${t.logo}" alt="" onerror="this.style.visibility='hidden'">` : ''}
            <div class="hero-name">${this._esc(t.name)}</div>
            <div class="hero-owner">${this._esc(t.owner || '')} · ${t.record.wins}-${t.record.losses}</div>
            <div class="hero-score ${t.points > other.points ? 'ahead' : t.points < other.points ? 'behind' : ''}">${this._pts(t.points)}</div>
            <div class="hero-ytp">${this._ytp(t, true)}</div>
        </div>`;
    },

    _winBar(me, opp) {
        const p = me.win_probability == null ? null : Math.round(me.win_probability * 100);
        if (p == null) return '<div class="hero-vs-label">vs</div>';
        return `
        <div class="winbar" title="ESPN win probability">
            <div class="winbar-fill" style="width:${p}%"></div>
        </div>
        <div class="winbar-label"><span>${p}% you</span><span>${100 - p}% them</span></div>`;
    },

    _rosterTable(t) {
        const rows = t.players.filter(p => p.starter).map(p => `
            <tr class="state-${p.game_state}">
                <td class="slot">${p.slot}</td>
                <td class="player">
                    <div class="player-name">${this._esc(p.name)}${this._injTag(p.injury)}</div>
                    <div class="player-sub">${p.position} · ${p.pro_team || '—'}${p.opponent ? ' vs ' + p.opponent : ''} · <span class="game-detail">${this._esc(p.game_detail || '')}</span></div>
                </td>
                <td class="proj">${this._pts(p.projected)}</td>
                <td class="pts ${p.points > p.projected ? 'over' : p.game_state === 'post' && p.points < p.projected ? 'under' : ''}">${this._pts(p.points)}</td>
            </tr>`).join('');
        const bench = t.players.filter(p => !p.starter);
        const benchRows = bench.map(p => `
            <tr class="bench state-${p.game_state}">
                <td class="slot">${p.slot === 'BENCH' ? 'BN' : p.slot}</td>
                <td class="player"><div class="player-name">${this._esc(p.name)}</div><div class="player-sub">${p.position} · ${p.pro_team || '—'} · ${this._esc(p.game_detail || '')}</div></td>
                <td class="proj">${this._pts(p.projected)}</td>
                <td class="pts">${this._pts(p.points)}</td>
            </tr>`).join('');
        return `
        <table class="roster">
            <thead><tr><th colspan="2">${this._esc(t.name)}</th><th>proj</th><th>pts</th></tr></thead>
            <tbody>${rows}</tbody>
            ${bench.length ? `<tbody class="bench-body"><tr class="bench-head"><td colspan="4">Bench</td></tr>${benchRows}</tbody>` : ''}
        </table>`;
    },

    _renderStandings(d) {
        document.getElementById('standings').innerHTML = `
        <table class="standings-tbl">
            <thead><tr><th>#</th><th>Team</th><th>W-L</th><th>PF</th><th>PA</th><th>Strk</th></tr></thead>
            <tbody>${d.standings.map((t, i) => `
                <tr class="${t.team_id === this.state.teamId ? 'mine' : ''}">
                    <td>${i + 1}</td>
                    <td><div class="st-name">${this._esc(t.name)}</div><div class="st-owner">${this._esc(t.owner || '')}</div></td>
                    <td>${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}</td>
                    <td>${this._pts(t.points_for)}</td>
                    <td>${this._pts(t.points_against)}</td>
                    <td>${t.streak}</td>
                </tr>`).join('')}</tbody>
        </table>`;
    },

    _renderTopScorers(d) {
        document.getElementById('topScorers').innerHTML = `
        <ol class="top-list">${d.top_scorers.map(p => `
            <li class="state-${p.game_state}">
                <span class="top-pts">${this._pts(p.points)}</span>
                <span class="top-who"><span class="top-name">${this._esc(p.name)}</span><span class="top-sub">${p.position} · ${p.pro_team || ''} · ${this._esc(p.team)}</span></span>
                <span class="top-detail">${this._esc(p.game_detail || '')}</span>
            </li>`).join('')}</ol>`;
    },

    _renderNfl(d) {
        const seen = new Set();
        const cards = [];
        Object.entries(d.nfl_games).forEach(([abbr, g]) => {
            const key = [abbr, g.opponent].sort().join('-');
            if (seen.has(key)) return;
            seen.add(key);
            const [a, b] = g.score.split('-');
            cards.push(`<div class="nfl-card state-${g.state}"><span class="nfl-teams">${abbr} ${a} · ${g.opponent} ${b}</span><span class="nfl-detail">${this._esc(g.detail || '')}</span></div>`);
        });
        document.getElementById('nflGames').innerHTML = cards.join('') || '<p class="live-muted">No NFL games found for this week.</p>';
    },

    // ===== helpers =====
    _ytp(t, long = false) {
        const parts = [];
        if (t.in_play) parts.push(`<span class="ytp in">${t.in_play}${long ? ' playing' : ''}</span>`);
        if (t.yet_to_play) parts.push(`<span class="ytp pre">${t.yet_to_play}${long ? ' to play' : ''}</span>`);
        if (!t.in_play && !t.yet_to_play) parts.push(`<span class="ytp post">${long ? 'all done' : '✓'}</span>`);
        return parts.join(' ');
    },
    _pctLabel(t) {
        return t.win_probability == null ? this._esc(t.abbrev || '') : `${this._esc(t.abbrev || t.name)} ${Math.round(t.win_probability * 100)}%`;
    },
    _injTag(status) {
        if (!status || ['ACTIVE', 'NORMAL'].includes(status)) return '';
        const short = { QUESTIONABLE: 'Q', DOUBTFUL: 'D', OUT: 'O', INJURY_RESERVE: 'IR', SUSPENSION: 'SUSP' }[status] || status.slice(0, 3);
        return ` <span class="inj" title="${this._esc(status)}">${short}</span>`;
    },
    _pts(n) { return (Math.round((n || 0) * 100) / 100).toFixed(2); },
    _esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
};
