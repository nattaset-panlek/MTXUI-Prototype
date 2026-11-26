/* Character Select: comes between Login and the Main Menu. Same layout as Main, without the mode cards.
   Q / E (LT / RT, or the mouse wheel, or a click on the keys) scroll through the characters and wrap at the ends; the card follows.
   The picked character is stored and shown on every profile card matched by CARD_SCOPE.
   ROSTER is placeholder data: the prototype has no real character list.
   4 slots (user 2026-11-26): an empty slot shows CTA "Create" (fills it with a new character at once);
   a filled slot has the hint X / I "Remove" (asks first, then empties the slot). Slots are stored in "charSlots". */
(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  const SLOTS = 4;
  const NEW_CHARACTERS = [        // Create takes the next one (placeholder data)
    { name: "SX.MTX", aka: "The Mighty", id: "SXMTX#1111", overall: 88, record: "20-15-12", ko: "80%", color: 0xd6453d },
    { name: "SX.KRU", aka: "The Teacher", id: "SXKRU#2042", overall: 76, record: "14-9-3", ko: "62%", color: 0x2fa39a },
    { name: "SX.NAGA", aka: "The Serpent", id: "SXNAGA#3187", overall: 81, record: "31-12-5", ko: "71%", color: 0x8a5cd6 },
    { name: "SX.SAMART", aka: "The Knee", id: "SXSMT#4406", overall: 69, record: "8-6-1", ko: "44%", color: 0xe08a2e },
    { name: "SX.ROOKIE", aka: "The New Blood", id: "SXRKE#5120", overall: 50, record: "0-0-0", ko: "0%", color: 0x9a9da6 },
  ];
  const DEFAULT_SLOTS = [0, 1, 2, null];   // NEW_CHARACTERS indexes; null = empty slot
  const SLOT_KEY = "charSlots";
  let slots = DEFAULT_SLOTS.map(i => i == null ? null : NEW_CHARACTERS[i]);
  const CARD_SCOPE = "#s-charselect .profile-card, #s-main .profile-card, #s-career .profile-card";
  const STORE_KEY = "character";
  const WHEEL_GAP_MS = 180;
  let api = null;
  let idx = 0;
  let lastWheel = 0;
  //#endregion

  //#region [Private Methods]
  const text = (root, sel, value) => { const el = root.querySelector(sel); if (el) el.textContent = value; };

  const look = () => ({ color: (slots[idx] || slots.find(Boolean) || NEW_CHARACTERS[0]).color, metalness: 0.05 });
  const saveSlots = () => api.store.set(SLOT_KEY, JSON.stringify(slots));
  function loadSlots() {
    try {
      const v = JSON.parse(api.store.get(SLOT_KEY, "null"));
      if (Array.isArray(v) && v.length === SLOTS) slots = v.map(c => c && c.name ? c : null);
    } catch { /* keep the defaults */ }
  }

  function renderHints(empty) {
    const bar = api.screens.charselect.querySelector(".hint-bar");
    const data = empty ? { b: "Back", "lt+rt": "Character" } : { b: "Back", x: "Remove", "lt+rt": "Character" };
    bar.innerHTML = window.MTX_UI.hintItems(data);
    const g = bar.querySelector('.glyph[data-btn="x"]');
    if (g) { g.dataset.kb = "I"; if (api.getDevice?.() === "kb") g.textContent = "I"; }
  }

  function render() {
    const c = slots[idx];
    const s = api.screens.charselect;
    s.classList.toggle("is-empty-slot", !c);
    text(s, ".charsel__cta .btn-cta__label", c ? "Select" : "Create");
    text(s, ".charsel__name", c ? c.name : "Empty Slot");
    s.querySelectorAll(".charsel__dots i").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === idx);
      dot.classList.toggle("is-empty", !slots[i]);
    });
    renderHints(!c);
    if (!c) return;   // profile cards elsewhere keep the last character
    document.querySelectorAll(CARD_SCOPE).forEach(card => {
      text(card, ".profile-card__name", c.name);
      text(card, ".profile-card__aka", c.aka);
      text(card, ".profile-card__id", c.id);
      const values = card.querySelectorAll(".profile-card__stats .stat__value");
      [c.overall, c.record, c.ko].forEach((v, i) => { if (values[i]) values[i].textContent = v; });
    });
    const { color, metalness } = look();
    window.MTX_CHARACTER3D?.setColor(color, metalness);
  }

  function createCharacter() {
    const used = new Set(slots.filter(Boolean).map(c => c.id));
    const next = NEW_CHARACTERS.find(c => !used.has(c.id)) || NEW_CHARACTERS[NEW_CHARACTERS.length - 1];
    slots[idx] = { ...next };
    saveSlots();
    api.rumble?.(80, .35);
    api.toast?.(`${next.name} created`);
    render();
  }

  function removeCharacter() {
    const c = slots[idx];
    if (!c || overlayOpen()) return;
    window.MTX_UI.dialog.open({
      title: `Remove ${c.name}?`,
      body: "This character and its progress will be deleted. This cannot be undone.",
      primary: "Remove",
      secondary: "Cancel",
      onPrimary: () => { slots[idx] = null; saveSlots(); api.toast?.(`${c.name} removed`); render(); },
    });
  }

  function step(delta) {
    idx = (idx + delta + SLOTS) % SLOTS;
    api.store.set(STORE_KEY, idx);
    api.rumble?.(30, .15);
    render();
  }

  const overlayOpen = () => [window.MTX_UI?.dialog, window.MTX_UI?.modal, window.MTX_LOGIN, window.MTX_CAMPAIGN,
    window.MTX_OPTIONS, window.MTX_SETTINGS, window.MTX_FRIENDS].some(o => o?.isOpen?.());
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) { api = coreApi; }

  function init(coreApi) {
    api = coreApi;
    loadSlots();
    const saved = +api.store.get(STORE_KEY, 0) || 0;
    idx = saved >= 0 && saved < SLOTS ? saved : 0;
    const s = api.screens.charselect;
    s.querySelector(".charsel__dots").innerHTML = slots.map(() => "<i></i>").join("");
    s.querySelectorAll("[data-char-step]").forEach(b => b.addEventListener("click", () => {
      if (api.getCur() === "charselect" && !overlayOpen()) step(+b.dataset.charStep);
    }));
    s.addEventListener("wheel", e => {
      if (api.getCur() !== "charselect" || overlayOpen() || !e.deltaY) return;
      const now = performance.now();
      if (now - lastWheel < WHEEL_GAP_MS) return;
      lastWheel = now;
      step(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });
    render();
  }

  function enter() { render(); }

  function onBack() {
    window.MTX_UI.dialog.open({
      title: "Leave Character Select?",
      body: "You will go back to the Login screen.",
      primary: "Leave",
      secondary: "Cancel",
      onPrimary: () => window.MTX_LOGOUT?.(),
    });
    return true;
  }
  //#endregion

  window.MTX_SCREENS.charselect = {
    bindApi,
    look,
    init,
    enter,
    onBack,
    actions: {
      confirmCharacter() {
        if (!slots[idx]) { createCharacter(); return; }
        api.rumble?.(80, .35);
        api.showRoot("main");
        window.MTX_CAMPAIGN?.maybeOpen?.();
      },
      prevCharacter() { step(-1); },
      nextCharacter() { step(1); },
      removeCharacter,
    },
  };
})();
