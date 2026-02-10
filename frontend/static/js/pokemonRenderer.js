/* ===== POKEMON WORLD RENDERER ===== */
/* Canvas rendering: tile map, sprites, locations, camera -- Pokemon Red/Blue aesthetic */

const PokemonRenderer = {
    canvas: null,
    ctx: null,
    scale: 3,
    tileSize: 16,

    camera: { x: 0, y: 0 },
    cameraSmooth: { x: 0, y: 0 },

    mapWidth: 100,
    mapHeight: 70,

    frameCount: 0,
    animFrame: 0,

    // Tile map (generated procedurally)
    tileMap: null,

    // Tile types
    TILES: {
        GRASS: 0, TALL_GRASS: 1, PATH: 2, WATER: 3,
        TREE: 4, BUILDING: 5, ROOF: 6, FENCE: 7,
        FLOWER_RED: 8, FLOWER_YELLOW: 9, SAND: 10,
        ROCK: 11, LEDGE: 12, SIGN: 13, DOOR: 14,
        DARK_GRASS: 15, SNOW: 16, CAVE: 17, BRIDGE: 18,
        MOUNTAIN: 19
    },

    // 14 Pokemon-themed locations for each week
    locations: [
        { week: 1,  name: 'Pallet Town',       x: 12, y: 55, theme: 'starter',   colors: { primary: '#3bb143', secondary: '#2a8a32', accent: '#8b5a2b' } },
        { week: 2,  name: 'Viridian City',      x: 12, y: 44, theme: 'city',      colors: { primary: '#3bb143', secondary: '#4a9a4a', accent: '#b8860b' } },
        { week: 3,  name: 'Pewter City',        x: 25, y: 36, theme: 'rock',      colors: { primary: '#808080', secondary: '#696969', accent: '#a0522d' } },
        { week: 4,  name: 'Cerulean City',      x: 40, y: 28, theme: 'water',     colors: { primary: '#4169e1', secondary: '#1e90ff', accent: '#00bfff' } },
        { week: 5,  name: 'Vermilion City',     x: 50, y: 40, theme: 'electric',  colors: { primary: '#ffd700', secondary: '#daa520', accent: '#ff8c00' } },
        { week: 6,  name: 'Lavender Town',      x: 62, y: 30, theme: 'ghost',     colors: { primary: '#6a0dad', secondary: '#4b0082', accent: '#9370db' } },
        { week: 7,  name: 'Celadon City',       x: 42, y: 18, theme: 'nature',    colors: { primary: '#228b22', secondary: '#006400', accent: '#98fb98' } },
        { week: 8,  name: 'Fuchsia City',       x: 55, y: 52, theme: 'poison',    colors: { primary: '#ff1493', secondary: '#c71585', accent: '#ff69b4' } },
        { week: 9,  name: 'Saffron City',       x: 50, y: 18, theme: 'psychic',   colors: { primary: '#daa520', secondary: '#b8860b', accent: '#ffd700' } },
        { week: 10, name: 'Cinnabar Island',    x: 20, y: 62, theme: 'fire',      colors: { primary: '#e3350d', secondary: '#b22222', accent: '#ff6347' } },
        { week: 11, name: 'Seafoam Islands',    x: 35, y: 60, theme: 'ice',       colors: { primary: '#87ceeb', secondary: '#add8e6', accent: '#b0e0e6' } },
        { week: 12, name: 'Victory Road',       x: 72, y: 16, theme: 'dark',      colors: { primary: '#2f4f4f', secondary: '#1a1a2e', accent: '#696969' } },
        { week: 13, name: 'Indigo Plateau',     x: 82, y: 10, theme: 'champion',  colors: { primary: '#4b0082', secondary: '#800080', accent: '#daa520' } },
        { week: 14, name: 'Pokemon League',     x: 88, y: 6,  theme: 'league',    colors: { primary: '#e3350d', secondary: '#3b4cca', accent: '#ffcb05' } },
    ],

    // Route connections between locations
    paths: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
        [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]
    ],

    /** Initialize the renderer */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._generateMap();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.scale = Math.max(2, Math.min(4, Math.floor(Math.min(w, h) / 320)));
        this.canvas.width = Math.floor(w / this.scale);
        this.canvas.height = Math.floor(h / this.scale);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.imageSmoothingEnabled = false;
    },

    tileToPixel(tx, ty) {
        return { x: tx * this.tileSize, y: ty * this.tileSize };
    },

    getLocation(week) {
        return this.locations.find(l => l.week === week);
    },

    getLocationCenter(week) {
        const loc = this.getLocation(week);
        if (!loc) return { x: 0, y: 0 };
        return this.tileToPixel(loc.x, loc.y);
    },

    getNearestPathPoint(px, py) {
        let best = null;
        let bestDist = Infinity;
        for (const [ai, bi] of this.paths) {
            const a = this.getLocationCenter(this.locations[ai].week);
            const b = this.getLocationCenter(this.locations[bi].week);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;
            let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const cx = a.x + t * dx;
            const cy = a.y + t * dy;
            const dist = Math.hypot(px - cx, py - cy);
            if (dist < bestDist) { bestDist = dist; best = { x: cx, y: cy, dist }; }
        }
        for (const loc of this.locations) {
            const c = this.tileToPixel(loc.x, loc.y);
            const dist = Math.hypot(px - c.x, py - c.y);
            if (dist < bestDist) { bestDist = dist; best = { x: c.x, y: c.y, dist }; }
        }
        return best;
    },

    getLocationAt(px, py, threshold) {
        threshold = threshold || (this.tileSize * 1.5);
        for (const loc of this.locations) {
            const c = this.tileToPixel(loc.x, loc.y);
            if (Math.hypot(px - c.x, py - c.y) < threshold) return loc.week;
        }
        return null;
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
        this.cameraSmooth.x += (this.camera.x - this.cameraSmooth.x) * 0.12;
        this.cameraSmooth.y += (this.camera.y - this.cameraSmooth.y) * 0.12;
    },

    /** Generate the tile map procedurally */
    _generateMap() {
        const W = this.mapWidth;
        const H = this.mapHeight;
        const T = this.TILES;
        this.tileMap = [];

        // Fill with grass
        for (let y = 0; y < H; y++) {
            this.tileMap[y] = [];
            for (let x = 0; x < W; x++) {
                // Default terrain based on region
                const normalY = y / H;
                const normalX = x / W;

                if (normalY > 0.82 && normalX > 0.2 && normalX < 0.55) {
                    // Ocean area bottom
                    this.tileMap[y][x] = T.WATER;
                } else if (normalY < 0.15 && normalX > 0.65) {
                    // Mountain region top-right
                    this.tileMap[y][x] = ((x + y) % 3 === 0) ? T.MOUNTAIN : T.ROCK;
                } else if (normalY < 0.2 && normalX > 0.55) {
                    // Dark area near Victory Road
                    this.tileMap[y][x] = T.DARK_GRASS;
                } else {
                    // Mix of grass types
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

        // Create town areas around each location
        for (const loc of this.locations) {
            this._buildTown(loc);
        }
    },

    /** Draw a path between two tile coordinates */
    _drawPath(x1, y1, x2, y2, tile) {
        // L-shaped path: horizontal then vertical
        const midX = Math.round((x1 + x2) / 2);
        const T = this.TILES;

        // Draw horizontal segment from x1 to midX at y1
        const startX = Math.min(x1, midX);
        const endX = Math.max(x1, midX);
        for (let x = startX; x <= endX; x++) {
            for (let dy = -1; dy <= 1; dy++) {
                const ty = y1 + dy;
                if (ty >= 0 && ty < this.mapHeight && x >= 0 && x < this.mapWidth) {
                    if (this.tileMap[ty][x] !== T.BUILDING && this.tileMap[ty][x] !== T.ROOF && this.tileMap[ty][x] !== T.DOOR) {
                        this.tileMap[ty][x] = tile;
                    }
                }
            }
        }

        // Draw vertical segment from y1 to y2 at midX
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = midX + dx;
                if (y >= 0 && y < this.mapHeight && tx >= 0 && tx < this.mapWidth) {
                    if (this.tileMap[y][tx] !== T.BUILDING && this.tileMap[y][tx] !== T.ROOF && this.tileMap[y][tx] !== T.DOOR) {
                        this.tileMap[y][tx] = tile;
                    }
                }
            }
        }

        // Draw horizontal segment from midX to x2 at y2
        const startX2 = Math.min(midX, x2);
        const endX2 = Math.max(midX, x2);
        for (let x = startX2; x <= endX2; x++) {
            for (let dy = -1; dy <= 1; dy++) {
                const ty = y2 + dy;
                if (ty >= 0 && ty < this.mapHeight && x >= 0 && x < this.mapWidth) {
                    if (this.tileMap[ty][x] !== T.BUILDING && this.tileMap[ty][x] !== T.ROOF && this.tileMap[ty][x] !== T.DOOR) {
                        this.tileMap[ty][x] = tile;
                    }
                }
            }
        }
    },

    /** Build a town at a location */
    _buildTown(loc) {
        const T = this.TILES;
        const cx = loc.x;
        const cy = loc.y;
        const r = 4; // town radius

        // Clear area around town center
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const tx = cx + dx;
                const ty = cy + dy;
                if (tx >= 0 && tx < this.mapWidth && ty >= 0 && ty < this.mapHeight) {
                    this.tileMap[ty][tx] = T.PATH;
                }
            }
        }

        // Place main building (2x2 with roof)
        this._placeTile(cx - 1, cy - 2, T.ROOF);
        this._placeTile(cx, cy - 2, T.ROOF);
        this._placeTile(cx + 1, cy - 2, T.ROOF);
        this._placeTile(cx - 1, cy - 1, T.BUILDING);
        this._placeTile(cx + 1, cy - 1, T.BUILDING);
        this._placeTile(cx, cy - 1, T.DOOR);

        // Decorations based on theme
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
                // Grand building
                for (let dx = -3; dx <= 3; dx++) {
                    this._placeTile(cx + dx, cy - 3, T.ROOF);
                }
                this._placeTile(cx - 3, cy - 2, T.BUILDING);
                this._placeTile(cx + 3, cy - 2, T.BUILDING);
                this._placeTile(cx - 3, cy - 1, T.BUILDING);
                this._placeTile(cx + 3, cy - 1, T.BUILDING);
                this._placeTile(cx, cy + 2, T.SIGN);
                break;
        }
    },

    _placeTile(x, y, tile) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            this.tileMap[y][x] = tile;
        }
    },

    // ========== MAIN RENDER ==========
    render(state) {
        this.frameCount++;
        if (this.frameCount % 8 === 0) this.animFrame++;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(-Math.round(this.cameraSmooth.x), -Math.round(this.cameraSmooth.y));

        this._drawTiles(ctx, cw, ch);
        this._drawLocationMarkers(ctx, state);
        this._drawPlayer(ctx, state);

        ctx.restore();
    },

    // ========== TILE DRAWING ==========
    _drawTiles(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILES;

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
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        // Subtle grass pattern
                        if ((tx + ty) % 4 === 0) {
                            ctx.fillStyle = '#40a040';
                            ctx.fillRect(px + 2, py + 2, 4, 2);
                        }
                        break;

                    case T.TALL_GRASS:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        // Tall grass blades
                        ctx.fillStyle = '#2a8a2a';
                        const grassAnim = (this.frameCount + tx * 3) % 16 < 8 ? 0 : 1;
                        ctx.fillRect(px + 2 + grassAnim, py + 1, 2, 6);
                        ctx.fillRect(px + 6, py + 2, 2, 5);
                        ctx.fillRect(px + 10 - grassAnim, py + 1, 2, 6);
                        ctx.fillRect(px + 4, py + 8, 2, 5);
                        ctx.fillRect(px + 8, py + 9, 2, 4);
                        ctx.fillRect(px + 12, py + 7, 2, 5);
                        break;

                    case T.DARK_GRASS:
                        ctx.fillStyle = '#2a6a2a';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#1a5a1a';
                        ctx.fillRect(px + 4, py + 4, 4, 4);
                        break;

                    case T.PATH:
                        ctx.fillStyle = '#c8b870';
                        ctx.fillRect(px, py, ts, ts);
                        // Path texture
                        if ((tx + ty) % 3 === 0) {
                            ctx.fillStyle = '#b8a860';
                            ctx.fillRect(px + 2, py + 6, 6, 2);
                        }
                        if ((tx * 3 + ty) % 5 === 0) {
                            ctx.fillStyle = '#d8c880';
                            ctx.fillRect(px + 8, py + 2, 4, 3);
                        }
                        break;

                    case T.WATER:
                        ctx.fillStyle = '#3890f8';
                        ctx.fillRect(px, py, ts, ts);
                        // Animated water waves
                        const waveOff = (this.frameCount + tx * 4 + ty * 7) % 24;
                        ctx.fillStyle = '#58a8ff';
                        if (waveOff < 8) {
                            ctx.fillRect(px + 2, py + 4, 6, 2);
                            ctx.fillRect(px + 10, py + 10, 4, 2);
                        } else if (waveOff < 16) {
                            ctx.fillRect(px + 4, py + 6, 6, 2);
                            ctx.fillRect(px + 8, py + 12, 4, 2);
                        } else {
                            ctx.fillRect(px + 1, py + 8, 5, 2);
                            ctx.fillRect(px + 9, py + 3, 5, 2);
                        }
                        break;

                    case T.TREE:
                        // Ground under tree
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        // Trunk
                        ctx.fillStyle = '#804000';
                        ctx.fillRect(px + 6, py + 10, 4, 6);
                        // Canopy (round)
                        ctx.fillStyle = '#106810';
                        ctx.fillRect(px + 2, py + 2, 12, 10);
                        ctx.fillRect(px + 4, py, 8, 2);
                        // Highlight
                        ctx.fillStyle = '#208820';
                        ctx.fillRect(px + 4, py + 3, 4, 4);
                        break;

                    case T.BUILDING:
                        ctx.fillStyle = '#d0c0a0';
                        ctx.fillRect(px, py, ts, ts);
                        // Window
                        ctx.fillStyle = '#5888c8';
                        ctx.fillRect(px + 4, py + 4, 8, 6);
                        ctx.fillStyle = '#78a8e8';
                        ctx.fillRect(px + 5, py + 5, 3, 2);
                        // Border
                        ctx.fillStyle = '#a09070';
                        ctx.fillRect(px, py, ts, 1);
                        ctx.fillRect(px, py, 1, ts);
                        ctx.fillRect(px + ts - 1, py, 1, ts);
                        break;

                    case T.ROOF:
                        ctx.fillStyle = '#e03020';
                        ctx.fillRect(px, py, ts, ts);
                        // Roof pattern
                        ctx.fillStyle = '#c02818';
                        ctx.fillRect(px, py + ts - 3, ts, 3);
                        ctx.fillStyle = '#f04030';
                        ctx.fillRect(px + 2, py + 2, ts - 4, 3);
                        break;

                    case T.DOOR:
                        // Wall behind door
                        ctx.fillStyle = '#d0c0a0';
                        ctx.fillRect(px, py, ts, ts);
                        // Door
                        ctx.fillStyle = '#604020';
                        ctx.fillRect(px + 3, py + 2, 10, 14);
                        ctx.fillStyle = '#704830';
                        ctx.fillRect(px + 4, py + 3, 8, 12);
                        // Doorknob
                        ctx.fillStyle = '#ffd700';
                        ctx.fillRect(px + 10, py + 9, 2, 2);
                        break;

                    case T.FENCE:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        // Fence posts
                        ctx.fillStyle = '#c0a060';
                        ctx.fillRect(px + 2, py + 4, 3, 10);
                        ctx.fillRect(px + 10, py + 4, 3, 10);
                        // Rail
                        ctx.fillRect(px, py + 6, ts, 2);
                        ctx.fillRect(px, py + 10, ts, 2);
                        break;

                    case T.FLOWER_RED:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        // Stem
                        ctx.fillStyle = '#208020';
                        ctx.fillRect(px + 7, py + 8, 2, 6);
                        // Flower
                        ctx.fillStyle = '#e03020';
                        ctx.fillRect(px + 5, py + 4, 6, 5);
                        ctx.fillStyle = '#ffcb05';
                        ctx.fillRect(px + 7, py + 6, 2, 2);
                        break;

                    case T.FLOWER_YELLOW:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#208020';
                        ctx.fillRect(px + 7, py + 8, 2, 6);
                        ctx.fillStyle = '#ffd700';
                        ctx.fillRect(px + 5, py + 4, 6, 5);
                        ctx.fillStyle = '#e03020';
                        ctx.fillRect(px + 7, py + 6, 2, 2);
                        break;

                    case T.SAND:
                        ctx.fillStyle = '#e8d8a0';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#d8c890';
                        if ((tx + ty) % 2 === 0) ctx.fillRect(px + 4, py + 8, 6, 3);
                        break;

                    case T.ROCK:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#808080';
                        ctx.fillRect(px + 2, py + 4, 12, 10);
                        ctx.fillRect(px + 4, py + 2, 8, 2);
                        ctx.fillStyle = '#a0a0a0';
                        ctx.fillRect(px + 4, py + 5, 4, 3);
                        break;

                    case T.LEDGE:
                        ctx.fillStyle = '#48a848';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#306830';
                        ctx.fillRect(px, py + ts - 4, ts, 4);
                        break;

                    case T.SIGN:
                        ctx.fillStyle = '#c8b870';
                        ctx.fillRect(px, py, ts, ts);
                        // Sign post
                        ctx.fillStyle = '#804000';
                        ctx.fillRect(px + 7, py + 8, 2, 8);
                        // Sign board
                        ctx.fillStyle = '#c0a060';
                        ctx.fillRect(px + 3, py + 3, 10, 7);
                        ctx.fillStyle = '#a08040';
                        ctx.fillRect(px + 4, py + 4, 8, 5);
                        break;

                    case T.SNOW:
                        ctx.fillStyle = '#e8e8f0';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#d0d0e0';
                        if ((tx + ty) % 3 === 0) ctx.fillRect(px + 4, py + 6, 6, 4);
                        break;

                    case T.CAVE:
                        ctx.fillStyle = '#383838';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#282828';
                        ctx.fillRect(px + 2, py + 2, 12, 12);
                        ctx.fillStyle = '#181818';
                        ctx.fillRect(px + 4, py + 4, 8, 8);
                        break;

                    case T.BRIDGE:
                        ctx.fillStyle = '#3890f8';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#906030';
                        ctx.fillRect(px, py + 4, ts, 8);
                        ctx.fillStyle = '#a07040';
                        ctx.fillRect(px + 2, py + 5, ts - 4, 6);
                        break;

                    case T.MOUNTAIN:
                        ctx.fillStyle = '#606060';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.fillStyle = '#505050';
                        ctx.fillRect(px + 2, py, 12, ts);
                        ctx.fillStyle = '#707070';
                        ctx.fillRect(px + 4, py + 2, 4, 4);
                        // Snow cap
                        ctx.fillStyle = '#e0e0e0';
                        ctx.fillRect(px + 4, py, 8, 3);
                        break;
                }
            }
        }
    },

    // ========== LOCATION MARKERS ==========
    _drawLocationMarkers(ctx, state) {
        const ts = this.tileSize;
        for (const loc of this.locations) {
            const px = loc.x * ts;
            const py = loc.y * ts;
            const result = state.weekResults[loc.week];
            const isNear = state.nearLocation === loc.week;

            // Glow when near
            if (isNear) {
                const pulse = Math.sin(this.frameCount * 0.08) * 0.2 + 0.4;
                ctx.fillStyle = 'rgba(255, 203, 5, ' + pulse + ')';
                ctx.fillRect(px - 18, py - 26, 36, 40);
            }

            // Label background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(px - 12, py + 12, 24, 10);
            // Week number
            ctx.fillStyle = isNear ? '#ffcb05' : '#ffffff';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('W' + loc.week, px, py + 20);

            // W/L badge
            if (result) {
                const c = result.won ? '#3bb143' : '#e3350d';
                const t = result.won ? 'W' : 'L';
                ctx.fillStyle = c;
                ctx.fillRect(px + 10, py - 22, 10, 10);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px monospace';
                ctx.fillText(t, px + 15, py - 14);
            }
        }
    },

    // ========== PLAYER SPRITE ==========
    _drawPlayer(ctx, state) {
        const px = Math.round(state.playerX);
        const py = Math.round(state.playerY);
        const dir = state.playerDir;
        const moving = state.isMoving;
        const frame = moving ? (this.animFrame % 4) : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 5, 10, 3);

        // Pokemon trainer sprite (Red-style, ~16x20 pixels)

        // Hat
        ctx.fillStyle = '#e3350d';
        ctx.fillRect(px - 6, py - 18, 12, 5);
        ctx.fillRect(px - 4, py - 20, 8, 3);
        // Hat brim
        ctx.fillStyle = '#b22222';
        ctx.fillRect(px - 7, py - 13, 14, 2);

        // Face/head
        ctx.fillStyle = '#ffdcb0';
        ctx.fillRect(px - 5, py - 13, 10, 7);

        // Eyes
        ctx.fillStyle = '#000';
        if (dir === 'left') {
            ctx.fillRect(px - 4, py - 11, 2, 2);
            ctx.fillRect(px - 1, py - 11, 2, 2);
        } else if (dir === 'right') {
            ctx.fillRect(px, py - 11, 2, 2);
            ctx.fillRect(px + 3, py - 11, 2, 2);
        } else if (dir === 'up') {
            // Back of head - no eyes
            ctx.fillStyle = '#e3350d';
            ctx.fillRect(px - 5, py - 13, 10, 4);
        } else {
            // Down - normal
            ctx.fillRect(px - 3, py - 11, 2, 2);
            ctx.fillRect(px + 2, py - 11, 2, 2);
        }

        // Body / jacket
        ctx.fillStyle = '#e3350d';
        ctx.fillRect(px - 5, py - 6, 10, 8);
        // Jacket detail
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(px - 1, py - 6, 2, 8);

        // Arms
        ctx.fillStyle = '#e3350d';
        if (moving) {
            const armOff = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 7, py - 4 + Math.round(armOff), 2, 5);
            ctx.fillRect(px + 5, py - 4 - Math.round(armOff), 2, 5);
        } else {
            ctx.fillRect(px - 7, py - 4, 2, 5);
            ctx.fillRect(px + 5, py - 4, 2, 5);
        }

        // Hands
        ctx.fillStyle = '#ffdcb0';
        if (moving) {
            const hOff = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 7, py + 1 + Math.round(hOff), 2, 2);
            ctx.fillRect(px + 5, py + 1 - Math.round(hOff), 2, 2);
        } else {
            ctx.fillRect(px - 7, py + 1, 2, 2);
            ctx.fillRect(px + 5, py + 1, 2, 2);
        }

        // Legs / jeans
        ctx.fillStyle = '#3b4cca';
        if (moving) {
            const legOff = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 4, py + 2, 3, 5 + Math.round(legOff));
            ctx.fillRect(px + 1, py + 2, 3, 5 - Math.round(legOff));
        } else {
            ctx.fillRect(px - 4, py + 2, 3, 5);
            ctx.fillRect(px + 1, py + 2, 3, 5);
        }

        // Shoes
        ctx.fillStyle = '#1a1a1a';
        if (moving) {
            const sOff = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 5, py + 6 + Math.round(sOff), 4, 2);
            ctx.fillRect(px + 1, py + 6 - Math.round(sOff), 4, 2);
        } else {
            ctx.fillRect(px - 5, py + 6, 4, 2);
            ctx.fillRect(px + 1, py + 6, 4, 2);
        }
    }
};
