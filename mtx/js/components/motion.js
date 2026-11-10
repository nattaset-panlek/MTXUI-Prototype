/* Component: screen motion (enter / exit choreography).
   Every screen change plays an exit on the old screen and an enter on the new one, with no per-screen code:
   - blocks slide in from the screen edge they sit nearest, with a slight motion blur, in a wave that runs
     left to right and top to bottom; big or central blocks rise and settle instead
   - rows of like items (mode cards, list rows, hint items: 3+ siblings sharing a class) cascade one by one
   - the background settles from a slight zoom
   - the old screen stays on top while its parts slide back out to their edges, then fades to show the new one
   Transforms are added on top of each element's own (composite "add"), so CSS positioning is never disturbed.

     MTX_UI.motion.enter(screenEl)   after the screen is shown and its enter() has built its content
     MTX_UI.motion.leave(screenEl)   when it is hidden
     MTX_UI.motion.enabled           false = instant (also off with prefers-reduced-motion)
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const EASE_OUT = "cubic-bezier(.16,1,.3,1)", EASE_IN = "cubic-bezier(.7,0,.84,0)";
  const ENTER_MS = 620, LEAVE_MS = 220, START_MS = 140, WAVE_MS = 280, CASCADE_MS = 45, MAX_CASCADE = 10;
  const SLIDE_IN = 80, SLIDE_OUT = 50, ITEM_SLIDE = 44;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const motion = UI.motion = { enabled: true };
  const anims = new WeakMap();    // element -> its running motion animations
  const leaving = new WeakMap();  // screen -> cleanup timer
  const leftParts = new WeakMap(); // screen -> parts still held at opacity 0 by the exit (fill: forwards)

  const on = () => motion.enabled && !reduced.matches;
  const shown = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.display !== "none" && cs.visibility !== "hidden";
  };
  const stop = el => { (anims.get(el) || []).forEach(a => a.cancel()); anims.delete(el); };
  const keep = (el, list) => anims.set(el, list);

  // a row of like items: 3+ shown children, most of them sharing their first class
  function items(block) {
    const kids = [...block.children].filter(shown);
    if (kids.length < 3) return null;
    const key = el => el.classList[0] || el.tagName;
    const same = kids.filter(el => key(el) === key(kids[0]));
    return same.length >= Math.max(3, kids.length * 0.6) ? same : null;
  }
  // what moves: the direct parts of the frame and the HUD; a wrapper that fills most of the screen is opened up
  function targets(screen) {
    const sr = screen.getBoundingClientRect(), out = [];
    const visit = (el, depth) => {
      if (!shown(el)) return;
      const r = el.getBoundingClientRect();
      const big = r.width * r.height > sr.width * sr.height * 0.7;
      const kids = [...el.children].filter(shown);
      if (big && depth < 2 && kids.length >= 2 && !el.matches("img, canvas, video")) { kids.forEach(k => visit(k, depth + 1)); return; }
      const row = items(el);
      if (row) row.slice(0, 24).forEach((item, i) => out.push({ el: item, parent: el, i }));
      else out.push({ el, i: 0 });
    };
    screen.querySelectorAll(":scope > .screen__safe > *, :scope > .screen__chrome > *").forEach(el => visit(el, 0));
    return out;
  }
  // where a part comes from / goes to: its nearest screen edge, or a rise for big / central parts
  function vector(el, sr, dist) {
    const r = el.getBoundingClientRect();
    const nx = (r.left + r.width / 2 - sr.left) / sr.width, ny = (r.top + r.height / 2 - sr.top) / sr.height;
    const area = (r.width * r.height) / (sr.width * sr.height);
    const d = { left: nx, right: 1 - nx, top: ny, bottom: 1 - ny };
    const edge = Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
    if (area > 0.3) return { nx, ny, kind: "zoom", t: "scale(1.035)" };
    if (d[edge] > 0.3) return { nx, ny, kind: "rise", t: `translate(0px, ${dist * 0.4}px) scale(.97)` };
    const x = edge === "left" ? -dist : edge === "right" ? dist : 0, y = edge === "top" ? -dist : edge === "bottom" ? dist : 0;
    return { nx, ny, kind: "slide", t: `translate(${x}px, ${y}px)` };
  }
  const wave = v => (v.nx * 0.65 + v.ny * 0.35) * WAVE_MS;

  motion.enter = screen => {
    if (!on()) return;
    clearTimeout(leaving.get(screen)); screen.classList.remove("is-leaving"); stop(screen);   // shown again while still leaving
    // every part the exit faded out goes back first: enter may not find the same parts, and a part left held at opacity 0 never shows
    (leftParts.get(screen) || []).forEach(stop); leftParts.delete(screen);
    const sr = screen.getBoundingClientRect();
    const bg = screen.querySelector(":scope > .screen__bg");
    if (bg) {
      stop(bg);
      keep(bg, [bg.animate([{ transform: "scale(1.06)" }, { transform: "none" }], { duration: 1100, easing: EASE_OUT, composite: "add" }),
                bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: START_MS * 0.5, easing: "ease-out", fill: "backwards" })]);
    }
    const parentVec = new Map();
    for (const { el, parent, i } of targets(screen)) {
      stop(el);
      let v, delay;
      if (parent) {   // a row cascades from its row's side, one item after another
        if (!parentVec.has(parent)) parentVec.set(parent, vector(parent, sr, ITEM_SLIDE));
        v = parentVec.get(parent);
        delay = START_MS + wave(v) + Math.min(i, MAX_CASCADE) * CASCADE_MS;
      } else {
        v = vector(el, sr, SLIDE_IN);
        delay = START_MS + wave(v);
      }
      const o = getComputedStyle(el).opacity, list = [
        el.animate([{ transform: v.t }, { transform: "none" }], { duration: ENTER_MS, delay, easing: EASE_OUT, fill: "backwards", composite: "add" }),
        el.animate([{ opacity: 0 }, { opacity: o }], { duration: ENTER_MS * 0.55, delay, easing: "ease-out", fill: "backwards" }),
      ];
      if (v.kind === "slide" && getComputedStyle(el).filter === "none")
        list.push(el.animate([{ filter: "blur(6px)" }, { filter: "blur(0px)" }], { duration: ENTER_MS * 0.5, delay, easing: EASE_OUT, fill: "backwards" }));
      keep(el, list);
    }
  };

  motion.leave = screen => {
    if (!on()) return;
    const sr = screen.getBoundingClientRect(), moved = [];
    screen.classList.add("is-leaving");
    for (const { el, i } of targets(screen)) {
      stop(el);
      const v = vector(el, sr, SLIDE_OUT), delay = v.nx * 40 + Math.min(i, MAX_CASCADE) * 12;
      const to = v.kind === "zoom" ? "scale(.985)" : v.t;
      keep(el, [el.animate([{ transform: "none" }, { transform: to }], { duration: LEAVE_MS, delay, easing: EASE_IN, fill: "forwards", composite: "add" }),
                el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: LEAVE_MS, delay, easing: EASE_IN, fill: "forwards" })]);
      moved.push(el);
    }
    // the whole screen holds while its parts leave, then fades to show the new screen entering behind it
    stop(screen);
    keep(screen, [screen.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: LEAVE_MS + 180, fill: "forwards" })]);
    (leftParts.get(screen) || []).forEach(stop);
    leftParts.set(screen, moved);
    clearTimeout(leaving.get(screen));
    leaving.set(screen, setTimeout(() => {   // faded out: put the screen and every part back for next time
      screen.classList.remove("is-leaving");
      stop(screen);
      moved.forEach(stop); leftParts.delete(screen);
    }, LEAVE_MS + 220));
  };
})();
