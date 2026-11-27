# MTX Store: handoff bundle for a browser AI

You are helping design and build **Store prototype variants** for a game-menu HTML prototype (vanilla JS, no build step, 1920x1080 stage).
You cannot open the project or run it. Everything you need is in this file:
1. The Store handoff (how the system works, data model, APIs, how to add a variant).
2. The source of the files a variant reuses: item data, item card, Store screen, Store/Pack markup and Store CSS.

How to answer:
- Return **complete new files** (e.g. `mtx/js/screens/screen-store-<v>.js`, `mtx/css/store-<v>.css`) plus **exact snippets** to insert into `index.html` (the new `<section>`, the `<link>` and `<script>` lines), each with where it goes.
- Do not rewrite the existing Store files; build the variant as a separate screen, as the handoff describes.
- Keep to the rules in the handoff: unique `data-bind` names, `?v=` cache versions, `:hover` CSS prefixed with `body.input-mouse`, no "·" middle dot in UI text, no progress bars, no brush / graffiti decoration.
- File paths and line numbers below (e.g. `screen-store.js:387`) refer to the real project; the person will apply your code there and test it.

---

# Store system handoff (for building Store prototype variants)

Snapshot 2026-11-27. All paths are relative to `mtx-controller-flow/` unless noted. Line numbers are from that date; re-grep before you edit.

## 0. Project basics (read first)

| Thing | Value |
|---|---|
| Stack | Vanilla JS IIFEs, no build step, no modules. 1920x1080 stage scaled to the window. |
| Screens | `section.screen[data-screen="key"]` in `index.html`; `window.MTX.show(key)` switches; deep link `#screen=key` (app.js:2098-2116) |
| Dev server | `node tools/bake-server.mjs` -> http://127.0.0.1:8765 (preview launch config `mtx` in `../.claude/launch.json`) |
| Cache versions | Every css/js `<link>`/`<script>` in index.html has `?v=`. **Bump it on every change** to that file, or the browser serves the old one. |
| Line endings | All source files are **CRLF** (screen-store.js, items.js, index.html, screens.css, app.js, dev-pages.js). Keep CRLF when writing. |
| Git | repo root = `mtx-controller-flow`, remote `nattaset-panlek/MTXUI-Prototype`, branch `main`. Commit / push only when the user asks. |
| General conventions | `docs/handoff.md` top sections (pointer input, publish rules, 25 MiB Cloudflare limit) |
| Figma file | key `eKm2meOcqHG0cFBt4eoWQr` |

## 1. Files

| File | Role |
|---|---|
| `mtx/js/screens/screen-store.js` (568 lines) | Store screen (3 tabs: Store / Rewards / MTX Points) + Pack screen. Registers `MTX_SCREENS.store`, `MTX_SCREENS.pack`, `window.MTX_STORE_TABS`. |
| `mtx/js/screens/screen-rewards.js` (376) | Old standalone Rewards screen `#s-rewards` (index.html:664). **Effectively unreachable**: app.js:159 redirects `show("rewards")` to the Store's Rewards tab. Only its Q/E and tab clicks forward to `MTX_STORE_TABS`. Don't build on it. |
| `mtx/js/data/items.js` (227) | `window.MTX_ITEMS`: the item database (all Store, pack-content, MTX Points and Rewards items). |
| `mtx/js/components/item-card.js` (62) | `MTX_UI.itemCard / itemLabel / itemPriceLabel`: the card HTML (Figma Item Slot Corner). |
| `mtx/js/components/dialog.js` | `MTX_UI.dialog.open({...})`: the buy / unlock confirm popup (header comment lines 1-12 = API). |
| `mtx/js/components/pointer-input.js` | `MTX_POINTER`: mouse vs keys, `data-pointer="hover"`, `isHoverPick()`. |
| `mtx/js/player.js` | `MTX_PLAYER`: owns **Cash** (`state.cash`, default 19523) and L credits; saved in `localStorage["mtx.player"]`; fills `[data-pl-cash]` in every HUD (player.js:242). |
| `index.html:590-627` | `#s-store` markup. |
| `index.html:630-661` | `#s-pack` markup. |
| `index.html:43-70` | `<template id="tpl-player-hud">` incl. wallet cells (`data-pl-l`, `data-pl-cash`, `data-pl-tickets`, `data-store-r`). |
| `mtx/css/screens.css:8616-8707` | **Current** Store layout (Figma 980:96431 / 980:96561 / 980:96284). Overrides everything earlier. |
| `mtx/css/screens.css:5091-5316` | Old Store layout (Figma 128:99). Still loaded, mostly overridden or hidden (title, balance, desc, price). |
| `mtx/css/screens.css:5318-5410` | Pack page (`.pk-*`). |
| `mtx/css/screens.css:7816-7896, 7910-7913` | Item card component CSS (`.item-card`, `.item-label`, `.item-state`, rarity corner, `--k` scale). |
| `mtx/css/components.css:482-484, 625-631` | Wallet `player-hud--rpoint` variant; Store shows Money + R Point only. |
| `mtx/js/dev-pages.js:22-25` | Dev Tools > Pages list (Store group). |
| `mtx/js/components/nav-graph.js:126, 153` | Navigation graph page list (Store group) and `pack: { in: ["store"] }`. |

Script order matters (index.html:1668-1716): `items.js` -> `item-card.js` -> ... `screen-store.js` (1700) -> `dialog.js` -> `pointer-input.js` -> `app.js` (1716). screen-store.js reads `window.MTX_ITEMS` at load time (screen-store.js:8), so a new module must load **after** items.js and **before** app.js (app.js calls `bindApi`/`init` of every `MTX_SCREENS` entry once, app.js:2091-2092).

Current versions to bump: `screens.css?v=st160-hv1` (index.html:31), `items.js?v=8-art3` (1668), `item-card.js?v=corner5` (1669), `screen-rewards.js?v=db1-unlock1-st9-r35` (1695), `screen-store.js?v=db9-r2-sl15-r35` (1700), `app.js?v=...-r35` (1716), `dev-pages.js?v=3` (1723).

## 2. Data model (`mtx/js/data/items.js`)

### Item fields (header comment items.js:4-19, plus later additions)

| Field | Meaning |
|---|---|
| `id`, `name`, `type`, `desc` | `type` = short line under the name ("Gloves, 12 oz") |
| `rarity` | `normal` `standard` `rare` `epic` `legendary` (key into `RARITY`) |
| `img` | card art: name in `mtx/assets/img/` (no ext, `.webp` added) or a path under `mtx/assets/` with ext (`svg/icon-ticket.svg`). Resolved by `MTX_ITEMS.src()` (items.js:225) |
| `hero` | big preview art (default = `img`); `imgExtra` = second art on the card (pair) |
| `ratio` | `"1:1"` default, `"1:2"` tall (fighter / char art, auto from `img` matching `^(fighter|char)`), `"2:1"` wide banner |
| `banner`, `pos` | 2:1 card art (already cropped) / object-position for 2:1 |
| `prices` | `[{ type: "cash" | "r" | "credit", val }]`; several = alternatives. `credit` is defined but unused by the Store |
| `usd` | MTX Points tab only: platform price in $ (prices = []) |
| `qty`, `grantsCash` | amount per purchase; Cash added on purchase (coins / points) |
| `stack` | max owned of a consumable (tickets: 99); no stack = single purchase |
| `timer` | limited offer seconds (only used for section header "Ends in", card timer is disabled) |
| `contents` | `[{ id }]` = pack / bundle; a record with contents opens the Pack page |
| `bonus`, `tag` | MTX Points: card tag ("+25%") / preview chip text instead of rarity ("Best value") |
| `owned` | mock "always owned" (`glove_shadow`, `pts_season`) |
| `mock` | name / price invented for the prototype |
| `person` | set by the ART pass for fighter/char art: preview shows `fighter-model` |
| `reqR`, `style` | Rewards: R Level needed (locked until then) / Tactical style id |
| `isNew` | dead (no badge since 2026-11-26) |

