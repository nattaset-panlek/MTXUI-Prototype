/* Component: pointer input (mouse vs keys / pad) for the play mode.
   Tracks which input the player used last and lets a screen choose how the mouse selects, with data-pointer on its section:

     data-pointer="hover"  the mouse hovering a [data-nav] item selects it (setFocus), so the screen shows that item's
                           preview (Store). Keys / pad move on from the selected item. Hover takes over again only when
                           the mouse moves; a still cursor never steals the focus back.
     data-pointer="none"   with the mouse, nothing is selected on entry and a click on empty space clears the selection
                           (Main Menu, Ultimate Fight). The first key / pad press selects data-first.
     (none)                default: the selection follows clicks and keys / pad only.

   Mouse mode starts on, turns off on a real key press or pad input, and back on when the mouse moves.
   body.input-mouse mirrors it. Hint clicks send synthetic keys and do not count as keys.

   Overlays that keep their own index focus (Tournament hub, Settings) use hoverPick(root, selector, onPick, { when }):
   onPick(el) runs when a real mouse move lands on a new matching item (never on a still cursor or a re-render under it).
   A hover selects but never scrolls: while it runs isHoverPick() is true and the screens skip their scroll-into-view.

   window.MTX_POINTER = { isMouse(), setKeys(), modeOf(screenEl), noPreselect(screenEl), clearsOnEmptyClick(screenEl), hoverPick(...) }
   app.js calls noPreselect() in show(), setKeys() for pad input, clearsOnEmptyClick() in the stage click. */
(function () {
  //#region [Variables/Fields]
  let mouse = true;
  let picking = false;   // true while a hover is setting the focus: lists keep their scroll (isHoverPick)
  //#endregion

  //#region [Private Methods]
  function setMouse(on) {
    if (mouse === on) return;
    mouse = on;
    document.body?.classList.toggle("input-mouse", on);
  }

  const api = () => window.MTX?.api;
  const activeScreen = () => document.querySelector(".screen.is-active");
  const modeOf = screen => screen?.dataset.pointer || "";

  // the mouse moved: hover selects on data-pointer="hover" screens
  function onMove(e) {
    if (e.pointerType !== "mouse" || !(e.movementX || e.movementY)) return;
    setMouse(true);
    const screen = activeScreen();
    if (modeOf(screen) !== "hover") return;
    if (/(cmt-on|layout-editing|nav-editing|text-editing)/.test(document.body.className)) return;   // dev states: Comment locks the prototype, editors own the mouse
    if (window.MTX_SCREENS?.[screen.dataset.screen]?.isModalOpen?.()) return;   // a screen modal (Management) keeps its own focus
    const el = e.target.closest?.("[data-nav]");
    if (!el || !screen.contains(el) || el.offsetParent === null) return;
    const core = api();
    if (core && core.getFocused?.() !== el) { picking = true; try { core.setFocus(el); } finally { picking = false; } }
  }
  //#endregion

  //#region [Public Methods]
  function hoverPick(root, selector, onPick, { when } = {}) {
    root.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || !(e.movementX || e.movementY)) return;
      if (/(cmt-on|layout-editing|nav-editing|text-editing)/.test(document.body.className)) return;
      if (when && !when()) return;
      const el = e.target.closest?.(selector);
      if (el && root.contains(el)) { picking = true; try { onPick(el, e); } finally { picking = false; } }
    }, { passive: true });
  }

  window.MTX_POINTER = {
    hoverPick,
    isHoverPick: () => picking,   // focus code checks this to skip its scroll-into-view
    isMouse: () => mouse,
    setKeys: () => setMouse(false),
    modeOf,
    noPreselect: screen => mouse && modeOf(screen) === "none",
    clearsOnEmptyClick: screen => modeOf(screen) === "none",
  };
  //#endregion

  //#region [Watchers]
  addEventListener("keydown", e => { if (e.isTrusted) setMouse(false); }, true);
  addEventListener("pointermove", onMove, { passive: true });
  if (document.body) document.body.classList.add("input-mouse");
  else addEventListener("DOMContentLoaded", () => document.body.classList.toggle("input-mouse", mouse));
  //#endregion
})();
