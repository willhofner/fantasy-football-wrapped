// X's and O's: replays a touchdown on the tracker's mini field (offense moving right, goal line at `goal`).
// The shape comes from ESPN's play text (run or pass, left / middle / right, short / deep, shotgun),
// so a "J.Love pass deep left" really is a deep ball down the left side. Players are cartoon-placed, not tracked.
// Used by parlay.html: PlayAnim.play(svg). Everything is SVG transforms on ~25 nodes, one rAF loop per play.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const MID = 55, TOP = 20, BOT = 90;           // sideline to sideline; the offense's left is the top of the field
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = k => k * k * (3 - 2 * k);
  // waypoints [t, x, y]; straight lines between them, eased within each leg so cuts look like cuts
  function at(path, t) {
    if (t <= path[0][0]) return [path[0][1], path[0][2]];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (t <= b[0]) { const k = (t - a[0]) / (b[0] - a[0] || 1), e = b[3] === 'e' ? smooth(k) : k; return [lerp(a[1], b[1], e), lerp(a[2], b[2], e)]; }
    }
    const z = path[path.length - 1]; return [z[1], z[2]];
  }
  // a stable per-play choice for older plays that only know run / catch and the yardage
  const pick = (seed, arr) => arr[Math.abs(seed) % arr.length];

  function shape(td) {
    const p = Object.assign({}, td.play || {});
    const seed = (td.yds || 1) * 7 + String(td.clock || '').length * 3 + parseInt(String(td.q || '').replace(/\D/g, '') || '1', 10);
    if (!p.kind) p.kind = /catch|pass/i.test(td.how || '') ? 'pass' : 'run';
    if (p.kind === 'pass') {
      if (!p.dir) p.dir = pick(seed, ['left', 'right', 'middle', 'left', 'right']);
      if (!p.depth) p.depth = td.yds >= 20 ? 'deep' : 'short';
    } else if (p.kind === 'run') {
      if (!p.dir) p.dir = pick(seed, ['middle', 'left', 'right']);
      if (!p.gap) p.gap = p.dir === 'middle' ? 'middle' : pick(seed >> 1, ['tackle', 'end', 'guard']);
    }
    p.qbIsOurs = /TD pass/i.test(td.how || '');
    return p;
  }

  // Build every player's route. s = line of scrimmage, goal = goal line x, Y = px per yard downfield.
  function script(td, s, goal, Y) {
    const p = shape(td), yd = clamp(Y, 3, 8);           // formation spacing doesn't zoom as hard as the field
    const back = v => Math.max(6, s - v * yd);           // behind the line, kept on the field
    const dirY = p.dir === 'left' ? -1 : p.dir === 'right' ? 1 : 0;
    const EZ = goal + 14, snap = .16;
    const off = [], def = [];
    // --- offense: line, TE, three receivers, QB, RB ---
    const ol = [-12, -6, 0, 6, 12].map(dy => ({ y: MID + dy, x: back(.6) }));
    ol.forEach(o => off.push({ path: [[0, o.x, o.y], [snap, o.x, o.y], [.38, o.x + yd * .9, o.y, 'e'], [1, o.x + yd * 1.4, o.y + (Math.random() - .5) * 3]] }));
    const te = { x: back(.6), y: MID + 19 }, wl = { x: back(.4), y: TOP + 2 }, wr = { x: back(.4), y: BOT - 2 }, sl = { x: back(1.2), y: TOP + 15 };
    const qb0 = { x: back(p.gun ? 5 : 1.2), y: MID }, rb0 = { x: back(p.gun ? 5 : 6.5), y: p.gun ? MID + 7 : MID };
    const go = (o, dy) => [[0, o.x, o.y], [snap, o.x, o.y], [.85, Math.min(goal + 40, o.x + yd * 14), o.y + dy]];
    let carrier, ball = [], flight = null, qbPath, rbPath, ours;

    if (p.kind === 'pass') {
      const deep = p.depth === 'deep', dropX = qb0.x - yd * (p.gun ? 1.6 : 4.5);
      const tThrow = deep ? .46 : .38;
      // where it's caught: short TDs in the end zone, long ones at the depth of the throw then a run in
      const air = deep ? Math.min(td.yds, Math.max(14, td.yds * .75)) : Math.min(td.yds, 9);
      const catchX = td.yds <= (deep ? 25 : 12) ? goal + (deep ? 16 : 9) : s + air * Y;
      const catchY = dirY < 0 ? (deep ? TOP + 2 : TOP + 10) : dirY > 0 ? (deep ? BOT - 2 : BOT - 10) : MID + (deep ? -6 : -3);
      const tCatch = clamp(tThrow + .1 + Math.abs(catchX - (dropX)) / 260 * .28, tThrow + .12, .78);
      const tgt = dirY < 0 ? (deep ? wl : sl) : dirY > 0 ? (deep ? wr : te) : (deep ? sl : te);
      // the target's route: stem upfield, break toward the catch point, finish into the end zone
      const stemX = Math.min(catchX - yd * 2, tgt.x + yd * (deep ? 8 : 3));
      const route = [[0, tgt.x, tgt.y], [snap, tgt.x, tgt.y], [lerp(snap, tCatch, .55), stemX, lerp(tgt.y, catchY, .35)], [tCatch, catchX, catchY]];
      if (catchX < EZ) route.push([.96, EZ + 2, clamp(catchY + dirY * 4, TOP, BOT)]); else route.push([.96, catchX + 4, catchY]);
      qbPath = [[0, qb0.x, qb0.y], [snap, qb0.x, qb0.y], [tThrow - .04, dropX, MID, 'e'], [1, dropX + yd, MID]];
      rbPath = [[0, rb0.x, rb0.y], [snap, rb0.x, rb0.y], [.4, qb0.x + yd, MID + 9, 'e'], [1, qb0.x + yd * 1.5, MID + 9]];
      off.push({ path: qbPath, role: 'qb' }, { path: rbPath });
      [te, wl, wr, sl].forEach(o => off.push(o === tgt ? { path: route, role: 'tgt' } : { path: o === te ? [[0, te.x, te.y], [snap, te.x, te.y], [.5, te.x + yd * 4, te.y + 6], [1, te.x + yd * 7, te.y + 10]] : go(o, o.y < MID ? 4 : -4) }));
      carrier = route;
      flight = { from: tThrow, to: tCatch };
      ball = t => t < tThrow ? at(qbPath, t) : t < tCatch ? (() => { const a = at(qbPath, tThrow), b = at(route, tCatch), k = (t - tThrow) / (tCatch - tThrow); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; })() : at(route, t);
      ours = p.qbIsOurs ? 'qb' : 'tgt';
    } else {
      // runs: handoff (or the QB keeps it), hit the named gap, then to the house
      const scramble = p.kind === 'run' && p.scramble;
      const hole = MID + dirY * ({ middle: 0, guard: 6, tackle: 12, end: 24 }[p.gap] || 0);
      const tHand = .3;
      if (scramble) {
        qbPath = [[0, qb0.x, qb0.y], [snap, qb0.x, qb0.y], [.34, qb0.x - yd * 2, MID, 'e'], [.48, qb0.x - yd, MID + dirY * 16], [.6, s + yd, MID + dirY * 26], [1, EZ, clamp(MID + dirY * 24, TOP, BOT)]];
        rbPath = [[0, rb0.x, rb0.y], [snap, rb0.x, rb0.y], [.4, qb0.x + yd, MID - dirY * 8, 'e'], [1, qb0.x + yd * 2, MID - dirY * 8]];
        carrier = qbPath; ball = t => at(qbPath, t); ours = 'qb';
      } else {
        const mesh = [Math.max(qb0.x, rb0.x) + yd * .6, MID + dirY * 3];
        qbPath = [[0, qb0.x, qb0.y], [snap, qb0.x, qb0.y], [tHand, mesh[0] - 3, MID - dirY * 3, 'e'], [.55, mesh[0] - yd * 2, MID - dirY * 10], [1, mesh[0] - yd * 2.5, MID - dirY * 12]];
        const wide = p.gap === 'end' ? dirY * 10 : 0;
        rbPath = [[0, rb0.x, rb0.y], [snap, rb0.x, rb0.y], [tHand, mesh[0], mesh[1], 'e'], [.44, s + yd * .5, hole + wide * .4], [.58, s + yd * 2.5, clamp(hole + wide, TOP, BOT)]];
        // long runs get a cut back toward the middle before the end zone
        if (td.yds > 12) rbPath.push([.8, lerp(s, goal, .7), clamp(hole + wide - dirY * 10, TOP, BOT)]);
        rbPath.push([1, EZ, clamp(hole + wide * .6, TOP, BOT)]);
        carrier = rbPath; ball = t => t < tHand ? at(qbPath, t) : at(rbPath, t); ours = 'rb';
      }
      off.push({ path: qbPath, role: 'qb' }, { path: rbPath, role: 'rb' });
      [wl, wr, sl].forEach(o => off.push({ path: [[0, o.x, o.y], [snap, o.x, o.y], [.5, o.x + yd * 5, o.y + (o.y < MID ? 3 : -3)], [1, o.x + yd * 6.5, o.y + (o.y < MID ? 5 : -5)]] }));
      off.push({ path: [[0, te.x, te.y], [snap, te.x, te.y], [.38, te.x + yd, te.y, 'e'], [1, te.x + yd * 1.6, te.y - 2]] });
    }
    // --- defense: front four engage, everyone else chases the ball with a lag ---
    const cx = v => Math.min(326, v);
    const front = [-15, -5, 5, 15].map(dy => ({ x: cx(s + yd * 1.1), y: MID + dy }));
    front.forEach(d => def.push({ fn: t => t < snap ? [d.x, d.y] : t < .38 ? [lerp(d.x, d.x - yd * .5, smooth((t - snap) / (.38 - snap))), d.y] : (() => { const c = at(carrier, t - .1), k = smooth(clamp((t - .38) / .62, 0, 1)) * .35; return [lerp(d.x - yd * .5, c[0], k), lerp(d.y, c[1], k)]; })() }));
    const second = [[s + yd * 4.5, MID - 12], [s + yd * 4.5, MID], [s + yd * 4.5, MID + 12], [s + yd * 5, TOP + 2], [s + yd * 5, BOT - 2], [s + yd * 11, MID - 16], [s + yd * 11, MID + 16]];
    second.forEach(([x0, y0], i) => {
      const d = { x: cx(x0), y: y0 }, lag = .14 + (i % 3) * .05, reach = i >= 5 ? .78 : .7;
      def.push({ fn: t => { if (t < snap + .04) return [d.x, d.y]; const c = at(carrier, Math.max(0, t - lag)), k = smooth(clamp((t - snap - .04) / (.96 - snap), 0, 1)) * reach; return [lerp(d.x, c[0], k), lerp(d.y, c[1] + (i % 2 ? 3 : -3), k)]; } });
    });
    return { off, def, ball, flight, ours, kind: p.kind, s, goal };
  }

  function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }

  const running = new WeakMap(); let active = 0;
  function play(svg) {
    if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let td; try { td = JSON.parse(svg.dataset.td); } catch (e) { return; }
    const prev = running.get(svg); if (prev) prev.stop();
    const s = +svg.dataset.s, goal = +svg.dataset.goal, Y = +svg.dataset.y;
    const P = script(td, s, goal, Y);
    const g = el('g', { class: 'pa' }, svg);
    const trail = el('polyline', { class: 'pa-trail', points: '' }, g);
    const nodes = [];
    P.off.forEach(o => {
      const mine = o.role === P.ours;
      const n = el('circle', { r: mine ? 3.6 : 3, class: 'pa-o' + (mine ? ' ours' : '') }, g); nodes.push({ n, f: t => at(o.path, t) });
    });
    P.def.forEach(d => { const n = el('path', { d: 'M-2.4 -2.4L2.4 2.4M2.4 -2.4L-2.4 2.4', class: 'pa-x' }, g); nodes.push({ n, f: d.fn, x: true }); });
    const shadow = el('ellipse', { rx: 2.2, ry: 1.2, class: 'pa-sh' }, g), ball = el('ellipse', { rx: 2.6, ry: 1.6, class: 'pa-ball' }, g);
    const tdText = el('text', { x: goal + 35, y: 58, class: 'pa-td', 'text-anchor': 'middle' }, g); tdText.textContent = 'TOUCHDOWN';
    svg.classList.add('playing'); svg.classList.remove('played');
    const ms = clamp(2300 + td.yds * 28, 2400, 4200), t0 = performance.now();
    const pts = []; let raf, done = false;
    const frame = now => {
      if (!svg.isConnected) return stop();
      const t = Math.min(1, (now - t0) / ms);
      nodes.forEach(o => { const [x, y] = o.f(t); o.n.setAttribute('transform', `translate(${Math.max(5, Math.min(326, x)).toFixed(1)} ${y.toFixed(1)})`); });
      let [bx, by] = P.ball(t); bx = Math.max(5, bx);
      let lift = 0;
      if (P.flight && t > P.flight.from && t < P.flight.to) lift = Math.sin(Math.PI * (t - P.flight.from) / (P.flight.to - P.flight.from));
      ball.setAttribute('transform', `translate(${bx.toFixed(1)} ${(by - lift * 7).toFixed(1)}) rotate(${(t * 900) % 360}) scale(${(1 + lift * .45).toFixed(2)})`);
      shadow.setAttribute('transform', `translate(${bx.toFixed(1)} ${(by + 1).toFixed(1)})`);
      shadow.style.opacity = lift ? .5 - lift * .3 : 0;
      if (t > .16) { pts.push(bx.toFixed(1) + ',' + by.toFixed(1)); trail.setAttribute('points', pts.join(' ')); }
      if (bx >= goal && !done) { done = true; svg.classList.add('scored'); }
      if (t < 1) raf = requestAnimationFrame(frame);
      else setTimeout(() => { if (!svg.isConnected) return; svg.classList.remove('playing', 'scored'); svg.classList.add('played'); g.classList.add('out'); setTimeout(() => { g.remove(); if (running.delete(svg)) active--; }, 650); }, 900);
    };
    function stop() { cancelAnimationFrame(raf); g.remove(); svg.classList.remove('playing', 'scored'); if (running.delete(svg)) active--; }
    running.set(svg, { stop }); active++;
    raf = requestAnimationFrame(frame);
  }

  // styles live here so the tracker only carries them when this file loads
  const css = `
  .field svg .td-static{transition:opacity .5s ease}
  .field svg.playing .td-static{opacity:0}
  .field svg{cursor:pointer}
  .pa .pa-o{fill:none;stroke:#FFFFFF;stroke-width:1.4}
  .pa .pa-o.ours{fill:#53D337;stroke:#B5F5A0}
  .pa .pa-x{stroke:#FF8A80;stroke-width:1.5;stroke-linecap:round}
  .pa .pa-ball{fill:#9A5B2E;stroke:#F2D3B3;stroke-width:.5}
  .pa .pa-sh{fill:#000}
  .pa .pa-trail{fill:none;stroke:#53D337;stroke-width:2;stroke-opacity:.55;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2 3}
  .pa .pa-td{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:11px;letter-spacing:.4px;fill:#FFFFFF;opacity:0;paint-order:stroke;stroke:rgba(0,0,0,.45);stroke-width:2px}
  .field svg.scored .pa-td{animation:pa-td 1.1s cubic-bezier(.3,1.6,.5,1) both;transform-box:fill-box;transform-origin:center}
  .field svg.scored .ez{animation:pa-ez .9s ease-out 2}
  .pa.out{transition:opacity .6s ease;opacity:0}
  .replay{font-family:Barlow,sans-serif;font-size:9px;font-weight:700;letter-spacing:.6px;fill:#A8A8A8;opacity:0;transition:opacity .4s}
  .field svg.played .replay{opacity:.9}
  @keyframes pa-td{0%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
  @keyframes pa-ez{50%{filter:brightness(1.6)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  window.PlayAnim = { play, busy: () => active > 0 };
})();
