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
