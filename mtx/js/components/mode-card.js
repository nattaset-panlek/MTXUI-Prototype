// MTX / Mode Card (Figma 613:60103) and Match Find (Figma 613:59644).
//   const card = MTX_MODE_CARD.create({ title, description, label, state, id });
//   MTX_MODE_CARD.setState(card, "default" | "focused" | "disabled");   // hover comes from CSS
//   MTX_MODE_CARD.startFind(card, { mode: "Rank Fight", onDone, onCancel, bg });   // duration: ms, default random 15-20 s;   // A / B calls cancelFind()
//   bg: true = background search: no screen lock, no hint swap, input stays free (Ultimate Fight; Main Quick Fight too).
//   lockOthers: true (with bg) = the other mode cards (other game modes) look normal; pressing one asks before the search stops (app.js confirm).
//   Every find shows the Find Strip (#find-strip, Figma MTX / Find Strip) on the top edge of every screen: time, mode, estimate;
//   past the estimate (est, ms, default 45 s) it turns to "Widening search".
//   MTX_MODE_CARD.isLocked() -> true only for a locked (non-bg) find; getFind() -> { mode, started, bg } | null
(function () {
  let find = null;
  const FIST = "mtx/assets/img/fist.webp";
  const clock = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function create({ title = "", description = "", label = "", state = "default", id } = {}) {
    const a = document.createElement("a");
    a.className = "mode-card tex focus-ring focus-ring--out";
    a.setAttribute("data-nav", "");
    if (id) a.dataset.id = id;
    const add = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; n.textContent = text; a.append(n); };
    add("h3", "mode-card__title", title);
    if (label) add("p", "mode-card__label", label);
    add("p", "mode-card__sub", description);
    const fx = document.createElement("span");
    fx.className = "mode-card__fx";
    fx.innerHTML = `<img class="mode-card__fist" src="${FIST}" alt="">`;
    a.append(fx);
    setState(a, state);
    return a;
  }

  function setState(card, state) {
    card.classList.toggle("is-focused", state === "focused");
    card.classList.toggle("is-disabled", state === "disabled");
  }

  // Every other button in the screen is disabled until the find ends; input is blocked by isFinding() in app.js.
  function startFind(card, { title = "Finding match", mode = "", status = "Searching for room", duration = 15000 + Math.random() * 5000, onDone, onCancel, bg = false, est = 45000, lockOthers = false } = {}) {
    if (find) return;
    const scope = card.closest(".screen") || document.body;
    const box = document.createElement("span");
    box.className = "mode-card__find";
    box.innerHTML = `<span class="mode-card__find-title"></span><b class="mode-card__find-time">00:00</b>
      <span class="mode-card__find-mode"></span><span class="mode-card__find-status"></span>`;
    box.children[0].textContent = title;
    box.children[2].textContent = mode;
    box.children[3].textContent = status;
    card.append(box);
    card.classList.add("is-finding");
    const others = bg && !lockOthers ? [] : [...scope.querySelectorAll(".mode-card")].filter(c => c !== card && !c.classList.contains("is-disabled"));
    if (!bg) scope.classList.add("is-find-lock");
    others.forEach(c => c.classList.add(lockOthers ? "is-find-off" : "is-disabled"));
    const hintBar = bg ? null : scope.querySelector(".hint-bar");
    const savedHints = hintBar?.innerHTML;
    if (hintBar) hintBar.innerHTML = window.MTX_UI.hintItems({ "b+a": "Cancel match find" });
    const started = Date.now();
    const badge = showStrip(mode, est);
    const tick = setInterval(() => { const ms = Date.now() - started, t = clock(Math.floor(ms / 1000)); box.children[1].textContent = t; updStrip(badge, t, ms, est); }, 250);
    find = { card, box, scope, others, tick, onDone, onCancel, started, hintBar, savedHints, bg, mode, badge };
    find.timer = setTimeout(() => stopFind(true), duration);
  }

  function stopFind(done = false) {
    if (!find) return;
    const { card, box, scope, others, tick, timer, onDone, hintBar, savedHints, badge } = find;
    find = null;
    clearInterval(tick);
    clearTimeout(timer);
    if (hintBar) hintBar.innerHTML = savedHints;
    box.remove();
    if (badge) { badge.classList.add("is-out"); setTimeout(() => badge.remove(), 320); }
    card.classList.remove("is-finding");
    scope.classList.remove("is-find-lock");
    others.forEach(c => c.classList.remove("is-disabled", "is-find-off"));   // either one was added
    if (done) onDone?.();
  }

  // A / B cancel; the short guard stops the press that started the find (or its key repeat) from cancelling it.
  function cancelFind() {
    if (!find || Date.now() - find.started < 400) return;
    const { onCancel } = find;
    stopFind(false);
    onCancel?.();
  }

  // Find Strip: one per stage, on the top edge (Figma MTX / Find Strip 670:66464). html() is shared with the Figma bake demo (demos/match-wait-opts.js).
  const estText = (ms, est) => ms > est ? "Widening search" : "Est. " + clock(Math.round(est / 1000));
  function stripHTML({ mode = "", time = "00:00", ms = 0, est = 45000 } = {}) {
    const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    return `<i class="find-strip__tex"></i><i class="find-strip__track"><i class="find-strip__fill" style="width:${Math.max(2, Math.min(100, ms / est * 100))}%"></i></i>
      <span class="find-strip__row"><span class="find-strip__l"><span class="find-strip__mode">${esc(mode)}</span></span>
      <b class="find-strip__time">${time}</b><span class="find-strip__r"><span class="find-strip__est">${estText(ms, est)}</span></span></span>`;
  }
  function showStrip(mode, est) {
    document.getElementById("find-strip")?.remove();
    const b = document.createElement("div");
    b.id = "find-strip"; b.className = "find-strip";
    b.innerHTML = stripHTML({ mode, est });
    (document.getElementById("stage") || document.body).appendChild(b);
    return b;
  }
  function updStrip(b, t, ms, est) {
    b.querySelector(".find-strip__time").textContent = t;
    b.querySelector(".find-strip__fill").style.width = Math.max(2, Math.min(100, ms / est * 100)) + "%";
    b.querySelector(".find-strip__est").textContent = estText(ms, est);
    b.classList.toggle("is-long", ms > est);
  }

  window.MTX_MODE_CARD = { stripHTML, create, setState, startFind, stopFind, cancelFind, isFinding: () => !!find, isLocked: () => !!find && !find.bg,
    getFind: () => find && { mode: find.mode, started: find.started, bg: find.bg, card: find.card } };
})();
