// Skill data v6: all 5 tactical styles in one file, shared by the Skill Tree and the Tactical Loadout.
// In:  tools/skilltree/source/SkillTree_PhraNakorn.csv   (sheet export "[MTX] - Player Stats - SkillTree_PhraNakorn", 2026-11-18)
//      tools/skilltree/source/wiki-1[1-4]-Skill-Tree-*.md  (wiki 08-data-tables, refreshed from the wiki repo when found)
//      tools/skilltree/layout-v4.json                       (spots + links of the tree; same graph for every style)
// Out: mtx/data/skills.json            (the data)
//      mtx/js/data/skills-data.js      (same data as window.MTX_SKILLS, loaded sync by index.html)
// Run: node tools/skilltree/build-v6.mjs  (from mtx-controller-flow/)
//
// Layout = Pack E "Silhouette", top-down (user 2026-11-18: bottom-up tried, then "ใช้บนลงล่าง"): every style has the same
// rows (y = depth from the core, core at the top; DIR "up" would make the screen flip it); each row's width follows the
// style icon's outline at that height (PN 8-point star, Chaiya square, Korat clover, Tha Sao rhombus, Lopburi
// concave star). Phra Nakorn content = the CSV; the other 4 wiki tables are skeletons (no names or numbers yet):
// their nodes get placeholder names "<Type> <code>" and placeholder: true.
import fs from "node:fs";

const here = new URL(".", import.meta.url);
const src = f => new URL("source/" + f, here);
const WIKI = "C:/Personal/mtxworkingstation/pages/08-data-tables/";
const layout = JSON.parse(fs.readFileSync(new URL("layout-v4.json", here), "utf8"));

//#region styles (ids / colours = screen-tactical.js STYLES)
const STYLES = [
  { id: "phranakhon", name: "Phra Nakorn", th: "พระนคร", color: "#e6003f", dark: "#680920", prefix: "pn", source: "csv", shape: "star8" },
  { id: "south", name: "Chaiya", th: "ไชยา", color: "#5fc8e6", dark: "#1c5163", prefix: "cy", source: "11-Skill-Tree-Chaiya", shape: "square" },
  { id: "isan", name: "Korat", th: "โคราช", color: "#c9ff00", dark: "#76980a", prefix: "kr", source: "12-Skill-Tree-Korat", shape: "clover" },
  { id: "north", name: "Tha Sao", th: "ท่าเสา", color: "#4b00d6", dark: "#230064", prefix: "ts", source: "13-Skill-Tree-ThaSao", shape: "rhombus" },
  { id: "west", name: "Lopburi", th: "ลพบุรี", color: "#f96000", dark: "#6e2a00", prefix: "lb", source: "14-Skill-Tree-Lopburi", shape: "astroid" }
];
//#endregion

//#region sources -> rows [code, th, en, type, usage, tag, level, descTh, cooldown, desc]
function parseCsv(t) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(r => r.map(c => c.trim()));
}
function parseMd(md) {
  const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(s => s.trim().replace(/<br>/g, " "));
  return md.split("\n").filter(l => l.startsWith("|") && !/^\|\s*-/.test(l)).slice(1).map(cells);
}
function readStyle(st) {
  if (st.source === "csv") return parseCsv(fs.readFileSync(src("SkillTree_PhraNakorn.csv"), "utf8"));
  const f = `wiki-${st.source}.md`;
  try { fs.writeFileSync(src(f), fs.readFileSync(WIKI + st.source + ".md", "utf8")); } catch { console.log(`${st.source}: wiki repo not found, using snapshot`); }
  return parseMd(fs.readFileSync(src(f), "utf8"));
}
const KIND = { "DSM": "decisive", "Mini-Perk": "attribute", "Perk": "perk", "Signature Move": "signature", "Special Move": "special" };
const num = s => (s === "-" || s === "" || isNaN(+s) ? 0 : +s);
function entriesOf(rows) {
  const out = []; let lastCode = "", after = 0;
  for (const [code, th = "", en = "", type = "", usage = "", tag = "", level = "", descTh = "", cd = "", desc = ""] of rows) {
    if (!type && /^[23]$/.test(level)) { out.at(-1).levels.push({ lv: +level, descTh, desc }); continue; }
    if (code) { lastCode = code; after = 0; } else after++;
    out.push({ ref: code || `${lastCode}+${after}`, code, kind: KIND[type], wikiType: type, usage, tag: tag.toLowerCase(),
      en, th, cooldown: num(cd), levels: [{ lv: level === "Default" ? 0 : +level || 1, descTh, desc }] });
  }
  return out;
}
//#endregion

