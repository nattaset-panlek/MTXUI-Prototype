(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const MODES = {
    rank: {
      id: "rank",
      page: 0,
      cardTitle: "Rank\nFight",
      title: "Rank Mode",
      badge: "Competitive",
      sub: "Counts for progression: earns Level XP, quest progress and rank points",
      toast: "Rank Mode active · Earns Level XP, quest progress and rank points",
      fightToast: "Next Fight · Starting Rank Mode match!"
    },
    casual: {
      id: "casual",
      page: 1,
      cardTitle: "Casual\nFight",
      title: "Casual Mode",
      badge: "Exhibition",
      sub: "Exhibition only: no Level XP, quest progress or rank points",
      toast: "Casual Mode active · Exhibition only, no XP or quest progress",
      fightToast: "Next Fight · Starting Casual exhibition match!"
    }
  };
  const ORDER = ["rank", "casual"];
  let currentMode = "rank";
  let fadeTimer = null;
  //#endregion

  //#region [Properties]
  function getCurrentMode() {
    return currentMode;
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    currentMode = api.store.get("career_mode", "rank");
    if (!MODES[currentMode]) currentMode = "rank";
    renderMode(false);
  }

  function enter() {
    renderMode(false);
  }
  //#endregion

  //#region [Public Methods]
  function toggleCareerMode() {
    setMode(currentMode === "rank" ? "casual" : "rank", true);
  }

  // Same pager behaviour as Quick Fight on the main screen: short fade, then swap the card text.
  function setMode(modeKey, sound = true) {
    if (!MODES[modeKey] || modeKey === currentMode) return;
    const card = nextCard();
    const apply = () => {
      currentMode = modeKey;
      api.store.set("career_mode", currentMode);
      renderMode(sound);
      card?.classList.remove("is-fading");
    };
    if (!card) { apply(); return; }
    card.classList.add("is-fading");
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(apply, 125);
  }

  function stepMode(dir) {
    const i = ORDER.indexOf(currentMode);
    setMode(ORDER[(i + dir + ORDER.length) % ORDER.length]);
    const card = nextCard();
    if (card && api.getFocused() !== card) api.setFocus(card);
  }

  function setModePage(page) {
    setMode(ORDER[page] || "rank");
    const card = nextCard();
    if (card && api.getFocused() !== card) api.setFocus(card);
  }

  function startNextFight() {
    const data = MODES[currentMode] || MODES.rank;
    api.rumble(100, 0.5);
    if (window.MTX_MODE_CARD.isFinding()) { window.MTX_MODE_CARD.cancelFind(); api.toast("Match find cancelled"); return; }   // A on the searching card cancels
    const mode = currentMode === "rank" ? "rank" : "casual";
    // background find: the player may browse Ultimate Fight; the match starts once nothing is busy, back on career
    window.MTX_MODE_CARD.startFind(nextCard(), { bg: true, mode: mode === "rank" ? "Rank Fight" : "Casual Fight",
      onDone: () => api.findReady(() => window.MTX_CLOBBY.startMatch({ onExit: resolveFight, mode })) });
  }

  function resolveFight() {
    const data = MODES[currentMode] || MODES.rank;
    if (currentMode !== "rank") {
      api.toast(data.fightToast);
      api.log(`Next Fight started (${data.title})`, "action");
      return;
    }
    // prototype: a Rank fight resolves instantly with a random result; it feeds the sponsor challenges
    const win = Math.random() < .7;
    const r = { win, fans: 250 + Math.round(Math.random() * 350), strikes: 10 + Math.round(Math.random() * 14), head: 4 + Math.round(Math.random() * 6) };
    api.toast(`Rank fight · ${win ? "Win" : "Loss"} · ${r.strikes} strikes, +${r.fans} fans`);
    api.log(`Rank fight: ${win ? "win" : "loss"} (${r.strikes} strikes, ${r.head} head, +${r.fans} fans)`, "action");
    api.getScreen?.("management")?.recordFight?.(r);
    api.getScreen?.("history")?.addFight?.(r);   // Match History (Profile)
  }
  //#endregion

  //#region [Private Methods]
  function nextCard() {
    return api.$('[data-id="next"]', api.screens.career);
  }

  function renderMode(sound = false) {
    const data = MODES[currentMode] || MODES.rank;
    const card = nextCard();
    if (card) {
      card.dataset.careerMode = currentMode;
      card.querySelector(".mode-card__title").textContent = data.cardTitle;
      card.querySelector(".mode-card__sub").textContent = data.sub;
      card.dataset.toast = data.fightToast;
      card.querySelectorAll(".mode-card__pager i").forEach(dot => dot.classList.toggle("is-active", +dot.dataset.page === data.page));
    }

    if (sound && api.rumble) {
      api.rumble(60, 0.25);
      api.toast(data.toast);
      api.log(`Career fight mode switched to ${data.title}`, "state");
    }
  }
  //#endregion

  // mode-card pager clicks (moved from app.js): a dot picks that page, a ‹ › glyph steps. Returns true when taken.
  function onClick(e) {
    const dot = e.target.closest(".mode-card__pager i");
    if (dot) { setModePage(+dot.dataset.page || 0); return true; }
    const glyph = e.target.closest(".mode-card__pager .glyph");
    if (!glyph) return false;
    stepMode(glyph.dataset.btn === "lt" ? -1 : 1);
    return true;
  }

  window.MTX_SCREENS.career = {
    onClick,
    bindApi,
    init,
    enter,
    getCurrentMode,
    toggleCareerMode,
    setMode,
    setModePage,
    prevMode: () => stepMode(-1),
    nextMode: () => stepMode(1),
    startNextFight,
    actions: {
      toggleCareerMode,
      startNextFight,
      prevCareerMode: () => stepMode(-1),
      nextCareerMode: () => stepMode(1)
    }
  };
})();
