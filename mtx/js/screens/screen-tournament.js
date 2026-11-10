/* Tournament (Figma section "Tournament Base · layout v2", 432:112540) - overlay like the Custom Lobby, opened from the
   Main menu Tournament card. Views:
     hub · shop (popup: Create ticket, LB/RB currency) · confirm (popup) · settings · lobby (owner) · bracket (live) ·
     finish (owner) · browse · filter (popup) · overview · waiting (fighter) · won · out · champion (spectator final)
   Roles: owner (bought a ticket) · fighter · spectator. Keys follow the hint bar of each view.
   window.MTX_TOUR = { open, close, isOpen, input } */
(() => {
  const IMG = "mtx/assets/img/", TI = IMG + "tournament/";
  // Hub card hover = Figma component sets "MTX / Tournament Hub Card · Host / Browse / Create" (450:28184, 451:28313, 451:28315):
  // Default -> Hover, Smart Animate 600 ms ease (.2,.8,.2,1). Every layer sits at its Hover box; while hidden it is transformed
  // back to the pose of the hidden copy in Default (start) and eases to none on focus / hover; leaving plays it back.
  // Boxes are [x, y, w, h] from Figma; the wash is the Overlay in hard-light (matched pixel for pixel against Figma).
  // my: [x, y, width, title top in Default, title top in Hover] · [x, y, w, h] = rendered bounding boxes (rotated layers included), start = hidden copy in Default, end = Hover
  const HG = {
    host:   { photo: [[-1270, -738, 3826, 2017], [-406, -315, 2447, 1290]], corner: [[-644, 314, 1433, 1214], [-609, -382, 2105, 1783]], splash: [[843, 452, 141, 98], [-152, -339, 1276, 889]], my: [60, 608, 852, 93, 93], shade: 1 },
    browse: { photo: [[-804, -467, 2422, 1277], [-153, -136, 997, 526]], corner: [[-13, -441, 803, 423], [-37, -153, 803, 423]], splash: [[533, 286, 89, 62], [-96, -215, 807, 562]], my: [36, 204, 600, 88, 88] },
    create: { photo: [[-804, -467, 2422, 1277], [-1, -32, 801, 422]], corner: [[-645, 385, 803, 423], [-315, -162, 841, 712]], splash: [[533, 286, 89, 62], [-96, -215, 807, 562]], my: [36, 204, 600, 93, 93] } };
  const box = ([s, e]) => `left:${e[0]}px;top:${e[1]}px;width:${e[2]}px;height:${e[3]}px;--t:translate(${s[0] - e[0]}px,${s[1] - e[1]}px) scale(${s[2] / e[2]},${s[3] / e[3]})`;
  const HOV = (k, tk = k) => { const g = HG[k], u = n => `${TI}hov/${/^(dim|main)-/.test(n) ? tk : k}-${n}.png`, m = g.my;   // tk: text set ("mine" = your hosted room, Figma 481:25723)
    return `<div class="trh" aria-hidden="true"><div class="trh__clip"><img class="trh__mv" style="${box(g.photo)}" src="${u("photo")}" alt=""><img class="trh__full" src="${u("tex")}" alt=""><img class="trh__mv" style="${box(g.corner)}" src="${u("corner")}" alt=""><img class="trh__full trh__wash" src="${u("overlay")}" alt=""></div>
      <img class="trh__full" src="${u("outline")}" alt="">${g.shade ? `<img class="trh__full" src="${u("shade")}" alt="">` : ""}<img class="trh__mv" style="${box(g.splash)}" src="${u("splash")}" alt="">
      <div class="trh__my" style="left:${m[0]}px;top:${m[1]}px;width:${m[2]}px"><img class="trh__s" src="${u("dim-s")}" alt=""><img class="trh__e" src="${u("dim-e")}" alt="">
        <span class="trh__bar"><img src="${u("bar")}" alt=""></span><img class="trh__s" style="left:18px;top:${m[3]}px" src="${u("main-s")}" alt=""><img class="trh__e" style="left:18px;top:${m[4]}px" src="${u("main-e")}" alt=""></div></div>`; };
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const api = () => window.MTX?.api; const rumble = (a, b) => api()?.rumble?.(a, b); const toast = t => api()?.toast?.(t);
  const AV = i => `${IMG}cc-avatar-${(i % 4) + 1}.webp`;
  // Start now: hold-to-confirm dialog. Fighters pair up by slot (1-2, 3-4 ...); a fighter with no opponent gets a bye
  // (wins round 1 without a fight and waits for round 2). Two cases: every fighter paired / some fighters on a bye.
  // hold-to-start on the lobby Start button (shared hold component: ring sweep + stepped rumble)
  // lobby data: 32 seats (P names seeded into the first 13), the Entrants pool = everyone who joined and is not on the board
  const ENT = [{ n: "SX.MTX", a: 2, role: "Fighter", me: 1 }, { n: "Lumpinee Kid", a: 14, role: "Fighter" }, { n: "Korat Brawler", a: 15, role: "Fighter" }, { n: "Buakaw Jr.", a: 3, role: "Fighter" },
    { n: "Saenchai T.", a: 5, role: "Fighter" }, { n: "Rodtang P.", a: 7, role: "Fighter" }, { n: "Superlek K.", a: 9, role: "Fighter" }];   // fighters only: spectators are not shown or placed
  const CTX = [{ id: "pick", label: "Pick up", ico: `<svg class="fz-ico" viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>` },
    { id: "profile", label: "View profile", ico: `<svg class="fz-ico" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>` }];
  const bracketSize = () => +SET_L[3][1][S.set.L[3]];   // Tournament setting "Brackets"
  const seats = () => { const size = bracketSize(), start = Math.min(13, size - 3);
    if (!S.seat) S.seat = Array.from({ length: size }, (_, i) => i < start ? { n: P[i < ME ? i : i + 1], a: i < ME ? i : i + 1 } : null);
    else if (S.seat.length !== size) S.seat = Array.from({ length: size }, (_, i) => S.seat[i] || null);   // a smaller bracket sends the fighters past the end back to Entrants
    S.pick = Math.min(S.pick || 0, size - 1); S.di = S.di || 0; };
  const filled = () => S.seat.filter(Boolean).length;
  const YOU = `<span class="tr-you">You</span>`;
  const ENT_VIS = 8;
  const entTop = pool => Math.max(0, Math.min(pool.length - ENT_VIS, S.di - 3));
  const poolList = () => ENT.filter(e => !S.seat.some(x => x && x.n === e.n));
  let hold = null;
  function holdStart(key = "a") {
    if (filled() < 2) { toast("Seat at least 2 fighters"); return true; }
    hold = hold || window.MTX_UI.createHold({ ms: 1200, steps: 3, flash: null,
      onDone: () => { S.z = "ent"; simStart(); },
      onCancel: ({ quick }) => { if (quick) window.MTX_UI.holdHint?.("start"); } });
    const el = root.querySelector("[data-tr-start]"); if (el) hold.start(el, { source: "input", ctx: key }); return true;
  }
  // Tournament name uses the Create Lobby keyboard
  const NAME_FIELD = { label: "Tournament name", field: "name", max: 24 };
  let vkCtl = null;
  const VK = () => vkCtl = vkCtl || window.MTX_UI.createVk({ host: () => S.open && S.view === "settings" ? S.set.form : null, render: () => render(), rumble: (...x) => rumble(...x), esc, ico: () => "", pinShown: () => false, togglePin: () => {} });
  let openHold = null;
  function openHoldStart() {
    openHold = openHold || window.MTX_UI.createHold({ ms: 1200, steps: 3, flash: null,
      onDone: () => go("opentime", { timeFrom: "settings", tf: clampWhen(S.time || 0), tff: 0 }),
      onCancel: ({ quick }) => { if (quick) window.MTX_UI.holdHint?.("open"); } });
    const el = root.querySelector(".tr-set__open"); if (el && !openHold.active) openHold.start(el, { source: "input", ctx: "a" }); return true;
  }
  function release(a) { if (hold?.active && hold.ctx === a) hold.cancel(true); if (openHold?.active && openHold.ctx === a) openHold.cancel(true); if (nextHold?.active && nextHold.ctx === a) nextHold.cancel(true); }
  // Reward rows always total 100%: one step up takes from the largest other row, one step down gives to the smallest. Each row keeps at least RW_MIN.
  const RW_FROM = 4, RW_STEP = 5, RW_MIN = 5;
  function rewardStep(rw, i, dir) {
    const others = rw.map((v, k) => [v, k]).filter(([v, k]) => k !== i && (dir < 0 || v > RW_MIN));
    if (!others.length || (dir < 0 && rw[i] <= RW_MIN)) return false;
    const pick = others.reduce((p, q) => (dir > 0 ? q[0] > p[0] : q[0] < p[0]) ? q : p);
    rw[i] += dir * RW_STEP; rw[pick[1]] -= dir * RW_STEP; return true;
  }
  // Host run: the board's seats make Round of 32; matches end on a timer, Next round unlocks when every match has a winner
  const SIM_ROUNDS = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final"], SIM_MS = 700;
  let simTimer = null;
  const simName = r => { const m = S.sim.rounds[r]; return m && m.flatMap(x => [x.a, x.b]).filter(Boolean).length === 2 ? "Final" : S.sim.names[r]; };
  const isHost = f => !!f && f.n.startsWith("SX.MTX");
  const pair = list => { const out = []; for (let i = 0; i < list.length; i += 2) { const a = list[i] || null, b = list[i + 1] || null; out.push({ a, b, w: a && b ? null : a || b, bye: !(a && b) && !!(a || b) }); } return out; };
  const simCur = () => S.sim.rounds[S.sim.r];
  const simFight = m => m.a && m.b;
  const simLeft = () => simCur().filter(m => simFight(m) && !m.w);
  const simAlive = () => simCur().filter(m => m.w).length;
  const simWin = m => { m.w = Math.random() < .5 ? m.a : m.b; };
  const simStop = () => { clearInterval(simTimer); simTimer = null; };
  const simRun = () => { simStop(); simTimer = setInterval(() => { if (!S.sim) return simStop(); const m = simLeft()[0]; if (m) simWin(m); if (!simLeft().length) simStop(); if (S.open && S.view === "bracket") render(); }, SIM_MS); };
  function simStart() {
    const fights = S.seat.some(isHost);
    S.sim = { rounds: [pair(S.seat)], r: 0, fights, names: SIM_ROUNDS.slice(5 - Math.log2(S.seat.length)) };
    toast(fights ? "You are in the bracket" : "You are watching as host");
    go("bracket", { role: "owner" }); simRun();
  }
  function simNext() {
    if (simLeft().length) return true;
    if (simAlive() < 2) { simStop(); return go("finish"); }
    do { S.sim.rounds.push(pair(simCur().map(m => m.w))); S.sim.r++; } while (!simCur().some(simFight));   // a round of byes only is skipped
    S.sim.hf = 0; toast(simName(S.sim.r) + " started"); rumble(50, .25); render(); simRun(); return true;
  }
  // Replay history: every fought match so far, newest first. W/S moves, A watches, hold Menu goes on
  const HIST_VIS = 5;
  const simHistory = () => S.sim.rounds.flatMap((r, ri) => r.filter(m => simFight(m) && m.w).map(m => ({ m, name: simName(ri) }))).reverse();
  let nextHold = null;
  function simNextHold(key) {
    if (simLeft().length) return true;
    nextHold = nextHold || window.MTX_UI.createHold({ ms: 1200, steps: 3, flash: null, onDone: () => simNext(), onCancel: ({ quick }) => { if (quick) toast("Hold to continue"); } });
    const el = root.querySelector("[data-tr-next]"); if (el) nextHold.start(el, { source: "input", ctx: key }); return true;
  }
  function simEnd() { simStop(); S.sim = null; S.seat = null; S.bought = false; S.opened = false; }
  function simPlaces() {   // last fought round gives the runner-up, the one before gives 3rd - 4th
    const fought = S.sim.rounds.filter(r => r.some(simFight)), lose = r => (r || []).filter(simFight).map(m => m.w === m.a ? m.b : m.a);
    const final = fought[fought.length - 1], champ = final.find(simFight).w;
    return { champ, second: lose(final)[0], third: lose(fought[fought.length - 2]), wins: fought.filter(r => r.some(m => simFight(m) && m.w === champ)).length };
  }
  function simBracket() {
    const P_ = 800 / S.sim.rounds[0].length, W_ = 250, box = (m, r, i) => { const row = f => !f ? `<div class="l">${m.bye ? "Bye" : "—"}</div>` : `<div class="${m.w && m.w !== f ? "l" : ""}${isHost(f) ? " me" : ""}">${esc(f.n)}${isHost(f) ? YOU : ""}${m.w === f && !m.bye ? "<b>W</b>" : ""}</div>`;
      const live = r === S.sim.r && simFight(m) && !m.w && simLeft().indexOf(m) < 2;
      return `<div class="tr-m tr-m--sim${live ? " is-live" : ""}" style="left:${r * W_}px;top:${(i + .5) * P_ * 2 ** r - 23}px">${row(m.a)}${row(m.b)}</div>`; };
    const heads = S.sim.names.map((t, r) => `<span class="tr-br__h${r === S.sim.r ? " y" : ""}" style="left:${r * W_}px">${simName(r) === "Final" ? "Final" : t}</span>`).join("");
    const body = S.sim.names.map((_, r) => { const ms = S.sim.rounds[r] || Array.from({ length: (S.sim.rounds[0].length) >> r }, () => ({ a: null, b: null })); return ms.map((m, i) => box(m, r, i)).join(""); }).join("");
    return `<div class="tr-br tr-br--sim">${heads}${body}</div>`;
  }
  function simLive() {
    const name = simName(S.sim.r), all = simCur().filter(simFight), left = simLeft(), done = all.length - left.length, ready = !left.length, last = ready && simAlive() < 2;
    const hist = ready ? simHistory() : [], hf = Math.min(S.sim.hf || 0, Math.max(0, hist.length - 1)), top = Math.max(0, Math.min(hist.length - HIST_VIS, hf - 2));
    const row = ({ m, name: rn }, i) => { const h = [...(m.a.n + m.b.n)].reduce((v, c) => (v * 31 + c.charCodeAt(0)) % 9973, 7), dur = `${3 + h % 12}:${String(h % 60).padStart(2, "0")}`, views = 120 + h % 2400;
      return `<div class="tr-hist__r${i === hf ? " is-focused" : ""}"><div class="tr-hist__th" style="background-image:url(${IMG}result-arena.jpg)"><img src="${AV(m.a.a)}" alt=""><img src="${AV(m.b.a)}" alt=""><span>${dur}</span></div><div class="tr-hist__t"><b>${esc(m.a.n)} vs ${esc(m.b.n)}</b><small>Winner · ${esc(m.w.n)}${isHost(m.a) || isHost(m.b) ? YOU : ""}</small><small>${rn} · ${views.toLocaleString("en-US")} views</small></div></div>`; };
    const cards = ready ? hist.slice(top, top + HIST_VIS).map((h, k) => row(h, k + top)).join("") + (hist.length > HIST_VIS ? `<div class="tr-sb tr-hist__sb"><i style="top:${top / hist.length * 100}%;height:${HIST_VIS / hist.length * 100}%"></i></div>` : "")
      : left.slice(0, 2).map((m, i) => streamCard(!i, `${m.a.n} vs ${m.b.n}`, name, "Live")).join("");
    const keys = ready ? [["b", "Back"], ["ls", "Move"], ["a", "Watch replay"], ["menu", last ? "Hold See winner" : "Hold Next round"], ["y", "Pause"]] : [["b", "Back"], ["y", "Pause"]];
    return `${head("Live bracket")}<div class="tr-lab" style="position:absolute;left:60px;top:140px">${S.sim.fights ? "Host · fighting" : "Host · watching"}</div>${simBracket()}
      <div class="tr-side tr-side--live"><div class="tr-lab tr-lab--row">${ready ? `<span>Replay history · ${hist.length}</span>` : `<span>Live now · ${Math.min(2, left.length)}</span><span>Most watched</span>`}</div>${cards}</div>
      <div class="tr-next"><div class="tr-lab">${name}</div><b class="tex-text">${done} / ${all.length} done</b><div class="btn-cta btn-cta--key tr-next__cta${ready ? "" : " is-off"}" data-tr-next><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${window.MTX_UI.glyph("menu")}<span class="btn-cta__label">${last ? "See winner" : "Next round"}</span></div><small>${ready ? "Auto in 30:00" : "Locked until all matches end · auto in 30:00"}</small></div>${hints(keys)}`;
  }
  function simFinish() {
    const p = simPlaces(), rw = S.set.rw, money = pc => "R " + (6000 * pc / 100).toLocaleString("en-US"), rows = [["Host · SX.MTX", money(rw[0]), ME], [`1st · ${p.champ.n}`, money(rw[1]), p.champ.a, 1], ...(p.second ? [[`2nd · ${p.second.n}`, money(rw[2]), p.second.a]] : []), ...(p.third.length ? [[`3rd · ${p.third.map(f => f.n).join(" / ")}`, money(rw[3]), p.third[0].a]] : [])];
    return `${head("Finished")}<div class="tr-art" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade"></div><img class="tr-fighter" src="${IMG}char-lobby.webp" alt="">${tag("Winner")}<div class="tr-art__txt"><small>${esc(S.set.form.v.name)}</small><b class="tex-text">${esc(p.champ.n)}</b><p>${p.wins} wins</p>${p.second ? `<p class="dim">Final · vs ${esc(p.second.n)}</p>` : ""}</div></div>
      <div class="tr-panel"><div class="tr-lab">Prize · R 6,000</div><b class="tex-text tr-panel__h">Payout</b>${rows.map(([t, v, a, big], i) => `<div class="tr-pay${big ? " is-big is-focused" : ""}${i > 1 ? " is-s" : ""}"><img src="${AV(a)}" alt=""><b>${esc(t)}</b><span>${v}</span></div>`).join("")}${btn("Pay prize", "pri wide")}</div>${hints({ b: "Close", a: "Pay prize" })}`;
  }
  function confirmStart() {
    const n = S.slots, byes = n % 2 ? [n - 1] : [];
    const body = byes.length
      ? `${n} fighters · ${(n - byes.length) / 2} matches. ${byes.map(i => `${P[i % 16]} (slot ${i + 1})`).join(", ")} has no opponent and wins by bye: straight through to Round of 16.`
      : `${n} fighters · ${n / 2} matches. Every fighter has an opponent; the bracket locks and Round of 32 starts now.`;
    window.MTX_UI.dialog.open({ title: byes.length ? "Start with a bye?" : "Start tournament?", body, primary: "Start", secondary: "Cancel", hold: 1200, holdLabel: "Hold to start",
      onPrimary: () => { if (byes.length) toast(`${P[byes[0] % 16]} advances (bye)`); go("bracket", { round: 1 }); } });
  }
  const P = ["Owen Price", "Sakda Fairtex", "SX.MTX", "Rafael Costa", "Hiro Tanabe", "Mateo Ruiz", "Petchdam K.", "Anucha K.", "Ploy Wongsakul", "Kru Somchai", "Nok Arena", "Diego Alvarez", "Yodkhun S.", "Iron Shin", "Lumpinee Kid", "Korat Brawler"];
  const ME = 2;
  // Entrants always cover the 32-fighter bracket, with some over; everyone on the board comes from this list
  P.forEach((n, a) => { if (a !== ME && !ENT.some(e => e.n === n)) ENT.push({ n, a, role: "Fighter" }); });
  ["Tawanchai S.", "Nong-O G.", "Sitthichai S.", "Kongthoranee", "Yod Sanklai", "Pakorn P.", "Chok Dee", "Max Hollis", "Leo Marin", "Jonas Berg", "Kenji Mori", "Tomas Vega", "Arjun Rao", "Samart P.", "Dieselnoi C.", "Namsaknoi Y.", "Coke Chai", "Bank Sor."].forEach((n, i) => ENT.push({ n, a: i % 16, role: "Fighter" }));
  // Browse featured = Figma component "MTX / Tournament Ticket Card" (467:34287), drawn at .929 (1013 × 800): the chrome
  // (outline + perforated body, prize slab, labels, clock) is exported art, the tournament's art / texts are live on top
  const ticket = t => { const cd = /^starts /i.test(t.when) ? "00:" + t.when.slice(7) : t.state === "live" ? "Round 2" : "02:14:59";   // Live variant (Figma 467:34378): red tag + LIVE badge, current round
    const chips = t.fmt.filter(c => /elim|belt|official/i.test(c)).slice(0, 3);
    return `<div class="tkc"><img class="tkc__base" src="${TI}tkc-base.png" alt=""><div class="tkc__art" style="background-image:url(${IMG}${t.art})"></div>
      <img class="tkc__top" src="${TI}${t.state === "live" ? "tkc-top-live" : "tkc-top"}.png?v=badge" alt="">${t.state === "live" ? "" : tag(t.tag)}<b class="tkc__name tex-text">${esc(t.name)}</b>
      <div class="tkc__chips tr-chips">${chips.map(c => `<span class="${c === "Belt" ? "y" : c === "Official" ? "w" : ""}">${c}</span>`).join("")}</div>
      <b class="tkc__time${t.state === "live" ? " is-live" : ""}">${cd}</b><b class="tkc__prize">${t.prize.replace(/^R/, "").trim()}</b></div>`; };
  const LIST = [
    { name: "Lumpinee Weekly", host: "MTX Official", when: "Sat 20:00", tag: "Official", stats: "Base stats", fill: "30 / 32", prize: "R 8,000", art: "result-arena.jpg", state: "open", fmt: ["Single elim", "32 fighters", "Base stats", "5 × 3:00", "Belt", "Official"], champ: "R 2,400" },
    { name: "MTX Bangkok Open", host: "SX.MTX", when: "Starts 04:59", tag: "Starts 04:59", stats: "Progression", fill: "20 / 32", prize: "R 6,000", art: "map-mtx-arena.webp", state: "open", fmt: ["Single elim", "32 fighters", "3 × 3:00", "Progression", "Belt"], champ: "R 1,800" },
    { name: "Night Fight 16", host: "Kru Somchai", when: "Live", tag: "Live", stats: "Progression", fill: "12 / 16", prize: "R 2,500", art: "result-arena.jpg", state: "live", fmt: ["Single elim", "16 fighters", "Progression"], champ: "R 750" },
    { name: "Gym Classic Cup", host: "Nok Arena", when: "Starts 12:00", tag: "Starts 12:00", stats: "Base stats", fill: "6 / 8", prize: "R 1,000", art: "bg-locker.webp", state: "open", fmt: ["Single elim", "8 fighters", "Base stats"], champ: "R 300" },
    { name: "Korat Brawl", host: "Korat Brawler", when: "Live", tag: "Live", stats: "Progression", fill: "4 / 8", prize: "R 600", art: "result-arena.jpg", state: "live", fmt: ["Single elim", "8 fighters", "Progression"], champ: "R 180" },
    { name: "Thasao Open", host: "Hiro Tanabe", when: "Starts 45:00", tag: "Starts 45:00", stats: "Base stats", fill: "9 / 16", prize: "R 1,500", art: "map-mtx-arena.webp", state: "open", fmt: ["Single elim", "16 fighters", "Base stats"], champ: "R 450" },
  ];
  const SET_L = [["Tournament name", ["MTX Bangkok Open", "Lumpinee Night", "Gym Classic"]], ["Map", ["MTX Arena", "Lumpinee", "Street Gym"]], ["Game mode", ["Single elimination", "Double elimination"]], ["Brackets", ["8", "16", "32"]], ["Participants", ["Public", "Code only", "Friends"]], ["Observers", ["Allowed", "Off"]], ["Rounds and time", ["3 × 3:00", "5 × 3:00", "3 × 2:00"]], ["Corner recovery", ["On", "Off"]]];
  const SET_R = [["Character stats", ["Progression", "Base stats"]], ["Legacy level", ["Any", "10+", "25+"]], ["Rank position", ["Any", "Top 1000", "Top 100"]], ["Style", ["All styles", "Phranakhon", "Korat", "Thasao"]], ["Reward Host", ["50%", "40%", "30%"]], ["Reward Champion", ["30%", "40%", "50%"]], ["Reward Runner-up", ["15%", "10%"]], ["Reward 3rd place", ["5%", "10%"]]];
  const FILTER = [["Character stats", ["Base stats", "Progression", "Any"]], ["Bracket size", ["32 fighters", "16 fighters", "8 fighters", "Any"]], ["Status", ["Open", "Live", "Any"]], ["Belt", ["Any", "Belt only"]], ["Official only", ["Off", "On"]], ["Starts", ["Today", "This week", "Any"]]];
  // start time (Open -> pick it; Lobby RS / C -> change it). min = minutes from now for the countdown
  // Start time: day, month, year, hour and minute. Earliest is 5 minutes from now, latest one year.
  const MIN = 60000, MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const p2 = n => String(n).padStart(2, "0");
  const minWhen = () => Math.ceil((Date.now() + 5 * MIN) / (5 * MIN)) * 5 * MIN;
  const clampWhen = ms => Math.max(minWhen(), Math.min(Date.now() + 365 * 1440 * MIN, ms));
  const whenText = ms => { const d = new Date(ms); return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const DT_FIELDS = [["Day", d => p2(d.getDate()), (d, n) => d.setDate(d.getDate() + n)],
    ["Month", d => MON[d.getMonth()], (d, n) => { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }],
    ["Year", d => d.getFullYear(), (d, n) => { const day = d.getDate(); d.setDate(1); d.setFullYear(d.getFullYear() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }],
    ["Hour", d => p2(d.getHours()), (d, n) => d.setHours(d.getHours() + n)],
    ["Minute", d => p2(d.getMinutes()), (d, n) => d.setMinutes(d.getMinutes() + n * 5)]];
  const dtStep = (i, n) => { const old = [...root.querySelectorAll(".tr-dt__f b")].map(b => b.textContent); const d = new Date(S.tf); DT_FIELDS[i][2](d, n); S.tf = clampWhen(+d); rumble(20, .1); render(); dtFloat(old, n); return true; };
  // every number that changed floats in, the old one floats away (Up rises, Down falls)
  const dtFloat = (old, n) => root.querySelectorAll(".tr-dt__f b").forEach((b, i) => { if (b.textContent === old[i]) return; const dir = n > 0 ? "is-rise" : "is-fall";
    const g = document.createElement("em"); g.className = "tr-dt__old " + dir; g.textContent = old[i]; g.setAttribute("aria-hidden", "true"); g.style.top = b.offsetTop + "px"; g.addEventListener("animationend", () => g.remove()); b.parentElement.append(g);
    b.classList.add(dir); });
  const clock = m => m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:00` : `${String(m).padStart(2, "0")}:00`;
  const S = { time: minWhen(), tf: 0, tff: 0, timeFrom: "settings", open: false, view: "hub", role: null, f: 0, cur: 0, conf: 1, set: { L: SET_L.map(() => 0), R: SET_R.map(() => 0), rw: [50, 30, 15, 5], form: { v: { name: "MTX Bangkok Open" }, vk: null }, col: 0, row: 3 }, tab: 0, sel: 0, filt: FILTER.map(() => 0), ff: 0,
    pick: 0, ent: 0, slots: 13, round: 0, ready: false, bought: false, wins: 0, prev: null };
  let root = null;
  const go = (view, extra = {}) => { S.prev = S.view; if (view === "lobby" && S.view !== "lobby" && !["opentime", "settings"].includes(S.view)) Object.assign(S, { z: "ent", di: 0, carry: null }); Object.assign(S, { view, f: 0 }, extra); rumble(40, .2); render(); };

  // ---------------------------------------------------------------- pieces
  const wallet = () => `<div class="tr-wallet"><img src="${IMG}badges/elbow-specialist-3.webp" alt=""><b class="y">89 ◆</b><i></i><b>19,523 ₥</b><i></i><b>${S.bought ? 1 : 3} 🎫</b></div>`;
  const head = t => `<h1 class="tr-title tex-text">${esc(t)}</h1>${wallet()}`;
  const hints = data => window.MTX_UI.hintBar(data, { cls: "tr-hints" });
  const tag = (t, cls = "") => `<span class="tr-tag ${cls}">${esc(t)}</span>`;
  const btn = (label, cls = "", f) => `<span class="tr-btn ${cls}${f ? " is-focused" : ""}">${esc(label)}</span>`;
  // bracket of 16: round results for the live views
  const R16 = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15]];
  function bracketHtml({ live = [], done = {}, qf = {} } = {}) {
    const box = (i, [a, b], x, y) => { const d = done[i]; const lv = live.includes(i);
      return `<div class="tr-m${lv ? " is-live" : ""}${a === ME || b === ME ? " is-me" : ""}" style="left:${x}px;top:${y}px">${lv ? tag("Live", "red tr-m__live") : ""}
        <div class="${d === 1 ? "l" : ""}${a === ME ? " me" : ""}">${P[a]}${d === 0 ? `<b>${d === 0 ? "KO" : ""}</b>` : ""}</div><div class="${d === 0 ? "l" : ""}${b === ME ? " me" : ""}">${P[b]}</div></div>`; };
    let h = R16.map((m, i) => box(i, m, 0, i * 98)).join("");
    const tbd = (x, y, top = "TBD") => `<div class="tr-m tr-m--s" style="left:${x}px;top:${y}px"><div>${top}</div><div>TBD</div></div>`;
    h += [0, 1, 2, 3].map(k => tbd(380, 46 + k * 196, qf[k] || "TBD")).join("") + [0, 1].map(k => tbd(620, 144 + k * 392)).join("") + tbd(860, 340);
    return `<div class="tr-br">${["QF", "SF", "F"].map((t, i) => `<span class="tr-br__h" style="left:${380 + i * 240}px">${t}</span>`).join("")}${h}</div>`;
  }
  const streamCard = (big, t, sub, time) => `<div class="tr-stream${big ? " is-big is-focused" : ""}"><div class="tr-stream__art" style="background-image:url(${IMG}result-arena.jpg)">${big ? `<img src="${IMG}char-lobby.webp" alt="">` : ""}${tag("Live", "red")}<span class="tr-stream__t">${time}</span><i></i></div><div><b>${esc(t)}</b><small>${esc(sub)}</small></div></div>`;

  // ---------------------------------------------------------------- views
  const V = {
    hub: () => { const cards = [
        `<div data-tr-card="0" class="tr-hub__l${S.f === 0 ? " is-focused" : ""}" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade"></div>${HOV("host", S.bought ? "mine" : "host")}${S.bought ? `<div class="tr-hub__my">${S.opened ? tag("Upcoming") : tag("Not open yet")}<b class="tex-text">${esc(S.set.form.v.name)}</b><small>${S.opened ? "You host · starts in 04:59 · 20 / 32" : "Create ticket ready · continue setup"}</small></div>` : `<div class="tr-hub__my"><b class="tex-text dim">Your arena</b><b class="tex-text">Host a tournament</b></div>`}</div>`,
        `<div data-tr-card="1" class="tr-hub__m${S.f === 1 ? " is-focused" : ""}">${HOV("browse")}<b class="tex-text tr-hub__big">Browse</b><div class="tr-hub__nums"><p><b>12</b><small>Open</small></p><p class="red"><b>3</b><small>Live now</small></p></div></div>`,
        `<div data-tr-card="2" class="tr-hub__m tr-hub__c${S.f === 2 ? " is-focused" : ""}" style="background-image:url(${IMG}map-mtx-arena.webp)"><div class="tr-shade tr-shade--l"></div>${HOV("create")}<b class="tex-text tr-hub__big">Create</b><small>Your own bracket</small><img src="${TI}ticket.png" alt=""></div>`];
      return `${head("Tournament")}<div class="tr-hub">${cards.join("")}</div>${hints({ b: "Back", a: "Open", ls: "Move" })}`; },
    shop: () => V.hub(),
    settings: () => { const col = (rows, vals, c) => rows.map(([k, opts], i) => c === 0 && i === 0 ? `<div class="tr-row${S.set.col === 0 && S.set.row === 0 ? " is-focused" : ""}" data-tr-name><span>${k}</span><i></i><b>${esc(S.set.form.v.name)}</b><i>›</i></div>` : `<div class="tr-row${S.set.col === c && S.set.row === i ? " is-focused" : ""}"><span>${k}</span><i>‹</i><b>${c === 1 && i >= RW_FROM ? S.set.rw[i - RW_FROM] + "%" : opts[vals[i]]}</b><i>›</i></div>`).join("");
      return `${head("Tournament setting")}<div class="tr-set__map" style="background-image:url(${IMG}map-mtx-arena.webp)"><div class="tr-shade tr-shade--l"></div><b class="tex-text">${SET_L[1][1][S.set.L[1]]}</b></div>
        <div class="tr-set__col" style="left:60px"><div class="tr-lab">Tournament</div>${col(SET_L, S.set.L, 0)}</div><div class="tr-set__col" style="left:1024px"><div class="tr-lab">Fighters and rewards</div>${col(SET_R, S.set.R, 1)}</div>
        <div class="tr-set__btns"><span class="btn-cta btn-cta--key tr-set__open"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${window.MTX_UI.glyph("a")}<span class="btn-cta__label">Open Tournament</span></span></div>${hints(S.set.col === 0 && S.set.row === 0 ? { b: "Cancel", "lt+rt": "Column", dr: "Edit", ls: "Move" } : { b: "Cancel", "lt+rt": "Column", dlr: "Change", ls: "Move" })}${VK().vkHtml(S.set.form)}`; },
    opentime: () => `${V[S.timeFrom]()}<div class="tr-dim"></div><div class="tr-msg tr-msg--time"><div class="tr-msg__top"><h2>Start time</h2><p>${S.timeFrom === "lobby" ? "Change when MTX Bangkok Open starts. Fighters already in keep their slot." : "When does MTX Bangkok Open start? The bracket is drawn and the first round begins at this time."}</p></div>
      <div class="tr-msg__bot tr-msg__bot--col"><div class="tr-dt">${DT_FIELDS.map(([k, val], i) => `<div class="tr-dt__f${S.tff === i ? " is-focused" : ""}" data-dt="${i}"><small>${k}</small><i data-dt-step="1">‹</i><b>${val(new Date(S.tf))}</b><i data-dt-step="-1">›</i></div>`).join("")}</div>
        <div class="tr-dt__sum"><b>${whenText(S.tf)}</b></div></div><nav class="tr-popkeys tr-popkeys--time">${window.MTX_UI.hintItems({ b: "Back", a: S.timeFrom === "lobby" ? "Save" : "Open", dud: "Change", dlr: "Field" })}</nav></div>`,
    lobby: () => { seats(); const z = S.z || "ent";   // one focus ring on the page: drawer (ent) | bracket board | Start
      const slot = (n, x, y) => { const f = S.seat[n]; const on = z === "board" && S.pick === n;
        return `<div class="tr-slot${f ? "" : " is-open"}${on ? " is-focused" : ""}${on && S.carry ? " is-target" : ""}" style="left:${x}px;top:${y}px"><span>${n + 1}</span>${f ? `<img src="${AV(f.a)}" alt=""><b>${esc(f.n)}</b>${isHost(f) ? YOU : ""}<i class="${n > 9 ? "y" : ""}"></i>` : `<b>${on && S.carry ? "Place " + esc(S.carry.n) : "Open slot"}</b>`}</div>`; };
      const size = S.seat.length, half = size / 2, names = SIM_ROUNDS.slice(5 - Math.log2(size)), r1 = names[0], r2 = names[1];
      const col = (x0, start) => Array.from({ length: half }, (_, k) => slot(start + k, x0, 270 + k * 43 + Math.floor(k / 2) * 6)).join("") + Array.from({ length: half / 2 }, (_, k) => `<div class="tr-win" style="left:${x0 + 400}px;top:${292 + k * 92}px">Winner ${start + k * 2 + 1}/${start + k * 2 + 2}</div>`).join("");
      const pool = poolList(), n = filled();
      const keys = z === "start" ? [["b", "Back"], ["ls", "Move"], ["a", "Hold to start"]]
        : z === "board" ? (S.carry ? [["b", "Cancel"], ["ls", "Move"], ["a", "Place"], ["lb+rb", "Entrants"]] : [["b", "Back"], ["ls", "Move"], ["x", "Remove"], ["y", "Random seed"], ["lb+rb", "Entrants"], ["rs", "Edit time"], ["view", "Settings"]])
        : S.menu ? [["b", "Close"], ["ls", "Move"], ["a", "Select"]]
        : [["b", "Back"], ["ls", "Move"], ["a", "Actions"], ["lb+rb", "Board"], ["menu", "Hold to start"]];
      return `${head("Lobby Tournament")}<div class="tr-lob__top"><div><small>Bracket</small><b class="tex-text">${n} / ${size}</b></div><div><small>Entrants</small><b class="tex-text">${ENT.length} / 100</b></div><div class="tr-lob__time"><small>Starts · ${whenText(S.time)}</small><b class="tex-text y">${clock(Math.max(0, Math.round((S.time - Date.now()) / MIN)))}</b></div></div>
        <div class="tr-lab" style="position:absolute;left:60px;top:236px">${r1}</div><div class="tr-lab" style="position:absolute;left:460px;top:236px">${r2}</div><div class="tr-lab" style="position:absolute;left:650px;top:236px">${r1}</div><div class="tr-lab" style="position:absolute;left:1050px;top:236px">${r2}</div>
        <div class="tr-board${z === "board" ? " is-on" : ""}">${col(60, 0)}${col(650, half)}</div>
        <div class="tr-ent${z === "ent" ? " is-on" : ""}"><b class="tex-text">Entrants</b><span class="tr-ent__n">${pool.length}</span>
          ${pool.slice(entTop(pool), entTop(pool) + ENT_VIS).map((e, k, _, i = k + entTop(pool)) => `<div class="tr-ent__r${e.me ? " me" : ""}${z === "ent" && i === S.di ? (S.menu ? " is-selected" : " is-focused") : ""}"><img src="${AV(e.a)}" alt="">${esc(e.n)}${e.me ? YOU : ""}<em>${e.role}</em></div>`).join("")}
          ${pool.length > ENT_VIS ? `<div class="tr-sb tr-ent__sb"><i style="top:${entTop(pool) / pool.length * 100}%;height:${ENT_VIS / pool.length * 100}%"></i></div>` : ""}
          <p>Join tickets are held when you enter and taken when the tournament starts</p></div>
        ${S.menu ? `<div class="fz-menu fz-menu--left tr-ctx" role="menu" style="top:${190 + (S.di - entTop(pool)) * 60}px">${CTX.map((c, k) => `<div class="fz-act focus-ring${k === S.menu.act ? " is-focused" : ""}" role="menuitem">${c.ico}<span>${c.label}</span></div>`).join("")}</div>` : ""}
        <div class="btn-cta btn-cta--key tr-start${z === "start" ? " is-focused" : ""}" data-tr-start><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${window.MTX_UI.glyph(z === "start" ? "a" : "menu")}<span class="btn-cta__label">Start Tournament</span></div>
        ${hints(keys)}`; },
    bracket: () => { if (S.role === "owner" && S.sim) return simLive(); const owner = S.role === "owner", spect = S.role === "spectator", wait = S.round === 0 && !owner;
      const live = wait ? [] : [1, 3], done = wait ? {} : { 0: 0 };
      const side = wait
        ? `<div class="tr-side"><div class="tr-lab">First match</div><div class="tr-stream__art tr-first" style="background-image:url(${IMG}result-arena.jpg)">${tag("Starts 04:59")}<b class="tex-text">04:59</b></div><b class="tr-side__t">Owen Price vs Sakda Fairtex</b><small>Round of 16 · match 1</small><p>You will be taken to the match when it starts</p><div class="tr-lab" style="margin-top:22px">Then</div>${[["SX.MTX vs Rafael Costa", "~05:30"], ["Hiro Tanabe vs Mateo Ruiz", "~06:00"], ["Petchdam K. vs Anucha K.", "~06:30"]].map(([t, v]) => `<div class="tr-then"><b>${t}</b><span>${v}</span></div>`).join("")}</div>`
        : `<div class="tr-side tr-side--live"><div class="tr-lab tr-lab--row"><span>Live now · 2</span><span>Most watched</span></div>${streamCard(1, "SX.MTX vs Rafael Costa", "R16 2 · 388 watching", "R2 2:05")}${streamCard(0, "Petchdam K. vs Anucha K.", "R16 4 · 156 watching", "R1 0:40")}</div>
          ${owner ? `<div class="tr-next"><div class="tr-lab">Round of 16</div><b class="tex-text">1 / 8 done</b>${btn("Next round", "sec is-off")}<small>Locked until all matches end · auto in 30:00</small></div>`
            : `<div class="tr-next tr-next--y"><div class="tr-lab">Next round</div><b class="tex-text">18:42</b><small>Quarter-final · vs Mateo R. or Anucha K.</small></div>`}`;
      const keys = owner ? [["b", "Back"], ["a", "Next round"], ["y", "Pause"]] : spect ? [["b", "Back"], ["a", "Watch"], ["ls", "Move"], ["lb+rb", "Streams"], ["y", "Final"]] : [["b", "Back"], ["a", "My match"], ["ls", "Move"], ["lb+rb", "Streams"]];
      return `${head("Live bracket")}<div class="tr-lab" style="position:absolute;left:60px;top:140px">Round of 16 · ${wait ? "starts in 04:59" : "live 2/8"}</div>${bracketHtml({ live, done, qf: wait ? {} : { 0: "Owen Price" } })}${side}${hints(keys)}`; },
    finish: () => S.sim ? simFinish() : `${head("Finished")}<div class="tr-art" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade"></div><img class="tr-fighter" src="${IMG}char-lobby.webp" alt="">${tag("Champion")}<div class="tr-art__txt"><small>MTX Bangkok Open</small><b class="tex-text">SX.MTX</b><p>4 wins · 2 KO · 1,284 damage</p><p class="dim">Final · KO round 3 vs Ploy Wongsakul</p></div></div>
      <div class="tr-panel"><div class="tr-lab">Prize · R 6,000</div><b class="tex-text tr-panel__h">Payout</b>${[["1st · SX.MTX", "R 3,000", 2, 1], ["2nd · Ploy Wongsakul", "R 1,800", 8], ["3rd – 4th · Mateo Ruiz", "R 600", 5], ["3rd – 4th · Yodkhun S.", "R 600", 12]].map(([t, v, a, big], i) => `<div class="tr-pay${big ? " is-big is-focused" : ""}${i > 1 ? " is-s" : ""}"><img src="${AV(a)}" alt=""><b>${t}</b><span>${v}</span></div>`).join("")}<p class="tr-lab">Row size follows the placing</p>${btn("Pay prize · hold", "pri wide")}<p class="tr-lab">X Stats · Y Replays (31)</p></div>${hints({ b: "Close", a: "Pay prize", x: "Stats", y: "Replays" })}`,
    browse: () => { const tabs = ["All", "Live", "Open"]; const list = LIST.filter(t => S.tab === 0 || t.state === (S.tab === 1 ? "live" : "open")); const t = list[Math.min(S.sel, list.length - 1)] || LIST[0];
      return `${head("Tournament Browse")}<div class="tr-btabs">${G("lb")}${tabs.map((x, i) => `<span class="${i === S.tab ? "on" : ""}">${x}</span>`).join("")}${G("rb")}</div>
        ${ticket(t)}
        ${(() => { // grid = Figma "grid (scroll area)" 660 × 820: 2 columns of 308 × 260 cards, rows every 292 px; it scrolls to keep the pick in view
          const row = Math.floor(Math.min(S.sel, list.length - 1) / 2), total = Math.ceil(list.length / 2) * 292 + 24 - 32, max = Math.max(0, total - 820);
          S.bscroll = Math.max(0, Math.min(max, Math.min(S.bscroll || 0, row * 292), Math.max(S.bscroll || 0, row * 292 + 260 + 24 - 820)));
          const th = max ? Math.max(120, 800 * 820 / total) : 800, tt = max ? (800 - th) * S.bscroll / max : 0;
          return `<div class="tr-grid"><div class="tr-grid__in" style="transform:translateY(-${S.bscroll}px)">${list.map((x, i) => `<div class="tr-card${i === S.sel ? " is-focused" : ""}"><div class="tr-card__art" style="background-image:url(${IMG}${x.art})"><div class="tr-shade"></div>${tag(x.tag, x.state === "live" ? "red" : "")}${tag(x.stats, x.stats === "Progression" ? "purple tr-card__s" : "w tr-card__s")}<span class="tr-card__n">${x.fill}</span></div><b>${esc(x.name)}</b><small>${esc(x.host)} · ${x.prize}</small></div>`).join("")}</div></div>
            <div class="tr-sb"><i style="top:${tt}px;height:${th}px"></i></div>`; })()}
        ${hints({ b: "Back", a: "Open", x: "Filter", y: "Watch", "lb+rb": "Tabs", ls: "Move" })}`; },
    filter: () => `${V.browse()}<div class="tr-dim"></div><div class="tr-msg tr-msg--filter"><div class="tr-msg__top"><h2>Filter tournaments</h2></div><div class="tr-msg__bot tr-msg__bot--col">${FILTER.map(([k, o], i) => `<div class="tr-row${S.ff === i ? " is-focused" : ""}"><span>${k}</span><i>‹</i><b>${o[S.filt[i]]}</b><i>›</i></div>`).join("")}<p class="tr-msg__note">Official tournaments always stay at the top</p><div class="tr-msg__btns">${btn("Reset", "sec")}${btn("Apply", "pri", 1)}</div></div></div><nav class="tr-popkeys tr-popkeys--filter">${window.MTX_UI.hintItems({ b: "Close", a: "Apply", x: "Reset", ls: "Move" })}</nav>`,
    overview: () => `${head("Tournament")}<div class="tr-ov__head" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade tr-shade--l"></div>${tag("Upcoming")}<b class="tex-text">MTX Bangkok Open</b><div class="tr-chips">${["Single elim", "32 fighters", "3 × 3:00"].map(c => `<span>${c}</span>`).join("")}<span class="purple">Progression</span><span class="y">Belt</span></div><div class="tr-host"><img src="${AV(2)}" alt=""><b>SX.MTX</b><small>Host</small></div></div>
      <div class="tr-sched"><div class="tr-lab">Schedule</div>${[["Sat 20:00", "Round of 32", "First round", "16 matches", 1], ["20:45", "Round of 16", "Estimated", "8 matches"], ["21:20", "Quarter-final", "Estimated", "4 matches"], ["21:50", "Semi-final", "Estimated", "2 matches"], ["22:15", "Final", "Belt", "R 1,800"]].map(([t, r, g, m, y]) => `<div class="tr-sched__r"><b class="tex-text${y ? " y" : ""}">${t}</b><span>${r}</span>${tag(g, g === "Estimated" ? "ghost" : "")}<em>${m}</em></div>`).join("")}</div>
      <div class="tr-ovp"><div class="tr-ovp__stats"><div><small>Starts in</small><b class="tex-text y">04:59</b></div><div><small>Fighters</small><b class="tex-text">20 / 32</b></div><div><small>Prize</small><b class="tex-text">R 6,000</b></div></div>
        <div class="tr-lab">Prize split</div>${[["Host", "R 3,000", "50%"], ["Champion", "R 1,800", "30%", 1], ["Runner-up", "R 900", "15%"], ["3rd place", "R 300", "5%"]].map(([k, v, p, y]) => `<div class="tr-split"><span>${k}</span><b>${v}</b>${tag(p, y ? "" : "ghost")}</div>`).join("")}
        <div class="tr-role">${btn("Fighter", "pri", S.f === 0)}${btn("Spectator", "sec", S.f === 1)}</div></div>${hints({ b: "Back", a: "Confirm", "dl+dr": "Fighter / Spectator", ls: "Move" })}`,
    waiting: () => `<div class="tr-bgtex"></div><h1 class="tr-title tex-text" style="font-size:72px;top:64px">MTX Bangkok Open</h1><img class="tr-wait__f" src="${IMG}char-lobby.webp" alt="">
      <div class="tr-wait__card"><div class="tr-wait__map" style="background-image:url(${IMG}map-mtx-arena.webp)"><b class="tex-text">MTX Arena</b></div><div><small>Starts in</small><b class="tex-text">04:59</b><p>🔒 20 / 32 fighters</p><p class="y">♛ SX.MTX</p></div></div>
      <div class="tr-wait__me"><small class="red">You</small><b class="tex-text">SX.MTX</b><small>Regional III</small><p class="tr-ready${S.ready ? " on" : ""}">${S.ready ? "✓ Ready" : `${G("x")} Ready up`}</p></div>
      <div class="tr-wait__opp"><small class="blue">Opponent</small><b class="tex-text dim">TBD</b><small>The bracket is drawn when the tournament starts</small></div>${hints({ b: "Leave", x: "Ready", y: "Style" })}`,
    won: () => `${head("Quarter-final")}<div class="tr-art tr-art--s" style="background-image:url(${IMG}result-arena.jpg)"><img class="tr-fighter" src="${IMG}char-lobby.webp" alt="">${tag("Win · KO R2")}</div>
      <div class="tr-won"><div class="tr-lab">Result</div><b class="tex-text tr-won__w">Win</b><b class="tex-text tr-won__s">KO · Round 2 · vs Owen Price</b>
        <div class="tr-won__next is-focused"><div class="tr-lab">Next · semi-final · starts after the round (max 30:00)</div><div class="tr-vs"><img src="${AV(2)}" alt=""><b class="tex-text y">SX.MTX</b><span>vs</span><b class="tex-text">Mateo Ruiz</b><img src="${AV(5)}" alt=""></div></div>
        <div class="tr-won__stats">${[["Damage", "412"], ["Strikes", "31 / 44"], ["Knockdowns", "2"]].map(([k, v]) => `<div><small>${k}</small><b class="tex-text">${v}</b></div>`).join("")}${btn("Back to bracket", "pri")}</div></div>${hints({ a: "Bracket" })}`,
    out: () => `${head("Knocked out")}<div class="tr-art" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade"></div>${tag("Loss · decision 29-28", "red")}<div class="tr-art__txt"><small>You finished</small><b class="tex-text tr-out__big">5th – 8th</b><p class="dim">of 32 fighters · out in the quarter-final vs Owen Price</p></div></div>
      <div class="tr-panel tr-panel--s"><div class="tr-lab">Earned</div><b class="tex-text y tr-out__r">+150 R</b><p class="dim">Ticket refund: none · tournament points +40</p></div>
      <div class="tr-panel tr-panel--run"><div class="tr-lab">Your run</div><div class="tr-then"><b>R16 · Won vs Rafael Costa</b><span class="y">2-1</span></div><div class="tr-then"><b>QF · Lost vs Owen Price</b><span class="red">Dec.</span></div></div>
      <div class="tr-out__btns">${btn("Back to bracket", "pri wide", 1)}${btn("Leave", "sec wide")}</div>${hints({ b: "Leave", a: "Bracket" })}`,
    champion: () => `${head("Champion")}<div class="tr-art tr-art--full" style="background-image:url(${IMG}result-arena.jpg)"><div class="tr-shade tr-shade--l"></div><img class="tr-fighter tr-fighter--c" src="${IMG}char-lobby.webp" alt=""><div class="tr-art__txt tr-art__txt--c"><small class="y">Champion · MTX Bangkok Open</small><b class="tex-text">SX.MTX</b><p>Final · KO round 3 vs Ploy Wongsakul</p><p class="dim">4 wins · 2 KO · 1,284 damage</p></div>
      <div class="tr-podium"><div class="tr-lab">Podium</div>${[["2nd · Ploy W.", "R 1,800", 8, 1], ["3rd – 4th · Mateo R.", "R 600", 5], ["3rd – 4th · Yodkhun S.", "R 600", 12]].map(([t, v, a, big]) => `<div class="tr-pay${big ? " is-big" : " is-s"}"><img src="${AV(a)}" alt=""><b>${t}</b><span>${v}</span></div>`).join("")}<p class="tr-lab">Champion's belt goes to SX.MTX</p></div></div>${hints({ b: "Leave", y: "Replays" })}`,
  };

  // ---------------------------------------------------------------- ticket shop = global Spotlight window (same structure / keys as the Campaign window)
  const TICKET_MEDIA = (img, panel) => `<img class="tk-gold" src="${TI}${panel}" alt=""><img class="tk-pat" src="${TI}ticket-pattern.png" alt=""><b class="tk-mark">Create</b><i class="tk-sweep"></i><img class="tk-splash" src="${TI}ticket-splash.png" alt=""><img class="tk-ticket" src="${TI}${img}" alt=""><i class="tk-shine" style="-webkit-mask-image:url('${TI}${img}');mask-image:url('${TI}${img}')"></i>`;   // Figma 406:35492 Default -> 406:35493 Hover (spotlight.css)
  const TICKET = (price, img, panel) => ({ id: "ticket", art: TI + "ticket-art.png", media: TICKET_MEDIA(img, panel), title: "Create", sub: "Tournament ticket", body: "Host one tournament", price, cta: "Buy", hint: "Currency" });
  function openShop() {
    window.MTX_UI.spotlight.open({ id: "ticket", ctaInHints: true, slides: [TICKET({ icon: "mtx/assets/svg/icon-m.svg", value: "250,000" }, "ticket-blue.png", "ticket-silver.png"), TICKET({ icon: TI + "icon-credit.png", value: "2,400", tone: "y" }, "ticket.png", "ticket-gold.png")], page: S.cur,
      onClose: () => { if (S.view === "shop") go("hub", { f: 2 }); },
      onAction: (sl, i) => { S.cur = i;
        window.MTX_UI.modal.confirm({ title: "Buy create ticket?", body: `Use ${i ? "2,400 MTX Credit" : "₥ 250,000"} to buy 1 Create tournament ticket.`, yes: "Buy", no: "Cancel",
          onSelect: id => { if (id !== "yes") return; window.MTX_UI.spotlight.close(true); S.bought = true; toast("Create ticket bought"); go("settings", { role: "owner" }); } }); } });
  }
  // ---------------------------------------------------------------- input
  const wrap = (n, d, len) => (n + d + len) % len;
  // DEV only (no key hint): LB + RB together (Q + E) pushes the match flow to its next step after Start tournament
  // (waiting -> bracket -> round results -> champion / finish -> hub) so the whole scenario can be walked without real matches
  const LIVE = ["waiting", "bracket", "won", "out", "champion", "finish"];
  let bump = { k: null, t: 0 };
  function devNext() {
    const v = S.view; toast("DEV · next step");
    if (v === "waiting") return go("bracket", { round: 0 });
    if (v === "bracket" && S.role === "owner" && S.sim) { if (simLeft().length) { simLeft().forEach(simWin); simStop(); return render(); } return simNext(); }
    if (v === "bracket" && S.role === "spectator" && S.round > 0) return go("champion");
    if (v === "champion" || v === "finish") { simEnd(); return go("hub", { f: 0 }); }
    return input("a");
  }
  // hub focus moves by class only (no re-render), so the card hover transitions play in and out
  function hubFocus(n) { S.f = n; root.querySelectorAll("[data-tr-card]").forEach(c => c.classList.toggle("is-focused", +c.dataset.trCard === n)); }
  function input(a) {
    if (!S.open) return false;
    const v = S.view;
    if ((a === "lt" || a === "rt") && LIVE.includes(v)) {
      const now = performance.now(), combo = bump.k && bump.k !== a && now - bump.t < 350;
      bump = combo ? { k: null, t: 0 } : { k: a, t: now };
      if (combo) return devNext();
    }
    if (v === "hub") {
      if (a === "back") return close();
      if (a === "left" || a === "right" || a === "up" || a === "down") { const map = { 0: { right: 1, up: 1, down: 2 }, 1: { left: 0, down: 2 }, 2: { left: 0, up: 1 } }; const n = map[S.f]?.[a]; if (n !== undefined) { hubFocus(n); rumble(20, .1); } return true; }
      if (a === "a") { if (S.f === 1) return go("browse", { tab: 0, sel: 0, role: null }); if (S.f === 0 && S.sim) return go("bracket", { role: "owner" }); if (S.f === 0 && S.bought) return S.opened ? go("lobby", { role: "owner" }) : go("settings", { role: "owner" });   // ticket bought, not opened yet: carry on setting it up
        if (S.f === 0) return window.MTX_UI.dialog.open({ title: "Your arena", body: "Join a tournament someone else is hosting, or create your own bracket.",
          secondary: "Join", primary: "Create", closeHint: "Close", onSecondary: () => go("browse", { tab: 0, sel: 0, role: null }), onPrimary: () => { go("shop", { cur: 0 }); openShop(); } });
        go("shop", { cur: 0 }); openShop(); return true; }
      return true;
    }
    if (v === "shop") return window.MTX_UI.spotlight.input(a);
    if (v === "settings") { const st = S.set;
      if (st.form.vk) return VK().vkInput(st.form, a);
      if (a !== "a") openHold?.cancel(false);
      if (a === "back") return go("hub", { f: 0 });
      if (a === "up" || a === "down") { st.row = Math.max(0, Math.min(7, st.row + (a === "down" ? 1 : -1))); rumble(20, .1); return render(); }
      if (a === "left" || a === "right") { if (st.col === 0 && st.row === 0) { if (a === "right") VK().vkOpen(st.form, NAME_FIELD); return render(); } if (st.col === 1 && st.row >= RW_FROM) { if (rewardStep(st.rw, st.row - RW_FROM, a === "right" ? 1 : -1)) rumble(20, .1); return render(); } const rows = st.col ? SET_R : SET_L, vals = st.col ? st.R : st.L; vals[st.row] = wrap(vals[st.row], a === "right" ? 1 : -1, rows[st.row][1].length); rumble(20, .1); return render(); }
      if (a === "lt" || a === "rt") { st.col = a === "lt" ? 0 : 1; return render(); }
      if (a === "a") return openHoldStart();
      return true; }
    if (v === "opentime") {
      if (a === "back") return go(S.timeFrom);
      if (a === "up" || a === "down") return dtStep(S.tff, a === "up" ? 1 : -1);
      if (a === "left" || a === "right") { S.tff = wrap(S.tff, a === "right" ? 1 : -1, DT_FIELDS.length); rumble(20, .1); return render(); }
      if (a === "a") { S.time = clampWhen(S.tf); S.opened = true; toast(`${S.timeFrom === "lobby" ? "Start time changed" : "Tournament opened"} · ${whenText(S.time)}`); return go("lobby", S.timeFrom === "lobby" ? {} : { pick: 13 }); }
      return true; }
    if (v === "lobby") { seats(); const z = S.z || "ent", pool = poolList();
      if (a === "rs") return go("opentime", { timeFrom: "lobby", tf: clampWhen(S.time || 0), tff: 0 });
      if (a === "view") return go("settings");
      if (a === "menu") return holdStart("menu");   // hold Start (Menu) from anywhere on the page
      if (a === "lt" || a === "rt") { S.z = z === "board" ? "ent" : "board"; rumble(20, .1); return render(); }   // Q / E: drawer <-> board
      if (z === "start") { if (a === "up") { S.z = "ent"; return render(); } if (a === "a") return holdStart("a"); if (a === "back") return go("hub", { f: 0 }); return true; }
      if (S.menu) {   // player context menu (the Friends page action list)
        if (a === "back") { S.menu = null; return render(); }
        if (a === "up" || a === "down") { S.menu.act = wrap(S.menu.act, a === "down" ? 1 : -1, CTX.length); rumble(20, .1); return render(); }
        if (a === "a") { const e = S.menu.e, id = CTX[S.menu.act].id; S.menu = null;
          if (id === "pick") { S.carry = e; S.z = "board"; S.pick = Math.max(0, S.seat.findIndex(x => !x)); } else toast(e.n + " · profile not in this prototype"); return render(); }
        return true; }
      if (z === "ent") {
        if (a === "back") return go("hub", { f: 0 });
        if (a === "up") { S.di = Math.max(0, S.di - 1); rumble(20, .1); return render(); }
        if (a === "down") { if (S.di >= pool.length - 1) S.z = "start"; else S.di++; rumble(20, .1); return render(); }
        if (a === "a" && pool[S.di]) { S.menu = { e: pool[S.di], act: 0 }; rumble(30, .15); return render(); }
        return true; }
      // board
      if (a === "back") { if (S.carry) { S.carry = null; S.z = "ent"; return render(); } S.z = "ent"; return render(); }
      if (a === "up" || a === "down") { S.pick = wrap(S.pick, a === "down" ? 1 : -1, S.seat.length); rumble(20, .1); return render(); }
      if (a === "left" || a === "right") { S.pick = (S.pick + S.seat.length / 2) % S.seat.length; return render(); }
      if (a === "a") { if (!S.carry) { toast(S.seat[S.pick] ? "X removes this fighter" : "Pick a player in Entrants first"); return true; }
        const prev = S.seat[S.pick]; S.seat[S.pick] = S.carry; toast(`${S.carry.n} → slot ${S.pick + 1}`); S.carry = null; S.z = "ent"; S.di = 0; if (prev) toast(`${prev.n} back to Entrants`); return render(); }
      if (a === "x") { if (S.seat[S.pick]) { toast(`Removed from slot ${S.pick + 1}`); S.seat[S.pick] = null; } return render(); }
      if (a === "y") { const list = S.seat.filter(Boolean); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } S.seat = S.seat.map((_, i) => list[i] || null); toast("Seeds shuffled, seated from slot 1"); return render(); }
      return true; }
    if (v === "bracket") {
      if (a === "back") return S.role === "owner" ? go("hub", { f: 0 }) : go("hub", { f: S.role === "spectator" ? 1 : 0 });
      if (S.role === "owner" && S.sim) { const hist = simLeft().length ? [] : simHistory();
        if (a === "menu") return simNextHold("menu");
        if ((a === "up" || a === "down") && hist.length) { S.sim.hf = Math.max(0, Math.min(hist.length - 1, (S.sim.hf || 0) + (a === "down" ? 1 : -1))); rumble(20, .1); return render(); }
        if (a === "a" && hist.length) { const { m } = hist[Math.min(S.sim.hf || 0, hist.length - 1)]; toast(`Replay · ${m.a.n} vs ${m.b.n}`); return true; } }
      if (S.role === "owner" && a === "y") { toast("Bracket paused"); return true; }
      if (S.role === "spectator") { if (a === "y") return go("champion"); if (a === "a") { if (S.round === 0) { S.round = 1; return render(); } toast("Watching SX.MTX vs Rafael Costa"); return true; } return true; }
      if (S.role === "fighter" && a === "a") { if (S.round === 0) { S.round = 1; return render(); } S.wins++; return go(S.wins === 1 ? "won" : "out"); }
      if (a === "lt" || a === "rt") { toast("Next stream"); return true; }
      return true; }
    if (v === "finish") { if (a === "back") { simEnd(); return go("hub", { f: 0 }); } if (a === "a") { toast("Prize paid · R 6,000"); return true; } return true; }
    if (v === "browse") {
      const list = LIST.filter(t => S.tab === 0 || t.state === (S.tab === 1 ? "live" : "open"));
      if (a === "back") return go("hub", { f: 1 });
      if (a === "lt" || a === "rt") { S.tab = wrap(S.tab, a === "rt" ? 1 : -1, 3); S.sel = 0; return render(); }
      if (a === "left" || a === "right") { S.sel = Math.max(0, Math.min(list.length - 1, S.sel + (a === "right" ? 1 : -1))); rumble(20, .1); return render(); }
      if (a === "up" || a === "down") { S.sel = Math.max(0, Math.min(list.length - 1, S.sel + (a === "down" ? 2 : -2))); rumble(20, .1); return render(); }
      if (a === "x") return go("filter", { ff: 0 });
      if (a === "a") return go("overview", { f: 0 });
      if (a === "y") return go("bracket", { role: "spectator", round: 0 });
      return true; }
    if (v === "filter") { if (a === "back") return go("browse"); if (a === "up" || a === "down") { S.ff = wrap(S.ff, a === "down" ? 1 : -1, FILTER.length); return render(); } if (a === "left" || a === "right") { S.filt[S.ff] = wrap(S.filt[S.ff], a === "right" ? 1 : -1, FILTER[S.ff][1].length); return render(); } if (a === "x") { S.filt = FILTER.map(() => 0); return render(); } if (a === "a") { toast("Filter applied"); return go("browse"); } return true; }
    if (v === "overview") { if (a === "back") return go("browse"); if (a === "left" || a === "right") { S.f = 1 - S.f; rumble(20, .1); return render(); } if (a === "a") return S.f === 0 ? go("waiting", { role: "fighter", ready: false, wins: 0 }) : go("bracket", { role: "spectator", round: 0 }); return true; }
    if (v === "waiting") { if (a === "back") return go("overview"); if (a === "x") { S.ready = !S.ready; rumble(50, .25); render(); if (S.ready) setTimeout(() => { if (S.open && S.view === "waiting" && S.ready) go("bracket", { round: 0 }); }, 1600); return true; } if (a === "y") { toast("Style · not in this prototype"); return true; } return true; }
    if (v === "won") { if (a === "a") return go("bracket", { round: 1 }); return true; }
    if (v === "out") { if (a === "a") return go("bracket", { role: "spectator", round: 1 }); if (a === "back") return go("hub", { f: 1 }); return true; }
    if (v === "champion") { if (a === "back") return go("hub", { f: 1 }); if (a === "y") { toast("Replays · not in this prototype"); return true; } return true; }
    return true;
  }

  // ---------------------------------------------------------------- render / open
  function render() {
    if (!root || !S.open) return;
    // a new menu plays its transition in (tournament.css .is-enter); moving the focus inside a menu does not.
    // Popups drawn over a page (Filter over Browse, Start time over Settings / Lobby, ticket shop over the Hub) are views too:
    // opening or closing one keeps the page underneath still; only the popup itself animates in (.is-pop)
    const page = v => ({ filter: "browse", shop: "hub", opentime: S.timeFrom || "settings" })[v] || v;
    const enter = page(S.shown) !== page(S.view), pop = !enter && S.shown !== S.view && page(S.view) !== S.view; S.shown = S.view;
    root.className = `tr tr--${S.view}${enter ? " is-enter" : ""}${pop ? " is-pop" : ""}`;
    root.innerHTML = `<div class="tr__bg" aria-hidden="true"></div><div class="tr__safe">${V[S.view]()}</div>`;
  }
  function mount() {
    if (root) return;
    root = document.createElement("div"); root.id = "tournament"; root.className = "tr"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Tournament");
    document.getElementById("stage").appendChild(root);
    // mouse: hover selects a hub card, a click on the selected card opens it
    // (only a real mouse move selects: a re-render under a resting cursor must not steal the WASD focus)
    let mx = -1, my = -1;
    root.addEventListener("mousemove", e => { if (window.MTX_UI?.dialog?.isOpen?.() || window.MTX_UI?.modal?.isOpen?.()) return; if (e.clientX === mx && e.clientY === my) return; mx = e.clientX; my = e.clientY;
      const c = e.target.closest("[data-tr-card]"); if (c && S.view === "hub" && S.f !== +c.dataset.trCard) { hubFocus(+c.dataset.trCard); rumble(20, .1); } });
    addEventListener("keydown", e => VK().vkKey(e), true);
    root.addEventListener("click", e => { const f = S.view === "opentime" && e.target.closest("[data-dt]"); if (!f) return; S.tff = +f.dataset.dt; const st = e.target.closest("[data-dt-step]"); if (st) dtStep(S.tff, +st.dataset.dtStep); else render(); });
    root.addEventListener("click", e => { if (S.view !== "settings") return; const f = S.set.form;
      if (f.vk) { const k = e.target.closest("[data-vk-r]"); if (k) { f.vk.row = +k.dataset.vkR; f.vk.col = +k.dataset.vkC; VK().vkPress(f, VK().vkRows(f.vk)[f.vk.row][f.vk.col]); render(); } return; }
      if (e.target.closest("[data-tr-name]")) { S.set.col = 0; S.set.row = 0; VK().vkOpen(f, NAME_FIELD); render(); } });
    root.addEventListener("click", e => { const c = e.target.closest("[data-tr-card]"); if (!c || S.view !== "hub") return; if (S.f !== +c.dataset.trCard) hubFocus(+c.dataset.trCard); input("a"); });
  }
  function open() {
    window.MTX_OPTIONS?.close?.(); window.MTX_FRIENDS?.close?.(); window.MTX_SETTINGS?.close?.();
    mount(); S.open = true; S.shown = null; S.view = "hub"; S.f = S.bought ? 0 : 1; root.hidden = false; document.getElementById("stage")?.classList.add("ovl-open");
    render(); rumble(60, .25);
  }
  function close() {
    if (!root) return; S.open = false; root.hidden = true; if (window.MTX_UI.spotlight.isOpen()) window.MTX_UI.spotlight.close(true);
    if (!window.MTX_OPTIONS?.isOpen?.() && !window.MTX_FRIENDS?.isOpen?.() && !window.MTX_SETTINGS?.isOpen?.() && !window.MTX_CLOBBY?.isOpen?.()) document.getElementById("stage")?.classList.remove("ovl-open");
  }
  (window.MTX_SCREENS = window.MTX_SCREENS || {}).tournament = { actions: { openTournament: () => open() } };
  window.MTX_TOUR = { open, close, isOpen: () => S.open, input, release, render, go: (v, x) => { if (!S.open) open(); go(v, x); } };   // go: jump to a view (dev / capture)
})();
