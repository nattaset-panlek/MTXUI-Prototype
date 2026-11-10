(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const HOLD_DURATION = 1000;
  let currentPage = 0;
  let focusedTileId = null;

  let claimHold = null;   // MTX_UI.createHold, made in init

  // Item data lives in data/items.js; this is only which items each Style Level gives
  const PAGES = [
    { pageName: "Page 1", subtitle: "MTX Genesis 2026", ids: ["r0_0","r0_1","r0_2","r0_3","r0_4"] },
    { pageName: "Page 2", subtitle: "Muay Thai Warriors", ids: ["r1_0","r1_1","r1_2","r1_3","r1_4"] },
    { pageName: "Page 3", subtitle: "Apex Legends", ids: ["r2_0","r2_1","r2_2","r2_3","r2_4"] }
  ].map(p => ({ ...p, items: p.ids.map(id => {
    const it = window.MTX_ITEMS.get(id);
    return { ...it, title: it.name, thumb: it.img };
  }) }));
  let claimedSet = new Set(["r0_3"]);
  //#endregion

  //#region [Properties]
  function isClaimHoldReady() {
    if (!api || api.getCur() !== "rewards") return false;
    const tile = getActiveTile();
    if (!tile) return false;
    return !claimedSet.has(tile.id) && !lockLevel(tile);
  }

  function isHoldingClaim() {
    return !!claimHold?.active;
  }

  function getCurrentPage() {
    return currentPage;
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    claimHold = window.MTX_UI.createHold({
      ms: HOLD_DURATION,
      flash: "is-unlocked-flash",
      onDone: id => finishClaimHold(id),
      onCancel: ({ notify }) => { if (notify) window.MTX_UI.holdHint("claim reward"); }
    });
    loadState();
    renderPage();
    bindEvents();
  }

  function enter() {
    renderPage();
    // same balance the R Shop spends (screen-store.js)
    const rPoints = +api.store.get("store_r", 1500) || 1500;
    api.$$("#s-rewards [data-store-r]").forEach(el => { el.textContent = rPoints.toLocaleString("en-US"); });
  }
  //#endregion

  //#region [Public Methods]
  function setPage(pageIndex, sound = true) {
    const total = PAGES.length;
    const newPage = (pageIndex + total) % total;
    if (newPage === currentPage) return;
    currentPage = newPage;
    api.store.set("rewards_page", currentPage.toString());
    focusedTileId = PAGES[currentPage].items[0].id;
    renderPage();
    if (sound) {
      api.rumble(50, 0.2);
      api.toast(`Rewards · ${PAGES[currentPage].pageName} (${PAGES[currentPage].subtitle})`);
    }
    const firstTile = api.$(`#s-rewards .reward-tile[data-id="${focusedTileId}"]`);
    if (firstTile) api.setFocus(firstTile);
  }

  function nextPage() {
    setPage(currentPage + 1, true);
  }

  function prevPage() {
    setPage(currentPage - 1, true);
  }

  function focus(el) {
    if (el && el.classList.contains("reward-tile")) {
      focusedTileId = el.dataset.id;
      renderDetail(el.dataset.id);
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      updateScrollbar();
    }
  }

  function startClaimHold(source) {
    if (claimHold.active) return false;
    const tile = getActiveTile();
    if (!tile) return false;
    if (claimedSet.has(tile.id)) {
      api.toast("Already claimed");
      return false;
    }
    const tileEl = api.$(`#s-rewards .reward-tile[data-id="${tile.id}"]`);
    return claimHold.start(api.bind("claimBtn"), { ctx: tile.id, source, extra: [tileEl] });
  }

  function cancelClaimHold(notify = false) {
    claimHold?.cancel(notify);
  }

  function finishClaimHold(tileId) {
    claimedSet.add(tileId);
    saveState();

    const tile = getTileById(tileId);
    updateTileState(tileId);
    renderDetail(tileId);
    renderClaimStats();

    api.rumble(160, 0.65);
    api.toast(`Claimed · ${tile ? tile.title : "Reward"}`);
    api.log(`Reward claimed: ${tile ? tile.title : tileId}`, "action");
  }
  //#endregion

  //#region [Private Methods]
  function loadState() {
    currentPage = +api.store.get("rewards_page", "0") || 0;
    if (currentPage >= PAGES.length || currentPage < 0) currentPage = 0;
    const savedClaimed = api.store.get("rewards_claimed", "r0_3");
    claimedSet = new Set(savedClaimed ? savedClaimed.split(",") : ["r0_3"]);
  }

  function saveState() {
    api.store.set("rewards_claimed", Array.from(claimedSet).join(","));
  }

  function getAllItems() {
    return PAGES.flatMap(p => p.items);
  }

  function getActiveTile() {
    const all = getAllItems();
    if (!focusedTileId) return all[0];
    return all.find(it => it.id === focusedTileId) || all[0];
  }

  function getTileById(id) {
    for (const p of PAGES) {
      const it = p.items.find(x => x.id === id);
      if (it) return it;
    }
    return null;
  }

  // Index of the Style Level group at the top of the scroll view
  function currentGroup(grid, groups) {
    if (grid.scrollTop >= grid.scrollHeight - grid.clientHeight - 1) return groups.length - 1;
    let index = 0;
    groups.forEach((g, i) => { if (g.offsetTop - 24 <= grid.scrollTop) index = i; });
    return index;
  }

  function updateScrollbar() {
    const grid = api.$("#s-rewards .reward-grid");
    const track = api.$("#s-rewards .rw-scroll__track");
    if (!grid || !track) return;
    const groups = Array.from(grid.querySelectorAll(".reward-group"));
    if (track.children.length !== groups.length) {
      track.innerHTML = groups.map((_, i) => `<i class="rw-scroll__pill" data-group="${i}"></i>`).join("");
    }
    const index = currentGroup(grid, groups);
    Array.from(track.children).forEach((pill, i) => pill.classList.toggle("is-current", i === index));
    api.$("#s-rewards [data-scroll-dir='-1']").classList.toggle("is-off", grid.scrollTop <= 0);
    api.$("#s-rewards [data-scroll-dir='1']").classList.toggle("is-off", grid.scrollTop >= grid.scrollHeight - grid.clientHeight - 1);
  }

  function scrollToGroup(index) {
    const grid = api.$("#s-rewards .reward-grid");
    const group = grid?.querySelectorAll(".reward-group")[index];
    if (group) grid.scrollTo({ top: group.offsetTop - 12, behavior: "smooth" });
  }

  function renderPage() {
    const grid = api.$("#s-rewards .reward-grid");
    if (!grid) return;

    const all = getAllItems();
    let html = "";
    PAGES.forEach((page, level) => {
    html += `<section class="reward-group"><h3 class="reward-group__title">Style Level ${level + 1}</h3><div class="reward-group__grid">`;
    let smallCount = 0;   // layout: 1:1 cards fill columns 1-2, the 1:2 card takes column 3
    sortByRarity(page.items).forEach(it => {
      const column = isTallCard(it) ? 3 : (smallCount++ % 2) + 1;
      const isClaimed = claimedSet.has(it.id);
      html += window.MTX_UI.itemCard(it, {
        label: labelHtml(it),
        cls: `${isClaimed ? "is-claimed" : ""} ${lockLevel(it) ? "is-locked" : ""}`,
        style: `grid-column:${column}`,
        attrs: 'data-fn="claimReward"',
        badge: NEW_ITEMS.has(it.id) && !isClaimed && !lockLevel(it) ? "New" : ""
      });
    });
    html += "</div></section>";
    });
    grid.innerHTML = html;
    const first = grid.querySelector(".reward-tile");
    if (first) api.$("#s-rewards").dataset.first = first.dataset.id;

    renderClaimStats();
    if (!focusedTileId || !all.some(x => x.id === focusedTileId)) {
      focusedTileId = first.dataset.id;
    }
    renderDetail(focusedTileId);
    updateScrollbar();
  }

  // Placeholder demo data: R Level needed and new items (not specified yet)
  const REQ_R_LEVEL = { r2_0: 20, r2_4: 30 };
  const NEW_ITEMS = new Set(["r0_4", "r1_1"]);
  function lockLevel(it) {
    const need = REQ_R_LEVEL[it.id] || 0;
    const have = window.MTX_PLAYER?.get?.().r?.level ?? 0;
    return need > have && !claimedSet.has(it.id) ? need : 0;
  }

  // Figma MTX / Item Slot Label 573:65712: the bar shows what matters in this context
  const itemLabel = (type, value) => window.MTX_UI.itemLabel(type, value);

  // Rewards: claimed > coin amount > price (R first: the balance shown here) > name
  function labelHtml(it) {
    if (claimedSet.has(it.id)) return itemLabel("status", "Claimed");
    if (lockLevel(it)) return itemLabel("locked", `R LV ${lockLevel(it)}`);
    if (it.qty) return itemLabel("qty", `x${it.qty.toLocaleString("en-US")}`);
    const price = it.prices.find(p => p.type === "r") || it.prices.find(p => p.type === "cash");
    if (price) return itemLabel(price.type === "r" ? "r" : "money", price.val);
    return itemLabel("name", it.title);
  }

  // Sort inside a Style Level group: Normal to Legendary
  const RARITY_ORDER = Object.keys(window.MTX_ITEMS.RARITY);
  function sortByRarity(items) {
    return [...items].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  }

  const isTallCard = it => it.ratio === "1:2";

  function updateTileState(tileId) {
    const tileEl = api.$(`#s-rewards .reward-tile[data-id="${tileId}"]`);
    if (!tileEl) return;
    const isClaimed = claimedSet.has(tileId);
    tileEl.classList.toggle("is-claimed", isClaimed);
    const tile = getTileById(tileId);
    const label = tileEl.querySelector(".item-label");
    if (tile && label) label.outerHTML = labelHtml(tile);
    tileEl.querySelector(".reward-tile__new")?.remove();
  }

  function renderClaimStats() {
    let totalItems = 0;
    PAGES.forEach(p => totalItems += p.items.length);
    const claimedCount = claimedSet.size;
    const el = api.bind("claimedCount");
    if (el) el.textContent = `${claimedCount}/${totalItems} claimed`;
  }

  // Fighter skins preview on the 3D model; the Dev Tools 3D switch falls back to the 2D art
  function showSkinPreview(it) {
    const isSkin = /^fighter/.test(it.thumb);
    api.$("#s-rewards").classList.toggle("rewards--skin", isSkin);
    api.$("#s-rewards [data-char3d]")?.toggleAttribute("data-char3d-off", !isSkin);
    window.MTX_CHARACTER3D?.refresh?.();
  }

  function renderDetail(tileId) {
    const it = getTileById(tileId);
    if (!it) return;
    const isClaimed = claimedSet.has(it.id);

    const heroEl = api.bind("rewardHero");
    if (heroEl) heroEl.src = `mtx/assets/img/${it.hero}.webp`;
    showSkinPreview(it);

    const titleEl = api.bind("rewardTitle");
    if (titleEl) titleEl.textContent = it.title;

    const descEl = api.bind("rewardDesc");
    if (descEl) descEl.textContent = it.desc;

    const btn = api.bind("claimBtn");
    if (btn) {
      const locked = lockLevel(it);
      btn.classList.toggle("is-done", isClaimed);
      btn.classList.toggle("is-locked", !!locked);
      const label = btn.querySelector(".btn-cta__label");
      if (label) {
        label.textContent = isClaimed ? "Claimed" : locked ? "Locked" : "Claim";
      }
    }

  }

  function bindEvents() {
    const grid = api.$("#s-rewards .reward-grid");
    if (grid) {
      grid.addEventListener("scroll", updateScrollbar, { passive: true });
    }

    const scrollbar = api.$("#s-rewards .rewards__scroll");
    if (scrollbar) {
      scrollbar.addEventListener("click", e => {
        const grid = api.$("#s-rewards .reward-grid");
        const groups = Array.from(grid.querySelectorAll(".reward-group"));
        const pill = e.target.closest(".rw-scroll__pill");
        const btn = e.target.closest("[data-scroll-dir]");
        if (pill) scrollToGroup(+pill.dataset.group);
        else if (btn) scrollToGroup(currentGroup(grid, groups) + +btn.dataset.scrollDir);
      });
    }

    const claimBtn = api.bind("claimBtn");
    if (claimBtn) {
      claimBtn.addEventListener("mousedown", e => {
        if (e.button === 0) startClaimHold("mouse");
      });
      claimBtn.addEventListener("mouseup", () => cancelClaimHold(false));
      claimBtn.addEventListener("mouseleave", () => cancelClaimHold(false));
      claimBtn.addEventListener("touchstart", () => startClaimHold("touch"), { passive: true });
      claimBtn.addEventListener("touchend", () => cancelClaimHold(false));
    }

  }
  //#endregion

  window.MTX_SCREENS.rewards = {
    bindApi,
    init,
    enter,
    focus,
    setPage,
    nextPage,
    prevPage,
    startClaimHold,
    cancelClaimHold,
    finishClaimHold,
    isClaimHoldReady,
    isHoldingClaim,
    getCurrentPage,
    renderPage,
    actions: {
      claimReward() {
        if (isClaimHoldReady()) {
          const glyph = api.getGlyphs()[api.getDevice()]?.a || "A";
          api.toast(`Hold ${glyph} to claim reward`);
          api.rumble(60, 0.2);
          const btn = api.bind("claimBtn");
          if (btn) {
            btn.classList.add("is-holding");
            setTimeout(() => btn.classList.remove("is-holding"), 220);
          }
        } else if (lockLevel(getActiveTile() || {})) {
          api.toast(`Requires R Level ${lockLevel(getActiveTile())}`);
          api.rumble(60, 0.2);
        }
      },
      nextPage,
      prevPage
    }
  };
})();