Normalisation at the end (items.js:197-217): items in the `ART` set get `img = hero = "items/<id>"` (generated art, `mtx/assets/img/items/*.webp`), `ART_ALIAS` copies art; every item gets `ratio`, `hero`, `prices` defaults.

### RARITY (items.js:21-27) and card corner colours (item-card.js:24-27)

| key | label | `RARITY.color` (chip, `--rar`) | corner hi / lo |
|---|---|---|---|
| normal | Normal | #9a9ea8 | #9a9ea8 / #5c5f65 |
| standard | Standard | #c3fd0b | #c3fd0b / #76980a |
| rare | Rare | #6100ff | #8b5cff / #533799 |
| epic | Epic | #d9302e | #e5413c / #892724 |
| legendary | Legendary | #f3ad3b | #f3ad3b / #926823 |

Sections sort items Normal -> Legendary (`RARITY_ORDER`, screen-store.js:13).

### Item groups

| Group | ids | items.js |
|---|---|---|
| Phra Nakhon rewards | `r0_0..r2_4` (3 Style Levels x 5) | 33-48 |
| Featured (2:1) | `seux_shorts` (pack, 3 contents), `lumpinee_arena` | 50-54 |
| Gloves | `glove_*`, `cc_glove_1..8` | 56-75 |
| Fighters / outfits | `outfit_*`, `fighter_kru/naga/samart` | 77-85 |
| R Shop (R only) | `tattoo_skull`, `cos_*`, `emote_*`, `stage_mtx` | 87-98 |
| Packs / bundles | `pack_legend`, `pack_rookie`, `bundle_season`, `pack_gloves`, `pack_ink`, `pack_emote`, `bundle_champion` | 100-121 |
| Currency / tickets | `cash_pack` (R 600 -> +5000 Cash), `ticket_1`, `ticket_5` (stack 99) | 122-124 |
| Pack-only contents | `seux_*_item`, `cash_bonus_2500`, `pack_rookie_item`, `card_*` | 126-134 |
| MTX Points (usd) | `pts_500..pts_21000`, `pts_first`, `pts_weekly`, `pts_season`, `pts_tickets`, `pts_champion` | 137-152 |
| Style rewards | `rw_<style>_<level>_<slot>` for north / west / isan / south, built from `SLOT` x `STYLE_REWARDS` | 154-195 |

`MTX_ITEMS.rewardIds(style)` -> `[[5 ids], [5 ids], [5 ids]]`; unknown style -> phranakhon list (items.js:224).

### What the Store sells (screen-store.js)

- `SECTIONS` (22-32): Featured, Gloves, Fighters & outfits, Tattoos & skins, R Shop, Arena & VFX, Packs & bundles, Currency & tickets.
- `SECTIONS_FIGMA` (15-20): the exact Figma 980:96431 sample, **unused** (kept for reference).
- `POINTS` (34-37): "MTX Points" + "Limited offers" (MTX Points tab).
- Rewards tab: `rewardSections()` (42) = Style Level 1-3 of the current Tactical style (`styleId()` 40: tactical screen -> `localStorage["mtx.style"]` -> `phranakhon`).
- `STORE = { store, rewards (getter), points }` (45-49); `mode` picks one.

### Currencies and balances

| Currency | Where it lives | Shown in |
|---|---|---|
| Cash ("Money") | `MTX_PLAYER.get().cash`; store mirrors it in `cash` (62, 169-170), writes back with `P().set({cash})` | HUD `[data-pl-cash]` (all screens) |
| R points | `localStorage["mtx.store_r"]` (default 1500), **not** in MTX_PLAYER | `[data-store-r]` wallet cell, only on `data-variant="rpoint"` HUD (index.html:621) |
| MTX Points (usd items) | bought with mock $; `grantsCash` is **added to Cash** (buyPlatform 510-529) | toast says "MTX Points added" |
| L / MTX Credit | `MTX_PLAYER.state.l` | HUD `[data-pl-l]`, hidden on Store (components.css:629-631) |
| Tickets | items `ticket_1/5`, `pts_tickets` counted in `stacks` only | HUD `[data-pl-tickets]` is **not** updated by the Store |

### Owned / claimed / locked rules

| Function | Rule | line |
|---|---|---|
| `isOwned(it)` | `it.owned` -> true; `grantsCash` or `stack` -> never owned; else in `owned` set or in `rewards_claimed` | 94-98 |
| `claimedSet()` | CSV `rewards_claimed` | 78 |
| `lockLevel(it)` | `it.reqR` or `REQ_R_LEVEL` placeholder vs `MTX_PLAYER.get().r.level`, 0 if claimed | 79-84 |
| `rewardPrice(it)` | R price, else the Cash number used as R (placeholder) | 86 |
| `storeLabel(it)` | usd -> `$x.xx` qty chip; owned -> "Owned" veil; else first of cash, r | 108-111 |
| `rewardLabel(it)` | Unlocked veil / locked "R LV n" / R price | 87-91 |
| `sectionCount(sec)` | `sec.count`, else "Ends in nD hhH" (Featured, or all timed), else "n items" | 286-290 |

### localStorage keys (`api.store` prefixes `mtx.`, app.js:15-18)

| Key | Format | Written by |
|---|---|---|
| `mtx.store_r` | number | store buy / unlock, resetStore |
| `mtx.store_owned` | JSON array of ids | store buy / buyPlatform |
| `mtx.store_stacks` | JSON `{id: count}` | store buy / buyPlatform |
| `mtx.rewards_claimed` | CSV ids | unlockReward; first enter seeds `r0_0,r0_2,r0_3,r0_4` (275) |
| `mtx.rewards_fig1` | "1" | one-time seed flag (275) |
| `mtx.rewards_page` | number | old Rewards screen only |
| `mtx.player` | JSON (cash, l, levels) | MTX_PLAYER (old `mtx.store_cash` migrated, player.js:109) |
| `mtx.style` | style id | Tactical screen |

Reset for testing: `MTX_SCREENS.store.resetStore()` (531-542; not wired to any UI, does not clear `rewards_claimed`).

## 3. Item card component (`item-card.js`)

```js
MTX_UI.itemCard(idOrItem, { label, cls, attrs, style, badge })  // -> <a class="item-card reward-tile focus-ring ..." data-nav data-id="...">
MTX_UI.itemLabel(type, value)       // "money" | "credit" | "r" | "qty" | "name" chip; "status" | "locked" | "timer" = veil
MTX_UI.itemPriceLabel(item, ["cash","r"])   // chip of the first price found, else name chip
```
- Card is focusable because it has `data-nav data-id` (app.js navigation picks it up geometrically).
- Size comes from the grid cell; inner sizes scale with `--k` = short side / 156 (container query units, screens.css:7846).
- Classes: `item-card--tall` (1:2), `item-card--wide` (2:1), state `is-focused`, `is-pressed`, `is-claimed`, `is-locked`, `is-bought` (0.5 s flash, added by store).
- Extra Store-only children: `.item-card__name` (2:1 name), `.item-card__amount`, `.item-card__bonus` (MTX Points); see cardHtml 123-134.

## 4. Store screen flow and input

### Markup `#s-store` (index.html:590-627)
`data-first="seux_shorts"`, `data-pointer="hover"`. Key binds (`data-bind`): `storeList` (inside `.st-view`), `storeScroll` / `storeThumb`, `storeHero`, `storeRarity`, `storeKind`, `storeName`, `storeType`, `storeDesc`, `storePrice`. Tabs = `nav.lb-tabs.rw-tabs` with `[data-rw-tab="store|rewards|points"]` and glyphs `lt` (Q) / `rt` (E). Hint bar `data-hints='{"b":"Back","a":"Buy","ls":"Move"}'`; `applyMode` relabels "Buy" -> "Purchase" (points) / "Unlock" (rewards) (207-208). HUD `data-variant="rpoint"`.

