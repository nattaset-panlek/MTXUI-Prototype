/* Match Result · Float stack (option 1, improved) · 5 keyframes for Figma Smart Animate.
   Every keyframe has the same layers (ids) so Smart Animate moves them; hidden = opacity .01 (a 0 layer is not baked).
   K1 first point floats in · K2 all points stacked · K3 they merge into the total · K4 total flies into the rank bar · K5 done.
   Not loaded by the app: eval in the preview, then MR_FS.show(k). Needs demos/match-result-opts.js first (styles, screen). */
(function () {
  const ITEMS = [["Match RP", "Score 20 · Win by KO", "+12.5"], ["Opponent rank", "NT3 · ×1.12", "+1.5"],
    ["Early finish", "KO · Round 2 · ×1.15", "+2.1"], ["Round up", "Ceil", "+0.9"]];
  const LO = 600, HI = 700, FROM = 640, TOTAL = 17;
  const pct = v => (v - LO) / (HI - LO) * 876;           // bar inner width 876
  const G = b => window.MTX_UI.glyph(b);
  const ROW = 66;
  const K = {   // per keyframe: chips shown, chip y offset, total state, bar fill, rank value, cta, step tab
    1: { chips: 1, total: "count", sum: "12.5", fill: 0, rp: FROM, cta: "Skip", tab: 1, pop: 0 },
    2: { chips: 4, total: "count", sum: "17", fill: 0, rp: FROM, cta: "Skip", tab: 1, pop: 3 },
    3: { chips: 4, merge: true, total: "big", fill: 0, rp: FROM, cta: "Skip", tab: 2, pop: -1 },
    4: { chips: 4, merge: true, total: "fly", fill: .5, rp: 649, cta: "Skip", tab: 3, pop: -1 },
    5: { chips: 4, merge: true, total: "in", fill: 1, rp: FROM + TOTAL, cta: "Continue", tab: 3, pop: -1 },
  };
  const CSS = `
  #fs-badge{position:absolute;left:820px;top:322px;width:280px;height:280px}#fs-badge img{width:100%;height:100%}
  #fs-win{position:absolute;left:885px;top:620px;width:150px;height:30px;display:flex;align-items:center;justify-content:center;background:#f2df57;font:800 16px/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:#0d0f14}
  .fs-chip{position:absolute;left:600px;width:720px;height:56px;margin:0;display:flex;align-items:center;gap:16px;padding:0 24px;box-sizing:border-box;
    background:linear-gradient(90deg,rgb(255 0 39/.55),rgb(0 0 0/.7) 40%,rgb(0 0 0/.45));border-left:4px solid #ff0027}
  .fs-chip span{font:700 22px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}.fs-chip small{flex:1;font:500 16px/1 var(--font-ui);color:#8a8f99}
  .fs-chip b{font:700 30px/1 var(--font-ui);color:#f2df57}
  .fs-chip.is-new{background:linear-gradient(90deg,rgb(242 223 87/.35),rgb(0 0 0/.7) 45%,rgb(0 0 0/.45));border-left-color:#f2df57}
  #fs-pop{position:absolute;left:1096px;width:200px;text-align:right;font:700 44px/1 var(--font-ui);color:#f2df57;text-shadow:0 0 20px rgb(242 223 87/.6)}
  #fs-total{position:absolute;display:flex;align-items:baseline;justify-content:center;gap:12px;width:600px}
  #fs-total b{font:400 120px/1 "Modi Thorson",var(--font-ui);color:#f2df57}#fs-total span{font:700 44px/1 var(--font-ui);color:#fff7e1}
  #fs-rank{position:absolute;left:520px;top:780px;width:880px}
  #fs-rank .t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;font:700 22px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}#fs-rank .t span{color:#f2df57}
  #fs-bar{position:relative;height:26px;background:rgb(0 0 0/.6);border:1px solid #4a4e58}
  #fs-old,#fs-new{position:absolute;top:2px;bottom:2px}#fs-old{left:2px;background:#8a8f99}#fs-new{background:#2fe38a;box-shadow:0 0 18px rgb(47 227 138/.6)}
  #fs-gain{position:absolute;top:34px;font:700 20px/1 var(--font-ui);color:#2fe38a}
  #fs-rank .e{display:flex;justify-content:space-between;margin-top:8px;font:600 16px/1 var(--font-ui);color:#8a8f99}
  #fs-cta{position:absolute;left:810px;top:920px;width:300px}
  `;
  function show(k) {
    const c = K[k], rank = c.tab === 3, CH_Y = 290;
    MR_OPTS.show(1, 1);                                     // screen, background, title, CSS
    if (!document.getElementById("fs-style")) { const s = document.createElement("style"); s.id = "fs-style"; s.textContent = CSS; document.head.appendChild(s); }
    const safe = document.querySelector("#s-mresult .screen__safe");
    safe.querySelectorAll(".mr-badge,.mr1-stack,.mr-rank,.mr-cta,.mr-total").forEach(e => e.remove());
    safe.querySelectorAll(".mr-steps span").forEach((e, i) => e.className = i + 1 === c.tab ? "is-on" : i + 1 < c.tab ? "is-done" : "");
    document.querySelector("#s-mresult").dataset.screen = `match-result-fs-k${k}`;
    const chips = ITEMS.map((it, i) => {
      const on = i < c.chips, y = c.merge ? 455 : on ? CH_Y + i * ROW : CH_Y + i * ROW + 60;
      const op = c.merge ? .01 : on ? 1 : .01;
      return `<p class="fs-chip${i === c.chips - 1 && !c.merge ? " is-new" : ""}" id="fs-chip-${i + 1}" style="top:${y}px;opacity:${op}${c.merge ? ";transform:scale(.6)" : ""}"><span>${it[0]}</span><small>${it[1]}</small><b style="opacity:${i === c.pop ? .01 : 1}">${it[2]}</b></p>`;
    }).join("");
    const pop = c.pop >= 0 ? `<b id="fs-pop" style="top:${CH_Y + c.pop * ROW + 6}px">${ITEMS[c.pop][2]}</b>` : `<b id="fs-pop" style="top:420px;opacity:.01">+0</b>`;
    const T = { off: "left:660px;top:592px;opacity:.01;transform:scale(.4)", count: "left:660px;top:592px;transform:scale(.6)",
      big: "left:660px;top:423px", fly: "left:660px;top:760px;transform:scale(.35);opacity:.8", in: "left:660px;top:808px;transform:scale(.15);opacity:.01" }[c.total];
    const fillW = pct(LO + TOTAL) * c.fill, gain = c.fill === 1;
    safe.insertAdjacentHTML("beforeend", `<div id="fs-badge" style="opacity:${rank ? 1 : .01}${rank ? "" : ";transform:scale(.6)"}"><img src="mtx/assets/svg/rank-badge.svg" alt=""></div>
      ${chips}${pop}<div id="fs-total" style="${T}"><b class="tex-text">+${c.sum || TOTAL}</b><span>RP</span></div>
      <div id="fs-rank"><div class="t"><b>National Tournament 4</b><span>${c.rp} / ${HI} RP</span></div>
        <div id="fs-bar"><i id="fs-old" style="width:${pct(FROM)}px"></i><i id="fs-new" style="left:${2 + pct(FROM)}px;width:${Math.max(1, fillW)}px;opacity:${c.fill ? 1 : .01}"></i>
        <b id="fs-gain" style="left:${pct(FROM) - 10}px;opacity:${gain ? 1 : .01}">+${TOTAL} RP</b></div>
        <div class="e"><span>${LO}</span><span>${HI}  ·  NT3</span></div></div>
      <span class="btn-cta btn-cta--key${c.cta === "Skip" ? " btn-cta--secondary" : ""}" id="fs-cta"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${G("a")}<span class="btn-cta__label">${c.cta}</span></span>`);
    const hb = safe.querySelector(".mr-hints"); if (hb) hb.outerHTML = window.MTX_UI.hintBar({ a: c.cta }, { cls: "mr-hints", launcher: false });
  }
  window.MR_FS = { show };
})();
