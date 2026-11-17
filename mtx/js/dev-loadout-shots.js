/* Dev helper (not loaded by index.html): 1920 x 1080 captures of every Tactical Loadout state for the Figma compare.
   Load:  document.head.append(Object.assign(document.createElement("script"), { src: "mtx/js/dev-loadout-shots.js?" + Date.now() }))
   Run:   await TL_SHOTS.run(["p02", ...])  -> bakes/mtx-tlshot-<name>-<stamp>.svg holds the JPEG as base64 (tools decode it) */
(function () {
  const L = () => window.MTX_LOADOUT;
  const base = () => ({ phranakhon: { perk: [0, 3, 4, null], special: [null, 0, 1, null], decisive: [null, 0, 1, null], signature: [null, null, null, null] }, south: { perk: [5, null, null, null], special: [null, 2, null, null], decisive: [null, 3, null, null], signature: [null, null, null, null] } });
  // Hub B (TSP Hub B 740:109350): type 0 Perk, 1 Special, 2 Decisive, 3 Signature
  const hub = (type, slot, o = {}) => ({ page: 2, view: "hub", type, slot, mode: "slots", cell: 0, info: null, scroll: 0, styleIdx: 0, presets: base(), ...o });
  const STATES = {
    "p00-profile": { page: 0, view: "hub", info: null, presets: base() },
    "p00-inventory": { page: 1, view: "hub", info: null, presets: base() },
    "b1-left": hub(0, 3),                                       // 740:109351 Left slot selected (Perk empty slot 4)
    "b2-grid": hub(0, 3, { mode: "grid", cell: 6 }),            // 740:110461 Moved to grid (Relentless Assault)
    "b3-info": hub(0, 3, { mode: "grid", cell: 6, info: { lv: 3 } }),   // 740:111571 Y info card (SR paged to Lv 3)
    "b4-special": hub(1, 0),                                    // 740:114293 Special left slot
    "b5-decisive": hub(2, 0),                                   // 740:115977 Decisive left slot
    "b6-signature": hub(3, 1),                                   // 740:117661 Signature up slot
    // group first, then slot (741:60422)
    "g1-group-special": hub(1, 0, { mode: "group" }),           // 741:60423 Group select, Special
    "g2-in-special": hub(1, 0),                                 // 741:61711 Inside Special, slot focus
    "g3-group-perk": hub(0, 3, { mode: "group" }),              // 741:64103 Group select, Perk
    "g4-in-perk": hub(0, 3),                                    // 741:65326 Inside Perk, slot focus
    "g5-perk-grid": hub(0, 3, { mode: "grid", cell: 6 }),       // 741:62919 Inside Perk, grid
    "g6-group-signature": hub(3, 1, { mode: "group" })          // 741:66549 Group select, Signature
  };
  async function shot(name) {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.getAttribute("href")}">`).join("");
    const attrs = [...document.body.attributes].map(a => `${a.name}="${a.value}"`).join(" ");
    const ov = document.getElementById("tlOverlay").outerHTML;
    const html = `<!doctype html><html><head><meta charset="utf-8"><base href="/">${links}<style>html,body{margin:0;background:#000}#stage{position:relative!important;left:0!important;top:0!important;width:1920px!important;height:1080px!important;transform:none!important;overflow:hidden}*{animation:none!important;transition:none!important}</style></head><body ${attrs}><div id="stage">${ov}</div></body></html>`;
    const r = await fetch("/__shot", { method: "POST", body: JSON.stringify({ html }) }).then(r => r.json());
    const s = await fetch("/__save", { method: "POST", body: JSON.stringify({ name: "tlshot-" + name, svg: r.jpeg }) }).then(r => r.json());
    return s.file;
  }
  async function run(names = Object.keys(STATES), device = "xbox") {
    window.MTX?.api?.setDevice?.(device);
    if (!L().isOpen()) L().open();
    const out = [];
    for (const n of names) { L().set(STATES[n]); await new Promise(r => setTimeout(r, 150)); out.push(await shot(n)); }
    return out;
  }
  window.TL_SHOTS = { run, shot, STATES };
})();
