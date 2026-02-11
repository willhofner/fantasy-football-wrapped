/* ===== POKEMON WORLD CONTROLLER ===== */
/* True grid-based movement, NPC interaction, Pokemon battle system, START menu */

const POKEMON_TAGLINES = [
    'Wild stats appeared!',
    'Catching \'em all...',
    'Evolving your team...',
    'Visiting Professor Oak...',
    'Walking through tall grass...',
    'Loading the Pokedex...',
    'Healing at the Pokemon Center...',
    'Challenging the gym leader...',
    'Surfing the stats...',
    'Training in Victory Road...',
    'Hatching eggs...',
    'Checking IVs...',
    'A wild analysis appeared!',
    'Using Fly to your league...',
    'Opening the PC Box...',
];

const PokemonController = {
    // ===== STATE =====
    state: {
        leagueId: null, year: null, teamId: null, teamName: null,
        startWeek: 1, endWeek: 14, teams: [],

        // Grid-based player position (tile coordinates)
        playerTX: 0, playerTY: 0,
        // Smooth pixel position for animation interpolation
        playerPixelX: 0, playerPixelY: 0,
        playerDir: 'down',
        isMoving: false,

        // Movement state machine
        moveTargetTX: null, moveTargetTY: null,
        moveProgress: 0, // 0 to 1 during a step
        moveSpeed: 0.12, // progress per frame (higher = faster)
        stepCount: 0, // total steps taken (for random encounters)

        // Game modes: 'overworld', 'battle', 'menu', 'textbox', 'overlay'
        gameMode: 'overworld',

        // Week data
        weekData: {}, weekResults: {},
        nearLocation: null, overlayWeek: null, overlayOpen: false,
        gameRunning: false,
        totalWins: 0, totalLosses: 0,

        // Text box state (Pokemon-style typewriter at bottom of screen)
        textBox: { visible: false, fullText: '', displayText: '', charIndex: 0, complete: false, callback: null },

        // Location banner
        locationBanner: { visible: false, text: '', timer: 0 },
        lastEnteredLocation: null,

        // Battle state
        battle: null,

        // START menu state
        menuOpen: false,
        menuIndex: 0,
        menuItems: [
            { label: 'POKeDEX', action: 'pokedex' },
            { label: 'POKeMON', action: 'pokemon' },
            { label: 'BAG', action: 'bag' },
            { label: 'SAVE', action: 'save' },
            { label: 'EXIT', action: 'exit' },
        ],
    },

    keys: {},
    _taglineInterval: null,
    _animFrameId: null,
    _prefetchStarted: false,
    _inputLock: false, // prevents input during transitions
    _typewriterInterval: null,

    // ===== INIT =====
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
        el.textContent = POKEMON_TAGLINES[0];
        this._taglineInterval = setInterval(() => {
            idx = (idx + 1) % POKEMON_TAGLINES.length;
            el.style.opacity = '0';
            setTimeout(() => { el.textContent = POKEMON_TAGLINES[idx]; el.style.opacity = '1'; }, 300);
        }, 2500);
    },

    _stopTaglineCycle() {
        if (this._taglineInterval) { clearInterval(this._taglineInterval); this._taglineInterval = null; }
    },

    // ===== TEAM SELECTION (unchanged) =====
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
                <div class="team-card" data-team-id="${t.team_id}" onclick="PokemonController.selectTeam(${t.team_id}, '${escapeHtml(t.team_name).replace(/'/g, "\\'")}')">
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

    // ===== GAME START =====
    async startGame() {
        try {
            await this._fetchWeekData(this.state.startWeek);
            this._extractWeekResult(this.state.startWeek);
            const canvas = document.getElementById('gameCanvas');
            PokemonRenderer.init(canvas);

            // Place player at first location (tile coordinates)
            const startLoc = PokemonRenderer.getLocation(this.state.startWeek);
            this.state.playerTX = startLoc.x;
            this.state.playerTY = startLoc.y;
            this.state.playerPixelX = startLoc.x * PokemonRenderer.tileSize;
            this.state.playerPixelY = startLoc.y * PokemonRenderer.tileSize;
            this.state.gameMode = 'overworld';

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

    // ===== DATA FETCHING =====
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

    // ===== INPUT SYSTEM =====
    _setupInput() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        this._setupTouch();
    },

    _onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (this._inputLock) return;

        // Prevent repeats for action keys
        if (this.keys[key]) return;
        this.keys[key] = true;

        // --- OVERLAY MODE ---
        if (this.state.overlayOpen) {
            if (key === 'escape') { e.preventDefault(); this.closeOverlay(); }
            if (key === 'arrowleft') { e.preventDefault(); this.overlayPrevWeek(); }
            if (key === 'arrowright') { e.preventDefault(); this.overlayNextWeek(); }
            return;
        }

        // --- MENU MODE ---
        if (this.state.menuOpen) {
            e.preventDefault();
            if (key === 'escape' || key === 'x') { this._closeMenu(); return; }
            if (key === 'arrowup' || key === 'w') { this.state.menuIndex = Math.max(0, this.state.menuIndex - 1); return; }
            if (key === 'arrowdown' || key === 's') { this.state.menuIndex = Math.min(this.state.menuItems.length - 1, this.state.menuIndex + 1); return; }
            if (key === 'enter' || key === 'z') { this._selectMenuItem(); return; }
            return;
        }

        // --- TEXT BOX MODE ---
        if (this.state.textBox.visible) {
            if (key === 'enter' || key === 'z' || key === ' ') {
                e.preventDefault();
                this._advanceTextBox();
            }
            return;
        }

        // --- BATTLE MODE ---
        if (this.state.gameMode === 'battle' && this.state.battle) {
            e.preventDefault();
            this._handleBattleInput(key);
            return;
        }

        // --- OVERWORLD MODE ---
        if (key === 'escape' || key === 'x') { e.preventDefault(); this._openMenu(); return; }

        // Interaction: press Enter/Z to interact with NPC or door in front of player
        if (key === 'enter' || key === 'z') {
            e.preventDefault();
            this._interact();
            return;
        }

        // Prevent default for movement keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
            e.preventDefault();
        }
    },

    _onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    },

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
            this.keys['arrowup'] = false; this.keys['arrowdown'] = false; this.keys['arrowleft'] = false; this.keys['arrowright'] = false;
            const threshold = 20;
            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                if (Math.abs(dx) > Math.abs(dy)) this.keys[dx > 0 ? 'arrowright' : 'arrowleft'] = true;
                else this.keys[dy > 0 ? 'arrowdown' : 'arrowup'] = true;
            }
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            touchActive = false;
            this.keys['arrowup'] = false; this.keys['arrowdown'] = false;
            this.keys['arrowleft'] = false; this.keys['arrowright'] = false;
        });

        // Tap to interact
        canvas.addEventListener('click', () => {
            if (this.state.textBox.visible) { this._advanceTextBox(); return; }
            if (this.state.gameMode === 'overworld') this._interact();
        });
    },

    // ===== GAME LOOP =====
    _gameLoop() {
        if (!this.state.gameRunning) return;

        if (this.state.gameMode === 'overworld' && !this.state.textBox.visible && !this.state.menuOpen && !this.state.overlayOpen) {
            this._updateMovement();
        }

        // Typewriter for text box
        if (this.state.textBox.visible && !this.state.textBox.complete) {
            this._tickTypewriter();
        }

        // Location banner timer
        if (this.state.locationBanner.visible) {
            this.state.locationBanner.timer--;
            if (this.state.locationBanner.timer <= 0) this.state.locationBanner.visible = false;
        }

        // Battle auto-advance
        if (this.state.gameMode === 'battle' && this.state.battle && this.state.battle.autoAdvance) {
            this._tickBattle();
        }

        // Camera follows player pixel position
        PokemonRenderer.updateCamera(this.state.playerPixelX + 8, this.state.playerPixelY + 8);

        // Render based on mode
        if (this.state.menuOpen) {
            PokemonRenderer.renderStartMenu(this.state);
        } else {
            PokemonRenderer.render(this.state);
        }

        this._animFrameId = requestAnimationFrame(() => this._gameLoop());
    },

    // ===== GRID-BASED MOVEMENT =====
    _updateMovement() {
        const s = this.state;

        // Currently in a step animation
        if (s.moveTargetTX !== null) {
            s.moveProgress += s.moveSpeed;
            if (s.moveProgress >= 1) {
                // Snap to target
                s.playerTX = s.moveTargetTX;
                s.playerTY = s.moveTargetTY;
                s.playerPixelX = s.playerTX * PokemonRenderer.tileSize;
                s.playerPixelY = s.playerTY * PokemonRenderer.tileSize;
                s.moveTargetTX = null;
                s.moveTargetTY = null;
                s.moveProgress = 0;
                s.isMoving = false;
                s.stepCount++;

                // Check what we stepped onto
                this._onStepComplete();
            } else {
                // Interpolate pixel position
                const fromX = s.playerTX * PokemonRenderer.tileSize;
                const fromY = s.playerTY * PokemonRenderer.tileSize;
                const toX = s.moveTargetTX * PokemonRenderer.tileSize;
                const toY = s.moveTargetTY * PokemonRenderer.tileSize;
                s.playerPixelX = fromX + (toX - fromX) * s.moveProgress;
                s.playerPixelY = fromY + (toY - fromY) * s.moveProgress;
                s.isMoving = true;
            }
            return;
        }

        // Not currently stepping - check for new input
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) { dy = -1; s.playerDir = 'up'; }
        else if (this.keys['s'] || this.keys['arrowdown']) { dy = 1; s.playerDir = 'down'; }
        else if (this.keys['a'] || this.keys['arrowleft']) { dx = -1; s.playerDir = 'left'; }
        else if (this.keys['d'] || this.keys['arrowright']) { dx = 1; s.playerDir = 'right'; }

        if (dx !== 0 || dy !== 0) {
            const targetTX = s.playerTX + dx;
            const targetTY = s.playerTY + dy;

            if (PokemonRenderer.isWalkable(targetTX, targetTY)) {
                s.moveTargetTX = targetTX;
                s.moveTargetTY = targetTY;
                s.moveProgress = 0;
                s.isMoving = true;
            } else {
                // Face the direction but don't move (bump)
                s.isMoving = false;
            }
        } else {
            s.isMoving = false;
        }

        // Update nearest location for HUD
        this._updateNearLocation();
    },

    /** Called when a step completes - check for location entry, encounters */
    _onStepComplete() {
        const s = this.state;
        const locWeek = PokemonRenderer.getLocationAtTile(s.playerTX, s.playerTY);

        if (locWeek && locWeek !== s.lastEnteredLocation) {
            s.lastEnteredLocation = locWeek;
            const loc = PokemonRenderer.getLocation(locWeek);
            // Show location banner
            s.locationBanner = { visible: true, text: loc.name, timer: 120 };
        }

        // Entering a door triggers battle
        const tile = PokemonRenderer.tileMap[s.playerTY] ? PokemonRenderer.tileMap[s.playerTY][s.playerTX] : null;
        if (tile === PokemonRenderer.TILES.DOOR) {
            const doorLoc = PokemonRenderer.getLocationAtTile(s.playerTX, s.playerTY);
            if (doorLoc) {
                this._startBattleTransition(doorLoc);
                return;
            }
        }

        this._updateNearLocation();
    },

    _updateNearLocation() {
        const s = this.state;
        // Check proximity (within 3 tiles of any location center)
        let nearWeek = null;
        for (const loc of PokemonRenderer.locations) {
            const dist = Math.abs(s.playerTX - loc.x) + Math.abs(s.playerTY - loc.y);
            if (dist <= 3) { nearWeek = loc.week; break; }
        }
        if (nearWeek !== s.nearLocation) {
            s.nearLocation = nearWeek;
            this._updatePrompt();
        }
    },

    _updatePrompt() {
        const prompt = document.getElementById('enter-prompt');
        const locSpan = document.getElementById('prompt-location');
        if (this.state.nearLocation && !this.state.textBox.visible && !this.state.menuOpen) {
            const loc = PokemonRenderer.getLocation(this.state.nearLocation);
            locSpan.textContent = loc.name;
            prompt.style.display = 'block';
        } else {
            prompt.style.display = 'none';
        }
    },

    // ===== INTERACTION SYSTEM =====
    _interact() {
        const s = this.state;
        // Get the tile the player is facing
        let facingTX = s.playerTX;
        let facingTY = s.playerTY;
        switch (s.playerDir) {
            case 'up': facingTY--; break;
            case 'down': facingTY++; break;
            case 'left': facingTX--; break;
            case 'right': facingTX++; break;
        }

        // Check for NPC
        const npc = PokemonRenderer.getNpcAt(facingTX, facingTY);
        if (npc) {
            // Make NPC face the player
            const oppDir = { up: 'down', down: 'up', left: 'right', right: 'left' };
            npc.dir = oppDir[s.playerDir] || 'down';

            // Get context-aware dialogue
            const weekResult = s.weekResults[npc.week];
            const dialogue = PokemonRenderer.getNpcDialogue(npc, weekResult);
            this._showTextBox(dialogue);
            return;
        }

        // Check for sign
        const tile = PokemonRenderer.tileMap[facingTY] ? PokemonRenderer.tileMap[facingTY][facingTX] : null;
        if (tile === PokemonRenderer.TILES.SIGN) {
            // Find which location this sign is near
            let signLoc = null;
            for (const loc of PokemonRenderer.locations) {
                if (Math.abs(facingTX - loc.x) <= 4 && Math.abs(facingTY - loc.y) <= 4) {
                    signLoc = loc; break;
                }
            }
            if (signLoc) {
                this._showTextBox(signLoc.name + '\nWeek ' + signLoc.week);
            }
            return;
        }

        // Check for door
        if (tile === PokemonRenderer.TILES.DOOR) {
            const doorLoc = PokemonRenderer.getLocationAtTile(facingTX, facingTY);
            if (doorLoc) {
                this._startBattleTransition(doorLoc);
            }
            return;
        }

        // If near a location, open the overlay as fallback
        if (s.nearLocation) {
            this.openOverlay(s.nearLocation);
        }
    },

    // ===== TEXT BOX SYSTEM =====
    _showTextBox(text, callback) {
        this.state.textBox = {
            visible: true,
            fullText: text,
            displayText: '',
            charIndex: 0,
            complete: false,
            callback: callback || null,
        };
        document.getElementById('enter-prompt').style.display = 'none';
    },

    _tickTypewriter() {
        const tb = this.state.textBox;
        if (tb.charIndex < tb.fullText.length) {
            tb.charIndex += 1;
            tb.displayText = tb.fullText.substring(0, tb.charIndex);
        } else {
            tb.complete = true;
        }
    },

    _advanceTextBox() {
        const tb = this.state.textBox;
        if (!tb.complete) {
            // Fast-forward text
            tb.charIndex = tb.fullText.length;
            tb.displayText = tb.fullText;
            tb.complete = true;
        } else {
            // Close text box
            tb.visible = false;
            if (tb.callback) tb.callback();
            this._updatePrompt();
        }
    },

    // ===== START MENU =====
    _openMenu() {
        this.state.menuOpen = true;
        this.state.menuIndex = 0;
        document.getElementById('enter-prompt').style.display = 'none';
    },

    _closeMenu() {
        this.state.menuOpen = false;
        this._updatePrompt();
    },

    _selectMenuItem() {
        const item = this.state.menuItems[this.state.menuIndex];
        switch (item.action) {
            case 'pokedex':
                this._closeMenu();
                // Show season stats as text
                this._showSeasonStatsText();
                break;
            case 'pokemon':
                this._closeMenu();
                this._showTeamRosterText();
                break;
            case 'bag':
                this._closeMenu();
                // Open overlay for current nearby week, or show message
                if (this.state.nearLocation) {
                    this.openOverlay(this.state.nearLocation);
                } else {
                    this._showTextBox("Walk to a town and\nenter its GYM to see\nweek data!");
                }
                break;
            case 'save':
                this._closeMenu();
                this._showTextBox("SAVING...\n...\nThe game was saved!\n(Just kidding, this\nis a web app.)");
                break;
            case 'exit':
                this._closeMenu();
                break;
        }
    },

    _showSeasonStatsText() {
        const w = this.state.totalWins;
        const l = this.state.totalLosses;
        const name = (this.state.teamName || 'TRAINER').toUpperCase();
        let text = name + '\nRecord: ' + w + '-' + l;
        const weeksDone = Object.keys(this.state.weekResults).length;
        text += '\nWeeks explored: ' + weeksDone + '/' + (this.state.endWeek - this.state.startWeek + 1);
        this._showTextBox(text);
    },

    _showTeamRosterText() {
        // Show top starters from the most recent fetched week
        const weeks = Object.keys(this.state.weekData).sort((a, b) => b - a);
        if (weeks.length === 0) {
            this._showTextBox("No team data yet.\nExplore a town first!");
            return;
        }
        const wData = this.state.weekData[weeks[0]];
        if (wData && wData.my_matchup && wData.my_matchup.my_team) {
            const starters = wData.my_matchup.my_team.starters || [];
            const top = starters.slice(0, 4);
            let text = 'YOUR SQUAD:\n';
            for (const p of top) {
                text += p.name + ' ' + (p.points || 0).toFixed(1) + '\n';
            }
            if (starters.length > 4) text += '...and ' + (starters.length - 4) + ' more';
            this._showTextBox(text);
        } else {
            this._showTextBox("No roster data.\nVisit a GYM first!");
        }
    },

    // ===== BATTLE SYSTEM =====
    _startBattleTransition(week) {
        if (this._inputLock) return;
        this._inputLock = true;
        this.state.gameMode = 'overworld'; // still rendering overworld during transition

        // Fade to black
        PokemonRenderer.startTransition('out', async () => {
            // Load week data if needed
            if (!this.state.weekData[week]) {
                try { await this._fetchWeekData(week); this._extractWeekResult(week); }
                catch (e) { this._inputLock = false; this.state.gameMode = 'overworld'; return; }
            }
            this._initBattle(week);
            this.state.gameMode = 'battle';
            // Fade in from black
            PokemonRenderer.startTransition('in', () => {
                this._inputLock = false;
            });
        });
    },

    _initBattle(week) {
        const data = this.state.weekData[week];
        const my = data && data.my_matchup ? data.my_matchup.my_team : null;
        const opp = data && data.my_matchup ? data.my_matchup.opponent : null;
        if (!my || !opp) {
            this._endBattle();
            return;
        }

        // Calculate HP as scores. Max HP = max of both scores (so the winner depletes the other)
        const maxHp = Math.max(my.score, opp.score, 80);

        // Build "moves" from top starters
        const myStarters = (my.starters || []).filter(s => s.points > 0).slice(0, 6);
        const oppStarters = (opp.starters || []).filter(s => s.points > 0).slice(0, 6);

        // Create sequence of "attacks" to autoplay
        const attacks = [];
        const maxMoves = Math.max(myStarters.length, oppStarters.length);
        for (let i = 0; i < maxMoves; i++) {
            if (i < myStarters.length) {
                const p = myStarters[i];
                attacks.push({
                    side: 'player',
                    name: p.name,
                    points: p.points,
                    text: this._getMoveText(p),
                });
            }
            if (i < oppStarters.length) {
                const p = oppStarters[i];
                attacks.push({
                    side: 'enemy',
                    name: p.name,
                    points: p.points,
                    text: this._getEnemyMoveText(p),
                });
            }
        }

        const loc = PokemonRenderer.getLocation(week);

        this.state.battle = {
            week: week,
            phase: 'intro', // intro -> fighting -> result -> done
            playerName: my.team_name || 'YOUR TEAM',
            enemyName: opp.team_name || 'OPPONENT',
            playerMaxHp: maxHp,
            enemyMaxHp: maxHp,
            playerHp: maxHp,
            enemyHp: maxHp,
            playerFinalHp: my.score,
            enemyFinalHp: opp.score,
            won: my.won,
            attacks: attacks,
            attackIndex: 0,
            displayText: 'Wild ' + (opp.team_name || 'OPPONENT').substring(0, 12).toUpperCase() + '\nappeared!',
            textComplete: false,
            textCharIndex: 0,
            fullText: 'Wild ' + (opp.team_name || 'OPPONENT').substring(0, 12).toUpperCase() + '\nappeared!',
            autoAdvance: false,
            autoTimer: 0,
            playerType: 'normal',
            enemyType: 'normal',
            moves: myStarters.slice(0, 4).map(s => ({ name: s.name, points: s.points })),
            selectedMove: 0,
            locationName: loc ? loc.name : 'Week ' + week,
        };

        // Start typewriter for intro text
        this._startBattleTypewriter();
    },

    _getMoveText(player) {
        const pts = player.points;
        let effectiveness = '';
        if (pts >= 25) effectiveness = "\nIt's super effective!";
        else if (pts >= 15) effectiveness = "\nIt's effective!";
        else if (pts < 5) effectiveness = "\nIt's not very effective...";
        return player.name + ' used\n' + this._getMoveNameForPoints(pts) + '!' + effectiveness + '\n' + pts.toFixed(1) + ' damage!';
    },

    _getEnemyMoveText(player) {
        const pts = player.points;
        let effectiveness = '';
        if (pts >= 25) effectiveness = "\nIt's super effective!";
        else if (pts >= 15) effectiveness = "\nIt's effective!";
        else if (pts < 5) effectiveness = "\nIt's not very effective...";
        return 'Enemy ' + player.name + '\nused ' + this._getMoveNameForPoints(pts) + '!' + effectiveness + '\n' + pts.toFixed(1) + ' damage!';
    },

    _getMoveNameForPoints(pts) {
        if (pts >= 30) return 'HYPER BEAM';
        if (pts >= 25) return 'THUNDERBOLT';
        if (pts >= 20) return 'FLAMETHROWER';
        if (pts >= 15) return 'SURF';
        if (pts >= 10) return 'TACKLE';
        if (pts >= 5) return 'SCRATCH';
        return 'SPLASH';
    },

    _startBattleTypewriter() {
        const b = this.state.battle;
        b.textCharIndex = 0;
        b.displayText = '';
        b.textComplete = false;
    },

    _tickBattle() {
        const b = this.state.battle;
        if (!b) return;

        // Typewriter for battle text
        if (!b.textComplete) {
            b.textCharIndex++;
            if (b.textCharIndex >= b.fullText.length) {
                b.displayText = b.fullText;
                b.textComplete = true;
                b.autoTimer = 60; // wait before auto-advancing
            } else {
                b.displayText = b.fullText.substring(0, b.textCharIndex);
            }
            return;
        }

        // Auto-advance timer
        if (b.autoTimer > 0) {
            b.autoTimer--;
            return;
        }

        // Advance battle state
        switch (b.phase) {
            case 'intro':
                b.phase = 'fighting';
                b.attackIndex = 0;
                this._playNextAttack();
                break;
            case 'fighting':
                this._playNextAttack();
                break;
            case 'result':
                b.phase = 'done';
                b.fullText = 'Press ENTER to continue...';
                this._startBattleTypewriter();
                b.autoAdvance = false;
                break;
        }
    },

    _playNextAttack() {
        const b = this.state.battle;
        if (b.attackIndex >= b.attacks.length) {
            // All attacks played - show result
            this._showBattleResult();
            return;
        }

        const attack = b.attacks[b.attackIndex];
        b.fullText = attack.text;
        this._startBattleTypewriter();
        b.attackIndex++;

        // Animate HP reduction
        if (attack.side === 'player') {
            // Player attacks enemy - reduce enemy HP
            const hpLoss = (attack.points / b.enemyMaxHp) * b.enemyMaxHp * 0.5;
            b.enemyHp = Math.max(0, b.enemyHp - hpLoss);
            PokemonRenderer.battleAnim.shake = 3;
            setTimeout(() => { PokemonRenderer.battleAnim.shake = -3; }, 50);
            setTimeout(() => { PokemonRenderer.battleAnim.shake = 2; }, 100);
            setTimeout(() => { PokemonRenderer.battleAnim.shake = 0; }, 150);
        } else {
            const hpLoss = (attack.points / b.playerMaxHp) * b.playerMaxHp * 0.5;
            b.playerHp = Math.max(0, b.playerHp - hpLoss);
            PokemonRenderer.battleAnim.shake = -3;
            setTimeout(() => { PokemonRenderer.battleAnim.shake = 3; }, 50);
            setTimeout(() => { PokemonRenderer.battleAnim.shake = -2; }, 100);
            setTimeout(() => { PokemonRenderer.battleAnim.shake = 0; }, 150);
        }
    },

    _showBattleResult() {
        const b = this.state.battle;

        // Set final HP based on actual scores
        b.playerHp = b.playerFinalHp;
        b.enemyHp = b.enemyFinalHp;

        b.phase = 'result';
        if (b.won) {
            b.fullText = 'You defeated\n' + b.enemyName.substring(0, 12).toUpperCase() + '!\n' +
                b.playerFinalHp.toFixed(1) + ' to ' + b.enemyFinalHp.toFixed(1);
        } else {
            b.fullText = b.enemyName.substring(0, 12).toUpperCase() + '\ndefeated you!\n' +
                b.enemyFinalHp.toFixed(1) + ' to ' + b.playerFinalHp.toFixed(1);
        }
        this._startBattleTypewriter();
    },

    _handleBattleInput(key) {
        const b = this.state.battle;
        if (!b) return;

        if (key === 'escape') {
            // Allow escape to exit battle at any time
            this._endBattleTransition();
            return;
        }

        if (!b.textComplete) {
            // Fast-forward text
            if (key === 'enter' || key === 'z' || key === ' ') {
                b.textCharIndex = b.fullText.length;
                b.displayText = b.fullText;
                b.textComplete = true;
                b.autoTimer = 10;
            }
            return;
        }

        if (key === 'enter' || key === 'z' || key === ' ') {
            if (b.phase === 'intro') {
                b.autoAdvance = true;
                b.autoTimer = 0;
            } else if (b.phase === 'fighting') {
                b.autoAdvance = true;
                b.autoTimer = 0;
            } else if (b.phase === 'done') {
                // Show detailed overlay then end battle
                this._endBattleToOverlay();
            } else if (b.phase === 'result') {
                b.autoAdvance = true;
                b.autoTimer = 0;
            }
        }
    },

    _endBattleTransition() {
        if (this._inputLock) return;
        this._inputLock = true;

        PokemonRenderer.startTransition('out', () => {
            this.state.battle = null;
            this.state.gameMode = 'overworld';
            PokemonRenderer.startTransition('in', () => {
                this._inputLock = false;
                this._updatePrompt();
            });
        });
    },

    _endBattleToOverlay() {
        if (this._inputLock) return;
        this._inputLock = true;
        const week = this.state.battle.week;

        PokemonRenderer.startTransition('out', () => {
            this.state.battle = null;
            this.state.gameMode = 'overworld';
            PokemonRenderer.startTransition('in', () => {
                this._inputLock = false;
                // Open the detailed stats overlay
                this.openOverlay(week);
            });
        });
    },

    _endBattle() {
        this.state.battle = null;
        this.state.gameMode = 'overworld';
        this._inputLock = false;
        this._updatePrompt();
    },

    // ===== STATS OVERLAY (preserved from original) =====
    async openOverlay(week) {
        this.state.overlayOpen = true;
        this.state.overlayWeek = week;
        document.getElementById('stats-overlay').style.display = 'flex';
        document.getElementById('enter-prompt').style.display = 'none';
        if (!this.state.weekData[week]) {
            document.getElementById('stats-body').innerHTML = '<p style="text-align:center;padding:40px;font-size:0.6em;">Loading week data...</p>';
            try { await this._fetchWeekData(week); this._extractWeekResult(week); }
            catch (e) { document.getElementById('stats-body').innerHTML = '<p style="text-align:center;padding:40px;font-size:0.6em;color:#e3350d;">Failed: ' + escapeHtml(e.message) + '</p>'; return; }
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
        const loc = PokemonRenderer.getLocation(week);
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

document.addEventListener('DOMContentLoaded', () => { PokemonController.init(); });
