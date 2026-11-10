/* Component: Navigation graph editor (dev tool).
   One window per page: every focusable element ([data-nav]) is a node block with a thumbnail of how it looks on
   the page and 4 ports (up / right / down / left). The edges are where each direction goes:
     dashed grey   default (by position, what the stick does with no wire)
     white         pinned in the markup (data-nav-up="id"), read only
     yellow        custom wire (drawn here or on the screen)
     red stub      blocked: that direction does nothing
   Edit:  drag a port onto another node = custom wire · drag a port onto empty canvas = remove that line
          click any line = select it, then Delete / the "Delete line" button removes it
            (a yellow / red line goes back to the default, a default or pinned line becomes blocked)
          right-click a line or a port = remove it at once · Delete with a node selected = reset the node
   Nothing changes the game until Save: then the custom wires replace this page's wires and navigation follows them.
   Test:  arrows / WASD / d-pad / stick walk the selection along the edges (unsaved edits included).

     MTX_UI.navGraph.open(screenKey?)   MTX_UI.navGraph.close()   MTX_UI.navGraph.isOpen()
     MTX_UI.navGraph.input(action)      gamepad actions while open ("up" ... "a", "back"); true when handled

   Needs from app.js (window.MTX.api): navs(), navDefault(el, dir), getWires(), setWires(obj), show, getCur.
   Export / Import: a .json with every custom wire (all pages) plus the resolved routes of each page opened in the
   graph this session; Import takes that file (or a plain { "screen:id:dir": "targetId" | "-" } map) and replaces the
   custom wires (saved at once).
   Thumbnails: tools/bake-server.mjs (/__shot) renders the page 1:1 and every node is cut from that frame;
   without the server the nodes show their text instead. */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const DIRS = ["up", "right", "down", "left"];
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const NW = 184, NH = 148, TH = 104;          // node block size, thumbnail height
  const POS_KEY = "mtx.nav_graph_pos";
  const api = () => window.MTX?.api;
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  let root = null, world = null, svg = null, sideNodes = null, sidePages = null, titleEl = null, saveBtn = null, closeBtn = null;
  let open = false, page = null, nodes = [], byId = new Map(), draft = {}, dirty = false, sel = null, selEdge = null;
  let delBtn = null;
  let view = { x: 40, y: 40, k: 0.5 }, showDefaults = true;
  const thumbs = {};                           // screen -> { id: dataURL }
  let positions = {};
  try { positions = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch (e) { positions = {}; }
  const savePositions = () => { try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch (e) { /* private mode */ } };

  // ---------------------------------------------------------------- window
  function build() {
    root = document.createElement("div");
    root.id = "navGraph";
    root.hidden = true;
    root.innerHTML = `
      <header class="ng-head">
        <b class="ng-head__title">Navigation graph</b><span class="ng-head__page" data-ng="title"></span>
        <div class="ng-head__tools">
          <label class="ng-check"><input type="checkbox" data-ng="defaults" checked> Default links</label>
          <button type="button" data-ng="layout">Auto layout</button>
          <button type="button" data-ng="fit">Fit (F)</button>
          <button type="button" data-ng="thumbs">Refresh thumbnails</button>
          <button type="button" data-ng="del" disabled>Delete line (Del)</button>
          <button type="button" data-ng="revert">Revert</button>
          <button type="button" data-ng="export">Export .json</button>
          <button type="button" data-ng="import">Import .json</button>
          <input type="file" accept=".json,application/json" data-ng="file" hidden>
          <button type="button" class="is-primary" data-ng="save">Save (Ctrl+S)</button>
          <button type="button" data-ng="close">Close (Esc)</button>
        </div>
      </header>
      <aside class="ng-side">
        <h4>Pages</h4><div class="ng-pages" data-ng="pages"></div>
        <h4>Nodes</h4><div class="ng-list" data-ng="nodes"></div>
      </aside>
      <main class="ng-canvas" data-ng="canvas">
        <div class="ng-world" data-ng="world"><svg class="ng-edges" data-ng="svg" width="1" height="1"></svg></div>
        <footer class="ng-legend">
          <span><i class="ng-key ng-key--def"></i>Default</span><span><i class="ng-key ng-key--pin"></i>Pinned in markup</span>
          <span><i class="ng-key ng-key--wire"></i>Custom</span><span><i class="ng-key ng-key--block"></i>Blocked</span>
          <em>Drag a port onto a node to wire · drag a port to empty space, or click a line + Delete, to remove it · right-click a line = remove · arrows test the route</em>
        </footer>
      </main>`;
    document.body.appendChild(root);
    const q = k => root.querySelector(`[data-ng="${k}"]`);
    world = q("world"); svg = q("svg"); sideNodes = q("nodes"); sidePages = q("pages"); titleEl = q("title");
    saveBtn = q("save"); closeBtn = q("close"); delBtn = q("del");
    delBtn.addEventListener("click", () => { if (selEdge) removeEdge(selEdge); });
    q("defaults").addEventListener("change", e => { showDefaults = e.target.checked; drawEdges(); });
    q("layout").addEventListener("click", () => { delete positions[page]; savePositions(); layout(true); drawAll(); fit(); });
    q("fit").addEventListener("click", fit);
    q("thumbs").addEventListener("click", () => { delete thumbs[page]; loadThumbs(true); });
    q("revert").addEventListener("click", () => { loadDraft(); drawAll(); api()?.toast("Navigation graph · edits reverted"); });
    q("export").addEventListener("click", exportJson);
    const file = q("file");
    q("import").addEventListener("click", () => { file.value = ""; file.click(); });
    file.addEventListener("change", () => { if (file.files[0]) importJson(file.files[0]); });
    saveBtn.addEventListener("click", save);
    closeBtn.addEventListener("click", () => close());
    bindCanvas(q("canvas"));
  }

  function openGraph(key) {
    if (!root) build();
    open = true;
    root.hidden = false;
    document.body.classList.add("nav-graph-open");
    setPage(key || api()?.getCur?.());
  }

  function close(force = false) {
    if (!open) return;
    if (dirty && !force && !closeBtn.classList.contains("is-confirm")) {
      closeBtn.classList.add("is-confirm");
      closeBtn.textContent = "Discard & close";
      setTimeout(() => { closeBtn.classList.remove("is-confirm"); closeBtn.textContent = "Close (Esc)"; }, 2500);
      return;
    }
    closeBtn.classList.remove("is-confirm");
    closeBtn.textContent = "Close (Esc)";
    open = false;
    root.hidden = true;
    document.body.classList.remove("nav-graph-open");
  }

  // ---------------------------------------------------------------- pages
  // pages in the order the player meets them, grouped by section ("#..." = overlay without a focus graph)
  const FLOW = [
    ["Start", [["#MTX_SHADER", "Shader Preload (first launch)"], ["#intro", "Intro · press any button"], ["#login", "Login · Sign up"], ["charselect", "Character Select"]]],
    ["Main menu", [["main", "Main menu"], ["#MTX_CLOBBY", "Custom Lobby"], ["#MTX_TOUR", "Tournament"], ["#MTX_CAMPAIGN", "Campaign (News)"]]],
    ["Ultimate Fight", [["career", "Ultimate Fight hub"], ["management", "Management"], ["#simulateDay", "Simulate Day cards"], ["collection", "Collection"], ["media", "Media"]]],
    ["Fighter", [["mastery", "Style Hub"], ["tactical", "Tactical Style"], ["attributes", "Attributes"], ["skilltree", "Mastery"], ["rewards", "Rewards"], ["quests", "Quests"]]],
    ["Records", [["leaderboard", "Leaderboard"], ["history", "Match History"], ["matchdetail", "Match Detail"], ["#MTX_MATCH_RESULT", "Match Result"]]],
    ["Store", [["store", "Store"], ["pack", "Pack Collection"]]],
    ["Global overlays", [["#MTX_OPTIONS", "Options (Menu)"], ["#MTX_SETTINGS", "Settings"], ["#MTX_FRIENDS", "Friends (View)"], ["#customize", "Profile"]]],
  ];
  // screen-level links, built from the code (2026-11-06). in = how the page is reached, out = where it goes.
  // Every screen also has: Menu = Options, View = Friends, B = back (history stack) unless listed.
  const LINKS = {
    "#MTX_SHADER": { in: ["Game launch (first time only, store key mtx.shadersCompiled)"], out: ["bar full → Intro"] },
    "#intro": { in: ["Shader Preload (first launch)", "Game launch"], out: ["any button → Login (or Character Select if logged in)"] },
    "#login": { in: ["Intro", "Options › Main menu (log out)", "Character Select › Back › Leave"], out: ["Login / Sign up → Character Select", "Back → Intro"] },
    charselect: { in: ["Login", "Main › Back › Change"], out: ["A Confirm → Main (new root)", "Back → dialog 'Leave Character Select?' → Login"] },
    main: { in: ["Character Select (root)"], out: ["Ultimate Fight → career", "Upgrade / Shop → store", "Event → Campaign", "Quick Fight → Match Find", "Custom Lobby → MTX_CLOBBY", "Tournament → MTX_TOUR", "Back → dialog 'Change Character?' → Character Select"] },
    "#MTX_CLOBBY": { in: ["Main › Custom Lobby"], out: ["Create (visual keyboard) / Join → waiting room → Start → Statistics → Continue", "Invite → Friends", "B → Main"] },
    "#MTX_TOUR": { in: ["Main › Tournament"], out: ["Settings → Open Tournament", "Lobby Start → Live bracket → Next round → Winner + payout", "Replay history list", "B / Cancel → Main"] },
    "#MTX_MATCH_RESULT": { in: ["Match Find fight › Statistics › Continue (career Rank / Casual, Main Quick Fight)"], out: ["Rank: Rank page (TOTAL RP counts up, then down with the gain fill) → A → Level", "Casual / Quick Fight: starts at Level", "Level: E, S, R one at a time → A → Quests (one at a time, complete = yellow) → A → load screen → back"] },
    "#MTX_CAMPAIGN": { in: ["Main / career › Event card"], out: ["Card CTA (Shop) → store", "B → close"] },
    career: { in: ["Main › Ultimate Fight"], out: ["Next Fight → Match Find in the background (badge on every page; A on the card cancels; leaving Ultimate Fight → dialog 'Cancel Match Find?'; found → waits for holds / dialogs, back to career) → Statistics → Match Result (Rank: RP + Level · Casual: Level) → result (adds to Match History)", "Hold Simulate Day → Simulate Day cards", "Tactical → Style Hub", "Manage → management", "Leaderboard → leaderboard", "Upgrade → store", "Event → Campaign"] },
    management: { in: ["career › Manage"], out: ["Social (A) → media", "Collection link / Y → collection"] },
    "#simulateDay": { in: ["career › hold Simulate Day"], out: ["CTA → effect, next day", "Back → dialog Decline (Decline closes, Cancel stays)", "hold X on Decline → decline"] },
    collection: { in: ["management › Collection / Y"] },
    media: { in: ["management › Social"] },
    mastery: { in: ["career › Tactical"], out: ["Attributes", "Mastery → skilltree", "Rewards", "Quests"] },
    tactical: { in: ["Profile › Style preset"], out: ["Select → confirm style"] },
    attributes: { in: ["Style Hub"] }, skilltree: { in: ["Style Hub › Mastery"] }, rewards: { in: ["Style Hub"] }, quests: { in: ["Style Hub"] },
    leaderboard: { in: ["career › Leaderboard"] },
    history: { in: ["Profile › History (Y)"], out: ["A → Match Detail", "B → Profile"] },
    matchdetail: { in: ["Match History"] },
    store: { in: ["Main / career › Upgrade", "Campaign › Shop"], out: ["Pack → pack", "Buy → buy modal"] },
    pack: { in: ["store"] },
    "#MTX_OPTIONS": { in: ["Menu on any screen", "Friends › Menu"], out: ["Profile", "Settings", "Main menu → log out → Login", "Exit game", "View → Friends"] },
    "#MTX_SETTINGS": { in: ["Options › Settings"], out: ["Start → Save", "Blocked Players → Friends (tab 4)", "B → Options"] },
    "#MTX_FRIENDS": { in: ["View on any screen", "Options › View", "Custom Lobby › Invite", "Settings › Blocked Players"], out: ["Menu → Options"] },
    "#customize": { in: ["Options › Profile"], out: ["History (Y) → history", "Style preset → tactical"] },
  };
  const linksHtml = key => {
    const l = LINKS[key]; if (!l) return "";
    const li = (h, arr) => arr?.length ? `<h4>${h}</h4><ul class="ng-links">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    return li("In", l.in) + li("Out", l.out);
  };
  function pageList() {
    const seen = new Set();
    const have = [...document.querySelectorAll(".screen[data-screen]")].filter(s => !seen.has(s) && seen.add(s)).map(s => s.dataset.screen);
    const out = [], placed = new Set();
    FLOW.forEach(([group, pages]) => pages.forEach(([key, name], i) => {
      const overlay = key.startsWith("#");
      if (!overlay && !have.includes(key)) return;
      out.push({ key, name, group: i === 0 ? group : null, overlay }); placed.add(key);
    }));
    have.filter(k => !placed.has(k)).forEach((key, i) => out.push({ key, name: key, group: i === 0 ? "Other" : null }));   // new screens land at the end
    return out;
  }

  function setPage(key) {
    if (dirty && page && page !== key) { api()?.toast("Save or revert this page first"); return; }
    const a = api();
    if (key && key !== a.getCur()) a.show(key);
    page = a.getCur();
    sel = null;
    let n = 0;
    sidePages.innerHTML = pageList().map(p => (p.group ? `<h4 class="ng-group">${esc(p.group)}</h4>` : "") + (p.overlay
      ? `<button type="button" class="is-overlay" disabled title="${esc(["Overlay: no focus graph", ...(LINKS[p.key]?.in || []).map(x => "in: " + x), ...(LINKS[p.key]?.out || []).map(x => "out: " + x)].join(" · "))}">${esc(p.name)}<small>overlay</small></button>`
      : `<button type="button" class="${p.key === page ? "is-on" : ""}" data-page="${esc(p.key)}"><b>${String(++n).padStart(2, "0")}</b> ${esc(p.name)}<small>${esc(p.key)}</small></button>`)).join("");
    sidePages.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => setPage(b.dataset.page)));
    sidePages.insertAdjacentHTML("beforeend", linksHtml(page));
    // the screen builds its rows in enter(): read the nodes a frame later
    requestAnimationFrame(() => requestAnimationFrame(() => {
      collect();
      loadDraft();
      layout(false);
      drawAll();
      fit();
      resolved[page] = resolve();
      loadThumbs(false);
    }));
  }

  // ---------------------------------------------------------------- nodes
  function frameRect(el) {
    const stage = document.getElementById("stage") || document.body;
    const sr = stage.getBoundingClientRect(), k = sr.height / 1080 || 1, r = el.getBoundingClientRect();
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  }

  function groupOf(el, scr) {
    for (let p = el.parentElement; p && p !== scr; p = p.parentElement) {
      if (p.querySelectorAll("[data-nav]").length > 1) {
        const name = p.id || (p.dataset.figma || "").replace(/^[\d:]+\s*/, "") || [...p.classList].find(c => !/^is-/.test(c)) || p.tagName.toLowerCase();
        return { key: p, name };
      }
    }
    return { key: scr, name: "Page" };
  }

  function collect() {
    const scr = document.querySelector(`.screen[data-screen="${page}"]`);
    const els = api().navs();
    nodes = els.filter(el => el.dataset.id).map(el => {
      const g = groupOf(el, scr);
      const text = (el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
      return { id: el.dataset.id, el, rect: frameRect(el), group: g.name, gkey: g.key, text, x: 0, y: 0 };
    });
    byId = new Map(nodes.map(n => [n.id, n]));
  }

  // start from where the element sits on the 1920x1080 page, then push overlapping blocks apart
  function layout(fresh) {
    const saved = !fresh && positions[page] || {};
    const S = 1.15;
    nodes.forEach(n => {
      const p = saved[n.id];
      if (p) { n.x = p[0]; n.y = p[1]; n.fixed = true; return; }
      n.fixed = false;
      n.x = (n.rect.x + n.rect.w / 2) * S - NW / 2;
      n.y = (n.rect.y + n.rect.h / 2) * S - NH / 2;
    });
    const GAP = 28;
    for (let it = 0; it < 120; it++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const ox = Math.min(a.x + NW + GAP, b.x + NW + GAP) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + NH + GAP, b.y + NH + GAP) - Math.max(a.y, b.y);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5, wb = 1 - wa;
        if (a.fixed && b.fixed) continue;
        if (ox < oy) { const s = a.x + NW / 2 <= b.x + NW / 2 ? 1 : -1; a.x -= s * ox * wa; b.x += s * ox * wb; }
        else { const s = a.y + NH / 2 <= b.y + NH / 2 ? 1 : -1; a.y -= s * oy * wa; b.y += s * oy * wb; }
      }
      if (!moved) break;
    }
    nodes.forEach(n => { n.x = Math.round(n.x); n.y = Math.round(n.y); });
  }

  function drawAll() {
    world.querySelectorAll(".ng-node").forEach(e => e.remove());
    const th = thumbs[page] || {};
    nodes.forEach(n => {
      const d = document.createElement("div");
      d.className = "ng-node";
      d.dataset.id = n.id;
      d.style.left = n.x + "px";
      d.style.top = n.y + "px";
      d.innerHTML = `<div class="ng-node__thumb">${th[n.id] ? `<img src="${th[n.id]}" alt="">` : `<span>${esc(n.text || n.id)}</span>`}</div>
        <div class="ng-node__label"><b>${esc(n.id)}</b><small>${esc(n.group)}</small></div>
        ${DIRS.map(dir => `<span class="ng-port ng-port--${dir}" data-dir="${dir}" title="${dir}: drag onto a node · right-click to block"></span>`).join("")}`;
      world.appendChild(d);
      n.dom = d;
    });
    drawList();
    drawEdges();
    markSel();
    updateDirty();
  }

  function drawList() {
    const groups = new Map();
    nodes.forEach(n => { if (!groups.has(n.gkey)) groups.set(n.gkey, { name: n.group, items: [] }); groups.get(n.gkey).items.push(n); });
    sideNodes.innerHTML = [...groups.values()].map(g => `<details open><summary>${esc(g.name)} <small>${g.items.length}</small></summary>
      ${g.items.map(n => `<button type="button" data-node="${esc(n.id)}">${esc(n.id)}${wiredCount(n.id) ? `<i>${wiredCount(n.id)}</i>` : ""}</button>`).join("")}</details>`).join("");
    sideNodes.querySelectorAll("[data-node]").forEach(b => b.addEventListener("click", () => { select(b.dataset.node); centerOn(byId.get(b.dataset.node)); }));
    titleEl.textContent = `${page} · ${nodes.length} nodes`;
  }

  const wiredCount = id => DIRS.filter(d => draft[`${page}:${id}:${d}`]).length;

  // ---------------------------------------------------------------- edges
  function loadDraft() {
    draft = {};
    const all = api().getWires();
    Object.keys(all).forEach(k => { if (k.startsWith(page + ":")) draft[k] = all[k]; });
    dirty = false;
    updateDirty();
  }

  // where `dir` from node n goes with the draft: { kind: wire | block | pin | def, to }
  function route(n, dir) {
    const w = draft[`${page}:${n.id}:${dir}`];
    if (w === "-") return { kind: "block" };
    if (w && byId.has(w)) return { kind: "wire", to: byId.get(w) };
    const pin = n.el.getAttribute("data-nav-" + dir);
    if (pin && byId.has(pin)) return { kind: "pin", to: byId.get(pin) };
    const t = api().navDefault(n.el, dir);
    const to = t && byId.get(t.dataset.id);
    return to ? { kind: "def", to } : { kind: "none" };
  }

  function port(n, dir) {
    return { up: [n.x + NW / 2, n.y], down: [n.x + NW / 2, n.y + NH], left: [n.x, n.y + NH / 2], right: [n.x + NW, n.y + NH / 2] }[dir];
  }

  function curve(a, dir, b, dirIn) {
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const L = Math.max(50, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.35);
    const c1 = [a[0] + v[dir][0] * L, a[1] + v[dir][1] * L];
    const c2 = dirIn ? [b[0] + v[dirIn][0] * L, b[1] + v[dirIn][1] * L] : b;
    return `M${a[0]},${a[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${b[0]},${b[1]}`;
  }

  function drawEdges() {
    let maxX = 0, maxY = 0;
    nodes.forEach(n => { maxX = Math.max(maxX, n.x + NW + 200); maxY = Math.max(maxY, n.y + NH + 200); });
    svg.setAttribute("width", maxX);
    svg.setAttribute("height", maxY);
    const parts = [`<defs>${["def", "pin", "wire"].map(k => `<marker id="ng-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ng-arrow--${k}"/></marker>`).join("")}</defs>`];
    const layers = { def: [], pin: [], wire: [], block: [] };
    const edge = (layer, key, kind, d, marker, title, on, extra = "") => layer.push(
      `<g class="ng-e${selEdge === key ? " is-picked" : ""}" data-key="${esc(key)}" data-kind="${kind}">` +
      `<path class="ng-hit" d="${d}"/>` +
      `<path class="ng-edge ng-edge--${kind}${on}" d="${d}"${marker ? ` marker-end="url(#ng-arrow-${marker})"` : ""}/>${extra}` +
      `<title>${esc(title)}</title></g>`);
    nodes.forEach(n => DIRS.forEach(dir => {
      const r = route(n, dir);
      const a = port(n, dir);
      const key = `${page}:${n.id}:${dir}`;
      const on = sel && (sel === n.id || (r.to && r.to.id === sel)) ? " is-hot" : sel ? " is-dim" : "";
      if (r.kind === "block") {
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir], e = [a[0] + v[0] * 26, a[1] + v[1] * 26];
        edge(layers.block, key, "block", `M${a[0]},${a[1]} L${e[0]},${e[1]}`, null, `${n.id} ${dir}: blocked · Delete = back to default`, on,
          `<path class="ng-edge--x${on}" d="M${e[0] - 6},${e[1] - 6} l12,12 m0,-12 l-12,12"/>`);
        return;
      }
      if (!r.to || r.to === n) return;
      if (r.kind === "def" && !showDefaults && !on.includes("hot") && selEdge !== key) return;
      const b = port(r.to, OPP[dir]);
      edge(layers[r.kind], key, r.kind, curve(a, dir, b, OPP[dir]), r.kind,
        `${n.id} ${dir} → ${r.to.id}` + (r.kind === "wire" ? " (custom · Delete = back to default)" : ` (${r.kind === "pin" ? "pinned in markup" : "default"} · Delete = block)`), on);
    }));
    svg.innerHTML = parts.concat(layers.def, layers.pin, layers.wire, layers.block).join("");
    svg.querySelectorAll(".ng-e").forEach(g => {
      g.addEventListener("click", e => { e.stopPropagation(); pickEdge(g.dataset.key); });
      g.addEventListener("contextmenu", e => { e.preventDefault(); e.stopPropagation(); removeEdge(g.dataset.key); });
    });
    if (delBtn) delBtn.disabled = !selEdge;
  }

  function pickEdge(key) {
    selEdge = selEdge === key ? null : key;
    drawEdges();
  }

  // remove a line: a custom wire / block goes back to the default; a default or pinned line becomes blocked
  function removeEdge(key) {
    if (key in draft) delete draft[key];
    else draft[key] = "-";
    selEdge = null;
    changed();
  }

  function changed() {
    dirty = true;
    drawEdges();
    drawList();
    markSel();
    updateDirty();
  }

  function updateDirty() {
    if (!saveBtn) return;
    saveBtn.disabled = !dirty;
    saveBtn.textContent = dirty ? "Save (Ctrl+S) ●" : "Saved";
  }

  // ---------------------------------------------------------------- export / import (.json)
  const resolved = {};   // page -> routes, filled for every page opened in the graph

  function resolve() {
    return nodes.map(n => ({
      id: n.id,
      group: n.group,
      rect: { x: Math.round(n.rect.x), y: Math.round(n.rect.y), w: Math.round(n.rect.w), h: Math.round(n.rect.h) },
      routes: Object.fromEntries(DIRS.map(d => {
        const r = route(n, d);
        return [d, r.kind === "block" ? { to: null, kind: "blocked" } : r.to ? { to: r.to.id, kind: { def: "default", pin: "pinned", wire: "custom" }[r.kind] } : { to: null, kind: "none" }];
      }))
    }));
  }

  function exportJson() {
    const wires = api().getWires();
    Object.keys(wires).forEach(k => { if (k.startsWith(page + ":")) delete wires[k]; });
    Object.assign(wires, draft);            // what the graph shows, unsaved edits included
    resolved[page] = resolve();
    const data = {
      format: "mtx-navigation",
      version: 1,
      exported: new Date().toISOString(),
      unsaved: dirty ? page : null,
      wires,                                 // "screen:nodeId:dir" -> target node id, "-" = blocked
      pages: Object.fromEntries(Object.entries(resolved).map(([k, v]) => [k, { nodes: v }]))
    };
    const t = new Date(), p2 = n => String(n).padStart(2, "0");
    const name = `mtx-navigation-${t.getFullYear()}${p2(t.getMonth() + 1)}${p2(t.getDate())}-${p2(t.getHours())}${p2(t.getMinutes())}.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    api().toast(`Exported ${name} · ${Object.keys(wires).length} custom routes · ${Object.keys(data.pages).length} page(s) resolved`);
  }

  async function importJson(f) {
    let data;
    try { data = JSON.parse(await f.text()); } catch (e) { api().toast("Import failed · not a JSON file"); return; }
    const src = data && typeof data.wires === "object" ? data.wires : data;
    const screensOk = new Set(pageList().map(p => p.key));
    const wires = {};
    let skipped = 0;
    Object.entries(src || {}).forEach(([k, v]) => {
      const parts = k.split(":");
      if (parts.length === 3 && screensOk.has(parts[0]) && DIRS.includes(parts[2]) && typeof v === "string" && v) wires[k] = v;
      else skipped++;
    });
    if (!Object.keys(wires).length && skipped) { api().toast("Import failed · no navigation routes in that file"); return; }
    api().setWires(wires);
    loadDraft();
    drawAll();
    api().toast(`Imported ${f.name} · ${Object.keys(wires).length} custom routes${skipped ? ` · ${skipped} skipped` : ""}`);
  }

  function save() {
    if (!dirty) return;
    const all = api().getWires();
    Object.keys(all).forEach(k => { if (k.startsWith(page + ":")) delete all[k]; });
    Object.assign(all, draft);
    api().setWires(all);
    dirty = false;
    updateDirty();
    api().toast(`Navigation saved · ${page} · ${Object.keys(draft).length} custom route${Object.keys(draft).length === 1 ? "" : "s"}`);
  }

  // ---------------------------------------------------------------- selection + test walk
  function select(id) {
    sel = id;
    markSel();
    drawEdges();
  }

  function markSel() {
    world.querySelectorAll(".ng-node").forEach(d => d.classList.toggle("is-sel", d.dataset.id === sel));
    sideNodes.querySelectorAll("[data-node]").forEach(b => b.classList.toggle("is-on", b.dataset.node === sel));
  }

  function walk(dir) {
    if (!nodes.length) return;
    const n = byId.get(sel);
    if (!n) { select(nodes[0].id); centerOn(nodes[0], true); return; }
    const r = route(n, dir);
    if (r.to) { select(r.to.id); centerOn(r.to, true); }
    else api()?.rumble?.(60, .2);
  }

  function resetNode(id) {
    let any = false;
    DIRS.forEach(d => { const k = `${page}:${id}:${d}`; if (k in draft) { delete draft[k]; any = true; } });
    if (any) changed();
  }

  // ---------------------------------------------------------------- view (pan / zoom)
  function applyView() {
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
  }

  function fit() {
    const c = root.querySelector(".ng-canvas").getBoundingClientRect();
    if (!nodes.length || !c.width) { applyView(); return; }
    const x0 = Math.min(...nodes.map(n => n.x)), y0 = Math.min(...nodes.map(n => n.y));
    const x1 = Math.max(...nodes.map(n => n.x + NW)), y1 = Math.max(...nodes.map(n => n.y + NH));
    const pad = 60;
    view.k = Math.max(0.15, Math.min(1.2, Math.min((c.width - pad * 2) / (x1 - x0), (c.height - pad * 2 - 40) / (y1 - y0))));
    view.x = (c.width - (x1 - x0) * view.k) / 2 - x0 * view.k;
    view.y = (c.height - 40 - (y1 - y0) * view.k) / 2 - y0 * view.k;
    applyView();
  }

  function centerOn(n, onlyIfOut) {
    if (!n) return;
    const c = root.querySelector(".ng-canvas").getBoundingClientRect();
    const sx = view.x + (n.x + NW / 2) * view.k, sy = view.y + (n.y + NH / 2) * view.k;
    if (onlyIfOut && sx > 80 && sx < c.width - 80 && sy > 80 && sy < c.height - 120) return;
    view.x = c.width / 2 - (n.x + NW / 2) * view.k;
    view.y = c.height / 2 - (n.y + NH / 2) * view.k;
    applyView();
  }

  function toWorld(cx, cy) {
    const c = root.querySelector(".ng-canvas").getBoundingClientRect();
    return [(cx - c.left - view.x) / view.k, (cy - c.top - view.y) / view.k];
  }

  function bindCanvas(canvas) {
    let drag = null;
    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      const c = canvas.getBoundingClientRect(), mx = e.clientX - c.left, my = e.clientY - c.top;
      const k = Math.max(0.15, Math.min(2, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      view.x = mx - (mx - view.x) * (k / view.k);
      view.y = my - (my - view.y) * (k / view.k);
      view.k = k;
      applyView();
    }, { passive: false });

    canvas.addEventListener("contextmenu", e => {
      const p = e.target.closest(".ng-port");
      if (!p) return;
      e.preventDefault();
      const id = p.closest(".ng-node").dataset.id, k = `${page}:${id}:${p.dataset.dir}`;
      if (draft[k] === "-") delete draft[k]; else draft[k] = "-";
      changed();
    });

    canvas.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      const portEl = e.target.closest(".ng-port"), nodeEl = e.target.closest(".ng-node");
      if (e.target.closest(".ng-e, .ng-legend")) return;
      canvas.setPointerCapture(e.pointerId);
      if (portEl) {
        const n = byId.get(nodeEl.dataset.id), dir = portEl.dataset.dir;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("class", "ng-edge ng-edge--draft");
        svg.appendChild(line);
        drag = { type: "port", n, dir, line };
      } else if (nodeEl) {
        const n = byId.get(nodeEl.dataset.id);
        drag = { type: "node", n, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
      } else {
        drag = { type: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
      }
    });

    canvas.addEventListener("pointermove", e => {
      if (!drag) return;
      if (drag.type === "pan") {
        view.x = drag.ox + e.clientX - drag.sx;
        view.y = drag.oy + e.clientY - drag.sy;
        drag.moved = drag.moved || Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 3;
        applyView();
      } else if (drag.type === "node") {
        const dx = (e.clientX - drag.sx) / view.k, dy = (e.clientY - drag.sy) / view.k;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        drag.moved = true;
        drag.n.x = Math.round(drag.ox + dx);
        drag.n.y = Math.round(drag.oy + dy);
        drag.n.dom.style.left = drag.n.x + "px";
        drag.n.dom.style.top = drag.n.y + "px";
        drawEdges();
      } else if (drag.type === "port") {
        const b = toWorld(e.clientX, e.clientY);
        drag.line.setAttribute("d", curve(port(drag.n, drag.dir), drag.dir, b, null));
        world.querySelectorAll(".ng-node.is-drop").forEach(d => d.classList.remove("is-drop"));
        const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ng-node");
        if (over && over.dataset.id !== drag.n.id) over.classList.add("is-drop");
      }
    });

    const end = e => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.type === "pan" && !d.moved) { selEdge = null; select(null); }
      if (d.type === "node") {
        if (!d.moved) select(d.n.id);
        else {
          (positions[page] = positions[page] || {});
          nodes.forEach(n => { positions[page][n.id] = [n.x, n.y]; });
          savePositions();
        }
      }
      if (d.type === "port") {
        d.line.remove();
        world.querySelectorAll(".ng-node.is-drop").forEach(x => x.classList.remove("is-drop"));
        const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ng-node");
        const k0 = `${page}:${d.n.id}:${d.dir}`;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        if (!over && under?.closest?.(".ng-canvas") && !under.closest(".ng-legend")) {
          draft[k0] = "-";
          select(d.n.id);
          changed();
        } else if (over && over.dataset.id !== d.n.id) {
          const k = `${page}:${d.n.id}:${d.dir}`;
          // wiring to where the default already goes = no custom wire needed
          const r = (() => { const w = draft[k]; delete draft[k]; const x = route(d.n, d.dir); if (w) draft[k] = w; return x; })();
          if (r.to && r.to.id === over.dataset.id && r.kind !== "block") delete draft[k];
          else draft[k] = over.dataset.id;
          select(d.n.id);
          changed();
        }
      }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  // ---------------------------------------------------------------- thumbnails (bake server)
  async function loadThumbs(force) {
    const key = page;
    if (thumbs[key] && !force) return;
    const snap = window.MTX_BAKE_SNAPSHOT;
    if (!snap) return;
    let data = null;
    try {
      const html = snap("flat");
      const r = await fetch("/__shot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html }) });
      const out = r.ok ? await r.json() : null;
      data = out && out.ok ? out.jpeg : null;
    } catch (e) { data = null; }
    if (!data) { if (force) api()?.toast("Thumbnails need the bake server (node tools/bake-server.mjs)"); return; }
    const img = new Image();
    await new Promise(res => { img.onload = img.onerror = res; img.src = "data:image/jpeg;base64," + data; });
    if (!img.width) return;
    const out = {};
    const cv = document.createElement("canvas");
    cv.width = (NW - 8) * 2; cv.height = TH * 2;
    const g = cv.getContext("2d");
    nodes.forEach(n => {
      // the element plus some of what is around it, kept at the thumbnail's aspect
      const m = 16, ar = cv.width / cv.height;
      let w = n.rect.w + m * 2, h = n.rect.h + m * 2;
      if (w / h > ar) h = w / ar; else w = h * ar;
      const x = n.rect.x + n.rect.w / 2 - w / 2, y = n.rect.y + n.rect.h / 2 - h / 2;
      g.fillStyle = "#111";
      g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, x, y, w, h, 0, 0, cv.width, cv.height);
      out[n.id] = cv.toDataURL("image/jpeg", 0.8);
    });
    thumbs[key] = out;
    if (open && page === key) nodes.forEach(n => {
      const t = n.dom?.querySelector(".ng-node__thumb");
      if (t) t.innerHTML = `<img src="${out[n.id]}" alt="">`;
    });
  }

  // ---------------------------------------------------------------- input (keyboard here, gamepad through app.js)
  function input(a) {
    if (!open) return false;
    if (/^(up|down|left|right)$/.test(a)) { walk(a); return true; }
    if (a === "back") { close(); return true; }
    if (a === "a" && sel) { centerOn(byId.get(sel)); return true; }
    return true;   // everything else is swallowed while the graph is open
  }

  const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", Escape: "back", Enter: "a" };
  addEventListener("keydown", e => {
    if (!open) return;
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    e.stopImmediatePropagation();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (selEdge) removeEdge(selEdge); else if (sel) resetNode(sel); return; }
    if (e.key.toLowerCase() === "f") { e.preventDefault(); fit(); return; }
    const a = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
    if (a) { e.preventDefault(); input(a); }
  }, true);
  addEventListener("resize", () => { if (open) fit(); });

  UI.navGraph = { open: openGraph, close, isOpen: () => open, input };
})();
