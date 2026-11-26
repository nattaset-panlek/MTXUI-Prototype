/* Item database: one record per item. Screens ask by id, MTX_UI.itemCard(id) draws the card.
     MTX_ITEMS.get(id), MTX_ITEMS.all(), MTX_ITEMS.price(item, "r"), MTX_ITEMS.RARITY

   Fields
     id, name, type (short line), desc
     rarity   normal | standard | rare | epic | legendary (Figma MTX / Item Slot 394:172991)
     img      card art: name in assets/img (no extension), or a path under assets/ with extension
     hero     large preview (default: img); imgExtra = second card art
     ratio    "1:1" (default), "1:2" (fighter / char art), "2:1" (featured)
     pos      object-position for "2:1" cover art
     banner   "2:1" card art already cropped to the banner (Figma export); the preview still uses img / hero
     prices   [{ type: "cash" | "r" | "credit", val }]; several = alternative prices
     qty      amount in one purchase (coins, bonus); grantsCash = Cash added on purchase
     stack    max owned of a consumable (no stack = single purchase)
     timer    limited offer, seconds
     contents pack contents: [{ id }]; sold as one purchase at the pack price; a record with contents opens the Pack page
     isNew    (no badge any more, user 2026-11-26)
     owned    true = shown as owned (mock state from the Figma frames)
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
    { id: "r2_0", name: "Grandmaster Sak Yant Tiger", type: "Tattoo, Body skin", desc: "Ferocious dual tiger tattoo with pulsing spiritual gold ink VFX.", img: "skin-b", hero: "skin-b", imgExtra: "skin-a", rarity: "normal", prices: [cash(1500), r(1000)] },
    { id: "r2_1", name: "Phra Nakhon Royal Gloves", type: "Gloves", desc: "Forged in ceremonial copper and hardened leather for maximum knockout rate.", img: "glove2", hero: "glove2", rarity: "legendary", prices: [cash(900)] },
    { id: "r2_2", name: "Lobby Grand Champion Robe", type: "Outfit, Robe", desc: "Silk ceremonial entrance robe with customized sponsor embroidery.", img: "char-lobby", hero: "char-lobby", rarity: "epic", prices: [cash(1800)] },
    { id: "r2_3", name: "Grand Treasury (2,500 Coins)", type: "Currency", desc: "Massive bullion crate providing 2,500 R-Coins for maximum progression.", img: "coins", hero: "coins", rarity: "legendary", prices: [r(1500)], qty: 2500, grantsCash: 2500 },
    { id: "r2_4", name: "Siam Diamond Strike VFX", type: "Cosmetic, VFX", desc: "Unique hit spark and knockout camera flash during match finishes.", img: "fist", hero: "fist", rarity: "normal", prices: [cash(2000), r(1500)] },

    // ---- Store: featured ----
    { id: "seux_shorts", name: "Seux Phen", type: "Collection, 3 items", img: "store-seuxphen", banner: "banner-seuxphen", ratio: "2:1", pos: "50% 82%", rarity: "legendary", prices: [cash(2400), r(500)], timer: 88801,
      desc: "Collab drop with Seux Phen. Fight shorts, matching gloves and a cash bonus.",
      contents: [{ id: "seux_shorts_item" }, { id: "seux_gloves_item" }, { id: "cash_bonus_2500" }] },
    { id: "lumpinee_arena", name: "Lumpinee Night", type: "Arena, Fight night stage", img: "card-art", banner: "banner-lumpinee", ratio: "2:1", pos: "50% 45%", rarity: "legendary", prices: [cash(3200)], timer: 88801 },

    // ---- Store: gloves ----
    { id: "glove_mtx26", name: "MTX26 Street Art", type: "Gloves, 12 oz", img: "store-glove-mtx26", rarity: "rare", prices: [cash(500)], timer: 88801 },
    { id: "glove_black", name: "MTX Classic Black", type: "Gloves, 12 oz", img: "store-glove-black", rarity: "epic", prices: [cash(500), r(500)] },
    { id: "glove_sakura", name: "Sakura Kru", type: "Gloves, 10 oz", img: "store-glove-mtx26", rarity: "rare", prices: [r(500)] },
    { id: "glove_midnight", name: "Midnight Camp", type: "Gloves, 16 oz", img: "store-glove-black", rarity: "epic", prices: [cash(500)] },
    { id: "glove_temple", name: "Temple Fair", type: "Gloves, 12 oz", img: "store-glove-mtx26", rarity: "normal", prices: [cash(250)] },
    { id: "glove_shadow", name: "Shadow Teep", type: "Gloves, 12 oz", img: "store-glove-black", rarity: "normal", prices: [cash(250)], owned: true },
    { id: "glove_golden", name: "Golden Mongkol", type: "Gloves, Limited", img: "store-glove-mtx26", rarity: "legendary", prices: [cash(1800)], timer: 172800 },
    { id: "glove_ironshin", name: "Iron Shin", type: "Gloves, 14 oz", img: "store-glove-black", rarity: "rare", prices: [cash(650)] },
    // Store layout (Figma 980:96431): Ivory Kru with the black glove art
    { id: "glove_ivory", name: "Ivory Kru", type: "Gloves, Limited", img: "store-glove-black", rarity: "legendary", prices: [cash(1500)] },
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
    { id: "outfit_seux", name: "Seux Phen Fighter", type: "Fighter outfit", img: "char-lobby", rarity: "legendary", prices: [cash(2200), r(800)] },
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

  // ---- MTX Points (Store tab "MTX Points", Figma 980:96561): bought with real money through the platform (mock).
  // usd = platform price; grantsCash = MTX Points added; bonus = tag on the card; tag = preview chip instead of the rarity.
  const usd = (id, name, type, img, rarity, price, more) => ({ id, name, type, img, rarity, prices: [], usd: price, mock: true, ...more });
  LIST.push(
    usd("pts_500", "500 MTX Points", "MTX Points", "coins", "normal", 4.99, { qty: 500, grantsCash: 500 }),
    usd("pts_1100", "1,100 MTX Points", "MTX Points", "coins", "standard", 9.99, { qty: 1100, grantsCash: 1100, bonus: "+10%" }),
    usd("pts_2400", "2,400 MTX Points", "MTX Points", "coins", "rare", 19.99, { qty: 2400, grantsCash: 2400, bonus: "+20%" }),
    usd("pts_5000", "5,000 MTX Points", "MTX Points", "coins", "epic", 39.99, { qty: 5000, grantsCash: 5000, bonus: "+25%", tag: "Best value" }),
    usd("pts_10500", "10,500 MTX Points", "MTX Points", "coins", "legendary", 79.99, { qty: 10500, grantsCash: 10500, bonus: "+31%" }),
    usd("pts_21000", "21,000 MTX Points", "MTX Points", "coins", "legendary", 149.99, { qty: 21000, grantsCash: 21000, bonus: "+40%" }),
    usd("pts_first", "First Top-up x2", "MTX Points, 1,000 for the price of 500", "coins", "rare", 4.99, { qty: 1000, grantsCash: 1000, timer: 561600, desc: "One time only: double MTX Points on your first top-up." }),
    usd("pts_weekly", "Weekly Points", "MTX Points, 300", "coins", "standard", 2.99, { qty: 300, grantsCash: 300, timer: 561600 }),
    usd("pts_season", "Season Pass", "Pass, Season 1", "news-season", "epic", 9.99, { timer: 561600, owned: true }),
    usd("pts_tickets", "Ticket Stack", "Ticket, 5 tickets", "skin-b", "rare", 1.99, { stack: 99, qty: 5, timer: 561600 }),
    usd("pts_champion", "Champion Bundle", "Bundle, Robe + gloves + VFX", "char-lobby", "legendary", 24.99, { timer: 561600, ratio: "1:2" })
  );

  // ---- Rewards per Tactical style (screen-tactical.js STYLES): 3 Style Levels x 5 items, same rarity / price / ratio slots
  // as the Phra Nakhon list (r0_* .. r2_*). Mock names and art chosen to fit each style. reqR = R Level needed (locked until then).
  const SLOT = [   // [type, rarity, prices, more] per Style Level slot
    [["Gloves", "standard", [cash(500), r(500)]], ["Gloves", "rare", [cash(500), r(500)]], ["Fighter skin", "legendary", [cash(500), r(500)]],
     ["Currency", "normal", [r(500)], { qty: 500, grantsCash: 500 }], ["Tattoo, Body skin", "normal", [r(500)]]],
    [["Fighter skin", "epic", [cash(750), r(750)]], ["Gloves", "standard", [cash(600)]], ["Cosmetic, Banner", "rare", [r(600)]],
     ["Currency", "normal", [r(800)], { qty: 1000, grantsCash: 1000 }], ["Cosmetic, Avatar", "standard", [cash(1200)]]],
    [["Tattoo, Body skin", "standard", [cash(1500), r(1000)], { reqR: 20 }], ["Gloves", "legendary", [cash(900)]], ["Outfit, Robe", "epic", [cash(1800)]],
     ["Currency", "legendary", [r(1500)], { qty: 2500, grantsCash: 2500 }], ["Cosmetic, VFX", "standard", [cash(2000), r(1500)], { reqR: 30 }]]
  ];
  const STYLE_REWARDS = {   // [name, img, desc] in SLOT order
    north: [
      [["Swift Step Gloves", "cc-glove-5", "Light 10 oz gloves built for fast hands and quick resets."], ["Thasao Wind Gloves", "cc-glove-4", "Featherweight leather that never slows a combination."], ["Thasao Runner Skin", "fighter-samart", "Northern trunks cut for footwork, light and fast."], ["Tha Sao Coin Pouch", "coins", "500 bonus coins for your Tha Sao camp."], ["Lanna Ink Pack", "skin-a", "Two Lanna sak yant body skins for a swift fighter."]],
      [["Swift Kick Champion Skin", "fighter-knee", "Champion skin of the fastest kicker in the North."], ["Wind Step Wraps", "cc-glove-6", "Hand wraps for the in-and-out game."], ["Doi Night Arena Banner", "card-art", "Mountain night fight banner for your locker."], ["Tha Sao Vault (1,000 Coins)", "coins", "1,000 coins for career and cosmetic unlocks."], ["Lanna Kru Portrait", "cc-avatar-2", "Profile portrait of a Tha Sao teacher."]],
      [["Swallow Sak Yant", "skin-b", "Swallow tattoo for speed and quick escapes."], ["Golden Swallow Gloves", "cc-glove-3", "Gold trim gloves of a Tha Sao grandmaster."], ["Northern Ceremony Robe", "char-lobby", "Silk entrance robe in Lanna patterns."], ["Tha Sao Treasury (2,500 Coins)", "coins", "2,500 coins for maximum progression."], ["Flash Step VFX", "fist", "Light trail on every fast step and finish."]]
    ],
    west: [
      [["Precision Jab Gloves", "store-glove-mtx26", "Tight fit gloves for clean, accurate punches."], ["Tiger Blaze Gloves", "cc-glove-1", "Flame print gloves of the Lopburi tacticians."], ["Lopburi Tactician Skin", "fighter-samart", "Western trunks of a fighter who reads every move."], ["Lopburi Coin Pouch", "coins", "500 bonus coins for your Lopburi camp."], ["Feint Ink Pack", "skin-a", "Two body skins that hide your next move."]],
      [["Counter Knee Champion Skin", "fighter-knee", "Champion skin of the best counter fighter in the West."], ["Slip Guard Wraps", "cc-glove-6", "Wraps for slips, feints and counters."], ["Monkey Temple Banner", "card-art", "Lopburi temple fight night banner."], ["Lopburi Vault (1,000 Coins)", "coins", "1,000 coins for career and cosmetic unlocks."], ["Kru Tactician Portrait", "cc-avatar-1", "Profile portrait of a Lopburi teacher."]],
      [["Deception Sak Yant", "skin-b", "Tattoo of the trickster, for deception and timing."], ["Golden Feint Gloves", "cc-glove-3", "Gold trim gloves of a Lopburi grandmaster."], ["Lopburi Master Robe", "char-lobby", "Silk entrance robe in sunset colours."], ["Lopburi Treasury (2,500 Coins)", "coins", "2,500 coins for maximum progression."], ["Perfect Read VFX", "fist", "Hit spark on every clean counter."]]
    ],
    phranakhon: null,   // Phra Nakhon keeps the original list r0_* .. r2_*
    isan: [
      [["Heavy Hand Gloves", "cc-glove-2", "16 oz gloves for heavy, wide punches."], ["Volt Strike Gloves", "cc-glove-5", "Gloves that put weight behind every shot."], ["Korat Brawler Skin", "fighter-samart", "Isan trunks of a fighter who hits like a buffalo."], ["Korat Coin Pouch", "coins", "500 bonus coins for your Korat camp."], ["Buffalo Ink Pack", "skin-a", "Two body skins for power and force."]],
      [["Buffalo Swing Champion Skin", "fighter-knee", "Champion skin of the Buffalo Swing Punch."], ["Iron Fist Wraps", "cc-glove-6", "Thick wraps for heavy strikes."], ["Khorat Plateau Banner", "card-art", "Isan festival fight night banner."], ["Korat Vault (1,000 Coins)", "coins", "1,000 coins for career and cosmetic unlocks."], ["Buffalo Kru Portrait", "cc-avatar-2", "Profile portrait of a Korat teacher."]],
      [["Buffalo Sak Yant", "skin-b", "Buffalo tattoo for devastating force."], ["Golden Buffalo Gloves", "cc-glove-3", "Gold trim gloves of a Korat grandmaster."], ["Korat Warlord Robe", "char-lobby", "Heavy silk entrance robe of the Isan champion."], ["Korat Treasury (2,500 Coins)", "coins", "2,500 coins for maximum progression."], ["Knockout Roar VFX", "fist", "Shockwave on every heavy knockout."]]
    ],
    south: [
      [["Guard Cover Gloves", "cc-glove-8", "Padded gloves for a tight, high guard."], ["Pearl Deflect Gloves", "cc-glove-6", "Gloves made to deflect and cover."], ["Chaiya Guardian Skin", "fighter-samart", "Southern trunks of a fighter who never opens up."], ["Chaiya Coin Pouch", "coins", "500 bonus coins for your Chaiya camp."], ["Guard Ink Pack", "skin-a", "Two body skins of the Chaiya guard."]],
      [["Elbow Guard Champion Skin", "fighter-knee", "Champion skin of the close range master."], ["Close Guard Wraps", "store-glove-black", "Wraps for elbows, knees and the clinch."], ["Gulf Night Arena Banner", "card-art", "Southern coast fight night banner."], ["Chaiya Vault (1,000 Coins)", "coins", "1,000 coins for career and cosmetic unlocks."], ["Chaiya Kru Portrait", "cc-avatar-1", "Profile portrait of a Chaiya teacher."]],
      [["Guard Sak Yant", "skin-b", "Guard, deflect, cover and open, in ink."], ["Golden Guard Gloves", "cc-glove-3", "Gold trim gloves of a Chaiya grandmaster."], ["Chaiya Temple Robe", "char-lobby", "Silk entrance robe of the southern temple."], ["Chaiya Treasury (2,500 Coins)", "coins", "2,500 coins for maximum progression."], ["Iron Wall VFX", "fist", "Spark on every perfect block and counter."]]
    ]
  };
  const REWARD_IDS = { phranakhon: [0, 1, 2].map(l => [0, 1, 2, 3, 4].map(i => `r${l}_${i}`)) };
  Object.entries(STYLE_REWARDS).forEach(([style, levels]) => {
    if (!levels) return;
    REWARD_IDS[style] = levels.map((row, l) => row.map(([name, img, desc], i) => {
      const [type, rarity, prices, more] = SLOT[l][i], id = `rw_${style}_${l}_${i}`;
      LIST.push({ id, name, type, desc, img, rarity, prices, mock: true, style, ...(img === "skin-a" ? { imgExtra: "skin-b" } : {}), ...more });
      return id;
    }));
  });

  // Generated item art (docs/item-art-prompts.md, sheets in assets/img/gen, one webp per item in assets/img/items, 2026-11-26).
  // These items use their own picture on the card and in the preview; 2:1 banners keep the Figma banner art.
  const ART = new Set(["bundle_champion","bundle_season","card_common","card_epic","card_legendary","card_rare","cash_bonus_2500","cash_pack","cc_glove_1","cc_glove_2","cc_glove_3","cc_glove_4","cc_glove_5","cc_glove_6","cc_glove_7","cc_glove_8","cos_avatar_1","cos_avatar_2","cos_badge_beast","cos_badge_sorcerer","cos_belt_1","cos_vinyl","emote_rammuay","emote_victory","emote_waikhru","fighter_kru","fighter_naga","fighter_samart","glove_black","glove_golden","glove_ironshin","glove_ivory","glove_midnight","glove_mtx26","glove_sakura","glove_shadow","glove_temple","outfit_camp","outfit_gold","outfit_ringside","outfit_seux","pack_emote","pack_gloves","pack_ink","pack_legend","pack_rookie","pts_10500","pts_1100","pts_21000","pts_2400","pts_500","pts_5000","pts_champion","pts_first","pts_season","pts_weekly","r0_0","r0_1","r0_2","r0_3","r0_4","r1_0","r1_1","r1_2","r1_3","r1_4","r2_0","r2_1","r2_2","r2_3","r2_4","rw_isan_0_0","rw_isan_0_1","rw_isan_0_2","rw_isan_0_3","rw_isan_0_4","rw_isan_1_0","rw_isan_1_1","rw_isan_1_2","rw_isan_1_3","rw_isan_1_4","rw_isan_2_0","rw_isan_2_1","rw_isan_2_2","rw_isan_2_3","rw_isan_2_4","rw_north_0_0","rw_north_0_1","rw_north_0_2","rw_north_0_3","rw_north_0_4","rw_north_1_0","rw_north_1_1","rw_north_1_2","rw_north_1_3","rw_north_1_4","rw_north_2_0","rw_north_2_1","rw_north_2_2","rw_north_2_3","rw_north_2_4","rw_south_0_0","rw_south_0_1","rw_south_0_2","rw_south_0_3","rw_south_0_4","rw_south_1_0","rw_south_1_1","rw_south_1_2","rw_south_1_3","rw_south_1_4","rw_south_2_0","rw_south_2_1","rw_south_2_2","rw_south_2_3","rw_south_2_4","rw_west_0_0","rw_west_0_1","rw_west_0_2","rw_west_0_3","rw_west_0_4","rw_west_1_0","rw_west_1_1","rw_west_1_2","rw_west_1_3","rw_west_1_4","rw_west_2_0","rw_west_2_1","rw_west_2_2","rw_west_2_3","rw_west_2_4","seux_gloves_item","seux_shorts_item","stage_mtx","tattoo_skull","ticket_1","ticket_5"]);
  LIST.forEach(it => {
    if (!ART.has(it.id)) return;
    const person = /^(fighter|char)/.test(it.img);   // fighter / char art: 1:2 card, preview = Fighter Model
    it.ratio = it.ratio || (person ? "1:2" : "1:1");
    if (person) it.person = true;
    it.img = `items/${it.id}`;
    it.hero = it.img;
    delete it.imgExtra;
  });
  const ART_ALIAS = { pack_rookie_item: "pack_rookie", pts_tickets: "ticket_5" };   // same picture as that item
  LIST.forEach(it => { if (ART_ALIAS[it.id]) { it.ratio = it.ratio || "1:1"; it.img = it.hero = `items/${ART_ALIAS[it.id]}`; delete it.imgExtra; } });

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
    rewardIds: style => REWARD_IDS[style] || REWARD_IDS.phranakhon,   // Rewards: [Style Level][slot] item ids of a Tactical style
    src: name => name.includes(".") ? `mtx/assets/${name}` : `mtx/assets/img/${name}.webp`
  };
})();
