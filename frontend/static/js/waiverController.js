/* Waiver Bot Controller */

const WAIVER_TAGLINES = [
    'Scanning the waiver wire...',
    'Tracking every transaction...',
    'Finding the diamonds...',
    'Exposing the tinkerers...',
    'Counting the roster moves...',
    'Analyzing every pickup...',
    'Reviewing the drops...',
    'Calculating regret scores...',
    'Grading waiver discipline...',
    'Following the paper trail...',
    'Checking the fine print...',
    'Auditing the wire...',
];

const AWARD_CONFIG = {
    journeyman:        { icon: '🧳', title: 'The Journeyman', desc: 'Rostered by the most teams' },
    waiver_hawk:       { icon: '🦅', title: 'Waiver Hawk', desc: 'Best single-week pickup' },
    diamond_in_the_rough: { icon: '💎', title: 'Diamond in the Rough', desc: 'Best waiver pickup of the season' },
    tinkerer:          { icon: '🔧', title: 'The Tinkerer', desc: 'Most roster moves' },
    set_and_forget:    { icon: '🪨', title: 'Set and Forget', desc: 'Fewest roster moves' },
    revolving_door:    { icon: '🚪', title: 'Revolving Door', desc: 'Position with most adds' },
    graveyard:         { icon: '🪦', title: 'The Graveyard', desc: 'Worst drop of the year' },
};

