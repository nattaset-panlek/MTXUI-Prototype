/* Match Found overlay · 10 design options × 3 keyframes, for baking to Figma. Not loaded by the app.
   In the preview: eval this file, then MF_OPTS.show(o, k) (o 1-10, k 1-3) and MTX_BAKE_STRUCT.run().
   Only the overlay is drawn (transparent screen); in Figma it sits on an instance of the hub screen.
   K1 = enter pose, K2 = hold, K3 = exit (hand-off to the load screen). Layer names stay the same in all
   three keyframes so Smart Animate can tween them; "hidden" layers use opacity .01 (opacity 0 is not baked). */
(function () {
  const IMG = "mtx/assets/img/", SVG = "mtx/assets/svg/";
  const tex = (op = .22, w = false) => `<i class="mf-tex" style="opacity:${op};background-image:url(${IMG}${w ? "tex-scratch-white" : "tex-scratch"}.webp)"></i>`;
  const title = (cls = "") => `<h2 class="mf-title ${cls}">Match Found</h2>`;
  const mode = (cls = "") => `<span class="mf-mode ${cls}">Rank Fight</span>`;
  const av = (n, cls) => `<i class="${cls}" style="background-image:url(${IMG}cc-avatar-${n}.webp)"></i>`;
  const opp = (cls = "") => `<div class="mf-opp ${cls}">${av(3, "mf-opp__av")}<div class="mf-opp__txt"><span class="mf-opp__k">Opponent</span>
    <b class="mf-opp__name">Kraisorn.T</b><span class="mf-opp__meta"><img class="mf-flag" src="${SVG}flag-th.svg" alt="">NT3 · OVR 86 · 18-9-4</span></div></div>`;
  const me = (cls = "") => `<div class="mf-opp mf-me ${cls}">${av(1, "mf-opp__av")}<div class="mf-opp__txt"><span class="mf-opp__k">You</span>
    <b class="mf-opp__name">SX.MTX</b><span class="mf-opp__meta"><img class="mf-flag" src="${SVG}flag-th.svg" alt="">NT4 · OVR 88 · 20-15-12</span></div></div>`;
  const load = (cls = "") => `<div class="mf-load ${cls}"><span class="mf-load__t">Entering ring</span><i class="mf-load__bar"><i class="mf-load__fill"></i></i></div>`;
  const fade = `<i class="mf-fade"></i>`;

  const OPTS = {
    1: () => `<div class="o1-band">${tex(.25)}<div class="o1-tag">${mode()}${title()}</div><i class="o1-edge"></i>${opp("o1-opp")}${load("o1-load")}</div>${fade}`,
    2: () => `<i class="o2-dim"></i><div class="o2-stamp"><i class="o2-plate">${tex(.35, true)}</i>${title("o2-title")}</div>${mode("o2-mode")}${opp("o2-opp")}${fade}`,
    3: () => `<i class="o3-dim"></i><div class="o3-panel">${tex(.22)}<i class="o3-edge"></i>${mode("o3-mode")}${title("o3-title")}
      ${av(3, "o3-av")}<b class="o3-name">Kraisorn.T</b><span class="o3-meta"><img class="mf-flag" src="${SVG}flag-th.svg" alt="">NT3 · OVR 86 · 18-9-4</span>${load("o3-load")}</div>${fade}`,
    4: () => `<div class="o4-bar">${tex(.25)}<i class="o4-edge"></i>${title("o4-title")}${mode("o4-mode")}${opp("o4-opp")}${load("o4-load")}</div>${fade}`,
    5: () => `<i class="o5-dark"></i><i class="o5-flash">${tex(.3)}</i>${title("o5-title")}${opp("o5-opp")}${load("o5-load")}${fade}`,
    6: () => `<i class="o6-dim"></i><div class="o6-card">${tex(.28)}<i class="o6-top"></i>${mode("o6-mode")}${title("o6-title")}${opp("o6-opp")}${load("o6-load")}</div>${fade}`,
    7: () => `<i class="o7-dim"></i><div class="o7-slash"><i class="o7-strip">${tex(.3)}</i><i class="o7-shadow"></i></div>${title("o7-title")}${mode("o7-mode")}${opp("o7-opp")}${fade}`,
    8: () => `<i class="o8-dim"></i><div class="o8-l">${tex(.22)}<i class="o8-art" style="background-image:url(${IMG}cc-avatar-1.webp)"></i>${me("o8-me")}</div>
      <div class="o8-r">${tex(.22)}<i class="o8-art" style="background-image:url(${IMG}cc-avatar-3.webp)"></i>${opp("o8-opp")}</div>
      <b class="o8-vs">VS</b>${title("o8-title")}${fade}`,
    9: () => `<div class="o9-toast">${tex(.25)}<i class="o9-edge"></i>${title("o9-title")}${opp("o9-opp")}<b class="o9-count">3</b></div>${fade}`,
    10: () => `<div class="o10-top">${tex(.18)}${mode("o10-mode")}${title("o10-title")}</div><div class="o10-bot">${tex(.18)}${opp("o10-opp")}${load("o10-load")}</div>${fade}`,
  };

  const CSS = `
  #s-mfound .screen__bg{background:none!important}
  .mf{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden}
  .mf *{box-sizing:border-box}
  .mf i{display:block;font-style:normal}
  .mf-tex{position:absolute;left:0;top:0;width:100%;height:100%;background-size:cover;background-position:center}
  .mf-fade{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#0b0b0c;opacity:.01}
  .mf-title{position:absolute;margin:0;font:400 96px/1 var(--font-display);text-transform:uppercase;color:#f6df2f;white-space:nowrap;letter-spacing:.01em}
  .mf-mode{position:absolute;display:block;padding:7px 12px 6px;background:#0d0d0e;font:700 20px/1 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:#f2df57;white-space:nowrap}
  .mf-opp{position:absolute;width:520px;height:120px}
  .mf-opp__av{position:absolute;left:0;top:0;width:120px;height:120px;background-size:cover;background-color:#1b1c20;box-shadow:inset 0 0 0 2px #f2df57}
  .mf-opp__txt{position:absolute;left:142px;top:6px;width:380px}
  .mf-opp__k{display:block;font:700 18px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:#a9a9b3}
  .mf-opp__name{display:block;margin-top:10px;font:400 46px/1 var(--font-display);text-transform:uppercase;color:#fff7e1;white-space:nowrap}
  .mf-opp__meta{display:flex;align-items:center;gap:10px;margin-top:12px;font:600 22px/1 var(--font-ui);text-transform:uppercase;color:#d6d6dc;white-space:nowrap}
  .mf-flag{width:30px;height:20px;display:block}
  .mf-load{position:absolute;width:360px;height:40px}
  .mf-load__t{display:block;font:700 18px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:#d6d6dc}
  .mf-load__bar{position:absolute;left:0;top:28px;width:360px;height:6px;background:rgb(255 255 255/.14)}
  .mf-load__fill{position:absolute;left:0;top:0;width:12%;height:6px;background:#f6df2f}
  .k2 .mf-load__fill{width:55%} .k3 .mf-load__fill{width:100%}

  /* 1 · Top Banner: full-width band drops from the top edge */
  .o1-band{position:absolute;left:0;top:0;width:1920px;height:220px;background:linear-gradient(180deg,#121215,#0b0b0c);box-shadow:inset 0 -3px 0 #f6df2f}
  .o1-tag{position:absolute;left:0;top:0;width:960px;height:220px;background:#f6df2f}
  .o1-tag .mf-mode{left:96px;top:40px}
  .o1-tag .mf-title{left:96px;top:100px;color:#0d0d0e;font-size:80px}
  .o1-edge{position:absolute;left:910px;top:-40px;width:90px;height:300px;background:#f6df2f;transform:rotate(14deg)}
  .o1-opp{left:1060px;top:50px}
  .o1-load{left:1660px;top:92px;width:220px} .o1-load .mf-load__bar{width:220px}
  .o1-band{transform:translateY(-190px)} .k2 .o1-band{transform:none} .k3 .o1-band{transform:translateY(-120px);opacity:.5}
  .k3 .mf-fade{opacity:.85}

  /* 2 · Center Stamp: big title slams down in the middle, plate behind it */
  .o2-dim{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#000;opacity:.62}
  .o2-stamp{position:absolute;left:360px;top:380px;width:1200px;height:200px;transform:rotate(-4deg)}
  .o2-plate{position:absolute;left:0;top:0;width:1200px;height:200px;background:#f6df2f}
  .o2-title{left:0;top:52px;width:1200px;text-align:center;font-size:110px;color:#0d0d0e}
  .o2-mode{left:880px;top:330px}
  .o2-opp{left:700px;top:640px}
  .k1 .o2-dim{opacity:.2} .k1 .o2-stamp{transform:rotate(-4deg) scale(1.7);opacity:.35} .k1 .o2-opp,.k1 .o2-mode{opacity:.01}
  .k3 .o2-stamp{transform:rotate(-4deg) scale(.86);opacity:.4} .k3 .o2-opp,.k3 .o2-mode{opacity:.2} .k3 .mf-fade{opacity:.9}

  /* 3 · Side Slide-In: tall panel from the right; on exit it widens over the whole screen */
  .o3-dim{position:absolute;left:0;top:0;width:1920px;height:1080px;background:linear-gradient(90deg,rgb(0 0 0/0),rgb(0 0 0/.6) 70%);}
  .o3-panel{position:absolute;left:1300px;top:0;width:620px;height:1080px;background:#101013;box-shadow:inset 4px 0 0 #f6df2f;overflow:hidden}
  .o3-edge{position:absolute;left:0;top:0;width:620px;height:10px;background:#f6df2f}
  .o3-mode{left:64px;top:150px}
  .o3-title{left:64px;top:226px;font-size:68px}
  .o3-av{position:absolute;left:64px;top:430px;width:300px;height:300px;background-size:cover;box-shadow:inset 0 0 0 3px #f6df2f}
  .o3-name{position:absolute;left:64px;top:760px;font:400 54px/1 var(--font-display);text-transform:uppercase;color:#fff7e1}
  .o3-meta{position:absolute;left:64px;top:830px;display:flex;align-items:center;gap:10px;font:600 24px/1 var(--font-ui);text-transform:uppercase;color:#d6d6dc;white-space:nowrap}
  .o3-load{left:64px;top:930px;width:480px} .o3-load .mf-load__bar{width:480px}
  .k1 .o3-panel{transform:translateX(540px)} .k1 .o3-dim{opacity:.2}
  .k3 .o3-panel{left:0;width:1920px} .k3 .o3-dim{opacity:1}

  /* 4 · Bottom Bar: bar rises over the mode-card row */
  .o4-bar{position:absolute;left:0;top:770px;width:1920px;height:220px;background:linear-gradient(180deg,#141417,#0b0b0c);box-shadow:inset 0 3px 0 #f6df2f}
  .o4-edge{position:absolute;left:0;top:0;width:12px;height:220px;background:#f6df2f}
  .o4-title{left:70px;top:76px;font-size:80px}
  .o4-mode{left:70px;top:22px}
  .o4-opp{left:980px;top:50px}
  .o4-load{left:1560px;top:92px;width:300px} .o4-load .mf-load__bar{width:300px}
  .k1 .o4-bar{transform:translateY(200px);opacity:.6}
  .k3 .o4-bar{transform:translateY(-380px)} .k3 .mf-fade{opacity:.85}

  /* 5 · Full-Screen Flash: yellow flash fills the screen, settles into a dark veil */
  .o5-dark{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#0b0b0c;opacity:.7}
  .o5-flash{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#f6df2f;opacity:.01}
  .o5-title{left:0;top:400px;width:1920px;text-align:center;font-size:150px}
  .o5-opp{left:700px;top:600px}
  .o5-load{left:780px;top:800px}
  .k1 .o5-flash{opacity:.95} .k1 .o5-title{color:#0d0d0e;transform:scale(1.25)} .k1 .o5-opp,.k1 .o5-load{opacity:.01}
  .k3 .o5-title{transform:translateY(-120px) scale(.7);opacity:.5} .k3 .o5-opp{opacity:.3} .k3 .mf-fade{opacity:.92}

  /* 6 · Card Transform: the Match Find card itself grows into the notice */
  .o6-dim{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#000;opacity:.55}
  .o6-card{position:absolute;left:510px;top:300px;width:900px;height:440px;background:#f6df2f;overflow:hidden}
  .o6-top{position:absolute;left:0;top:0;width:100%;height:12px;background:#0d0d0e}
  .o6-mode{left:56px;top:56px}
  .o6-title{left:56px;top:116px;color:#0d0d0e;font-size:80px}
  .o6-opp{left:56px;top:262px} .o6-opp .mf-opp__name{color:#0d0d0e} .o6-opp .mf-opp__k,.o6-opp .mf-opp__meta{color:#2a2a2a} .o6-opp .mf-opp__av{box-shadow:inset 0 0 0 2px #0d0d0e}
  .o6-load{left:620px;top:372px;width:240px} .o6-load .mf-load__bar{width:240px} .o6-load .mf-load__t{color:#0d0d0e} .o6-load .mf-load__bar{background:rgb(0 0 0/.18)} .o6-load .mf-load__fill{background:#0d0d0e}
  .k1 .o6-card{left:60px;top:796px;width:441px;height:175px} .k1 .o6-dim{opacity:.01}
  .k1 .o6-title{left:24px;top:66px;font-size:38px} .k1 .o6-mode{left:24px;top:18px} .k1 .o6-opp,.k1 .o6-load{opacity:.01}
  .k3 .o6-card{left:0;top:0;width:1920px;height:1080px} .k3 .o6-title{left:96px;top:440px;font-size:150px} .k3 .o6-mode{left:96px;top:380px} .k3 .o6-opp{left:96px;top:640px} .k3 .o6-load{left:1460px;top:960px}

  /* 7 · Diagonal Slash: angled strip cuts across the screen */
  .o7-dim{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#000;opacity:.5}
  .o7-slash{position:absolute;left:-240px;top:380px;width:2400px;height:250px;transform:rotate(-7deg)}
  .o7-strip{position:absolute;left:0;top:0;width:2400px;height:250px;background:#f6df2f}
  .o7-shadow{position:absolute;left:0;top:250px;width:2400px;height:18px;background:#0d0d0e;opacity:.8}
  .o7-title{left:420px;top:430px;font-size:130px;color:#0d0d0e;transform:rotate(-7deg)}
  .o7-mode{left:300px;top:340px;transform:rotate(-7deg)}
  .o7-opp{left:1150px;top:680px}
  .k1 .o7-slash{transform:translateX(-1900px) rotate(-7deg)} .k1 .o7-title{transform:translateX(-1200px) rotate(-7deg);opacity:.3} .k1 .o7-dim{opacity:.15} .k1 .o7-opp,.k1 .o7-mode{opacity:.01}
  .k3 .o7-slash{transform:translateX(1900px) rotate(-7deg)} .k3 .o7-title{transform:translateX(1300px) rotate(-7deg);opacity:.3} .k3 .o7-opp,.k3 .o7-mode{opacity:.01} .k3 .mf-fade{opacity:.88}

  /* 8 · VS Split: two halves close in from the sides */
  .o8-dim{position:absolute;left:0;top:0;width:1920px;height:1080px;background:#000;opacity:.5}
  .o8-l,.o8-r{position:absolute;top:240px;width:940px;height:600px;background:#111114;overflow:hidden}
  .o8-l{left:0;box-shadow:inset 0 -6px 0 #f6df2f} .o8-r{left:980px;box-shadow:inset 0 -6px 0 #8a8f99}
  .o8-art{position:absolute;top:60px;width:420px;height:420px;background-size:cover;opacity:.9}
  .o8-l .o8-art{left:80px} .o8-r .o8-art{left:440px}
  .o8-me{left:80px;top:470px;width:600px} .o8-me .mf-opp__av{opacity:.01}
  .o8-r .o8-opp{left:440px;top:470px} .o8-r .o8-opp .mf-opp__av{opacity:.01}
  .o8-me .mf-opp__txt,.o8-r .mf-opp__txt{left:0}
  .o8-vs{position:absolute;left:880px;top:450px;width:160px;height:160px;background:#f6df2f;font:400 80px/160px var(--font-display);color:#0d0d0e;text-align:center;transform:rotate(45deg)}
  .o8-title{left:0;top:140px;width:1920px;text-align:center;font-size:80px}
  .k1 .o8-l{transform:translateX(-760px)} .k1 .o8-r{transform:translateX(760px)} .k1 .o8-vs{transform:rotate(45deg) scale(2.2);opacity:.2} .k1 .o8-title{opacity:.01} .k1 .o8-dim{opacity:.15}
  .k3 .o8-vs{transform:rotate(45deg) scale(1.5)} .k3 .o8-title{opacity:.3} .k3 .mf-fade{opacity:.75}

  /* 9 · Corner Toast: small notice docked on the Match Find card, counts down */
  .o9-toast{position:absolute;left:60px;top:560px;width:640px;height:220px;background:#111114;box-shadow:inset 0 0 0 1px #2a2c33;overflow:hidden}
  .o9-edge{position:absolute;left:0;top:0;width:8px;height:220px;background:#f6df2f}
  .o9-title{left:36px;top:34px;font-size:44px}
  .o9-opp{left:36px;top:96px;transform:scale(.8);transform-origin:0 0}
  .o9-count{position:absolute;left:500px;top:20px;width:120px;height:120px;font:400 110px/120px var(--font-display);color:#fff7e1;text-align:center}
  .k1 .o9-toast{transform:translateY(240px);opacity:.3}
  .k3 .o9-toast{transform:translateY(236px) scaleY(.8);opacity:.4} .k3 .mf-fade{opacity:.85}

  /* 10 · Letterbox: cinematic bars close in from top and bottom */
  .o10-top,.o10-bot{position:absolute;left:0;width:1920px;background:#0b0b0c;overflow:hidden}
  .o10-top{top:0;height:380px;box-shadow:inset 0 -4px 0 #f6df2f} .o10-bot{top:700px;height:380px;box-shadow:inset 0 4px 0 #f6df2f}
  .o10-mode{left:96px;top:174px}
  .o10-title{left:96px;top:226px;font-size:120px}
  .o10-opp{left:96px;top:50px;transform:scale(1.35);transform-origin:0 0}
  .o10-load{left:1460px;top:100px}
  .k1 .o10-top{transform:translateY(-310px)} .k1 .o10-bot{transform:translateY(310px)}
  .k3 .o10-top{height:540px} .k3 .o10-bot{top:540px;height:540px} .k3 .o10-mode{top:334px} .k3 .o10-title{top:386px}
  `;

  function show(o, k) {
    let sec = document.getElementById("s-mfound");
    if (!sec) {
      const style = document.createElement("style"); style.id = "mf-style"; style.textContent = CSS; document.head.appendChild(style);
      sec = document.createElement("section"); sec.className = "screen"; sec.id = "s-mfound";
      sec.innerHTML = `<div class="screen__bg"></div><div class="screen__safe"></div>`;
      document.getElementById("stage").appendChild(sec);
    }
    document.querySelectorAll(".screen.is-active").forEach(e => e !== sec && e.classList.remove("is-active"));
    sec.classList.add("is-active"); sec.dataset.screen = `match-found-o${o}-k${k}`;
    document.querySelectorAll(".overlay.login,.login").forEach(e => e.style.display = "none");
    sec.querySelector(".screen__safe").innerHTML = `<div class="mf o${o} k${k}">${OPTS[o]()}</div>`;
  }
  window.MF_OPTS = { show };
})();
