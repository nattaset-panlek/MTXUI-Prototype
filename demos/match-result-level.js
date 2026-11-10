/* Match Result · Level page (after the Rank step): XP gained on the three level tracks E / S / R, each in its track colour.
   L1 = XP floats in next to each track, bars at the old value · L2 = bars filled, R levels up.
   Not loaded by the app: eval match-result-opts.js, then this file, then MR_LV.show(1|2) and bake. */
(function () {
  const T = [   // wiki: 03-Ultimate-Fight/03-Legacy-Core + 08-data-tables/20-Legacy-Core-Level. Match: win by KO, R2 1:45 (285 s), 1 knockdown
    { k: "E", c: "#ff0027", lv: 25, from: 2512, to: 3682, max: 19500, gain: 1170, src: [["Participate", 100], ["Round time 285s ×2", 570], ["Win", 500]] },
    { k: "S", c: "#6100ff", lv: 12, from: 1800, to: 2450, max: 4400, gain: 650, src: [["Knockdown ×1", 300], ["Special Move ×2", 100], ["Counter ×3", 150], ["Clinch win", 100]] },
    { k: "R", c: "#f5e5b5", lv: 12, from: 2512, to: 384, max: 2728, gain: 600, src: [["Participate", 100], ["Win", 500]], up: { lv: 13, max: 3197, reward: "+100 R Point" } },
  ];
  const n = v => v.toLocaleString("en-US");
  const CSS = `
  #lv-list{position:absolute;left:520px;top:196px;width:880px}
  .lv-card{position:relative;display:flex;align-items:flex-start;margin-bottom:16px;background:linear-gradient(90deg,rgb(22 24 31/.95),rgb(13 15 20/.85))}
  .lv-badge{width:140px;height:140px;align-self:flex-start;flex:none;display:grid;place-items:center;font:400 52px/1 "Modi Thorson",var(--font-ui);color:#16181f}
  .lv-body{position:relative;flex:1;padding:20px 28px 16px}
  .lv-top{display:flex;align-items:baseline;justify-content:space-between}
  .lv-top span{font:700 22px/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:#fff7e1}
  .lv-top b{font:700 40px/1 var(--font-ui);color:#fff7e1}
  .lv-xp{margin-top:6px;font:600 18px/1 var(--font-ui);color:#9ea6b0}
  .lv-bar{position:relative;margin-top:12px;height:8px;background:rgb(255 255 255/.08)}
  .lv-bar i{position:absolute;top:0;bottom:0;left:0}
  .lv-gain{position:absolute;right:28px;top:62px;width:200px;text-align:right;font:700 24px/1 var(--font-ui);color:#fff7e1}
  .lv-src{margin:14px 0 0;padding:0;list-style:none}.lv-src li{position:relative;display:flex;justify-content:space-between;height:24px;align-items:center;padding-left:16px;font:600 16px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase;color:#c9ccd3}.lv-src li i{position:absolute;left:0;top:9px;width:6px;height:6px}.lv-src li b{font-weight:700}
  .lv-up{position:absolute;right:120px;top:20px;padding:6px 12px;font:800 15px/1 var(--font-ui);letter-spacing:.14em;text-transform:uppercase;color:#16181f}
  `;
  function show(k) {
    MR_OPTS.show(1, 1);
    if (!document.getElementById("lv-style")) { const s = document.createElement("style"); s.id = "lv-style"; s.textContent = CSS; document.head.appendChild(s); }
    const safe = document.querySelector("#s-mresult .screen__safe");
    safe.querySelectorAll(".mr-badge,.mr1-stack,.mr-rank,.mr-cta,.mr-total,.mr-steps,.mr-hints").forEach(e => e.remove());
    safe.querySelector(".mr-title").textContent = "Level Progress";
    document.querySelector("#s-mresult").dataset.screen = `match-result-level-l${k}`;
    const done = k === 2;
    const cards = T.map(t => {
      const up = done && t.up, lv = up ? t.up.lv : t.lv, max = up ? t.up.max : t.max, cur = done ? t.to : t.from;
      const old = up ? 0 : t.from / max * 100, now = cur / max * 100;
      return `<div class="lv-card" id="lv-${t.k}"><div class="lv-badge" style="background:${t.c}">${t.k}</div>
        <div class="lv-body"><div class="lv-top"><span>Level</span><b>${lv}</b></div><p class="lv-xp">${n(cur)} / ${n(max)} XP</p>
          <div class="lv-bar"><i class="lv-old" style="width:${old}%;background:${t.c}"></i><i class="lv-new" style="left:${old}%;width:${Math.max(.1, now - old)}%;background:#fff;opacity:${done ? 1 : .01}"></i></div><ul class="lv-src">${t.src.map(([a, v]) => `<li><i style="background:${t.c}"></i><span>${a}</span><b style="color:${t.c}">+${n(v)}</b></li>`).join("")}</ul>
          ${t.up ? `<span class="lv-up" style="background:${t.c};opacity:${up ? 1 : .01}">Level up · ${t.up.reward}</span>` : ""}
          <b class="lv-gain" style="color:${t.c};opacity:${done ? .01 : 1}">+${n(t.gain)} XP</b></div></div>`;
    }).join("");
    safe.insertAdjacentHTML("beforeend", `<div id="lv-list">${cards}</div>
      <span class="btn-cta btn-cta--key${done ? "" : " btn-cta--secondary"}" id="fs-cta" style="position:absolute;left:810px;top:920px;width:300px"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${MTX_UI.glyph("a")}<span class="btn-cta__label">${done ? "Continue" : "Skip"}</span></span>`);
  }
  window.MR_LV = { show };
})();
