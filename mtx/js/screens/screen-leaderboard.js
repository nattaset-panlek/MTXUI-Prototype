(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;

  // GDD: the leaderboard is Ultimate Fight (Ranked) only; RP (Rank Points) decide the rank and the season rank.
  // Ranks from the MMR sheet (source/UltimateFightStatus_Sheets/04_MMR Formular.csv), low -> high.
  // Every tier has five divisions V -> I (50 RP each, 0-999 RP). Champion Rank (1000+ RP) has no divisions:
  // its progress bar becomes the RP number.
  const TIERS = [
    { id: "street-fight", label: "Street Fight", badge: "rookie-fighter" },
    { id: "street-tournament", label: "Street Tournament", badge: "gym-apprentice" },
    { id: "regional-tournament", label: "Regional Tournament", badge: "ring-warrior" },
    { id: "national-tournament", label: "National Tournament", badge: "the-challenger" }
  ];
  const CHAMPION = { label: "Champion Rank", badge: "muay-thai-god", min: 1000 };
  const DIV_RP = 50, TIER_RP = 250;
  const ROMAN = ["V", "IV", "III", "II", "I"];   // division index 0 (lowest) .. 4 (highest)

  // one server per zone (no global board, no country column)
  const SERVER = "Thailand";
  const TOTAL = 15880;                           // ranked fighters on this server this season
  const YOU = "SX.MTX";

  // ---- fighters (deterministic demo data) ----
  // [rp, record, KO, season rank on this server]
  const FIGHTERS = {};
  const FIRST = ["Thanawat", "Petchdam", "Yodkhun", "Anucha", "Chaiyo", "Ploy", "Nattapon", "Somchai", "Kittisak", "Pongsak", "Saenchai", "Buakaw",
    "Kaito", "Hiro", "Bao", "Nam", "Diego", "Mateo", "Rafael", "Liam", "Jonas", "Ethan", "Rizal", "Arman", "Mika", "Owen", "Sakda", "Weera",
    "Dech", "Kong", "Tawan", "Rung", "Jakkrit", "Supachai", "Phet", "Lamnam", "Sarawut", "Krit", "Ton", "Bank"];
  const LAST = ["Sor.Petch", "Kiatyod", "Sitchai", "Kiatsakda", "Sitmonchai", "Wongsakul", "Jaidee", "Por.Pramuk", "Sor.Thanikul", "Lukbanyai",
    "Morinaga", "Tanabe", "Nguyen", "Tran", "Alvarez", "Ruiz", "Costa", "O'Connor", "Becker", "Clarke", "Hakim", "Petrosyan", "Laine", "Price",
    "Banchamek", "Sitsongpeenong", "Kaewsamrit", "Fairtex", "Singmanee", "Chor.Hapayak"];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const usedNames = new Set([YOU]);
  function makeName() {
    for (;;) {
      const n = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
      if (!usedNames.has(n)) { usedNames.add(n); return n; }
    }
  }
  function makeRecord(rp) {
    const fights = 10 + Math.round(rp / 40 + rnd() * 12);
    const winRate = Math.min(.93, .45 + rp / 6000 + rnd() * .12);
    const w = Math.round(fights * winRate), d = Math.round(rnd() * 2), l = Math.max(0, fights - w - d);
    return [`${w}-${l}-${d}`, Math.round(w * (.35 + rnd() * .35))];
  }
  function addFighter(name, rp, season, rec) {
    const [record, ko] = rec || makeRecord(rp);
    FIGHTERS[name] = [rp, record, ko, season];
    return name;
  }

  // Top 100 of the server: the first ones are Champion Rank (1000+ RP), then National Tournament I...
  const TOP = [];
  for (let i = 0; i < 100; i++) {
    const rp = Math.round(2961 - i * 20 - rnd() * 6);   // #1 ~2961 RP ... #100 ~980 RP (National Tournament I)
    TOP.push(addFighter(makeName(), rp, i + 1));
  }

  // the player: Regional Tournament III, season rank #1,284
  addFighter(YOU, 612, 1284, ["24-6-1", 17]);

  // Personal: everyone in the player's rank (same tier + division) on this server, ordered by RP
  const PERSONAL = [YOU];
  for (let i = 0; i < 23; i++) PERSONAL.push(addFighter(makeName(), 600 + Math.floor(rnd() * 50), 0));
  PERSONAL.sort((a, b) => FIGHTERS[b][0] - FIGHTERS[a][0]);
  PERSONAL.forEach((n, i) => { if (n !== YOU) FIGHTERS[n][3] = 1180 + i * 9; });

  // Friends: mixed ranks, ordered by RP (two of them already Champion Rank)
  const FRIENDS = [YOU, TOP[1], TOP[12], addFighter(makeName(), 905, 3120), addFighter(makeName(), 488, 6904), addFighter(makeName(), 371, 9402), addFighter(makeName(), 140, 13377)]
    .sort((a, b) => FIGHTERS[b][0] - FIGHTERS[a][0]);

  const BOARDS = {
    personal: { label: "Personal", rows: PERSONAL, local: true },
    top: { label: "Top Rank", rows: TOP },
    friends: { label: "Friends", rows: FRIENDS, local: true }
  };
  const ORDER = ["personal", "top", "friends"];
  const MEDAL = ["is-gold", "is-silver", "is-bronze"];
  let board = "personal";
  let seasonEnd = 0, clockTimer = 0;
  //#endregion

  //#region [Helpers]
  const fmt = n => n.toLocaleString("en-US");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // rank from RP: tier + division V..I below 1000, Champion Rank from 1000
  function rankOf(rp) {
    if (rp >= CHAMPION.min) return { label: CHAMPION.label, img: CHAMPION.badge, champion: true, p: 1, next: "" };
    const t = Math.min(TIERS.length - 1, Math.floor(rp / TIER_RP)), tier = TIERS[t];
    const d = Math.min(4, Math.floor((rp - t * TIER_RP) / DIV_RP));
    const start = t * TIER_RP + d * DIV_RP, end = start + DIV_RP;
    const nextLabel = d < 4 ? `${tier.label} ${ROMAN[d + 1]}` : t < TIERS.length - 1 ? `${TIERS[t + 1].label} ${ROMAN[0]}` : CHAMPION.label;
    return {
      label: `${tier.label} ${ROMAN[d]}`,
      img: `${tier.badge}-${Math.min(4, d + 1)}`,
      p: (rp - start) / (end - start),
      next: `${fmt(end - rp)} RP to ${nextLabel}`
    };
  }

  const badge = r => `mtx/assets/img/badges/${r.img}.webp`;

  function rowHtml(name, pos) {
    const [rp, record, ko] = FIGHTERS[name];
    const r = rankOf(rp);
    const you = name === YOU;
    const medal = board === "top" && pos <= 3 ? ` ${MEDAL[pos - 1]}` : "";
    return `<a class="lb-row focus-ring${medal}${you ? " is-you" : ""}" data-nav data-id="${you ? "lbYou" : "lb" + pos}" data-fn="openFighter"
        data-name="${esc(name)}" aria-label="Rank ${fmt(pos)}, ${esc(name)}, ${r.label}, record ${record}, ${ko} KO, ${fmt(rp)} RP">
        <span class="lb-row__rank">${fmt(pos)}</span>
        <img class="lb-row__avatar" src="mtx/assets/img/avatar.webp" alt="">
        <span class="lb-row__name">${esc(name)}${you ? "&nbsp;&nbsp;(You)" : ""}</span>
        <img class="lb-row__badge" src="${badge(r)}" alt="">
        <span class="lb-row__tier">${r.label}</span>
        <span class="lb-row__record">${record}</span>
        <span class="lb-row__ko">${ko}</span>
        <span class="lb-row__elo">${fmt(rp)}</span>
      </a>`;
  }
  //#endregion

  //#region [Render]
  function render() {
    if (window.MTX_PLAYER) FIGHTERS[YOU][0] = window.MTX_PLAYER.get().rp;   // the player's RP lives in the player store
    const b = BOARDS[board];
    const rows = api.bind("lbRows");
    // Personal / Friends: position inside that list; Top Rank: server season rank 1-100 (the player is not pinned)
    if (rows) {
      rows.innerHTML = b.rows.map((n, i) => rowHtml(n, i + 1)).join("");
      rows.scrollTop = 0;
    }
    syncScrollbar();
    const pinned = api.bind("lbPinned");
    if (pinned) { pinned.hidden = true; pinned.innerHTML = ""; }
    api.$$("#s-leaderboard [data-lb-tab]").forEach(t => {
      const on = t.dataset.lbTab === board;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
    });
    showStanding(YOU);
  }

  // keep the focused row inside the scrolling list
  function reveal(row) {
    const list = api.bind("lbRows");
    if (!list || !row || !list.contains(row)) return;
    const top = row.offsetTop - list.offsetTop, bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    syncScrollbar();
  }

  // scrollbar beside the list (the Quests one): thumb size = visible share, position = scroll position;
  // hidden when everything fits
  function syncScrollbar() {
    window.MTX_UI.syncScrollbar(api.bind("lbRows"), api.bind("lbScroll"), { thumb: api.bind("lbThumb") });
  }

  // left panel: the focused fighter (your own standing unless another row is focused)
  function showStanding(name) {
    const f = FIGHTERS[name];
    if (!f) return;
    const [rp, record, ko, season] = f;
    const r = rankOf(rp);
    const [w, l, d] = record.split("-").map(Number);
    const you = name === YOU;
    api.bind("lbHead").textContent = you ? "Your standing" : name;
    api.bind("lbBadge").src = badge(r);
    fitTier(api.bind("lbTier"), r.label);
    api.bind("lbElo").textContent = `${fmt(rp)} RP`;
    api.bind("lbBar").style.setProperty("--p", (Math.max(0, Math.min(1, r.p)) * 100).toFixed(1) + "%");
    // Champion Rank: the bar turns into the RP number
    api.$("#s-leaderboard .lb-you").classList.toggle("is-champion", !!r.champion);
    // Champion Rank shows only "{points} RP" where the bar was (no "next" line)
    api.bind("lbRp").textContent = `${fmt(rp)} RP`;
    api.bind("lbNext").textContent = r.champion ? "" : r.next;
    api.bind("lbRank").textContent = "#" + fmt(season);
    const pct = season / TOTAL * 100;
    api.bind("lbTop").textContent = `Top ${pct < 1 ? Math.max(.1, pct).toFixed(1) : Math.round(pct)}%`;
    api.bind("lbLocal").textContent = `In ${SERVER}`;
    api.bind("lbRecord").textContent = record;
    api.bind("lbKo").textContent = ko;
    api.bind("lbWin").textContent = Math.round(w / (w + l + d) * 100) + "%";
    api.$("#s-leaderboard .lb-you").classList.toggle("is-other", !you);
  }

  // rank name: auto-size so it never takes more than 2 lines (34 px down to 20 px)
  function fitTier(el, text) {
    el.textContent = text;
    let size = 34;
    el.style.fontSize = size + "px";
    const max = () => Math.round(2 * size * 0.92) + 2;
    while (el.offsetHeight > max() && size > 20) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
  }

  function setBoard(id, sound) {
    board = id;
    render();
    const target = api.$('#s-leaderboard [data-id="lbYou"]') || api.$("#s-leaderboard .lb-row");
    if (target) { api.setFocus(target); reveal(target); }
    if (sound) {
      api.rumble?.(40, .15);
      api.log?.(`Leaderboard: ${BOARDS[id].label}`, "state");
    }
  }

  function step(d) {
    setBoard(ORDER[(ORDER.indexOf(board) + d + ORDER.length) % ORDER.length], true);
  }

  // season countdown, the three largest units that matter (no months: days keep counting, e.g. 90D):
  //   >= 1 day  90D 05H 30M  |  >= 1 hour  05:30:12  |  >= 1 min  30:12  |  < 1 min  00:00:07
  const SEASON_KEY = "lb_season_end";
  function clockText(s) {
    const pad = n => String(n).padStart(2, "0");
    const dd = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (s >= 86400) return `${pad(dd)}D ${pad(h)}H ${pad(m)}M`;
    if (s >= 3600) return `${pad(Math.floor(s / 3600))}:${pad(m)}:${pad(sec)}`;
    if (s >= 60) return `${pad(m)}:${pad(sec)}`;
    return `00:00:${pad(sec)}`;
  }

  function tick() {
    const s = Math.max(0, Math.round((seasonEnd - Date.now()) / 1000));
    const el = api.bind("lbClock");
    if (el) el.textContent = clockText(s);
  }

  // dev panel: season ends in (days / hours / minutes / seconds from now); saved in mtx.lb_season_end
  function setSeasonLeft(d, h, m, s) {
    const secs = (+d || 0) * 86400 + (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0);
    seasonEnd = Date.now() + Math.max(0, secs) * 1000;
    api.store.set(SEASON_KEY, String(seasonEnd));
    tick();
    return clockText(Math.round(secs));
  }

  function bindDev() {
    const ids = ["lbSeasonD", "lbSeasonH", "lbSeasonMin", "lbSeasonS"];
    const fields = ids.map(id => document.getElementById(id));
    document.getElementById("lbSeasonApply")?.addEventListener("click", () => {
      const shown = setSeasonLeft(...fields.map(f => f?.value));
      api.toast(`Season ends in ${shown}`);
    });
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    const saved = +api.store.get(SEASON_KEY, 0);
    seasonEnd = saved > Date.now() ? saved : Date.now() + (24 * 3600 + 40 * 60 + 1) * 1000;
    bindDev();
    render();
    tick();
    api.$$("#s-leaderboard [data-lb-tab]").forEach(t => t.addEventListener("click", () => setBoard(t.dataset.lbTab, true)));
    // mouse wheel / trackpad scrolls the list; the scrollbar follows (like Match History)
    api.bind("lbRows")?.addEventListener("scroll", syncScrollbar, { passive: true });
    window.MTX_PLAYER?.on(() => { if (api.getCur?.() === "leaderboard") render(); });
    window.MTX_PLAYER?.render();   // the HUD rank icon needs rankOf, which exists from here on
  }

  function enter() {
    render();
    tick();
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      if (api.getCur?.() !== "leaderboard") { clearInterval(clockTimer); return; }
      tick();
    }, 1000);
  }

  function focus(el) {
    if (el?.classList?.contains("lb-row")) {
      reveal(el);
      showStanding(el.dataset.name);
    }
  }
  //#endregion

  window.MTX_SCREENS.leaderboard = {
    bindApi,
    init,
    enter,
    focus,
    setSeasonLeft,
    rankOf,
    // HUD rank badge (thread #19): open on the Personal board (everyone in your rank) with your row focused
    showMyRank() { board = "personal"; (window.MTX?.api?.show || window.MTX.show)("leaderboard"); setBoard("personal"); },
    actions: {
      lbPrevTab() { step(-1); },
      lbNextTab() { step(1); },
      openFighter(el) {
        const name = el?.dataset?.name || "Fighter";
        api.toast(`${name} · fighter profile is not in this prototype`);
      }
    }
  };
})();
