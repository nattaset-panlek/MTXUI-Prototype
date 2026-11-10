/* Match Find WAITING overlay · 10 placement options × 3 keyframes, for baking to Figma. Not loaded by the app.
   What shows while Match Find is searching (timer counting), placed somewhere other than (or beside) the mode card.
   In the preview: eval this file, then MW_OPTS.show(o, k) (o 1-10, k 1-3) and MTX_BAKE_STRUCT.run().
   Overlay only (transparent screen); in Figma it sits on an instance of the hub screen.
   K1 = appears (search starts, 00:00) · K2 = counting (00:27, est 00:45) · K3 = long wait (01:12, widening search).
   Layer names stay the same in all keyframes for Smart Animate; "hidden" layers use opacity .01 (opacity 0 is not baked). */
(function () {
  const IMG = "mtx/assets/img/";
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const T = ["00:00", "00:27", "01:12"], EST = ["Est. 00:45", "Est. 00:45", "Widening search"];
  const tex = (op = .22) => `<i class="mf-tex" style="opacity:${op};background-image:url(${IMG}tex-scratch.webp)"></i>`;
  const time = (k, cls = "") => `<b class="w-time ${cls}">${T[k - 1]}</b>`;
  const lbl = (cls = "") => `<span class="w-lbl ${cls}">Finding match</span>`;
  const mode = (cls = "") => `<span class="w-mode ${cls}">Rank Fight</span>`;
  const est = (k, cls = "") => `<span class="w-est ${cls}">${EST[k - 1]}</span>`;
  const bar = (cls = "") => `<i class="w-bar ${cls}"><i class="w-fill"></i></i>`;
  const cancel = (cls = "") => `<span class="w-cancel ${cls}">${G("b")}<span>Cancel</span></span>`;
  const dot = (cls = "") => `<i class="w-dot ${cls}"></i>`;

  const OPTS = {
    // 1 · Top Pill: slim pill top-centre between profile and level chips
    1: k => `<div class="o1">${tex(.25)}<i class="o1-acc">${dot()}</i>${lbl("o1-lbl")}${mode("o1-mode")}${time(k, "o1-time")}${est(k, "o1-est")}${bar("o1-bar")}</div>`,
    // 2 · Under Shop: compact card stacked in the right column under Shop / Event
    2: k => `<div class="o2">${tex(.25)}<i class="o2-top"></i>${lbl("o2-lbl")}${mode("o2-mode")}${time(k, "o2-time")}${est(k, "o2-est")}${bar("o2-bar")}${cancel("o2-cancel")}</div>`,
    // 3 · Edge Tab: thin tab on the right edge; long wait opens it wider
    3: k => `<div class="o3">${tex(.25)}<i class="o3-acc"></i>${time(k, "o3-time")}${lbl("o3-lbl")}${mode("o3-mode")}${est(k, "o3-est")}${bar("o3-bar")}${cancel("o3-cancel")}</div>`,
    // 4 · Bottom Strip: full-width thin strip just above the hint bar
    4: k => `<div class="o4">${tex(.2)}<i class="o4-line"></i>${dot("o4-dot")}${lbl("o4-lbl")}${mode("o4-mode")}${time(k, "o4-time")}${est(k, "o4-est")}${cancel("o4-cancel")}</div>`,
    // 5 · Corner Ring: radial ring bottom-right, fills toward the estimate
    5: k => `<div class="o5"><i class="o5-ring"></i><i class="o5-hole">${tex(.25)}</i>${time(k, "o5-time")}${lbl("o5-lbl")}${est(k, "o5-est")}</div>`,
    // 6 · Hint-bar Chip: the timer lives in the hint bar row, bottom centre
    6: k => `<div class="o6">${tex(.2)}${dot("o6-dot")}${lbl("o6-lbl")}${time(k, "o6-time")}<i class="o6-sep"></i>${cancel("o6-cancel")}</div>`,
    // 7 · Card Chip: info chip docked on top of the Match Find card (estimate, players searching)
    7: k => `<div class="o7">${tex(.25)}${est(k, "o7-est")}<span class="o7-pl">1,284 searching</span>${bar("o7-bar")}</div>`,
    // 8 · Ghost Count: huge faint digits in the scene, behind the UI
    8: k => `<div class="o8">${time(k, "o8-time")}${lbl("o8-lbl")}${est(k, "o8-est")}</div>`,
    // 9 · Radar Panel: panel in the right column with a sweep and dots (players found nearby)
    9: k => `<div class="o9">${tex(.25)}${lbl("o9-lbl")}${mode("o9-mode")}<div class="o9-radar"><i class="o9-r1"></i><i class="o9-r2"></i><i class="o9-r3"></i><i class="o9-sweep"></i>
      <i class="o9-p o9-p1"></i><i class="o9-p o9-p2"></i><i class="o9-p o9-p3"></i></div>${time(k, "o9-time")}${est(k, "o9-est")}${cancel("o9-cancel")}</div>`,
    // 10 · Side Toast: row under the profile card, left column
    10: k => `<div class="o10">${tex(.25)}<i class="o10-acc"></i>${dot("o10-dot")}${lbl("o10-lbl")}${time(k, "o10-time")}${est(k, "o10-est")}${bar("o10-bar")}</div>`,
  };

  const CSS = `
  #s-mwait .screen__bg{background:none!important}
  .mw{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden}
  .mw *{box-sizing:border-box} .mw i{display:block;font-style:normal}
  .mw > div{position:absolute;overflow:hidden}
  .mf-tex{position:absolute;left:0;top:0;width:100%;height:100%;background-size:cover;background-position:center}
  .w-time{position:absolute;font:400 48px/1 var(--font-display);color:#fff7e1;white-space:nowrap;letter-spacing:.02em}
  .w-lbl{position:absolute;font:700 18px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:#f2df57;white-space:nowrap}
  .w-mode{position:absolute;font:600 16px/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:#a9a9b3;white-space:nowrap}
  .w-est{position:absolute;font:600 18px/1 var(--font-ui);text-transform:uppercase;color:#a9a9b3;white-space:nowrap}
  .k3 .w-est{color:#f6df2f}
  .w-bar{position:absolute;height:4px;background:rgb(255 255 255/.14)}
  .w-fill{position:absolute;left:0;top:0;height:100%;width:3%;background:#f6df2f}
  .k2 .w-fill{width:60%} .k3 .w-fill{width:100%}
  .w-cancel{position:absolute;display:flex;align-items:center;gap:8px;font:700 16px/1 var(--font-ui);text-transform:uppercase;color:#d6d6dc;white-space:nowrap}
  .w-dot{position:absolute;width:12px;height:12px;border-radius:50%;background:#f6df2f;box-shadow:0 0 0 5px rgb(246 223 47/.22)}

  /* 1 Top Pill (x 560-1000) */
  .o1{left:560px;top:28px;width:440px;height:84px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33;border-radius:2px}
  .o1-acc{position:absolute;left:0;top:0;width:56px;height:84px;background:#f6df2f}
  .o1-acc .w-dot{left:22px;top:36px;background:#0d0d0e;box-shadow:0 0 0 5px rgb(0 0 0/.18)}
  .o1-lbl{left:76px;top:18px} .o1-mode{left:76px;top:46px} .o1-est{left:76px;top:46px;opacity:.01}
  .o1-time{right:24px;top:18px} .o1-bar{left:56px;top:80px;width:384px}
  .k1 .o1{transform:translateY(-100px)}
  .k3 .o1-mode{opacity:.01} .k3 .o1-est{opacity:1}

  /* 2 Under Shop: right column card (x 1500-1860, y 360-540) */
  .o2{left:1500px;top:350px;width:360px;height:190px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33}
  .o2-top{position:absolute;left:0;top:0;width:360px;height:6px;background:#f6df2f}
  .o2-lbl{left:22px;top:26px} .o2-mode{left:22px;top:52px}
  .o2-time{left:20px;top:78px;font-size:56px} .o2-est{left:22px;top:146px}
  .o2-bar{left:22px;top:176px;width:316px} .o2-cancel{left:226px;top:22px}
  .k1 .o2{transform:translateX(420px)}

  /* 3 Edge Tab: right edge, opens wider on long wait */
  .o3{left:1800px;top:380px;width:120px;height:330px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33}
  .o3-acc{position:absolute;left:0;top:0;width:6px;height:330px;background:#f6df2f}
  .o3-time{left:16px;top:30px;font-size:20px}
  .o3-lbl{left:30px;top:90px;transform:rotate(90deg);transform-origin:0 0;left:62px}
  .o3-mode,.o3-est,.o3-bar,.o3-cancel{opacity:.01}
  .o3-mode{left:40px;top:86px} .o3-est{left:40px;top:150px} .o3-bar{left:40px;top:200px;width:300px} .o3-cancel{left:40px;top:270px}
  .k1 .o3{transform:translateX(120px)}
  .k3 .o3{left:1520px;width:400px} .k3 .o3-time{left:40px;font-size:56px} .k3 .o3-lbl{transform:none;left:220px;top:44px}
  .k3 .o3-mode,.k3 .o3-est,.k3 .o3-bar,.k3 .o3-cancel{opacity:1}

  /* 4 Bottom Strip: above the hint bar */
  .o4{left:0;top:974px;width:1920px;height:46px;background:linear-gradient(90deg,rgb(13 13 14/.95),rgb(13 13 14/.8))}
  .o4-line{position:absolute;left:0;top:0;width:1920px;height:2px;background:#f6df2f}
  .o4-dot{left:64px;top:18px}
  .o4-lbl{left:92px;top:15px} .o4-mode{left:270px;top:16px}
  .o4-time{left:880px;top:9px;font-size:32px} .o4-est{left:1020px;top:15px} .o4-cancel{left:1740px;top:14px}
  .k1 .o4{transform:translateY(60px)}
  .k3 .o4{background:linear-gradient(90deg,rgb(40 36 6/.95),rgb(13 13 14/.85))}

  /* 5 Corner Ring: bottom-right, above Options */
  .o5{left:1620px;top:500px;width:240px;height:280px}
  .o5-ring{position:absolute;left:20px;top:0;width:200px;height:200px;border-radius:50%;background:conic-gradient(#f6df2f 0 4%,rgb(255 255 255/.14) 4% 100%)}
  .k2 .o5-ring{background:conic-gradient(#f6df2f 0 60%,rgb(255 255 255/.14) 60% 100%)} .k3 .o5-ring{background:conic-gradient(#f6df2f 0 100%,#f6df2f 100%)}
  .o5-hole{position:absolute;left:30px;top:10px;width:180px;height:180px;border-radius:50%;background:#111114;overflow:hidden}
  .o5-time{left:0;top:72px;width:240px;text-align:center;font-size:44px}
  .o5-lbl{left:0;top:214px;width:240px;text-align:center} .o5-est{left:0;top:244px;width:240px;text-align:center}
  .k1 .o5{transform:scale(.6);opacity:.4}

  /* 6 Hint-bar Chip: bottom centre in the hint row */
  .o6{left:700px;top:1006px;width:520px;height:56px;background:#111114;box-shadow:inset 0 0 0 1px #f6df2f;border-radius:28px}
  .o6-dot{left:26px;top:22px} .o6-lbl{left:52px;top:20px} .o6-time{left:240px;top:13px;font-size:32px}
  .o6-sep{position:absolute;left:356px;top:14px;width:1px;height:28px;background:#3a3c44}
  .o6-cancel{left:376px;top:16px}
  .k1 .o6{transform:translateY(80px)}
  .k3 .o6{background:#2a2606}

  /* 7 Card Chip: docked on the Match Find card (card x 60-501, y 796-971) */
  .o7{left:60px;top:730px;width:441px;height:60px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33}
  .o7-est{left:18px;top:14px} .o7-pl{position:absolute;right:18px;top:14px;font:600 18px/1 var(--font-ui);text-transform:uppercase;color:#d6d6dc}
  .o7-bar{left:18px;top:44px;width:405px}
  .k1 .o7{transform:translateY(60px);opacity:.3}

  /* 8 Ghost Count: huge faint digits in the scene */
  .o8{left:700px;top:250px;width:1100px;height:420px;overflow:visible!important}
  .o8-time{left:auto;right:60px;top:40px;font-size:300px;color:rgb(255 247 225/.3)}
  .o8-lbl{right:12px;top:360px;font-size:24px} .o8-est{right:12px;top:394px}
  .o8-lbl,.o8-est{left:auto}
  .k1 .o8-time{transform:scale(1.25);color:rgb(255 247 225/.08)}
  .k3 .o8-time{color:rgb(246 223 47/.38)}

  /* 9 Radar Panel: right column under Event (x 1500-1860) */
  .o9{left:1500px;top:350px;width:360px;height:420px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33}
  .o9-lbl{left:24px;top:24px} .o9-mode{left:24px;top:50px}
  .o9-radar{position:absolute;left:80px;top:90px;width:200px;height:200px}
  .o9-r1,.o9-r2,.o9-r3{position:absolute;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(242 223 87/.35)}
  .o9-r1{left:0;top:0;width:200px;height:200px} .o9-r2{left:40px;top:40px;width:120px;height:120px} .o9-r3{left:80px;top:80px;width:40px;height:40px}
  .o9-sweep{position:absolute;left:0;top:0;width:200px;height:200px;border-radius:50%;background:conic-gradient(rgb(246 223 47/.5) 0 8%,rgb(246 223 47/0) 8% 100%)}
  .k2 .o9-sweep{transform:rotate(160deg)} .k3 .o9-sweep{transform:rotate(330deg)}
  .o9-p{position:absolute;width:10px;height:10px;border-radius:50%;background:#fff7e1}
  .o9-p1{left:140px;top:44px} .o9-p2{left:48px;top:120px;opacity:.01} .o9-p3{left:120px;top:150px;opacity:.01}
  .k2 .o9-p2{opacity:.8} .k3 .o9-p2,.k3 .o9-p3{opacity:.8}
  .o9-time{left:24px;top:310px;font-size:52px} .o9-est{left:24px;top:372px} .o9-cancel{left:236px;top:24px}
  .k1 .o9{transform:translateX(420px)}

  /* 10 Side Toast: under the profile card (left column) */
  .o10{left:60px;top:470px;width:400px;height:96px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33}
  .o10-acc{position:absolute;left:0;top:0;width:6px;height:96px;background:#f6df2f}
  .o10-dot{left:26px;top:26px} .o10-lbl{left:50px;top:24px} .o10-est{left:26px;top:58px}
  .o10-time{right:22px;top:24px;font-size:40px} .o10-bar{left:6px;top:92px;width:394px}
  .k1 .o10{transform:translateX(-470px)}
  `;

  function show(o, k) {
    let sec = document.getElementById("s-mwait");
    if (!sec) {
      const style = document.createElement("style"); style.id = "mw-style"; style.textContent = CSS; document.head.appendChild(style);
      sec = document.createElement("section"); sec.className = "screen"; sec.id = "s-mwait";
      sec.innerHTML = `<div class="screen__bg"></div><div class="screen__safe"></div>`;
      document.getElementById("stage").appendChild(sec);
    }
    document.querySelectorAll(".screen.is-active").forEach(e => e !== sec && e.classList.remove("is-active"));
    document.querySelectorAll(".overlay.login,.login").forEach(e => e.style.display = "none");
    sec.classList.add("is-active"); sec.dataset.screen = `match-wait-o${o}-k${k}`;
    sec.querySelector(".screen__safe").innerHTML = `<div class="mw opt${o} k${k}">${OPTS[o](k)}</div>`;
  }
  // option 4 picked: the real Find Strip (mode-card.js stripHTML + components.css), one state per k, for MTX_BAKE_STRUCT.bakeEl
  function strip(k) {
    show(4, k);
    const ms = [0, 27000, 72000][k - 1];
    sec().querySelector(".screen__safe").innerHTML = `<div class="mw opt4 k${k}"><div class="find-strip${ms > 45000 ? " is-long" : ""}" style="animation:none">${window.MTX_MODE_CARD.stripHTML({ mode: "Rank Fight", time: T[k - 1], ms, est: 45000 })}</div></div>`;
    sec().querySelector(".find-strip__dot").style.animation = "none";
    return sec().querySelector(".find-strip");
  }
  const sec = () => document.getElementById("s-mwait");
  window.MW_OPTS = { show, strip };
})();