CSS hides title, balance, desc, price, type (screens.css:8621): the visible detail is rarity chip + type + name + hero art.

### Lifecycle

| Step | What happens | line |
|---|---|---|
| `init(api)` | load balances, `render()`, wallet, wheel scroller, tab click listeners, `mtx:style` listener, list click -> `startHold(card)` (non-pack) | 167-192 |
| `enter()` | seed rewards once, `applyMode(pendingMode or "store")`, reload R, `render()`, start timer tick | 273-283 |
| app.js `show()` | after `enter()`: focus `remembered` id (on back) or `data-first`; `applyMode` sets `data-first` per tab via `firstOf()` (50-52) | app.js:158-185 |
| `focus(el)` | `renderDetail(item)`; then scroll the list into view **unless** `MTX_POINTER.isHoverPick()` | 361-379 |
| `render()` | rebuild `storeList` HTML; Store tab splits each section into 2:1 / 1:1 / 1:2 grids so shapes leave no holes; resets scroll to 0 | 292-310 |
| `renderDetail(it)` | hero src (skin -> `fighter-model`, coins -> `coins-big`), toggles `rewards--skin` / `store--points`, fills rarity / kind / name | 137-159 |

### Tabs (Store | Rewards | MTX Points)
- Keys: keyboard **Q / E**, pad **LB / RB** (pad buttons 4/5 map to actions `lt`/`rt`, app.js:626; keyboard map app.js:443). Glyph labels show LB/RB, L1/R1 or Q/E by device.
- `onInput(a)` handles `lt`/`rt` -> `stepTab(mode, +-1)` (wraps) (228-236). Click on a tab -> `goTab`.
- `setMode` re-renders, focuses `firstOf(mode)`, rumbles; tab change is instant (motion disabled by `instant()`, 219-223).
- `window.MTX_STORE_TABS = { go, step, pend }` (231). `pend("rewards")` makes the next Store open start on that tab (used by app.js:159).

### Buy flow (no real hold any more)
Names are legacy: `canHold` / `startHold` / `cancelHold` now open a **confirm dialog**, not a hold.

| Trigger | Path |
|---|---|
| Keyboard Space/Enter on store/pack | app.js:476-480 -> `scrStore.canHold()` -> `startHold()` |
| Pad A | app.js:664-668 same |
| Mouse click on card | app.js:559 `ownsClick(el)` (= `canHold()`) stops app's `confirm()`; the store's own list click listener (186-191) calls `startHold(card)` |
| Pack card (has `contents`) | `canHold()` false -> app `confirm()` -> `data-fn="openPack"` -> `actions.openPack` -> `packId`, `api.show("pack")` (557-564) |

`startHold(card)` (394-405): dialog open -> ignore; Rewards tab -> `openUnlock`; owned -> toast "already owned"; stack full -> toast; else `openBuy`.

`openBuy(item)` (410-435):
- `usd` item: "Purchase X?" dialog, primary `$x.xx` -> `buyPlatform` (no balance check).
- Cash and R: primary = Cash (A), secondary = R (`secondaryKey: "x"`), `closeHint: "Cancel"`.
- One price: primary price, secondary "Cancel".

`buy(item, card, useCash)` (439-472): balance check (toast "Not enough Cash / R points, need n more" + rumble), deduct, then `grantsCash` -> cash; `stack` -> stacks; else owned. Pack: owned + sum of contents' `grantsCash`. Saves keys, re-labels card, `is-bought` flash, toast "Bought X for n Cash/R", `api.log`.

`openUnlock` / `unlockReward` (475-508): claimed -> toast; locked -> toast "Requires R Level n"; dialog with R price; deduct `store_r`, add to `rewards_claimed`, update "x/5 Unlocked" headers.

### Scroll
List scrolls by `transform: translateY` stored in `storeList.dataset.y` (not native scroll). `scrollState` / `updateScroller` / `bindScroller` (313-343): wheel on `.st-view`, thumb min 48 px, bar placed 42 px right of the panel. Keyboard focus scrolls via `focus()`; a section's first row also reveals its title.

### Mouse
`data-pointer="hover"`: a real mouse move over a `[data-nav]` calls `setFocus` inside `picking=true` (pointer-input.js:44-57), so the preview follows the cursor but the list does not jump. Wheel scrolls. Keys continue from the hovered item.

## 5. Pack screen (`#s-pack`, index.html:630-661)

- Binds: `packTitle`, `packDesc`, `packItems` (tiles), `packPrice`, `packBuy` (`.btn-cta`), `packPreview`, `packPreviewName`.
- `packScreen = { ownsClick, bindApi, init, enter: renderPack, focus }` (265-271). Tiles are item cards with id `pk0..pkN` (`data-first="pk0"`), class `pk-card`; 4+ items -> `.is-many` (176 px tiles).
- `focus(pk-card)` -> `showPackItem(i)` big preview. A anywhere on Pack -> `startHold()` buys the pack (`canHold` = `!!packId`). B = back to Store (focus restored by `remembered`).
- Buying marks the pack id owned only; its non-cash contents are **not** marked owned.

## 6. Figma references

| Node | What |
|---|---|
| `980:96431` | "Store - store layout" (current Store tab; CSS 8618-8707; `SECTIONS_FIGMA` sample) |
| `980:96561` | MTX Points tab layout |
| `980:96284` (section `980:96283`) | "Rewards - store layout" (Rewards tab, seed of 4/5 unlocked) |
| `980:96555` / `980:96425` | lb-tabs |
| `980:96450` | rarity + type row |
| `980:96461`, `980:96465` | 2:1 banner card, its price chip |
| `980:96285` | screen bg (exported as `store-bg.webp`) |
| `980:89494`, `980:89544`, `980:89732` | Item Slot Corner, Corner Label, Corner State (item-card.js) |
| `980:89423`, `980:89689` | card texture 1:1 / 1:2 |
| `719:78179` | MTX / Scrollbar |
| `128:99`, `128:437` | old Store frame / Pack collection frame (Pack still follows 128:437) |
| `394:172991` | old Item Slot (rarity names) |

File key `eKm2meOcqHG0cFBt4eoWQr`. URL form: `https://www.figma.com/design/eKm2meOcqHG0cFBt4eoWQr/?node-id=980-96431`.

## 7. Public API

### `window.MTX_SCREENS.store` (545-566)

| Member | Use |
|---|---|
| `bindApi(api)`, `init(api)`, `enter()`, `focus(el)` | app.js lifecycle hooks |
| `onInput(a)` | takes `lt`/`rt` (tabs); return true = handled |
| `ownsClick()` | true when the focused card is buyable (app.js skips its click confirm) |
| `canHold()`, `startHold(card?)`, `cancelHold()` | buy entry points (app.js A key / pad A); cancelHold is a no-op |
| `goTab(tab)` | `"store"`, `"rewards"`, `"points"` |
| `resetStore()` | reset Cash, R, owned, stacks |
| `actions.openPack(el)` | `data-fn="openPack"` on pack cards |

`window.MTX_SCREENS.pack` (267-271, 567). `window.MTX_STORE_TABS = { go, step, pend }` (231). `window.MTX_SCREENS.rewards` (screen-rewards.js:352-375, legacy).

### `window.MTX_ITEMS` (items.js:219-226)
`RARITY`, `get(id)`, `all()`, `price(item, type)`, `rewardIds(style)`, `src(name)`.

### Core `api` passed to screens (app.js:2082-2090)
`$`, `$$`, `bind(name, scope=document)`, `store.get/set` (prefix `mtx.`), `toast`, `rumble(ms, strength)`, `log(msg, kind)`, `show`, `back`, `setFocus`, `getCur`, `getFocused`, `getDevice`, `screens`, `getScreen`.

