/* Per Tactical Style presets: the ONE place for every tuning value that differs by style.
   defaults = values every style starts from; styles.<id> = only what that style changes.
   ui = the rows of Dev Tools > "Style Presets" (one column per style); a key added to defaults + ui shows up there.
   Edits in that tab are saved in this browser (localStorage mtx.style_dev = { v, styles: { <id>: { group: { key } } } });
   its "Export JSON" gives the full `styles` block to paste back here.
   Player progress (E / S / R, points, Style level) is save data, not a preset: Dev > Inspect > Player card.
   Style ids: phranakhon (Phranakhon), south (Chaiya), isan (Korat), north (Tha Sao), west (Lopburi). */
window.MTX_STYLE_PRESETS = {
  defaults: {
    // Attributes VFX (screen-attributes.js): Style Emblem outline noise (emblemMask / applyVfx),
    // Overall number change on A / D (fade | lerp | roll | instant) and the Confirm VFX on / off
    attr: {
      noise: true, speed: 1, size: 6, amount: 50, soft: 4, bright: 100, color: "#ffe4aa",
      overallAnim: "fade", flash: true, ring: true, ripple: true, pop: true,
    },
    // Skill tree ornament (yantra strip): parallax % of the camera move, offset in tree px (screen-skilltree.js)
    tree: { plx: 45, yanX: 0, yanY: 50 },
  },
  styles: {
    phranakhon: {},
    south: {},
    isan: {},
    north: {},
    west: {},
  },
  // Dev Tools rows: key "group.key"; type bool | num | color | select (num: min / max / step / unit)
  ui: [
    { title: "Attributes · Style Emblem", rows: [
      { key: "attr.noise", label: "Emblem noise", type: "bool" },
      { key: "attr.speed", label: "Noise speed", type: "num", min: 0.25, max: 3, step: 0.25, unit: "x" },
      { key: "attr.size", label: "Patch size", type: "num", min: 3, max: 14, step: 1, unit: "cells" },
      { key: "attr.amount", label: "Patch amount", type: "num", min: 10, max: 90, step: 5, unit: "%" },
      { key: "attr.soft", label: "Edge softness", type: "num", min: 1, max: 10, step: 0.5 },
      { key: "attr.bright", label: "Brightness", type: "num", min: 0, max: 100, step: 5, unit: "%" },
      { key: "attr.color", label: "Outline colour", type: "color" },
    ] },
    { title: "Attributes · Overall card", action: { id: "attrVfxTest", label: "Play Confirm VFX" }, rows: [
      { key: "attr.overallAnim", label: "Overall change (A / D)", type: "select",
        options: [["fade", "Fade"], ["lerp", "Lerp"], ["roll", "Slot roll"], ["instant", "Instant"]] },
      { key: "attr.flash", label: "Confirm: card flip", type: "bool" },
      { key: "attr.ring", label: "Confirm: gold frame", type: "bool" },
      { key: "attr.ripple", label: "Confirm: diamond ripple", type: "bool" },
      { key: "attr.pop", label: "Confirm: number pop", type: "bool" },
    ] },
    // save: true = the player's save data of that style (MTX_PLAYER), edited here but not part of the preset / Export JSON
    { title: "Skill tree · Points (save data)", rows: [
      { key: "player.skillTotal", label: "Skill points earned", type: "num", min: 0, step: 1, save: true },
    ] },
    { title: "Skill tree · Ornament", rows: [
      { key: "tree.plx", label: "Parallax", type: "num", min: 0, max: 80, step: 5, unit: "%" },
      { key: "tree.yanX", label: "Offset X", type: "num", step: 10, unit: "px" },
      { key: "tree.yanY", label: "Offset Y", type: "num", step: 10, unit: "px" },
    ] },
  ],
};
