/* Custom Lobby (Figma Section 17, v4 "no Mode Cards, key-driven") - opened from the main menu "Create Lobby" card.
   Views: menu (Lobby Card + lobby list) · waiting (Waiting for Players) · timer (Time remaining) · result (Statistics)
   Modals: create · edit · find (lobby number) · pin (private lobby) · msg (message: incorrect PIN / not found / full)
     menu:    ↑ ↓ lobby · A join match · Y create lobby · RB find lobby · LB refresh · B back
     waiting: A / D (LS ← →) focus Red corner · Spectators · Blue corner · W / S (LS ↑ ↓) spectator slot (Spectators only)
              A player actions (context menu, more for the host; an empty corner / spectator slot offers Switch) · X ready / unready · Y style preset (pick one of your presets)
              Hold A start match (host, both ready)
              RB edit lobby (host) · F friends (invite from its player menu) · B leave lobby
     player menu: ↑ ↓ action · A confirm (Kick / Make host are held) · B close
     number entry: 0-9 (keyboard) or ↑ ↓ change digit · ← → move · A confirm · B cancel
   Decisions are held (MTX_UI.createHold): Create lobby, Save, Ready / Unready, Start Match, Leave Lobby (B).
   A quick tap shows "Hold <key> to ..."; app.js forwards key / button release to MTX_CLOBBY.release(action).
   window.MTX_CLOBBY = { open, close, isOpen, input } */
