/* Friends page (Select: View · Create / Share · keyboard F · or the Friends button on the social bar) - Figma Section 15 "Friends".
   Full page over the current one: tabs (LT / RT) · lobby status · search · grid of player cards.
     browse:   arrows move · A select player · Y search · B back · Select close · Start Options
     selected: ↑ ↓ choose action (MTX / Player Actions) · A confirm · B deselect
   Invite to lobby only works while you are in a lobby (main menu "Create Lobby" toggles it in this prototype).
   window.MTX_FRIENDS = { open, close, toggle, isOpen, input, render } · window.MTX_LOBBY = { in, n, max, toggle } */
(() => {
  //#region [Data] st: match · online · away · offline
  const IMG = "mtx/assets/img/";
  const FRIENDS = [
    { n: "Thanawat Kiatyod", av: "cc-avatar-1.webp", st: "match", w: "Ranked · Round 2", b: "ring-warrior-4", t: "Ring Warrior IV", p: "Xbox" },
    { n: "Mika Laine", av: "cc-avatar-3.webp", st: "match", w: "Casual · Round 1", b: "gym-apprentice-2", t: "Gym Apprentice II", p: "PC" },
    { n: "Ploy Wongsakul", av: "cc-avatar-f.webp", st: "online", w: "Main menu", b: "the-challenger-2", t: "The Challenger II", p: "PS5" },
    { n: "Saenchai Fairtex", av: "manager-kamol.webp", st: "online", w: "Training mode", b: "national-icon", t: "National Icon", p: "PS5" },
    { n: "Kaito Morinaga", av: "cc-avatar-2.webp", st: "online", w: "Store", b: "rookie-fighter-3", t: "Rookie Fighter III", p: "PC" },
    { n: "Diego Alvarez", av: "cc-avatar-4.webp", st: "away", w: "Away · 12 min", b: "elbow-specialist-1", t: "Elbow Specialist I", p: "Xbox" },
    { n: "Buakaw Banchamek", av: "manager-justin.webp", st: "offline", w: "Last seen 2 h ago", b: "muay-thai-god", t: "Muay Thai God", p: "PS4" },
    { n: "Nam Nguyen", av: "post-avatar.webp", st: "offline", w: "Last seen yesterday", b: "ring-warrior-2", t: "Ring Warrior II", p: "PC" },
    { n: "Rafael Costa", av: "manager-nattapong.webp", st: "offline", w: "Last seen 3 days ago", b: "the-challenger-1", t: "The Challenger I", p: "Xbox" },
  ];
  const RECENT = [
    { n: "Somchai Sor.Thanikul", av: "cc-avatar-2.webp", st: "online", w: "10 min ago · You won", b: "ring-warrior-3", t: "Ring Warrior III", p: "PS5" },
    { n: "Liam Clarke", av: "cc-avatar-4.webp", st: "online", w: "1 h ago · You lost", b: "the-challenger-1", t: "The Challenger I", p: "PC" },
    { n: "Bao Tran", av: "cc-avatar-3.webp", st: "match", w: "2 days ago · You won", b: "gym-apprentice-3", t: "Gym Apprentice III", p: "PS4" },
    { n: "Hiro Tanabe", av: "cc-avatar-1.webp", st: "offline", w: "Yesterday · Draw", b: "rookie-fighter-4", t: "Rookie Fighter IV", p: "Xbox" },
  ];
  const REQUESTS = [
    { n: "Arjun Mehta", av: "cc-avatar-2.webp", st: "online", w: "Sent you a request · 2 h ago", b: "rookie-fighter-2", t: "Rookie Fighter II", p: "PC" },
    { n: "Sofia Rossi", av: "cc-avatar-f.webp", st: "offline", w: "Sent you a request · 1 day ago", b: "gym-apprentice-1", t: "Gym Apprentice I", p: "PS5" },
  ];
  const BLOCKED = [
    { n: "Jake Turner", av: "cc-avatar-4.webp", st: "offline", w: "Blocked 5 days ago", b: "rookie-fighter-1", t: "Rookie Fighter I", p: "Xbox" },
  ];
  const TABS = [["Friends", FRIENDS], ["Recent players", RECENT], ["Requests", REQUESTS], ["Blocked", BLOCKED]];
  const ICO = {
    profile: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    invite: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 9l9 5 9-5"/>',
    spectate: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    add: '<circle cx="10" cy="8" r="3.6"/><path d="M3 20c0-3.9 3.1-6.5 7-6.5 1.6 0 3 .4 4.2 1.2"/><path d="M18 14v6M15 17h6"/>',
    remove: '<circle cx="10" cy="8" r="3.6"/><path d="M3 20c0-3.9 3.1-6.5 7-6.5 1.6 0 3 .4 4.2 1.2"/><path d="M15 17h6"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    report: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  };
  //#endregion

  //#region [State / helpers]
  const LOBBY = window.MTX_LOBBY = { in: false, n: 3, max: 8, toggle() { this.in = !this.in; act = 0; window.MTX?.api?.toast?.(this.in ? `Lobby created · ${this.n} / ${this.max}` : "Left the lobby"); render(); } };
  let root = null, open = false, tab = 0, focus = 0, sel = -1, act = 0;
  const invited = new Set(), sent = new Set();
  const api = () => window.MTX?.api;
  const toast = m => api()?.toast?.(m);
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ico = k => `<svg class="fz-ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
  const list = () => TABS[tab][1];
  // grid order = group order, so focus indexes follow what is on screen
  function groups() {
    const L = list();
    if (tab === 0) return [["In match", L.filter(f => f.st === "match")], ["Online", L.filter(f => f.st === "online" || f.st === "away")], ["Offline", L.filter(f => f.st === "offline")]];
    return [[["", "Recent opponents", "Friend requests", "Blocked players"][tab], L]];
  }
  const ordered = () => groups().flatMap(([, l]) => l);
  //#endregion

  //#region [Actions] one row per action of MTX / Player Actions. An action that does not apply right now is left out
  // (no locked / disabled rows, no notes): Invite only while you are in a lobby and the player is online, Spectate only in a match
  function actions(f) {
    const invite = () => (LOBBY.in && f.st !== "offline" ? [{ id: "invite", k: "invite", label: "Invite to lobby" }] : []);
    if (tab === 0) return [
      { id: "profile", k: "profile", label: "View profile" }, ...invite(),
      ...(f.st === "match" ? [{ id: "spectate", k: "spectate", label: "Spectate match" }] : []),
      { id: "remove", k: "remove", label: "Remove friend", warn: true },
      { id: "block", k: "block", label: "Block player", warn: true },
      { id: "report", k: "report", label: "Report player", warn: true }];
    if (tab === 1) return [
      sent.has(f.n) ? { id: "cancel", k: "remove", label: "Cancel request" } : { id: "add", k: "add", label: "Add friend" },
      { id: "profile", k: "profile", label: "View profile" }, ...invite(),
      { id: "block", k: "block", label: "Block player", warn: true },
      { id: "report", k: "report", label: "Report player", warn: true }];
    if (tab === 2) return [
      { id: "accept", k: "add", label: "Accept request" },
      { id: "decline", k: "remove", label: "Decline request", warn: true },
      { id: "profile", k: "profile", label: "View profile" },
      { id: "block", k: "block", label: "Block player", warn: true }];
    return [{ id: "unblock", k: "block", label: "Unblock player" }, { id: "profile", k: "profile", label: "View profile" }];
  }
  function drop(arr, f) { const i = arr.indexOf(f); if (i >= 0) arr.splice(i, 1); }
  function deselect() { sel = -1; act = 0; const n = ordered().length; focus = Math.max(0, Math.min(focus, n - 1)); }
  function run(f, a) {
    api()?.rumble?.(50, .25);
    switch (a.id) {
      case "profile": return toast(`${f.n} · profile`);
      case "invite": invited.add(f.n); render(); return toast(`Lobby invite sent to ${f.n}`);
      case "spectate": return toast(`Spectate ${f.n} · not in this prototype`);
      case "report": return toast(`${f.n} reported · thanks`);
      case "add": sent.add(f.n); render(); return toast(`Friend request sent to ${f.n}`);
      case "cancel": sent.delete(f.n); render(); return toast(`Request to ${f.n} cancelled`);
      case "remove": drop(FRIENDS, f); deselect(); render(); return toast(`${f.n} removed from friends`);
      case "block": drop(list(), f); BLOCKED.unshift({ ...f, st: "offline", w: "Blocked just now" }); deselect(); render(); return toast(`${f.n} blocked`);
      case "accept": drop(REQUESTS, f); FRIENDS.splice(2, 0, { ...f, w: f.st === "offline" ? "Last seen today" : "Main menu" }); deselect(); render(); return toast(`${f.n} is now your friend`);
      case "decline": drop(REQUESTS, f); deselect(); render(); return toast(`Request from ${f.n} declined`);
      case "unblock": drop(BLOCKED, f); deselect(); render(); return toast(`${f.n} unblocked`);
    }
  }
  //#endregion

  //#region [Render]
  function card(f, i) {
    return `<div class="fz-card focus-ring${i === focus && sel < 0 ? " is-focused" : ""}${i === sel ? " is-selected" : ""}${f.st === "offline" ? " is-off" : ""}" data-fz-i="${i}" role="button" aria-label="${esc(f.n)}, ${esc(f.w)}">
      <img class="fz-card__art" src="${IMG}bg-lobby.webp" alt=""><img class="fz-card__av" src="${IMG}${f.av}" alt=""><i class="fz-dot fz-dot--${f.st}"></i>
      <span class="fz-card__name">${esc(f.n)}</span><span class="fz-card__where fz-st--${f.st}">${esc(f.w)}</span>
      <span class="fz-card__tier"><img src="${IMG}badges/${f.b}.webp" alt="">${esc(f.t)}</span><span class="fz-card__plat">${esc(f.p)}</span>
      ${i === sel ? `<span class="fz-card__sel">Selected</span>` : ""}</div>`;
  }
  function render() {
    if (!root || !open) return;
    const O = ordered(); let i = 0;
    const grid = O.length ? groups().map(([g, l]) => l.length ? `<p class="fz-group">${esc(g)} · ${l.length}</p><div class="fz-cards">${l.map(f => card(f, i++)).join("")}</div>` : "").join("")
      : `<p class="fz-empty">${["No friends yet", "No recent players", "No friend requests", "Nobody is blocked"][tab]}</p>`;
    const acts = sel >= 0 ? actions(O[sel]) : [];
    const hints = sel < 0 ? { b: "Back", a: "Select", y: "Search", view: "Close" } : { b: "Deselect", a: "Confirm", ls: "Choose", view: "Close" };
    root.innerHTML = `<div class="fz__bg" aria-hidden="true"></div><div class="fz__safe">
      <h1 class="page-title tex-text fz__title">Friends</h1>
      <nav class="fz__tabs" role="tablist" aria-label="Friends">${G("lt")}${TABS.map(([t, l], k) =>
        `<span class="fz__tab${k === tab ? " is-active" : ""}" data-fz-tab="${k}" role="tab" aria-selected="${k === tab}">${esc(t)}${k === 2 && l.length ? `<i class="fz__notice" aria-label="New requests">!</i>` : ""}</span>`).join("")}${G("rt")}</nav>
      <p class="fz__lobby${LOBBY.in ? " is-on" : ""}">${LOBBY.in ? `<i class="fz-dot fz-dot--online"></i>In lobby <b>${LOBBY.n} / ${LOBBY.max}</b>` : "Not in a lobby"}</p>
      <section class="fz-grid"><div class="fz-search">${ico("search")}<span>Search name or ID</span>${G("y")}</div>${grid}</section>
      ${sel >= 0 ? `<div class="fz-menu" role="menu" aria-label="${esc(O[sel].n)}">${acts.map((a, k) =>
        `<div class="fz-act focus-ring${k === act ? " is-focused" : ""}${a.warn ? " fz-act--warn" : ""}" data-fz-act="${k}" role="menuitem">${ico(a.k)}<span>${esc(a.label)}</span></div>`).join("")}</div>` : ""}
      ${window.MTX_UI.hintBar(hints, { cls: "fz__hints" })}
    </div>`;
    place();
  }
  // the action list sits right of the selected card (left of it for the last column), top-aligned, kept on screen
  function place() {
    const m = root.querySelector(".fz-menu"), c = root.querySelector(".fz-card.is-selected"), safe = root.querySelector(".fz__safe");
    if (!m || !c) return;
    const rel = el => { let x = 0, y = 0; for (let e = el; e && e !== safe; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return [x, y]; };
    const [cx, cy] = rel(c), right = cx + c.offsetWidth + 22 + m.offsetWidth <= 1860;
    m.classList.toggle("fz-menu--left", !right);
    m.style.left = `${right ? cx + c.offsetWidth + 22 : cx - 22 - m.offsetWidth}px`;
    m.style.top = `${Math.max(150, Math.min(cy, 990 - m.offsetHeight))}px`;
    m.style.setProperty("--ptr", `${Math.max(16, Math.min(cy - parseFloat(m.style.top) + 45, m.offsetHeight - 36))}px`);
  }
  //#endregion

  //#region [Input]
  // arrows in browse mode: nearest card in that direction (cards sit in groups of 4 columns)
  function move(dir) {
    const cards = [...root.querySelectorAll(".fz-card")]; if (!cards.length) return;
    const r = cards.map(e => e.getBoundingClientRect()), a = r[focus];
    let best = -1, bs = Infinity;
    r.forEach((b, i) => {
      if (i === focus) return;
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      const ok = { up: dy < -4, down: dy > 4, left: dx < -4 && Math.abs(dy) < 4, right: dx > 4 && Math.abs(dy) < 4 }[dir]; if (!ok) return;
      const vert = dir === "up" || dir === "down", s = (vert ? Math.abs(dy) : Math.abs(dx)) + (vert ? Math.abs(dx) : Math.abs(dy)) * 2.2;
      if (s < bs) { bs = s; best = i; }
    });
    if (best >= 0) { focus = best; api()?.rumble?.(20, .1); render(); }
  }
  function input(a) {
    if (a === "view") return close();
    if (a === "menu") { close(); return window.MTX_OPTIONS?.open?.(); }
    if (a === "lt" || a === "rt") { tab = (tab + (a === "lt" ? -1 : 1) + TABS.length) % TABS.length; focus = 0; sel = -1; act = 0; api()?.rumble?.(40, .2); return render(); }
    const O = ordered();
    if (sel >= 0) {
      const acts = actions(O[sel]);
      if (a === "back") { focus = sel; deselect(); api()?.rumble?.(30, .15); return render(); }
      if (a === "up" || a === "down") { act = (act + (a === "up" ? -1 : 1) + acts.length) % acts.length; api()?.rumble?.(20, .1); return render(); }
      if (a === "a") return run(O[sel], acts[act]);
      return;
    }
    if (a === "back") return close();
    if (/^(up|down|left|right)$/.test(a)) return move(a);
    if (a === "y") return toast("Search · not in this prototype");
    if (a === "a" && O[focus]) { sel = focus; act = 0; api()?.rumble?.(50, .25); return render(); }
  }
  //#endregion

  //#region [Open / close]
  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.id = "friendsPage"; root.className = "fz"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Friends");
    document.getElementById("stage").appendChild(root);
    root.addEventListener("click", e => {
      const t = e.target.closest("[data-fz-tab]"); if (t) { tab = +t.dataset.fzTab; focus = 0; sel = -1; act = 0; return render(); }
      const ac = e.target.closest("[data-fz-act]"); if (ac && sel >= 0) { act = +ac.dataset.fzAct; render(); return input("a"); }
      const c = e.target.closest("[data-fz-i]"); if (c) { focus = +c.dataset.fzI; sel = -1; render(); return input("a"); }
    });
  }
  function show(o = {}) {
    window.MTX_OPTIONS?.close?.(); window.MTX_SETTINGS?.close?.();
    mount(); open = true; root.hidden = false; sel = -1; act = 0; if (o.tab != null) { tab = o.tab; focus = 0; } document.getElementById("stage")?.classList.add("ovl-open");
    render(); api()?.rumble?.(60, .25);
  }
  function close() {
    if (!root) return; open = false; root.hidden = true; sel = -1;
    if (!window.MTX_OPTIONS?.isOpen?.() && !window.MTX_SETTINGS?.isOpen?.() && !window.MTX_CLOBBY?.isOpen?.()) document.getElementById("stage")?.classList.remove("ovl-open");
  }
  window.MTX_FRIENDS = { open: show, close, toggle: () => (open ? close() : show()), isOpen: () => open, input, render };
  // main menu "Create Lobby" card toggles the lobby (data-fn="toggleLobby")
  window.MTX_SCREENS = window.MTX_SCREENS || {};
  window.MTX_SCREENS.lobby = { actions: { toggleLobby: () => LOBBY.toggle() } };
  // the Friends / Options buttons on every page's social bar open the same overlays (mouse)
  document.addEventListener("click", e => {
    if (e.target.closest(".social-bar__btn--friends")) { e.stopPropagation(); show(); }
    else if (e.target.closest(".social-bar__btn--options")) { e.stopPropagation(); window.MTX_OPTIONS?.open?.(); }
  }, true);
  //#endregion
})();
