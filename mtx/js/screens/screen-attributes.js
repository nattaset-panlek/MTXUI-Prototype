(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  // Attributes (balancing sheets 08-16, via attr-data.js):
  //   5 attributes per style; each attribute = the sum of its sub-stats and starts at the sheet's Base Stat.
  //   Points go into sub-stats (A = +1). An attribute can't pass its cap for this style's Style Level
  //   (5 levels: base + the "Default Distribution" rows), so the cap bar shows all five notches.
  //   A sub-stat stops at SUB_MAX. Overall = average of the 5 attributes; at OVERALL_MAX this style takes no more points.
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
  const OVERALL_MAX = 100, SUB_MAX = 100;
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

  // Feed: Mastery. TEMPORARY placeholder: Mastery is being reworked and has no attribute bonus data yet.
  // On the rework, replace (or re-register "mastery" from the Mastery code) with the real feed; nothing else here changes.
  // [Style Level reached, sub-stat, amount]
  const MASTERY_PLACEHOLDER = [
    [2, "Knee Power", 2], [2, "Kick Power", 3], [2, "Head Armor", 3],
    [3, "Strike Speed", 3], [3, "Stamina Regeneration", 3],
    [4, "Punch Power", 3], [4, "Critical Rate", 3], [4, "Max Stamina", 5],
    [5, "Damage Reduction", 5], [5, "DSM Charge", 5], [5, "Combo Power", 5]
  ];
  window.MTX_ATTR_BONUS.register("mastery", {
    label: "Mastery", color: "#f6df2f",
    entries({ styleId }) {
      const lv = window.MTX_PLAYER?.styleOf?.(styleId)?.level || 1;
      return MASTERY_PLACEHOLDER.filter(([l]) => l <= lv).map(([l, sub, v]) => ({ sub, value: v, detail: "Style Lv " + String(l).padStart(2, "0") }));
    }
  });
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
      resetAll();
      if (ptsIn) ptsIn.value = pts();
      api.toast("Attributes reset · base values, " + pts() + " points");
    });
    // tabs are not focus stops (Q / E only) but still take a click; the confirm button is a mouse hold
    api.$$("#s-attributes .attr-tab").forEach(t => t.addEventListener("click", e => { e.stopPropagation(); tab = t.dataset.tab; renderAttr(); }));
    const btn = api.bind("attrConfirm");
    btn?.addEventListener("mousedown", e => { if (e.button === 0) startHold(); });
    ["mouseup", "mouseleave"].forEach(ev => btn?.addEventListener(ev, () => cancelHold(ev === "mouseup")));
    btn?.addEventListener("click", e => e.stopPropagation());
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
    const atCap = total >= cap, full = overallFull();

    // hero: attribute total vs this level's cap + the cap bar: five equal segments = Mastery Lv 1-5.
    // Segment 1 runs 0 -> Lv1 cap and already holds the base (grey); each next one spans the cap it adds.
    // White = invested, green = unconfirmed, dark = room in an unlocked level, hatched = locked level.
    const saved = total - gainHere;
    const pc = v => Math.max(0, Math.min(100, v)).toFixed(3) + "%";
    const ladder = a.caps.map((to, k) => {
      const n = k + 1, from = k ? a.caps[k - 1] : 0, span = to - from;
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
      `<p class="attr-hero__total${atCap ? " is-cap" : ""}"><span>${total}</span><small>/ ${cap}</small></p>` +
      `<p class="attr-capbar__label">Style Level</p>` +
      `<div class="attr-capbar">${ladder}</div>`;

    // sub-stat rows: bar out of 100; focused row shows the left / right keys with their availability
    rows.innerHTML = a.subs.map(([n, b], i) => {
      // sub-stat bar on a fixed 0-100 scale
      const v = vals[i], g = pending[`${tab}:${i}`] || 0;
      const pv = Math.min(100, v), pg = Math.min(100 - pv, g);
      const canAdd = left > 0 && !atCap && !full && v + g < SUB_MAX, canRemove = g > 0;
      const G = api.getGlyphs?.()[api.getDevice?.()] || {};
      // additional value from other sources (registered feeds): red "+N" after the value, total only
      const bl = bonusOf(n), bn = bonusSum(bl);
      return `<a class="attr-row focus-ring" data-nav data-id="a${i}" data-fn="upgradeAttr">` +
        `<span class="attr-row__name">${n}</span>` +
        `<span class="attr-row__bar"><i class="attr-row__fill" style="width:${pv}%"></i><i class="attr-row__gain" style="width:${pg}%"></i><i class="attr-row__rest"></i>` +
        `<span class="attr-row__tick${g ? " is-gain" : ""}" style="left:calc(5px + ${(pv + pg) / 100} * (100% - 11px))"></span></span>` +
        `<span class="attr-row__adjust">` +
        `<span class="glyph attr-row__key${canRemove ? "" : " is-off"}" data-btn="dl" aria-hidden="true">${G.dl || "A"}</span>` +
        `<span class="attr-row__value">${v + g}</span>` +
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
    const overall = Math.min(OVERALL_MAX, overallValue());
    api.bind("overall").textContent = Math.floor(overall);
    api.bind("overallRing").style.setProperty("--p", (overall / OVERALL_MAX * 100).toFixed(2));
    api.bind("attrPoints").textContent = left;
    api.bind("attrPointsBox").classList.toggle("is-empty", left <= 0);
    api.bind("attrPointsLabel").textContent = left > 0 ? "Attribute points" : "No points left";
    api.bind("attrConfirm").classList.toggle("is-idle", !pendingTotal());
  }
  //#endregion

  // +1 / -1 on the focused sub-stat (only points not confirmed yet can be taken back)
  function adjust(i, dir) {
    const key = `${tab}:${i}`, a = attr(tab), lv = level(), cap = a.caps[lv - 1];
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
    if (values()[tab][i] + (pending[key] || 0) >= SUB_MAX) { api.rumble(120, 0.2); api.toast(`${a.subs[i][0]} is at its max (${SUB_MAX})`); return; }
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
