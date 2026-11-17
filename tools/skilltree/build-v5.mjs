// Skill tree v5: node data follows the wiki table "Skill Tree PhraNakorn" (08-data-tables/10-Skill-Tree-PhraNakorn.md).
// In:  wiki md  (C:/Personal/mtxworkingstation/pages/08-data-tables/10-Skill-Tree-PhraNakorn.md, falls back to the
//               snapshot tools/skilltree/wiki-10-Skill-Tree-PhraNakorn.md; the snapshot is refreshed on every run)
//      tools/skilltree/layout-v4.json  (positions, icons, links of the v4 tree; only layout, no content)
// Out: mtx/js/skilltree-data.js  (window.MTX_TREE, version 5)
// Run: node tools/skilltree/build-v5.mjs  (from mtx-controller-flow/)
//
// Each wiki row becomes one entry with a "ref": its Chapter/Chunk code, or "<last code>+N" for the Nth uncoded row
// after it (e.g. "1-1-2+2" = Mon Yan Lak Tier 1, the 2nd row after Critical Damage). Level 2/3 rows join the perk above.
// SLOTS below puts each ref on a tree spot of layout-v4. Numbers the wiki does not have yet (move damage, stamina,
// input, decisive damage split, flavour text) come from PLACEHOLDER and are marked "placeholder": true.
import fs from "node:fs";

const here = new URL(".", import.meta.url);
const WIKI_SRC = "C:/Personal/mtxworkingstation/pages/08-data-tables/10-Skill-Tree-PhraNakorn.md";
const SNAP = new URL("wiki-10-Skill-Tree-PhraNakorn.md", here);
let md;
try { md = fs.readFileSync(WIKI_SRC, "utf8"); fs.writeFileSync(SNAP, md); }
catch { md = fs.readFileSync(SNAP, "utf8"); console.log("wiki repo not found, using snapshot"); }
const layout = JSON.parse(fs.readFileSync(new URL("layout-v4.json", here), "utf8"));

//#region wiki table -> entries
const KIND = { "DSM": "decisive", "Mini-Perk": "attribute", "Perk": "perk", "Signature Move": "signature", "Special Move": "special" };
const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(s => s.trim());
const rows = md.split("\n").filter(l => l.startsWith("|") && !/^\|\s*-/.test(l)).slice(1).map(cells);
const num = s => (s === "-" || s === "" ? 0 : +s);
const entries = [];
let lastCode = "", after = 0;
for (const [code, th, en, type, usage, tag, level, descTh, cd, desc] of rows) {
  if (!type && /^[23]$/.test(level)) {   // Lv 2 / Lv 3 of the perk above
    entries.at(-1).levels.push({ lv: +level, descTh, desc });
    continue;
  }
  if (code) { lastCode = code; after = 0; } else after++;
  entries.push({
    ref: code || `${lastCode}+${after}`, code, kind: KIND[type], wikiType: type, usage, tag: tag.toLowerCase(),
    en, th, cooldown: num(cd), levels: [{ lv: level === "Default" ? 0 : +level, descTh, desc }]
  });
}
const byRef = new Map(entries.map(e => [e.ref, e]));
//#endregion

//#region tree spots: v4 layout id -> [new id, wiki ref]
// Chapter 4 follows the wiki: Three-Step Pacing (4-1-2,4-2-1, shared) sits in the middle with the Special under it,
// Defensive Breaker (4-2-2) on the right with Salab Fan Pla Tier 3 under it. 3-2 is Kick Power (was a 4th SGM slot).
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
//#endregion

//#region placeholders (not in the wiki yet)
const FLAVOR = {
  "Block Gauge": "Raises the block gauge so your guard holds through longer combos.",
  "Max Stamina": "Increases maximum stamina for longer exchanges.",
  "Critical Damage": "Critical hits deal extra damage.",
  "Stamina Regeneration": "Stamina comes back faster between exchanges.",
  "Max Stamina Efficiency": "Strikes cost less stamina while it is above half.",
  "Combo Stamina Efficiency": "Combos of three hits or more cost less stamina.",
  "Hop Stamina Efficiency": "Switch-steps and hops cost less stamina.",
  "Combo Power": "Each hit in a combo deals more damage than the last.",
  "Knee Power": "Knees deal more damage, more again in the clinch.",
  "Punch Power": "Punches deal more damage.",
  "Kick Power": "Kicks deal more damage.",
  "Elbow Power": "Elbows deal more damage and cut more often."
};
const DECISIVE = {   // family -> flavour, damage split; base damage per tier
  "Mon Yan Lak": { id: "monyanlak", desc: "\"The Mon holds up the pillar\": a straight push kick that stops the rush and opens the counter.", part: "Knee 40% / Punch 30% / Kick 30%" },
  "Salab Fan Pla": { id: "salabfanpla", desc: "\"Fish-tooth zigzag\": slip off the line on the diagonal and answer from the blind side.", part: "Punch 50% / Elbow 30% / Kick 20%" },
  "Jorakhe Fad Hang": { id: "jorakhefadhang", desc: "\"The crocodile whips its tail\": a spinning back kick that ends the exchange.", part: "Kick 70% / Elbow 30%" }
};
const DECISIVE_DMG = [100, 100, 125, 150];   // by tier (0 = Tier Initial)
// input = in-fight keys of the slot, same placeholder scheme as screen-customize.js SLOT_KEYS.signature (LB = action "lt" + Y / B / A)
const SIGNATURE = [   // by signature slot order in the tree
  { name: "Te Tad", desc: "Signature move of the Phra Nakorn style: a slicing round kick that cuts across the guard.", damage: 16, target: "Body", stamina: 18, input: ["lt", "y"] },
  { name: "Teep Trong", desc: "Signature move of the Phra Nakorn style: a straight push kick that keeps the rush away.", damage: 14, target: "Body", stamina: 15, input: ["lt", "b"] },
  { name: "Sok Tad", desc: "Signature move of the Phra Nakorn style: a horizontal elbow that breaks a high guard.", damage: 18, target: "Head", stamina: 20, input: ["lt", "a"] }
];
const SPECIAL = [
  { name: "Jumping Knee", desc: "A leaping knee that closes the distance in one beat.", damage: 24, target: "Head", stamina: 28 },
  { name: "Spinning Elbow", desc: "A spinning back elbow that turns the exchange around in one beat.", damage: 22, target: "Head", stamina: 25 },
  { name: "Superman Punch", desc: "A jumping cross thrown off a faked kick.", damage: 20, target: "Head", stamina: 22 },
  { name: "Flying Kick", desc: "A flying round kick that ends the exchange.", damage: 26, target: "Body", stamina: 30 }
];
//#endregion

