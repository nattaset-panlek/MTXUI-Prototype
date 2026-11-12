(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const IMG = "mtx/assets/img/";

  const DB = window.MTX_ITEMS;
  const UI = () => window.MTX_UI;

  // Item data lives in data/items.js; this is only what the Store sells and in which section.
  // An item listing both prices is bought with Cash.
  const RARITY_ORDER = Object.keys(DB.RARITY);   // inside a section: Normal to Legendary, same as Rewards
  const SECTIONS = [
    { title: "Featured", ids: ["seux_shorts", "lumpinee_arena"] },
    { title: "Gloves", ids: ["glove_mtx26", "glove_black", "glove_sakura", "glove_midnight", "glove_temple", "glove_shadow", "glove_golden", "glove_ironshin",
      "r0_0", "r0_1", "r1_1", "r2_1", "cc_glove_1", "cc_glove_2", "cc_glove_3", "cc_glove_4", "cc_glove_5", "cc_glove_6", "cc_glove_7", "cc_glove_8"] },
    { title: "Fighters & outfits", ids: ["outfit_seux", "outfit_gold", "outfit_camp", "outfit_ringside", "r0_2", "r1_0", "r2_2", "fighter_kru", "fighter_naga", "fighter_samart"] },
    { title: "Tattoos & skins", ids: ["r0_4", "r2_0", "tattoo_skull"] },
    { title: "R Shop", ids: ["emote_waikhru", "emote_rammuay", "emote_victory", "cos_vinyl", "cos_avatar_1", "cos_avatar_2", "cos_badge_sorcerer", "cos_badge_beast", "cos_belt_1", "stage_mtx"] },
    { title: "Arena & VFX", ids: ["r1_2", "r1_4", "r2_4"] },
    { title: "Packs & bundles", ids: ["pack_legend", "pack_rookie", "bundle_season", "pack_gloves", "pack_ink", "pack_emote", "bundle_champion"] },
    { title: "Currency & tickets", ids: ["cash_pack", "r0_3", "r1_3", "r2_3", "ticket_1", "ticket_5"] }
  ].map(s => ({ ...s, items: s.ids.map(id => DB.get(id)).sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)) }));
  const ITEMS = SECTIONS.flatMap(s => s.items);
  const isPack = it => !!it?.contents;
  const cashOf = it => DB.price(it, "cash")?.val || 0;
  const rOf = it => DB.price(it, "r")?.val || 0;
  let packId = null;      // pack shown on the Pack page

  const P = () => window.MTX_PLAYER;
  let cash = 19523;   // mirror of the player's cash (MTX_PLAYER owns it)
  let rPoints = 1500;
  let owned = new Set();
  let stacks = {};        // consumables bought: id -> count
  const timerStart = Date.now();
  let timerTick = null;
  //#endregion

  //#region [Helpers]
  const fmt = n => n.toLocaleString("en-US");
  const fmtTimer = s => {
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const timeLeft = it => Math.max(0, it.timer - (Date.now() - timerStart) / 1000);

  // Claimed in Rewards also counts as owned (consumables are never owned)
  function isOwned(it) {
    if (it.grantsCash || it.stack) return false;
    return owned.has(it.id) || (api.store.get("rewards_claimed", "") || "").split(",").includes(it.id);
  }

  function priceChips(it) {
    if (isOwned(it)) return `<span class="st-chip st-chip--owned">Owned</span>`;
    return it.prices.map(p => p.type === "r"
      ? `<span class="st-chip st-chip--r"><b>R</b>${fmt(p.val)}</span>`
      : `<span class="st-chip"><i class="st-chip__cash"></i>${fmt(p.val)}</span>`).join("");
  }

  function storeLabel(it) {
    return isOwned(it) ? UI().itemLabel("status", "Owned") : UI().itemPriceLabel(it, ["cash", "r"]);
  }

  function cardHtml(it) {
    const timer = it.timer ? `<span class="item-card__timer" data-timer="${it.id}"><img src="mtx/assets/svg/icon-clock.svg" alt="">${fmtTimer(timeLeft(it))}</span>` : "";
    return UI().itemCard(it, {
      label: storeLabel(it) + timer,
      cls: isOwned(it) ? "is-claimed" : "",
      attrs: isPack(it) ? 'data-fn="openPack"' : "",
      badge: it.isNew && !it.timer && !isOwned(it) ? "New" : ""
    });
  }

  // Right side: same preview as Rewards
  function renderDetail(it) {
    if (!it) return;
    const isSkin = /^fighter/.test(it.img);
    api.$("#s-store").classList.toggle("rewards--skin", isSkin);
    api.$("#s-store [data-char3d]")?.toggleAttribute("data-char3d-off", !isSkin);
    window.MTX_CHARACTER3D?.refresh?.();
    const hero = api.bind("storeHero");
    hero.src = DB.src(it.hero);
    hero.dataset.ratio = it.ratio;
    api.bind("storeName").textContent = it.name;
    api.bind("storeType").textContent = `${DB.RARITY[it.rarity].label} ${it.type}`;
    api.bind("storeDesc").textContent = it.desc || "";
    const stack = it.stack ? `<span class="st-detail__stack">Owned ${stacks[it.id] || 0} / ${it.stack}</span>` : "";
    api.bind("storePrice").innerHTML = priceChips(it) + stack;
  }
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    cash = P() ? P().get().cash : cash;
    P()?.on(s => { cash = s.cash; renderWallet(); });
    rPoints = +api.store.get("store_r", rPoints) || rPoints;
    try { owned = new Set(JSON.parse(api.store.get("store_owned", "[]"))); } catch (e) { owned = new Set(); }
    try { stacks = JSON.parse(api.store.get("store_stacks", "{}")) || {}; } catch (e) { stacks = {}; }
    render();
    renderWallet();
    bindScroller();
    const host = api.bind("storeList");
    host?.addEventListener("click", e => {
      const card = e.target.closest(".item-card");
      if (!card || isPack(DB.get(card.dataset.id))) return;
      api.setFocus(card);
      startHold(card);
    });
  }

  // ---- Pack page ----
  function renderPack() {
    const item = DB.get(packId);
    if (!isPack(item)) return;
    api.bind("packTitle").textContent = item.name;
    api.bind("packDesc").textContent = item.desc || "";
    const tiles = api.bind("packItems");
    tiles.classList.toggle("is-many", item.contents.length > 3);   // 4+ items: smaller tiles, 4 per row
    tiles.innerHTML = item.contents.map((c, i) => UI().itemCard({ ...DB.get(c.id), id: `pk${i}`, ratio: "1:1", isNew: false }, {
      label: UI().itemLabel("name", DB.get(c.id).name), cls: "pk-card", attrs: `data-index="${i}"`
    })).join("");
    api.bind("packPrice").innerHTML = `<span class="pk-price__label">Pack price</span>${priceChips(item)}`;
    const buy = api.bind("packBuy");
    buy.classList.toggle("is-done", isOwned(item));
    buy.querySelector(".btn-cta__label").textContent = isOwned(item) ? "Owned" : "Buy";
    showPackItem(0);
  }

  function showPackItem(i) {
    const c = DB.get(DB.get(packId)?.contents[i]?.id);
    if (!c) return;
    const img = api.bind("packPreview");
    img.src = DB.src(c.img);
    img.alt = c.name;
    api.bind("packPreviewName").textContent = c.name;
  }

  const packScreen = {
    bindApi() {},
    init() {},
    enter() { renderPack(); },
    focus(el) { if (el?.classList.contains("pk-card")) showPackItem(+el.dataset.index); }
  };

  function enter() {
    render();
    renderWallet();
    clearInterval(timerTick);
    timerTick = setInterval(tickTimers, 1000);
  }

  function render() {
    const host = api.bind("storeList");
    if (!host) return;
    host.innerHTML = SECTIONS.map(sec =>
      `<section class="st-section"><h2 class="st-section__title">${sec.title}<span>${sec.items.length} items</span></h2>` +
      `<div class="st-grid">${sec.items.map(it => cardHtml(it)).join("")}</div></section>`).join("");
    host.dataset.y = 0;
    host.style.transform = "translateY(0)";
    updateScroller();
  }

  // Scrollbar: shared .scrollbar look (MTX / Scrollbar). The list scrolls by transform, so the thumb is synced here.
  function scrollState() {
    const list = api.bind("storeList");
    const y = -(parseFloat(list.dataset.y) || 0);
    const max = Math.max(0, list.offsetHeight - list.parentElement.clientHeight);
    return { list, y, max };
  }

  function updateScroller() {
    const bar = api.bind("storeScroll"), thumb = api.bind("storeThumb");
    if (!bar || !thumb || !api.bind("storeList")) return;
    const { list, y, max } = scrollState();
    bar.hidden = max <= 1;
    if (bar.hidden) return;
    const track = bar.clientHeight, view = list.parentElement.clientHeight;
    const h = Math.max(48, Math.round(track * view / list.offsetHeight));
    thumb.style.height = h + "px";
    thumb.style.top = Math.round(y / max * (track - h)) + "px";
  }

  function bindScroller() {
    api.$("#s-store .st-view")?.addEventListener("wheel", e => {
      e.preventDefault();
      const { list, y, max } = scrollState();
      const next = Math.max(0, Math.min(max, y + e.deltaY));
      list.dataset.y = -next;
      list.style.transform = `translateY(${-next}px)`;
      updateScroller();
    }, { passive: false });
  }

  function tickTimers() {
    if (api.getCur() !== "store") { clearInterval(timerTick); return; }
    api.$$("#s-store [data-timer]").forEach(el => {
      const it = ITEMS.find(i => i.id === el.dataset.timer);
      if (it) el.lastChild.textContent = fmtTimer(timeLeft(it));
    });
  }

  // Cash shows in every player HUD wallet; R points only on the store header.
  function renderWallet() {
    api.$$("[data-pl-cash]").forEach(el => { el.textContent = fmt(cash); });
    api.$$("[data-store-r]").forEach(el => { el.textContent = fmt(rPoints); });
    api.$$("[data-store-owned]").forEach(el => { el.textContent = `${ITEMS.filter(isOwned).length} / ${ITEMS.filter(i => !i.grantsCash && !i.stack).length}`; });
  }

  // Keep the focused card inside the scroll viewport (header rows stay visible above the first row).
  function focus(el) {
    if (!el || !el.classList.contains("item-card")) return;
    renderDetail(DB.get(el.dataset.id));
    const list = api.bind("storeList"), view = list?.parentElement;
    if (!list || !view) return;
    // .st-list is the offset parent; a card in a section's first row also brings its section title into view
    const sec = el.closest(".st-section");
    const firstRow = sec && el.offsetTop - sec.offsetTop < 90;
    const top = firstRow ? sec.offsetTop : el.offsetTop - 24;
    const bottom = el.offsetTop + el.offsetHeight + 24;
    const cur = -(parseFloat(list.dataset.y) || 0), h = view.clientHeight;
    let y = cur;
    if (top < cur) y = Math.max(0, top);
    else if (bottom > cur + h) y = bottom - h;
    list.dataset.y = -y;
    list.style.transform = `translateY(${-y}px)`;
    updateScroller();
  }

  // ---- buy: A / Space / click opens a modal to choose ----
  function focusedItem() {
    const el = api.getFocused();
    return el && el.classList.contains("item-card") ? [el, ITEMS.find(i => i.id === el.dataset.id)] : [null, null];
  }

  function canHold() {
    if (api.getCur() === "pack") return !!packId;
    const item = api.getCur() === "store" && focusedItem()[1];
    return !!item && !isPack(item);
  }

  // app.js calls this on A (name shared with the hold screens)
  function startHold(card) {
    if (window.MTX_UI.dialog.isOpen()) return false;
    const onPack = api.getCur() === "pack";
    const [el, item] = onPack ? [api.bind("packBuy"), DB.get(packId)]
      : card ? [card, DB.get(card.dataset.id)] : focusedItem();
    if (!el || !item) return false;
    if (isOwned(item)) { api.toast(`${item.name} already owned`); return false; }
    if (item.stack && (stacks[item.id] || 0) >= item.stack) { api.toast(`${item.name} stack is full`); return false; }
    openBuy(item, el);
    return true;
  }

  const priceBtn = (type, val) => ({ html: `<span class="dlg-price"><img src="mtx/assets/svg/${type === "r" ? "icon-rpoint" : "icon-money"}.svg" alt="${type === "r" ? "R Point" : "Money"}"><span>${fmt(val)}</span></span>` });

  // Two prices: choose the currency. One price: Buy or Cancel.
  function openBuy(item, el) {
    const c = cashOf(item), r = rOf(item);
    const body = `${DB.RARITY[item.rarity].label} ${item.type}`;
    if (c && r) {
      window.MTX_UI.dialog.open({
        title: `Buy ${item.name}?`, body,
        primary: priceBtn("cash", c), secondary: priceBtn("r", r), secondaryKey: "x", closeHint: "Cancel",
        onPrimary: () => buy(item, el, true),
        onSecondary: () => buy(item, el, false)
      });
      return;
    }
    window.MTX_UI.dialog.open({
      title: `Buy ${item.name}?`, body,
      primary: priceBtn(c ? "cash" : "r", c || r), secondary: "Cancel",
      onPrimary: () => buy(item, el, !!c)
    });
  }

  function cancelHold() {}

  function buy(item, card, useCash) {
    if (P()) cash = P().get().cash;
    const price = useCash ? cashOf(item) : rOf(item);
    const balance = useCash ? cash : rPoints;
    if (price > balance) {
      api.toast(`Not enough ${useCash ? "Cash" : "R points"}, need ${fmt(price - balance)} more`);
      api.rumble(120, 0.5);
      return;
    }
    if (useCash) cash -= price; else rPoints -= price;
    if (item.grantsCash) cash += item.grantsCash;
    else if (item.stack) stacks[item.id] = Math.min(item.stack, (stacks[item.id] || 0) + (item.qty || 1));
    else owned.add(item.id);
    if (isPack(item)) cash += item.contents.reduce((sum, c) => sum + (DB.get(c.id)?.grantsCash || 0), 0);
    P()?.set({ cash });
    api.store.set("store_r", rPoints);
    api.store.set("store_owned", JSON.stringify([...owned]));
    api.store.set("store_stacks", JSON.stringify(stacks));
    renderWallet();
    if (isOwned(item) && card.classList.contains("item-card")) {
      card.classList.add("is-claimed");
      card.querySelector(".item-label").outerHTML = storeLabel(item);
      card.querySelector(".reward-tile__new")?.remove();
    }
    if (api.getCur() === "store") renderDetail(item);
    if (isPack(item)) renderPack();
    card.classList.add("is-bought");
    setTimeout(() => card.classList.remove("is-bought"), 500);
    api.rumble(150, 0.6);
    api.toast(item.grantsCash
      ? `+${fmt(item.grantsCash)} Cash added`
      : `Bought ${item.name} for ${fmt(price)} ${useCash ? "Cash" : "R"}`);
    api.log(`Store: bought ${item.name} for ${fmt(price)} ${useCash ? "Cash" : "R"}`, "action");
  }

  function resetStore() {
    cash = P()?.DEFAULTS.cash ?? 19523;
    rPoints = 1500;
    owned = new Set();
    stacks = {};
    P()?.set({ cash });
    api.store.set("store_r", rPoints);
    api.store.set("store_owned", "[]");
    api.store.set("store_stacks", "{}");
    render();
    renderWallet();
  }
  //#endregion

  window.MTX_SCREENS.store = {
    bindApi,
    init,
    enter,
    focus,
    canHold,
    startHold,
    cancelHold,
    resetStore,
    actions: {
      openPack(el) {
        const id = (el || api.getFocused())?.dataset.id;
        if (!isPack(DB.get(id))) return;
        packId = id;
        api.rumble(60, 0.25);
        api.show("pack");
      }
    }
  };
  window.MTX_SCREENS.pack = packScreen;
})();