//#region tree spots: v4 layout id -> [Phra Nakorn id, wiki ref] (same as build-v5)
const SLOTS = {
  pn1_root: ["pn1_root", "0"],
  pn2_block: ["pn2_block", "1-1"], pn_fin: ["pn_fin", "1-1-1"], pn4_crit: ["pn4_crit", "1-1-2"],
  pn5_staregen: ["pn5_staregen", "1-1-2+1"], pn6_dsmA1: ["pn6_dsmA1", "1-1-2+2"],
  pn3_maxsta: ["pn3_maxsta", "1-2"], pn_rest: ["pn_rest", "1-2-1"], pn13_maxstaeff: ["pn13_maxstaeff", "1-2-2"],
  pn14_sgm1: ["pn14_sgm1", "1-2-2+1"], pn15_dsmB1: ["pn15_dsmB1", "1-2-2+2"],
  pn16_combosta: ["pn16_combosta", "2-1"], pn_trip: ["pn_trip", "2-1-1"], pn18_combopow: ["pn18_combopow", "2-1-2"],
  pn19_sgm2: ["pn19_sgm2", "2-1-2+1"], pn20_dsmA2: ["pn20_dsmA2", "2-1-2+2"],
  pn17_hopsta: ["pn17_hopsta", "2-2"], pn_fluid: ["pn_fluid", "2-2-1"], pn27_knee: ["pn27_knee", "2-2-2"],
  pn28_spe1: ["pn28_spe1", "2-2-2+1"], pn29_dsmC1: ["pn29_dsmC1", "2-2-2+2"],
  pn30_punch: ["pn30_punch", "3-1"], pn_tiger: ["pn_tiger", "3-1-1"], pn35_spe2: ["pn35_spe2", "3-1-1+1"],
  pn_cc: ["pn_cc", "3-1-2 / 3-2-1"], pn39_dsmB2: ["pn39_dsmB2", "3-1-2 / 3-2-1+1"],
  pn31_sgm3: ["pn31_kick", "3-2"], pn_rel: ["pn_rel", "3-2-2"], pn43_dsmC2: ["pn43_dsmC2", "3-2-2+1"],
  pn44_sgm4: ["pn44_sgm3", "4-1"], pn45_elbow: ["pn45_elbow", "4-2"],
  pn_stead: ["pn_stead", "4-1-1"], pn49_dsmA3: ["pn49_dsmA3", "4-1-1+1"],
  pn_def: ["pn_three", "4-1-2,4-2-1"], pn53_dsmB3: ["pn53_spe3", "4-1-2,4-2-1+1"],
  pn_three: ["pn_def", "4-2-2"], pn57_spe3: ["pn57_dsmB3", "4-2-2+1"],
  pn_alt: ["pn_alt", "5-1-2"], pn_odds: ["pn_odds", "5-1-1"], pn64_spe4: ["pn64_spe4", "5-1"],
  pn_flaw: ["pn_flaw", "5-2-2"], pn_war: ["pn_war", "5-2-1"], pn71_dsmC3: ["pn71_dsmC3", "5-2"]
};
// decisive family / tier by tree spot (the wiki order of Phra Nakorn; skeleton styles have no DSM names)
const DSM_SPOT = { "1-1-2+2": ["A", 1], "1-2-2+2": ["B", 1], "2-1-2+2": ["A", 2], "2-2-2+2": ["C", 1], "3-1-2 / 3-2-1+1": ["B", 2],
  "3-2-2+1": ["C", 2], "4-2-2+1": ["B", 3], "4-1-1+1": ["A", 3], "5-2": ["C", 3] };
//#endregion

