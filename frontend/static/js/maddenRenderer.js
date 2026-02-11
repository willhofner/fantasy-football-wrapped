/* Madden Console Renderer — Madden 25 Stadium Overview Style */
function fmtPts(n) { if (n === null || n === undefined) return '0.0'; return Number(n).toFixed(1); }

const MaddenRenderer = {
    spawnTitleParticles() {
        const c = document.getElementById('titleParticles');
        if (!c) return;
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div');
            p.className = 'title-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (4 + Math.random() * 8) + 's';
            p.style.animationDelay = Math.random() * 6 + 's';
            const size = 1 + Math.random() * 2;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            c.appendChild(p);
        }
    },

    renderTeamGrid(teams) {
        const grid = document.getElementById('teamGrid');
        grid.innerHTML = '';
        teams.forEach(t => {
            const card = document.createElement('div');
            card.className = 'madden-team-card';
            card.dataset.teamId = t.team_id;
            card.textContent = t.team_name;
            card.onclick = () => MaddenController.selectTeam(t.team_id, t.team_name);
            grid.appendChild(card);
        });
    },

    highlightTeamCard(teamId) {
        document.querySelectorAll('.madden-team-card').forEach(c => {
            c.classList.toggle('selected', parseInt(c.dataset.teamId) === teamId);
        });
    },

    /* ===== HOME Tab — Stadium Overview (3-column layout) ===== */

    renderStadiumOverview(teamName, year, startWeek, endWeek, weekResults, focusedWeek) {
        this._renderLeftPanel(teamName, year, startWeek, endWeek, weekResults);
        this._renderCenterPanel(teamName, year, startWeek, endWeek, weekResults, focusedWeek);
        this._renderRightPanel(teamName, weekResults, startWeek, endWeek);
        this._updateTopBar(teamName, year);
    },

    _updateTopBar(teamName, year) {
        const ownerEl = document.getElementById('topBarOwner');
        if (ownerEl) ownerEl.textContent = escapeHtml(teamName) + ' - Owner';
    },

    /* --- Left Panel: Owner Photo + Stats Table --- */
    _renderLeftPanel(teamName, year, startWeek, endWeek, weekResults) {
        const el = document.getElementById('stadiumLeftPanel');
        let w = 0, l = 0, tp = 0, bw = 0, worstWeek = Infinity, totalOppPts = 0;
        const weeks = Object.keys(weekResults);

        weeks.forEach(k => {
            const r = weekResults[k];
            if (r.won) w++; else l++;
            tp += r.myScore;
            totalOppPts += r.oppScore;
            if (r.myScore > bw) bw = r.myScore;
            if (r.myScore < worstWeek) worstWeek = r.myScore;
        });

        const wc = weeks.length;
        const avgPts = wc > 0 ? (tp / wc) : 0;
        const avgOppPts = wc > 0 ? (totalOppPts / wc) : 0;
        const wp = wc > 0 ? Math.round((w / wc) * 100) : 0;

        // Get initials from team name
        const initials = teamName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

        let h = '';

        // Owner photo area
        h += '<div class="owner-photo-area">';
        h += '<div class="owner-photo-initials">' + initials + '</div>';
        h += '<div class="owner-photo-team">' + escapeHtml(teamName) + '</div>';
        h += '</div>';

        // Available Funds (Total Points)
        h += '<div class="owner-funds">';
        h += '<span class="owner-funds-label">Total Points</span>';
        h += '<span class="owner-funds-value">' + fmtPts(tp) + '</span>';
        h += '</div>';

        // Stats table (Level / RTG style)
        h += '<div class="stats-table-header"><span>LVL</span><span>RTG</span></div>';

        const statsRows = [
            { label: 'Offense', lvl: Math.min(10, Math.round(avgPts / 15)), rtg: Math.round(avgPts), rtgClass: 'stats-val-gold' },
            { label: 'Defense', lvl: Math.min(10, Math.round((150 - avgOppPts) / 15)), rtg: Math.round(avgOppPts), rtgClass: avgOppPts < 110 ? 'stats-val-green' : 'stats-val-red' },
            { label: 'Win Rate', lvl: Math.round(wp / 10), rtg: wp + '%', rtgClass: wp >= 50 ? 'stats-val-green' : 'stats-val-red' },
            { label: 'Best Week', lvl: Math.min(10, Math.round(bw / 20)), rtg: fmtPts(bw), rtgClass: 'stats-val-gold' },
            { label: 'Worst Week', lvl: Math.max(1, Math.round(worstWeek / 20)), rtg: fmtPts(worstWeek === Infinity ? 0 : worstWeek), rtgClass: 'stats-val-red' },
            { label: 'Consistency', lvl: this._consistencyLevel(weekResults), rtg: this._consistencyRating(weekResults), rtgClass: 'stats-val-white' },
        ];

        statsRows.forEach(row => {
            h += '<div class="stats-table-row">';
            h += '<span class="stats-table-label">' + row.label + '</span>';
            h += '<span class="stats-table-val stats-val-white">' + row.lvl + '</span>';
            h += '<span class="stats-table-val ' + row.rtgClass + '">' + row.rtg + '</span>';
            h += '</div>';
        });

        // Owner feedback quote
        const feedback = this._generateFeedback(w, l, avgPts, wp);
        h += '<div class="owner-feedback">' + feedback + '</div>';

        el.innerHTML = h;
    },

    _consistencyLevel(weekResults) {
        const scores = Object.values(weekResults).map(r => r.myScore);
        if (scores.length < 2) return 5;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        // Lower stdDev = more consistent = higher level
        return Math.max(1, Math.min(10, Math.round(10 - stdDev / 5)));
    },

    _consistencyRating(weekResults) {
        const scores = Object.values(weekResults).map(r => r.myScore);
        if (scores.length < 2) return 'N/A';
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev < 10) return 'ELITE';
        if (stdDev < 18) return 'GOOD';
        if (stdDev < 25) return 'OK';
        return 'WILD';
    },

    _generateFeedback(w, l, avgPts, wp) {
        if (wp >= 75) return 'Fans are thrilled with the season performance. Championship contender!';
        if (wp >= 50) return 'A solid season overall. Fans expect more in the playoffs.';
        if (wp >= 35) return 'Fans are getting restless with the inconsistent results.';
        return 'Fans are quite unhappy with the season. Rebuild incoming?';
    },

    /* --- Center Panel: Field header + badges + chart + action buttons --- */
    _renderCenterPanel(teamName, year, startWeek, endWeek, weekResults, focusedWeek) {
        const el = document.getElementById('stadiumCenterPanel');
        let w = 0, l = 0, tp = 0;
        Object.values(weekResults).forEach(r => { if (r.won) w++; else l++; tp += r.myScore; });
        const wc = Object.keys(weekResults).length;
        const wp = wc > 0 ? Math.round((w / wc) * 100) : 0;

        // Manager grade
        let grade, gradeClass;
        if (wp >= 75) { grade = 'A'; gradeClass = 'badge-green'; }
        else if (wp >= 60) { grade = 'B'; gradeClass = 'badge-green'; }
        else if (wp >= 45) { grade = 'C'; gradeClass = 'badge-gold'; }
        else if (wp >= 30) { grade = 'D'; gradeClass = 'badge-red'; }
        else { grade = 'F'; gradeClass = 'badge-red'; }

        // Points rank text (just show the percentage)
        const ratingVal = wp >= 70 ? '10' : wp >= 50 ? Math.round(wp / 10) : Math.max(1, Math.round(wp / 10));

        let h = '';

        // Field header (like "Jacksonville, Florida / EverBank Field")
        h += '<div class="stadium-field-header">';
        h += '<div class="stadium-field-location">Season ' + year + ' &bull; Weeks ' + startWeek + '-' + endWeek + '</div>';
        h += '<div class="stadium-field-name">' + escapeHtml(teamName) + '</div>';
        h += '<div class="stadium-field-age">' + w + '-' + l + ' &bull; ' + fmtPts(tp) + ' Total Points</div>';
        h += '</div>';

        // Rating badges (like Rating: 9, Happiness: OK, Size: 2)
        h += '<div class="stadium-badges">';
        h += '<div class="stadium-badge"><span class="stadium-badge-label">Rating</span><span class="stadium-badge-value badge-red">' + ratingVal + '</span></div>';
        h += '<div class="stadium-badge"><span class="stadium-badge-label">Grade</span><span class="stadium-badge-value ' + gradeClass + '">' + grade + '</span></div>';
        h += '<div class="stadium-badge"><span class="stadium-badge-label">Record</span><span class="stadium-badge-value badge-white">' + w + '-' + l + '</span></div>';
        h += '</div>';

        // Performance chart (bar chart of weekly scores)
        h += '<div class="stadium-perf-chart">';
        const maxScore = Math.max(1, ...Object.values(weekResults).map(r => r.myScore));
        for (let wk = startWeek; wk <= endWeek; wk++) {
            const r = weekResults[wk];
            if (r) {
                const pct = Math.max(8, (r.myScore / maxScore) * 100);
                const cls = r.won ? 'win' : 'loss';
                h += '<div class="perf-bar ' + cls + '" style="height:' + pct + '%" title="Wk ' + wk + ': ' + fmtPts(r.myScore) + '" onclick="MaddenController.openWeekDetail(' + wk + ')"></div>';
            } else {
                h += '<div class="perf-bar" style="height:8%;background:rgba(255,255,255,0.04)"></div>';
            }
        }
        h += '</div>';

        // Action buttons (UPGRADE STADIUM style) — navigate to weeks
        h += '<div class="stadium-actions">';
        h += '<button class="stadium-action-btn primary' + (focusedWeek === startWeek ? ' focused' : '') + '" onclick="MaddenController.openWeekDetail(' + focusedWeek + ')">VIEW WEEK ' + focusedWeek + '</button>';
        h += '<button class="stadium-action-btn" onclick="MaddenController.switchTab(\'season\')">FULL SEASON</button>';
        h += '<button class="stadium-action-btn" onclick="MaddenController.switchTab(\'standings\')">LEAGUE STANDINGS</button>';
        h += '</div>';

        el.innerHTML = h;
    },

    /* --- Right Panel: @Mentions Feed (notable events) --- */
    _renderRightPanel(teamName, weekResults, startWeek, endWeek) {
        const el = document.getElementById('stadiumRightPanel');
        const handle = '@' + teamName.replace(/[^a-zA-Z0-9]/g, '');

        let h = '';
        h += '<div class="mentions-header">';
        h += '<div class="mentions-team-handle">' + handle + '</div>';
        h += '<div class="mentions-subtitle">Mentions</div>';
        h += '</div>';

        // Generate mentions from season highlights
        const mentions = this._generateMentions(weekResults, teamName, startWeek, endWeek);
        mentions.forEach(m => {
            h += '<div class="mention-post">';
            h += '<div class="mention-author">' + escapeHtml(m.author) + '</div>';
            h += '<div class="mention-text">' + escapeHtml(m.text) + '</div>';
            h += '<div class="mention-week-tag">' + m.tag + '</div>';
            h += '</div>';
        });

        if (mentions.length === 0) {
            h += '<div class="mention-post"><div class="mention-text" style="color:var(--madden-text-muted);font-style:italic;">Loading season highlights...</div></div>';
        }

        el.innerHTML = h;
    },

    _generateMentions(weekResults, teamName, startWeek, endWeek) {
        const mentions = [];
        const weeks = Object.entries(weekResults).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        if (weeks.length === 0) return mentions;

        // Find best week
        let bestWeek = null, bestScore = 0;
        let worstWeek = null, worstScore = Infinity;
        let streakCount = 0, streakType = null, bestStreak = 0, bestStreakType = '';
        let blowouts = [];

        weeks.forEach(([wk, r]) => {
            if (r.myScore > bestScore) { bestScore = r.myScore; bestWeek = wk; }
            if (r.myScore < worstScore) { worstScore = r.myScore; worstWeek = wk; }

            const margin = Math.abs(r.myScore - r.oppScore);
            if (margin > 30) blowouts.push({ week: wk, margin: margin, won: r.won, oppName: r.oppName });

            const currentType = r.won ? 'W' : 'L';
            if (currentType === streakType) {
                streakCount++;
            } else {
                if (streakCount > bestStreak) { bestStreak = streakCount; bestStreakType = streakType; }
                streakType = currentType;
                streakCount = 1;
            }
        });
        if (streakCount > bestStreak) { bestStreak = streakCount; bestStreakType = streakType; }

        // Best performance
        if (bestWeek) {
            const r = weekResults[bestWeek];
            mentions.push({
                author: 'FantasyInsider',
                text: fmtPts(bestScore) + ' points in Week ' + bestWeek + '! ' + teamName + ' absolutely went off. ' + (r.won ? 'Easy W.' : 'Still took the L somehow.'),
                tag: '#Week' + bestWeek
            });
        }

        // Worst performance
        if (worstWeek && worstWeek !== bestWeek) {
            mentions.push({
                author: 'RoastMaster',
                text: 'Only ' + fmtPts(worstScore) + ' points in Week ' + worstWeek + '? Did ' + teamName + ' forget to set their lineup? Embarrassing.',
                tag: '#Week' + worstWeek
            });
        }

        // Streak
        if (bestStreak >= 3) {
            const streakWord = bestStreakType === 'W' ? 'win' : 'losing';
            mentions.push({
                author: 'StreakTracker',
                text: teamName + ' went on a ' + bestStreak + '-game ' + streakWord + ' streak this season. ' + (bestStreakType === 'W' ? 'Dominant.' : 'Painful to watch.'),
                tag: '#Streak'
            });
        }

        // Blowout
        if (blowouts.length > 0) {
            const b = blowouts[0];
            if (b.won) {
                mentions.push({
                    author: 'ScoreAlert',
                    text: 'Week ' + b.week + ': ' + teamName + ' destroyed ' + (b.oppName || 'their opponent') + ' by ' + b.margin.toFixed(1) + ' points. No mercy.',
                    tag: '#Blowout'
                });
            } else {
                mentions.push({
                    author: 'ScoreAlert',
                    text: 'Week ' + b.week + ': ' + teamName + ' got demolished by ' + (b.oppName || 'their opponent') + '. ' + b.margin.toFixed(1) + ' point beatdown.',
                    tag: '#Ouch'
                });
            }
        }

        // Close games
        const closeGames = weeks.filter(([wk, r]) => Math.abs(r.myScore - r.oppScore) < 5);
        if (closeGames.length > 0) {
            const cg = closeGames[0];
            const r = cg[1];
            mentions.push({
                author: 'NailBiterFan',
                text: 'Week ' + cg[0] + ' came down to the wire. ' + fmtPts(r.myScore) + ' - ' + fmtPts(r.oppScore) + '. ' + (r.won ? 'Clutch W!' : 'Heartbreaking L.'),
                tag: '#CloseGame'
            });
        }

        // Win count summary
        const totalW = weeks.filter(([_, r]) => r.won).length;
        const totalL = weeks.length - totalW;
        mentions.push({
            author: 'SeasonReview',
            text: 'Final record: ' + totalW + '-' + totalL + '. ' + (totalW > totalL ? 'Winning season. Respect.' : totalW === totalL ? 'Right at .500. Could go either way.' : 'Below .500. Time to make moves.'),
            tag: '#SeasonWrap'
        });

        return mentions.slice(0, 6);
    },

    /* ===== SEASON Tab ===== */

    renderSeasonGrid(startWeek, endWeek, weekResults, focusedWeek) {
        const el = document.getElementById('seasonGrid');
        el.innerHTML = '';
        for (let w = startWeek; w <= endWeek; w++) {
            const cell = document.createElement('div');
            const r = weekResults[w];
            cell.className = 'season-cell' + (w === focusedWeek ? ' focused' : '') + (!r ? ' season-cell-skeleton' : '');
            cell.dataset.week = w;
            if (r) {
                const wl = r.won ? 'W' : 'L';
                const cls = r.won ? 'win' : 'loss';
                const opp = r.oppName || 'Opponent';
                cell.innerHTML =
                    '<div class="season-cell-week">Week ' + w + '</div>' +
                    '<div class="season-cell-matchup">vs ' + escapeHtml(opp) + '</div>' +
                    '<div class="season-cell-score">' + fmtPts(r.myScore) + '-' + fmtPts(r.oppScore) + '</div>' +
                    '<div class="season-cell-result ' + cls + '">' + wl + '</div>';
            } else {
                cell.innerHTML =
                    '<div class="season-cell-week">Week ' + w + '</div>' +
                    '<div class="season-cell-matchup">&mdash;</div>' +
                    '<div class="season-cell-score">&mdash;</div>';
            }
            cell.onclick = ((wk) => () => MaddenController.openWeekDetail(wk))(w);
            el.appendChild(cell);
        }
    },

    /* ===== STANDINGS Tab ===== */

    renderStandingsWeekSelector(startWeek, endWeek, currentWeek) {
        const el = document.getElementById('standingsWeekSelector');
        el.innerHTML = '';
        for (let w = startWeek; w <= endWeek; w++) {
            const b = document.createElement('button');
            b.className = 'week-selector-btn' + (w === currentWeek ? ' active' : '');
            b.textContent = 'WK ' + w;
            b.onclick = ((wk) => () => MaddenController.showStandingsForWeek(wk))(w);
            el.appendChild(b);
        }
    },

    renderStandings(standings, myTeamId) {
        const el = document.getElementById('standingsBody');
        if (!standings || !standings.length) {
            el.innerHTML = '<p style="color:var(--madden-text-muted);text-align:center;padding:40px;">Standings unavailable.</p>';
            return;
        }
        let h = '<table><thead><tr><th>RK</th><th>TEAM</th><th>RECORD</th><th>PF</th></tr></thead><tbody>';
        standings.forEach(t => {
            const m = t.team_id === myTeamId;
            const rc = t.rank_change || 0;
            let rh = '';
            if (rc > 0) rh = '<span class="rank-change-up">+' + rc + '</span>';
            else if (rc < 0) rh = '<span class="rank-change-down">' + rc + '</span>';
            h += '<tr class="' + (m ? 'my-team' : '') + '">';
            h += '<td class="rank-cell"><span class="rank-num">' + t.rank + '</span>' + rh + '</td>';
            h += '<td class="team-name-cell">' + escapeHtml(t.team_name) + '</td>';
            h += '<td class="record-cell">' + t.record + '</td>';
            h += '<td>' + fmtPts(t.points_for) + '</td>';
            h += '</tr>';
        });
        h += '</tbody></table>';
        el.innerHTML = h;
    },

    /* ===== SCORES Tab ===== */

    renderScoresWeekSelector(startWeek, endWeek, currentWeek) {
        const el = document.getElementById('scoresWeekSelector');
        el.innerHTML = '';
        for (let w = startWeek; w <= endWeek; w++) {
            const b = document.createElement('button');
            b.className = 'week-selector-btn' + (w === currentWeek ? ' active' : '');
            b.textContent = 'WK ' + w;
            b.onclick = ((wk) => () => MaddenController.showScoresForWeek(wk))(w);
            el.appendChild(b);
        }
    },

    _nflLogoUrl(a) {
        return 'https://a.espncdn.com/i/teamlogos/nfl/500/' + a.toLowerCase() + '.png';
    },

    renderNFLScores(scores) {
        const el = document.getElementById('nflScoresBody');
        if (!scores || !scores.length) {
            el.innerHTML = '<p style="color:var(--madden-text-muted);text-align:center;padding:40px;">NFL scores unavailable.</p>';
            return;
        }
        let h = '';
        scores.forEach(g => {
            const aw = g.away.winner;
            const hw = g.home.winner;
            h += '<div class="nfl-score-card">';
            h += '<div class="nfl-score-row ' + (aw ? 'winner' : '') + '">';
            h += '<img src="' + this._nflLogoUrl(g.away.abbreviation) + '" alt="' + g.away.abbreviation + '" class="nfl-score-logo" onerror="this.style.display=\'none\'">';
            h += '<span class="nfl-score-abbr">' + g.away.abbreviation + '</span>';
            h += '<span class="nfl-score-pts">' + g.away.score + '</span></div>';
            h += '<div class="nfl-score-divider"></div>';
            h += '<div class="nfl-score-row ' + (hw ? 'winner' : '') + '">';
            h += '<img src="' + this._nflLogoUrl(g.home.abbreviation) + '" alt="' + g.home.abbreviation + '" class="nfl-score-logo" onerror="this.style.display=\'none\'">';
            h += '<span class="nfl-score-abbr">' + g.home.abbreviation + '</span>';
            h += '<span class="nfl-score-pts">' + g.home.score + '</span></div>';
            h += '<div class="nfl-score-status">' + (g.is_final ? 'FINAL' : 'IN PROGRESS') + '</div>';
            h += '</div>';
        });
        el.innerHTML = h;
    },

    /* ===== Week Detail Overlay ===== */

    openWeekDetail(weekData, week, startWeek, endWeek) {
        const overlay = document.getElementById('weekDetailOverlay');
        const panel = document.getElementById('weekDetailPanel');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const my = weekData.my_matchup.my_team;
        const opp = weekData.my_matchup.opponent;
        const myWon = my.won;
        const errors = my.errors || [];
        const ec = errors.length;
        const pl = errors.reduce((s, e) => s + e.points_lost, 0);

        const po = { QB: 0, RB: 1, WR: 2, TE: 3, FLEX: 4, 'D/ST': 5, K: 6 };
        const sS = (a) => [...a].sort((x, y) => {
            const xo = po[x.position] !== undefined ? po[x.position] : 99;
            const yo = po[y.position] !== undefined ? po[y.position] : 99;
            return xo !== yo ? xo - yo : y.points - x.points;
        });
        const sB = (a) => [...a].sort((x, y) => y.points - x.points);

        const mS = sS(my.starters);
        const mB = sB(my.bench);
        const oS = sS(opp.starters);
        const oB = sB(opp.bench);

        const rR = (players, te, ib) => {
            return players.map(p => {
                const ie = ib ? te.some(e => e.bench_player === p.name) : te.some(e => e.should_replace === p.name);
                const c = (ib ? 'bench-row ' : '') + (ie ? 'error-row' : '');
                return '<div class="detail-player-row ' + c + '">' +
                    '<div class="detail-player-info">' +
                    '<span class="detail-player-pos">' + (p.position || p.actual_position || '') + '</span>' +
                    '<span class="detail-player-name">' + escapeHtml(p.name) + (ie ? '<span class="error-badge">!</span>' : '') + '</span>' +
                    '</div>' +
                    '<span class="detail-player-pts">' + fmtPts(p.points) + '</span>' +
                    '</div>';
            }).join('');
        };

        let h = '';

        // Header
        h += '<div class="detail-header"><div>';
        h += '<div class="detail-week-title">WEEK ' + week + '</div>';
        h += '<div class="detail-matchup-title">' + escapeHtml(my.team_name) + ' vs ' + escapeHtml(opp.team_name) + '</div>';
        h += '</div>';
        h += '<button class="detail-close" onclick="MaddenController.closeWeekDetail()">ESC CLOSE</button></div>';

        // Nav
        h += '<div class="detail-nav">';
        h += '<button class="detail-nav-btn" onclick="MaddenController.detailPrevWeek()" ' + (week <= startWeek ? 'disabled' : '') + '>&larr; PREV WEEK</button>';
        h += '<button class="detail-nav-btn" onclick="MaddenController.detailNextWeek()" ' + (week >= endWeek ? 'disabled' : '') + '>NEXT WEEK &rarr;</button>';
        h += '</div>';

        // Score card
        h += '<div class="detail-score-card">';
        h += '<div class="detail-team-side ' + (myWon ? 'winner' : '') + '">';
        h += '<div class="detail-team-name">' + escapeHtml(my.team_name) + '</div>';
        h += '<div class="detail-team-score">' + fmtPts(my.score) + '</div>';
        h += '<div class="detail-team-optimal">Optimal: ' + fmtPts(my.optimal_score) + '</div>';
        h += '</div>';
        h += '<div class="detail-vs">VS</div>';
        h += '<div class="detail-team-side ' + (!myWon ? 'winner' : '') + '">';
        h += '<div class="detail-team-name">' + escapeHtml(opp.team_name) + '</div>';
        h += '<div class="detail-team-score">' + fmtPts(opp.score) + '</div>';
        h += '<div class="detail-team-optimal">Optimal: ' + fmtPts(opp.optimal_score) + '</div>';
        h += '</div></div>';

        // Rosters
        h += '<div class="detail-section"><div class="detail-section-title">ROSTERS</div>';
        h += '<div class="detail-roster">';
        h += '<div class="detail-roster-col">';
        h += '<div class="detail-roster-header">' + escapeHtml(my.team_name) + '</div>';
        h += '<div class="roster-label">STARTERS</div>' + rR(mS, errors, false);
        h += '<div class="roster-label">BENCH</div>' + rR(mB, errors, true);
        if (ec > 0) {
            h += '<div class="detail-errors-summary">' + ec + ' lineup error' + (ec > 1 ? 's' : '') + ' &mdash; ' + pl.toFixed(1) + ' pts left on bench</div>';
        }
        h += '</div>';
        h += '<div class="detail-roster-col">';
        h += '<div class="detail-roster-header">' + escapeHtml(opp.team_name) + '</div>';
        h += '<div class="roster-label">STARTERS</div>' + rR(oS, opp.errors || [], false);
        h += '<div class="roster-label">BENCH</div>' + rR(oB, opp.errors || [], true);
        h += '</div></div></div>';

        // Summary
        if (weekData.fantasy_summary) {
            h += '<div class="detail-section"><div class="detail-section-title">GAME LOG</div><div class="detail-summary-text">';
            weekData.fantasy_summary.split('\n\n').filter(p => p.trim()).forEach(para => {
                h += '<p>' + escapeHtml(para.trim()) + '</p>';
            });
            h += '</div></div>';
        }

        panel.innerHTML = h;
        panel.scrollTop = 0;
    },

    closeWeekDetail() {
        document.getElementById('weekDetailOverlay').style.display = 'none';
        document.body.style.overflow = '';
    },

    setActiveTab(tabName) {
        document.querySelectorAll('.madden-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === 'panel-' + tabName);
        });

        // Update top bar title based on tab
        const titles = {
            home: 'STADIUM OVERVIEW',
            season: 'SEASON SCHEDULE',
            standings: 'LEAGUE STANDINGS',
            scores: 'NFL SCORES'
        };
        const titleEl = document.getElementById('topBarTitle');
        if (titleEl) titleEl.textContent = titles[tabName] || 'MADDEN';
    }
};
