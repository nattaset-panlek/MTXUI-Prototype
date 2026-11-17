/* Component: controller / keyboard key glyph.
     MTX_UI.keyLabel("a")                -> the label for the current device ("A", "Space", "✕" ...)
     MTX_UI.glyph("a", { cls, attrs })   -> <span class="glyph ..." data-btn="a">…</span>
                                           (app.js relabels every [data-btn] glyph when the device changes;
                                            the CSS draws the controller icon sets)
     MTX_UI.glyph("y", { combat: true })  -> fight input key (skill Input rows): keyboard uses the combat keys below,
                                           pads the same buttons as the menu ([data-combat] glyphs)
     MTX_UI.holdHint("confirm")          -> toast "Hold <key> to confirm" (the quick-tap hint of every hold button)
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};

  // Gameplay (fight) keyboard keys; menu hints use the menu map in app.js GLYPHS.
  //   Y / X = I / O · A / B = K / L · R1 = Space · L1 = Shift L · L2 = Ctrl · R2 = Shift R · LS = WASD · RS = Alt + WASD
  //   (here lt / rt = L1 / R1 bumpers, zl / zr = L2 / R2 triggers, as in the menu input)
  UI.COMBAT_KB = { y: "I", x: "O", a: "K", b: "L", rt: "Space", lt: "Shift L", zl: "Ctrl", zr: "Shift R", ls: "WASD", rs: "Alt + WASD" };
  const device = () => window.MTX?.api?.getDevice?.() || document.body?.dataset.device;
  UI.combatLabel = btn => device() === "kb" ? (UI.COMBAT_KB[btn] || String(btn).toUpperCase()) : UI.keyLabel(btn);

  UI.keyLabel = btn => {
    const api = window.MTX?.api;
    return (api?.getGlyphs?.()[api?.getDevice?.()] || {})[btn] || String(btn).toUpperCase();
  };

  UI.glyph = (btn, { cls = "", attrs = "", combat = false } = {}) =>
    `<span class="glyph${cls ? " " + cls : ""}" data-btn="${btn}"${combat ? " data-combat" : ""} aria-hidden="true"${attrs ? " " + attrs : ""}>${combat ? UI.combatLabel(btn) : UI.keyLabel(btn)}</span>`;

  UI.holdHint = (verb, btn = "a") => window.MTX?.api?.toast?.(`Hold ${UI.keyLabel(btn)} to ${verb}`);
})();
