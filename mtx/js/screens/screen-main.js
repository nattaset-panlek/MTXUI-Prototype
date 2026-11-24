(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  let quickFadeTimer = null;
  const QUICK_MODES = [
    {
      title: "Quick\nFight",
      sub: "Prepare for your upcoming fight",
      toast: "Quick Fight · matchmaking starts here",
    },
    {
      title: "Training\nMode",
      sub: "Practice combos and hone your techniques",
      toast: "Training Mode · sparring & combo practice",
    },
  ];
  let quickModeIdx = 0;
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    quickModeIdx = Math.max(0, Math.min(QUICK_MODES.length - 1, +api.store.get("quick_mode", 0) || 0));
    renderQuickMode(false);
    // mouse wheel on the Quick Fight card switches its mode page, like Q / E (thread #15)
    let wheelAt = 0;
    document.addEventListener("wheel", e => {
      if (!e.target.closest?.('#s-main [data-id="quick"]')) return;
      if (window.MTX_MODE_CARD?.isFinding?.() || Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      if (performance.now() - wheelAt < 250) return;
      wheelAt = performance.now();
      if (e.deltaY > 0) nextQuickMode(); else prevQuickMode();
    }, { passive: false });
  }

  function enter() {
    renderQuickMode(false);
  }

  function onBack() {
    if (window.MTX_MODE_CARD?.isFinding?.()) {   // Quick Match is searching: leaving cancels it
      window.MTX_UI.dialog.open({
        title: "Leave Quick Match?",
        body: "Going back to Character Select cancels your Quick Match search.",
        primary: "Leave",
        secondary: "Stay",
        onPrimary: () => { window.MTX_MODE_CARD.cancelFind(); api.showRoot("charselect"); },
      });
      return true;
    }
    window.MTX_UI.dialog.open({
      title: "Change Character?",
      body: "You will go back to Character Select.",
      primary: "Change",
      secondary: "Cancel",
      onPrimary: () => api.showRoot("charselect"),
    });
    return true;
  }

  function setQuickMode(idx, sound = true) {
    const newIdx = (idx + QUICK_MODES.length) % QUICK_MODES.length;
    if (newIdx === quickModeIdx) return;
    const card = api.$('[data-id="quick"]', api.screens.main);
    if (!card) {
      quickModeIdx = newIdx;
      api.store.set("quick_mode", quickModeIdx);
      renderQuickMode(sound);
      return;
    }
    card.classList.add("is-fading");
    clearTimeout(quickFadeTimer);
    quickFadeTimer = setTimeout(() => {
      quickModeIdx = newIdx;
      api.store.set("quick_mode", quickModeIdx);
      renderQuickMode(sound);
      card.classList.remove("is-fading");
    }, 125);
  }

  function nextQuickMode() {
    setQuickMode(quickModeIdx + 1);
    const card = api.$('[data-id="quick"]', api.screens.main);
    if (card && api.focused !== card) api.setFocus(card);
  }

  function prevQuickMode() {
    setQuickMode(quickModeIdx - 1);
    const card = api.$('[data-id="quick"]', api.screens.main);
    if (card && api.focused !== card) api.setFocus(card);
  }

  function startQuickFight() {
    const card = api.$('[data-id="quick"]', api.screens.main);
    if (quickModeIdx !== 0) { api.toast(QUICK_MODES[quickModeIdx].toast); return; }   // Training Mode has no matchmaking
    api.rumble(100, 0.5);
    if (window.MTX_MODE_CARD.isFinding()) { window.MTX_MODE_CARD.cancelFind(); api.toast("Match find cancelled"); return; }   // A on the searching card cancels
    // background find: Shop / Event / Profile / Settings stay usable; the other mode cards ask first (is-find-off)
    window.MTX_MODE_CARD.startFind(card, { mode: "Quick Fight", bg: true, lockOthers: true, onDone: () => api.findReady(() => window.MTX_CLOBBY.startMatch()) });
  }

  function renderQuickMode(sound = false) {
    const card = api.$('[data-id="quick"]', api.screens.main);
    if (!card) return;
    const data = QUICK_MODES[quickModeIdx];
    const titleEl = card.querySelector(".mode-card__title");
    const subEl = card.querySelector(".mode-card__sub");
    if (titleEl) titleEl.textContent = data.title;
    if (subEl) subEl.textContent = data.sub;
    card.dataset.toast = data.toast;
    const dots = card.querySelectorAll(".mode-card__pager i");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("is-active", idx === quickModeIdx);
    });
    if (sound && api.rumble) {
      api.rumble(60, 0.25);
      api.toast(data.title.replace("\n", " ") + " selected");
    }
  }
  //#endregion

  window.MTX_SCREENS.main = {
    bindApi,
    init,
    enter,
    onBack,
    renderQuickMode,
    setQuickMode,
    nextQuickMode,
    prevQuickMode,
    actions: {
      startQuickFight,
      prevQuickMode() { prevQuickMode(); },
      nextQuickMode() { nextQuickMode(); },
      // player mini profile box (Main / Career): A = the Profile page, as Options > Profile (user 2026-11-24)
      openProfile() { window.MTX_SCREENS?.customize?.show?.(0); }
    }
  };
})();
