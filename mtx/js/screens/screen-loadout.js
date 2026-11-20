(function () {
  /* Tactical Loadout overlay (window.MTX_LOADOUT, opened from Dev > Pages > Overlays or MTX_LOADOUT.open()).
     Figma eKm2meOcqHG0cFBt4eoWQr, page Prototype: Style preset v2 Profile 719:28883 / Inventory 719:29474,
     TSP 01 Hub 726:39699, Perk 02 719:28292, 03 719:82179, 04 719:82698, 05 719:83182, 06 719:87481, 06b 719:88261,
     Special 07 719:30065 / 08 719:84264, Decisive 09 719:42859 / 10 719:84710.

     2026-11-12: hub = "TSP Hub B · Move selected flow (Perk)" section 740:109350 (frames 740:109351 left slot,
     740:110461 grid, 740:111571 Y info, 740:114293 Special, 740:115977 Decisive, 740:117661 Signature).
     The old Perk / Special / Decisive submenus are gone: every category is picked on the hub itself.

     Top tabs Profile / Inventory / Loadout: LT / RT (keyboard Q / E).
     Hub: LB / RB (keyboard Z / C) switch the tactical style (one preset per style; locked styles can't be edited).
          Left: Special (green D-pad), Decisive (red D-pad), Signature Move (silver diamonds), Perk (diamond group).
          Arrows / LS move the focus over all 16 slots; keyboard 1-4 pick that slot of the focused category.
          The right side follows the focused category: 5 x 5 grid (3 rows visible, scrollable) + info panel.
          A on a slot -> the grid; A in the grid equips into that slot and returns to it, B cancels.
          X removes the slot's item. Y opens the info card next to the grid cell; RS / R pages its levels.
          B on the left closes. No toasts. */

  //#region [Variables/Fields]
  const SV = "mtx/assets/svg/", LO = SV + "loadout/", IMG = "mtx/assets/img/";
  const C_SPECIAL = "#c7f029", C_DECISIVE = "#ff4060", C_GOLD = "#f4dd2f";

  // switcher order = Figma 726:41277; icon mapping south / isan / north / west is the session's guess
  const STYLES = [
    { id: "phranakhon", name: "Phra Nakorn", color: "#e6003f" },
    { id: "south", name: "Chaiya", color: "#5fc8e6" },
    { id: "isan", name: "Korat", color: "#c9ff00", req: "E Lv 30  S Lv 20  R Lv 10" },
    { id: "north", name: "Tha Sao", color: "#4b00d6", req: "E Lv 40  S Lv 30  R Lv 15" },
    { id: "west", name: "Lopburi", color: "#f96000", req: "E Lv 50  S Lv 40  R Lv 20" }
  ];
  const KIND = { defend: ["Defend perk", "#4da3ff"], attack: ["Attack perk", "#ff4060"], sustain: ["Sustain perk", "#3fd28b"] };
  // Items per style come from the Skill Tree data (window.MTX_SKILLS, build-v6) and its unlock state (MTX_SKILLSTATE):
  // PERKS / MOVES / MOVE_DESC are rebuilt for the shown style by syncLists() (start of every render).
  //   perk: tree perk nodes; lv = tree level (frame 1-3), locked = level 0; fx per level, draw = Lv 3 drawback
  //   special / signature: tree nodes of that kind; decisive: granted DSM + one item per family (owned with Tier 1, shows the top tier)
  // IDS[tid][i] = node id (decisive: family id or granted node id) -> Skill Tree equip / is-equipped tag.
  let PERKS = [];
  let MOVES = { special: [], decisive: [], signature: [] }, MOVE_DESC = { special: [], decisive: [], signature: [] };
  let MOVE_OWN = { special: [], decisive: [], signature: [] }, IDS = { perk: [], special: [], decisive: [], signature: [] };
  const lvIn = (sid, id) => window.MTX_SKILLSTATE?.level(sid, id) || 0;
  // equipped perk level per style: { [sid]: { perkNodeId: 1-3 } }. A perk can be equipped at any owned level
  // (Lv 3 has a drawback); default = highest owned. Set from the Skill Tree tab or the Loadout info card (RS).
  const EQ_LV = {};
  const eqLvOf = (sid, id) => { const own = lvIn(sid, id), v = EQ_LV[sid]?.[id]; return own ? Math.min(own, v || own) : 0; };
  // decisive family: tiers owned (Tier 1..n in order) and the tier it is equipped at (default = top owned)
  const famOf = (sid, fid) => window.MTX_SKILLS?.styles?.[sid]?.families?.[fid];
  const famTop = (sid, fid) => (famOf(sid, fid)?.tiers || []).filter(id => lvIn(sid, id) > 0).length;
  const famTier = (sid, fid) => { const top = famTop(sid, fid), v = EQ_LV[sid]?.[fid]; return top ? Math.min(top, v || top) : 0; };
  function listsFor(sid) {
    const S = window.MTX_SKILLS?.styles?.[sid];
    const L = { perks: [], moves: { special: [], decisive: [], signature: [] }, desc: { special: [], decisive: [], signature: [] }, own: { special: [], decisive: [], signature: [] }, ids: { perk: [], special: [], decisive: [], signature: [] } };
    if (!S) return L;
    S.nodes.filter(n => n.kind === "perk").forEach(n => {
      const lv = lvIn(sid, n.id);
      L.perks.push({ id: n.id, name: n.name, kind: n.tag in KIND ? n.tag : "attack", lv: Math.max(1, eqLvOf(sid, n.id)), own: lv, locked: !lv, fx: n.levels.map(l => l.buff || l.desc), draw: n.levels[2]?.flaw || "" });
      L.ids.perk.push(n.id);
    });
    const add = (tid, id, name, desc, own) => { L.ids[tid].push(id); L.moves[tid].push(name); L.desc[tid].push(desc); L.own[tid].push(own); };
    ["special", "signature"].forEach(k => S.nodes.filter(n => n.kind === k).forEach(n => add(k, n.id, n.name, n.desc, lvIn(sid, n.id) > 0)));
    S.nodes.filter(n => n.granted).forEach(n => add("decisive", n.id, n.name, n.desc, true));
    Object.values(S.families || {}).forEach(f => {
      const top = famTier(sid, f.id), n = S.nodes.find(x => x.id === f.tiers[Math.max(0, top - 1)]);
      add("decisive", f.id, f.name, (top ? `Tier ${top} · ` : "") + (n?.desc || ""), top > 0);
    });
    return L;
  }
  // which list / index a tree node is in (decisive tiers -> their family)
  function itemOf(sid, nodeId) {
    const L = listsFor(sid), n = window.MTX_SKILLS?.styles?.[sid]?.nodes.find(x => x.id === nodeId);
    if (!n) return null;
    const key = n.kind === "decisive" && !n.granted ? n.family : nodeId, tid = n.kind === "perk" ? "perk" : n.kind;
    const i = L.ids[tid]?.indexOf(key);
    return i >= 0 ? { tid, i, L } : null;
  }
  const isOwnedIn = (L, tid, i) => tid === "perk" ? !!L.perks[i] && !L.perks[i].locked : !!L.own[tid]?.[i];
  function syncLists() {
    const sid = style().id, L = listsFor(sid);
    PERKS = L.perks; MOVES = L.moves; MOVE_DESC = L.desc; MOVE_OWN = L.own; IDS = L.ids;
    // skills removed in the tree leave the loadout (working copy and saved)
    const before = JSON.stringify(saved[sid]);
    [presets[sid], saved[sid]].forEach(p => p && Object.keys(p).forEach(tid => p[tid] = p[tid].map(v => v != null && isOwnedIn(L, tid, v) ? v : null)));
    if (JSON.stringify(saved[sid]) !== before) persist();
  }
  const PF = {
    grid: { 1: [122, 122, 96, 94], 2: [119, 116, 96, 94], 3: [128, 124, 84, 82] },
    list: { 1: [167, 167, 133, 130], 2: [164, 160, 133, 130], 3: [190, 184, 123, 121] },
    hub: { 1: [152, 152, 120, 118], 2: [149, 146, 120, 118], 3: [160, 155, 104, 102] }
  };
  const LIST_ICON = { 0: "perk-licon-1", 3: "perk-licon-2", 4: "perk-licon-3" };
  // 15 per grid (Hub B frames 740:114293 / 740:115977 / 740:117661); decisive row 3 repeats Kwang Liao Lang as in Figma
  const MOVES_MOCK = {
    special: ["Jumping Knee", "Spinning Elbow", "Superman Punch", "Flying Kick", "Clinch Sweep", "Cartwheel Kick", "Axe Kick", "Question Mark Kick", "Spinning Back Fist", "Step-up Knee", "Spin Push Kick", "Spin Punch", "Flying Knee", "Face Teep", "Tornado Kick"],
    decisive: ["Mon Yan Lak", "Salab Fan Pla", "Erawan Soei Nga", "Hak Nguang", "Chawa Sad Hok", "Inao Thang Krit", "Pak Look Thoy", "Ta Then Kham Fak", "Yo Khao Phra Sumen", "Kwang Liao Lang", "Kwang Liao Lang", "Kwang Liao Lang", "Kwang Liao Lang", "Kwang Liao Lang", "Kwang Liao Lang"],
    signature: ["TBD", "TBD", "Super Hook", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD", "TBD"]
  };
  const MOVE_DESC_MOCK = {
    special: ["A rising knee that jumps in from mid range.", "A spinning elbow that turns through the guard.", "A leaping cross that closes distance in one step.", "A flying kick launched off the back foot.", "A clinch sweep that drops the opponent to the canvas.", "A cartwheel kick that comes over the guard.", "An axe kick that drops onto the head.", "A kick that feints low and lands high.", "A spinning back fist that punishes a step in.", "A step-up knee off the opponent's thigh."],
    decisive: ["A finishing knee that drives through the centre.", "A spinning elbow that cuts across the brow.", "A rising knee off the clinch that lifts the opponent and breaks their guard.", "A crocodile spin that throws the opponent off balance.", "A six-strike flurry that ends with an elbow.", "A long-range knee that splits the guard.", "A sweeping counter that catches a kick.", "A jumping kick that lands on the shoulder.", "A knee climb that strikes down on the head.", "A deer-turn kick that comes from behind."]
  };
  const C_SIGNATURE = "#9aa0ab";
  const TYPES = [
    { id: "perk", label: "Perk", grid: "Perk" },
    { id: "special", label: "Special Move", grid: "Special move", color: C_SPECIAL },
    { id: "decisive", label: "Decisive Move", grid: "Decisive move", color: C_DECISIVE },
    { id: "signature", label: "Signature Move", grid: "Signature move", color: C_SIGNATURE }
  ];
  const PAGES = [{ label: "Profile", w: 260 }, { label: "Inventory", w: 260 }, { label: "Loadout", w: 260 }];
  const GRID_N = 15;           // items per grid; cells 16-25 are null slots (rows 4-5, scrolled into view)
  const ART = { special: "sp", decisive: "dc", signature: "sg" };
  // Hub B slot centres (frame px) in slot order 1-4 + the focus ring's diamond size (Selected Prismatic, 5 px out).
  // Special / Decisive = the D-pad cluster at scale .72 (MTX / Loadout Special Move 740:123018 at 168,290 / 583,290),
  // Signature = MTX / Loadout Signature Move 740:123560 at 2,533, Perk = MTX / Loadout Perk 740:123901 at 398,572.
  const dpadC = (ox, oy) => [[ox + 96.5, oy + 203], [ox + 203, oy + 96.5], [ox + 309, oy + 203], [ox + 203, oy + 309]];
  // group focus (Figma "Loadout · group first, then slot" 741:60422): Selected Prismatic diamond round the whole group
  // centred on the group slots (Figma frames sit 27 px / 18 px low and cut through the top slot; user asked to fix)
  const GROUP_GEO = { special: { c: [371, 493], s: 390 }, decisive: { c: [786, 493], s: 390 }, signature: { c: [205, 763.5], s: 360 }, perk: { c: [584, 740], s: 410 } };
  // slot A opens on: the first empty one, top first (D-pad / signature: up, left, right, down; perk: top, right, left, bottom)
  const ENTRY_ORDER = { special: [1, 0, 2, 3], decisive: [1, 0, 2, 3], signature: [1, 0, 2, 3], perk: [0, 1, 2, 3] };
  const SLOT_GEO = {
    special: { c: dpadC(168, 290), ring: 139 },
    decisive: { c: dpadC(583, 290), ring: 139 },
    signature: { c: dpadC(2, 560.5), ring: 139 },   // D-pad cluster template (user 2026-11-13), centre 205,763.5
    perk: { c: [[583, 652], [671.5, 741], [496, 740.5], [583, 828]], ring: 156 }
  };
  // D-pad slots in slot order (number key 1-4): left, up, right, down; frame px inside the 563 x 640 cluster
  const DPAD = [
    { dir: "left", x: 40, y: 188, key: [220, 263] }, { dir: "up", x: 188, y: 40, key: [263, 220] },
    { dir: "right", x: 335, y: 188, key: [305, 263] }, { dir: "down", x: 188, y: 335, key: [263, 305] }
  ];
  const DIR_NAME = { left: "Left", up: "Up", right: "Right", down: "Down" };
  // Selected-slot ring (720:32457 path, 8 px stroke, the slot art covers its inner half) in slot-box px
  const SLOT_PATH = "M563.816 243.569L530.894 211.373L497.972 243.569C492.748 248.675 489.789 255.148 489.084 261.814C482.269 262.498 475.646 265.393 470.422 270.499L437.5 302.695L470.422 334.89C475.646 339.997 482.269 342.891 489.084 343.575C489.789 350.241 492.748 356.714 497.972 361.82L530.894 394.016L563.816 361.82C569.04 356.714 571.999 350.241 572.704 343.575C579.519 342.891 586.142 339.997 591.365 334.89L624.288 302.695L591.365 270.499C586.142 265.393 579.519 262.498 572.704 261.814C571.999 255.148 569.04 248.675 563.816 243.569Z";

  // one preset per style. perk: 4 slots (PERKS index | null); special / decisive: 4 D-pad slots (MOVES index | null)
  // empty at start: items come from the Skill Tree (Equip there, or pick owned items here)
  const DEFAULT_PRESETS = {};

  let api = null, root = null, open = false;
  let presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));   // working copy (what the hub shows / edits)
  let saved = JSON.parse(JSON.stringify(DEFAULT_PRESETS));     // last saved loadouts; leaving with a difference asks first
  // saved loadouts + equipped perk levels survive a reload (like the Skill Tree unlocks, MTX_SKILLSTATE); dev: MTX_LOADOUT.reset()
  const LKEY = "mtx.loadout.v1";
  try { const o = JSON.parse(localStorage.getItem(LKEY) || "null"); if (o?.saved) { saved = o.saved; presets = JSON.parse(JSON.stringify(o.saved)); Object.assign(EQ_LV, o.eqLv || {}); } } catch { /* no storage */ }
  const persist = () => { try { localStorage.setItem(LKEY, JSON.stringify({ saved, eqLv: EQ_LV })); } catch { /* private mode */ } };
  let page = 2;                // 0 Profile, 1 Inventory, 2 Loadout
  let styleIdx = 0;
  let view = "hub";            // always "hub" since Hub B (kept for the open() / set() API)
  let type = 0;                // TYPES index of the focused category
  let mode = "group";          // group (level 1: pick a group) | slots (level 2: a slot in it) | grid (level 3: right side)
  let slot = 0, cell = 0;
  let info = null;             // { lv } while the info card is open
  let gscroll = 0;             // grid scrollTop (kept across re-renders)
  let lastFocus = null;
  //#endregion

  //#region [Helpers]
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const glyph = b => window.MTX_UI?.glyph?.(b) || `<span class="glyph" data-btn="${b}">${b.toUpperCase()}</span>`;
  const device = () => api?.getDevice?.() || "kb";
  const style = () => STYLES[styleIdx];
  const preset = () => {
    const p = presets[style().id] || (presets[style().id] = {});
    TYPES.forEach(t => { if (!p[t.id]) p[t.id] = [null, null, null, null]; });
    return p;
  };
  const T = () => TYPES[type];
  const entrySlot = tid => { const l = preset()[tid]; return ENTRY_ORDER[tid].find(i => l[i] == null) ?? ENTRY_ORDER[tid][0]; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const dirty = () => { const id = style().id; return JSON.stringify(preset()) !== JSON.stringify(saved[id] || { perk: [null, null, null, null], special: [null, null, null, null], decisive: [null, null, null, null], signature: [null, null, null, null] }); };
  const saveLoadout = () => { saved[style().id] = clone(preset()); persist(); rumble(60, .25); };
  const discardLoadout = () => { const id = style().id; if (saved[id]) presets[id] = clone(saved[id]); else delete presets[id]; };
  // unsaved changes: ask before the action that leaves this loadout (close, other tab, other style)
  function guard(action) {
    if (!dirty() || !window.MTX_UI?.dialog) { action(); return; }
    window.MTX_UI.dialog.open({
      title: "Save changes?", body: `Your ${style().name} loadout has unsaved changes.`,
      primary: "Save", secondary: "Discard", closeHint: "Keep editing",
      onPrimary: () => { saveLoadout(); action(); },
      onSecondary: () => { discardLoadout(); action(); },
      onClose: () => {}
    });
  }
  const isLocked = s => !!s.req;
  const count = arr => arr.filter(v => v != null).length;
  const owned = (tid, i) => i < itemCount(tid) && (tid === "perk" ? !PERKS[i].locked : !!MOVE_OWN[tid][i]);
  const itemCount = tid => tid === "perk" ? PERKS.length : MOVES[tid].length;
  const itemName = (tid, i) => tid === "perk" ? PERKS[i].name : MOVES[tid][i];
  const moveDesc = (tid, i) => MOVE_DESC[tid]?.[i] || (tid === "signature" ? "Signature move details not defined yet." : "Move details not defined yet.");
  // move art: grid tile / D-pad slot (two boxer poses, as in the Figma frames)
  const tileArt = (tid, i) => `${LO}${ART[tid]}-tile-${(i % 2 === 0) === (tid !== "decisive") ? "a" : "b"}.svg`;
  const slotArt = (tid, i) => `${LO}${ART[tid]}-slot-${i % 2 ? "b" : "a"}.svg`;
  const rumble = (ms = 40, s = .2) => api?.rumble?.(ms, s);
  // perk effect text: only the numbers are coloured (Figma 2026-11-12): benefit #3fd28b, condition [[n]] #ffb547
  const fxHtml = t => esc(t).replace(/\[\[([^\]]+)\]\]|[+-]?\d+(?:\.\d+)?%?/g, (m, c) => c ? `<b class="tl-num tl-num--cond">${c}</b>` : `<b class="tl-num">${m}</b>`);
  const plain = t => t.replace(/\[\[([^\]]+)\]\]/g, "$1");
  //#endregion

  //#region [Builders]
  function perkArt(i, where) {
    const p = PERKS[i], [fw, fh, iw, ih] = PF[where][p.lv];
    const icon = where === "list" && LIST_ICON[i] ? LIST_ICON[i] : `perk-icon-${i + 1}`;   // Figma list cards use their own art for these three
    return `<img src="${LO}perk-${where === "list" ? "l" : ""}frame-${p.lv}.svg" width="${fw}" height="${fh}" alt=""><img src="${LO}${icon}.svg" width="${iw}" height="${ih}" alt="">`;
  }

  const PAGE_ORDER = [0, 2, 1];   // tab order (user 2026-11-13): Profile / Loadout / Inventory
  const stepPage = a => PAGE_ORDER[(PAGE_ORDER.indexOf(page) + (a === "lt" ? -1 : 1) + 3) % 3];
  // landing on Loadout always starts at group select (level 1), never inside a group
  function goPage(p) { page = p; info = null; if (p === 2) { mode = "group"; slot = entrySlot(T().id); } render(); }
  function tabsHtml(list, active, tabW) {
    const tabs = PAGE_ORDER.map(i => [list[i], i]).map(([t, i]) => `<span class="tl-tab${i === active ? " is-active" : ""}" data-tl-tab="${i}" style="width:${tabW(t)}px">${esc(t.label)}</span>`).join("");
    return `<nav class="tl-tabs" role="tablist">${glyph("lt")}${tabs}${glyph("rt")}</nav>`;
  }

  // wallet = the shared Player HUD template (tpl-player-hud, variants wallet + rpoint): MTX_PLAYER fills it and
  // Dev Tools > Wallet style restyles it, like every other page. Mounted once in build().
  function mountWallet() {
    const tpl = document.getElementById("tpl-player-hud");
    if (!tpl) return;
    const hud = tpl.content.firstElementChild.cloneNode(true);
    hud.classList.add("player-hud--wallet", "player-hud--rpoint", "tl-wallet");
    root.appendChild(hud);
    window.MTX_PLAYER?.render?.();
  }

  // hint bar per state, as in the Hub B frames (Figma order, not the standard sort)
  function hintsHtml() {
    const styleKeys = "zl+zr";   // Z / C = L2 / R2 switch style (Q / E = L1 / R1 are the tab keys)
    const tabKeys = "lt+rt";
    let h;
    if (page < 2) h = page === 0
      ? [["b", "Close"], ["a", { label: "Select", off: true }], ["y", "History"], ["x", { label: "Edit", off: true }], [tabKeys, "Tab"], ["menu", "Options"], ["view", "Friends"]]
      : [["b", "Close"], ["a", { label: "Select", off: true }], [tabKeys, "Tab"], ["menu", "Options"], ["view", "Friends"]];
    else if (mode === "grid") {   // card always open: RS level (perk), Y video (moves)
      h = [["b", "Cancel"], ["a", { label: "Equip", off: !owned(T().id, cell) }], ["dall", "Move"]];
      if (T().id === "perk") h.push(["lt+rt", "Level"]);   // Q / E (RS still works)
      else { if (isFam(cell)) h.push(["lt+rt", "Tier"]); h.push(["y", { label: VID()?.isOpen() ? "Hide video" : "Video", off: cell >= itemCount(T().id) }]); }
      h.push(["menu", "Options"], ["view", "Friends"]);
    }
    else if (mode === "group") {                                                                         // 741:60423 + every key it uses
      const locked = isLocked(style());
      h = [["b", "Close"], ["a", { label: locked ? "Locked" : "Open", off: locked }], ["dall", "Move"], ["rs", { label: "Save", off: !dirty() }], [styleKeys, "Style"], [tabKeys, "Tab"], ["menu", "Options"], ["view", "Friends"]];
    }
    else {                                                                                               // 741:61711 + every key it uses
      const locked = isLocked(style()), filled = preset()[T().id][slot] != null;
      h = [["b", "Back"], ["a", { label: "Select", off: locked }], ["dall", "Move"]];
      if (device() === "kb") h.push(["n1-4", "Slot"]);
      h.push(["x", { label: "Remove", off: locked || !filled }], ["rs", { label: "Save", off: !dirty() }], ["menu", "Options"], ["view", "Friends"]);
    }
    const item = ([k, v]) => k === "n1-4"   // keyboard number keys: no glyph in the set, plain keycap text
      ? `<span class="hint" data-hint-key="n1-4"><span class="glyph" aria-hidden="true">1-4</span><span>${esc(v)}</span></span>`
      : window.MTX_UI.hintItem(k, v);
    return `<nav class="hint-bar tl-hints">${h.map(item).join("")}</nav>`;
  }

  function tbdHtml() {
    const t = page === 0
      ? ["Profile", "Content not defined yet. Assumption: same profile card / preset summary as the current Profile tab."]
      : ["Inventory", "Content not defined yet. Assumption: reuses the Perk pattern (5 equipped slots left, 5x5 owned items right)."];
    return `<section class="tl-tbd" data-figma="719:32195 content TBD"><h2>${t[0]}</h2><p>${t[1]}</p></section>`;
  }

  // ---------------------------------------------------------------- Profile (view only; Figma Profile v2 C+ 727:82180, in the shell as 727:83049)
  // demo values from the Figma frame. Text boxes: [x, y, w] in frame px, line box = the Figma text node's line height.
  const PF_DATA = {
    name: "SX.MTX", title: "Lumpinee Rookie", tag: "SXMTX#1111", overall: 88, top: "TOP 12%", rank: "Ring Warrior III", season: "Season 01",
    levels: [["E", 24, "#ff0027", 100], ["S", 18, "#6100ff", 237], ["R", 31, "#f5e5b5", 375]],
    mastery: ["Phra Nakorn", "Lv 12", "Combo Emblem x7"],
    belts: ["#c8102e", "#1f4fbf", "#3a3a3a", "#2a8a4a"], beltCount: "5 / 35",
    record: [["Fights", "47", 1384, 202], ["W-L-D", "20-15-12", 1610, 202], ["K.O. Rate", "80%", 1384, 276], ["Win Rate", "43%", 1610, 276]],
    ranks: [["ring-warrior-3", "Ring Warrior III", "Current", 1384, 15], ["muay-thai-god", "Muay Thai God", "Highest", 1620, 13]],
    achCount: "4 / 35", ach: [[1385, "Wai Khru"], [1507, "First Step"], [1630, "Clinch King"], [1752, "Stadium Climber"]],
    best: [["Fastest K.O.", "0:42", 674, 659], ["Win Streak", "9", 714, 700], ["Highest Combo", "14", 754, 751]],
    last: { head: "Last fight · Ranked", result: "WIN", stats: [["Method", "K.O."], ["Round", "2"], ["Time", "1:42"]] }
  };
  function profileHtml() {
    const D = PF_DATA, PI = IMG + "profile/";
    const t = (cls, x, y, txt, w) => `<span class="tl-pf__t ${cls}" style="left:${x}px;top:${y}px${w ? `;width:${w}px` : ""}">${esc(txt)}</span>`;
    const r = (x, y, w) => `<i class="tl-pf__rule" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
    const lbl = (x, y, txt) => t("tl-pf__lbl", x, y, txt);
    const card = `<div class="tl-pf__card" data-figma="727:83051"><img class="tl-pf__tex" src="${PI}pf-card-tex.png" alt=""></div>
      ${t("tl-pf__name", 84, 216, D.name)}${t("tl-pf__title", 84, 272, D.title)}${lbl(84, 298, D.tag)}
      ${r(84, 338, 412)}${lbl(84, 358, "Overall")}${t("tl-pf__ovr", 84, 374, D.overall)}${t("tl-pf__v24", 334, 420, D.top)}${lbl(334, 462, D.rank)}${lbl(334, 482, D.season)}
      ${r(84, 576, 412)}${lbl(84, 594, "Style levels")}
      <div class="tl-pf__strip" data-figma="727:82976"></div>
      ${D.levels.map(([k, v, c, x], i) => `<i class="tl-pf__chip${k === "R" ? " is-light" : ""}" style="left:${x}px;background:${c}">${k}</i>${t("tl-pf__lv", x + 48, 640, v)}${i < 2 ? `<i class="tl-pf__div" style="left:${[221, 359][i]}px"></i>` : ""}`).join("")}
      ${r(84, 730, 412)}${lbl(84, 748, "Style mastery")}${t("tl-pf__v24", 84, 768, D.mastery[0])}${t("tl-pf__v24 is-r", 296, 768, D.mastery[1], 175)}${lbl(84, 808, D.mastery[2])}
      ${r(84, 836, 412)}${lbl(84, 854, "Championship belts")}${t("tl-pf__cnt is-r", 369, 852, D.beltCount, 100)}
      ${D.belts.map((c, i) => `<i class="tl-pf__belt" style="left:${84 + i * 88}px"><b style="background:${c}"></b></i>`).join("")}`;
    const panel = `<div class="tl-pf__panel" data-figma="727:83100"><img class="tl-pf__tex" src="${PI}pf-panel-tex.png" alt=""></div>
      ${t("tl-pf__head", 1384, 165, "Fight record")}
      ${D.record.map(([l, v, x, y]) => lbl(x, y, l) + t("tl-pf__v32", x, y + 18, v)).join("")}
      ${r(1384, 356, 452)}${lbl(1384, 372, "Competitive rank")}
      ${D.ranks.map(([img, n, s, x, fs]) => `<img class="tl-pf__badge" src="${IMG}badges/${img}.webp" style="left:${x}px" alt="${esc(n)}">${t("tl-pf__rk" + (fs === 15 ? " is-lg" : ""), x + 76, 410, n)}${lbl(x + 76, 432, s)}`).join("")}
      ${r(1384, 476, 452)}${lbl(1384, 492, "Achievements")}${t("tl-pf__cnt is-r", 1727, 490, D.achCount, 100)}
      ${D.ach.map(([x, n], i) => `<img class="tl-pf__ach" src="${LO}pf-ach-${i + 1}.svg" style="left:${x}px" alt="${esc(n)}" title="${esc(n)}">`).join("")}
      ${r(1384, 628, 452)}${lbl(1384, 644, "Career best")}
      ${D.best.map(([l, v, y, vy], i) => (i ? r(1384, y - 16, 452) : "") + t("tl-pf__bl", 1384, y, l) + t("tl-pf__v22 is-r", 1725, vy, v, 100)).join("")}
      ${r(1384, 790, 452)}${lbl(1384, 806, "Most played")}
      <div class="tl-pf__last" data-figma="728:84155"><img src="${PI}pf-last-deco.png" alt=""></div>
      ${t("tl-pf__lhead is-c", 1384, 849, D.last.head, 452)}${t("tl-pf__win is-c", 1384, 862, D.last.result, 452)}${r(1444, 918, 332)}
      ${D.last.stats.map(([l, v], i) => t("tl-pf__ml is-c", Math.round(1444 + i * 110.5), 931, l, 50) + t("tl-pf__mv is-c", Math.round(1494 + i * 110.5), 926, v, 61)).join("")}`;
    return `<section class="tl-pf" data-figma="727:83049 Profile content"><img class="tl-pf__fighter" src="${IMG}cc-character.webp" alt="Fighter">${card}${panel}</section>`;
  }

  // ---------------------------------------------------------------- hub
  function switcherHtml() {
    const s = style();
    const slices = STYLES.map((st, i) => `<div class="tl-slice${i === styleIdx ? " is-sel" : ""}${isLocked(st) ? " is-locked" : ""}" data-tl-style="${i}" style="--st:${st.color}">
        <i class="tl-slice__shape"></i><span class="tl-slice__icon"><img src="${LO}slice-${st.id}.svg" alt=""><img class="is-sel" src="${LO}slice-${st.id}-sel.svg" alt=""></span><span class="tl-slice__name">${esc(st.name)}</span>
        ${isLocked(st) ? `<img class="tl-slice__lock" src="${SV}icon-lock-sm.svg" alt="Locked">` : ""}</div>`).join("");
    return `<div class="tl-sw" data-figma="726:41277 style-switcher (slanted slices)">
      <img class="tl-sw__icon" data-tl-swicon src="${SV}style-${s.id}-sel.svg" alt="">
      <div class="tl-sw__name" data-tl-swname>${esc(s.name)}</div>
      <div class="tl-slices">${slices}</div></div>`;
  }

  // Special / Decisive D-pad cluster (563 x 640 art box, drawn at .72 on the hub). The centre hint is
  // MTX / D-pad Keys 740:131190 (num-pad 88 px at 158,158 of the .72 box), placed by hubHtml().
  function clusterHtml(tid, x, y, scale) {
    const loadout = preset()[tid];
    const slots = DPAD.map((d, si) => {
      const v = loadout[si];
      const art = v == null ? `${LO}${ART[tid]}-slot-empty.svg` : slotArt(tid, v);
      return `<div class="tl-slot" data-tl-type="${TYPES.findIndex(t => t.id === tid)}" data-tl-slot="${si}" style="left:${d.x}px;top:${d.y}px">
        <img src="${art}" alt="${v == null ? "Empty" : esc(MOVES[tid][v])}"></div>`;
    }).join("");
    return `<div class="tl-cl" style="left:${x}px;top:${y}px;transform:scale(${scale})">
      <img class="tl-cl__dpad" src="${LO}${ART[tid]}-dpad.svg" alt="">${slots}</div>`;
  }

  // level 1: group focus ring (741:67733 / 741:68070 / 741:68407: 5 px stroke, white 4 % fill, 4 px inset).
  // After A the group ring goes; the slot ring shows on level 2 and stays on the slot being filled on level 3 (user).
  function ringHtml() {
    if (page !== 2) return "";
    if (mode === "group") {
      const { c: [gx, gy], s: gs } = GROUP_GEO[T().id], gh = gs / 2;
      return `<svg class="tl-dring tl-gring" data-k="g${type}" style="left:${gx - gh}px;top:${gy - gh}px" width="${gs}" height="${gs}" viewBox="0 0 ${gs} ${gs}">
        <path d="M${gh} 4L${gs - 4} ${gh}L${gh} ${gs - 4}L4 ${gh}Z" fill="#fff" fill-opacity=".04" stroke="url(#tlPrism)" stroke-width="5"/></svg>`;
    }
    const g = SLOT_GEO[T().id], [cx, cy] = g.c[slot], s = g.ring + 4, h = s / 2;
    return `<svg class="tl-dring" data-k="s${type}-${slot}" style="left:${cx - h}px;top:${cy - h}px" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <path d="M${h} 2L${s - 2} ${h}L${h} ${s - 2}L2 ${h}Z" fill="none" stroke="url(#tlPrism)" stroke-width="4"/></svg>`;
  }

  // black 70 % diamond over every slot except the one being filled, only while choosing in the grid
  const DIM_SIZE = { special: 135, decisive: 135, signature: 135, perk: 152 };
  function dimHtml() {
    if (mode !== "grid") return "";   // only while a slot was picked (A) and the grid is choosing for it
    return TYPES.map((t, ti) => SLOT_GEO[t.id].c.map(([cx, cy], si) => {
      if (ti !== type || si === slot) return "";   // other groups are faded to 30 % instead (741:62919)
      const d = DIM_SIZE[t.id];
      return `<i class="tl-sdim" style="left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px"></i>`;
    }).join("")).join("");
  }

  function numPadHtml(x, y) {
    const kb = device() === "kb";
    return `<img class="tl-numpad" src="${LO}dpad-keys-${kb ? "kb" : "pad"}.svg" style="left:${x}px;top:${y}px" width="88" height="88" alt="${kb ? "Keys 1-4" : "D-pad"}" data-figma="740:131190 ${kb ? "Device=Keyboard" : "Device=Controller"}">`;
  }

  function hubHtml() {
    const p = preset(), locked = isLocked(style()), pi = TYPES.findIndex(t => t.id === "perk");
    const perks = p.perk.map((v, i) => {
      const [cx, cy] = SLOT_GEO.perk.c[i];
      return `<div class="tl-pc" data-tl-type="${pi}" data-tl-slot="${i}" style="left:${cx}px;top:${cy}px">${v == null
        ? `<img src="${LO}hub-empty-diamond.svg" width="152" height="152" alt="Empty">` : perkArt(v, "hub")}</div>`;
    }).join("");
    const t = T();
    // levels 2-3: the other three groups drop to 30 % (741:61711 / 741:62919)
    const grp = (id, html) => `<div class="tl-grp${mode !== "group" && id !== t.id ? " is-faded" : ""}" data-g="${id}">${html}</div>`;
    return `<div class="tl-hub${locked ? " is-locked" : ""}"><div class="tl-hub__body">
      ${grp("special", clusterHtml("special", 168, 290, .72) + numPadHtml(326, 448))}
      ${grp("decisive", clusterHtml("decisive", 583, 290, .72) + numPadHtml(741, 448))}
      ${grp("signature", clusterHtml("signature", 2, 560.5, .72))}
      ${grp("perk", perks)}
      <div class="tl-vl" style="left:92px;top:290px;color:${C_SPECIAL}">Special Move<small>${count(p.special)} / 4 equipped</small></div>
      <div class="tl-vl" style="left:513px;top:290px;color:${C_DECISIVE}">Decisive Move<small>${count(p.decisive)} / 4 equipped</small></div>
      <div class="tl-vl tl-vl--sg" style="left:289px;top:880px;color:${C_SIGNATURE}">Signature Move<small>${count(p.signature)} / 4 equipped</small></div>
      <div class="tl-vl tl-vl--pk" style="left:499px;top:880px;width:404px;text-align:center;color:#f6f1eb">Perk<small>${count(p.perk)} / 4 equipped</small></div>
      ${dimHtml()}${ringHtml()}
    </div>
    <div class="tl-head tl-ghead" data-tl-right><b>${esc(t.grid)}</b></div>
    <div class="tl-gv${mode === "grid" ? "" : " is-idle"}" data-tl-gv data-tl-right data-figma="grid-col (3 rows visible, scrolls)">${gridHtml()}</div>
    <div class="scrollbar tl-gsb" data-tl-gsb aria-hidden="true"><span class="scrollbar__thumb"></span></div>
    ${t.id === "perk" ? perkPanelHtml() : detailHtml()}</div>`;
  }

  // ---------------------------------------------------------------- right side
  // perk card (old list card 942 x 198; the Hub B panel 1032,800 828 x 174 is the same card at .879)
  function perkCardHtml(v, si) {
    if (v == null) return `<div class="tl-card is-empty" data-tl-slot="${si}">
        <div class="tl-empty"><span class="tl-empty__slot">Slot 0${si + 1}</span><i class="tl-empty__box"></i><i class="tl-empty__plus"></i>
        <span class="tl-empty__t">Empty</span><span class="tl-empty__h">Select a perk from the collection</span></div></div>`;
    const p = PERKS[v], [kname, kcol] = KIND[p.kind];
    return `<div class="tl-card">
      <div class="tl-card__art">${perkArt(v, "list")}</div>
      <span class="tl-card__kind" style="color:${kcol}">${kname} · ${p.locked ? "Locked" : `Lv ${p.lv}${p.own > p.lv ? ` / ${p.own}` : ""}`}</span>
      <span class="tl-card__name">${esc(p.name)}</span><i class="tl-card__rule"></i>
      <p class="tl-card__fx">${fxHtml(p.fx[p.lv - 1])}</p>
      ${p.lv === 3 ? `<p class="tl-card__draw">${esc(p.draw)}</p>` : ""}</div>`;
  }
  function perkPanelHtml() {
    const v = mode === "grid" ? (cell < PERKS.length ? cell : null) : preset().perk[slot];
    return `<div class="tl-ppanel" data-tl-right data-figma="Perk panel 1032,800 (740:113115 / 740:114115)">${perkCardHtml(v, slot)}</div>`;
  }

  // ---------------------------------------------------------------- slot tag on equipped grid cells (top right, 32 x 32)
  // Special / Decisive: the D-pad with the slot's arm lit (gamepad) or its number key 1-4 (keyboard, as D-pad Keys).
  // Signature and Perk (no button of their own): the 4-diamond position chip with the slot lit (user 2026-11-13).
  // Perk (passive, no button): the 4-diamond group with the slot's diamond lit (top / right / left / bottom).
  const PERK_POS = ["top", "right", "left", "bottom"];
  const DIR_BTN = { up: "du", left: "dl", right: "dr", down: "dd" };   // D-pad glyphs of the hint bar component
  // Perk has no button: a white key-shaped chip in the same cut-out style, the slot's diamond knocked out of it
  // position chip (Perk and Signature): pos = top | right | left | bottom
  function posIcon(pos) {
    const si = PERK_POS.indexOf(pos);
    const c = { top: [12, 5.5], right: [18.5, 12], left: [5.5, 12], bottom: [12, 18.5] };
    return `<svg class="tl-tag__perk" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><defs><mask id="tlPm${si}"><rect width="24" height="24" fill="#fff"/>${PERK_POS.map((p, i) => { const [x, y] = c[p];
      return i === si ? `<path d="M${x} ${y - 4.2}L${x + 4.2} ${y}L${x} ${y + 4.2}L${x - 4.2} ${y}Z" fill="#000"/>` : `<path d="M${x} ${y - 3.6}L${x + 3.6} ${y}L${x} ${y + 3.6}L${x - 3.6} ${y}Z" fill="none" stroke="#000" stroke-width="1.3"/>`; }).join("")}</mask></defs>
      <rect width="24" height="24" rx="3" fill="#f6f1eb" mask="url(#tlPm${si})"/></svg>`;
  }
  function slotTag(tid, si) {
    const kb = device() === "kb", dir = DPAD[si].dir;
    let icon, label;
    if (tid === "perk") { icon = posIcon(PERK_POS[si]); label = `Perk slot ${si + 1} (${PERK_POS[si]})`; }
    else if (tid === "signature") { icon = posIcon({ up: "top", down: "bottom" }[dir] || dir); label = `Signature ${DIR_NAME[dir]}`; }   // same chip as Perk (user 2026-11-13)
    else { icon = glyph(kb ? String(si + 1) : DIR_BTN[dir]); label = `${DIR_NAME[dir]} (${si + 1})`; }
    return `<span class="tl-tag" title="Equipped on ${label}" aria-label="Equipped on ${label}">${icon}</span>`;
  }

  function gridHtml() {
    const tid = T().id, loadout = preset()[tid], n = itemCount(tid), choosing = mode === "grid", kb = device() === "kb";
    let cells = "";
    for (let i = 0; i < 25; i++) {
      const x = (i % 5) * 168, y = Math.floor(i / 5) * 168;
      if (i >= n) { cells += `<div class="tl-cell tl-cell--null" style="left:${x}px;top:${y}px" data-tl-cell="${i}">${choosing && cell === i ? `<i class="tl-focus tl-focus--cell" data-k="c${type}-${i}"></i>` : ""}</div>`; continue; }
      const lock = !owned(tid, i), eq = loadout.indexOf(i);
      const art = tid === "perk"
        ? `<div class="tl-cell__art">${perkArt(i, "grid")}</div>`
        : `<img class="tl-cell__move" src="${tileArt(tid, i)}" alt="">`;
      const mark = eq >= 0 ? slotTag(tid, eq) : "";   // which slot it is equipped on (user 2026-11-13)
      cells += `<div class="tl-cell${lock ? " is-locked" : ""}" style="left:${x}px;top:${y}px" data-tl-cell="${i}">
        <i class="tl-cell__base"></i><svg class="abs" style="inset:0" viewBox="0 0 156 156"><path d="M1 124.5H155V127.5H1Z M155 124.5H99.74C129.15 124.5 155 104.6 155 80V124.5Z" fill="#9a9ea8"/></svg>
        <span class="tl-cell__bar">${esc(itemName(tid, i))}</span>
        ${eq >= 0 ? `<i class="tl-cell__eq" style="--tc:${T().color || C_GOLD}"></i>` : ""}
        ${lock ? `<i class="tl-cell__dim"></i>` : ""}${art}
        ${lock ? `<img class="tl-cell__lock" src="${LO}lock.svg" alt="Locked">` : ""}${mark}
        ${choosing && cell === i ? `<i class="tl-focus tl-focus--cell" data-k="c${type}-${i}"></i>` : ""}</div>`;
    }
    return `<div class="tl-grid">${cells}</div>`;
  }

  // move panel (detail 740:119765 / 740:118193): glow in the category colour + Flower Thai tile (.07)
  function detailHtml() {
    const t = T(), tid = t.id, loadout = preset()[tid], dir = DIR_NAME[DPAD[slot].dir];
    const where = tid === "signature" ? dir : `${dir} (${slot + 1})`;
    let name, text, v;
    if (mode === "grid") {
      v = cell < itemCount(tid) ? cell : null;
      name = v == null ? "Locked" : MOVES[tid][v];
      // skill data: description when owned, else where to get it (Skill Tree of this style)
      text = v == null ? "Not available yet." : owned(tid, v) ? moveDesc(tid, v) : `Locked · unlock it in the ${style().name} Skill Tree`;
    } else {
      v = loadout[slot];
      name = v == null ? "Empty slot" : MOVES[tid][v];
      text = v == null ? `${where}. Press A to choose a ${t.label}.` : `Equipped on ${where}`;
    }
    const icon = v == null ? slotArt(tid, 0) : tid !== "signature" && v % 2 === 0 ? `${LO}${ART[tid]}-detail.svg` : slotArt(tid, v);
    return `<section class="tl-mdet" data-tl-right style="--tc:${t.color}" data-figma="detail 1032,800 828 x 200"><img src="${icon}" alt=""><h3>${esc(name)}</h3><p>${esc(text)}</p></section>`;
  }

  // Info card (MTX / Perk Info Card 719:89368): ONE persistent element, built once in build(). While it is open,
  // moving to another cell lerps it to that cell (CSS transition on left) and swaps its text in place with a crossfade.
  // Perks show the level pager (RS); moves show kind, name and description.
  let infoItem = "", infoLv = 0;
  function infoShellHtml() {
    // global skill card (components/node-detail.js), same as the Skill Tree (user 2026-11-18); was skill-info.js
    // no data-bind="sdPrimary" on this CTA: that hook is the Skill Tree card (app.js routes its clicks / hold to the tree)
    return window.MTX_UI.nodeDetail.html({ cls: "tl-info", attrs: "data-tl-info hidden" }).replace(" data-bind=\"sdPrimary\"", "");   // Equip = Accept Button / 06 Pill (740:114191)   // shared component (components/skill-info.js)
  }

  function infoData() {
    const tid = T().id;
    if (tid === "perk") {
      const p = PERKS[cell], [kind, col] = KIND[p.kind];
      return { kind, col, badge: p.locked ? "Locked" : preset().perk.includes(cell) ? `Equipped Lv${p.lv} · Owned Lv${p.own}` : "Owned Lv" + p.own, name: p.name, levels: true, lv: info.lv, fx: p.fx[info.lv - 1], draw: info.lv === 3 ? p.draw : "", own: !p.locked };
    }
    const own = owned(tid, cell);
    return { kind: T().grid, col: T().color, badge: own ? "Owned" : "Locked", name: MOVES[tid][cell], levels: false, lv: 0, fx: moveDesc(tid, cell), draw: "", own };
  }

  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function syncInfo() {
    const el = root?.querySelector("[data-tl-info]");
    if (!el) return;
    if (page === 2 && mode === "grid" && !info) info = { lv: tabLv(cell) };   // grid: card always on
    if (!(info && page === 2 && mode === "grid" && cell < itemCount(T().id))) { el.hidden = true; infoItem = ""; return; }
    const d = infoData(), left = 1032 + (cell % 5) * 168 - 16 - 513, item = T().id + ":" + cell, opening = el.hidden;
    el.hidden = false;
    if (opening) { el.style.transition = "none"; el.style.left = left + "px"; void el.offsetWidth; el.style.transition = ""; restart(el, "is-in"); }
    else el.style.left = left + "px";
    // card content from the skill data (MTX_UI.nodeDetail.model); CTA = this loadout's equip state
    const tid = T().id, sid = style().id, inSlot = preset()[tid].includes(cell);
    const cta = !d.own ? { label: "Locked", state: "locked" }
      : d.levels ? (inSlot && PERKS[cell].lv === d.lv ? { label: "Equipped", state: "done" } : d.lv <= PERKS[cell].own ? { label: "Equip", state: "equip" } : { label: "Locked", state: "locked" })
      : isFam(cell) ? famCta(sid, inSlot)   // decisive family: Tier tab shown vs the tier equipped / owned
      : inSlot ? { label: "Equipped", state: "done" } : { label: "Equip", state: "equip" };
    const tabs = d.levels || isFam(cell);
    const m = window.MTX_UI.nodeDetail.model(sid, IDS[tid][cell], { lv: tabs ? info.lv : 0, tierTabs: true, cta, hints: [["b", "Close"]] });
    if (isFam(cell)) d.lv = info.lv;   // crossfade on a Tier change too
    if (m) window.MTX_UI.nodeDetail.render(el, m);
    el.querySelector("[data-i-equip]").classList.toggle("is-off", !d.own);
    if (!opening && item !== infoItem) restart(el, "is-swap");        // another item: crossfade every text
    else if (!opening && d.lv !== infoLv) restart(el, "is-lv");       // same item, other level: crossfade the effect
    infoItem = item; infoLv = d.lv;
  }

  // grid scroll: keep the position across re-renders, bring the focused row into view, keep the scrollbar in sync
  function syncGrid(prevType) {
    const gv = root.querySelector("[data-tl-gv]"), bar = root.querySelector("[data-tl-gsb]");
    if (!gv) return;
    if (prevType !== type) gscroll = 0;
    gv.scrollTop = gscroll;
    const sync = () => { gscroll = gv.scrollTop; window.MTX_UI?.syncScrollbar?.(gv, bar, { side: "right", gap: 0 }); };
    gv.addEventListener("scroll", sync, { passive: true });
    if (mode === "grid") {
      const top = Math.floor(cell / 5) * 168, want = top < gv.scrollTop ? top : top + 168 > gv.scrollTop + gv.clientHeight ? top + 168 - gv.clientHeight : gv.scrollTop;   // row + its 6 px focus margin
      if (want !== gv.scrollTop) gv.scrollTo({ top: want, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    sync();
  }
  //#endregion

  //#region [Render]
  function render() {
    if (!root) return;
    syncLists();
    const hub = page === 2;
    const body = tabsHtml(PAGES, page, x => x.w) + (page === 0 ? profileHtml() : page === 1 ? tbdHtml() : hubHtml());
    root.querySelector("[data-tl-hubart]").hidden = !hub;
    const sw = root.querySelector("[data-tl-sw]");
    sw.hidden = !hub;
    if (hub && !sw.firstChild) sw.innerHTML = switcherHtml();
    const oldRings = ringSnapshot();
    root.querySelector("[data-tl-view]").innerHTML = body + hintsHtml();
    animateRings(oldRings);
    const prevType = lastType;
    animate();
    if (hub) syncGrid(prevType);
    syncInfo();
    updateHubArt();
    lastDevice = device();
  }

  // focus ring move = Skill Tree focus (.tnode__focus): the new ring grows 90 -> 100 % and fades in, the old one
  // shrinks and fades out, both .14 s ease-out (CSS tl-ring-in / tl-ring-out)
  function ringSnapshot() {
    return [...root.querySelectorAll("[data-tl-view] [data-k]")].map(el => {
      const cell = el.classList.contains("tl-focus--cell") ? el.parentElement : null;
      return { k: el.dataset.k, el: el.cloneNode(true), left: cell ? cell.offsetLeft - 5 : null, top: cell ? cell.offsetTop - 5 : null };
    });
  }
  let quietRings = false;   // dev set(): jump without the ring animation (captures)
  function animateRings(old) {
    if (quietRings) return;
    const now = [...root.querySelectorAll("[data-tl-view] [data-k]")], keys = new Set(now.map(el => el.dataset.k));
    if (!old.length && !now.length) return;
    now.forEach(el => { if (!old.some(o => o.k === el.dataset.k)) el.classList.add("is-in"); });
    old.forEach(o => {
      if (keys.has(o.k)) return;
      const isCell = o.left != null, host = root.querySelector(isCell ? "[data-tl-view] .tl-grid" : "[data-tl-view] .tl-hub__body");
      if (!host) return;
      const g = o.el; g.classList.remove("is-in"); g.classList.add("is-out"); g.removeAttribute("data-k");
      if (isCell) Object.assign(g.style, { left: o.left + "px", top: o.top + "px", right: "auto", bottom: "auto", width: "166px", height: "166px" });
      host.appendChild(g);
      g.addEventListener("animationend", () => g.remove(), { once: true });
      setTimeout(() => g.remove(), 400);
    });
  }

  // opacity-only, and only when the view changes: a new page fades in, a new category fades the right side,
  // slots <-> grid fades the grid + panel. Plain focus moves re-render without any animation.
  let lastPage = -1, lastType = -1, lastMode = "", lastDevice = "";
  function animate() {
    const v = root.querySelector("[data-tl-view]");
    v.classList.remove("tl-anim-x", "tl-anim-cat", "tl-anim-mode");
    void v.offsetWidth;   // restart the keyframes
    if (page !== lastPage) v.classList.add("tl-anim-x");
    else if (page === 2 && type !== lastType) v.classList.add("tl-anim-cat");
    else if (page === 2 && mode !== lastMode) v.classList.add("tl-anim-mode");
    lastPage = page; lastType = type; lastMode = mode;
  }

  function updateHubArt() {
    const s = style();
    const icon = root.querySelector("[data-tl-bgicon]");
    if (icon) icon.src = `${SV}style-${s.id}-sel.svg`;
  }

  // switch style in place so the slices animate (old one shrinks, new one slides open, .2 s)
  function setStyle(i) {
    styleIdx = (i + STYLES.length) % STYLES.length;
    const sw = root.querySelector("[data-tl-sw]");
    sw.querySelectorAll(".tl-slice").forEach((el, k) => el.classList.toggle("is-sel", k === styleIdx));
    const s = style();
    sw.querySelector("[data-tl-swname]").textContent = s.name;
    sw.querySelector("[data-tl-swicon]").src = `${SV}style-${s.id}-sel.svg`;
    render();
    rumble(30, .15);
  }
  //#endregion

  //#region [Input]
  // left side: move inside the focused group first (D-pad / diamond neighbours), and only at its edge jump to the
  // nearest slot of the next group in that direction (Special <-> Decisive on top, Signature <-> Perk below).
  // level 1: move between the four groups (centre of each group, 45 deg cone)
  function moveGroups(dir) {
    const [cx, cy] = GROUP_GEO[T().id].c, v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    let best = -1, bestScore = Infinity;
    TYPES.forEach((t, ti) => {
      const [x, y] = GROUP_GEO[t.id].c, along = (x - cx) * v[0] + (y - cy) * v[1], side = Math.abs((x - cx) * v[1] + (y - cy) * v[0]);
      if (ti === type || along < 8 || side > along) return;
      if (along + side * 2 < bestScore) { bestScore = along + side * 2; best = ti; }
    });
    if (best >= 0) { type = best; slot = entrySlot(T().id); }
  }

  // level 2: move between the slots of the opened group only
  function moveSlots(dir) {
    const [cx, cy] = SLOT_GEO[T().id].c[slot];
    const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    const pick = (same, cone) => {
      let best = null, bestScore = Infinity;
      TYPES.forEach((t, ti) => {
        if ((ti === type) !== same) return;
        SLOT_GEO[t.id].c.forEach(([x, y], si) => {
          const dx = x - cx, dy = y - cy, along = dx * v[0] + dy * v[1], side = Math.abs(dx * v[1] + dy * v[0]);
          if (along < 8 || side > along * cone) return;   // only slots inside the cone of that direction
          const score = along + side * 2;
          if (score < bestScore) { bestScore = score; best = [ti, si]; }
        });
      });
      return best;
    };
    let best = pick(true, 1.2);
    if (false) {   // cross-group jumps retired: groups are picked on level 1   // edge of the group: the next group in a 45 deg cone, landing on its slot nearest to this one
      const g = pick(false, 1);
      if (g) {
        const c = SLOT_GEO[TYPES[g[0]].id].c;
        let d = Infinity;
        c.forEach(([x, y], si) => { const dd = Math.hypot(x - cx, y - cy); if (((x - cx) * v[0] + (y - cy) * v[1]) > 0 && dd < d) { d = dd; best = [g[0], si]; } });
      }
    }
    if (best) [type, slot] = best;
  }

  function moveGrid(dir) {
    let c = cell;
    if (dir === "left" && c % 5 > 0) c--;
    else if (dir === "right" && c % 5 < 4) c++;
    else if (dir === "up" && c >= 5) c -= 5;
    else if (dir === "down" && c + 5 < 25) c += 5;
    if (c !== cell) { cell = c; if (info) info.lv = tabLv(c); }
  }

  // grid = the skill card is always shown for the focused cell (no Y; user 2026-11-18). Perk card opens on its equipped / owned level.
  function enterGrid() {
    const v = preset()[T().id][slot];
    cell = v != null ? v : 0;
    mode = "grid";
    info = { lv: tabLv(cell) };
  }
  // the tab the card opens on: perk Lv (equipped / owned), decisive family Tier (equipped / top owned); 0 = no tabs
  const isFam = c => T().id === "decisive" && !!famOf(style().id, IDS.decisive[c]);
  function tabLv(c) {
    if (T().id === "perk") return c < PERKS.length ? PERKS[c].lv : 0;
    if (isFam(c)) { const sid = style().id, fid = IDS.decisive[c]; return famTier(sid, fid) || 1; }
    return 0;
  }
  function famCta(sid, inSlot) {
    const fid = IDS.decisive[cell], t = info?.lv || 1;
    if (inSlot && famTier(sid, fid) === t) return { label: "Equipped", state: "done" };
    return t <= famTop(sid, fid) ? { label: "Equip", state: "equip" } : { label: "Locked", state: "locked" };
  }
  const tabCount = c => T().id === "perk" ? 3 : isFam(c) ? famOf(style().id, IDS.decisive[c]).tiers.length : 0;
  // Y in the grid = skill video (moves), same Video Panel as the Skill Tree (components/node-detail.js)
  const VID = () => window.MTX_UI?.nodeDetail?.video;
  function closeVideo() { if (VID()?.isOpen()) VID().close(true); }
  function openVideo() {
    const tid = T().id;
    if (tid === "perk" || cell >= itemCount(tid)) return false;
    const n = window.MTX_UI.nodeDetail.model(style().id, IDS[tid][cell])?.node;
    if (!n) return false;
    VID().open(root, { name: n.name, kind: n.kind, label: T().label, src: n.video || "" });
    return true;
  }

  function equip() {
    const tid = T().id, loadout = preset()[tid];
    if (!owned(tid, cell)) { rumble(80, .4); return false; }
    const was = loadout.indexOf(cell);
    if (was >= 0 && was !== slot) loadout[was] = loadout[slot];   // already in another slot: swap
    loadout[slot] = cell;
    if (tid === "perk") {   // level = the info card tab when it is open and owned, else the highest owned
      const sid = style().id, p = PERKS[cell];
      (EQ_LV[sid] ||= {})[p.id] = info && info.lv >= 1 && info.lv <= p.own ? info.lv : p.own;
    }
    if (isFam(cell)) { const sid = style().id, fid = IDS.decisive[cell], top = famTop(sid, fid); (EQ_LV[sid] ||= {})[fid] = info && info.lv >= 1 && info.lv <= top ? info.lv : top; }
    closeVideo();
    rumble(60, .25);
    return true;
  }

  const DIRS = ["up", "down", "left", "right"];
  function handle(a) {
    if (a === "menu") { window.MTX_OPTIONS?.open?.(); return; }   // Start / Tab: Options, everywhere
    if (a === "view") { window.MTX_FRIENDS?.open?.(); return; }   // View / F: Friends, everywhere
    // ---- Profile / Inventory
    if (page < 2) {
      if (a === "lt" || a === "rt") goPage(stepPage(a));
      else if (a === "back") close();
      else if (a === "y" && page === 0) { close(); api?.getScreen?.("history")?.openFromProfile?.(); }   // Match History; its Back reopens Profile
      return;
    }
    // ---- hub: info card open
    // ---- hub: grid (skill card always open)
    if (mode === "grid") {
      if (VID()?.isBlocking?.()) { if (a === "back" || a === "y") { closeVideo(); render(); } return; }   // popup video takes every input
      if (DIRS.includes(a)) { moveGrid(a); if (VID()?.isOpen()) { closeVideo(); openVideo(); } }
      else if (a === "back") { closeVideo(); mode = "slots"; info = null; }
      else if ((a === "lt" || a === "rt") && tabCount(cell)) {   // Q / E (the card's bump keys): previous / next Lv or Tier tab
        const n = tabCount(cell); if (!info) info = { lv: 1 };
        info.lv = (info.lv - 1 + (a === "lt" ? n - 1 : 1)) % n + 1;
      }
      else if (a === "rs" && tabCount(cell)) { if (!info) info = { lv: 1 }; info.lv = info.lv % tabCount(cell) + 1; }   // RS (keyboard R): Lv / Tier tab
      else if (a === "a") { if (equip()) { info = null; mode = "slots"; } }
      else if (a === "y") { if (VID()?.isOpen()) closeVideo(); else if (!openVideo()) return; }
      else return;
      render(); return;
    }
    // ---- hub level 1: group select
    if (mode === "group") {
      if (a === "lt" || a === "rt") { guard(() => goPage(stepPage(a))); return; }
      if (a === "lb" || a === "rb") { guard(() => setStyle(styleIdx + (a === "lb" ? -1 : 1))); return; }
      if (a === "rs") { if (dirty()) { saveLoadout(); render(); } return; }
      if (DIRS.includes(a)) moveGroups(a);
      else if (a === "a") { if (isLocked(style())) { rumble(80, .4); return; } mode = "slots"; slot = entrySlot(T().id); }
      else if (a === "back") { guard(close); return; }
      else return;
      render(); return;
    }
    // ---- hub level 2: slots of the opened group
    if (a === "rs") { if (dirty()) { saveLoadout(); render(); } return; }   // RS / keyboard R: save this loadout
    if (DIRS.includes(a)) moveSlots(a);
    else if (/^n[1-4]$/.test(a)) slot = +a[1] - 1;                 // keyboard 1-4 = that slot of the focused category
    else if (a === "a") { if (isLocked(style())) { rumble(80, .4); return; } enterGrid(); }
    else if (a === "x") { if (isLocked(style()) || preset()[T().id][slot] == null) return; preset()[T().id][slot] = null; rumble(40, .2); }
    else if (a === "back") mode = "group";                         // B: back to group select, same group
    else return;
    render();
  }

  // keyboard: Z / C = LB / RB (style), Q / E = LT / RT (tabs), R = RS (info level), 1-4 = slot
  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right",
    Enter: "a", " ": "a", Escape: "back", Backspace: "back", x: "x", y: "y", f: "view", z: "lb", c: "rb", q: "lt", e: "rt", r: "rs", Tab: "menu",
    1: "n1", 2: "n2", 3: "n3", 4: "n4"
  };
  // Friends / Options / dialogs opened from here sit above (z 996) and take the keys themselves
  const otherOpen = () => window.MTX_FRIENDS?.isOpen?.() || window.MTX_OPTIONS?.isOpen?.() || window.MTX_SETTINGS?.isOpen?.() || window.MTX_UI?.modal?.isOpen?.() || window.MTX_UI?.dialog?.isOpen?.();
  function onKey(e) {
    if (!open || otherOpen()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
    if (!k || (e.repeat && !/^(up|down|left|right)$/.test(k))) return;
    api?.setDevice?.("kb");
    handle(k);
  }
  // gamepad (app.js press): b4 LB, b5 RB, b6 LT, b7 RT, b11 RS
  function pad(key, action) {
    const map = { b4: "lt", b5: "rt", b6: "lb", b7: "rb", b11: "rs", b8: "view" };   // L1 / R1 = tabs (Q / E), L2 / R2 = style (Z / C)
    handle(map[key] || action);
  }
  function onClick(e) {
    // skill card (node-detail.js) in the grid: CTA = Equip (A), Lv / Tier tabs and LB/RB bumps = pick the tab (RS), VIDEO badge = Y
    const card = mode === "grid" && e.target.closest("[data-tl-info]");
    if (card) {
      const tab = e.target.closest("[data-lv-tab]"), bump = e.target.closest(".nd__bump");
      if (e.target.closest("[data-i-equip]")) { handle("a"); return; }
      if (tab && info && tabCount(cell)) { info.lv = +tab.dataset.lvTab; render(); return; }
      if (bump && info && tabCount(cell)) { const n = tabCount(cell); info.lv = (info.lv - 1 + (bump.dataset.btn === "lt" ? n - 1 : 1)) % n + 1; render(); return; }
      if (e.target.closest(".nd__video")) { handle("y"); return; }
      return;
    }
    const t = e.target.closest("[data-tl-tab],[data-tl-style],[data-tl-slot],[data-tl-cell]");
    if (!t) return;
    if (t.dataset.tlTab != null) { const i = +t.dataset.tlTab; if (i === page) return; (page === 2 ? guard : f => f())(() => goPage(i)); return; }
    else if (t.dataset.tlStyle != null) { const i = +t.dataset.tlStyle; if (i !== styleIdx) guard(() => setStyle(i)); return; }
    else if (t.dataset.tlSlot != null && t.dataset.tlType != null && page === 2) {
      if (isLocked(style())) return;
      type = +t.dataset.tlType; slot = +t.dataset.tlSlot; info = null; enterGrid();
    }
    else if (t.dataset.tlCell != null && mode === "grid") { cell = +t.dataset.tlCell; if (equip()) { mode = "slots"; info = null; } }
    else return;
    render();
  }
  // the D-pad Keys hint and the equipped marks follow the input device (body[data-device], set by app.js)
  if (document.body) new MutationObserver(() => { if (open && page === 2 && device() !== lastDevice) render(); })
    .observe(document.body, { attributes: true, attributeFilter: ["data-device"] });
  //#endregion

  //#region [Open / close]
  function build() {
    root = document.createElement("div");
    root.className = "tl";
    root.id = "tlOverlay";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Loadout");
    root.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <linearGradient id="tlPrism" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#F3EED0"/><stop offset=".209" stop-color="#E4B996"/><stop offset=".525" stop-color="#766AB2"/><stop offset=".783" stop-color="#5A8DC2"/><stop offset="1" stop-color="#8BCAB2"/></linearGradient></defs></svg>
      <div class="tl-bg"></div>
      <div class="tl-hubart" data-tl-hubart hidden><img class="tl-hubart__icon" data-tl-bgicon alt=""><img class="tl-hubart__fighter" src="${IMG}cc-character.webp" alt="Fighter"></div>
      <div class="tl-shade"></div>
      <div data-tl-sw hidden></div>
      <div data-tl-view></div>${infoShellHtml()}`;
    mountWallet();
    (document.getElementById("stage") || document.body).appendChild(root);
    root.addEventListener("click", onClick);
  }

  // opts: page, type, slot; style (style id) + node (skill node id) = open on that style with the node's group focused
  // (Skill Tree Equip, thread #4); onClose = called once when the overlay closes
  let onCloseCb = null;
  function openOverlay(opts = {}) {
    if (!root) build();
    lastFocus = document.activeElement;
    open = true;
    const si = opts.style ? STYLES.findIndex(s => s.id === opts.style) : -1;
    if (si >= 0 && si !== styleIdx) { styleIdx = si; const sw = root.querySelector("[data-tl-sw]"); if (sw) sw.innerHTML = ""; }
    const it = opts.node ? itemOf(STYLES[styleIdx].id, opts.node) : null;
    const nodeType = it ? TYPES.findIndex(t => t.id === it.tid) : -1;
    page = opts.page ?? 2; view = "hub"; type = opts.type ?? (nodeType >= 0 ? nodeType : 1); mode = "group";
    const inSlot = it ? (preset()[it.tid] || []).indexOf(it.i) : -1;   // already equipped: that slot, else the next free one
    slot = opts.slot ?? (inSlot >= 0 ? inSlot : entrySlot(T().id)); info = null;
    onCloseCb = opts.onClose || null;
    root.hidden = false;
    render();
  }
  function close() {
    open = false;
    closeVideo();
    if (root) root.hidden = true;
    lastFocus?.focus?.();
    const cb = onCloseCb; onCloseCb = null;
    cb?.();
  }

  addEventListener("keydown", onKey, true);
  addEventListener("keyup", e => { if (open) e.stopImmediatePropagation(); }, true);

  window.MTX_SCREENS = window.MTX_SCREENS || {};
  window.MTX_SCREENS.loadout = { bindApi: a => { api = a; }, init: a => { api = a; } };
  window.MTX_LOADOUT = {
    open: openOverlay, close, isOpen: () => open, pad, handle,
    // dev / compare helpers
    state: () => ({ page, styleIdx, view, type, mode, slot, cell, info, presets }),
    set: o => { ({ page = page, styleIdx = styleIdx, view = view, type = type, mode = mode, slot = slot, cell = cell } = o); if ("info" in o) info = o.info; if ("scroll" in o) { gscroll = o.scroll; lastType = type; } if (o.presets) { presets = o.presets; saved = clone(o.presets); } if (root?.querySelector("[data-tl-sw]")) root.querySelector("[data-tl-sw]").innerHTML = ""; quietRings = true; render(); quietRings = false; },
    reset: () => { presets = clone(DEFAULT_PRESETS); saved = clone(DEFAULT_PRESETS); Object.keys(EQ_LV).forEach(k => delete EQ_LV[k]); styleIdx = 0; persist(); },
    isDirty: () => dirty(),
    // Skill Tree link (screen-skilltree.js): equipped = in the style's saved loadout
    // equipped perk level (0 = not equipped / not a perk)
    equippedLevel(sid, nodeId) { return this.isEquipped(sid, nodeId) && window.MTX_SKILLS?.styles?.[sid]?.nodes.find(n => n.id === nodeId)?.levels ? eqLvOf(sid, nodeId) : 0; },
    isEquipped(sid, nodeId) {
      const it = itemOf(sid, nodeId);
      if (!it || !isOwnedIn(it.L, it.tid, it.i) || !(saved[sid]?.[it.tid] || []).includes(it.i)) return false;
      const n = window.MTX_SKILLS?.styles?.[sid]?.nodes.find(x => x.id === nodeId);
      return !(n?.kind === "decisive" && !n.granted) || famTier(sid, n.family) === n.tier;   // decisive: only the tier it is equipped at
    },
    // decisive family of this tier node: the tier equipped (0 = family not in the loadout)
    equippedTier(sid, nodeId) {
      const it = itemOf(sid, nodeId), n = window.MTX_SKILLS?.styles?.[sid]?.nodes.find(x => x.id === nodeId);
      return it && n?.family && !n.granted && (saved[sid]?.[it.tid] || []).includes(it.i) ? famTier(sid, n.family) : 0;
    },
    lastReplaced: null,   // name of the item equipNode pushed out when the slots were full
    // puts the node in the first free slot (saved + working copy); returns the slot index, or null when full / not owned
    equipNode(sid, nodeId, lv) {
      const it = itemOf(sid, nodeId);
      if (!it || !isOwnedIn(it.L, it.tid, it.i)) return null;
      if (it.tid === "perk") (EQ_LV[sid] ||= {})[nodeId] = Math.min(lv || lvIn(sid, nodeId), lvIn(sid, nodeId));
      const dn = window.MTX_SKILLS?.styles?.[sid]?.nodes.find(x => x.id === nodeId);
      if (dn?.kind === "decisive" && !dn.granted) (EQ_LV[sid] ||= {})[dn.family] = dn.tier;   // another tier replaces the one equipped
      this.lastReplaced = null;
      const empty = () => ({ perk: [null, null, null, null], special: [null, null, null, null], decisive: [null, null, null, null], signature: [null, null, null, null] });
      const sv = saved[sid] || (saved[sid] = empty()), pr = presets[sid] || (presets[sid] = clone(sv));
      if (sv[it.tid].includes(it.i)) { persist(); if (open) render(); return sv[it.tid].indexOf(it.i); }
      let k = ENTRY_ORDER[it.tid].find(j => sv[it.tid][j] == null);
      if (k == null) {   // full: replace the last slot (entry order) automatically (user 2026-11-18)
        k = ENTRY_ORDER[it.tid].at(-1);
        const old = sv[it.tid][k];
        this.lastReplaced = it.tid === "perk" ? it.L.perks[old]?.name : it.L.moves[it.tid][old];
      }
      sv[it.tid][k] = it.i; pr[it.tid][k] = it.i;
      persist();
      if (open) render();
      return k;
    },
    // a decisive tier only leaves when its family has no tier left
    unequipNode(sid, nodeId) {
      const it = itemOf(sid, nodeId);
      if (!it || isOwnedIn(it.L, it.tid, it.i)) return;
      [saved[sid], presets[sid]].forEach(p => p && (p[it.tid] = p[it.tid].map(v => v === it.i ? null : v)));
      persist();
      if (open) render();
    }
  };
  //#endregion
})();
