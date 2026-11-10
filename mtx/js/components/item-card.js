/* Component: item card (Figma MTX / Item Slot 394:172991 + Item Slot Label 573:65712). Data from data/items.js.
     MTX_UI.itemCard("glove_black", { label, cls, attrs, style, badge })  -> <a class="item-card ...">
     MTX_UI.itemLabel("r", 500)   -> the bottom bar: money | credit | r | qty | name | status | timer | locked
     MTX_UI.itemPriceLabel(item, ["cash", "r"]) -> label of the first price found in that order, else the name

   Card size comes from the grid (1:1 = one cell, 1:2 = two rows, 2:1 = two columns).
   States are classes: is-focused, is-pressed, is-holding, is-claimed, is-locked.
   Disabled (is-claimed, is-locked): 70% black over the whole card.
   label: HTML from itemLabel (default: itemPriceLabel). badge: top-left text, "New" when item.isNew. */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const DB = () => window.MTX_ITEMS;
  const ICONS = {
    money: ["icon-money", 22, 13, "Money"], credit: ["icon-credit", 20, 20, "MTX Credit"],
    r: ["icon-rpoint", 20, 20, "R Point"], locked: ["icon-lock-sm", 16, 16, "Locked"]
  };
  const LABEL_OF = { cash: "money", r: "r", credit: "credit" };

  UI.itemLabel = function (type, value) {
    const icon = ICONS[type];
    const img = icon ? `<img src="mtx/assets/svg/${icon[0]}.svg" width="${icon[1]}" height="${icon[2]}" alt="${icon[3]}">` : "";
    return `<span class="item-label item-label--${type}">${img}<b>${value}</b></span>`;
  };

  UI.itemPriceLabel = function (item, order = ["cash", "r", "credit"]) {
    for (const type of order) {
      const p = DB().price(item, type);
      if (p) return UI.itemLabel(LABEL_OF[type], p.val.toLocaleString("en-US"));
    }
    return UI.itemLabel("name", item.name);
  };

  UI.itemCard = function (ref, opts = {}) {
    const item = typeof ref === "string" ? DB().get(ref) : ref;
    if (!item) { console.warn("[itemCard] unknown item:", ref); return ""; }
    const { label, cls = "", attrs = "", style = "", badge = item.isNew ? "New" : "" } = opts;
    const ratio = item.ratio === "1:2" ? " item-card--tall reward-tile--tall" : item.ratio === "2:1" ? " item-card--wide" : "";
    const extra = item.imgExtra ? " item-card__art--pair" : "";
    const pos = item.pos ? ` style="object-position:${item.pos}"` : "";
    const art = `<img class="reward-tile__art item-card__art${extra}" src="${DB().src(item.img)}" alt=""${pos}>` +
      (item.imgExtra ? `<img class="reward-tile__art item-card__art item-card__art--second" src="${DB().src(item.imgExtra)}" alt="">` : "");
    return `<a class="item-card reward-tile focus-ring focus-ring--out${ratio} ${cls}" style="--rar:${DB().RARITY[item.rarity].color};${style}" data-nav data-id="${item.id}" ${attrs}>
      ${art}<span class="reward-tile__glow"></span>
      <svg class="reward-tile__corner" viewBox="0 0 154 48" preserveAspectRatio="none" aria-hidden="true"><path d="M0 48V45H116C138 45 154 25 154 0V48Z"/></svg>
      ${label === undefined ? UI.itemPriceLabel(item) : label}${badge ? `<span class="reward-tile__new">${badge}</span>` : ""}
      <span class="item-card__dim"></span><span class="item-card__hold"><i></i></span>
    </a>`;
  };
})();
