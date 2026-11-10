/* Item database: one record per item. Screens ask by id, MTX_UI.itemCard(id) draws the card.
     MTX_ITEMS.get(id), MTX_ITEMS.all(), MTX_ITEMS.price(item, "r"), MTX_ITEMS.RARITY

   Fields
     id, name, type (short line), desc
     rarity   normal | standard | rare | epic | legendary (Figma MTX / Item Slot 394:172991)
     img      card art: name in assets/img (no extension), or a path under assets/ with extension
     hero     large preview (default: img); imgExtra = second card art
     ratio    "1:1" (default), "1:2" (fighter / char art), "2:1" (featured)
     pos      object-position for "2:1" cover art
     prices   [{ type: "cash" | "r" | "credit", val }]; several = alternative prices
     qty      amount in one purchase (coins, bonus); grantsCash = Cash added on purchase
     stack    max owned of a consumable (no stack = single purchase)
     timer    limited offer, seconds
     contents pack contents: [{ id }]; sold as one purchase at the pack price; a record with contents opens the Pack page
     isNew    "New" badge
     mock     true = name / price invented for the prototype, replace with real data */
(function () {
  const RARITY = {
    normal:    { label: "Normal",    color: "#9a9ea8" },
    standard:  { label: "Standard",  color: "#c3fd0b" },
    rare:      { label: "Rare",      color: "#6100ff" },
    epic:      { label: "Epic",      color: "#d9302e" },
    legendary: { label: "Legendary", color: "#f3ad3b" }
  };
  const cash = val => ({ type: "cash", val });
  const r = val => ({ type: "r", val });
  const mock = (id, name, type, img, rarity, prices, more) => ({ id, name, type, img, rarity, prices, mock: true, isNew: true, ...more });

  const LIST = [
    // ---- Rewards ----
    { id: "r0_0", name: "MTX 2026 Collection", type: "Gloves", desc: "Deal 1000 damage to the enemy instantly with enhanced impact aura.", img: "glove1-thumb", hero: "glove1-hero", rarity: "standard", prices: [cash(500), r(500)] },
    { id: "r0_1", name: "MTX Classic Gloves", type: "Gloves", desc: "Faster jab recovery for three rounds in all sanctioned matches.", img: "glove2", hero: "glove2", rarity: "rare", prices: [cash(500), r(500)] },
    { id: "r0_2", name: "Legend Fighter Skin", type: "Fighter skin", desc: "Classic gold-trim trunks and traditional braided Mongkhon hand wraps.", img: "fighter-samart", hero: "fighter-samart", rarity: "legendary", prices: [cash(500), r(500)] },
    { id: "r0_3", name: "MTX Coins Stash", type: "Currency", desc: "500 bonus premium coins deposited directly to your R-Shop wallet.", img: "coins", hero: "coins", rarity: "normal", prices: [r(500)], qty: 500, grantsCash: 500 },
    { id: "r0_4", name: "Temple Skin Pack", type: "Tattoo, Body skin", desc: "Two ceremonial sak yant body skins blessed with divine invulnerability.", img: "skin-a", hero: "skin-a", imgExtra: "skin-b", rarity: "normal", prices: [r(500)] },
    { id: "r1_0", name: "Fighter Knee Champion Skin", type: "Fighter skin", desc: "Heavy strike knee armor skin with aggressive golden dragon decals.", img: "fighter-knee", hero: "fighter-knee", rarity: "epic", prices: [cash(750), r(750)] },
    { id: "r1_1", name: "Muay Chaiya Golden Wraps", type: "Gloves", desc: "Handmade sacred cloth wraps offering +15% guard deflection.", img: "glove1-thumb", hero: "glove1-hero", rarity: "standard", prices: [cash(600)] },
    { id: "r1_2", name: "Wishlist Seux Phen Banner", type: "Cosmetic, Banner", desc: "Exclusive locker room flag and championship corner ring ropes.", img: "wishlist-art", hero: "wishlist-art", rarity: "rare", prices: [r(600)] },
    { id: "r1_3", name: "Treasury Vault (1,000 Coins)", type: "Currency", desc: "1,000 coins usable across all career and cosmetic unlocks.", img: "coins", hero: "coins", rarity: "normal", prices: [r(800)], qty: 1000, grantsCash: 1000 },
    { id: "r1_4", name: "Season 1 Legacy Shield", type: "Cosmetic, Badge", desc: "Honor badge displayed on your profile card and online matchmaking intro.", img: "news-season", hero: "news-season", rarity: "standard", prices: [cash(1200)] },
    { id: "r2_0", name: "Grandmaster Sak Yant Tiger", type: "Tattoo, Body skin", desc: "Ferocious dual tiger tattoo with pulsing spiritual gold ink VFX.", img: "skin-b", hero: "skin-b", imgExtra: "skin-a", rarity: "standard", prices: [cash(1500), r(1000)] },
    { id: "r2_1", name: "Phra Nakhon Royal Gloves", type: "Gloves", desc: "Forged in ceremonial copper and hardened leather for maximum knockout rate.", img: "glove2", hero: "glove2", rarity: "legendary", prices: [cash(900)] },
    { id: "r2_2", name: "Lobby Grand Champion Robe", type: "Outfit, Robe", desc: "Silk ceremonial entrance robe with customized sponsor embroidery.", img: "char-lobby", hero: "char-lobby", rarity: "epic", prices: [cash(1800)] },
    { id: "r2_3", name: "Grand Treasury (2,500 Coins)", type: "Currency", desc: "Massive bullion crate providing 2,500 R-Coins for maximum progression.", img: "coins", hero: "coins", rarity: "legendary", prices: [r(1500)], qty: 2500, grantsCash: 2500 },
    { id: "r2_4", name: "Siam Diamond Strike VFX", type: "Cosmetic, VFX", desc: "Unique hit spark and knockout camera flash during match finishes.", img: "fist", hero: "fist", rarity: "standard", prices: [cash(2000), r(1500)] },

    // ---- Store: featured ----
    { id: "seux_shorts", name: "Seux Phen", type: "Collection, 3 items", img: "store-seuxphen", ratio: "2:1", pos: "50% 82%", rarity: "legendary", prices: [cash(2400), r(500)], timer: 88801,
      desc: "Collab drop with Seux Phen. Fight shorts, matching gloves and a cash bonus.",
      contents: [{ id: "seux_shorts_item" }, { id: "seux_gloves_item" }, { id: "cash_bonus_2500" }] },
    { id: "lumpinee_arena", name: "Lumpinee Night", type: "Arena, Fight night stage", img: "card-art", ratio: "2:1", pos: "50% 45%", rarity: "legendary", prices: [cash(3200)], timer: 88801 },

    // ---- Store: gloves ----
    { id: "glove_mtx26", name: "MTX26 Street Art", type: "Gloves, 12 oz", img: "store-glove-mtx26", rarity: "rare", prices: [cash(500)], timer: 88801 },
    { id: "glove_black", name: "MTX Classic Black", type: "Gloves, 12 oz", img: "store-glove-black", rarity: "epic", prices: [cash(500), r(500)] },
    { id: "glove_sakura", name: "Sakura Kru", type: "Gloves, 10 oz", img: "store-glove-mtx26", rarity: "rare", prices: [r(500)] },
    { id: "glove_midnight", name: "Midnight Camp", type: "Gloves, 16 oz", img: "store-glove-black", rarity: "epic", prices: [cash(500)] },
    { id: "glove_temple", name: "Temple Fair", type: "Gloves, 12 oz", img: "store-glove-mtx26", rarity: "normal", prices: [cash(250)] },
    { id: "glove_shadow", name: "Shadow Teep", type: "Gloves, 12 oz", img: "store-glove-black", rarity: "normal", prices: [cash(250)] },
    { id: "glove_golden", name: "Golden Mongkol", type: "Gloves, Limited", img: "store-glove-mtx26", rarity: "legendary", prices: [cash(1800)], timer: 172800 },
    { id: "glove_ironshin", name: "Iron Shin", type: "Gloves, 14 oz", img: "store-glove-black", rarity: "rare", prices: [cash(650)] },
    // Customize gloves (names from screen-customize.js)
    mock("cc_glove_1", "Tiger Blaze", "Gloves, Customize", "cc-glove-1", "epic", [cash(700)]),
    mock("cc_glove_2", "Jungle Camo", "Gloves, Customize", "cc-glove-2", "standard", [cash(350)]),
    mock("cc_glove_3", "Pink Riot", "Gloves, Customize", "cc-glove-3", "rare", [r(450)]),
    mock("cc_glove_4", "Red Lotus", "Gloves, Customize", "cc-glove-4", "epic", [cash(700)]),
    mock("cc_glove_5", "Volt Strike", "Gloves, Customize", "cc-glove-5", "rare", [cash(550)]),
    mock("cc_glove_6", "Pearl White", "Gloves, Customize", "cc-glove-6", "standard", [cash(350)]),
    mock("cc_glove_7", "Midnight", "Gloves, Customize", "cc-glove-7", "normal", [cash(200)]),
    mock("cc_glove_8", "Ivory Kru", "Gloves, Customize", "cc-glove-8", "legendary", [cash(1500), r(1000)]),

    // ---- Store: fighter outfits and fighters ----
    { id: "outfit_seux", name: "Seux Phen Fighter", type: "Outfit, Shorts + wraps", img: "char-lobby", rarity: "legendary", prices: [cash(2200), r(800)] },
    { id: "outfit_gold", name: "Gold Trim Trunks", type: "Outfit, Shorts", img: "fighter-samart", rarity: "epic", prices: [cash(900)] },
    { id: "outfit_camp", name: "Camp Training Kit", type: "Outfit, Training", img: "fighter-knee", rarity: "rare", prices: [cash(600)] },
    { id: "outfit_ringside", name: "Ringside Classic", type: "Outfit, Shorts", img: "char-lobby", rarity: "normal", prices: [r(300)] },
    // Character Select roster (placeholder fighters, no art of their own)
    mock("fighter_kru", "SX.KRU", "Fighter, The Teacher", "char-lobby", "rare", [cash(1500)]),
    mock("fighter_naga", "SX.NAGA", "Fighter, The Serpent", "fighter-knee", "epic", [cash(2000)]),
    mock("fighter_samart", "SX.SAMART", "Fighter, The Knee", "fighter-samart", "standard", [cash(1200), r(900)]),

    // ---- Store: tattoos, cosmetics and emotes (R Shop: R Point only) ----
    mock("tattoo_skull", "Skull Ink", "Tattoo, Chest", "cc-tattoo-skull", "rare", [r(400)]),
    mock("cos_vinyl", "Street Vinyl", "Cosmetic, Glove vinyl", "cc-vinyl", "standard", [r(250)]),
    mock("cos_avatar_1", "Kru Portrait", "Cosmetic, Avatar", "cc-avatar-1", "normal", [r(100)]),
    mock("cos_avatar_2", "Camp Portrait", "Cosmetic, Avatar", "cc-avatar-2", "normal", [r(100)]),
    mock("cos_badge_sorcerer", "Muay Sorcerer", "Cosmetic, Profile badge", "badges/muay-sorcerer", "epic", [r(800)]),
    mock("cos_badge_beast", "Underground Beast", "Cosmetic, Profile badge", "badges/underground-beast", "rare", [r(500)]),
    mock("cos_belt_1", "Replica Belt", "Cosmetic, Lobby prop", "belts/belt-1", "epic", [r(900)]),
    mock("emote_waikhru", "Wai Khru", "Emote, Ring entrance", "fist", "rare", [r(300)]),
    mock("emote_rammuay", "Ram Muay", "Emote, Ring entrance", "fist", "epic", [r(600)]),
    mock("emote_victory", "Victory Fist", "Emote, Win pose", "fist", "standard", [r(150)]),
    mock("stage_mtx", "MTX Arena", "Arena, Stage", "map-mtx-arena", "epic", [r(1200)]),

    // ---- Store: packs and bundles ----
    { id: "pack_legend", name: "Legend Card Pack", type: "Pack, 5 cards", img: "skin-a", rarity: "legendary", prices: [r(1200)],
      desc: "Five cards from the Legend Legacy set. At least one Legendary guaranteed.",
      contents: [{ id: "card_legendary" }, { id: "card_epic" }, { id: "card_epic" }, { id: "card_rare" }, { id: "card_rare" }] },
    { id: "pack_rookie", name: "Rookie Card Pack", type: "Pack, 3 cards", img: "skin-b", rarity: "rare", prices: [cash(400)],
      desc: "Three cards to start your collection. Perfect for a new Nak Muay.",
      contents: [{ id: "card_rare" }, { id: "card_common" }, { id: "card_common" }] },
    { id: "bundle_season", name: "Season 1 Bundle", type: "Bundle, Gloves + pack + cash", img: "quest-rewards", rarity: "epic", prices: [cash(3000)], timer: 259200,
      desc: "Everything for Legend Legacy: MTX26 gloves, a Rookie pack and 2,500 Cash.",
      contents: [{ id: "glove_mtx26" }, { id: "pack_rookie_item" }, { id: "glove_black" }, { id: "cash_bonus_2500" }] },
    mock("pack_gloves", "Camp Gloves Pack", "Pack, 3 gloves", "cc-glove-5", "rare", [cash(1200)], {
      desc: "Three Customize gloves for your camp.",
      contents: [{ id: "cc_glove_2" }, { id: "cc_glove_5" }, { id: "cc_glove_6" }] }),
    mock("pack_ink", "Sacred Ink Pack", "Pack, 3 tattoos", "skin-b", "epic", [r(1500)], {
      desc: "Sak yant body skins and a chest tattoo.",
      contents: [{ id: "r0_4" }, { id: "r2_0" }, { id: "tattoo_skull" }] }),
    mock("pack_emote", "Ring Entrance Pack", "Pack, 3 emotes", "fist", "rare", [r(800)], {
      desc: "All three emotes for your ring entrance and win pose.",
      contents: [{ id: "emote_waikhru" }, { id: "emote_rammuay" }, { id: "emote_victory" }] }),
    mock("bundle_champion", "Champion Bundle", "Bundle, Robe + gloves + VFX", "char-lobby", "legendary", [cash(4200)], { timer: 172800, ratio: "1:2",
      desc: "Enter like a champion: robe, royal gloves, strike VFX and a cash bonus.",
      contents: [{ id: "r2_2" }, { id: "r2_1" }, { id: "r2_4" }, { id: "cash_bonus_2500" }] }),
    { id: "cash_pack", name: "Cash Bag", type: "Currency, +5,000 Cash", img: "coins", rarity: "normal", prices: [r(600)], qty: 5000, grantsCash: 5000 },
    mock("ticket_1", "Tournament Ticket", "Ticket, Stack 99", "svg/icon-ticket.svg", "standard", [cash(300)], { stack: 99, qty: 1 }),
    mock("ticket_5", "Ticket Stack", "Ticket, 5 tickets", "svg/icon-ticket.svg", "rare", [cash(1300)], { stack: 99, qty: 5 }),

    // ---- Pack contents (not sold alone) ----
    { id: "seux_shorts_item", name: "Seux Phen Shorts", type: "Shorts", img: "pack-seux-shorts", rarity: "rare" },
    { id: "seux_gloves_item", name: "Seux Phen Gloves", type: "Gloves", img: "pack-seux-glove", rarity: "epic" },
    { id: "cash_bonus_2500", name: "Cash Bonus", type: "Currency", img: "pack-coins", rarity: "normal", qty: 2500, grantsCash: 2500 },
    { id: "pack_rookie_item", name: "Rookie Card Pack", type: "Pack", img: "skin-b", rarity: "rare" },
    { id: "card_legendary", name: "Legendary Card", type: "Card", img: "skin-a", rarity: "legendary" },
    { id: "card_epic", name: "Epic Card", type: "Card", img: "skin-b", rarity: "epic" },
    { id: "card_rare", name: "Rare Card", type: "Card", img: "skin-b", rarity: "rare" },
    { id: "card_common", name: "Common Card", type: "Card", img: "skin-a", rarity: "normal" }
  ];

  const INDEX = new Map(LIST.map(it => {
    it.ratio = it.ratio || (/^(fighter|char)/.test(it.img) ? "1:2" : "1:1");
    it.hero = it.hero || it.img;
    it.prices = it.prices || [];
    return [it.id, it];
  }));

  window.MTX_ITEMS = {
    RARITY,
    get: id => INDEX.get(id) || null,
    all: () => LIST,
    price: (it, type) => it.prices.find(p => p.type === type) || null,
    src: name => name.includes(".") ? `mtx/assets/${name}` : `mtx/assets/img/${name}.webp`
  };
})();