### app.js hooks the Store relies on
- `screens` map built from every `.screen[data-screen]` (app.js:124-125). No registration list: a new section + a `MTX_SCREENS[key]` object is enough.
- `show()` redirect rewards -> store (159), `enter()` call (175), focus `data-first` (178-180).
- Hard-coded `cur === "store" || cur === "pack"` for A (476, 664) and cancelHold calls (527, 541, 707).
- `onInput` dispatch (423), `runFn` -> `actions[name]` of current screen first, then any screen (246-256), stage click `ownsClick` (559).
- Entry points: Main Menu and Ultimate Fight shop buttons `data-go="store"` (index.html:143, 296), Style Hub Reward card `data-go="rewards"` (372).

## 8. How to build a new Store variant safely

### Recommended: a new screen next to the old one
Keep `#s-store` + `screen-store.js` untouched. Add `#s-store-<v>` + `mtx/js/screens/screen-store-<v>.js` registering `MTX_SCREENS["store<v>"]` (key `[a-z0-9]`, deep link regex is `\w+`). Reuse `MTX_ITEMS`, `MTX_UI.itemCard`, `MTX_UI.dialog`, `MTX_PLAYER` and the same localStorage keys so variants share wallet / owned state.

| Reuse as-is | Copy and rename |
|---|---|
| `MTX_ITEMS` (data), `MTX_UI.itemCard/itemLabel/itemPriceLabel`, `MTX_UI.dialog`, `MTX_PLAYER`, `tpl-player-hud` (`data-use="player-hud" data-variant="rpoint"`), hint bar (`nav.hint-bar data-hints`), `.scrollbar` component, `lb-tabs` | section list, `render`, `renderDetail`, `focus`, buy logic (copy `isOwned`, `buy`, `openBuy` from screen-store.js 94-98, 410-472) |

### Steps
1. **Markup** (index.html): copy the `#s-store` section (590-627) after it. Change `id`, `data-screen`, `data-first`, and **every `data-bind` name** (e.g. `storeList` -> `st2List`). `api.bind(name)` searches the whole document and returns the first match, so duplicate bind names would hijack the old Store. Keep `data-pointer="hover"`.
2. **CSS**: new rules scoped under `#s-store-<v>`; put them in a new file `mtx/css/store-<v>.css` with its own `<link ...?v=1>` after screens.css (index.html:31). Copying `#s-store` rules from screens.css:8616-8707 means renaming the selector. `.st-*` and `.item-card` base rules are global, reuse them.
3. **JS module**: IIFE, `window.MTX_SCREENS = window.MTX_SCREENS || {}`; export `{ bindApi, init, enter, focus, onInput, ownsClick, actions }`. Add `<script src="mtx/js/screens/screen-store-<v>.js?v=1">` after screen-store.js (index.html:1700), before app.js.
4. **A / buy**: app.js only routes A to `startHold` for `store`/`pack`. For a new key, without touching app.js:
   - keyboard / pad A falls through to `onInput(a)` (app.js:423): handle `a === "a"` there (return true), and check `MTX_UI.dialog.isOpen()` first;
   - mouse: `ownsClick: () => true` for buyable cards + your own click listener on the list (as screen-store.js:185-191), or give cards `data-fn="buyX"` and an `actions.buyX(el)`.
   - Packs: reuse `MTX_SCREENS.store.actions.openPack` only if `packId` logic suits; otherwise build your own pack view.
5. **Tabs**: `onInput` `lt`/`rt` for your own tabs. Do **not** override `window.MTX_STORE_TABS` (app.js uses it for the Rewards redirect).
6. **Scrolling**: either copy the transform scroller (313-343) or use native `overflow:auto` + `MTX_UI.syncScrollbar` (as Rewards). In `focus()` skip scroll-into-view while `MTX_POINTER.isHoverPick()`.
7. **Dev Tools page**: add `{ id: "store<v>", name: "Store (variant X)" }` to the Store group in `mtx/js/dev-pages.js:22-25`, and optionally to nav-graph.js:126. Bump `dev-pages.js?v=` (index.html:1723).
8. **Entry**: leave the Main Menu shop button on the old Store unless the user asks. Open variants with Dev Tools > Pages or `#screen=store<v>`.
9. **Variant switch (alternative)**: only if the user wants one Store with switchable looks: a class on `#s-store` (e.g. `store--v2`) set from a Dev toggle, CSS scoped under it. Riskier: touches the live Store.

### Verify in the preview
- Start: `preview_start` name `mtx`, open `http://127.0.0.1:8765/#screen=store<v>`.
- One `javascript_tool` call: `location.reload()` is not needed if you navigate with a new hash; check `MTX.show("store<v>")`, `document.querySelector("#s-store-<v>.is-active")`, card count, `getComputedStyle` of key boxes, and console errors (`read_console_messages onlyErrors`).
- Also open the old `store` and `pack` to confirm they still work (tabs Q/E, buy dialog, pack open).
- Screenshot only at the end, smallest useful area (project CLAUDE.md token rules).

### Pitfalls
- Bump `?v=` for every changed css/js file (and for index.html links you add).
- Keep CRLF line endings.
- Assets: one file max **25 MiB** (Cloudflare publish limit). Use `.webp` in `mtx/assets/img/` (or `items/`).
- `:hover` CSS must be prefixed `body.input-mouse` (e.g. `body.input-mouse #s-store-v2 .item-card:hover`), else hover shows while using the pad.
- No middle dot "·" in UI text or layer names; use space, " | " or " - ".
- User taste: no progress bars, no graffiti / brush / splatter decor; clear numbers instead.
- Chips / tags / badges: centre text on the box axis with cap-height trim (`text-box: trim-both cap alphabetic`, screens.css:8649-8653), not line-height.
- Don't break the existing Store: no edits to screen-store.js / `#s-store` CSS unless asked; scope all new CSS by the new section id.
- screens.css is 8.7k lines and later rules win; new Store CSS in its own file avoids accidental overrides.
- `render()` in the old Store resets the scroll; `app.js` re-focuses `remembered[key]` on back, so give every card a stable `data-id`.
- The user is Thai and wants short, plain replies.

## 9. Known gaps / TODOs

- Function names say "hold" but buying is a dialog; `cancelHold` is a no-op; index.html:589 comment "Hold A to buy" is stale.
- Card timers disabled (`const timer = false ? ...`, 124) yet `tickTimers` still runs every second.
- `SECTIONS_FIGMA` unused.
- MTX Points purchases add to **Cash**, toast says "MTX Points"; no separate MTX Points balance.
- R points live in `mtx.store_r`, outside `MTX_PLAYER` (no `on()` events; other screens must re-read).
- Tickets bought go to `stacks` but the HUD ticket count (`data-pl-tickets`) is not updated.
- Pack / bundle purchase does not mark its contents owned (e.g. `bundle_season` contains `glove_mtx26`, still for sale).
- `rewardPrice` uses the Cash number as R when no R price (placeholder); `REQ_R_LEVEL` placeholder (79).
- `resetStore()` has no UI and does not reset `rewards_claimed` / `rewards_fig1`.
- `credit` price type exists in item-card.js but nothing sells for credits; L wallet is hidden on Store.
- `[data-store-owned]` counter (`.st-balance`) is hidden by CSS.
- screen-rewards.js + `#s-rewards` are legacy and still init on load (duplicate seed logic at screen-rewards.js:159).
- Old Store CSS (screens.css:5091-5316) still loaded and overridden; candidate for cleanup only if the user asks.
- `usd` purchases have no confirmation of real payment (mock by design).

## 10. Starter prompt (paste to another AI)

