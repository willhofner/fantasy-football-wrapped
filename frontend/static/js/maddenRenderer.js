/* Madden Console Renderer */
function fmtPts(n) { if (n === null || n === undefined) return '0.0'; return Number(n).toFixed(1); }
const MaddenRenderer = {
    spawnTitleParticles() {
        const c = document.getElementById('titleParticles'); if (!c) return;
        for (let i = 0; i < 30; i++) { const p = document.createElement('div'); p.className = 'title-particle'; p.style.left = Math.random()*100+'%'; p.style.animationDuration = (4+Math.random()*6)+'s'; p.style.animationDelay = Math.random()*5+'s'; p.style.width = (1+Math.random()*2)+'px'; p.style.height = p.style.width; c.appendChild(p); }
    },
    renderTeamGrid(teams) {
        const grid = document.getElementById('teamGrid'); grid.innerHTML = '';
        teams.forEach(t => { const card = document.createElement('div'); card.className = 'madden-team-card'; card.dataset.teamId = t.team_id; card.textContent = t.team_name; card.onclick = () => MaddenController.selectTeam(t.team_id, t.team_name); grid.appendChild(card); });
    },
    highlightTeamCard(teamId) { document.querySelectorAll('.madden-team-card').forEach(c => { c.classList.toggle('selected', parseInt(c.dataset.teamId) === teamId); }); },
    renderHomeHero(teamName, year, startWeek, endWeek, weekResults) {
        const el = document.getElementById('homeHero');
        let w=0,l=0,tp=0,bw=0; Object.values(weekResults).forEach(r=>{if(r.won)w++;else l++;tp+=r.myScore;if(r.myScore>bw)bw=r.myScore;});
        const wc = Object.keys(weekResults).length; const wp = wc>0?Math.round((w/wc)*100):0;
        el.innerHTML='<div class="hero-info"><div class="hero-team-name">'+escapeHtml(teamName)+'</div><div class="hero-season">Season '+year+' &bull; Weeks '+startWeek+'-'+endWeek+'</div></div><div class="hero-stats"><div class="hero-stat"><div class="hero-record">'+w+'-'+l+'</div><div class="hero-stat-label">Record</div></div><div class="hero-stat"><div class="hero-stat-value">'+fmtPts(tp)+'</div><div class="hero-stat-label">Total Points</div></div><div class="hero-stat"><div class="hero-stat-value">'+wp+'%</div><div class="hero-stat-label">Win Rate</div></div><div class="hero-stat"><div class="hero-stat-value">'+fmtPts(bw)+'</div><div class="hero-stat-label">Best Week</div></div></div>';
    },
    renderWeekCarousel(startWeek, endWeek, weekResults, focusedWeek) {
        const el = document.getElementById('weekCarousel'); el.innerHTML = '';
        for (let w = startWeek; w <= endWeek; w++) {
            const card = document.createElement('div'); const r = weekResults[w];
            card.className = 'week-card'+(w===focusedWeek?' focused':'')+(!r?' week-card-skeleton':''); card.dataset.week = w;
            if (r) { const wl=r.won?'W':'L'; const cls=r.won?'win':'loss'; const opp=r.oppName||'Opponent'; card.innerHTML='<div class="week-card-label">Week '+w+'</div><div class="week-card-opponent">vs '+escapeHtml(opp)+'</div><div class="week-card-score">'+fmtPts(r.myScore)+'-'+fmtPts(r.oppScore)+'</div><div class="week-card-result '+cls+'">'+wl+'</div>'; }
            else { card.innerHTML='<div class="week-card-label">Week '+w+'</div><div class="week-card-opponent">&mdash;</div><div class="week-card-score">&mdash;</div>'; }
            card.onclick = ((wk)=>()=>MaddenController.openWeekDetail(wk))(w); el.appendChild(card);
        }
        const f=el.querySelector('.week-card.focused'); if(f)f.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },
    renderSeasonGrid(startWeek, endWeek, weekResults, focusedWeek) {
        const el = document.getElementById('seasonGrid'); el.innerHTML = '';
        for (let w = startWeek; w <= endWeek; w++) {
            const cell = document.createElement('div'); const r = weekResults[w];
            cell.className = 'season-cell'+(w===focusedWeek?' focused':'')+(!r?' season-cell-skeleton':''); cell.dataset.week = w;
            if (r) { const wl=r.won?'W':'L'; const cls=r.won?'win':'loss'; const opp=r.oppName||'Opponent'; cell.innerHTML='<div class="season-cell-week">Week '+w+'</div><div class="season-cell-matchup">vs '+escapeHtml(opp)+'</div><div class="season-cell-score">'+fmtPts(r.myScore)+'-'+fmtPts(r.oppScore)+'</div><div class="season-cell-result '+cls+'">'+wl+'</div>'; }
            else { cell.innerHTML='<div class="season-cell-week">Week '+w+'</div><div class="season-cell-matchup">&mdash;</div><div class="season-cell-score">&mdash;</div>'; }
            cell.onclick = ((wk)=>()=>MaddenController.openWeekDetail(wk))(w); el.appendChild(cell);
        }
    },
    renderStandingsWeekSelector(startWeek, endWeek, currentWeek) {
        const el = document.getElementById('standingsWeekSelector'); el.innerHTML = '';
        for(let w=startWeek;w<=endWeek;w++){const b=document.createElement('button');b.className='week-selector-btn'+(w===currentWeek?' active':'');b.textContent='WK '+w;b.onclick=((wk)=>()=>MaddenController.showStandingsForWeek(wk))(w);el.appendChild(b);}
    },
    renderStandings(standings, myTeamId) {
        const el = document.getElementById('standingsBody');
        if(!standings||!standings.length){el.innerHTML='<p style="color:var(--madden-text-muted);text-align:center;padding:40px;">Standings unavailable.</p>';return;}
        let h='<table><thead><tr><th>RK</th><th>TEAM</th><th>RECORD</th><th>PF</th></tr></thead><tbody>';
        standings.forEach(t=>{const m=t.team_id===myTeamId;const rc=t.rank_change||0;let rh='';if(rc>0)rh='<span class="rank-change-up">+'+rc+'</span>';else if(rc<0)rh='<span class="rank-change-down">'+rc+'</span>';h+='<tr class="'+(m?'my-team':'')+'"><td class="rank-cell">'+t.rank+rh+'</td><td>'+escapeHtml(t.team_name)+'</td><td class="record-cell">'+t.record+'</td><td>'+fmtPts(t.points_for)+'</td></tr>';});
        h+='</tbody></table>';el.innerHTML=h;
    },
    renderScoresWeekSelector(startWeek, endWeek, currentWeek) {
        const el = document.getElementById('scoresWeekSelector'); el.innerHTML = '';
        for(let w=startWeek;w<=endWeek;w++){const b=document.createElement('button');b.className='week-selector-btn'+(w===currentWeek?' active':'');b.textContent='WK '+w;b.onclick=((wk)=>()=>MaddenController.showScoresForWeek(wk))(w);el.appendChild(b);}
    },
    _nflLogoUrl(a){return'https://a.espncdn.com/i/teamlogos/nfl/500/'+a.toLowerCase()+'.png';},
    renderNFLScores(scores) {
        const el = document.getElementById('nflScoresBody');
        if(!scores||!scores.length){el.innerHTML='<p style="color:var(--madden-text-muted);text-align:center;padding:40px;">NFL scores unavailable.</p>';return;}
        let h='';scores.forEach(g=>{const aw=g.away.winner;const hw=g.home.winner;h+='<div class="nfl-score-card"><div class="nfl-score-row '+(aw?'winner':'')+'"><img src="'+this._nflLogoUrl(g.away.abbreviation)+'" alt="'+g.away.abbreviation+'" class="nfl-score-logo" onerror="this.style.display=\'none\'"><span class="nfl-score-abbr">'+g.away.abbreviation+'</span><span class="nfl-score-pts">'+g.away.score+'</span></div><div class="nfl-score-divider"></div><div class="nfl-score-row '+(hw?'winner':'')+'"><img src="'+this._nflLogoUrl(g.home.abbreviation)+'" alt="'+g.home.abbreviation+'" class="nfl-score-logo" onerror="this.style.display=\'none\'"><span class="nfl-score-abbr">'+g.home.abbreviation+'</span><span class="nfl-score-pts">'+g.home.score+'</span></div><div class="nfl-score-status">'+(g.is_final?'FINAL':'IN PROGRESS')+'</div></div>';});
        el.innerHTML=h;
    },
    openWeekDetail(weekData, week, startWeek, endWeek) {
        const overlay = document.getElementById('weekDetailOverlay');
        const panel = document.getElementById('weekDetailPanel');
        overlay.style.display = 'flex'; document.body.style.overflow = 'hidden';
        const my = weekData.my_matchup.my_team; const opp = weekData.my_matchup.opponent;
        const myWon = my.won; const errors = my.errors||[]; const ec = errors.length;
        const pl = errors.reduce((s,e)=>s+e.points_lost,0);
        const po = {QB:0,RB:1,WR:2,TE:3,FLEX:4,'D/ST':5,K:6};
        const sS=(a)=>[...a].sort((x,y)=>{const xo=po[x.position]!==undefined?po[x.position]:99;const yo=po[y.position]!==undefined?po[y.position]:99;return xo!==yo?xo-yo:y.points-x.points;});
        const sB=(a)=>[...a].sort((x,y)=>y.points-x.points);
        const mS=sS(my.starters);const mB=sB(my.bench);const oS=sS(opp.starters);const oB=sB(opp.bench);
        const rR=(players,te,ib)=>{return players.map(p=>{const ie=ib?te.some(e=>e.bench_player===p.name):te.some(e=>e.should_replace===p.name);const c=(ib?'bench-row ':'')+(ie?'error-row':'');return'<div class="detail-player-row '+c+'"><div class="detail-player-info"><span class="detail-player-pos">'+(p.position||p.actual_position||'')+'</span><span class="detail-player-name">'+escapeHtml(p.name)+(ie?'<span class="error-badge">!</span>':'')+'</span></div><span class="detail-player-pts">'+fmtPts(p.points)+'</span></div>';}).join('');};
        let h='<div class="detail-header"><div><div class="detail-week-title">WEEK '+week+'</div><div class="detail-matchup-title">'+escapeHtml(my.team_name)+' vs '+escapeHtml(opp.team_name)+'</div></div><button class="detail-close" onclick="MaddenController.closeWeekDetail()">ESC CLOSE</button></div>';
        h+='<div class="detail-nav"><button class="detail-nav-btn" onclick="MaddenController.detailPrevWeek()" '+(week<=startWeek?'disabled':'')+'>&larr; PREV WEEK</button><button class="detail-nav-btn" onclick="MaddenController.detailNextWeek()" '+(week>=endWeek?'disabled':'')+ '>NEXT WEEK &rarr;</button></div>';
        h+='<div class="detail-score-card"><div class="detail-team-side '+(myWon?'winner':'')+'"><div class="detail-team-name">'+escapeHtml(my.team_name)+'</div><div class="detail-team-score">'+fmtPts(my.score)+'</div><div class="detail-team-optimal">Optimal: '+fmtPts(my.optimal_score)+'</div></div><div class="detail-vs">VS</div><div class="detail-team-side '+(!myWon?'winner':'')+'"><div class="detail-team-name">'+escapeHtml(opp.team_name)+'</div><div class="detail-team-score">'+fmtPts(opp.score)+'</div><div class="detail-team-optimal">Optimal: '+fmtPts(opp.optimal_score)+'</div></div></div>';
        h+='<div class="detail-section"><div class="detail-section-title">ROSTERS</div><div class="detail-roster"><div class="detail-roster-col"><div class="detail-roster-header">'+escapeHtml(my.team_name)+'</div><div class="roster-label">STARTERS</div>'+rR(mS,errors,false)+'<div class="roster-label">BENCH</div>'+rR(mB,errors,true)+(ec>0?'<div class="detail-errors-summary">'+ec+' lineup error'+(ec>1?'s':'')+' &mdash; '+pl.toFixed(1)+' pts left on bench</div>':'')+'</div><div class="detail-roster-col"><div class="detail-roster-header">'+escapeHtml(opp.team_name)+'</div><div class="roster-label">STARTERS</div>'+rR(oS,opp.errors||[],false)+'<div class="roster-label">BENCH</div>'+rR(oB,opp.errors||[],true)+'</div></div></div>';
        if(weekData.fantasy_summary){h+='<div class="detail-section"><div class="detail-section-title">GAME LOG</div><div class="detail-summary-text">';weekData.fantasy_summary.split('\n\n').filter(function(p){return p.trim();}).forEach(function(para){h+='<p>'+escapeHtml(para.trim())+'</p>';});h+='</div></div>';}
        panel.innerHTML=h;panel.scrollTop=0;
    },
    closeWeekDetail(){document.getElementById('weekDetailOverlay').style.display='none';document.body.style.overflow='';},
    setActiveTab(tabName){document.querySelectorAll('.madden-tab').forEach(t=>{t.classList.toggle('active',t.dataset.tab===tabName);});document.querySelectorAll('.tab-panel').forEach(p=>{p.classList.toggle('active',p.id==='panel-'+tabName);});}
};