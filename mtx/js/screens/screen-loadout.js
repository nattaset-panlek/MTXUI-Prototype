(function () {
  /* Tactical Loadout overlay (window.MTX_LOADOUT, opened from Dev > Pages > Overlays or MTX_LOADOUT.open()).
     Figma eKm2meOcqHG0cFBt4eoWQr, page Prototype: Style preset v2 Profile 719:28883 / Inventory 719:29474,
     TSP 01 Hub 726:39699, Perk 02 719:28292, 03 719:82179, 04 719:82698, 05 719:83182, 06 719:87481, 06b 719:88261,
     Special 07 719:30065 / 08 719:84264, Decisive 09 719:42859 / 10 719:84710.

     Top tabs Profile / Inventory / Tactical Loadout: LT / RT (keyboard Q / E).
     Hub: LB / RB (keyboard Z / C) switch the tactical style (one preset per style; locked styles show their
          unlock levels and can't be opened). A opens the submenu (Perk first).
     Submenu: LT / RT switch Perk / Special Move / Decisive Move. Focus starts on the slots (left).
          A on a slot -> the grid (Choosing); A in the grid equips into that slot and returns to it, B cancels.
          X removes the slot's item. Y opens the info card (Perk) next to the grid cell; RS / R pages its levels.
          B from the slots -> hub. No toasts. */

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
  // lv = owned level (frame: 1 silver, 2 copper, 3 gold). fx = effect per level 1-3, draw = drawback (Lv 3)
  const PERKS = [
    { name: "Finesse Counter", kind: "defend", lv: 1, fx: ["After a successful block, the next attack gains +10 Strike Speed.", "After a successful block, the next attack gains +15 Strike Speed.", "After a successful block, the next 2 attacks gain +20 Strike Speed."], draw: "Drawback: blocking costs 10% more Stamina" },
    { name: "Restorative Breath", kind: "sustain", lv: 1, fx: ["Standing still for 2 seconds restores 5% Stamina per second.", "Standing still for 2 seconds restores 8% Stamina per second.", "Standing still for 1 second restores 12% Stamina per second."], draw: "Drawback: Guard is 20% weaker while restoring" },
    { name: "Triple Rhythm Press", kind: "attack", lv: 1, fx: ["Every third hit in a combo deals +10% damage.", "Every third hit in a combo deals +15% damage.", "Every third hit in a combo deals +25% damage and staggers."], draw: "Drawback: the fourth hit deals 20% less damage" },
    { name: "Fluid Evasion", kind: "defend", lv: 2, fx: ["Perfect Hop cuts the Stamina Cost of your next attack by 20% for 5 seconds.", "Perfect Hop cuts the Stamina Cost of your next attack by 30% and grants +10 Combo Efficiency for 5 seconds.", "Perfect Hop cuts the Stamina Cost of your next attack by 40% and grants +15 Combo Efficiency for 5 seconds."], draw: "Drawback: a missed Hop drains 10% Stamina" },
    { name: "Tiger Trap", kind: "attack", lv: 3, fx: ["Guard Cancel before an attack lowers the enemy Damage Reduction by 15% for 5 seconds.", "Guard Cancel before an attack lowers the enemy Damage Reduction by 20% and grants +10 Armor Shred Rate for 5 seconds.", "Guard Cancel before an attack lowers the enemy Damage Reduction by 30% and grants +15 Armor Shred Rate for 5 seconds."], draw: "Drawback: if that attack misses, you are slowed by 50% for 5 seconds" },
    { name: "Counter-Catch Pivot", kind: "defend", lv: 1, fx: ["Catching a kick and pivoting restores 5% Stamina.", "Catching a kick and pivoting restores 8% Stamina.", "Catching a kick and pivoting restores 12% Stamina and stuns briefly."], draw: "Drawback: a failed catch takes 20% more damage" },
    { name: "Relentless Assault", kind: "sustain", lv: 1, fx: ["Landing a heavy move (Base Damage [[13]] or higher) restores 1 Max Stamina", "Landing a heavy move (Base Damage [[13]] or higher) restores 3 Max Stamina", "Landing a heavy move (Base Damage [[13]] or higher) restores 6 Max Stamina and grants +10% crit rate on heavy moves"], draw: "Drawback: each trigger also lowers Max HP by 1" },
    { name: "Steadfast Focus", kind: "sustain", lv: 3, fx: ["While HP regenerates, Max HP also regenerates 5% of missing Max HP per second.", "While HP regenerates, Max HP also regenerates 10% of missing Max HP per second.", "While HP regenerates, Max HP also regenerates 20% of missing Max HP per second."], draw: "Drawback: Movement Speed -40% while HP regenerates" },
    { name: "Defensive Breaker", kind: "attack", lv: 1, locked: true, fx: ["Hits on a guarding enemy deal +10% Guard Damage.", "Hits on a guarding enemy deal +15% Guard Damage.", "Hits on a guarding enemy deal +25% Guard Damage."], draw: "Drawback: your own guard recovers 20% slower" },
    { name: "Three-Step Pacing", kind: "sustain", lv: 1, locked: true, fx: ["Three steps without attacking restore 3% Stamina.", "Three steps without attacking restore 5% Stamina.", "Three steps without attacking restore 8% Stamina."], draw: "Drawback: the next attack is 10% slower" }
  ];
  // grid / list / hub frame + icon sizes per level (Figma perk-frame instances), centred on one point
  const PF = {
    grid: { 1: [122, 122, 96, 94], 2: [119, 116, 96, 94], 3: [128, 124, 84, 82] },
    list: { 1: [167, 167, 133, 130], 2: [164, 160, 133, 130], 3: [190, 184, 123, 121] },
    hub: { 1: [152, 152, 120, 118], 2: [149, 146, 120, 118], 3: [160, 155, 104, 102] }
  };
  const LIST_ICON = { 0: "perk-licon-1", 3: "perk-licon-2", 4: "perk-licon-3" };
  const MOVES = {
    special: ["Jumping Knee", "Spinning Elbow", "Superman Punch", "Flying Kick", "Clinch Sweep", "Cartwheel Kick", "Axe Kick", "Question Mark Kick", "Spinning Back Fist", "Step-up Knee"],
    decisive: ["Mon Yan Lak", "Salab Fan Pla", "Erawan Soei Nga", "Hak Nguang", "Chawa Sad Hok", "Inao Thang Krit", "Pak Look Thoy", "Ta Then Kham Fak", "Yo Khao Phra Sumen", "Kwang Liao Lang"]
  };
  const MOVE_DESC = {
    special: ["A rising knee that jumps in from mid range.", "A spinning elbow that turns through the guard.", "A leaping cross that closes distance in one step.", "A flying kick launched off the back foot.", "A clinch sweep that drops the opponent to the canvas.", "A cartwheel kick that comes over the guard.", "An axe kick that drops onto the head.", "A kick that feints low and lands high.", "A spinning back fist that punishes a step in.", "A step-up knee off the opponent's thigh."],
    decisive: ["A finishing knee that drives through the centre.", "A spinning elbow that cuts across the brow.", "A rising knee off the clinch that lifts the opponent and breaks their guard.", "A crocodile spin that throws the opponent off balance.", "A six-strike flurry that ends with an elbow.", "A long-range knee that splits the guard.", "A sweeping counter that catches a kick.", "A jumping kick that lands on the shoulder.", "A knee climb that strikes down on the head.", "A deer-turn kick that comes from behind."]
  };
  const OWNED_MOVES = 4;
  const TYPES = [
    { id: "perk", label: "Perk", tab: 128, slots: "Perk slots", grid: "Perk", crumb: "Perk" },
    { id: "special", label: "Special Move", tab: 304, slots: "Special move slots", grid: "Special move", crumb: "Special Move", color: C_SPECIAL },
    { id: "decisive", label: "Decisive Move", tab: 326, slots: "Decisive move slots", grid: "Decisive move", crumb: "Decisive Move", color: C_DECISIVE }
  ];
  const PAGES = [{ label: "Profile", w: 194 }, { label: "Inventory", w: 238 }, { label: "Tactical Loadout", w: 520 }];
  // D-pad slots in slot order (number key 1-4): left, up, right, down; frame px inside the 563 x 640 cluster
  const DPAD = [
    { dir: "left", x: 40, y: 188, key: [220, 263] }, { dir: "up", x: 188, y: 40, key: [263, 220] },
    { dir: "right", x: 335, y: 188, key: [305, 263] }, { dir: "down", x: 188, y: 335, key: [263, 305] }
  ];
  const DIR_NAME = { left: "Left", up: "Up", right: "Right", down: "Down" };
  // Selected-slot ring (720:32457 path, 8 px stroke, the slot art covers its inner half) in slot-box px
  const SLOT_PATH = "M563.816 243.569L530.894 211.373L497.972 243.569C492.748 248.675 489.789 255.148 489.084 261.814C482.269 262.498 475.646 265.393 470.422 270.499L437.5 302.695L470.422 334.89C475.646 339.997 482.269 342.891 489.084 343.575C489.789 350.241 492.748 356.714 497.972 361.82L530.894 394.016L563.816 361.82C569.04 356.714 571.999 350.241 572.704 343.575C579.519 342.891 586.142 339.997 591.365 334.89L624.288 302.695L591.365 270.499C586.142 265.393 579.519 262.498 572.704 261.814C571.999 255.148 569.04 248.675 563.816 243.569Z";

  // one preset per style. perk: 4 slots (PERKS index | null); special / decisive: 4 D-pad slots (MOVES index | null)
  const DEFAULT_PRESETS = {
    phranakhon: { perk: [0, 3, 4, null], special: [null, 0, 1, null], decisive: [null, 0, 1, null] },
    south: { perk: [5, null, null, null], special: [null, 2, null, null], decisive: [null, 3, null, null] }
  };

  let api = null, root = null, open = false;
  let presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  let page = 2;                // 0 Profile, 1 Inventory, 2 Tactical Loadout
  let styleIdx = 0;
  let view = "hub";            // hub | sub
  let type = 0;                // TYPES index
  let mode = "slots";          // slots | grid
  let slot = 0, cell = 0;
  let info = null;             // { lv } while the perk info card is open
  let lastFocus = null;
  //#endregion

  //#region [Helpers]
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const glyph = b => window.MTX_UI?.glyph?.(b) || `<span class="glyph" data-btn="${b}">${b.toUpperCase()}</span>`;
  const device = () => api?.getDevice?.() || "kb";
  const style = () => STYLES[styleIdx];
  const preset = () => presets[style().id] || (presets[style().id] = { perk: [null, null, null, null], special: [null, null, null, null], decisive: [null, null, null, null] });
  const T = () => TYPES[type];
  const isLocked = s => !!s.req;
  const count = arr => arr.filter(v => v != null).length;
  const owned = (tid, i) => tid === "perk" ? !PERKS[i].locked : i < OWNED_MOVES;
  const itemCount = tid => tid === "perk" ? PERKS.length : MOVES[tid].length;
  const itemName = (tid, i) => tid === "perk" ? PERKS[i].name : MOVES[tid][i];
  // move art: grid tile / D-pad slot (two boxer poses, as in the Figma frames)
  const tileArt = (tid, i) => `${LO}${tid === "special" ? "sp" : "dc"}-tile-${(i % 2 === 0) === (tid === "special") ? "a" : "b"}.svg`;
  const slotArt = (tid, i) => `${LO}${tid === "special" ? "sp" : "dc"}-slot-${i % 2 ? "b" : "a"}.svg`;
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

  function tabsHtml(list, active, tabW) {
    const tabs = list.map((t, i) => `<span class="tl-tab${i === active ? " is-active" : ""}" data-tl-tab="${i}" style="width:${tabW(t)}px">${esc(t.label)}</span>`).join("");
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

  // every key the state supports, in the Figma order; keys with nothing behind them yet are greyed (off)
  function hintsHtml() {
    const kb = device() === "kb";
    const styleKeys = kb ? "zl+zr" : "lb+rb";   // keyboard: Z / C switch style (Q / E are the tab keys)
    const tabKeys = "lt+rt";
    let h;
    if (page < 2) h = page === 0
      ? [["b", "Close"], ["a", { label: "Select", off: true }], ["y", "History"], ["x", { label: "Edit", off: true }], [tabKeys, "Tab"]]
      : [["b", "Close"], ["a", { label: "Select", off: true }], [tabKeys, "Tab"]];
    else if (view === "hub") h = [["b", "Close"], ["a", { label: isLocked(style()) ? "Locked" : "Open", off: isLocked(style()) }], [styleKeys, "Style"], [tabKeys, "Tab"]];
    else if (info) { h = [["b", "Cancel"], ["a", { label: "Equip", off: !owned(T().id, cell) }], ["ls", "Move"], ["y", "Info"]]; if (T().id === "perk") h.push(["rs", "Level"]); }
    else if (mode === "grid") {
      const tid = T().id;
      h = [["b", "Cancel"], ["a", { label: "Equip", off: !owned(tid, cell) }], ["ls", "Move"]];
      h.push(["y", "Info"]);
    } else {
      const filled = preset()[T().id][slot] != null;
      h = [["b", "Back"], ["a", "Select"], ["ls", "Move"], [tabKeys, "Switch"]];
      if (filled) h.push(["x", "Remove"]);
      if (filled) h.push(["y", "Info"]);
    }
    h.push(["menu", "Options"], ["view", "Friends"]);
    return `<nav class="hint-bar tl-hints">${h.map(([k, v]) => window.MTX_UI.hintItem(k, v)).join("")}</nav>`;   // Figma order, not the standard sort
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

  function clusterHtml(tid, x, y, scale, opts = {}) {
    const loadout = preset()[tid];
    const slots = DPAD.map((d, si) => {
      const v = loadout[si];
      const art = v == null ? `${LO}${tid === "special" ? "sp" : "dc"}-slot-empty.svg` : slotArt(tid, v);
      const foc = opts.focus === si;
      return `<div class="tl-slot${foc ? " is-focused" : ""}" data-tl-slot="${si}" style="left:${d.x}px;top:${d.y}px">
        <svg class="tl-ring" viewBox="0 0 188 188"><path d="${SLOT_PATH}" transform="translate(93 94) scale(1.08) translate(-93 -94) translate(-438 -209)" fill="none" stroke="url(#tlPrism)" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>
        <img src="${art}" alt="${v == null ? "Empty" : esc(MOVES[tid][v])}">
        <svg class="tl-dim" viewBox="0 0 188 188"><path d="${SLOT_PATH}" transform="translate(-438 -209)" fill="#000" fill-opacity=".7"/></svg></div>`;
    }).join("");
    const keys = DPAD.map((d, si) => `<span class="tl-key" style="left:${d.key[0]}px;top:${d.key[1]}px">${si + 1}</span>`).join("");
    return `<div class="tl-cl${opts.choosing ? " is-choosing" : ""}" style="left:${x}px;top:${y}px;transform:scale(${scale})">
      <img class="tl-cl__dpad" src="${LO}${tid === "special" ? "sp" : "dc"}-dpad.svg" alt="">${keys}${slots}</div>`;
  }

  function hubHtml() {
    const p = preset(), locked = isLocked(style());
    // perk cluster centres: slot 1 top, 2 right, 3 left, 4 bottom (Figma Group 1244834502)
    const C = [[589, 590], [677.5, 679], [502, 678.5], [589, 766]];
    const perks = p.perk.map((v, i) => v == null
      ? `<div class="tl-pc" style="left:${C[i][0]}px;top:${C[i][1]}px"><img src="${LO}hub-empty-diamond.svg" width="152" height="152" alt="Empty"></div>`
      : `<div class="tl-pc" style="left:${C[i][0]}px;top:${C[i][1]}px">${perkArt(v, "hub")}</div>`).join("");
    return `<div class="tl-hub${locked ? " is-locked" : ""}"><div class="tl-hub__body">
      ${clusterHtml("special", 168, 290, .72)}
      ${clusterHtml("decisive", 589, 267, .72)}
      ${perks}
      <div class="tl-vl" style="left:92px;top:290px;color:${C_SPECIAL}">Special Move<small>${count(p.special)} / 4 equipped</small></div>
      <div class="tl-vl" style="left:513px;top:290px;color:${C_DECISIVE}">Decisive Move<small>${count(p.decisive)} / 4 equipped</small></div>
      <div class="tl-vl" style="left:387px;top:869px;width:404px;text-align:center;color:#f6f1eb">Perk<small style="margin-top:-2px">${count(p.perk)} / 4 equipped</small></div>
    </div></div>`;
  }

  // ---------------------------------------------------------------- submenu
  function perkCardHtml(si) {
    const v = preset().perk[si], top = si * 210, choosing = mode === "grid";
    const focus = mode === "slots" && slot === si ? `<i class="tl-focus tl-focus--card"></i>` : "";
    const target = choosing && slot === si ? `<i class="tl-target"></i>` : "";
    if (v == null) return `<div class="tl-card is-empty${choosing && slot === si ? " is-target" : ""}" style="top:${top}px" data-tl-slot="${si}">
        <div class="tl-empty"><span class="tl-empty__slot">Slot 0${si + 1}</span><i class="tl-empty__box"></i><i class="tl-empty__plus"></i>
        <span class="tl-empty__t">Empty</span><span class="tl-empty__h">Select a perk from the collection</span></div>${target}${focus}</div>`;
    const p = PERKS[v], [kname, kcol] = KIND[p.kind];
    return `<div class="tl-card${choosing && slot === si ? " is-target" : ""}" style="top:${top}px" data-tl-slot="${si}">
      <div class="tl-card__art">${perkArt(v, "list")}</div>
      <span class="tl-card__kind" style="color:${kcol}">${kname}</span>
      <span class="tl-card__name">${esc(p.name)}</span><i class="tl-card__rule"></i>
      <p class="tl-card__fx">${fxHtml(p.fx[p.lv - 1])}</p>
      ${p.lv === 3 ? `<p class="tl-card__draw">${esc(p.draw)}</p>` : ""}${target}${focus}</div>`;
  }

  function gridHtml() {
    const tid = T().id, loadout = preset()[tid], n = itemCount(tid), choosing = mode === "grid";
    let cells = "";
    for (let i = 0; i < 25; i++) {
      const x = (i % 5) * 168, y = Math.floor(i / 5) * 168;
      if (i >= n) { cells += `<div class="tl-cell tl-cell--null" style="left:${x}px;top:${y}px"></div>`; continue; }
      const lock = !owned(tid, i), eq = loadout.indexOf(i);
      const art = tid === "perk"
        ? `<div class="tl-cell__art">${perkArt(i, "grid")}</div>`
        : `<img class="tl-cell__move" src="${tileArt(tid, i)}" alt="">`;
      cells += `<div class="tl-cell${lock ? " is-locked" : ""}" style="left:${x}px;top:${y}px" data-tl-cell="${i}">
        <i class="tl-cell__base"></i><svg class="abs" style="inset:0" viewBox="0 0 156 156"><path d="M1 124.5H155V127.5H1Z M155 124.5H99.74C129.15 124.5 155 104.6 155 80V124.5Z" fill="#9a9ea8"/></svg>
        <span class="tl-cell__bar">${esc(itemName(tid, i))}</span>
        ${eq >= 0 ? `<i class="tl-cell__eq" style="--tc:${T().color || C_GOLD}"></i>` : ""}
        ${lock ? `<i class="tl-cell__dim"></i>` : ""}${art}
        ${lock ? `<img class="tl-cell__lock" src="${LO}lock.svg" alt="Locked">` : ""}
        ${eq >= 0 && tid !== "perk" ? `<span class="tl-key tl-cell__num">${eq + 1}</span>` : ""}
        ${choosing && cell === i ? `<i class="tl-focus tl-focus--cell"></i>` : ""}</div>`;
    }
    return `<div class="tl-grid${choosing ? "" : " is-idle"}">${cells}</div>`;
  }

  function detailHtml() {
    const tid = T().id, loadout = preset()[tid];
    let name, text, v;
    if (mode === "grid") { v = cell; name = MOVES[tid][v]; text = MOVE_DESC[tid][v]; }
    else {
      v = loadout[slot];
      name = v == null ? "Empty" : MOVES[tid][v];
      text = v == null ? "Select a move from the collection" : `Equipped on ${DIR_NAME[DPAD[slot].dir]} (${slot + 1})`;
    }
    const icon = v == null ? `${LO}${tid === "special" ? "sp" : "dc"}-slot-empty.svg` : v % 2 ? slotArt(tid, v) : `${LO}${tid === "special" ? "sp" : "dc"}-detail.svg`;
    return `<section class="tl-detail" style="--tc:${T().color}"><img src="${icon}" alt=""><h3>${esc(name)}</h3><p>${esc(text)}</p></section>`;
  }

  // Info card (MTX / Perk Info Card 719:89368): ONE persistent element, built once in build(). While it is open,
  // moving to another cell lerps it to that cell (CSS transition on left) and swaps its text in place with a crossfade.
  // Perks show the level pager (RS); Special / Decisive moves show kind, name and description.
  let infoItem = "", infoLv = 0;
  function infoShellHtml() {
    return `<aside class="skill-detail tl-info" data-tl-info hidden data-figma="719:89368 MTX / Perk Info Card">
      <p class="skill-detail__kind" data-i="kind"></p>
      <div class="skill-detail__card">
        <div class="skill-detail__art"><img src="${IMG}card-art.webp" alt=""></div>
        <span class="skill-detail__score"><img src="${SV}icon-check-circle.svg" alt=""><span data-i="badge"></span></span>
        <div class="skill-detail__title"><div><h2 class="tex-text" data-i="name"></h2></div></div>
        <div class="skill-detail__desc">
          <div class="tl-lv" data-i-lv><span>Lv 1</span><span>Lv 2</span><span>Lv 3</span></div><div class="tl-lv__sr" data-i-lv>${glyph("rs")}<span>Level</span></div>
          <p class="tl-info__fx" data-i="fx"></p><p class="tl-info__draw" data-i="draw"></p>
        </div>
        <div class="skill-detail__actions"><span class="tl-info__equip" data-i-equip><i></i><span>Equip</span></span>
          <span class="hint-inline">${glyph("b")}<span>Close</span></span></div>
      </div></aside>`;
  }

  function infoData() {
    const tid = T().id;
    if (tid === "perk") {
      const p = PERKS[cell], [kind, col] = KIND[p.kind];
      return { kind, col, badge: p.locked ? "Locked" : "Owned Lv" + p.lv, name: p.name, levels: true, lv: info.lv, fx: p.fx[info.lv - 1], draw: info.lv === 3 ? p.draw : "", own: !p.locked };
    }
    const own = owned(tid, cell);
    return { kind: T().grid, col: T().color, badge: own ? "Owned" : "Locked", name: MOVES[tid][cell], levels: false, lv: 0, fx: MOVE_DESC[tid][cell], draw: "", own };
  }

  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function syncInfo() {
    const el = root?.querySelector("[data-tl-info]");
    if (!el) return;
    if (!(info && page === 2 && view === "sub" && mode === "grid")) { el.hidden = true; infoItem = ""; return; }
    const d = infoData(), left = 1032 + (cell % 5) * 168 - 16 - 513, item = T().id + ":" + cell, opening = el.hidden;
    el.hidden = false;
    if (opening) { el.style.transition = "none"; el.style.left = left + "px"; void el.offsetWidth; el.style.transition = ""; restart(el, "is-in"); }
    else el.style.left = left + "px";
    el.style.setProperty("--tc", d.col);
    const q = k => el.querySelector(`[data-i="${k}"]`);
    q("kind").textContent = d.kind; q("badge").textContent = d.badge; q("name").textContent = d.name;
    q("fx").innerHTML = d.levels ? fxHtml(d.fx) : esc(d.fx); q("draw").textContent = d.draw; q("draw").hidden = !d.draw;
    el.querySelectorAll("[data-i-lv]").forEach(n => { n.hidden = !d.levels; });
    el.querySelectorAll(".tl-lv span").forEach((n, k) => n.classList.toggle("is-on", k + 1 === d.lv));
    el.querySelector("[data-i-equip]").classList.toggle("is-off", !d.own);
    if (!opening && item !== infoItem) restart(el, "is-swap");        // another item: crossfade every text
    else if (!opening && d.lv !== infoLv) restart(el, "is-lv");       // same item, other level: crossfade the effect
    infoItem = item; infoLv = d.lv;
  }

  function subHtml() {
    const t = T(), loadout = preset()[t.id], s = style();
    const crumb = `<div class="tl-crumb">Tactical Loadout<b>&gt;</b>${esc(s.name)}<b>&gt;</b><em>${esc(t.crumb)}</em></div>`;
    const heads = `<div class="tl-head" style="left:60px"><b>${t.slots}</b><span>${count(loadout)} / 4 equipped</span></div>
      <div class="tl-head" style="left:1032px"${info ? " hidden" : ""}><b>${t.grid}</b></div>`;
    let left;
    if (t.id === "perk") left = `<div class="tl-list${mode === "grid" ? " is-choosing" : ""}">${[0, 1, 2, 3].map(perkCardHtml).join("")}</div>`;
    else left = clusterHtml(t.id, 250, 169, 1, { focus: slot, choosing: mode === "grid" }) + detailHtml();
    return crumb + tabsHtml(TYPES, type, x => x.tab) + heads + gridHtml() + left;
  }
  //#endregion

  //#region [Render]
  function render() {
    if (!root) return;
    const hub = page === 2 && view === "hub";
    let body = "";
    if (page < 2 || view === "hub") body = tabsHtml(PAGES, page, x => x.w) + (page === 0 ? profileHtml() : page === 1 ? tbdHtml() : hubHtml());
    else body = subHtml();
    root.querySelector("[data-tl-hubart]").hidden = !hub;
    const sw = root.querySelector("[data-tl-sw]");
    sw.hidden = !hub;
    if (hub && !sw.firstChild) sw.innerHTML = switcherHtml();
    root.querySelector("[data-tl-view]").innerHTML = body + hintsHtml();
    animate();
    syncInfo();
    updateHubArt();
  }

  // enter transitions: a new page / tab / view slides in, a mode change (slots <-> grid) fades, the info card slides
  let lastKey = "", lastMode = "", lastInfo = false;
  function animate() {
    const v = root.querySelector("[data-tl-view]"), key = page + "|" + view + "|" + type, m = view + mode;
    v.classList.remove("tl-anim-view", "tl-anim-in", "tl-anim-x", "tl-anim-mode", "tl-anim-info");
    void v.offsetWidth;   // restart the keyframes
    if (key !== lastKey) v.classList.add("tl-anim-view", view === "sub" && lastKey.includes("|hub|") ? "tl-anim-in" : "tl-anim-x");
    else if (m !== lastMode) v.classList.add("tl-anim-mode");
    if (info && !lastInfo) v.classList.add("tl-anim-info");
    lastKey = key; lastMode = m; lastInfo = !!info;
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
  function moveSlots(dir) {
    if (T().id === "perk") {
      if (dir === "up" || dir === "down") slot = Math.max(0, Math.min(3, slot + (dir === "up" ? -1 : 1)));
      return;
    }
    const target = DPAD.findIndex(d => d.dir === dir);   // D-pad: a direction picks that slot
    if (target >= 0) slot = target;
  }

  function moveGrid(dir) {
    const n = itemCount(T().id);
    let c = cell;
    if (dir === "left" && c % 5 > 0) c--;
    else if (dir === "right" && c % 5 < 4 && c + 1 < n) c++;
    else if (dir === "up" && c >= 5) c -= 5;
    else if (dir === "down" && c + 5 < n) c += 5;
    if (c !== cell) { cell = c; if (info) info.lv = T().id === "perk" ? PERKS[c].lv : 0; }
  }

  function enterGrid() {
    const v = preset()[T().id][slot];
    cell = v != null ? v : 0;
    mode = "grid";
  }

  function equip() {
    const tid = T().id, loadout = preset()[tid];
    if (!owned(tid, cell)) { rumble(80, .4); return false; }
    const was = loadout.indexOf(cell);
    if (was >= 0 && was !== slot) loadout[was] = loadout[slot];   // already in another slot: swap
    loadout[slot] = cell;
    rumble(60, .25);
    return true;
  }

  function handle(a) {
    if (a === "menu") { window.MTX_OPTIONS?.open?.(); return; }   // Start / Tab: Options, everywhere
    if (a === "view") { window.MTX_FRIENDS?.open?.(); return; }   // View / F: Friends, everywhere
    // ---- top level: Profile / Inventory / hub
    if (page < 2 || view === "hub") {
      if (a === "lt" || a === "rt") { page = (page + (a === "lt" ? -1 : 1) + 3) % 3; view = "hub"; render(); return; }
      if (page < 2) {
        if (a === "lb" || a === "rb") { page = (page + (a === "lb" ? -1 : 1) + 3) % 3; render(); return; }
        if (a === "back") close();
        else if (a === "y" && page === 0) { close(); api?.getScreen?.("history")?.openFromProfile?.(); }   // Match History; its Back reopens Profile
        return;
      }
      if (a === "lb" || a === "rb") { setStyle(styleIdx + (a === "lb" ? -1 : 1)); return; }
      if (a === "a") {
        if (isLocked(style())) { rumble(80, .4); return; }
        view = "sub"; type = 0; mode = "slots"; slot = 0; info = null; render(); return;
      }
      if (a === "back") close();
      return;
    }
    // ---- submenu
    if (info) {
      if (a === "back" || a === "y") info = null;
      else if ((a === "rs" || a === "rb") && T().id === "perk") info.lv = info.lv % 3 + 1;   // keyboard RS glyph is C (= rb here)
      else if (a === "a") { if (equip()) { info = null; mode = "slots"; } }
      else if (["up", "down", "left", "right"].includes(a)) moveGrid(a);
      render(); return;
    }
    if (mode === "grid") {
      if (["up", "down", "left", "right"].includes(a)) moveGrid(a);
      else if (a === "back") mode = "slots";
      else if (a === "a") { if (equip()) mode = "slots"; }
      else if (a === "y") info = { lv: T().id === "perk" ? PERKS[cell].lv : 0 };
      else return;
      render(); return;
    }
    if (["up", "down", "left", "right"].includes(a)) moveSlots(a);
    else if (a === "lt" || a === "rt") { type = (type + (a === "lt" ? -1 : 1) + 3) % 3; slot = T().id === "perk" ? 0 : 1; }
    else if (a === "a") enterGrid();
    else if (a === "x") { if (preset()[T().id][slot] == null) return; preset()[T().id][slot] = null; rumble(40, .2); }
    else if (a === "y") {
      const v = preset()[T().id][slot];
      if (v == null) return;
      cell = v; mode = "grid"; info = { lv: T().id === "perk" ? PERKS[v].lv : 0 };
    }
    else if (a === "back") { view = "hub"; info = null; }
    else return;
    render();
  }

  // keyboard: Z / C = LB / RB (style), Q / E = LT / RT (tabs), R = RS (info level)
  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right",
    Enter: "a", " ": "a", Escape: "back", Backspace: "back", x: "x", y: "y", f: "view", z: "lb", c: "rb", q: "lt", e: "rt", r: "rs", Tab: "menu"
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
    const map = { b4: "lb", b5: "rb", b6: "lt", b7: "rt", b11: "rs", b8: "view" };
    handle(map[key] || action);
  }
  function onClick(e) {
    const t = e.target.closest("[data-tl-tab],[data-tl-style],[data-tl-slot],[data-tl-cell]");
    if (!t) return;
    if (t.dataset.tlTab != null) {
      const i = +t.dataset.tlTab;
      if (page < 2 || view === "hub") { page = i; view = "hub"; } else { type = i; mode = "slots"; slot = T().id === "perk" ? 0 : 1; info = null; }
    } else if (t.dataset.tlStyle != null) { setStyle(+t.dataset.tlStyle); return; }
    else if (t.dataset.tlSlot != null && view === "sub") { slot = +t.dataset.tlSlot; info = null; enterGrid(); }
    else if (t.dataset.tlCell != null && mode === "grid") { cell = +t.dataset.tlCell; if (equip()) { mode = "slots"; info = null; } }
    render();
  }
  //#endregion

  //#region [Open / close]
  function build() {
    root = document.createElement("div");
    root.className = "tl";
    root.id = "tlOverlay";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Tactical Loadout");
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

  function openOverlay(opts = {}) {
    if (!root) build();
    lastFocus = document.activeElement;
    open = true;
    page = opts.page ?? 2; view = opts.view || "hub"; type = opts.type || 0; mode = "slots";
    slot = opts.slot ?? (type === 0 ? 0 : 1); info = null;
    root.hidden = false;
    render();
  }
  function close() {
    open = false;
    if (root) root.hidden = true;
    lastFocus?.focus?.();
  }

  addEventListener("keydown", onKey, true);
  addEventListener("keyup", e => { if (open) e.stopImmediatePropagation(); }, true);

  window.MTX_SCREENS = window.MTX_SCREENS || {};
  window.MTX_SCREENS.loadout = { bindApi: a => { api = a; }, init: a => { api = a; } };
  window.MTX_LOADOUT = {
    open: openOverlay, close, isOpen: () => open, pad, handle,
    // dev / compare helpers
    state: () => ({ page, styleIdx, view, type, mode, slot, cell, info, presets }),
    set: o => { ({ page = page, styleIdx = styleIdx, view = view, type = type, mode = mode, slot = slot, cell = cell } = o); if ("info" in o) info = o.info; if (o.presets) presets = o.presets; if (root?.querySelector("[data-tl-sw]")) root.querySelector("[data-tl-sw]").innerHTML = ""; render(); },
    reset: () => { presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS)); styleIdx = 0; }
  };
  //#endregion
})();