```text
You are working on an HTML game-menu prototype in
C:\Personal\Figma FlowUX Prototype\Figma FlowUX Prototype\mtx-controller-flow
(vanilla JS, no build, 1920x1080 stage). Read docs/store-handoff.md first, then the top of docs/handoff.md.

Task: build a NEW Store prototype variant "<name>" as a separate screen (key "store<v>", section #s-store-<v>,
module mtx/js/screens/screen-store-<v>.js, CSS mtx/css/store-<v>.css). Reuse MTX_ITEMS, MTX_UI.itemCard,
MTX_UI.dialog and MTX_PLAYER. Do not change the existing Store (#s-store, screen-store.js) or app.js.
Use unique data-bind names. Add it to Dev Tools > Pages (dev-pages.js). Bump ?v= on every changed file,
keep CRLF. Gate :hover CSS with body.input-mouse. No "·" in UI text, no progress bars, no brush/graffiti decor.
Layout idea: <describe the variant or give a Figma node in file eKm2meOcqHG0cFBt4eoWQr>.
Verify with the preview (launch config "mtx", http://127.0.0.1:8765/#screen=store<v>): no console errors,
keys/pad/mouse select + buy dialog work, old Store and Pack still work. Do not commit unless I ask.
Reply short and plain.
```


---

# Source files

## `mtx/js/data/items.js`

```js
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

```

## `mtx/js/components/item-card.js`

```js
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

```

## `mtx/js/screens/screen-store.js`

```js
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
      if (first) api.setFocus(first);   // setFocus runs focus() (the detail) itself
    });
    const host = api.bind("storeList");
    host?.addEventListener("click", e => {
      const card = e.target.closest(".item-card");
      if (!card || isPack(DB.get(card.dataset.id))) return;
      if (api.getFocused() !== card) api.setFocus(card);   // app.js pointerdown usually focused it already
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
    if (first) api.setFocus(first);   // setFocus runs focus() (the detail) itself
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
    ownsClick: () => canHold(),
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
    if (window.MTX_POINTER?.isHoverPick?.()) return;   // a mouse hover selects without scrolling the list (pointer-input.js)
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
    ownsClick: () => canHold(),   // app.js stage click: a holdable item card runs its own click (startHold)
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

```

## `index.html` lines 590-661 (`#s-store` and `#s-pack` markup)

```html
      <section class="screen" id="s-store" data-screen="store" data-first="seux_shorts" data-pointer="hover" data-figma="128:99 Store">
        <div class="screen__bg">
          <div class="bg-texture"></div>
          <div class="bg-gym"><img src="mtx/assets/img/bg-gym.webp" alt=""></div>
          <div class="bg-scrim" style="position:absolute;background:rgb(0 0 0 / .35)"></div>
        </div>
        <div class="screen__safe">
          <h1 class="page-title tex-text store__title" data-figma="128:321 features">Store</h1>
          <nav class="lb-tabs rw-tabs" role="tablist" aria-label="Store" data-figma="980:96555 lb-tabs">
            <span class="glyph" data-btn="lt">Q</span>
            <span class="lb-tab is-active" data-rw-tab="store" role="tab" aria-selected="true">Store</span>
            <span class="lb-tab" data-rw-tab="rewards" role="tab" aria-selected="false">Rewards</span>
            <span class="lb-tab" data-rw-tab="points" role="tab" aria-selected="false">MTX Points</span>
            <span class="glyph" data-btn="rt">E</span>
          </nav>
          <div class="st-balance">
            <span class="st-balance__owned">Owned <b data-store-owned>0</b></span>
          </div>
          <div class="scrollbar store__scroll" data-bind="storeScroll" data-figma="MTX / Scrollbar 719:78179" aria-hidden="true"><span class="scrollbar__thumb" data-bind="storeThumb"></span></div>
          <div class="st-view"><div class="st-list" data-bind="storeList"></div></div>
          <div class="char3d" data-char3d data-char3d-off aria-hidden="true"></div>
          <img class="rewards__hero st-detail__hero" data-bind="storeHero" src="mtx/assets/img/store-seuxphen.webp" alt="">
          <div class="rewards__info st-detail">
            <div class="rw-meta" data-figma="980:96450 rarity + type"><span class="rw-meta__rarity" data-bind="storeRarity"></span><span class="rw-meta__type" data-bind="storeKind"></span></div>
            <h2 class="tex-text" data-bind="storeName"></h2>
            <small class="st-detail__type" data-bind="storeType"></small>
            <p data-bind="storeDesc"></p>
            <div class="st-detail__price" data-bind="storePrice"></div>
          </div>
        </div>
        <div class="screen__chrome">
          <img class="brand" src="mtx/assets/svg/logo.svg" alt="Muay Thai Xtreme">
          <div data-use="player-hud" data-variant="rpoint"></div>
          <nav class="hint-bar" data-hints='{"b":"Back","a":"Buy","ls":"Move"}'></nav>
          <div data-use="social-bar"></div>
        </div>
      </section>

      <!-- ============================ Pack (Figma 128:437 "Pack collection", mtx-figma-export_PackCollection) ============================
           Opened from a pack / bundle card in the Store. Tiles normalised to 216 px with 14 px gaps (Figma: 213-216 px, 10-14 px). -->
      <section class="screen" id="s-pack" data-pointer="hover" data-screen="pack" data-first="pk0" data-figma="128:437 Pack collection">
        <div class="screen__bg">
          <div class="bg-texture"></div>
          <div class="bg-gym"><img src="mtx/assets/img/bg-gym.webp" alt=""></div>
          <div class="bg-scrim" style="position:absolute;background:rgb(0 0 0 / .35)"></div>
        </div>
        <div class="screen__safe">
          <div class="pk-left">
            <h1 class="page-title tex-text pk-title" data-bind="packTitle" data-figma="128:591">Seux Phen
Collection</h1>
            <p class="pk-desc" data-bind="packDesc" data-figma="128:592"></p>
            <div class="pk-tiles" data-bind="packItems" data-figma="128:537 / 128:702 / 128:696 tiles"></div>
            <div class="pk-price" data-bind="packPrice"></div>
            <div class="pk-actions">
              <button type="button" class="btn-cta pk-buy" data-bind="packBuy" data-figma="128:688 Buy"><span
                  class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="glyph"
                  data-btn="a">A</span><span class="btn-cta__label">Buy</span></button>
              <span class="hint-inline pk-back" data-figma="128:540 Back"><span class="glyph" data-btn="b">B</span><span>Back</span></span>
            </div>
          </div>
          <figure class="pk-preview" data-figma="128:724 preview">
            <img data-bind="packPreview" src="mtx/assets/img/pack-seux-shorts.webp" alt="">
            <figcaption data-bind="packPreviewName"></figcaption>
          </figure>
        </div>
        <div class="screen__chrome">
          <img class="brand" src="mtx/assets/svg/logo.svg" alt="Muay Thai Xtreme">
          <div data-use="player-hud"></div>
          <nav class="hint-bar" data-hints='{"b":"Back","a":"Buy","ls":"Move"}'></nav>
          <div data-use="social-bar"></div>
        </div>
      </section>

```

## `mtx/css/screens.css` lines 7815-7913 (item card component)

