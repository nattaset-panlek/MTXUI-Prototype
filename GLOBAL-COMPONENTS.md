# MTX Prototype: Global Components

Every component lives in `mtx/js/components/` and is exposed on `window.MTX_UI`.
After editing a component, bump `?v=` for that file in `index.html`.

| Component | API | Files | Used by |
|---|---|---|---|
| **Dialog** (message / confirm popup) | `MTX_UI.dialog.open({ title, body, primary, secondary, secondaryKey, onPrimary, onSecondary, onClose, hold, holdLabel, closeHint })` · `close()` · `isOpen()` · `input(a)` · `release(a)` | `dialog.js`, `css/dialog.css` | Custom Lobby (Leave, Lobby full, Match in progress), Tournament ticket confirm, Tournament Lobby Start (hold), and anything that calls `MTX_UI.modal.confirm` |
| **Modal** (list menu / confirm) | `MTX_UI.modal.open({ kicker, title, items \| body, buttons, onSelect, onClose, tone })` · `modal.confirm(...)` (now forwards to Dialog) | `modal.js` | Menus with a vertical list |
| **Spotlight** (large 1200×800 promo window with slides) | `MTX_UI.spotlight.open({ id, slides, page, onAction, onClose, closeHint, ctaInHints })` · `close()` · `isOpen()` · `page()` | `spotlight.js`, `css/spotlight.css` | Campaign (main menu), Tournament ticket shop (`id:"ticket"`) |
| **Hold to confirm** | `MTX_UI.createHold({ ms, vars, steps, flash, onDone, onCancel })` · `MTX_UI.holdHint(verb)` | `hold.js` | Store, Rewards, Skill tree, Tactical, Ready in the Custom Lobby |
| **Key glyph** | `MTX_UI.glyph(btn, { cls, attrs })` · `MTX_UI.keyLabel(btn)` | `glyph.js` | Every hint bar and key prompt (relabels automatically when the device changes: KB, Xbox, PS) |
| **Screen motion** (enter / exit transitions) | `MTX_UI.motion` | `motion.js` | Every screen change (automatic) |
| **Scrollbar** | `MTX_UI.syncScrollbar(list, bar, opts)` · `MTX_UI.bindScrollbar(list, bar, opts)` | `scrollbar.js` | Leaderboard, Collection |
| **Personality** (4 answer tones) | `MTX_UI.personality` + `[data-personality]` | `personality.js` | Simulate day, Social |
| **Nav graph** (dev tool) | `MTX_UI.navGraph` | `nav-graph.js` | Edits the focus map for `[data-nav]` |

## Shared rules
- **Keys never sit inside a button.** A page puts them in the hint bar. A Dialog or Spotlight puts them as floating hints under the panel.
- **Dialog behavior:**
  - Move (WASD / stick) picks a button. Primary is focused first.
  - Confirm (A, Space / Enter) presses the focused button. B closes.
  - A Dialog with only a Primary button (e.g. "Close") shows one wide button.
  - `hold: ms` makes the Primary hold-to-confirm. A ring fills around the button, and letting go early does nothing. The hint under the panel shows `holdLabel`.
  - `closeHint: "Close"` adds a B / Esc hint under the panel. B then just closes (`onClose`).
  - Buttons do not pop or scale on press, matching Figma 225:145953.
- **Input order:** `app.js` sends input to Dialog → Modal → Spotlight → overlays (e.g. `MTX_TOUR`) before the page underneath, so the page under a popup never reacts.
- **CTA buttons:** use `.btn-cta` (Primary, yellow) and `.btn-cta--secondary` (Secondary, dark with a `#8a8d99` border) from `css/components.css`.

## Hint bar (`mtx/js/components/hint-bar.js`)

Every key + label row is built here.

```js
MTX_UI.hintBar({ b: "Back", a: "Confirm", "lt+rt": "Tabs" }, { cls: "my__hints" })
```

```html
<nav class="hint-bar" data-hints='{"b":"Back","a":"Confirm"}'></nav>
```

- `"lt+rt"` is a pair.
- Keys always show in the order of `docs/HINT-BAR-ORDER.md`. Back comes first.
- A label can be `{ label, off, attrs }`. A `[key, label]` list also works, for lists built at runtime.
- `data-focus-hints='{"lt+rt":"Mode"}'` on a focusable item adds hints to the screen's bar while it is focused.
- `MTX_UI.hintItems(data, opts)` returns only the hints, for a nav with its own class.
- Options and Friends are added to static bars by `addLauncherHints` in `screen-customize.js`, and to other bars with `{ launcher: true }`.

## Item card and item database (`mtx/js/components/item-card.js`, `mtx/js/data/items.js`)

Every item is one record in `data/items.js` (name, image, rarity, prices, stack, pack contents and so on; the field list is at the top of that file). `mock: true` marks invented data.

```js
MTX_UI.itemCard("glove_black", { label: MTX_UI.itemLabel("status", "Owned"), cls: "is-claimed", attrs: 'data-fn="x"' })
```

- Size comes from the grid: `1:1` one cell, `1:2` two rows, `2:1` two columns.
- Disabled (`is-claimed`, `is-locked`) is 70% black over the whole card.
- Used by Store, Pack and Rewards.

## Visual keyboard
`mtx/js/components/visual-keyboard.js`, `MTX_UI.createVk(...)`. Text and PIN entry for pad and keyboard; usage is in the file header, styles are `.vk` in `css/screens.css`. Used by Create Lobby and Tournament setting.

## Skill detail card (`components/node-detail.js`, `css/node-detail.css`) — 2026-11-18
The Skill Tree card is the one skill card for every screen. `MTX_UI.nodeDetail.html({ cls, attrs })` makes the shell;
`MTX_UI.nodeDetail.model(styleId, id, { lv, cta, hints })` builds its content from `MTX_SKILLS` + `MTX_SKILLSTATE`
(id = tree node id or decisive family id; perk `lv` = level tab); `render(el, model)` fills it. Used by Skill Tree and Tactical Loadout (Y info).
Old `components/skill-info.js` is no longer used by them.
