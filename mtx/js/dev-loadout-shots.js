/* Dev helper (not loaded by index.html): 1920 x 1080 captures of every Tactical Loadout state for the Figma compare.
   Load:  document.head.append(Object.assign(document.createElement("script"), { src: "mtx/js/dev-loadout-shots.js?" + Date.now() }))
   Run:   await TL_SHOTS.run(["p02", ...])  -> bakes/mtx-tlshot-<name>-<stamp>.svg holds the JPEG as base64 (tools decode it) */
(function () {
  const L = () => window.MTX_LOADOUT;
  const base = () => ({ phranakhon: { perk: [0, 3, 4, null], special: [null, 0, 1, null], decisive: [null, 0, 1, null] }, south: { perk: [5, null, null, null], special: [null, 2, null, null], decisive: [null, 3, null, null] } });
  const sub = (type, o = {}) => ({ page: 2, view: "sub", type, mode: "slots", slot: type ? 1 : 1, cell: 0, info: null, styleIdx: 0, presets: base(), ...o });
  const STATES = {
    "p00-profile": { page: 0, view: "hub", info: null, presets: base() },
    "p00-inventory": { page: 1, view: "hub", info: null, presets: base() },
    "p01-hub": { page: 2, view: "hub", styleIdx: 0, info: null, presets: base() },
    p02: sub(0),
    p03: sub(0, { mode: "grid", cell: 6 }),
    p04: sub(0, { presets: { ...base(), phranakhon: { ...base().phranakhon, perk: [0, 6, 4, null] } } }),
    p05: sub(0, { presets: { ...base(), phranakhon: { ...base().phranakhon, perk: [0, null, 4, null] } } }),
    p06: sub(0, { mode: "grid", cell: 6, info: { lv: 1 } }),
    p06b: sub(0, { mode: "grid", cell: 6, info: { lv: 3 } }),
    p07: sub(1),
    p08: sub(1, { mode: "grid", cell: 2 }),
    p09: sub(2),
    p10: sub(2, { mode: "grid", cell: 2 })
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
