/* Player progression + wallet: one place for the values the top HUD shows, linked to the screens that use them.

   Tracks (XP per level from 18_LegacyCoreLevel.csv, via player-data.js)
     E  Level      Attribute points earned = E level x CONFIG.attrPerELevel (the Attributes screen subtracts what is invested)
     S  Level      every level up gives CONFIG.skillPerSLevel Skill points (spent in the Skill tree)
     Style Level   one per style. Completing that style's Quests counts towards its level; the quest count a level
                   needs (= the Quests screen levels) unlocks its next Style Level, which gates its Quests and Attributes caps
     R  Level      Reputation
   Points are never set by hand: to get Attribute / Skill points, add E / S XP (dev panel: +XP / +1 level).
   GDD + 18_LegacyCoreLevel.csv define the XP curve but not the points per level, so the rates live in CONFIG.
   Wallet
     rank icon     from RP, using the Leaderboard rank ladder (Street Fight V ... Champion Rank)
     L             premium currency
     cash          Credits / Money (the Store spends it)

   API (window.MTX_PLAYER)
     get()                      -> current state (copy)
     set(patch)                 -> change any value(s); saved + everything re-renders
     addXp("e"|"s"|"r", n)      -> XP with level ups (and their E -> Attribute points / S -> Skill points rewards)
     addLevels(t, n)            -> exactly enough XP for n level ups
     levelReward(t)             -> text of what one level up of that track gives ("+5 Attribute points")
     styleOf(id)                -> { level, quests } of one style (quests = done inside the current level)
     setStyle(id, patch)        -> change one style's level / quests
     addQuestDone(id, n = 1)    -> n quests of that style completed, with Style Level unlocks
     attrTotal()                -> Attribute points earned so far (from the E level)
     spendCash(n)               -> false when there is not enough
     need(track)                -> XP needed for the next level of that track
     on(fn)                     -> fn(state, change) after every change; returns an unsubscribe
     reset()                    -> back to DEFAULTS
   Saved in localStorage "mtx.player". */