// Lv 3 text = buff + flaw ("However, ..." or ", but ...")
function splitFlaw(t) {
  const m = /^(.*?)(?:\.\s*However,\s*|,\s*but\s+)(.+)$/.exec(t);
  if (!m) return [dot(t), ""];
  const d = m[2].replace(/\.?\s*$/, ".");
  return [m[1].replace(/\s+$/, "") + ".", d[0].toUpperCase() + d.slice(1)];
}
const dot = t => t.replace(/\s+$/, "").replace(/([^.])$/, "$1.");
const TYPE = { core: "root", attribute: "stat", perk: "perk", signature: "sgm", special: "spe", decisive: "dsm" };

const nodes = [], idOf = {}, used = new Set();
let sig = 0, spe = 0;
for (const L of layout.nodes) {
  const slot = SLOTS[L.id];
  if (!slot) throw new Error("no slot for " + L.id);
  const [id, ref] = slot, e = byRef.get(ref);
  if (!e) throw new Error("no wiki row " + ref);
  used.add(ref);
  idOf[L.id] = id;
  const kind = ref === "0" ? "core" : e.kind;
  const n = {
    id, ref, code: e.code, chapter: +(ref.match(/^\d/) || [0])[0], kind, type: TYPE[kind],
    wikiType: e.wikiType, usage: e.usage, tag: e.tag, base: kind === "core",
    x: L.x, y: L.y, icon: L.icon
  };
  if (kind === "core") {
    Object.assign(n, { name: e.en, th: e.th, desc: "Phra Nakorn core. Every branch of the tree starts here." });
  } else if (kind === "attribute") {
    const [, stat, v] = /^(.*?)\s*\+\s*([\d.]+)$/.exec(e.levels[0].desc) || [];
    if (!stat) throw new Error("attribute without +N: " + ref);
    Object.assign(n, { name: stat, th: e.th || stat, wikiName: e.en, desc: FLAVOR[stat] || "", bonus: [{ stat, value: +v }] });
  } else if (kind === "perk") {
    Object.assign(n, {
      name: e.en, th: e.th, cooldown: e.cooldown,
      levels: e.levels.map(l => {
        const [buff, flaw] = l.lv === 3 ? splitFlaw(l.desc) : [dot(l.desc), ""];
        return { lv: l.lv, buff, flaw, desc: dot(l.desc), descTh: l.descTh };
      })
    });
  } else if (kind === "decisive") {
    const [, fam, tier] = /^(.*?) Tier (\d)$/.exec(e.en);
    const [, famTh] = /^(.*?) Tier \d$/.exec(e.th);
    const D = DECISIVE[fam];
    Object.assign(n, {
      name: fam, th: famTh, family: D.id, tier: +tier, desc: D.desc,
      stats: { baseDamage: DECISIVE_DMG[+tier], damagePart: D.part, placeholder: true }
    });
  } else {
    const M = kind === "signature" ? SIGNATURE[sig++] : SPECIAL[spe++];
    const { name, desc, ...stats } = M;
    Object.assign(n, { name, th: "", desc, stats: { ...stats, placeholder: true } });
  }
  nodes.push(n);
}
const unused = entries.filter(e => !used.has(e.ref)).map(e => e.ref);
if (unused.length) throw new Error("wiki rows without a tree spot: " + unused.join(", "));

const edges = layout.edges.map(e => ({ ...e, from: idOf[e.from], to: idOf[e.to] }));

// decisive families: tier node ids in order
const families = {};
for (const n of nodes.filter(n => n.kind === "decisive")) {
  const f = families[n.family] ||= { id: n.family, name: n.name, th: n.th, tiers: [] };
  f.tiers[n.tier - 1] = n.id;
}

const out = `/* Skill tree v5: content from the wiki table "Skill Tree PhraNakorn" (08-data-tables/10-Skill-Tree-PhraNakorn.md),
   layout from v4. Generated by tools/skilltree/build-v5.mjs. Do not edit by hand: change the wiki (or the build's
   PLACEHOLDER tables for numbers the wiki does not have yet) and run the build. Schema: see the build file header. */
window.MTX_TREE = ${JSON.stringify({ version: 5, source: "wiki 10-Skill-Tree-PhraNakorn", nodes, edges, families })};
`;
fs.writeFileSync(new URL("../../mtx/js/skilltree-data.js", here), out);
const count = k => nodes.filter(n => n.kind === k).length;
console.log(`nodes ${nodes.length}: attribute ${count("attribute")}, perk ${count("perk")}, decisive ${count("decisive")}, signature ${count("signature")}, special ${count("special")} · edges ${edges.length}`);
