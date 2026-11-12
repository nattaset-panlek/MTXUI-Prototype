/* Settings (Options -> Settings) - full-screen overlay over the current page, the in-game Settings layout:
   tab row with LB / RB (Q / E) · page title · list of settings (‹ value › or slider) · description of the focused one.
     ↑ ↓ focus   ← → change   A toggle (On / Off) or open (link)   Y restore defaults (this page)   Start save (hint shows Saved, greyed, when nothing changed)   B back
   Changes are a draft until Start saves them (localStorage); B with unsaved changes asks: save and exit, or exit without saving. The hint bar follows the focused row: see fieldHints.
   window.MTX_SETTINGS = { open, close, toggle, isOpen, input, render } */
(() => {
  //#region [Data] Figma 242:85659 "Setting Page - In Game". kind: "opt" (‹ value ›) | "slider" (1 % steps) | "link" (value ›, A opens it) | "head"
  // off: shown but locked (grey). desc + the value list show in the right column; sliders say "0-100 %" instead
  const ONOFF = ["On", "Off"], QUAL = ["Low", "Medium", "High", "Ultra"];
  const PAGES = [
    ["Gameplay", [
      { label: "Training Difficulty", kind: "opt", vals: ["Easy", "Medium", "Hard", "Pro"], v: 1, desc: "Sets how hard training opponents fight back." },
      { label: "Bot Stop Attack", kind: "opt", vals: ["Off", "On"], v: 0, desc: "Training opponents stop throwing strikes and only defend." },
      { label: "Camera Shake", kind: "opt", vals: ["Off", "Low", "Medium", "High"], v: 2, desc: "Camera shake on heavy hits and knockdowns." },
      { label: "HUD Visibility", kind: "opt", vals: ONOFF, v: 0, desc: "Controls the overall visibility of the HUD, separate from the individual Interface settings below." },
      { label: "Color Blind Mode", kind: "opt", vals: ["Off", "Protanopia", "Deuteranopia", "Tritanopia"], v: 0, desc: "Adjusts health, stamina and corner colours." },
      { label: "Camera Distance", kind: "opt", vals: ["Close", "Standard", "Far"], v: 1, desc: "How far the fight camera sits from the fighters." },
      { label: "Damage Visual Detail", kind: "opt", vals: ["Reduced", "Normal", "Full"], v: 1, desc: "How much cuts, swelling and blood are shown." },
    ]],
    ["Controls", [
      { label: "Device", kind: "opt", vals: ["Controller", "Mouse and Keyboard"], v: 0, pad: true, desc: "Automatically detects the most recently active input device when switching during gameplay." },
      { label: "Button Mapping", kind: "opt", vals: ["Default"], v: 0, off: true, desc: "Button layout for strikes, clinch and defence." },
      { label: "Input Buffer", kind: "opt", vals: ["Short", "Normal", "Long"], v: 1, desc: "How early an input is held for the next action in a combo." },
      { label: "Vibration Strength", kind: "slider", v: 70, desc: "Overall strength of controller vibration." },
      { label: "Stick Deadzone", kind: "slider", v: 10, desc: "How far the stick moves before it counts as input." },
      { label: "Rumble on Hit / Block", kind: "opt", vals: ONOFF, v: 0, desc: "Controller vibration when a strike lands or is blocked." },
      { label: "Button Icon Style", kind: "opt", vals: ["Auto", "Xbox", "PlayStation", "Keyboard"], v: 0, off: true, desc: "Which button icons the game shows. Auto follows the last input." },
    ]],
    ["Audio", [
      { label: "Master Volume", kind: "slider", v: 80, desc: "Overall game volume." },
      { label: "Music Volume", kind: "slider", v: 60, desc: "Menu and walkout music." },
      { label: "Commentary Volume", kind: "slider", v: 70, desc: "Ringside commentary during fights." },
      { label: "Crowd Volume", kind: "slider", v: 65, desc: "Crowd noise and reactions in the arena." },
      { label: "SFX Volume", kind: "slider", v: 85, desc: "Dedicated category for impact, punch, kick, footstep, and combat SFX. Previously, these core fighting sounds had no separate category." },
      { label: "Ring Announcer Volume", kind: "slider", v: 75, desc: "Fighter introductions and round calls." },
      { label: "Audio Output", kind: "opt", vals: ["Stereo", "Surround 5.1", "Surround 7.1", "Headphones"], v: 0, desc: "Speaker setup the mix is made for." },
    ]],
    ["Graphics", [
      { kind: "head", label: "Display & Performance" },
      { label: "Graphics Mode", kind: "opt", vals: ["Performance", "Quality"], v: 0, desc: "Selects a preset that prioritises frame rate or image quality." },
      { label: "Display Mode", kind: "opt", vals: ["Fullscreen", "Borderless", "Windowed"], v: 0, desc: "How the game window fills the screen." },
      { label: "Resolution", kind: "opt", vals: ["Auto", "1280 x 720", "1920 x 1080", "2560 x 1440", "3840 x 2160"], v: 0, desc: "Render resolution. Auto matches the display." },
      { label: "VSync", kind: "opt", vals: ["Off", "On", "Auto"], v: 2, desc: "Syncs frames to the display to stop tearing." },
      { label: "Frame Rate Limit", kind: "opt", vals: ["30 FPS", "60 FPS", "120 FPS", "Unlimited"], v: 1, desc: "Caps the frame rate." },
      { label: "Dynamic Resolution", kind: "opt", vals: ONOFF, v: 0, desc: "Helps maintain stable frame rates on consoles, especially during physics-intensive Corner and Ragdoll scenes." },
      { label: "Render Scale", kind: "slider", v: 100, max: 200, desc: "Internal resolution scale. Lower is faster, higher is sharper." },
      { kind: "head", label: "Quality" },
      { label: "Overall Quality", kind: "opt", vals: [...QUAL, "Custom"], v: 2, desc: "Selecting Overall adjusts all sub-settings below at once. Players can still fine-tune each setting individually afterward (Custom)." },
      { label: "Texture Quality", kind: "opt", vals: QUAL, v: 2, desc: "Sharpness of fighter, gear and arena textures." },
      { label: "Shadow Quality", kind: "opt", vals: QUAL, v: 2, desc: "Shadow detail and softness." },
      { label: "Effects Quality", kind: "opt", vals: QUAL, v: 2, desc: "Sweat, impact and particle effects." },
      { label: "Crowd Quality", kind: "opt", vals: QUAL, v: 1, desc: "Crowd density and animation detail." },
      { label: "Post Processing", kind: "opt", vals: QUAL, v: 2, desc: "Bloom, depth of field and colour grading." },
      { label: "Anti-Aliasing", kind: "opt", vals: ["Off", "FXAA", "TAA"], v: 2, desc: "Smooths jagged edges." },
    ]],
    ["Online", [
      { label: "Crossplay", kind: "opt", vals: ONOFF, v: 0, desc: "Match with players on other platforms." },
      { label: "Region", kind: "opt", vals: ["Auto", "Asia", "Europe", "North America", "South America", "Oceania"], v: 0, desc: "Matchmaking region. Auto picks the lowest ping." },
      { label: "Preferred Server", kind: "opt", vals: ["Auto", "Choose region"], v: 0, desc: "With a dedicated server architecture, manual server selection helps players near regional boundaries achieve better ping." },
      { label: "Matchmaking Preference", kind: "opt", vals: ["Balanced", "Connection", "Skill"], v: 0, desc: "What matchmaking weighs first when finding an opponent." },
      { label: "Show Ping", kind: "opt", vals: ONOFF, v: 0, desc: "Shows your connection quality during online fights." },
      { label: "Blocked Players", kind: "link", value: "Manage", go: "blocked", desc: "Players you blocked cannot invite you or be matched with you." },
      { label: "Data Saver : Spectator", kind: "opt", vals: ["Off", "On"], v: 0, desc: "Lower data use while watching other fights." },
    ]],
    ["Interface", [
      { label: "Health Bar", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide health bar" },
      { label: "Stamina Bar", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide stamina bar" },
      { label: "DSM Gauge", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide the DSM gauge" },
      { label: "Damage Indicator", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide where strikes land" },
      { label: "Round Timer", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide the round timer" },
      { label: "Fighter Names", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide fighter names" },
      { label: "Per-Body-Part Armor Display", kind: "opt", vals: ONOFF, v: 0, desc: "Show or hide armor for each body part" },
    ]],
  ];
  // defaults for Restore (Y)
  const DEF = PAGES.map(([, rows]) => rows.map(r => r.v));
  // Saved values: stored by page + label, so reordering rows keeps them. A value no longer valid for its row is ignored.
  const STORE = "mtx_settings";
  const validV = (r, v) => Number.isInteger(v) && (r.kind === "slider" ? v >= (r.min ?? 0) && v <= (r.max ?? 100) : r.kind === "opt" && v >= 0 && v < r.vals.length);
  try {
    const got = JSON.parse(localStorage.getItem(STORE) || "{}");
    PAGES.forEach(([t, rows]) => rows.forEach(r => { const v = got[t]?.[r.label]; if (validV(r, v)) r.v = v; }));
  } catch (e) {}
  const snapshot = () => PAGES.map(([, rows]) => rows.map(r => r.v));
  let saved = snapshot();
  //#endregion

  //#region [State / helpers]
  let root = null, open = false, tab = 0, focus = 0, onClose = null;
  const api = () => window.MTX?.api;
  const G = (b, cls) => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b, { cls }) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = () => PAGES[tab][1];
  const live = () => rows().map((r, i) => [r, i]).filter(([r]) => r.kind !== "head");      // focusable rows
  const valText = r => r.kind === "slider" ? `${r.v}${r.unit ?? "%"}` : r.kind === "link" ? r.value : r.vals[r.v];
  const pct = r => (r.v - (r.min ?? 0)) / ((r.max ?? 100) - (r.min ?? 0)) * 100;
  const isToggle = r => r.kind === "opt" && r.vals.length === 2 && r.vals.every(v => v === "On" || v === "Off");
  const dirty = () => PAGES.some(([, rows], t) => rows.some((r, i) => r.v !== saved[t][i]));
  // The keys of the focused row, by field type. A only acts where it is shown (see input). A locked row has no keys of its own.
  function fieldHints(r) {
    if (!r || r.off) return {};
    if (r.kind === "slider") return { "dl+dr": "Adjust" };
    if (r.kind === "link") return { a: "Open" };
    return isToggle(r) ? { a: "Toggle" } : { "dl+dr": "Change" };
  }
  function save() {
    const out = {};
    PAGES.forEach(([t, rows]) => { out[t] = {}; rows.forEach(r => { if (r.v != null) out[t][r.label] = r.v; }); });
    try { localStorage.setItem(STORE, JSON.stringify(out)); } catch (e) {}
    saved = snapshot(); api()?.rumble?.(60, .25); api()?.toast?.("Settings saved");
  }
  function leave() { close(); const cb = onClose; onClose = null; cb?.(); }
  function discardAndLeave() { PAGES.forEach(([, rows], t) => rows.forEach((r, i) => { r.v = saved[t][i]; })); leave(); }
  //#endregion

  //#region [Render]
  function rowHtml(r, i, fi) {
    if (r.kind === "head") return `<p class="st-head">${esc(r.label)}</p>`;
    const on = fi === focus;
    // slider: track + fill; the 1 px tick (em) sits inside the fill at its right end, in the fill colour (Figma MTX / Slider Value)
    const val = r.kind === "slider"
      ? `<b class="st-row__pct">${esc(valText(r))}</b><span class="st-slider"><span class="st-slider__track"><i style="width:${pct(r)}%"><em></em></i></span></span>`
      : `${r.kind === "link" ? "" : `<i class="st-arrow st-arrow--l" aria-hidden="true"></i>`}<b class="st-row__val">${esc(valText(r))}</b><i class="st-arrow st-arrow--r" aria-hidden="true"></i>`;
    return `<div class="st-row st-row--${r.kind} focus-ring${on ? " is-focused" : ""}${r.off ? " is-off" : ""}${r.v !== saved[tab][i] ? " is-dirty" : ""}" data-st-row="${i}" role="${r.kind === "slider" ? "slider" : "button"}"
        aria-label="${esc(r.label)}" aria-valuetext="${esc(valText(r))}"><span class="st-row__label">${esc(r.label)}</span>${val}</div>`;
  }
  function render() {
    if (!root) return;
    const L = live(), [cur] = L[focus] || [];
    let fi = -1;
    const list = rows().map((r, i) => { if (r.kind !== "head") fi++; return rowHtml(r, i, r.kind === "head" ? -1 : fi); }).join("");
    const values = !cur || cur.kind === "link" ? "" : cur.kind === "slider" ? `${cur.min ?? 0}-${cur.max ?? 100} ${cur.unit ?? "%"}\n(Increases or decreases in 1%)` : cur.vals.join(" / ");
    const d = api()?.getDevice?.() || "xbox", pad = d === "kb" ? null : d === "ps" ? (api()?.getPad?.() || "ps5") : "xbox";
    root.innerHTML = `<div class="st__scrim" aria-hidden="true"></div>
      <div class="st__safe">
        <nav class="st-tabs" role="tablist" aria-label="Settings">${G("lt", "st-tabs__key")}${PAGES.map(([t], i) =>
          `<span class="lb-tab st-tab${i === tab ? " is-active" : ""}" data-st-tab="${i}" role="tab" aria-selected="${i === tab}">${esc(t)}</span>`).join("")}${G("rt", "st-tabs__key")}</nav>
        <h1 class="st__title tex-text">${esc(PAGES[tab][0])}</h1>
        <i class="st__rule" aria-hidden="true"></i>
        <section class="st-panel" aria-label="${esc(PAGES[tab][0])} settings"><div class="st-list">${list}</div><i class="st-scroll" aria-hidden="true"><em></em></i></section>
        ${cur ? `<aside class="st-desc" aria-live="polite"><h2>${esc(cur.label)}</h2><i class="st-desc__rule"></i><p>${esc(cur.desc)}</p>${values ? `<p class="st-desc__vals">${esc(values)}</p>` : ""}
          ${cur.pad ? (pad ? `<img class="st-desc__pad" src="mtx/assets/svg/pads/${pad}.svg" alt="">` : `<p class="st-desc__kb">Keyboard: W A S D move · Space confirm · Esc back · Q / E tabs · Tab options · F friends</p>`) : ""}</aside>` : ""}
        ${window.MTX_UI.hintBar({ b: "Back", ...fieldHints(cur), y: "Restore", menu: dirty() ? { label: "Save", attrs: "data-st-save" } : { label: "Saved", off: true } }, { cls: "st__hints" })}
      </div>`;
    const el = root.querySelector(".st-row.is-focused"), box = root.querySelector(".st-list");
    if (el && box) { const t = el.offsetTop, bt = t + el.offsetHeight; if (bt > box.scrollTop + box.clientHeight) box.scrollTop = bt - box.clientHeight + 20; if (t < box.scrollTop) box.scrollTop = Math.max(0, t - 60); }
    // scrollbar: thumb = visible share of the list, at the scroll position (Figma: 7 px yellow thumb on a 3 px track)
    const sb = root.querySelector(".st-scroll"), th = sb?.querySelector("em");
    if (box && sb && th) { const H = sb.clientHeight, tH = Math.max(60, H * Math.min(1, box.clientHeight / box.scrollHeight)), max = box.scrollHeight - box.clientHeight;
      th.style.height = `${tH}px`; th.style.top = `${max > 0 ? (H - tH) * box.scrollTop / max : 0}px`; th.hidden = max <= 0; }   // nothing to scroll: track only
  }
  //#endregion

  //#region [Input]
  // Slider: a tap moves 1. Holding speeds up by hold time, whatever the repeat rate of the key or pad (events < HOLD_GAP ms apart = a hold).
  const HOLD_GAP = 200, HOLD_SPEED = [[600, 15], [1500, 40], [Infinity, 100]];   // [held up to ms, units per second on a 0-100 slider]
  let hold = null;
  function sliderStep(r, d) {
    const now = performance.now();
    if (!hold || hold.r !== r || hold.d !== d || now - hold.last > HOLD_GAP) { hold = { r, d, start: now, last: now, carry: 0 }; return 1; }
    const speed = HOLD_SPEED.find(([ms]) => now - hold.start < ms)[1] * ((r.max ?? 100) - (r.min ?? 0)) / 100;
    hold.carry += speed * (now - hold.last) / 1000; hold.last = now;
    const n = Math.floor(hold.carry); hold.carry -= n; return n;
  }
  function change(d) {
    const [r] = live()[focus] || []; if (!r || r.off) { if (r?.off) api()?.toast?.("Not available in this mode"); return; }
    if (r.kind === "link") { if (d > 0 && r.go === "blocked") { close(); onClose = null; window.MTX_FRIENDS?.open?.({ tab: 3 }); } return; }
    if (r.kind === "slider") r.v = Math.max(r.min ?? 0, Math.min(r.max ?? 100, r.v + d * sliderStep(r, d)));
    else r.v = (r.v + d + r.vals.length) % r.vals.length;
    if (r.label === "Button Icon Style") { const dev = ["auto", "xbox", "ps5", "kb"][r.v]; const sel = document.getElementById("device"); if (sel) { sel.value = dev; sel.dispatchEvent(new Event("change")); } }
    api()?.rumble?.(20, .1); render();
  }
  function input(a) {
    if (a === "menu") return dirty() ? (save(), render()) : undefined;
    if (a === "back") {
      if (!dirty()) return leave();
      return window.MTX_UI.dialog.open({ title: "Unsaved changes", body: "Save your settings before you exit?", primary: "Save", secondary: "Don't save", onPrimary: () => { save(); leave(); }, onSecondary: discardAndLeave });
    }
    if (a === "lt" || a === "rt") { tab = (tab + (a === "lt" ? -1 : 1) + PAGES.length) % PAGES.length; focus = 0; api()?.rumble?.(40, .2); return render(); }
    if (a === "up" || a === "down") { const n = live().length; focus = (focus + (a === "up" ? -1 : 1) + n) % n; api()?.rumble?.(20, .1); return render(); }
    if (a === "left" || a === "right") return change(a === "left" ? -1 : 1);
    if (a === "a") { const [r] = live()[focus] || []; return r && !r.off && (r.kind === "link" || isToggle(r)) ? change(1) : undefined; }
    if (a === "y") { rows().forEach((r, i) => { r.v = DEF[tab][i]; }); render(); return api()?.toast?.(`${PAGES[tab][0]} · defaults restored`); }
  }
  //#endregion

  //#region [Open / close]
  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.id = "settingsMenu"; root.className = "st"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Settings");
    document.getElementById("stage").appendChild(root);
    root.addEventListener("click", e => {
      const t = e.target.closest("[data-st-tab]"); if (t) { tab = +t.dataset.stTab; focus = 0; return render(); }
      const r = e.target.closest("[data-st-row]"); if (!r) return;
      focus = live().findIndex(([, i]) => i === +r.dataset.stRow);
      change(e.target.closest(".st-arrow--l") ? -1 : 1);
    });
  }
  function show(o = {}) {
    window.MTX_FRIENDS?.close?.(); window.MTX_OPTIONS?.close?.(); mount(); open = true; root.hidden = false; document.getElementById("stage")?.classList.add("ovl-open");
    onClose = o.onClose || null; if (o.tab != null) { tab = o.tab; focus = o.focus || 0; }
    render(); api()?.rumble?.(60, .25);
  }
  function close() {
    if (!root) return; open = false; root.hidden = true;
    if (!window.MTX_OPTIONS?.isOpen?.() && !window.MTX_FRIENDS?.isOpen?.()) document.getElementById("stage")?.classList.remove("ovl-open");
  }
  window.MTX_SETTINGS = { open: show, close, toggle: () => (open ? close() : show()), isOpen: () => open, input, render,
    set: (t, f = 0) => { tab = t; focus = f; render(); } };
  //#endregion
})();