const WaiverController = {
    state: {
        leagueId: null,
        year: null,
        data: null,
        currentTab: 'awards',
    },

    _taglineInterval: null,

    _startTaglineCycle() {
        const el = document.getElementById('loading-tagline');
        if (!el) return;
        let idx = 0;
        el.textContent = WAIVER_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % WAIVER_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = WAIVER_TAGLINES[idx]; el.style.opacity = '1'; }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) { clearInterval(this._taglineInterval); this._taglineInterval = null; }
    },

    async init() {
        const params = new URLSearchParams(window.location.search);
        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;

        if (this.state.leagueId) {
            document.getElementById('setup-screen').style.display = 'none';
            this._showLoading();
            await this.loadData();
        } else {
            this._setupForm();
        }
    },

    _setupForm() {
        document.getElementById('fetchTeamsBtn').addEventListener('click', () => {
            const leagueId = document.getElementById('leagueIdInput').value.trim();
            const year = document.getElementById('yearInput').value;
            if (!leagueId) {
                document.getElementById('setup-error').textContent = 'Please enter a league ID';
                return;
            }
            this.state.leagueId = leagueId;
            this.state.year = parseInt(year);
            document.getElementById('setup-screen').style.display = 'none';
            this._showLoading();
            this.loadData();
        });

        document.getElementById('leagueIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('fetchTeamsBtn').click();
        });
    },

    _showLoading() {
        document.getElementById('loading').style.display = 'flex';
        this._startTaglineCycle();
    },

    async loadData() {
        try {
            const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/waivers?year=${this.state.year}`;
            const { data, error } = await apiFetch(url);
            if (error) throw new Error(error);

            this.state.data = data;
            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            this.renderHeader();
            this.renderTab('awards');
        } catch (err) {
            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error-message').textContent = err.message;
            document.getElementById('error-screen').style.display = 'flex';
        }
    },

    renderHeader() {
        const d = this.state.data;
        document.getElementById('headerSubtitle').textContent = `${d.year} Season`;
        document.getElementById('headerStats').innerHTML = `
            <div class="header-stat">
                <div class="header-stat-value">${d.total_transactions}</div>
                <div class="header-stat-label">Transactions</div>
            </div>
            <div class="header-stat">
                <div class="header-stat-value">${d.total_adds}</div>
                <div class="header-stat-label">Adds</div>
            </div>
            <div class="header-stat">
                <div class="header-stat-value">${d.total_drops}</div>
                <div class="header-stat-label">Drops</div>
            </div>
        `;
    },

    switchTab(tab) {
        this.state.currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        this.renderTab(tab);
    },

    renderTab(tab) {
        const container = document.getElementById('tab-content');
        switch (tab) {
            case 'awards': container.innerHTML = this._renderAwards(); break;
            case 'by-week': container.innerHTML = this._renderByWeek(); break;
            case 'by-team': container.innerHTML = this._renderByTeam(); break;
            case 'all': container.innerHTML = this._renderAll(); break;
        }
    },

    _renderAwards() {
        const awards = this.state.data.awards;
        if (!awards || Object.keys(awards).length === 0) {
            return '<p style="color: var(--waiver-text-dim); text-align: center; padding: 40px;">No awards data available.</p>';
        }

        let html = '<div class="awards-grid">';

        // Journeyman
        if (awards.journeyman) {
            const a = awards.journeyman;
            html += this._awardCard('journeyman', a.player_name,
                `Rostered by <span class="award-highlight">${a.team_count} different teams</span>: ${a.teams.join(', ')}`);
        }

        // Waiver Hawk
        if (awards.waiver_hawk) {
            const a = awards.waiver_hawk;
            html += this._awardCard('waiver_hawk', `${a.player_name} (${a.position})`,
                `Picked up in Week ${a.week} by ${a.team}, scored <span class="award-highlight">${a.points.toFixed(1)} pts</span> immediately`);
        }

        // Diamond in the Rough
        if (awards.diamond_in_the_rough) {
            const a = awards.diamond_in_the_rough;
            html += this._awardCard('diamond_in_the_rough', `${a.player_name} (${a.position})`,
                `Picked up Week ${a.week_acquired} by ${a.team}. Scored <span class="award-highlight">${a.points_after_pickup.toFixed(1)} pts</span> after pickup`);
        }

        // The Tinkerer
        if (awards.tinkerer) {
            const a = awards.tinkerer;
            html += this._awardCard('tinkerer', a.team,
                `<span class="award-highlight">${a.total_moves} total moves</span> (${a.adds} adds, ${a.drops} drops)`);
        }

        // Set and Forget
        if (awards.set_and_forget) {
            const a = awards.set_and_forget;
            html += this._awardCard('set_and_forget', a.team,
                `Only <span class="award-highlight">${a.total_moves} moves</span> all season`);
        }

        // Revolving Door
        if (awards.revolving_door) {
            const a = awards.revolving_door;
            html += this._awardCard('revolving_door', a.position,
                `<span class="award-highlight">${a.add_count} adds</span> at this position league-wide`);
        }

        // Graveyard
        if (awards.graveyard) {
            const a = awards.graveyard;
            html += this._awardCard('graveyard', `${a.player_name} (${a.position})`,
                `Dropped by ${a.dropped_by} in Week ${a.week_dropped}. Scored <span class="award-highlight">${a.points_next_week.toFixed(1)} pts</span> the next week`);
        }

        // Flipped
        if (awards.flipped_count > 0) {
            const ex = awards.flipped_example;
            html += `<div class="award-card">
                <div class="award-icon">🔄</div>
                <div class="award-title">Flipped</div>
                <div class="award-player">${awards.flipped_count} players</div>
                <div class="award-detail">Picked up and dropped within 1 week. e.g. ${ex ? `${ex.player_name} by ${ex.team}` : ''}</div>
            </div>`;
        }

        html += '</div>';
        return html;
    },

    _awardCard(key, name, detail) {
        const cfg = AWARD_CONFIG[key] || { icon: '🏆', title: key, desc: '' };
        return `<div class="award-card">
            <div class="award-icon">${cfg.icon}</div>
            <div class="award-title">${cfg.title}</div>
            <div class="award-player">${escapeHtml(name)}</div>
            <div class="award-detail">${detail}</div>
        </div>`;
    },

    _renderByWeek() {
        const byWeek = this.state.data.by_week;
        const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
        if (weeks.length === 0) return '<p style="text-align: center; color: var(--waiver-text-dim); padding: 40px;">No transactions found.</p>';

        let html = '';
        for (const week of weeks) {
            const txns = byWeek[week];
            html += `<div class="week-section">
                <div class="week-header">
                    <span class="week-label">Week ${week}</span>
                    <span class="week-count">${txns.length} moves</span>
                </div>`;
            for (const t of txns) {
                html += this._txnRow(t);
            }
            html += '</div>';
        }
        return html;
    },

    _renderByTeam() {
        const byTeam = this.state.data.by_team;
        const teams = Object.values(byTeam).sort((a, b) => b.total_moves - a.total_moves);
        if (teams.length === 0) return '<p style="text-align: center; color: var(--waiver-text-dim); padding: 40px;">No team data available.</p>';

        let html = '<div class="team-cards">';
        for (const team of teams) {
            html += `<div class="team-card-waiver">
                <div class="team-card-name">${escapeHtml(team.team_name)}</div>
                <div class="team-card-stats">
                    <div class="team-stat"><strong>${team.total_adds}</strong>Adds</div>
                    <div class="team-stat"><strong>${team.total_drops}</strong>Drops</div>
                    <div class="team-stat"><strong>${team.total_moves}</strong>Total</div>
                </div>`;

            if (team.top_adds && team.top_adds.length > 0) {
                html += '<div class="team-top-adds"><div class="team-top-add-label">Top Pickups</div>';
                for (const add of team.top_adds.slice(0, 3)) {
                    html += `<div class="team-top-add">
                        <span>${escapeHtml(add.player_name)} <span style="color: var(--waiver-text-dim);">(${add.position}, Wk ${add.week})</span></span>
                        <span class="team-top-add-pts">${add.points_after.toFixed(1)} pts</span>
                    </div>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    },

    _renderAll() {
        const txns = this.state.data.transactions;
        if (!txns || txns.length === 0) return '<p style="text-align: center; color: var(--waiver-text-dim); padding: 40px;">No transactions found.</p>';

        let html = `<div class="summary-bar">
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_adds}</div><div class="summary-stat-label">Adds</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_drops}</div><div class="summary-stat-label">Drops</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_trades}</div><div class="summary-stat-label">Trades</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_transactions}</div><div class="summary-stat-label">Total</div></div>
        </div><div class="txn-table">`;

        for (const t of txns) {
            html += this._txnRow(t);
        }
        html += '</div>';
        return html;
    },

    _txnRow(t) {
        const typeClass = t.type === 'add' ? 'add' : t.type === 'drop' ? 'drop' : 'trade';
        const typeLabel = t.type === 'add' ? 'ADD' : t.type === 'drop' ? 'DROP' : 'TRADE';
        const fromTeam = t.from_team ? escapeHtml(t.from_team) : 'FA';
        const toTeam = t.to_team ? escapeHtml(t.to_team) : 'FA';

        let ptsHtml = '';
        if (t.type === 'add' && t.points_after) {
            const cls = t.points_after > 0 ? 'positive' : '';
            ptsHtml = `<span class="txn-pts ${cls}">${t.points_after.toFixed(1)} pts</span>`;
        }

        return `<div class="txn-row">
            <span class="txn-type ${typeClass}">${typeLabel}</span>
            <span class="txn-player">${escapeHtml(t.player_name)}</span>
            <span class="txn-pos">${t.position}</span>
            <span class="txn-team">${fromTeam}</span>
            <span class="txn-arrow">&rarr;</span>
            <span class="txn-team">${toTeam}</span>
            ${ptsHtml}
        </div>`;
    },
};

// Init on page load
document.addEventListener('DOMContentLoaded', () => WaiverController.init());