(function () {
  const KEY = "mtx.player";
  const XP = window.MTX_PLAYER_DATA || { e: [], s: [], r: [] };

  const CONFIG = {
    attrPerELevel: 5,          // Attribute points per E level up
    skillPerSLevel: 1,         // Skill points per S level up
    styleTargets: [6, 6, 6, 6, 6],   // quests to complete for each Style Level (Quests overrides with its own)
    maxStyleLevel: 5
  };

  const DEFAULTS = {
    e: { level: 25, xp: 2512 },
    s: { level: 12, xp: 1800 },
    r: { level: 12, xp: 2512 },
    styles: { phranakhon: { level: 2, quests: 1 } },   // per style: Style Level 1-5 + quests done inside that level (default: Lv 1, 0)
    personality: { professional: 0, boastful: 0, controversy: 0, cold: 0 },   // answers per tone (components/personality.js)
    skillTotal: 10,            // Skill points earned so far (S level ups); the Skill tree subtracts what its nodes cost
    rp: 612,                   // Rank Points
    l: 89,
    cash: 19523
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  let state = load();
  const listeners = new Set();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved && !saved.styles && saved.styleLevel) {   // older save: one Style Level shared by all styles
        saved.styles = { phranakhon: { level: saved.styleLevel, quests: 0 } };
        delete saved.styleLevel;
        delete saved.mp;
      }
      if (saved) delete saved.attrPoints;   // older save: points are derived from the E level now
      if (saved) return Object.assign(clone(DEFAULTS), saved, {
        e: Object.assign({}, DEFAULTS.e, saved.e), s: Object.assign({}, DEFAULTS.s, saved.s), r: Object.assign({}, DEFAULTS.r, saved.r),
        personality: Object.assign({}, DEFAULTS.personality, saved.personality)
      });
    } catch (e) { /* corrupt: defaults */ }
    // first run: carry over values the screens kept on their own before (store cash)
    const st = clone(DEFAULTS);
    const oldCash = +localStorage.getItem("mtx.store_cash");
    if (oldCash > 0) st.cash = oldCash;
    const oldSkill = localStorage.getItem("mtx.skillTotal");
    const oldN = parseInt(String(oldSkill).replace(/\D/g, ""), 10);
    if (oldSkill != null && oldN >= 0) st.skillTotal = oldN;
    return st;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function emit(change) {
    save();
    render();
    listeners.forEach(fn => { try { fn(get(), change); } catch (e) { console.error(e); } });
  }

  const get = () => clone(state);
  const need = t => XP[t][Math.max(0, Math.min(XP[t].length - 1, state[t].level - 1))] || 1;
  const styleOf = id => Object.assign({ level: 1, quests: 0 }, state.styles[id]);
  const styleTarget = id => CONFIG.styleTargets[Math.max(0, styleOf(id).level - 1)] || 1;

  function set(patch) {
    for (const [k, v] of Object.entries(patch || {})) {
      if (["e", "s", "r", "personality"].includes(k) && v && typeof v === "object") state[k] = Object.assign({}, state[k], v);
      else state[k] = v;
    }
    clampAll();
    emit({ type: "set", patch });
  }

  function clampAll() {
    for (const t of ["e", "s", "r"]) {
      state[t].level = Math.max(1, Math.min(XP[t].length || 1, Math.round(+state[t].level || 1)));
      state[t].xp = Math.max(0, Math.round(+state[t].xp || 0));
    }
    for (const st of Object.values(state.styles)) {
      st.level = Math.max(1, Math.min(CONFIG.maxStyleLevel, Math.round(+st.level || 1)));
      st.quests = Math.max(0, Math.round(+st.quests || 0));
      delete st.mp;   // older save: Mastery Points are gone, levels count quests
    }
    for (const k of ["skillTotal", "rp", "l", "cash"]) state[k] = Math.max(0, Math.round(+state[k] || 0));
  }

  // XP in, level ups out. E level ups give Attribute points, S level ups give Skill points.
  function gainXp(t, n) {
    const tr = state[t];
    tr.xp = Math.max(0, tr.xp + Math.round(n));   // negative = XP lost inside the level (never a level down)
    let ups = 0;
    while (tr.level < XP[t].length && tr.xp >= need(t)) { tr.xp -= need(t); tr.level++; ups++; }
    if (ups && t === "s") { state.skillTotal += ups * CONFIG.skillPerSLevel; }
    return ups;
  }

  function addXp(t, n) {
    const ups = gainXp(t, n);
    emit({ type: "xp", track: t, gained: n, levelUps: ups });
    return ups;
  }

  // XP for exactly n level ups (keeps the XP already earned towards the level after)
  function addLevels(t, n = 1) {
    let ups = 0, gained = 0;
    for (let i = 0; i < n && state[t].level < XP[t].length; i++) {
      const g = need(t) - state[t].xp;
      gained += g;
      ups += gainXp(t, g);
    }
    emit({ type: "xp", track: t, gained, levelUps: ups });
    return ups;
  }

  const levelReward = t => t === "e" ? `+${CONFIG.attrPerELevel} Attribute points`
    : t === "s" ? `+${CONFIG.skillPerSLevel} Skill point${CONFIG.skillPerSLevel > 1 ? "s" : ""}`
    : "Reputation";

  function setStyle(id, patch) {
    state.styles[id] = Object.assign(styleOf(id), patch);
    clampAll();
    emit({ type: "style", id, patch });
  }

  function addQuestDone(id, n = 1) {
    const st = state.styles[id] = styleOf(id), before = st.level;
    st.quests += Math.max(0, Math.round(n));
    while (st.level < CONFIG.maxStyleLevel && st.quests >= styleTarget(id)) { st.quests -= styleTarget(id); st.level++; }
    emit({ type: "quest", id, gained: n, styleUps: st.level - before });
  }

  function spend(key, n) {
    if (state[key] < n) return false;
    state[key] -= n;
    emit({ type: "spend", key, n });
    return true;
  }

  function reset() {
    state = clone(DEFAULTS);
    emit({ type: "reset" });
  }

  // ---------------------------------------------------------------- HUD (every .player-hud on every screen)
  const fmt = n => Math.round(n).toLocaleString("en-US");

  function rankIcon() {
    const lb = window.MTX_SCREENS?.leaderboard;
    const r = lb?.rankOf?.(state.rp);
    return r ? { src: `mtx/assets/img/badges/${r.img}.webp`, label: r.label } : null;
  }

  function render() {
    // every E / S / R chip on the page: HUD chips (value + XP + bar) and the mini chips on profile cards (value only)
    document.querySelectorAll("[data-pl]").forEach(chip => {
      const t = chip.dataset.pl, tr = state[t];
      if (!tr) return;
      const nx = need(t);
      chip.style.setProperty("--p", Math.min(100, tr.xp / nx * 100).toFixed(1) + "%");
      const v = chip.querySelector(".level-chip__value"), xp = chip.querySelector(".level-chip__xp");
      if (v) v.textContent = tr.level;
      if (xp) xp.textContent = `${fmt(tr.xp)} / ${fmt(nx)} XP`;
    });
    const huds = document.querySelectorAll(".player-hud");
    if (!huds.length) return;
    const rank = rankIcon();
    huds.forEach(h => {
      const badge = h.querySelector("[data-pl-rank]");
      if (badge && rank) { badge.src = rank.src; badge.alt = rank.label; badge.title = `${rank.label} · ${fmt(state.rp)} RP`; }
      const l = h.querySelector("[data-pl-l]");
      if (l) l.textContent = fmt(state.l);
      const cash = h.querySelector("[data-pl-cash]");
      if (cash) cash.textContent = fmt(state.cash);
    });
  }

  // ---------------------------------------------------------------- dev panel section (Inspect column)
  function mountDev() {
    const host = document.getElementById("tabContentSystem");
    if (!host || document.getElementById("devPlayer")) return;
    const sec = document.createElement("section");
    sec.className = "dev-sec";
    sec.id = "devPlayer";
    const field = (key, label, path) => `<label>${label} <input type="number" min="0" data-pl-dev="${path}"></label>`;
    sec.innerHTML = `
      <h3 class="dev-sec__title">Player · level &amp; wallet</h3>
      ${field("eLevel", "E level", "e.level")}${field("eXp", "E XP", "e.xp")}
      ${field("sLevel", "S level", "s.level")}${field("sXp", "S XP", "s.xp")}
      ${field("style", "Style level (1-5), selected style", "style.level")}${field("quests", "Quests done in level, selected style", "style.quests")}
      ${field("rLevel", "R level (Reputation)", "r.level")}${field("rXp", "R XP", "r.xp")}
      ${field("rp", "Rank points (RP)", "rp")}${field("l", "L", "l")}${field("cash", "Cash", "cash")}
      <p class="dev-note">E level up ${levelReward("e")} · S level up ${levelReward("s")}</p>
      <div class="dev-row">
        <button class="chip" type="button" data-pl-add="e">+1000 E XP</button>
        <button class="chip" type="button" data-pl-add="s">+1000 S XP</button>
        <button class="chip" type="button" data-pl-add="r">+1000 R XP</button>
      </div>
      <div class="dev-row">
        <button class="chip" type="button" data-pl-lv="e">+1 E level</button>
        <button class="chip" type="button" data-pl-lv="s">+1 S level</button>
        <button class="chip" type="button" data-pl-lv="r">+1 R level</button>
      </div>
      <button class="chip" type="button" data-pl-quest>+1 quest done, selected style</button>
      <button class="chip" type="button" data-pl-reset>Reset player</button>`;
    host.insertBefore(sec, host.firstChild);
    const inputs = [...sec.querySelectorAll("[data-pl-dev]")];
    const selStyle = () => window.MTX_SCREENS?.tactical?.getSelStyle?.() || "phranakhon";
    const read = path => path.startsWith("style.") ? styleOf(selStyle())[path.slice(6)] : path.split(".").reduce((o, k) => o[k], state);
    const fill = () => inputs.forEach(i => { if (document.activeElement !== i) i.value = read(i.dataset.plDev); });
    inputs.forEach(i => i.addEventListener("change", () => {
      const [a, b] = i.dataset.plDev.split(".");
      if (a === "style") { setStyle(selStyle(), { [b]: +i.value }); return; }
      set(b ? { [a]: { [b]: +i.value } } : { [a]: +i.value });
    }));
    sec.querySelectorAll("[data-pl-add]").forEach(btn => btn.addEventListener("click", () => {
      const ups = addXp(btn.dataset.plAdd, 1000);
      window.MTX?.api?.toast?.(`+1000 ${btn.dataset.plAdd.toUpperCase()} XP${ups ? ` · level up ×${ups}` : ""}`);
    }));
    mountLevelButtons(sec);
    // completes the next open quest on the Quests screen (rows + count stay in step); store only when that screen is missing
    sec.querySelector("[data-pl-quest]").addEventListener("click", () => {
      if (!window.MTX_SCREENS?.quests?.completeNext?.()) addQuestDone(selStyle(), 1);
    });
    sec.querySelector("[data-pl-reset]").addEventListener("click", () => { reset(); window.MTX?.api?.toast?.("Player reset"); });
    listeners.add(fill);
    fill();
  }

  // any [data-pl-lv="e|s|r"] button (Player, Attributes, Skill tree dev sections): +1 level of that track
  function mountLevelButtons(root = document) {
    root.querySelectorAll("[data-pl-lv]").forEach(btn => {
      if (btn.dataset.plBound) return;
      btn.dataset.plBound = "1";
      btn.addEventListener("click", () => {
        const t = btn.dataset.plLv, ups = addLevels(t, +btn.dataset.plN || 1);
        window.MTX?.api?.toast?.(ups ? `${t.toUpperCase()} level ${state[t].level} · ${levelReward(t)}${ups > 1 ? ` ×${ups}` : ""}` : `${t.toUpperCase()} is at max level`);
      });
    });
  }

  window.MTX_PLAYER = {
    CONFIG, DEFAULTS,
    get, set, addXp, addLevels, levelReward, styleOf, setStyle, addQuestDone, need, styleTarget, reset, mountLevelButtons,
    spendCash: n => spend("cash", n),
    attrTotal: () => state.e.level * CONFIG.attrPerELevel,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    render
  };

  // the HUD clones exist once app.js has run (end of body); fill them + the dev section then
  const boot = () => { render(); mountDev(); mountLevelButtons(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);
})();
