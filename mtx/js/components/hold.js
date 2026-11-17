/* Component: hold-to-confirm.
   The one implementation every "hold A / Space" action uses (Store, Rewards, Skill tree, Simulate day, popup Select,
   Tactical style, Attributes). It owns the timing, the CSS progress variable(s), the is-holding class, the stepped
   rumble and the success flash; the caller only says what happens when the hold completes or is let go.

     const hold = MTX_UI.createHold({
       ms: 1000,                       // hold length
       vars: ["--hold-p"],             // CSS custom properties set to 0% .. 100% on the held element
       steps: 0,                       // > 0: rumble ticks while holding (skill unlock uses 4)
       flash: "is-unlocked-flash",     // class flashed on the element when the hold completes (null = none)
       startRumble: [40, 0.2],         // rumble when the hold starts (null = none)
       onDone(ctx, state) {},          // the hold completed
       onCancel({ quick, notify, ctx, el }) {}   // let go early; quick = shorter than 250 ms (show a "Hold to ..." hint)
     });
     hold.start(el, { ctx, source: "keyboard" | "gamepad" | "mouse", extra: [otherEls] })   // false if already holding
     hold.cancel(notify)               // false if not holding
     hold.active / hold.source / hold.el / hold.ctx
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};

  // Feel: progress eases out (steady start, slows down only near the end), so there is one "almost there" moment.
  const EASE = p => 1 - Math.pow(1 - p, 1.6);

  // The CTA ring (.btn-cta::after, components.css) is a conic sweep around a wide pill: by angle it crawls along the
  // middle of the long edges (0 / 50 / 100 %) and races round the ends, which felt like a stop half way.
  // ringAngle() turns "fraction of the ring length" into the conic angle (%) for that pill, so the ring moves evenly.
  const ringCache = new WeakMap();
  function ringTable(el) {
    const W = el.offsetWidth + 12, H = el.offsetHeight + 10;   // ring box = pill + inset -5px -6px
    const key = W + "x" + H, hit = ringCache.get(el);
    if (hit && hit.key === key) return hit;
    const r = H / 2, c = Math.max(0, W / 2 - r), N = 360, pts = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, dx = Math.sin(a), dy = -Math.cos(a);
      let t = Math.abs(dy) > 1e-6 ? r / Math.abs(dy) : Infinity;   // hits a straight edge?
      if (!(Math.abs(t * dx) <= c)) {                              // no: hits an end cap (circle at x = ±c)
        const cx = Math.sign(dx) * c, b = dx * cx;                // |t d - C| = r, larger root
        t = b + Math.sqrt(Math.max(0, b * b - (cx * cx - r * r)));
      }
      pts.push([t * dx, t * dy]);
    }
    const len = [0];
    for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tab = { key, len, total: len[N], N };
    ringCache.set(el, tab);
    return tab;
  }
  function ringAngle(el, f) {
    if (f <= 0 || f >= 1) return f * 100;
    const { len, total, N } = ringTable(el), target = f * total;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] < target) lo = m; else hi = m; }
    const k = (target - len[lo]) / ((len[hi] - len[lo]) || 1);
    return (lo + k) / N * 100;
  }

  UI.createHold = function (opts = {}) {
    const o = Object.assign({ ms: 1000, vars: ["--hold-p"], steps: 0, flash: null, startRumble: [40, 0.2], quickMs: 250 }, opts);
    const rumble = (ms, mag) => window.MTX?.api?.rumble?.(ms, mag);
    const setVars = (el, v) => { if (el) o.vars.forEach(n => el.style.setProperty(n, v)); };
    let s = null;

    function clear(st) {
      cancelAnimationFrame(st.raf);
      [st.el, ...st.extra].forEach(e => e && e.classList.remove("is-holding"));
      setVars(st.el, "0%");
    }

    return {
      get active() { return !!s; },
      get source() { return s ? s.source : null; },
      get el() { return s ? s.el : null; },
      get ctx() { return s ? s.ctx : undefined; },

      start(el, { ctx, source = null, extra = [] } = {}) {
        if (s) return false;
        const st = s = { el, ctx, source, extra: extra.filter(Boolean), start: performance.now(), raf: 0, step: 0 };
        [el, ...st.extra].forEach(e => e && e.classList.add("is-holding"));
        setVars(el, "0%");
        if (o.startRumble) rumble(...o.startRumble);
        const tick = now => {
          if (s !== st) return;
          const p = Math.min(1, (now - st.start) / o.ms), e = EASE(p);
          // CTA pill: even speed along the ring; anything else (bars, round rings): the eased value as is
          const v = st.el?.classList?.contains("btn-cta") ? ringAngle(st.el, e) : e * 100;
          setVars(st.el, v.toFixed(2) + "%");
          if (o.steps) {
            // light, even ticks; only the last one is a bit stronger (no "second confirm" in the middle)
            const k = Math.floor(e * o.steps);
            if (k > st.step) { st.step = k; rumble(k === o.steps - 1 ? 60 : 30, k === o.steps - 1 ? 0.25 : 0.12); }
          }
          if (p < 1) { st.raf = requestAnimationFrame(tick); return; }
          s = null;
          clear(st);
          if (o.flash && st.el) {
            st.el.classList.add(o.flash);
            setTimeout(() => st.el.classList.remove(o.flash), 450);
          }
          o.onDone && o.onDone(st.ctx, st);
        };
        st.raf = requestAnimationFrame(tick);
        return true;
      },

      cancel(notify = false) {
        if (!s) return false;
        const st = s;
        s = null;
        clear(st);
        o.onCancel && o.onCancel({ quick: performance.now() - st.start < o.quickMs, notify, ctx: st.ctx, el: st.el });
        return true;
      }
    };
  };
})();
