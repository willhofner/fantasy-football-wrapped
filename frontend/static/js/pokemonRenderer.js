/* ===== POKEMON WORLD RENDERER ===== */
/* Canvas rendering: Gameboy Color authentic tile map, sprites, battles, text boxes, menus */

const PokemonRenderer = {
    canvas: null,
    ctx: null,
    scale: 3,
    tileSize: 16,

    // Gameboy resolution: 160x144 (10x9 tiles). We show a bit more for web.
    viewTilesX: 16,
    viewTilesY: 14,

    camera: { x: 0, y: 0 },
    cameraSmooth: { x: 0, y: 0 },

    mapWidth: 100,
    mapHeight: 70,

    frameCount: 0,
    animFrame: 0,

    tileMap: null,
    collisionMap: null,

    // Gameboy Color palette (blue tint - Pokemon Blue)
    PAL: {
        lightest: '#C4D8F8',
        light:    '#6890B8',
        dark:     '#305878',
        darkest:  '#081820',
        // Alternate green palette for grass areas
        gLight:   '#88C070',
        gMid:     '#346856',
        // UI colors
        white:    '#F8F8F8',
        black:    '#081820',
        hpGreen:  '#58A850',
        hpYellow: '#F8D030',
        hpRed:    '#E03020',
    },

    // Tile types
    TILES: {
        GRASS: 0, TALL_GRASS: 1, PATH: 2, WATER: 3,
        TREE: 4, BUILDING: 5, ROOF: 6, FENCE: 7,
        FLOWER_RED: 8, FLOWER_YELLOW: 9, SAND: 10,
        ROCK: 11, LEDGE: 12, SIGN: 13, DOOR: 14,
        DARK_GRASS: 15, SNOW: 16, CAVE: 17, BRIDGE: 18,
        MOUNTAIN: 19
    },

    // Which tiles are walkable
    WALKABLE: null, // initialized in init

    // 14 Pokemon-themed locations for each week
    locations: [
        { week: 1,  name: 'Pallet Town',       x: 12, y: 55, theme: 'starter',   doorX: 12, doorY: 54 },
        { week: 2,  name: 'Viridian City',      x: 12, y: 44, theme: 'city',      doorX: 12, doorY: 43 },
        { week: 3,  name: 'Pewter City',        x: 25, y: 36, theme: 'rock',      doorX: 25, doorY: 35 },
        { week: 4,  name: 'Cerulean City',      x: 40, y: 28, theme: 'water',     doorX: 40, doorY: 27 },
        { week: 5,  name: 'Vermilion City',     x: 50, y: 40, theme: 'electric',  doorX: 50, doorY: 39 },
        { week: 6,  name: 'Lavender Town',      x: 62, y: 30, theme: 'ghost',     doorX: 62, doorY: 29 },
        { week: 7,  name: 'Celadon City',       x: 42, y: 18, theme: 'nature',    doorX: 42, doorY: 17 },
        { week: 8,  name: 'Fuchsia City',       x: 55, y: 52, theme: 'poison',    doorX: 55, doorY: 51 },
        { week: 9,  name: 'Saffron City',       x: 50, y: 18, theme: 'psychic',   doorX: 50, doorY: 17 },
        { week: 10, name: 'Cinnabar Island',    x: 20, y: 62, theme: 'fire',      doorX: 20, doorY: 61 },
        { week: 11, name: 'Seafoam Islands',    x: 35, y: 60, theme: 'ice',       doorX: 35, doorY: 59 },
        { week: 12, name: 'Victory Road',       x: 72, y: 16, theme: 'dark',      doorX: 72, doorY: 15 },
        { week: 13, name: 'Indigo Plateau',     x: 82, y: 10, theme: 'champion',  doorX: 82, doorY: 9  },
        { week: 14, name: 'Pokemon League',     x: 88, y: 6,  theme: 'league',    doorX: 88, doorY: 5  },
    ],

    // Route connections between locations
    paths: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
        [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]
    ],

    // NPCs placed in towns
    npcs: [], // populated in _generateMap

    // NPC dialogue pools
    NPC_DIALOGUE: {
        generic: [
            "I heard you left points\non your bench this week...",
            "The standings are\nheating up!",
            "Have you checked your\nlineup errors? Yikes.",
            "My Raticate could\nmanage a better lineup!",
            "Gotta catch all\nthe wins!",
            "I traded away my\nbest player once.\nNever again.",
            "The waiver wire is\nlike tall grass.\nYou never know what\nyou will find!",
            "Some managers just\nget lucky. Are you\none of them?",
        ],
        win: [
            "Congratulations on\nthe win, trainer!",
            "That victory was\nsuper effective!",
            "You won? Your team\nmust be fully evolved!",
            "A win is a win!\nEven if it was close.",
        ],
        loss: [
            "Tough loss this week.\nBetter luck next time!",
            "Your team fainted!\nHead to the Pokemon\nCenter...",
            "Even the best trainers\nlose sometimes.",
            "That loss was like\nusing Splash.\nIt had no effect...",
        ],
        error: [
            "You left HOW many\npoints on the bench?!",
            "Your bench outscored\nyour starters?\nEmbarrassing!",
            "Those lineup errors\nare not great, coach.",
        ],
    },

    // Screen transition state
    transition: { active: false, alpha: 0, direction: 'in', callback: null },

    // Battle screen sprite offsets for animation
    battleAnim: { enemyY: 0, playerY: 0, shake: 0 },

    /** Initialize the renderer */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Build walkable set
        const T = this.TILES;
        this.WALKABLE = new Set([
            T.GRASS, T.TALL_GRASS, T.PATH, T.SAND,
            T.BRIDGE, T.DOOR, T.DARK_GRASS, T.SNOW,
            T.FLOWER_RED, T.FLOWER_YELLOW, T.SIGN, T.LEDGE
        ]);

        this._generateMap();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Calculate scale to fill the screen while keeping pixel-perfect tiles
        this.scale = Math.max(2, Math.min(4, Math.floor(Math.min(w, h) / 240)));
        this.viewTilesX = Math.ceil(w / (this.tileSize * this.scale)) + 2;
        this.viewTilesY = Math.ceil(h / (this.tileSize * this.scale)) + 2;
        this.canvas.width = Math.floor(w / this.scale);
        this.canvas.height = Math.floor(h / this.scale);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.imageSmoothingEnabled = false;
    },

    tileToPixel(tx, ty) {
        return { x: tx * this.tileSize, y: ty * this.tileSize };
    },

    pixelToTile(px, py) {
        return { tx: Math.floor(px / this.tileSize), ty: Math.floor(py / this.tileSize) };
    },

    getLocation(week) {
        return this.locations.find(l => l.week === week);
    },

    getLocationCenter(week) {
        const loc = this.getLocation(week);
        if (!loc) return { x: 0, y: 0 };
        return this.tileToPixel(loc.x, loc.y);
    },

    /** Check if a tile coordinate is walkable */
    isWalkable(tx, ty) {
        if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return false;
        const tile = this.tileMap[ty] ? this.tileMap[ty][tx] : this.TILES.GRASS;
        if (!this.WALKABLE.has(tile)) return false;
        // Check NPC collision
        for (const npc of this.npcs) {
            if (npc.tx === tx && npc.ty === ty) return false;
        }
        return true;
    },

    /** Get NPC at a tile position */
    getNpcAt(tx, ty) {
        return this.npcs.find(n => n.tx === tx && n.ty === ty) || null;
    },

    /** Get location at a tile position (checks door tiles) */
    getLocationAtTile(tx, ty) {
        for (const loc of this.locations) {
            if (loc.doorX === tx && loc.doorY === ty) return loc.week;
            // Also trigger on the town center
            if (loc.x === tx && loc.y === ty) return loc.week;
        }
        return null;
    },

    /** Get dialogue for an NPC based on week context */
    getNpcDialogue(npc, weekResult) {
        const pool = [];
        if (weekResult) {
            if (weekResult.won) pool.push(...this.NPC_DIALOGUE.win);
            else pool.push(...this.NPC_DIALOGUE.loss);
            if (weekResult.myScore && weekResult.oppScore) {
                const margin = Math.abs(weekResult.myScore - weekResult.oppScore);
                if (margin < 5) pool.push("That was a close one!\nOnly " + margin.toFixed(1) + " points\napart!");
            }
        }
        pool.push(...this.NPC_DIALOGUE.generic);
        // Use npc id as seed for consistent dialogue per NPC
        const idx = (npc.id * 7 + (this.frameCount >> 8)) % pool.length;
        return pool[idx];
    },

    updateCamera(targetX, targetY) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        this.camera.x = targetX - viewW / 2;
        this.camera.y = targetY - viewH / 2;
        const maxX = this.mapWidth * this.tileSize - viewW;
        const maxY = this.mapHeight * this.tileSize - viewH;
        this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));
        this.cameraSmooth.x += (this.camera.x - this.cameraSmooth.x) * 0.15;
        this.cameraSmooth.y += (this.camera.y - this.cameraSmooth.y) * 0.15;
    },

    // ========== MAP GENERATION ==========
    _generateMap() {
        const W = this.mapWidth;
        const H = this.mapHeight;
        const T = this.TILES;
        this.tileMap = [];
        this.npcs = [];
        let npcId = 0;

        // Fill with grass
        for (let y = 0; y < H; y++) {
            this.tileMap[y] = [];
            for (let x = 0; x < W; x++) {
                const normalY = y / H;
                const normalX = x / W;
                if (normalY > 0.82 && normalX > 0.2 && normalX < 0.55) {
                    this.tileMap[y][x] = T.WATER;
                } else if (normalY < 0.15 && normalX > 0.65) {
                    this.tileMap[y][x] = ((x + y) % 3 === 0) ? T.MOUNTAIN : T.ROCK;
                } else if (normalY < 0.2 && normalX > 0.55) {
                    this.tileMap[y][x] = T.DARK_GRASS;
                } else {
                    const hash = (x * 7 + y * 13) % 17;
                    if (hash < 2) this.tileMap[y][x] = T.TALL_GRASS;
                    else if (hash < 4) this.tileMap[y][x] = T.DARK_GRASS;
                    else this.tileMap[y][x] = T.GRASS;
                }
            }
        }

        // Scatter trees
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const hash = (x * 9973 + y * 4231) % 100;
                if (hash < 8 && this.tileMap[y][x] === T.GRASS) {
                    this.tileMap[y][x] = T.TREE;
                }
            }
        }

        // Create paths between locations
        for (const [ai, bi] of this.paths) {
            const a = this.locations[ai];
            const b = this.locations[bi];
            this._drawPath(a.x, a.y, b.x, b.y, T.PATH);
        }

        // Create town areas and place NPCs
        for (const loc of this.locations) {
            this._buildTown(loc);
            // Place 1-2 NPCs per town
            const npcPositions = this._getTownNpcPositions(loc);
            for (const pos of npcPositions) {
                if (pos.tx >= 0 && pos.tx < W && pos.ty >= 0 && pos.ty < H) {
                    this.npcs.push({
                        id: npcId++,
                        tx: pos.tx, ty: pos.ty,
                        dir: pos.dir || 'down',
                        type: pos.type || 'villager',
                        week: loc.week,
                    });
                }
            }
        }
    },

    _getTownNpcPositions(loc) {
        // Place NPCs on walkable tiles near each town
        const cx = loc.x;
        const cy = loc.y;
        const positions = [];
        // NPC 1: right side of town
        positions.push({ tx: cx + 2, ty: cy + 1, dir: 'left', type: 'villager' });
        // NPC 2: left side (only for bigger towns)
        if (loc.theme !== 'starter') {
            positions.push({ tx: cx - 2, ty: cy + 2, dir: 'right', type: 'trainer' });
        }
        return positions;
    },

    _drawPath(x1, y1, x2, y2, tile) {
        const midX = Math.round((x1 + x2) / 2);
        const T = this.TILES;
        const draw = (x, y) => {
            for (let dy = -1; dy <= 1; dy++) {
                const ty = y + dy;
                if (ty >= 0 && ty < this.mapHeight && x >= 0 && x < this.mapWidth) {
                    if (this.tileMap[ty][x] !== T.BUILDING && this.tileMap[ty][x] !== T.ROOF && this.tileMap[ty][x] !== T.DOOR) {
                        this.tileMap[ty][x] = tile;
                    }
                }
            }
        };
        const drawV = (x, y) => {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = x + dx;
                if (y >= 0 && y < this.mapHeight && tx >= 0 && tx < this.mapWidth) {
                    if (this.tileMap[y][tx] !== T.BUILDING && this.tileMap[y][tx] !== T.ROOF && this.tileMap[y][tx] !== T.DOOR) {
                        this.tileMap[y][tx] = tile;
                    }
                }
            }
        };
        for (let x = Math.min(x1, midX); x <= Math.max(x1, midX); x++) draw(x, y1);
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) drawV(midX, y);
        for (let x = Math.min(midX, x2); x <= Math.max(midX, x2); x++) draw(x, y2);
    },

    _buildTown(loc) {
        const T = this.TILES;
        const cx = loc.x;
        const cy = loc.y;
        const r = 4;

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const tx = cx + dx;
                const ty = cy + dy;
                if (tx >= 0 && tx < this.mapWidth && ty >= 0 && ty < this.mapHeight) {
                    this.tileMap[ty][tx] = T.PATH;
                }
            }
        }

        // Main building with door
        this._placeTile(cx - 1, cy - 2, T.ROOF);
        this._placeTile(cx, cy - 2, T.ROOF);
        this._placeTile(cx + 1, cy - 2, T.ROOF);
        this._placeTile(cx - 1, cy - 1, T.BUILDING);
        this._placeTile(cx + 1, cy - 1, T.BUILDING);
        this._placeTile(cx, cy - 1, T.DOOR);

        // Update door position on location
        loc.doorX = cx;
        loc.doorY = cy - 1;

        // Theme-specific decorations (same as before)
        switch (loc.theme) {
            case 'starter':
                this._placeTile(cx + 3, cy - 1, T.FENCE);
                this._placeTile(cx + 3, cy, T.FENCE);
                this._placeTile(cx - 3, cy + 1, T.FLOWER_RED);
                this._placeTile(cx - 2, cy + 1, T.FLOWER_YELLOW);
                this._placeTile(cx + 2, cy + 2, T.SIGN);
                break;
            case 'city':
                this._placeTile(cx + 3, cy - 2, T.ROOF);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx - 3, cy - 2, T.ROOF);
                this._placeTile(cx - 3, cy - 1, T.BUILDING);
                this._placeTile(cx, cy + 2, T.SIGN);
                break;
            case 'rock':
                this._placeTile(cx - 3, cy, T.ROCK);
                this._placeTile(cx + 3, cy - 1, T.ROCK);
                this._placeTile(cx - 2, cy + 2, T.ROCK);
                this._placeTile(cx + 2, cy + 2, T.ROCK);
                break;
            case 'water':
                this._placeTile(cx - 3, cy + 1, T.WATER);
                this._placeTile(cx - 3, cy + 2, T.WATER);
                this._placeTile(cx - 4, cy + 1, T.WATER);
                this._placeTile(cx - 4, cy + 2, T.WATER);
                this._placeTile(cx + 3, cy + 2, T.BRIDGE);
                break;
            case 'electric':
                this._placeTile(cx + 3, cy - 2, T.ROOF);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx - 3, cy + 1, T.FENCE);
                this._placeTile(cx - 2, cy + 1, T.FENCE);
                this._placeTile(cx - 1, cy + 1, T.FENCE);
                break;
            case 'ghost':
                this._placeTile(cx + 3, cy - 3, T.ROOF);
                this._placeTile(cx + 3, cy - 2, T.BUILDING);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx + 3, cy, T.BUILDING);
                this._placeTile(cx - 3, cy, T.SIGN);
                break;
            case 'nature':
                this._placeTile(cx - 3, cy + 1, T.FLOWER_RED);
                this._placeTile(cx - 2, cy + 1, T.FLOWER_YELLOW);
                this._placeTile(cx - 1, cy + 1, T.FLOWER_RED);
                this._placeTile(cx + 2, cy + 1, T.TREE);
                this._placeTile(cx + 3, cy + 1, T.TREE);
                break;
            case 'poison':
                this._placeTile(cx - 3, cy + 1, T.FENCE);
                this._placeTile(cx - 3, cy + 2, T.FENCE);
                this._placeTile(cx + 3, cy + 1, T.TALL_GRASS);
                this._placeTile(cx + 4, cy + 1, T.TALL_GRASS);
                break;
            case 'psychic':
                this._placeTile(cx + 3, cy - 2, T.ROOF);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx - 3, cy - 2, T.ROOF);
                this._placeTile(cx - 3, cy - 1, T.BUILDING);
                this._placeTile(cx + 3, cy + 1, T.SIGN);
                this._placeTile(cx - 3, cy + 1, T.SIGN);
                break;
            case 'fire':
                this._placeTile(cx - 3, cy + 1, T.SAND);
                this._placeTile(cx - 2, cy + 1, T.SAND);
                this._placeTile(cx + 3, cy + 1, T.SAND);
                this._placeTile(cx - 3, cy + 2, T.WATER);
                this._placeTile(cx + 3, cy + 2, T.WATER);
                break;
            case 'ice':
                this._placeTile(cx - 3, cy, T.SNOW);
                this._placeTile(cx - 2, cy + 1, T.SNOW);
                this._placeTile(cx + 3, cy + 1, T.SNOW);
                this._placeTile(cx + 2, cy, T.SNOW);
                this._placeTile(cx - 3, cy + 2, T.WATER);
                this._placeTile(cx + 3, cy + 2, T.WATER);
                break;
            case 'dark':
                this._placeTile(cx - 3, cy, T.CAVE);
                this._placeTile(cx - 3, cy - 1, T.MOUNTAIN);
                this._placeTile(cx + 3, cy - 1, T.MOUNTAIN);
                this._placeTile(cx + 3, cy, T.ROCK);
                break;
            case 'champion':
                this._placeTile(cx - 2, cy - 3, T.ROOF);
                this._placeTile(cx - 1, cy - 3, T.ROOF);
                this._placeTile(cx, cy - 3, T.ROOF);
                this._placeTile(cx + 1, cy - 3, T.ROOF);
                this._placeTile(cx + 2, cy - 3, T.ROOF);
                this._placeTile(cx + 3, cy - 1, T.FENCE);
                this._placeTile(cx - 3, cy - 1, T.FENCE);
                break;
            case 'league':
                for (let dx = -3; dx <= 3; dx++) this._placeTile(cx + dx, cy - 3, T.ROOF);
                this._placeTile(cx - 3, cy - 2, T.BUILDING);
                this._placeTile(cx + 3, cy - 2, T.BUILDING);
                this._placeTile(cx - 3, cy - 1, T.BUILDING);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx, cy + 2, T.SIGN);
                break;
        }

        // Ensure NPC positions are walkable (make them PATH)
        const npcSpots = this._getTownNpcPositions(loc);
        for (const pos of npcSpots) {
            if (pos.tx >= 0 && pos.tx < this.mapWidth && pos.ty >= 0 && pos.ty < this.mapHeight) {
                this.tileMap[pos.ty][pos.tx] = T.PATH;
            }
        }
    },

    _placeTile(x, y, tile) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            this.tileMap[y][x] = tile;
        }
    },

    // ========== MAIN RENDER MODES ==========

    /** Main render dispatcher - called every frame */
    render(state) {
        this.frameCount++;
        if (this.frameCount % 10 === 0) this.animFrame++;

        switch (state.gameMode) {
            case 'overworld':
                this._renderOverworld(state);
                break;
            case 'battle':
                this._renderBattle(state);
                break;
            case 'menu':
                // Render overworld behind menu, menu drawn by CSS overlay
                this._renderOverworld(state);
                break;
            default:
                this._renderOverworld(state);
        }

        // Screen transition overlay
        if (this.transition.active) {
            this._renderTransition();
        }
    },

    // ========== SCREEN TRANSITIONS ==========

    startTransition(direction, callback) {
        this.transition.active = true;
        this.transition.direction = direction; // 'out' = fade to black, 'in' = fade from black
        this.transition.alpha = direction === 'out' ? 0 : 1;
        this.transition.callback = callback;
    },

    _renderTransition() {
        const t = this.transition;
        const ctx = this.ctx;
        const speed = 0.06;

        if (t.direction === 'out') {
            t.alpha = Math.min(1, t.alpha + speed);
            if (t.alpha >= 1) {
                t.active = false;
                if (t.callback) t.callback();
            }
        } else {
            t.alpha = Math.max(0, t.alpha - speed);
            if (t.alpha <= 0) {
                t.active = false;
                if (t.callback) t.callback();
            }
        }

        ctx.fillStyle = `rgba(8, 24, 32, ${t.alpha})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    // ========== OVERWORLD RENDERING ==========

    _renderOverworld(state) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        // Fill BG with darkest color
        ctx.fillStyle = this.PAL.darkest;
        ctx.fillRect(0, 0, cw, ch);

        ctx.save();
        ctx.translate(-Math.round(this.cameraSmooth.x), -Math.round(this.cameraSmooth.y));

        this._drawTiles(ctx, cw, ch);
        this._drawNpcs(ctx, state);
        this._drawLocationMarkers(ctx, state);
        this._drawPlayer(ctx, state);

        ctx.restore();

        // Text box drawn on top of everything (not affected by camera)
        if (state.textBox && state.textBox.visible) {
            this._drawTextBox(ctx, state.textBox, cw, ch);
        }

        // Location name banner when entering a new area
        if (state.locationBanner && state.locationBanner.visible) {
            this._drawLocationBanner(ctx, state.locationBanner, cw, ch);
        }
    },

    // ========== TILE DRAWING (Gameboy Color palette) ==========
    _drawTiles(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILES;
        const P = this.PAL;

        const startTX = Math.max(0, Math.floor(sx / ts) - 1);
        const startTY = Math.max(0, Math.floor(sy / ts) - 1);
        const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts) + 1);
        const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts) + 1);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const px = tx * ts;
                const py = ty * ts;
                const tile = this.tileMap[ty] ? this.tileMap[ty][tx] : T.GRASS;

                switch (tile) {
                    case T.GRASS:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        if ((tx + ty) % 4 === 0) {
                            ctx.fillStyle = P.gMid;
                            ctx.fillRect(px + 4, py + 6, 3, 2);
                        }
                        if ((tx * 3 + ty * 7) % 9 === 0) {
                            ctx.fillStyle = P.gMid;
                            ctx.fillRect(px + 10, py + 2, 2, 2);
                        }
                        break;

                    case T.TALL_GRASS:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.gMid;
                        const gA = (this.frameCount + tx * 3) % 16 < 8 ? 0 : 1;
                        ctx.fillRect(px + 2 + gA, py + 1, 2, 7);
                        ctx.fillRect(px + 6, py + 2, 2, 6);
                        ctx.fillRect(px + 10 - gA, py + 1, 2, 7);
                        ctx.fillRect(px + 4, py + 8, 2, 5);
                        ctx.fillRect(px + 8, py + 9, 2, 4);
                        ctx.fillRect(px + 12, py + 7, 2, 5);
                        break;

                    case T.DARK_GRASS:
                        ctx.fillStyle = P.gMid;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 4, py + 4, 4, 4);
                        ctx.fillRect(px + 10, py + 10, 3, 3);
                        break;

                    case T.PATH:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        if ((tx + ty) % 3 === 0) {
                            ctx.fillStyle = P.light;
                            ctx.fillRect(px + 3, py + 7, 5, 2);
                        }
                        if ((tx * 3 + ty) % 5 === 0) {
                            ctx.fillStyle = P.light;
                            ctx.fillRect(px + 9, py + 2, 4, 2);
                        }
                        break;

                    case T.WATER:
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px, py, ts, ts);
                        const wOff = (this.frameCount + tx * 4 + ty * 7) % 24;
                        ctx.fillStyle = P.light;
                        if (wOff < 8) {
                            ctx.fillRect(px + 2, py + 4, 6, 2);
                            ctx.fillRect(px + 10, py + 10, 4, 2);
                        } else if (wOff < 16) {
                            ctx.fillRect(px + 4, py + 6, 6, 2);
                            ctx.fillRect(px + 8, py + 12, 4, 2);
                        } else {
                            ctx.fillRect(px + 1, py + 8, 5, 2);
                            ctx.fillRect(px + 9, py + 3, 5, 2);
                        }
                        break;

                    case T.TREE:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        // Trunk
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 6, py + 10, 4, 6);
                        // Canopy
                        ctx.fillStyle = P.gMid;
                        ctx.fillRect(px + 2, py + 2, 12, 10);
                        ctx.fillRect(px + 4, py, 8, 2);
                        // Highlight
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px + 4, py + 3, 4, 3);
                        break;

                    case T.BUILDING:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        // Window
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 4, py + 4, 8, 6);
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px + 5, py + 5, 3, 2);
                        // Border
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px, py, ts, 1);
                        ctx.fillRect(px, py, 1, ts);
                        ctx.fillRect(px + ts - 1, py, 1, ts);
                        break;

                    case T.ROOF:
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.darkest;
                        ctx.fillRect(px, py + ts - 3, ts, 3);
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px + 2, py + 2, ts - 4, 3);
                        break;

                    case T.DOOR:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.darkest;
                        ctx.fillRect(px + 3, py + 2, 10, 14);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 4, py + 3, 8, 12);
                        // Doorknob
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 10, py + 9, 2, 2);
                        break;

                    case T.FENCE:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 2, py + 4, 3, 10);
                        ctx.fillRect(px + 10, py + 4, 3, 10);
                        ctx.fillRect(px, py + 6, ts, 2);
                        ctx.fillRect(px, py + 10, ts, 2);
                        break;

                    case T.FLOWER_RED:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.gMid;
                        ctx.fillRect(px + 7, py + 8, 2, 6);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 5, py + 4, 6, 5);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 7, py + 6, 2, 2);
                        break;

                    case T.FLOWER_YELLOW:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.gMid;
                        ctx.fillRect(px + 7, py + 8, 2, 6);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 5, py + 4, 6, 5);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 7, py + 6, 2, 2);
                        break;

                    case T.SAND:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.light;
                        if ((tx + ty) % 2 === 0) ctx.fillRect(px + 4, py + 8, 6, 3);
                        break;

                    case T.ROCK:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px + 2, py + 4, 12, 10);
                        ctx.fillRect(px + 4, py + 2, 8, 2);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 4, py + 5, 4, 3);
                        break;

                    case T.LEDGE:
                        ctx.fillStyle = P.gLight;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.gMid;
                        ctx.fillRect(px, py + ts - 4, ts, 4);
                        break;

                    case T.SIGN:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 7, py + 8, 2, 8);
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px + 3, py + 3, 10, 7);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 4, py + 4, 8, 5);
                        break;

                    case T.SNOW:
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.light;
                        if ((tx + ty) % 3 === 0) ctx.fillRect(px + 4, py + 6, 6, 4);
                        break;

                    case T.CAVE:
                        ctx.fillStyle = P.darkest;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 2, py + 2, 12, 12);
                        break;

                    case T.BRIDGE:
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px, py + 4, ts, 8);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 2, py + 5, ts - 4, 6);
                        break;

                    case T.MOUNTAIN:
                        ctx.fillStyle = P.light;
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = P.dark;
                        ctx.fillRect(px + 2, py, 12, ts);
                        ctx.fillStyle = P.lightest;
                        ctx.fillRect(px + 4, py, 8, 3);
                        break;
                }
            }
        }
    },

    // ========== NPC DRAWING ==========
    _drawNpcs(ctx, state) {
        const ts = this.tileSize;
        for (const npc of this.npcs) {
            const px = npc.tx * ts;
            const py = npc.ty * ts;
            const P = this.PAL;

            // Check if on screen
            const sx = Math.round(this.cameraSmooth.x);
            const sy = Math.round(this.cameraSmooth.y);
            if (px + ts < sx - ts || px > sx + this.canvas.width + ts) continue;
            if (py + ts < sy - ts || py > sy + this.canvas.height + ts) continue;

            // Draw NPC sprite (simple 16x16 character)
            if (npc.type === 'trainer') {
                this._drawNpcTrainer(ctx, px, py, npc.dir);
            } else {
                this._drawNpcVillager(ctx, px, py, npc.dir);
            }
        }
    },

    _drawNpcVillager(ctx, px, py, dir) {
        const P = this.PAL;
        // Hair/hat
        ctx.fillStyle = P.dark;
        ctx.fillRect(px + 4, py, 8, 5);
        // Face
        ctx.fillStyle = P.lightest;
        ctx.fillRect(px + 4, py + 4, 8, 5);
        // Eyes
        ctx.fillStyle = P.darkest;
        if (dir === 'up') {
            ctx.fillStyle = P.dark;
            ctx.fillRect(px + 4, py + 4, 8, 3);
        } else {
            ctx.fillRect(px + 5, py + 5, 2, 2);
            ctx.fillRect(px + 9, py + 5, 2, 2);
        }
        // Body
        ctx.fillStyle = P.light;
        ctx.fillRect(px + 3, py + 9, 10, 5);
        // Feet
        ctx.fillStyle = P.dark;
        ctx.fillRect(px + 4, py + 14, 3, 2);
        ctx.fillRect(px + 9, py + 14, 3, 2);
    },

    _drawNpcTrainer(ctx, px, py, dir) {
        const P = this.PAL;
        // Cap
        ctx.fillStyle = P.darkest;
        ctx.fillRect(px + 3, py, 10, 4);
        ctx.fillRect(px + 2, py + 3, 12, 2);
        // Face
        ctx.fillStyle = P.lightest;
        ctx.fillRect(px + 4, py + 4, 8, 5);
        // Eyes
        ctx.fillStyle = P.darkest;
        if (dir === 'up') {
            ctx.fillStyle = P.darkest;
            ctx.fillRect(px + 4, py + 4, 8, 3);
        } else {
            ctx.fillRect(px + 5, py + 5, 2, 2);
            ctx.fillRect(px + 9, py + 5, 2, 2);
        }
        // Body
        ctx.fillStyle = P.dark;
        ctx.fillRect(px + 3, py + 9, 10, 5);
        // Belt
        ctx.fillStyle = P.lightest;
        ctx.fillRect(px + 3, py + 11, 10, 1);
        // Feet
        ctx.fillStyle = P.darkest;
        ctx.fillRect(px + 4, py + 14, 3, 2);
        ctx.fillRect(px + 9, py + 14, 3, 2);
    },

    // ========== LOCATION MARKERS ==========
    _drawLocationMarkers(ctx, state) {
        const ts = this.tileSize;
        const P = this.PAL;
        for (const loc of this.locations) {
            const px = loc.x * ts;
            const py = loc.y * ts;
            const result = state.weekResults[loc.week];
            const isNear = state.nearLocation === loc.week;

            if (isNear) {
                const pulse = Math.sin(this.frameCount * 0.08) * 0.3 + 0.5;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = P.lightest;
                ctx.fillRect(px - 18, py - 26, 36, 40);
                ctx.globalAlpha = 1;
            }

            // Label background
            ctx.fillStyle = P.darkest;
            ctx.fillRect(px - 14, py + 14, 28, 10);
            // Week text
            ctx.fillStyle = isNear ? P.lightest : P.light;
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('W' + loc.week, px, py + 22);

            // W/L badge
            if (result) {
                ctx.fillStyle = result.won ? P.gLight : P.dark;
                ctx.fillRect(px + 10, py - 22, 10, 10);
                ctx.fillStyle = result.won ? P.darkest : P.lightest;
                ctx.font = 'bold 7px monospace';
                ctx.fillText(result.won ? 'W' : 'L', px + 15, py - 14);
            }
        }
    },

    // ========== PLAYER SPRITE (Grid-snapped, Gameboy style) ==========
    _drawPlayer(ctx, state) {
        // Player position in pixels (interpolated for smooth movement)
        const px = Math.round(state.playerPixelX || state.playerTX * this.tileSize);
        const py = Math.round(state.playerPixelY || state.playerTY * this.tileSize);
        const dir = state.playerDir;
        const moving = state.isMoving;
        const frame = moving ? (this.animFrame % 4) : 0;
        const P = this.PAL;

        // Shadow
        ctx.fillStyle = P.gMid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(px + 3, py + 13, 10, 3);
        ctx.globalAlpha = 1;

        // Pokemon trainer sprite - Gameboy Color style using our palette
        // Hat
        ctx.fillStyle = P.dark;
        ctx.fillRect(px + 3, py - 2, 10, 4);
        ctx.fillRect(px + 2, py + 1, 12, 2);

        // Face
        ctx.fillStyle = P.lightest;
        ctx.fillRect(px + 4, py + 2, 8, 5);

        // Eyes based on direction
        ctx.fillStyle = P.darkest;
        if (dir === 'up') {
            ctx.fillStyle = P.dark;
            ctx.fillRect(px + 4, py + 2, 8, 3);
        } else if (dir === 'left') {
            ctx.fillRect(px + 4, py + 3, 2, 2);
            ctx.fillRect(px + 7, py + 3, 2, 2);
        } else if (dir === 'right') {
            ctx.fillRect(px + 7, py + 3, 2, 2);
            ctx.fillRect(px + 10, py + 3, 2, 2);
        } else {
            ctx.fillRect(px + 5, py + 3, 2, 2);
            ctx.fillRect(px + 9, py + 3, 2, 2);
        }

        // Body
        ctx.fillStyle = P.dark;
        ctx.fillRect(px + 3, py + 7, 10, 5);

        // Jacket stripe
        ctx.fillStyle = P.darkest;
        ctx.fillRect(px + 7, py + 7, 2, 5);

        // Arms with walk animation
        if (moving && (frame === 1 || frame === 3)) {
            ctx.fillStyle = P.dark;
            ctx.fillRect(px + 1, py + 7, 2, 4);
            ctx.fillRect(px + 13, py + 8, 2, 4);
        } else {
            ctx.fillStyle = P.dark;
            ctx.fillRect(px + 1, py + 8, 2, 4);
            ctx.fillRect(px + 13, py + 8, 2, 4);
        }

        // Legs with walk animation
        ctx.fillStyle = P.light;
        if (moving) {
            if (frame === 0 || frame === 2) {
                ctx.fillRect(px + 4, py + 12, 3, 3);
                ctx.fillRect(px + 9, py + 12, 3, 3);
            } else if (frame === 1) {
                ctx.fillRect(px + 3, py + 12, 3, 3);
                ctx.fillRect(px + 10, py + 12, 3, 2);
            } else {
                ctx.fillRect(px + 4, py + 12, 3, 2);
                ctx.fillRect(px + 9, py + 12, 3, 3);
            }
        } else {
            ctx.fillRect(px + 4, py + 12, 3, 3);
            ctx.fillRect(px + 9, py + 12, 3, 3);
        }

        // Shoes
        ctx.fillStyle = P.darkest;
        if (moving && frame === 1) {
            ctx.fillRect(px + 3, py + 15, 3, 1);
            ctx.fillRect(px + 10, py + 14, 3, 1);
        } else if (moving && frame === 3) {
            ctx.fillRect(px + 4, py + 14, 3, 1);
            ctx.fillRect(px + 9, py + 15, 3, 1);
        } else {
            ctx.fillRect(px + 4, py + 15, 3, 1);
            ctx.fillRect(px + 9, py + 15, 3, 1);
        }
    },

    // ========== TEXT BOX (Pokemon-style bottom of screen) ==========
    _drawTextBox(ctx, textBox, cw, ch) {
        const P = this.PAL;
        const boxH = Math.floor(ch * 0.3);
        const boxY = ch - boxH;
        const pad = 8;

        // Black border, white fill
        ctx.fillStyle = P.darkest;
        ctx.fillRect(0, boxY - 3, cw, boxH + 3);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(2, boxY - 1, cw - 4, boxH - 1);
        // Inner border
        ctx.fillStyle = P.darkest;
        ctx.fillRect(4, boxY + 1, cw - 8, boxH - 5);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(6, boxY + 3, cw - 12, boxH - 9);

        // Text
        ctx.fillStyle = P.darkest;
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';

        const displayText = textBox.displayText || '';
        const lines = displayText.split('\n');
        const lineHeight = 12;
        const maxLines = Math.floor((boxH - 20) / lineHeight);

        for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
            ctx.fillText(lines[i], pad + 6, boxY + 16 + i * lineHeight);
        }

        // Blinking arrow indicator when text is complete
        if (textBox.complete && this.frameCount % 30 < 20) {
            const arrowX = cw - 16;
            const arrowY = ch - 10;
            ctx.fillStyle = P.darkest;
            ctx.fillRect(arrowX, arrowY, 6, 2);
            ctx.fillRect(arrowX + 1, arrowY + 2, 4, 1);
            ctx.fillRect(arrowX + 2, arrowY + 3, 2, 1);
        }
    },

    // ========== LOCATION BANNER ==========
    _drawLocationBanner(ctx, banner, cw, ch) {
        const P = this.PAL;
        const text = banner.text || '';
        const bannerH = 20;
        const bannerY = 20;

        ctx.fillStyle = P.darkest;
        ctx.fillRect(0, bannerY, cw, bannerH);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(2, bannerY + 2, cw - 4, bannerH - 4);
        ctx.fillStyle = P.darkest;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, cw / 2, bannerY + 13);
    },

    // ========== BATTLE SCREEN ==========
    _renderBattle(state) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const P = this.PAL;
        const b = state.battle;
        if (!b) return;

        // White background
        ctx.fillStyle = P.lightest;
        ctx.fillRect(0, 0, cw, ch);

        const battleAreaH = Math.floor(ch * 0.6);
        const textAreaH = ch - battleAreaH;

        // --- Enemy area (top-right) ---
        this._drawBattleEnemy(ctx, b, cw, battleAreaH);

        // --- Player area (bottom-left) ---
        this._drawBattlePlayer(ctx, b, cw, battleAreaH);

        // --- Text box at bottom ---
        this._drawBattleTextBox(ctx, b, cw, ch, textAreaH);

        // --- Move menu (if in move select phase) ---
        if (b.phase === 'move_select') {
            this._drawBattleMoveMenu(ctx, b, cw, ch, textAreaH);
        }
    },

    _drawBattleEnemy(ctx, b, cw, areaH) {
        const P = this.PAL;
        const enemyX = Math.floor(cw * 0.55);
        const enemyY = 12 + Math.round(this.battleAnim.enemyY);

        // Enemy name and HP bar
        const barX = 8;
        const barY = 8;
        const barW = Math.floor(cw * 0.45);

        // Name plate background
        ctx.fillStyle = P.darkest;
        ctx.fillRect(barX, barY, barW, 28);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(barX + 1, barY + 1, barW - 2, 26);

        // Enemy name
        ctx.fillStyle = P.darkest;
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        const eName = (b.enemyName || 'OPPONENT').substring(0, 14).toUpperCase();
        ctx.fillText(eName, barX + 4, barY + 10);

        // HP bar frame
        const hpBarX = barX + 16;
        const hpBarY = barY + 14;
        const hpBarW = barW - 24;
        ctx.fillStyle = P.darkest;
        ctx.fillText('HP:', barX + 4, hpBarY + 7);
        ctx.fillRect(hpBarX, hpBarY, hpBarW, 8);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(hpBarX + 1, hpBarY + 1, hpBarW - 2, 6);

        // HP fill
        const eHpRatio = Math.max(0, (b.enemyHp || 0) / (b.enemyMaxHp || 1));
        const hpColor = eHpRatio > 0.5 ? P.hpGreen : eHpRatio > 0.25 ? P.hpYellow : P.hpRed;
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX + 1, hpBarY + 1, Math.floor((hpBarW - 2) * eHpRatio), 6);

        // Enemy "sprite" (a simple Pokemon-like shape)
        this._drawMonsterSprite(ctx, enemyX, enemyY, b.enemyType || 'normal', false);
    },

    _drawBattlePlayer(ctx, b, cw, areaH) {
        const P = this.PAL;
        const playerX = Math.floor(cw * 0.12);
        const playerY = Math.floor(areaH * 0.45) + Math.round(this.battleAnim.playerY);

        // Player name and HP (bottom-right)
        const barW = Math.floor(cw * 0.48);
        const barX = cw - barW - 8;
        const barY = Math.floor(areaH * 0.55);

        // Name plate
        ctx.fillStyle = P.darkest;
        ctx.fillRect(barX, barY, barW, 36);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(barX + 1, barY + 1, barW - 2, 34);

        // Player team name
        ctx.fillStyle = P.darkest;
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        const pName = (b.playerName || 'YOUR TEAM').substring(0, 14).toUpperCase();
        ctx.fillText(pName, barX + 4, barY + 10);

        // HP bar
        const hpBarX = barX + 16;
        const hpBarY = barY + 14;
        const hpBarW = barW - 24;
        ctx.fillText('HP:', barX + 4, hpBarY + 7);
        ctx.fillStyle = P.darkest;
        ctx.fillRect(hpBarX, hpBarY, hpBarW, 8);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(hpBarX + 1, hpBarY + 1, hpBarW - 2, 6);

        const pHpRatio = Math.max(0, (b.playerHp || 0) / (b.playerMaxHp || 1));
        const hpColor = pHpRatio > 0.5 ? P.hpGreen : pHpRatio > 0.25 ? P.hpYellow : P.hpRed;
        ctx.fillStyle = hpColor;
        ctx.fillRect(hpBarX + 1, hpBarY + 1, Math.floor((hpBarW - 2) * pHpRatio), 6);

        // Score display
        ctx.fillStyle = P.darkest;
        ctx.font = '6px monospace';
        const scoreText = (b.playerHp || 0).toFixed(1) + ' / ' + (b.playerMaxHp || 0).toFixed(1);
        ctx.fillText(scoreText, barX + 4, barY + 32);

        // Player "sprite" (back view, larger)
        this._drawMonsterSprite(ctx, playerX, playerY, b.playerType || 'normal', true);
    },

    /** Draw a simple monster sprite */
    _drawMonsterSprite(ctx, x, y, type, isBack) {
        const P = this.PAL;
        const size = isBack ? 32 : 24;
        const shake = Math.round(this.battleAnim.shake);

        x += shake;

        // Different shapes based on type
        ctx.fillStyle = P.dark;

        if (isBack) {
            // Player's monster (back view) - larger, simpler
            ctx.fillRect(x, y + 4, size, size - 8);
            ctx.fillRect(x + 4, y, size - 8, size);
            // Ears/horns
            ctx.fillRect(x + 4, y - 4, 6, 6);
            ctx.fillRect(x + size - 10, y - 4, 6, 6);
            // Body detail
            ctx.fillStyle = P.light;
            ctx.fillRect(x + 8, y + 8, size - 16, size - 16);
        } else {
            // Enemy monster (front view)
            ctx.fillRect(x, y + 4, size, size - 8);
            ctx.fillRect(x + 4, y, size - 8, size);
            // Eyes
            ctx.fillStyle = P.lightest;
            ctx.fillRect(x + 6, y + 8, 4, 4);
            ctx.fillRect(x + size - 10, y + 8, 4, 4);
            ctx.fillStyle = P.darkest;
            ctx.fillRect(x + 7, y + 9, 2, 2);
            ctx.fillRect(x + size - 9, y + 9, 2, 2);
            // Mouth
            ctx.fillStyle = P.darkest;
            ctx.fillRect(x + 8, y + 16, size - 16, 2);
        }
    },

    _drawBattleTextBox(ctx, b, cw, ch, textH) {
        const P = this.PAL;
        const boxY = ch - textH;

        // Border
        ctx.fillStyle = P.darkest;
        ctx.fillRect(0, boxY, cw, textH);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(2, boxY + 2, cw - 4, textH - 4);
        ctx.fillStyle = P.darkest;
        ctx.fillRect(4, boxY + 4, cw - 8, textH - 8);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(6, boxY + 6, cw - 12, textH - 12);

        // Text
        if (b.displayText) {
            ctx.fillStyle = P.darkest;
            ctx.font = '7px monospace';
            ctx.textAlign = 'left';
            const lines = b.displayText.split('\n');
            for (let i = 0; i < Math.min(lines.length, 3); i++) {
                ctx.fillText(lines[i], 12, boxY + 18 + i * 12);
            }
        }

        // Blinking advance arrow
        if (b.textComplete && b.phase !== 'move_select' && this.frameCount % 30 < 20) {
            ctx.fillStyle = P.darkest;
            const ax = cw - 14;
            const ay = ch - 10;
            ctx.fillRect(ax, ay, 6, 2);
            ctx.fillRect(ax + 1, ay + 2, 4, 1);
            ctx.fillRect(ax + 2, ay + 3, 2, 1);
        }
    },

    _drawBattleMoveMenu(ctx, b, cw, ch, textH) {
        const P = this.PAL;
        const menuW = Math.floor(cw * 0.45);
        const menuH = textH - 8;
        const menuX = cw - menuW - 4;
        const menuY = ch - textH + 4;

        // Menu background
        ctx.fillStyle = P.darkest;
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(menuX + 2, menuY + 2, menuW - 4, menuH - 4);

        // Move options
        const moves = b.moves || [];
        ctx.fillStyle = P.darkest;
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';

        for (let i = 0; i < Math.min(moves.length, 4); i++) {
            const mx = menuX + 14;
            const my = menuY + 12 + i * 12;
            // Selection arrow
            if (i === (b.selectedMove || 0)) {
                ctx.fillRect(menuX + 6, my - 5, 6, 2);
                ctx.fillRect(menuX + 8, my - 6, 2, 4);
            }
            ctx.fillText(moves[i].name.substring(0, 12).toUpperCase(), mx, my);
        }
    },

    // ========== START MENU (rendered on canvas for full GB feel) ==========
    renderStartMenu(state) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const P = this.PAL;

        // First render the overworld behind
        this._renderOverworld(state);

        // Menu panel on right side
        const menuW = Math.floor(cw * 0.4);
        const menuH = Math.floor(ch * 0.6);
        const menuX = cw - menuW - 8;
        const menuY = 8;

        // Double border
        ctx.fillStyle = P.darkest;
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(menuX + 2, menuY + 2, menuW - 4, menuH - 4);
        ctx.fillStyle = P.darkest;
        ctx.fillRect(menuX + 4, menuY + 4, menuW - 8, menuH - 8);
        ctx.fillStyle = P.lightest;
        ctx.fillRect(menuX + 6, menuY + 6, menuW - 12, menuH - 12);

        const items = state.menuItems || [
            { label: 'POKeDEX', desc: 'Season Stats' },
            { label: 'POKeMON', desc: 'Team Roster' },
            { label: 'BAG', desc: 'Week Data' },
            { label: 'MAP', desc: 'Full Map' },
            { label: 'SAVE', desc: '' },
            { label: 'EXIT', desc: '' },
        ];

        ctx.font = '7px monospace';
        ctx.textAlign = 'left';

        for (let i = 0; i < items.length; i++) {
            const ix = menuX + 18;
            const iy = menuY + 20 + i * 14;

            // Selection arrow
            if (i === (state.menuIndex || 0)) {
                ctx.fillStyle = P.darkest;
                ctx.fillRect(menuX + 10, iy - 5, 5, 2);
                ctx.fillRect(menuX + 12, iy - 7, 2, 6);
            }

            ctx.fillStyle = P.darkest;
            ctx.fillText(items[i].label, ix, iy);
        }
    },
};
