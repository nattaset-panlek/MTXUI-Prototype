(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  /* Match Detail (Figma 217:6954 Statistics · 217:7375 Loadout · 221:20525 / 221:20873 per round).
     Opened with A on a Match History row; Back returns to the list.
     Pages (Q / E, LB / RB): Statistics | Loadout. Statistics has a round row (Z / C, LT / RT): All, 01-05; rounds
     after the finish are greyed out and skipped. Bars: an "a/b" value fills by the fighter's own ratio, a plain or
     split value by its share of both fighters' total. The Ploy Wongsakul KO uses the Figma numbers; other matches
     are generated from the history row (same match -> same numbers). */

  //#region [Variables/Fields]
  let api = null;
  let match = null;          // the history row being shown
  let detail = null;         // generated per-round stats + loadouts
  let page = "stats";        // "stats" | "loadout"
  let round = 0;             // 0 = All, 1..5

  const ROUNDS = 5;
  const ROUND_SEC = 180;
  const BAR = 380;           // a full bar (100 %) on each side of the centre line
  const IMG = "mtx/assets/img/match/";
  const SVG = "mtx/assets/svg/";
  const STYLE_ID = { "Muay Phra Nakhon": "phranakhon", "Muay Chaiya": "south", "Muay Korat": "isan", "Muay Tha Sao": "north", "Muay Lopburi": "west" };
  const STYLE_NOTE = { phranakhon: "Balanced  ·  counter striking", south: "Fast elbows  ·  close range", isan: "Buffalo punch  ·  heavy power",
    north: "Quick feet  ·  speed kicks", west: "Clever feints  ·  combinations" };
  // decisive-move art cut from the Figma "Style Icon" frames; other styles fall back to the generic decisive icons
  const DECISIVE_ART = { isan: [1, 2, 3, 4].map(i => `${IMG}dec-korat-${i}.png`), phranakhon: [1, 2, 3].map(i => `${IMG}dec-phranakhon-${i}.png`) };
  const decisiveArt = (sid, i) => (DECISIVE_ART[sid] || [1, 2, 3].map(n => `${SVG}moves/move-decisive-${n}.svg`))[i % (DECISIVE_ART[sid]?.length || 3)];

  // [label, key, section]
  const ROWS = [
    ["Strikes landed", "strikes", "Striking"], ["Significant strikes", "sig", "Striking"], ["Body / head / leg", "zones", "Striking"],
    ["Clinch strikes", "clinch", "Striking"], ["Successful blocks", "blocks", "Defense"], ["Counter attacks", "counters", "Defense"],
    ["Decisive moves landed", "decisive", "Specials"], ["Knockdowns", "kd", "Specials"], ["Damage dealt", "damage", "Damage"]
  ];

  const PLAYER_LOADOUT = {
    style: "Muay Korat",
    decisive: ["Mon Yan Lak", "Salab Fan Pla"], signature: ["Te Tad"], special: [],
    perks: ["Finesse Counter", "Triple Rhythm Press"]
  };
  const OPP_MOVES = {
    decisive: ["Erawan Soei Nga", "Hak Nguang", "Chawa Sad Hok", "Hanuman Thawai Waen", "Khun Yak Chap Ling"],
    signature: ["Teep Trong", "Sok Klap", "Khao Loi", "Te Kod"], special: ["Jumping Knee", "Spinning Elbow", "Superman Punch"],
    perks: ["Fluid Evasion", "Tiger Trap", "Steadfast Focus", "Iron Shin", "Second Wind"]
  };
  //#endregion

  //#region [Helpers]
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const glyph = btn => window.MTX_UI.glyph(btn);
  const signed = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const secs = t => { const [m, s] = String(t).split(":").map(Number); return m * 60 + (s || 0); };

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
  }
  const hash = str => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  // split a total over n rounds (weighted, whole numbers, adds back up)
  function split(total, n, r) {
    const w = Array.from({ length: n }, () => .6 + r()), ws = sum(w);
    const out = w.map(x => Math.floor(total * x / ws));
    out[n - 1] += total - sum(out);
    return out;
  }
  const pick = (r, n, max) => Math.min(max, Math.floor(r() * (n + 1)));

  // bar fills (0-1): "a/b" -> own ratio, otherwise share of both fighters' total
  function fills(a, b) {
    const pa = String(a).split("/").map(Number), pb = String(b).split("/").map(Number);
    if (pa.length === 2) return [pa[1] ? pa[0] / pa[1] : 0, pb[1] ? pb[0] / pb[1] : 0];
    const ta = sum(pa), tb = sum(pb);
    return ta + tb ? [ta / (ta + tb), tb / (ta + tb)] : [0, 0];
  }
  //#endregion

  //#region [Data]
  // one fighter, one round
  const blank = () => ({ landed: 0, thrown: 0, sig: 0, body: 0, head: 0, leg: 0, clinch: 0, blocks: 0, counters: 0, decL: 0, decU: 0, kdS: 0, kdC: 0, damage: 0 });

  function figmaPloy() {
    const R = (landed, thrown, sig, [body, head, leg], clinch, blocks, counters, [decL, decU], [kdS, kdC], damage) =>
      ({ landed, thrown, sig, body, head, leg, clinch, blocks, counters, decL, decU, kdS, kdC, damage });
    return {
      you: [R(11, 30, 2, [1, 9, 1], 0, 3, 1, [0, 0], [0, 1], 168), R(16, 34, 4, [0, 15, 1], 0, 1, 1, [1, 1], [1, 1], 335)],
      opp: [R(6, 25, 1, [2, 3, 1], 1, 4, 0, [0, 1], [0, 1], 121), R(3, 16, 1, [1, 1, 1], 0, 3, 0, [0, 0], [0, 0], 67)],
      oppLoadout: { style: "Muay Phra Nakhon",
        decisive: [["Erawan Soei Nga", 0, 1, 0], ["Hak Nguang", 0, 0, 0], ["Chawa Sad Hok", 0, 0, 0]],
        signature: [["Teep Trong", 2, 4, 34], ["Sok Klap", 1, 3, 21]], special: [["Jumping Knee", 0, 2, 0]],
        perks: [["Fluid Evasion", 3, 0], ["Tiger Trap", 1, 12], ["Steadfast Focus", 2, 6]] },
      youLoadout: { decisive: [["Mon Yan Lak", 2, 3, 96], ["Salab Fan Pla", 1, 2, 42]], signature: [["Te Tad", 3, 5, 58]], special: [],
        perks: [["Finesse Counter", 4, 24], ["Triple Rhythm Press", 2, 18]] }
    };
  }

  function generate(m) {
    if (m.opp === "Ploy Wongsakul" && m.method === "KO" && m.round === 2) return figmaPloy();
    const r = rng(hash(m.opp + m.date + m.result));
    const n = m.round;
    const lead = m.result === "WIN" ? .55 + r() * .25 : m.result === "LOSS" ? 1.25 + r() * .35 : .9 + r() * .2;
    const oppLanded = Math.max(1, Math.round(m.landed * lead)), oppThrown = oppLanded + 8 + Math.round(r() * 20);
    const side = (landed, thrown, damage, kd, wonByStoppage) => {
      const L = split(landed, n, r), T = split(Math.max(0, thrown - landed), n, r), D = split(damage, n, r);
      const rounds = L.map((l, i) => {
        const o = blank();
        o.landed = l; o.thrown = l + T[i]; o.damage = D[i];
        o.sig = Math.round(l * (.15 + r() * .15));
        o.head = Math.round(l * (.5 + r() * .3)); o.leg = Math.round((l - o.head) * r()); o.body = l - o.head - o.leg;
        o.clinch = pick(r, 2, l); o.blocks = 1 + pick(r, 3, 9); o.counters = pick(r, 2, 9);
        o.decU = r() < .35 ? 1 : 0; o.decL = o.decU && r() < .5 ? 1 : 0;
        return o;
      });
      // knockdowns land in the last rounds; a stoppage ends with a decisive move that landed
      for (let k = 0; k < kd; k++) { const o = rounds[Math.max(0, n - 1 - k)]; o.kdS++; o.kdC++; }
      rounds.forEach(o => { if (r() < .3) o.kdC++; });
      if (wonByStoppage) { const o = rounds[n - 1]; o.decU = Math.max(o.decU, 1); o.decL = Math.max(o.decL, 1); }
      return rounds;
    };
    const stoppage = m.method !== "Decision";
    const you = side(m.landed, m.thrown, m.damage, m.kdYou, stoppage && m.result === "WIN");
    const opp = side(oppLanded, oppThrown, Math.round(m.damage * lead), m.kdOpp, stoppage && m.result === "LOSS");
    const sid = STYLE_ID[m.style] || "phranakhon";
    const decCount = 1 + Math.floor(r() * 3);
    const tot = rounds => rounds.reduce((a, o) => ({ decL: a.decL + o.decL, decU: a.decU + o.decU }), { decL: 0, decU: 0 });
    const spread = (names, totals, dmgPer) => names.map((nm, i) => {
      const used = i === 0 ? totals.decU : 0, landed = i === 0 ? totals.decL : 0;
      return [nm, landed, used, landed * dmgPer];
    });
    const moves = (pool, k, off) => pool.slice(off % pool.length).concat(pool).slice(0, k);
    const off = Math.floor(r() * 5);
    const youT = tot(you), oppT = tot(opp);
    return {
      you, opp,
      youLoadout: {
        decisive: spread(PLAYER_LOADOUT.decisive, youT, 70 + Math.round(r() * 40)),
        signature: PLAYER_LOADOUT.signature.map(nm => { const u = 2 + pick(r, 5, 9), l = pick(r, u, u); return [nm, l, u, l * 18]; }),
        special: [],
        perks: PLAYER_LOADOUT.perks.map(nm => [nm, 1 + pick(r, 4, 9), Math.round(r() * 30)])
      },
      oppLoadout: {
        style: m.style,
        decisive: spread(moves(OPP_MOVES.decisive, decCount, off), oppT, 60 + Math.round(r() * 40)),
        signature: moves(OPP_MOVES.signature, 1 + pick(r, 2, 2), off).map(nm => { const u = 1 + pick(r, 4, 9), l = pick(r, u, u); return [nm, l, u, l * 16]; }),
        special: r() < .6 ? [[OPP_MOVES.special[off % 3], 0, 1 + pick(r, 2, 3), 0]] : [],
        perks: moves(OPP_MOVES.perks, 2 + pick(r, 1, 1), off).map(nm => [nm, pick(r, 4, 9), Math.round(r() * 20)])
      },
      sid
    };
  }

  // judges' scorecard, 10-point must: [you, opp] per round 1-5. The round's winner on damage gets 10, the other 9
  // (8 after a knockdown in that round), level rounds 10-10. A stoppage round shows the method for the winner;
  // rounds after the finish are null. Decisions are nudged so the totals agree with the result.
  function scorecard(m, d) {
    const rows = Array.from({ length: ROUNDS }, (_, i) => {
      if (i + 1 > m.round) return null;
      if (i + 1 === m.round && m.method !== "Decision") return m.result === "WIN" ? [m.method, "—"] : ["—", m.method];
      const a = d.you[i] || blank(), b = d.opp[i] || blank();
      if (a.damage === b.damage) return [10, 10];
      return a.damage > b.damage ? [10, b.kdS ? 9 : a.kdS ? 8 : 9] : [a.kdS ? 9 : b.kdS ? 8 : 9, 10];
    });
    const nums = rows.filter(r => r && typeof r[0] === "number");
    const tot = () => [sum(nums.map(r => r[0])), sum(nums.map(r => r[1]))];
    if (m.method === "Decision") {
      const want = m.result === "WIN" ? 1 : m.result === "LOSS" ? -1 : 0;
      for (let i = nums.length - 1; i >= 0 && Math.sign(tot()[0] - tot()[1]) !== want; i--) {
        nums[i][0] = want >= 0 ? 10 : 9; nums[i][1] = want <= 0 ? 10 : 9;
      }
    }
    const [ty, to] = tot();
    return { rows, total: [ty, to] };
  }

  // the values shown on the Statistics page for the chosen round (0 = all)
  function statsFor(rounds, i) {
    const list = i ? [rounds[i - 1] || blank()] : rounds;
    const t = list.reduce((a, o) => { Object.keys(a).forEach(k => { a[k] += o[k]; }); return a; }, blank());
    return {
      strikes: `${t.landed}/${t.thrown}`, sig: String(t.sig), zones: `${t.body}/${t.head}/${t.leg}`, clinch: String(t.clinch),
      blocks: String(t.blocks), counters: String(t.counters), decisive: `${t.decL}/${t.decU}`, kd: `${t.kdS}/${t.kdC}`, damage: String(t.damage)
    };
  }
  //#endregion

  //#region [Render]
  function header() {
    const m = match;
    const res = m.result.toLowerCase();
    const total = (m.round - 1) * ROUND_SEC + secs(m.time);
    const method = m.method === "Decision" ? "Decision" : `${m.method} · Round ${m.round}`;
    api.bind("mdResult").textContent = m.result;
    api.bind("mdResult").dataset.result = res;
    api.bind("mdMethod").textContent = `${method} · Total time ${mmss(total)}`;
    // method / meta start after the result word (WIN / LOSS / DRAW differ in width), never before x 330
    const x = Math.max(330, 98 + api.bind("mdResult").offsetWidth + 24) + "px";
    api.bind("mdMethod").style.left = api.bind("mdMeta").style.left = x;
    api.bind("mdMeta").textContent = `${m.modeName || (m.mode === "rank" ? "Ranked" : "Casual")}  ·  Regional Tournament III  ·  ${new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}  ·  Match ID MTX-${m.date.slice(2).replace(/-/g, "")}-${String(Math.abs(hash(m.opp)) % 10000).padStart(4, "0")}`;
    const rp = api.bind("mdRp");
    rp.textContent = m.mode === "casual" ? "No RP" : `${signed(m.rp)} RP`;
    rp.dataset.result = m.mode === "casual" ? "draw" : m.rp > 0 ? "win" : m.rp < 0 ? "loss" : "draw";
    // cash reward, with the HUD wallet's M after the amount
    api.bind("mdRewards").innerHTML = `+${m.result === "WIN" ? "3,500" : "1,200"}<img src="mtx/assets/svg/icon-m.svg" width="18" height="10" alt="M">`;
    api.bind("mdOppName").textContent = m.opp;
    api.bind("mdOppSub").textContent = `Opponent  ·  ${m.style}  ·  Regional Tournament III`;
  }

  function roundTabs() {
    const host = api.bind("mdRounds");
    const tabs = ["All", "01", "02", "03", "04", "05"].map((t, i) => {
      const off = i > match.round;
      return `<span class="md-round${i === round ? " is-active" : ""}${off ? " is-off" : ""}" data-md-round="${i}" role="tab"
        aria-selected="${i === round}" aria-disabled="${off}">${t}</span>`;
    }).join("");
    host.innerHTML = glyph("zl") + tabs + glyph("zr");
  }

  function statsHtml() {
    const a = statsFor(detail.you, round), b = statsFor(detail.opp, round);
    let html = '<div class="md-stats">', sec = "";
    ROWS.forEach(([label, key, section]) => {
      if (section !== sec) {
        if (sec) html += "</div>";
        sec = section;
        html += `<h3 class="md-sec">${section}</h3><div class="md-panel">`;
      }
      const [fa, fb] = fills(a[key], b[key]);
      html += `<div class="md-row" role="row" aria-label="${label}: you ${a[key]}, opponent ${b[key]}">
          <span class="md-row__label">${label}</span>
          <b class="md-row__you${fa >= fb ? " is-lead" : ""}">${a[key]}</b><b class="md-row__opp${fb >= fa ? " is-lead" : ""}">${b[key]}</b>
          <i class="md-row__track"></i>
          <i class="md-row__bar md-row__bar--you" style="width:${(fa * BAR).toFixed(0)}px"></i>
          <i class="md-row__bar md-row__bar--opp" style="width:${(fb * BAR).toFixed(0)}px"></i>
        </div>`;
    });
    return html + "</div></div>" + scoreHtml();
  }

  // right column: the scorecard, the round picked with Z / C highlighted (All -> Total)
  function scoreHtml() {
    const sc = detail.score;
    const cell = (v, other, corner) => {
      const win = typeof v === "string" ? v !== "—" : v > other;
      return `<b class="md-score__v${win ? " is-win md-score__v--" + corner : ""}">${v}</b>`;
    };
    const rows = sc.rows.map((r, i) => `<div class="md-score__row${round === i + 1 ? " is-active" : ""}${r ? "" : " is-off"}"
        aria-label="Round ${i + 1}: ${r ? `you ${r[0]}, opponent ${r[1]}` : "not fought"}">
        <span>${String(i + 1).padStart(2, "0")}</span>${r ? cell(r[0], r[1], "red") + cell(r[1], r[0], "blue") : "<b>—</b><b>—</b>"}</div>`).join("");
    const [a, b] = sc.total;
    const finish = match.method === "Decision" ? { WIN: "Won on points", LOSS: "Lost on points", DRAW: "Draw on points" }[match.result]
      : `${match.result === "LOSS" ? "Lost" : "Won"} by ${match.method} · Round ${match.round}`;
    return `<aside class="md-score" aria-label="Score">
        <h3 class="md-sec">Score</h3>
        <div class="md-score__panel">
          <div class="md-score__head"><span>Round</span><span>You</span><span>Opp</span></div>
          ${rows}
          <div class="md-score__row md-score__row--total${round === 0 ? " is-active" : ""}" aria-label="Total: you ${a}, opponent ${b}">
            <span>Total</span>${cell(a, b, "red")}${cell(b, a, "blue")}</div>
          <p class="md-score__finish">${finish}</p>
        </div>
      </aside>`;
  }

  function card(kind, sid, i, s, corner) {
    if (!s) return `<div class="md-card is-empty" aria-label="Empty slot"><span>Empty</span></div>`;
    const icon = kind === "decisive" ? `<img class="md-card__icon" src="${decisiveArt(sid, i)}" alt="">`
      : `<img class="md-card__icon" src="mtx/assets/svg/moves/move-hex-${((i + ({ signature: 0, special: 1, perks: 2 })[kind]) % 4) + 1}.svg" alt="">`;   // the Customize move icons (hex symbols)
    const stats = kind === "perks"
      ? `<span class="md-stat md-stat--active"><b>${s[1]}</b><small>Activated</small></span><span class="md-stat"><b>+${s[2]}</b><small>Dmg</small></span>`
      : `<span class="md-stat md-stat--${corner}"><b>${s[1]}</b><small>Landed</small></span><span class="md-stat"><b>${s[2]}</b><small>Used</small></span><span class="md-stat"><b>${s[3]}</b><small>Dmg</small></span>`;
    const label = kind === "perks" ? `${s[0]}, activated ${s[1]} times, ${s[2]} bonus damage` : `${s[0]}, landed ${s[1]} of ${s[2]}, ${s[3]} damage`;
    return `<div class="md-card" aria-label="${esc(label)}">${icon}<p class="md-card__name">${esc(s[0])}</p><i class="md-card__rule"></i><div class="md-card__stats">${stats}</div></div>`;
  }

  function loadoutHtml() {
    const side = (lo, style, corner) => {
      const sid = STYLE_ID[style] || "phranakhon";
      const groups = ["decisive", "signature", "special", "perks"];   // no group labels: the rows sit close together
      return `<div class="md-side md-side--${corner}">
          <div class="md-style"><img src="${SVG}style-${sid}-sel.svg" alt=""><small>Tactical style</small><b>${esc(style)}</b><span>${STYLE_NOTE[sid] || ""}</span></div>
          ${groups.map(k => `<div class="md-cards" aria-label="${k}">${[0, 1, 2, 3].map(i => card(k, sid, i, lo[k][i], corner)).join("")}</div>`).join("")}
        </div>`;
    };
    return side(detail.youLoadout, PLAYER_LOADOUT.style, "red") + side(detail.oppLoadout, detail.oppLoadout.style, "blue");
  }

  function render() {
    if (!match) return;
    const root = api.$("#s-matchdetail");
    root.dataset.page = page;
    header();
    roundTabs();
    api.bind("mdBody").innerHTML = page === "stats" ? statsHtml() : loadoutHtml();
    api.bind("mdYouSub").textContent = `You  ·  ${PLAYER_LOADOUT.style}  ·  Regional Tournament III`;
    api.$$("#s-matchdetail [data-md-page]").forEach(t => {
      const on = t.dataset.mdPage === page;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
  }

  function setPage(p, sound) {
    if (p === page) return;
    page = p;
    render();   // the tab just switches: focus does not move onto it
    if (sound) { api.rumble?.(40, .15); api.log?.(`Match detail: ${p}`, "state"); }
  }

  // Z / C: next round that was fought (All, 01 .. last round), wraps around
  function stepRound(d) {
    const n = match.round + 1;
    round = (round + d + n) % n;
    render();
    api.rumble?.(40, .15);
    api.log?.(`Match detail: ${round ? "round " + round : "all rounds"}`, "state");
  }
  //#endregion

  //#region [Public]
  function open(m) {
    match = m;
    detail = generate(m);
    detail.score = scorecard(m, detail);
    page = "stats";
    round = 0;
    api.show("matchdetail");
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) { api = coreApi; }

  function init(coreApi) {
    api = coreApi;
    api.$("#s-matchdetail")?.addEventListener("click", e => {
      const r = e.target.closest("[data-md-round]");
      if (r && !r.classList.contains("is-off")) { round = +r.dataset.mdRound; render(); }
      const t = e.target.closest("[data-md-page]");
      if (t) setPage(t.dataset.mdPage, true);
    });
  }

  function enter() { render(); }

  function onTrigger(d) {
    if (page !== "stats" || !match) return false;
    stepRound(d);
    return true;
  }
  //#endregion

  window.MTX_SCREENS.matchdetail = {
    bindApi, init, enter, onTrigger, open,
    // Match History "Score" column: judges' total of the completed rounds
    scoreText(m) {
      const sc = scorecard(m, generate(m));
      return sc.rows.some(r => r && typeof r[0] === "number") ? `${sc.total[0]}–${sc.total[1]}` : "—";
    },
    actions: {
      mdPrevPage() { setPage(page === "stats" ? "loadout" : "stats", true); },
      mdNextPage() { setPage(page === "stats" ? "loadout" : "stats", true); },
      mdShowStats() { setPage("stats", true); },
      mdShowLoadout() { setPage("loadout", true); }
    }
  };
})();
