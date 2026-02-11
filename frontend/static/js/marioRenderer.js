/* ===== MARIO WORLD RENDERER ===== */
/* Island hub world inspired by Mario Super Sluggers */
/* Handles: tile map, collision, sprites, NPCs, animations, camera */

const MarioRenderer = {
    canvas: null,
    ctx: null,
    scale: 3,
    tileSize: 16,

    // Camera
    camera: { x: 0, y: 0 },
    cameraSmooth: { x: 0, y: 0 },

    // Map dimensions (in tiles)
    mapWidth: 100,
    mapHeight: 70,

    // Animation counters
    frameCount: 0,
    animFrame: 0,

    // Tile types
    TILE: {
        DEEP_WATER: 0,
        WATER: 1,
        SAND: 2,
        GRASS: 3,
        DARK_GRASS: 4,
        PATH: 5,
        BRIDGE: 6,
        STONE: 7,
        LAVA: 8,
        SNOW: 9,
        DIRT: 10,
        FLOWER_GRASS: 11,
    },

    // Collision map: 0 = blocked, 1 = walkable
    collisionMap: null,
    // Tile map: stores tile type for rendering
    tileMap: null,

    // Cloud positions (parallax layer)
    clouds: [],

    // Particle system
    particles: [],

    // Ambient creatures
    butterflies: [],
    dandelionSeeds: [],

    // Parallax mountain silhouettes
    mountains: [],

    // Location definitions -- island layout with 14 themed week locations
    locations: [
        { week: 1,  name: 'Mushroom Village',    x: 50, y: 48, theme: 'village',     colors: { primary: '#43b047', secondary: '#2d8031', accent: '#8b4513', bg: '#1a5c1a' } },
        { week: 2,  name: 'Koopa Beach',          x: 70, y: 52, theme: 'beach',       colors: { primary: '#049cd8', secondary: '#0370a0', accent: '#fbd000', bg: '#c2b280' } },
        { week: 3,  name: 'Piranha Plains',        x: 80, y: 42, theme: 'plains',      colors: { primary: '#43b047', secondary: '#e52521', accent: '#2d8031', bg: '#3a7a20' } },
        { week: 4,  name: "Boo's Haunted House",   x: 78, y: 30, theme: 'haunted',     colors: { primary: '#6b4c9a', secondary: '#4a2d6e', accent: '#aaaaaa', bg: '#2a1a3e' } },
        { week: 5,  name: 'Chain Chomp Canyon',    x: 68, y: 22, theme: 'canyon',      colors: { primary: '#8b6914', secondary: '#6b4914', accent: '#555555', bg: '#5a4a2a' } },
        { week: 6,  name: 'Shy Guy Falls',         x: 55, y: 16, theme: 'waterfall',   colors: { primary: '#049cd8', secondary: '#ffffff', accent: '#e52521', bg: '#1a4a6a' } },
        { week: 7,  name: 'Bob-omb Battlefield',   x: 42, y: 14, theme: 'battlefield', colors: { primary: '#2d5a1a', secondary: '#4a7a2a', accent: '#e52521', bg: '#1a3a0a' } },
        { week: 8,  name: 'Lakitu Cloud Palace',   x: 30, y: 18, theme: 'cloud',       colors: { primary: '#87ceeb', secondary: '#ffffff', accent: '#fbd000', bg: '#4a8ab5' } },
        { week: 9,  name: 'Dry Bones Desert',      x: 20, y: 26, theme: 'desert',      colors: { primary: '#d4a84b', secondary: '#c29836', accent: '#e8d8a0', bg: '#9a7a3a' } },
        { week: 10, name: 'Thwomp Fortress',       x: 18, y: 38, theme: 'fortress',    colors: { primary: '#555555', secondary: '#333333', accent: '#888888', bg: '#2a2a2a' } },
        { week: 11, name: "Luigi's Mansion",        x: 24, y: 48, theme: 'mansion',     colors: { primary: '#43b047', secondary: '#6b4c9a', accent: '#fbd000', bg: '#1a2a1a' } },
        { week: 12, name: "Peach's Garden",         x: 36, y: 54, theme: 'garden',      colors: { primary: '#ff69b4', secondary: '#fbd000', accent: '#43b047', bg: '#2a4a2a' } },
        { week: 13, name: "Wario's Gold Mine",      x: 40, y: 38, theme: 'mine',        colors: { primary: '#fbd000', secondary: '#8b6914', accent: '#d4a84b', bg: '#3a2a0a' } },
        { week: 14, name: "Bowser's Castle",         x: 55, y: 32, theme: 'castle',      colors: { primary: '#e52521', secondary: '#1a1a1a', accent: '#ff6600', bg: '#2a0a0a' } },
    ],

    // NPC definitions -- Mario characters placed at specific locations
    npcs: [
        { name: 'Mario',    x: 48, y: 50, character: 'mario' },
        { name: 'Luigi',    x: 23, y: 46, character: 'luigi' },
        { name: 'Peach',    x: 34, y: 56, character: 'peach' },
        { name: 'Toadette', x: 52, y: 46, character: 'toadette' },
        { name: 'Yoshi',    x: 72, y: 50, character: 'yoshi' },
        { name: 'DK',       x: 82, y: 40, character: 'dk' },
        { name: 'Bowser',   x: 57, y: 30, character: 'bowser' },
        { name: 'Wario',    x: 38, y: 36, character: 'wario' },
    ],

    // ==================== INITIALIZATION ====================

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this._generateMap();
        this._generateClouds();
        this._generateMountains();
        this._generateButterflies();
        this._generateDandelionSeeds();
        this.particles = [];
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

    // ==================== MAP GENERATION ====================

    _generateMap() {
        const W = this.mapWidth;
        const H = this.mapHeight;
        const T = this.TILE;

        // Initialize with deep water
        this.tileMap = Array.from({ length: H }, () => new Uint8Array(W).fill(T.DEEP_WATER));
        this.collisionMap = Array.from({ length: H }, () => new Uint8Array(W).fill(0));

        // Step 1: Create island shape using distance from center + noise
        const cx = W / 2;
        const cy = H / 2;
        const maxR = Math.min(W, H) * 0.42;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const dx = (x - cx) / (W * 0.5);
                const dy = (y - cy) / (H * 0.5);
                // Elliptical distance, slightly wider than tall
                const dist = Math.sqrt(dx * dx * 0.85 + dy * dy * 1.1);
                // Add some noise for organic coastline
                const noise = this._noise(x * 0.08, y * 0.08) * 0.18
                            + this._noise(x * 0.15, y * 0.15) * 0.08;
                const threshold = 0.78 + noise;

                if (dist < threshold - 0.12) {
                    this.tileMap[y][x] = T.GRASS;
                    this.collisionMap[y][x] = 1;
                } else if (dist < threshold - 0.04) {
                    this.tileMap[y][x] = T.SAND;
                    this.collisionMap[y][x] = 1;
                } else if (dist < threshold) {
                    this.tileMap[y][x] = T.WATER;
                } else {
                    this.tileMap[y][x] = T.DEEP_WATER;
                }
            }
        }

        // Step 2: Themed biome patches around each location
        for (const loc of this.locations) {
            const r = 5; // biome radius in tiles
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const tx = loc.x + dx;
                    const ty = loc.y + dy;
                    if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d > r) continue;

                    // Only modify if already land
                    if (this.collisionMap[ty][tx] === 0 && this.tileMap[ty][tx] !== T.SAND) continue;

                    switch (loc.theme) {
                        case 'desert':
                            this.tileMap[ty][tx] = T.SAND;
                            this.collisionMap[ty][tx] = 1;
                            break;
                        case 'canyon':
                            this.tileMap[ty][tx] = T.DIRT;
                            this.collisionMap[ty][tx] = 1;
                            break;
                        case 'haunted':
                        case 'mansion':
                            this.tileMap[ty][tx] = T.DARK_GRASS;
                            this.collisionMap[ty][tx] = 1;
                            break;
                        case 'fortress':
                            if (d < 3) { this.tileMap[ty][tx] = T.STONE; this.collisionMap[ty][tx] = 1; }
                            else { this.tileMap[ty][tx] = T.DARK_GRASS; this.collisionMap[ty][tx] = 1; }
                            break;
                        case 'castle':
                            if (d < 3) { this.tileMap[ty][tx] = T.STONE; this.collisionMap[ty][tx] = 1; }
                            else { this.tileMap[ty][tx] = T.DARK_GRASS; this.collisionMap[ty][tx] = 1; }
                            break;
                        case 'cloud':
                            this.tileMap[ty][tx] = T.GRASS;
                            this.collisionMap[ty][tx] = 1;
                            break;
                        case 'garden':
                            this.tileMap[ty][tx] = T.FLOWER_GRASS;
                            this.collisionMap[ty][tx] = 1;
                            break;
                        case 'waterfall':
                            if (d < 2) { this.tileMap[ty][tx] = T.STONE; this.collisionMap[ty][tx] = 1; }
                            break;
                        case 'mine':
                            this.tileMap[ty][tx] = T.DIRT;
                            this.collisionMap[ty][tx] = 1;
                            break;
                    }
                }
            }
        }

        // Step 3: Carve paths between locations (walkable dirt/path tiles)
        const pathPairs = [
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
            [7, 8], [8, 9], [9, 10], [10, 11], [11, 0],
            [0, 12], [12, 13], [13, 5], // cross-island shortcuts
        ];
        for (const [ai, bi] of pathPairs) {
            const a = this.locations[ai];
            const b = this.locations[bi];
            this._carvePath(a.x, a.y, b.x, b.y, T.PATH);
        }

        // Step 4: Place trees/rocks as blocking obstacles (but not on paths/locations)
        this._placeDecorations();

        // Step 5: Ensure all location centers are walkable (3x3 clear area)
        for (const loc of this.locations) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const tx = loc.x + dx;
                    const ty = loc.y + dy;
                    if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
                        this.collisionMap[ty][tx] = 1;
                        if (this.tileMap[ty][tx] === T.DEEP_WATER || this.tileMap[ty][tx] === T.WATER) {
                            this.tileMap[ty][tx] = T.GRASS;
                        }
                    }
                }
            }
        }

        // Ensure NPC positions are walkable
        for (const npc of this.npcs) {
            if (npc.x >= 0 && npc.x < W && npc.y >= 0 && npc.y < H) {
                this.collisionMap[npc.y][npc.x] = 1;
            }
        }
    },

    /** Carve a walkable path between two tile positions */
    _carvePath(x0, y0, x1, y1, tileType) {
        // Bresenham-like stepping with some width
        let cx = x0, cy = y0;
        const W = this.mapWidth, H = this.mapHeight;
        const maxSteps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 3;
        for (let i = 0; i < maxSteps; i++) {
            // Step toward target
            const dx = x1 - cx, dy = y1 - cy;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) break;
            if (Math.abs(dx) > Math.abs(dy)) {
                cx += dx > 0 ? 1 : -1;
            } else {
                cy += dy > 0 ? 1 : -1;
            }
            // Paint 2-tile wide path
            for (let pw = -1; pw <= 1; pw++) {
                for (let ph = -1; ph <= 1; ph++) {
                    const tx = Math.round(cx) + pw;
                    const ty = Math.round(cy) + ph;
                    if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
                        if (this.tileMap[ty][tx] === this.TILE.DEEP_WATER || this.tileMap[ty][tx] === this.TILE.WATER) {
                            this.tileMap[ty][tx] = this.TILE.BRIDGE;
                        } else if (this.tileMap[ty][tx] !== this.TILE.BRIDGE) {
                            this.tileMap[ty][tx] = tileType;
                        }
                        this.collisionMap[ty][tx] = 1;
                    }
                }
            }
        }
    },

    /** Place decorative trees and rocks that block movement */
    _placeDecorations() {
        const W = this.mapWidth, H = this.mapHeight;
        const T = this.TILE;
        // Use deterministic pseudo-random
        for (let i = 0; i < 350; i++) {
            const hash = (i * 9973 + 4231);
            const tx = hash % W;
            const ty = (Math.floor(hash / W) + (i * 37)) % H;
            if (tx < 2 || tx >= W - 2 || ty < 2 || ty >= H - 2) continue;

            // Only place on grass/dark_grass tiles
            const tile = this.tileMap[ty][tx];
            if (tile !== T.GRASS && tile !== T.DARK_GRASS && tile !== T.FLOWER_GRASS) continue;

            // Skip if too close to any location center (radius 4)
            let tooClose = false;
            for (const loc of this.locations) {
                if (Math.abs(tx - loc.x) < 4 && Math.abs(ty - loc.y) < 4) {
                    tooClose = true; break;
                }
            }
            if (tooClose) continue;

            // Skip if on a path
            if (tile === T.PATH || tile === T.BRIDGE) continue;

            // Mark as blocking tree/rock (we'll render them, collision blocks)
            // We don't change the tile type; we store tree positions separately
            // Instead, just mark collision as blocked for bigger trees
            if (i % 3 === 0) {
                // Blocking tree cluster
                this.collisionMap[ty][tx] = 0;
            }
        }
    },

    /** Simple value noise function (deterministic) */
    _noise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const a = this._hash2d(ix, iy);
        const b = this._hash2d(ix + 1, iy);
        const c = this._hash2d(ix, iy + 1);
        const d = this._hash2d(ix + 1, iy + 1);
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    },

    _hash2d(x, y) {
        let n = x * 374761393 + y * 668265263;
        n = (n ^ (n >> 13)) * 1274126177;
        return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
    },

    _generateClouds() {
        this.clouds = [];
        for (let i = 0; i < 15; i++) {
            this.clouds.push({
                x: (i * 9973 + 123) % (this.mapWidth * this.tileSize),
                y: (i * 3571 + 456) % (this.mapHeight * this.tileSize * 0.3),
                w: 30 + (i * 17 % 40),
                speed: 0.15 + (i % 5) * 0.05,
            });
        }
    },

    _generateMountains() {
        this.mountains = [];
        const totalW = this.mapWidth * this.tileSize;
        for (let i = 0; i < 12; i++) {
            this.mountains.push({
                x: (i * totalW / 12) + ((i * 7919) % 80) - 40,
                width: 60 + (i * 31) % 50,
                height: 20 + (i * 17) % 25,
                shade: 0.12 + ((i * 13) % 10) * 0.01,
            });
        }
    },

    _generateButterflies() {
        this.butterflies = [];
        for (let i = 0; i < 5; i++) {
            this.butterflies.push({
                x: (i * 3571 + 500) % (this.mapWidth * this.tileSize),
                y: (i * 2347 + 200) % (this.mapHeight * this.tileSize * 0.6) + 100,
                vx: (Math.sin(i * 1.7) * 0.3),
                vy: (Math.cos(i * 2.3) * 0.2),
                wingPhase: i * 1.2,
                color: ['#FF69B4', '#FBD000', '#87CEEB', '#FF6E40', '#E040FB'][i],
                timer: 0,
                changeDir: 60 + (i * 37) % 120,
            });
        }
    },

    _generateDandelionSeeds() {
        this.dandelionSeeds = [];
        for (let i = 0; i < 8; i++) {
            this.dandelionSeeds.push({
                x: (i * 4231 + 300) % (this.mapWidth * this.tileSize),
                y: (i * 1973 + 100) % (this.mapHeight * this.tileSize * 0.5) + 50,
                drift: 0.1 + (i % 4) * 0.05,
                sway: i * 0.8,
                alpha: 0.4 + (i % 3) * 0.15,
            });
        }
    },

    // ==================== PARTICLE SYSTEM ====================

    emitDust(px, py, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'dust',
                x: px + (Math.random() - 0.5) * 6,
                y: py + Math.random() * 2,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 0.5 - 0.2,
                life: 18 + Math.random() * 12,
                maxLife: 18 + Math.random() * 12,
                size: 2 + Math.random() * 2,
            });
        }
    },

    emitSparkle(px, py) {
        this.particles.push({
            type: 'sparkle',
            x: px + (Math.random() - 0.5) * 20,
            y: py + (Math.random() - 0.5) * 20 - 10,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.4 - 0.1,
            life: 30 + Math.random() * 20,
            maxLife: 30 + Math.random() * 20,
            size: 1 + Math.random(),
        });
    },

    emitLeaf(px, py) {
        this.particles.push({
            type: 'leaf',
            x: px + (Math.random() - 0.5) * 10,
            y: py - 10 - Math.random() * 8,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.2 + Math.random() * 0.3,
            life: 80 + Math.random() * 60,
            maxLife: 80 + Math.random() * 60,
            size: 2 + Math.random(),
            sway: Math.random() * Math.PI * 2,
        });
    },

    emitWaterRipple(px, py) {
        this.particles.push({
            type: 'ripple',
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            life: 40 + Math.random() * 20,
            maxLife: 40 + Math.random() * 20,
            size: 1,
            maxSize: 6 + Math.random() * 4,
        });
    },

    _updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.x += p.vx;
            p.y += p.vy;
            if (p.type === 'leaf') { p.x += Math.sin(p.sway + this.frameCount * 0.05) * 0.3; }
            if (p.type === 'ripple') { p.size = p.maxSize * (1 - p.life / p.maxLife); }
        }
        // Cap particle count
        if (this.particles.length > 200) { this.particles.splice(0, this.particles.length - 200); }
    },

    _drawParticles(ctx) {
        for (const p of this.particles) {
            const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
            switch (p.type) {
                case 'dust':
                    ctx.fillStyle = `rgba(200, 180, 140, ${alpha * 0.6})`;
                    ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.round(p.size), Math.round(p.size));
                    break;
                case 'sparkle':
                    const sparkAlpha = Math.sin(p.life * 0.3) * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255, 250, 200, ${alpha * sparkAlpha * 0.8})`;
                    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size));
                    ctx.fillRect(Math.round(p.x - 1), Math.round(p.y + 1), Math.round(p.size + 2), 1);
                    ctx.fillRect(Math.round(p.x + 1), Math.round(p.y - 1), 1, Math.round(p.size + 2));
                    break;
                case 'leaf':
                    const lAlpha = alpha * 0.7;
                    ctx.fillStyle = `rgba(80, 160, 60, ${lAlpha})`;
                    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size * 0.6));
                    break;
                case 'ripple':
                    const rAlpha = alpha * 0.35;
                    ctx.strokeStyle = `rgba(180, 220, 255, ${rAlpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(Math.round(p.x), Math.round(p.y), Math.round(p.size), 0, Math.PI * 2);
                    ctx.stroke();
                    break;
            }
        }
    },

    // ==================== AMBIENT CREATURES ====================

    _updateButterflies() {
        for (const b of this.butterflies) {
            b.timer++;
            b.wingPhase += 0.2;
            if (b.timer >= b.changeDir) {
                b.timer = 0;
                b.vx = (Math.random() - 0.5) * 0.6;
                b.vy = (Math.random() - 0.5) * 0.4;
                b.changeDir = 60 + Math.random() * 120;
            }
            b.x += b.vx + Math.sin(this.frameCount * 0.02 + b.wingPhase) * 0.15;
            b.y += b.vy + Math.cos(this.frameCount * 0.015 + b.wingPhase) * 0.1;
            // Keep within map bounds
            const mw = this.mapWidth * this.tileSize;
            const mh = this.mapHeight * this.tileSize;
            if (b.x < 0) b.x = mw;
            if (b.x > mw) b.x = 0;
            if (b.y < 40) b.y = 40;
            if (b.y > mh * 0.7) b.y = mh * 0.3;
        }
    },

    _drawButterflies(ctx) {
        for (const b of this.butterflies) {
            const wingSpread = Math.sin(b.wingPhase) * 2.5;
            ctx.fillStyle = b.color;
            // Left wing
            ctx.fillRect(Math.round(b.x - 2 - Math.abs(wingSpread)), Math.round(b.y - 1), Math.round(Math.abs(wingSpread) + 1), 2);
            // Right wing
            ctx.fillRect(Math.round(b.x + 1), Math.round(b.y - 1), Math.round(Math.abs(wingSpread) + 1), 2);
            // Body
            ctx.fillStyle = 'rgba(40, 30, 20, 0.8)';
            ctx.fillRect(Math.round(b.x), Math.round(b.y - 1), 1, 3);
        }
    },

    _updateDandelionSeeds() {
        const mw = this.mapWidth * this.tileSize;
        const mh = this.mapHeight * this.tileSize;
        for (const d of this.dandelionSeeds) {
            d.x += d.drift;
            d.y += Math.sin(d.sway + this.frameCount * 0.02) * 0.15 - 0.03;
            d.sway += 0.01;
            if (d.x > mw + 20) d.x = -10;
            if (d.y < 10) d.y = mh * 0.3;
        }
    },

    _drawDandelionSeeds(ctx) {
        for (const d of this.dandelionSeeds) {
            ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha})`;
            ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
            // Tiny wispy lines
            ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.5})`;
            ctx.fillRect(Math.round(d.x - 1), Math.round(d.y - 1), 1, 1);
            ctx.fillRect(Math.round(d.x + 1), Math.round(d.y - 1), 1, 1);
            ctx.fillRect(Math.round(d.x), Math.round(d.y - 2), 1, 1);
        }
    },

    // ==================== AMBIENT PARTICLE SPAWNING ====================

    _spawnAmbientParticles() {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const ts = this.tileSize;

        // Sparkles near location buildings (every ~30 frames, randomly)
        if (this.frameCount % 30 === 0) {
            for (const loc of this.locations) {
                const px = loc.x * ts;
                const py = loc.y * ts;
                if (px > sx - 40 && px < sx + cw + 40 && py > sy - 40 && py < sy + ch + 40) {
                    this.emitSparkle(px, py);
                }
            }
        }

        // Leaves from blocked tree tiles (every ~45 frames)
        if (this.frameCount % 45 === 0) {
            const startTX = Math.max(0, Math.floor(sx / ts) - 1);
            const startTY = Math.max(0, Math.floor(sy / ts) - 2);
            const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts) + 1);
            const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts) + 1);
            // Pick a random visible tile to check
            const rx = startTX + Math.floor(Math.random() * (endTX - startTX));
            const ry = startTY + Math.floor(Math.random() * (endTY - startTY));
            if (rx >= 0 && rx < this.mapWidth && ry >= 0 && ry < this.mapHeight) {
                const tile = this.tileMap[ry][rx];
                if (this.collisionMap[ry][rx] === 0 && (tile === this.TILE.GRASS || tile === this.TILE.DARK_GRASS)) {
                    this.emitLeaf(rx * ts + 8, ry * ts);
                }
            }
        }

        // Water ripples near shore (every ~40 frames)
        if (this.frameCount % 40 === 0) {
            const startTX = Math.max(0, Math.floor(sx / ts));
            const startTY = Math.max(0, Math.floor(sy / ts));
            const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts));
            const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts));
            for (let attempt = 0; attempt < 3; attempt++) {
                const rx = startTX + Math.floor(Math.random() * (endTX - startTX));
                const ry = startTY + Math.floor(Math.random() * (endTY - startTY));
                if (rx >= 1 && rx < this.mapWidth - 1 && ry >= 1 && ry < this.mapHeight - 1) {
                    if (this.tileMap[ry][rx] === this.TILE.WATER) {
                        // Check if near land (shore tile)
                        const hasLand = this.tileMap[ry-1][rx] >= this.TILE.SAND || this.tileMap[ry+1][rx] >= this.TILE.SAND ||
                                        this.tileMap[ry][rx-1] >= this.TILE.SAND || this.tileMap[ry][rx+1] >= this.TILE.SAND;
                        if (hasLand) {
                            this.emitWaterRipple(rx * ts + 8, ry * ts + 8);
                            break;
                        }
                    }
                }
            }
        }
    },

    // ==================== PUBLIC API ====================

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

    getLocationAt(px, py, threshold) {
        threshold = threshold || (this.tileSize * 1.8);
        for (const loc of this.locations) {
            const c = this.tileToPixel(loc.x, loc.y);
            if (Math.hypot(px - c.x, py - c.y) < threshold) {
                return loc.week;
            }
        }
        return null;
    },

    /** Check if a pixel position is walkable */
    isWalkable(px, py) {
        const tx = Math.floor(px / this.tileSize);
        const ty = Math.floor(py / this.tileSize);
        if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) return false;
        return this.collisionMap[ty][tx] === 1;
    },

    /** Check walkability with a small bounding box (player hitbox) */
    isWalkableRect(px, py, hw, hh) {
        // Check 4 corners of bounding box
        return this.isWalkable(px - hw, py - hh)
            && this.isWalkable(px + hw, py - hh)
            && this.isWalkable(px - hw, py + hh)
            && this.isWalkable(px + hw, py + hh);
    },

    // ==================== CAMERA ====================

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

    // ==================== MAIN RENDER ====================

    render(state) {
        this.frameCount++;
        if (this.frameCount % 8 === 0) this.animFrame++;

        // Update systems
        this._updateParticles();
        this._updateButterflies();
        this._updateDandelionSeeds();
        this._spawnAmbientParticles();

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        ctx.clearRect(0, 0, cw, ch);

        // Draw sky (fixed behind camera)
        this._drawSky(ctx, cw, ch);

        // Draw parallax mountains (0.5x camera speed, behind clouds)
        this._drawMountains(ctx, cw, ch);

        // Draw clouds (parallax -- slow scroll)
        this._drawClouds(ctx, cw, ch);

        ctx.save();
        ctx.translate(-Math.round(this.cameraSmooth.x), -Math.round(this.cameraSmooth.y));

        this._drawTiles(ctx, cw, ch);
        this._drawWaterFoam(ctx, cw, ch);
        this._drawWaterShimmer(ctx, cw, ch);

        // Depth-sorted layer: decorations, locations, NPCs, player, butterflies, dandelion seeds
        this._drawDepthSorted(ctx, cw, ch, state);

        // Particles on top of world objects
        this._drawParticles(ctx);

        // Atmospheric lighting overlays (in world space)
        this._drawAtmosphere(ctx, cw, ch);

        ctx.restore();

        // Screen-space vignette overlay
        this._drawVignette(ctx, cw, ch);
    },

    // ==================== SKY & CLOUDS ====================

    _drawSky(ctx, cw, ch) {
        const grad = ctx.createLinearGradient(0, 0, 0, ch);
        grad.addColorStop(0, '#1565C0');
        grad.addColorStop(0.5, '#42A5F5');
        grad.addColorStop(0.85, '#90CAF9');
        grad.addColorStop(1, '#E3F2FD');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
    },

    _drawClouds(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const totalW = this.mapWidth * this.tileSize;

        for (const cloud of this.clouds) {
            // Move cloud slowly
            cloud.x += cloud.speed;
            if (cloud.x > totalW + 60) cloud.x = -cloud.w - 20;

            // Parallax: clouds move slower than camera
            const drawX = cloud.x - sx * 0.3;
            const drawY = cloud.y - sy * 0.15 + 8;

            // Skip if off screen
            if (drawX > cw + 20 || drawX + cloud.w < -20 || drawY > ch * 0.5) continue;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const w = cloud.w;
            const h = w * 0.4;
            // Cloud shape: overlapping rounded rectangles
            ctx.fillRect(Math.round(drawX), Math.round(drawY), w, h * 0.6);
            ctx.fillRect(Math.round(drawX + w * 0.15), Math.round(drawY - h * 0.3), w * 0.5, h * 0.5);
            ctx.fillRect(Math.round(drawX + w * 0.45), Math.round(drawY - h * 0.2), w * 0.35, h * 0.4);
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(Math.round(drawX + w * 0.2), Math.round(drawY - h * 0.15), w * 0.3, h * 0.25);
        }
    },

    // ==================== PARALLAX MOUNTAINS ====================

    _drawMountains(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);

        // Mountains scroll at 0.5x camera speed
        const parallaxX = sx * 0.5;
        const baseY = ch * 0.55 - sy * 0.15;

        for (const m of this.mountains) {
            const drawX = m.x - parallaxX;
            // Wrap around screen
            const screenX = ((drawX % (cw + 200)) + cw + 200) % (cw + 200) - 100;
            if (screenX > cw + 100 || screenX + m.width < -100) continue;

            // Distant mountain silhouette
            const alpha = m.shade;
            ctx.fillStyle = `rgba(30, 50, 80, ${alpha})`;

            // Draw mountain as a triangle-ish shape using rects (pixel art style)
            const peak = m.height;
            const halfW = m.width / 2;
            for (let row = 0; row < peak; row++) {
                const widthAtRow = halfW * (row / peak);
                ctx.fillRect(
                    Math.round(screenX + halfW - widthAtRow),
                    Math.round(baseY - peak + row),
                    Math.round(widthAtRow * 2),
                    1
                );
            }

            // Snow cap on taller mountains
            if (m.height > 30) {
                const capHeight = 6;
                ctx.fillStyle = `rgba(200, 220, 240, ${alpha * 0.7})`;
                for (let row = 0; row < capHeight; row++) {
                    const widthAtRow = halfW * (row / peak);
                    ctx.fillRect(
                        Math.round(screenX + halfW - widthAtRow),
                        Math.round(baseY - peak + row),
                        Math.round(widthAtRow * 2),
                        1
                    );
                }
            }
        }
    },

    // ==================== DEPTH-SORTED RENDERING ====================

    _drawDepthSorted(ctx, cw, ch, state) {
        const ts = this.tileSize;
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const W = this.mapWidth, H = this.mapHeight;
        const T = this.TILE;

        // Collect all drawable objects with their Y position (bottom edge for sorting)
        const drawables = [];

        // Decorations (trees, bushes, rocks)
        const startTX = Math.max(0, Math.floor(sx / ts) - 2);
        const startTY = Math.max(0, Math.floor(sy / ts) - 3);
        const endTX = Math.min(W, Math.ceil((sx + cw) / ts) + 2);
        const endTY = Math.min(H, Math.ceil((sy + ch) / ts) + 2);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const tile = this.tileMap[ty][tx];
                const blocked = this.collisionMap[ty][tx] === 0;

                if (blocked && (tile === T.GRASS || tile === T.DARK_GRASS || tile === T.FLOWER_GRASS)) {
                    const px = tx * ts;
                    const py = ty * ts;
                    drawables.push({ type: 'decoration', sortY: py + ts, tx, ty, px, py, tile });
                }

                // Scattered rocks on dirt
                if (tile === T.DIRT && !blocked && (tx * 11 + ty * 7) % 17 === 0) {
                    drawables.push({ type: 'dirt_rock', sortY: ty * ts + 12, px: tx * ts, py: ty * ts });
                }
            }
        }

        // Locations (buildings)
        for (const loc of this.locations) {
            const px = loc.x * ts;
            const py = loc.y * ts;
            if (px > sx - 40 && px < sx + cw + 40 && py > sy - 40 && py < sy + ch + 40) {
                drawables.push({ type: 'location', sortY: py + 12, loc, px, py, state });
            }
        }

        // NPCs
        for (const npc of this.npcs) {
            const px = npc.x * ts;
            const py = npc.y * ts;
            if (px > sx - 20 && px < sx + cw + 20 && py > sy - 20 && py < sy + ch + 20) {
                drawables.push({ type: 'npc', sortY: py + 8, npc, px, py });
            }
        }

        // Player
        drawables.push({ type: 'player', sortY: state.playerY + 10, state });

        // Butterflies
        for (const b of this.butterflies) {
            if (b.x > sx - 20 && b.x < sx + cw + 20 && b.y > sy - 20 && b.y < sy + ch + 20) {
                drawables.push({ type: 'butterfly', sortY: b.y + 2, b });
            }
        }

        // Dandelion seeds
        for (const d of this.dandelionSeeds) {
            if (d.x > sx - 20 && d.x < sx + cw + 20 && d.y > sy - 20 && d.y < sy + ch + 20) {
                drawables.push({ type: 'dandelion', sortY: d.y, d });
            }
        }

        // Sort by Y position (lower Y drawn first = behind)
        drawables.sort((a, b) => a.sortY - b.sortY);

        // Draw in sorted order
        for (const obj of drawables) {
            switch (obj.type) {
                case 'decoration':
                    this._drawSingleDecoration(ctx, obj.tx, obj.ty, obj.px, obj.py, obj.tile);
                    break;
                case 'dirt_rock':
                    ctx.fillStyle = '#8B7355';
                    ctx.fillRect(obj.px + 4, obj.py + 8, 6, 4);
                    ctx.fillStyle = '#9B8365';
                    ctx.fillRect(obj.px + 5, obj.py + 7, 4, 2);
                    break;
                case 'location':
                    this._drawSingleLocation(ctx, obj.loc, obj.px, obj.py, obj.state);
                    break;
                case 'npc':
                    this._drawSingleNPC(ctx, obj.npc, obj.px, obj.py);
                    break;
                case 'player':
                    this._drawPlayer(ctx, obj.state);
                    break;
                case 'butterfly':
                    this._drawSingleButterfly(ctx, obj.b);
                    break;
                case 'dandelion':
                    this._drawSingleDandelionSeed(ctx, obj.d);
                    break;
            }
        }
    },

    /** Draw a single decoration (called from depth-sorted loop) */
    _drawSingleDecoration(ctx, tx, ty, px, py, tile) {
        const seed = tx * 7919 + ty * 4231;
        const T = this.TILE;

        if (seed % 4 === 0) {
            this._drawTreeShadow(ctx, px + 8, py);
            this._drawPalmTree(ctx, px + 8, py, seed);
        } else if (seed % 4 === 1) {
            this._drawTreeShadow(ctx, px + 8, py);
            this._drawRoundTree(ctx, px + 8, py, tile === T.DARK_GRASS);
        } else if (seed % 4 === 2) {
            this._drawTreeShadow(ctx, px + 8, py);
            this._drawPineTree(ctx, px + 8, py);
        } else {
            this._drawBushShadow(ctx, px + 8, py);
            this._drawBush(ctx, px + 8, py, tile === T.DARK_GRASS);
        }
    },

    /** Draw a single location with shadow (called from depth-sorted loop) */
    _drawSingleLocation(ctx, loc, px, py, state) {
        const result = state.weekResults[loc.week];
        const isNear = state.nearLocation === loc.week;

        // Building ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(px - 14, py + 6, 28, 6);

        // Glow when near
        if (isNear) {
            const pulse = Math.sin(this.frameCount * 0.08) * 0.2 + 0.4;
            ctx.fillStyle = `rgba(251, 208, 0, ${pulse})`;
            ctx.fillRect(px - 20, py - 28, 40, 44);
        }

        this._drawLocationBuilding(ctx, loc, px, py);

        // Week label
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px - 11, py + 14, 22, 10);
        ctx.fillStyle = isNear ? '#FBD000' : '#ffffff';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('W' + loc.week, px, py + 22);

        // Win/Loss badge
        if (result) {
            const color = result.won ? '#43B047' : '#E52521';
            const text = result.won ? 'W' : 'L';
            ctx.fillStyle = color;
            ctx.fillRect(px + 12, py - 24, 10, 10);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(text, px + 17, py - 16);
        }
    },

    /** Draw a single NPC (called from depth-sorted loop) */
    _drawSingleNPC(ctx, npc, px, py) {
        const bob = Math.sin(this.frameCount * 0.04 + npc.x) * 1;

        switch (npc.character) {
            case 'mario':    this._drawMarioNPC(ctx, px, py + Math.round(bob)); break;
            case 'luigi':    this._drawLuigiNPC(ctx, px, py + Math.round(bob)); break;
            case 'peach':    this._drawPeachNPC(ctx, px, py + Math.round(bob)); break;
            case 'toadette': this._drawToadetteNPC(ctx, px, py + Math.round(bob)); break;
            case 'yoshi':    this._drawYoshiNPC(ctx, px, py + Math.round(bob)); break;
            case 'dk':       this._drawDKNPC(ctx, px, py + Math.round(bob)); break;
            case 'bowser':   this._drawBowserNPC(ctx, px, py + Math.round(bob)); break;
            case 'wario':    this._drawWarioNPC(ctx, px, py + Math.round(bob)); break;
        }

        // NPC name label
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(px - 12, py + 10, 24, 8);
        ctx.fillStyle = '#FFF';
        ctx.font = '5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, px, py + 16);
    },

    _drawSingleButterfly(ctx, b) {
        const wingSpread = Math.sin(b.wingPhase) * 2.5;
        ctx.fillStyle = b.color;
        ctx.fillRect(Math.round(b.x - 2 - Math.abs(wingSpread)), Math.round(b.y - 1), Math.round(Math.abs(wingSpread) + 1), 2);
        ctx.fillRect(Math.round(b.x + 1), Math.round(b.y - 1), Math.round(Math.abs(wingSpread) + 1), 2);
        ctx.fillStyle = 'rgba(40, 30, 20, 0.8)';
        ctx.fillRect(Math.round(b.x), Math.round(b.y - 1), 1, 3);
    },

    _drawSingleDandelionSeed(ctx, d) {
        ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha})`;
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
        ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.5})`;
        ctx.fillRect(Math.round(d.x - 1), Math.round(d.y - 1), 1, 1);
        ctx.fillRect(Math.round(d.x + 1), Math.round(d.y - 1), 1, 1);
        ctx.fillRect(Math.round(d.x), Math.round(d.y - 2), 1, 1);
    },

    // ==================== TREE / BUSH SHADOWS ====================

    _drawTreeShadow(ctx, cx, baseY) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(cx - 6, baseY + 1, 12, 4);
        ctx.fillRect(cx - 4, baseY + 2, 8, 3);
    },

    _drawBushShadow(ctx, cx, baseY) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
        ctx.fillRect(cx - 4, baseY + 2, 8, 3);
    },

    // ==================== WATER EFFECTS ====================

    /** Draw animated shimmer/reflection highlights on water tiles */
    _drawWaterShimmer(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILE;

        const startTX = Math.max(0, Math.floor(sx / ts));
        const startTY = Math.max(0, Math.floor(sy / ts));
        const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts));
        const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts));

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const tile = this.tileMap[ty][tx];
                if (tile !== T.WATER && tile !== T.DEEP_WATER) continue;

                const px = tx * ts;
                const py = ty * ts;
                // Shimmer: moving bright spots
                const shimmer = Math.sin(this.frameCount * 0.06 + tx * 1.3 + ty * 0.7);
                if (shimmer > 0.7) {
                    const alpha = (shimmer - 0.7) / 0.3 * 0.25;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    const sx2 = Math.round((shimmer * 10) % 10) + 2;
                    const sy2 = Math.round((shimmer * 7 + tx) % 8) + 2;
                    ctx.fillRect(px + sx2, py + sy2, 3, 1);
                }
            }
        }
    },

    /** Draw foam at water-land boundaries */
    _drawWaterFoam(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILE;

        const startTX = Math.max(1, Math.floor(sx / ts));
        const startTY = Math.max(1, Math.floor(sy / ts));
        const endTX = Math.min(this.mapWidth - 1, Math.ceil((sx + cw) / ts));
        const endTY = Math.min(this.mapHeight - 1, Math.ceil((sy + ch) / ts));

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const tile = this.tileMap[ty][tx];
                if (tile !== T.WATER && tile !== T.DEEP_WATER) continue;

                const px = tx * ts;
                const py = ty * ts;
                const wave = Math.sin(this.frameCount * 0.05 + tx * 0.8 + ty * 0.6) * 1;

                // Check each direction for land tiles
                const tileAbove = this.tileMap[ty - 1][tx];
                const tileBelow = this.tileMap[ty + 1][tx];
                const tileLeft = this.tileMap[ty][tx - 1];
                const tileRight = this.tileMap[ty][tx + 1];

                const isLand = (t) => t >= T.SAND;

                const foamAlpha = 0.35 + Math.sin(this.frameCount * 0.04 + tx + ty) * 0.1;
                ctx.fillStyle = `rgba(220, 240, 255, ${foamAlpha})`;

                if (isLand(tileAbove)) {
                    ctx.fillRect(px + 1, py + Math.round(wave), ts - 2, 2);
                }
                if (isLand(tileBelow)) {
                    ctx.fillRect(px + 1, py + ts - 2 + Math.round(wave), ts - 2, 2);
                }
                if (isLand(tileLeft)) {
                    ctx.fillRect(px + Math.round(wave), py + 1, 2, ts - 2);
                }
                if (isLand(tileRight)) {
                    ctx.fillRect(px + ts - 2 + Math.round(wave), py + 1, 2, ts - 2);
                }
            }
        }
    },

    // ==================== ATMOSPHERE & LIGHTING ====================

    /** Draw atmospheric lighting overlays in world space (water tint, lava glow) */
    _drawAtmosphere(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILE;

        const startTX = Math.max(0, Math.floor(sx / ts));
        const startTY = Math.max(0, Math.floor(sy / ts));
        const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts));
        const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts));

        // Paint subtle color overlays per region
        for (let ty = startTY; ty < endTY; ty += 2) {
            for (let tx = startTX; tx < endTX; tx += 2) {
                const tile = this.tileMap[ty][tx];
                const px = tx * ts;
                const py = ty * ts;

                if (tile === T.WATER || tile === T.DEEP_WATER) {
                    // Subtle blue tint bleeding onto nearby tiles
                    ctx.fillStyle = 'rgba(30, 80, 160, 0.04)';
                    ctx.fillRect(px - ts, py - ts, ts * 4, ts * 4);
                }
                if (tile === T.LAVA) {
                    // Warm orange glow around lava
                    const pulse = Math.sin(this.frameCount * 0.06 + tx) * 0.02 + 0.06;
                    ctx.fillStyle = `rgba(255, 120, 20, ${pulse})`;
                    ctx.fillRect(px - ts * 2, py - ts * 2, ts * 6, ts * 6);
                }
            }
        }
    },

    /** Draw screen-space vignette (darker at edges) */
    _drawVignette(ctx, cw, ch) {
        // Radial gradient: transparent center, dark edges
        const cx = cw / 2;
        const cy = ch / 2;
        const radius = Math.max(cw, ch) * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
    },

    // ==================== TILE RENDERING ====================

    _drawTiles(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILE;

        const startTX = Math.max(0, Math.floor(sx / ts) - 1);
        const startTY = Math.max(0, Math.floor(sy / ts) - 1);
        const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts) + 1);
        const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts) + 1);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const px = tx * ts;
                const py = ty * ts;
                const tile = this.tileMap[ty][tx];

                switch (tile) {
                    case T.DEEP_WATER:
                        this._drawDeepWater(ctx, px, py, ts, tx, ty);
                        break;
                    case T.WATER:
                        this._drawWater(ctx, px, py, ts, tx, ty);
                        break;
                    case T.SAND:
                        ctx.fillStyle = this._sandColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        // Sand texture dots
                        if ((tx + ty * 3) % 5 === 0) {
                            ctx.fillStyle = 'rgba(139, 119, 80, 0.3)';
                            ctx.fillRect(px + 3, py + 5, 1, 1);
                            ctx.fillRect(px + 9, py + 11, 1, 1);
                        }
                        break;
                    case T.GRASS:
                        ctx.fillStyle = this._grassColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        this._drawGrassDetail(ctx, px, py, ts, tx, ty);
                        break;
                    case T.DARK_GRASS:
                        ctx.fillStyle = this._darkGrassColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        break;
                    case T.PATH:
                        ctx.fillStyle = this._pathColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        // Path edge detail
                        if ((tx + ty) % 4 === 0) {
                            ctx.fillStyle = 'rgba(0,0,0,0.08)';
                            ctx.fillRect(px, py, ts, 1);
                        }
                        break;
                    case T.BRIDGE:
                        // Wooden bridge over water
                        this._drawWater(ctx, px, py, ts, tx, ty);
                        ctx.fillStyle = '#8B6914';
                        ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
                        ctx.fillStyle = '#A07B20';
                        ctx.fillRect(px + 2, py + 3, ts - 4, 2);
                        ctx.fillRect(px + 2, py + 9, ts - 4, 2);
                        // Rails
                        ctx.fillStyle = '#6B4914';
                        ctx.fillRect(px, py, 2, ts);
                        ctx.fillRect(px + ts - 2, py, 2, ts);
                        break;
                    case T.STONE:
                        ctx.fillStyle = this._stoneColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        // Stone texture lines
                        ctx.fillStyle = 'rgba(0,0,0,0.1)';
                        if (ty % 2 === 0) {
                            ctx.fillRect(px + ts / 2, py, 1, ts);
                        }
                        ctx.fillRect(px, py + ts / 2, ts, 1);
                        break;
                    case T.LAVA:
                        this._drawLava(ctx, px, py, ts, tx, ty);
                        break;
                    case T.SNOW:
                        ctx.fillStyle = '#E8E8F0';
                        ctx.fillRect(px, py, ts, ts);
                        if ((tx + ty) % 3 === 0) {
                            ctx.fillStyle = '#F5F5FF';
                            ctx.fillRect(px + 2, py + 2, 4, 4);
                        }
                        break;
                    case T.DIRT:
                        ctx.fillStyle = this._dirtColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        if ((tx * 3 + ty) % 7 === 0) {
                            ctx.fillStyle = 'rgba(0,0,0,0.08)';
                            ctx.fillRect(px + 5, py + 3, 3, 2);
                        }
                        break;
                    case T.FLOWER_GRASS:
                        ctx.fillStyle = this._grassColor(tx, ty);
                        ctx.fillRect(px, py, ts, ts);
                        this._drawFlowers(ctx, px, py, ts, tx, ty);
                        break;
                }
            }
        }
    },

    // -- Tile color helpers --

    _sandColor(tx, ty) {
        const v = ((tx * 3 + ty * 7) % 5) / 5;
        return v < 0.4 ? '#E8D8A0' : v < 0.7 ? '#DCC888' : '#D4BC78';
    },
    _grassColor(tx, ty) {
        const v = ((tx * 7 + ty * 13) % 7) / 7;
        return v < 0.3 ? '#4CAF50' : v < 0.6 ? '#43A047' : '#388E3C';
    },
    _darkGrassColor(tx, ty) {
        const v = ((tx * 3 + ty * 5) % 5) / 5;
        return v < 0.4 ? '#2E7D32' : v < 0.7 ? '#1B5E20' : '#254A27';
    },
    _pathColor(tx, ty) {
        const v = ((tx * 5 + ty * 3) % 4) / 4;
        return v < 0.5 ? '#C8A860' : '#BEA058';
    },
    _stoneColor(tx, ty) {
        const v = ((tx * 11 + ty * 7) % 5) / 5;
        return v < 0.3 ? '#757575' : v < 0.6 ? '#696969' : '#808080';
    },
    _dirtColor(tx, ty) {
        const v = ((tx * 3 + ty * 11) % 5) / 5;
        return v < 0.4 ? '#8D6E40' : v < 0.7 ? '#7D5E30' : '#9D7E50';
    },

    // -- Animated tile helpers --

    _drawDeepWater(ctx, px, py, ts, tx, ty) {
        const wave = Math.sin(this.frameCount * 0.04 + tx * 0.5 + ty * 0.3) * 0.15;
        const r = Math.round(13 + wave * 20);
        const g = Math.round(71 + wave * 25);
        const b = Math.round(161 + wave * 30);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, ts, ts);
        // Wave highlights
        if ((tx + ty + Math.floor(this.frameCount * 0.06)) % 6 === 0) {
            ctx.fillStyle = 'rgba(100, 180, 255, 0.2)';
            ctx.fillRect(px + 2, py + 4, 6, 2);
        }
    },

    _drawWater(ctx, px, py, ts, tx, ty) {
        const wave = Math.sin(this.frameCount * 0.05 + tx * 0.6 + ty * 0.4) * 0.15;
        const r = Math.round(25 + wave * 15);
        const g = Math.round(118 + wave * 20);
        const b = Math.round(210 + wave * 20);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, ts, ts);
        // Foam/wave lines
        if ((tx + ty + Math.floor(this.frameCount * 0.08)) % 5 === 0) {
            ctx.fillStyle = 'rgba(200, 230, 255, 0.35)';
            ctx.fillRect(px + 1, py + 6, 8, 1);
        }
    },

    _drawLava(ctx, px, py, ts, tx, ty) {
        const pulse = Math.sin(this.frameCount * 0.06 + tx + ty) * 0.5 + 0.5;
        ctx.fillStyle = pulse > 0.5 ? '#FF4400' : '#FF6600';
        ctx.fillRect(px, py, ts, ts);
        ctx.fillStyle = `rgba(255, 200, 0, ${pulse * 0.4})`;
        ctx.fillRect(px + 3, py + 3, ts - 6, ts - 6);
    },

    _drawGrassDetail(ctx, px, py, ts, tx, ty) {
        // Small grass tufts on some tiles
        if ((tx * 7 + ty * 13) % 9 === 0) {
            ctx.fillStyle = '#66BB6A';
            ctx.fillRect(px + 2, py + ts - 3, 1, 3);
            ctx.fillRect(px + 6, py + ts - 4, 1, 4);
            ctx.fillRect(px + 11, py + ts - 3, 1, 3);
        }
        // Occasional darker patch
        if ((tx * 11 + ty * 3) % 13 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.fillRect(px + 4, py + 4, 6, 6);
        }
    },

    _drawFlowers(ctx, px, py, ts, tx, ty) {
        // Colored flower dots on grass
        const seed = tx * 31 + ty * 17;
        const flowerColors = ['#FF69B4', '#FF4081', '#FBD000', '#E040FB', '#FF6E40'];
        if (seed % 3 === 0) {
            ctx.fillStyle = flowerColors[seed % flowerColors.length];
            ctx.fillRect(px + (seed % 10) + 2, py + (seed % 8) + 3, 2, 2);
        }
        if ((seed + 7) % 4 === 0) {
            ctx.fillStyle = flowerColors[(seed + 3) % flowerColors.length];
            ctx.fillRect(px + ((seed + 5) % 10) + 1, py + ((seed + 3) % 8) + 2, 2, 2);
        }
        // Stems
        if (seed % 3 === 0) {
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(px + (seed % 10) + 2, py + (seed % 8) + 5, 1, 3);
        }
    },

    // ==================== DECORATIONS (trees, rocks) ====================

    _drawDecorations(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;
        const T = this.TILE;
        const W = this.mapWidth, H = this.mapHeight;

        // Trees: draw on grass tiles that are collision-blocked
        const startTX = Math.max(0, Math.floor(sx / ts) - 2);
        const startTY = Math.max(0, Math.floor(sy / ts) - 3);
        const endTX = Math.min(W, Math.ceil((sx + cw) / ts) + 2);
        const endTY = Math.min(H, Math.ceil((sy + ch) / ts) + 2);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const tile = this.tileMap[ty][tx];
                const blocked = this.collisionMap[ty][tx] === 0;

                if (blocked && (tile === T.GRASS || tile === T.DARK_GRASS || tile === T.FLOWER_GRASS)) {
                    const px = tx * ts;
                    const py = ty * ts;
                    const seed = tx * 7919 + ty * 4231;

                    if (seed % 4 === 0) {
                        // Palm tree (tropical theme)
                        this._drawPalmTree(ctx, px + 8, py, seed);
                    } else if (seed % 4 === 1) {
                        // Round green tree
                        this._drawRoundTree(ctx, px + 8, py, tile === T.DARK_GRASS);
                    } else if (seed % 4 === 2) {
                        // Pine tree
                        this._drawPineTree(ctx, px + 8, py);
                    } else {
                        // Bush/rock
                        this._drawBush(ctx, px + 8, py, tile === T.DARK_GRASS);
                    }
                }

                // Scattered rocks on dirt/canyon tiles (non-blocking decorative)
                if (tile === T.DIRT && !blocked && (tx * 11 + ty * 7) % 17 === 0) {
                    const px = tx * ts;
                    const py = ty * ts;
                    ctx.fillStyle = '#8B7355';
                    ctx.fillRect(px + 4, py + 8, 6, 4);
                    ctx.fillStyle = '#9B8365';
                    ctx.fillRect(px + 5, py + 7, 4, 2);
                }
            }
        }
    },

    _drawPalmTree(ctx, cx, baseY, seed) {
        // Trunk -- slight curve
        ctx.fillStyle = '#8B6914';
        const trunkLean = Math.sin(seed * 0.3) * 1;
        ctx.fillRect(cx - 2 + Math.round(trunkLean * 0.3), baseY - 16, 4, 18);
        ctx.fillStyle = '#A07B20';
        ctx.fillRect(cx - 1 + Math.round(trunkLean * 0.3), baseY - 14, 2, 14);
        // Trunk segments
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let s = 0; s < 4; s++) {
            ctx.fillRect(cx - 2 + Math.round(trunkLean * 0.3), baseY - 14 + s * 4, 4, 1);
        }
        // Fronds (organic multi-layer sway -- each frond has different phase)
        const t = this.frameCount;
        const sway1 = Math.sin(t * 0.025 + seed * 0.1) * 2;
        const sway2 = Math.sin(t * 0.03 + seed * 0.15 + 1) * 1.5;
        const sway3 = Math.sin(t * 0.02 + seed * 0.12 + 2) * 1.8;
        const sway4 = Math.sin(t * 0.035 + seed * 0.08 + 3) * 1.2;
        // Back fronds (darker)
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(cx - 9 + Math.round(sway3), baseY - 23, 8, 2);
        ctx.fillRect(cx + 2 + Math.round(sway4), baseY - 22, 8, 2);
        // Main fronds
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(cx - 8 + Math.round(sway1), baseY - 20, 7, 3);
        ctx.fillRect(cx + 2 + Math.round(sway2), baseY - 19, 7, 3);
        // Front fronds (lighter)
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(cx - 6 + Math.round(sway2), baseY - 21, 5, 3);
        ctx.fillRect(cx + 1 + Math.round(sway1), baseY - 20, 6, 3);
        // Frond tips (drooping)
        ctx.fillStyle = '#43A047';
        ctx.fillRect(cx - 10 + Math.round(sway1), baseY - 18, 3, 2);
        ctx.fillRect(cx + 8 + Math.round(sway2), baseY - 17, 3, 2);
        // Coconuts
        ctx.fillStyle = '#6D4C1A';
        ctx.fillRect(cx - 2, baseY - 17, 2, 2);
        ctx.fillRect(cx + 1, baseY - 18, 2, 2);
    },

    _drawRoundTree(ctx, cx, baseY, dark) {
        // Trunk
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(cx - 2, baseY - 8, 4, 10);
        // Canopy
        ctx.fillStyle = dark ? '#1B5E20' : '#43A047';
        ctx.fillRect(cx - 6, baseY - 18, 12, 12);
        ctx.fillRect(cx - 4, baseY - 20, 8, 2);
        // Highlight
        ctx.fillStyle = dark ? '#2E7D32' : '#66BB6A';
        ctx.fillRect(cx - 4, baseY - 16, 4, 4);
    },

    _drawPineTree(ctx, cx, baseY) {
        // Trunk
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(cx - 1, baseY - 6, 3, 8);
        // Layers
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(cx - 5, baseY - 10, 11, 5);
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(cx - 4, baseY - 15, 9, 5);
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(cx - 3, baseY - 19, 7, 5);
        // Top
        ctx.fillRect(cx - 1, baseY - 21, 3, 3);
    },

    _drawBush(ctx, cx, baseY, dark) {
        ctx.fillStyle = dark ? '#1B5E20' : '#388E3C';
        ctx.fillRect(cx - 5, baseY - 4, 10, 6);
        ctx.fillStyle = dark ? '#2E7D32' : '#4CAF50';
        ctx.fillRect(cx - 3, baseY - 6, 6, 3);
    },

    // ==================== LOCATION BUILDINGS ====================

    _drawLocations(ctx, state) {
        const ts = this.tileSize;
        for (const loc of this.locations) {
            const px = loc.x * ts;
            const py = loc.y * ts;
            const result = state.weekResults[loc.week];
            const isNear = state.nearLocation === loc.week;

            // Glow when near
            if (isNear) {
                const pulse = Math.sin(this.frameCount * 0.08) * 0.2 + 0.4;
                ctx.fillStyle = `rgba(251, 208, 0, ${pulse})`;
                ctx.fillRect(px - 20, py - 28, 40, 44);
            }

            this._drawLocationBuilding(ctx, loc, px, py);

            // Week label
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(px - 11, py + 14, 22, 10);
            ctx.fillStyle = isNear ? '#FBD000' : '#ffffff';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('W' + loc.week, px, py + 22);

            // Win/Loss badge
            if (result) {
                const color = result.won ? '#43B047' : '#E52521';
                const text = result.won ? 'W' : 'L';
                ctx.fillStyle = color;
                ctx.fillRect(px + 12, py - 24, 10, 10);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(text, px + 17, py - 16);
            }
        }
    },

    _drawLocationBuilding(ctx, loc, px, py) {
        const c = loc.colors;
        switch (loc.theme) {
            case 'village':
                // Mushroom house
                ctx.fillStyle = '#F5F5F0';
                ctx.fillRect(px - 8, py - 8, 16, 16);
                ctx.fillStyle = '#E52521';
                ctx.fillRect(px - 12, py - 18, 24, 12);
                ctx.fillRect(px - 10, py - 20, 20, 4);
                // White spots on cap
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px - 8, py - 16, 4, 4);
                ctx.fillRect(px + 4, py - 15, 3, 3);
                ctx.fillRect(px - 2, py - 19, 3, 3);
                // Door
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(px - 3, py, 6, 8);
                // Window
                ctx.fillStyle = '#87CEEB';
                ctx.fillRect(px + 4, py - 5, 4, 4);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(px + 5, py - 5, 1, 4);
                ctx.fillRect(px + 4, py - 3, 4, 1);
                break;

            case 'beach':
                // Beach hut with tiki torches
                ctx.fillStyle = '#DEB887';
                ctx.fillRect(px - 8, py - 10, 16, 18);
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(px - 10, py - 14, 20, 6);
                // Tiki roof detail
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(px - 11, py - 12, 22, 2);
                // Palm tree accent
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(px + 13, py - 20, 3, 24);
                ctx.fillStyle = '#2E7D32';
                const sway = Math.sin(this.frameCount * 0.04) * 1;
                ctx.fillRect(px + 9 + Math.round(sway), py - 24, 10, 3);
                ctx.fillRect(px + 11 + Math.round(sway), py - 26, 6, 3);
                // Water
                const waveOff = Math.sin(this.frameCount * 0.06) * 1;
                ctx.fillStyle = 'rgba(66, 165, 245, 0.5)';
                ctx.fillRect(px - 14 + Math.round(waveOff), py + 4, 28, 3);
                break;

            case 'plains':
                // Green house with warp pipe
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 8, py - 12, 16, 20);
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(px - 10, py - 16, 20, 6);
                // Warp pipe
                ctx.fillStyle = '#43A047';
                ctx.fillRect(px + 10, py - 14, 8, 22);
                ctx.fillStyle = '#66BB6A';
                ctx.fillRect(px + 8, py - 16, 12, 4);
                // Piranha plant
                ctx.fillStyle = '#E52521';
                const plantY = Math.sin(this.frameCount * 0.05) * 3;
                ctx.fillRect(px + 11, py - 22 + Math.round(plantY), 6, 6);
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 11, py - 18 + Math.round(plantY), 6, 2);
                break;

            case 'haunted':
                // Spooky mansion
                ctx.fillStyle = '#37474F';
                ctx.fillRect(px - 10, py - 14, 20, 22);
                ctx.fillStyle = '#455A64';
                ctx.fillRect(px - 12, py - 20, 24, 8);
                ctx.fillRect(px - 4, py - 26, 8, 8);
                // Glowing windows
                const flicker = Math.sin(this.frameCount * 0.1) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(255, 255, 68, ${flicker})`;
                ctx.fillRect(px - 6, py - 8, 4, 5);
                ctx.fillRect(px + 3, py - 8, 4, 5);
                // Ghost
                const ghostY = Math.sin(this.frameCount * 0.06) * 3;
                const ghostA = Math.sin(this.frameCount * 0.04) * 0.2 + 0.5;
                ctx.fillStyle = `rgba(200, 200, 220, ${ghostA})`;
                ctx.fillRect(px - 18, py - 12 + Math.round(ghostY), 7, 9);
                ctx.fillRect(px - 19, py - 8 + Math.round(ghostY), 2, 3);
                ctx.fillRect(px - 12, py - 8 + Math.round(ghostY), 2, 3);
                // Ghost eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(px - 17, py - 10 + Math.round(ghostY), 2, 2);
                ctx.fillRect(px - 14, py - 10 + Math.round(ghostY), 2, 2);
                break;

            case 'canyon':
                // Rocky canyon walls with chain chomp
                ctx.fillStyle = '#795548';
                ctx.fillRect(px - 12, py - 18, 8, 26);
                ctx.fillRect(px + 4, py - 22, 8, 30);
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(px - 10, py - 20, 6, 4);
                ctx.fillRect(px + 5, py - 24, 6, 4);
                // Bridge
                ctx.fillStyle = '#6D4C41';
                ctx.fillRect(px - 6, py - 4, 12, 3);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(px - 7, py - 5, 1, 5);
                ctx.fillRect(px + 6, py - 5, 1, 5);
                // Chain chomp
                ctx.fillStyle = '#212121';
                ctx.fillRect(px - 3, py - 16, 7, 7);
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px - 1, py - 14, 2, 2);
                ctx.fillRect(px + 2, py - 14, 2, 2);
                // Chain
                ctx.fillStyle = '#424242';
                ctx.fillRect(px - 2, py - 10, 1, 4);
                ctx.fillRect(px, py - 8, 1, 4);
                break;

            case 'waterfall':
                // Cliff with animated waterfall
                ctx.fillStyle = '#607D8B';
                ctx.fillRect(px - 8, py - 20, 16, 28);
                ctx.fillStyle = '#78909C';
                ctx.fillRect(px - 10, py - 22, 20, 4);
                // Waterfall animation
                for (let wy = 0; wy < 24; wy += 3) {
                    const offset = (this.frameCount + wy * 2) % 6;
                    ctx.fillStyle = offset < 3 ? '#42A5F5' : '#90CAF9';
                    ctx.fillRect(px - 2, py - 18 + wy, 5, 3);
                }
                // Splash at bottom
                const splashA = Math.sin(this.frameCount * 0.12) * 0.3 + 0.5;
                ctx.fillStyle = `rgba(144, 202, 249, ${splashA})`;
                ctx.fillRect(px - 6, py + 4, 12, 3);
                // Shy Guy
                ctx.fillStyle = '#E52521';
                ctx.fillRect(px + 12, py - 8, 6, 8);
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 12, py - 6, 6, 3);
                ctx.fillStyle = '#000';
                ctx.fillRect(px + 13, py - 5, 2, 1);
                ctx.fillRect(px + 16, py - 5, 2, 1);
                break;

            case 'battlefield':
                // Military bunker with flag
                ctx.fillStyle = '#33691E';
                ctx.fillRect(px - 10, py - 10, 20, 18);
                ctx.fillStyle = '#558B2F';
                ctx.fillRect(px - 12, py - 13, 24, 5);
                // Camouflage pattern
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(px - 6, py - 6, 4, 4);
                ctx.fillRect(px + 2, py - 3, 5, 3);
                // Flag
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(px + 12, py - 24, 2, 22);
                ctx.fillStyle = '#E52521';
                ctx.fillRect(px + 14, py - 24, 8, 6);
                // Star on flag
                ctx.fillStyle = '#FBD000';
                ctx.fillRect(px + 16, py - 22, 3, 3);
                // Sandbags
                ctx.fillStyle = '#BDB76B';
                ctx.fillRect(px - 14, py - 2, 6, 4);
                ctx.fillRect(px - 12, py - 6, 6, 4);
                break;

            case 'cloud':
                // Cloud platform with palace
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px - 16, py - 4, 32, 8);
                ctx.fillRect(px - 12, py - 8, 24, 4);
                ctx.fillRect(px - 8, py - 10, 16, 4);
                // Palace
                ctx.fillStyle = '#E3F2FD';
                ctx.fillRect(px - 6, py - 20, 12, 12);
                ctx.fillStyle = '#FBD000';
                ctx.fillRect(px - 2, py - 26, 4, 8);
                ctx.fillRect(px - 4, py - 28, 8, 3);
                // Tower detail
                ctx.fillStyle = '#90CAF9';
                ctx.fillRect(px - 4, py - 16, 3, 4);
                ctx.fillRect(px + 1, py - 16, 3, 4);
                // Lakitu
                const lakY = Math.sin(this.frameCount * 0.04 + 1) * 2;
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px + 12, py - 18 + Math.round(lakY), 8, 4);
                ctx.fillStyle = '#43A047';
                ctx.fillRect(px + 14, py - 22 + Math.round(lakY), 4, 6);
                ctx.fillStyle = '#FBD000';
                ctx.fillRect(px + 14, py - 24 + Math.round(lakY), 4, 3);
                break;

            case 'desert':
                // Pyramid with sphinx
                ctx.fillStyle = '#D4A84B';
                ctx.fillRect(px - 2, py - 22, 4, 4);
                ctx.fillRect(px - 5, py - 18, 10, 4);
                ctx.fillRect(px - 8, py - 14, 16, 4);
                ctx.fillRect(px - 11, py - 10, 22, 4);
                ctx.fillRect(px - 14, py - 6, 28, 14);
                // Darker pyramid lines
                ctx.fillStyle = '#C29836';
                ctx.fillRect(px, py - 20, 1, 20);
                ctx.fillRect(px - 4, py - 16, 1, 16);
                ctx.fillRect(px + 4, py - 16, 1, 16);
                // Door
                ctx.fillStyle = '#1A1A1A';
                ctx.fillRect(px - 3, py - 4, 6, 10);
                // Dry bones
                ctx.fillStyle = '#E0E0E0';
                ctx.fillRect(px + 14, py - 2, 6, 2);
                ctx.fillRect(px + 16, py - 4, 2, 6);
                break;

            case 'fortress':
                // Thwomp fortress
                ctx.fillStyle = '#616161';
                ctx.fillRect(px - 12, py - 18, 24, 26);
                // Battlements
                ctx.fillStyle = '#424242';
                for (let bx = -12; bx < 12; bx += 6) {
                    ctx.fillRect(px + bx, py - 22, 4, 5);
                }
                // Thwomp face
                ctx.fillStyle = '#9E9E9E';
                ctx.fillRect(px - 6, py - 12, 12, 10);
                ctx.fillStyle = '#FFF';
                ctx.fillRect(px - 4, py - 10, 3, 3);
                ctx.fillRect(px + 2, py - 10, 3, 3);
                ctx.fillStyle = '#000';
                ctx.fillRect(px - 3, py - 9, 2, 2);
                ctx.fillRect(px + 3, py - 9, 2, 2);
                // Angry mouth
                ctx.fillStyle = '#212121';
                ctx.fillRect(px - 3, py - 5, 6, 2);
                // Gate
                ctx.fillStyle = '#1A1A1A';
                ctx.fillRect(px - 4, py + 2, 8, 6);
                // Gate bars
                ctx.fillStyle = '#424242';
                for (let gx = -3; gx <= 3; gx += 2) {
                    ctx.fillRect(px + gx, py + 2, 1, 6);
                }
                break;

            case 'mansion':
                // Luigi's Mansion with tower
                ctx.fillStyle = '#263238';
                ctx.fillRect(px - 10, py - 16, 20, 24);
                ctx.fillStyle = '#37474F';
                ctx.fillRect(px - 12, py - 20, 24, 6);
                // Windows (greenish glow)
                ctx.fillStyle = '#A5D6A7';
                ctx.fillRect(px - 6, py - 12, 4, 5);
                ctx.fillRect(px + 3, py - 12, 4, 5);
                // Window frames
                ctx.fillStyle = '#455A64';
                ctx.fillRect(px - 4, py - 12, 1, 5);
                ctx.fillRect(px + 5, py - 12, 1, 5);
                // Door
                ctx.fillStyle = '#4A148C';
                ctx.fillRect(px - 3, py, 6, 8);
                // Tower
                ctx.fillStyle = '#263238';
                ctx.fillRect(px + 6, py - 28, 6, 14);
                ctx.fillStyle = '#4A148C';
                ctx.fillRect(px + 5, py - 30, 8, 4);
                // Tower window
                ctx.fillStyle = '#A5D6A7';
                ctx.fillRect(px + 7, py - 26, 3, 3);
                break;

            case 'garden':
                // Peach's garden gazebo
                ctx.fillStyle = '#F8BBD0';
                ctx.fillRect(px - 10, py - 14, 20, 4);
                ctx.fillRect(px - 12, py - 16, 24, 3);
                // Pillars
                ctx.fillStyle = '#FCE4EC';
                ctx.fillRect(px - 8, py - 10, 3, 18);
                ctx.fillRect(px + 5, py - 10, 3, 18);
                // Flowers around
                const flowerColors = ['#FF69B4', '#FF4081', '#FBD000', '#E040FB', '#FF6E40'];
                const positions = [[-14, -2], [-12, 3], [12, -3], [14, 1], [10, 5], [-10, 5]];
                positions.forEach(([fx, fy], i) => {
                    ctx.fillStyle = flowerColors[i % flowerColors.length];
                    ctx.fillRect(px + fx, py + fy, 3, 3);
                    ctx.fillStyle = '#43A047';
                    ctx.fillRect(px + fx + 1, py + fy + 3, 1, 3);
                });
                // Crown ornament on top
                ctx.fillStyle = '#FBD000';
                ctx.fillRect(px - 4, py - 20, 8, 4);
                ctx.fillRect(px - 2, py - 22, 2, 2);
                ctx.fillRect(px + 2, py - 22, 2, 2);
                // Pink gem
                ctx.fillStyle = '#FF69B4';
                ctx.fillRect(px, py - 19, 2, 2);
                break;

            case 'mine':
                // Mine entrance with tracks and gold
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(px - 10, py - 14, 20, 22);
                ctx.fillStyle = '#1A1A1A';
                ctx.fillRect(px - 6, py - 8, 12, 16);
                // Mine arch
                ctx.fillStyle = '#795548';
                ctx.fillRect(px - 7, py - 10, 2, 16);
                ctx.fillRect(px + 5, py - 10, 2, 16);
                ctx.fillRect(px - 7, py - 10, 14, 2);
                // Minecart tracks
                ctx.fillStyle = '#9E9E9E';
                ctx.fillRect(px - 14, py + 4, 28, 2);
                ctx.fillStyle = '#757575';
                for (let rx = -14; rx < 14; rx += 4) {
                    ctx.fillRect(px + rx, py + 2, 2, 6);
                }
                // Gold sparkles
                const goldPos = [[-8, -12], [6, -14], [-4, -16], [8, -8]];
                goldPos.forEach(([gx, gy], i) => {
                    if ((this.frameCount + i * 7) % 20 < 12) {
                        ctx.fillStyle = '#FBD000';
                        ctx.fillRect(px + gx, py + gy, 2, 2);
                    }
                });
                break;

            case 'castle':
                // Bowser's Castle - imposing dark structure
                ctx.fillStyle = '#212121';
                ctx.fillRect(px - 14, py - 18, 28, 26);
                // Towers
                ctx.fillStyle = '#E52521';
                ctx.fillRect(px - 16, py - 28, 8, 16);
                ctx.fillRect(px + 8, py - 28, 8, 16);
                // Battlements
                ctx.fillStyle = '#B71C1C';
                ctx.fillRect(px - 16, py - 30, 4, 4);
                ctx.fillRect(px - 8, py - 30, 4, 4);
                ctx.fillRect(px + 4, py - 30, 4, 4);
                ctx.fillRect(px + 12, py - 30, 4, 4);
                // Bowser emblem
                ctx.fillStyle = '#FF6600';
                ctx.fillRect(px - 4, py - 14, 8, 8);
                ctx.fillStyle = '#FBD000';
                ctx.fillRect(px - 2, py - 12, 4, 4);
                // Lava moat
                for (let lx = -14; lx < 14; lx += 4) {
                    const lavaFlicker = (lx + this.frameCount) % 8 < 4;
                    ctx.fillStyle = lavaFlicker ? '#FF4400' : '#FF6600';
                    ctx.fillRect(px + lx, py + 6, 4, 3);
                }
                ctx.fillStyle = `rgba(255, 200, 0, ${Math.sin(this.frameCount * 0.08) * 0.2 + 0.3})`;
                ctx.fillRect(px - 14, py + 5, 28, 1);
                // Gate
                ctx.fillStyle = '#3E0000';
                ctx.fillRect(px - 4, py - 2, 8, 10);
                // Gate spikes
                ctx.fillStyle = '#9E9E9E';
                for (let sx = -3; sx <= 3; sx += 2) {
                    ctx.fillRect(px + sx, py - 3, 1, 3);
                }
                break;
        }
    },

    // ==================== NPC SPRITES ====================

    _drawNPCs(ctx) {
        for (const npc of this.npcs) {
            const px = npc.x * this.tileSize;
            const py = npc.y * this.tileSize;
            const bob = Math.sin(this.frameCount * 0.04 + npc.x) * 1;

            switch (npc.character) {
                case 'mario':
                    this._drawMarioNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'luigi':
                    this._drawLuigiNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'peach':
                    this._drawPeachNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'toadette':
                    this._drawToadetteNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'yoshi':
                    this._drawYoshiNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'dk':
                    this._drawDKNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'bowser':
                    this._drawBowserNPC(ctx, px, py + Math.round(bob));
                    break;
                case 'wario':
                    this._drawWarioNPC(ctx, px, py + Math.round(bob));
                    break;
            }

            // NPC name label
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(px - 12, py + 10, 24, 8);
            ctx.fillStyle = '#FFF';
            ctx.font = '5px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(npc.name, px, py + 16);
        }
    },

    _drawMarioNPC(ctx, px, py) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Body (red shirt)
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        // Overalls (blue)
        ctx.fillStyle = '#049CD8';
        ctx.fillRect(px - 4, py + 2, 8, 4);
        // Head
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 3, py - 10, 6, 6);
        // Hat
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 4, py - 14, 8, 5);
        ctx.fillRect(px - 2, py - 15, 6, 2);
        // Hat M emblem
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 1, py - 13, 2, 3);
        // Mustache
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px - 3, py - 6, 6, 2);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 2, py - 9, 2, 2);
        ctx.fillRect(px + 1, py - 9, 2, 2);
        // Shoes
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px - 4, py + 5, 4, 2);
        ctx.fillRect(px + 1, py + 5, 4, 2);
    },

    _drawLuigiNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Body (green shirt)
        ctx.fillStyle = '#43B047';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        // Overalls (dark blue)
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(px - 4, py + 2, 8, 4);
        // Head (taller)
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 3, py - 12, 6, 8);
        // Hat
        ctx.fillStyle = '#43B047';
        ctx.fillRect(px - 4, py - 16, 8, 5);
        ctx.fillRect(px - 2, py - 17, 6, 2);
        // L emblem
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 1, py - 15, 2, 3);
        ctx.fillRect(px - 1, py - 13, 3, 1);
        // Mustache
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px - 3, py - 6, 6, 2);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 2, py - 10, 2, 2);
        ctx.fillRect(px + 1, py - 10, 2, 2);
        // Shoes
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px - 4, py + 5, 4, 2);
        ctx.fillRect(px + 1, py + 5, 4, 2);
    },

    _drawPeachNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Dress (pink)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(px - 5, py - 4, 10, 12);
        ctx.fillRect(px - 6, py + 2, 12, 6);
        // Dress detail
        ctx.fillStyle = '#FF1493';
        ctx.fillRect(px - 6, py + 4, 12, 2);
        // Head
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 3, py - 10, 6, 7);
        // Hair
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 4, py - 14, 8, 5);
        ctx.fillRect(px - 5, py - 10, 2, 8);
        ctx.fillRect(px + 3, py - 10, 2, 8);
        // Crown
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 3, py - 16, 6, 3);
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 1, py - 15, 2, 2);
        // Eyes
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(px - 2, py - 8, 2, 2);
        ctx.fillRect(px + 1, py - 8, 2, 2);
    },

    _drawToadetteNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Body (pink vest)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(px - 4, py - 3, 8, 8);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 2, py - 1, 4, 6);
        // Head
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 3, py - 9, 6, 6);
        // Mushroom cap (pink with white spots)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(px - 6, py - 15, 12, 7);
        ctx.fillRect(px - 4, py - 17, 8, 2);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 4, py - 14, 3, 3);
        ctx.fillRect(px + 2, py - 13, 3, 3);
        // Pigtails
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(px - 8, py - 12, 3, 5);
        ctx.fillRect(px + 6, py - 12, 3, 5);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 2, py - 7, 2, 2);
        ctx.fillRect(px + 1, py - 7, 2, 2);
        // Legs/shoes
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 3, py + 4, 3, 3);
        ctx.fillRect(px + 1, py + 4, 3, 3);
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(px - 3, py + 6, 3, 2);
        ctx.fillRect(px + 1, py + 6, 3, 2);
    },

    _drawYoshiNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Body (green, rounded)
        ctx.fillStyle = '#43B047';
        ctx.fillRect(px - 5, py - 4, 10, 10);
        // White belly
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 3, py - 2, 6, 6);
        // Head
        ctx.fillStyle = '#43B047';
        ctx.fillRect(px - 4, py - 12, 8, 8);
        // Snout (big nose)
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(px + 2, py - 10, 5, 5);
        // Eyes (big, white)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 3, py - 11, 4, 4);
        ctx.fillRect(px + 1, py - 11, 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 1, py - 10, 2, 2);
        ctx.fillRect(px + 3, py - 10, 2, 2);
        // Shell
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 4, py - 3, 8, 5);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 2, py - 2, 4, 3);
        // Boots
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(px - 5, py + 5, 4, 3);
        ctx.fillRect(px + 2, py + 5, 4, 3);
    },

    _drawDKNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 6, py + 8, 12, 3);
        // Body (brown, big)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px - 6, py - 6, 12, 14);
        // Chest
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(px - 4, py - 4, 8, 8);
        // Head
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px - 5, py - 14, 10, 9);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(px - 3, py - 12, 6, 5);
        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 3, py - 12, 3, 3);
        ctx.fillRect(px + 1, py - 12, 3, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 2, py - 11, 2, 2);
        ctx.fillRect(px + 2, py - 11, 2, 2);
        // Tie (red)
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 2, py - 4, 4, 6);
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 1, py - 3, 2, 2);
        // Arms
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px - 8, py - 4, 3, 8);
        ctx.fillRect(px + 6, py - 4, 3, 8);
    },

    _drawBowserNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px - 7, py + 8, 14, 3);
        // Body (large, green/yellow)
        ctx.fillStyle = '#43A047';
        ctx.fillRect(px - 7, py - 6, 14, 14);
        // Shell
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(px - 6, py - 4, 12, 8);
        ctx.fillStyle = '#1B5E20';
        // Shell spikes
        ctx.fillRect(px - 4, py - 6, 3, 3);
        ctx.fillRect(px, py - 7, 3, 3);
        ctx.fillRect(px + 4, py - 6, 3, 3);
        // Belly
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 4, py, 8, 6);
        // Head
        ctx.fillStyle = '#43A047';
        ctx.fillRect(px - 5, py - 14, 10, 9);
        // Horns
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 6, py - 18, 3, 5);
        ctx.fillRect(px + 4, py - 18, 3, 5);
        // Eyes (menacing)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 4, py - 12, 3, 3);
        ctx.fillRect(px + 2, py - 12, 3, 3);
        ctx.fillStyle = '#E52521';
        ctx.fillRect(px - 3, py - 11, 2, 2);
        ctx.fillRect(px + 3, py - 11, 2, 2);
        // Red hair/eyebrows
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(px - 5, py - 15, 10, 2);
        // Mouth
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(px - 3, py - 8, 6, 2);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(px - 2, py - 8, 1, 1);
        ctx.fillRect(px + 2, py - 8, 1, 1);
    },

    _drawWarioNPC(ctx, px, py) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px - 5, py + 6, 10, 3);
        // Body (yellow shirt, wide)
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 5, py - 4, 10, 8);
        // Overalls (purple)
        ctx.fillStyle = '#7B1FA2';
        ctx.fillRect(px - 5, py + 2, 10, 4);
        // Head (wide)
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 4, py - 10, 8, 7);
        // Hat (yellow)
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 5, py - 14, 10, 5);
        ctx.fillRect(px - 3, py - 15, 8, 2);
        // W emblem
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(px - 1, py - 13, 4, 3);
        // Big mustache (zigzag)
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(px - 4, py - 6, 8, 2);
        ctx.fillRect(px - 5, py - 7, 2, 2);
        ctx.fillRect(px + 4, py - 7, 2, 2);
        // Eyes (squinting)
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 3, py - 9, 3, 2);
        ctx.fillRect(px + 1, py - 9, 3, 2);
        // Shoes
        ctx.fillStyle = '#43A047';
        ctx.fillRect(px - 5, py + 5, 4, 2);
        ctx.fillRect(px + 2, py + 5, 4, 2);
    },

    // ==================== TOAD PLAYER SPRITE ====================

    _drawPlayer(ctx, state) {
        const px = Math.round(state.playerX);
        const py = Math.round(state.playerY);
        const dir = state.playerDir;
        const moving = state.isMoving;
        const frame = moving ? (this.animFrame % 4) : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px - 5, py + 5, 10, 3);

        // --- Accurate Toad Sprite (16x20px area) ---

        // MUSHROOM CAP -- white dome with red spots
        // Main cap shape (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 7, py - 17, 14, 9);
        ctx.fillRect(px - 6, py - 19, 12, 2);
        ctx.fillRect(px - 4, py - 20, 8, 2);
        // Cap bottom edge (slight shadow)
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(px - 7, py - 9, 14, 1);

        // Red spots on cap -- signature Toad look
        ctx.fillStyle = '#E52521';
        // Left spot
        ctx.fillRect(px - 6, py - 17, 4, 5);
        ctx.fillRect(px - 5, py - 18, 3, 1);
        // Right spot
        ctx.fillRect(px + 2, py - 17, 4, 5);
        ctx.fillRect(px + 3, py - 18, 3, 1);
        // Top center spot
        ctx.fillRect(px - 2, py - 20, 4, 4);
        ctx.fillRect(px - 1, py - 21, 2, 1);

        // FACE -- round peach/skin tone
        ctx.fillStyle = '#FFD8A0';
        ctx.fillRect(px - 4, py - 9, 8, 6);
        // Cheeks (rosy)
        ctx.fillStyle = '#FFB0A0';
        ctx.fillRect(px - 4, py - 5, 2, 2);
        ctx.fillRect(px + 3, py - 5, 2, 2);

        // EYES -- direction-dependent
        ctx.fillStyle = '#000000';
        if (dir === 'left') {
            ctx.fillRect(px - 3, py - 8, 2, 3);
            ctx.fillRect(px + 1, py - 8, 2, 3);
            // Pupils left-shifted
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px - 3, py - 8, 1, 1);
            ctx.fillRect(px + 1, py - 8, 1, 1);
        } else if (dir === 'right') {
            ctx.fillRect(px - 2, py - 8, 2, 3);
            ctx.fillRect(px + 2, py - 8, 2, 3);
            // Pupils right-shifted
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px - 1, py - 8, 1, 1);
            ctx.fillRect(px + 3, py - 8, 1, 1);
        } else if (dir === 'up') {
            // Looking up -- eyes higher, smaller
            ctx.fillRect(px - 3, py - 9, 2, 2);
            ctx.fillRect(px + 2, py - 9, 2, 2);
        } else {
            // Down (default)
            ctx.fillRect(px - 3, py - 8, 2, 3);
            ctx.fillRect(px + 2, py - 8, 2, 3);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px - 2, py - 8, 1, 1);
            ctx.fillRect(px + 3, py - 8, 1, 1);
        }

        // Small mouth
        ctx.fillStyle = '#C07060';
        if (dir !== 'up') {
            ctx.fillRect(px - 1, py - 4, 2, 1);
        }

        // BLUE VEST
        ctx.fillStyle = '#2070D8';
        ctx.fillRect(px - 5, py - 3, 10, 7);
        // Vest side panels (darker blue)
        ctx.fillStyle = '#1858B0';
        ctx.fillRect(px - 5, py - 3, 2, 7);
        ctx.fillRect(px + 3, py - 3, 2, 7);
        // Vest gold buttons
        ctx.fillStyle = '#FBD000';
        ctx.fillRect(px - 1, py - 2, 1, 1);
        ctx.fillRect(px - 1, py + 0, 1, 1);
        // White inner shirt
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 2, py - 2, 4, 5);

        // DIAPER-LIKE WHITE SHORTS
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 4, py + 4, 8, 3);
        // Subtle outline
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(px - 4, py + 4, 1, 3);
        ctx.fillRect(px + 3, py + 4, 1, 3);

        // LEGS + BROWN SHOES (walking animation)
        if (moving) {
            const legPhase = Math.sin(frame * Math.PI / 2);
            const leftOff = Math.round(legPhase * 2);
            const rightOff = Math.round(-legPhase * 2);

            // Left leg
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px - 3, py + 7, 3, 2 + Math.max(0, leftOff));
            // Left shoe
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(px - 4, py + 8 + Math.max(0, leftOff), 4, 3);
            ctx.fillStyle = '#6D3510';
            ctx.fillRect(px - 4, py + 10 + Math.max(0, leftOff), 4, 1);

            // Right leg
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px + 1, py + 7, 3, 2 + Math.max(0, rightOff));
            // Right shoe
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(px + 1, py + 8 + Math.max(0, rightOff), 4, 3);
            ctx.fillStyle = '#6D3510';
            ctx.fillRect(px + 1, py + 10 + Math.max(0, rightOff), 4, 1);
        } else {
            // Standing legs
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(px - 3, py + 7, 3, 2);
            ctx.fillRect(px + 1, py + 7, 3, 2);
            // Standing shoes
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(px - 4, py + 8, 4, 3);
            ctx.fillRect(px + 1, py + 8, 4, 3);
            // Shoe soles (darker)
            ctx.fillStyle = '#6D3510';
            ctx.fillRect(px - 4, py + 10, 4, 1);
            ctx.fillRect(px + 1, py + 10, 4, 1);
        }

        // ARMS -- skin tone hands extending from vest
        ctx.fillStyle = '#FFD8A0';
        if (moving) {
            const armPhase = Math.sin(frame * Math.PI / 2);
            // Opposite arm swing from legs
            ctx.fillRect(px - 7, py - 1 + Math.round(-armPhase * 2), 2, 4);
            ctx.fillRect(px + 5, py - 1 + Math.round(armPhase * 2), 2, 4);
        } else {
            // Idle arms with slight bob
            const bob = Math.sin(this.frameCount * 0.06) * 0.8;
            ctx.fillRect(px - 7, py - 1 + Math.round(bob), 2, 4);
            ctx.fillRect(px + 5, py - 1 + Math.round(bob), 2, 4);
        }
    },
};
