(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  /* Match History (Figma 216:633). Opened from the Profile page of Character Customization (Menu / F, or the
     "Match history" button under the stats); Back returns to that Profile page.
     Rows: Result | Opponent (+ style) | Mode (Ranked, Career Tournament, Quick Fight ...) | Condition | Score (judges' total) | Damage dealt | RP.
     The left panel shows the focused match. Tabs (Q / E, LT / RT): All / Rank / Casual; Casual fights give no RP.
     Rank fights started from Career (Next Fight) are added on top of the demo history; only the 20 most recent
     matches are kept (saved in mtx.mtx_match_history). */

  //#region [Variables/Fields]
  let api = null;
  let tab = "all";
  let fromProfile = false;   // opened from Character Customization > Profile: Back reopens it

  const TABS = ["all", "rank", "casual"];
  const STYLES = ["Muay Phra Nakhon", "Muay Chaiya", "Muay Korat", "Muay Tha Sao", "Muay Lopburi"];
  const ROUNDS = 5;
  const MAX = 20;                         // only the 20 most recent matches are kept
  const STORE_KEY = "mtx_match_history_v2";   // v2: rows carry modeName

  // game modes shown in the Mode column; "rank" ones change RP (Ranked tab), the rest are casual (Casual tab, no RP)
  const MODES = { ranked: ["Ranked", "rank"], career: ["Career Tournament", "rank"], quick: ["Quick Fight", "casual"],
    exhibition: ["Exhibition Match", "casual"], casual: ["Casual", "casual"] };
  const modeName = m => m.modeName || (m.mode === "rank" ? "Ranked" : "Casual");

  // demo history, newest first: [result, opponent, style, method, round, time, landed, thrown, kd you, kd opp, damage, rp change, opp RP, mode, date]
  const DEMO = [
    ["WIN", "Anucha Kiatsakda", 2, "Decision", 5, "3:00", 41, 58, 0, 0, 612, 14, 640, "ranked", "2026-10-18"],
    ["LOSS", "Hiro Tanabe", 1, "TKO", 3, "2:10", 19, 37, 0, 2, 288, -12, 655, "ranked", "2026-10-17"],
    ["WIN", "Mateo Ruiz", 4, "KO", 1, "2:31", 14, 18, 1, 0, 344, 21, 598, "career", "2026-10-16"],
    ["WIN", "Saenchai Jaidee", 0, "Decision", 5, "3:00", 30, 46, 0, 0, 470, 0, 0, "quick", "2026-10-15"],
    ["WIN", "Ploy Wongsakul", 0, "KO", 2, "1:45", 27, 33, 1, 0, 503, 18, 612, "ranked", "2026-10-14"],
    ["DRAW", "Jonas Becker", 2, "Decision", 5, "3:00", 33, 47, 0, 0, 455, 0, 605, "ranked", "2026-10-13"],
    ["LOSS", "Ethan Clarke", 1, "Decision", 5, "3:00", 29, 49, 0, 1, 402, -10, 630, "career", "2026-10-12"],
    ["LOSS", "Bao Nguyen", 3, "KO", 4, "0:40", 21, 39, 0, 1, 318, 0, 0, "exhibition", "2026-10-11"],
    ["WIN", "Nam Tran", 4, "TKO", 4, "0:58", 36, 44, 2, 0, 538, 16, 588, "ranked", "2026-10-10"],
    ["WIN", "Rizal Hakim", 3, "KO", 3, "1:12", 22, 27, 1, 0, 417, 19, 575, "ranked", "2026-10-09"],
    ["LOSS", "Liam O'Connor", 0, "KO", 2, "2:44", 11, 24, 0, 1, 196, -14, 668, "career", "2026-10-08"],
    ["WIN", "Kaito Morinaga", 1, "Decision", 5, "3:00", 39, 55, 0, 0, 590, 0, 0, "casual", "2026-10-07"]
  ].map(([result, opp, style, method, round, time, landed, thrown, kdYou, kdOpp, damage, rp, oppRp, kind, date]) =>
    ({ result, opp, style: STYLES[style], method, round, time, landed, thrown, kdYou, kdOpp, damage, rp, oppRp,
       mode: MODES[kind][1], modeName: MODES[kind][0], date }));

  let matches = DEMO.slice(0, MAX);
  const OPPONENTS = ["Petchdam Kiatyod", "Yodkhun Sitchai", "Diego Alvarez", "Rafael Costa", "Arman Petrosyan", "Owen Price", "Sakda Fairtex", "Tawan Singmanee"];
  //#endregion

  //#region [Helpers]
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const signed = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);   // 0 shows as plain 0
  const visible = () => matches.filter(m => tab === "all" || m.mode === tab);
  const methodText = m => m.method === "Decision" ? "Decision" : `${m.method} · R${m.round}`;
  const rpText = m => m.mode === "casual" ? "" : signed(m.rp);          // casual: no RP, nothing shown
  const rankOf = rp => api.getScreen?.("leaderboard")?.rankOf?.(rp);
  // casual rows keep no RP change; their opponent still has a standing (the demo rows store 0 -> a stable value)
  const oppRp = m => m.oppRp || 560 + [...m.opp].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % 120;
  // judges' total from the Match Detail scorecard (completed rounds), "—" when it ended in round 1
  const scoreText = m => window.MTX_SCREENS.matchdetail?.scoreText?.(m) || "—";

  function rowHtml(m, i) {
    const res = m.result.toLowerCase();
    return `<a class="lb-row mh-row is-${res} focus-ring" data-nav data-id="mh${i}" data-fn="mhSelect" data-idx="${i}"
        aria-label="${m.result}, against ${esc(m.opp)}, ${esc(m.style)}, ${esc(modeName(m))}, ${methodText(m)}, score ${scoreText(m)}, damage ${m.damage}, ${m.mode === "casual" ? "casual fight" : rpText(m) + " RP"}">
        <span class="mh-row__result">${m.result}</span>
        <span class="mh-row__who"><b>${esc(m.opp)}</b><small>${esc(m.style)}</small></span>
        <span class="mh-row__mode">${esc(modeName(m))}</span>
        <span class="mh-row__method">${methodText(m)}</span>
        <span class="mh-row__score">${scoreText(m)}</span>
        <span class="mh-row__damage">${m.damage}</span>
        <span class="lb-row__elo mh-row__rp${m.mode === "casual" || !m.rp ? " is-zero" : ""}">${rpText(m)}</span>
      </a>`;
  }
  //#endregion

  //#region [Render]
  function render() {
    const list = visible();
    const rows = api.bind("mhRows");
    if (rows) {
      rows.innerHTML = list.length ? list.map((m, i) => rowHtml(m, i)).join("")
        : `<p class="mh-empty">No ${tab === "all" ? "" : tab + " "}matches yet</p>`;
      rows.scrollTop = 0;
    }
    api.$$("#s-history [data-mh-tab]").forEach(t => {
      const on = t.dataset.mhTab === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
    syncScrollbar();
    showDetail(list[0]);
  }

  // left panel: the focused match
  function showDetail(m) {
    const panel = api.$("#s-history .mh-detail");
    if (!panel) return;
    panel.hidden = !m;
    if (!m) return;
    const r = rankOf(oppRp(m));         // casual opponents show their rank too
    api.bind("mhBadge").src = `mtx/assets/img/badges/${r ? r.img : "ring-warrior-3"}.webp`;
    fitName(api.bind("mhName"), m.opp);
    api.bind("mhStyle").textContent = `Opponent · ${m.style}`;
    api.bind("mhTier").textContent = r ? r.label : "";
    const verb = m.result === "WIN" ? "Won" : m.result === "LOSS" ? "Lost" : "Drew";
    api.bind("mhHow").textContent = `${verb} by ${m.method === "Decision" ? "decision" : m.method} · Round ${m.round} of ${ROUNDS} · ${m.time}`;
    const res = api.bind("mhResult");
    res.textContent = m.result;
    res.dataset.result = m.result.toLowerCase();
    api.bind("mhRp").textContent = m.mode === "casual" ? "No RP" : `${signed(m.rp)} RP`;
    api.bind("mhWhen").textContent = `${fmtDate(m.date)} · ${modeName(m)}`;
    api.bind("mhStrikes").textContent = `${m.landed}/${m.thrown}`;
    api.bind("mhScore").textContent = scoreText(m);
    api.bind("mhDamage").textContent = m.damage;
  }

  // opponent name: at most 2 lines (34 px down to 20 px), like the Leaderboard tier
  function fitName(el, text) {
    el.textContent = text;
    let size = 34;
    el.style.fontSize = size + "px";
    while (el.offsetHeight > Math.round(2 * size * 0.92) + 2 && size > 20) el.style.fontSize = --size + "px";
  }

  function reveal(row) {
    const list = api.bind("mhRows");
    if (!list || !row || !list.contains(row)) return;
    const top = row.offsetTop - list.offsetTop, bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    syncScrollbar();
  }

  function syncScrollbar() {
    window.MTX_UI.syncScrollbar(api.bind("mhRows"), api.bind("mhScroll"), { thumb: api.bind("mhThumb") });
  }

  function setTab(id, sound) {
    tab = id;
    render();
    const first = api.$('#s-history [data-id="mh0"]');
    if (first) { api.setFocus(first); reveal(first); }
    if (sound) {
      api.rumble?.(40, .15);
      api.log?.(`Match history: ${id}`, "state");
    }
  }

  function step(d) {
    setTab(TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length], true);
  }
  //#endregion

  //#region [Public]
  // Career > Next Fight (Rank) result: { win, strikes, head, fans } -> a new row on top
  function addFight(r) {
    const opp = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
    const ko = r.win && Math.random() < .45;
    const round = ko ? 1 + Math.floor(Math.random() * 4) : ROUNDS;
    const thrown = r.strikes + 4 + Math.floor(Math.random() * 14);
    const playerRp = window.MTX_PLAYER?.get().rp || 600;
    matches.unshift({
      result: r.win ? "WIN" : "LOSS", opp, style: STYLES[Math.floor(Math.random() * STYLES.length)],
      method: ko ? (Math.random() < .5 ? "KO" : "TKO") : "Decision", round,
      time: ko ? `${Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}` : "3:00",
      landed: r.strikes, thrown, kdYou: ko ? 1 : 0, kdOpp: 0, damage: r.strikes * 17 + r.head * 9,
      rp: r.win ? 12 + Math.floor(Math.random() * 10) : -(8 + Math.floor(Math.random() * 8)),
      oppRp: playerRp + Math.round(Math.random() * 80 - 40), mode: "rank", modeName: "Ranked", date: new Date().toISOString().slice(0, 10)
    });
    matches.length = Math.min(matches.length, MAX);   // the oldest drops off past 20
    save();
    if (api?.getCur?.() === "history") render();
  }

  // Character Customization > Profile: open on the All tab, remember to go back there
  function openFromProfile() {
    fromProfile = true;
    tab = "all";
    api.show("history");
  }

  // saved list (mtx.mtx_match_history), at most MAX matches
  function save() {
    api?.store?.set(STORE_KEY, JSON.stringify(matches));
  }

  function load() {
    try {
      const saved = JSON.parse(api.store.get(STORE_KEY, "null"));
      if (Array.isArray(saved) && saved.length) matches = saved.slice(0, MAX);
    } catch (e) { /* keep the demo history */ }
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) { api = coreApi; }

  function init(coreApi) {
    api = coreApi;
    load();
    api.$$("#s-history [data-mh-tab]").forEach(t => t.addEventListener("click", () => setTab(t.dataset.mhTab, true)));
    // mouse wheel / trackpad scrolls the list; the scrollbar follows
    api.bind("mhRows")?.addEventListener("scroll", syncScrollbar, { passive: true });
  }

  function enter() { render(); }

  function focus(el) {
    if (!el?.classList?.contains("mh-row")) return;
    reveal(el);
    showDetail(visible()[+el.dataset.idx]);
  }

  // Back: return to the Profile page it was opened from
  function onBack() {
    if (!fromProfile) return false;
    fromProfile = false;
    api.back();
    setTimeout(() => window.MTX_SCREENS.customize?.show?.(), 0);
    return true;
  }
  //#endregion

  window.MTX_SCREENS.history = {
    bindApi, init, enter, focus, onBack, addFight, openFromProfile,
    actions: {
      mhPrevTab() { step(-1); },
      mhNextTab() { step(1); },
      mhSelect(el) {
        const m = visible()[+el?.dataset?.idx];
        if (m) window.MTX_SCREENS.matchdetail?.open?.(m);   // Match Detail: Statistics / Loadout
      }
    }
  };
})();
