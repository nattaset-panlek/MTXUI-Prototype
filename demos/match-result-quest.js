/* Match Result · Quest page (after the Level page): only the quest name + its current objective checklist.
   Same rhythm as the Level page: one quest opens at a time (checklist with this fight's progress), then closes.
   A quest this fight completes turns yellow when it closes.
   Q1 = quest 1 open · Q2 = quest 1 closed (complete, yellow), quest 2 open · Q3 = quest 3 open · Q4 = all closed.
   Data: screen-quests.js QUEST_LEVELS (Phra Nakhon · Foundation). Progress numbers are a sample fight.
   Not loaded by the app: eval match-result-opts.js, then this file, then MR_QC.show(1..4) or MR_QC.card(i, state). */
(function () {
  const Q = [
    { name: "Temple Fair Fight", objs: [["Win your first temple fair bout", 0, 1, 1]] },
    { name: "Jab and Teep", objs: [["Land jabs (Mat Trong)", 32, 50, 18], ["Land teeps to the body", 12, 30, 6]] },
    { name: "Shin Conditioning", objs: [["Kick the heavy bag", 200, 200, 0], ["Check incoming kicks", 9, 15, 4]] },
  ];
  const done = q => q.objs.every(([, a, n, g]) => a + g >= n);
  const CSS = `
  #qc{position:absolute;left:520px;top:220px;width:880px;display:flex;flex-direction:column;gap:16px}
  .qc-card{position:relative;height:100px;overflow:hidden;background:linear-gradient(90deg,rgb(22 24 31/.95),rgb(13 15 20/.85));border-left:4px solid #4a4e58}
  .qc-card.is-open{border-left-color:#fff7e1}
  .qc-card.is-complete{background:linear-gradient(90deg,rgb(242 223 87/.28),rgb(13 15 20/.85) 60%);border-left-color:#f2df57}
  .qc-icon{position:absolute;left:24px;top:26px;width:48px;height:48px;display:grid;place-items:center;border:2px solid #4a4e58;box-sizing:border-box}
  .qc-card.is-open .qc-icon{border-color:#fff7e1}
  .qc-card.is-complete .qc-icon{background:#f2df57;border-color:#f2df57}
  .qc-icon img{width:28px;height:28px}
  .qc-name{position:absolute;left:96px;top:24px;margin:0;font:400 28px/1 "Modi Thorson",var(--font-ui);text-transform:uppercase;color:#fff7e1}
  .qc-card.is-complete .qc-name{color:#f2df57}
  .qc-sum{position:absolute;left:96px;top:62px;font:600 16px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:#9ea6b0}
  .qc-tag{position:absolute;right:28px;top:36px;padding:6px 12px;background:#f2df57;font:800 14px/1 var(--font-ui);letter-spacing:.16em;text-transform:uppercase;color:#0d0f14}
  .qc-list{position:absolute;left:96px;right:28px;top:96px;margin:0;padding:0;list-style:none}
  .qc-o{position:relative;display:grid;grid-template-columns:28px 1fr 90px 60px;align-items:center;height:40px;font:600 17px/1 var(--font-ui);color:#c9ccd3}
  .qc-o__box{width:18px;height:18px;border:2px solid #9ea6b0;box-sizing:border-box}
  .qc-o.is-done .qc-o__box{background:#f2df57;border-color:#f2df57}
  .qc-o.is-done span{color:#fff7e1}
  .qc-o__n{text-align:right;color:#fff7e1}
  .qc-o__g{text-align:right;font-weight:700;color:#f2df57}
  .qc-o__bar{position:absolute;left:28px;right:0;bottom:2px;height:4px;background:rgb(255 255 255/.08)}
  .qc-o__bar i{position:absolute;top:0;bottom:0}
  `;
  // one card: state "wait" (closed, before) · "open" (checklist, this fight's progress) · "done" (closed, after; yellow if complete)
  function card(i, st) {
    const q = Q[i], after = st !== "wait", comp = st === "done" && done(q);
    const n = q.objs.filter(([, a, m, g]) => (after ? a + g : a) >= m).length;
    const h = st === "open" ? 100 + q.objs.length * 40 + 16 : 100;
    const list = q.objs.map(([t, a, m, g]) => {
      const v = Math.min(m, after ? a + g : a), ok = v >= m;
      return `<li class="qc-o${ok ? " is-done" : ""}"><i class="qc-o__box"></i><span>${t}</span><b class="qc-o__n">${v} / ${m}</b><b class="qc-o__g">${g ? "+" + g : ""}</b>
        <span class="qc-o__bar"><i style="left:0;width:${Math.min(a, m) / m * 100}%;background:#9ea6b0"></i><i style="left:${Math.min(a, m) / m * 100}%;width:${after ? Math.min(g, m - Math.min(a, m)) / m * 100 : 0}%;background:#f2df57"></i></span></li>`;
    }).join("");
    return `<div class="qc-card${st === "open" ? " is-open" : ""}${comp ? " is-complete" : ""}" id="qc-${i}" style="height:${h}px">
      <span class="qc-icon">${comp ? `<img src="mtx/assets/svg/icon-check.svg" alt="">` : ""}</span>
      <h3 class="qc-name">${q.name}</h3><span class="qc-sum">${n} / ${q.objs.length} objectives</span>
      ${comp ? `<span class="qc-tag">Complete</span>` : ""}<ul class="qc-list" style="opacity:${st === "open" ? 1 : .01}">${list}</ul></div>`;
  }
  const FRAMES = { 1: ["open", "wait", "wait"], 2: ["done", "open", "wait"], 3: ["done", "done", "open"], 4: ["done", "done", "done"] };
  function show(k, override) {
    MR_OPTS.show(1, 1);
    document.getElementById("qc-style")?.remove();
    const s = document.createElement("style"); s.id = "qc-style"; s.textContent = CSS; document.head.appendChild(s);
    const safe = document.querySelector("#s-mresult .screen__safe");
    safe.querySelectorAll(".mr-badge,.mr1-stack,.mr-rank,.mr-cta,.mr-total,.mr-steps,.mr-hints").forEach(e => e.remove());
    safe.querySelector(".mr-title").textContent = "Quests";
    document.querySelector("#s-mresult").dataset.screen = `match-result-quest-q${k}`;
    const st = override || FRAMES[k];
    const last = k === 4;
    safe.insertAdjacentHTML("beforeend", `<div id="qc">${Q.map((_, i) => card(i, st[i])).join("")}</div>
      <span class="btn-cta btn-cta--key${last ? "" : " btn-cta--secondary"}" id="fs-cta" style="position:absolute;left:820px;top:920px;width:280px"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${window.MTX_UI.glyph("a")}<span class="btn-cta__label">${last ? "Continue" : "Skip"}</span></span>`);
  }
  window.MR_QC = { show, Q };
})();
