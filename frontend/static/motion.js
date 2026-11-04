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
  window.Motion = { slot, roll, calm };
})();