//#region placeholders (not in the sheet yet)
const FLAVOR = {
  "Block Strength": "Raises the block gauge so your guard holds through longer combos.",
  "Max Stamina": "Increases maximum stamina for longer exchanges.",
  "Critical Damage": "Critical hits deal extra damage.",
  "Critical Rate": "Hits land as criticals more often.",
  "Damage Reduction": "Every hit you take deals less damage.",
  "Stamina Regeneration": "Stamina comes back faster between exchanges.",
  "Combo Stamina Efficiency": "Combos of three hits or more cost less stamina.",
  "Hop Stamina Efficiency": "Switch-steps and hops cost less stamina.",
  "Knee Power": "Knees deal more damage, more again in the clinch.",
  "Punch Power": "Punches deal more damage.",
  "Kick Power": "Kicks deal more damage.",
  "Elbow Power": "Elbows deal more damage and cut more often."
};
const PN_DECISIVE = {
  A: { id: "monyanlak", desc: "\"The Mon holds up the pillar\": a straight push kick that stops the rush and opens the counter.", part: "Knee 40% / Punch 30% / Kick 30%" },
  B: { id: "salabfanpla", desc: "\"Fish-tooth zigzag\": slip off the line on the diagonal and answer from the blind side.", part: "Punch 50% / Elbow 30% / Kick 20%" },
  C: { id: "jorakhefadhang", desc: "\"The crocodile whips its tail\": a spinning back kick that ends the exchange.", part: "Kick 70% / Elbow 30%" }
};
const DECISIVE_DMG = [100, 100, 125, 150];
const PN_SIGNATURE = [
  { name: "Te Tad", desc: "Signature move of the Phra Nakorn style: a slicing round kick that cuts across the guard.", damage: 16, target: "Body", stamina: 18, input: ["lt", "y"] },
  { name: "Teep Trong", desc: "Signature move of the Phra Nakorn style: a straight push kick that keeps the rush away.", damage: 14, target: "Body", stamina: 15, input: ["lt", "b"] },
  { name: "Sok Tad", desc: "Signature move of the Phra Nakorn style: a horizontal elbow that breaks a high guard.", damage: 18, target: "Head", stamina: 20, input: ["lt", "a"] }
];
const PN_SPECIAL = [
  { name: "Jumping Knee", desc: "A leaping knee that closes the distance in one beat.", damage: 24, target: "Head", stamina: 28 },
  { name: "Spinning Elbow", desc: "A spinning back elbow that turns the exchange around in one beat.", damage: 22, target: "Head", stamina: 25 },
  { name: "Superman Punch", desc: "A jumping cross thrown off a faked kick.", damage: 20, target: "Head", stamina: 22 },
  { name: "Flying Kick", desc: "A flying round kick that ends the exchange.", damage: 26, target: "Body", stamina: 30 }
];
const SIG_KEYS = [["lt", "y"], ["lt", "b"], ["lt", "a"], ["lt", "x"]];
// granted DSM (user 2026-11-17): free with the style, under the core, never bought or upgraded (was injected by screen-skilltree.js)
const GRANTED = { phranakhon: { name: "Hak Nguang Aiyara", th: "หักงวงไอยรา", desc: "Granted with the style: a trap-and-break on the opponent's arm. Not bought or upgraded in the tree.", part: "Elbow 50% / Knee 50%" } };
//#endregion

//#region layout: Pack E silhouette (row width = icon outline width at that height)
const PI = Math.PI, abs = Math.abs;
const SHAPE = {
  star8: p => 0.72 + 0.28 * Math.pow(abs(Math.cos(4 * p)), 3),
  square: p => 1 / (Math.SQRT2 * Math.max(abs(Math.sin(p)), abs(Math.cos(p)))),
  clover: p => 0.66 + 0.34 * Math.pow(abs(Math.cos(2 * p)), 0.6),
  rhombus: p => 1 / (abs(Math.sin(p)) + abs(Math.cos(p))),
  astroid: p => 0.42 + 0.58 * Math.pow(Math.pow(abs(Math.sin(p)), 2 / 3) + Math.pow(abs(Math.cos(p)), 2 / 3), -1.5)
};
function profile(R) {   // half-width by height, t 0 = top tip .. 1 = bottom tip, normalised to 1
  const bins = new Array(41).fill(0);
  for (let i = 0; i < 1440; i++) {
    const p = i / 1440 * 2 * PI, r = R(p), x = abs(r * Math.sin(p)), y = r * Math.cos(p), b = Math.round((1 - y) / 2 * 40);
    if (b >= 0 && b <= 40) bins[b] = Math.max(bins[b], x);
  }
  const m = Math.max(...bins);
  return t => bins[Math.round(Math.min(1, Math.max(0, t)) * 40)] / m;
}
const MAXY = Math.max(...layout.nodes.map(n => n.y));
const F_MIN = 0.72, F_MAX = 1.35;   // row width factor: narrowest rows keep 180 px between nodes, widest 1.35x the v4 tree
const DIR = "down";   // "down" = core at the top (current), "up" = core at the bottom
const rowFactor = (w, y) => Math.max(F_MIN, F_MAX * Math.pow(w(DIR === "up" ? 1 - y / MAXY : y / MAXY), 1.4));
//#endregion

