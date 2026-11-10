/* Component: Match Result, shown after a fight (Figma 663:60039 "Set E" frames R1-R3, L1-L4, Q1-Q4).
     MTX_MATCH_RESULT.play({ mode: "rank" | "casual", onDone })
       rank   -> Rank page, then Level, then Quests
       casual -> Level, then Quests (no Rank page, no Rank tab)
     MTX_MATCH_RESULT.isOpen() / input(a)   -> app.js routes the pad here while it is open
   Look (Set E): Rank = center stage (MTX / Result Rank Hero) · Level = rows in E / S / R colours (MTX / Result Level Row)
   · Quests = cards without panels, a completed quest is filled yellow (MTX / Result Quest Row). Tabs under the title
   (MTX / Result Steps, MTX / Tab), hint bar A + LB RB (MTX / Result Hint Bar).
   Each page auto plays; A skips one section (Rank = 1, Level = one row, Quests = one quest), A on a finished page goes on.
   LB / RB move between pages that have finished (shown in their final state).
   XP is added to MTX_PLAYER (E / S / R, level ups included); RP is added to the player's RP (Rank only).
   Data: wiki 03-Ultimate-Fight/03-Legacy-Core (XP rules), RP G2 sample, screen-quests.js quests (sample progress). */
(function () {
  const RP_TOTAL = 17, RANK = { name: "National Tournament 4", lo: 600, hi: 700, from: 640, next: "NT3" };
  // fight sample: win by KO, R2 1:45 (285 s in the ring), 1 knockdown
  const XP = {
    e: { c: "#ff0027", src: [["Participate", 100], ["Round time 285s ×2", 570], ["Win", 500]] },
    s: { c: "#6100ff", src: [["Knockdown ×1", 300], ["Special Move ×2", 100], ["Counter ×3", 150], ["Clinch win", 100]] },
    r: { c: "#f5e5b5", src: [["Participate", 100], ["Win", 500]] },
  };
  const QUESTS = [   // [objective, before, target, this fight]
    { name: "Temple Fair Fight", objs: [["Win your first temple fair bout", 0, 1, 1]] },
    { name: "Jab and Teep", objs: [["Land jabs (Mat Trong)", 32, 50, 18], ["Land teeps to the body", 12, 30, 6]] },
    { name: "Shin Conditioning", objs: [["Kick the heavy bag", 200, 200, 0], ["Check incoming kicks", 9, 15, 4]] },
  ];
  const PAGE = { rank: "Ranked Result", level: "Level Progress", quest: "Quests" };
  const TAB = { rank: "Rank", level: "Level", quest: "Quests" };
  const fmt = v => Number(v).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const cta = (label, primary) => `<span class="btn-cta btn-cta--key${primary ? "" : " btn-cta--secondary"} mres__cta"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${G("a")}<span class="btn-cta__label">${label}</span></span>`;
  const hints = data => window.MTX_UI?.hintBar ? window.MTX_UI.hintBar(data, { cls: "mres__hints", launcher: false }) : "";
  const FX = `<div class="mres__fx" aria-hidden="true"><i class="mres__grunge"></i><img class="mres__tag" src="mtx/assets/svg/fx-tag.svg" alt=""></div>`;

  let root = null, S = null, timers = [];
  // count a number up (lerp, ease-out) inside el; el._v keeps the shown value so the next count starts from it
  function tween(el, to, ms = 500, show = v => fmt(v)) {
    if (!el) return;
    const from = el._v ?? to; el._v = to; cancelAnimationFrame(el._raf);
    if (ms <= 0 || from === to) { el.textContent = show(to); return; }
    const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = show(from + (to - from) * e); if (k < 1) el._raf = requestAnimationFrame(tick); };
    el._raf = requestAnimationFrame(tick);
    clearTimeout(el._end); el._end = setTimeout(() => { if (el._v === to) { cancelAnimationFrame(el._raf); el.textContent = show(to); } }, ms + 50);   // rAF can pause (hidden tab): always land on the value
  }
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const $ = sel => root.querySelector(sel);
  const plus = v => "+" + fmt(Math.round(v));

  function play({ mode = "rank", onDone } = {}) {
    close();
    const P = window.MTX_PLAYER;
    const before = P ? P.get() : null;
    const snap = t => P ? { level: before[t].level, xp: before[t].xp, need: P.need(t) } : { level: 1, xp: 0, need: 1000 };
    const lv = { e: snap("e"), s: snap("s"), r: snap("r") };
    for (const t of ["e", "s", "r"]) {   // add the XP now, read the result back (level ups included)
      const gain = XP[t].src.reduce((n, s) => n + s[1], 0);
      P?.addXp(t, gain);
      const a = P ? P.get()[t] : { level: 1, xp: gain };
      lv[t].gain = gain; lv[t].after = { level: a.level, xp: a.xp, need: P ? P.need(t) : 1000 };
    }
    if (mode === "rank" && P) P.set({ rp: (before.rp || 0) + RP_TOTAL });
    const pages = mode === "rank" ? ["rank", "level", "quest"] : ["level", "quest"];
    S = { mode, onDone, lv, pages, played: new Set(), page: pages[0], done: false };
    root = document.createElement("section");
    root.className = "mres";
    root.addEventListener("click", e => { const t = e.target.closest("[data-mres-tab]")?.dataset.mresTab; if (t && S && t !== S.page && S.page !== "swap" && S.page !== "out") go(t); });
    (document.getElementById("stage") || document.body).appendChild(root);
    show(pages[0]);
  }
  function close() { clearTimers(); root?.remove(); root = null; S = null; }
  // leave: content fades out, then the whole page, then onDone (the load screen)
  function finish() { const cb = S?.onDone; S.page = "out"; clearTimers(); root.classList.add("is-leaving", "is-closing"); setTimeout(() => { close(); cb?.(); }, 420); }
  function enter() { root.classList.remove("is-leaving"); root.classList.add("is-entering"); later(900, () => root?.classList.remove("is-entering")); }
  // switch page with the out / in transition; a page already played comes back in its final state
  function go(page) { S.page = "swap"; clearTimers(); root.classList.add("is-leaving"); later(320, () => show(page)); }
  function show(page) {
    clearTimers();
    const instant = S.played.has(page);
    S.page = page; S.done = false; S.cur = 0; S.instant = false;
    root.className = "mres is-" + page;
    const tabs = `<div class="mres-tabs">${S.pages.map(p => `<span class="mres-tab${p === page ? " is-on" : ""}" data-mres-tab="${p}">${TAB[p]}</span>`).join("")}</div>`;
    root.innerHTML = `<div class="mres__bg"></div>${FX}<h1 class="page-title tex-text mres__title">${PAGE[page]}</h1>${tabs}
      ${{ rank: rankHtml, level: levelHtml, quest: questHtml }[page]()}${cta("Skip")}${hints({ a: "Skip", "lb+rb": "Tabs" })}`;
    enter();
    if (instant) { S.instant = true; ({ rank: () => { rpStep(1); rpStep(2); rpStep(3); }, level: lvEnd, quest: qEnd })[page](); S.instant = false; return; }
    ({ rank: startRp, level: () => later(700, () => lvRun(0)), quest: () => later(700, () => qRun(0)) })[page]();
  }
  function pageDone() {
    S.done = true; S.played.add(S.page);
    const last = S.pages.indexOf(S.page) === S.pages.length - 1;
    setCta(last ? "Continue" : "Next", true, { a: last ? "Continue" : "Next", "lb+rb": "Tabs" });
  }

  //#region Rank page (R1-R3): TOTAL RP counts up, then counts down while the white gain fill grows, then the green fill catches up
  const rankHtml = () => {
    const at = (RANK.from - RANK.lo) / (RANK.hi - RANK.lo) * 100;
    return `<div class="mres-hero"><img class="mres-hero__emblem" src="mtx/assets/svg/rank-badge.svg" alt="">
      <p class="mres-hero__label">${RANK.name}</p><p class="mres-hero__big"><b>+0</b><small>RP</small></p>
      <div class="mres-bar mres-hero__bar"><i class="mres-bar__old" style="width:${at}%"></i><i class="mres-bar__new" style="left:${at}%"></i></div>
      <p class="mres-hero__ends"><span>${RANK.lo}</span><span class="mres-hero__val">${RANK.from} / ${RANK.hi}</span><span>${RANK.next} · ${RANK.hi}</span></p></div>`;
  };
  function startRp() {
    $(".mres-hero__big b")._v = 0; $(".mres-hero__val")._v = RANK.from;
    later(500, () => rpStep(1));
    later(1700, () => rpStep(2));
    later(2700, () => rpStep(3));
  }
  function rpStep(step) {
    if (!S || S.page !== "rank") return;
    const span = RANK.hi - RANK.lo, ms = S.instant ? 0 : 700, big = $(".mres-hero__big b");
    if (big._v === undefined) big._v = 0;
    tween(big, step === 1 ? RP_TOTAL : 0, ms, plus);
    if (step >= 2) {
      $(".mres-bar__new").style.width = RP_TOTAL / span * 100 + "%";
      const v = $(".mres-hero__val"); if (v._v === undefined) v._v = RANK.from;
      tween(v, RANK.from + RP_TOTAL, ms, x => `${Math.round(x)} / ${RANK.hi}`);
    }
    if (step >= 3) {
      $(".mres-bar__old").style.width = (RANK.from + RP_TOTAL - RANK.lo) / span * 100 + "%";
      $(".mres-hero").classList.add("is-done");
      pageDone();
    }
  }
  //#endregion

  //#region Level page (L1-L4): one row opens at a time, its sources come in one by one and the total counts up from 0,
  // then the white gain fill grows, the track-colour fill catches up, the row closes
  const levelHtml = () => `<div class="mres-lvs">${["e", "s", "r"].map(t => {
    const d = S.lv[t], x = XP[t], up = d.after.level > d.level;
    const old = d.xp / d.need * 100, now = up ? d.after.xp / d.after.need * 100 : d.after.xp / d.need * 100;
    return `<div class="mres-lv" data-t="${t}" style="--c:${x.c};--open:${95 + x.src.length * 28 + 20}px" data-state="wait">
      <b class="mres-lv__k">${t.toUpperCase()}</b><span class="mres-lv__name">Level <i class="mres-lv__num">${d.level}</i><em> · Up</em></span>
      <div class="mres-bar mres-lv__bar"><i class="mres-bar__old" style="width:${old}%"></i><i class="mres-bar__new" style="left:${up ? 0 : old}%" data-w="${Math.max(0, now - (up ? 0 : old))}"></i></div>
      <b class="mres-lv__gain">+0</b>
      <ul class="mres-lv__src">${x.src.map(([a, v]) => `<li><span>${a}</span><b>+${fmt(v)}</b></li>`).join("")}</ul></div>`;
  }).join("")}</div>`;
  function lvRun(i) {
    if (S?.page !== "level") return;
    S.cur = i;
    if (i >= 3) return lvEnd();
    later(lvRow(i), () => lvRun(i + 1));
  }
  function lvSkip() {
    clearTimers();
    const i = S.cur ?? 0, el = root.querySelectorAll(".mres-lv")[i];
    if (el) lvFinishRow(el, i);
    lvRun(i + 1);
  }
  function lvFinishRow(el, i) {
    el.querySelectorAll(".mres-lv__src li").forEach(s => s.classList.add("is-in"));
    tween(el.querySelector(".mres-lv__gain"), S.lv[el.dataset.t].gain, 0, plus);
    lvFill(i, 2); el.dataset.state = "done";
  }
  // the total counts up per source and the white gain fill grows with it (same share), then the colour fill catches up
  function lvRow(i) {
    const c = () => root.querySelectorAll(".mres-lv")[i], tr = ["e", "s", "r"][i], src = XP[tr].src, d = S.lv[tr], up = d.after.level > d.level;
    later(0, () => { const el = c(); el.dataset.state = "open"; const g = el.querySelector(".mres-lv__gain"); g._v = 0; g.textContent = "+0";
      if (up) { el.querySelector(".mres-bar__old").style.width = "0%"; el.querySelector(".mres-lv__num").textContent = d.after.level; el.classList.add("is-up"); } });
    let sum = 0;
    src.forEach(([, v], j) => { sum += v; const to = sum; later(350 + j * 420, () => {
      const el = c(), nw = el.querySelector(".mres-bar__new");
      el.querySelectorAll(".mres-lv__src li")[j].classList.add("is-in");
      tween(el.querySelector(".mres-lv__gain"), to, 380, plus);
      nw.style.width = parseFloat(nw.dataset.w) * to / d.gain + "%";
    }); });
    const tCatch = 350 + src.length * 420 + 200;
    later(tCatch, () => lvFill(i, 2));
    later(tCatch + 650, () => { c().dataset.state = "done"; });
    return tCatch + 850;
  }
  function lvFill(i, phase) {
    const el = root.querySelectorAll(".mres-lv")[i], d = S.lv[el.dataset.t], up = d.after.level > d.level;
    const nw = el.querySelector(".mres-bar__new"), od = el.querySelector(".mres-bar__old");
    if (phase >= 1) {
      if (up) { od.style.width = "0%"; el.querySelector(".mres-lv__num").textContent = d.after.level; el.classList.add("is-up"); }
      nw.style.width = nw.dataset.w + "%";
    }
    if (phase >= 2) od.style.width = (parseFloat(nw.style.left) + parseFloat(nw.dataset.w)) + "%";
  }
  function lvEnd() {
    if (!S || S.page !== "level") return;
    root.querySelectorAll(".mres-lv").forEach((el, i) => lvFinishRow(el, i));
    pageDone();
  }
  //#endregion

  //#region Quest page (Q1-Q4): one quest opens at a time, the counts go up, it closes; a completed quest turns yellow
  const qDone = q => q.objs.every(([, a, n, g]) => a + g >= n);
  const qCount = (q, after) => q.objs.filter(([, a, n, g]) => (after ? a + g : a) >= n).length;
  const questHtml = () => `<div class="mres-qs">${QUESTS.map((q, i) => `<div class="mres-q" data-i="${i}" data-state="wait">
      <span class="mres-q__block"><i class="mres-q__box"></i><img src="mtx/assets/svg/icon-check.svg" alt=""></span>
      <div class="mres-q__body"><div class="mres-q__top"><b class="mres-q__name">${q.name}</b><b class="mres-q__sum">${qCount(q, false)} / ${q.objs.length}</b></div>
        <p class="mres-q__count">${q.objs.length} objectives</p>
        <ul class="mres-q__list">${q.objs.map(([t, a, n]) => `<li class="${a >= n ? "is-done" : ""}"><span><i></i>${t}</span><b class="mres-q__n">${Math.min(a, n)} / ${n}</b></li>`).join("")}</ul></div></div>`).join("")}</div>`;
  function qRun(i) {
    if (S?.page !== "quest") return;
    S.cur = i;
    if (i >= QUESTS.length) return qEnd();
    const q = QUESTS[i];
    qEl(i).dataset.state = "open";
    q.objs.forEach((o, j) => later(400 + j * 450, () => qTick(i, j, false)));
    const tc = 400 + q.objs.length * 450 + 500;
    later(tc, () => qClose(i));
    later(tc + 450, () => qRun(i + 1));
  }
  function qSkip() {
    clearTimers();
    const i = S.cur ?? 0;
    if (i < QUESTS.length) { QUESTS[i].objs.forEach((o, j) => qTick(i, j, true)); qClose(i); }
    qRun(i + 1);
  }
  const qEl = i => root.querySelectorAll(".mres-q")[i];
  function qTick(i, j, instant) {
    if (S?.page !== "quest") return;
    const [, a, n, g] = QUESTS[i].objs[j], li = qEl(i).querySelectorAll(".mres-q__list li")[j];
    const c = li.querySelector(".mres-q__n"); if (c._v === undefined) c._v = Math.min(a, n);
    tween(c, Math.min(n, a + g), instant ? 0 : 450, v => `${Math.round(v)} / ${n}`);
    if (a + g >= n) li.classList.add("is-done");
  }
  function qClose(i) {
    if (S?.page !== "quest") return;
    const q = QUESTS[i], el = qEl(i);
    el.dataset.state = "done";
    el.querySelector(".mres-q__sum").textContent = `${qCount(q, true)} / ${q.objs.length}`;
    el.classList.toggle("is-complete", qDone(q));
  }
  function qEnd() {
    if (S?.page !== "quest") return;
    QUESTS.forEach((q, i) => { q.objs.forEach((o, j) => qTick(i, j, true)); qClose(i); });
    pageDone();
  }
  //#endregion

  function setCta(label, primary, hint) {
    const old = $(".mres__cta"); if (old) old.outerHTML = cta(label, primary);
    const h = $(".mres__hints"); if (h) h.outerHTML = hints(hint);
  }
  function skip() {
    clearTimers();
    S.instant = true;
    if (S.page === "rank") { rpStep(2); rpStep(3); } else if (S.page === "level") lvSkip(); else qSkip();
    S.instant = false;
  }

  function input(a) {
    if (!S || S.page === "swap" || S.page === "out") return;   // page transition running
    const i = S.pages.indexOf(S.page);
    if (a === "a") {
      if (!S.done) return skip();
      if (i < S.pages.length - 1) return go(S.pages[i + 1]);
      return finish();
    }
    // LB / RB: previous / next tab, any time (a finished page opens in its final state, an unplayed one plays)
    if (a === "lb" || a === "rb" || a === "lt" || a === "rt") {   // keyboard Q / E arrive as lt / rt
      const t = S.pages[i + (a === "lb" || a === "lt" ? -1 : 1)];
      if (t) { window.MTX_UI?.rumble?.(30, .12); go(t); }
    }
  }

  window.MTX_MATCH_RESULT = { play, open: play, close, input, isOpen: () => !!root };
})();
