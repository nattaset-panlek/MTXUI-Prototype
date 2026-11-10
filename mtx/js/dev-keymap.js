/* Dev tools · Key Map
   Which physical button does what, per page / menu, drawn on the Xbox / PS4 / PS5 pads (Figma "DevTools" art,
   assets/svg/pads/*.svg). Two sources per cell:
     hint  - the page tells the player (a visible hint / CTA glyph)
     code  - app.js routes the button there without a hint (shown dim)
   Joystick and arrows (D-pad) are separate rows and a separate filter: they do the same thing today.
   window.MTX_KEYMAP = { collect, scan, open } */
(() => {
  //#region [Pads] hotspots in each SVG's own units (x, y, w, h); shoulders sit above the art (negative y)
  const PADS = {
    xbox: { src: "mtx/assets/svg/pads/xbox.svg", w: 800, h: 537, spots: {
      y: [578, 93, 52, 52], b: [635, 146, 52, 52], a: [578, 201, 52, 52], x: [526, 146, 52, 52],
      ls: [137, 111, 119, 119], rs: [445, 234, 118, 119], dpad: [250, 253, 95, 95],
      view: [330, 158, 27, 27], menu: [445, 158, 27, 27], home: [376, 76, 48, 40],
      lb: [150, -48, 150, 34], rb: [500, -48, 150, 34], lt: [170, -98, 110, 34], rt: [520, -98, 110, 34] } },
    ps4: { src: "mtx/assets/svg/pads/ps4.svg", w: 800, h: 497, spots: {
      y: [625, 57, 47, 47], b: [681, 113, 47, 47], a: [625, 169, 47, 47], x: [569, 113, 47, 47],
      ls: [228, 213, 76, 76], rs: [488, 213, 76, 76], dpad: [88, 79, 120, 120],
      view: [222, 41, 26, 41], menu: [550, 41, 26, 41], home: [355, 194, 88, 88], touch: [271, 24, 256, 138],
      lb: [110, -48, 150, 34], rb: [540, -48, 150, 34], lt: [130, -98, 110, 34], rt: [560, -98, 110, 34] } },
    ps5: { src: "mtx/assets/svg/pads/ps5.svg", w: 775, h: 495, spots: {
      y: [595, 62, 51, 51], b: [650, 116, 50, 50], a: [595, 170, 51, 51], x: [540, 116, 51, 51],
      ls: [227, 188, 96, 96], rs: [460, 188, 96, 96], dpad: [86, 72, 138, 138],
      view: [194, 34, 26, 52], menu: [552, 34, 26, 52], home: [373, 193, 30, 30], touch: [240, 15, 295, 150],
      lb: [100, -48, 150, 34], rb: [525, -48, 150, 34], lt: [120, -98, 110, 34], rt: [545, -98, 110, 34] } },
  };
  const TOP = 110;   // room above the art for the shoulder buttons
  //#endregion

  //#region [Buttons] physical buttons, grouped (the groups are the filter menu)
  const GROUPS = [
    { id: "face", label: "Buttons", rows: ["a", "b", "x", "y"] },
    { id: "shoulder", label: "Shoulders", rows: ["lb", "rb", "lt", "rt"] },
    { id: "stick", label: "Joystick", rows: ["ls", "l3", "rs", "r3"] },
    { id: "arrow", label: "Arrows (D-pad)", rows: ["dup", "ddown", "dleft", "dright"] },
    { id: "system", label: "System", rows: ["view", "menu", "home", "touch"] },
  ];
  const NAMES = {
    xbox: { a: "A", b: "B", x: "X", y: "Y", lb: "LB", rb: "RB", lt: "LT", rt: "RT", ls: "L-stick", l3: "L3 (press)", rs: "R-stick", r3: "R3 (press)",
      dup: "D-pad ↑", ddown: "D-pad ↓", dleft: "D-pad ←", dright: "D-pad →", view: "View", menu: "Menu", home: "Xbox", touch: "–" },
    ps: { a: "✕", b: "○", x: "□", y: "△", lb: "L1", rb: "R1", lt: "L2", rt: "R2", ls: "L-stick", l3: "L3 (press)", rs: "R-stick", r3: "R3 (press)",
      dup: "D-pad ↑", ddown: "D-pad ↓", dleft: "D-pad ←", dright: "D-pad →", view: "Share / Create", menu: "Options", home: "PS", touch: "Touchpad" },
  };
  NAMES.kb = { a: "Space / Enter", b: "Esc / Backspace", x: "X", y: "Y", lb: "Q", rb: "E", lt: "Z", rt: "C (RT)", ls: "W A S D", l3: "–", rs: "–", r3: "C (R3)",
    dup: "↑", ddown: "↓", dleft: "←", dright: "→", view: "F", menu: "Tab", home: "–", touch: "–" };
  // keyboard: rows -> keys (app.js KEYS + the customize overlay KEYMAP); WASD = joystick, arrow keys = D-pad
  const KB = { a: ["Space", "Enter"], b: ["Esc", "Back"], x: ["X"], y: ["Y"], lb: ["Q"], rb: ["E"], lt: ["Z"], rt: ["C"], ls: ["W", "A", "S", "D"], r3: ["C"],
    dup: ["↑"], ddown: ["↓"], dleft: ["←"], dright: ["→"], view: ["F"], menu: ["Tab"] };
  // a simple full keyboard (1 = one key wide); [label, width] per row, null = gap
  const KB_ROWS = [
    [["Esc", 1], null, ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["Back", 1.5]],
    [["Tab", 1.5], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["[", 1], ["]", 1], ["\\", 1]],
    [["Caps", 1.75], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], ["'", 1], ["Enter", 1.75]],
    [["Shift", 2.25], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["Shift", 1.25], null, ["↑", 1]],
    [["Ctrl", 1.25], ["Alt", 1.25], ["Space", 7], ["Alt", 1.25], ["Ctrl", 1.25], null, ["←", 1], ["↓", 1], ["→", 1]],
  ];
  const SPOT = { l3: "ls", r3: "rs", dup: "dpad", ddown: "dpad", dleft: "dpad", dright: "dpad" };   // rows drawn on a shared hotspot
  const ALL = GROUPS.flatMap(g => g.rows);
  //#endregion

  //#region [Collect] the current page / menu -> { row: [{ label, src }] }
  const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === "none" || c.visibility === "hidden" || +c.opacity === 0) return false; }
    return true; };
  const specText = s => !s ? "" : s === "back" ? "Back" : s.replace(/^go:/, "Go → ").replace(/^fn:/, "").replace(/^toast:/, "Toast · ")
    .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
  const labelOf = el => { const c = el.cloneNode(true); c.querySelectorAll(".glyph,.btn-cta__key,[data-btn]").forEach(g => g.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
  // glyph name (data-btn) -> physical rows, per context
  function rowsForGlyph(btn, ctx) {
    const trig = ctx.trigger;
    return ({ a: ["a"], b: ["b"], x: ["x"], y: ["y"], ls: ["ls"], rs: ["r3"], view: ["view"], menu: ["menu"],
      lb: ["lb"], rb: ["rb"], zl: ["lt"], zr: ["rt"], dl: ["dleft"], dr: ["dright"],
      lt: ctx.kind === "cust" ? ["lt"] : trig ? ["lb"] : ["lb", "lt"], rt: ctx.kind === "cust" ? ["rt"] : trig ? ["rb"] : ["rb", "rt"] })[btn] || [];
  }
  function context() {
    const api = window.MTX?.api, cur = api?.getCur?.() || "?", S = window.MTX_SCREENS || {};
    const sec = document.getElementById("s-" + cur), scr = S[cur] || {};
    const cust = S.customize, sim = S.management || S.simulation, skill = S.skilltree;
    if (cust?.isOpen?.()) return { kind: "cust", cur, root: document.getElementById("ccOverlay"), scr, sec };
    if (sim?.isModalOpen?.()) {
      const roots = [...document.querySelectorAll('[role="dialog"], .modal, .sim-modal, .ev-modal, [class*="modal"]')].filter(e => !e.closest("#tools") && vis(e));
      return { kind: "modal", cur, root: roots[roots.length - 1] || document.body, scr, sec };
    }
    if (cur === "skilltree" && skill?.isDetailOpen?.()) return { kind: "detail", cur, root: sec, scr, sec };
    return { kind: "screen", cur, root: sec, scr, sec, trigger: !!scr.onTrigger };
  }
  function collect() {
    const ctx = context(), out = {};
    const put = (row, label, src) => { if (!label) return; const a = (out[row] ||= []); if (!a.some(x => x.label === label)) a.push({ label, src }); };
    // 1 what the page shows (hints, CTA glyphs)
    const hints = [...(ctx.root || document).querySelectorAll(".hint, .btn-cta, .cc-sp__equip, .pf-history, .pe-owned")].filter(h => !h.closest("#tools") && vis(h));
    for (const h of hints) {
      const label = labelOf(h) || "(hint)";
      const gs = [...h.querySelectorAll("[data-btn]")].map(g => g.dataset.btn);
      if (!gs.length && h.classList.contains("hint--cc")) gs.push("view");
      for (const g of gs) for (const r of rowsForGlyph(g, ctx)) put(r, label, "hint");
    }
    // loose glyphs (e.g. "RS Change character" on the main card): label = the glyph's container text
    for (const g of (ctx.root || document).querySelectorAll("[data-btn]")) {
      if (g.closest("#tools") || hints.some(h => h.contains(g)) || !vis(g)) continue;
      let label = labelOf(g.parentElement);
      const row = g.parentElement.querySelectorAll(":scope > *:not([data-btn])").length > 1;   // a tab row: its text is the tabs, not an action
      if (row || !label || label.length > 28 || /^[\d\s/+−-]+$/.test(label))   // a tab row / a number box: name the gesture instead
        label = ({ lt: "Prev tab", rt: "Next tab", lb: "Prev tab", rb: "Next tab", zl: "Prev tab", zr: "Next tab", dl: "Adjust ←", dr: "Adjust →",
          a: "Select", b: "Back", x: "Action X", y: "Action Y", view: "Customization", menu: "Menu", ls: "Move", rs: "R3" })[g.dataset.btn] || "(icon)";
      for (const r of rowsForGlyph(g.dataset.btn, ctx)) put(r, label, "hint");
    }
    // 2 what app.js routes there anyway
    const ds = ctx.sec?.dataset || {}, cur = ctx.cur, code = (r, l) => { if (!out[r]) put(r, l, "code"); };
    const move = "Move focus";
    if (ctx.kind === "cust") {
      ["dup", "ddown", "dleft", "dright"].forEach(r => code(r, move)); code("ls", move); code("b", "Back / close"); code("a", "Select");
    } else if (ctx.kind === "modal") {
      ["dup", "ddown", "dleft", "dright"].forEach(r => code(r, move)); code("ls", move);
      code("a", "Confirm"); code("b", "Cancel"); code("x", "Aux X"); code("y", "Aux Y");
    } else if (ctx.kind === "detail") {
      code("a", "Primary"); code("x", "Secondary"); code("b", "Close"); code("y", "Close");
    } else {
      const dirL = ctx.scr.onDir ? "Move / page ←" : move, dirR = ctx.scr.onDir ? "Move / page →" : move;
      code("dup", move); code("ddown", move); code("dleft", dirL); code("dright", dirR); code("ls", move);
      code("a", "Confirm (focused)"); code("b", ctx.scr.onBack ? "Back (screen)" : "Back");
      code("x", cur === "rewards" ? "Toggle equip" : specText(ds.x)); code("y", cur === "tactical" ? "Back" : specText(ds.y));
      const lt = cur === "main" ? "Prev quick mode" : specText(ds.lt), rt = cur === "main" ? "Next quick mode" : specText(ds.rt);
      code("lb", lt); code("rb", rt);
      if (ctx.trigger) { code("lt", "Prev tab (onTrigger)"); code("rt", "Next tab (onTrigger)"); } else { code("lt", lt && lt + " (= LB)"); code("rt", rt && rt + " (= RB)"); }

    }
    // everywhere: Menu / Options = Settings, L3 / touchpad = Friends panel
    code("menu", "Options"); code("view", "Friends");
    return { page: pageName(ctx), kind: ctx.kind, trigger: !!ctx.trigger, rows: out };
  }
  function pageName(ctx) {
    const t = s => (s || "").replace(/\s+/g, " ").trim();
    if (ctx.kind === "cust") return "Customize · " + (t(document.querySelector("#ccOverlay .cc-hub__tab.is-active, #ccOverlay [data-hub].is-active")?.textContent) || "overlay");
    if (ctx.kind === "modal") return t(ctx.cur) + " · modal";
    if (ctx.kind === "detail") return "Skill detail";
    return ctx.cur.charAt(0).toUpperCase() + ctx.cur.slice(1);
  }
  //#endregion

  //#region [Scan] visit every page / menu once, collect, then go back to where we were
  const w = t => new Promise(r => setTimeout(r, t));
  const MD = { result: "WIN", opp: "Ploy Wongsakul", style: "Muay Phra Nakhon", method: "KO", round: 2, time: "1:45", landed: 27, thrown: 33, kdYou: 1, kdOpp: 0, damage: 503, rp: 18, oppRp: 612, mode: "rank", modeName: "Ranked", date: "2026-10-14" };
  function steps() {
    const A = window.MTX.api, S = id => A.getScreen(id), M = () => S("management"), CC = () => S("customize");
    const closeAll = async () => { for (let i = 0; i < 3 && M()?.isModalOpen?.(); i++) { M().handleCancel?.(); await w(250); } if (CC()?.isOpen?.()) CC().close?.(); if (S("skilltree")?.isDetailOpen?.()) S("skilltree").closeDetail?.(); };
    const go = (label, fn) => [label, async () => { await closeAll(); await fn(); }];
    return [
      go("Main", () => MTX.show("main")),
      go("Career", () => MTX.show("career")),
      go("Management", () => MTX.show("management")),
      go("Offer (modal)", async () => { MTX.show("management"); await w(300); M().openEvent?.("manager"); }),
      go("Random event (modal)", async () => { MTX.show("management"); await w(300); M().openEvent?.("social"); }),
      go("Interview (modal)", async () => { MTX.show("management"); await w(300); M().openEvent?.("interview"); }),
      go("Tactical style", () => MTX.show("tactical")),
      go("Attributes", () => MTX.show("attributes")),
      go("Skill tree", () => MTX.show("skilltree")),
      go("Skill detail", async () => { MTX.show("skilltree"); await w(400); S("skilltree").openDetail?.("pn1_root"); }),
      go("Mastery", () => MTX.show("mastery")),
      go("Quests", () => MTX.show("quests")),
      go("Store", () => MTX.show("store")),
      go("Rewards", () => MTX.show("rewards")),
      go("Collection", () => MTX.show("collection")),
      go("Media", () => MTX.show("media")),
      go("Leaderboard", () => MTX.show("leaderboard")),
      go("Profile", async () => { MTX.show("main"); await w(300); CC().show?.(0); }),
      go("Style preset", async () => { MTX.show("main"); await w(300); CC().show?.(0); await w(400); CC().handle?.("rb"); }),
      go("Customization", async () => { MTX.show("main"); await w(300); CC().show?.(0); await w(400); CC().handle?.("lb"); CC().handle?.("menu"); }),
      go("Edit profile", async () => { MTX.show("main"); await w(300); CC().show?.(0); await w(400); CC().handle?.("x"); }),
      go("Match history", async () => { S("history").openFromProfile?.(); }),
      go("Match detail", async () => { S("history").openFromProfile?.(); await w(300); S("matchdetail").open?.(MD); }),
    ];
  }
  let lastScan = null;
  async function scan(onStep) {
    const back = window.MTX.api.getCur(), list = steps(), cols = [];
    const snap = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); snap[k] = localStorage.getItem(k); }   // the scan opens offers / events: leave no trace
    for (const [i, [label, fn]] of list.entries()) {
      try { await fn(); await w(650); const c = collect(); c.page = label; cols.push(c); } catch (e) { cols.push({ page: label, error: e.message, rows: {} }); }
      onStep?.(i + 1, list.length, label);
    }
    for (let i = 0; i < 3 && window.MTX_SCREENS?.management?.isModalOpen?.(); i++) { window.MTX_SCREENS.management.handleCancel?.(); await w(250); }
    if (window.MTX_SCREENS?.customize?.isOpen?.()) window.MTX_SCREENS.customize.close?.();
    localStorage.clear(); for (const [k, v] of Object.entries(snap)) localStorage.setItem(k, v);
    MTX.show(back);
    lastScan = { at: new Date().toISOString(), cols };
    return lastScan;
  }
  //#endregion

  //#region [View]
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let pad = "xbox", filter = "all", selCol = 0, live = null, view = null;
  const names = () => NAMES[pad === "kb" ? "kb" : pad === "xbox" ? "xbox" : "ps"];
  const groupLabel = g => pad === "kb" ? ({ stick: "Joystick (W A S D)", arrow: "Arrows (arrow keys)", shoulder: "Q / E / Z / C" })[g.id] || g.label : g.label;
  // keyboard: Z / C only act where the page has a second tab row (onTrigger); "LT = LB" on a pad has no keyboard twin
  // (col = a collect() result; Z / C reach a page only through onTrigger, or inside the customize overlay)
  const forPad = col => {
    const rows = col?.rows;
    if (pad !== "kb" || !rows) return rows || {};
    const o = { ...rows };
    if (col.kind === "screen" && !col.trigger) { delete o.lt; delete o.rt; }
    for (const r of ["home", "touch", "l3", "rs"]) delete o[r];
    return o;
  };
  function kbSvg(rows, usedAnywhere) {
    const U = 44, G = 4, keyRows = {};
    for (const [r, ks] of Object.entries(KB)) {
      if (filter !== "all" && !GROUPS.find(g => g.id === filter).rows.includes(r)) continue;
      for (const k of ks) (keyRows[k] ||= []).push(r);
    }
    let maxW = 0; const keys = [];
    KB_ROWS.forEach((row, ri) => { let x = 0; for (const k of row) { if (!k) { x += .35; continue; } keys.push([k[0], x, ri, k[1]]); x += k[1]; } maxW = Math.max(maxW, x); });
    const W = maxW * U, H = KB_ROWS.length * U;
    const html = keys.map(([k, x, ri, w]) => {
      const rs = keyRows[k] || [], used = rs.filter(r => rows[r]?.length);
      const never = usedAnywhere && rs.length && rs.every(r => !usedAnywhere.has(r));
      const cls = !rs.length ? "is-off" : used.length ? (used.some(r => rows[r].some(c => c.src === "hint")) ? "is-hint" : "is-code") : never ? "is-never" : "is-free";
      const tip = rs.map(r => `${names()[r]}: ${(rows[r] || []).map(c => c.label).join(" / ") || "—"}`).join("\n");
      const st = `left:${x * U / W * 100}%;top:${ri * U / H * 100}%;width:${(w * U - G) / W * 100}%;height:${(U - G) / H * 100}%`;
      return `<div class="km-key ${cls}" style="${st}"${tip ? ` title="${esc(tip)}"` : ""}><span>${esc(k)}</span></div>`;
    }).join("");
    return `<div class="km-pad km-pad--kb" style="aspect-ratio:${W}/${H}">${html}</div>`;
  }
  function padSvg(rows, usedAnywhere) {
    if (pad === "kb") return kbSvg(rows, usedAnywhere);
    const P = PADS[pad], H = P.h + TOP;
    const spots = {};
    for (const r of ALL) {
      const k = SPOT[r] || r; if (!P.spots[k]) continue;
      if (filter !== "all" && !GROUPS.find(g => g.id === filter).rows.includes(r)) continue;
      (spots[k] ||= []).push(r);
    }
    const tags = Object.entries(spots).map(([k, rs]) => {
      const [x, y, sw, sh] = P.spots[k];
      const used = rs.filter(r => rows[r]?.length), never = usedAnywhere && rs.every(r => !usedAnywhere.has(r));
      const cls = used.length ? (used.some(r => rows[r].some(c => c.src === "hint")) ? "is-hint" : "is-code") : never ? "is-never" : "is-free";
      const tip = rs.map(r => `${names()[r]}: ${(rows[r] || []).map(c => c.label).join(" / ") || "—"}`).join("\n");
      const st = `left:${x / P.w * 100}%;top:${(y + TOP) / H * 100}%;width:${sw / P.w * 100}%;height:${sh / H * 100}%`;
      const label = k === "dpad" ? "D-pad" : k === "ls" ? "LS" : k === "rs" ? "RS" : names()[k] || k;
      return `<div class="km-spot ${cls}${/^(lb|rb|lt|rt)$/.test(k) ? " km-spot--pill" : ""}" style="${st}" title="${esc(tip)}"><span>${esc(label)}</span></div>`;
    }).join("");
    return `<div class="km-pad" style="aspect-ratio:${P.w}/${H}"><img src="${P.src}" alt="${pad} controller" style="top:${TOP / H * 100}%;height:${P.h / H * 100}%">${tags}</div>`;
  }
  function rowsTable(col) {
    const rows = forPad(col);
    return GROUPS.filter(g => filter === "all" || g.id === filter).map(g => `<tr class="km-grp"><th colspan="2">${esc(groupLabel(g))}</th></tr>` +
      g.rows.filter(r => pad !== "kb" || KB[r]).map(r => { const c = rows[r] || [];
        return `<tr class="${c.length ? "" : "is-free"}"><th>${esc(names()[r])}</th><td>${c.length ? c.map(x => `<span class="km-c km-c--${x.src}">${esc(x.label)}</span>`).join("") : "<i>free</i>"}</td></tr>`; }).join("")).join("");
  }
  const opt = (v, l, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(l)}</option>`;
  function menuHtml() {
    return `<label class="km-sel">Category <select data-km-filter-sel>${[["all", "All buttons"], ...GROUPS.map(g => [g.id, groupLabel(g)])].map(([v, l]) => opt(v, l, filter)).join("")}</select></label>`;
  }
  function padMenu() {
    return `<label class="km-sel">Controller <select data-km-pad-sel>${[["xbox", "Xbox"], ["ps4", "PlayStation 4"], ["ps5", "PlayStation 5"], ["kb", "Keyboard"]].map(([v, l]) => opt(v, l, pad)).join("")}</select></label>`;
  }
  const legend = `<div class="km-legend"><span class="is-hint">shown to player</span><span class="is-code">code only</span><span class="is-free">free on this page</span><span class="is-never">never used</span></div>`;

  // small view inside the Dev panel tab: the current page only
  function renderTab() {
    const el = document.getElementById("tabContentKeys"); if (!el) return;
    live = collect();
    el.innerHTML = `<section class="dev-sec km-tab"><h3 class="dev-sec__title">Key map · ${esc(live.page)}</h3>
      <div class="km-tab__bar">${padMenu()}${menuHtml()}<button type="button" class="dev-btn km-open" data-km-open>Compare all pages…</button></div>
      <div class="km-tab__body"><div class="km-tab__pad">${padSvg(forPad(live), lastScan && usedSet())}${legend}</div>
      <table class="km-rows">${rowsTable(live)}</table></div></section>`;
  }
  const usedSet = () => new Set(lastScan.cols.flatMap(c => Object.keys(forPad(c))));

  // big view: every page / menu side by side
  function renderBig() {
    if (!view) return;
    const cols = lastScan?.cols || [];
    const used = lastScan ? usedSet() : null;
    const sel = cols[selCol] || live || collect();
    const rowsOf = c => forPad(c);
    const head = cols.map((c, i) => `<th class="${i === selCol ? "is-sel" : ""}" data-km-col="${i}" title="Show on the pad">${esc(c.page)}</th>`).join("");
    const body = GROUPS.filter(g => filter === "all" || g.id === filter).map(g => `<tr class="km-grp"><th colspan="${cols.length + 2}">${esc(groupLabel(g))}</th></tr>` + g.rows.filter(r => pad !== "kb" || KB[r]).map(r => {
      const n = cols.filter(c => rowsOf(c)[r]?.length).length;
      return `<tr class="${n ? "" : "is-never"}"><th>${esc(names()[r])}</th><td class="km-n">${n ? n + "/" + cols.length : "<b>UNUSED</b>"}</td>` +
        cols.map((c, i) => `<td class="${i === selCol ? "is-sel" : ""}">${(rowsOf(c)[r] || []).map(x => `<span class="km-c km-c--${x.src}">${esc(x.label)}</span>`).join("")}</td>`).join("") + "</tr>";
    }).join("")).join("");
    view.innerHTML = `<div class="km-big__bar"><h2>Key map</h2>${padMenu()}${menuHtml()}
        <button type="button" class="dev-btn" data-km-scan>${lastScan ? "Rescan all pages" : "Scan all pages"}</button>
        <span class="km-status" data-km-status>${lastScan ? `${cols.length} pages · ${ALL.filter(r => !used.has(r) && (pad !== "kb" || KB[r])).length} ${pad === "kb" ? "keys" : "buttons"} never used` : "Scan to compare every page and menu"}</span>
        <button type="button" class="km-x" data-km-close aria-label="Close">×</button></div>
      <div class="km-big__body">
        <aside class="km-big__pad"><h3>${esc(sel.page || "")}</h3>${padSvg(forPad(sel), used)}${legend}<table class="km-rows">${rowsTable(sel)}</table></aside>
        <div class="km-big__grid">${cols.length ? `<table class="km-grid"><thead><tr><th>Button</th><th>Used</th>${head}</tr></thead><tbody>${body}</tbody></table>` : `<p class="km-empty">No scan yet. "Scan all pages" visits every page and menu (about 20 s) and comes back here.</p>`}</div>
      </div>`;
  }
  function open() {
    if (!view) { view = document.createElement("div"); view.id = "keymapView"; view.className = "km-big"; document.body.appendChild(view); }   // not inside #tools: that bar fades out when idle
    view.hidden = false; renderBig();
  }
  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-km-pad],[data-km-filter],[data-km-open],[data-km-close],[data-km-scan],[data-km-col]");
    if (!t) return;
    if (t.dataset.kmPad) pad = t.dataset.kmPad;
    if (t.dataset.kmFilter) filter = t.dataset.kmFilter;
    if (t.dataset.kmCol) selCol = +t.dataset.kmCol;
    if (t.hasAttribute("data-km-open")) open();
    if (t.hasAttribute("data-km-close")) { view.hidden = true; return; }
    if (t.hasAttribute("data-km-scan")) {
      view.style.visibility = "hidden";   // the scan drives the real screens; the page must be visible for the hints to measure
      await scan();
      view.style.visibility = ""; selCol = 0;
    }
    renderTab(); renderBig();
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.matches?.("[data-km-pad-sel]")) pad = t.value;
    else if (t.matches?.("[data-km-filter-sel]")) filter = t.value;
    else return;
    renderTab(); renderBig();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && view && !view.hidden) { e.stopPropagation(); view.hidden = true; } }, true);
  // keep the small tab in step with the page while it is open
  let sig = "";
  setInterval(() => {
    const el = document.getElementById("tabContentKeys");
    if (!el || el.style.display === "none" || document.getElementById("dev")?.hidden) return;
    const c = JSON.stringify(collect()); if (c !== sig) { sig = c; renderTab(); }
  }, 1200);
  window.MTX_KEYMAP = { collect, scan, open, renderTab, get last() { return lastScan; } };
  //#endregion
})();
