/* MTX controller-flow prototype engine.
   Markup contract (see index.html):
     section.screen[data-screen][data-first][data-y|data-x|data-lt|data-rt="go:… | fn:… | toast:…"]
     [data-nav]            focusable element; actions: data-go, data-fn, data-focus, data-toast, data-back
     [data-use]            stamped from <template id="tpl-…">
     .hint-bar[data-hints] '{"btn":"Label","btn+btn":"Label"}'  rendered by components/hint-bar.js
     .glyph[data-btn]      label filled per device (xbox / ps / kb)
     [data-bind]           element updated by screen logic below */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const stage = $("#stage");
  const bind = (name, scope = document) => $(`[data-bind="${name}"]`, scope);
  const store = {
    get(k, d) { try { return localStorage.getItem("mtx." + k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mtx." + k, v); } catch (e) {} },
  };

  /* ---------------------------------------------------------------- popups: screen layers
     Simulate-day popups (.flow-modal) were authored as flat 1920x1080 frames. Give them the screen skeleton so
     21:9 works like every screen: .screen__bg full bleed, .screen__safe = the centred 1920 frame (content in frame
     px), .screen__chrome = brand / player HUD / hint bar / social bar hugging the stage edges. */
  $$(".flow-modal").forEach(m => {
    if (m.querySelector(":scope > .screen__safe")) return;
    const safe = document.createElement("div"), chrome = document.createElement("div");
    safe.className = "screen__safe";
    chrome.className = "screen__chrome";
    const isChrome = el => el.matches(".brand, .hint-bar, .social-bar, .player-hud, [data-use='player-hud'], [data-use='social-bar']");
    [...m.children].forEach(el => {
      if (el.classList.contains("screen__bg")) return;
      (isChrome(el) ? chrome : safe).appendChild(el);
    });
    m.append(safe, chrome);
  });

  /* ---------------------------------------------------------------- components */
  $$("[data-use]").forEach(slot => {
    const tpl = $("#tpl-" + slot.dataset.use);
    const node = tpl.content.firstElementChild.cloneNode(true);
    if (slot.dataset.variant) node.classList.add(node.classList[0] + "--" + slot.dataset.variant);
    slot.replaceWith(node);
  });
  window.MTX_UI.renderHintBars();

  /* ---------------------------------------------------------------- input glyphs */
  const GLYPHS = {
    xbox: { a: "A", b: "B", x: "X", y: "Y", ls: "LS", rs: "RS", lb: "LB", rb: "RB", lt: "LT", rt: "RT", zl: "LT", zr: "RT", menu: "Menu", dl: "Left", dr: "Right", du: "Up", dd: "Down", dud: "Up / Down", dlr: "Left / Right", dall: "D-pad" },
    ps:   { a: "✕", b: "○", x: "□", y: "△", ls: "L", rs: "R", lb: "L1", rb: "R1", lt: "L2", rt: "R2", zl: "L2", zr: "R2", menu: "Options", dl: "Left", dr: "Right", du: "Up", dd: "Down", dud: "Up / Down", dlr: "Left / Right", dall: "D-pad", view: "Share" },
    kb:   { a: "Space", b: "Esc", x: "X", y: "Y", ls: "WASD", rs: "C", lb: "Q", rb: "E", lt: "Q", rt: "E", zl: "Z", zr: "C", menu: "Tab", dl: "A", dr: "D", du: "W", dd: "S", dud: "W/S", dlr: "A/D", dall: "WASD", view: "F" },
  };
  // PlayStation glyphs come in two icon sets (assets/img/pad/ps5 | ps4); body[data-pad] picks one
  let device = "kb", deviceLock = store.get("device", "auto"), psModel = "ps5";
  if (deviceLock === "ps") deviceLock = "ps5";
  function setDevice(d) {
    if (deviceLock !== "auto") d = deviceLock;
    if (d === "ps4" || d === "ps5") { psModel = d; d = "ps"; }
    if (d === device && document.body.dataset.device && document.body.dataset.pad === psModel) return;
    device = d; document.body.dataset.device = d; document.body.dataset.pad = psModel;
    $$(".glyph[data-btn]").forEach(g => { g.textContent = GLYPHS[d][g.dataset.btn] ?? g.dataset.btn.toUpperCase(); });
  }

  /* ---------------------------------------------------------------- overlays */
  const start = document.createElement("div");
  start.id = "start";
  start.className = "intro";   // Figma "Intro" 301:44036
  start.innerHTML = `<p class="intro__press">Press  any button to start</p>
    ${window.MTX_UI.hintBar({ b: "Quit" }, { cls: "intro__hints" })}`;
  const titleBg = document.createElement("div");
  titleBg.id = "titleBg"; titleBg.innerHTML = `<div class="tb__arena"></div><div class="tb__crowd"></div><div class="tb__logo"></div>`;
  stage.appendChild(titleBg);
  // "intro" | "login" (logo slides to the Login spot) | "off" (fades out into the game)
  let tbT = 0;
  window.MTX_PREGAME = () => !titleBg.hidden && !titleBg.classList.contains("is-off");   // Intro / Login on screen (not logged in yet)
  window.MTX_TITLE = mode => {
    clearTimeout(tbT);
    if (mode === "off") { titleBg.classList.add("is-off"); tbT = setTimeout(() => { titleBg.hidden = true; }, 460); return; }
    titleBg.hidden = false; titleBg.classList.remove("is-off"); titleBg.classList.toggle("is-login", mode === "login");
  };
  stage.appendChild(start);
  if (window.MTX_SHADER?.needed?.()) window.MTX_SHADER.open();   // first launch: compile shaders, then the Intro
  // Options > Main menu: log out and go back to the Login page
  window.MTX_LOGOUT = () => { window.MTX_LOGIN?.logout?.(); window.MTX_CAMPAIGN?.reset?.(); window.MTX_TITLE("login"); window.MTX_LOGIN?.open(onLoggedIn, backToIntro); };
  /* Action log (outside the stage): feedback is written here instead of popping over the UI */
  const logList = $("#logList"), logCount = $("#logCount");
  let logN = 0, curName = "";
  function log(msg, kind = "result") {
    const li = document.createElement("li");
    li.className = "log__item log__item--" + kind;
    const t = new Date(), ts = t.toTimeString().slice(0, 8);
    li.innerHTML = `<time>${ts}</time><span class="log__screen"></span><span class="log__msg"></span>`;
    li.querySelector(".log__screen").textContent = curName;
    li.querySelector(".log__msg").textContent = msg;
    logList.prepend(li);
    while (logList.children.length > 200) logList.lastChild.remove();
    logCount.textContent = ++logN;
  }
  const toast = m => log(m, "result");

  /* ---------------------------------------------------------------- stage fit + ratio */
  const RATIOS = { "16:9": 1920, "21:9": 2520 };
  let W = 1920;
  function fit() {
    const k = Math.min(innerWidth / W, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - W * k) / 2}px,${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
  }
  function setRatio(r) {
    if (!RATIOS[r]) r = "16:9";
    W = RATIOS[r];
    stage.style.setProperty("--sw", W + "px");
    stage.style.setProperty("--ox", (W - 1920) / 2 + "px");
    document.body.classList.toggle("ratio-21-9", r === "21:9");
    $("#ratio").value = r; store.set("ratio", r); fit();
    applyLayoutOverrides?.();
    renderWires?.();
  }
  addEventListener("resize", fit);

  /* ---------------------------------------------------------------- navigation */
  const screens = {};
  $$(".screen").forEach(s => { screens[s.dataset.screen] = s; });
  if (screens.management && !screens.simulation) screens.simulation = screens.management;
  if (screens.simulation && !screens.management) screens.management = screens.simulation;
  const stack = [], remembered = {};
  let cur = null, focused = null, started = false;
  const navs = () => $$("[data-nav]", screens[cur]).filter(el => el.offsetParent !== null || el.getClientRects().length);

  //#region [Match Find in the background]
  // Ultimate Fight = career and every page opened on top of it (career is in the history stack).
  // Leaving it while a background find runs asks first; a found match waits until no hold / dialog / modal / load is busy.
  const bgFind = () => window.MTX_MODE_CARD?.getFind?.()?.bg;
  const inUF = () => stack.includes("career");
  // A find started on Main (Quick Fight) runs while the player browses (Shop, Event, Profile, Settings...): screen changes do not
  // ask (nav = true); only logging out (Options › Main menu) and the other mode cards (is-find-off, see confirm) ask first.
  function findLeaveGuard(go, nav = false) {
    if (!bgFind()) return false;
    const home = window.MTX_MODE_CARD.getFind().card?.closest(".screen")?.dataset.screen;
    if (home === "main" ? nav : !inUF()) return false;
    window.MTX_UI.dialog.open({ title: "Cancel Match Find?", body: home === "main" ? "You are leaving the game menu. The match search will stop." : "You are leaving Ultimate Fight. The match search will stop.",
      primary: "Cancel find", secondary: "Stay", onPrimary: () => { window.MTX_MODE_CARD.stopFind(false); toast("Match find cancelled"); go(); }, onSecondary: () => {}, onClose: () => {} });
    return true;
  }
  window.MTX_FIND_LEAVE = findLeaveGuard;   // Options › Main menu uses it too
  const findBusy = () => !!(document.querySelector(".is-holding") || window.MTX_UI?.dialog?.isOpen?.() || window.MTX_UI?.modal?.isOpen?.() ||
    window.MTX_LOADING?.isOpen?.() || window.MTX_SCREENS?.simulation?.isModalOpen?.() || window.MTX_SCREENS?.management?.isModalOpen?.() || window.MTX_LOGIN?.isOpen?.());
  function findReady(cb, waited = 0) {
    if (findBusy() && waited < 15000) { setTimeout(() => findReady(cb, waited + 250), 250); return; }
    [window.MTX_OPTIONS, window.MTX_SETTINGS, window.MTX_FRIENDS, window.MTX_CAMPAIGN].forEach(o => { if (o?.isOpen?.()) o.close(); });
    if (cur !== "career") { const i = stack.indexOf("career"); if (i >= 0) { stack.length = i; show("career"); } }   // the match comes back to Ultimate Fight
    cb();
  }
  //#endregion

  function show(key, push = true) {
    if (push && key === "main" && cur !== "main" && findLeaveGuard(() => show(key, push), true)) return;
    if (cur) {
      remembered[cur] = focused && focused.dataset.id;
      if (cur !== key) window.MTX_UI?.motion?.leave(screens[cur]);
      screens[cur].classList.remove("is-active");
    } else $$(".screen.is-active").forEach(el => el.classList.remove("is-active"));   // boot marks Main active behind the Intro
    const changed = cur !== key;
    if (push) stack.push(key);
    cur = key; curName = key;
    const s = screens[key];
    log("Open " + key, "nav");
    s.classList.add("is-active");
    applyLayoutOverrides();
    updateWireHandles?.();
    renderWires?.();
    window.MTX_SCREENS?.[key]?.enter?.();
    if (changed) window.MTX_UI?.motion?.enter(s);   // after enter() has built the screen's rows
    const want = (!push && remembered[key]) || s.dataset.first;
    setFocus($(`[data-nav][data-id="${want}"]`, s) || navs()[0]);
    // screens build their rows in enter(): refresh the navigation editor once they exist
    if (wireMode) requestAnimationFrame(() => { updateWireHandles(); renderWires(); });
  }
  // start a new history at this screen: Character Select and Main Menu have no page behind them
  function showRoot(key) { if (key !== "career" && findLeaveGuard(() => showRoot(key), true)) return; stack.length = 0; show(key); }
  function back() {
    if (stack.length <= 1) { toast("Main menu"); return; }
    if (stack[stack.length - 1] === "career" && findLeaveGuard(() => { stack.pop(); show(stack[stack.length - 1], false); }, true)) return;
    stack.pop(); show(stack[stack.length - 1], false);
  }
  function setFocus(el) {
    if (focused) focused.classList.remove("is-focused");
    focused = el || null;
    if (el) el.classList.add("is-focused");
    window.MTX_UI.syncFocusHints(el);
    window.MTX_SCREENS?.[cur]?.focus?.(el);
  }
  function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function move(dir) {
    if (!focused) { setFocus(navs()[0]); return; }
    const t = navTarget(focused, dir);
    if (t) setFocus(t);
  }

  // where `dir` goes from `from`: a markup pin (data-nav-up="id"), then a custom Prototype wire, then the
  // geometric default. opts.noCustom = the system default only (used to draw default links while editing).
  function navTarget(from, dir, opts = {}) {
    const ownTarget = from.getAttribute("data-nav-" + dir);   // markup can pin a direction: data-nav-up="lv2"
    if (ownTarget) {
      const el = $(`[data-nav][data-id="${ownTarget}"]`, screens[cur]);
      if (el) return el;
    }
    if (!opts.noCustom) {
      const wireTarget = getWireTarget?.(cur, from.dataset.id, dir);
      if (wireTarget === "-") return null;   // blocked in the Navigation graph
      if (wireTarget) {
        const el = $(`[data-nav][data-id="${wireTarget}"]`, screens[cur]) || $(`#${wireTarget}`);
        if (el) return el;
      }
    }
    const [cx, cy] = center(from); let best = null, bs = Infinity;
    if (screens[cur].dataset.navMode === "rows") {     // trees/grids: nearest row first, then nearest in that row
      const vert = dir === "up" || dir === "down", sign = dir === "down" || dir === "right" ? 1 : -1, BAND = 24;
      const linkRank = el => (window.MTX_SCREENS?.skilltree?.isLinked?.(from.dataset.id, el.dataset.id) ? 0 : 1);
      const cand = navs().filter(el => el !== from).map(el => { const [x, y] = center(el); return { el, dx: x - cx, dy: y - cy }; })
        .filter(c => vert ? c.dy * sign > 4 : (Math.abs(c.dy) < BAND && c.dx * sign > 4));
      if (cand.length) {
        const near = Math.min(...cand.map(c => Math.abs(vert ? c.dy : c.dx)));
        const pick = vert ? cand.filter(c => Math.abs(c.dy) <= near + BAND).sort((a, b) => linkRank(a.el) - linkRank(b.el) || Math.abs(a.dx) - Math.abs(b.dx))[0]
                          : cand.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx))[0];
        return pick.el;
      }
      if (!vert) return null;
    }
    for (const el of navs()) {
      if (el === from) continue;
      const [x, y] = center(el), dx = x - cx, dy = y - cy;
      const ok = { up: dy < -4, down: dy > 4, left: dx < -4, right: dx > 4 }[dir]; if (!ok) continue;
      const vert = dir === "up" || dir === "down";
      const score = (vert ? Math.abs(dy) : Math.abs(dx)) + (vert ? Math.abs(dx) : Math.abs(dy)) * 2.2;
      if (score < bs) { bs = score; best = el; }
    }
    return best;
  }
  function runFn(name, el) {
    const scr = window.MTX_SCREENS?.[cur];
    if (scr?.actions?.[name]) {
      scr.actions[name](el);
      return;
    }
    for (const s of Object.values(window.MTX_SCREENS || {})) {
      if (s?.actions?.[name]) {
        s.actions[name](el);
        return;
      }
    }
  }

  function runSpec(spec, el) {          // "go:x" | "fn:x" | "toast:msg"
    if (!spec) return false;
    if (spec === "back") { back(); return true; }
    const i = spec.indexOf(":"), k = spec.slice(0, i), v = spec.slice(i + 1);
    if (k === "go") { rumble(80, .35); show(v); }
    if (k === "fn") runFn(v, el || focused);
    if (k === "toast") toast(v);
    if (k === "back") back();
    return true;
  }
  function confirm(force = false) {
    const el = focused; if (!el) return;
    // a mode card switched off by a running Match Find: it can be focused, pressing it asks before the search stops
    if (!force && el.classList.contains("is-find-off") && window.MTX_MODE_CARD?.isFinding?.()) {
      const name = (el.querySelector(".mode-card__title")?.textContent || "this mode").replace(/s+/g, " ").trim();
      window.MTX_UI.dialog.open({ title: "Leave Match Finding?", body: `Opening ${name} stops the match search.`, primary: "Leave", secondary: "Stay",
        onPrimary: () => { window.MTX_MODE_CARD.stopFind(false); toast("Match find cancelled"); setFocus(el); confirm(true); }, onSecondary: () => {}, onClose: () => {} });
      return;
    }
    el.classList.add("is-pressed"); setTimeout(() => el.classList.remove("is-pressed"), 110);
    const d = el.dataset;
    if (d.fn) { runFn(d.fn, el); return; }
    if (d.go) { rumble(80, .35); show(d.go); return; }
    if (d.focus) { rumble(60, .25); setFocus($(`[data-nav][data-id="${d.focus}"]`, screens[cur])); return; }
    if (d.toast) toast(d.toast);
    if ("back" in d) { rumble(140, .5); setTimeout(back, 350); }
  }

  /* ---------------------------------------------------------------- feedback */
  function rumble(ms, mag) {
    const gp = activePad(), a = gp && gp.vibrationActuator;
    try { a && a.playEffect && a.playEffect("dual-rumble", { duration: ms, strongMagnitude: mag, weakMagnitude: mag * .6 }); } catch (e) {}
  }
  let idleT, uiHidden = store.get("ui_hidden", "0") === "1";
  function setUiHidden(hide) {
    uiHidden = hide;
    document.body.classList.toggle("ui-hidden", uiHidden);
    store.set("ui_hidden", uiHidden ? "1" : "0");
    if (!uiHidden) wake();
  }
  function toggleUi() {
    setUiHidden(!uiHidden);
    toast(uiHidden ? "HUD & Tools hidden (Press H to restore)" : "HUD & Tools restored");
    log(uiHidden ? "HUD & Tools hidden (H)" : "HUD & Tools restored", "state");
  }
  if (uiHidden) document.body.classList.add("ui-hidden");
  function wake() {
    if (uiHidden) return;
    ["#hud", "#tools"].forEach(s => $(s)?.classList.remove("idle")); clearTimeout(idleT);
    idleT = setTimeout(() => { $("#hud")?.classList.add("idle"); if ($("#dev")?.hidden && $("#logPanel")?.hidden) $("#tools")?.classList.add("idle"); }, 2500);
  }
  function logIn(l) { $("#lastIn").textContent = String(l).replace(/^Key /, ""); wake(); }

  /* ---------------------------------------------------------------- actions */
  const LOAD_MS = 4000;   // load screen between Login and Character Select
  function startGame() {
    if (started) return; started = true;
    start.classList.add("is-leaving"); setTimeout(() => { if (started) start.hidden = true; start.classList.remove("is-leaving"); }, 320);   // intro text fades out
    if (!window.MTX_LOGIN || window.MTX_LOGIN.isLoggedIn()) { showRoot("charselect"); window.MTX_TITLE("off"); return; }   // logged in before (not logged out): straight in
    window.MTX_TITLE("login");   // same arena, the logo moves to its Login spot
    window.MTX_LOGIN.open(onLoggedIn, backToIntro);
  }
  function onLoggedIn() {
    const enter = () => { showRoot("charselect"); window.MTX_TITLE("off"); };
    if (window.MTX_LOADING) window.MTX_LOADING.show({ duration: LOAD_MS, onDone: enter }); else enter();
  }   // the Campaign window opens when a character is confirmed
  function backToIntro() { started = false; start.hidden = false; window.MTX_TITLE("intro"); }
  // screens whose A is a hold (isHoldReady / startHold / cancelHold) and that may take left / right (onDir)
  const HOLD_SCREENS = ["tactical", "attributes"];
  const holdScr = () => (HOLD_SCREENS.includes(cur) ? window.MTX_SCREENS?.[cur] : null);

  function act(a, label, dev) {
    if (window.MTX_SHADER?.isOpen?.()) return;   // Shader Preload (first launch): no input
    if (window.MTX_LOADING?.isOpen?.() || window.MTX_MATCH_FOUND?.isPlaying?.()) return;   // load screen / Match Found video: no input
    if (window.MTX_MATCH_RESULT?.isOpen?.()) { if (dev) setDevice(dev); window.MTX_MATCH_RESULT.input(a); return; }   // Match Result after a fight: A / LT / RT
    if (window.MTX_MODE_CARD?.isLocked?.()) { if (a === "a" || a === "back") window.MTX_MODE_CARD.cancelFind(); return; }   // locked Match Find (Main Quick Fight): only A / B work, they cancel
    if (dev) setDevice(dev);
    logIn(label);
    if (!/^(up|down|left|right)$/.test(a)) log(label + " · " + a.toUpperCase(), "input");
    // Intro / Login: Options and Settings open over them (Tab / Menu); anything else on the Intro starts the game
    const preOvl = [window.MTX_OPTIONS, window.MTX_SETTINGS].find(o => o?.isOpen?.());
    if (window.MTX_PREGAME?.() && preOvl) { preOvl.input(a); return; }
    if (window.MTX_PREGAME?.() && a === "menu") { window.MTX_OPTIONS?.open?.(); return; }
    if (!started) { startGame(); return; }
    if (window.MTX_UI?.navGraph?.isOpen?.() && window.MTX_UI.navGraph.input(a)) return;   // the graph editor has the pad
    // Start (Menu / Options / F) = Options (Mode Cards) · Select (View / Create / Tab) = the Friends page; while one is open it takes every input
    if (window.MTX_UI?.dialog?.isOpen?.()) { window.MTX_UI.dialog.input(a); return; }
    if (window.MTX_UI?.modal?.isOpen?.()) { window.MTX_UI.modal.input(a); return; }
    if (window.MTX_LOGIN?.isOpen?.()) { window.MTX_LOGIN.input(a); return; }
    if (window.MTX_CAMPAIGN?.isOpen?.()) { window.MTX_CAMPAIGN.input(a); return; }
    const ovl = [window.MTX_OPTIONS, window.MTX_SETTINGS, window.MTX_FRIENDS, window.MTX_CLOBBY, window.MTX_TOUR].find(o => o?.isOpen?.());
    // the Custom Lobby has no Menu / View of its own: Tab / F (Start / Select) still open Options / Friends over it
    if (ovl && !(ovl === window.MTX_CLOBBY && (a === "menu" || a === "view") && !ovl.noLauncher?.())) { ovl.input(a); return; }
    if (a === "menu") { window.MTX_OPTIONS?.open?.(); return; }
    if (a === "view") { window.MTX_FRIENDS?.open?.(); return; }
    const s = screens[cur].dataset;
    const scrSkill = window.MTX_SCREENS?.skilltree;
    const scrSim = window.MTX_SCREENS?.management || window.MTX_SCREENS?.simulation;
    if (scrSim?.isModalOpen?.()) {
      if (/^(up|down|left|right)$/.test(a)) { scrSim.handleNav?.(a); return; }
      if (a === "a") { scrSim.handleConfirm?.(); return; }
      if (a === "back") { scrSim.handleCancel?.(); return; }
      if (a === "x" || a === "y") { scrSim.handleAux?.(a); return; }
      return;
    }
    if (cur === "skilltree") {
      if (scrSkill?.isDetailOpen?.()) {
        // info stays open while moving: the panel follows the focused node (focus() below), only between nodes
        if (/^(up|down|left|right)$/.test(a)) {
          const t = focused && navTarget(focused, a);
          if (t?.classList.contains("tnode")) setFocus(t);
          return;
        }
        if (a === "a" && scrSkill.isHoldToUnlockReady?.()) return;
        ({ a: () => scrSkill.detailPrimary?.(),
           x: () => scrSkill.detailSecondary?.(),
           back: () => scrSkill.closeDetail?.(),
           y: () => scrSkill.closeDetail?.() })[a]?.();
        return;
      }
    }
    if (window.MTX_SCREENS?.[cur]?.onInput?.(a)) return;   // a screen can take over its own input (Media: scroll only)
    if ((a === "left" || a === "right") && window.MTX_SCREENS?.[cur]?.onDir?.(a)) return;
    // Main menu / Ultimate Fight: Q / E only act on the selected item that has pages; the hint bar shows them while it is selected
    if ((a === "lt" || a === "rt") && focused?.matches?.(".news-ev")) { window.MTX_CAMPAIGN?.stepCard?.(a === "lt" ? -1 : 1); return; }
    if ((a === "lt" || a === "rt") && (cur === "main" || cur === "career") && !focused?.querySelector?.(".mode-card__pager")) return;
    ({ up: () => move("up"), down: () => move("down"), left: () => move("left"), right: () => move("right"),
       a: confirm, back: () => (window.MTX_SCREENS?.[cur]?.onBack?.() || back()),
       y: () => (cur === "tactical" ? (window.MTX_SCREENS.tactical.onBack?.() || back()) : runSpec(s.y)),
       x: () => runSpec(s.x),
       lt: () => (cur === "main" ? (window.MTX_SCREENS?.main?.prevQuickMode?.()) : runSpec(s.lt) || toast("Previous")),
       rt: () => (cur === "main" ? (window.MTX_SCREENS?.main?.nextQuickMode?.()) : runSpec(s.rt) || toast("Next")) })[a]?.();
  }

  /* ---------------------------------------------------------------- screen modules */




  /* ---------------------------------------------------------------- keyboard / mouse */
  const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right",
    Enter: "a", " ": "a", Escape: "back", Backspace: "back", y: "y", x: "x", q: "lt", e: "rt", c: "rs", f: "view", Tab: "menu" };
  let editing = false;
  addEventListener("keydown", e => {
    if (wireMode && e.key === "Escape") { e.preventDefault(); setNavEdit(false); return; }   // leave navigation editing, not the screen
    if (e.key === "`") { e.preventDefault(); toggleDev(); return; }
    if (e.key.toLowerCase() === "h" && !editing && !(e.target && /input|select|textarea/i.test(e.target.tagName))) {
      e.preventDefault(); toggleUi(); return;
    }
    if (editing || (e.target.closest && e.target.closest("#tools"))) return;
    if (window.MTX_LOGIN?.isOpen?.()) {
      if (e.target.closest && e.target.closest("#login input")) { window.MTX_LOGIN.keyInField(e); return; }
      const k = KEYS[e.key] || KEYS[e.key.toLowerCase()];
      if (k) { e.preventDefault(); if (!e.repeat || /^(up|down|left|right)$/.test(k)) act(k, "Key " + (e.key === " " ? "Space" : e.key), "kb"); }
      return;
    }
    if (window.MTX_UI?.dialog?.isOpen?.() || window.MTX_CAMPAIGN?.isOpen?.() || window.MTX_UI?.modal?.isOpen?.() || window.MTX_OPTIONS?.isOpen?.() || window.MTX_SETTINGS?.isOpen?.() || window.MTX_FRIENDS?.isOpen?.() || window.MTX_CLOBBY?.isOpen?.() || window.MTX_TOUR?.isOpen?.()) {   // the overlay has the keyboard: no holds / second tab rows underneath
      const k = KEYS[e.key] || KEYS[e.key.toLowerCase()];
      if (k) { e.preventDefault(); if (!e.repeat || /^(up|down|left|right)$/.test(k)) act(k, "Key " + (e.key === " " ? "Space" : e.key), "kb"); }
      return;
    }
    // Z / C: a screen with a second tab row (onTrigger) takes them before the usual mapping
    const trig = { z: -1, c: 1 }[e.key.toLowerCase()];
    if (trig && started && !e.repeat && window.MTX_SCREENS?.[cur]?.onTrigger?.(trig)) {
      e.preventDefault(); setDevice("kb"); logIn("Key " + e.key); log(`Key ${e.key} · ${trig < 0 ? "ZL" : "ZR"}`, "input"); return;
    }
    const a = KEYS[e.key] || KEYS[e.key.toLowerCase()]; if (!a) return;
    // a held key auto-repeats: only movement may repeat. Otherwise a hold that closes a modal
    // (hold to select / simulate) keeps firing Confirm on whatever is focused behind it.
    if (e.repeat && !/^(up|down|left|right)$/.test(a)) { e.preventDefault(); return; }
    const scrSkill = window.MTX_SCREENS?.skilltree;
    const scrSim = window.MTX_SCREENS?.management || window.MTX_SCREENS?.simulation;
    const scrRewards = window.MTX_SCREENS?.rewards;
    const scrStore = window.MTX_SCREENS?.store;
    if (a === "a" && (cur === "store" || cur === "pack") && scrStore?.canHold?.()) {
      e.preventDefault();
      setDevice("kb");
      if (!e.repeat) { logIn("Key " + (e.key === " " ? "Space" : e.key)); scrStore.startHold?.(); }
      return;
    }
    if (a === "a" && holdScr()?.isHoldReady?.()) {
      e.preventDefault();
      setDevice("kb");
      if (!e.repeat) { logIn("Key " + (e.key === " " ? "Space" : e.key)); holdScr().startHold(); }
      return;
    }
    if (a === "a" && scrSim?.isSelectHoldReady?.()) {
      e.preventDefault();
      setDevice("kb");
      if (!e.repeat) { logIn("Key " + (e.key === " " ? "Space" : e.key)); scrSim.startSelectHold?.("keyboard"); }
      return;
    }
    if (a === "a" && scrSkill?.isHoldToUnlockReady?.()) {
      e.preventDefault();
      setDevice("kb");
      logIn("Key " + (e.key === " " ? "Space" : e.key));
      if (!e.repeat) scrSkill.startUnlockHold?.("keyboard");
      return;
    }
    if (a === "a" && cur === "rewards" && scrRewards?.isClaimHoldReady?.()) {
      e.preventDefault();
      setDevice("kb");
      logIn("Key " + (e.key === " " ? "Space" : e.key));
      if (!e.repeat) scrRewards.startClaimHold?.("keyboard");
      return;
    }
    if (!scrSim?.isModalOpen?.() && ((a === "a" && (focused?.dataset?.fn === "holdSimulateDay" || focused?.dataset?.holdAction === "simulate")) || (a === "y" && (cur === "career" || cur === "simulation")))) {
      e.preventDefault();
      setDevice("kb");
      logIn("Key " + (e.key === " " ? "Space" : e.key));
      if (!e.repeat) scrSim?.startSimulateHold?.(focused, "keyboard");
      return;
    }
    e.preventDefault(); act(a, "Key " + (e.key === " " ? "Space" : e.key), "kb");
  });
  addEventListener("keyup", e => {
    if (editing) return;
    const a = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (a && window.MTX_UI?.dialog?.isOpen?.()) { window.MTX_UI.dialog.release?.(a); return; }   // dialog hold-to-confirm
    if (a && window.MTX_TOUR?.isOpen?.()) window.MTX_TOUR.release?.(a);   // Tournament holds (lobby Start)
    if (a && window.MTX_CLOBBY?.isOpen?.()) { window.MTX_CLOBBY.release?.(a); return; }   // Custom Lobby holds (Create, Ready, Start, Leave ...)
    if (a === "a") {
      window.MTX_SCREENS?.skilltree?.cancelUnlockHold?.(true);
      window.MTX_SCREENS?.management?.cancelSimulateHold?.();
      window.MTX_SCREENS?.management?.cancelSelectHold?.();
      window.MTX_SCREENS?.store?.cancelHold?.();
      window.MTX_SCREENS?.rewards?.cancelClaimHold?.(true);
      holdScr()?.cancelHold?.(true);
    }
    if (a === "y") {
      window.MTX_SCREENS?.management?.cancelSimulateHold?.();
    }
    if (a === "x") window.MTX_SCREENS?.management?.cancelDeclineHold?.(true);
  });
  addEventListener("blur", () => {
    window.MTX_SCREENS?.management?.cancelDeclineHold?.(false);
    window.MTX_SCREENS?.skilltree?.cancelUnlockHold?.(false);
    window.MTX_SCREENS?.management?.cancelSimulateHold?.();
    window.MTX_SCREENS?.management?.cancelSelectHold?.();
    window.MTX_SCREENS?.store?.cancelHold?.();
    window.MTX_SCREENS?.rewards?.cancelClaimHold?.(false);
    holdScr()?.cancelHold?.(false);
  });
  stage.addEventListener("click", e => {
    if (editing || layoutEditing) return;
    if (window.MTX_SHADER?.isOpen?.()) return;
    if (!started) { setDevice("kb"); startGame(); logIn("Click"); return; }
    const scrSkill = window.MTX_SCREENS?.skilltree;
    if (cur === "skilltree" && scrSkill?.isDetailOpen?.()) {
      if (e.target.closest('[data-bind="sdPrimary"]')) {
        logIn("Click");
        if (scrSkill.isHoldToUnlockReady?.()) {
          const glyph = GLYPHS[device]?.a || "A";
          toast(`Hold ${glyph} for 1.75s to unlock`);
          return;
        }
        scrSkill.detailPrimary?.();
        return;
      }
      if (e.target.closest('[data-bind="sdSecondary"]')) { logIn("Click"); scrSkill.detailSecondary?.(); return; }
      if (!e.target.closest(".skill-detail") && !e.target.closest(".tnode")) scrSkill.closeDetail?.();
      return;
    }
    if (cur === "main") {
      const scrMain = window.MTX_SCREENS?.main;
      const dot = e.target.closest(".mode-card__pager i");
      if (dot && scrMain) {
        logIn("Click");
        const page = dot.dataset.page !== undefined ? +dot.dataset.page : 0;
        scrMain.setQuickMode?.(page);
        const card = $('[data-id="quick"]', screens.main);
        if (card && focused !== card) setFocus(card);
        return;
      }
      const glyph = e.target.closest(".mode-card__pager .glyph");
      if (glyph && scrMain) {
        logIn("Click");
        if (glyph.dataset.btn === "lt") scrMain.prevQuickMode?.();
        else scrMain.nextQuickMode?.();
        return;
      }
    }
    if (cur === "career") {
      const scrCareer = window.MTX_SCREENS?.career;
      const dot = e.target.closest(".mode-card__pager i");
      if (dot && scrCareer) { logIn("Click"); scrCareer.setModePage?.(+dot.dataset.page || 0); return; }
      const glyph = e.target.closest(".mode-card__pager .glyph");
      if (glyph && scrCareer) { logIn("Click"); glyph.dataset.btn === "lt" ? scrCareer.prevMode?.() : scrCareer.nextMode?.(); return; }
    }
    const el = e.target.closest("[data-nav]"); if (!el || !screens[cur].contains(el)) return;
    if (navHeld) { navHeld = false; return; }   // that press was a hold, handled on pointerdown / up
    setDevice("kb"); logIn("Click");
    if (focused !== el) setFocus(el);
    if ((cur === "store" || cur === "pack") && window.MTX_SCREENS?.store?.canHold?.()) return;   // the item card handles its own click
    confirm();   // one click acts
  });
  // Clickable key hints: a hint (hint bar, social bar button, lobby CTA) presses its key, so it does what its label says.
  // Press on pointerdown / release on pointerup: holds (hold to buy / unlock / leave) work with a long press too.
  const HINT_KEY = { a: " ", b: "Escape", x: "x", y: "y", lb: "q", rb: "e", lt: "q", rt: "e", zl: "z", zr: "c", rs: "c",
    menu: "Tab", view: "f", dl: "ArrowLeft", dr: "ArrowRight", dlr: "ArrowRight", du: "ArrowUp", dd: "ArrowDown" };
  // CTAs press their key the same way, so a click does what the pad does (Login has its own row handling)
  const HINT_SEL = ".hint, .social-bar__btn, [data-cl-btn], .btn-cta:not([data-login-row]):not([data-dlg])";
  let hintDown = null;
  const keyEv = (type, key) => document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  const hintBtn = (el, target) => {
    const g = target.closest(".glyph[data-btn]") || el.querySelector(".glyph[data-btn]");
    return g?.dataset.btn || el.dataset.clHint?.split("+")[0] || el.dataset.clBtn || (el.classList.contains("hint--cc") ? "view" : null);
  };
  document.addEventListener("pointerdown", e => {
    if (editing || layoutEditing || e.button !== 0 || !started) return;
    const el = e.target.closest?.(HINT_SEL);
    if (!el || el.closest("#tools") || el.classList.contains("is-off") || el.closest(".mode-card__pager")) return;
    const key = HINT_KEY[hintBtn(el, e.target)];
    if (!key) return;
    e.preventDefault(); e.stopPropagation();
    if (el.matches(".btn-cta[data-nav]") && focused !== el && screens[cur].contains(el)) setFocus(el);
    hintDown = key; keyEv("keydown", key);
  }, true);
  // Mouse on a menu item: one click acts (stage click above). Where A is a hold, press and hold the mouse instead.
  let navHeld = false;
  const aIsHold = () => { const s = window.MTX_SCREENS || {}, sim = s.management || s.simulation;
    return !!(holdScr()?.isHoldReady?.() || sim?.isSelectHoldReady?.() || s.skilltree?.isHoldToUnlockReady?.() || (cur === "rewards" && s.rewards?.isClaimHoldReady?.())
      || (!sim?.isModalOpen?.() && (focused?.dataset?.fn === "holdSimulateDay" || focused?.dataset?.holdAction === "simulate"))); };
  document.addEventListener("pointerdown", e => {
    navHeld = false;
    if (editing || layoutEditing || e.button !== 0 || !started || hintDown) return;
    const nav = e.target.closest?.("[data-nav]");
    if (!nav || !screens[cur]?.contains(nav) || nav.closest(".mode-card__pager") || e.target.closest?.(".mode-card__pager")) return;
    if (focused !== nav) setFocus(nav);
    if (!aIsHold()) return;
    navHeld = true; hintDown = " "; keyEv("keydown", " ");
  });
  const hintUp = () => { if (hintDown) { const k = hintDown; hintDown = null; keyEv("keyup", k); } };
  addEventListener("pointerup", hintUp, true);
  addEventListener("pointercancel", hintUp, true);
  document.addEventListener("click", e => { if (e.target.closest?.(HINT_SEL) && !e.target.closest(".mode-card__pager")) e.stopPropagation(); }, true);
  addEventListener("mousemove", wake);
  $("#fs").addEventListener("click", () => {
    try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => toast("Fullscreen isn't available here")); }
    catch (e) { toast("Fullscreen isn't available here"); }
  });

  /* ---------------------------------------------------------------- gamepad (standard mapping) */
  let padIndex = null, padType = "xbox";
  const prev = {}, held = {};
  function activePad() { const ps = navigator.getGamepads ? navigator.getGamepads() : []; return padIndex != null ? ps[padIndex] : null; }
  function detect(gp) {
    padType = /054c|dualsense|dualshock|playstation|wireless controller/i.test(gp.id) ? "ps" : "xbox";
    // DualSense (PS5) reports product 0ce6 / 0df2 (Edge); everything else from Sony is treated as a DualShock 4
    if (padType === "ps") psModel = /0ce6|0df2|dualsense/i.test(gp.id) ? "ps5" : "ps4";
    const c = $("#padChip"); c.classList.add("on");
    c.textContent = (padType === "ps" ? (psModel === "ps5" ? "PS5" : "PS4") : "Xbox") + " controller";
    setDevice(padType === "ps" ? psModel : padType); wake();
  }
  addEventListener("gamepadconnected", e => { padIndex = e.gamepad.index; detect(e.gamepad); });
  addEventListener("gamepaddisconnected", e => {
    if (e.gamepad.index !== padIndex) return;
    padIndex = null; const c = $("#padChip"); c.classList.remove("on"); c.textContent = "Controller disconnected"; wake();
  });
  // 9 = Menu / Options: only the Character Customize overlay uses it (Profile -> Customization), like keyboard Tab
  const BTN = { 0: "a", 1: "back", 2: "x", 3: "y", 4: "lt", 5: "rt", 6: "lt", 7: "rt", 8: "view", 9: "menu", 11: "rs", 12: "up", 13: "down", 14: "left", 15: "right" };
  const DIRS = ["up", "down", "left", "right"], DELAY = 380, RATE = 120, DEAD = .55;
  function press(key, down, action, label, now) {
    // Character Customize overlay: View toggles it; while open it takes every button (it tells LB from LT by key)
    const cust = window.MTX_SCREENS?.customize;
    // Dialog / Options / Settings / Friends open: every button goes to them (movement repeats), nothing underneath reacts
    if (window.MTX_UI?.dialog?.isOpen?.() || window.MTX_UI?.modal?.isOpen?.() || window.MTX_OPTIONS?.isOpen?.() || window.MTX_SETTINGS?.isOpen?.() || window.MTX_FRIENDS?.isOpen?.() || window.MTX_CLOBBY?.isOpen?.() || window.MTX_TOUR?.isOpen?.()) {
      if (down && !prev[key]) { setDevice(padType); act(action, label, padType); held[key] = now + DELAY; }
      else if (down && DIRS.includes(action) && now >= held[key]) { act(action, label, padType); held[key] = now + RATE; }
      else if (!down && prev[key]) { window.MTX_UI?.dialog?.release?.(action); window.MTX_TOUR?.release?.(action); window.MTX_CLOBBY?.release?.(action); }   // dialog / Custom Lobby holds
      prev[key] = down;
      return;
    }
    if (cust && cust.isOpen?.()) {
      if (down && !prev[key]) { setDevice(padType); logIn(label); cust.handlePad?.(key, action); held[key] = now + DELAY; }
      else if (down && DIRS.includes(action) && now >= held[key]) { cust.handlePad?.(key, action); held[key] = now + RATE; }
      else if (!down && prev[key]) cust.release?.(action);   // Save / Create preset hold
      prev[key] = down;
      return;
    }
    // LT / RT (triggers): a screen with a second tab row (onTrigger) takes them; otherwise they act as Q / E
    if ((key === "b6" || key === "b7") && window.MTX_SCREENS?.[cur]?.onTrigger) {
      if (down && !prev[key]) { setDevice(padType); logIn(label); window.MTX_SCREENS[cur].onTrigger(key === "b6" ? -1 : 1); }
      prev[key] = down;
      return;
    }
    const scrSim = window.MTX_SCREENS?.management || window.MTX_SCREENS?.simulation;
    if (key === "b0") {
      const scrSkill = window.MTX_SCREENS?.skilltree;
      const scrRewards = window.MTX_SCREENS?.rewards;
      if (down && !prev[key]) {
        if ((cur === "store" || cur === "pack") && window.MTX_SCREENS?.store?.canHold?.()) {
          setDevice(padType);
          window.MTX_SCREENS.store.startHold?.();
          prev[key] = down;
          return;
        }
        if (holdScr()?.isHoldReady?.()) {
          setDevice(padType);
          holdScr().startHold();
          prev[key] = down;
          return;
        }
        if (scrSim?.isSelectHoldReady?.()) {
          setDevice(padType);
          scrSim.startSelectHold?.("gamepad");
          prev[key] = down;
          return;
        }
        if (scrSkill?.isHoldToUnlockReady?.()) {
          setDevice(padType);
          scrSkill.startUnlockHold?.("gamepad");
          prev[key] = down;
          return;
        }
        if (cur === "rewards" && scrRewards?.isClaimHoldReady?.()) {
          setDevice(padType);
          scrRewards.startClaimHold?.("gamepad");
          prev[key] = down;
          return;
        }
        if (!scrSim?.isModalOpen?.() && (focused?.dataset?.fn === "holdSimulateDay" || focused?.dataset?.holdAction === "simulate")) {
          setDevice(padType);
          scrSim?.startSimulateHold?.(focused, "gamepad");
          prev[key] = down;
          return;
        }
      } else if (!down && prev[key]) {
        if (scrSkill?.isHoldingUnlock?.() && scrSkill?.getHoldSource?.() === "gamepad") {
          scrSkill.cancelUnlockHold?.(true);
        }
        scrRewards?.cancelClaimHold?.(true);
        scrSim?.cancelSimulateHold?.();
        scrSim?.cancelSelectHold?.();
        window.MTX_SCREENS?.store?.cancelHold?.();
        holdScr()?.cancelHold?.(true);
      }
    }
    if (key === "b3") {
      if (down && !prev[key]) {
        if (!scrSim?.isModalOpen?.() && (cur === "career" || cur === "simulation")) {
          setDevice(padType);
          scrSim?.startSimulateHold?.(null, "gamepad");
          prev[key] = down;
          return;
        }
      } else if (!down && prev[key]) {
        scrSim?.cancelSimulateHold?.();
      }
    }
    // X let go: stop a hold-to-decline on the Manager / Sponsor offer
    if (key === "b2" && !down && prev[key]) window.MTX_SCREENS?.management?.cancelDeclineHold?.(true);
    if (down) {
      if (!prev[key]) { act(action, label, padType); held[key] = now + DELAY; }
      else if (DIRS.includes(action) && started && now >= held[key]) { act(action, label, padType); held[key] = now + RATE; }
    }
    prev[key] = down;
  }
  function loop(now) {
    const ps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (padIndex == null) for (const gp of ps) if (gp && gp.buttons.some(b => b.pressed)) { padIndex = gp.index; detect(gp); break; }
    const gp = activePad();
    if (gp) {
      // one button's error must not stop the loop, or the pad stays dead until a reload
      const safePress = (key, down, action, label) => {
        try { press(key, down, action, label, now); }
        catch (err) { prev[key] = down; console.error(err); }
      };
      for (const [i, a] of Object.entries(BTN)) { const b = gp.buttons[i]; safePress("b" + i, !!(b && b.pressed), a, (padType === "ps" ? "PS " : "Pad ") + (GLYPHS[padType][a] || a)); }
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      safePress("sU", ay < -DEAD, "up", "L-stick ↑"); safePress("sD", ay > DEAD, "down", "L-stick ↓");
      safePress("sL", ax < -DEAD, "left", "L-stick ←"); safePress("sR", ax > DEAD, "right", "L-stick →");
    }
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------- dev panel */
  const tip = $("#mapTip");
  function toggleDev(open) {
    if (uiHidden) setUiHidden(false);
    const p = $("#dev"), on = open ?? p.hidden;
    p.hidden = !on; $("#devBtn").setAttribute("aria-expanded", on);
    if (on) { $("#logPanel").hidden = true; $("#logBtn").setAttribute("aria-expanded", false); }   // one panel at a time
    if (on) $("#ratio").focus(); else document.activeElement?.blur();
    wake();
  }
  $("#devBtn").addEventListener("click", () => toggleDev());
  $("#devClose")?.addEventListener("click", () => toggleDev(false));
  $("#toggleUiBtn")?.addEventListener("click", () => toggleUi());
  $("#showUiBtn")?.addEventListener("click", () => toggleUi());
  $("#logBtn").addEventListener("click", () => {
    const p = $("#logPanel"), on = p.hidden; p.hidden = !on; $("#logBtn").setAttribute("aria-expanded", on);
    if (on && !$("#dev").hidden) toggleDev(false);   // one panel at a time
    wake();
  });
  // Skill points come from S levels (MTX_PLAYER): the dev field only shows them; "+1 S level" adds more
  const skillInput = $("#skillTotal");
  if (skillInput && window.MTX_PLAYER) {
    const showSkill = () => {
      const scr = window.MTX_SCREENS?.skilltree, total = window.MTX_PLAYER.get().skillTotal;
      skillInput.value = scr ? `${scr.getSkillPts()} / ${total}` : total;
    };
    window.MTX_PLAYER.on(() => setTimeout(showSkill, 0));
    setTimeout(showSkill, 0);
  }
  // Lobby video: the custom lobby "Match starts in" page plays mtx/assets/video/lobby-standby.mp4 instead of the 3D fighters
  const sbVideoChk = $("#sbVideo");
  if (sbVideoChk) {
    sbVideoChk.checked = store.get("sbVideo", "0") === "1";
    sbVideoChk.addEventListener("change", () => {
      store.set("sbVideo", sbVideoChk.checked ? "1" : "0");
      if (window.MTX_CLOBBY?.isOpen?.()) window.MTX_CLOBBY.render();
      toast(`Lobby video: ${sbVideoChk.checked ? "on" : "off"}`);
    });
  }
  const sbRandomChk = $("#sbRandom");   // standby values roll per match (read by screen-lobby.js on startStandby)
  if (sbRandomChk) {
    sbRandomChk.checked = store.get("sbRandom", "1") !== "0";
    sbRandomChk.addEventListener("change", () => { store.set("sbRandom", sbRandomChk.checked ? "1" : "0"); toast(`Random standby values: ${sbRandomChk.checked ? "on" : "off"} · next match`); });
  }
  // Lobby video position (scale %, X / Y px in 1920 frame): CSS vars on :root, read by .cl-sb3d__vid
  const sbVid = { s: $("#sbVidScale"), x: $("#sbVidX"), y: $("#sbVidY") };
  if (sbVid.s) {
    const def = { s: "100", x: "0", y: "0" };
    const applyVid = () => {
      const r = document.documentElement.style, n = (k, d) => { const v = parseFloat(sbVid[k].value); return Number.isFinite(v) ? v : d; };
      r.setProperty("--sbv-s", n("s", 100) / 100); r.setProperty("--sbv-x", n("x", 0) + "px"); r.setProperty("--sbv-y", n("y", 0) + "px");
      for (const k in sbVid) store.set("sbVid_" + k, sbVid[k].value || def[k]);
    };
    for (const k in sbVid) { sbVid[k].value = store.get("sbVid_" + k, def[k]); sbVid[k].addEventListener("input", applyVid); }
    $("#sbVidReset")?.addEventListener("click", () => { for (const k in sbVid) sbVid[k].value = def[k]; applyVid(); toast("Lobby video position reset"); });
    applyVid();
  }
  const unlockInputSel = $("#unlockInput");
  if (unlockInputSel) {
    unlockInputSel.value = store.get("unlockInput", "hold");
    unlockInputSel.addEventListener("change", () => {
      window.MTX_SCREENS?.skilltree?.setUnlockInput?.(unlockInputSel.value);
      toast(`Mastery unlock: ${unlockInputSel.value === "confirm" ? "modal confirm" : "hold"}`);
    });
  }
  const ruleSel = $("#unlockRule");
  if (ruleSel) {
    let savedRule = store.get("unlockRule", "any");
    if (savedRule === "all") {
      savedRule = "any";
      store.set("unlockRule", "any");
    }
    ruleSel.value = savedRule;
    ruleSel.addEventListener("change", () => {
      store.set("unlockRule", ruleSel.value);
      const scr = window.MTX_SCREENS?.skilltree;
      if (scr) {
        scr.setUnlockRule(ruleSel.value);
        const removed = scr.pruneInvalid();
        scr.updateTree();
        toast(`Unlock rule: ${ruleSel.value === "all" ? "all parents" : "any parent"}${removed ? ` · ${removed} skills refunded` : ""}`);
      }
    });
  }
  $("#logClear").addEventListener("click", () => { logList.textContent = ""; logN = 0; logCount.textContent = 0; });
  $("#ratio").addEventListener("change", e => { setRatio(e.target.value); toast("Ratio " + e.target.value); });
  $("#device").value = deviceLock;
  $("#device").addEventListener("change", e => { deviceLock = e.target.value; store.set("device", deviceLock); setDevice(deviceLock === "auto" ? device : deviceLock); });
  $("#showMap").addEventListener("change", e => {
    document.body.classList.toggle("show-map", e.target.checked);
    document.body.classList.toggle("show-layers", e.target.checked);
    tip.hidden = true;
  });
  $("#editText").addEventListener("change", e => {
    editing = e.target.checked;
    $$("#stage h1,#stage h2,#stage h3,#stage p,#stage span,#stage b").forEach(el => {
      if (el.children.length === 0 && el.textContent.trim()) el.contentEditable = editing ? "plaintext-only" : "false";
    });
    toast(editing ? "Edit mode: click any text to change it" : "Edit mode off");
  });
  addEventListener("mousemove", e => {
    if (!document.body.classList.contains("show-map")) return;
    const el = e.target.closest && e.target.closest("[data-figma]");
    if (!el) { tip.hidden = true; return; }
    const chain = []; for (let n = el; n; n = n.parentElement && n.parentElement.closest("[data-figma]")) chain.push(n.dataset.figma);
    tip.textContent = chain.slice(0, 3).join("\n  in ");
    tip.hidden = false; tip.style.left = e.clientX + 14 + "px"; tip.style.top = e.clientY + 14 + "px";
  });

  /* ---------------------------------------------------------------- countdown timers */
  function parseTimerText(text) {
    const hms = /(\d+):(\d{2}):(\d{2})/.exec(text);
    if (hms) return { seconds: (+hms[1] * 3600) + (+hms[2] * 60) + (+hms[3]), format: "hms" };
    const days = /(\d+)\s*days?\s*left/i.exec(text);
    if (days) return { seconds: +days[1] * 86400, format: "days" };
    return null;
  }

  function formatTimer(sec, format) {
    if (format === "hms") {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    const d = Math.floor(sec / 86400);
    const rem = sec % 86400;
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m left`;
    const s = rem % 60;
    if (sec > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} left`;
    return "0d 00h 00m left";
  }

  function tickTimers() {
    $$(".tag--timer, [data-timer-seconds]").forEach(el => {
      let sec = el.dataset.timerSec !== undefined ? +el.dataset.timerSec : null;
      let fmt = el.dataset.timerFmt || "hms";
      if (sec === null) {
        if (el.dataset.timerSeconds) {
          sec = +el.dataset.timerSeconds;
          fmt = el.dataset.timerFormat || (sec >= 86400 ? "days" : "hms");
        } else {
          const parsed = parseTimerText(el.textContent);
          if (parsed) { sec = parsed.seconds; fmt = parsed.format; }
          else return;
        }
        el.dataset.timerFmt = fmt;
      }

      if (sec > 0) sec--;
      el.dataset.timerSec = sec;

      const formatted = formatTimer(sec, fmt);
      const bText = el.querySelector(".timer-text");
      if (bText) {
        bText.textContent = formatted;
      } else {
        let textNode = null;
        for (let i = el.childNodes.length - 1; i >= 0; i--) {
          if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].nodeValue.trim()) {
            textNode = el.childNodes[i];
            break;
          }
        }
        if (textNode) textNode.nodeValue = formatted;
        else {
          const b = document.createElement("b");
          b.className = "timer-text";
          b.textContent = formatted;
          el.appendChild(b);
        }
      }
    });
  }
  setInterval(tickTimers, 1000);

  /* ---------------------------------------------------------------- layout editor (drag & drop) */
  let layoutEditing = false;
  let layoutOverrides = {};
  try { layoutOverrides = JSON.parse(store.get("layout_overrides", "{}")) || {}; } catch (e) { layoutOverrides = {}; }

  const layoutBadge = $("#layoutBadge") || (() => {
    const b = document.createElement("div");
    b.id = "layoutBadge";
    document.body.appendChild(b);
    return b;
  })();

  function getElementLayoutKey(el) {
    const figma = el.dataset.figma ? el.dataset.figma.split(" ")[0] : null;
    const navId = el.dataset.id;
    const elId = el.id;
    const cls = (el.className || "").toString().split(/\s+/).filter(c => c && !c.startsWith("focus-ring") && !c.startsWith("is-") && !c.startsWith("layout-")).join(".");
    return `${cur}:${figma || navId || elId || cls}`;
  }

  function findDraggableTarget(target) {
    if (!target || target === stage || target.closest("#tools, #hud, #showUiBtn, #start, #mapTip, #layoutBadge, #layoutContextMenu")) return null;
    const curScreen = screens[cur];
    if (!curScreen || !curScreen.contains(target)) return null;
    const el = target.closest("[data-figma], .stat-card, .sim-card, .mode-card, .reward-tile, .style-panel, .calendar, .feed, .brand, .player-hud, .hint-bar, .social-bar, .btn-cta, .rank-bar, .news-stack, .news-item, .card-row, .tree");
    if (!el || el === curScreen || el === curScreen.querySelector(".screen__safe") || el === curScreen.querySelector(".screen__bg")) return null;
    return el;
  }

  const ANCHOR_NAMES = {
    "top-left": "Top-Left",
    "top-center": "Top-Center",
    "top-right": "Top-Right",
    "left-center": "Left-Center",
    "center": "Center",
    "right-center": "Right-Center",
    "bottom-left": "Bottom-Left",
    "bottom-center": "Bottom-Center",
    "bottom-right": "Bottom-Right"
  };

  function getContainerDimensions(el, target = "safe") {
    const is21x9 = document.body.classList.contains("ratio-21-9") || store.get("ratio") === "21:9";
    if (target === "screen" || document.body.classList.contains("safe-fluid")) {
      return { w: is21x9 ? 2520 : 1920, h: 1080 };
    }
    return { w: 1920, h: 1080 };
  }

  function getElementMetrics(el, target = "safe") {
    const cont = getContainerDimensions(el, target);
    const c = getComputedStyle(el);
    const w = Math.round(parseFloat(c.width) || el.offsetWidth || 0);
    const h = Math.round(parseFloat(c.height) || el.offsetHeight || 0);

    let left = el.offsetLeft;
    let top = el.offsetTop;

    if (el.style.left && el.style.left.endsWith("px")) {
      left = Math.round(parseFloat(el.style.left));
    } else if (el.style.left && el.style.left.includes("calc(50%")) {
      const m = /calc\(50%\s*\+\s*(-?\d+)px\)/.exec(el.style.left);
      if (m) left = Math.round(cont.w / 2 + parseInt(m[1], 10));
    } else if (el.style.right && el.style.right.endsWith("px")) {
      left = Math.round(cont.w - parseFloat(el.style.right) - w);
    }

    if (el.style.top && el.style.top.endsWith("px")) {
      top = Math.round(parseFloat(el.style.top));
    } else if (el.style.top && el.style.top.includes("calc(50%")) {
      const m = /calc\(50%\s*\+\s*(-?\d+)px\)/.exec(el.style.top);
      if (m) top = Math.round(cont.h / 2 + parseInt(m[1], 10));
    } else if (el.style.bottom && el.style.bottom.endsWith("px")) {
      top = Math.round(cont.h - parseFloat(el.style.bottom) - h);
    }
    return { left, top, width: w, height: h };
  }

  function getValuesForAnchor(anchor, metrics, cont) {
    const { left, top, width, height } = metrics;
    const { w: contW, h: contH } = cont;
    let valX = left, valY = top, labelX = "Left (px)", labelY = "Top (px)";

    if (anchor.includes("right")) {
      valX = Math.round(contW - (left + width));
      labelX = "Right (px)";
    } else if (anchor.endsWith("-center") && !anchor.startsWith("left") && !anchor.startsWith("right") || anchor === "center") {
      valX = Math.round(left - contW / 2);
      labelX = "Center X (px)";
    } else {
      valX = left;
      labelX = "Left (px)";
    }

    if (anchor.startsWith("bottom")) {
      valY = Math.round(contH - (top + height));
      labelY = "Bottom (px)";
    } else if (anchor.includes("center") && !anchor.startsWith("top") && !anchor.startsWith("bottom") || anchor === "center") {
      valY = Math.round(top - contH / 2);
      labelY = "Center Y (px)";
    } else {
      valY = top;
      labelY = "Top (px)";
    }

    return { valX, valY, labelX, labelY };
  }

  function applyAnchorStyles(el, anchor, valX, valY, target = null) {
    el.dataset.anchor = anchor;
    if (target) el.dataset.pinTarget = target;
    const pinTarget = target || el.dataset.pinTarget || "safe";
    const isInSafe = !!el.closest(".screen__safe") && !document.body.classList.contains("safe-fluid");
    const isScreenInSafe = pinTarget === "screen" && isInSafe;

    if (anchor.includes("right")) {
      el.style.left = "auto";
      el.style.right = isScreenInSafe ? `calc(${valX}px - var(--ox, 0px))` : `${valX}px`;
    } else if (anchor.includes("left")) {
      el.style.right = "auto";
      el.style.left = isScreenInSafe ? `calc(${valX}px - var(--ox, 0px))` : `${valX}px`;
    } else {
      el.style.right = "auto";
      el.style.left = `calc(50% + ${valX}px)`;
    }

    if (anchor.startsWith("bottom")) {
      el.style.top = "auto";
      el.style.bottom = `${valY}px`;
    } else if (anchor.startsWith("top")) {
      el.style.bottom = "auto";
      el.style.top = `${valY}px`;
    } else {
      el.style.bottom = "auto";
      el.style.top = `calc(50% + ${valY}px)`;
    }
  }

  function initDefaultConstraints() {
    if (!screens[cur]) return;
    const s = screens[cur];
    s.querySelectorAll(".brand").forEach(el => {
      if (!el.dataset.anchor) { el.dataset.anchor = "top-left"; el.dataset.pinTarget = "screen"; }
    });
    s.querySelectorAll(".player-hud, [data-use='player-hud']").forEach(el => {
      if (!el.dataset.anchor) { el.dataset.anchor = "top-right"; el.dataset.pinTarget = "screen"; }
    });
    s.querySelectorAll(".hint-bar").forEach(el => {
      if (!el.dataset.anchor) { el.dataset.anchor = "bottom-left"; el.dataset.pinTarget = "screen"; }
    });
    s.querySelectorAll(".social-bar, [data-use='social-bar']").forEach(el => {
      if (!el.dataset.anchor) { el.dataset.anchor = "bottom-right"; el.dataset.pinTarget = "screen"; }
    });
    s.querySelectorAll(".screen__safe .page-title, .screen__safe h1").forEach(el => {
      if (!el.dataset.anchor) { el.dataset.anchor = "top-left"; el.dataset.pinTarget = "safe"; }
    });
    s.querySelectorAll(".screen__safe [data-nav]").forEach(el => {
      if (!el.dataset.anchor) {
        const r = el.getBoundingClientRect();
        const stageR = stage.getBoundingClientRect();
        const cy = (r.top + r.height / 2 - stageR.top) / (stageR.height / 1080);
        const cx = (r.left + r.width / 2 - stageR.left) / (stageR.height / 1080);
        let a = cy < 360 ? "top" : cy > 720 ? "bottom" : "center";
        let b = cx < 640 ? "left" : cx > 1280 ? "right" : "center";
        el.dataset.anchor = (a === "center" && b === "center") ? "center" : (a === "center" ? b + "-center" : (b === "center" ? a + "-center" : a + "-" + b));
        el.dataset.pinTarget = "safe";
      }
    });
  }

  function applyLayoutOverrides() {
    if (!screens[cur]) return;
    const screenEl = screens[cur];
    Object.values(layoutOverrides).forEach(ov => {
      if (ov.screen !== cur) return;
      const all = screenEl.querySelectorAll("*");
      for (const el of all) {
        if (getElementLayoutKey(el) === ov.key) {
          if (!el.dataset.origLeft) {
            const c = getComputedStyle(el);
            el.dataset.origLeft = parseFloat(c.left) || el.offsetLeft;
            el.dataset.origTop = parseFloat(c.top) || el.offsetTop;
          }
          const anchor = ov.anchor || "top-left";
          const target = ov.target || "safe";
          el.dataset.anchor = anchor;
          el.dataset.pinTarget = target;
          if (ov.valX !== undefined && ov.valY !== undefined) {
            applyAnchorStyles(el, anchor, ov.valX, ov.valY, target);
          } else {
            el.style.left = ov.left;
            el.style.top = ov.top;
          }
          break;
        }
      }
    });
  }

  function saveLayoutOverride(el, directValX, directValY) {
    const key = getElementLayoutKey(el);
    const anchor = el.dataset.anchor || "top-left";
    const target = el.dataset.pinTarget || "safe";
    const cont = getContainerDimensions(el, target);
    const metrics = getElementMetrics(el, target);
    const computed = getValuesForAnchor(anchor, metrics, cont);
    const valX = directValX !== undefined ? directValX : computed.valX;
    const valY = directValY !== undefined ? directValY : computed.valY;
    const origLeft = parseInt(el.dataset.origLeft || "0", 10);
    const origTop = parseInt(el.dataset.origTop || "0", 10);

    layoutOverrides[key] = {
      screen: cur,
      key,
      figma: el.dataset.figma || "",
      elementId: el.id || el.dataset.id || "",
      className: (el.className || "").toString().split(/\s+/)[0],
      anchor,
      target,
      valX,
      valY,
      left: metrics.left + "px",
      top: metrics.top + "px",
      origLeft: origLeft + "px",
      origTop: origTop + "px",
      deltaX: (metrics.left - origLeft) + "px",
      deltaY: (metrics.top - origTop) + "px",
    };
    store.set("layout_overrides", JSON.stringify(layoutOverrides));
    log(`Layout saved · ${key} [${anchor}] -> (${valX}px, ${valY}px)`, "state");
  }

  /* Multi-Selection & Grouping */
  const selectedElements = new Set();
  const multiDragStarts = new Map();
  let isMarqueeDragging = false, marqueeStartX = 0, marqueeStartY = 0;
  const marqueeBox = $("#marqueeBox");
  const groupToolbar = $("#groupToolbar");
  const selectedCountEl = $("#selectedCount");
  const groupBtn = $("#groupBtn");
  const ungroupBtn = $("#ungroupBtn");

  function updateSelectionUI() {
    const count = selectedElements.size;
    if (selectedCountEl) selectedCountEl.textContent = `${count} selected`;
    if (groupToolbar) {
      const hasGroup = Array.from(selectedElements).some(el => el.classList.contains("mtx-layout-group"));
      groupToolbar.style.display = (count > 1 || (count === 1 && hasGroup)) ? "flex" : "none";
      if (groupBtn) groupBtn.disabled = count < 2;
      if (ungroupBtn) ungroupBtn.disabled = !hasGroup;
    }
  }

  function selectElement(el, additive = false) {
    if (!additive) clearSelection();
    if (!el) return;
    selectedElements.add(el);
    el.classList.add("is-selected-layout");
    updateSelectionUI();
  }

  function deselectElement(el) {
    if (!el) return;
    selectedElements.delete(el);
    el.classList.remove("is-selected-layout");
    updateSelectionUI();
  }

  function clearSelection() {
    selectedElements.forEach(el => el.classList.remove("is-selected-layout"));
    selectedElements.clear();
    updateSelectionUI();
  }

  function groupSelection() {
    if (selectedElements.size < 2) { toast("Select at least 2 elements to group (Ctrl+G)"); return; }
    const items = Array.from(selectedElements);
    const parent = items[0].parentElement;
    if (!parent) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(el => {
      const left = parseFloat(el.style.left) || el.offsetLeft;
      const top = parseFloat(el.style.top) || el.offsetTop;
      const w = el.offsetWidth || 0;
      const h = el.offsetHeight || 0;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + w);
      maxY = Math.max(maxY, top + h);
    });

    const group = document.createElement("div");
    group.className = "mtx-layout-group";
    const groupId = "grp_" + Math.random().toString(36).substr(2, 6);
    group.dataset.id = groupId;
    group.dataset.anchor = "top-left";
    group.dataset.pinTarget = items[0].dataset.pinTarget || "safe";
    group.style.position = "absolute";
    group.style.left = minX + "px";
    group.style.top = minY + "px";
    group.style.width = (maxX - minX) + "px";
    group.style.height = (maxY - minY) + "px";

    parent.appendChild(group);

    items.forEach(el => {
      const elLeft = parseFloat(el.style.left) || el.offsetLeft;
      const elTop = parseFloat(el.style.top) || el.offsetTop;
      el.style.left = (elLeft - minX) + "px";
      el.style.top = (elTop - minY) + "px";
      el.style.right = "";
      el.style.bottom = "";
      group.appendChild(el);
    });

    clearSelection();
    selectElement(group);
    saveLayoutOverride(group, minX, minY);
    toast(`Grouped ${items.length} items`);
    log(`Created layout group ${groupId} with ${items.length} items`, "state");
  }

  function ungroupSelection() {
    let ungroupedCount = 0;
    const toSelect = [];
    selectedElements.forEach(el => {
      if (el.classList.contains("mtx-layout-group")) {
        const parent = el.parentElement;
        const grpLeft = parseFloat(el.style.left) || el.offsetLeft;
        const grpTop = parseFloat(el.style.top) || el.offsetTop;
        const children = Array.from(el.children);
        children.forEach(child => {
          const childLeft = parseFloat(child.style.left) || child.offsetLeft;
          const childTop = parseFloat(child.style.top) || child.offsetTop;
          child.style.left = (grpLeft + childLeft) + "px";
          child.style.top = (grpTop + childTop) + "px";
          parent.appendChild(child);
          toSelect.push(child);
        });
        const key = getElementLayoutKey(el);
        delete layoutOverrides[key];
        store.set("layout_overrides", JSON.stringify(layoutOverrides));
        el.remove();
        ungroupedCount++;
      }
    });

    clearSelection();
    toSelect.forEach(c => selectElement(c, true));
    if (ungroupedCount > 0) {
      toast("Ungrouped selected group(s)");
      log("Ungrouped elements", "state");
    } else {
      toast("No groups in current selection");
    }
  }

  /* Prototype Navigation Wires System */
  let wireMode = false;
  let navWires = {};
  try { navWires = JSON.parse(store.get("prototype_wires", "{}")); } catch (e) { navWires = {}; }
  let isWireDragging = false, wireSourceEl = null, wireDir = null, wireDraftPath = null;
  const wiresOverlay = $("#prototypeWiresOverlay");

  function getWireTarget(screenKey, sourceId, dir) {
    if (!sourceId || !dir) return null;
    return navWires[`${screenKey}:${sourceId}:${dir}`] || null;
  }

  function saveWire(screenKey, sourceId, dir, targetId) {
    navWires[`${screenKey}:${sourceId}:${dir}`] = targetId;
    store.set("prototype_wires", JSON.stringify(navWires));
    renderWires();
  }

  function removeWire(screenKey, sourceId, dir) {
    delete navWires[`${screenKey}:${sourceId}:${dir}`];
    store.set("prototype_wires", JSON.stringify(navWires));
    renderWires();
  }

  function clearAllWires() {
    navWires = {};
    store.set("prototype_wires", "{}");
    renderWires();
    toast("All custom wires cleared");
  }

  function updateWireHandles() {
    // handles only ever live on the current screen, and only while editing (no leftovers on other screens)
    document.querySelectorAll(".wire-handle").forEach(h => { if (!wireMode || !screens[cur]?.contains(h)) h.remove(); });
    if (!screens[cur]) return;
    const isWireActive = wireMode;
    screens[cur].querySelectorAll("[data-nav]").forEach(el => {
      const existing = el.querySelectorAll(".wire-handle");
      if (!isWireActive) {
        existing.forEach(h => h.remove());
        return;
      }
      if (existing.length === 0) {
        const dirs = [
          { d: "up", cls: "wire-handle--t" },
          { d: "right", cls: "wire-handle--r" },
          { d: "down", cls: "wire-handle--b" },
          { d: "left", cls: "wire-handle--l" }
        ];
        dirs.forEach(({ d, cls }) => {
          const h = document.createElement("span");
          h.className = `wire-handle ${cls}`;
          h.dataset.wireDir = d;
          h.title = `Drag to wire navigation (${d})`;
          el.appendChild(h);
        });
      }
    });
  }

  function renderWires() {
    if (!wiresOverlay || !screens[cur]) return;
    // custom wires show when "Show custom wires" is on; while editing, the default links show too
    const showWires = wireMode || ($("#showWires") ? $("#showWires").checked : false);
    wiresOverlay.style.display = showWires ? "block" : "none";
    const defs = wiresOverlay.querySelector("defs");
    wiresOverlay.innerHTML = "";
    if (defs) wiresOverlay.appendChild(defs);
    if (!showWires) return;
    if (defs && !defs.querySelector("#wireArrowDefault")) {
      const m = defs.querySelector("#wireArrow").cloneNode(true);
      m.id = "wireArrowDefault";
      m.querySelector("path").setAttribute("fill", "rgba(255,255,255,.55)");
      defs.appendChild(m);
    }

    const stageRect = stage.getBoundingClientRect();
    const scale = stageRect.height / 1080;

    // system default links (what the arrows / stick do with no custom wire), drawn under the custom ones
    if (wireMode && ($("#showDefaultLinks") ? $("#showDefaultLinks").checked : true)) {
      navs().forEach(src => {
        ["up", "right", "down", "left"].forEach(dir => {
          if (getWireTarget(cur, src.dataset.id, dir)) return;   // overridden by a custom wire
          const dst = navTarget(src, dir, { noCustom: true });
          if (!dst) return;
          wiresOverlay.appendChild(wirePath(src, dst, dir, stageRect, scale, "wire-path wire-path--default", "url(#wireArrowDefault)"));
        });
      });
    }

    Object.keys(navWires).forEach(key => {
      const parts = key.split(":");
      if (parts.length !== 3) return;
      const [screenKey, sourceId, dir] = parts;
      if (screenKey !== cur) return;
      const targetId = navWires[key];

      const src = screens[cur].querySelector(`[data-nav][data-id="${sourceId}"]`);
      const dst = screens[cur].querySelector(`[data-nav][data-id="${targetId}"]`);
      if (!src || !dst) return;

      const path = wirePath(src, dst, dir, stageRect, scale, "wire-path", "url(#wireArrow)");
      const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
      tip.textContent = `Custom: ${sourceId} (${dir}) -> ${targetId} · click to reset to the default`;
      path.appendChild(tip);
      path.addEventListener("click", e => {
        e.stopPropagation();
        removeWire(screenKey, sourceId, dir);
        toast(`Reset to default: ${sourceId} (${dir})`);
      });
      wiresOverlay.appendChild(path);
    });
  }

  // curved arrow from the side of `src` it leaves by (dir) to the centre of `dst`, in 1920x1080 frame units
  function wirePath(src, dst, dir, stageRect, scale, cls, marker) {
    const srcRect = src.getBoundingClientRect();
    const dstRect = dst.getBoundingClientRect();
    let x1 = (srcRect.left + srcRect.width / 2 - stageRect.left) / scale;
    let y1 = (srcRect.top + srcRect.height / 2 - stageRect.top) / scale;
    if (dir === "up") y1 = (srcRect.top - stageRect.top) / scale;
    else if (dir === "down") y1 = (srcRect.bottom - stageRect.top) / scale;
    else if (dir === "left") x1 = (srcRect.left - stageRect.left) / scale;
    else if (dir === "right") x1 = (srcRect.right - stageRect.left) / scale;
    const x2 = (dstRect.left + dstRect.width / 2 - stageRect.left) / scale;
    const y2 = (dstRect.top + dstRect.height / 2 - stageRect.top) / scale;
    const dx = x2 - x1, dy = y2 - y1;
    let cx1 = x1, cy1 = y1;
    if (dir === "left") cx1 -= Math.max(60, Math.abs(dx) * 0.4);
    else if (dir === "right") cx1 += Math.max(60, Math.abs(dx) * 0.4);
    else if (dir === "up") cy1 -= Math.max(60, Math.abs(dy) * 0.4);
    else if (dir === "down") cy1 += Math.max(60, Math.abs(dy) * 0.4);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${cy1}, ${x2 - dx * 0.2} ${y2 - dy * 0.2}, ${x2} ${y2}`);
    path.setAttribute("class", cls);
    path.setAttribute("marker-end", marker);
    return path;
  }

  // ---- "Edit navigation" mode: handles + default links on screen, a toolbar to leave it ----
  let navBar = null;
  function setNavEdit(on) {
    wireMode = !!on;
    document.body.classList.toggle("nav-editing", wireMode);
    if (wireMode) {
      toggleDev(false);   // the modal would cover the screen being edited
      if (!navBar) {
        navBar = document.createElement("div");
        navBar.id = "navEditBar";
        navBar.innerHTML = `<b>Editing navigation</b><span>Drag a blue dot onto another element to rewire that direction · click a blue wire to reset it to the default · dashed = default</span><button type="button" id="navEditDone">Done (Esc)</button>`;
        document.body.appendChild(navBar);
        navBar.querySelector("#navEditDone").addEventListener("click", () => setNavEdit(false));
      }
      navBar.hidden = false;
    } else if (navBar) navBar.hidden = true;
    updateWireHandles();
    renderWires();
  }

  let dragTarget = null, dragStartX = 0, dragStartY = 0, startLeft = 0, startTop = 0;

  function showBadge(el, left, top, clientX, clientY) {
    const key = getElementLayoutKey(el);
    const anchor = el.dataset.anchor || "top-left";
    const target = el.dataset.pinTarget || "safe";
    const cont = getContainerDimensions(el, target);
    const metrics = { left, top, width: el.offsetWidth, height: el.offsetHeight };
    const { valX, valY, labelX, labelY } = getValuesForAnchor(anchor, metrics, cont);
    layoutBadge.textContent = `${key} [${anchor}]\n${labelX}: ${valX}px · ${labelY}: ${valY}px`;
    layoutBadge.style.display = "block";
    layoutBadge.style.left = (clientX + 16) + "px";
    layoutBadge.style.top = (clientY + 16) + "px";
  }

  function hideBadge() {
    layoutBadge.style.display = "none";
  }

  let contextTarget = null;
  const layoutCtx = $("#layoutContextMenu");
  const ctxTitle = $("#ctxTitle");
  const ctxAnchorName = $("#ctxAnchorName");
  const ctxPinTarget = $("#ctxPinTarget");
  const ctxLabelX = $("#ctxLabelX");
  const ctxLabelY = $("#ctxLabelY");
  const ctxX = $("#ctxX");
  const ctxY = $("#ctxY");
  const ctxClose = $("#ctxClose");
  const ctxApply = $("#ctxApply");
  const ctxReset = $("#ctxReset");

  function openLayoutContextMenu(el, clientX, clientY) {
    if (!layoutCtx || !el) return;
    hideBadge();
    contextTarget = el;
    const c = getComputedStyle(el);
    if (!el.dataset.origLeft) {
      el.dataset.origLeft = parseFloat(c.left) || el.offsetLeft;
      el.dataset.origTop = parseFloat(c.top) || el.offsetTop;
    }
    const currentAnchor = el.dataset.anchor || "top-left";
    const currentTarget = el.dataset.pinTarget || "safe";

    $$("#ctxAnchorGrid .ctx-anchor-btn").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.anchor === currentAnchor);
    });
    if (ctxAnchorName) ctxAnchorName.textContent = ANCHOR_NAMES[currentAnchor] || "Top-Left";
    if (ctxPinTarget) ctxPinTarget.value = currentTarget;

    const cont = getContainerDimensions(el, currentTarget);
    const metrics = getElementMetrics(el, currentTarget);
    const { valX, valY, labelX, labelY } = getValuesForAnchor(currentAnchor, metrics, cont);

    ctxTitle.textContent = getElementLayoutKey(el);
    ctxX.value = valX;
    ctxY.value = valY;
    if (ctxLabelX) ctxLabelX.textContent = labelX;
    if (ctxLabelY) ctxLabelY.textContent = labelY;

    layoutCtx.hidden = false;
    const menuW = 280, menuH = 260;
    const posX = Math.min(clientX + 8, window.innerWidth - menuW - 16);
    const posY = Math.min(clientY + 8, window.innerHeight - menuH - 16);
    layoutCtx.style.left = Math.max(8, posX) + "px";
    layoutCtx.style.top = Math.max(8, posY) + "px";
    setTimeout(() => { ctxX.focus(); ctxX.select(); }, 10);
  }

  function closeLayoutContextMenu() {
    if (!layoutCtx || layoutCtx.hidden) return;
    layoutCtx.hidden = true;
    contextTarget = null;
  }

  function applyContextPosition(save = true) {
    if (!contextTarget) return;
    const x = parseInt(ctxX.value, 10);
    const y = parseInt(ctxY.value, 10);
    if (isNaN(x) || isNaN(y)) return;
    const anchor = contextTarget.dataset.anchor || "top-left";
    applyAnchorStyles(contextTarget, anchor, x, y);
    if (save) {
      saveLayoutOverride(contextTarget, x, y);
      toast(`Set position: (${x}px, ${y}px)`);
    }
  }

  ctxX?.addEventListener("input", () => applyContextPosition(false));
  ctxY?.addEventListener("input", () => applyContextPosition(false));

  ctxX?.addEventListener("keydown", e => {
    if (e.key === "Enter") { applyContextPosition(true); closeLayoutContextMenu(); }
    else if (e.key === "Escape") { closeLayoutContextMenu(); }
  });
  ctxY?.addEventListener("keydown", e => {
    if (e.key === "Enter") { applyContextPosition(true); closeLayoutContextMenu(); }
    else if (e.key === "Escape") { closeLayoutContextMenu(); }
  });

  $$("#ctxAnchorGrid .ctx-anchor-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!contextTarget) return;
      const newAnchor = btn.dataset.anchor;
      $$("#ctxAnchorGrid .ctx-anchor-btn").forEach(b => b.classList.toggle("is-active", b === btn));
      if (ctxAnchorName) ctxAnchorName.textContent = ANCHOR_NAMES[newAnchor] || newAnchor;
      contextTarget.dataset.anchor = newAnchor;

      const target = ctxPinTarget?.value || "safe";
      const cont = getContainerDimensions(contextTarget, target);
      const metrics = getElementMetrics(contextTarget, target);
      const { valX, valY, labelX, labelY } = getValuesForAnchor(newAnchor, metrics, cont);

      ctxX.value = valX;
      ctxY.value = valY;
      if (ctxLabelX) ctxLabelX.textContent = labelX;
      if (ctxLabelY) ctxLabelY.textContent = labelY;

      applyAnchorStyles(contextTarget, newAnchor, valX, valY);
      saveLayoutOverride(contextTarget, valX, valY);
      toast(`Anchor changed: ${ANCHOR_NAMES[newAnchor]}`);
    });
  });

  ctxPinTarget?.addEventListener("change", () => {
    if (!contextTarget) return;
    const newTarget = ctxPinTarget.value;
    contextTarget.dataset.pinTarget = newTarget;
    const anchor = contextTarget.dataset.anchor || "top-left";
    const cont = getContainerDimensions(contextTarget, newTarget);
    const metrics = getElementMetrics(contextTarget, newTarget);
    const { valX, valY, labelX, labelY } = getValuesForAnchor(anchor, metrics, cont);

    ctxX.value = valX;
    ctxY.value = valY;
    if (ctxLabelX) ctxLabelX.textContent = labelX;
    if (ctxLabelY) ctxLabelY.textContent = labelY;

    applyAnchorStyles(contextTarget, anchor, valX, valY);
    saveLayoutOverride(contextTarget, valX, valY);
    toast(`Pin target: ${newTarget === "screen" ? "Screen / Stage" : "Safe Area"}`);
  });

  $$("#layoutContextMenu .ctx-nudge-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!contextTarget) return;
      const axis = btn.dataset.axis;
      const delta = parseInt(btn.dataset.delta, 10) || 0;
      if (axis === "x") {
        ctxX.value = (parseInt(ctxX.value, 10) || 0) + delta;
      } else if (axis === "y") {
        ctxY.value = (parseInt(ctxY.value, 10) || 0) + delta;
      }
      applyContextPosition(true);
    });
  });

  $("#ctxGroupBtn")?.addEventListener("click", () => {
    groupSelection();
    closeLayoutContextMenu();
  });
  $("#ctxUngroupBtn")?.addEventListener("click", () => {
    ungroupSelection();
    closeLayoutContextMenu();
  });
  groupBtn?.addEventListener("click", groupSelection);
  ungroupBtn?.addEventListener("click", ungroupSelection);

  ctxApply?.addEventListener("click", () => {
    applyContextPosition(true);
    closeLayoutContextMenu();
  });

  ctxReset?.addEventListener("click", () => {
    if (!contextTarget) return;
    const items = selectedElements.size > 0 && selectedElements.has(contextTarget)
      ? Array.from(selectedElements) : [contextTarget];
    items.forEach(el => {
      const key = getElementLayoutKey(el);
      delete layoutOverrides[key];
      const origL = parseInt(el.dataset.origLeft || "0", 10);
      const origT = parseInt(el.dataset.origTop || "0", 10);
      el.style.left = "";
      el.style.top = "";
      el.style.right = "";
      el.style.bottom = "";
      delete el.dataset.anchor;
      delete el.dataset.pinTarget;
    });
    store.set("layout_overrides", JSON.stringify(layoutOverrides));
    toast("Reset elements to default position");
    closeLayoutContextMenu();
  });

  ctxClose?.addEventListener("click", closeLayoutContextMenu);

  addEventListener("mousedown", e => {
    if (!layoutCtx || layoutCtx.hidden) return;
    if (!layoutCtx.contains(e.target)) {
      closeLayoutContextMenu();
    }
  });

  addEventListener("keydown", e => {
    if (e.key === "Escape" && layoutCtx && !layoutCtx.hidden) {
      closeLayoutContextMenu();
    }
    if ((e.ctrlKey || e.metaKey) && layoutEditing) {
      if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
      }
    }
  });

  stage.addEventListener("contextmenu", e => {
    if (!layoutEditing) return;
    const target = findDraggableTarget(e.target);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    if (!selectedElements.has(target)) selectElement(target, false);
    openLayoutContextMenu(target, e.clientX, e.clientY);
  });

  stage.addEventListener("mousedown", e => {
    const handle = e.target.closest(".wire-handle");
    if (handle) {
      e.preventDefault();
      e.stopPropagation();
      isWireDragging = true;
      wireSourceEl = handle.closest("[data-nav]");
      wireDir = handle.dataset.wireDir;
      return;
    }

    if (!layoutEditing || e.button !== 0) return;
    const target = findDraggableTarget(e.target);
    if (target) {
      closeLayoutContextMenu();
      e.preventDefault();
      e.stopPropagation();

      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive) {
        if (selectedElements.has(target)) deselectElement(target);
        else selectElement(target, true);
      } else {
        if (!selectedElements.has(target)) selectElement(target, false);
      }

      dragTarget = target;
      const rect = stage.getBoundingClientRect();
      const scale = rect.height / 1080;
      dragStartX = (e.clientX - rect.left) / scale;
      dragStartY = (e.clientY - rect.top) / scale;

      multiDragStarts.clear();
      selectedElements.forEach(el => {
        const c = getComputedStyle(el);
        if (!el.dataset.origLeft) {
          el.dataset.origLeft = parseFloat(c.left) || el.offsetLeft;
          el.dataset.origTop = parseFloat(c.top) || el.offsetTop;
        }
        const metrics = getElementMetrics(el, el.dataset.pinTarget || "safe");
        multiDragStarts.set(el, { startLeft: metrics.left, startTop: metrics.top });
        el.classList.add("is-dragging-layout");
      });

      const tm = multiDragStarts.get(dragTarget);
      startLeft = tm ? tm.startLeft : 0;
      startTop = tm ? tm.startTop : 0;
      showBadge(dragTarget, Math.round(startLeft), Math.round(startTop), e.clientX, e.clientY);
    } else {
      closeLayoutContextMenu();
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) clearSelection();
      const rect = stage.getBoundingClientRect();
      const scale = rect.height / 1080;
      marqueeStartX = (e.clientX - rect.left) / scale;
      marqueeStartY = (e.clientY - rect.top) / scale;
      isMarqueeDragging = true;
      if (marqueeBox) {
        marqueeBox.style.left = marqueeStartX + "px";
        marqueeBox.style.top = marqueeStartY + "px";
        marqueeBox.style.width = "0px";
        marqueeBox.style.height = "0px";
        marqueeBox.hidden = false;
      }
    }
  });

  addEventListener("mousemove", e => {
    if (isWireDragging && wireSourceEl) {
      const stageRect = stage.getBoundingClientRect();
      const scale = stageRect.height / 1080;
      const srcRect = wireSourceEl.getBoundingClientRect();
      let x1 = (srcRect.left + srcRect.width / 2 - stageRect.left) / scale;
      let y1 = (srcRect.top + srcRect.height / 2 - stageRect.top) / scale;
      if (wireDir === "up") y1 = (srcRect.top - stageRect.top) / scale;
      else if (wireDir === "down") y1 = (srcRect.bottom - stageRect.top) / scale;
      else if (wireDir === "left") x1 = (srcRect.left - stageRect.left) / scale;
      else if (wireDir === "right") x1 = (srcRect.right - stageRect.left) / scale;

      const x2 = (e.clientX - stageRect.left) / scale;
      const y2 = (e.clientY - stageRect.top) / scale;
      const dx = x2 - x1, dy = y2 - y1;
      let cx1 = x1, cy1 = y1;
      if (wireDir === "left") cx1 -= Math.max(60, Math.abs(dx) * 0.4);
      else if (wireDir === "right") cx1 += Math.max(60, Math.abs(dx) * 0.4);
      else if (wireDir === "up") cy1 -= Math.max(60, Math.abs(dy) * 0.4);
      else if (wireDir === "down") cy1 += Math.max(60, Math.abs(dy) * 0.4);

      let draft = wiresOverlay.querySelector("#wireDraft");
      if (!draft) {
        draft = document.createElementNS("http://www.w3.org/2000/svg", "path");
        draft.id = "wireDraft";
        draft.setAttribute("class", "wire-path wire-path--active");
        draft.setAttribute("marker-end", "url(#wireArrow)");
        wiresOverlay.appendChild(draft);
      }
      draft.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${cy1}, ${x2 - dx * 0.2} ${y2 - dy * 0.2}, ${x2} ${y2}`);

      $$(".is-wire-target").forEach(el => el.classList.remove("is-wire-target"));
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest?.("[data-nav]");
      if (target && target !== wireSourceEl && screens[cur]?.contains(target)) {
        target.classList.add("is-wire-target");
      }
      return;
    }

    if (isMarqueeDragging && marqueeBox) {
      const rect = stage.getBoundingClientRect();
      const scale = rect.height / 1080;
      const curX = (e.clientX - rect.left) / scale;
      const curY = (e.clientY - rect.top) / scale;
      const x = Math.min(curX, marqueeStartX);
      const y = Math.min(curY, marqueeStartY);
      const w = Math.abs(curX - marqueeStartX);
      const h = Math.abs(curY - marqueeStartY);
      marqueeBox.style.left = x + "px";
      marqueeBox.style.top = y + "px";
      marqueeBox.style.width = w + "px";
      marqueeBox.style.height = h + "px";

      if (screens[cur]) {
        screens[cur].querySelectorAll("[data-nav], .btn-cta, .sim-card, .brand, .player-hud, .hint-bar, .social-bar, .page-title, .mtx-layout-group").forEach(el => {
          const er = el.getBoundingClientRect();
          const elX = (er.left - rect.left) / scale;
          const elY = (er.top - rect.top) / scale;
          const elW = er.width / scale;
          const elH = er.height / scale;
          const hit = !(elX + elW < x || elX > x + w || elY + elH < y || elY > y + h);
          if (hit) selectElement(el, true);
        });
      }
      return;
    }

    if (!layoutEditing) return;
    if (dragTarget) {
      const rect = stage.getBoundingClientRect();
      const scale = rect.height / 1080;
      const curX = (e.clientX - rect.left) / scale;
      const curY = (e.clientY - rect.top) / scale;
      const dX = Math.round(curX - dragStartX);
      const dY = Math.round(curY - dragStartY);

      multiDragStarts.forEach((info, el) => {
        const newLeft = Math.round(info.startLeft + dX);
        const newTop = Math.round(info.startTop + dY);
        const anchor = el.dataset.anchor || "top-left";
        const target = el.dataset.pinTarget || "safe";
        const cont = getContainerDimensions(el, target);
        const metrics = { left: newLeft, top: newTop, width: el.offsetWidth, height: el.offsetHeight };
        const { valX, valY } = getValuesForAnchor(anchor, metrics, cont);
        applyAnchorStyles(el, anchor, valX, valY);
        if (el === dragTarget) showBadge(el, newLeft, newTop, e.clientX, e.clientY);
      });
    } else {
      const hover = findDraggableTarget(e.target);
      if (hover && (!layoutCtx || layoutCtx.hidden)) {
        const metrics = getElementMetrics(hover, hover.dataset.pinTarget || "safe");
        showBadge(hover, metrics.left, metrics.top, e.clientX, e.clientY);
      } else {
        hideBadge();
      }
    }
  });

  addEventListener("mouseup", e => {
    if (isWireDragging) {
      const draft = wiresOverlay?.querySelector("#wireDraft");
      if (draft) draft.remove();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest?.("[data-nav]");
      $$(".is-wire-target").forEach(el => el.classList.remove("is-wire-target"));
      if (target && target !== wireSourceEl && screens[cur]?.contains(target)) {
        const sId = wireSourceEl.dataset.id;
        const tId = target.dataset.id;
        if (sId && tId) {
          saveWire(cur, sId, wireDir, tId);
          toast(`Connected: ${sId} (${wireDir}) ➔ ${tId}`);
          log(`Wire connected: ${sId} [${wireDir}] -> ${tId}`, "state");
        }
      }
      isWireDragging = false;
      wireSourceEl = null;
      wireDir = null;
      renderWires();
    }

    if (isMarqueeDragging) {
      isMarqueeDragging = false;
      if (marqueeBox) marqueeBox.hidden = true;
    }

    if (!layoutEditing || !dragTarget) return;
    multiDragStarts.forEach((info, el) => {
      saveLayoutOverride(el);
      el.classList.remove("is-dragging-layout");
    });
    multiDragStarts.clear();
    dragTarget = null;
    hideBadge();
    toast("Position saved");
    renderWires();
  });

  function exportLayoutJson() {
    const count = Object.keys(layoutOverrides).length;
    if (count === 0) { toast("No layout adjustments to export"); return; }
    const jsonStr = JSON.stringify(layoutOverrides, null, 2);
    try { navigator.clipboard?.writeText(jsonStr); } catch (e) {}
    const blob = new Blob([jsonStr], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mtx-layout-adjustments.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
    toast(`Exported & copied ${count} element positions`);
    log(`Exported layout adjustments (${count} items)`, "result");
  }

  // Also clears the selected manager / sponsor and simulation progress (back to Day 1).
  function resetLayout() {
    window.MTX_SCREENS?.management?.resetCareer?.(true);
    const count = Object.keys(layoutOverrides).length;
    if (count === 0) { toast("Selections reset · manager, sponsor & Day 1"); return; }
    layoutOverrides = {};
    store.set("layout_overrides", "{}");
    const screenEl = screens[cur];
    if (screenEl) {
      screenEl.querySelectorAll("*").forEach(el => {
        if (el.dataset.origLeft !== undefined || el.dataset.anchor !== undefined) {
          el.style.left = "";
          el.style.top = "";
          el.style.right = "";
          el.style.bottom = "";
          delete el.dataset.origLeft;
          delete el.dataset.origTop;
          delete el.dataset.anchor;
          delete el.dataset.pinTarget;
        }
      });
    }
    toast("Layout & selections reset");
    log("Layout overrides reset", "state");
  }

  function resetAllDesign() {
    layoutOverrides = {};
    store.set("layout_overrides", "{}");
    store.set("prototype_wires", "{}");
    store.set("layout_groups", "[]");
    Object.keys(navWires).forEach(k => delete navWires[k]);
    Object.values(screens).forEach(screenEl => {
      screenEl.querySelectorAll("*").forEach(el => {
        if (el.dataset.origLeft !== undefined || el.dataset.anchor !== undefined) {
          el.style.left = "";
          el.style.top = "";
          el.style.right = "";
          el.style.bottom = "";
          delete el.dataset.origLeft;
          delete el.dataset.origTop;
          delete el.dataset.anchor;
          delete el.dataset.pinTarget;
        }
      });
    });
    renderWires?.();
    toast("All layout overrides, custom wires & groups reset");
    log("All design overrides reset", "state");
  }

  $("#editLayout")?.addEventListener("change", e => {
    layoutEditing = e.target.checked;
    document.body.classList.toggle("layout-editing", layoutEditing);
    toast(layoutEditing ? "Layout editor on: drag or right-click to set X, Y" : "Layout editor off");
    log(layoutEditing ? "Layout editor enabled" : "Layout editor disabled", "state");
    if (!layoutEditing) {
      hideBadge();
      closeLayoutContextMenu();
      clearSelection();
    }
  });
  $("#exportLayoutBtn")?.addEventListener("click", exportLayoutJson);
  $("#resetLayoutBtn")?.addEventListener("click", resetLayout);
  $("#resetAllDesignBtn")?.addEventListener("click", resetAllDesign);

  /* Figma Tabs */
  $$(".figma-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".figma-tab").forEach(t => t.classList.toggle("is-active", t === tab));
      const target = tab.dataset.tab;
      const map = { layout: "#tabContentLayout", prototype: "#tabContentPrototype", system: "#tabContentSystem", keys: "#tabContentKeys", pages: "#tabContentPages", char3d: "#tabContentChar3d" };
      Object.entries(map).forEach(([key, sel]) => {
        const el = $(sel);
        if (el) el.style.display = key === target ? "flex" : "none";
      });
      if (target === "keys") window.MTX_KEYMAP?.renderTab?.();

    });
  });

  $("#navEditBtn")?.addEventListener("click", () => setNavEdit(true));
  $("#navGraphBtn")?.addEventListener("click", () => { toggleDev(false); if (wireMode) setNavEdit(false); window.MTX_UI?.navGraph?.open(cur); });
  $("#showWires")?.addEventListener("change", () => renderWires());
  $("#showDefaultLinks")?.addEventListener("change", () => renderWires());

  $("#clearWiresBtn")?.addEventListener("click", clearAllWires);

  const showConstraintsEl = $("#showConstraints");
  const safeAreaModeEl = $("#safeAreaMode");

  function setShowConstraints(show) {
    if (show) initDefaultConstraints();
    document.body.classList.toggle("show-constraints", !!show);
    store.set("show_constraints", show ? "1" : "0");
    if (showConstraintsEl) showConstraintsEl.checked = !!show;
  }

  function setSafeAreaMode(mode) {
    const isFluid = mode === "fluid";
    document.body.classList.toggle("safe-fluid", isFluid);
    store.set("safe_area_mode", mode);
    if (safeAreaModeEl) safeAreaModeEl.value = mode;
  }

  showConstraintsEl?.addEventListener("change", e => {
    setShowConstraints(e.target.checked);
    toast(e.target.checked ? "Constraint pins visible" : "Constraint pins hidden");
  });

  safeAreaModeEl?.addEventListener("change", e => {
    setSafeAreaMode(e.target.value);
    toast(e.target.value === "fluid" ? "Safe Area: Fluid (Expands on 21:9)" : "Safe Area: Fixed 1920 (Centered)");
  });

  /* ---------------------------------------------------------------- boot */
  setDevice(deviceLock === "auto" ? "kb" : deviceLock);
  setRatio(store.get("ratio", "16:9"));
  $$(".hint-bar").forEach(h => h.setAttribute("aria-label", "Controls"));
  function initCtaChecks() {
    $$(".btn-cta").forEach(btn => {
      if (!btn.querySelector(".btn-cta__hold-bar")) {
        const b = document.createElement("span");
        b.className = "btn-cta__hold-bar";
        btn.appendChild(b);
      }
      if (!btn.querySelector(".btn-cta__check")) {
        const s = document.createElement("span");
        s.className = "btn-cta__check";
        s.setAttribute("aria-hidden", "true");
        s.innerHTML = '<svg viewBox="0 0 25 25"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 0C19.4036 0 25 5.59635 25 12.5C25 19.4036 19.4036 25 12.5 25C5.59635 25 0 19.4036 0 12.5C0 5.59635 5.59635 0 12.5 0ZM6.64896 13.2422L10.2089 16.5115C10.7281 16.9896 11.5318 16.9641 12.0203 16.4604L18.3714 10.3797C18.888 9.88281 18.9036 9.06094 18.4068 8.54479C17.9099 8.02812 17.088 8.0125 16.5719 8.50937L11.0703 13.776L8.40781 11.3307C7.88021 10.8453 7.05833 10.8792 6.57292 11.4068C6.08698 11.9349 6.12135 12.7562 6.64896 13.2422Z" fill="currentColor"/></svg>';
        btn.appendChild(s);
      }
    });
  }

  screens.main.classList.add("is-active");
  setShowConstraints(store.get("show_constraints", "0") === "1");
  setSafeAreaMode(store.get("safe_area_mode", "fixed"));
  initCtaChecks();
  tickTimers();
  applyLayoutOverrides();
  updateWireHandles();
  renderWires();

  const coreApi = {
    $, $$, bind, store, toast, rumble, log, logIn, show, showRoot, back, setFocus,
    getCur: () => cur, findReady, getFocused: () => focused, getDevice: () => device, getPad: () => psModel, setDevice,
    getGlyphs: () => GLYPHS, screens, getScreen: id => window.MTX_SCREENS?.[id],
    // Navigation graph (components/nav-graph.js)
    navs, navDefault: (el, dir) => navTarget(el, dir, { noCustom: true }),
    getWires: () => Object.assign({}, navWires),
    setWires(obj) { navWires = Object.assign({}, obj); store.set("prototype_wires", JSON.stringify(navWires)); renderWires(); },
  };
  Object.values(window.MTX_SCREENS || {}).forEach(s => s.bindApi?.(coreApi));
  Object.values(window.MTX_SCREENS || {}).forEach(s => s.init?.(coreApi));

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    window.MTX_SCREENS?.tactical?.applyStyle?.();
  });
  requestAnimationFrame(loop);
  window.MTX = { show: k => { startGame(); show(k); }, screens: Object.keys(screens), api: coreApi };
  const deep = /screen=(\w+)/.exec(location.hash);
  const dev = /device=(xbox|ps5|ps4|ps|kb)/.exec(location.hash);
  if (dev) { deviceLock = dev[1]; $("#device").value = dev[1]; setDevice(dev[1]); }
  const own = /own=([\w,]+)/.exec(location.hash);
  if (own && window.MTX_SCREENS?.skilltree) {
    const scr = window.MTX_SCREENS.skilltree;
    own[1].split(",").forEach(id => {
      if (scr.canUnlock?.(id) && scr.getSkillPts?.() > 0) scr.getOwned?.()?.add(id);
    });
    scr.updateTree?.();
  }
  const styleQ = /style=(\w+)/.exec(location.hash);
  if (styleQ && window.MTX_SCREENS?.tactical) {
    window.MTX_SCREENS.tactical.setSelStyle?.(styleQ[1]);
  }
  const openId = /open=(\w+)/.exec(location.hash);
  if (deep && screens[deep[1]]) (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    window.MTX.show(deep[1]);
    if (openId && window.MTX_SCREENS?.skilltree) {
      setFocus($(`#s-skilltree .tnode[data-id="${openId[1]}"]`));
      window.MTX_SCREENS.skilltree.openDetail?.(openId[1]);
    }
  });
})();
