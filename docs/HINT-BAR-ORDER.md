# Hint bar order standard

This is the base reference for the key + label row on every screen.
Every hint bar uses the same order, so players always find a key in the same place.

Build hint bars with `MTX_UI.hintBar` (see `GLOBAL-COMPONENTS.md`) and write the keys in this order, so the source reads like the screen.

## The order

Always read left to right. Skip a slot when the screen does not have that action. Never move a key to another slot.

| # | Group | Key | Purpose | Example labels |
|---|---|---|---|---|
| 1 | Exit | `b` | Leave or cancel the current view | Back, Close, Cancel, Quit, Deselect, Leave |
| 2 | Main action | `a` | The main action of the focused item | Confirm, Select, Open, Buy, Flip, Join |
| 3 | Other actions | `x` | Second action | Reset, Decline, Equip, Filter |
| 4 | | `y` | Third action | Compare, Search, Restore, Hold to Simulate |
| 5 | Switching | `lb+rb` or `lb`, `rb` | Tabs, slides, boards | Tabs, Slide, Streams |
| 6 | | `lt+rt` or `lt`, `rt` | Second level of switching | Page, Level, Filter |
| 7 | | `zl+zr` | Third level of switching | Round |
| 8 | Value | `dl+dr` | Change the value of the focused item | Toggle, Fighter / Spectator |
| 9 | Navigation | `ls` | Move the focus | Move, Choose |
| 10 | | `rs` | Second navigation | Edit time |
| 11 | Global | `menu` | Options | Options, Close |
| 12 | | `view` | Friends | Friends, Close |

In short: **Exit, Main action, Other actions, Switching, Value, Navigation, Global.**

## Rules

1. **Back comes first.** `b` is always the first hint when the view can be left.
2. **The slot follows the key, not the label.** `y` stays in slot 4 when its label is Hold to Simulate or Close.
3. **One key, one hint.** A key appears only once in a bar.
4. **Hold actions keep their slot.** Write the hold in the label, for example `y: "Hold to Simulate"`.
5. **Off hints stay in place.** A disabled hint uses `off: true` and does not move or disappear, so the other hints do not shift.
6. **A changing view keeps the order.** When keys change with the state, the keys that remain stay in the same relative order.
7. **Options and Friends are last.** Add them with `{ launcher: true }` on runtime bars. Static bars get them automatically.
8. **Before the game, no global keys.** Intro and Login do not show Options or Friends.

## Labels

- Use one or two words, except for hold actions.
- Use the same word for the same action. Use `Back` to go to the previous view and `Close` to shut an overlay.
- `ls` is `Move` unless the screen is choosing from a list, where `Choose` is allowed.

## Examples

```js
MTX_UI.hintBar({ b: "Back", a: "Confirm", ls: "Move" })
MTX_UI.hintBar({ b: "Back", a: "Details", x: "Reset", "lt+rt": "Gate", ls: "Move" })
MTX_UI.hintBar({ b: "Back", x: "Decline", y: "Flip", ls: "Move" })
MTX_UI.hintBar({ b: "Back", a: "Join", x: "Spectate", y: "Create", lb: "Refresh", rb: "Find" }, { launcher: true })
```

## Hints that depend on the focused item

An item can add hints while it is focused, using the same data format:

```html
<a data-nav data-focus-hints='{"lt+rt":"Mode"}'>
```

- The hint goes into its standard slot and leaves when the focus moves on. This is the one case where other hints shift.
- Current uses: `Mode` on Quick Fight and Rank Fight, `Event` on the event card under Shop.
- Only add a hint the key really does on that item.

## How it is enforced

`mtx/js/components/hint-bar.js` sorts every bar into this order (`ORDER`), so a key written in the wrong place still shows in its slot.
To change the standard, change this file and `ORDER` together.
A key that is not in the table goes just before `menu`.