```css

/* ================= Item card component (components/item-card.js) ================= */
.item-card { display: block; overflow: visible; cursor: pointer; transition: transform .12s ease }
.item-card__art { left: 6.5%; top: 3.7%; width: 87%; height: 75% }
.item-card--tall .item-card__art { height: 88% }
.item-card--wide { grid-column: span 2 }
.item-card--wide .item-card__art { left: 1px; top: 1px; width: calc(100% - 2px); height: calc(100% - 40px); object-fit: cover; border-radius: 0 }
.item-card__art--pair { left: 13%; top: 5.5%; width: 48%; height: 69% }
.item-card__art--second { left: 42.6%; top: 10%; width: 44%; height: 64% }
.item-card__hold { position: absolute; left: 1px; right: 1px; bottom: 1px; height: 4px; z-index: 4; opacity: 0; background: rgb(0 0 0 / .6) }
.item-card__hold i { display: block; width: var(--hold, 0%); height: 100%; background: var(--yellow-3) }
.item-card.is-holding .item-card__hold { opacity: 1 }
.item-card.is-bought { animation: st-bought .5s ease-out }
.item-card__timer {
  position: absolute; z-index: 2; left: 10px; top: 10px; height: 22px; padding: 0 8px;
  display: flex; align-items: center; gap: 5px; border-radius: 2px; background: #141619;
  font: 700 13px/1 var(--font-ui); color: #ff594d
}
.item-card__timer img { width: 12px; height: 12px }

/* Figma MTX / Item Slot State: Veil over the card above the label bar. Pressed 25%, Claimed 45%, Disabled (locked) 65% */
.item-card__dim { position: absolute; left: 0; right: 0; top: 0; bottom: 39px; z-index: 3; border-radius: 0; background: rgb(0 0 0 / .65); pointer-events: none; display: none }
.item-card.is-claimed .item-card__dim, .item-card.is-locked .item-card__dim { display: block }
.item-card.is-claimed .item-card__dim { background: rgb(0 0 0 / .45) }
.item-card.is-claimed .reward-tile__art, .item-card.is-locked .reward-tile__art { opacity: 1; filter: none }
.item-card.is-claimed .reward-tile__corner, .item-card.is-claimed .reward-tile__glow { opacity: 1 }
.item-card.is-claimed .reward-tile__glow { opacity: .22 }

/* ---- Item Slot Corner (Figma 980:89494, user 2026-11-26): dark textured card, rarity = 2-tone corner bottom right,
   price = small chip bottom left (Corner Label 980:89544), claimed / locked / timer = veil over the card (Corner State 980:89732).
   --k = card short side / 156 (Figma px), so sizes follow the card (84 Quests, 216 Rewards / Store) */
.item-card.reward-tile { --k: calc(min(100cqw, 100cqh) / 156); container-type: size; background: #16181a; border-radius: 3px;
  box-shadow: inset 0 0 0 1px #373737 }
/* texture = Figma Rectangle 9955 as rendered in the card (dark scratches, 20% already in the image): 1:1 980:89423, 1:2 980:89689 */
.item-card__tex { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: url(../assets/img/item-card-tex.webp) 0 0/100% 100% no-repeat }
.item-card--tall .item-card__tex { background-image: url(../assets/img/item-card-tex-tall.webp) }
.item-card--wide .item-card__tex { background-size: cover }
.item-card.reward-tile .item-card__art { left: 9%; top: 5.1%; width: 82%; height: 74.4%; z-index: 1 }
.item-card.reward-tile.item-card--tall .item-card__art { height: 87.7% }
/* radius = Figma 3 px at 156, scaled by card size (container units cannot size the card itself) */
#s-store .item-card.reward-tile, .pk-tiles .item-card.reward-tile { border-radius: 4px }
.quest-rewards .item-card.reward-tile { border-radius: 2px }
.item-card.reward-tile.item-card--wide .item-card__art { left: 1px; top: 1px; width: calc(100% - 2px); height: calc(100% - 2px - var(--k) * 3) }
.item-card__line { position: absolute; z-index: 2; left: 0; bottom: 0; right: calc(var(--k) * 30); height: calc(var(--k) * 2.7); background: var(--rar-hi); pointer-events: none }
.item-card__corner { position: absolute; z-index: 2; right: 0; bottom: 0; width: calc(var(--k) * 36); height: calc(var(--k) * 29); pointer-events: none }
.item-card__corner-hi { fill: var(--rar-hi) }
.item-card__corner-lo { fill: var(--rar-lo) }
.item-card .reward-tile__glow, .item-card .reward-tile__corner { display: none }
/* Corner Label: chip, dark icon + text on the currency colour */
.item-card .item-label { left: calc(var(--k) * 10); right: auto; bottom: calc(var(--k) * 10); z-index: 3; height: calc(var(--k) * 24); max-width: calc(100% - var(--k) * 46);
  padding: 0 calc(var(--k) * 6); gap: calc(var(--k) * 6); justify-content: flex-start; border-radius: calc(var(--k) * 2);
  background: #f6f1eb; font: 600 calc(var(--k) * 16)/1 var(--font-ui); color: #16181f }
.item-card .item-label--r { background: #f5e5b5; color: #16181f }
.item-card .item-label--credit { background: #f6df2f; color: #16181f }
.item-card .item-label--qty, .item-card .item-label--name { background: #131417; color: #f6f1eb; padding: 0 calc(var(--k) * 8) }
.item-card .item-label--name { font-size: calc(var(--k) * 14) }
.item-label__icon { flex: none; width: calc(var(--k) * 16); height: calc(var(--k) * 11); fill: currentColor }
.item-label--money .item-label__icon { height: calc(var(--k) * 9) }
.item-label--credit .item-label__icon { height: calc(var(--k) * 13) }
.item-label__cut { fill: #f6df2f }
/* Corner State: veil + icon + caption */
.item-state { position: absolute; z-index: 4; inset: 0;   /* flush on the card edge: covers its stroke and the rarity line (Figma veil 154 at 7 in the 168 state, 2 px stroke) */
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: calc(var(--k) * 6); padding-bottom: calc(var(--k) * 8); box-sizing: border-box; border: calc(var(--k) * 2) solid #3a3c43; border-radius: inherit;
  background: rgb(11 12 14 / .85); font: 600 calc(var(--k) * 16)/1 var(--font-ui); text-transform: uppercase; text-align: center; pointer-events: none }
.item-state b { font: inherit }
.item-state__icon { width: calc(var(--k) * 22); height: calc(var(--k) * 17) }
.item-state--claimed { color: #0de573 }
.item-state--locked { background: rgb(11 12 14 / .9); color: #9a9ea8 }
.item-state--locked .item-state__icon { width: calc(var(--k) * 16); height: calc(var(--k) * 17.6); fill: currentColor }
.item-state--timer { background: rgb(11 12 14 / .75); gap: calc(var(--k) * 4); color: #ff594d }
.item-state--timer small { font: 600 calc(var(--k) * 9)/1 var(--font-ui); letter-spacing: .08em; color: #c9ccd2 }
.item-state--timer b { font-size: calc(var(--k) * 20) }
.item-card.is-claimed .item-card__dim, .item-card.is-locked .item-card__dim { display: none }
.item-card.is-locked .reward-tile__art { filter: grayscale(1) }
.item-card .reward-tile__new { z-index: 3; left: calc(var(--k) * 10); top: calc(var(--k) * 10); height: calc(var(--k) * 20); padding: 0 calc(var(--k) * 6);
  border-radius: calc(var(--k) * 2); font: 700 calc(var(--k) * 14)/calc(var(--k) * 20) var(--font-ui) }

/* Store: same layout as Rewards, grid left and preview right */
#s-store .st-view { left: 91px; width: 945px }
#s-store .st-list { position: relative; left: 0; top: 0; width: auto; height: auto; overflow: visible; padding: 12px 24px 40px }
#s-store .st-grid { grid-template-columns: repeat(4, 216px); grid-auto-rows: 216px; grid-auto-flow: dense; gap: 16px 11px }
#s-store .st-section__title { font-size: 28px }
#s-store .store__scroll { left: 1022px; top: 252px; height: 700px; z-index: 2 }   /* between grid (ends 1012) and view edge; above the 1:2 hero */
/* Preview size follows the item: only 1:2 fighters use the full height */
#s-store .st-detail__hero { left: 1075px; top: 430px; width: 320px; height: 320px }
#s-store .st-detail__hero[data-ratio="1:2"] { left: 1010px; top: 300px; width: 450px; height: 630px }
#s-store .st-detail__hero[data-ratio="2:1"] { left: 1030px; top: 460px; width: 410px; height: 260px }
#s-store .st-detail { left: 1480px; top: 400px; width: 360px }
#s-store .st-detail h2 { font-size: 44px; line-height: 40px }
#s-store .st-detail p { width: auto; margin-top: 16px; font-size: 21px; line-height: 25px }
.st-detail__type { display: block; margin-top: 12px; font: 600 16px/1.2 var(--font-ui); text-transform: uppercase; color: var(--text-muted) }
.st-detail__price { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 24px }
.st-detail__stack { font: 600 16px/1 var(--font-ui); text-transform: uppercase; color: var(--text-muted) }

/* Pack page tiles use the item card */
.pk-tiles .item-card { width: 216px; height: 216px }
.pk-tiles.is-many .item-card { width: 176px; height: 176px }

```

