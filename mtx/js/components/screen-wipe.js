/* Component (core): video screen transitions. A transparent video plays over #stage; the screen changes at a
   frame where the video fully covers it, then the new screen's enter motion plays as the video opens.
   Any screen pair can register one; Dev > System > Transitions lists every registered transition with its own
   mode + speed controls (built here, saved in localStorage "mtx.wipe.<id>.*").

     MTX_UI.wipe.register({
       id: "ultimate", label: "Main ↔ Ultimate Fight",
       from: "main", to: "career",                        // screen keys (app.js show()); from -> to = "in", to -> from = "back"
       in:   { src, switchAt, revealAt, end },            // seconds, media time: change under the cover, start enter motion, clip length
       back: { src, switchAt, revealAt, end } | null,     // optional; null = Back uses the normal transition
     })
     MTX_UI.wipe.route(from, to, go, screenEl) -> true if a video took over (app.js show() calls this on every change);
                                                  false = none registered / off / not loaded: the caller changes normally
     MTX_UI.wipe.isPlaying()                     -> true while one plays; app.js blocks input meanwhile
     MTX_UI.wipe.list()                          -> registered transitions (each has .mode "both" | "in" | "off" and .speed {in, back})

   Making a clip: export with alpha from After Effects, then WebM VP9 alpha, e.g.
     ffmpeg -i src.mov -frames:v N -an -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 -auto-alt-ref 0 -metadata:s:v:0 alpha_mode=1 out.webm
   (reversed: -vf "trim=end_frame=N,reverse"). Find the covered frames from the alpha plane:
     ffmpeg -i src.mov -vf "alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-" -f null -
   YMIN 255 = that frame covers the whole screen.
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const BASE = "mtx/assets/video/";
  const SPEED_MIN = 0.5, SPEED_MAX = 2.5;
  const ls = {
    get(k, d) { try { return localStorage.getItem("mtx." + k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mtx." + k, v); } catch (e) {} },
  };
  const list = [];
  let playing = null;

  function video(clip) {
    if (clip.el) return clip.el;
    const v = clip.el = document.createElement("video");
    v.className = "mtx-wipe";
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("error", () => { clip.failed = true; console.info("[wipe] video failed to load, using the normal transition:", clip.src); });
    (document.getElementById("stage") || document.body).appendChild(v);
    // load as a Blob: the dev servers send no Range support, and without it Chrome cannot seek back to 0 after the
    // clip ends, so it only played once. A blob: URL is always seekable.
    fetch(clip.src).then(r => r.ok ? r.blob() : Promise.reject(r.status))
      .then(b => { v.src = URL.createObjectURL(b); v.load(); })
      .catch(e => { clip.failed = true; console.info("[wipe] video failed to load, using the normal transition:", clip.src, e); });
    return v;
  }

  function play(t, dir, go, screenEl) {
    const clip = t[dir], v = video(clip);
    if (clip.failed || v.readyState < 3) return false;   // not ready: normal transition, no wait

    let switched = false, revealed = false, done = false, raf = 0;
    const motion = UI.motion;
    const rate = Math.min(4, Math.max(0.25, +t.speed[dir] || 1));
    const doSwitch = () => {
      if (switched) return; switched = true;
      const was = motion?.enabled; if (motion) motion.enabled = false;   // the change happens under the cover
      try { go(); } finally { if (motion) motion.enabled = was; }
    };
    const reveal = () => { if (revealed) return; revealed = true; if (screenEl && motion?.enabled) motion.enter(screenEl); };
    const finish = failed => {
      if (done) return; done = true;
      cancelAnimationFrame(raf); clearTimeout(guard); clearTimeout(hard);
      if (!switched) { switched = true; go(); }   // failed before the cover: plain change with the normal motion
      else if (failed) reveal();
      v.classList.remove("is-on"); v.pause();
      try { v.currentTime = 0; } catch (e) {}   // seek back now, so the next play starts on a ready frame
      playing = null;
    };
    const tick = () => {
      const s = v.currentTime;
      if (!switched && s >= clip.switchAt) doSwitch();
      if (switched && !revealed && s >= clip.revealAt) reveal();
      if (!done) raf = requestAnimationFrame(tick);
    };
    // a video that never starts must not hold the flow; never block input longer than the clip + margin
    const guard = setTimeout(() => { if (!switched) { console.info("[wipe] video stalled, using the normal transition"); finish(true); } }, clip.switchAt / rate * 1000 + 1200);
    const hard = setTimeout(() => finish(true), (clip.end || 5) / rate * 1000 + 2000);
    v.onended = () => { doSwitch(); reveal(); finish(false); };
    v.onerror = () => finish(true);
    playing = t.id + ":" + dir;
    try { v.currentTime = 0; } catch (e) {}
    v.defaultPlaybackRate = v.playbackRate = rate;
    v.classList.add("is-on");
    const p = v.play();
    if (p) p.catch(() => finish(true));
    raf = requestAnimationFrame(tick);
    return true;
  }

  /* ---------- Dev > System > Transitions: one block per registered transition ---------- */
  function devRow(t) {
    const host = document.getElementById("devTransitions");
    if (!host) return;
    const box = document.createElement("div");
    box.className = "dev-wipe";
    const opt = (v, txt) => `<option value="${v}">${txt}</option>`;
    const slider = dir => `<label>Speed ${dir} <span data-out="${dir}">1.00x</span> <input type="range" data-speed="${dir}" min="${SPEED_MIN}" max="${SPEED_MAX}" step="0.05"></label>`;
    box.innerHTML = `<label>${t.label} video <select data-mode>` +
      (t.back ? opt("both", "In + Back") + opt("in", "In only") : opt("in", "On")) + opt("off", "Off") +
      `</select></label>` + slider("in") + (t.back ? slider("back") : "");
    const sel = box.querySelector("[data-mode]");
    sel.value = t.mode;
    sel.addEventListener("change", () => {
      t.mode = sel.value; ls.set(`wipe.${t.id}.mode`, t.mode);
      window.MTX?.api?.toast?.(`${t.label} video: ${sel.selectedOptions[0].textContent}`);
    });
    box.querySelectorAll("[data-speed]").forEach(r => {
      const dir = r.dataset.speed, out = box.querySelector(`[data-out="${dir}"]`);
      const show = () => { out.textContent = (+t.speed[dir]).toFixed(2) + "x"; };
      r.value = t.speed[dir]; show();
      r.addEventListener("input", () => { t.speed[dir] = +r.value; ls.set(`wipe.${t.id}.speed.${dir}`, r.value); show(); });
    });
    host.appendChild(box);
  }

  const wipe = UI.wipe = {
    isPlaying: () => !!playing,
    list: () => list.slice(),
    register(def) {
      const t = Object.assign({ back: null }, def);
      t.mode = ls.get(`wipe.${t.id}.mode`, t.back ? "both" : "in");
      if (!t.back && t.mode === "both") t.mode = "in";
      t.speed = { in: +ls.get(`wipe.${t.id}.speed.in`, 1), back: +ls.get(`wipe.${t.id}.speed.back`, 1) };
      list.push(t);
      video(t.in); if (t.back) video(t.back);   // load early so the first press does not wait
      devRow(t);
      return t;
    },
    route(from, to, go, screenEl) {
      if (playing || !from || from === to) return false;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      for (const t of list) {
        const dir = t.from === from && t.to === to ? "in" : t.to === from && t.from === to ? "back" : null;
        if (!dir || t.mode === "off" || (dir === "back" && (t.mode !== "both" || !t.back))) continue;
        return play(t, dir, go, screenEl);
      }
      return false;
    },
  };

  /* ---------- registered transitions ---------- */
  // Ultimate_Fight_Transition_IN-OUT.mov (qtrle ARGB 1920x1080, 29.97 fps): covered frames 15-96, clear from 101 (trimmed)
  wipe.register({
    id: "ultimate", label: "Main ↔ Ultimate Fight", from: "main", to: "career",
    in:   { src: BASE + "ultimate-fight-transition.webm",     switchAt: 0.60, revealAt: 3.15, end: 3.40 },
    back: { src: BASE + "ultimate-fight-transition-rev.webm", switchAt: 0.30, revealAt: 2.82, end: 3.40 },   // the same clip reversed
  });
})();