const TYPE = { core: "root", attribute: "stat", perk: "perk", signature: "sgm", special: "spe", decisive: "dsm" };
const dot = t => t.replace(/\s+$/, "").replace(/([^.])$/, "$1.");
function splitFlaw(t) {
  const m = /^(.*?)(?:\.\s*However,\s*|,\s*but\s+)(.+)$/.exec(t);
  if (!m) return [dot(t), ""];
  const d = m[2].replace(/\.?\s*$/, ".");
  return [m[1].replace(/\s+$/, "") + ".", d[0].toUpperCase() + d.slice(1)];
}
const KIND_EN = { attribute: "Attribute", perk: "Perk", signature: "Signature", special: "Special", decisive: "DSM" };
const cleanCode = r => r.replace(/\s/g, "");
const okName = s => s && s.length <= 24 && !/weak\s*posture/i.test(s);

const out = { version: 6, built: new Date().toISOString().slice(0, 10), layout: { pack: "E", dir: DIR, maxY: MAXY }, styleOrder: STYLES.map(s => s.id), styles: {} };
for (const st of STYLES) {
  const pn = st.id === "phranakhon";
  const entries = entriesOf(readStyle(st)), byRef = new Map(entries.map(e => [e.ref, e]));
  const w = profile(SHAPE[st.shape]);
  const idFor = (lid, ref) => pn ? SLOTS[lid][0] : `${st.prefix}_${cleanCode(ref).replace(/[-/,]/g, "_").replace(/\+/g, "p")}`;
  const nodes = [], idOf = {}, used = new Set();
  let sig = 0, spe = 0;
  for (const L of layout.nodes) {
    const [, ref] = SLOTS[L.id], id = idFor(L.id, ref);
    const e = byRef.get(ref) || (ref === "0" ? { ref: "0", code: "0", kind: "core", wikiType: "", usage: "", tag: "attack", en: "", th: "", levels: [{ desc: "" }] } : null);
    if (!e) throw new Error(`${st.id}: no row ${ref}`);
    used.add(ref); idOf[L.id] = id;
    const kind = ref === "0" ? "core" : e.kind;
    if (!kind) throw new Error(`${st.id}: unknown type at ${ref}`);
    const n = { id, ref, code: e.code, chapter: +(ref.match(/^\d/) || [0])[0], kind, type: TYPE[kind], wikiType: e.wikiType,
      usage: e.usage, tag: e.tag || "attack", base: kind === "core", x: Math.round(L.x * rowFactor(w, L.y)), y: L.y, icon: L.icon };
    const ph = (name, extra = {}) => Object.assign(n, { name, th: "", desc: "Not defined in the wiki yet.", placeholder: true }, extra);
    if (kind === "core") {
      Object.assign(n, { name: pn ? e.en : `${st.name} Core`, th: pn ? e.th : st.th, desc: `${st.name} core. Every branch of the tree starts here.` });
    } else if (kind === "attribute") {
      const [, stat, v] = /^(.*?)\s*\+\s*([\d.]+)$/.exec(e.levels[0].desc || "") || [];
      if (stat) Object.assign(n, { name: stat, th: e.th || stat, desc: FLAVOR[stat] || "", bonus: [{ stat, value: +v }] });
      else ph(`Attribute ${cleanCode(ref)}`, { bonus: [] });
    } else if (kind === "perk") {
      const filled = pn && e.levels.every(l => l.desc);
      const lv = [1, 2, 3].map(k => e.levels.find(l => l.lv === k) || { lv: k, desc: "", descTh: "" });
      Object.assign(n, {
        name: filled ? e.en : okName(e.th) ? e.th : `Perk ${cleanCode(ref)}`, th: filled ? e.th : "", cooldown: e.cooldown,
        levels: lv.map(l => {
          if (!filled) return { lv: l.lv, buff: "Effect not defined yet.", flaw: l.lv === 3 ? "Drawback not defined yet." : "", desc: "Effect not defined yet.", descTh: "" };
          const [buff, flaw] = l.lv === 3 ? splitFlaw(l.desc) : [dot(l.desc), ""];
          return { lv: l.lv, buff, flaw, desc: dot(l.desc), descTh: l.descTh };
        })
      });
      if (!filled) { n.placeholder = true; n.desc = okName(e.th) && e.en ? e.en : "Not defined in the wiki yet."; }
    } else if (kind === "decisive") {
      const [fam, tier] = DSM_SPOT[ref] || [];
      if (!fam) throw new Error(`${st.id}: DSM at unknown spot ${ref}`);
      if (pn) {
        const [, famEn] = /^(.*?) Tier \d$/.exec(e.en), [, famTh] = /^(.*?) Tier \d$/.exec(e.th), D = PN_DECISIVE[fam];
        Object.assign(n, { name: famEn, th: famTh, family: D.id, tier, desc: D.desc, stats: { baseDamage: DECISIVE_DMG[tier], damagePart: D.part, placeholder: true } });
      } else {
        Object.assign(n, { name: `DSM ${fam}`, th: "", family: `${st.prefix}_dsm${fam.toLowerCase()}`, tier, desc: "Not defined in the wiki yet.", placeholder: true,
          stats: { baseDamage: DECISIVE_DMG[tier], damagePart: "TBD", placeholder: true } });
      }
    } else {
      const k = kind === "signature" ? sig++ : spe++;
      const M = pn ? (kind === "signature" ? PN_SIGNATURE : PN_SPECIAL)[k] : null;
      if (M) { const { name, desc, ...stats } = M; Object.assign(n, { name, th: "", desc, stats: { ...stats, placeholder: true } }); }
      else ph(`${KIND_EN[kind]} ${cleanCode(ref)}`, { stats: { damage: 20, target: "Body", stamina: 20, ...(kind === "signature" ? { input: SIG_KEYS[k % 4] } : {}), placeholder: true } });
    }
    nodes.push(n);
  }
  const unused = entries.filter(e => !used.has(e.ref)).map(e => e.ref);
  if (unused.length) throw new Error(`${st.id}: rows without a tree spot: ${unused.join(", ")}`);
  // granted DSM under the core (x 0, y 140), free
  const G = GRANTED[st.id];
  nodes.push({ id: `${st.prefix}_dsm_granted`, ref: "granted", code: "", chapter: 0, kind: "decisive", type: "dsm", wikiType: "DSM", usage: "Trigger Use", tag: "attack",
    base: true, granted: true, x: 0, y: 140, icon: "mtx/assets/svg/skill/thai_dsm_a.svg", tier: 1, family: `${st.prefix}_granted`,
    name: G?.name || "Granted DSM", th: G?.th || "", desc: G?.desc || "Granted with the style. Not defined in the wiki yet.", ...(G ? {} : { placeholder: true }),
    stats: { baseDamage: 90, damagePart: G?.part || "TBD", placeholder: true } });
  const edges = layout.edges.map(e => ({ id: `${st.prefix}${e.id.slice(2)}`, from: idOf[e.from], to: idOf[e.to], needLv: e.needLv || 1 }));
  const families = {};
  for (const n of nodes.filter(n => n.kind === "decisive" && !n.granted)) {
    const f = families[n.family] ||= { id: n.family, name: n.name, th: n.th, tiers: [] };
    f.tiers[n.tier - 1] = n.id;
  }
  const { source, shape, ...meta } = st;
  out.styles[st.id] = { ...meta, shape, source: pn ? "sheet SkillTree_PhraNakorn (csv 2026-11-18)" : "wiki " + source, status: pn ? "filled" : "skeleton", nodes, edges, families };
  const c = k => nodes.filter(n => n.kind === k).length;
  console.log(`${st.id}: ${nodes.length} nodes (attr ${c("attribute")}, perk ${c("perk")}, dsm ${c("decisive")}, sgm ${c("signature")}, spe ${c("special")}), ${edges.length} edges, x ${Math.min(...nodes.map(n => n.x))}..${Math.max(...nodes.map(n => n.x))}`);
}

const json = JSON.stringify(out);
fs.writeFileSync(new URL("../../mtx/data/skills.json", here), JSON.stringify(out, null, 1));
fs.writeFileSync(new URL("../../mtx/js/data/skills-data.js", here),
  `/* Skill data v6 (5 styles). Generated by tools/skilltree/build-v6.mjs from the sheet CSV + wiki tables; same content as mtx/data/skills.json.
   Do not edit by hand. Read by screen-skilltree.js (window.MTX_TREE = the selected style) and screen-loadout.js. */
window.MTX_SKILLS = ${json};
`);
