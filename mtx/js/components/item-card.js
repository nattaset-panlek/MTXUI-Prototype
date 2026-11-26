/* Component: item card = Figma MTX / Item Slot Corner 980:89494 (+ Corner Label 980:89544, Corner State 980:89732). Data from data/items.js.
     MTX_UI.itemCard("glove_black", { label, cls, attrs, style, badge })  -> <a class="item-card ...">
     MTX_UI.itemLabel("r", 500)   -> chip bottom left: money | credit | r | qty | name;  state veil: status | timer | locked
     MTX_UI.itemPriceLabel(item, ["cash", "r"]) -> label of the first price found in that order, else the name

   Card size comes from the grid (1:1 = one cell, 1:2 = two rows, 2:1 = two columns). Everything inside scales with the card:
   --k = card short side / 156 (Figma size), so the same card works at 84 (Quests), 156 and 216 px.
   Rarity = 2-tone corner bottom right (Figma colours, RARITY_CORNER). States are classes: is-focused, is-pressed, is-holding,
   is-claimed, is-locked. Claimed / locked / timer show the Corner State veil over the card (from the label type).
   label: HTML from itemLabel (default: itemPriceLabel). badge: top-left text (none by default; the "New" tag was removed 2026-11-26). */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const DB = () => window.MTX_ITEMS;
  // Figma MTX / Item Slot Corner Label 980:89544 icons (dark on the light chip)
  const SVG = (vb, body, label) => `<svg class="item-label__icon" viewBox="${vb}" role="img" aria-label="${label}">${body}</svg>`;
  const ICONS = {
    money: SVG("6 7.5 16 9", `<path d="M22 12.8473V10.5857H20.3898V8.19489C20.3898 8.08381 20.3945 8.00244 20.4028 7.95207C20.4112 7.90169 20.422 7.85649 20.435 7.82032C20.4481 7.78287 20.4624 7.74412 20.4803 7.70149C20.497 7.66016 20.5148 7.593 20.5315 7.5H16.7476L14.106 11.7559L14.0286 11.8528H13.9512L13.8738 11.7559L11.2571 7.5H7.44827V7.58396C7.46494 7.64854 7.49471 7.74928 7.53759 7.88232C7.58047 8.01665 7.6019 8.10706 7.6019 8.15356V10.5857H6V12.8473H7.6019V15.4848C7.58404 15.6049 7.57452 15.7005 7.56975 15.7702C7.56499 15.84 7.55903 15.9071 7.55069 15.9717C7.54236 16.0363 7.53759 16.0789 7.53759 16.097L7.44827 16.4303H11.001C10.9498 16.2727 10.9093 16.1241 10.8796 15.9846C10.8498 15.8451 10.8176 15.6837 10.7831 15.4977V11.7559L10.8605 11.4911L13.9905 16.4987L17.043 11.6022C17.0776 11.5466 17.1026 11.5182 17.1204 11.5182L17.1848 11.5324V15.4964C17.1848 15.5248 17.1788 15.5778 17.1657 15.6566C17.1526 15.7354 17.1383 15.8219 17.1204 15.9136C17.1037 16.0066 17.0859 16.097 17.0692 16.1848C17.0525 16.2727 17.0395 16.3398 17.0311 16.3863L17.0049 16.4277H20.5315C20.497 16.2701 20.4648 16.1125 20.435 15.9549C20.4052 15.7974 20.3898 15.6256 20.3898 15.4409V12.846H22V12.8473Z"/>`, "Money"),
    r: SVG("6 6.5 16 11", `<path d="M6.32548 16.5062V7.73364C6.32548 7.50519 6.28551 7.29387 6.20557 7.09969C6.13704 6.89408 6.06852 6.69419 6 6.5H20.1328V9.73832C20.1328 10.081 20.0471 10.4408 19.8758 10.8178C19.7159 11.1947 19.5103 11.5545 19.2591 11.8972C19.0079 12.2285 18.7223 12.514 18.4026 12.7539C18.0942 12.9823 17.7973 13.1194 17.5118 13.1651C18.2427 13.919 18.9507 14.6501 19.636 15.3583C20.3326 16.0665 21.0978 16.7461 21.9315 17.3972C21.9315 17.3972 21.9429 17.4086 21.9657 17.4315C21.9886 17.4543 22 17.4772 22 17.5H16.2441L13.2805 14.5701H10.6595V16.5919C10.6824 16.7861 10.7109 16.9574 10.7452 17.1059C10.7794 17.243 10.8137 17.3744 10.848 17.5H6.08565C6.15418 17.3515 6.19986 17.1973 6.2227 17.0374C6.25696 16.8775 6.29122 16.7004 6.32548 16.5062ZM10.6595 9.24143V11.6916H11.5675C11.9786 11.6916 12.4126 11.6744 12.8694 11.6402C13.3376 11.5945 13.7659 11.4917 14.1542 11.3318C14.5425 11.1719 14.8622 10.932 15.1135 10.6122C15.3762 10.2809 15.5132 9.82399 15.5246 9.24143H10.6595Z"/>`, "R Point"),
    credit: SVG("7 5.5 13 13", `<path d="M15.7182 7.78808C16.0567 8.12656 16.2486 8.55555 16.2942 8.99714L16.3138 9.18756L16.504 9.20716C16.9456 9.2527 17.3745 9.44441 17.713 9.78289L19.9306 12.0007L17.713 14.2184C17.3745 14.5569 16.9456 14.7486 16.504 14.7941L16.3138 14.8138L16.2942 15.004C16.2486 15.4456 16.0567 15.8746 15.7182 16.213L13.5005 18.4306L11.2829 16.213C10.9444 15.8746 10.7525 15.4456 10.707 15.004L10.6874 14.8138L10.4971 14.7939C10.0555 14.7484 9.62656 14.5567 9.28809 14.2182L7.07031 12.0004L9.28809 9.78269C9.62656 9.44422 10.0555 9.25252 10.4971 9.20696L10.6874 9.18735L10.707 8.99714C10.7525 8.55555 10.9444 8.12656 11.2829 7.78808L13.5005 5.57031L15.7182 7.78808Z"/><path class="item-label__cut" d="M10.6484 9.15039H12.3584L13.4984 11.0029L14.6384 9.15039H16.3484L14.3534 12.0004L16.3484 14.8504H14.6384L13.4984 12.9979L12.3584 14.8504H10.6484L12.6434 12.0004L10.6484 9.15039Z"/>`, "MTX Credit")
  };
  const LOCK = `<svg class="item-state__icon" viewBox="76 56 16 17.6" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M79.2 63.6004V61.2004C79.2 59.9274 79.7057 58.7065 80.6059 57.8063C81.5061 56.9061 82.727 56.4004 84 56.4004C85.273 56.4004 86.4939 56.9061 87.3941 57.8063C88.2942 58.7065 88.8 59.9274 88.8 61.2004V63.6004H90.4C90.8243 63.6004 91.2314 63.769 91.5314 64.069C91.8314 64.3691 92 64.776 92 65.2004V74.8004C92 75.2247 91.8314 75.6318 91.5314 75.9318C91.2314 76.2318 90.8243 76.4004 90.4 76.4004H77.6C77.1756 76.4004 76.7687 76.2318 76.4686 75.9318C76.1686 75.6318 76 75.2247 76 74.8004V65.2004C76 64.776 76.1686 64.3691 76.4686 64.069C76.7687 63.769 77.1756 63.6004 77.6 63.6004H79.2ZM81.6 63.6004H86.4V61.2004C86.4 60.5639 86.1471 59.9534 85.6971 59.5033C85.247 59.0533 84.6365 58.8004 84 58.8004C83.3635 58.8004 82.753 59.0533 82.3029 59.5033C81.8529 59.9534 81.6 60.5639 81.6 61.2004V63.6004Z""/></svg>`;
  const CHECK = `<svg class="item-state__icon" viewBox="73 58 22 17" aria-hidden="true"><path d="M75 66.5L81 72.5L93 60.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>`;  const LABEL_OF = { cash: "money", r: "r", credit: "credit" };
  // Figma Item Slot Corner: light = Vector 683 (line + corner), dark = Vector 684 (back of the corner)
  const RARITY_CORNER = {
    normal: ["#9a9ea8", "#5c5f65"], standard: ["#c3fd0b", "#76980a"], rare: ["#8b5cff", "#533799"],
    epic: ["#e5413c", "#892724"], legendary: ["#f3ad3b", "#926823"]
  };
  const CORNER = `<span class="item-card__line" aria-hidden="true"></span><svg class="item-card__corner" viewBox="120 0 36 29" aria-hidden="true"><path class="item-card__corner-lo" d="M126.514 26.1384C126.357 26.1467 126.216 26.1462 126.094 26.1384H126.514C128.205 26.049 131.803 24.9388 135.568 20.9107C139.683 16.5085 150.947 5.13597 156 0V17.609L148 26.1384H126.514Z"/><path class="item-card__corner-hi" d="M136.876 26.1107H0V28.8047H149.71L156 22.2591V11.8047L144.799 23.0844C142.176 25.7255 138.424 26.2024 136.876 26.1107Z"/></svg>`;

  UI.itemLabel = function (type, value) {
    if (type === "status") return `<span class="item-state item-state--claimed">${CHECK}<b>${value}</b></span>`;
    if (type === "locked") return `<span class="item-state item-state--locked">${LOCK}<b>${value}</b></span>`;
    if (type === "timer") return `<span class="item-state item-state--timer"><small>Ends in</small><b>${value}</b></span>`;
    if (type === "qty" && /^[0-9]/.test(String(value))) value = `x${value}`;
    return `<span class="item-label item-label--${type}">${ICONS[type] || ""}<b>${value}</b></span>`;
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
    const { label, cls = "", attrs = "", style = "", badge = "" } = opts;
    const ratio = item.ratio === "1:2" ? " item-card--tall reward-tile--tall" : item.ratio === "2:1" ? " item-card--wide" : "";
    const extra = item.imgExtra ? " item-card__art--pair" : "";
    const pos = item.pos && !item.banner ? ` style="object-position:${item.pos}"` : "";
    const [hi, lo] = RARITY_CORNER[item.rarity] || RARITY_CORNER.normal;
    const art = `<img class="reward-tile__art item-card__art${extra}" src="${DB().src(item.ratio === "2:1" && item.banner || item.img)}" alt=""${pos}>` +
      (item.imgExtra ? `<img class="reward-tile__art item-card__art item-card__art--second" src="${DB().src(item.imgExtra)}" alt="">` : "");
    return `<a class="item-card reward-tile focus-ring focus-ring--out${ratio} ${cls}" style="--rar:${DB().RARITY[item.rarity].color};--rar-hi:${hi};--rar-lo:${lo};${style}" data-nav data-id="${item.id}" ${attrs}>
      <span class="item-card__tex" aria-hidden="true"></span>${art}${CORNER}
      ${label === undefined ? UI.itemPriceLabel(item) : label}${badge ? `<span class="reward-tile__new"><b>${badge}</b></span>` : ""}
      <span class="item-card__dim"></span><span class="item-card__hold"><i></i></span>
    </a>`;
  };
})();
