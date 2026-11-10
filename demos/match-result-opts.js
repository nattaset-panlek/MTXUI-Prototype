/* Match Result (Ranked RP) · 6 design options × 3 transition steps, for baking to Figma.
   Not loaded by the app. In the preview: eval this file, then MR_OPTS.show(o, s) (o 1-6, s 1-3) and bake.
   Base: RP G2 segment bar (Figma 350:38293). Look: v4 Statistics (327:28876). Layout cue: user's "COMPLETED +1500 EXP" sample.
   Steps: 1 points float in one by one · 2 they add up to the total · 3 the total drops into the rank progression bar. */
(function () {
  const IMG = "mtx/assets/img/";
  const ITEMS = [["Match RP", "Score 20 · Win by KO", "+12.5"], ["Opponent rank", "NT3 · ×1.12", "+1.5"],
    ["Early finish", "KO · Round 2 · ×1.15", "+2.1"], ["Round up", "Ceil", "+0.9"]];
  const TOTAL = 17, FROM = 640, LO = 600, HI = 700;
  const pct = v => ((v - LO) / (HI - LO) * 100).toFixed(1) + "%";
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const cta = l => `<span class="btn-cta btn-cta--key mr-cta"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${G("a")}<span class="btn-cta__label">${l}</span></span>`;
  const hints = s => window.MTX_UI.hintBar(s < 3 ? { a: "Skip" } : { a: "Continue" }, { cls: "mr-hints", launcher: false });
  const head = s => `<i class="mr-titlebar"></i><h1 class="page-title tex-text mr-title">Ranked Result</h1>
    <div class="mr-steps">${["Points", "Total", "Rank"].map((t, i) => `<span class="${i + 1 === s ? "is-on" : i + 1 < s ? "is-done" : ""}">${i + 1}  ${t}</span>`).join("")}</div>`;
  // which items are visible at step 1: three landed, the fourth still flying in
  const st = (i, s) => s > 1 ? "" : i < 3 ? "" : " is-fly";
  const bar = (s, cls = "") => `<div class="mr-rank ${cls}"><div class="mr-rank__top"><b>National Tournament 4</b><span>${s === 3 ? FROM + TOTAL : FROM} / ${HI} RP</span></div>
    <div class="mr-rank__bar"><i class="mr-rank__old" style="width:${pct(FROM)}"></i>${s === 3 ? `<i class="mr-rank__new" style="left:${pct(FROM)};width:${pct(LO + TOTAL)}"></i>` : ""}</div>
    <div class="mr-rank__ends"><span>${LO}</span><span>${HI}  ·  NT3</span></div></div>`;
  const badge = (cls = "") => `<div class="mr-badge ${cls}"><img src="mtx/assets/svg/rank-badge.svg" alt=""></div>`;
  const total = (s, cls = "") => `<div class="mr-total ${cls}${s === 1 ? " is-ghost" : ""}"><b class="tex-text">+${s === 1 ? "14.1" : TOTAL}</b><span>RP</span></div>`;

  const OPTS = {
    // 1 · Float stack: chips rise one by one in the middle, add up under the rank badge, drop into the bar
    1: s => `${badge("mr1-badge")}<div class="mr1-stack">${s === 1 ? ITEMS.map((it, i) => `<p class="mr-chip${st(i, s)}"><span>${it[0]}</span><small>${it[1]}</small><b>${it[2]}</b></p>`).join("") : ""}</div>
      ${s > 1 ? total(s, "mr1-total" + (s === 3 ? " is-landed" : "")) : ""}${bar(s, "mr1-bar")}`,
    // 2 · Ledger rows: the Statistics rows list each source, a yellow total row, then the bar
    2: s => `<section class="mr2">${ITEMS.map((it, i) => `<p class="mr2-row${i % 2 ? "" : " is-red"}${st(i, s)}"><b>${it[0]}</b><span>${it[1]}</span><em>${it[2]}</em></p>`).join("")}
      <p class="mr2-row mr2-row--total${s === 1 ? " is-ghost" : ""}"><b>Total RP</b><span>${s === 1 ? "counting…" : "12.5 + 4.5 modifiers · round up"}</span><em>+${s === 1 ? "14.1" : TOTAL}</em></p></section>${bar(s, "mr2-bar" + (s === 1 ? " is-dim" : ""))}`,
    // 3 · Reward cards: the sample's layout; badge + big total centre, one card per source along the bottom
    3: s => `${badge("mr3-badge")}${total(s, "mr3-total")}${bar(s, "mr3-bar" + (s === 1 ? " is-dim" : ""))}
      <div class="mr3-cards">${ITEMS.map((it, i) => `<div class="mr3-card${st(i, s)}${s === 3 ? " is-spent" : ""}"><i class="mr3-tick"></i><b><em>${it[2]}</em> ${it[0]}</b><p>${it[1]}</p></div>`).join("")}</div>`,
    // 4 · Segment bar (RP G2): each source becomes a segment that pushes in; the joined bar slides into the rank bar
    4: s => `<div class="mr4">${s < 3 ? `<div class="mr4-labels">${ITEMS.map((it, i) => `<p class="${st(i, s)}" style="width:${[62, 12, 16, 10][i]}%"><span>${it[0]}</span><small>${it[1]}</small></p>`).join("")}</div>
      <div class="mr4-track">${ITEMS.map((it, i) => `<i class="mr4-seg${i ? " is-mod" : ""}${st(i, s)}" style="width:${[62, 12, 16, 10][i]}%"></i>`).join("")}</div>
      <div class="mr4-vals">${ITEMS.map((it, i) => `<b class="${st(i, s)}" style="width:${[62, 12, 16, 10][i]}%">${it[2]}</b>`).join("")}</div>` : ""}</div>
      ${s > 1 ? total(s, "mr4-total") : ""}${bar(s, "mr4-bar" + (s === 1 ? " is-dim" : ""))}`,
    // 5 · Side feed: a feed on the left fills top-down, the right column counts up and fills
    5: s => `<div class="mr5-feed">${ITEMS.map((it, i) => `<p class="mr5-item${st(i, s)}${s > 1 ? " is-merged" : ""}"><b>${it[2]}</b><span>${it[0]}</span><small>${it[1]}</small></p>`).join("")}</div>
      <div class="mr5-side">${badge("mr5-badge")}${total(s, "mr5-total")}${bar(s, "mr5-bar")}</div>`,
    // 6 · Ring: the rank ring around the badge; points orbit in from the right, the total fills the ring
    6: s => `<div class="mr6-ring" style="--old:${pct(FROM)};--new:${s === 3 ? pct(FROM + TOTAL) : pct(FROM)}">${badge("mr6-badge")}</div>
      <div class="mr6-list">${ITEMS.map((it, i) => `<p class="mr-chip${st(i, s)}${s > 1 ? " is-merged" : ""}"><span>${it[0]}</span><small>${it[1]}</small><b>${it[2]}</b></p>`).join("")}</div>
      ${total(s, "mr6-total")}<p class="mr6-rank"><b>National Tournament 4</b><span>${s === 3 ? FROM + TOTAL : FROM} / ${HI} RP  ·  next NT3</span></p>`,
  };

  const CSS = `
  #s-mresult .mr-arena{position:absolute;inset:0;background:url(${IMG}result-arena.jpg) 0 0/1920px 1074px no-repeat,#1a1a1a}
  #s-mresult .mr-dim{position:absolute;inset:0;background:linear-gradient(180deg,rgb(13 15 20/.55),rgb(13 15 20/.85))}
  .mr-titlebar{position:absolute;left:520px;top:66px;width:882px;height:54px;background:linear-gradient(90deg,rgb(0 0 0/0) 1%,rgb(0 0 0/.6) 51%,rgb(0 0 0/.09) 95%)}
  .mr-title{position:absolute;left:0;right:0;top:71px;margin:0;text-align:center;font-size:55px;line-height:44px;color:#fff7e1}
  .mr-sub{position:absolute;left:0;right:0;top:140px;margin:0;text-align:center;font:600 18px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:#8a8f99}
  .mr-sub b{color:#f2df57}
  .mr-steps{position:absolute;left:681px;top:150px;display:flex;gap:12px}
  .mr-steps span{width:176px;height:36px;display:flex;align-items:center;justify-content:center;background:rgb(22 24 31/.9);border:1px solid #2a2d36;font:700 14px/1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:#8a8f99}
  .mr-steps .is-on{background:#f2df57;border-color:#f2df57;color:#0d0f14}.mr-steps .is-done{color:#f2df57;border-color:#f2df57}
  .mr-chip{position:absolute;margin:0;display:flex;align-items:center;gap:16px;height:56px;padding:0 24px;background:linear-gradient(90deg,rgb(255 0 39/.55),rgb(0 0 0/.65) 40%,rgb(0 0 0/.35));border-left:4px solid #ff0027}
  .mr-chip span{font:700 22px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}.mr-chip small{font:500 16px/1 var(--font-ui);color:#8a8f99;flex:1}
  .mr-chip b,.mr2-row em,.mr5-item b{font:700 30px/1 var(--font-ui);font-style:normal;color:#f2df57}
  .is-fly{opacity:.35;transform:translateY(40px)}.is-ghost{opacity:.4}.is-dim{opacity:.45}.is-merged{opacity:.25}
  .mr-badge{position:absolute;width:220px;height:220px}.mr-badge img{width:100%;height:100%;object-fit:contain}
  .mr-total{position:absolute;display:flex;align-items:baseline;gap:14px;justify-content:center}
  .mr-total b{font:400 120px/1 "Modi Thorson",var(--font-ui);color:#f2df57}.mr-total span{font:700 44px/1 var(--font-ui);color:#fff7e1}
  .mr-rank{position:absolute;width:880px}
  .mr-rank__top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;font:700 22px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}
  .mr-rank__top span{color:#f2df57}
  .mr-rank__bar{position:relative;height:26px;background:rgb(0 0 0/.6);border:1px solid #4a4e58}
  .mr-rank__bar i{position:absolute;top:2px;bottom:2px;left:2px}.mr-rank__old{background:#8a8f99}.mr-rank__new{background:#f2df57;box-shadow:0 0 18px rgb(242 223 87/.6)}
  .mr-rank__ends{display:flex;justify-content:space-between;margin-top:8px;font:600 16px/1 var(--font-ui);color:#8a8f99}
  .mr-cta{position:absolute;left:810px;top:930px;width:300px}
  .mr-hints{position:absolute;left:60px;bottom:40px}
  /* 1 */
  .mr1-badge{left:850px;top:250px}.mr1-stack .mr-chip{left:560px;width:800px}
  .mr1-stack .mr-chip:nth-child(1){top:500px}.mr1-stack .mr-chip:nth-child(2){top:566px}.mr1-stack .mr-chip:nth-child(3){top:632px}.mr1-stack .mr-chip:nth-child(4){top:698px}
  .mr1-total{left:0;right:0;top:520px}.mr1-total.is-landed{top:660px;opacity:.9;transform:scale(.55)}.mr1-bar{left:520px;top:780px}
  /* 2 */
  .mr2{position:absolute;left:520px;top:280px;width:882px}
  .mr2-row{position:relative;height:64px;margin:0 0 -1px;display:flex;align-items:center;gap:20px;padding:0 34px 0 25px;background:rgb(0 0 0/.5);border:1px solid #2a2d36}
  .mr2-row.is-red{background:linear-gradient(90deg,rgb(255 0 39/.6),rgb(0 0 0/.6) 36%,rgb(0 0 0/0))}
  .mr2-row b{width:260px;font:700 22px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}.mr2-row span{flex:1;font:500 18px/1 var(--font-ui);color:#8a8f99}
  .mr2-row--total{height:96px;margin-top:16px;background:rgb(242 223 87/.12);border-color:#f2df57}.mr2-row--total em{font-size:56px}
  .mr2-bar{left:520px;top:720px}
  /* 3 */
  .mr3-badge{left:850px;top:230px;width:200px;height:200px}.mr3-total{left:0;right:0;top:440px}.mr3-bar{left:520px;top:590px}
  .mr3-cards{position:absolute;left:150px;top:720px;display:flex;gap:12px}
  .mr3-card{position:relative;width:396px;height:150px;padding:30px 24px 0 52px;box-sizing:border-box;background:rgb(13 10 12/.85);border:1px solid #4a4e58}
  .mr3-card b{display:block;font:700 26px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}.mr3-card em{font-style:normal;color:#f2df57}
  .mr3-card p{margin:12px 0 0;font:500 18px/1.2 var(--font-ui);color:#c9c9d1}
  .mr3-tick{position:absolute;left:18px;top:30px;width:20px;height:20px;border-radius:50%;background:#2fe38a}.mr3-card.is-spent{opacity:.5}
  /* 4 */
  .mr4{position:absolute;left:260px;top:300px;width:1400px}
  .mr4-labels,.mr4-vals{display:flex;gap:4px}.mr4-labels p{margin:0;height:70px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px}
  .mr4-labels span{font:700 16px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}.mr4-labels small{font:500 14px/1 var(--font-ui);color:#8a8f99}
  .mr4-track{display:flex;gap:4px;height:60px;margin:14px 0;background:rgb(22 24 31/.9)}.mr4-seg{background:#f2df57}.mr4-seg.is-mod{background:repeating-linear-gradient(135deg,#f2df57 0 14px,#c9b33f 14px 28px)}
  .mr4-vals b{font:700 34px/1 var(--font-ui);color:#f2df57}
  .mr4-total{left:0;right:0;top:560px}.mr4-bar{left:520px;top:740px}
  /* 5 */
  .mr5-feed{position:absolute;left:150px;top:290px;width:700px}
  .mr5-item{position:relative;height:110px;margin:0 0 14px;padding:22px 0 0 170px;box-sizing:border-box;background:linear-gradient(90deg,rgb(255 0 39/.5),rgb(0 0 0/.6) 30%,rgb(0 0 0/.2));border-left:4px solid #ff0027}
  .mr5-item b{position:absolute;left:24px;top:36px;font-size:40px}.mr5-item span{display:block;font:700 24px/1 var(--font-ui);text-transform:uppercase;color:#fff7e1}
  .mr5-item small{display:block;margin-top:10px;font:500 18px/1 var(--font-ui);color:#8a8f99}
  .mr5-side{position:absolute;left:960px;top:270px;width:820px;height:560px;background:rgb(0 0 0/.45);border:1px solid #2a2d36}
  .mr5-badge{left:300px;top:30px}.mr5-total{left:0;right:0;top:270px}.mr5-bar{left:40px;top:420px;width:740px}
  /* 6 */
  .mr6-ring{position:absolute;left:300px;top:270px;width:520px;height:520px;border-radius:50%;
    background:conic-gradient(#8a8f99 0 var(--old),#f2df57 var(--old) var(--new),rgb(0 0 0/.55) var(--new) 100%)}
  .mr6-ring::after{content:"";position:absolute;inset:26px;border-radius:50%;background:#14161c}
  .mr6-badge{left:130px;top:130px;width:260px;height:260px;z-index:1}
  .mr6-list .mr-chip{left:960px;width:700px}
  .mr6-list .mr-chip:nth-child(1){top:300px}.mr6-list .mr-chip:nth-child(2){top:366px}.mr6-list .mr-chip:nth-child(3){top:432px}.mr6-list .mr-chip:nth-child(4){top:498px}
  .mr6-total{left:960px;width:700px;top:600px;justify-content:flex-start}
  .mr6-rank{position:absolute;left:300px;width:520px;top:810px;margin:0;text-align:center;font:700 22px/1.5 var(--font-ui);text-transform:uppercase;color:#fff7e1}.mr6-rank span{display:block;color:#f2df57}
  `;

  function show(o, s) {
    let sec = document.getElementById("s-mresult");
    if (!sec) {
      const style = document.createElement("style"); style.id = "mr-style"; style.textContent = CSS; document.head.appendChild(style);
      sec = document.createElement("section"); sec.className = "screen"; sec.id = "s-mresult";
      sec.innerHTML = `<div class="screen__bg"></div><div class="screen__safe"></div>`;
      document.getElementById("stage").appendChild(sec);
    }
    document.querySelectorAll(".screen.is-active").forEach(e => e !== sec && e.classList.remove("is-active"));
    sec.classList.add("is-active"); sec.dataset.screen = `match-result-o${o}-s${s}`;
    sec.querySelector(".screen__safe").innerHTML = `<div class="mr-arena"></div><div class="mr-dim"></div>` + head(s) + OPTS[o](s) + cta(s < 3 ? "Skip" : "Continue") + hints(s);
  }
  window.MR_OPTS = { show };
})();
