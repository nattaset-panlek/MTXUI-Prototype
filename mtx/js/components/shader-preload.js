/* Component: Shader Preload (first launch, before the Intro). Layout: Figma "Shader Preload · 3 · Thin full-width line" 675:105319 (Intro 398:231999 + bottom line)
   (same arena + logo); the "Press any button" line is replaced by a progress bar + status line.
     MTX_SHADER.open({ duration, onDone })  -> show and simulate shader compiling (default 6000 ms)
     MTX_SHADER.close()                     -> close now, without onDone
     MTX_SHADER.isOpen()                    -> true while shown; app.js blocks input meanwhile
     MTX_SHADER.needed()                    -> true until it has finished once (store key "mtx.shadersCompiled")
   Status lines and shader counts are placeholder wording, not from Figma. */
(function () {
  const KEY = "mtx.shadersCompiled", TOTAL = 4826;
  const STEPS = ["Checking graphics driver", "Compiling environment shaders", "Compiling character shaders", "Compiling VFX shaders", "Building pipeline cache", "Finalizing"];
  let root = null, fill = null, pct = null, status = null, count = null, raf = 0, t0 = 0, ms = 0, done = null, restoreTitle = false;

  const needed = () => { try { return localStorage.getItem(KEY) !== "1"; } catch { return true; } };
  // eased, slightly uneven progress so it reads like real work
  const curve = p => Math.min(1, p + Math.sin(p * Math.PI * 3) * 0.04 * (1 - p));

  function tick() {
    if (!root) return;
    const p = Math.min(1, (performance.now() - t0) / ms), v = Math.max(0, curve(p));
    fill.style.width = (v * 100).toFixed(1) + "%";
    pct.textContent = Math.floor(v * 100) + "%";
    status.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(v * STEPS.length))] + "…";
    if (count) count.textContent = `${Math.floor(v * TOTAL).toLocaleString("en-US")} / ${TOTAL.toLocaleString("en-US")}`;
    if (p >= 1) { try { localStorage.setItem(KEY, "1"); } catch {} const cb = done; close(); cb?.(); return; }
    raf = setTimeout(tick, 33);
  }
  function open({ duration = 6000, onDone = null } = {}) {
    close();
    restoreTitle = !window.MTX_PREGAME?.();          // opened from Dev Pages mid-game: put the title layer back after
    window.MTX_TITLE?.("intro");
    document.body.classList.add("shader-preload-open");
    root = document.createElement("div");
    root.className = "shader-preload"; root.dataset.figma = "675:105319";
    root.innerHTML = `<p class="shader-preload__status"></p>
      <p class="shader-preload__title">Optimizing shaders<b class="shader-preload__pct">0%</b></p>
      <div class="shader-preload__track"><i class="shader-preload__fill"></i></div>`;
    (document.getElementById("stage") || document.body).appendChild(root);
    fill = root.querySelector(".shader-preload__fill"); pct = root.querySelector(".shader-preload__pct");
    status = root.querySelector(".shader-preload__status"); count = root.querySelector(".shader-preload__count");
    t0 = performance.now(); ms = Math.max(500, duration); done = onDone;
    raf = setTimeout(tick, 33);
  }
  function close() {
    clearTimeout(raf);
    if (!root) return;
    root.remove(); root = null; done = null;
    document.body.classList.remove("shader-preload-open");
    if (restoreTitle) window.MTX_TITLE?.("off");
  }
  window.MTX_SHADER = { open, close, isOpen: () => !!root, needed, reset: () => { try { localStorage.removeItem(KEY); } catch {} } };
})();
