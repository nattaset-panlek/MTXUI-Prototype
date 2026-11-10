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
          const p = Math.min(1, (now - st.start) / o.ms);
          setVars(st.el, (p * 100).toFixed(1) + "%");
          if (o.steps) {
            const k = Math.floor(p * o.steps);
            if (k > st.step) { st.step = k; rumble(30 + k * 15, 0.1 + k * 0.05); }
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
