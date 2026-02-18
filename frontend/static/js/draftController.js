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
        advancedStats: {},
        alternatives: null,
        currentFilter: 'all',
        currentSort: 'overall_pick',
        sortAsc: true,
        activeTab: 'board',
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
        this.state.year = parseInt(params.get('year')) || 2025;

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
        const year = parseInt(document.getElementById('yearInput').value) || 2025;
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
            const fetcher = (typeof DataCache !== 'undefined') ? DataCache : { fetch: apiFetch };
            const { data, error } = await fetcher.fetch(url);

            if (error) throw new Error(error);

            this.state.picks = data.picks;
            this.state.teamMap = data.team_map;
            this.state.teamGrades = data.team_grades || {};
            this.state.positionGrades = data.position_grades || {};
            this.state.poachers = data.poachers || {};
            this.state.teamSynopses = data.team_synopses || {};
            this.state.advancedStats = data.advanced_stats || {};

            if (!this.state.teamName && this.state.teamId) {
                const mapEntry = this.state.teamMap[String(this.state.teamId)];
                this.state.teamName = (typeof mapEntry === 'object' && mapEntry !== null)
                    ? (mapEntry.manager_name || mapEntry.team_name || `Team ${this.state.teamId}`)
                    : (mapEntry || `Team ${this.state.teamId}`);
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
        this.renderInsights();
        this.bindFilterButtons();
        this.bindSortHeaders();
        this.bindTabs();
        this.measureHeaderAndSetCSS();
    },

    // =========================================================================
    // TAB NAVIGATION
    // =========================================================================

    bindTabs() {
        document.querySelectorAll('.draft-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        this.state.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.draft-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.draft-tab[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Lazy-load alternatives on first visit
        if (tabName === 'alternatives' && !this.state.alternatives) {
            this.loadAlternatives();
        }

        this.measureHeaderAndSetCSS();
    },

    // =========================================================================
    // BOARD TAB (existing)
    // =========================================================================

    measureHeaderAndSetCSS() {
        const header = document.querySelector('.draft-header');
        if (header) {
            const height = header.offsetHeight;
            document.documentElement.style.setProperty('--draft-header-height', height + 'px');
        }
        // Re-measure after fonts/layout settle
        requestAnimationFrame(() => {
            if (header) {
                const height = header.offsetHeight;
                document.documentElement.style.setProperty('--draft-header-height', height + 'px');
            }
        });
    },

    renderSummaryCards() {
        const picks = this.state.picks;
        const myPicks = picks.filter(p => p.team_id === this.state.teamId);
        const gems = picks.filter(p => p.grade === 'GEM');
        const busts = picks.filter(p => p.grade === 'BUST');
        const myGems = myPicks.filter(p => p.grade === 'GEM');
        const myBusts = myPicks.filter(p => p.grade === 'BUST');

        const myGrade = this.state.teamGrades[String(this.state.teamId)];
        const myGradeLetter = myGrade ? myGrade.grade : '?';

        const latePicks = myPicks.filter(p => p.round >= 8 && p.total_points > 0);
        const bestValue = latePicks.sort((a, b) => (b.stars || 0) - (a.stars || 0))[0];

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

    renderTable() {
        let picks = [...this.state.picks];
        picks = this.applyFilter(picks);
        picks = this.applySort(picks);

        const tbody = document.getElementById('draftTableBody');
        let html = '';
        let lastRound = null;
        const showRoundSeparators = this.state.currentSort === 'overall_pick' && this.state.currentFilter === 'all';

        for (const p of picks) {
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

        tbody.querySelectorAll('.team-link').forEach(el => {
            el.addEventListener('click', (e) => {
                const teamId = parseInt(e.target.dataset.teamId);
                this.showTeamModal(teamId);
            });
        });
    },

    // =========================================================================
    // INSIGHTS TAB
    // =========================================================================

    renderInsights() {
        const stats = this.state.advancedStats;
        if (!stats || Object.keys(stats).length === 0) {
            document.getElementById('insightsContent').innerHTML =
                '<p style="color:#888;text-align:center;padding:40px;">No advanced stats available.</p>';
            return;
        }

        let html = '';

        // --- Steal of the Year ---
        if (stats.steal_of_year) {
            const s = stats.steal_of_year;
            html += `
                <div class="insight-gasp-card">
                    <div class="gasp-label">Draft Steal of the Year</div>
                    <div class="gasp-player">${escapeHtml(s.player_name)}</div>
                    <div class="gasp-detail">
                        <span class="pos-badge pos-${s.position.toLowerCase()}">${escapeHtml(s.position)}</span>
                        Round ${s.round}, Pick ${s.pick} &bull; ${escapeHtml(s.team_name)}
                    </div>
                    <div class="gasp-stat">${s.total_points} pts <span class="gasp-surplus">+${s.surplus} vs round avg</span></div>
                </div>
            `;
        }

        // --- Position Value Analysis ---
        if (stats.position_value && Object.keys(stats.position_value).length > 0) {
            let posHtml = '';
            for (const [pos, data] of Object.entries(stats.position_value)) {
                const best = data.best_player;
                posHtml += `
                    <div class="insight-pos-card">
                        <div class="insight-pos-header">
                            <span class="pos-badge pos-${pos.toLowerCase()}">${escapeHtml(pos)}</span>
                            <span class="insight-pos-avg">${data.avg_points} avg</span>
                        </div>
                        <div class="insight-pos-total">${data.count} drafted, ${data.total_points} total pts</div>
                        ${best ? `<div class="insight-pos-best">Best: ${escapeHtml(best.name)} (${best.points} pts${best.round ? `, Rd ${best.round}` : ''})</div>` : ''}
                    </div>
                `;
            }
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Position Value Analysis</h3>
                    <div class="insight-pos-grid">${posHtml}</div>
                </div>
            `;
        }

        // --- Best & Worst Value Picks ---
        if (stats.best_value && stats.best_value.length > 0) {
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Best Value Picks</h3>
                    <p class="insight-section-desc">Picks that outperformed expectations for their draft slot.</p>
                    <div class="insight-value-list">
                        ${stats.best_value.map((p, i) => `
                            <div class="insight-value-row best">
                                <span class="insight-rank">${i + 1}</span>
                                <span class="insight-player">${escapeHtml(p.player_name)}</span>
                                <span class="pos-badge pos-${p.position.toLowerCase()}">${escapeHtml(p.position)}</span>
                                <span class="insight-round">Rd ${p.round}</span>
                                <span class="insight-pts">${p.total_points} pts</span>
                                <span class="insight-stars">${this.renderStarsText(p.stars)}</span>
                                <span class="insight-surplus gem-text">+${p.star_surplus} vs expected</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (stats.worst_value && stats.worst_value.length > 0) {
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Worst Value Picks</h3>
                    <p class="insight-section-desc">Picks that underperformed for their draft slot.</p>
                    <div class="insight-value-list">
                        ${stats.worst_value.map((p, i) => `
                            <div class="insight-value-row worst">
                                <span class="insight-rank">${i + 1}</span>
                                <span class="insight-player">${escapeHtml(p.player_name)}</span>
                                <span class="pos-badge pos-${p.position.toLowerCase()}">${escapeHtml(p.position)}</span>
                                <span class="insight-round">Rd ${p.round}</span>
                                <span class="insight-pts">${p.total_points} pts</span>
                                <span class="insight-stars">${this.renderStarsText(p.stars)}</span>
                                <span class="insight-surplus bust-text">${p.star_surplus} vs expected</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // --- Reach Picks ---
        if (stats.reach_picks && stats.reach_picks.length > 0) {
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Biggest Reach Picks</h3>
                    <p class="insight-section-desc">Early-round picks whose production fell far below the round average.</p>
                    <div class="insight-value-list">
                        ${stats.reach_picks.slice(0, 5).map((p, i) => `
                            <div class="insight-value-row worst">
                                <span class="insight-rank">${i + 1}</span>
                                <span class="insight-player">${escapeHtml(p.player_name)}</span>
                                <span class="pos-badge pos-${p.position.toLowerCase()}">${escapeHtml(p.position)}</span>
                                <span class="insight-round">Rd ${p.round}</span>
                                <span class="insight-pts">${p.total_points} pts</span>
                                <span class="insight-surplus bust-text">-${p.deficit} vs avg</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // --- Bust by Round ---
        if (stats.bust_by_round && Object.keys(stats.bust_by_round).length > 0) {
            let bustHtml = '';
            const rounds = Object.keys(stats.bust_by_round).sort((a, b) => parseInt(a) - parseInt(b));
            for (const rnd of rounds) {
                const b = stats.bust_by_round[rnd];
                bustHtml += `
                    <div class="insight-round-bust">
                        <span class="insight-round-num">Rd ${rnd}</span>
                        <span class="insight-player">${escapeHtml(b.player_name)}</span>
                        <span class="pos-badge pos-${b.position.toLowerCase()}">${escapeHtml(b.position)}</span>
                        <span class="insight-pts">${b.total_points} pts</span>
                        <span class="insight-round-avg">(avg: ${b.round_avg})</span>
                    </div>
                `;
            }
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Biggest Bust by Round</h3>
                    <div class="insight-bust-list">${bustHtml}</div>
                </div>
            `;
        }

        // --- What If You Autodrafted ---
        if (stats.autodraft && stats.autodraft.length > 0) {
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">What If You Autodrafted?</h3>
                    <p class="insight-section-desc">If you always took the best available player (by season total), how would your draft compare?</p>
                    <div class="insight-autodraft-list">
                        ${stats.autodraft.map(t => {
                            const isMyTeam = this.state.teamMap[Object.keys(this.state.teamMap).find(k => {
                                const info = this.state.teamMap[k];
                                const name = typeof info === 'object' ? info.manager_name : info;
                                return name === t.team_name;
                            })] !== undefined;
                            const diffClass = t.diff > 0 ? 'gem-text' : t.diff < 0 ? 'bust-text' : '';
                            const diffStr = t.diff > 0 ? `+${t.diff}` : `${t.diff}`;
                            return `
                                <div class="insight-autodraft-row${t.team_name === (this.state.teamName || '') ? ' my-team-highlight' : ''}">
                                    <span class="insight-autodraft-team">${escapeHtml(t.team_name)}</span>
                                    <span class="insight-autodraft-actual">${t.actual_total} actual</span>
                                    <span class="insight-autodraft-auto">${t.auto_total} auto</span>
                                    <span class="insight-autodraft-diff ${diffClass}">${diffStr} pts</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // --- Snake Draft Position Advantage ---
        if (stats.draft_position_advantage && stats.draft_position_advantage.length > 0) {
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Draft Position Advantage</h3>
                    <p class="insight-section-desc">Does picking first actually matter? Total points by draft slot.</p>
                    <div class="insight-draftpos-list">
                        ${stats.draft_position_advantage.map((d, i) => `
                            <div class="insight-draftpos-row${i === 0 ? ' best' : ''}">
                                <span class="insight-draftpos-pos">#${d.draft_position}</span>
                                <span class="insight-draftpos-team">${escapeHtml(d.team_name)}</span>
                                <span class="insight-draftpos-pts">${d.total_points} pts</span>
                                <span class="insight-draftpos-stars">${d.avg_stars} avg stars</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // --- Round-by-Round Efficiency ---
        if (stats.round_efficiency && Object.keys(stats.round_efficiency).length > 0) {
            const rounds = Object.keys(stats.round_efficiency).sort((a, b) => parseInt(a) - parseInt(b));
            const maxAvg = Math.max(...rounds.map(r => stats.round_efficiency[r].avg_points));
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Round-by-Round Efficiency</h3>
                    <div class="insight-round-eff-list">
                        ${rounds.map(rnd => {
                            const r = stats.round_efficiency[rnd];
                            const barPct = maxAvg > 0 ? (r.avg_points / maxAvg * 100) : 0;
                            const best = r.best_pick;
                            return `
                                <div class="insight-round-eff-row">
                                    <span class="insight-round-eff-label">Rd ${rnd}</span>
                                    <div class="insight-round-eff-bar-container">
                                        <div class="insight-round-eff-bar" style="width:${barPct}%"></div>
                                        <span class="insight-round-eff-val">${r.avg_points} avg</span>
                                    </div>
                                    ${best ? `<span class="insight-round-eff-best">${escapeHtml(best.name)} (${best.points})</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // --- Drafter Personality Profiles ---
        if (stats.drafter_profiles && Object.keys(stats.drafter_profiles).length > 0) {
            let profilesHtml = '';
            for (const [tid, profile] of Object.entries(stats.drafter_profiles)) {
                const traitBadges = profile.traits.map(t => {
                    let cls = 'trait-standard';
                    if (t === 'Late Round Hero') cls = 'trait-hero';
                    else if (t === 'RB Heavy' || t === 'WR Stack') cls = 'trait-stack';
                    else if (t === 'Early QB') cls = 'trait-qb';
                    else if (t === 'Balanced') cls = 'trait-balanced';
                    return `<span class="trait-badge ${cls}">${escapeHtml(t)}</span>`;
                }).join('');

                const posCounts = profile.position_counts || {};
                const posStr = Object.entries(posCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([pos, c]) => `${pos}: ${c}`)
                    .join(', ');

                profilesHtml += `
                    <div class="insight-profile-card${profile.team_name === (this.state.teamName || '') ? ' my-team-highlight' : ''}">
                        <div class="insight-profile-name">${escapeHtml(profile.team_name)}</div>
                        <div class="insight-profile-traits">${traitBadges}</div>
                        <div class="insight-profile-pos">${posStr}</div>
                    </div>
                `;
            }
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Drafter Personality Profiles</h3>
                    <div class="insight-profiles-grid">${profilesHtml}</div>
                </div>
            `;
        }

        // --- Your Picks: Value Over Expected ---
        if (stats.round_efficiency && Object.keys(stats.round_efficiency).length > 0) {
            const myPicks = this.state.picks.filter(p => p.team_id === this.state.teamId);
            if (myPicks.length > 0) {
                const maxPts = Math.max(...myPicks.map(p => p.total_points), 1);
                let pickRowsHtml = myPicks
                    .sort((a, b) => a.overall_pick - b.overall_pick)
                    .map(p => {
                        const roundData = stats.round_efficiency[String(p.round)];
                        const roundAvg = roundData ? roundData.avg_points : 0;
                        const diff = p.total_points - roundAvg;
                        const diffStr = diff >= 0 ? `+${diff.toFixed(0)}` : `${diff.toFixed(0)}`;
                        const diffClass = diff >= 0 ? 'gem-text' : 'bust-text';
                        const barPct = Math.round((p.total_points / maxPts) * 100);
                        const avgPct = Math.round((roundAvg / maxPts) * 100);
                        return `
                            <div class="voe-row">
                                <span class="voe-pick">Rd ${p.round}</span>
                                <span class="voe-name">${escapeHtml(p.player_name)}</span>
                                <span class="pos-badge pos-${p.position.toLowerCase()}">${escapeHtml(p.position)}</span>
                                <div class="voe-bar-wrap">
                                    <div class="voe-bar" style="width:${barPct}%"></div>
                                    <div class="voe-avg-marker" style="left:${avgPct}%" title="Rd avg: ${roundAvg}"></div>
                                </div>
                                <span class="voe-pts">${p.total_points}</span>
                                <span class="voe-diff ${diffClass}">${diffStr}</span>
                            </div>
                        `;
                    }).join('');

                html += `
                    <div class="insight-section">
                        <h3 class="insight-section-title">Your Picks: Value Over Expected</h3>
                        <p class="insight-section-desc">Each pick's total points vs the round average. The <span style="color:#f59e0b;">|</span> marker shows the round average.</p>
                        <div class="voe-list">${pickRowsHtml}</div>
                    </div>
                `;
            }
        }

        // --- Draft Grade Leaderboard ---
        if (this.state.teamGrades && Object.keys(this.state.teamGrades).length > 0) {
            const gradeOrder = { 'A+': 0, 'A': 1, 'A-': 2, 'B+': 3, 'B': 4, 'B-': 5, 'C+': 6, 'C': 7, 'C-': 8, 'D+': 9, 'D': 10, 'D-': 11, 'F': 12 };
            const sorted = Object.entries(this.state.teamGrades)
                .map(([tid, info]) => {
                    const m = this.state.teamMap[tid];
                    const tn = (typeof m === 'object' && m !== null) ? (m.manager_name || m.team_name) : m;
                    return { ...info, team_id: parseInt(tid), team_name: tn || `Team ${tid}` };
                })
                .sort((a, b) => (gradeOrder[a.grade] ?? 99) - (gradeOrder[b.grade] ?? 99));

            const maxPts = Math.max(...sorted.map(t => t.total_points || 0), 1);

            let lbHtml = '';
            sorted.forEach((t, i) => {
                const isMe = t.team_id === this.state.teamId;
                const barPct = Math.round(((t.total_points || 0) / maxPts) * 100);
                lbHtml += `
                    <div class="grade-lb-row${isMe ? ' my-team-highlight' : ''}">
                        <span class="grade-lb-rank">${i + 1}</span>
                        <span class="grade-lb-grade">${escapeHtml(t.grade)}</span>
                        <span class="grade-lb-team">${escapeHtml(typeof t.team_name === 'object' ? t.team_name.manager_name : t.team_name)}</span>
                        <div class="grade-lb-bar-wrap">
                            <div class="grade-lb-bar" style="width:${barPct}%"></div>
                        </div>
                        <span class="grade-lb-pts">${t.total_points || 0} pts</span>
                        <span class="grade-lb-stars">${(t.avg_stars || 0).toFixed(1)} avg</span>
                    </div>
                `;
            });

            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Draft Grade Leaderboard</h3>
                    <p class="insight-section-desc">All teams ranked by draft grade. Total points from drafted players.</p>
                    <div class="grade-leaderboard">${lbHtml}</div>
                </div>
            `;
        }

        // --- Loyalty Stats ---
        if (stats.loyalty_stats && Object.keys(stats.loyalty_stats).length > 0) {
            const sorted = Object.values(stats.loyalty_stats).sort((a, b) => b.loyalty_pct - a.loyalty_pct);
            html += `
                <div class="insight-section">
                    <h3 class="insight-section-title">Draft Loyalty (Kept vs Dropped)</h3>
                    <p class="insight-section-desc">How many of your draft picks are still on the original roster?</p>
                    <div class="insight-loyalty-list">
                        ${sorted.map(t => {
                            const barPct = t.loyalty_pct;
                            return `
                                <div class="insight-loyalty-row${t.team_name === (this.state.teamName || '') ? ' my-team-highlight' : ''}">
                                    <span class="insight-loyalty-team">${escapeHtml(t.team_name)}</span>
                                    <div class="insight-loyalty-bar-container">
                                        <div class="insight-loyalty-bar" style="width:${barPct}%"></div>
                                    </div>
                                    <span class="insight-loyalty-stat">${t.kept_count} kept / ${t.dropped_count} dropped (${t.loyalty_pct}%)</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('insightsContent').innerHTML = html;
    },

    // =========================================================================
    // ALTERNATIVES TAB
    // =========================================================================

    async loadAlternatives() {
        const container = document.getElementById('alternativesContent');
        container.innerHTML = '<div class="alt-loading"><div class="spinner"></div><p>Loading draft alternatives...</p></div>';

        try {
            const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/draft/alternatives?year=${this.state.year}&team_id=${this.state.teamId}`;
            const { data, error } = await apiFetch(url);

            if (error) throw new Error(error);

            this.state.alternatives = data.alternatives || [];
            this.renderAlternatives();
        } catch (err) {
            container.innerHTML = `<p style="color:#ef4444;text-align:center;padding:40px;">Failed to load alternatives: ${escapeHtml(err.message)}</p>`;
        }
    },

    renderAlternatives() {
        const alts = this.state.alternatives;
        if (!alts || alts.length === 0) {
            document.getElementById('alternativesContent').innerHTML =
                '<p style="color:#888;text-align:center;padding:40px;">No alternatives data available.</p>';
            return;
        }

        let html = '';

        // --- Biggest Miss Gasp Card ---
        const biggestMiss = alts.reduce((best, a) => {
            if (a.missed_points > (best ? best.missed_points : 0)) return a;
            return best;
        }, null);

        if (biggestMiss && biggestMiss.best_alternative) {
            const yourPick = biggestMiss.your_pick;
            const bestAlt = biggestMiss.best_alternative;
            html += `
                <div class="insight-gasp-card alt-gasp">
                    <div class="gasp-label">Your Biggest Draft Miss</div>
                    <div class="gasp-miss-comparison">
                        <div class="gasp-miss-yours">
                            <div class="gasp-miss-side-label">You Picked</div>
                            <div class="gasp-miss-name">${escapeHtml(yourPick.player_name)}</div>
                            <div class="gasp-miss-detail">Rd ${yourPick.round} &bull; ${yourPick.total_points} pts</div>
                        </div>
                        <div class="gasp-miss-arrow">&#8594;</div>
                        <div class="gasp-miss-alt">
                            <div class="gasp-miss-side-label">Available</div>
                            <div class="gasp-miss-name">${escapeHtml(bestAlt.player_name)}</div>
                            <div class="gasp-miss-detail">${escapeHtml(bestAlt.position)} &bull; ${bestAlt.total_points} pts</div>
                        </div>
                    </div>
                    <div class="gasp-stat bust-text">If you drafted ${escapeHtml(bestAlt.player_name)} instead of ${escapeHtml(yourPick.player_name)}: +${biggestMiss.missed_points} points</div>
                </div>
            `;
        }

        // --- Per-pick alternatives ---
        html += '<div class="alt-picks-list">';

        for (const alt of alts) {
            const yourPick = alt.your_pick;
            const hasAlts = alt.alternatives && alt.alternatives.length > 0;
            const isBiggestMiss = biggestMiss && yourPick.overall_pick === biggestMiss.your_pick.overall_pick && biggestMiss.missed_points > 0;

            html += `
                <div class="alt-pick-card${isBiggestMiss ? ' biggest-miss' : ''}${!hasAlts ? ' no-miss' : ''}">
                    <div class="alt-pick-header">
                        <div class="alt-pick-info">
                            <span class="alt-pick-round">Rd ${yourPick.round}, Pick ${yourPick.pick}</span>
                            <span class="alt-pick-player">${escapeHtml(yourPick.player_name)}</span>
                            <span class="pos-badge pos-${yourPick.position.toLowerCase()}">${escapeHtml(yourPick.position)}</span>
                        </div>
                        <div class="alt-pick-pts">${yourPick.total_points} pts &bull; ${this.renderStarsText(yourPick.stars)}</div>
                    </div>
            `;

            if (hasAlts) {
                html += '<div class="alt-alternatives">';
                // Show top 3 alternatives
                const topAlts = alt.alternatives.slice(0, 3);
                for (const a of topAlts) {
                    const isBest = alt.best_alternative && a.player_name === alt.best_alternative.player_name;
                    html += `
                        <div class="alt-alt-row${isBest ? ' best-alt' : ''}">
                            <span class="alt-alt-name">${escapeHtml(a.player_name)}</span>
                            <span class="pos-badge pos-${a.position.toLowerCase()}">${escapeHtml(a.position)}</span>
                            <span class="alt-alt-pts">${a.total_points} pts</span>
                            <span class="alt-alt-diff gem-text">+${a.point_diff} pts</span>
                        </div>
                    `;
                }
                if (alt.alternatives.length > 3) {
                    html += `<div class="alt-more">+${alt.alternatives.length - 3} more alternatives</div>`;
                }
                html += '</div>';
            } else {
                html += '<div class="alt-no-miss">No better options were available before your next pick.</div>';
            }

            html += '</div>';
        }

        html += '</div>';

        document.getElementById('alternativesContent').innerHTML = html;
    },

    // =========================================================================
    // SHARED HELPERS
    // =========================================================================

    renderStarRating(stars, grade) {
        const fullStars = Math.floor(stars);
        const hasHalf = (stars % 1) >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

        let html = '<span class="star-rating">';
        for (let i = 0; i < fullStars; i++) {
            html += '<span class="star filled">\u2605</span>';
        }
        if (hasHalf) {
            html += '<span class="star half">\u00BD</span>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<span class="star empty">\u2605</span>';
        }
        html += '</span>';

        if (grade === 'GEM') {
            html += '<span class="star-label gem-label">GEM</span>';
        } else if (grade === 'BUST') {
            html += '<span class="star-label bust-label">BUST</span>';
        }

        return html;
    },

    renderStarsText(stars) {
        if (!stars && stars !== 0) return '?';
        return stars.toFixed(1) + '\u2605';
    },

    showTeamModal(teamId) {
        const mapEntry = this.state.teamMap[String(teamId)];
        const teamName = (typeof mapEntry === 'object' && mapEntry !== null)
            ? (mapEntry.manager_name || mapEntry.team_name || `Team ${teamId}`)
            : (mapEntry || `Team ${teamId}`);
        const gradeInfo = this.state.teamGrades[String(teamId)] || {};
        const posGrades = this.state.positionGrades[String(teamId)] || {};
        const synopsis = this.state.teamSynopses[String(teamId)] || '';
        const teamPicks = this.state.picks.filter(p => p.team_id === teamId);

        const sortedPicks = [...teamPicks].sort((a, b) => a.overall_pick - b.overall_pick);

        const byStars = [...teamPicks].sort((a, b) => (b.stars || 0) - (a.stars || 0));
        const best = byStars[0];
        const worst = byStars[byStars.length - 1];

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

        let picksTableHtml = sortedPicks.map(p => `
            <tr>
                <td>${p.round}.${String(p.pick).padStart(2, '0')}</td>
                <td>${escapeHtml(p.player_name)}</td>
                <td><span class="pos-badge pos-${escapeHtml(p.position).toLowerCase()}">${escapeHtml(p.position)}</span></td>
                <td>${p.total_points}</td>
                <td>${this.renderStarRating(p.stars, p.grade)}</td>
            </tr>
        `).join('');

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

        overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

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

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        const taglineEl = document.getElementById('loading-tagline');
        let idx = 0;
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % this.LOADING_TAGLINES.length;
            taglineEl.textContent = this.LOADING_TAGLINES[idx];
        }, 2500);
    },

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
