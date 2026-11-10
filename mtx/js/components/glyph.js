/* Component: controller / keyboard key glyph.
     MTX_UI.keyLabel("a")                -> the label for the current device ("A", "Space", "✕" ...)
     MTX_UI.glyph("a", { cls, attrs })   -> <span class="glyph ..." data-btn="a">…</span>
                                           (app.js relabels every [data-btn] glyph when the device changes;
                                            the CSS draws the controller icon sets)
     MTX_UI.holdHint("confirm")          -> toast "Hold <key> to confirm" (the quick-tap hint of every hold button)
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};

  UI.keyLabel = btn => {
    const api = window.MTX?.api;
    return (api?.getGlyphs?.()[api?.getDevice?.()] || {})[btn] || String(btn).toUpperCase();
  };

  UI.glyph = (btn, { cls = "", attrs = "" } = {}) =>
    `<span class="glyph${cls ? " " + cls : ""}" data-btn="${btn}" aria-hidden="true"${attrs ? " " + attrs : ""}>${UI.keyLabel(btn)}</span>`;

  UI.holdHint = (verb, btn = "a") => window.MTX?.api?.toast?.(`Hold ${UI.keyLabel(btn)} to ${verb}`);
})();
