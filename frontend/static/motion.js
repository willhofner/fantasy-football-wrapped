// Shared number motion for pandolfi.bet (tracker + pick sheet). Text and transforms only, nothing that waits on it.
//   Motion.slot(el)               slot machine: digits spin, lock left to right, land on the real number
//   Motion.roll(el, text, from)   odometer: each digit rolls from its old value to its new one
//   Motion.calm()                 true when the phone asks for reduced motion (everything here then does nothing)
(function () {
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slot(el, ms = 950) {
    if (!el || calm()) return;
    const final = el.textContent;
    const digits = [...final].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
    if (!digits.length) return;
    el.style.fontVariantNumeric = 'tabular-nums';
    el.classList.add('m-spin');
    const t0 = performance.now(); let last = 0;
    const step = now => {
      if (!el.isConnected) return;
      const k = (now - t0) / ms;
      if (k >= 1) { el.textContent = final; el.classList.remove('m-spin'); el.classList.add('m-land'); setTimeout(() => el.classList.remove('m-land'), 600); return; }
      if (now - last > 35 + k * k * 150) {           // the reel slows down
        last = now;
        const chars = [...final];
        digits.forEach((i, n) => { if (k < .35 + .6 * (n + 1) / digits.length) chars[i] = String(Math.floor(Math.random() * 10)); });
        el.textContent = chars.join('');
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Odometer. Digits sit in a 0-9 strip that slides; other characters ($ , . +) stay put.
  // `from` is what the number said before (the element is usually freshly rendered); aligned from the right.
  function roll(el, text, from) {
    if (!el) return;
    if (calm() || from == null || from === text) { el.textContent = text; return; }
    const a = [...String(from)], b = [...text];
    const pad = Math.max(0, b.length - a.length); const old = Array(pad).fill('').concat(a).slice(-b.length);
    el.classList.add('odo');
    el.innerHTML = b.map((c, i) => {
      if (!/\d/.test(c)) return `<span class="odo-c">${c}</span>`;
      const o = /\d/.test(old[i]) ? +old[i] : 0;
      return `<span class="odo-d" data-to="${c}"><span class="odo-s" style="transform:translateY(${-o * 10}%)">${'0123456789'.split('').map(d => `<span>${d}</span>`).join('')}</span></span>`;
    }).join('');
    el.setAttribute('aria-label', text);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('.odo-d').forEach((d, i) => { const s = d.firstChild; s.style.transitionDelay = (i * 45) + 'ms'; s.style.transform = `translateY(${-d.dataset.to * 10}%)`; });
    }));
    // back to plain text once it has settled, so copy/paste and screen readers see a normal number
    clearTimeout(el._odoT); el._odoT = setTimeout(() => { if (el.isConnected) { el.classList.remove('odo'); el.textContent = text; } }, 1200);
  }

  const css = `
  .m-spin{filter:blur(.3px);opacity:.9}
  .m-land{animation:m-land .5s cubic-bezier(.3,1.7,.5,1)}
  @keyframes m-land{0%{transform:scale(1.18)}100%{transform:none}}
  .odo{display:inline-flex;align-items:baseline}
  .odo-d{display:inline-block;height:1.15em;line-height:1.15em;overflow:hidden;vertical-align:bottom}
  .odo-s{display:flex;flex-direction:column;transition:transform .7s cubic-bezier(.2,.9,.25,1)}
  .odo-s span{height:1.15em;line-height:1.15em}
  .m-land{display:inline-block}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  // Loading screen: a football is thrown across the screen and lands in a bowl of spaghetti and meatballs;
  // a little sauce squirts out, the bowl wobbles, repeat. Pure SVG + CSS, loops every 1.9s.
  //   el.innerHTML = Motion.loader('Loading scores…')
  function loader(text, style) {
    if ((style || Motion.style) === 'ink') return inkLoader(text);
    return `<div class="m-loader" role="status" aria-live="polite">
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <g class="ml-drops">
          <circle class="ml-d d1" cx="80" cy="62" r="2.8"/><circle class="ml-d d2" cx="80" cy="62" r="2.1"/>
          <circle class="ml-d d3" cx="80" cy="62" r="2.5"/><circle class="ml-d d4" cx="80" cy="62" r="1.7"/>
        </g>
        <g class="ml-ballx"><g class="ml-bally"><g class="ml-ball">
          <path d="M67 56C71 49.6 89 49.6 93 56C89 62.4 71 62.4 67 56Z" fill="#7A3E1D"/>
          <path d="M69.6 53.6C74 51 86 51 90.4 53.6" stroke="#9C5A30" stroke-width="1.2" fill="none" opacity=".7"/>
          <path d="M71.6 52.4Q70.6 56 71.6 59.6M88.4 52.4Q89.4 56 88.4 59.6" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round"/>
          <path d="M75.5 56H84.5M77 54.5v3M79.2 54.4v3.2M81.4 54.4v3.2M83.4 54.5v3" stroke="#FFFFFF" stroke-width="1.05" stroke-linecap="round"/>
        </g></g></g>
        <g class="ml-bowl">
          <ellipse cx="80" cy="112" rx="30" ry="3" fill="#000" opacity=".3"/>
          <ellipse cx="80" cy="80" rx="40" ry="15" fill="#EFE9DF"/>
          <ellipse cx="80" cy="80.5" rx="36" ry="12" fill="#A93A25"/>
          <path d="M45 82C47 68 63 59.5 80 59.5C97 59.5 113 68 115 82C104 89 56 89 45 82Z" fill="#EDBD52"/>
          <g fill="none" stroke-linecap="round">
            <path d="M50 79c5-5 9 3 14-2s9 4 14-1 9 4 14-1 9 3 14-1M53 73c5-4 9 3 13-1s9 3 13-1 9 3 13-1 8 3 12 0M58 67c4-4 8 2 12-1s8 3 12 0 8 2 12-1 7 3 10 1" stroke="#D4972F" stroke-width="1.5"/>
            <path d="M48 76c6-3 8 3 13 0s8 3 13 0 8 3 13 0 8 3 13 0 8 3 11 1M55 70c4-3 8 3 12 0s8 3 12 0 8 3 12 0 7 2 10 0M63 64c4-2 7 2 11 0s7 2 11 0 7 2 9 0" stroke="#F7D987" stroke-width="1.1"/>
          </g>
          <path d="M60 70C62 63 72 60 80 61C90 61.5 99 65 100 71C96 75 86 73.5 80 74.5C72 76 63 75 60 70Z" fill="#C4301F"/>
          <path d="M66 69C68 65 75 63.5 80 64C86 64.5 92 66.5 93 69.5" stroke="#E2523B" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          <circle cx="68" cy="70.5" r="6.4" fill="#6A311B"/><circle cx="66.2" cy="68.4" r="1.9" fill="#A35D3E"/>
          <circle cx="92" cy="70" r="6.6" fill="#6A311B"/><circle cx="90" cy="67.8" r="2" fill="#A35D3E"/>
          <circle cx="80" cy="64.5" r="6.8" fill="#753820"/><circle cx="77.8" cy="62.2" r="2.1" fill="#B26A48"/>
          <path d="M84 60.5c2.5-2.6 6-2.4 7.2-.6-2 2.2-5 2.4-7.2.6Z" fill="#3E8E3A"/><path d="M70.5 63c-1.6-2.4-.8-5 1.2-5.6.9 2.4.3 4.4-1.2 5.6Z" fill="#4FA548"/>
          <g fill="#FFF7E0"><circle cx="74" cy="72" r=".9"/><circle cx="86" cy="73" r=".8"/><circle cx="82" cy="68.5" r=".7"/><circle cx="62" cy="76" r=".8"/><circle cx="97" cy="76" r=".9"/></g>
          <path d="M40 80A40 15 0 0 0 120 80Q118 104 80 109Q42 104 40 80Z" fill="#F4EFE6"/>
          <path d="M46 90Q56 104 80 105" stroke="#DCD4C6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <path d="M40 80A40 15 0 0 0 120 80" stroke="#FFFFFF" stroke-width="2.4" fill="none"/>
        </g>
      </svg>
      ${text ? `<p>${text}</p>` : ''}
    </div>`;
  }

  const loaderCss = `
  .m-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:48px 0 40px;color:#A8A8A8;font-size:14px}
  .m-loader svg{width:180px;height:auto;overflow:visible;margin-top:30px}
  .m-loader p{margin:0}
  .m-loader .ml-d{fill:#C8352B;opacity:0}
  .ml-ballx,.ml-bally,.ml-ball,.ml-bowl,.ml-d{transform-box:fill-box;transform-origin:center}
  .ml-bowl{transform-origin:50% 100%}
  @media (prefers-reduced-motion:no-preference){
    .ml-ballx{animation:ml-x 1.9s linear infinite}
    .ml-bally{animation:ml-y 1.9s infinite}
    .ml-ball{animation:ml-spin 1.9s linear infinite}
    .ml-bowl{animation:ml-bowl 1.9s ease-out infinite}
    .ml-d{animation:ml-drop 1.9s ease-out infinite}
    .ml-d.d1{--sx:-16px;--sy:-15px} .ml-d.d2{--sx:13px;--sy:-18px} .ml-d.d3{--sx:-7px;--sy:-24px} .ml-d.d4{--sx:20px;--sy:-9px}
  }
  @media (prefers-reduced-motion:reduce){ .ml-bally{transform:translateY(4px)} }
  /* across: thrown from the left, lands in the bowl at 52% */
  @keyframes ml-x{0%{transform:translateX(-66px)}52%,100%{transform:translateX(0)}}
  /* up and down: a rising throw that drops into the bowl, then sinks into the pasta */
  @keyframes ml-y{0%{transform:translateY(-2px);opacity:0;animation-timing-function:cubic-bezier(.2,.6,.4,1)}
    6%{opacity:1}26%{transform:translateY(-52px);animation-timing-function:cubic-bezier(.6,0,.85,.4)}
    52%{transform:translateY(4px);opacity:1}60%{transform:translateY(8px);opacity:1}70%,100%{transform:translateY(10px);opacity:0}}
  /* nose up on the way up, nose down coming in, like a real pass */
  @keyframes ml-spin{0%{transform:rotate(-38deg)}26%{transform:rotate(0)}52%,100%{transform:rotate(34deg)}}
  @keyframes ml-bowl{0%,51%{transform:none}55%{transform:scale(1.07,.9)}62%{transform:scale(.97,1.04)}70%,100%{transform:none}}
  @keyframes ml-drop{0%,52%{opacity:0;transform:none}56%{opacity:1}80%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(.7)}100%{opacity:0}}`;
  const st2 = document.createElement('style'); st2.textContent = loaderCss; document.head.appendChild(st2);

  // ---------- "Ink" loader: white line art, a 6-second story on loop ----------
  // throw lands in a plate of spaghetti → one strand starts, the whole plate gets slurped up off-screen (meatballs stay)
  // → the ball stands on its point and spins like a top → a leg kicks it → the camera follows it through the uprights
  // and off-screen → camera pans back, plate refills → the ball is thrown back in. Driven by one rAF clock (Motion.ink),
  // so the preview page can slow it down, pause and scrub it.
  const INK_T = 6000;
  function inkLoader(text) {
    const strands = ['M64 92c6-6 10 4 16-2s10 5 16-1 10 5 16-1 10 4 14 0', 'M68 86c5-5 9 4 14-1s9 4 14-1 9 4 14-1 8 3 12 0',
      'M74 80c4-4 8 3 12-1s8 3 12-1 8 3 12 0', 'M82 74c4-3 7 2 11-1s7 2 11 0'];
    return `<div class="m-loader m-ink" role="status" aria-live="polite">
      <svg viewBox="0 0 200 130" aria-hidden="true">
        <g class="ik-w">
          <path class="ik-ground" d="M-60 118H470"/>
          <g class="ik-goal"><path d="M320 118V52M294 52H346M294 52V-34M346 52V-34"/><text x="320" y="40" text-anchor="middle" class="ik-good">IT’S GOOD</text></g>
          <ellipse class="ik-plate" cx="100" cy="96" rx="52" ry="15"/><ellipse class="ik-rim" cx="100" cy="96" rx="41" ry="10.5"/>
          <g class="ik-mound"><path d="M60 94C63 74 82 66 100 66C118 66 137 74 140 94"/>${strands.map(d => `<path d="${d}"/>`).join('')}</g>
          <g class="ik-mbs"><circle class="ik-mb" r="7"/><circle class="ik-mb" r="7"/><circle class="ik-mb" r="6.5"/></g>
          <path class="ik-strand" d="M100 78C108 58 128 42 148 24S188 -8 232 -34"/>
          <path class="ik-flow" d="M100 78C108 58 128 42 148 24S188 -8 232 -34"/>
          <g class="ik-leg"><path d="M0 0L7 38L5 68"/><path class="ik-shoe" d="M-1 64L5 76L31 78Q36 71 27 69L11 66Z"/></g>
          <g class="ik-ball"><path class="ik-hide" d="M-19 0C-12.5 -12.5 12.5 -12.5 19 0C12.5 12.5 -12.5 12.5 -19 0Z"/>
            <path class="ik-stripes" d="M-12.5 -7.4Q-14.3 0 -12.5 7.4M12.5 -7.4Q14.3 0 12.5 7.4"/>
            <path class="ik-laces" d="M-6.5 0H6.5M-4.4 -2.8V2.8M-1.5 -2.8V2.8M1.5 -2.8V2.8M4.4 -2.8V2.8"/></g>
        </g>
      </svg>
      ${text ? `<p>${text}</p>` : ''}
    </div>`;
  }
  const clamp01 = v => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const eio = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, ein = k => k * k, eout = k => 1 - (1 - k) * (1 - k);
  const back = k => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);   // overshoot on the way to 1
  const MB_MOUND = [[86, 78], [114, 79], [100, 70]], MB_PLATE = [[70, 93], [131, 93], [118, 103]];
  function inkFrame(svg, ms) {
    const t = (ms % INK_T) / INK_T, q = s => svg.querySelector(s);
    if (!svg._L) { const st = q('.ik-strand'); svg._L = st.getTotalLength ? st.getTotalLength() : 220; }
    const L = svg._L;
    // the plate of spaghetti: slurped away .10–.30, back with a bounce .78–.88
    const gone = t < .10 ? 0 : t < .30 ? ein(seg(t, .10, .30)) : t < .78 ? 1 : t < .88 ? 1 - back(seg(t, .78, .88)) : 0;
    const s = Math.max(0, 1 - gone);
    q('.ik-mound').setAttribute('transform', `translate(100 92) scale(${(s * (1 + .04 * Math.sin(ms / 40) * (t > .1 && t < .3))).toFixed(3)} ${s.toFixed(3)}) translate(-100 -92)`);
    q('.ik-mound').style.opacity = s > .02 ? 1 : 0;
    // meatballs drop onto the plate when the pasta goes, climb back on when it returns
    svg.querySelectorAll('.ik-mb').forEach((c, i) => {
      const k = t < .78 ? eout(seg(t, .14, .30)) : 1 - eio(seg(t, .80, .88));
      c.setAttribute('cx', lerp(MB_MOUND[i][0], MB_PLATE[i][0], k).toFixed(1));
      c.setAttribute('cy', (lerp(MB_MOUND[i][1], MB_PLATE[i][1], k) - Math.sin(Math.PI * k) * 6).toFixed(1));
    });
    // the single strand: drawn out toward the unseen mouth, flows while it slurps, then zips away
    const strand = q('.ik-strand'), flow = q('.ik-flow');
    strand.style.strokeDasharray = L; flow.style.strokeDasharray = '6 5';
    if (t >= .06 && t < .10) { strand.style.opacity = 1; strand.style.strokeDashoffset = (L * (1 - eout(seg(t, .06, .10)))).toFixed(1); }
    else if (t >= .10 && t < .30) { strand.style.opacity = 1; strand.style.strokeDashoffset = 0; }
    else if (t >= .30 && t < .34) { strand.style.opacity = 1; strand.style.strokeDashoffset = (-L * ein(seg(t, .30, .34))).toFixed(1); }
    else strand.style.opacity = 0;
    flow.style.opacity = t >= .10 && t < .30 ? 1 : 0; flow.style.strokeDashoffset = (-ms / 6).toFixed(1);
    // the ball
    let x = 100, y = 80, rot = 18, sy = 1, laces = 1, show = 1;
    if (t >= .88) {                                 // thrown back in from off-screen left
      const k = seg(t, .88, 1); x = lerp(-40, 100, k); y = lerp(38, 80, k) - 112 * k * (1 - k); rot = lerp(-38, 18, k);
    } else if (t < .04) { const k = eout(seg(t, 0, .04)); y = lerp(80, 82, k); rot = lerp(18, 14, k); }
    else if (t < .34) { const k = eio(seg(t, .10, .32)); y = lerp(82, 84, k); rot = lerp(14, 0, k); }   // settles onto the empty plate
    else if (t < .50) {                              // stands on its point, then spins like a top
      const up = eout(seg(t, .34, .39)); y = lerp(84, 74, up) - Math.sin(Math.PI * up) * 5; rot = lerp(0, -90, up);
      if (t >= .39) { const ph = (t - .39) * INK_T / 1000 * 2 * Math.PI * 6.5, c = Math.cos(ph); sy = .32 + .68 * Math.abs(c); laces = c > 0 ? 1 : 0; rot = -90 + 6 * Math.sin(ph / 3); }
    } else if (t < .74) {                            // kicked: through the uprights and gone
      const k = 1 - Math.pow(1 - seg(t, .50, .74), 1.6); x = 100 + 340 * k; y = 74 - 128 * k + 58 * k * k; rot = -90 + 1080 * k;
    } else show = 0;
    const ball = q('.ik-ball');
    ball.style.opacity = show; q('.ik-laces').style.opacity = laces;
    ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(1 ${sy.toFixed(3)})`);
    // the leg: slides in, winds up, kicks at .50, follows through, leaves
    const leg = q('.ik-leg');
    if (t >= .44 && t < .60) {
      const slide = t < .47 ? -70 * (1 - eout(seg(t, .44, .47))) : t > .55 ? -80 * ein(seg(t, .55, .60)) : 0;
      const th = t < .47 ? 52 : t < .50 ? lerp(52, 0, ein(seg(t, .47, .50))) : t < .55 ? lerp(0, -38, eout(seg(t, .50, .55))) : -38;
      leg.style.opacity = 1; leg.setAttribute('transform', `translate(${(64 + slide).toFixed(1)} 15) rotate(${th.toFixed(1)})`);
    } else leg.style.opacity = 0;
    // the camera follows the kick, then pans home
    let cam = 0;
    if (t >= .50 && t < .74) cam = Math.max(0, Math.min(220, x - 100));
    else if (t >= .74 && t < .84) cam = 220 * (1 - eio(seg(t, .74, .84)));
    q('.ik-w').setAttribute('transform', `translate(${(-cam).toFixed(1)} 0)`);
    q('.ik-good').style.opacity = t > .66 && t < .78 ? 1 : 0;
  }
  // one clock for every ink loader on the page
  const ink = { rate: 1, paused: false, t: 0, last: 0, T: INK_T, running: false };
  function inkTick(now) {
    const els = document.querySelectorAll('.m-ink svg');
    if (!els.length) { ink.running = false; return; }
    if (!ink.paused) ink.t += (now - (ink.last || now)) * ink.rate;
    ink.last = now;
    els.forEach(svg => inkFrame(svg, ink.t));
    requestAnimationFrame(inkTick);
  }
  function inkStart() {
    if (calm()) { requestAnimationFrame(() => document.querySelectorAll('.m-ink svg').forEach(svg => inkFrame(svg, INK_T * .02))); return; }
    if (!ink.running) { ink.running = true; ink.last = 0; requestAnimationFrame(inkTick); }
  }
  const inkApi = {
    get T() { return INK_T; }, get t() { return ink.t % INK_T; },
    set rate(r) { ink.rate = r; }, pause() { ink.paused = true; }, play() { ink.paused = false; },
    seek(ms) { ink.t = ms; document.querySelectorAll('.m-ink svg').forEach(svg => inkFrame(svg, ms)); }, start: inkStart,
  };
  // any ink loader that appears on the page starts the clock (pages just set innerHTML)
  new MutationObserver(() => { if (!ink.running && document.querySelector('.m-ink svg')) inkStart(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  const inkCss = `
  .m-ink svg{width:var(--size,220px);overflow:hidden;margin-top:0}
  .m-ink svg *{vector-effect:non-scaling-stroke}
  .m-ink path,.m-ink ellipse,.m-ink circle{fill:none;stroke:#FFFFFF;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .m-ink .ik-plate,.m-ink .ik-hide,.m-ink .ik-mb,.m-ink .ik-shoe{fill:#0B0B0B}
  .m-ink .ik-ground{stroke-opacity:.25}
  .m-ink .ik-rim{stroke-opacity:.45}
  .m-ink .ik-flow{stroke-width:2.6}
  .m-ink .ik-laces{stroke-width:1.4}
  .m-ink .ik-leg path{stroke-width:2.4}
  .m-ink .ik-good{fill:#FFFFFF;stroke:none;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:12px;letter-spacing:1px}`;
  const st3 = document.createElement('style'); st3.textContent = inkCss; document.head.appendChild(st3);
  window.Motion = { slot, roll, calm, loader, ink: inkApi, style: 'classic' };
})();
