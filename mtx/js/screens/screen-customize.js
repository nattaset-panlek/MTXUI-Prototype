(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  /* Character Customize overlay (Figma: mtx-figma-export_CharacterCustomize, 129:728 ... 129:4533).
     Opens over any screen with Tab (keyboard) / View (gamepad); a "[Tab] Character Customization" chip is always on screen.

     Two tabs: Profile · Style preset. Customization is a menu opened from Profile ("Edit appearance").
     Same rule on every screen of the overlay:
       Q / E   (LB / RB)  the top tab row      Profile / Style preset, or the Customization categories
       Z / C   (LT / RT)  the second tab row   Style preset move types, or the Customization sections (Skin, Gloves ...)
       arrows / WASD / stick  move; left / right also change a slider, option row or the section row
       Enter / Space (A) select    Esc / Backspace (B) back: Country -> Preset -> Profile -> close
       X reset this section        Tab (View) close
     Items take real DOM focus with ARIA roles; changes are announced through a polite live region.
     Figma tiles were 180-190 px with 18-36 px gaps; normalised to 196 px tiles with 29 px gaps (4 per row = 871 px panel). */

  //#region [Variables/Fields]
  let api = null;
  const IMG = "mtx/assets/img/";
  const SVG = "mtx/assets/svg/";
  const MOVES = SVG + "moves/";

  // Character preview framing per view: left / top / width of the render in the 1920x1080 frame
  const ZOOM = {
    profile: { x: 660, y: 60, w: 600 },
    edit:    { x: 1150, y: 120, w: 560 },
    full:    { x: 33,  y: 119, w: 634 },
    head:    { x: -363, y: 94, w: 1510 },
    eyes:    { x: -916, y: -116, w: 2600 },   // eyes  (405, 210) on the render
    hands:   { x: 38, y: -1892, w: 2000 },    // hand  (130, 1020)
    shorts:  { x: -407, y: -1171, w: 1500 },  // trunks (420, 960)
    arm:     { x: -152, y: -719, w: 1900 },   // left biceps (220, 560)
    armR:    { x: -1134, y: -810, w: 1900 }   // right arm (650, 600)
  };

  const PAGES = ["Profile", "Style preset"];         // the two tabs; page 2 is the Customization menu
  const CUSTOM = 2;
  const PROFILE_EDIT = 3;                              // Profile > X Edit profile (mtx-figma-exportProfileEdit)

  // ---- Profile showcase data (Fighter Profile 166:3321 / Profile Inventory 166:1657-3170)
  const PF = IMG + "profile/";
  const EDIT_SECTIONS = [
    { id: "info", title: "Information", sub: "Change information on your profile.", icon: "user" },
    { id: "belt", title: "Title belt", sub: "Pick title belts for your showcase.", icon: "belt" },
    { id: "ach", title: "Achievements", sub: "Pick achievements for your showcase.", icon: "medal" },
    { id: "bg", title: "Background", sub: "Select a background for your profile.", icon: "image" },
    { id: "sticker", title: "Stickers", sub: "Select stickers for your profile.", icon: "sticker" }
  ];
  const BELTS = [
    { name: "Lumpinee Stadium", c: "#c8102e", own: true }, { name: "Rajadamnern Stadium", c: "#1f4fbf", own: true },
    { name: "Channel 7 Stadium", c: "#1a1a1a", own: true }, { name: "Omnoi Stadium", c: "#2a8a4a", own: true },
    { name: "Isan Regional", c: "#6a2bd1", own: true }, { name: "King's Cup", c: "#b8860b", own: false },
    { name: "WMC World", c: "#8a1c1c", own: false }, { name: "Thailand National", c: "#123a8a", own: false },
    { name: "Southern Champion", c: "#0e6b6b", own: false }
  ];
  const BELT_TOTAL = 35;
  const ACHIEVEMENTS = [
    { name: "Wai Khru", icon: "wai-khru", tier: "Bronze", own: true, desc: "The entrance sequence is automatically shown the first time the player encounters this fight." },
    { name: "First Step", icon: "first-step", tier: "Bronze", own: true, desc: "Win your first Ultimate Fight (Ranked) match." },
    { name: "Clinch King", icon: "clinch-king", tier: "Silver", own: true, desc: "Land 100 knees from the clinch." },
    { name: "Stadium Climber", icon: "stadium-climber", tier: "Gold", own: true, desc: "Reach the Ring Warrior rank tier." },
    { name: "Stagger Specialist", icon: "clinch-king", tier: "Silver", own: false, desc: "Stagger opponents 50 times." },
    { name: "Ranked Debut", icon: "first-step", tier: "Bronze", own: false, desc: "Finish your first ranked season." },
    { name: "First Blood, First Lesson", icon: "wai-khru", tier: "Bronze", own: false, desc: "Lose a fight by knockout and come back to win the rematch." },
    { name: "Total Knockout", icon: "stadium-climber", tier: "Gold", own: false, desc: "Win 25 fights by knockout." }
  ];
  const ACH_TOTAL = 35;
  const TIER_COLOR = { Bronze: "#b66a2c", Silver: "#b8c0c8", Gold: "#f2df57" };
  const BACKGROUNDS = [
    { name: "Street Fighter", img: PF + "bg-street.webp", own: true },
    { name: "Locker Room", img: PF + "bg-locker.webp", own: true },
    { name: "Skatepark", img: PF + "bg-skatepark.webp", own: true },
    { name: "Korat Gym", img: PF + "bg-korat.webp", own: false }
  ];
  const BG_TOTAL = 35;
  const STICKERS = [
    { name: "Nam Phrik", img: PF + "sticker-thai.webp", own: true },
    { name: "Southpaw", img: PF + "sticker-boxer.webp", own: true },
    { name: "MTX", img: PF + "sticker-mtx.webp", own: true },
    { name: "MTX Gold", img: PF + "sticker-mtx.webp", own: false },
    { name: "MTX Night", img: PF + "sticker-mtx.webp", own: false },
    { name: "MTX Classic", img: PF + "sticker-mtx.webp", own: false }
  ];
  const STICKER_MAX = 30, STICKER_TOTAL = 270;
  // Edit profile section icons: solid, one colour (currentColor); details are cut out with evenodd so they read on
  // any button colour (idle cream / active yellow)
  const PE_ICONS = {
    // ID card: avatar + three text lines cut out
    user: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M3.5 4.5h17A1.5 1.5 0 0 1 22 6v12a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18V6a1.5 1.5 0 0 1 1.5-1.5zM8 7.6a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6zM4.6 16.6c.5-2 1.8-3.2 3.4-3.2s2.9 1.2 3.4 3.2zM13.2 8.4h6.2v1.7h-6.2zm0 3.2h6.2v1.7h-6.2zm0 3.2h4.2v1.7h-4.2z"/></svg>',
    // championship belt: straps + octagon plate with a gem cut out
    belt: '<svg viewBox="0 0 24 24"><path d="M1 9.2h4.6v5.6H1zm17.4 0H23v5.6h-4.6z"/><path fill-rule="evenodd" d="M9 5h6l4 4v6l-4 4H9l-4-4V9zm3 4.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z"/></svg>',
    // trophy cup with handles and base
    medal: '<svg viewBox="0 0 24 24"><path d="M6.5 3h11v5.5a5.5 5.5 0 0 1-4.4 5.4V16h3v2.5H7.9V16h3v-2.1a5.5 5.5 0 0 1-4.4-5.4zM6 20h12v2H6z"/><path d="M6.5 5.5H3.5v1.3a3.7 3.7 0 0 0 3.7 3.7M17.5 5.5h3v1.3a3.7 3.7 0 0 1-3.7 3.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    // picture: solid frame, mountains + sun cut out
    image: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2 4h20v16H2zm2.5 13.5h15l-4.6-6-3.2 4-2.2-2.6zM16.5 6.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z"/></svg>',
    // sticker with its corner peeled up
    sticker: '<svg viewBox="0 0 24 24"><path d="M4 3h16v10.5h-6.5V21H4z"/><path d="M15 15h6l-6 6z"/></svg>'
  };

  const TABS = [
    { id: "preset", label: "Preset", zoom: "full" },
    { id: "head", label: "Head", subs: [
      { id: "skin", label: "Skin", zoom: "full" },
      { id: "face", label: "Head & face", zoom: "head" },
      { id: "eyes", label: "Eyes", zoom: "eyes" },
      { id: "hair", label: "Hair & facial hair", zoom: "head" }
    ] },
    { id: "body", label: "Body", zoom: "full" },
    { id: "kit", label: "Kit", subs: [
      { id: "gloves", label: "Gloves", zoom: "hands" },
      { id: "shorts", label: "Shorts", zoom: "shorts" },
      { id: "prajied", label: "Prajied", zoom: "arm" },
      { id: "mongkol", label: "Mongkol", zoom: "head" }
    ] },
    { id: "tattoos", label: "Tattoos", subs: [
      { id: "chest", label: "Chest", zoom: "full" },
      { id: "back", label: "Back", zoom: "full" },
      { id: "armL", label: "Arm left", zoom: "arm" },
      { id: "armR", label: "Arm right", zoom: "armR" }
    ] }
  ];

  const SKIN_TONES = [["Light", "#ffedd6"], ["Tan", "#d2b6a1"], ["Brown", "#4d331e"], ["Dark", "#331f0f"]];
  const SKIN_FILTER = ["brightness(1.18) saturate(.85)", "brightness(1.07)", "none", "brightness(.78) saturate(1.1)"];
  const SKIN_TINTS = ["#ffe4c8", "#f0c9a5", "#d7a27a", "#b97c55", "#8f5a3a", "#6b4129", "#4a2c1b", "#2f1b10"];
  const EYE_COLORS = [["Dark brown", "#3b2416"], ["Brown", "#6b4126"], ["Hazel", "#8a6a2f"], ["Grey", "#7d8590"]];
  const HAIR = ["Buzz cut", "Crew cut", "Undercut", "Shaved", "Top knot"];
  const HAIR_COLORS = [["Black", "#151515"], ["Dark brown", "#3a2617"], ["Bleached", "#d9c38b"], ["Red tint", "#7a2a1c"]];
  const FACIAL_HAIR = ["None", "Stubble", "Goatee", "Moustache"];
  const AKA = ["The Mighty", "Iron Shin", "The Silent Axe", "Kru's Pride", "Lumpinee Rookie"];
  const FACE_SLIDERS = ["Head size", "Head height", "Head protrusion", "Brow shape", "Brow height", "Brow width", "Brow protrusion",
    "Nose width", "Nose bridge", "Jaw width", "Chin length", "Cheekbones"];

  // Flags are CSS stripe patterns (the Figma flags are hundreds of loose vectors)
  const COUNTRIES = [
    ["TH", "Thailand", "linear-gradient(#a51931 0 16.6%,#f4f5f8 0 33.3%,#2d2a4a 0 66.6%,#f4f5f8 0 83.3%,#a51931 0)"],
    ["JP", "Japan", "radial-gradient(circle at 50% 50%,#bc002d 0 22%,transparent 23%),#fff"],
    ["FR", "France", "linear-gradient(90deg,#0055a4 0 33.3%,#fff 0 66.6%,#ef4135 0)"],
    ["IT", "Italy", "linear-gradient(90deg,#009246 0 33.3%,#fff 0 66.6%,#ce2b37 0)"],
    ["DE", "Germany", "linear-gradient(#000 0 33.3%,#dd0000 0 66.6%,#ffce00 0)"],
    ["UA", "Ukraine", "linear-gradient(#0057b7 0 50%,#ffd700 0)"],
    ["NL", "Netherlands", "linear-gradient(#ae1c28 0 33.3%,#fff 0 66.6%,#21468b 0)"],
    ["ID", "Indonesia", "linear-gradient(#ce1126 0 50%,#fff 0)"],
    ["ES", "Spain", "linear-gradient(#aa151b 0 25%,#f1bf00 0 75%,#aa151b 0)"],
    ["MX", "Mexico", "linear-gradient(90deg,#006847 0 33.3%,#fff 0 66.6%,#ce1126 0)"],
    ["IE", "Ireland", "linear-gradient(90deg,#169b62 0 33.3%,#fff 0 66.6%,#ff883e 0)"],
    ["NG", "Nigeria", "linear-gradient(90deg,#008751 0 33.3%,#fff 0 66.6%,#008751 0)"],
    ["BE", "Belgium", "linear-gradient(90deg,#000 0 33.3%,#fdda24 0 66.6%,#ef3340 0)"],
    ["PL", "Poland", "linear-gradient(#fff 0 50%,#dc143c 0)"],
    ["RU", "Russia", "linear-gradient(#fff 0 33.3%,#0039a6 0 66.6%,#d52b1e 0)"],
    ["AT", "Austria", "linear-gradient(#ed2939 0 33.3%,#fff 0 66.6%,#ed2939 0)"]
  ];

  const GLOVES = ["Tiger Blaze", "Jungle Camo", "Pink Riot", "Red Lotus", "Volt Strike", "Pearl White", "Midnight", "Ivory Kru"];
  const SHORTS = [["Seux Phen Gold", 0], ["Royal Blue", 200], ["Emerald", 110], ["Crimson", -40], ["Violet", 250], ["Ice", 170], ["Sunset", 20], ["Jade", 140]];
  const BANDS = [["Red", "#d4202c"], ["Blue", "#2457c5"], ["Gold", "#e3b341"], ["White", "#f1ede4"], ["Black", "#1b1b1b"], ["Green", "#2a9d5b"], ["Purple", "#6a2bd1"], ["Orange", "#f07a1a"]];

  // Style preset: 10 moves per category, the first 4 unlocked. Icons are the boxer-pose symbols from Figma 129:1442 ... 129:1614.
  const MOVE_CATS = [
    { id: "decisive", label: "Decisive move", slots: 4,
      moves: ["Mon Yan Lak", "Salab Fan Pla", "Erawan Soei Nga", "Hak Nguang", "Chawa Sad Hok", "Inao Thang Krit", "Pak Look Thoy", "Ta Then Kham Fak", "Yo Khao Phra Sumen", "Kwang Liao Lang"] },
    { id: "signature", label: "Signature move", slots: 4, hex: 0,
      moves: ["Te Tad", "Teep Trong", "Sok Tad", "Sok Klap", "Khao Loi", "Khao Trong", "Mat Wiang San", "Te Kod", "Teep Kang", "Sok Ti"] },
    { id: "special", label: "Special move", slots: 4, hex: 1,
      moves: ["Jumping Knee", "Spinning Elbow", "Superman Punch", "Flying Kick", "Clinch Sweep", "Cartwheel Kick", "Axe Kick", "Question Mark Kick", "Spinning Back Fist", "Step-up Knee"] },
    { id: "perk", label: "Active perk", slots: 4, hex: 2,
      // technique families of the Mastery Skill tree (screen-skilltree.js), so the skill panel can show each one
      moves: ["Finesse Counter", "Restorative Breath", "Triple Rhythm Press", "Fluid Evasion", "Tiger Trap", "Counter-Catch Pivot", "Relentless Assault", "Steadfast Focus", "Defensive Breaker", "Three-Step Pacing"] }
  ];
  const moveIcon = (cat, i) => cat.id === "decisive" ? `${MOVES}move-tile-${i + 1}.svg` : `${MOVES}move-hex-${((i + cat.hex) % 4) + 1}.svg`;
  // In-fight input of each equipped slot (slot 1-4 of a move type), shown on the selected tile's corner.
  // PLACEHOLDER until the combat control scheme is final: one held modifier per move type + Y / B / A / X.
  const SLOT_KEYS = {
    decisive: ["rt+y", "rt+b", "rt+a", "rt+x"],
    signature: ["lt+y", "lt+b", "lt+a", "lt+x"],
    special: ["rs+y", "rs+b", "rs+a", "rs+x"],
    perk: ["ls+y", "ls+b", "ls+a", "ls+x"]
  };

  const DEFAULT_STATE = {
    aka: 0, country: "TH", gender: 0, preset: 1,
    skinTone: 2, skinTint: 3,
    face: Object.fromEntries(FACE_SLIDERS.map((n, i) => [n, i === 0 ? 52 : i === 2 ? 0 : 50])),
    eyeColor: 0, eyeShape: 50, eyeHeight: 50, eyeDepth: 50, brow: 0, browColor: 0,
    hair: 0, hairColor: 0, facial: 1, facialColor: 0,
    bodyType: 1, bodyMass: 50, muscle: 50,
    gloves: 0, shorts: 0, prajied: 0, mongkol: 2,
    tattoos: { chest: 0, back: -1, armL: -1, armR: -1 },
    equipped: { decisive: [0, 1], signature: [0], special: [], perk: [0, 2] },   // legacy single loadout (seeds the first preset)
    presets: null,                                                              // { styleId: loadout } - one preset per style
    profile: {
      name: "SX.MTX",
      show: { stats: true, rank: true, belt: true, ach: true },
      belts: [0, 1, 2, 3, 4],          // showcase slots: centre diamond, then the 4 corners (BELTS index, -1 = empty)
      ach: [0, 1, 2, 3],               // 4 showcase achievements (ACHIEVEMENTS index, -1 = empty)
      bg: 0,                           // BACKGROUNDS index
      stickers: [],                    // { s: STICKERS index, x, y (frame px), r (deg) }
      ownedOnly: false
    }
  };

  let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  let open = false;
  let page = 0;          // 0 Profile, 1 Style preset, 2 Customization menu (opened from Profile)
  let tab = 1;           // customization category
  const sub = { head: 0, kit: 0, tattoos: 0 };
  let moveCat = 0;       // style preset category
  // Style presets: state.presets[styleId] = saved loadout (one per style). The page edits a draft of one style's preset.
  const PRESET_ORDER = ["phranakhon", "isan", "south", "north", "west"];
  const EMPTY_LOADOUT = () => ({ decisive: [], signature: [], special: [], perk: [] });
  let editSid = null;    // style whose preset is on the page
  let draft = null;      // working copy of that preset (Save writes it to state.presets)
  const picker = { open: false, i: 0 };
  let saveHold = null;   // Save / Create preset is a hold (A / Space), MTX_UI.createHold made in init
  let countryView = false;
  let focusIdx = 0;
  let root = null;
  let lastFocus = null;
  const music = { playing: false, pos: 66, timer: 0 };
  let editSec = 0;       // Profile edit section (EDIT_SECTIONS)
  let placing = null;    // sticker being placed: index into state.profile.stickers, + isNew   // walkout song on the profile (demo playback)  // element focused before the overlay opened (restored on close)
  //#endregion

  //#region [Helpers]
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (sel, scope = root) => scope.querySelector(sel);
  const $$ = (sel, scope = root) => [...scope.querySelectorAll(sel)];
  const curTab = () => TABS[tab];
  const curSub = () => curTab().subs ? curTab().subs[sub[curTab().id]] : null;
  const viewId = () => countryView ? "country" : (curSub() ? curSub().id : curTab().id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // device-aware labels for the overlay's buttons
  const NAME_LINES = { phranakhon: "Phra\nnakhon" };
  const KEY_LABELS = {
    kb:   { lb: "Q", rb: "E", lt: "Z", rt: "C", view: "F", menu: "Tab" },
    xbox: { lb: "LB", rb: "RB", lt: "LT", rt: "RT", view: "View", menu: "Menu" },
    ps:   { lb: "L1", rb: "R1", lt: "L2", rt: "R2", view: "Touch pad", menu: "Options" }
  };
  const keyLabel = btn => (KEY_LABELS[api?.getDevice?.()] || KEY_LABELS.kb)[btn] || btn.toUpperCase();
  // shape follows the device (keycap / bumper / trigger) via body[data-device]; text refreshed by refreshKeys()
  const keyChip = btn => `<span class="cc-key cc-key--${btn}" data-cc-k="${btn}" aria-hidden="true">${keyLabel(btn)}</span>`;
  const refreshKeys = () => document.querySelectorAll("[data-cc-k]").forEach(k => { k.textContent = keyLabel(k.dataset.ccK); });
  const glyph = btn => `<span class="glyph" data-btn="${btn}" aria-hidden="true">${(api.getGlyphs?.()[api.getDevice?.()] || {})[btn] || btn.toUpperCase()}</span>`;

  function save() {
    api.store.set("cc_state", JSON.stringify(state));
    syncProfileCards();
  }

  //#region [Style presets]
  const copy = o => JSON.parse(JSON.stringify(o));
  const styleList = () => { const st = api.getScreen?.("tactical")?.getStyles?.() || {}; return PRESET_ORDER.filter(id => st[id]).map(id => ({ id, ...st[id] })); };
  const moveCount = l => l ? Object.values(l).reduce((n, a) => n + a.length, 0) : 0;
  function editPreset(sid) {
    editSid = sid;
    draft = copy(state.presets[sid] || EMPTY_LOADOUT());
  }
  const isDirty = () => JSON.stringify(draft) !== JSON.stringify(state.presets[editSid] || EMPTY_LOADOUT());
  function getPresets() {
    return styleList().map(st => ({ id: st.id, title: st.title, region: st.region, color: st.color, set: !!state.presets[st.id], moves: moveCount(state.presets[st.id]) }));
  }
  function pickerHtml() {
    if (!picker.open) return "";
    const rows = styleList().map((st, i) => { const p = state.presets[st.id], cur = st.id === editSid;
      return `<div class="cc-pp__row${i === picker.i ? " is-focused" : ""}${p ? "" : " is-empty"}" data-pp="${i}" role="option" aria-selected="${i === picker.i}" style="--st:${st.color}">
        <img src="${SVG}style-${st.id}-sel.svg" alt=""><span class="cc-pp__name"><b>${esc(st.title)}</b><small>${esc(st.region || "")}</small></span>
        <span class="cc-pp__state">${cur ? "<em>Selected</em>" : ""}</span></div>`; }).join("");
    return `<div class="cc-pp" role="dialog" aria-label="Style presets"><div class="cc-pp__scrim"></div><section class="cc-pp__panel">
      <h2>Style presets</h2><p class="cc-pp__sub">One preset per style. Pick one in the lobby before every match (not in Ultimate Fight).</p>
      <div class="cc-pp__rows" role="listbox">${rows}</div></section></div>`;
  }
  function pickerInput(a) {
    const L = styleList();
    if (a === "back") { picker.open = false; render(); return; }
    if (a === "up" || a === "down") { picker.i = (picker.i + (a === "up" ? -1 : 1) + L.length) % L.length; api.rumble?.(20, .1); render(); return; }
    if (a === "a") {
      const st = L[picker.i];
      if (st.id !== editSid && isDirty()) api.toast?.("Unsaved changes discarded");
      editPreset(st.id); picker.open = false; focusIdx = 0; render();
      announce(state.presets[st.id] ? `${st.title} preset` : `${st.title} · no preset yet`);
      api.rumble?.(60, .25);
    }
  }
  //#endregion

  // polite screen-reader announcement (and the same text for sighted players via the toast where useful)
  function announce(text) {
    const live = $("[data-cc-live]");
    if (live) { live.textContent = ""; setTimeout(() => { live.textContent = text; }, 30); }
  }
  //#endregion

  //#region [Panel builders]
  const check = '<i class="cc-check" aria-hidden="true"></i>';

  function lockTile(label, extra = "") {
    return `<div class="cc-item cc-tile is-locked" data-kind="locked" role="option" aria-disabled="true" aria-label="${esc(label)}, locked">` +
      `${extra}<i class="cc-lock" aria-hidden="true"></i></div>`;
  }

  function tile(kind, val, selected, inner, label) {
    return `<div class="cc-item cc-tile${selected ? " is-selected" : ""}" data-kind="${kind}" data-val="${val}" role="option" aria-selected="${selected}" aria-label="${esc(label)}">` +
      `${inner}${selected ? check : ""}${label ? `<span class="cc-tile__label" aria-hidden="true">${esc(label)}</span>` : ""}</div>`;
  }

  function slider(key, label, value) {
    return `<div class="cc-item cc-slider" data-kind="slider" data-key="${esc(key)}" role="slider" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}">` +
      `<span class="cc-row__label">${esc(label)}</span><span class="cc-slider__value">${value}</span>` +
      `<i class="cc-arrow cc-arrow--l" aria-hidden="true"></i><span class="cc-slider__track" style="--p:${value}"><i class="cc-slider__fill"></i><i class="cc-slider__rest"></i><b class="cc-slider__tick"></b></span><i class="cc-arrow cc-arrow--r" aria-hidden="true"></i></div>`;
  }

  function option(key, label, value, thumb = "", disabled = false) {
    return `<div class="cc-item cc-option${disabled ? " is-disabled" : ""}" data-kind="option" data-key="${key}" role="spinbutton" aria-label="${esc(label)}" aria-valuetext="${esc(value)}"${disabled ? ' aria-disabled="true"' : ""}>` +
      `<span class="cc-row__label">${esc(label)}</span><i class="cc-arrow cc-arrow--l" aria-hidden="true"></i>` +
      `<span class="cc-row__box"><span class="cc-row__value">${esc(value)}</span>${thumb}</span><i class="cc-arrow cc-arrow--r" aria-hidden="true"></i></div>`;
  }

  // sub-tab row: switched with Z / C (LT / RT) only; not focusable, so left / right never land on it
  function subRow() {
    const t = curTab();
    if (!t.subs || countryView) return "";
    const i = sub[t.id];
    return `<div class="cc-subrow" role="tablist" aria-label="${esc(t.label)} sections">` +
      keyChip("lt") +
      t.subs.map((s, k) => `<span class="cc-subtab${k === i ? " is-active" : ""}" data-sub="${k}" role="tab" aria-selected="${k === i}">${esc(s.label)}</span>`).join("") +
      keyChip("rt") + `</div>`;
  }

  const heading = t => `<h3 class="cc-heading">${esc(t)}</h3>`;
  const grid = (items, label) => `<div class="cc-grid" role="listbox" aria-label="${esc(label)}">${items}</div>`;

  function buildPanel() {
    const v = viewId();
    const body = (() => {
      if (v === "country") {
        return heading("Country") + grid(COUNTRIES.map(([code, name, flag]) =>
          tile("country", code, state.country === code, `<span class="cc-flag" style="background:${flag}" aria-hidden="true"></span>`, name)).join(""), "Country");
      }
      if (v === "preset") {
        const c = COUNTRIES.find(x => x[0] === state.country) || COUNTRIES[0];
        return heading("Info") +
          `<div class="cc-item cc-info" data-kind="name" role="button" aria-label="Name, SX.MTX"><span class="cc-row__label">Name</span><i class="cc-arrow" aria-hidden="true"></i><span class="cc-row__box"><span class="cc-row__value">SX.MTX</span></span><i class="cc-arrow" aria-hidden="true"></i></div>` +
          option("aka", "AKA", AKA[state.aka]) +
          `<div class="cc-item cc-info" data-kind="countryLink" role="button" aria-label="Country, ${c[1]}. Open country list"><span class="cc-row__label">Country</span><i class="cc-arrow" aria-hidden="true"></i><span class="cc-row__box"><span class="cc-row__value">${c[1]}</span><span class="cc-flag cc-flag--sm" style="background:${c[2]}" aria-hidden="true"></span></span><i class="cc-arrow cc-arrow--go" aria-hidden="true"></i></div>` +
          heading("Gender") + grid(
            tile("gender", 0, state.gender === 0, `<img src="${IMG}cc-avatar-1.webp" alt="">`, "Male") +
            lockTile("Female", `<img src="${IMG}cc-avatar-f.webp" alt=""><span class="cc-tile__label" aria-hidden="true">Female</span>`), "Gender") +
          heading("Preset") + grid([2, 3, 4].map((n, i) =>
            tile("preset", i, state.preset === i, `<img src="${IMG}cc-avatar-${n}.webp" alt="">`, `Preset ${i + 1}`)).join(""), "Preset");
      }
      if (v === "skin") {
        return heading("Skin tone") + grid(SKIN_TONES.map(([n, c], i) => tile("skinTone", i, state.skinTone === i, `<span class="cc-swatch" style="background:${c}"></span>`, n)).join(""), "Skin tone") +
          heading("Color") + grid(SKIN_TINTS.map((c, i) => tile("skinTint", i, state.skinTint === i, `<span class="cc-swatch" style="background:${c}"></span>`, `Shade ${i + 1}`)).join(""), "Skin color");
      }
      if (v === "face") return FACE_SLIDERS.map(n => slider("face." + n, n, state.face[n])).join("");
      if (v === "eyes") {
        const [eyeName, eyeHex] = EYE_COLORS[state.eyeColor];
        return option("eyeColor", "Eye colors", eyeName, `<span class="cc-option__swatch" style="background:${eyeHex}" aria-hidden="true"></span>`) +
          slider("eyeShape", "Eye shape", state.eyeShape) + slider("eyeHeight", "Eyes height", state.eyeHeight) + slider("eyeDepth", "Eyes depth", state.eyeDepth) +
          heading("Eyebrows") + grid([0, 1, 2, 3].map(i => tile("brow", i, state.brow === i, `<img class="cc-eyes" src="${IMG}cc-eyes.webp" alt="" style="filter:contrast(${1 + i * .15}) brightness(${1 - i * .08})">`, `Eyebrow ${i + 1}`)).join(""), "Eyebrows") +
          heading("Eyebrow color") + grid(HAIR_COLORS.map(([n, c], i) => tile("browColor", i, state.browColor === i, `<span class="cc-swatch" style="background:${c}"></span>`, n)).join(""), "Eyebrow color");
      }
      if (v === "hair") {
        const [hcName, hcHex] = HAIR_COLORS[state.hairColor];
        const [fcName, fcHex] = HAIR_COLORS[state.facialColor];
        return option("hair", "Hairstyles", HAIR[state.hair], `<img class="cc-option__thumb" src="${IMG}cc-hair.webp" alt="">`) +
          option("hairColor", "Hair colors", hcName, `<span class="cc-option__swatch" style="background:${hcHex}" aria-hidden="true"></span>`) +
          option("facial", "Facial hair", FACIAL_HAIR[state.facial]) +
          option("facialColor", "Facial hair colors", fcName, `<span class="cc-option__swatch" style="background:${fcHex}" aria-hidden="true"></span>`, state.facial === 0);
      }
      if (v === "body") {
        return heading("Body type") + grid(["Lean", "Athletic", "Muscular", "Heavy"].map((n, i) =>
          tile("bodyType", i, state.bodyType === i, `<img class="cc-body" src="${IMG}cc-body.webp" alt="" style="transform:scaleX(${.92 + i * .06})">`, n)).join(""), "Body type") +
          slider("bodyMass", "Body mass", state.bodyMass) + slider("muscle", "Muscle definition", state.muscle);
      }
      if (v === "gloves") {
        return grid(GLOVES.map((n, i) => tile("gloves", i, state.gloves === i, `<img src="${IMG}cc-glove-${i + 1}.webp" alt="">`, n)).join("") +
          [1, 2, 3, 4].map(i => lockTile(`Gloves slot ${i}`)).join(""), "Gloves");
      }
      if (v === "shorts") {
        return grid(SHORTS.map(([n, hue], i) => tile("shorts", i, state.shorts === i,
          `<img src="${IMG}pack-seux-shorts.webp" alt="" style="filter:hue-rotate(${hue}deg)${hue ? " saturate(1.4)" : ""}">`, n)).join("") +
          [1, 2, 3, 4].map(i => lockTile(`Shorts slot ${i}`)).join(""), "Shorts");
      }
      if (v === "prajied" || v === "mongkol") {
        return grid(BANDS.map(([n, c], i) => tile(v, i, state[v] === i, `<span class="cc-${v}" style="--c:${c}" aria-hidden="true"></span>`, n)).join("") +
          [1, 2, 3, 4].map(i => lockTile(`${v} slot ${i}`)).join(""), v);
      }
      // tattoos: chest / back / armL / armR
      return grid(tile("tattoo", 0, state.tattoos[v] === 0, `<img src="${IMG}cc-tattoo-skull.webp" alt="">`, "Kru skull") +
        Array.from({ length: 11 }, (_, i) => lockTile(`Tattoo ${i + 2}`)).join(""), "Tattoos");
    })();
    return subRow() + body;
  }
  //#endregion

  //#region [Pages]
  // belt artwork: one image per belt (mtx/assets/img/belts/belt-<BELTS index>.webp, cut from the sprite sheet
  // by tools/cut_belts.py); a belt without art yet falls back to the drawn strap + plates
  const BELT_ART = 9;
  function beltSvg(b, locked) {
    const i = BELTS.indexOf(b);
    if (i >= 0 && i < BELT_ART) return `<img class="pf-belt${locked ? " is-locked" : ""}" src="mtx/assets/img/belts/belt-${i}.webp" alt="" draggable="false">`;
    const c = b ? b.c : "#2a2c33";
    return `<svg class="pf-belt${locked ? " is-locked" : ""}" viewBox="0 0 120 70" aria-hidden="true">
      <rect x="2" y="22" width="116" height="26" rx="5" fill="${c}"/>
      <rect x="2" y="22" width="116" height="26" rx="5" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
      <rect x="10" y="17" width="20" height="36" rx="3" fill="#d9b23a"/><rect x="90" y="17" width="20" height="36" rx="3" fill="#d9b23a"/>
      <ellipse cx="60" cy="35" rx="27" ry="24" fill="#f2df57" stroke="#9c7a12" stroke-width="2.5"/>
      <ellipse cx="60" cy="35" rx="17" ry="15" fill="${c}"/><path d="m60 26 3 6 6.5.8-4.8 4.5 1.2 6.4L60 40.6l-5.9 3.1 1.2-6.4-4.8-4.5 6.5-.8z" fill="#f2df57"/>
    </svg>`;
  }

  // showcase board: centre diamond + 4 corners (used on the profile and in Edit profile > Title belt)
  function boardHtml(interactive) {
    const p = state.profile;
    const slot = (i, cls) => {
      const b = BELTS[p.belts[i]];
      const inner = b ? beltSvg(b) : `<i class="cc-prof__plus" aria-hidden="true"></i>`;
      return interactive
        ? `<div class="cc-item ${cls}" data-kind="pfBelt" data-val="${i}" role="button" aria-label="${b ? esc(b.name) + " belt" : "Empty belt slot"}. Edit title belts">${inner}</div>`
        : `<div class="${cls}">${inner}</div>`;
    };
    return `<div class="pf-board">
        <i class="pf-board__frame" aria-hidden="true"></i>
        ${slot(1, "pf-board__sq pf-board__sq--0")}${slot(2, "pf-board__sq pf-board__sq--1")}${slot(3, "pf-board__sq pf-board__sq--2")}${slot(4, "pf-board__sq pf-board__sq--3")}
        ${slot(0, "pf-board__diamond")}
      </div>`;
  }

  function achTile(i, cls = "", interactive = true) {
    const a = ACHIEVEMENTS[i];
    if (!a) return `<span class="pf-ach ${cls} is-empty"><i></i><b>Empty</b></span>`;
    return interactive
      ? `<span class="cc-item pf-ach ${cls}" data-kind="pfAch" data-val="${i}" role="button" aria-label="${esc(a.name)} achievement. Edit achievements"><img src="${MOVES}ach-${a.icon}.svg" alt=""><b>${esc(a.name)}</b></span>`
      : `<span class="pf-ach ${cls}"><img src="${MOVES}ach-${a.icon}.svg" alt=""><b>${esc(a.name)}</b></span>`;
  }

  function profileHtml() {
    const p = state.profile, sh = p.show;
    const flag = (COUNTRIES.find(c => c[0] === state.country) || COUNTRIES[0]);
    // Profile_VarE_v3 (217:5823): identity card left, belts top-right, bottom dock = Stats | Rank | Achievements | Walkout song
    const belt = (i, cls) => {
      const b = BELTS[p.belts[i]];
      return `<div class="cc-item pf-beltslot ${cls}" data-kind="pfBelt" data-val="${i}" role="button" aria-label="${b ? esc(b.name) + " belt" : "Empty belt slot"}. Edit title belts">${b ? beltSvg(b) : `<i class="cc-prof__plus" aria-hidden="true"></i>`}</div>`;
    };
    const rank = (cls, img, name, tag) => `<div class="pf-rankbox pf-rankbox--${cls}">
        <img src="${IMG}badges/${img}.webp" alt=""><p class="pf-rankbox__name">${name}</p><p class="pf-rankbox__tag">${tag}</p></div>`;
    return `<div class="pf">
      <i class="pf-dock" aria-hidden="true"></i>
      <div class="cc-item pf-card" data-kind="pfInfo" role="button" aria-label="${esc(p.name)}, ${esc(AKA[state.aka])}. Edit information">
        <span class="pf-card__flag" style="background:${flag[2]}" aria-hidden="true"></span>
        <b class="pf-card__name">${esc(p.name)}</b>
        <span class="pf-card__aka">${esc(AKA[state.aka])}</span>
        <span class="pf-card__id">SXMTX#1111</span>
      </div>
      <div class="cc-item pf-appearance" data-kind="edit" role="button" aria-label="Edit appearance">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3 4 6v4l3-1v12h10V9l3 1V6l-4-3c0 2-2 3-4 3S8 5 8 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
        <span>Edit appearance</span><i aria-hidden="true"></i></div>
      ${sh.belt ? `<section class="pf-belts" aria-label="Championship belts"><h3 class="pf-head">Championship belts</h3>
        ${belt(0, "pf-beltslot--main")}<div class="pf-belts__row">${[1, 2, 3, 4].map(i => belt(i, "")).join("")}</div></section>` : ""}
      ${sh.stats ? `<section class="pf-stats" aria-label="Stats"><h3 class="pf-head">Stats</h3>
        <div class="pf-stats__overall"><small>Overall</small><b>88</b></div>
        <div class="pf-stats__box pf-stats__box--wld"><small>Win / loss / draw</small><b>20-15-12</b></div>
        <div class="pf-stats__box pf-stats__box--ko"><small>K.O. rate</small><b>80%</b></div></section>` : ""}
      ${sh.rank ? `<section class="pf-rank" aria-label="Competitive rank"><h3 class="pf-head">Competitive rank</h3>
        ${rank("cur", "ring-warrior-3", "Ring Warrior III", "Current rank")}${rank("max", "muay-thai-god", "Muay Thai God", "Highest rank")}</section>` : ""}
      ${sh.ach ? `<section class="pf-achs" aria-label="Achievements"><h3 class="pf-head">Achievements</h3>
        <div class="pf-achs__row">${p.ach.map(i => achTile(i)).join("")}</div></section>` : ""}
      <section class="pf-walkout" aria-label="Walkout song"><h3 class="pf-head">Walkout song</h3>
        <div class="cc-item cc-music pf-music${music.playing ? " is-playing" : ""}" data-kind="music" role="button" aria-pressed="${music.playing}" aria-label="Walkout song, Ram Muay by Sarama. ${music.playing ? "Pause" : "Play"}">
          <img class="cc-music__vinyl" src="${IMG}cc-vinyl.webp" alt="">
          <span class="cc-music__cover" aria-hidden="true"></span>
          <div class="cc-music__panel">
            <b class="cc-music__title">Ram Muay&nbsp;&nbsp;-&nbsp;&nbsp;Sarama</b>
            <i class="cc-music__play" aria-hidden="true"></i><i class="cc-music__next" aria-hidden="true"></i>
            <span class="cc-music__bar" aria-hidden="true"><span class="cc-music__track"><i data-cc-progress style="width:${music.pos}%"></i></span></span>
          </div>
        </div>
        <div class="cc-item pf-history" data-kind="history" role="button" aria-label="Match history">${glyph("y")}<span>History</span><i aria-hidden="true"></i></div>
      </section>
    </div>`;
  }

  // ---------------------------------------------------------------- Edit profile (Profile Inventory)
  function profileEditHtml() {
    const p = state.profile, sec = EDIT_SECTIONS[editSec];
    const icons = EDIT_SECTIONS.map((x, i) => `<span class="pe-nav__btn${i === editSec ? " is-active" : ""}" data-pe-sec="${i}" role="tab" aria-selected="${i === editSec}" aria-label="${x.title}">${PE_ICONS[x.icon]}</span>`).join("");
    const owned = (list) => p.ownedOnly ? list.map((x, i) => [x, i]).filter(([x]) => x.own) : list.map((x, i) => [x, i]);
    const count = (list, total) => `<p class="pe-count">Available <b>${list.filter(x => x.own).length}/${total}</b></p>`;
    const ownedToggle = `<div class="pe-owned${p.ownedOnly ? " is-on" : ""}" data-pe-owned role="switch" aria-checked="${p.ownedOnly}"><i class="pe-owned__toggle" aria-hidden="true"></i>${glyph("y")}<span>Owned</span></div>`;
    const check = '<i class="cc-check" aria-hidden="true"></i>';
    let grid = "", right = "", extra = "";
    if (sec.id === "info") {
      const tog = (k, label) => `<div class="cc-item pe-check${p.show[k] ? " is-on" : ""}" data-kind="peShow" data-key="${k}" role="checkbox" aria-checked="${p.show[k]}"><i aria-hidden="true"></i><span>${label}</span></div>`;
      grid = `<div class="pe-info">
          <label class="pe-label" for="peName">Name</label>
          <input class="cc-item pe-input" id="peName" data-kind="peName" maxlength="16" spellcheck="false" autocomplete="off" value="${esc(p.name)}" aria-label="Profile name">
          <p class="pe-label">AKA</p>
          ${option("aka", "AKA", AKA[state.aka])}
          <div class="pe-checks">${tog("stats", "Show stats")}${tog("rank", "Show competitive rank")}${tog("belt", "Show title belt")}${tog("ach", "Show achievements")}</div>
        </div>`;
    } else if (sec.id === "belt") {
      grid = `<div class="pe-grid pe-grid--belt">${owned(BELTS).map(([b, i]) => b.own
        ? `<div class="cc-item pe-tile pe-tile--belt${p.belts.includes(i) ? " is-selected" : ""}" data-kind="peBelt" data-val="${i}" role="option" aria-selected="${p.belts.includes(i)}" aria-label="${esc(b.name)}">${beltSvg(b)}<b>${esc(b.name)}</b>${p.belts.includes(i) ? check : ""}</div>`
        : `<div class="cc-item pe-tile pe-tile--belt is-locked" data-kind="locked" role="option" aria-disabled="true" aria-label="${esc(b.name)}, locked">${beltSvg(b, true)}<i class="cc-lock" aria-hidden="true"></i><b>${esc(b.name)}</b></div>`).join("")}</div>${count(BELTS, BELT_TOTAL)}`;
      right = `<div class="pe-show pe-show--belt">${boardHtml(false)}</div>`;
    } else if (sec.id === "ach") {
      grid = `<div class="pe-grid pe-grid--ach">${owned(ACHIEVEMENTS).map(([a, i]) => a.own
        ? `<div class="cc-item pe-tile pe-tile--ach${p.ach.includes(i) ? " is-selected" : ""}" data-kind="peAch" data-val="${i}" role="option" aria-selected="${p.ach.includes(i)}" aria-label="${esc(a.name)}"><img src="${MOVES}ach-${a.icon}.svg" alt=""><b>${esc(a.name)}</b>${p.ach.includes(i) ? check : ""}</div>`
        : `<div class="cc-item pe-tile pe-tile--ach is-locked" data-kind="peAchLocked" data-val="${i}" role="option" aria-disabled="true" aria-label="${esc(a.name)}, locked"><img src="${MOVES}ach-${a.icon}.svg" alt=""><i class="cc-lock" aria-hidden="true"></i><b>${esc(a.name)}</b></div>`).join("")}</div>${count(ACHIEVEMENTS, ACH_TOTAL)}`;
      right = `<div class="pe-show pe-show--ach"><div class="pe-achrow">${p.ach.map(i => achTile(i, "", false)).join("")}</div>
          <div class="pe-detail" data-pe-detail></div></div>`;
    } else if (sec.id === "bg") {
      grid = `<div class="pe-grid pe-grid--bg">${owned(BACKGROUNDS).map(([g, i]) => g.own
        ? `<div class="cc-item pe-tile pe-tile--bg${p.bg === i ? " is-selected" : ""}" data-kind="peBg" data-val="${i}" role="option" aria-selected="${p.bg === i}" aria-label="${esc(g.name)}"><img src="${g.img}" alt=""><b>${esc(g.name)}</b>${p.bg === i ? check : ""}</div>`
        : `<div class="cc-item pe-tile pe-tile--bg is-locked" data-kind="locked" role="option" aria-disabled="true" aria-label="${esc(g.name)}, locked"><img src="${g.img}" alt=""><i class="cc-lock" aria-hidden="true"></i><b>${esc(g.name)}</b></div>`).join("")}</div>${count(BACKGROUNDS, BG_TOTAL)}`;
    } else {
      grid = `<div class="pe-grid pe-grid--sticker">${owned(STICKERS).map(([t, i]) => t.own
        ? `<div class="cc-item pe-tile pe-tile--sticker" data-kind="peSticker" data-val="${i}" role="option" aria-label="${esc(t.name)} sticker. Place on your profile"><img src="${t.img}" alt=""><b>${esc(t.name)}</b></div>`
        : `<div class="cc-item pe-tile pe-tile--sticker is-locked" data-kind="locked" role="option" aria-disabled="true" aria-label="${esc(t.name)}, locked"><img src="${t.img}" alt=""><i class="cc-lock" aria-hidden="true"></i><b>${esc(t.name)}</b></div>`).join("")}</div>
        <p class="pe-count">Placed <b>${p.stickers.length}/${STICKER_MAX}</b></p>`;
      right = `<div class="pe-show pe-show--sticker"><img data-pe-sticker src="${STICKERS[0].img}" alt=""></div>`;
    }
    if (placing != null) {
      extra = `<p class="pe-place-count">Stickers <b>${p.stickers.length}/${STICKER_MAX}</b></p>`;
      return `<div class="pe is-placing">${extra}</div>`;
    }
    return `<div class="pe" data-sec="${sec.id}">
      <h2 class="pe-tag">${sec.title}</h2><p class="pe-sub">${sec.sub}</p>
      <nav class="pe-nav" role="tablist" aria-label="Edit profile sections">${keyChip("lb")}${icons}${keyChip("rb")}</nav>
      <section class="pe-panel" aria-label="${sec.title}">${grid}<span class="pe-scroll" aria-hidden="true"><i></i></span></section>
      ${sec.id === "info" ? "" : ownedToggle}
      ${right}
    </div>`;
  }

  // stickers placed on the profile background (behind the fighter)
  function renderStickers() {
    const host = $("[data-cc-stickers]");
    if (!host) return;
    const show = page === 0 || page === PROFILE_EDIT;
    host.hidden = !show;
    if (!show) return;
    host.innerHTML = state.profile.stickers.map((t, i) => {
      const st = STICKERS[t.s];
      return st ? `<img class="cc-sticker${placing === i ? " is-active" : ""}" src="${st.img}" alt="" style="left:${t.x}px;top:${t.y}px;transform:translate(-50%,-50%) rotate(${t.r}deg)">` : "";
    }).join("");
  }

  // profile cards on the other screens (Main, Career) follow the edited name / aka
  function syncProfileCards() {
    document.querySelectorAll(".profile-card__name").forEach(n => { n.textContent = state.profile.name; });
    document.querySelectorAll(".profile-card__aka").forEach(n => { n.textContent = AKA[state.aka]; });
  }

  function renderAchDetail(el) {
    const host = root?.querySelector("[data-pe-detail]");
    if (!host) return;
    const i = el && /^peAch/.test(el.dataset.kind || "") ? +el.dataset.val : state.profile.ach.find(x => x >= 0);
    const a = ACHIEVEMENTS[i];
    host.innerHTML = a ? `<img src="${MOVES}ach-${a.icon}.svg" alt="">
      <b class="pe-detail__name">${esc(a.name)}</b><span class="pe-detail__tier" style="color:${TIER_COLOR[a.tier]}">${a.tier} tier${a.own ? "" : " · locked"}</span>
      <p class="pe-detail__desc">${esc(a.desc)}</p>` : "";
  }

  function openEdit(sec) {
    page = PROFILE_EDIT;
    editSec = sec;
    placing = null;
    focusIdx = 0;
    render();
    announce("Edit profile, " + EDIT_SECTIONS[sec].title);
    api.rumble?.(60, .25);
  }

  function editSection(d) {
    editSec = (editSec + d + EDIT_SECTIONS.length) % EDIT_SECTIONS.length;
    focusIdx = 0;
    render();
    announce(EDIT_SECTIONS[editSec].title);
    api.rumble?.(40, .15);
  }

  // sticker placement: arrows move, Q / E rotate, A confirm, X remove, B cancel
  function startPlacing(si) {
    const list = state.profile.stickers;
    if (list.length >= STICKER_MAX) { api.toast?.(`Sticker limit reached (${STICKER_MAX})`); return; }
    list.push({ s: si, x: 960, y: 420, r: 0 });
    placing = list.length - 1;
    placingNew = true;
    render();
    announce("Place sticker. Arrows move, Q and E rotate, A to confirm");
  }
  let placingNew = false;

  function placeMove(dx, dy) {
    const t = state.profile.stickers[placing];
    t.x = clamp(t.x + dx, 60, 1860);
    t.y = clamp(t.y + dy, 60, 1020);
    renderStickers();
  }

  function placeRotate(d) {
    const t = state.profile.stickers[placing];
    t.r = (t.r + d * 15) % 360;
    renderStickers();
  }

  function endPlacing(keep) {
    if (!keep && placingNew) state.profile.stickers.splice(placing, 1);
    placing = null;
    placingNew = false;
    save();
    render();
    announce(keep ? "Sticker placed" : "Sticker removed");
  }

  function styleHtml() {
    const tactical = api.getScreen?.("tactical");
    const styles = tactical?.getStyles?.() || {};
    if (!editSid) editPreset(tactical?.getSelStyle?.() || "phranakhon");
    const sid = editSid, isSet = !!state.presets[sid];
    const st = styles[sid] || { title: "Phranakhon", color: "#e6003f", dark: "#680920", quote: "", desc: "" };
    const cat = MOVE_CATS[moveCat];
    const eq = draft[cat.id];
    const unlocked = 4;
    // left panel: every move type with its equipped slots; the active type (Z / C) is the one shown in the grid
    const slotIcon = (c, m) => c.id === "decisive" ? `${MOVES}move-decisive-${(m % 3) + 1}.svg` : moveIcon(c, m);
    const rows = MOVE_CATS.map((c, ci) => `<div class="cc-sp__row${ci === moveCat ? " is-active" : ""}" data-cat="${ci}">
        <h4>${c.label}</h4>
        <div class="cc-sp__slots">${Array.from({ length: c.slots }, (_, i) => {
          const m = draft[c.id][i];
          return `<span class="cc-sp__slot${c.id === "decisive" ? " is-decisive" : ""}">${m != null ? `<img src="${slotIcon(c, m)}" alt="${esc(c.moves[m])}">` : ""}</span>`;
        }).join("")}</div>
      </div>`).join("");
    const list = cat.moves.map((m, i) => [m, i]).filter(([, i]) => !state.showOwned || i < unlocked);
    // equipped tile: a big grey "SELECTED" veil over the art (the slot's input is only announced, not drawn)
    const keysOf = i => (SLOT_KEYS[cat.id]?.[eq.indexOf(i)] || "").split("+").filter(Boolean);
    const selected = () => `<span class="cc-move__sel" aria-hidden="true">Selected</span>`;
    const tiles = list.map(([m, i]) => i < unlocked
      ? `<div class="cc-item cc-move${eq.includes(i) ? " is-selected" : ""}" data-kind="move" data-val="${i}" data-movename="${esc(m)}" data-equipped="${eq.includes(i)}" role="option" aria-selected="${eq.includes(i)}" aria-label="${esc(m)}${eq.includes(i) ? `, equipped, input ${keysOf(i).join(" plus ")}` : ""}"><img src="${moveIcon(cat, i)}" alt="">${eq.includes(i) ? selected(i) : ""}</div>`
      : `<div class="cc-item cc-move is-locked" data-kind="locked" data-movename="${esc(m)} (locked)" role="option" aria-disabled="true" aria-label="${esc(m)}, locked"><img src="${moveIcon(cat, i)}" alt=""><i class="cc-lock" aria-hidden="true"></i></div>`).join("");
    const nameLines = (NAME_LINES[sid] || st.title).split("\n").map(esc).join("<br>");
    const art = sid === "phranakhon" ? `${IMG}cc-tactical-phranakhon.webp` : `${IMG}style-tactical-art.png`;
    return `<div class="cc-style" style="--st:${st.color};--st-dark:${st.dark}">
      <h1 class="cc-style__title" aria-hidden="true">Current style</h1>
      <div class="cc-sp__pick${isSet ? "" : " is-new"}" data-cc-presets role="button" aria-label="${esc(st.title)} preset, ${isSet ? "set" : "not set"}. Press X for style presets">
        <img class="cc-sp__emblem" src="${SVG}style-${sid}-sel.svg" alt="">
        <b>${esc(st.title)}</b><small>${isSet ? "Style preset" : "No preset yet"}</small>
      </div>
      <section class="cc-sp__equipped" aria-label="Equipped moves">${rows}</section>
      <section class="cc-sp__box" aria-label="${esc(cat.label)}s">
        <p class="cc-sp__count">Unlocked : ${unlocked}/${cat.moves.length}</p>
        <p class="cc-sp__sort" aria-hidden="true">Sort by <b>level</b><i></i></p>
        <div class="cc-sp__grid" role="listbox" aria-label="${esc(cat.label)}s">${tiles}</div>
        <span class="cc-sp__scroll" aria-hidden="true"><i></i></span>
        <p class="cc-sp__name"><span data-cc-movename></span><span class="cc-sp__equip">${glyph("a")}<b data-cc-equip>Equip</b></span></p>
      </section>
      <div class="cc-sp__owned${state.showOwned ? " is-on" : ""}" data-cc-owned role="switch" aria-checked="${!!state.showOwned}">
        <i class="cc-sp__toggle" aria-hidden="true"></i>${glyph("y")}<span>Owned</span>
      </div>
      <aside class="cc-sp__tac cc-sp__skill" aria-label="Mastery skill" aria-live="polite">
        <h3 class="cc-sp__tac-title">Mastery skill</h3>
        <div class="cc-sp__tac-art"><img src="${art}" alt=""><img class="cc-sp__skill-move" data-cc-skill="move" src="" alt=""></div>
        <svg class="cc-sp__tac-slash" viewBox="0 0 354 64" preserveAspectRatio="none" aria-hidden="true">
          <path d="M286 64 L354 14 V64 Z" fill="var(--st-dark)"/><path d="M0 26 H300 C318 26 330 20 354 0 V38 L322 64 H0 Z" fill="var(--st)"/>
        </svg>
        <p class="cc-sp__skill-kind" data-cc-skill="kind"></p>
        <p class="cc-sp__tac-name" data-cc-skill="name"></p>
        <div class="cc-sp__tac-desc cc-sp__skill-info">
          <p class="cc-sp__skill-tier"><span data-cc-skill="tier"></span><i data-cc-skill="pips"></i></p>
          <p class="cc-sp__skill-desc" data-cc-skill="desc"></p>
          <p class="cc-sp__skill-stats" data-cc-skill="stats"></p>
          <p class="cc-sp__skill-next" data-cc-skill="next"></p>
        </div>
      </aside>
      <button type="button" class="cc-sp__save cc-item" data-cc-save data-kind="save" aria-label="Hold to ${isSet ? "save the preset" : "create the preset"}"><i class="cc-sp__save-hold" aria-hidden="true"></i>${glyph("a")}<span class="cc-sp__save-label">${isSet ? "Save preset" : "Create preset"}</span><small aria-hidden="true">Hold</small></button>
      ${pickerHtml()}
    </div>`;
  }
  //#endregion

  //#region [Render]
  function render() {
    if (!root) return;
    if (saveHold?.active) saveHold.cancel(false);
    root.dataset.page = page;
    root.dataset.view = page === CUSTOM ? viewId() : "";

    // page bar (Q / E) on every page
    const hub = $("[data-cc-hub]");
    const crumb = page === CUSTOM || page === PROFILE_EDIT;
    hub.classList.toggle("is-crumb", crumb);
    hub.setAttribute("role", crumb ? "navigation" : "tablist");
    hub.innerHTML = crumb
      ? `<span class="cc-hub__back" data-cc-back role="button" aria-label="Back to profile">${glyph("b")}<span>Profile</span></span><span class="cc-hub__sep" aria-hidden="true">/</span><span class="cc-hub__item is-active">${page === CUSTOM ? "Customization" : "Edit profile"}</span>`
      : keyChip("lb") + PAGES.map((h, i) =>
        `<span class="cc-hub__item${i === page ? " is-active" : ""}" data-hub="${i}" role="tab" aria-selected="${i === page}">${h}</span>`).join("") + keyChip("rb");

    // character framing
    const z = ZOOM[page === 0 ? "profile" : page === PROFILE_EDIT ? "edit" : page === CUSTOM ? (countryView ? "full" : (curSub()?.zoom || curTab().zoom)) : "full"];
    root.dataset.sec = page === PROFILE_EDIT ? EDIT_SECTIONS[editSec].id : "";
    root.classList.toggle("is-placing", placing != null);
    const bgImg = $(".cc__bg--profile img");
    if (bgImg) bgImg.src = (BACKGROUNDS[state.profile.bg] || BACKGROUNDS[0]).img;
    const ch = $("[data-cc-char]");
    ch.style.left = z.x + "px";
    ch.style.top = z.y + "px";
    ch.style.width = z.w + "px";
    const mass = (state.bodyMass - 50) / 50, musc = (state.muscle - 50) / 50;
    ch.style.filter = [SKIN_FILTER[state.skinTone], `contrast(${1 + musc * .12})`].join(" ");
    ch.style.transform = `scaleX(${1 + mass * .06})`;

    const pageBox = $("[data-cc-page]");
    pageBox.innerHTML = page === 0 ? profileHtml() : page === 1 ? styleHtml() : page === PROFILE_EDIT ? profileEditHtml() : "";
    renderStickers();

    if (page === CUSTOM) {
      $("[data-cc-tabs]").innerHTML = keyChip("lb") + TABS.map((t, i) =>
        `<span class="cc-tab${i === tab ? " is-active" : ""}" data-tab="${i}" role="tab" aria-selected="${i === tab}">${t.label}</span>`).join("") + keyChip("rb");
      $("[data-cc-list]").innerHTML = buildPanel();
    }
    renderHints();
    applyFocus();
  }

  function renderHints() {
    if (page === PROFILE_EDIT && placing != null) {
      $("[data-cc-hints]").innerHTML = [`${glyph("b")}<span>Back</span>`, `${glyph("a")}<span>Confirm</span>`, `${glyph("ls")}<span>Move</span>`,
        `${keyChip("lb")}${keyChip("rb")}<span>Rotate</span>`, `${glyph("x")}<span>Remove</span>`].map(p => `<span class="cc-hint">${p}</span>`).join("");
      return;
    }
    if (page === 1 && picker.open) {
      $("[data-cc-hints]").innerHTML = [`${glyph("b")}<span>Close</span>`, `${glyph("a")}<span>Edit</span>`, `${glyph("ls")}<span>Move</span>`].map(p => `<span class="cc-hint">${p}</span>`).join("");
      return;
    }
    const parts = [`${glyph("b")}<span>${page === CUSTOM ? (countryView ? "Back" : "Profile") : page === PROFILE_EDIT ? "Profile" : "Close"}</span>`, `${glyph("a")}<span>Select</span>`];
    if (page === PROFILE_EDIT) {
      parts.push(`${keyChip("lb")}${keyChip("rb")}<span>Section</span>`);
      if (EDIT_SECTIONS[editSec].id !== "info") parts.push(`${glyph("y")}<span>Owned</span>`);
    } else if (page === 0) {
      parts.push(`${glyph("y")}<span>History</span>`, `${glyph("x")}<span>Edit</span>`, `${keyChip("lb")}${keyChip("rb")}<span>Page</span>`);
    } else if (page === CUSTOM) {
      parts.push(`${glyph("x")}<span>Reset</span>`, `${keyChip("lb")}${keyChip("rb")}<span>Category</span>`);
      if (curTab().subs && !countryView) parts.push(`${keyChip("lt")}${keyChip("rt")}<span>Section</span>`);
    } else {
      parts.push(`${keyChip("lb")}${keyChip("rb")}<span>Page</span>`);
      if (page === 1) parts.push(`${keyChip("lt")}${keyChip("rt")}<span>Type</span>`, `${glyph("x")}<span>Presets</span>`, `${glyph("y")}<span>Owned</span>`);
    }
    parts.push(`${keyChip("view")}<span>Friends</span>`);
    $("[data-cc-hints]").innerHTML = parts.map(p => `<span class="cc-hint">${p}</span>`).join("");
  }

  function items() {
    return $$(page === CUSTOM ? "[data-cc-list] .cc-item" : "[data-cc-page] .cc-item");
  }


  function applyFocus() {
    const list = items();
    // land on the first real option (skip the sub-tab row) unless the player put focus there
    focusIdx = clamp(focusIdx, 0, Math.max(0, list.length - 1));
    list.forEach((el, i) => {
      el.classList.toggle("is-focused", i === focusIdx);
      el.tabIndex = i === focusIdx ? 0 : -1;
      el.id = el.id || `cc-item-${i}`;
    });
    const el = list[focusIdx];
    // text fields only take the cursor after A (so Q / E and the arrows keep working while browsing)
    if (el && open) {
      if (el.tagName === "INPUT") { if (document.activeElement !== el) { document.activeElement?.blur?.(); root.focus?.({ preventScroll: true }); } }
      else el.focus({ preventScroll: true });
    }
    const cap = $("[data-cc-caption]");
    if (cap) cap.textContent = el?.dataset.caption || "Skill moves";
    renderSkillPanel(el);
    if (page === PROFILE_EDIT) {
      // keep the focused tile inside the grid window, and move the scroll thumb with it
      const grid = el?.closest(".pe-grid");
      if (grid) {
        const top = el.offsetTop, bottom = top + el.offsetHeight;
        if (top < grid.scrollTop) grid.scrollTop = top;
        else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight;
        const thumb = root.querySelector(".pe-scroll i"), max = grid.scrollHeight - grid.clientHeight;
        if (thumb) {
          thumb.parentElement.hidden = max <= 0;
          thumb.style.top = (max > 0 ? grid.scrollTop / max * (389 - 70) : 0) + "px";
        }
      }
      renderAchDetail(el);
      const pv = root.querySelector("[data-pe-sticker]");
      if (pv && el?.dataset.kind === "peSticker") pv.src = STICKERS[+el.dataset.val].img;
    }
    const mv = $("[data-cc-movename]"), eqBtn = $("[data-cc-equip]");
    if (mv) mv.textContent = el?.dataset.movename || "";
    if (eqBtn) eqBtn.textContent = el?.dataset.equipped === "true" ? "Unequip" : "Equip";
    // keep the focused item inside the customization panel
    if (page === CUSTOM && el) {
      const view = $("[data-cc-panel]"), inner = $("[data-cc-list]");
      const top = el.offsetTop, bottom = top + el.offsetHeight;
      let y = -(parseFloat(inner.dataset.y) || 0);
      if (top - 60 < y) y = Math.max(0, top - 60);
      else if (bottom + 20 > y + view.clientHeight) y = bottom + 20 - view.clientHeight;
      scrollPanel(y);
    }
  }

  function scrollPanel(y) {
    const view = $("[data-cc-panel]"), inner = $("[data-cc-list]");
    const max = Math.max(0, inner.scrollHeight - view.clientHeight);
    y = clamp(y, 0, max);
    inner.dataset.y = -y;
    inner.style.transform = `translateY(${-y}px)`;
    $(".cc-scroll").classList.toggle("is-off", max === 0);   // no scrollbar when everything fits
    const thumb = $("[data-cc-thumb]");
    const ratio = Math.min(1, view.clientHeight / Math.max(1, inner.scrollHeight));
    thumb.style.height = (ratio * 100) + "%";
    thumb.style.top = (max ? (y / max) * (1 - ratio) * 100 : 0) + "%";
  }

  // first option after the sub-tab row
  const firstOption = () => 0;
  //#endregion

  //#region [Input]
  function moveFocus(dir) {
    const list = items();
    const cur = list[focusIdx];
    if (!cur) return;
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = -1, bs = Infinity;
    list.forEach((el, i) => {
      if (i === focusIdx) return;
      const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2, dx = x - cx, dy = y - cy;
      const ok = { up: dy < -4, down: dy > 4, left: dx < -4, right: dx > 4 }[dir];
      if (!ok) return;
      const vert = dir === "up" || dir === "down";
      const score = (vert ? Math.abs(dy) : Math.abs(dx)) + (vert ? Math.abs(dx) : Math.abs(dy)) * 2.2;
      if (score < bs) { bs = score; best = i; }
    });
    if (best >= 0) { focusIdx = best; applyFocus(); api.rumble?.(20, .1); }
  }

  function rerender(keepFocus = true) {
    const keep = focusIdx;
    render();
    if (keepFocus) { focusIdx = keep; applyFocus(); }
  }

  // left / right on a slider, option row or the sub-tab row changes it instead of moving (the style is read-only here)
  function adjust(el, dir) {
    const d = dir === "left" ? -1 : 1;
    const kind = el.dataset.kind, key = el.dataset.key;
    if (kind === "slider") {
      let v;
      if (key.startsWith("face.")) v = state.face[key.slice(5)] = clamp(state.face[key.slice(5)] + d * 2, 0, 100);
      else v = state[key] = clamp(state[key] + d * 2, 0, 100);
      save(); rerender(); announce(`${el.getAttribute("aria-label")} ${v}`);
      return true;
    }
    if (kind === "option") {
      if (el.classList.contains("is-disabled")) { announce("Not available"); return true; }
      const lists = { aka: AKA, eyeColor: EYE_COLORS, hair: HAIR, hairColor: HAIR_COLORS, facial: FACIAL_HAIR, facialColor: HAIR_COLORS };
      const len = lists[key].length;
      state[key] = (state[key] + d + len) % len;
      const v = lists[key][state[key]];
      save(); rerender(); announce(`${el.getAttribute("aria-label")} ${Array.isArray(v) ? v[0] : v}`);
      return true;
    }
    return false;
  }

  function select() {
    const el = items()[focusIdx];
    if (!el) return;
    const kind = el.dataset.kind, val = +el.dataset.val;
    if (kind === "locked") { api.toast?.("Locked · unlock it in the Store or through Mastery"); announce("Locked"); return; }
    if (kind === "edit") { enterCustomization(); return; }
    // profile showcase -> the matching Edit profile section
    if (kind === "pfBelt") { openEdit(1); return; }
    if (kind === "pfAch") { openEdit(2); return; }
    if (kind === "pfInfo") { openEdit(0); return; }
    if (kind === "peName") { el.focus(); el.select?.(); return; }
    if (kind === "peShow") { const k = el.dataset.key; state.profile.show[k] = !state.profile.show[k]; save(); rerender(); announce(`${el.textContent.trim()} ${state.profile.show[k] ? "on" : "off"}`); return; }
    if (kind === "peAchLocked") { api.toast?.("Locked achievement"); return; }
    if (kind === "peBelt") {
      const sl = state.profile.belts, at = sl.indexOf(val);
      if (at >= 0) sl[at] = -1;
      else { const free = sl.indexOf(-1); if (free < 0) { api.toast?.("Showcase is full · remove a belt first"); return; } sl[free] = val; }
      save(); rerender(); announce(`${BELTS[val].name} ${at >= 0 ? "removed" : "added to showcase"}`); api.rumble?.(60, .25); return;
    }
    if (kind === "peAch") {
      const sl = state.profile.ach, at = sl.indexOf(val);
      if (at >= 0) sl[at] = -1;
      else { const free = sl.indexOf(-1); if (free < 0) { api.toast?.("Showcase is full · remove an achievement first"); return; } sl[free] = val; }
      save(); rerender(); announce(`${ACHIEVEMENTS[val].name} ${at >= 0 ? "removed" : "added to showcase"}`); api.rumble?.(60, .25); return;
    }
    if (kind === "peBg") { state.profile.bg = val; save(); rerender(); announce(`Background ${BACKGROUNDS[val].name}`); api.rumble?.(60, .25); return; }
    if (kind === "peSticker") { startPlacing(val); return; }
    if (kind === "music") { toggleMusic(); return; }
    if (kind === "history") { openHistory(); return; }
    if (kind === "save") { startSave("input"); return; }
    if (kind === "skill") { moveCat = val; goPage(1); return; }
    if (kind === "countryLink") { countryView = true; focusIdx = Math.max(0, COUNTRIES.findIndex(c => c[0] === state.country)); render(); announce("Country list"); return; }
    if (kind === "name") { api.toast?.("Name changes are not in this prototype"); return; }
    if (kind === "slider" || kind === "option") { adjust(el, "right"); return; }
    if (kind === "country") {
      state.country = el.dataset.val; countryView = false; focusIdx = 3; save(); render();
      const name = (COUNTRIES.find(c => c[0] === state.country) || [])[1];
      api.toast?.("Country · " + name); announce("Country " + name);
      return;
    }
    if (kind === "move") {
      const cat = MOVE_CATS[moveCat], eq = draft[cat.id];
      if (eq.includes(val)) { eq.splice(eq.indexOf(val), 1); announce(`${cat.moves[val]} unequipped`); }
      else if (eq.length < cat.slots) { eq.push(val); announce(`${cat.moves[val]} equipped`); }
      else { api.toast?.(`${cat.label} slots are full · unequip one first`); announce("Slots full"); return; }
      rerender(); api.rumble?.(60, .25); return;   // saved by Save / Create preset
    } else if (kind === "tattoo") {
      const slot = viewId();
      state.tattoos[slot] = state.tattoos[slot] === val ? -1 : val;
      announce(state.tattoos[slot] === val ? "Tattoo on" : "Tattoo off");
    } else if (kind in state) {
      state[kind] = val;
      announce(`${el.getAttribute("aria-label")} selected`);
    }
    save();
    rerender();
    api.rumble?.(60, .25);
  }

  function toggleMusic() {
    music.playing = !music.playing;
    clearInterval(music.timer);
    if (music.playing) {
      music.timer = setInterval(() => {
        music.pos = music.pos >= 100 ? 0 : music.pos + .5;
        const bar = $("[data-cc-progress]");
        if (bar) bar.style.width = music.pos + "%";
      }, 250);
    }
    rerender();
    announce(music.playing ? "Playing Ram Muay" : "Paused");
  }

  function resetView() {
    if (page !== CUSTOM) return;
    const v = viewId();
    const pick = keys => keys.forEach(k => { state[k] = JSON.parse(JSON.stringify(DEFAULT_STATE[k])); });
    ({
      face: () => pick(["face"]), eyes: () => pick(["eyeColor", "eyeShape", "eyeHeight", "eyeDepth", "brow", "browColor"]),
      skin: () => pick(["skinTone", "skinTint"]), hair: () => pick(["hair", "hairColor", "facial", "facialColor"]),
      body: () => pick(["bodyType", "bodyMass", "muscle"]), preset: () => pick(["aka", "gender", "preset"]), country: () => pick(["country"]),
      gloves: () => pick(["gloves"]), shorts: () => pick(["shorts"]), prajied: () => pick(["prajied"]), mongkol: () => pick(["mongkol"])
    }[v] || (() => { state.tattoos = JSON.parse(JSON.stringify(DEFAULT_STATE.tattoos)); }))();
    save();
    rerender();
    api.toast?.("Section reset to default");
    announce("Section reset to default");
  }

  function resetScroll() {
    const inner = $("[data-cc-list]");
    if (inner) { inner.dataset.y = 0; inner.style.transform = "translateY(0)"; }
  }

  function back() {
    if (page === PROFILE_EDIT && placing != null) { endPlacing(false); return; }
    if (page === PROFILE_EDIT) {
      const from = EDIT_SECTIONS[editSec].id;
      page = 0; render();
      const kind = { belt: "pfBelt", ach: "pfAch", info: "pfInfo" }[from];
      focusIdx = Math.max(0, items().findIndex(el => el.dataset.kind === kind));
      applyFocus(); announce("Profile"); return;
    }
    if (page === CUSTOM && countryView) { countryView = false; focusIdx = 3; render(); announce("Preset"); return; }
    if (page === CUSTOM) { leaveCustomization(); return; }
    close();
  }

  // Profile <-> Style preset (the two tabs)
  function goPage(p) {
    page = (p + PAGES.length) % PAGES.length;
    countryView = false;
    focusIdx = 0;
    render();
    announce(PAGES[page]);
    api.rumble?.(40, .15);
  }

  function enterCustomization() {
    page = CUSTOM;
    countryView = false;
    resetScroll();
    render();
    focusIdx = firstOption();
    applyFocus();
    announce("Customization, " + TABS[tab].label);
    api.rumble?.(60, .25);
  }

  function leaveCustomization() {
    page = 0;
    countryView = false;
    render();
    focusIdx = Math.max(0, items().findIndex(el => el.dataset.kind === "edit"));   // back on "Edit appearance"
    applyFocus();
    announce("Profile");
  }

  // top tab row: pages, or the Customization categories
  function topRow(d) {
    if (page === CUSTOM) {
      tab = (tab + d + TABS.length) % TABS.length;
      countryView = false;
      resetScroll();
      render();
      focusIdx = firstOption();
      applyFocus();
      announce(TABS[tab].label);
      api.rumble?.(40, .15);
    } else {
      goPage(page + d);
    }
  }

  // second tab row: Style preset move types, or the Customization sections
  function secondRow(d) {
    if (page === 1) {
      moveCat = (moveCat + d + MOVE_CATS.length) % MOVE_CATS.length;
      focusIdx = 0;
      render();
      announce(MOVE_CATS[moveCat].label);
    } else if (page === CUSTOM && curTab().subs && !countryView) {
      const t = curTab();
      sub[t.id] = (sub[t.id] + d + t.subs.length) % t.subs.length;
      resetScroll();
      render();
      focusIdx = firstOption();
      applyFocus();
      announce(t.subs[sub[t.id]].label);
    } else {
      return;
    }
    api.rumble?.(40, .15);
  }

  // action: up/down/left/right, a, back, x, lb, rb, lt, rt, view
  function handle(action) {
    if (action === "view") { window.MTX_FRIENDS?.open?.(); return; }   // Select (View / Create / F): Friends, everywhere
    if (action === "menu") { window.MTX_OPTIONS?.open?.(); return; }   // Start (Menu / Options / Tab): Options, everywhere
    if (!open) return;
    if (page === 1 && picker.open) return pickerInput(action);
    // sticker placement owns the buttons
    if (page === PROFILE_EDIT && placing != null) {
      const mv = { up: [0, -20], down: [0, 20], left: [-20, 0], right: [20, 0] }[action];
      if (mv) return placeMove(...mv);
      if (action === "lb" || action === "rb") return placeRotate(action === "lb" ? -1 : 1);
      if (action === "a") return endPlacing(true);
      if (action === "x") { placingNew = true; return endPlacing(false); }
      if (action === "back") return back();
      return;
    }
    if (page === 0 && action === "x") return openEdit(0);
    if (page === 0 && action === "y") return openHistory();
    if (page === PROFILE_EDIT && (action === "lb" || action === "rb")) return editSection(action === "lb" ? -1 : 1);
    if (page === PROFILE_EDIT && action === "y") {
      if (EDIT_SECTIONS[editSec].id === "info") return;
      state.profile.ownedOnly = !state.profile.ownedOnly; save(); focusIdx = 0; render();
      return announce(state.profile.ownedOnly ? "Showing owned" : "Showing all");
    }
    if (/^(up|down|left|right)$/.test(action)) {
      const el = items()[focusIdx];
      if ((action === "left" || action === "right") && el && adjust(el, action)) return;
      moveFocus(action);
      return;
    }
    if (action === "a") return select();
    if (action === "back") return back();
    if (page === 1 && action === "x") { picker.open = true; picker.i = Math.max(0, styleList().findIndex(st => st.id === editSid)); render(); announce("Style presets"); api.rumble?.(50, .25); return; }
    if (page === 1 && action === "y") return toggleOwned();
    if (action === "x") return resetView();
    if (action === "lb" || action === "rb") return topRow(action === "lb" ? -1 : 1);
    if (action === "lt" || action === "rt") return secondRow(action === "lt" ? -1 : 1);
  }

  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right",
    Enter: "a", " ": "a", Escape: "back", Backspace: "back", x: "x", y: "y", f: "view", q: "lb", e: "rb", z: "lt", c: "rt", Tab: "menu"
  };

  function onKey(e) {
    if (window.MTX_UI?.modal?.isOpen?.() || window.MTX_OPTIONS?.isOpen?.() || window.MTX_SETTINGS?.isOpen?.() || window.MTX_FRIENDS?.isOpen?.() || window.MTX_CLOBBY?.isOpen?.() || window.MTX_TOUR?.isOpen?.()) return;   // app.js routes the keys to the overlay
    if (open && e.target && e.target.closest?.("#ccOverlay") && /input/i.test(e.target.tagName)) {
      e.stopImmediatePropagation();
      if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); handle("down"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); handle("up"); }
      else if (e.key === "Escape") { e.preventDefault(); handle("back"); }
      else if (e.key === "Tab") { e.preventDefault(); handle("menu"); }
      return;
    }
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) { api.setDevice?.("kb"); handle("menu"); }
      return;
    }
    if (!open) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const a = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
    if (!a) return;
    if (e.repeat && !/^(up|down|left|right)$/.test(a)) return;
    api.setDevice?.("kb");
    handle(a);
  }

  function onKeyUp(e) {
    if (!open) return;
    e.stopImmediatePropagation();
    if (KEYMAP[e.key] === "a") release("a");
  }

  // gamepad button key from app.js ("b4" = LB, "b6" = LT, "b8" = View)
  function handlePad(key, action) {
    const map = { b4: "lb", b5: "rb", b6: "lt", b7: "rt", b8: "view", b9: "menu" };
    handle(map[key] || action);
  }

  function onClick(e) {
    const t = e.target;
    const hub = t.closest("[data-hub]"), tb = t.closest("[data-tab]"), sb = t.closest("[data-sub]"), cat = t.closest("[data-cat]");
    if (t.closest("[data-cc-back]")) return page === PROFILE_EDIT ? back() : leaveCustomization();
    const peSec = t.closest("[data-pe-sec]");
    if (peSec) { editSec = +peSec.dataset.peSec; focusIdx = 0; render(); return; }
    if (t.closest("[data-pe-owned]")) return handle("y");
    if (t.closest("[data-cc-owned]")) return toggleOwned();
    if (t.closest("[data-cc-save]")) return;   // held: pointerdown / pointerup
    const pp = t.closest("[data-pp]"); if (pp) { picker.i = +pp.dataset.pp; return pickerInput("a"); }
    if (t.closest(".cc-pp__scrim")) return pickerInput("back");
    if (t.closest("[data-cc-presets]")) return handle("x");
    if (hub) return goPage(+hub.dataset.hub);
    if (tb) { tab = +tb.dataset.tab; countryView = false; render(); focusIdx = firstOption(); applyFocus(); return; }
    if (sb) { sub[curTab().id] = +sb.dataset.sub; render(); return; }
    if (cat) { moveCat = +cat.dataset.cat; focusIdx = 0; render(); return; }
    const item = t.closest(".cc-item");
    if (item) {
      const i = items().indexOf(item);
      if (i < 0) return;
      focusIdx = i;
      if (t.closest(".cc-arrow--l")) return adjust(item, "left");
      if (t.closest(".cc-arrow--r")) return adjust(item, "right");
      const track = t.closest(".cc-slider__track");
      if (track) {
        const r = track.getBoundingClientRect(), v = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100);
        const key = item.dataset.key;
        if (key.startsWith("face.")) state.face[key.slice(5)] = v; else state[key] = v;
        save(); rerender(); announce(`${item.getAttribute("aria-label")} ${v}`);
        return;
      }
      select();
    }
  }

  function onWheel(e) {
    if (page !== CUSTOM || !e.target.closest("[data-cc-panel]")) return;
    e.preventDefault();
    const inner = $("[data-cc-list]");
    scrollPanel(-(parseFloat(inner.dataset.y) || 0) + e.deltaY);
  }
  //#endregion

  //#region [Open / close]
  function show() {
    // the old Profile / Style preset overlay is replaced by the Tactical Loadout overlay (screen-loadout.js), opened on Profile
    if (window.MTX_LOADOUT) { if (!window.MTX_SCREENS?.management?.isModalOpen?.()) window.MTX_LOADOUT.open({ page: 0 }); return; }
    if (open || window.MTX_SCREENS?.management?.isModalOpen?.()) return;   // not over a modal / the simulate-day transition
    open = true;
    lastFocus = document.activeElement;
    root.hidden = false;
    root.classList.add("is-open");
    document.body.classList.add("cc-open");
    // always open on Profile; Customization is the "Edit appearance" menu from there
    page = 0;
    countryView = false;
    focusIdx = 0;
    picker.open = false; editSid = null;
    render();
    renderLauncher();
    announce("Character customization, Profile");
    api.rumble?.(60, .25);
  }

  // Style preset: right panel = Mastery Skill data of the focused move (screen-skilltree.js getMastery)
  function renderSkillPanel(el) {
    const panel = root?.querySelector(".cc-sp__skill");
    if (!panel || !el || !el.classList.contains("cc-move")) return;
    const q = n => panel.querySelector(`[data-cc-skill="${n}"]`);
    const cat = MOVE_CATS[moveCat], i = +el.dataset.val || [...el.parentElement.children].indexOf(el);
    const name = cat.moves[i] ?? el.dataset.movename;
    const m = api.getScreen?.("skilltree")?.getMastery?.(cat.id, name, i);
    q("move").src = el.querySelector("img")?.getAttribute("src") || "";
    q("name").textContent = m ? m.name : name;
    q("kind").textContent = m ? [cat.id === "perk" ? cat.label : m.kind, m.code].filter(Boolean).join(" · ") : cat.label;
    q("tier").textContent = !m ? "Not in this Mastery tree"
      : m.tiers > 1 ? (m.owned ? `Tier ${["", "I", "II", "III"][m.owned]} · ${m.owned} / ${m.tiers} tiers` : `0 / ${m.tiers} tiers unlocked`)
      : (m.owned ? "Slot unlocked" : "Slot not unlocked");
    q("pips").innerHTML = m ? Array.from({ length: m.tiers }, (_, k) => `<b class="${k < m.owned ? "is-on" : ""}"></b>`).join("") : "";
    q("desc").textContent = m ? m.desc : "This move is not part of the current style's Mastery Skill tree.";
    q("stats").textContent = m ? m.stats.map(([k, v]) => `${v} ${k}`).join("  ·  ") : "";
    q("next").textContent = el.classList.contains("is-locked") ? "Locked · unlock in the Store or through Mastery" : (m ? m.next : "");
    panel.classList.toggle("is-empty", !m);
  }

  // Profile: Match History screen (screen-history.js); its Back reopens this Profile page
  function openHistory() {
    close();
    api.getScreen?.("history")?.openFromProfile?.();
    api.rumble?.(60, .25);
  }

  // Style preset: the style itself is changed on the Tactical Style screen
  function goTactical() {
    close();
    api.show?.("tactical");
    api.rumble?.(60, .25);
  }

  function toggleOwned() {
    state.showOwned = !state.showOwned;
    save();
    focusIdx = 0;
    render();
    announce(state.showOwned ? "Showing owned moves" : "Showing all moves");
  }

  // hold A / Space (or the mouse) on Save / Create preset; letting go early cancels
  function startSave(source) {
    const el = root.querySelector("[data-cc-save]");
    if (el && saveHold) saveHold.start(el, { source });
  }
  function release(action) { if (action === "a" && saveHold?.active) saveHold.cancel(true); }

  function savePreset() {
    const created = !state.presets[editSid];
    if (created && !moveCount(draft)) { api.toast?.("Equip at least one move to create the preset"); api.rumble?.(80, .2); return; }
    state.presets[editSid] = copy(draft);
    save();
    const st = styleList().find(x => x.id === editSid), msg = `${st ? st.title : "Style"} preset ${created ? "created" : "saved"}`;
    api.toast?.(msg);
    api.log?.(msg, "action");
    api.rumble?.(80, .35);
    rerender();
    announce(msg);
  }

  function close() {
    open = false;
    if (music.playing) { music.playing = false; clearInterval(music.timer); }
    root.classList.remove("is-open");
    root.hidden = true;
    document.body.classList.remove("cc-open");
    renderLauncher();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus?.({ preventScroll: true });
  }

  // "[Tab] Character Customization" entry appended to every hint bar (always visible, also clickable)
  function addLauncherHints() {
    document.querySelectorAll(".hint-bar").forEach(bar => {
      if (bar.querySelector("[data-cc-launch]")) return;
      return;   // threads #13 / #14: Options + Friends stay on the social bar (bottom right) only, no launcher hints
      if (bar.closest("#start, #login")) return;   // intro / login: before the game, no Friends
      if (!bar.querySelector(".glyph[data-btn=\"menu\"]")) bar.insertAdjacentHTML("beforeend", window.MTX_UI.hintItem("menu", "Options"));
      bar.insertAdjacentHTML("beforeend",
        `<span class="hint hint--cc" data-hint-key="view" data-cc-launch role="button" tabindex="0" aria-haspopup="dialog" aria-controls="ccOverlay">` +
        `<span class="glyph glyph--key" data-cc-key></span><span>Friends</span></span>`);
    });
    document.addEventListener("click", e => { if (e.target.closest("[data-cc-launch]")) window.MTX_FRIENDS?.open?.(); });
    document.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest?.("[data-cc-launch]")) { e.preventDefault(); window.MTX_FRIENDS?.open?.(); }
    });
  }

  function renderLauncher() {
    document.querySelectorAll("[data-cc-key]").forEach(k => { k.textContent = keyLabel("view"); });
    document.querySelectorAll("[data-cc-launch]").forEach(h => h.setAttribute("aria-expanded", open));
  }

  function isOpen() {
    return open;
  }

  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    root = document.getElementById("ccOverlay");
    if (!root) return;
    try { state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), JSON.parse(api.store.get("cc_state", "{}"))); } catch (e) { /* keep defaults */ }
    state.profile = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE.profile)), state.profile || {});
    state.profile.show = Object.assign({}, DEFAULT_STATE.profile.show, state.profile.show || {});
    if (!state.presets) state.presets = { [api.getScreen?.("tactical")?.getSelStyle?.() || "phranakhon"]: copy(state.equipped) };
    syncProfileCards();
    addEventListener("keydown", onKey, true);
    addEventListener("keyup", onKeyUp, true);
    root.addEventListener("click", onClick);
    root.addEventListener("pointerdown", e => { if (e.button === 0 && e.target.closest("[data-cc-save]")) startSave("mouse"); });
    ["pointerup", "pointerleave"].forEach(ev => root.addEventListener(ev, () => { if (saveHold?.source === "mouse") release("a"); }));
    saveHold = window.MTX_UI.createHold({ ms: 900, flash: "is-unlocked-flash",
      onDone: () => savePreset(),
      onCancel: ({ quick, notify }) => { if (notify && quick) window.MTX_UI.holdHint(state.presets?.[editSid] ? "save" : "create the preset"); } });
    root.addEventListener("input", e => {
      if (e.target.dataset?.kind !== "peName") return;
      state.profile.name = e.target.value.trim() || "SX.MTX";
      save();
    });
    root.addEventListener("wheel", onWheel, { passive: false });
    addLauncherHints();
    renderLauncher();
    // the chip shows device-specific keys (Tab / View / Share); refresh it when the input device changes
    let dev = api.getDevice?.();
    setInterval(() => { const d = api.getDevice?.(); if (d !== dev) { dev = d; renderLauncher(); refreshKeys(); if (open) renderHints(); } }, 500);
  }
  //#endregion

  window.MTX_SCREENS.customize = {
    bindApi,
    init,
    isOpen,
    getPresets,
    release,
    show,
    close,
    handle,
    handlePad
  };
})();