(() => {
  //#region [Data]
  const IMG = "mtx/assets/img/";
  const ME = { name: "SX.BOYD", title: "The Mighty" };
  const OPP = { name: "2ZAX MTX", plate: "ZAX MTX", title: "The Killers" };   // plate: the name as drawn on the nameplate (Figma)
  const MAPS = ["MTX Arena", "Ruamchok Arena", "Rajadamnern", "Lumpinee"];
  const MAP_IMG = { "MTX Arena": "map-mtx-arena.webp" };   // maps not listed here show the "image pending" placeholder
  const LOBBIES = [
    { no: "0001", name: "MTX Arena", type: "public", pl: [1, 3], sp: [0, 4], ping: 32, st: "Open" },
    { no: "1209", name: "Ruamchok Arena", type: "private", pin: "0067", pl: [2, 3], sp: [1, 4], ping: 67, st: "Open" },
    { no: "6767", name: "Rajadamnern Clash", type: "public", pl: [1, 3], sp: [2, 4], ping: 130, st: "Open" },
    { no: "2546", name: "Golden Monkol", type: "private", pin: "1111", pl: [3, 3], sp: [4, 4], ping: 48, st: "Full", note: "Full · 3 / 3 players" },
    { no: "0412", name: "Friday Night Fights", type: "public", pl: [3, 3], sp: [1, 4], ping: 55, st: "In match", note: "In progress · Round 2" },
    { no: "7781", name: "Elbow Club", type: "private", pin: "2468", pl: [2, 3], sp: [0, 4], ping: 67, st: "Open" },
    { no: "3388", name: "Siam Fight Club", type: "private", pin: "3388", pl: [2, 3], sp: [1, 4], ping: 74, st: "Open" },
    { no: "9021", name: "Lumpinee Night", type: "public", pl: [2, 3], sp: [0, 4], ping: 121, st: "Open" },
    { no: "1450", name: "Chiang Mai Clinch", type: "public", pl: [1, 3], sp: [1, 4], ping: 88, st: "Open" },
    { no: "5120", name: "Phuket Beach Bouts", type: "private", pin: "5120", pl: [1, 3], sp: [0, 4], ping: 96, st: "Open" },
    { no: "3071", name: "Iron Shin Gym", type: "public", pl: [2, 3], sp: [3, 4], ping: 41, st: "Open" },
    { no: "8264", name: "Sunday Sparring", type: "public", pl: [3, 3], sp: [2, 4], ping: 59, st: "In match", note: "In progress · Round 4" },
    { no: "6190", name: "Tiger Muay Thai", type: "private", pin: "6190", pl: [1, 3], sp: [2, 4], ping: 112, st: "Open" },
    { no: "4733", name: "Knee Strike Kings", type: "public", pl: [3, 3], sp: [4, 4], ping: 70, st: "Full", note: "Full · 3 / 3 players" },
    { no: "2905", name: "Isan Fight Night", type: "public", pl: [2, 3], sp: [1, 4], ping: 135, st: "Open" },
    { no: "7316", name: "Rookie Corner", type: "public", pl: [1, 3], sp: [0, 4], ping: 37, st: "Open" },
  ];
  const ACTIONS = [["join", "Join\nMatch", "Enter the selected lobby"], ["spectate", "Spectate", "Watch the selected lobby"],
    ["create", "Create\nLobby", "Host a lobby for you and your friends"], ["find", "Find\nLobby", "Join with a 4-digit lobby number"]];
  const ICO = {
    public: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3Z"/>',
    private: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    players: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.4 2.7-5.8 6-5.8s6 2.4 6 5.8"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14.3c2.9.3 5.4 2.2 5.4 5.7"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 3.9M6.4 6.9C3.6 8.8 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    server: '<rect x="4" y="4" width="16" height="7" rx="1"/><rect x="4" y="13" width="16" height="7" rx="1"/><path d="M8 7.5h.01M8 16.5h.01"/>',
    crown: '<path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z"/>', check: '<path d="m6 12.5 4 4 8-9"/>',
    profile: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    add: '<circle cx="10" cy="8" r="3.6"/><path d="M3 20c0-3.9 3.1-6.5 7-6.5 1.6 0 3 .4 4.2 1.2"/><path d="M18 14v6M15 17h6"/>',
    invite: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 9l9 5 9-5"/>',
    style: '<path d="M12 3 4 7v6c0 4 3.4 7 8 8 4.6-1 8-4 8-8V7z"/>',
    move: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    kick: '<circle cx="10" cy="8" r="3.6"/><path d="M3 20c0-3.9 3.1-6.5 7-6.5 1.6 0 3 .4 4.2 1.2"/><path d="m16 15 5 5M21 15l-5 5"/>',
    report: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
  };
  //#endregion

  //#region [State / helpers]
  let root = null, open = false;
  const S = { view: "menu", sel: 0, act: 0, modal: null, room: null, timer: 5, tick: null, pinShown: false, zone: 0, spec: 0, menu: null, round: 0, scroll: 0, follow: false };
  const api = () => window.MTX?.api;
  const toast = m => api()?.toast?.(m);
  const rumble = (d, s) => api()?.rumble?.(d, s);
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ico = (k, cls = "cl-ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
  const pingQ = ms => (ms <= 60 ? [3, "Good"] : ms <= 120 ? [2, "Fair"] : [1, "Poor"]);
  const ping = (ms, word = true) => { const [n, w] = pingQ(ms); return `<span class="cl-ping cl-ping--${n}"><i class="cl-bars">${[1, 2, 3].map(b => `<b class="${b <= n ? "on" : ""}"></b>`).join("")}</i>${Math.min(ms, 999)} ms${word ? ` <small>${w}</small>` : ""}</span>`; };
  const type = t => `<span class="cl-type">${ico(t)}${t === "public" ? "Public" : "Private"}</span>`;
  const cta = (b, label, sec, showKey) => `<span class="btn-cta${sec ? " btn-cta--secondary" : ""}${showKey ? " btn-cta--key" : ""}" data-cl-btn="${b}"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${showKey ? G(b) : ""}<span class="btn-cta__label">${esc(label)}</span></span>`;
  // Tab / F work on every lobby view (app.js), so every hint bar lists them
  const hints = (data, launcher = true) => window.MTX_UI.hintBar(data, { cls: "cl-hints", launcher, itemAttrs: b => `data-cl-hint="${b}"`, after: '<i class="cl-hold" aria-hidden="true"></i>' });
  const card = (title, sub, { focused, locked, id } = {}) => `<a class="mode-card tex focus-ring focus-ring--out${focused ? " is-focused" : ""}${locked ? " is-locked" : ""}"${id ? ` data-cl-card="${id}"` : ""}>
      <h3 class="mode-card__title">${esc(title)}</h3><p class="mode-card__sub">${esc(sub)}</p>
      ${focused && !locked ? `<span class="mode-card__fx"><img class="mode-card__fist" src="${IMG}fist.webp" alt=""></span>` : ""}
      ${locked ? `<span class="mode-card__lock"><img src="mtx/assets/svg/lock-circle.svg" alt=""></span>` : ""}<i class="cl-hold" aria-hidden="true"></i></a>`;
  const social = () => { const t = document.getElementById("tpl-social-bar"); if (!t) return ""; const d = document.createElement("div"); d.appendChild(t.content.cloneNode(true));
    d.querySelectorAll(".glyph[data-btn]").forEach(g => { g.outerHTML = G(g.dataset.btn); });   // the template glyphs are empty: fill them for the current device
    return d.innerHTML; };
  //#endregion

  //#region [Menu]
  function lobbyCard(l) {
    return `<section class="cl-card" aria-label="${esc(l.name)}"><img class="cl-card__img" src="${IMG}map-mtx-arena.webp" alt=""><i class="cl-card__fade"></i>
      <span class="cl-chip">${ico(l.type)}${l.type === "public" ? "Public" : "Private"}</span>
      <p class="cl-card__no">Lobby #${l.no}</p><h2 class="cl-card__name">${esc(l.name)}</h2><i class="cl-card__rule"></i>
      <p class="cl-card__stats"><span>${ico("players")}${l.pl[0]} / ${l.pl[1]}</span><span>${ico("eye")}${l.sp[0]} / ${l.sp[1]}</span>${ping(l.ping, false)}</p>
      <p class="cl-card__status"><small>Status</small>${esc(l.st)}</p></section>`;
  }
  function menuHtml() {
    const L = LOBBIES[S.sel], m = !!S.modal;
    return `<h1 class="page-title tex-text cl-title">Custom Lobby</h1>
      ${lobbyCard(L)}
      <section class="cl-list" aria-label="Lobbies"><div class="cl-head"><span class="c-no">Lobby</span><span class="c-name">Name</span><span class="c-type">Type</span><span class="c-pl">Players</span><span class="c-ping">Ping</span></div>
        <div class="cl-rows">${LOBBIES.map((l, i) => `<div class="cl-row${i === S.sel ? " is-selected" : ""}${l.note ? " is-dim" : ""}" data-cl-row="${i}" role="option" aria-selected="${i === S.sel}">
          <span class="c-no">${l.no}</span><span class="c-name">${esc(l.name)}${l.note ? `<small>${esc(l.note)}</small>` : ""}</span><span class="c-type">${type(l.type)}</span>
          <span class="c-pl">${ico("players")}${l.pl[0]} / ${l.pl[1]}</span><span class="c-ping">${ping(l.ping)}</span></div>`).join("")}</div>
        <i class="cl-scroll"><em></em></i></section>
      ${social()}
      ${hints({ b: "Back", a: "Join", y: "Create", lb: "Refresh", rb: "Find" })}`;
  }
  //#endregion

  //#region [Waiting for Players]
  function corner(side, f, local, ready) {
    const right = side === "Blue", foc = S.zone === (right ? 2 : 0) ? " is-focused" : "", z = ` data-cl-zone="${right ? 2 : 0}"`;
    if (!f) return `<section class="cl-corner cl-corner--${side.toLowerCase()}${foc}"${z}><i class="cl-corner__shade"></i><i class="cl-corner__focus" aria-hidden="true"></i><p class="cl-corner__side">${side} corner</p>
      <h2 class="cl-corner__name is-empty">Waiting</h2><p class="cl-corner__title">Invite a friend or share lobby ${S.room.no}</p></section>`;
    const dot = local ? `<span class="cl-ring${ready ? " is-ready" : ""}" data-cl-ring>${ready ? ico("check", "cl-ring__check") : G("x")}<i class="cl-hold" aria-hidden="true"></i></span>`
      : `<span class="cl-ring cl-ring--big${ready ? " is-ready" : ""}">${ready ? ico("check", "cl-ring__check") : ""}</span>`;
    const label = `<b class="${ready && !local ? "is-ready" : ""}">${ready ? "Ready" : local ? "Ready up" : "Not ready"}</b>`;
    const ring = right ? label + dot : dot + label;   // the ring sits on the outer edge (Figma)
    return `<section class="cl-corner cl-corner--${side.toLowerCase()}${foc}"${z}><img class="cl-corner__fighter" src="${IMG}char-lobby.webp" alt=""><i class="cl-corner__shade"></i><i class="cl-corner__focus" aria-hidden="true"></i>
      <p class="cl-corner__side">${side} corner</p><h2 class="cl-corner__name">${esc(f.name)}</h2><p class="cl-corner__title">${esc(f.title)}</p>
      <div class="cl-ready${local ? " cl-ready--local" : ""}${right ? " is-right" : ""}">${ring}</div></section>`;
  }
  //#region [Player menu] one row per action that applies right now (no locked rows); the host gets the lobby actions
  const SPEC_MAX = 4, SPEC_Y = 500, SPEC_ROW = 62;   // first spectator row top, row pitch (1920 x 1080 stage)
  const oppName = () => S.room.oppName || OPP.name;
  const presets = () => window.MTX_SCREENS?.customize?.getPresets?.() || [];
  const myPreset = () => presets().find(p => p.id === S.room.preset && p.set) || presets().find(p => p.set) || null;
  function presetModal() {
    const L = presets(), cur = myPreset();
    return { type: "preset", list: L, focus: Math.max(0, L.findIndex(p => cur && p.id === cur.id)) };
  }
  const target = () => {   // what A / D + W / S point at
    const R = S.room;
    if (S.zone === 1) { const n = R.specs[S.spec]; return n === ME.name ? { kind: "me", name: n } : n ? { kind: "spec", name: n, i: S.spec } : { kind: "slot", i: S.spec }; }
    const c = S.zone === 0 ? "red" : "blue";
    if (R.side === c) return { kind: "me", name: ME.name };
    return R.opp && R.oppSide === c ? { kind: "opp", name: oppName() } : { kind: "empty", corner: c };
  };
  const freeCorner = () => (S.room.side === "blue" ? "red" : "blue");   // where a player joining with no opponent lands
  function playerActions(t) {
    const R = S.room, host = R.host === "me", warn = true, hold = true;
    const specRoom = R.spect === "Allowed" && R.specs.length < SPEC_MAX;
    const invite = { id: "invite", k: "invite", label: "Invite friends" };
    if (t.kind === "me") return [{ id: "profile", k: "profile", label: "View profile" }, ...(R.side !== "spec" ? [{ id: "style", k: "style", label: "Edit style preset" }] : [])];
    if (t.kind === "empty") return [{ id: "switch", k: "move", label: `Switch to ${t.corner} corner` }, ...(host ? [invite] : [])];
    if (t.kind === "slot") return R.spect === "Allowed" ? [...(R.side !== "spec" && specRoom ? [{ id: "switch", k: "move", label: "Switch to spectators" }] : []), invite] : [];
    const social = [{ id: "profile", k: "profile", label: "View profile" }, { id: "add", k: "add", label: "Add friend" }];
    const report = { id: "report", k: "report", label: "Report player", warn };
    if (t.kind === "opp") return [...social,
      ...(host ? [{ id: "host", k: "crown", label: "Make host", hold }, ...(specRoom ? [{ id: "toSpec", k: "move", label: "Move to spectators" }] : []),
        { id: "kick", k: "kick", label: "Kick from lobby", warn, hold }] : []), report];
    return [...social,   // spectator
      ...(host ? [...(!R.opp ? [{ id: "toFighter", k: "move", label: `Move to ${freeCorner()} corner` }] : []), { id: "kick", k: "kick", label: "Kick from lobby", warn, hold }] : []), report];
  }
  function runAction(t, a) {
    const R = S.room; rumble(50, .25);
    const done = msg => { S.menu = null; render(); toast(msg); };
    switch (a.id) {
      case "profile": return done(`${t.name} · profile`);
      case "style": return done("Edit style preset · not in this prototype");
      case "add": return done(`Friend request sent to ${t.name}`);
      case "report": return done(`${t.name} reported · thanks`);
      case "invite": S.menu = null; render(); return window.MTX_FRIENDS?.open?.();   // invite from the Friends player menu
      case "host": R.host = "opp"; return done(`${t.name} is now the host`);
      case "toSpec": R.specs.push(oppName()); R.opp = false; R.ready.opp = false; R.oppName = null; S.zone = 1; S.spec = R.specs.length - 1; return done(`${t.name} moved to spectators`);
      case "toFighter": { const c = freeCorner(); R.specs.splice(t.i, 1); R.opp = true; R.oppSide = c; R.ready.opp = false; R.oppName = t.name; S.zone = c === "red" ? 0 : 2; S.spec = 0; return done(`${t.name} moved to the ${c} corner`); }
      case "switch":   // your own seat: the old one opens up, ready resets
        if (R.side === "spec") R.specs.splice(R.specs.indexOf(ME.name), 1);
        R.ready.me = false;
        if (t.kind === "slot") { R.side = "spec"; R.specs.push(ME.name); S.zone = 1; S.spec = R.specs.length - 1; return done("You switched to spectators"); }
        R.side = t.corner; S.spec = 0; return done(`You switched to the ${t.corner} corner`);
      case "kick":
        if (t.kind === "opp") { R.opp = false; R.ready.opp = false; R.oppName = null; }
        else { R.specs.splice(t.i, 1); S.spec = Math.min(S.spec, SPEC_MAX - 1); }
        return done(`${t.name} was kicked from the lobby`);
    }
  }
  function playerMenuHtml() {
    if (!S.menu) return "";
    const t = target(), acts = playerActions(t), H = acts.length * 58 + 18;
    // beside the focused corner name / spectator row, pointer towards it
    const pos = S.zone === 0 ? { x: 330, y: 610, side: "" } : S.zone === 2 ? { x: 1190, y: 610, side: " fz-menu--left" }
      : { x: 1320, y: Math.min(SPEC_Y + S.spec * SPEC_ROW - 14, 1000 - H), side: "" };
    const ptr = S.zone === 1 ? SPEC_Y + S.spec * SPEC_ROW + 26 - pos.y - 10 : 40;
    return `<div class="fz-menu cl-pmenu${pos.side}" style="left:${pos.x}px;top:${pos.y}px;--ptr:${ptr}px" role="menu" aria-label="${esc(t.name || "Open slot")}">${acts.map((a, k) =>
      `<div class="fz-act focus-ring${k === S.menu.act ? " is-focused" : ""}${a.warn ? " fz-act--warn" : ""}" data-cl-act="${k}" role="menuitem">${ico(a.k, "fz-ico")}<span>${esc(a.label)}</span>${a.hold ? `<small>Hold</small>` : ""}<i class="cl-hold" aria-hidden="true"></i></div>`).join("")}</div>`;
  }
  //#endregion

  function waitingHtml() {
    const R = S.room, both = R.ready.me && R.ready.opp && R.opp, iAmHost = R.host === "me", m = !!S.modal;
    const sel = ["ls", "Select"];
    // ready = locked in: the only key left is Unready (nothing else can be pressed until you unready)
    const keys = R.ready.me && !S.menu ? [["x", "Unready"]]
      : S.menu ? [["b", "Close"], ["a", "Confirm"], ["ls", "Choose"]]
      : R.side === "spec" ? [["a", "Actions"], sel, ...(iAmHost ? [["rb", "Edit"]] : []), ["b", "Leave"]]   // spectating: no ready / preset / start
      : iAmHost
      ? [["a", "Actions"], sel, ["x", R.ready.me ? "Unready" : "Ready"], ["y", "Preset"], ["rb", "Edit"], ["b", "Leave"]]
      : [["a", "Actions"], sel, ["x", R.ready.me ? "Unready" : "Ready"], ["y", "Preset"], ["b", "Leave"]];
    const opp = { name: oppName(), title: R.oppName && R.oppName !== OPP.name ? "Spectator" : OPP.title };
    const seat = (label, c) => R.side === c ? corner(label, ME, true, R.ready.me) : corner(label, R.opp && R.oppSide === c ? opp : null, false, R.ready.opp);
    return `<h1 class="page-title tex-text cl-title">Lobby</h1>
      ${seat("Red", "red") + seat("Blue", "blue")}
      <section class="cl-info"><div class="cl-info__map"><img src="${IMG}map-mtx-arena.webp" alt=""><i></i><b>${esc(R.map)}</b></div>
        <div class="cl-info__id"><p class="cl-info__name">${esc(R.name)}</p><small>Lobby number</small><b>${R.no}</b><p>${ico(R.type)}${R.type === "public" ? "Public" : "Private"}</p>
          <p class="cl-info__host">${ico("crown")}${esc(R.host === "me" ? ME.name : OPP.name)}</p>
          ${R.type === "private" ? `<span class="cl-pin" data-cl-pin>PIN ${S.pinShown ? R.pin : "••••"}${ico(S.pinShown ? "eye" : "eyeoff")}</span>` : ""}</div></section>
      <section class="cl-spec${S.zone === 1 ? " is-focused" : ""}" data-cl-zone="1"><p class="cl-spec__head"><span>Spectators</span><span>${R.specs.length} / ${R.spect === "Allowed" ? SPEC_MAX : 0}</span></p>
        ${Array.from({ length: SPEC_MAX }, (_, i) => { const n = R.specs[i], f = S.zone === 1 && S.spec === i ? " is-focused" : "";
          return n ? `<p class="cl-spec__row focus-ring focus-ring--thin${f}" data-cl-spec="${i}"><img src="${IMG}avatar.webp" alt="">${esc(n)}</p>` : `<p class="cl-spec__row is-open focus-ring focus-ring--thin${f}" data-cl-spec="${i}">Open slot</p>`; }).join("")}</section>
      ${playerMenuHtml()}
      ${social()}
      ${iAmHost && both && !S.menu && S.view === "waiting" ? `<div class="cl-start">${cta("a", "Start", false, true)}</div>` : ""}
      ${hints(!S.menu && R.type === "private" ? [...keys, ["lb", S.pinShown ? "Hide PIN" : "Show PIN"]] : keys)}`;
  }
  //#endregion

  //#region [Timer / Result]
  // 7-segment digit, the Figma "Digital Numbers" glyph (170 x 336): 45° ends on the outer segments, hexagon middle
  const SEG = { a: "14,0 156,0 124,34 46,34", b: "170,16 170,162 136,136 136,48", c: "170,174 170,320 136,288 136,200", d: "46,302 124,302 156,336 14,336",
    e: "0,174 34,200 34,288 0,320", f: "0,16 34,48 34,136 0,162", g: "16,168 40,151 130,151 154,168 130,185 40,185" };
  const DIGIT = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
  const seg7 = n => String(n).split("").map(ch => `<svg class="cl-seg" viewBox="0 0 170 336" aria-hidden="true">${[...DIGIT[+ch]].map(s => `<polygon points="${SEG[s]}"/>`).join("")}</svg>`).join("");
  const timerHtml = () => `<div class="cl-timer"><h1 class="cl-timer__title">Time remaining</h1><div class="cl-led" role="timer" aria-label="${S.timer} seconds">${seg7(S.timer)}</div>
      <p class="cl-timer__line">Match starts when the clock hits zero</p><p class="cl-timer__vs">${ME.name}  vs  ${OPP.name}</p></div>`;
  const STATS = [["120/327", "Total strikes", "119/327"], ["20/41", "Significant strikes", "20/41"], ["10 / 15 / 5", "Body / head / leg strikes", "9 / 15 / 5"], ["8", "Clinch strikes", "10"],
    ["3/5", "Knockdowns", "4/6"], ["30", "Block success", "10"], ["10 / 15 / 5", "Dodge / parry / counter", "9 / 15 / 5"], ["68", "Damage taken", "55"]];
  // per round: each number of the totals scaled by that round's share (the five shares add up to the match)
  const ROUNDS = 5, ROUND_SHARE = [[.17, .19], [.21, .2], [.2, .22], [.24, .21], [.18, .18]];   // [red, blue] share per round
  const roundVal = (v, side) => S.round ? v.replace(/\d+/g, n => String(Math.round(+n * ROUND_SHARE[S.round - 1][side]))) : v;
  // Figma 327:28876 "B · Segmented round bar": the bar is as wide as the table, LB / RB outside its ends
  const roundTabs = () => `<nav class="cl-res__rounds" role="tablist" aria-label="Round">${G("lb")}<span class="cl-res__bar">${["All", "Round 1", "Round 2", "Round 3", "Round 4", "Round 5"].map((t, i) =>
    `<span class="cl-res__seg${i === S.round ? " is-active" : ""}" data-cl-round="${i}" role="tab" aria-selected="${i === S.round}">${t}</span>`).join("")}</span>${G("rb")}</nav>`;
  const SCORE = ["10/0/0", "9/0/0"];   // SCORE row (Figma), first in the table
  // only the side with the better value is coloured: "a/b" compares a, "a / b / c" the sum; Damage taken: lower wins; a tie colours neither
  const statNum = v => / \/ /.test(v) ? v.split("/").reduce((n, x) => n + (+x || 0), 0) : +v.split("/")[0] || 0;
  const lead = (a, b, k) => { const d = (statNum(a) - statNum(b)) * (/damage taken/i.test(k) ? -1 : 1); return d > 0 ? " is-red" : d < 0 ? " is-blue" : ""; };
  const statRow = (a, k, b, cls = "") => `<p class="cl-res__row${cls}${lead(a, b, k)}"><b>${a}</b><span>${k}</span><b>${b}</b></p>`;
  const resultHtml = () => `<i class="cl-res__titlebar" aria-hidden="true"></i><h1 class="page-title tex-text cl-res__title">Statistics</h1>
      ${roundTabs()}
      <section class="cl-res">${statRow(SCORE[0], "Score", SCORE[1], " cl-res__row--score")}${STATS.map(([a, k, b]) => statRow(roundVal(a, 0), k, roundVal(b, 1))).join("")}
        <div class="cl-res__dec"><p><b>${ME.name}</b><small class="is-win">Winner</small></p><h2 class="tex-text">Decision</h2><p class="is-r"><b>${OPP.name}</b><small>Defeated</small></p></div></section>
      <div class="cl-res__btns">${cta("a", "Continue", false, true)}</div>
      ${hints({ a: "Continue", "lb+rb": "Round" }, false)}`;   // Statistics: no Friends / Options
  //#endregion

  //#region [Modals]
  function rowHtml(r, i, focus) {
    const on = i === focus, link = r.kind === "link";
    return `<div class="st-row st-row--opt focus-ring${on ? " is-focused" : ""}" data-cl-mrow="${i}"><span class="st-row__label">${esc(r.label)}</span>
      ${link ? "" : `<i class="st-arrow st-arrow--l"></i>`}<b class="st-row__val">${esc(r.secret && !S.pinShown ? "••••" : r.field && r.value().length > 9 ? r.value().slice(0, 9).trimEnd() + "..." : r.value())}</b><i class="st-arrow st-arrow--r"></i>${r.secret ? `<span class="cl-md__eye" data-cl-pin>${ico(S.pinShown ? "eye" : "eyeoff")}</span>` : ""}</div>`;
  }
  function settingsModal(md) {
    const rows = md.rows(), f = Math.min(md.focus, rows.length - 1);
    return `<div class="cl-md cl-md--form"><div class="cl-md__scrim"></div><section class="cl-md__panel cl-md__panel--map">
      <div class="cl-md__map" data-cl-map="${esc(md.title())}">${MAP_IMG[md.title()] ? `<img src="${IMG}${MAP_IMG[md.title()]}" alt="">` : `<span class="cl-md__mapph">Map image pending</span>`}<i></i><b>${esc(md.title())}</b></div>
      <div class="cl-md__bot">${rows.map((r, i) => rowHtml(r, i, f)).join("")}
        <p class="cl-md__help${md.warn ? " is-warn" : ""}">${esc(md.help())}</p>
        <div class="cl-md__foot">${cta("b", "Cancel", true)}${cta("a", md.primary)}</div></div></section></div>`;
  }
  function entryModal(md) {
    const d = md.digits;
    return `<div class="cl-md"><div class="cl-md__scrim"></div><section class="cl-md__panel cl-md__panel--map">
      <div class="cl-md__map"><img src="${IMG}map-mtx-arena.webp" alt=""><i></i><b>${esc(md.title)}</b></div>
      <div class="cl-md__bot"><p class="cl-md__prompt">${esc(md.prompt)}</p>
        <div class="cl-digits">${[0, 1, 2, 3].map(i => `<span class="cl-digit${i === md.pos ? " is-active" : ""}">${d[i] ?? (i === md.pos ? "<i></i>" : "")}</span>`).join("")}</div>
        <p class="cl-md__help${md.err ? " is-warn" : ""}">${esc(md.err || md.help)}</p>
        <div class="cl-md__foot">${cta("b", "Cancel", true, true)}${cta("a", "Confirm", false, true)}</div></div></section></div>`;
  }
  const msgModal = md => `<div class="cl-md"><div class="cl-md__scrim"></div><section class="cl-md__panel cl-md__panel--msg">
      <div class="cl-md__top"><h2>${esc(md.title)}</h2><p>${esc(md.body)}</p></div>
      <div class="cl-md__bot"><div class="cl-md__foot${md.second ? "" : " is-one"}">${md.second ? cta(md.key2, md.second, true) : ""}${cta("a", md.primary)}</div></div></section></div>`;
  const presetPicker = md => `<div class="cl-md"><div class="cl-md__scrim"></div><section class="cl-md__panel cl-md__panel--preset">
      <div class="cl-md__bot"><h2 class="cl-pp__title">Style preset</h2><p class="cl-pp__sub">Pick the preset you fight with in this match. Create or edit presets in Character Customization · Style preset.</p>
        <div class="cl-pp__rows">${md.list.map((p, i) => `<div class="cl-pp__row${i === md.focus ? " is-focused" : ""}${p.set ? "" : " is-off"}" data-cl-pp="${i}" style="--st:${p.color}">
          <img src="mtx/assets/svg/style-${p.id}-sel.svg" alt=""><span class="cl-pp__name"><b>${esc(p.title)}</b><small>${esc(p.region || "")}</small></span>
          <span class="cl-pp__state">${p.set && myPreset()?.id === p.id ? "<em>Selected</em>" : ""}</span></div>`).join("")}</div>
        <div class="cl-md__foot">${cta("b", "Cancel", true)}${cta("a", "Selected")}</div></div></section></div>`;
  const modalBody = () => !S.modal ? "" : S.modal.type === "preset" ? presetPicker(S.modal) : S.modal.type === "msg" ? msgModal(S.modal) : (S.modal.type === "find" || S.modal.type === "pin") ? entryModal(S.modal) : settingsModal(S.modal);
  // CTAs carry no key: the keys of the modal's buttons float as text just under the panel (like the Campaign window)
  const modalHtml = () => { const h = modalBody(); if (!h) return h;
    const keys = window.MTX_UI.hintItems([...h.matchAll(/data-cl-btn="([a-z+]+)"[^>]*>(?:<span class="btn-cta__(?:grad|tex|hold-bar)"><\/span>)*(?:<span class="glyph[^>]*>[^<]*<\/span>)?<span class="btn-cta__label">([^<]*)</g)].map(m => [m[1], m[2]]).concat(S.modal.type === "find" || S.modal.type === "pin" ? [["du+dd", "Digit"]] : S.modal.rows?.()[S.modal.focus]?.field ? [["dr", "Keyboard"], ...(S.modal.rows()[S.modal.focus].secret ? [["y", S.pinShown ? "Hide PIN" : "Show PIN"]] : [])] : []), { itemAttrs: b => `data-cl-hint="${b}"` });
    return h.replace('<section class="cl-md__panel', '<div class="cl-md__wrap"><section class="cl-md__panel').replace(/<\/section><\/div>\s*$/, `</section><nav class="cl-md__keys">${keys}</nav></div></div>`); };

  //#region [Visual keyboard] Text rows of the create / edit form. D / D-pad right opens it; md.vk holds its state.
  // Pad: A key · B cancel · X delete · Y space · LB shift · Menu done. Physical keyboard: every key types (so D is a letter here),
  // Enter done (or presses the key picked with the arrows) · Esc cancel · Backspace delete.
  const { vkOpen, vkInput, vkKey, vkHtml, vkPress, vkRows } = window.MTX_UI.createVk({ host: () => open ? S.modal : null, render: () => render(), rumble: (...x) => rumble(...x), esc, ico: n => ico(n), pinShown: () => S.pinShown, togglePin: () => { S.pinShown = !S.pinShown; } });
  //#endregion

  function cycle(arr, cur, d) { return arr[(arr.indexOf(cur) + d + arr.length) % arr.length]; }
  function lobbyForm(kind) {   // create / edit share the rows; edit adds Host
    const R = kind === "edit" ? S.room : null;
    const v = R ? { map: R.map, name: R.name, type: R.type, pin: R.pin, spect: R.spect, host: R.host }
      : { map: MAPS[0], name: "MTX Arena", type: "private", pin: "0067", spect: "Allowed", host: "me" };
    const md = { type: kind, v, focus: 0, primary: kind === "edit" ? "Save" : "Create",
      title: () => v.map,
      rows: () => [
        { label: "Map", value: () => v.map, change: d => { v.map = cycle(MAPS, v.map, d); } },
        { label: "Lobby name", kind: "link", field: "name", max: 24, value: () => v.name },
        { label: "Lobby type", value: () => v.type === "public" ? "Public" : "Private", change: () => { v.type = v.type === "public" ? "private" : "public"; } },
        ...(v.type === "private" ? [{ label: "Password PIN", kind: "link", field: "pin", num: true, secret: true, max: 4, value: () => v.pin }] : []),
        { label: "Spectators", value: () => v.spect, change: () => { v.spect = v.spect === "Allowed" ? "Off" : "Allowed"; } },
        ...(kind === "edit" && R.opp ? [{ label: "Host", value: () => v.host === "me" ? `${ME.name} (you)` : OPP.name, change: () => { v.host = v.host === "me" ? "opp" : "me"; } }] : []),
      ],
      help: () => kind === "edit" && v.host === "opp" ? `Host moves to ${OPP.name} when you save. You stay in the lobby as a fighter.`
        : kind === "edit" ? "Fighters and spectators in the lobby see the changes right away." : v.type === "private" ? "Share the PIN with your friends so they can join." : "Anyone can find and join this lobby.",
    };
    Object.defineProperty(md, "warn", { get: () => kind === "edit" && v.host === "opp" });
    return md;
  }
  const entry = (kind, lobby) => ({ type: kind, lobby, digits: [], pos: 0, err: "",
    title: kind === "find" ? "Find lobby" : lobby.name,
    prompt: kind === "find" ? "Enter the 4-digit lobby number." : "This lobby is private. Enter the 4-digit PIN to join.",
    help: kind === "find" ? "The host can see the lobby number on the lobby screen." : "Ask the host for the PIN." });
  // key2 = the secondary button key: B by default, Y where the second choice is a new action (Lobby full: Y Create)
  // message popups are the global Dialog component (components/dialog.js); openModal(msg(...)) hands them over
  const msg = (title, body, primary, second, onA, onB, key2 = "b") => ({ type: "msg", title, body, primary, second, onA, onB, key2 });

  // hold-to-confirm for every decision: the held element shows the progress (--hold-p), letting go early cancels
  const KEYNAME = b => (window.MTX_UI?.keyLabel ? window.MTX_UI.keyLabel(b) : b.toUpperCase());
  let hold = null;
  function holdFor(action, selector, verb, done) {
    hold = hold || window.MTX_UI.createHold({ ms: 900, steps: 3, flash: null, startRumble: [40, .2],
      onDone: ctx => ctx.done(), onCancel: ({ quick, ctx }) => { if (quick) toast(`Hold ${KEYNAME(ctx.key)} to ${ctx.verb}`); } });
    const el = root.querySelector(selector);
    if (!el) return done();
    hold.start(el, { ctx: { key: action === "back" ? "b" : action === "lt" ? "lb" : action, action, verb, done }, source: "input" });
  }
  function release(a) { if (hold?.active && hold.ctx.action === a) hold.cancel(true); }
  //#endregion

  //#region [Flow]
  function enterRoom(asHost, lobby) {
    clearTimeout(S.joinT);
    // side / oppSide = red | blue (side also spec); joined someone's lobby: the host stays in the red corner
    S.room = asHost ? { ...lobby, no: lobby.no || "5581", host: "me", side: "red", oppSide: "blue", opp: false, ready: { me: false, opp: false }, specs: ["MTX Spectator"] }
      : { name: lobby.name, map: "MTX Arena", no: lobby.no, type: lobby.type, pin: lobby.pin, spect: "Allowed", host: "opp", guest: true, side: "blue", oppSide: "red", opp: true, ready: { me: false, opp: true }, specs: ["MTX Spectator"] };
    S.view = "waiting"; S.modal = null; S.pinShown = false; S.menu = null; S.spec = 0;
    S.zone = asHost ? 0 : 2;   // start on your own corner
    if (window.MTX_LOBBY) window.MTX_LOBBY.in = true;
    if (asHost) S.joinT = setTimeout(() => { if (S.view === "waiting" && S.room && !S.room.opp) { S.room.opp = true; S.room.oppSide = freeCorner(); S.room.ready.opp = true; toast(`${OPP.name} joined the lobby`); rumble(60, .3); render(); } }, 2500);
    render();
  }
  function tryJoin(l) {
    // Lobby full / match in progress: one Close button only (A or B closes)
    if (l.st === "Full") return openModal(msg("Lobby is full", `All ${l.pl[1]} player and ${l.sp[1]} spectator places in ${l.name} are taken. Try another lobby or create your own.`, "Close", null, () => closeModal(), () => closeModal()));
    if (l.st !== "Open") return openModal(msg("Match in progress", `${l.name} is in the middle of a match. Pick another lobby.`, "Close", null, () => closeModal(), () => closeModal()));
    if (l.type === "private") return openModal(entry("pin", l));
    enterRoom(false, l);
  }
  function openModal(m) {
    if (m.type === "msg") { S.modal = null; S.menu = null; render(); return window.MTX_UI.dialog.open({ title: m.title, body: m.body, primary: m.primary, secondary: m.second, secondaryKey: m.key2, onPrimary: m.onA, onSecondary: m.onB, onClose: m.onB }); }
    S.modal = m; S.menu = null; rumble(50, .25); render();
  }
  function closeModal() { S.modal = null; render(); }
  function submitEntry() {
    const md = S.modal, code = md.digits.join("");
    if (code.length < 4) { md.err = "Enter all 4 digits, then press Confirm."; rumble(80, .2); return render(); }
    if (md.type === "find") {
      const l = LOBBIES.find(x => x.no === code);
      if (!l) return openModal(msg("Lobby not found", `No open lobby uses number ${code}. Check the number with the host and try again.`, "Try again", "Cancel", () => openModal(entry("find")), () => closeModal()));
      S.sel = LOBBIES.indexOf(l); S.modal = null; return tryJoin(l);
    }
    if (code !== md.lobby.pin) { const l = md.lobby; return openModal(msg("Incorrect PIN", `The PIN for ${l.name} didn't match. Check it with the host and try again.`, "Try again", "Cancel", () => openModal(entry("pin", l)), () => closeModal())); }
    enterRoom(false, md.lobby);   // correct: straight into the room, no message
  }
  // Standby Lobby (Figma 620:60114) and Player Detail (620:60289): both fighters ready up after the host starts; both ready = 5 s, red.
  // Every value is an element fed by the fighter data below; only textures come from Figma (assets/img/standby/).
  const SB_TIME = 25, SB_FINAL = 5, SB_OPP_READY_AT = 6, SB_LOAD_MS = 4000;
  const SB_IMG = IMG + "standby/";
  const SB_STYLES = [{ id: "phranakhon", title: "Phranakhon" }, { id: "south", title: "Chaiya" }, { id: "isan", title: "Korat" }, { id: "north", title: "Thasao" }, { id: "west", title: "Lopburi" }];
  const SB_MOVES = [["Decisive move", "dec"], ["Signature move", "hex"], ["Special move", "hex"], ["Active perk", "hex"]];
  const sbAttr = (overall, attacking, defending, striking, agility, endurance) => [["Overall", overall], ["Attacking", ...attacking], ["Defending", ...defending], ["Striking arts", ...striking], ["Agility", ...agility], ["Endurance", ...endurance]];
  const SB_ME = { record: "20-15-12", winRate: "80%", ovr: 88, flag: "th", style: 0, attr: sbAttr(88, [90, 3], [70], [90], [98, 18], [96]) };
  const SB_OPP = { record: "15-10-10", winRate: "75%", ovr: 88, flag: "th", style: 2, attr: sbAttr(88, [87], [78, 8], [97, 7], [80], [99, 3]) };
  const sbClock = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  // Dynamic mockup (Dev › Lobby video › "Random standby values", store mtx.sbRandom, default on): every match rolls new
  // record / win rate / style for both fighters plus one attribute set per style preset (each style leans its own way),
  // so OVR and the detail stats change with the style. Numbers tween: count up from 0 when the standby view opens,
  // then run from the old to the new value whenever a style change (LT / RT in Player detail) changes them.
  const sbRandomOn = () => { try { return localStorage.getItem("mtx.sbRandom") !== "0"; } catch (e) { return true; } };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  //                 Attacking Defending Striking Agility Endurance
  const SB_BIAS = [[2, 2, 4, 2, 0], [-3, 8, 0, 2, 2], [8, -3, 4, -2, 2], [0, -2, 2, 8, -2], [2, 0, 6, 4, -4]];   // per SB_STYLES
  function sbRoll() {
    const one = () => { const w = rnd(8, 40), l = rnd(3, 25), base = [0, 0, 0, 0, 0].map(() => rnd(66, 91));
      return { w, l, ko: rnd(Math.floor(w * .3), w), style: rnd(0, SB_STYLES.length - 1),
        sa: SB_BIAS.map(bs => base.map((v, i) => Math.max(50, Math.min(99, v + bs[i] + rnd(-3, 3))))) }; };
    return { me: one(), opp: one() };
  }
  function sbData(f, style, oppA) {   // [value, diff] pairs: the higher fighter shows the gap (green up), the lower shows none
    const a = f.sa[style], ovr = Math.round(a.reduce((t, v) => t + v, 0) / 5), pair = (v, ov) => v > ov ? [v, v - ov] : [v];
    return { record: `${f.w}-${f.l}-${f.ko}`, winRate: Math.round(f.w / (f.w + f.l) * 100) + "%", ovr, flag: "th", style, attr: sbAttr(ovr, ...a.map((v, i) => pair(v, oppA[i]))) };
  }
  let sbTw = null;
  function sbTween() {   // [data-sb-num="key"]: each key remembers what it showed; a changed value runs from the old number
    const B = S.sb, D = 700, now = performance.now(), first = B.count === true; B.count = false;
    const shown = B.shown || (B.shown = {});
    root.querySelectorAll("[data-sb-num]").forEach(el => {
      const k = el.dataset.sbNum, to = el.textContent, p = shown[k];
      if (!p) { shown[k] = { from: first ? to.replace(/\d+/g, "0") : to, to, t0: now }; return; }
      if (p.to !== to) shown[k] = { from: sbAt(p, now), to, t0: now };
    });
    const step = () => {   // setTimeout, not rAF: keeps running (and ends on the real values) in a background tab
      const t = performance.now(); let busy = false;
      root.querySelectorAll("[data-sb-num]").forEach(el => { const p = shown[el.dataset.sbNum]; if (!p) return; const v = sbAt(p, t); if (el.textContent !== v) el.textContent = v; if (t - p.t0 < D) busy = true; });
      sbTw = busy ? setTimeout(step, 16) : null;
    };
    clearTimeout(sbTw); step();
    function sbAt(p, t) { const k = Math.min(1, (t - p.t0) / D), e = 1 - Math.pow(1 - k, 3), fn = p.from.match(/\d+/g) || [];
      let i = 0; return k >= 1 ? p.to : p.to.replace(/\d+/g, n => { const a = +(fn[i++] ?? 0); return Math.round(a + (+n - a) * e); }); }
  }
  // [left, right] on screen: each is the fighter's data plus its identity and current style
  function sbFighters(draft) {
    const B = S.sb, X = B.fx, mySt = draft ? B.draft : B.style;
    const own = { ...(X ? sbData(X.me, mySt, X.opp.sa[X.opp.style]) : SB_ME), ...ME, plate: ME.name, style: mySt, me: true };
    const opp = { ...(X ? sbData(X.opp, X.opp.style, X.me.sa[mySt]) : SB_OPP), name: oppName(), plate: S.room.oppName && S.room.oppName !== OPP.name ? oppName() : OPP.plate, title: OPP.title, me: false };
    return S.room.side === "blue" ? [opp, own] : [own, opp];
  }
  function sbFit() {   // long name: shrink to fit its 50% slot (Figma nameplate split)
    root.querySelectorAll("[data-sb-fit]").forEach(el => { el.style.fontSize = ""; const box = el.clientWidth, w = el.scrollWidth; if (w > box) el.style.fontSize = Math.max(18, Math.floor(parseFloat(getComputedStyle(el).fontSize) * box / w)) + "px"; });
  }
  const sbMatch = () => `<section class="cl-sb-match"><img src="${SB_IMG}match.webp" alt=""><p>Match starts in</p><b class="cl-sb-time${S.sb.t <= SB_FINAL ? " is-final" : ""}" role="timer" data-sb-led>${sbClock(S.sb.t)}</b></section>`;
  const sbFlag = f => `<img src="mtx/assets/svg/flag-${f.flag}.svg" alt="">`;
  function standbyHtml() {
    const R = S.room, B = S.sb, [L, Rt] = sbFighters();
    const seat = (label, c) => R.side === c ? corner(label, ME, true, B.me) : corner(label, { name: oppName(), title: OPP.title }, false, B.opp);
    const row = (art, y, h, a, k, b, cls = "", num = false) => { const c = sd => num ? ` data-sb-num="${art}-${sd}"` : ""; return `<div class="cl-sb-row${cls}" style="top:${y}px;height:${h}px"><img src="${SB_IMG}${art}.webp" alt=""><span class="l"${c("l")}>${a}</span><span class="k">${k}</span><span class="r"${c("r")}>${b}</span></div>`; };
    return `${seat("Red", "red") + seat("Blue", "blue")}${sbMatch()}
      <div class="cl-sb-band"><img src="${SB_IMG}band.webp" alt=""><b class="cl-sb-name" data-sb-fit>${esc(L.plate)}</b><small class="cl-sb-sub">${esc(L.title)}</small><b class="cl-sb-name is-r" data-sb-fit>${esc(Rt.plate)}</b><small class="cl-sb-sub is-r">${esc(Rt.title)}</small></div>
      ${row("row1", 428, 72, L.record, "Win / Loss / KO-TKO", Rt.record, "", true)}${row("row2", 510, 72, L.winRate, "Win rate", Rt.winRate, "", true)}
      ${row("rowovr", 592, 83, L.ovr, "OVR", Rt.ovr, " is-ovr", true)}${row("row4", 685, 72, SB_STYLES[L.style].title, "Style", SB_STYLES[Rt.style].title)}
      ${row("rownat", 767, 74, sbFlag(L), "Nationality", sbFlag(Rt), " is-nat")}
      ${hints(B.me ? [] : [["x", "Hold to ready"], ["y", "Player detail"]], false)}`;
  }
  function sbCard(f, right) {
    const st = SB_STYLES[f.style], side = right ? "r" : "l";
    const stats = f.attr.map(([k, v, d], i) => `<p class="cl-pd-stat" style="top:${[10, 86, 161, 236, 311, 386][i]}px"><span class="k">${k}</span>${d ? `<span class="d"><i></i><span data-sb-num="pd${side}${i}d">${d}</span></span>` : ""}<b class="${i === 0 ? "" : d ? "is-up" : "is-low"}" data-sb-num="pd${side}${i}">${v}</b></p>`).join("");
    const moves = SB_MOVES.map(([t, kind], i) => `<div class="cl-pd-group" style="top:${[0, 122, 243, 364][i]}px"><h3>${t}</h3>${[1, 2, 3, 4].map(n => `<span class="cl-pd-slot${kind === "dec" ? " is-dec" : ""}"><img src="${SB_IMG}${kind}${n}.png" alt=""></span>`).join("")}</div>`).join("");
    return `<section class="cl-pd-card cl-pd-card--${side}" data-style="${st.id}"><img class="cl-pd-art" src="${SB_IMG}pd_card_${side}.webp" alt=""><span class="cl-pd-clip"><img class="cl-pd-emblem" src="mtx/assets/svg/style-${st.id}-sel.svg" alt=""></span>
      <div class="cl-pd-stats">${stats}${[61, 136, 211, 286, 361].map(y => `<i style="top:${y}px"></i>`).join("")}</div><div class="cl-pd-moves">${moves}</div>
      <img class="cl-pd-plate" src="${SB_IMG}pd_plate_${side}.webp" alt=""><b class="cl-pd-name" data-sb-fit>${esc(f.plate)}</b><small class="cl-pd-sub">${esc(f.title)}</small>
      <p class="cl-pd-style">${f.me ? G("lb") : ""}<b>${esc(st.title)}</b>${f.me ? G("rb") : ""}</p></section>`;
  }
  function detailHtml() {
    const [L, Rt] = sbFighters(true);
    return `${sbMatch()}<img class="cl-pd-ring${L.me ? "" : " is-r"}" src="${SB_IMG}focus-ring.webp" alt="">
      ${sbCard(L, false)}${sbCard(Rt, true)}
      ${hints({ b: "Back", a: "Save", "lb+rb": "Change style" }, false)}`;
  }
  // 3D Mockup: the two character hosts live outside the re-rendered markup so the WebGL canvas survives each render
  let sb3d = null;
  const SB_VIDEO = "mtx/assets/video/lobby-standby.mp4?v=3", SB_VIDEO_WAIT = "mtx/assets/video/lobby-waiting.mp4?v=2";
  const sbVideoOn = () => { try { return localStorage.getItem("mtx.sbVideo") === "1"; } catch (e) { return false; } };
  function sbMount3d() {
    if (!sb3d) {
      sb3d = document.createElement("div"); sb3d.className = "cl-sb3d"; sb3d.setAttribute("aria-hidden", "true");
      sb3d.innerHTML = `<div class="cl-sb3d__f is-l"><img src="${IMG}char-lobby.webp" alt=""></div><div class="cl-sb3d__f is-r"><img src="${IMG}char-lobby.webp" alt=""></div><img class="cl-sb3d__shade" src="${SB_IMG}shade.webp" alt="">`;
    }
    root.querySelector(".cl__bg").after(sb3d);
    // Dev › Lobby video (store mtx.sbVideo = "1"): mockup videos instead of the 3D fighters
    //   waiting room (before Ready) -> lobby-waiting.mp4 · "Match starts in" (standby) -> lobby-standby.mp4
    let vid = sb3d.querySelector(".cl-sb3d__vid");
    const src = S.view === "standby" ? SB_VIDEO : S.view === "waiting" || S.view === "timer" ? SB_VIDEO_WAIT : null;   // the countdown keeps the waiting-room video
    const vidOn = !!src && sbVideoOn();
    if (vid && vidOn && !vid.src.endsWith(src)) { vid.pause(); vid.remove(); vid = null; }
    if (vidOn && !vid) {
      vid = document.createElement("video"); vid.className = "cl-sb3d__vid"; vid.src = src;
      vid.muted = true; vid.loop = true; vid.playsInline = true; vid.autoplay = true; vid.preload = "auto";
      sb3d.prepend(vid);
    }
    if (!vidOn && vid) { vid.pause(); vid.remove(); }
    sb3d.classList.toggle("is-video", vidOn);
    if (vidOn) { vid.play()?.catch(() => {}); return window.MTX_CHARACTER3D?.detach?.(); }
    // one model: it renders in the first seated corner, a second seated corner copies it; an empty corner shows nothing
    const R = S.room, seated = c => R.side === c || (R.opp && R.oppSide === c), l = sb3d.querySelector(".is-l"), r = sb3d.querySelector(".is-r");
    const onL = seated("red"), onR = seated("blue");
    l.classList.toggle("is-off", !onL); r.classList.toggle("is-off", !onR);
    if (!onL && !onR) return window.MTX_CHARACTER3D?.detach?.();
    window.MTX_CHARACTER3D?.attach?.(onL ? l : r, onL && onR ? r : null);
  }
  function sbUpdateClock() {
    root.querySelectorAll("[data-sb-led]").forEach(el => { el.textContent = sbClock(S.sb.t); el.classList.toggle("is-final", S.sb.t <= SB_FINAL); });
  }
  function sbCheckFinal() {
    const B = S.sb;
    if (!B.me || !B.opp || B.final) return;
    B.final = true; B.t = Math.min(B.t, SB_FINAL); rumble(80, .4);
  }
  // Match Find: a room was found. No lobby: Countdown, Load, Standby with the opponent, Load, Statistics, Load, then back to the screen that started it.
  function startMatch({ onExit, mode = "casual" } = {}) {
    S.room = { name: "Match", map: "MTX Arena", no: "", type: "public", pin: "", spect: "Off", host: "opp", guest: true, side: "red", oppSide: "blue", opp: true, oppName: null, ready: { me: false, opp: false }, specs: [], quick: true, onExit, mode };
    S.view = "timer"; S.timer = 5; S.modal = null; S.menu = null;
    const begin = () => { show(); startCountdown(); };
    if (window.MTX_MATCH_FOUND) window.MTX_MATCH_FOUND.play(begin); else begin();   // transparent video over the current screen first
  }
  function exitMatch() {
    const cb = S.room?.onExit;
    clearInterval(S.tick); S.room = null; S.view = "menu"; S.act = 0;
    close();
    cb?.();
  }
  function startCountdown() {
    S.view = "timer"; S.timer = 5; S.modal = null; S.menu = null; render();
    clearInterval(S.tick);
    S.tick = setInterval(() => { S.timer--; rumble(30, .15); if (S.timer <= 0) { clearInterval(S.tick); if (S.room.quick && window.MTX_LOADING) { window.MTX_LOADING.show({ duration: SB_LOAD_MS, onDone: startStandby }); return; } return startStandby(); } render(); }, 1000);
  }
  function startStandby() {
    S.view = "standby"; S.modal = null; S.menu = null; S.zone = S.room.side === "blue" ? 2 : 0;
    const fx = sbRandomOn() ? sbRoll() : null, myStyle = (fx?.me || SB_ME).style;   // count: numbers run up from 0 on the first standby render
    S.sb = { t: SB_TIME, me: false, opp: false, final: false, detail: false, style: myStyle, draft: myStyle, age: 0, fx, count: !!fx };
    render();
    clearInterval(S.tick);
    S.tick = setInterval(() => {
      if (S.view !== "standby") return clearInterval(S.tick);
      const B = S.sb; B.t--; B.age++;
      if (!B.opp && B.age >= SB_OPP_READY_AT && !hold?.active) { B.opp = true; sbCheckFinal(); render(); }   // opponent readies up (simulated)
      if (B.t <= 0) {
        clearInterval(S.tick); sbUpdateClock();
        const toResult = () => { if (S.view === "standby") { S.view = "result"; S.round = 0; render(); } };
        if (window.MTX_LOADING) window.MTX_LOADING.show({ duration: SB_LOAD_MS, onDone: toResult }); else toResult();
        return;
      }
      sbUpdateClock();
    }, 1000);
  }
  function inputStandby(a) {
    const B = S.sb;
    if (B.detail) {
      if (a === "lt" || a === "rt") { B.draft = (B.draft + (a === "lt" ? -1 : 1) + SB_STYLES.length) % SB_STYLES.length; rumble(30, .12); return render(); }
      if (a === "a") { B.style = B.draft; B.detail = false; toast("Loadout saved"); rumble(60, .3); return render(); }
      if (a === "back") { B.draft = B.style; B.detail = false; return render(); }
      return;
    }
    if (B.me) return;   // ready: locked in until the match starts
    if (a === "x") return holdFor("x", "[data-cl-ring]", "ready up", () => { B.me = true; sbCheckFinal(); rumble(60, .3); render(); });
    if (a === "y") { B.draft = B.style; B.detail = true; rumble(40, .2); return render(); }
  }
  function leaveRoom() { clearTimeout(S.joinT); clearInterval(S.tick); S.room = null; S.view = "menu"; S.act = 0; S.modal = null; S.menu = null; if (window.MTX_LOBBY) window.MTX_LOBBY.in = false; render(); }
  //#endregion

  //#region [Input]
  function inputModal(a) {
    const md = S.modal;
    if (md.vk) return vkInput(md, a);
    if (md.type === "preset") {
      if (a === "back") return closeModal();
      if (a === "up" || a === "down") { md.focus = (md.focus + (a === "up" ? -1 : 1) + md.list.length) % md.list.length; rumble(20, .1); return render(); }
      if (a === "a") {
        const p = md.list[md.focus];
        if (!p.set) { rumble(80, .2); return toast(`No ${p.title} preset yet · create it in Character Customization`); }
        S.room.preset = p.id; closeModal(); return toast(`${p.title} preset selected`);
      }
      return;
    }
    if (md.type === "msg") {
      if (a === "a") return md.onA();
      if (md.second && a === (md.key2 === "b" ? "back" : md.key2)) return md.onB();
      if (a === "back") return closeModal();
      return;
    }
    if (md.type === "find" || md.type === "pin") {
      if (a === "back") return closeModal();
      if (a === "a") return submitEntry();
      if (a === "left" || a === "right") { md.pos = Math.max(0, Math.min(3, md.pos + (a === "left" ? -1 : 1), md.digits.length)); return render(); }
      if (a === "up" || a === "down") { const cur = +(md.digits[md.pos] ?? (a === "up" ? -1 : 10)); md.digits[md.pos] = String((cur + (a === "up" ? 1 : -1) + 10) % 10); md.err = ""; return render(); }
      return;
    }
    const rows = md.rows();
    if (a === "back") return closeModal();
    if (a === "up" || a === "down") { md.focus = (md.focus + (a === "up" ? -1 : 1) + rows.length) % rows.length; rumble(20, .1); return render(); }
    const r = rows[md.focus];
    if (a === "y" && r.secret) { S.pinShown = !S.pinShown; rumble(20, .1); return render(); }
    if (a === "left" || a === "right") { if (r.change) { r.change(a === "left" ? -1 : 1); rumble(20, .1); } else if (r.field && a === "right") vkOpen(md, r); return render(); }
    if (a === "a") {
      const v = md.v;
      if (md.type === "create") return holdFor("a", '[data-cl-btn="a"]', "create the lobby", () => enterRoom(true, { name: v.name, map: v.map, type: v.type, pin: v.pin, spect: v.spect }));
      return holdFor("a", '[data-cl-btn="a"]', "save", () => {
        const R = S.room; Object.assign(R, { map: v.map, name: v.name, type: v.type, pin: v.pin, spect: v.spect });
        if (v.host !== R.host) { R.host = v.host; toast(`${OPP.name} is now the host`); }
        closeModal();
      });
    }
  }
  function digitKey(e) {   // keyboard digits for the number / PIN entry
    if (!open || !S.modal || (S.modal.type !== "find" && S.modal.type !== "pin")) return;
    const md = S.modal;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); if (md.pos < 4) { md.digits[md.pos] = e.key; md.pos = Math.min(4, md.pos + 1); md.err = ""; } render(); }
    else if (e.key === "Backspace" && md.digits.length) { e.preventDefault(); e.stopImmediatePropagation(); md.digits.pop(); md.pos = md.digits.length; md.err = ""; render(); }
  }
  function input(a) {
    if (S.modal) return inputModal(a);
    if (S.view === "timer") return;
    if (S.view === "standby") return inputStandby(a);
    if (S.view === "result") {
      if (a === "lt" || a === "rt") { const r = Math.max(0, Math.min(ROUNDS, S.round + (a === "lt" ? -1 : 1))); if (r !== S.round) { S.round = r; rumble(30, .12); render(); } return; }
      // Space / A = Continue: back to the waiting room, host and guest alike, ready reset
      if (a === "a") {
        const toLobby = S.room.quick ? exitMatch : () => { S.room.ready = { me: false, opp: false }; S.view = "waiting"; S.act = 0; clearTimeout(S.joinT); if (S.room.opp) S.joinT = setTimeout(() => { if (S.view === "waiting" && S.room?.opp) { S.room.ready.opp = true; render(); } }, 1500); render(); };
        const load = () => { if (window.MTX_LOADING) window.MTX_LOADING.show({ duration: SB_LOAD_MS, onDone: toLobby }); else toLobby(); };
        // quick match: Statistics → Match Result (Rank: RP + Level · Casual: Level) → load screen → back
        if (S.room.quick && window.MTX_MATCH_RESULT) window.MTX_MATCH_RESULT.play({ mode: S.room.mode, onDone: load }); else load();
        return;
      }
      return;
    }
    if (S.view === "waiting") {
      const R = S.room;
      if (a === "lt" && !S.menu && R.type === "private") { S.pinShown = !S.pinShown; rumble(20, .1); return render(); }   // works while Ready too
      if ((a === "a" || a === "menu") && !S.menu && R.host === "me" && R.opp && R.ready.me && R.ready.opp) return holdFor(a, '.cl-start [data-cl-btn="a"]', "start the match", startCountdown);
      if (R.ready.me && !S.menu && a !== "x") { rumble(30, .1); return; }   // ready: locked until Unready (X)
      if (S.menu) {   // player menu open: it has the keys
        const t = target(), acts = playerActions(t);
        if (a === "back") { S.menu = null; return render(); }
        if (a === "up" || a === "down") { S.menu.act = (S.menu.act + (a === "up" ? -1 : 1) + acts.length) % acts.length; rumble(20, .1); return render(); }
        if (a === "a") { const ac = acts[S.menu.act]; if (!ac) return;
          return ac.hold ? holdFor("a", `[data-cl-act="${S.menu.act}"]`, ac.label.toLowerCase(), () => runAction(t, ac)) : runAction(t, ac); }
        return;
      }
      if (a === "left" || a === "right") { const z = Math.max(0, Math.min(2, S.zone + (a === "left" ? -1 : 1))); if (z !== S.zone) { S.zone = z; rumble(20, .1); render(); } return; }
      if (a === "up" || a === "down") {   // W / S only move inside the Spectators list
        if (S.zone !== 1) return;
        const i = Math.max(0, Math.min(SPEC_MAX - 1, S.spec + (a === "up" ? -1 : 1))); if (i !== S.spec) { S.spec = i; rumble(20, .1); render(); } return;
      }
      if (a === "a") { const acts = playerActions(target()); if (!acts.length) { rumble(80, .2); return toast("No actions here"); } S.menu = { act: 0 }; rumble(50, .25); return render(); }
      if (a === "back") return openModal(msg("Leave lobby?", R.guest ? "You will leave this lobby and go back to the lobby list." : "You are the host. Leaving closes this lobby for everyone in it.",
        "Leave", "Stay", leaveRoom, () => closeModal()));   // a confirm modal, one press (no hold)
      if (R.side === "spec" && (a === "x" || a === "y")) { rumble(30, .1); return toast("Switch to a corner to fight"); }
      if (a === "x") {   // one press
        R.ready.me = !R.ready.me; rumble(60, .3); render();
        // in someone else's lobby the host starts the match once both are ready (simulated)
        if (R.host !== "me" && R.ready.me && R.ready.opp) { toast(`${OPP.name} is starting the match`); setTimeout(() => { if (S.view === "waiting" && R.ready.me) startCountdown(); }, 1500); }
        return;
      }
      if (a === "view") return window.MTX_FRIENDS?.open?.();   // F / Select: Friends over the lobby; Invite is in its player menu
      if (a === "y") { if (!presets().some(p => p.set)) return toast("No style preset yet · create one in Character Customization"); return openModal(presetModal()); }
      if (R.host !== "me") return;
      if (a === "rt") return openModal(lobbyForm("edit"));
      return;
    }
    // menu
    if (a === "back") return close();
    if (a === "up" || a === "down") { S.sel = (S.sel + (a === "up" ? -1 : 1) + LOBBIES.length) % LOBBIES.length; S.follow = true; rumble(20, .1); return render(); }
    const l = LOBBIES[S.sel];
    if (a === "lt") { LOBBIES.forEach(x => { x.ping = Math.max(18, x.ping + Math.round(Math.random() * 20 - 10)); }); toast("Lobby list refreshed"); return render(); }
    if (a === "a") return tryJoin(l);
    if (a === "y") return openModal(lobbyForm("create"));
    if (a === "rt") return openModal(entry("find"));
  }
  //#endregion

  //#region [Render / open]
  // lobby list: native scroll (wheel / drag), the selected row stays in view, the thumb follows
  function syncList() {
    const box = root.querySelector(".cl-rows"), em = root.querySelector(".cl-scroll em"); if (!box || !em) return;
    S.scroll = box.scrollTop;
    const track = em.parentElement.clientHeight, h = track * box.clientHeight / box.scrollHeight;
    em.style.height = h + "px"; em.style.top = (track - h) * box.scrollTop / Math.max(1, box.scrollHeight - box.clientHeight) + "px";
  }
  function placeList() {
    const box = root.querySelector(".cl-rows"); if (!box) return;
    box.scrollTop = S.scroll;
    if (S.follow) { const r = box.children[S.sel]; if (r.offsetTop - 3 < box.scrollTop) box.scrollTop = r.offsetTop - 3; else if (r.offsetTop + r.offsetHeight + 3 > box.scrollTop + box.clientHeight) box.scrollTop = r.offsetTop + r.offsetHeight + 3 - box.clientHeight; S.follow = false; }
    box.addEventListener("scroll", syncList); syncList();
  }
  // The markup is rebuilt on every render, so transitions are decided here by comparing with the previous render.
  let tr = { view: null, modal: false, menu: false, focus: "", ready: "" };
  function render() {
    if (!root || !open) return;
    const viewKey = S.view + (S.view === "standby" && S.sb.detail ? ":detail" : "");
    const focusKey = [S.zone, S.spec, S.act, S.menu?.act].join();
    const readyKey = S.view === "standby" ? `s${S.sb.me}${S.sb.opp}` : S.room ? `w${S.room.ready.me}${S.room.ready.opp}` : "";
    const viewChanged = tr.view !== viewKey, oldClass = root.className, oldHtml = viewChanged && tr.view ? root.innerHTML : "";
    const oldModal = !viewChanged && tr.modal && !S.modal ? root.querySelector(".cl-md")?.outerHTML : "";
    if (hold?.active) hold.cancel(false);
    const body = S.view === "menu" ? menuHtml() : S.view === "waiting" ? waitingHtml() : S.view === "timer" ? (S.room.quick ? timerHtml() : waitingHtml() + timerHtml()) : S.view === "standby" ? (S.sb.detail ? detailHtml() : standbyHtml()) : resultHtml();
    const anim = [viewChanged ? " cl--enter" : "", !viewChanged && S.modal && !tr.modal ? " cl--md-in" : "", !viewChanged && S.menu && !tr.menu ? " cl--pm-in" : "",
      !viewChanged && (tr.focus !== focusKey || (S.modal && tr.modal)) ? " cl--focus" : "", !viewChanged && tr.ready !== readyKey ? " cl--ready-in" : ""].join("");
    root.className = `cl cl--${S.view}${S.view === "standby" && S.sb.detail ? " cl--detail" : ""}${anim}`;
    root.innerHTML = `<div class="cl__bg" aria-hidden="true"></div><div class="cl__safe">${body}${modalHtml()}${vkHtml(S.modal)}</div>`;
    if (S.view === "standby" || S.view === "waiting" || (S.view === "timer" && !S.room.quick)) sbMount3d(); else { sb3d?.querySelector(".cl-sb3d__vid")?.pause(); sb3d?.remove(); window.MTX_CHARACTER3D?.detach?.(); }
    if (S.view === "standby") { sbFit(); if (S.sb.fx) sbTween(); }
    if (oldHtml) sbGhost(oldClass, oldHtml);
    if (oldModal) sbGhost("cl-ghost--md", oldModal);
    tr = { view: viewKey, modal: !!S.modal, menu: !!S.menu, focus: focusKey, ready: readyKey };
    if (S.view === "menu") placeList();
    const nm = root.querySelector(".cl-info__name");   // long lobby name: shrink the font to fit the one line
    if (nm && nm.scrollWidth > nm.clientWidth) nm.style.fontSize = Math.max(24, Math.floor(30 * nm.clientWidth / nm.scrollWidth)) + "px";   // 24-30px, then ...
  }
  // the previous view stays on top for a moment and fades out over the new one
  function sbGhost(cls, html) {
    const g = document.createElement("div");
    g.className = `${cls.replace(/ cl--(enter|md-in|pm-in|focus|ready-in)/g, "")} cl-ghost`;
    g.innerHTML = html;
    g.querySelector(".cl-sb3d")?.remove();
    g.setAttribute("aria-hidden", "true");
    root.appendChild(g);
    setTimeout(() => g.remove(), 320);
  }
  function mount() {
    if (root) return;
    root = document.createElement("div"); root.id = "customLobby"; root.className = "cl"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Custom Lobby");
    document.getElementById("stage").appendChild(root);
    // Standby: Ready is a hold, so it follows the mouse button
    root.addEventListener("pointerdown", e => { if (e.button === 0 && S.view === "standby" && !S.sb?.detail && e.target.closest("[data-cl-ring]")) input("x"); });
    addEventListener("pointerup", () => { if (S.view === "standby") release("x"); });
    root.addEventListener("click", e => {
      if (S.modal?.vk) {   // mouse: click a key; everything behind the keyboard is covered
        const k = e.target.closest("[data-vk-r]");
        if (e.target.closest("[data-cl-pin]")) { S.pinShown = !S.pinShown; return render(); }
        if (k) { const vk = S.modal.vk; vk.row = +k.dataset.vkR; vk.col = +k.dataset.vkC; vkPress(S.modal, vkRows(vk)[vk.row][vk.col]); render(); }
        return;
      }
      const r = e.target.closest("[data-cl-row]"); if (r && !S.modal) { S.sel = +r.dataset.clRow; render(); return input("a"); }
      const rd = e.target.closest("[data-cl-round]"); if (rd && S.view === "result") { S.round = +rd.dataset.clRound; return render(); }
      const p = e.target.closest("[data-cl-pin]"); if (p) { S.pinShown = !S.pinShown; return render(); }
      const mr = e.target.closest("[data-cl-mrow]"); if (mr && S.modal) { const i = +mr.dataset.clMrow, row = S.modal.rows?.()[i]; S.modal.focus = i; if (row?.field) vkOpen(S.modal, row); else if (!e.target.closest(".st-arrow--l")) { render(); return input("right"); } else { render(); return input("left"); } return render(); }
      const ac = e.target.closest("[data-cl-act]"); if (ac && S.menu) { S.menu.act = +ac.dataset.clAct; render(); return input("a"); }
      const pp = e.target.closest("[data-cl-pp]"); if (pp && S.modal?.type === "preset") { S.modal.focus = +pp.dataset.clPp; render(); return input("a"); }
      if (S.view === "waiting" && !S.modal) {
        const sp = e.target.closest("[data-cl-spec]"), zn = e.target.closest("[data-cl-zone]");
        if (e.target.closest("[data-cl-ring]")) return input("x");   // one click readies / unreadies
        if (sp) { S.zone = 1; S.spec = +sp.dataset.clSpec; S.menu = null; render(); return input("a"); }
        if (zn) { S.zone = +zn.dataset.clZone; S.menu = null; render(); return input("a"); }
      }
    });
    addEventListener("keydown", digitKey, true);
    addEventListener("keydown", vkKey, true);
  }
  function show() {
    window.MTX_OPTIONS?.close?.(); window.MTX_FRIENDS?.close?.(); window.MTX_SETTINGS?.close?.();
    mount(); open = true; root.hidden = false; document.getElementById("stage")?.classList.add("ovl-open");
    if (!S.room) { S.view = "menu"; S.act = 0; }
    render(); rumble(60, .25);
  }
  function close() {
    if (!root) return; open = false; root.hidden = true; clearInterval(S.tick); window.MTX_CHARACTER3D?.detach?.();
    if (!window.MTX_OPTIONS?.isOpen?.() && !window.MTX_FRIENDS?.isOpen?.() && !window.MTX_SETTINGS?.isOpen?.()) document.getElementById("stage")?.classList.remove("ovl-open");
  }
  window.MTX_CLOBBY = { open: show, close, startMatch, isOpen: () => open, input, release, render, noLauncher: () => S.view === "result" || S.view === "standby" || S.view === "timer" || !!S.modal?.vk || (S.view === "waiting" && !S.menu && S.room?.host === "me" && S.room.opp && S.room.ready.me && S.room.ready.opp) };
  window.MTX_SCREENS = window.MTX_SCREENS || {};
  window.MTX_SCREENS.customLobby = { actions: { openCustomLobby: () => show() } };
  //#endregion
})();
