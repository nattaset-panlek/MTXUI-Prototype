/* Character Select: comes between Login and the Main Menu. Same layout as Main, without the mode cards.
   Q / E (LT / RT, or the mouse wheel, or a click on the keys) scroll through the characters and wrap at the ends; the card follows.
   The picked character is stored and shown on every profile card matched by CARD_SCOPE.
   ROSTER is placeholder data: the prototype has no real character list. */
(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  const ROSTER = [
    { name: "SX.MTX", aka: "The Mighty", id: "SXMTX#1111", overall: 88, record: "20-15-12", ko: "80%", color: 0xd6453d },
    { name: "SX.KRU", aka: "The Teacher", id: "SXKRU#2042", overall: 76, record: "14-9-3", ko: "62%", color: 0x2fa39a },
    { name: "SX.NAGA", aka: "The Serpent", id: "SXNAGA#3187", overall: 81, record: "31-12-5", ko: "71%", color: 0x8a5cd6 },
    { name: "SX.SAMART", aka: "The Knee", id: "SXSMT#4406", overall: 69, record: "8-6-1", ko: "44%", color: 0xe08a2e },
  ];
  const CARD_SCOPE = "#s-charselect .profile-card, #s-main .profile-card, #s-career .profile-card";
  const STORE_KEY = "character";
  const WHEEL_GAP_MS = 180;
  let api = null;
  let idx = 0;
  let lastWheel = 0;
  //#endregion

  //#region [Private Methods]
  const text = (root, sel, value) => { const el = root.querySelector(sel); if (el) el.textContent = value; };

  const look = () => ({ color: ROSTER[idx].color, metalness: 0.05 });

  function render() {
    const c = ROSTER[idx];
    document.querySelectorAll(CARD_SCOPE).forEach(card => {
      text(card, ".profile-card__name", c.name);
      text(card, ".profile-card__aka", c.aka);
      text(card, ".profile-card__id", c.id);
      const values = card.querySelectorAll(".profile-card__stats .stat__value");
      [c.overall, c.record, c.ko].forEach((v, i) => { if (values[i]) values[i].textContent = v; });
    });
    const { color, metalness } = look();
    window.MTX_CHARACTER3D?.setColor(color, metalness);
    const s = api.screens.charselect;
    text(s, ".charsel__name", c.name);
    s.querySelectorAll(".charsel__dots i").forEach((dot, i) => dot.classList.toggle("is-active", i === idx));
  }

  function step(delta) {
    idx = (idx + delta + ROSTER.length) % ROSTER.length;
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
    const saved = +api.store.get(STORE_KEY, 0) || 0;
    idx = saved >= 0 && saved < ROSTER.length ? saved : 0;
    const s = api.screens.charselect;
    s.querySelector(".charsel__dots").innerHTML = ROSTER.map(() => "<i></i>").join("");
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
        api.rumble?.(80, .35);
        api.showRoot("main");
        window.MTX_CAMPAIGN?.maybeOpen?.();
      },
      prevCharacter() { step(-1); },
      nextCharacter() { step(1); },
    },
  };
})();
