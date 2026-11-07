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
          <circle class="ml-d d1" cx="80" cy="70" r="2.6"/><circle class="ml-d d2" cx="80" cy="70" r="2"/>
          <circle class="ml-d d3" cx="80" cy="70" r="2.3"/><circle class="ml-d d4" cx="80" cy="70" r="1.6"/>
        </g>
        <g class="ml-ballx"><g class="ml-bally"><g class="ml-ball">
          <ellipse cx="80" cy="64" rx="10" ry="6" fill="#8B4A2B"/>
          <path d="M72.5 61.2 Q80 59.8 87.5 61.2 M72.5 66.8 Q80 68.2 87.5 66.8" stroke="#F4E3D2" stroke-width=".9" fill="none" opacity=".8"/>
          <path d="M76 64H84M77.5 62.6v2.8M80 62.4v3.2M82.5 62.6v2.8" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round"/>
        </g></g></g>
        <g class="ml-bowl">
          <ellipse cx="80" cy="76" rx="31" ry="6.5" fill="#E8B64A"/>
          <path d="M55 75q4-3 8 0t8 0 8 0 8 0 8 0 8 0M58 78q4-3 8 0t8 0 8 0 8 0 8 0" stroke="#C9922D" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <ellipse cx="80" cy="74" rx="15" ry="4" fill="#C8352B"/>
          <circle cx="71" cy="73" r="4.6" fill="#6E3420"/><circle cx="89" cy="72.6" r="4.4" fill="#6E3420"/><circle cx="80" cy="70.8" r="4.8" fill="#7A3B22"/>
          <circle cx="78.6" cy="69.2" r="1.3" fill="#B0674A"/><circle cx="69.8" cy="71.6" r="1.1" fill="#9A5338"/><circle cx="87.8" cy="71.2" r="1.1" fill="#9A5338"/>
          <path d="M47 77Q49 105 80 107Q111 105 113 77Z" fill="#F2EDE4"/>
          <path d="M51 86Q60 100 80 101" stroke="#D8D1C4" stroke-width="2" fill="none" stroke-linecap="round"/>
          <ellipse cx="80" cy="77" rx="33" ry="5" fill="none" stroke="#FFFFFF" stroke-width="2"/>
          <ellipse cx="80" cy="109" rx="18" ry="2.4" fill="#000" opacity=".25"/>
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