## `mtx/css/screens.css` lines 8616-8707 (current Store layout)

```css
#s-rewards .rw-meta__type { font: 600 18px/27px var(--font-ui); letter-spacing: 1px; text-transform: uppercase; color: #f6f1eb }
#s-rewards .rewards__info h2 { font: 400 24px/43px var(--font-display) }

/* ---- Store = Figma "Store - store layout" 980:96431 (user 2026-11-26: replaces the old Store). Same frame as Rewards:
   tabs top left, one list column (156 px cards, 3 per row, 12 gap, 20 between sections), scrollbar x652 y214 751 high,
   preview x1017 (skins / people = Fighter Model art), rarity + type + name at x715 y836. 2:1 items = Figma banner (324 x 156). */
#s-store > .screen__safe > .store__title, #s-store .st-balance, #s-store .st-detail p, #s-store .st-detail__price, #s-store .st-detail__type { display: none }
#s-store .rw-tabs { left: 70px; top: 76px; z-index: 3 }   /* shared lb-tabs component as on other screens: only the position is set here */
#s-store > .screen__safe > .st-view { margin-top: 0; left: 94px; top: 163px; width: 528px; height: 815px; -webkit-mask-image: none; mask-image: none }
#s-store .st-list { padding: 12px }
#s-store .st-section + .st-section { margin-top: 20px }
#s-store .st-section__title { justify-content: space-between; align-items: center; height: 24px; margin: 0 0 10px; padding: 0; border: 0;
  font: 700 16px/24px var(--font-ui); letter-spacing: 4px; color: #f6f1eb }
#s-store .st-section__title span { font: 600 14px/21px var(--font-ui); letter-spacing: 1px; text-transform: uppercase; color: #acacbb }
#s-store .st-grid { grid-template-columns: repeat(3, 156px); grid-auto-rows: 156px; gap: 12px }
#s-store .store__scroll { left: 652px; top: 214px; height: 751px }
#s-store > .screen__safe > .st-detail__hero, #s-store > .screen__safe > .st-detail__hero[data-ratio] { margin-top: 0; left: 900px; top: 230px; width: 620px; height: 560px; object-fit: contain }
#s-store.rewards--skin > .screen__safe > .st-detail__hero[data-ratio] { left: 1017px; top: 149px; width: 493px; height: 876px; object-fit: cover; object-position: 50% 0 }
#s-store.has-char3d.rewards--skin .rewards__hero { display: block }
#s-store [data-char3d] { display: none }
#s-store > .screen__safe > .st-detail { margin-top: 0; left: 715px; top: 836px; width: 603px; z-index: 2 }
#s-store .st-detail h2 { font: 400 24px/43px var(--font-display) }
#s-store .rw-meta { display: flex; align-items: center; gap: 12px; height: 26px; margin-bottom: 12px }
#s-store .rw-meta__rarity { height: 26px; padding: 0 8px; border-radius: 2px; background: var(--rw-rar, #9a9ea8); font: 700 16px/26px var(--font-ui); text-transform: uppercase; color: #fff }
#s-store .rw-meta__type { font: 600 18px/27px var(--font-ui); letter-spacing: 1px; text-transform: uppercase; color: #f6f1eb }
/* banner (Figma 980:96461): #101114, 1 px rarity stroke, art 322 x 126 at the top, name top left, price chip bottom left */
#s-store .item-card.item-card--wide { background: #101114; box-shadow: inset 0 0 0 1px var(--rar-hi) }
#s-store .item-card--wide .item-card__tex, #s-store .item-card--wide .item-card__line, #s-store .item-card--wide .item-card__corner { display: none }
#s-store .item-card.reward-tile.item-card--wide .item-card__art { left: 1px; top: 1px; width: calc(100% - 2px); height: 126px; object-fit: cover }
#s-store .item-card__name { position: absolute; z-index: 3; left: 12px; top: 10px; font: 900 18px/27px var(--font-ui); text-transform: uppercase; color: #fff; pointer-events: none }
#s-store .item-card--wide .item-label { left: 10px; bottom: 10px }   /* Figma 980:96465: chip at y+122 of 156 */
#s-store .item-card__timer { display: none }   /* no promo timer on cards (user 2026-11-26) */

/* chips, tags and badges: content centred on the box axis (cap height trimmed), not by line-height (user 2026-11-26) */
.item-card .item-label, .item-state, .item-card .reward-tile__new, .item-card__timer, .rw-meta__rarity {
  display: inline-flex; align-items: center; justify-content: center }
.item-card .item-label b, .item-state b, .item-state small, .item-card .reward-tile__new b, .item-card__timer b, .rw-meta__rarity b {
  display: block; line-height: 1; text-box: trim-both cap alphabetic }
.item-card .item-label { justify-content: flex-start }
#s-store .item-card--wide .item-card__timer { left: auto; right: 10px }   /* banner name owns the top left */

/* ---- MTX Points tab = Store screen in mode "points" (Figma 980:96561): coins card with the amount and a bonus tag,
   $ price on the dark Quantity chip, preview = coins at 963,260 600 x 560, "Best value" yellow tag with black text */
.item-card__amount { position: absolute; z-index: 2; left: calc(var(--k) * 10); right: calc(var(--k) * 10); top: calc(var(--k) * 90); height: calc(var(--k) * 30);
  display: flex; align-items: center; justify-content: center; font: 800 calc(var(--k) * 26)/1 var(--font-ui); color: #fff; pointer-events: none; text-box: trim-both cap alphabetic }
.item-card__bonus { position: absolute; z-index: 3; left: calc(var(--k) * 10); top: calc(var(--k) * 8); height: calc(var(--k) * 20); display: inline-flex; align-items: center; pointer-events: none }
.item-card__bonus b { display: block; font: 700 calc(var(--k) * 15)/1 var(--font-ui); color: #f6df2f; text-box: trim-both cap alphabetic }
#s-store.store--points > .screen__safe > .st-detail__hero[data-ratio="1:1"] { left: 963px; top: 260px; width: 600px; height: 560px; object-fit: contain }
#s-store .rw-meta__rarity.is-tag { color: #000 }

/* Store / Rewards background = Figma screen__bg 980:96285 exported as one image (gym photo with exposure +0.08 and
   saturation -37%, black scrim 35%, Scath Texture overlay), so colour, softness and texture match exactly */
#s-store > .screen__bg, #s-rewards > .screen__bg { background: #05070b url(../assets/img/store-bg.webp) 0 0/1920px 1080px no-repeat }
#s-store > .screen__bg > *, #s-rewards > .screen__bg > * { display: none !important }

/* rarity chip on a light colour (Normal grey, Standard lime, Legendary gold, tags): black text, user 2026-11-26 */
#s-store .rw-meta__rarity.is-light, #s-rewards .rw-meta__rarity.is-light { color: #000 }

/* list fade top and bottom (user 2026-11-26): Rewards grid and the Store / MTX Points list */
#s-rewards > .screen__safe > .reward-grid, #s-store > .screen__safe > .st-view {
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 28px, #000 calc(100% - 40px), transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 28px, #000 calc(100% - 40px), transparent 100%) }

/* Rewards tab of the one Store (Figma 980:96284 headers): STYLE LEVEL n ---- x/5 UNLOCKED */
#s-store .st-section--rewards .st-section__title { gap: 14px; padding-left: 20px }
#s-store .st-section--rewards .st-section__title::after { content: ""; order: 1; flex: 1; height: 1px; background: rgb(255 255 255 / .3) }
#s-store .st-section--rewards .st-section__title span { order: 2 }

/* Store tab = 4 columns so the 2:1 Featured banners sit side by side (user 2026-11-26). The list frame is one column wider
   on every tab (so nothing jumps when switching); scrollbar and preview move right by one column (168 px).
   Rewards and MTX Points keep 3 columns (Figma). */
#s-store > .screen__safe > .st-view { width: 696px }
#s-store:not(.store--points):not(.store--rewards) .st-grid { grid-template-columns: repeat(4, 156px) }
#s-store .store__scroll { left: 820px }
#s-store > .screen__safe > .st-detail { left: 883px; width: 600px }
#s-store > .screen__safe > .st-detail__hero, #s-store > .screen__safe > .st-detail__hero[data-ratio] { left: 1068px }
#s-store.rewards--skin > .screen__safe > .st-detail__hero[data-ratio] { left: 1185px }
#s-store.store--points > .screen__safe > .st-detail__hero[data-ratio="1:1"] { left: 1131px }

/* Store tab: shape groups inside a section (2:1 / 1:1 / 1:2), same 12 px gap between them as between cards */
#s-store .st-section > .st-grid + .st-grid { margin-top: 12px }

/* list panel as wide as the grid of the current tab (Store 4 columns, Rewards / MTX Points 3), user 2026-11-26 */
#s-store > .screen__safe > .st-view { width: max-content }

/* Store (all tabs): skins / people always show the Fighter Model image, whatever Dev Tools sets (3D / 2D / Video), user 2026-11-26.
   !important: character3d.css loads later and hides .rewards__hero when 3D is on */
#s-store .rewards__hero { display: block !important }
#s-store .char3d, #s-store [data-char3d] { display: none !important }

/* rarity chip text: black on every rarity (user 2026-11-26) */
#s-store .rw-meta__rarity, #s-rewards .rw-meta__rarity { color: #000 }

```

