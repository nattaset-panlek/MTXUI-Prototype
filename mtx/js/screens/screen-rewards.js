(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  let currentPage = 0;
  let focusedTileId = null;
  // Rewards are bought with R points (same confirm modal as the Shop, screen-store.js); no Claim / hold any more.
  // claimedSet = owned rewards (saved as "rewards_claimed": the Shop also reads it as owned).

  // Item data lives in data/items.js; the Style Level lists depend on the style picked on the Tactical screen
  // (MTX_ITEMS.rewardIds(style)); "mtx:style" rebuilds them.
  const PAGE_INFO = [
    { pageName: "Page 1", subtitle: "MTX Genesis 2026" },
    { pageName: "Page 2", subtitle: "Muay Thai Warriors" },
    { pageName: "Page 3", subtitle: "Apex Legends" }
  ];
  const styleId = () => window.MTX_SCREENS?.tactical?.getSelStyle?.() || (() => { try { return localStorage.getItem("mtx.style"); } catch (e) { return null; } })() || "phranakhon";
  let pagesStyle = null;
  let PAGES = [];
  function buildPages() {
    pagesStyle = styleId();
    PAGES = window.MTX_ITEMS.rewardIds(pagesStyle).map((ids, i) => ({ ...PAGE_INFO[i], ids, items: ids.map(id => {
      const it = window.MTX_ITEMS.get(id);
      return { ...it, title: it.name, thumb: it.img };
    }) }));
  }
  buildPages();
  let claimedSet = new Set(["r0_3"]);
  //#endregion

  //#region [Properties]
  // app.js asks these on A: no hold here, A runs the focused element's buyReward action instead
  function isClaimHoldReady() {
    return false;
  }

  function isHoldingClaim() {
    return false;
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
    loadState();
    renderPage();
    bindEvents();
  }

  function enter() {
    if (pagesStyle !== styleId()) { buildPages(); focusedTileId = null; }
    renderPage();
    renderWallet();
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

  // ---- buy with R points: A / Space / click opens the Shop's confirm modal (MTX_UI.dialog) ----
  // same balance the Shop spends ("store_r", screen-store.js)
  const rBalance = () => +api.store.get("store_r", 1500) || 0;
  const fmt = n => n.toLocaleString("en-US");
  // R price; rewards with only a Cash price use that number as R (placeholder until the data has R prices)
  const rPrice = it => (it.prices.find(p => p.type === "r") || it.prices.find(p => p.type === "cash") || { val: 0 }).val;
  const priceBtn = val => ({ html: `<span class="dlg-price"><b class="dlg-price__r" aria-label="R Point">R</b><span>${fmt(val)}</span></span>` });   // R currency = letter R (Modi)

  function openBuy() {
    if (window.MTX_UI.dialog.isOpen()) return false;
    const it = getActiveTile();
    if (!it) return false;
    if (claimedSet.has(it.id)) { api.toast(`${it.title} already unlocked`); return false; }
    if (lockLevel(it)) { api.toast(`Requires R Level ${lockLevel(it)}`); api.rumble(60, 0.2); return false; }
    window.MTX_UI.dialog.open({
      title: `Unlock ${it.title}?`, body: `${window.MTX_ITEMS.RARITY[it.rarity]?.label || ""} ${it.type}`,
      primary: priceBtn(rPrice(it)), secondary: "Cancel",
      onPrimary: () => buy(it.id)
    });
    return true;
  }

  function buy(tileId) {
    const it = getTileById(tileId), price = rPrice(it), have = rBalance();
    if (price > have) {
      api.toast(`Not enough R points, need ${fmt(price - have)} more`);
      api.rumble(120, 0.5);
      return;
    }
    api.store.set("store_r", have - price);
    if (it.grantsCash && window.MTX_PLAYER) window.MTX_PLAYER.set({ cash: window.MTX_PLAYER.get().cash + it.grantsCash });
    claimedSet.add(tileId);
    saveState();
    updateTileState(tileId);
    renderDetail(tileId);
    renderClaimStats();
    renderWallet();
    const tileEl = api.$(`#s-rewards .reward-tile[data-id="${tileId}"]`);
    tileEl?.classList.add("is-bought");
    setTimeout(() => tileEl?.classList.remove("is-bought"), 500);
    api.rumble(150, 0.6);
    api.toast(`Unlocked ${it.title} for ${fmt(price)} R`);
    api.log(`Rewards: bought ${it.title} for ${fmt(price)} R`, "action");
  }

  function renderWallet() {
    api.$$("[data-store-r]").forEach(el => { el.textContent = fmt(rBalance()); });
  }

  // kept for app.js (it calls these on A / release); the buy modal replaced the hold
  function startClaimHold() { return openBuy(); }
  function cancelClaimHold() {}
  //#endregion

  //#region [Private Methods]
  function loadState() {
    currentPage = +api.store.get("rewards_page", "0") || 0;
    if (currentPage >= PAGES.length || currentPage < 0) currentPage = 0;
    // Figma 980:96284: Style Level 1 starts 4/5 unlocked (one time, older saves too)
    if (!api.store.get("rewards_fig1", "")) { api.store.set("rewards_claimed", "r0_0,r0_2,r0_3,r0_4"); api.store.set("rewards_fig1", "1"); }
    const savedClaimed = api.store.get("rewards_claimed", "r0_0,r0_2,r0_3,r0_4");
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

  // Scrollbar: shared .scrollbar look (MTX / Scrollbar), right of the grid
  // Figma store layout (980:96292): the bar is fixed at y214, 751 high (shorter than the list), thumb scaled to it
  const BAR = { top: 214, height: 751, min: 48 };
  function updateScrollbar() {
    const grid = api.$("#s-rewards .reward-grid"), bar = api.bind("rewardsScroll"), thumb = api.bind("rewardsThumb");
    window.MTX_UI.syncScrollbar(grid, bar, { thumb });
    if (!grid || !bar || bar.hidden) return;
    const over = grid.scrollHeight - grid.clientHeight, h = Math.max(BAR.min, Math.round(BAR.height * grid.clientHeight / grid.scrollHeight));
    bar.style.top = BAR.top + "px";
    bar.style.height = BAR.height + "px";
    thumb.style.height = h + "px";
    thumb.style.top = Math.round(grid.scrollTop / over * (BAR.height - h)) + "px";
  }

  function renderPage() {
    const grid = api.$("#s-rewards .reward-grid");
    if (!grid) return;

    const all = getAllItems();
    let html = "";
    PAGES.forEach((page, level) => {
    const got = page.items.filter(it => claimedSet.has(it.id)).length;
    html += `<section class="reward-group"><h3 class="reward-group__title">Style Level ${level + 1}<span class="reward-group__count" data-level="${level}">${got}/${page.items.length} Unlocked</span></h3><div class="reward-group__grid">`;
    let smallCount = 0;   // layout: 1:1 cards fill columns 1-2, the 1:2 card takes column 3
    sortByRarity(page.items).forEach(it => {
      const column = isTallCard(it) ? 3 : (smallCount++ % 2) + 1;
      const isClaimed = claimedSet.has(it.id);
      html += window.MTX_UI.itemCard(it, {
        label: labelHtml(it),
        cls: `${isClaimed ? "is-claimed" : ""} ${lockLevel(it) ? "is-locked" : ""}`,
        style: `grid-column:${column}`,
        attrs: 'data-fn="buyReward"',
        badge: ""
      });
    });
    html += "</div></section>";
    });
    grid.innerHTML = html;
    const first = grid.querySelector(".reward-tile");
    const hi = PAGES[1]?.items.find(isTallCard);   // Figma highlight: the 1:2 card of Style Level 2
    if (first) api.$("#s-rewards").dataset.first = hi ? hi.id : first.dataset.id;

    renderClaimStats();
    if (!focusedTileId || !all.some(x => x.id === focusedTileId)) {
      focusedTileId = api.$("#s-rewards").dataset.first;
    }
    renderDetail(focusedTileId);
    updateScrollbar();
  }

  // Placeholder demo data: R Level needed and new items (not specified yet)
  const REQ_R_LEVEL = { r2_0: 20, r2_4: 30 };
  const NEW_ITEMS = new Set(["r0_4", "r1_1"]);
  function lockLevel(it) {
    const need = it.reqR || REQ_R_LEVEL[it.id] || 0;
    const have = window.MTX_PLAYER?.get?.().r?.level ?? 0;
    return need > have && !claimedSet.has(it.id) ? need : 0;
  }

  // Figma MTX / Item Slot Label 573:65712: the bar shows what matters in this context
  const itemLabel = (type, value) => window.MTX_UI.itemLabel(type, value);

  // Rewards: owned > locked (R Level) > R price
  function labelHtml(it) {
    if (claimedSet.has(it.id)) return itemLabel("status", "Unlocked");
    if (lockLevel(it)) return itemLabel("locked", `R LV ${lockLevel(it)}`);
    return itemLabel("r", fmt(rPrice(it)));
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
    const label = tileEl.querySelector(".item-label, .item-state");
    if (tile && label) label.outerHTML = labelHtml(tile);
    tileEl.querySelector(".reward-tile__new")?.remove();
  }

  function renderClaimStats() {
    let totalItems = 0;
    PAGES.forEach(p => totalItems += p.items.length);
    const claimedCount = claimedSet.size;
    const el = api.bind("claimedCount");
    if (el) el.textContent = `${claimedCount}/${totalItems} unlocked`;
    PAGES.forEach((p, i) => {   // Style Level header: n/5 Unlocked
      const c = api.$(`#s-rewards .reward-group__count[data-level="${i}"]`);
      if (c) c.textContent = `${p.items.filter(it => claimedSet.has(it.id)).length}/${p.items.length} Unlocked`;
    });
  }

  // Skins and people (fighter / char art): preview = the Figma Fighter Model art (980:96293, user 2026-11-26), not the 3D model
  const isPersonArt = it => it.person || /^(fighter|char)/.test(it.thumb);
  function showSkinPreview(it) {
    api.$("#s-rewards").classList.toggle("rewards--skin", isPersonArt(it));
  }

  function renderDetail(tileId) {
    const it = getTileById(tileId);
    if (!it) return;
    const isClaimed = claimedSet.has(it.id);

    const heroEl = api.bind("rewardHero");
    if (heroEl) heroEl.src = `mtx/assets/img/${isPersonArt(it) ? "fighter-model" : it.hero}.webp`;
    showSkinPreview(it);

    const titleEl = api.bind("rewardTitle");
    if (titleEl) titleEl.textContent = it.title;

    const rar = window.MTX_ITEMS.RARITY[it.rarity];
    const rarEl = api.bind("rewardRarity");
    if (rarEl) { rarEl.innerHTML = `<b>${rar?.label || ""}</b>`; rarEl.style.setProperty("--rw-rar", rar?.color || "#9a9ea8"); rarEl.classList.toggle("is-light", ["normal", "standard", "legendary"].includes(it.rarity)); }
    const typeEl = api.bind("rewardType");
    if (typeEl) typeEl.textContent = it.type || "";

    const descEl = api.bind("rewardDesc");
    if (descEl) descEl.textContent = it.desc;

    const btn = api.bind("claimBtn");
    if (btn) {
      const locked = lockLevel(it);
      btn.classList.toggle("is-done", isClaimed);
      btn.classList.toggle("is-locked", !!locked);
      const label = btn.querySelector(".btn-cta__label");
      if (label) {
        label.textContent = isClaimed ? "Unlocked" : locked ? "Locked" : "Unlock";
      }
    }

  }

  function bindEvents() {
    const grid = api.$("#s-rewards .reward-grid");
    if (grid) {
      grid.addEventListener("scroll", updateScrollbar, { passive: true });
    }
    // Store | Rewards | MTX Points tabs (Figma lb-tabs 980:96425); MTX Points has no screen yet
    // tab hub lives in screen-store.js (Store and MTX Points are one screen)
    document.querySelectorAll("#s-rewards [data-rw-tab]").forEach(t => t.addEventListener("click", () => window.MTX_STORE_TABS?.go(t.dataset.rwTab)));
    // Tactical style changed: other Style Level rewards (screen re-renders now if it is open, else on enter)
    document.addEventListener("mtx:style", () => {
      if (pagesStyle === styleId()) return;
      buildPages();
      focusedTileId = null;
      renderPage();
    });


  }
  //#endregion

  // Q / E (LT / RT): Store | Rewards | MTX Points tabs
  function onInput(a) {
    if (a !== "lt" && a !== "rt") return false;
    window.MTX_STORE_TABS?.step("rewards", a === "lt" ? -1 : 1);
    return true;
  }

  window.MTX_SCREENS.rewards = {
    bindApi,
    onInput,
    init,
    enter,
    focus,
    setPage,
    nextPage,
    prevPage,
    startClaimHold,
    cancelClaimHold,
    openBuy,
    isClaimHoldReady,
    isHoldingClaim,
    getCurrentPage,
    renderPage,
    actions: {
      buyReward() { openBuy(); },
      claimReward() { openBuy(); },   // old name, still on the CTA markup of older bakes
      nextPage,
      prevPage
    }
  };
})();
