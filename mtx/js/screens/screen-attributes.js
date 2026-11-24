(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  // Attributes (balancing sheets 08-16, via attr-data.js):
  //   5 attributes per style; each attribute = the sum of its sub-stats and starts at the sheet's Base Stat.
  //   Points go into sub-stats (A = +1). An attribute can't pass its cap for this style's Style Level
  //   (5 levels: base + the "Default Distribution" rows), so the cap bar shows all five notches.
  //   Bonuses (feeds below) sit on top of the sub-stats: yellow segment + "+N" on the sub-stat rows only;
  //   the attribute number and Overall count them, the Style Level ladder does not.
  //   A sub-stat stops at its own max (user 2026-11-19, rule B): the attribute's Max shared out by the sub-stats' base share,
  //   e.g. Phra Nakhon Defending 6/30 x 100 = 20 each, Attacking 7/8/8/7 -> 23/27/27/23 (sums to the attribute Max). Overall = average of the 5 attributes; at OVERALL_MAX this style takes no more points.
  // Input: W / S (stick, D-pad) move between sub-stats only, A / D (left / right) remove / add a point,
  // Q / E (LT / RT) switch attribute, hold Space / A confirms.

  //#region [Variables/Fields]
  let api = null;
  const DATA = window.MTX_ATTR_DATA || {};
  const KEYS = ["attacking", "defending", "striking", "agility", "endurance"];
  const SHORT = { attacking: "Attack", defending: "Defense", striking: "Striking Arts", agility: "Agility", endurance: "Endurance" };
  // a fresh fighter: every attribute at its sheet base, nothing invested.
  // Points to spend are the player's Attribute points (MTX_PLAYER, earned per E level).
  // Saved in localStorage "mtx.attr_state" = { styles: { styleId: { attrKey: [sub values] } } }.
  const STORE_KEY = "attr_state";
  const OVERALL_MAX = 100, SUB_MAX = 100;   // sub-stat max (user 2026-11-19)
  const SCALE_MAX = 140;   // same 0-140 scale as the Figma "Attributes · Mastery Caps" bar

  let tab = "attacking", pending = {};
  const owned = {};        // style -> { attrKey: [sub values] }
  const P = () => window.MTX_PLAYER;
  // points left = E level x 5 minus everything invested, in all styles
  const invested = () => Object.entries(owned).reduce((all, [id, attrs]) => all + (DATA[id]?.attrs || []).reduce((n, a) =>
    n + sum(attrs[a.key] || []) - (attrs[a.key] ? sum(a.subs.map(s => s[1])) : 0), 0), 0);
  const pts = () => Math.max(0, (P() ? P().attrTotal() : 0) - invested());
  const HOLD_MS = 900;

  // ---- bonuses from other systems (added on top of a sub-stat; they don't use points or count toward the cap)
  // Generic: any system can feed bonuses through MTX_ATTR_BONUS.register(id, feed), where
  //   feed = { label: "Skill Tree", color: "#e2629a", entries(ctx) -> [{ sub: "Punch Power", value: 5, detail: "Punch Power node" }] }
  //   ctx  = { styleId }   (sub = sub-stat name, same in every style; detail is optional)
  // This screen only lists { label, value } per source, so a system can change its data shape freely
  // as long as its feed still returns entries. Skill Tree and Mastery below are just two feeds.
  const FEEDS = new Map();
  window.MTX_ATTR_BONUS = {
    register(id, feed) { FEEDS.set(id, feed); if (api?.getCur?.() === "attributes") renderAttr(); },
    unregister(id) { FEEDS.delete(id); },
    feeds: () => [...FEEDS.keys()]
  };

  // Feed: Skill Tree. Owned Attribute nodes (v5 data, wiki "Skill Tree PhraNakorn"): node.bonus = [{ stat, value }].
  // Wiki stat names match the sub-stat names except these.
  const TREE_SUB = { "Block Gauge": "Block Strength" };
  window.MTX_ATTR_BONUS.register("skilltree", {
    label: "Skill Tree", color: "#e2629a",
    entries() {
      const tree = window.MTX_SCREENS.skilltree, T = window.MTX_TREE;
      if (!tree?.getOwned || !T) return [];
      const own = tree.getOwned(), out = [];
      T.nodes.forEach(n => {
        if (n.kind !== "attribute" || !own.has(n.id)) return;
        (n.bonus || []).forEach(b => out.push({ sub: TREE_SUB[b.stat] || b.stat, value: b.value, detail: n.name }));
      });
      return out;
    }
  });

  // Mastery placeholder feed removed (user 2026-11-18): bonuses come only from unlocked Skill Tree nodes.
  // A real Mastery feed can be added later with MTX_ATTR_BONUS.register("mastery", ...).
  let hold = null;   // MTX_UI.createHold, made in init
  //#endregion

  //#region [Helpers]
  const styleId = () => api.getScreen("tactical")?.getSelStyle?.() || "phranakhon";
  const style = () => DATA[styleId()] || DATA.phranakhon;
  const level = () => Math.min(5, Math.max(1, api.getScreen("quests")?.getMasteryLevel?.() || 1));
  const attr = key => style().attrs.find(a => a.key === key);
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  const pendingTotal = () => sum(Object.values(pending));
  const pendingIn = key => sum(Object.entries(pending).filter(([k]) => k.startsWith(key + ":")).map(([, v]) => v));
  const pad2 = n => String(n).padStart(2, "0");

  // split `amount` over the sub-stats by their base share, whole numbers (largest remainder)
  function spread(subs, amount) {
    const total = sum(subs.map(s => s[1]));
    const raw = subs.map(s => amount * s[1] / total);
    const out = raw.map(Math.floor);
    let left = amount - sum(out);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return subs.map((s, i) => s[1] + out[i]);
  }

  // sub-stat max (user 2026-11-19): each sub-stat can go up to its attribute's Max Stat (e.g. Chaiya Attacking 80,
  // Defending 120). Spending can never take the attribute itself past Max Stat, so the subs never reach it together.
  // 2026-11-24 (sheet row "Max Possible Attribute"): a sub-stat's bar is full at its maxPossible (points + full Mastery Tree bonus);
  // points alone stop at maxPossible - tree (the tree bonus fills the rest). Styles without that row keep Max Stat for both.
  function subMaxes(a) {
    return a.subs.map(s => s[2]?.maxPossible ?? a.max);
  }
  function subPointCaps(a) {
    return a.subs.map(s => s[2] ? s[2].maxPossible - (s[2].tree || 0) : a.max);
  }

  function values() {
    const id = styleId();
    if (!owned[id]) {
      owned[id] = {};
      style().attrs.forEach(a => { owned[id][a.key] = spread(a.subs, 0); });   // = the sheet's starting sub-stats
    }
    return owned[id];
  }

  // ---- storage
  function load() {
    try {
      const st = JSON.parse(api.store.get(STORE_KEY, "null") || "null");
      if (!st) return;
      for (const [id, attrs] of Object.entries(st.styles || {})) owned[id] = attrs;
    } catch (e) { /* corrupt entry: start fresh */ }
  }

  function persist() {
    api.store.set(STORE_KEY, JSON.stringify({ styles: owned }));
  }

  // back to a fresh fighter: base values, all points back, storage cleared
  // Dev > Per style > Reset Attributes: only the selected Tactical Style
  function resetStyle(id = styleId()) {
    delete owned[id];
    pending = {};
    persist();
    if (api.getCur() === "attributes") renderAttr();
  }

  function resetAll() {
    Object.keys(owned).forEach(k => delete owned[k]);
    pending = {};
    persist();
    if (api.getCur() === "attributes") renderAttr();
  }

  // bonus list of one sub-stat, from every registered feed: [{ label, color, value, detail }]
  function bonusOf(subName) {
    const ctx = { styleId: styleId() }, out = [];
    FEEDS.forEach(feed => {
      let list = [];
      try { list = feed.entries(ctx) || []; } catch (e) { console.warn("attr bonus feed failed", e); }
      list.forEach(e => { if (e.sub === subName && e.value) out.push({ label: feed.label, color: feed.color, value: e.value, detail: e.detail || "" }); });
    });
    return out;
  }
  const bonusSum = list => sum(list.map(b => b.value));

  // attribute bonus = all feed bonuses on its sub-stats. It sits on top of the point value and raises
  // the attribute's cap: cap = Max (from points) + bonus, never past Capped (a.hard). raw = before the clamp.
  function attrBonus(key) {
    const a = attr(key), raw = sum(a.subs.map(([n]) => bonusSum(bonusOf(n))));
    const eff = Math.max(0, Math.min(raw, a.hard - a.max));
    return { raw, eff, cap: a.max + eff };
  }
  const attrValue = key => sum(values()[key]) + pendingIn(key);
  const overallValue = () => sum(KEYS.map(attrValue)) / KEYS.length;
  const overallFull = () => overallValue() >= OVERALL_MAX;
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    hold = window.MTX_UI.createHold({
      ms: HOLD_MS,
      onDone: () => commit(),
      onCancel: ({ quick, notify }) => { if (notify && quick) window.MTX_UI.holdHint("confirm"); }
    });
    load();
    loadVfx();
    applyVfx();
    emblemMask();
    bindVfxDev();
    // the player store changes points (E level ups, dev panel): keep this screen and the dev field in step
    P()?.on(() => {
      if (api.getCur() === "attributes") renderAttr();
      const f = document.getElementById("attrPointsDev");
      if (f && document.activeElement !== f) f.value = pts();
    });
    // dev panel: attribute points + reset
    // (points come from E levels: the field is read-only, the "+1 E level" buttons are MTX_PLAYER level buttons)
    const ptsIn = document.getElementById("attrPointsDev");
    if (ptsIn) ptsIn.value = pts();
    document.getElementById("resetAttrBtn")?.addEventListener("click", () => {
      resetStyle();
      if (ptsIn) ptsIn.value = pts();
      api.toast("Attributes reset (this style) · base values, " + pts() + " points");
    });
    // tabs are not focus stops (Q / E only) but still take a click; the confirm button is a mouse hold
    api.$$("#s-attributes .attr-tab").forEach(t => t.addEventListener("click", e => { e.stopPropagation(); tab = t.dataset.tab; renderAttr(); }));
    const btn = api.bind("attrConfirm");
    btn?.addEventListener("mousedown", e => { if (e.button === 0) startHold(); });
    ["mouseup", "mouseleave"].forEach(ev => btn?.addEventListener(ev, () => cancelHold(ev === "mouseup")));
    btn?.addEventListener("click", e => e.stopPropagation());
    // A / D key glyphs on a row take a mouse click: A = -1 (unconfirmed points only), D = +1 (user 2026-11-24)
    const rows = api.bind("attrRows");
    rows?.addEventListener("pointerdown", e => { if (e.target.closest(".attr-row__key")) e.stopPropagation(); });   // not the row press / A hold
    rows?.addEventListener("click", e => {
      const k = e.target.closest(".attr-row__key"), row = k?.closest(".attr-row");
      if (!row) return;
      e.stopPropagation();
      if (api.getFocused?.() !== row) api.setFocus(row);
      adjust(+row.dataset.id.slice(1), k.dataset.btn === "dr" ? 1 : -1);
    });
  }

  function enter() {
    pending = {};
    renderAttr();
  }

  function renderAttr() {
    const rows = api.bind("attrRows");
    if (!rows) return;
    const a = attr(tab), lv = level(), cap = a.caps[lv - 1];
    const vals = values()[tab], total = attrValue(tab), gainHere = pendingIn(tab);
    const left = pts() - pendingTotal();
    const focusIdx = api.getFocused?.()?.classList.contains("attr-row") ? +api.getFocused().dataset.id.slice(1) : -1;
    // 5a (user 2026-11-19): base + spent (+ pending) out of Max Stat (100); Skill Tree bonus is NOT counted here
    const limit = Math.min(cap, a.max), atCap = total >= limit, full = overallFull();

    // hero: attribute total vs this level's cap + the cap bar: five equal segments = Mastery Lv 1-5.
    // Segment 1 runs 0 -> Lv1 cap and already holds the base (grey); each next one spans the cap it adds.
    // White = invested, green = unconfirmed, dark = room in an unlocked level, hatched = locked level.
    // User 2026-11-18: the ladder stays points-only (bonus shows on the sub-stat rows only);
    // the big number is the real total (sub-stats incl. bonus) / level cap + bonus (bonus raises the cap from the start).
    const saved = total - gainHere;
    const pc = v => Math.max(0, Math.min(100, v)).toFixed(3) + "%";
    // bar 6 (user 2026-11-19): 5 equal segments = Style Level 1-5; segment n spans what level n unlocks
    // (Lv1 0 -> 50 incl. the base 30, Lv2 50 -> 65, Lv3 65 -> 80, Lv4 80 -> 90, Lv5 90 -> 100), the same scale as 5a
    const capsM = a.caps.map(c => Math.min(c, a.max));
    const ladder = capsM.map((to, k) => {
      const n = k + 1, from = k ? capsM[k - 1] : 0, span = to - from;
      const part = (lo, hi) => Math.max(0, Math.min(to, hi) - Math.max(from, lo)) / span * 100;
      const base = part(0, a.base), fill = part(a.base, saved), gain = part(saved, total);
      const fillLeft = (Math.max(from, a.base) - from) / span * 100, gainLeft = (Math.max(from, saved) - from) / span * 100;
      const cls = n < lv ? "is-past" : n === lv ? "is-now" : "is-locked";
      return `<span class="attr-seg ${cls}"><i class="attr-seg__base" style="width:${pc(base)}"></i>` +
        `<i class="attr-seg__fill" style="left:${pc(fillLeft)};width:${pc(fill)}"></i>` +
        `<i class="attr-seg__gain" style="left:${pc(gainLeft)};width:${pc(gain)}"></i><b>${n}</b></span>`;
    }).join("");
    api.bind("attrHead").innerHTML =
      `<p class="attr-hero__kicker">Attribute</p>` +
      `<h2 class="attr-hero__name">${SHORT[tab]}</h2>` +
      `<p class="attr-hero__total${atCap ? " is-cap" : ""}"><span>${total}</span><small>/ ${a.max}</small></p>` +
      `<p class="attr-capbar__label">Style Level</p>` +
      `<div class="attr-capbar">${ladder}</div>`;

    // sub-stat rows: bar out of 100; focused row shows the left / right keys with their availability
    const smax = subMaxes(a), pcap = subPointCaps(a);
    rows.innerHTML = a.subs.map(([n, b], i) => {
      // sub-stat bar on its own scale: 0 -> this sub-stat's max (rule B)
      const v = vals[i], g = pending[`${tab}:${i}`] || 0, sm = smax[i], pc = x => x / sm * 100;
      const pv = Math.min(100, pc(v));
      const canAdd = left > 0 && !atCap && !full && v + g < pcap[i], canRemove = g > 0;
      const G = api.getGlyphs?.()[api.getDevice?.()] || {};
      // Skill Tree bonus (user 2026-11-18): added into the sub-stat value; shown as the yellow bar segment + the "+N" badge after the value
      const bl = bonusOf(n), bn = bonusSum(bl);
      // bar order (user 2026-11-18): points (white) -> bonus (yellow, same as the +N chip) -> unconfirmed (green)
      const pb = Math.min(100 - pv, pc(bn)), pg = Math.min(100 - pv - pb, pc(g));
      return `<a class="attr-row focus-ring" data-nav data-id="a${i}" data-fn="upgradeAttr">` +
        `<span class="attr-row__name">${n}</span>` +
        `<span class="attr-row__bar"><i class="attr-row__fill" style="width:${pv}%"></i>` +
        `<i class="attr-row__bonusfill" style="width:${pb}%" title="${bl.map(b => `${b.label} +${b.value}${b.detail ? " · " + b.detail : ""}`).join("\n")}"></i><i class="attr-row__gain" style="width:${pg}%"></i><i class="attr-row__rest"></i>` +
        `<span class="attr-row__tick${g ? " is-gain" : ""}" style="left:calc(5px + ${(pv + pb + pg) / 100} * (100% - 11px))"></span></span>` +
        `<span class="attr-row__adjust">` +
        `<span class="glyph attr-row__key${canRemove ? "" : " is-off"}" data-btn="dl" aria-hidden="true">${G.dl || "A"}</span>` +
        `<span class="attr-row__value${g ? " is-gain" : ""}">${v + g + bn}</span>` +   // white; green only while it has unconfirmed points (user 2026-11-18)
        `<span class="glyph attr-row__key${canAdd ? "" : " is-off"}" data-btn="dr" aria-hidden="true">${G.dr || "D"}</span></span>` +
        `<span class="attr-row__bonus">${bn ? `<em class="attr-bonus">+${bn}</em>` : ""}</span>` +
        `<span class="attr-row__gaintag">${g ? "+" + g : ""}</span></a>`;
    }).join("");

    api.$$("#s-attributes .attr-tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === tab));
    if (focusIdx >= 0 && api.getCur() === "attributes") api.setFocus(api.$(`[data-id="a${Math.min(focusIdx, a.subs.length - 1)}"]`, rows));

    // vertical header behind the fighter: the selected Tactical style
    const st = api.getScreen("tactical")?.getStyles?.()[styleId()];
    const nameV = api.bind("attrStyleName");
    if (nameV && st) {
      nameV.textContent = st.title;
      // fit between the logo and the hint bar (805 px of frame height)
      nameV.style.fontSize = "";
      const k = api.screens.attributes.querySelector(".screen__safe").getBoundingClientRect().width / 1920 || 1;
      for (let size = 135; nameV.getBoundingClientRect().height / k > 805 && size > 60; ) nameV.style.fontSize = (size -= 5) + "px";
    }

    // side column: overall (top half) + points to spend (bottom half)
    // overall = average of the five main attributes (Attack + Defense + Striking Arts + Agility + Endurance) / 5;
    // a fresh fighter shows the base average (e.g. 30). Rounded down, so 100 only shows once the style is locked.
    // shown overall = (sum of the five real totals, bonus included) / 5; the points limit still uses overallValue()
    const overall = sum(KEYS.map(k => attrValue(k) + attrBonus(k).eff)) / KEYS.length;
    setOverall(api.bind("overall"), Math.floor(overall));
    // ring scale (user 2026-11-19, PhraNakorn sheet): full at Max Overall = the five Max Stat values / 5 (500 / 5 = 100).
    // Overall itself counts the Skill Tree bonus, so it can pass 100, up to Capped (120 per attribute, sheet row "Cappped");
    // the ring stays full above 100. Arc length is written as an SVG attribute (Firefox ignores a unitless CSS calc).
    const overallTop = sum(style().attrs.map(x => x.max)) / KEYS.length;
    const pct = Math.max(0, Math.min(100, overall / overallTop * 100));
    const ring = api.bind("overallRing");
    ring.style.setProperty("--p", pct.toFixed(2));
    ring.querySelector(".attr-overall__arc")?.setAttribute("stroke-dashoffset", (100 - pct).toFixed(2));
    api.bind("attrPoints").textContent = left;
    api.bind("attrPointsBox").classList.toggle("is-empty", left <= 0);
    api.bind("attrPointsLabel").textContent = "Attribute points";   // same label at 0 too; the number turns grey (user 2026-11-24)
    api.bind("attrConfirm").classList.toggle("is-idle", !pendingTotal());
  }
  //#endregion

  // +1 / -1 on the focused sub-stat (only points not confirmed yet can be taken back)
  function adjust(i, dir) {
    const key = `${tab}:${i}`, a = attr(tab);
    if (dir < 0) {
      if (!pending[key]) { api.rumble(80, 0.15); api.toast("Only unconfirmed points can be removed"); return; }
      pending[key]--;
      if (!pending[key]) delete pending[key];
      renderAttr();
      api.rumble(40, 0.2);
      return;
    }
    if (pendingTotal() >= pts()) { api.rumble(120, 0.2); api.toast("No points left"); return; }
    if (overallFull()) { api.rumble(120, 0.2); api.toast(`Overall is at ${OVERALL_MAX} · this style can't go higher`); return; }
    const sm = subPointCaps(a)[i];
    if (values()[tab][i] + (pending[key] || 0) >= sm) { api.rumble(120, 0.2); api.toast(`${a.subs[i][0]} is at its max (${sm})`); return; }
    const lv = level(), cap = a.caps[lv - 1];
    if (attrValue(tab) >= a.max) { api.rumble(120, 0.2); api.toast(`${SHORT[tab]} is at its Max Stat (${a.max})`); return; }
    if (attrValue(tab) >= cap) {
      api.rumble(120, 0.2);
      api.toast(lv < 5 ? `${SHORT[tab]} is at its Lv ${pad2(lv)} cap (${cap}) · Style Lv ${pad2(lv + 1)} raises it to ${a.caps[lv]}` : `${SHORT[tab]} is maxed (${a.hard})`);
      return;
    }
    pending[key] = (pending[key] || 0) + 1;
    renderAttr();
    api.rumble(50, 0.25);
  }

  function onDir(dir) {
    const f = api.getFocused?.();
    if (!f || !f.classList.contains("attr-row")) return false;
    adjust(+f.dataset.id.slice(1), dir === "right" ? 1 : -1);
    return true;
  }

  function commit() {
    const n = pendingTotal();
    for (const [k, g] of Object.entries(pending)) {
      const [t, i] = k.split(":");
      values()[t][+i] += g;
    }
    pending = {};
    persist();
    const ptsIn = document.getElementById("attrPointsDev");
    if (ptsIn) ptsIn.value = pts();
    renderAttr();
    api.rumble(140, 0.5);
    api.toast(`Attributes saved (+${n}) · ${pts()} points left`);
    diamondRipple();
  }

  // Style Emblem outline (user 2026-11-18): a "hidden yantra" - the outline stays invisible (alpha 0) except where soft noise
  // patches show it, and the patches drift (user: "make it move"). Baked once: the warm outline (alpha boosted x10, the PNG is
  // only ~10 %) + 3 seamless noise tiles; CSS pans each tile as a mask in its own direction / speed.
  // ---- Overall card VFX settings, per Tactical Style (user 2026-11-19): style-presets.js "attr" via MTX_STYLE_DEV,
  // edited in Dev > VFX card (style-dev.js binds the inputs). Emblem look + Overall change mode + Confirm VFX on / off.
  // (was the global store key "attr_vfx"; style-dev.js migrates it)
  const VFX_DEF = {
    noise: true, speed: 1, size: 6, amount: 50, soft: 4, bright: 100, color: "#ffe4aa",
    overallAnim: "fade", flash: true, ring: true, ripple: true, pop: true
  };
  let vfx = { ...VFX_DEF };
  function loadVfx() {
    vfx = { ...VFX_DEF, ...(window.MTX_STYLE_DEV?.get(styleId()).attr || {}) };
  }
  // CSS-only settings: speed, brightness, noise on / off
  function applyVfx() {
    const scr = api.screens.attributes;
    if (!scr) return;
    scr.style.setProperty("--emblem-speed", vfx.speed);
    scr.style.setProperty("--emblem-op", vfx.bright / 100);
    scr.classList.toggle("no-emblem-noise", !vfx.noise);
  }
  function bindVfxDev() {
    // per-style VFX values (Dev > VFX) or a new Tactical Style: reload, re-bake the mask when its look changed
    let regen = null;
    document.addEventListener("mtx:styledev", e => {
      const p = e.detail?.path;
      if (p && !p.startsWith("attr.")) return;
      const old = { ...vfx };
      loadVfx(); applyVfx();
      if (["size", "amount", "soft", "color"].some(k => vfx[k] !== old[k])) { clearTimeout(regen); regen = setTimeout(emblemMask, 120); }
      if (!p && api.getCur() === "attributes") renderAttr();
    });
    document.getElementById("attrVfxTest")?.addEventListener("click", () => diamondRipple());
    document.getElementById("attrVfxReset")?.addEventListener("click", () => {
      window.MTX_STYLE_DEV?.resetGroup(styleId(), "attr"); api.toast("VFX of this style back to preset");
    });
  }

  let emblemImg = null;
  function emblemMask() {
    if (!emblemImg) {
      emblemImg = new Image();
      emblemImg.onload = emblemMask;
      emblemImg.src = "mtx/assets/img/attr-emblem-outline.png?v=2";   // 1 px stroke (Figma 880:126314, 2026-11-18)
      return;
    }
    if (!emblemImg.complete || !emblemImg.width) return;
    const img = emblemImg, w = img.width, h = img.height;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, w, h);
    const col = parseInt(vfx.color.slice(1), 16), cr = col >> 16 & 255, cg = col >> 8 & 255, cb = col & 255;
    for (let i = 0; i < px.data.length; i += 4) {
      px.data[i] = cr; px.data[i + 1] = cg; px.data[i + 2] = cb;
      px.data[i + 3] = Math.min(255, px.data[i + 3] * 10);
    }
    g.putImageData(px, 0, 0);
    const line = c.toDataURL();
    // seamless noise tile: random grid tiled 3 x 3, drawn up-scaled (bilinear), middle cut out; two octaves
    const cut = 1 - vfx.amount / 100;   // amount 50 % -> the bright half of the noise shows
    const tile = seed => {
      let x = seed * 9301 + 49297;
      const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
      const big = document.createElement("canvas");
      big.width = w * 3; big.height = h * 3;
      const bg = big.getContext("2d");
      bg.imageSmoothingEnabled = true;
      [[vfx.size, 1], [Math.round(vfx.size * 2.3), 0.45]].forEach(([cells, a]) => {
        const rows = Math.max(1, Math.round(cells * h / w)), sm = document.createElement("canvas");
        sm.width = cells * 3; sm.height = rows * 3;
        const sg = sm.getContext("2d"), d = sg.createImageData(cells, rows);
        for (let i = 0; i < d.data.length; i += 4) { const v = rnd() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
        for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) sg.putImageData(d, tx * cells, ty * rows);
        bg.globalAlpha = a;
        bg.drawImage(sm, 0, 0, w * 3, h * 3);
      });
      const nz = bg.getImageData(w, h, w, h);
      for (let i = 0; i < nz.data.length; i += 4) {
        nz.data[i + 3] = 255 * Math.max(0, Math.min(1, (nz.data[i] / 255 - cut) * vfx.soft));
        nz.data[i] = nz.data[i + 1] = nz.data[i + 2] = 0;
      }
      g.clearRect(0, 0, w, h);
      g.putImageData(nz, 0, 0);
      return c.toDataURL();
    };
    const masks = [1, 2, 3].map(tile);
    api.screens.attributes?.querySelectorAll(".attr-emblem__n").forEach((el, i) => {
      el.style.backgroundImage = `url(${line})`;
      el.style.webkitMaskImage = el.style.maskImage = `url(${masks[i]})`;
    });
  }

  // Overall number change on A / D (user 2026-11-18), picked in Dev > Attributes "Overall change":
  //   fade    = new value at once, a copy of the old number fades out on top (default)
  //   lerp    = the shown number counts to the new value
  //   roll    = changed digits roll like a slot-machine reel (soft fade at the window edges)
  //   instant = plain swap
  const OLD_FADE_MS = 380, LERP_MS = 450;
  function overallReset(el, to) {
    cancelAnimationFrame(el._lerpRaf); clearTimeout(el._lerpEnd);
    el.parentNode.querySelectorAll(".attr-overall__old").forEach(o => o.remove());
    el.classList.remove("is-roll");
    el._shown = to;
    el.textContent = to;
  }
  function setOverall(el, to) {
    if (!el) return;
    const prev = el.dataset.v === undefined ? NaN : +el.dataset.v;
    el.dataset.v = to;
    const live = api.getCur() === "attributes" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mode = vfx.overallAnim || "fade";
    if (isNaN(prev) || prev === to || !live || mode === "instant") { overallReset(el, to); return; }
    if (mode === "lerp") return overallLerp(el, to);
    if (mode === "roll") return overallRoll(el, prev, to);
    overallReset(el, to);
    const old = el.cloneNode(false);
    old.className = "attr-overall__value attr-overall__old";
    old.removeAttribute("data-bind");
    old.textContent = prev;
    el.after(old);
    old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OLD_FADE_MS, easing: "ease-out", fill: "forwards" });
    setTimeout(() => old.remove(), OLD_FADE_MS + 40);
  }
  function overallLerp(el, to) {
    const from = el._shown === undefined || el.classList.contains("is-roll") ? +el.textContent || to : el._shown;
    overallReset(el, from);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / LERP_MS), e = 1 - Math.pow(1 - p, 3);   // ease-out cubic
      el._shown = from + (to - from) * e;
      el.textContent = Math.round(el._shown);
      if (p < 1) el._lerpRaf = requestAnimationFrame(step);
    };
    el._lerpRaf = requestAnimationFrame(step);
    el._lerpEnd = setTimeout(() => { cancelAnimationFrame(el._lerpRaf); el._shown = to; el.textContent = to; }, LERP_MS + 60);   // lands even if frames pause
  }
  function overallRoll(el, from, to) {
    overallReset(el, to);
    const a = String(from), b = String(to), n = Math.max(a.length, b.length);
    const pa = a.padStart(n, " "), pb = b.padStart(n, " "), up = to > from;
    el.classList.add("is-roll");
    el.innerHTML = [...pb].map((d, i) => {
      const o = pa[i];
      if (o === d) return `<span class="ov-d"><i>${d}</i></span>`;
      const col = up ? `<i>${o}</i><i>${d}</i>` : `<i>${d}</i><i>${o}</i>`;
      return `<span class="ov-d"><span class="ov-d__col${up ? "" : " is-down"}">${col}</span></span>`;
    }).join("");
    const cols = [...el.querySelectorAll(".ov-d__col")];
    let left = cols.length;
    cols.forEach((c, i) => {
      const down = c.classList.contains("is-down");
      c.animate([{ transform: `translateY(${down ? -50 : 0}%)` }, { transform: `translateY(${down ? 0 : -50}%)` }],
        { duration: 420, delay: i * 60, easing: "cubic-bezier(.25, 1.35, .45, 1)", fill: "both" }).onfinish = () => {
        if (--left) return;
        if (+el.dataset.v === to) overallReset(el, to);
      };
    });
    el._lerpEnd = setTimeout(() => { if (+el.dataset.v === to) overallReset(el, to); }, 420 + cols.length * 60 + 80);   // lands even if frames pause
  }

  // confirm VFX (user 2026-11-18): copies of the side card diamond line art run up the card as a ripple, then fade
  function diamondRipple() {
    const side = api.screens.attributes?.querySelector(".attr-side");
    if (!side || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // option A (user 2026-11-18): the whole card flips black <-> gold for a moment, like a button press
    if (vfx.flash) {
      side.classList.remove("is-flash"); void side.offsetWidth; side.classList.add("is-flash");
      clearTimeout(side._flashT); side._flashT = setTimeout(() => side.classList.remove("is-flash"), 140);
    }
    side.querySelectorAll(".attr-side__ripple").forEach(r => r.remove());
    if (vfx.ripple) [0, 160, 320].forEach(delay => {
      const r = document.createElement("i");
      r.className = "attr-side__ripple";
      r.style.animationDelay = delay + "ms";
      r.addEventListener("animationend", () => r.remove());
      side.appendChild(r);
    });
    // option 3 Shockwave (user 2026-11-18): a gold frame fades in on the card edge, spreads out and fades away (no hard pop)
    side.parentNode.querySelectorAll(".attr-side__ring").forEach(r => r.remove());
    if (vfx.ring) {
    const ring = document.createElement("i");
    ring.className = "attr-side__ring";
    side.after(ring);
    // opacity and size run separately: soft fade in, linger, slow fade out; the frame keeps easing outward the whole time
    ring.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0.85, offset: 0.45 }, { opacity: 0 }],
      { duration: 1000, easing: "ease-in-out" }).onfinish = () => ring.remove();
    ring.animate([{ transform: "scale(1)" }, { transform: "scale(1.1, 1.05)" }],
      { duration: 1000, easing: "cubic-bezier(.2, .7, .3, 1)" });
    }
    // the new Overall number pops in and leaves a fading afterimage
    const val = side.querySelector(".attr-overall__value");
    if (val && vfx.pop) {
      side.querySelectorAll(".attr-overall__ghost").forEach(g => g.remove());
      const ghost = val.cloneNode(true);
      ghost.classList.add("attr-overall__ghost");
      ghost.removeAttribute("data-bind");
      val.after(ghost);
      ghost.animate([{ opacity: 0.7, transform: "translateX(-50%) scale(1)" }, { opacity: 0, transform: "translateX(-50%) scale(1.6)" }],
        { duration: 650, delay: 140, easing: "ease-out", fill: "backwards" }).onfinish = () => ghost.remove();
      val.animate([{ transform: "translateX(-50%) scale(1.3)" }, { transform: "translateX(-50%) scale(1)" }],
        { duration: 420, delay: 140, easing: "cubic-bezier(.2, .8, .3, 1.3)" });
    }
  }

  function isHoldReady() {
    return api.getCur() === "attributes";
  }

  function startHold() {
    if (hold.active || !isHoldReady()) return false;
    if (!pendingTotal()) { api.toast("Add points with A / D first"); return false; }
    return hold.start(api.bind("attrConfirm"));
  }

  function cancelHold(hint = true) {
    hold?.cancel(hint);
  }

  function step(dir) {
    tab = KEYS[(KEYS.indexOf(tab) + dir + KEYS.length) % KEYS.length];
    renderAttr();
  }

  window.MTX_SCREENS.attributes = {
    bindApi,
    init,
    enter,
    renderAttr,
    onDir,
    isHoldReady,
    startHold,
    cancelHold,
    resetAll,
    actions: {
      pickTab(el) { tab = el.dataset.tab; renderAttr(); },
      prevTab() { step(-1); },
      nextTab() { step(1); },
      upgradeAttr(el) { adjust(+el.dataset.id.slice(1), 1); },   // mouse click on a row = +1
      confirmAttr() { if (pendingTotal()) commit(); }
    }
  };
})();
