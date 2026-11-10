/* Match Result · 4 style sets for comparison (Figma board "Match Result · 4 Sets").
   Each set = Rank + Level + Quests, same data, one look. MR_SETS.show(set "A".."D", page "rank"|"level"|"quest").
   A Unified Cards · B Center Stage · C Broadcast · D Mono Yellow
   Shared idea in all sets: a step indicator (Rank · Level · Quests) and one colour language for "gained this fight" (white). */
(function () {
  const IMG = "mtx/assets/img/", SVG = "mtx/assets/svg/";
  const TR = [
    { k: "E", c: "#ff0027", name: "Experience", lv: 25, xp: "3,682 / 19,500", old: 12.9, gain: 6, plus: "+1,170", src: [["Participate", 100], ["Round time 285s ×2", 570], ["Win", 500]] },
    { k: "S", c: "#6100ff", name: "Spirit", lv: 12, xp: "2,450 / 4,400", old: 40.9, gain: 14.8, plus: "+650", src: [["Knockdown ×1", 300], ["Special Move ×2", 100], ["Counter ×3", 150], ["Clinch win", 100]] },
    { k: "R", c: "#f5e5b5", name: "Reputation", lv: 13, xp: "384 / 3,197", old: 0, gain: 12, plus: "+600", up: true, src: [["Participate", 100], ["Win", 500]] },
  ];
  const Q = [
    { name: "Temple Fair Fight", done: true, objs: [["Win your first temple fair bout", 0, 1, 1]] },
    { name: "Jab and Teep", objs: [["Land jabs (Mat Trong)", 32, 50, 18], ["Land teeps to the body", 12, 30, 6]] },
    { name: "Shin Conditioning", objs: [["Kick the heavy bag", 200, 200, 0], ["Check incoming kicks", 9, 15, 4]] },
  ];
  let OPEN = 1;   // which card is shown open (S / Jab and Teep); MR_SETS.show(set, page, open) changes it
  const G = b => window.MTX_UI.glyph(b);
  const cta = (l, p) => `<span class="btn-cta btn-cta--key${p ? "" : " btn-cta--secondary"} ms-cta"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${G("a")}<span class="btn-cta__label">${l}</span></span>`;
  const steps = (cur, cls = "") => `<div class="ms-steps ${cls}">${["Rank", "Level", "Quests"].map((t, i) => `<span class="${i === cur ? "is-on" : i < cur ? "is-done" : ""}"><i></i>${t}</span>`).join("")}</div>`;
  const TITLE = { rank: "Ranked Result", level: "Level Progress", quest: "Quests" };
  const CUR = { rank: 0, level: 1, quest: 2 };

  // ---------- page bodies per set
  const rankBar = (cls = "") => `<div class="ms-bar ${cls}"><i class="ms-bar__old" style="width:40%"></i><i class="ms-bar__new" style="left:40%;width:17%"></i></div>`;
  const B = {
    A: {
      rank: () => `<div class="a-card a-card--rank"><span class="a-block"><img src="${SVG}rank-badge.svg" alt=""></span>
          <div class="a-body"><div class="a-top"><span>National Tournament 4</span><b>657 <small>/ 700 RP</small></b></div>
          ${rankBar()}<p class="a-sub">600<span class="a-gain">+17 RP</span>700 · NT3</p></div></div>
        <div class="a-total"><small>Total RP</small><b>+17</b></div>`,
      level: () => TR.map((t, i) => `<div class="a-card${i === OPEN ? " is-open" : ""}" style="--c:${t.c}"><span class="a-block a-block--letter">${t.k}</span>
          <div class="a-body"><div class="a-top"><span>${t.name}</span><b>Lv ${t.lv}</b></div>
          <div class="ms-bar"><i class="ms-bar__old" style="width:${t.old}%;background:var(--c)"></i><i class="ms-bar__new" style="left:${t.old}%;width:${t.gain}%"></i></div>
          <p class="a-sub">${t.xp} XP<span class="a-gain">${t.plus} XP</span></p>
          ${i === OPEN ? `<ul class="a-src">${t.src.map(([a, v]) => `<li><span>${a}</span><b>+${v}</b></li>`).join("")}</ul>` : ""}</div></div>`).join(""),
      quest: () => Q.map((q, i) => `<div id="quest-${i}" class="a-card${q.done ? " is-done" : ""}${i === OPEN ? " is-open" : ""}"><span class="a-block a-block--q">${q.done ? `<img src="${SVG}icon-check.svg" alt="">` : `<i></i>`}</span>
          <div class="a-body"><div class="a-top"><span>${q.name}</span><b>${q.objs.filter(o => o[1] + o[3] >= o[2]).length} / ${q.objs.length}</b></div>
          ${i === OPEN || q.done ? `<ul class="a-src">${q.objs.map(([t, a, n, g]) => `<li class="${a + g >= n ? "ok" : ""}"><span><i></i>${t}</span><b>${Math.min(n, a + g)} / ${n}</b></li>`).join("")}</ul>` : `<p class="a-sub">${q.objs.length} objectives</p>`}</div></div>`).join(""),
    },
    B: {
      rank: () => `<img class="b-emblem" src="${SVG}rank-badge.svg" alt=""><p class="b-label">National Tournament 4</p><div class="b-big">+17<small>RP</small></div>
        ${rankBar("b-bar")}<p class="b-ends"><span>600</span><span>657 / 700</span><span>NT3 · 700</span></p>`,
      level: () => `<div class="b-cols">${TR.map((t, i) => `<div class="b-col${i === OPEN ? " is-open" : ""}" style="--c:${t.c}"><span class="b-col__k">${t.k}</span><p class="b-col__n">${t.name}</p>
          <b class="b-col__lv">${t.lv}${t.up ? `<em>Level up</em>` : ""}</b><div class="ms-bar"><i class="ms-bar__old" style="width:${t.old}%;background:var(--c)"></i><i class="ms-bar__new" style="left:${t.old}%;width:${t.gain}%"></i></div>
          <p class="b-col__xp">${t.xp} XP</p><b class="b-col__plus">${t.plus} XP</b>
          <ul class="b-src">${t.src.map(([a, v]) => `<li><span>${a}</span><b>+${v}</b></li>`).join("")}</ul></div>`).join("")}</div>`,
      quest: () => `<div class="b-cols">${Q.map((q, i) => `<div class="b-col b-col--q${q.done ? " is-done" : ""}${i === OPEN ? " is-open" : ""}"><span class="b-col__k">${q.done ? `<img src="${SVG}icon-check.svg" alt="">` : i + 1}</span>
          <p class="b-col__n">${q.done ? "Complete" : "In progress"}</p><b class="b-col__title">${q.name}</b>
          <ul class="b-src">${q.objs.map(([t, a, n, g]) => `<li class="${a + g >= n ? "ok" : ""}"><span>${t}</span><b>${Math.min(n, a + g)}/${n}</b></li>`).join("")}</ul></div>`).join("")}</div>`,
    },
    C: {
      rank: () => `<div class="c-panel"><p class="c-kicker">Ranked · Win by KO · R2 1:45</p><div class="c-row"><img src="${SVG}rank-badge.svg" alt=""><div><b class="c-name">National Tournament 4</b>
          ${rankBar("c-bar")}<p class="c-sub"><span>657 / 700 RP</span><span>Next · NT3</span></p></div><div class="c-plus">+17<small>RP</small></div></div></div>`,
      level: () => `<div class="c-panel">${TR.map((t, i) => `<div class="c-line${i === OPEN ? " is-open" : ""}" style="--c:${t.c}"><span class="c-tagk">${t.k}</span><b class="c-name">${t.name} · Lv ${t.lv}</b>
          <div class="ms-bar c-bar"><i class="ms-bar__old" style="width:${t.old}%;background:var(--c)"></i><i class="ms-bar__new" style="left:${t.old}%;width:${t.gain}%"></i></div><b class="c-plus c-plus--s">${t.plus}</b>
          ${i === OPEN ? `<p class="c-src">${t.src.map(([a, v]) => `<span>${a} <b>+${v}</b></span>`).join("")}</p>` : ""}</div>`).join("")}</div>`,
      quest: () => `<div class="c-panel">${Q.map((q, i) => `<div class="c-line${q.done ? " is-done" : ""}${i === OPEN ? " is-open" : ""}"><span class="c-tagk">${q.done ? "✓" : i + 1}</span><b class="c-name">${q.name}</b>
          <b class="c-plus c-plus--s">${q.objs.filter(o => o[1] + o[3] >= o[2]).length}/${q.objs.length}</b>
          ${i === OPEN || q.done ? `<p class="c-src">${q.objs.map(([t, a, n, g]) => `<span>${t} <b>${Math.min(n, a + g)}/${n}</b></span>`).join("")}</p>` : ""}</div>`).join("")}</div>`,
    },
    D: {
      rank: () => `<div class="d-wrap"><p class="d-k">Rank</p><div class="d-big">+17<span>RP</span></div><p class="d-name">National Tournament 4 · 657 / 700</p>${rankBar("d-bar")}</div>`,
      level: () => `<div class="d-wrap">${TR.map((t, i) => `<div class="d-line${i === OPEN ? " is-open" : ""}"><b class="d-letter">${t.k}</b><span class="d-n">Level ${t.lv}${t.up ? " · Up" : ""}</span>
          <div class="ms-bar d-bar"><i class="ms-bar__old" style="width:${t.old}%"></i><i class="ms-bar__new" style="left:${t.old}%;width:${t.gain}%"></i></div><b class="d-plus">${t.plus}</b>
          ${i === OPEN ? `<p class="d-src">${t.src.map(([a, v]) => `${a} +${v}`).join("  ·  ")}</p>` : ""}</div>`).join("")}</div>`,
      quest: () => `<div class="d-wrap">${Q.map((q, i) => `<div class="d-line${q.done ? " is-done" : ""}${i === OPEN ? " is-open" : ""}"><b class="d-letter">${q.done ? "✓" : "—"}</b><span class="d-n">${q.name}</span>
          <b class="d-plus">${q.objs.filter(o => o[1] + o[3] >= o[2]).length}/${q.objs.length}</b>
          ${i === OPEN || q.done ? `<p class="d-src">${q.objs.map(([t, a, n, g]) => `${t} ${Math.min(n, a + g)}/${n}`).join("  ·  ")}</p>` : ""}</div>`).join("")}</div>`,
    },
  };

  // E · picked mix: Rank = B (center stage) · Level = D (mono rows) in E / S / R colours · Quests = A cards on D's open background, complete = yellow fill
  B.E = {
    rank: () => B.B.rank(),
    level: () => `<div class="d-wrap e-lv">${TR.map((t, i) => `<div id="row-${t.k}" class="d-line${i === OPEN ? " is-open" : ""}" style="--c:${t.c}"><b class="d-letter">${t.k}</b><span class="d-n">Level ${t.lv}${t.up ? " · Up" : ""}</span>
        <div class="ms-bar d-bar"><i class="ms-bar__old" style="width:${t.old}%"></i><i class="ms-bar__new" style="left:${t.old}%;width:${t.gain}%"></i></div><b class="d-plus">${t.plus}</b>
        ${i === OPEN ? `<ul class="e-src">${t.src.map(([a, v]) => `<li><i class="e-dot"></i><span>${a}</span><b>+${v}</b></li>`).join("")}</ul>` : ""}</div>`).join("")}</div>`,
    quest: () => `<div class="a-list e-q">${B.A.quest()}</div>`,
  };

  const CSS = `
  #s-mresult .ms{position:absolute;inset:0;font-family:var(--font-ui);color:#fff7e1}
  .ms-bg{position:absolute;inset:0;background:linear-gradient(180deg,rgb(13 15 20/.55),rgb(13 15 20/.85)),url(${IMG}result-arena.jpg) 0 0/1920px 1074px,#1a1a1a}
  .ms-tex{position:absolute;inset:0;background:url(${IMG}bg-grunge.webp) center/cover;opacity:.14}
  .ms-title{position:absolute;left:0;right:0;top:71px;margin:0;text-align:center;font-size:55px;line-height:44px;color:#fff7e1}
  .ms-steps{position:absolute;left:0;right:0;top:140px;display:flex;justify-content:center;gap:28px;font:700 14px/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#6b7180}
  .ms-steps span{display:flex;align-items:center;gap:8px}.ms-steps i{width:8px;height:8px;background:#4a4e58}
  .ms-steps .is-done{color:#9ea6b0}.ms-steps .is-done i{background:#9ea6b0}.ms-steps .is-on{color:#f2df57}.ms-steps .is-on i{background:#f2df57}
  .ms-cta{position:absolute;left:820px;top:920px;width:280px}
  .ms-hint{position:absolute;left:60px;bottom:48px}
  .ms-bar{position:relative;height:10px;background:rgb(255 255 255/.08)}.ms-bar i{position:absolute;top:0;bottom:0}
  .ms-bar__old{left:0;background:#2fe38a}.ms-bar__new{background:#fff}
  /* A Unified Cards */
  .a-list{position:absolute;left:520px;top:210px;width:880px;display:flex;flex-direction:column;gap:14px}
  .a-card{--c:#2fe38a;position:relative;display:flex;min-height:120px;background:linear-gradient(180deg,rgb(30 33 42/.95),rgb(16 18 24/.92))}
  .a-block{width:120px;flex:none;display:grid;place-items:center;align-self:stretch;background:var(--c);color:#16181f;font:400 48px/1 "Modi Thorson",var(--font-ui)}
  .a-block img{width:96px;height:96px}.a-card--rank .a-block{background:rgb(47 227 138/.14)}
  .a-block--q{background:rgb(255 255 255/.06)}.a-block--q i{width:28px;height:28px;border:2px solid #9ea6b0}.a-block--q img{width:40px;height:40px;filter:brightness(0)}
  .a-body{flex:1;padding:22px 28px}.a-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;font:700 22px/1 var(--font-ui);text-transform:uppercase}
  .a-top b{font:700 30px/1 var(--font-ui)}.a-top small{font-size:16px;color:#9ea6b0}
  .a-sub{display:flex;justify-content:space-between;margin:10px 0 0;font:600 15px/1 var(--font-ui);color:#9ea6b0}.a-gain{color:#fff;font-weight:800}
  .a-src{margin:14px 0 0;padding:0;list-style:none}.a-src li{display:flex;justify-content:space-between;height:26px;font:600 16px/1 var(--font-ui);text-transform:uppercase;color:#c9ccd3}
  .a-src li b{color:#fff}.a-src li span{display:flex;align-items:center;gap:10px}.a-src li i{width:12px;height:12px;border:2px solid #9ea6b0}.a-src li.ok i{background:#f2df57;border-color:#f2df57}
  .a-card.is-done{background:#f2df57;color:#0d0f14}.a-card.is-done .a-block{background:rgb(0 0 0/.08)}.a-card.is-done .a-src li,.a-card.is-done .a-src li b{color:#0d0f14}.a-card.is-done .a-src li i{border-color:#0d0f14;background:#0d0f14}
  .a-card.is-open{outline:1px solid rgb(255 255 255/.35)}
  .a-total{position:relative;width:880px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;box-sizing:border-box;height:90px;background:rgb(255 255 255/.04)}
  .a-total small{font:700 16px/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#9ea6b0}.a-total b{font:400 64px/1 "Modi Thorson",var(--font-ui);color:#2fe38a}
  /* B Center Stage */
  .b-emblem{position:absolute;left:845px;top:200px;width:230px}.b-label{position:absolute;left:0;right:0;top:450px;text-align:center;font:700 20px/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#9ea6b0}
  .b-big{position:absolute;left:0;right:0;top:490px;text-align:center;font:400 150px/1 "Modi Thorson",var(--font-ui);color:#2fe38a}.b-big small{font:700 44px/1 var(--font-ui);color:#fff7e1;margin-left:12px}
  .b-bar{position:absolute;left:560px;width:800px;top:700px;height:14px}.b-ends{position:absolute;left:560px;width:800px;top:726px;display:flex;justify-content:space-between;font:600 16px/1 var(--font-ui);color:#9ea6b0}
  .b-cols{position:absolute;left:180px;right:180px;top:210px;display:flex;gap:24px;align-items:flex-start}
  .b-col{--c:#f2df57;flex:1;position:relative;padding:0 28px 28px;background:linear-gradient(180deg,rgb(30 33 42/.95),rgb(16 18 24/.9));text-align:center;min-height:520px}
  .b-col__k{display:grid;place-items:center;width:100px;height:100px;margin:-1px auto 18px;background:var(--c);color:#16181f;font:400 50px/1 "Modi Thorson",var(--font-ui)}
  .b-col__k img{width:44px;filter:brightness(0)}.b-col__n{margin:0;font:700 15px/1 var(--font-ui);letter-spacing:.2em;text-transform:uppercase;color:#9ea6b0}
  .b-col__lv{display:block;margin:12px 0 18px;font:400 72px/1 "Modi Thorson",var(--font-ui)}.b-col__lv em{display:block;margin-top:8px;font:800 14px/1 var(--font-ui);letter-spacing:.2em;font-style:normal;color:var(--c)}
  .b-col__xp{margin:12px 0 4px;font:600 16px/1 var(--font-ui);color:#9ea6b0}.b-col__plus{display:block;font:700 30px/1 var(--font-ui);color:#fff}
  .b-col__title{display:block;margin:14px 0 20px;font:400 30px/1.1 "Modi Thorson",var(--font-ui);text-transform:uppercase}
  .b-src{margin:20px 0 0;padding:0;list-style:none;text-align:left;opacity:.35}.b-col.is-open .b-src,.b-col.is-done .b-src{opacity:1}
  .b-src li{display:flex;justify-content:space-between;height:28px;font:600 15px/1 var(--font-ui);text-transform:uppercase;color:#c9ccd3}.b-src li b{color:#fff}
  .b-col.is-open{outline:2px solid rgb(255 255 255/.5)}.b-col--q{--c:#2a2e38}.b-col--q .b-col__k{color:#fff7e1}
  .b-col.is-done{background:#f2df57;color:#0d0f14}.b-col.is-done .b-col__k{background:#0d0f14}.b-col.is-done .b-col__k img{filter:brightness(0) invert(1)}.b-col.is-done .b-col__n,.b-col.is-done .b-src li,.b-col.is-done .b-src li b{color:#0d0f14}
  /* C Broadcast */
  .c-panel{position:absolute;left:150px;top:230px;width:1100px}
  .c-panel::before{content:"";position:absolute;left:-24px;top:0;bottom:0;width:8px;background:#f2df57;transform:skewX(-12deg)}
  .c-kicker{margin:0 0 18px;font:700 16px/1 var(--font-ui);letter-spacing:.24em;text-transform:uppercase;color:#f2df57}
  .c-row{display:flex;align-items:center;gap:32px;padding:28px 32px;background:linear-gradient(90deg,rgb(30 33 42/.96),rgb(16 18 24/.7))}
  .c-row img{width:150px}.c-row>div{flex:1}.c-name{display:block;font:400 30px/1 "Modi Thorson",var(--font-ui);text-transform:uppercase;margin-bottom:16px}
  .c-bar{height:12px}.c-sub{display:flex;justify-content:space-between;margin:12px 0 0;font:600 16px/1 var(--font-ui);color:#9ea6b0}
  .c-plus{font:400 92px/1 "Modi Thorson",var(--font-ui);color:#2fe38a}.c-plus small{font:700 30px/1 var(--font-ui);color:#fff7e1;margin-left:8px}.c-plus--s{font-size:34px;color:#fff;min-width:110px;text-align:right}
  .c-line{--c:#f2df57;display:grid;grid-template-columns:70px 340px 1fr 120px;align-items:center;gap:20px;padding:22px 28px;margin-bottom:10px;background:linear-gradient(90deg,rgb(30 33 42/.96),rgb(16 18 24/.7));transform:skewX(-6deg)}
  .c-line>*{transform:skewX(6deg)}.c-line .c-name{font-size:24px;margin:0}
  .c-tagk{display:grid;place-items:center;width:56px;height:56px;background:var(--c);color:#16181f;font:400 30px/1 "Modi Thorson",var(--font-ui)}
  .c-src{grid-column:2/-1;display:flex;gap:28px;margin:4px 0 0;font:600 15px/1 var(--font-ui);text-transform:uppercase;color:#c9ccd3}.c-src b{color:#fff}
  .c-line.is-open{background:linear-gradient(90deg,rgb(52 56 68/.98),rgb(22 24 31/.75))}
  .c-line.is-done{background:#f2df57;color:#0d0f14}.c-line.is-done .c-tagk{background:#0d0f14;color:#f2df57}.c-line.is-done .c-plus,.c-line.is-done .c-src,.c-line.is-done .c-src b{color:#0d0f14}
  /* D Mono Yellow */
  .d-wrap{position:absolute;left:560px;top:230px;width:800px}
  .d-k{margin:0;font:700 16px/1 var(--font-ui);letter-spacing:.3em;text-transform:uppercase;color:#9ea6b0}
  .d-big{margin:24px 0;font:400 180px/1 "Modi Thorson",var(--font-ui);color:#f2df57}.d-big span{font:700 40px/1 var(--font-ui);color:#fff7e1;margin-left:16px}
  .d-name{margin:0 0 18px;font:600 20px/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase}
  .d-bar{height:6px}.d-bar .ms-bar__old{background:#f2df57}
  .d-line{display:grid;grid-template-columns:70px 1fr 260px 120px;align-items:center;gap:20px;padding:24px 0;border-bottom:1px solid rgb(255 255 255/.12)}
  .d-letter{font:400 46px/1 "Modi Thorson",var(--font-ui);color:#fff7e1}.d-n{font:700 22px/1 var(--font-ui);text-transform:uppercase}
  .d-plus{text-align:right;font:700 28px/1 var(--font-ui);color:#fff}.d-src{grid-column:2/-1;margin:2px 0 0;font:600 15px/1.4 var(--font-ui);text-transform:uppercase;color:#9ea6b0}
  /* E: level rows in track colour, quests = A cards without panels (D background) */
  .e-lv .d-letter{color:var(--c)}.e-lv .ms-bar__old{background:var(--c)}.e-lv .d-line.is-open .d-letter{color:var(--c)}.e-lv .d-src b{color:#fff}.e-src{grid-column:2/-1;margin:0;padding:0;list-style:none}.e-src li{position:relative;display:flex;justify-content:space-between;height:28px;align-items:center;padding-left:18px;font:600 16px/1 var(--font-ui);letter-spacing:.04em;text-transform:uppercase;color:#c9ccd3}.e-dot{position:absolute;left:0;top:11px;width:6px;height:6px;background:var(--c)}.e-src li b{color:#fff}
  .e-q .a-card{background:none;border-bottom:1px solid rgb(255 255 255/.12);outline:0}.e-q .a-block--q{background:none}.e-q .a-card.is-done{background:#f2df57;border-bottom-color:transparent}.e-q .a-card.is-open .a-top span{color:#fff}
  .d-line.is-open .d-letter,.d-line.is-done .d-letter,.d-line.is-done .d-n{color:#f2df57}
  `;
  function show(set, page, open = 1) {
    OPEN = open;
    MR_OPTS.show(1, 1);
    document.getElementById("ms-style")?.remove();
    const st = document.createElement("style"); st.id = "ms-style"; st.textContent = CSS; document.head.appendChild(st);
    const sec = document.getElementById("s-mresult"); sec.dataset.screen = `match-result-set-${set}-${page}`;
    const body = B[set][page]();
    sec.querySelector(".screen__safe").innerHTML = `<div class="ms ms--${set}"><div class="ms-bg"></div><div class="ms-tex"></div>
      <h1 class="page-title tex-text ms-title">${TITLE[page]}</h1>${steps(CUR[page])}
      ${set === "A" ? `<div class="a-list">${body}</div>` : body}
      ${cta(page === "quest" ? "Continue" : "Next", true)}${window.MTX_UI.hintBar({ a: page === "quest" ? "Continue" : "Next" }, { cls: "ms-hint", launcher: false })}</div>`;
  }
  window.MR_SETS = { show, Q };
})();
