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
  // Figma 980:96431 sample (the items drawn in the frame); not shown: the Store lists the data below (user 2026-11-26)
  const SECTIONS_FIGMA = [
    { title: "Featured", ids: ["seux_shorts", "lumpinee_arena", "outfit_seux"] },
    { title: "Gloves", count: "20 items", ids: ["glove_temple", "glove_shadow", "glove_mtx26", "glove_sakura", "glove_golden", "glove_ivory"] },
    { title: "Fighters & outfits", count: "10 items", ids: ["fighter_samart", "fighter_kru", "fighter_naga"] },
    { title: "R Shop", count: "10 items", ids: ["cos_avatar_1", "emote_victory", "cos_vinyl", "cos_badge_beast", "cos_badge_sorcerer", "cos_belt_1"] }
  ].map(s => ({ ...s, items: s.ids.map(id => DB.get(id)).sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)) }));
  // what the Store sells, from data/items.js; header count = items in the section
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
  // MTX Points tab (Figma 980:96561): same screen, other list + preview (mode "points")
  const POINTS = [
    { title: "MTX Points", count: "Pay with platform", ids: ["pts_500", "pts_1100", "pts_2400", "pts_5000", "pts_10500", "pts_21000"] },
    { title: "Limited offers", ids: ["pts_first", "pts_weekly", "pts_champion", "pts_season", "pts_tickets"] }
  ].map(s => ({ ...s, items: s.ids.map(id => DB.get(id)) }));
  // Rewards tab: the Style Level lists of the style picked on the Tactical screen (MTX_ITEMS.rewardIds), rebuilt on "mtx:style".
  // Bought with R points; claimed set = "rewards_claimed" (also counts as owned in the Store).
  const styleId = () => window.MTX_SCREENS?.tactical?.getSelStyle?.() || (() => { try { return localStorage.getItem("mtx.style"); } catch (e) { return null; } })() || "phranakhon";
  const byRarity = items => [...items].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  const rewardSections = () => DB.rewardIds(styleId()).map((ids, i) => ({ title: `Style Level ${i + 1}`, rewards: true, items: byRarity(ids.map(id => DB.get(id))) }));

  // The one Store: three groups, one per tab (user 2026-11-26)
  const STORE = {
    store: SECTIONS,
    get rewards() { return rewardSections(); },
    points: POINTS
  };
  const firstOf = m => m === "points" ? "pts_5000"   // Figma highlight
    : m === "rewards" ? (STORE.rewards[1]?.items.find(i => i.ratio === "1:2") || STORE.rewards[0].items[0]).id   // Figma highlight: Style Level 2, 1:2
    : SECTIONS[0].items[0].id;
  let mode = "store", pendingMode = null;
  const curSections = () => STORE[mode];
  const ITEMS = [...SECTIONS, ...POINTS].flatMap(s => s.items);
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

  const claimedSet = () => new Set((api.store.get("rewards_claimed", "") || "").split(",").filter(Boolean));
  const REQ_R_LEVEL = { r2_0: 20, r2_4: 30 };   // placeholder: R Level needed
  function lockLevel(it) {
    const need = it.reqR || REQ_R_LEVEL[it.id] || 0;
    const have = P()?.get?.().r?.level ?? 0;
    return need > have && !claimedSet().has(it.id) ? need : 0;
  }
  // R price; rewards with only a Cash price use that number as R (placeholder until the data has R prices)
  const rewardPrice = it => (it.prices.find(p => p.type === "r") || it.prices.find(p => p.type === "cash") || { val: 0 }).val;
  function rewardLabel(it) {
    if (claimedSet().has(it.id)) return UI().itemLabel("status", "Unlocked");
    if (lockLevel(it)) return UI().itemLabel("locked", `R LV ${lockLevel(it)}`);
    return UI().itemLabel("r", fmt(rewardPrice(it)));
  }

  // Claimed in Rewards also counts as owned (consumables are never owned)
  function isOwned(it) {
    if (it.owned) return true;
    if (it.grantsCash || it.stack) return false;
    return owned.has(it.id) || (api.store.get("rewards_claimed", "") || "").split(",").includes(it.id);
  }

  function priceChips(it) {
    if (isOwned(it)) return `<span class="st-chip st-chip--owned">Owned</span>`;
    return it.prices.map(p => p.type === "r"
      ? `<span class="st-chip st-chip--r"><b>R</b>${fmt(p.val)}</span>`
      : `<span class="st-chip"><i class="st-chip__cash"></i>${fmt(p.val)}</span>`).join("");
  }

  const fmtUsd = v => `$${v.toFixed(2)}`;
  function storeLabel(it) {
    if (it.usd) return isOwned(it) ? UI().itemLabel("status", "Owned") : UI().itemLabel("qty", fmtUsd(it.usd));
    return isOwned(it) ? UI().itemLabel("status", "Owned") : UI().itemPriceLabel(it, ["cash", "r"]);
  }

  function rewardCardHtml(it, col) {
    const claimed = claimedSet().has(it.id);
    return UI().itemCard(it, {
      label: rewardLabel(it),
      cls: `${claimed ? "is-claimed" : ""} ${lockLevel(it) ? "is-locked" : ""}`,
      style: `grid-column:${col}`,
      badge: ""
    });
  }

  function cardHtml(it) {
    const timer = false ? `<span class="item-card__timer" data-timer="${it.id}"><img src="mtx/assets/svg/icon-clock.svg" alt=""><b>${fmtTimer(timeLeft(it))}</b></span>` : "";
    const name = it.ratio === "2:1" ? `<span class="item-card__name">${it.name}</span>` : "";
    const pts = it.usd && it.grantsCash && /^[0-9]/.test(it.name) ? `<span class="item-card__amount">${fmt(it.grantsCash)}</span>` : "";
    const bonus = it.bonus ? `<span class="item-card__bonus"><b>${it.bonus}</b></span>` : "";
    return UI().itemCard(it, {
      label: storeLabel(it) + timer + name,   // Figma MTX Points card: coin art + $ chip only
      cls: isOwned(it) ? "is-claimed" : "",
      attrs: isPack(it) ? 'data-fn="openPack"' : "",
      badge: ""
    });
  }

  // Right side: same preview as Rewards
  function renderDetail(it) {
    if (!it) return;
    const isSkin = it.person || /^(fighter|char)/.test(it.img);
    api.$("#s-store").classList.toggle("rewards--skin", isSkin);
    const hero = api.bind("storeHero");
    hero.src = isSkin ? DB.src("fighter-model") : it.usd && it.grantsCash ? DB.src("coins-big") : DB.src(it.hero);
    api.$("#s-store").classList.toggle("store--points", mode === "points");
    const rarEl = api.bind("storeRarity");
    if (rarEl) {
      rarEl.innerHTML = `<b>${it.tag || DB.RARITY[it.rarity].label}</b>`;
      rarEl.style.setProperty("--rw-rar", it.tag ? "#f6df2f" : DB.RARITY[it.rarity].color);
      rarEl.classList.toggle("is-tag", !!it.tag);
      rarEl.classList.toggle("is-light", !!it.tag || ["normal", "standard", "legendary"].includes(it.rarity));   // light chip: black text (user 2026-11-26)
    }
    const kindEl = api.bind("storeKind");
    if (kindEl) kindEl.textContent = it.type || "";
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
    document.querySelectorAll("#s-store [data-rw-tab]").forEach(t => t.addEventListener("click", () => goTab(t.dataset.rwTab)));
    document.addEventListener("mtx:style", () => {   // Tactical style changed: other Rewards lists
      if (mode !== "rewards" || api.getCur() !== "store") return;
      applyMode("rewards");
      render();
      const first = api.$(`#s-store .item-card[data-id="${firstOf("rewards")}"]`);
      if (first) { api.setFocus(first); focus(first); }
    });
    const host = api.bind("storeList");
    host?.addEventListener("click", e => {
      const card = e.target.closest(".item-card");
      if (!card || isPack(DB.get(card.dataset.id))) return;
      api.setFocus(card);
      startHold(card);
    });
  }

  // ---- tabs: Store | Rewards | MTX Points (Figma lb-tabs). Store and MTX Points are this screen in two modes. ----
  const TABS = ["store", "rewards", "points"];
  function applyMode(m) {
    mode = m;
    const scr = api.$("#s-store");
    scr.dataset.first = firstOf(m);
    scr.classList.toggle("store--rewards", m === "rewards");
    scr.classList.toggle("store--points", m === "points");
    scr.querySelectorAll("[data-rw-tab]").forEach(t => {
      const on = t.dataset.rwTab === m;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
    const lbl = [...scr.querySelectorAll(".hint-bar *")].find(n => !n.children.length && /^(Buy|Purchase|Unlock)$/.test(n.textContent.trim()));
    if (lbl) lbl.textContent = m === "points" ? "Purchase" : m === "rewards" ? "Unlock" : "Buy";
  }
  function setMode(m) {   // switch tab while the Store is open
    if (m === mode) return;
    applyMode(m);
    render();
    const first = api.$(`#s-store .item-card[data-id="${firstOf(m)}"]`);
    if (first) { api.setFocus(first); focus(first); }
    api.rumble(50, 0.2);
  }
  // tab change = instant screen swap, no enter / leave motion (user 2026-11-26); same switch the video wipe uses
  function instant(fn) {
    const m = window.MTX_UI?.motion, was = m?.enabled;
    if (m) m.enabled = false;
    try { fn(); } finally { if (m) m.enabled = was; }
  }
  function goTab(tab) {
    if (api.getCur() === "store") setMode(tab);
    else { pendingMode = tab; instant(() => window.MTX?.show?.("store", false)); }
  }
  // Q / E (LT / RT): previous / next tab, wraps
  const stepTab = (from, dir) => goTab(TABS[(TABS.indexOf(from) + dir + TABS.length) % TABS.length]);
  // pend(tab): the next time the Store opens it shows that tab (app.js maps show("rewards") to the Store's Rewards tab)
  window.MTX_STORE_TABS = { go: goTab, step: stepTab, pend: tab => { pendingMode = tab; } };
  function onInput(a) {
    if (a !== "lt" && a !== "rt") return false;
    stepTab(mode, a === "lt" ? -1 : 1);
    return true;
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
    // Figma 980:96284: Style Level 1 starts 4/5 unlocked (one time, older saves too)
    if (!api.store.get("rewards_fig1", "")) { api.store.set("rewards_claimed", "r0_0,r0_2,r0_3,r0_4"); api.store.set("rewards_fig1", "1"); }
    applyMode(pendingMode || "store");
    pendingMode = null;
    rPoints = +api.store.get("store_r", rPoints) || 0;   // Rewards spends the same balance
    render();
    renderWallet();
    clearInterval(timerTick);
    timerTick = setInterval(tickTimers, 1000);
  }

  const fmtEnds = s => `Ends in ${Math.floor(s / 86400)}D ${String(Math.floor(s % 86400 / 3600)).padStart(2, "0")}H`;
  function sectionCount(sec) {
    const t = sec.items.filter(i => i.timer).map(timeLeft);
    if (sec.count) return sec.count;
    return t.length && (sec.title === "Featured" || t.length === sec.items.length) ? fmtEnds(Math.min(...t)) : `${sec.items.length} items`;
  }

  function render() {
    const host = api.bind("storeList");
    if (!host) return;
    host.innerHTML = curSections().map((sec, si) => {
      if (sec.rewards) {
        let n = 0;
        const got = sec.items.filter(it => claimedSet().has(it.id)).length;
        return `<section class="st-section st-section--rewards"><h2 class="st-section__title">${sec.title}<span data-level="${si}">${got}/${sec.items.length} Unlocked</span></h2>` +
          `<div class="st-grid">${sec.items.map(it => rewardCardHtml(it, it.ratio === "1:2" ? 3 : (n++ % 2) + 1)).join("")}</div></section>`;
      }
      // Store tab: one grid per card shape (2:1 banners, then 1:1, then 1:2), so mixed shapes leave no holes (user 2026-11-26)
      const groups = mode === "store" ? ["2:1", "1:1", "1:2"].map(r => sec.items.filter(it => (it.ratio || "1:1") === r)).filter(g => g.length) : [sec.items];
      return `<section class="st-section"><h2 class="st-section__title">${sec.title}<span>${sectionCount(sec)}</span></h2>` +
        groups.map(g => `<div class="st-grid">${g.map(it => cardHtml(it)).join("")}</div>`).join("") + "</section>";
    }).join("");
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
    const panel = list.parentElement;   // panel is as wide as its grid (3 or 4 columns): the bar follows its right edge
    bar.style.left = panel.offsetLeft + panel.offsetWidth + 42 + "px";   // 3 columns: x652 as in Figma
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
    return el && el.classList.contains("item-card") ? [el, DB.get(el.dataset.id)] : [null, null];
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
    if (mode === "rewards" && !onPack) return openUnlock(item, el);
    if (isOwned(item)) { api.toast(`${item.name} already owned`); return false; }
    if (item.stack && (stacks[item.id] || 0) >= item.stack) { api.toast(`${item.name} stack is full`); return false; }
    openBuy(item, el);
    return true;
  }

  const priceBtn = (type, val) => ({ html: `<span class="dlg-price">${type === "r" ? `<b class="dlg-price__r" aria-label="R Point">R</b>` : `<img src="mtx/assets/svg/icon-money.svg" alt="Money">`}<span>${fmt(val)}</span></span>` });   // R currency = letter R (Modi)

  // Two prices: choose the currency. One price: Buy or Cancel.
  function openBuy(item, el) {
    if (item.usd) {
      window.MTX_UI.dialog.open({
        title: `Purchase ${item.name}?`, body: "Paid through your platform store (prototype: no real payment)",
        primary: { html: `<span class="dlg-price"><span>${fmtUsd(item.usd)}</span></span>` }, secondary: "Cancel",
        onPrimary: () => buyPlatform(item, el)
      });
      return;
    }
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

  // ---- Rewards tab: unlock with R points (same confirm modal) ----
  function openUnlock(item, el) {
    if (claimedSet().has(item.id)) { api.toast(`${item.name} already unlocked`); return false; }
    const need = lockLevel(item);
    if (need) { api.toast(`Requires R Level ${need}`); api.rumble(60, 0.2); return false; }
    window.MTX_UI.dialog.open({
      title: `Unlock ${item.name}?`, body: `${DB.RARITY[item.rarity]?.label || ""} ${item.type}`,
      primary: priceBtn("r", rewardPrice(item)), secondary: "Cancel",
      onPrimary: () => unlockReward(item, el)
    });
    return true;
  }
  function unlockReward(item, card) {
    const price = rewardPrice(item);
    rPoints = +api.store.get("store_r", rPoints) || 0;
    if (price > rPoints) { api.toast(`Not enough R points, need ${fmt(price - rPoints)} more`); api.rumble(120, 0.5); return; }
    rPoints -= price;
    api.store.set("store_r", rPoints);
    if (item.grantsCash && P()) { cash = P().get().cash + item.grantsCash; P().set({ cash }); }
    const set = claimedSet(); set.add(item.id);
    api.store.set("rewards_claimed", [...set].join(","));
    renderWallet();
    card.classList.add("is-claimed");
    card.querySelector(".item-label, .item-state")?.replaceWith(document.createRange().createContextualFragment(rewardLabel(item)));
    STORE.rewards.forEach((sec, si) => {
      const c = api.$(`#s-store .st-section--rewards [data-level="${si}"]`);
      if (c) c.textContent = `${sec.items.filter(it => set.has(it.id)).length}/${sec.items.length} Unlocked`;
    });
    renderDetail(item);
    card.classList.add("is-bought");
    setTimeout(() => card.classList.remove("is-bought"), 500);
    api.rumble(150, 0.6);
    api.toast(`Unlocked ${item.name} for ${fmt(price)} R`);
    api.log(`Rewards: unlocked ${item.name} for ${fmt(price)} R`, "action");
  }

  function buyPlatform(item, card) {
    if (P()) cash = P().get().cash;
    if (item.grantsCash) cash += item.grantsCash;
    else if (item.stack) stacks[item.id] = Math.min(item.stack, (stacks[item.id] || 0) + (item.qty || 1));
    else owned.add(item.id);
    P()?.set({ cash });
    api.store.set("store_owned", JSON.stringify([...owned]));
    api.store.set("store_stacks", JSON.stringify(stacks));
    renderWallet();
    if (isOwned(item)) {
      card.classList.add("is-claimed");
      card.querySelector(".item-label")?.replaceWith(document.createRange().createContextualFragment(storeLabel(item)));
    }
    renderDetail(item);
    card.classList.add("is-bought");
    setTimeout(() => card.classList.remove("is-bought"), 500);
    api.rumble(150, 0.6);
    api.toast(item.grantsCash ? `+${fmt(item.grantsCash)} MTX Points added` : `Purchased ${item.name}`);
    api.log(`Store: platform purchase ${item.name} ${fmtUsd(item.usd)}`, "action");
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
    onInput,
    goTab,
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
