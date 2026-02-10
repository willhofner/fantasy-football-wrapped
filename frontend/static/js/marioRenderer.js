/* ===== MARIO WORLD RENDERER ===== */
/* Handles all canvas drawing: map, sprites, locations, paths, camera */

const MarioRenderer = {
    canvas: null,
    ctx: null,
    scale: 3,
    tileSize: 16,

    // Camera
    camera: { x: 0, y: 0 },
    cameraSmooth: { x: 0, y: 0 },

    // Map dimensions (in tiles)
    mapWidth: 120,
    mapHeight: 80,

    // Animation counters
    frameCount: 0,
    animFrame: 0,

    // Location definitions (pixel coords in tile space)
    locations: [
        { week: 1,  name: 'Mushroom Village',    x: 8,   y: 60, theme: 'village',    colors: { primary: '#43b047', secondary: '#2d8031', accent: '#8b4513', bg: '#1a5c1a' } },
        { week: 2,  name: 'Koopa Beach',         x: 22,  y: 55, theme: 'beach',      colors: { primary: '#049cd8', secondary: '#0370a0', accent: '#fbd000', bg: '#c2b280' } },
        { week: 3,  name: 'Piranha Plains',       x: 35,  y: 48, theme: 'plains',     colors: { primary: '#43b047', secondary: '#e52521', accent: '#2d8031', bg: '#3a7a20' } },
        { week: 4,  name: "Boo's Haunted House",  x: 48,  y: 42, theme: 'haunted',    colors: { primary: '#6b4c9a', secondary: '#4a2d6e', accent: '#aaaaaa', bg: '#2a1a3e' } },
        { week: 5,  name: 'Chain Chomp Canyon',   x: 60,  y: 50, theme: 'canyon',     colors: { primary: '#8b6914', secondary: '#6b4914', accent: '#555555', bg: '#5a4a2a' } },
        { week: 6,  name: 'Shy Guy Falls',        x: 72,  y: 44, theme: 'waterfall',  colors: { primary: '#049cd8', secondary: '#ffffff', accent: '#e52521', bg: '#1a4a6a' } },
        { week: 7,  name: 'Bob-omb Battlefield',  x: 84,  y: 38, theme: 'battlefield',colors: { primary: '#2d5a1a', secondary: '#4a7a2a', accent: '#e52521', bg: '#1a3a0a' } },
        { week: 8,  name: 'Lakitu Cloud Palace',  x: 95,  y: 30, theme: 'cloud',      colors: { primary: '#87ceeb', secondary: '#ffffff', accent: '#fbd000', bg: '#4a8ab5' } },
        { week: 9,  name: 'Dry Bones Desert',     x: 84,  y: 22, theme: 'desert',     colors: { primary: '#d4a84b', secondary: '#c29836', accent: '#e8d8a0', bg: '#9a7a3a' } },
        { week: 10, name: 'Thwomp Fortress',      x: 72,  y: 16, theme: 'fortress',   colors: { primary: '#555555', secondary: '#333333', accent: '#888888', bg: '#2a2a2a' } },
        { week: 11, name: "Luigi's Mansion",      x: 58,  y: 20, theme: 'mansion',    colors: { primary: '#43b047', secondary: '#6b4c9a', accent: '#fbd000', bg: '#1a2a1a' } },
        { week: 12, name: "Daisy's Garden",       x: 44,  y: 14, theme: 'garden',     colors: { primary: '#ff69b4', secondary: '#fbd000', accent: '#43b047', bg: '#2a4a2a' } },
        { week: 13, name: "Wario's Gold Mine",    x: 30,  y: 20, theme: 'mine',       colors: { primary: '#fbd000', secondary: '#8b6914', accent: '#d4a84b', bg: '#3a2a0a' } },
        { week: 14, name: "Bowser's Castle",      x: 16,  y: 12, theme: 'castle',     colors: { primary: '#e52521', secondary: '#1a1a1a', accent: '#ff6600', bg: '#2a0a0a' } },
    ],

    // Path segments connecting locations (indices into locations array)
    paths: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
        [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13]
    ],

    /** Initialize the renderer */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    /** Resize canvas to fill viewport */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        // We render at a lower resolution then scale up for pixel art look
        this.scale = Math.max(2, Math.min(4, Math.floor(Math.min(w, h) / 320)));
        this.canvas.width = Math.floor(w / this.scale);
        this.canvas.height = Math.floor(h / this.scale);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.imageSmoothingEnabled = false;
    },

    /** Get pixel position from tile coords */
    tileToPixel(tx, ty) {
        return { x: tx * this.tileSize, y: ty * this.tileSize };
    },

    /** Get location by week */
    getLocation(week) {
        return this.locations.find(l => l.week === week);
    },

    /** Get pixel center of a location */
    getLocationCenter(week) {
        const loc = this.getLocation(week);
        if (!loc) return { x: 0, y: 0 };
        return this.tileToPixel(loc.x, loc.y);
    },

    /** Generate path waypoints between two locations */
    getPathPoints(fromWeek, toWeek) {
        const a = this.getLocationCenter(fromWeek);
        const b = this.getLocationCenter(toWeek);
        const points = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            points.push({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t
            });
        }
        return points;
    },

    /** Find nearest path point and snap player to path */
    getNearestPathPoint(px, py) {
        let best = null;
        let bestDist = Infinity;

        for (const [ai, bi] of this.paths) {
            const a = this.getLocationCenter(this.locations[ai].week);
            const b = this.getLocationCenter(this.locations[bi].week);

            // Project point onto line segment
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;
            let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const cx = a.x + t * dx;
            const cy = a.y + t * dy;
            const dist = Math.hypot(px - cx, py - cy);
            if (dist < bestDist) {
                bestDist = dist;
                best = { x: cx, y: cy, dist };
            }
        }

        // Also check proximity to location centers
        for (const loc of this.locations) {
            const c = this.tileToPixel(loc.x, loc.y);
            const dist = Math.hypot(px - c.x, py - c.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { x: c.x, y: c.y, dist };
            }
        }

        return best;
    },

    /** Check if player is near a location, return the week or null */
    getLocationAt(px, py, threshold) {
        threshold = threshold || (this.tileSize * 1.5);
        for (const loc of this.locations) {
            const c = this.tileToPixel(loc.x, loc.y);
            if (Math.hypot(px - c.x, py - c.y) < threshold) {
                return loc.week;
            }
        }
        return null;
    },

    /** Update camera to follow target */
    updateCamera(targetX, targetY) {
        const viewW = this.canvas.width;
        const viewH = this.canvas.height;
        this.camera.x = targetX - viewW / 2;
        this.camera.y = targetY - viewH / 2;

        // Clamp
        const maxX = this.mapWidth * this.tileSize - viewW;
        const maxY = this.mapHeight * this.tileSize - viewH;
        this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));

        // Smooth
        this.cameraSmooth.x += (this.camera.x - this.cameraSmooth.x) * 0.12;
        this.cameraSmooth.y += (this.camera.y - this.cameraSmooth.y) * 0.12;
    },

    /** Main render call */
    render(state) {
        this.frameCount++;
        if (this.frameCount % 8 === 0) this.animFrame++;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        // Save and translate for camera
        ctx.save();
        ctx.translate(-Math.round(this.cameraSmooth.x), -Math.round(this.cameraSmooth.y));

        this.drawSky(ctx, cw, ch);
        this.drawTerrain(ctx, cw, ch);
        this.drawPaths(ctx);
        this.drawLocations(ctx, state);
        this.drawPlayer(ctx, state);

        ctx.restore();
    },

    // ========== DRAWING METHODS ==========

    /** Draw sky gradient background */
    drawSky(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        // Sky gradient
        const grad = ctx.createLinearGradient(sx, sy, sx, sy + ch);
        grad.addColorStop(0, '#1a0a3e');
        grad.addColorStop(0.4, '#0d2b5e');
        grad.addColorStop(0.7, '#1a4a2a');
        grad.addColorStop(1, '#0a2a0a');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, sy, cw, ch);

        // Stars
        const starSeed = 12345;
        for (let i = 0; i < 100; i++) {
            const hash = (i * 7919 + starSeed) % 10000;
            const stx = (hash % this.mapWidth) * this.tileSize;
            const sty = ((hash * 3) % (this.mapHeight * 0.5)) * this.tileSize;
            // Only draw if in view
            if (stx >= sx - 10 && stx <= sx + cw + 10 && sty >= sy - 10 && sty <= sy + ch + 10) {
                const twinkle = Math.sin(this.frameCount * 0.05 + i) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
                const size = (hash % 3 === 0) ? 2 : 1;
                ctx.fillRect(Math.round(stx), Math.round(sty), size, size);
            }
        }
    },

    /** Draw ground/terrain tiles */
    drawTerrain(ctx, cw, ch) {
        const sx = Math.round(this.cameraSmooth.x);
        const sy = Math.round(this.cameraSmooth.y);
        const ts = this.tileSize;

        const startTX = Math.max(0, Math.floor(sx / ts) - 1);
        const startTY = Math.max(0, Math.floor(sy / ts) - 1);
        const endTX = Math.min(this.mapWidth, Math.ceil((sx + cw) / ts) + 1);
        const endTY = Math.min(this.mapHeight, Math.ceil((sy + ch) / ts) + 1);

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const px = tx * ts;
                const py = ty * ts;

                // Ground layer - different biomes based on position
                const biome = this._getBiome(tx, ty);
                ctx.fillStyle = biome;
                ctx.fillRect(px, py, ts, ts);

                // Add subtle noise pattern
                if ((tx + ty) % 3 === 0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.05)';
                    ctx.fillRect(px, py, ts, ts);
                }

                // Grass tufts on some tiles
                if (ty > this.mapHeight * 0.35 && (tx * 7 + ty * 13) % 11 === 0) {
                    ctx.fillStyle = '#2a7a2a';
                    ctx.fillRect(px + 2, py + ts - 4, 2, 4);
                    ctx.fillRect(px + 6, py + ts - 3, 2, 3);
                    ctx.fillRect(px + 10, py + ts - 5, 2, 5);
                }

                // Small rocks in canyon/desert areas
                if (ty < this.mapHeight * 0.35 && (tx * 11 + ty * 7) % 17 === 0) {
                    ctx.fillStyle = '#555';
                    ctx.fillRect(px + 4, py + 8, 6, 4);
                    ctx.fillRect(px + 5, py + 6, 4, 2);
                }
            }
        }

        // Draw some trees scattered around
        this._drawDecorativeTrees(ctx, sx, sy, cw, ch);
    },

    /** Get biome color for a tile position */
    _getBiome(tx, ty) {
        // Vertical bands for different areas
        const normalY = ty / this.mapHeight;
        const normalX = tx / this.mapWidth;

        // Upper region: more barren/dark
        if (normalY < 0.25) {
            const v = ((tx * 3 + ty * 5) % 7) / 7;
            return v < 0.5 ? '#1a1a1a' : '#222222';
        }
        // Mid region: mixed terrain
        if (normalY < 0.5) {
            // Near the right side: sky/cloud area
            if (normalX > 0.7 && normalY < 0.4) {
                return '#1a3a5a';
            }
            const v = ((tx * 3 + ty * 5) % 5) / 5;
            return v < 0.3 ? '#1a3a1a' : v < 0.6 ? '#2a4a2a' : '#1a4a1a';
        }
        // Lower region: lush green
        const v = ((tx * 3 + ty * 5) % 7) / 7;
        if (normalY > 0.7) {
            // Beach area bottom-left quadrant
            if (normalX < 0.35 && normalY > 0.65) {
                return v < 0.5 ? '#2a6a2a' : '#3a7a3a';
            }
            return v < 0.3 ? '#1a5a1a' : v < 0.6 ? '#2a6a2a' : '#1a4a1a';
        }
        return v < 0.3 ? '#1a4a1a' : v < 0.6 ? '#2a5a2a' : '#1a3a1a';
    },

    /** Draw decorative trees */
    _drawDecorativeTrees(ctx, sx, sy, cw, ch) {
        const ts = this.tileSize;
        // Deterministic tree positions based on a hash
        for (let i = 0; i < 200; i++) {
            const hash = (i * 9973 + 4231);
            const tx = (hash % this.mapWidth);
            const ty = (Math.floor(hash / this.mapWidth) % this.mapHeight);
            const px = tx * ts;
            const py = ty * ts;

            // Skip if off-screen
            if (px < sx - 20 || px > sx + cw + 20 || py < sy - 30 || py > sy + ch + 20) continue;

            // Skip if too close to any location
            let tooClose = false;
            for (const loc of this.locations) {
                const lx = loc.x * ts;
                const ly = loc.y * ts;
                if (Math.abs(px - lx) < ts * 4 && Math.abs(py - ly) < ts * 4) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            // Skip if too close to any path
            let nearPath = false;
            for (const [ai, bi] of this.paths) {
                const a = this.tileToPixel(this.locations[ai].x, this.locations[ai].y);
                const b = this.tileToPixel(this.locations[bi].x, this.locations[bi].y);
                const dist = this._pointToSegmentDist(px, py, a.x, a.y, b.x, b.y);
                if (dist < ts * 2) {
                    nearPath = true;
                    break;
                }
            }
            if (nearPath) continue;

            const treeType = hash % 3;
            if (treeType === 0) {
                // Pine tree
                ctx.fillStyle = '#0a3a0a';
                ctx.fillRect(px + 6, py - 12, 4, 12);
                ctx.fillStyle = '#1a6a1a';
                this._drawTriangle(ctx, px + 8, py - 22, 12, 14);
                ctx.fillStyle = '#2a8a2a';
                this._drawTriangle(ctx, px + 8, py - 18, 10, 10);
            } else if (treeType === 1) {
                // Round tree
                ctx.fillStyle = '#5a3a1a';
                ctx.fillRect(px + 6, py - 6, 3, 8);
                ctx.fillStyle = '#2a7a2a';
                ctx.fillRect(px + 2, py - 14, 12, 10);
                ctx.fillRect(px + 4, py - 16, 8, 2);
            } else {
                // Bush
                ctx.fillStyle = '#1a5a1a';
                ctx.fillRect(px + 2, py - 4, 10, 6);
                ctx.fillStyle = '#2a6a2a';
                ctx.fillRect(px + 4, py - 6, 6, 2);
            }
        }
    },

    _drawTriangle(ctx, cx, top, width, height) {
        const half = width / 2;
        ctx.beginPath();
        ctx.moveTo(cx, top);
        ctx.lineTo(cx - half, top + height);
        ctx.lineTo(cx + half, top + height);
        ctx.closePath();
        ctx.fill();
    },

    _pointToSegmentDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - ax, py - ay);
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    },

    /** Draw paths between locations */
    drawPaths(ctx) {
        const ts = this.tileSize;
        for (const [ai, bi] of this.paths) {
            const a = this.tileToPixel(this.locations[ai].x, this.locations[ai].y);
            const b = this.tileToPixel(this.locations[bi].x, this.locations[bi].y);

            // Draw dotted path
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            const steps = Math.floor(len / 6);
            const nx = dx / len;
            const ny = dy / len;

            for (let i = 0; i < steps; i++) {
                if (i % 2 === 0) {
                    const px = a.x + nx * i * 6;
                    const py = a.y + ny * i * 6;
                    ctx.fillStyle = 'rgba(210, 180, 120, 0.6)';
                    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
                }
            }

            // Path border dots (lighter)
            for (let i = 0; i < steps; i++) {
                if (i % 4 === 0) {
                    const px = a.x + nx * i * 6 + ny * 4;
                    const py = a.y + ny * i * 6 - nx * 4;
                    ctx.fillStyle = 'rgba(180, 150, 90, 0.3)';
                    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);

                    const px2 = a.x + nx * i * 6 - ny * 4;
                    const py2 = a.y + ny * i * 6 + nx * 4;
                    ctx.fillRect(Math.round(px2), Math.round(py2), 2, 2);
                }
            }
        }
    },

    /** Draw all location markers */
    drawLocations(ctx, state) {
        const ts = this.tileSize;
        for (const loc of this.locations) {
            const px = loc.x * ts;
            const py = loc.y * ts;
            const result = state.weekResults[loc.week];
            const isNear = state.nearLocation === loc.week;

            // Glow effect when near
            if (isNear) {
                const pulse = Math.sin(this.frameCount * 0.08) * 0.2 + 0.4;
                ctx.fillStyle = `rgba(251, 208, 0, ${pulse})`;
                ctx.fillRect(px - 18, py - 26, 36, 40);
            }

            // Draw themed building
            this._drawLocationBuilding(ctx, loc, px, py);

            // Week number label
            ctx.fillStyle = '#000';
            ctx.fillRect(px - 10, py + 12, 20, 10);
            ctx.fillStyle = isNear ? '#fbd000' : '#ffffff';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('W' + loc.week, px, py + 20);

            // W/L indicator
            if (result) {
                const indicatorColor = result.won ? '#43b047' : '#e52521';
                const indicatorText = result.won ? 'W' : 'L';
                ctx.fillStyle = indicatorColor;
                ctx.fillRect(px + 10, py - 22, 10, 10);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 7px monospace';
                ctx.fillText(indicatorText, px + 15, py - 14);
            }
        }
    },

    /** Draw a themed building for each location */
    _drawLocationBuilding(ctx, loc, px, py) {
        const c = loc.colors;
        switch (loc.theme) {
            case 'village':
                // Mushroom house
                ctx.fillStyle = '#f5f5f0';
                ctx.fillRect(px - 8, py - 8, 16, 14);
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 12, py - 18, 24, 12);
                ctx.fillStyle = '#fff';
                ctx.fillRect(px - 6, py - 16, 4, 4);
                ctx.fillRect(px + 4, py - 14, 3, 3);
                // Door
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 3, py - 2, 6, 8);
                break;

            case 'beach':
                // Beach hut with palm
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 10, py - 16, 20, 6);
                ctx.fillStyle = '#d4a84b';
                ctx.fillRect(px - 7, py - 10, 14, 16);
                // Palm tree
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(px + 12, py - 20, 3, 22);
                ctx.fillStyle = '#2a8a2a';
                ctx.fillRect(px + 8, py - 24, 12, 4);
                ctx.fillRect(px + 6, py - 22, 4, 3);
                // Water
                ctx.fillStyle = 'rgba(4, 156, 216, 0.4)';
                ctx.fillRect(px - 14, py + 2, 28, 4);
                break;

            case 'plains':
                // Green house with pipe
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 8, py - 12, 16, 18);
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 10, py - 16, 20, 6);
                // Piranha pipe
                ctx.fillStyle = '#1a8a1a';
                ctx.fillRect(px + 10, py - 14, 8, 20);
                ctx.fillStyle = '#2aaa2a';
                ctx.fillRect(px + 8, py - 16, 12, 4);
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px + 12, py - 20, 4, 6);
                break;

            case 'haunted':
                // Haunted house
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 10, py - 14, 20, 20);
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 12, py - 20, 24, 8);
                // Peaked roof
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 4, py - 24, 8, 6);
                // Windows (eyes)
                ctx.fillStyle = '#ffff44';
                ctx.fillRect(px - 6, py - 8, 4, 4);
                ctx.fillRect(px + 3, py - 8, 4, 4);
                // Ghost
                const ghostY = Math.sin(this.frameCount * 0.06) * 3;
                ctx.fillStyle = 'rgba(200, 200, 220, 0.5)';
                ctx.fillRect(px - 16, py - 10 + ghostY, 6, 8);
                ctx.fillRect(px - 17, py - 6 + ghostY, 2, 2);
                ctx.fillRect(px - 11, py - 6 + ghostY, 2, 2);
                break;

            case 'canyon':
                // Rocky canyon walls
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 12, py - 16, 8, 22);
                ctx.fillRect(px + 4, py - 20, 8, 26);
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 10, py - 18, 6, 4);
                ctx.fillRect(px + 5, py - 22, 6, 4);
                // Bridge
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(px - 6, py - 6, 12, 3);
                // Chain chomp
                ctx.fillStyle = '#222';
                ctx.fillRect(px - 2, py - 14, 6, 6);
                ctx.fillStyle = '#fff';
                ctx.fillRect(px, py - 12, 2, 2);
                break;

            case 'waterfall':
                // Waterfall cliff
                ctx.fillStyle = '#555';
                ctx.fillRect(px - 8, py - 18, 16, 24);
                ctx.fillStyle = c.primary;
                // Flowing water animation
                const waterOffset = (this.frameCount % 8) * 1;
                for (let wy = 0; wy < 20; wy += 4) {
                    ctx.fillStyle = (wy + waterOffset) % 8 < 4 ? '#049cd8' : '#5ac8f5';
                    ctx.fillRect(px - 2, py - 16 + wy, 4, 4);
                }
                // Shy Guy
                ctx.fillStyle = c.accent;
                ctx.fillRect(px + 10, py - 8, 6, 8);
                ctx.fillStyle = '#fff';
                ctx.fillRect(px + 10, py - 6, 6, 3);
                break;

            case 'battlefield':
                // Military bunker
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 10, py - 10, 20, 16);
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 12, py - 12, 24, 4);
                // Flag
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(px + 10, py - 22, 2, 20);
                ctx.fillStyle = c.accent;
                ctx.fillRect(px + 12, py - 22, 8, 6);
                // Sandbags
                ctx.fillStyle = '#b8a050';
                ctx.fillRect(px - 14, py - 2, 6, 4);
                ctx.fillRect(px - 12, py - 6, 6, 4);
                break;

            case 'cloud':
                // Cloud platform
                ctx.fillStyle = '#fff';
                ctx.fillRect(px - 14, py - 6, 28, 8);
                ctx.fillRect(px - 10, py - 10, 20, 4);
                ctx.fillRect(px - 6, py - 12, 12, 4);
                // Palace on cloud
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 6, py - 20, 12, 10);
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 2, py - 24, 4, 6);
                // Lakitu
                const lakY = Math.sin(this.frameCount * 0.04 + 1) * 2;
                ctx.fillStyle = '#fff';
                ctx.fillRect(px + 10, py - 20 + lakY, 8, 4);
                ctx.fillStyle = '#43b047';
                ctx.fillRect(px + 12, py - 24 + lakY, 4, 6);
                break;

            case 'desert':
                // Pyramid
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 2, py - 20, 4, 4);
                ctx.fillRect(px - 5, py - 16, 10, 4);
                ctx.fillRect(px - 8, py - 12, 16, 4);
                ctx.fillRect(px - 11, py - 8, 22, 4);
                ctx.fillRect(px - 14, py - 4, 28, 10);
                // Door
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(px - 3, py - 4, 6, 8);
                // Bones
                ctx.fillStyle = '#ddd';
                ctx.fillRect(px + 14, py - 2, 6, 2);
                ctx.fillRect(px + 16, py - 4, 2, 6);
                break;

            case 'fortress':
                // Stone fortress
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 12, py - 16, 24, 22);
                // Battlements
                ctx.fillStyle = c.secondary;
                for (let bx = -12; bx < 12; bx += 6) {
                    ctx.fillRect(px + bx, py - 20, 4, 4);
                }
                // Thwomp face
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 4, py - 10, 3, 3);
                ctx.fillRect(px + 2, py - 10, 3, 3);
                ctx.fillStyle = '#333';
                ctx.fillRect(px - 4, py - 4, 8, 2);
                // Gate
                ctx.fillStyle = '#222';
                ctx.fillRect(px - 4, py, 8, 6);
                break;

            case 'mansion':
                // Luigi's Mansion
                ctx.fillStyle = '#2a3a2a';
                ctx.fillRect(px - 10, py - 18, 20, 24);
                ctx.fillStyle = c.primary;
                ctx.fillRect(px - 12, py - 22, 24, 6);
                // Windows
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 6, py - 12, 4, 5);
                ctx.fillRect(px + 3, py - 12, 4, 5);
                // Door
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 3, py - 2, 6, 8);
                // Tower
                ctx.fillStyle = '#2a3a2a';
                ctx.fillRect(px + 6, py - 28, 6, 12);
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px + 5, py - 30, 8, 4);
                break;

            case 'garden':
                // Garden gazebo
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 10, py - 14, 20, 4);
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(px - 8, py - 10, 3, 16);
                ctx.fillRect(px + 5, py - 10, 3, 16);
                // Flowers
                const flowers = [[-14, -2], [-12, 2], [12, -4], [14, 0], [10, 4], [-10, 4]];
                flowers.forEach(([fx, fy]) => {
                    ctx.fillStyle = c.primary;
                    ctx.fillRect(px + fx, py + fy, 3, 3);
                    ctx.fillStyle = c.accent;
                    ctx.fillRect(px + fx + 1, py + fy - 4, 1, 4);
                });
                // Crown
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 4, py - 20, 8, 4);
                ctx.fillRect(px - 2, py - 22, 2, 2);
                ctx.fillRect(px + 2, py - 22, 2, 2);
                break;

            case 'mine':
                // Mine entrance
                ctx.fillStyle = c.secondary;
                ctx.fillRect(px - 10, py - 14, 20, 20);
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(px - 6, py - 8, 12, 14);
                // Minecart track
                ctx.fillStyle = '#888';
                ctx.fillRect(px - 14, py + 2, 28, 2);
                // Gold sparkles
                const goldPositions = [[-8, -10], [6, -12], [-4, -16], [8, -6]];
                goldPositions.forEach(([gx, gy], i) => {
                    if ((this.frameCount + i * 7) % 20 < 10) {
                        ctx.fillStyle = c.primary;
                        ctx.fillRect(px + gx, py + gy, 2, 2);
                    }
                });
                // Support beams
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 7, py - 10, 2, 14);
                ctx.fillRect(px + 5, py - 10, 2, 14);
                ctx.fillRect(px - 7, py - 10, 14, 2);
                break;

            case 'castle':
                // Bowser's Castle
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(px - 14, py - 18, 28, 24);
                ctx.fillStyle = c.primary;
                // Towers
                ctx.fillRect(px - 16, py - 26, 8, 14);
                ctx.fillRect(px + 8, py - 26, 8, 14);
                // Battlements
                ctx.fillRect(px - 16, py - 28, 4, 4);
                ctx.fillRect(px - 8, py - 28, 4, 4);
                ctx.fillRect(px + 4, py - 28, 4, 4);
                ctx.fillRect(px + 12, py - 28, 4, 4);
                // Lava
                const lavaOffset = this.frameCount % 6;
                for (let lx = -14; lx < 14; lx += 4) {
                    ctx.fillStyle = (lx + lavaOffset) % 8 < 4 ? '#ff4400' : '#ff6600';
                    ctx.fillRect(px + lx, py + 4, 4, 3);
                }
                // Bowser emblem
                ctx.fillStyle = c.accent;
                ctx.fillRect(px - 3, py - 14, 6, 6);
                ctx.fillStyle = '#000';
                ctx.fillRect(px - 1, py - 12, 2, 2);
                // Gate
                ctx.fillStyle = '#2a0a0a';
                ctx.fillRect(px - 4, py - 4, 8, 10);
                ctx.fillStyle = '#888';
                ctx.fillRect(px - 5, py - 2, 1, 6);
                ctx.fillRect(px + 4, py - 2, 1, 6);
                break;
        }
    },

    /** Draw Toad character */
    drawPlayer(ctx, state) {
        const px = Math.round(state.playerX);
        const py = Math.round(state.playerY);
        const dir = state.playerDir;
        const moving = state.isMoving;
        const frame = moving ? (this.animFrame % 4) : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px - 5, py + 4, 10, 3);

        // --- Toad sprite (roughly 16x20 pixels) ---

        // Body (blue vest)
        ctx.fillStyle = '#2070d8';
        ctx.fillRect(px - 5, py - 4, 10, 10);

        // White shirt under vest
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 3, py - 2, 6, 8);

        // Vest details
        ctx.fillStyle = '#1858b0';
        ctx.fillRect(px - 5, py - 4, 2, 10);
        ctx.fillRect(px + 3, py - 4, 2, 10);

        // Legs (walking animation)
        ctx.fillStyle = '#ffffff';
        if (moving) {
            const legOffset = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 3, py + 6, 3, 4 + Math.round(legOffset));
            ctx.fillRect(px + 1, py + 6, 3, 4 - Math.round(legOffset));
        } else {
            ctx.fillRect(px - 3, py + 6, 3, 4);
            ctx.fillRect(px + 1, py + 6, 3, 4);
        }

        // Shoes
        ctx.fillStyle = '#8b4513';
        if (moving) {
            const shoeOff = Math.sin(frame * Math.PI / 2) * 2;
            ctx.fillRect(px - 4, py + 9 + Math.round(shoeOff), 4, 2);
            ctx.fillRect(px + 1, py + 9 - Math.round(shoeOff), 4, 2);
        } else {
            ctx.fillRect(px - 4, py + 9, 4, 2);
            ctx.fillRect(px + 1, py + 9, 4, 2);
        }

        // Head (skin)
        ctx.fillStyle = '#ffd8a0';
        ctx.fillRect(px - 4, py - 10, 8, 7);

        // Eyes
        ctx.fillStyle = '#000000';
        if (dir === 'left') {
            ctx.fillRect(px - 3, py - 8, 2, 2);
            ctx.fillRect(px, py - 8, 2, 2);
        } else if (dir === 'right') {
            ctx.fillRect(px, py - 8, 2, 2);
            ctx.fillRect(px + 3, py - 8, 2, 2);
        } else {
            ctx.fillRect(px - 3, py - 8, 2, 2);
            ctx.fillRect(px + 2, py - 8, 2, 2);
        }

        // Mushroom cap
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 7, py - 16, 14, 8);
        ctx.fillRect(px - 5, py - 18, 10, 2);

        // Red spots on cap
        ctx.fillStyle = '#e52521';
        ctx.fillRect(px - 5, py - 16, 4, 4);
        ctx.fillRect(px + 2, py - 16, 4, 4);
        ctx.fillRect(px - 1, py - 18, 3, 3);

        // Arms (small, waving when idle)
        ctx.fillStyle = '#ffd8a0';
        if (moving) {
            if (dir === 'left') {
                ctx.fillRect(px - 7, py - 2, 2, 4);
                ctx.fillRect(px + 5, py, 2, 4);
            } else if (dir === 'right') {
                ctx.fillRect(px - 7, py, 2, 4);
                ctx.fillRect(px + 5, py - 2, 2, 4);
            } else {
                const armBob = Math.sin(frame * Math.PI / 2) * 1;
                ctx.fillRect(px - 7, py - 1 + Math.round(armBob), 2, 4);
                ctx.fillRect(px + 5, py - 1 - Math.round(armBob), 2, 4);
            }
        } else {
            // Idle - slight bounce
            const idleBob = Math.sin(this.frameCount * 0.06) * 0.5;
            ctx.fillRect(px - 7, py - 1 + Math.round(idleBob), 2, 4);
            ctx.fillRect(px + 5, py - 1 + Math.round(idleBob), 2, 4);
        }
    }
};