## `mtx/css/tokens.css` (design tokens: colours, fonts)

```css
/* =====================================================================
   MTX design tokens
   Pulled from the Figma export (mtx-figma-export). The Figma file has no
   colour/text styles or variables, so every value below was collected from
   raw layer fills and text properties. FIGMA_STRUCTURE_NOTES.md proposes
   turning these into Figma Variables + Text Styles with the same names.
   ===================================================================== */

/* bundled files only, no local(): a locally installed copy (duplicate / per-user installs on Windows) can render garbled glyphs in Chrome */
@font-face{font-family:"Industry";src:url(../fonts/Industry-Book.otf) format("opentype");font-weight:400}
@font-face{font-family:"Industry";src:url(../fonts/Industry-Medium.otf) format("opentype");font-weight:500}
@font-face{font-family:"Industry";src:url(../fonts/Industry-Demi.otf) format("opentype");font-weight:600}
@font-face{font-family:"Industry";src:url(../fonts/Industry-Bold.otf) format("opentype");font-weight:700}
@font-face{font-family:"Industry";src:url(../fonts/Industry-Black.otf) format("opentype");font-weight:900}
@font-face{font-family:"Modi Thorson";src:url(../fonts/modithorson.ttf) format("truetype")}

:root{
  color-scheme:dark;

  /* ---- fonts ---- */
  --font-display:"Modi Thorson","Russo One","Arial Black",Impact,sans-serif;
  --font-ui:"Industry","Saira Semi Condensed","Arial Narrow",system-ui,sans-serif;

  /* ---- surfaces (dark → light) ---- */
  --surface-void:#050505;
  --surface-frame:#1a1a1a;      /* frame fill on every screen            */
  --surface-card:#0b1018;       /* tiles, panels, quest rows             */
  --surface-chip:#16181f;       /* level chip body, button glyph, pills  */
  --surface-raised:#272727;     /* disabled card, rank mode              */
  --surface-card-dark:#020202;  /* mode card default                     */
  --surface-scrim:rgb(0 0 0 / .5);

  /* ---- lines ---- */
  --line-1:#373737;  --line-2:#4e4e4e;  --line-3:#454545;  --line-bright:#c1c1c1;

  /* ---- text ---- */
  --text-1:#f6f1eb;  --text-2:#e0deda;  --text-muted:#acacbb;  --text-subtle:#9da4a5;
  --text-dim:#6c6c6c;  --text-off:#4e4e4e;  --text-ink:#16181f;  --text-ink-2:#27282d;  --text-cta:#1e1e1d;

  /* ---- brand / status ---- */
  --yellow:#f6df2f;  --yellow-2:#f2df57;  --yellow-3:#f4dd2f;  --amber:#f3ad3b;  --amber-2:#f7bb2b;
  --red:#ff0027;  --red-2:#c8133f;  --red-3:#ed153f;  --red-dark:#680920;
  --green:#00fd86;  --mint:#4dffd9;  --cream:#f5e5b5;  --bar:#fff7e1;  --link:#2568ef;

  /* ---- selected Tactical style (set by app.js; default Phranakhon red) ---- */
  --style-color:#e6003f;
  --style-fg:#ffffff;

  /* ---- progression tracks (R / E / S) ---- */
  --track-r:#f5e5b5;  --track-e:#ff0027;  --track-s:#6100ff;
  --track-r-dark:#6b603e;  --track-e-dark:#680920;  --track-s-dark:#3e0d8f;

  /* ---- controller glyph colours ---- */
  --glyph-a:#35d900;  --glyph-b:#e00000;  --glyph-x:#223bd6;  --glyph-y:#f5e414;  --glyph-stick:#acacbb;

  /* ---- gradients ---- */
  --grad-gold:linear-gradient(100deg,#f2df57 0%,#f3ad3b 82%,#f2df57 98%);
  --grad-focus:linear-gradient(90deg,#f3eed0,#e4b996 25%,#766ab2 50%,#5a8dc2 75%,#8bcab2);
  --grad-quest-gold:linear-gradient(90deg,#f4dd2f,#ff5900 50%,#f4dd2f);
  --grad-quest-red:linear-gradient(90deg,#630a18,#ff0027 50%,#f23451);

  /* ---- textures ---- */
  --tex-scratch:url(../assets/img/tex-scratch.webp);
  --tex-white:url(../assets/img/tex-scratch-white.webp);
  --tex-band:url(../assets/img/tex-quest-band.webp);
  --tex-tile:url(../assets/img/tex-tile.webp);

  /* ---- radii / misc ---- */
  --r-xs:1px;  --r-sm:2px;  --r-md:3px;  --r-tag:4px;  --r-pill:999px;
  --focus-w:4px;
  --focus-gap:4px;
  /* flowing focus ring (user 2026-11-24): the --grad-focus colours twice, ending on the first colour, so a 200 % wide tile loops seamlessly */
  --grad-focus-flow:linear-gradient(90deg,#f3eed0,#e4b996 12.5%,#766ab2 25%,#5a8dc2 37.5%,#8bcab2 50%,#e4b996 62.5%,#766ab2 75%,#5a8dc2 87.5%,#f3eed0);
  --focus-flow-s:3s;   /* one loop */   /* every focus ring sits this far outside its element (user 2026-11-24: same spacing everywhere) */
}

```
