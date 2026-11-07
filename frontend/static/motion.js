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
  function loader(text) {
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
  window.Motion = { slot, roll, calm, loader };
})();
