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
        teamId: null,
        teamName: null,
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
        this.state.year = parseInt(params.get('year')) || 2025;
        this.state.teamId = params.get('teamId') ? parseInt(params.get('teamId')) : null;
        this.state.teamName = params.get('teamName') || null;

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
            const fetcher = (typeof DataCache !== 'undefined') ? DataCache : { fetch: apiFetch };
            const { data, error } = await fetcher.fetch(url);
            if (error) throw new Error(error);

            this.state.data = data;

            // Resolve team name from team_map if we have teamId but no teamName
            if (this.state.teamId && !this.state.teamName && data.team_map) {
                const info = data.team_map[this.state.teamId];
                if (info) {
                    this.state.teamName = typeof info === 'string' ? info : (info.manager_name || info.team_name || `Team ${this.state.teamId}`);
                }
            }

            this._stopTaglineCycle();
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            // Show My Team tab if teamId is available
            if (this.state.teamId) {
                const myTab = document.getElementById('myTeamTab');
                if (myTab) {
                    myTab.style.display = '';
                    // Default to My Team tab when teamId is present
                    this.state.currentTab = 'my-team';
                    myTab.classList.add('active');
                    const awardsTab = document.querySelector('.tab[data-tab="awards"]');
                    if (awardsTab) awardsTab.classList.remove('active');
                }
            }

            this.renderHeader();
            this.renderTab(this.state.currentTab);
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
            case 'my-team': container.innerHTML = this._renderMyTeam(); break;
            case 'awards': container.innerHTML = this._renderAwards(); break;
            case 'stats': container.innerHTML = this._renderStats(); break;
            case 'by-week': container.innerHTML = this._renderByWeek(); break;
            case 'by-team': container.innerHTML = this._renderByTeam(); break;
            case 'all': container.innerHTML = this._renderAll(); break;
        }
    },

    // ── Helper: is this team the user's team? ──
    _isMyTeam(teamId) {
        if (!this.state.teamId) return false;
        return teamId === this.state.teamId || teamId === String(this.state.teamId) || String(teamId) === String(this.state.teamId);
    },

    // ── Waiver grade using league-relative percentile ranking ──
    _calcWaiverGrade(teamData) {
        if (!teamData) return { grade: 'N/A', label: '', score: 0 };
        // If we haven't computed league-relative scores yet, do it now
        if (!this._gradeScoresComputed) this._computeLeagueGradeScores();
        const tid = String(teamData.team_id || '');
        const entry = this._gradeScoreMap && this._gradeScoreMap[tid];
        if (!entry) {
            // Fallback for missing teams
            return { grade: 'C', label: 'Average', score: 50 };
        }
        return entry;
    },

    // ── Compute league-relative grade scores for all teams at once ──
    _computeLeagueGradeScores() {
        this._gradeScoresComputed = true;
        this._gradeScoreMap = {};
        const byTeam = this.state.data && this.state.data.by_team;
        if (!byTeam || Object.keys(byTeam).length === 0) return;

        // Collect raw scores for each team
        const teamScores = [];
        for (const [tid, team] of Object.entries(byTeam)) {
            const adds = team.total_adds || 0;
            const topAdds = team.top_adds || [];
            const avgPts = topAdds.length > 0
                ? topAdds.reduce((s, a) => s + a.points_after, 0) / topAdds.length
                : 0;
            // Composite: 40% activity, 60% quality (quality matters more)
            const rawScore = (adds * 2) + (avgPts * 3);
            teamScores.push({ tid, rawScore });
        }

        // Sort by raw score descending and assign percentile-based grades
        teamScores.sort((a, b) => b.rawScore - a.rawScore);
        const n = teamScores.length;
        const gradeDistribution = [
            { grade: 'A', label: 'Elite' },
            { grade: 'B', label: 'Solid' },
            { grade: 'C', label: 'Average' },
            { grade: 'D', label: 'Below Average' },
            { grade: 'F', label: 'Inactive' },
        ];

        teamScores.forEach((t, i) => {
            const pct = i / n; // 0 = best, 1 = worst
            let g;
            if (pct < 0.15) g = gradeDistribution[0];       // Top 15% = A
            else if (pct < 0.35) g = gradeDistribution[1];   // Next 20% = B
            else if (pct < 0.65) g = gradeDistribution[2];   // Middle 30% = C
            else if (pct < 0.85) g = gradeDistribution[3];   // Next 20% = D
            else g = gradeDistribution[4];                     // Bottom 15% = F
            this._gradeScoreMap[t.tid] = { grade: g.grade, label: g.label, score: t.rawScore };
        });
    },

    // ── My Team tab ──
    _renderMyTeam() {
        const tid = this.state.teamId;
        if (!tid) return '<p class="empty-state">No team selected. Add teamId to URL params to see your team stats.</p>';

        const d = this.state.data;
        const teamData = d.by_team[tid];
        const teamName = this.state.teamName || (teamData ? teamData.team_name : `Team ${tid}`);
        const { grade, label } = this._calcWaiverGrade(teamData);

        // Team paired transactions
        const myPaired = (d.paired_transactions || []).filter(p => this._isMyTeam(p.team_id));

        // Best pickup
        let bestPickup = null;
        if (teamData && teamData.top_adds && teamData.top_adds.length > 0) {
            bestPickup = teamData.top_adds[0];
        }

        // Biggest regret: any drop that scored well after
        let biggestRegret = null;
        const advanced = d.advanced_stats || {};
        const regrets = (advanced.regret_drops || []).filter(r => this._isMyTeam(r.dropped_by_id));
        const earlyDrops = (advanced.dropped_too_early || []).filter(r => this._isMyTeam(r.dropped_by_id));
        if (regrets.length > 0) {
            biggestRegret = regrets[0];
        } else if (earlyDrops.length > 0) {
            biggestRegret = earlyDrops[0];
        }

        // League avg moves
        const allTeams = Object.values(d.by_team);
        const leagueAvgMoves = allTeams.length > 0 ? Math.round(allTeams.reduce((s, t) => s + t.total_moves, 0) / allTeams.length) : 0;
        const myMoves = teamData ? teamData.total_moves : 0;

        let html = '';

        // Grade header
        html += `<div class="my-team-header">
            <div class="my-team-name">${escapeHtml(teamName)}</div>
            <div class="my-team-grade grade-${grade.toLowerCase()}">${grade}</div>
            <div class="my-team-grade-label">${label} Waiver Manager</div>
        </div>`;

        // Summary stats row
        html += `<div class="my-team-summary">
            <div class="my-team-stat">
                <div class="my-team-stat-value">${teamData ? teamData.total_adds : 0}</div>
                <div class="my-team-stat-label">Adds</div>
            </div>
            <div class="my-team-stat">
                <div class="my-team-stat-value">${teamData ? teamData.total_drops : 0}</div>
                <div class="my-team-stat-label">Drops</div>
            </div>
            <div class="my-team-stat">
                <div class="my-team-stat-value">${myMoves}</div>
                <div class="my-team-stat-label">Total Moves</div>
            </div>
            <div class="my-team-stat">
                <div class="my-team-stat-value">${leagueAvgMoves}</div>
                <div class="my-team-stat-label">League Avg</div>
            </div>
        </div>`;

        // Comparison bar
        const maxMoves = Math.max(myMoves, leagueAvgMoves, 1);
        const myPct = Math.round((myMoves / maxMoves) * 100);
        const avgPct = Math.round((leagueAvgMoves / maxMoves) * 100);
        html += `<div class="my-team-comparison">
            <div class="comparison-label">Your Activity vs League Avg</div>
            <div class="comparison-bars">
                <div class="comparison-row">
                    <span class="comparison-name">You</span>
                    <div class="comparison-track"><div class="comparison-fill accent" style="width:${myPct}%"></div></div>
                    <span class="comparison-val">${myMoves}</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-name">Avg</span>
                    <div class="comparison-track"><div class="comparison-fill dim" style="width:${avgPct}%"></div></div>
                    <span class="comparison-val">${leagueAvgMoves}</span>
                </div>
            </div>
        </div>`;

        // Best pickup highlight
        if (bestPickup) {
            html += `<div class="my-team-highlight best">
                <div class="highlight-label">Your Best Pickup</div>
                <div class="highlight-player">${escapeHtml(bestPickup.player_name)} <span class="highlight-pos">${bestPickup.position}</span></div>
                <div class="highlight-detail">Week ${bestPickup.week} &middot; <span class="highlight-pts">+${bestPickup.points_after.toFixed(1)} pts</span> after pickup</div>
            </div>`;
        }

        // Biggest regret highlight
        if (biggestRegret) {
            html += `<div class="my-team-highlight regret">
                <div class="highlight-label">Your Biggest Regret</div>
                <div class="highlight-player">${escapeHtml(biggestRegret.player_name)} <span class="highlight-pos">${biggestRegret.position}</span></div>
                <div class="highlight-detail">Dropped Week ${biggestRegret.week_dropped} &middot; Scored <span class="highlight-pts-bad">${biggestRegret.points_after_drop.toFixed(1)} pts</span> after${biggestRegret.picked_up_by ? ` &middot; Picked up by ${escapeHtml(biggestRegret.picked_up_by)}` : ''}</div>
            </div>`;
        }

        // Full swap list
        if (myPaired.length > 0) {
            html += `<div class="my-team-moves">
                <div class="my-team-moves-title">Your Moves (${myPaired.length})</div>`;
            for (const p of myPaired) {
                html += this._pairedRow(p, false);
            }
            html += '</div>';
        }

        return html;
    },

    // ── Stats tab (advanced stats) ──
    _renderStats() {
        const adv = this.state.data.advanced_stats;
        if (!adv) return '<p class="empty-state">No advanced stats available.</p>';

        let html = '<div class="stats-grid">';

        // Waiver MVP
        if (adv.waiver_mvp) {
            const m = adv.waiver_mvp;
            html += this._statCard('Waiver MVP', m.player_name,
                `${m.total_points.toFixed(1)} total pts`, `Picked up Week ${m.week_acquired} by ${escapeHtml(m.team)}`, 'accent');
        }

        // Best ROI
        if (adv.best_pickup_roi) {
            const r = adv.best_pickup_roi;
            html += this._statCard('Best ROI', r.player_name,
                `${r.ppw.toFixed(1)} PPW`, `Picked up Week ${r.week_acquired} by ${escapeHtml(r.team)}`, 'green');
        }

        // Streaming King
        if (adv.streaming_king) {
            const s = adv.streaming_king;
            html += this._statCard('Streaming King', escapeHtml(s.team),
                `${s.count} D/ST + K adds`, 'Most streaming pickups', 'purple');
        }

        // Hot Hand
        if (adv.hot_hand) {
            const h = adv.hot_hand;
            html += this._statCard('Hot Hand', escapeHtml(h.team),
                `${h.count} moves in Week ${h.week}`, 'Most transactions in a single week', 'gold');
        }

        // Most Active Week
        if (adv.most_active_week) {
            const w = adv.most_active_week;
            html += this._statCard('Busiest Week', `Week ${w.week}`,
                `${w.count} transactions`, 'League-wide transaction peak', 'accent');
        }

        // Longest Hold
        if (adv.longest_hold) {
            const l = adv.longest_hold;
            html += this._statCard('Longest Hold', l.player_name,
                `${l.weeks_held} weeks`, `Held by ${escapeHtml(l.team)} from Week ${l.acquired_week}`, 'green');
        }

        html += '</div>';

        // Early vs Late
        if (adv.early_vs_late) {
            const e = adv.early_vs_late;
            const totalEL = e.first_half + e.second_half || 1;
            html += `<div class="stat-section">
                <div class="stat-section-title">Early vs Late Season Activity</div>
                <div class="early-late-bar">
                    <div class="el-segment early" style="width:${Math.round(e.first_half / totalEL * 100)}%">
                        <span>Wk 1-${e.midpoint_week}: ${e.first_half}</span>
                    </div>
                    <div class="el-segment late" style="width:${Math.round(e.second_half / totalEL * 100)}%">
                        <span>Wk ${e.midpoint_week + 1}+: ${e.second_half}</span>
                    </div>
                </div>
            </div>`;
        }

        // Position Breakdown
        if (adv.position_breakdown && Object.keys(adv.position_breakdown).length > 0) {
            const positions = Object.entries(adv.position_breakdown).sort((a, b) => b[1] - a[1]);
            const maxCount = positions[0][1] || 1;
            html += `<div class="stat-section">
                <div class="stat-section-title">Adds by Position</div>
                <div class="pos-breakdown">`;
            for (const [pos, count] of positions) {
                const pct = Math.round((count / maxCount) * 100);
                html += `<div class="pos-row">
                    <span class="pos-label">${pos}</span>
                    <div class="pos-track"><div class="pos-fill" style="width:${pct}%"></div></div>
                    <span class="pos-count">${count}</span>
                </div>`;
            }
            html += '</div></div>';
        }

        // Dropped Too Early
        if (adv.dropped_too_early && adv.dropped_too_early.length > 0) {
            html += `<div class="stat-section">
                <div class="stat-section-title">Dropped Too Early</div>
                <div class="regret-list">`;
            for (const d of adv.dropped_too_early) {
                const highlight = this._isMyTeam(d.dropped_by_id) ? ' my-team-row' : '';
                html += `<div class="regret-row${highlight}">
                    <div class="regret-player">${escapeHtml(d.player_name)} <span class="regret-pos">${d.position}</span></div>
                    <div class="regret-detail">Dropped by ${escapeHtml(d.dropped_by)} Wk ${d.week_dropped} &middot; ${d.points_after_drop.toFixed(1)} pts after${d.picked_up_by ? ` &middot; Got by ${escapeHtml(d.picked_up_by)}` : ''}</div>
                </div>`;
            }
            html += '</div></div>';
        }

        // Regret Drops (100+)
        if (adv.regret_drops && adv.regret_drops.length > 0) {
            html += `<div class="stat-section">
                <div class="stat-section-title">Biggest Regret Drops (100+ pts after)</div>
                <div class="regret-list">`;
            for (const d of adv.regret_drops) {
                const highlight = this._isMyTeam(d.dropped_by_id) ? ' my-team-row' : '';
                html += `<div class="regret-row${highlight}">
                    <div class="regret-player">${escapeHtml(d.player_name)} <span class="regret-pos">${d.position}</span></div>
                    <div class="regret-detail">Dropped by ${escapeHtml(d.dropped_by)} Wk ${d.week_dropped} &middot; ${d.points_after_drop.toFixed(1)} pts after &middot; Picked up by ${escapeHtml(d.picked_up_by)}</div>
                </div>`;
            }
            html += '</div></div>';
        }

        // Waiver Grade Leaderboard
        {
            const allTeams = Object.entries(this.state.data.by_team);
            if (allTeams.length > 0) {
                const graded = allTeams.map(([tid, teamData]) => {
                    const { grade, label } = this._calcWaiverGrade(teamData);
                    return { team_id: tid, team_name: teamData.team_name, grade, label, total_moves: teamData.total_moves, total_adds: teamData.total_adds };
                });
                const gradeOrder = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'F': 4, 'N/A': 5 };
                graded.sort((a, b) => (gradeOrder[a.grade] ?? 99) - (gradeOrder[b.grade] ?? 99));

                const maxMoves = Math.max(...graded.map(t => t.total_moves), 1);

                html += `<div class="stat-section">
                    <div class="stat-section-title">Waiver Grade Leaderboard</div>
                    <div class="waiver-grade-lb">`;
                for (const t of graded) {
                    const isMe = this._isMyTeam(t.team_id);
                    const barPct = Math.round((t.total_moves / maxMoves) * 100);
                    html += `<div class="wg-lb-row${isMe ? ' my-team-row' : ''}">
                        <span class="wg-lb-grade grade-${t.grade.toLowerCase()}">${t.grade}</span>
                        <span class="wg-lb-team">${escapeHtml(t.team_name)}${isMe ? ' <span class="my-badge">YOU</span>' : ''}</span>
                        <div class="wg-lb-bar-wrap"><div class="wg-lb-bar" style="width:${barPct}%"></div></div>
                        <span class="wg-lb-moves">${t.total_moves} moves</span>
                        <span class="wg-lb-label">${t.label}</span>
                    </div>`;
                }
                html += '</div></div>';
            }
        }

        // Waiver Manager Profiles
        {
            const byTeam = this.state.data.by_team;
            if (byTeam && Object.keys(byTeam).length > 0) {
                let profilesHtml = '';
                for (const [tid, team] of Object.entries(byTeam)) {
                    const isMe = this._isMyTeam(tid);
                    const adds = team.total_adds || 0;
                    const drops = team.total_drops || 0;
                    const moves = team.total_moves || 0;
                    const topAdds = team.top_adds || [];
                    const avgPtsFromPickups = topAdds.length > 0 ? (topAdds.reduce((s, a) => s + a.points_after, 0) / topAdds.length) : 0;

                    // Determine traits (league-relative thresholds)
                    const allTeamsMoves = Object.values(byTeam).map(t => t.total_moves || 0);
                    const allTeamsAvgPts = Object.values(byTeam).map(t => {
                        const ta = t.top_adds || [];
                        return ta.length > 0 ? ta.reduce((s, a) => s + a.points_after, 0) / ta.length : 0;
                    });
                    const medianMoves = allTeamsMoves.sort((a, b) => a - b)[Math.floor(allTeamsMoves.length / 2)] || 10;
                    const medianPts = allTeamsAvgPts.sort((a, b) => a - b)[Math.floor(allTeamsAvgPts.length / 2)] || 8;
                    const p75Moves = allTeamsMoves[Math.floor(allTeamsMoves.length * 0.75)] || 15;
                    const p75Pts = allTeamsAvgPts[Math.floor(allTeamsAvgPts.length * 0.75)] || 12;

                    const traits = [];
                    if (moves >= p75Moves * 1.2) traits.push('Churner');
                    else if (moves <= Math.max(3, medianMoves * 0.3)) traits.push('Set and Forget');
                    if (avgPtsFromPickups >= p75Pts) traits.push('Diamond Finder');
                    if (adds > drops + 3) traits.push('Hoarder');
                    else if (drops > adds + 3) traits.push('Dumper');
                    if (topAdds.some(a => ['D/ST', 'K'].includes(a.position))) traits.push('Streamer');
                    if (traits.length === 0) traits.push('Balanced');

                    const traitBadges = traits.map(t => {
                        let cls = 'waiver-trait-default';
                        if (t === 'Diamond Finder') cls = 'waiver-trait-diamond';
                        else if (t === 'Churner') cls = 'waiver-trait-churner';
                        else if (t === 'Set and Forget') cls = 'waiver-trait-setforget';
                        else if (t === 'Streamer') cls = 'waiver-trait-streamer';
                        return `<span class="waiver-trait-badge ${cls}">${t}</span>`;
                    }).join('');

                    profilesHtml += `<div class="wpr-card${isMe ? ' my-team-row' : ''}">
                        <div class="wpr-name">${escapeHtml(team.team_name)}${isMe ? ' <span class="my-badge">YOU</span>' : ''}</div>
                        <div class="wpr-traits">${traitBadges}</div>
                        <div class="wpr-stats">${adds}A / ${drops}D / ${moves} total${avgPtsFromPickups > 0 ? ` / ${avgPtsFromPickups.toFixed(1)} avg pts` : ''}</div>
                    </div>`;
                }
                html += `<div class="stat-section">
                    <div class="stat-section-title">Waiver Manager Profiles</div>
                    <div class="wpr-grid">${profilesHtml}</div>
                </div>`;
            }
        }

        // Buyer/Seller breakdown
        if (adv.buyer_seller && Object.keys(adv.buyer_seller).length > 0) {
            const teams = Object.values(adv.buyer_seller).sort((a, b) => b.net - a.net);
            html += `<div class="stat-section">
                <div class="stat-section-title">Buyer vs Seller</div>
                <div class="buyer-seller-list">`;
            for (const t of teams) {
                const labelCls = t.label === 'buyer' ? 'buyer' : t.label === 'seller' ? 'seller' : 'neutral';
                html += `<div class="bs-row">
                    <span class="bs-team">${escapeHtml(t.team)}</span>
                    <span class="bs-label ${labelCls}">${t.label.toUpperCase()}</span>
                    <span class="bs-detail">${t.adds}A / ${t.drops}D (net ${t.net >= 0 ? '+' : ''}${t.net})</span>
                </div>`;
            }
            html += '</div></div>';
        }

        return html;
    },

    _statCard(title, name, value, detail, color) {
        return `<div class="stat-card stat-${color}">
            <div class="stat-card-title">${title}</div>
            <div class="stat-card-name">${name}</div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-card-detail">${detail}</div>
        </div>`;
    },

    // ── Awards tab ──
    _renderAwards() {
        const awards = this.state.data.awards;
        if (!awards || Object.keys(awards).length === 0) {
            return '<p style="color: var(--waiver-text-dim); text-align: center; padding: 40px;">No awards data available.</p>';
        }

        let html = '<div class="awards-grid">';

        if (awards.journeyman) {
            const a = awards.journeyman;
            html += this._awardCard('journeyman', a.player_name,
                `Rostered by <span class="award-highlight">${a.team_count} different teams</span>: ${a.teams.join(', ')}`);
        }
        if (awards.waiver_hawk) {
            const a = awards.waiver_hawk;
            html += this._awardCard('waiver_hawk', `${a.player_name} (${a.position})`,
                `Picked up in Week ${a.week} by ${a.team}, scored <span class="award-highlight">${a.points.toFixed(1)} pts</span> immediately`);
        }
        if (awards.diamond_in_the_rough) {
            const a = awards.diamond_in_the_rough;
            html += this._awardCard('diamond_in_the_rough', `${a.player_name} (${a.position})`,
                `Picked up Week ${a.week_acquired} by ${a.team}. Scored <span class="award-highlight">${a.points_after_pickup.toFixed(1)} pts</span> after pickup`);
        }
        if (awards.tinkerer) {
            const a = awards.tinkerer;
            html += this._awardCard('tinkerer', a.team,
                `<span class="award-highlight">${a.total_moves} total moves</span> (${a.adds} adds, ${a.drops} drops)`);
        }
        if (awards.set_and_forget) {
            const a = awards.set_and_forget;
            html += this._awardCard('set_and_forget', a.team,
                `Only <span class="award-highlight">${a.total_moves} moves</span> all season`);
        }
        if (awards.revolving_door) {
            const a = awards.revolving_door;
            html += this._awardCard('revolving_door', a.position,
                `<span class="award-highlight">${a.add_count} adds</span> at this position league-wide`);
        }
        if (awards.graveyard) {
            const a = awards.graveyard;
            html += this._awardCard('graveyard', `${a.player_name} (${a.position})`,
                `Dropped by ${a.dropped_by} in Week ${a.week_dropped}. Scored <span class="award-highlight">${a.points_next_week.toFixed(1)} pts</span> the next week`);
        }
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

    // ── By Week tab (uses paired transactions) ──
    _renderByWeek() {
        const paired = this.state.data.paired_transactions;
        if (!paired || paired.length === 0) {
            return this._renderByWeekLegacy();
        }

        // Group by week
        const byWeek = {};
        for (const p of paired) {
            if (!byWeek[p.week]) byWeek[p.week] = [];
            byWeek[p.week].push(p);
        }
        const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

        let html = '';
        for (const week of weeks) {
            const items = byWeek[week];
            html += `<div class="week-section">
                <div class="week-header">
                    <span class="week-label">Week ${week}</span>
                    <span class="week-count">${items.length} moves</span>
                </div>`;
            for (const p of items) {
                html += this._pairedRow(p, true);
            }
            html += '</div>';
        }
        return html;
    },

    _renderByWeekLegacy() {
        const byWeek = this.state.data.by_week;
        const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
        if (weeks.length === 0) return '<p class="empty-state">No transactions found.</p>';

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
        const teams = Object.entries(byTeam).sort((a, b) => b[1].total_moves - a[1].total_moves);
        if (teams.length === 0) return '<p class="empty-state">No team data available.</p>';

        let html = '<div class="team-cards">';
        for (const [teamId, team] of teams) {
            const isMyTeam = this._isMyTeam(teamId);
            const myClass = isMyTeam ? ' team-card-mine' : '';

            html += `<div class="team-card-waiver${myClass}">
                <div class="team-card-name">${escapeHtml(team.team_name)}${isMyTeam ? ' <span class="my-badge">YOU</span>' : ''}</div>
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

    // ── All tab (uses paired transactions) ──
    _renderAll() {
        const paired = this.state.data.paired_transactions;
        if (!paired || paired.length === 0) {
            return this._renderAllLegacy();
        }

        let html = `<div class="summary-bar">
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_adds}</div><div class="summary-stat-label">Adds</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_drops}</div><div class="summary-stat-label">Drops</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_trades}</div><div class="summary-stat-label">Trades</div></div>
            <div class="summary-stat"><div class="summary-stat-value">${this.state.data.total_transactions}</div><div class="summary-stat-label">Total</div></div>
        </div><div class="txn-table">`;

        for (const p of paired) {
            html += this._pairedRow(p, true);
        }
        html += '</div>';
        return html;
    },

    _renderAllLegacy() {
        const txns = this.state.data.transactions;
        if (!txns || txns.length === 0) return '<p class="empty-state">No transactions found.</p>';

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

    // ── Paired transaction row (swap / standalone add / standalone drop) ──
    _pairedRow(p, showTeam) {
        const isMyTeam = this._isMyTeam(p.team_id);
        const myClass = isMyTeam ? ' my-team-row' : '';
        const teamLabel = showTeam ? `<span class="swap-team">${escapeHtml(p.team_name)}</span>` : '';

        if (p.type === 'swap') {
            const pts = p.added.points_after || 0;
            const ptsCls = pts > 0 ? 'positive' : '';
            return `<div class="txn-row swap-row${myClass}">
                <span class="txn-type swap">SWAP</span>
                ${teamLabel}
                <span class="swap-detail">
                    <span class="swap-dropped">${escapeHtml(p.dropped.player_name)} <span class="swap-pos">(${p.dropped.position})</span></span>
                    <span class="swap-arrow">&rarr;</span>
                    <span class="swap-added">${escapeHtml(p.added.player_name)} <span class="swap-pos">(${p.added.position})</span></span>
                </span>
                <span class="txn-pts ${ptsCls}">${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts</span>
            </div>`;
        }

        if (p.type === 'add') {
            const pts = p.added ? p.added.points_after || 0 : 0;
            const ptsCls = pts > 0 ? 'positive' : '';
            return `<div class="txn-row${myClass}">
                <span class="txn-type add">ADD</span>
                ${teamLabel}
                <span class="swap-detail">
                    <span class="swap-added">${escapeHtml(p.added.player_name)} <span class="swap-pos">(${p.added.position})</span></span>
                </span>
                <span class="txn-pts ${ptsCls}">${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts</span>
            </div>`;
        }

        if (p.type === 'drop') {
            return `<div class="txn-row${myClass}">
                <span class="txn-type drop">DROP</span>
                ${teamLabel}
                <span class="swap-detail">
                    <span class="swap-dropped">${escapeHtml(p.dropped.player_name)} <span class="swap-pos">(${p.dropped.position})</span></span>
                </span>
            </div>`;
        }

        return '';
    },

    _txnRow(t) {
        const typeClass = t.type === 'add' ? 'add' : t.type === 'drop' ? 'drop' : 'trade';
        const typeLabel = t.type === 'add' ? 'ADD' : t.type === 'drop' ? 'DROP' : 'TRADE';
        const fromTeam = t.from_team ? escapeHtml(t.from_team) : 'FA';
        const toTeam = t.to_team ? escapeHtml(t.to_team) : 'FA';

        const isMyTeam = this._isMyTeam(t.to_team_id) || this._isMyTeam(t.from_team_id);
        const myClass = isMyTeam ? ' my-team-row' : '';

        let ptsHtml = '';
        if (t.type === 'add' && t.points_after) {
            const cls = t.points_after > 0 ? 'positive' : '';
            ptsHtml = `<span class="txn-pts ${cls}">${t.points_after.toFixed(1)} pts</span>`;
        }

        return `<div class="txn-row${myClass}">
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
