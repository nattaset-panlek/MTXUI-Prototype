(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOLD_DURATION = 1000;

  // acc = R / E / S track colour used by the card. photo / logo = box inside the 383x544 card (Figma 2:880 / 2:1497).
  // manager-kamol.webp and manager-nattapong.webp hold each other's photo, so the paths below are crossed on purpose.
  const MANAGERS = {
    mgr_justin: {
      id: "mgr_justin",
      name: "Justin Polsen",
      role: "Business Expert",
      acc: "track-e",
      photo: "mtx/assets/img/manager-justin.webp",
      photoBox: [62, 77, 260, 312],
      perk: "+15% sponsor offers. Contract talks finish one day faster.",
      desc: "Turns opportunities into winning deals with sharp strategy and negotiation skills.",
      buffs: [["Sponsor offers", "+15%"], ["Contract talks", "-1 day"]]
    },
    mgr_kamol: {
      id: "mgr_kamol",
      name: "Kamol Intarak",
      role: "Media Specialist",
      acc: "track-s",
      photo: "mtx/assets/img/manager-nattapong.webp",
      photoBox: [84, 32, 208, 359],
      perk: "+25% follower growth on social media. Unlock exclusive interviews.",
      desc: "Turns attention into influence through media, engagement, and strong connections.",
      buffs: [["Follower growth", "+25%"], ["Exclusive interviews", "Unlocked"]]
    },
    mgr_nattapong: {
      id: "mgr_nattapong",
      name: "Nattapong Sirisak",
      role: "Fight Developer",
      acc: "track-r",
      photo: "mtx/assets/img/manager-kamol.webp",
      photoBox: [77, 55, 235, 335],
      perk: "+20% attribute XP from gym simulations. Stamina recovery +15%.",
      desc: "Builds stronger fighters through discipline, training, and relentless performance.",
      buffs: [["Attribute XP", "+20%"], ["Stamina recovery", "+15%"]]
    }
  };

  const SPONSORS = {
    spon_beefy: {
      id: "spon_beefy",
      name: "Beefy Buff",
      role: "Meat Snacks Co.",
      acc: "track-e",
      logo: "mtx/assets/svg/sponsor-beefybuff.svg",
      logoBox: [77, 69, 221, 163],
      perk: "+10% Fight Money · +5% Sponsor Income",
      desc: "Fuels fighters with high-protein meat snacks built for every challenge.",
      buffs: [["Fight money", "+10%"], ["Sponsor income", "+5%"]],
      days: 30
    },
    spon_primehook: {
      id: "spon_primehook",
      name: "Primehook",
      role: "Professional Fight Gear",
      acc: "track-s",
      logo: "mtx/assets/svg/sponsor-primehook.svg",
      logoBox: [45, 105, 293, 94],
      perk: "+10% Fight Money · +5% Sponsor Income",
      desc: "Professional fight gear designed to protect, perform, and go the distance.",
      buffs: [["Fight money", "+10%"], ["Sponsor income", "+5%"]],
      days: 30
    },
    spon_arken: {
      id: "spon_arken",
      name: "Arken Performance",
      role: "Performance Gear",
      acc: "track-r",
      logo: "mtx/assets/svg/sponsor-arken.svg",
      logoBox: [89, 75, 205, 146],
      perk: "+20% Reputation XP · +5% Fan Growth",
      desc: "High-performance gear built to support fighters and push every limit.",
      buffs: [["Reputation XP", "+20%"], ["Fan growth", "+5%"]],
      days: 30
    }
  };

  // Card back details from the Ultimate Fight status sheets (source/UltimateFightStatus_Sheets):
  //   managers  20_Manager.csv, Tier 1 row of the same type (ref = ManagerID)
  //   sponsors  25_(prototype) sponser.csv, Tier 1 at contract level 5; challenge targets = Challenge Level 1 (23_Sponsor.csv)
  // benefit: [label, value, negative?]
  Object.assign(MANAGERS.mgr_justin, {
    role: "Business Planner", tier: 1, ref: "MGR_109",
    benefits: [["Money gain", "+5%"], ["Bonus gain from sponsor", "+5%"]],
    req: ["Money > 10,000", "Fanbase > 5,000", "Gym level 1"],
    quote: "You don't have to understand the numbers. Just make sure there's more money coming in than going out."
  });
  Object.assign(MANAGERS.mgr_kamol, {
    role: "Media Expert", tier: 1, ref: "MGR_103",
    benefits: [["RXP gain", "+4%"], ["Fans from social & interview", "+3%"], ["Fans from random events", "+4%"], ["Money spent in random events", "+10%", true]],
    req: ["R level 10+", "Simulated days > 7", "Fanbase > 20,000", "Gym level 1"],
    quote: "Don't worry about the camera. Just be yourself. That's usually what people want to see."
  });
  Object.assign(MANAGERS.mgr_nattapong, {
    role: "Fight Tactician", tier: 1, ref: "MGR_98",
    benefits: [["SXP gain", "+6%"], ["Match recover", "+10%"], ["SXP per day", "+50"], ["Match fitness cost", "+5", true]],
    req: ["S level 10+", "Simulated days > 7", "Fanbase > 20,000", "Gym level 1"],
    quote: "Don't just hit harder. Make him pay for every mistake."
  });
  Object.assign(SPONSORS.spon_beefy, {
    role: "EXP focus", tier: 1, level: 5, days: 2, deadline: 3,
    benefits: [["EXP gain", "+7%"], ["Money gain", "+5%"], ["Money per day", "+500"]],
    challenges: [["Win matches", 2, "wins"], ["Win streak", 1, "streak"], ["Fanbase gain", 1000, "fans"]],
    req: ["E level 4+", "Fanbase > 3,000", "Gym level 1"]
  });
  Object.assign(SPONSORS.spon_primehook, {
    role: "SXP focus", tier: 1, level: 5, days: 2, deadline: 3,
    benefits: [["SXP gain", "+9%"], ["Money gain", "+7%"], ["Fanbase gain", "+9%"], ["Money per day", "+500"]],
    challenges: [["Win matches", 2, "wins"], ["Win streak", 1, "streak"], ["Fanbase gain", 1000, "fans"], ["Strikes landed", 30, "strikes"]],
    req: ["S level 8+", "Simulated days > 14", "Fanbase > 12,000", "Gym level 1"]
  });
  Object.assign(SPONSORS.spon_arken, {
    role: "EXP focus", tier: 1, level: 5, days: 2, deadline: 3, acc: "track-e",
    benefits: [["EXP gain", "+5%"], ["Money per day", "+500"]],
    challenges: [["Win matches", 2, "wins"], ["Head strikes", 15, "head"]],
    req: ["Gym level 1"]
  });
  // the sponsor card front lists the same benefits
  Object.values(SPONSORS).forEach(sp => { sp.buffs = sp.benefits.map(([k, v]) => [k, v]); });

  let simDate = new Date("2026-08-04T00:00:00");
  let sponsorDaysLeft = 18;
  // Sponsor contract has 2 stages:
  //   "deadline": challenges must be finished before the deadline runs out (bonus not active yet; miss it = contract lost)
  //   "active"  : challenges done, bonus active, "Remaining" counts the contract duration down
  let sponsorStage = "active";
  let sponsorDeadlineLeft = 0;
  let sponsorProgress = {};
  let fitness = 30;
  let simDayCount = 0;
  let currentManager = null;
  let currentSponsor = null;
  let managerHiredDate = null;
  let sponsorSignedDate = null;

  // Collection: every manager / sponsor the player has ever hired or signed stays unlocked here
  let collection = { mgr: [], spon: [], evt: [], scn: [] };   // evt = event cards picked, scn = scenarios met
  const COL_TABS = [["mgr", "Personal"], ["spon", "Sponsor"], ["evt", "Random Event"]];
  let colTab = "mgr";

  let simHold = null;   // MTX_UI.createHold for "Hold Simulate day", made in init
  let isSimulatingDay = false;
  let events = null;        // Simulate Day event popups (mtx/js/sim-events.js)

  //#endregion

  //#region [Properties]
  function getFitness() {
    return fitness;
  }

  function getSimDate() {
    return simDate;
  }

  function getSponsorDaysLeft() {
    return sponsorDaysLeft;
  }

  function getSimDayCount() {
    return simDayCount;
  }

  // true while a modal is up or the simulate-day transition is playing: the app routes all input here,
  // so nothing behind (Quest, Tactical style, Manager, Social ...) can be entered mid-animation
  function isModalOpen() {
    return !!events?.isOpen() || isSimulatingDay || !!overlay;
  }
  //#endregion

  //#region [Unity Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    simHold = window.MTX_UI.createHold({
      ms: HOLD_DURATION,
      flash: "is-unlocked-flash",
      onDone: () => finishSimulateHold()
    });
    events = createEvents();
    loadState();
    renderFitness();
    renderCalendar();
    renderCards();
    bindEvents();
  }

  function enter() {
    renderFitness();
    renderCalendar();
    renderCards();
  }
  //#endregion

  //#region [Public Methods]
  function simulateDay() {
    runSimulateDay();
  }

  // popup input (app.js routes buttons here while a popup is open)
  // (the Collection's Compare / card-set overlays take the same route: A flips their cards, B / Y close them)
  const handleNav = dir => { if (!overlay) events.handleNav(dir); };
  const handleConfirm = () => (overlay ? flipOverlay() : events.handleConfirm());
  const handleCancel = () => (overlay ? closeOverlay() : events.handleCancel());
  const handleAux = btn => (overlay ? btn === "y" && closeOverlay() : events.handleAux(btn));
  const isSelectHoldReady = () => !overlay && events.isSelectHoldReady();
  const startSelectHold = source => events.startSelectHold(source);
  const cancelSelectHold = () => events.cancelSelectHold();
  const cancelDeclineHold = notify => events.cancelDeclineHold(notify);

  function startSimulateHold(btn, source) {
    if (simHold.active) return false;
    // Y holds from anywhere on the screen: the focused element is not the button then, so drive the visible Simulate day button
    const isSimBtn = el => el && (el.dataset?.fn === "holdSimulateDay" || el.dataset?.holdAction === "simulate");
    const target = (isSimBtn(btn) ? btn : null) || api.$(".screen.is-active .simulate-btn") || api.$("#s-career .simulate-btn");
    return simHold.start(target, { source });
  }

  function cancelSimulateHold() {
    simHold?.cancel();
  }

  // the hold completed (also callable directly)
  function finishSimulateHold() {
    api.rumble(150, 0.6);
    runSimulateDay();
  }

  // quiet = true when another reset (e.g. the layout Reset chip) shows its own toast
  function resetCareer(quiet) {
    events.close();
    simDayCount = 0;
    currentManager = null;
    currentSponsor = null;
    simDate = new Date("2026-08-04T00:00:00");
    fitness = 30;
    sponsorDaysLeft = 18;
    sponsorStage = "active";
    sponsorDeadlineLeft = 0;
    sponsorProgress = {};
    saveSponsorStage();
    api.store.set("simDayCount", "0");
    api.store.set("mtx_personal_manager", "");
    api.store.set("mtx_sponsor", "");
    api.store.set("simDate", simDate.toISOString());
    api.store.set("fitness", "30");
    api.store.set("sponsorDaysLeft", "18");
    api.store.set("managerHiredDate", "");
    api.store.set("sponsorSignedDate", "");
    collection = { mgr: [], spon: [], evt: [], scn: [] };
    api.store.set("mtx_collection", JSON.stringify(collection));
    renderFitness();
    renderCalendar();
    renderCards();
    api.getScreen("media")?.resetSocial?.();
    if (quiet !== true) api.toast("Career & simulation reset to Day 1");
    api.log("Career reset to Day 1", "action");
  }
  //#endregion

  //#region [Private Methods]
  function loadState() {
    simDate = new Date(api.store.get("simDate", "2026-08-04T00:00:00"));
    if (isNaN(simDate.getTime())) simDate = new Date("2026-08-04T00:00:00");
    sponsorDaysLeft = +api.store.get("sponsorDaysLeft", "18");
    fitness = +api.store.get("fitness", "30");
    simDayCount = +api.store.get("simDayCount", "0");
    const mgrId = api.store.get("mtx_personal_manager", "");
    currentManager = MANAGERS[mgrId] || null;
    const sponId = api.store.get("mtx_sponsor", "");
    currentSponsor = SPONSORS[sponId] || null;
    managerHiredDate = parseDate(api.store.get("managerHiredDate", ""), simDate);
    sponsorSignedDate = parseDate(api.store.get("sponsorSignedDate", ""), simDate);
    try { collection = Object.assign({ mgr: [], spon: [], evt: [], scn: [] }, JSON.parse(api.store.get("mtx_collection", "{}"))); } catch (e) { collection = { mgr: [], spon: [], evt: [], scn: [] }; }
    colTab = api.store.get("col_tab", "mgr");
    if (!COL_TABS.some(([k]) => k === colTab)) colTab = "mgr";
    if (currentManager) unlockCard("mgr", currentManager.id);
    if (currentSponsor) unlockCard("spon", currentSponsor.id);
    sponsorStage = api.store.get("sponsorStage", "active");
    sponsorDeadlineLeft = +api.store.get("sponsorDeadlineLeft", "0");
    try { sponsorProgress = JSON.parse(api.store.get("sponsorProgress", "{}")) || {}; } catch (e) { sponsorProgress = {}; }
    if (currentSponsor) sponsorDaysLeft = Math.min(sponsorDaysLeft, currentSponsor.days);
    if (currentSponsor && sponsorStage === "active" && sponsorDaysLeft <= 0) expireSponsor(false);
    if (currentSponsor && sponsorStage === "deadline" && sponsorDeadlineLeft <= 0) expireSponsor(false);
  }

  function unlockCard(kind, id) {
    if (collection[kind].includes(id)) return;
    collection[kind].push(id);
    api.store.set("mtx_collection", JSON.stringify(collection));
  }

  function parseDate(iso, fallback) {
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(d.getTime()) ? d : new Date(fallback);
  }

  function fmtDate(d) {
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  }

  function saveSponsorStage() {
    api.store.set("sponsorStage", sponsorStage);
    api.store.set("sponsorDeadlineLeft", String(sponsorDeadlineLeft));
    api.store.set("sponsorProgress", JSON.stringify(sponsorProgress));
    api.store.set("sponsorDaysLeft", String(sponsorDaysLeft));
  }

  // stage 1 starts on signing: deadline running, challenges at 0, bonus inactive
  function signSponsor(spon) {
    currentSponsor = spon;
    unlockCard("spon", spon.id);
    sponsorStage = "deadline";
    sponsorDeadlineLeft = spon.deadline;
    sponsorProgress = {};
    sponsorDaysLeft = spon.days;
    sponsorSignedDate = new Date(simDate);
    api.store.set("mtx_sponsor", spon.id);
    api.store.set("sponsorSignedDate", sponsorSignedDate.toISOString());
    saveSponsorStage();
  }

  const challengeValue = c => Math.min(c[1], sponsorProgress[c[2]] || 0);
  const challengesDone = sp => sp.challenges.every(c => challengeValue(c) >= c[1]);

  function isSponsorActive() {
    return !!currentSponsor && sponsorStage === "active";
  }

  // a Rank fight result feeds the stage-1 challenges (Casual / Unranked fights never count)
  function recordFight(r) {
    if (!currentSponsor || sponsorStage !== "deadline") return;
    const p = sponsorProgress;
    p.wins = (p.wins || 0) + (r.win ? 1 : 0);
    p.curStreak = r.win ? (p.curStreak || 0) + 1 : 0;
    p.streak = Math.max(p.streak || 0, p.curStreak);
    p.fans = (p.fans || 0) + (r.fans || 0);
    p.strikes = (p.strikes || 0) + (r.strikes || 0);
    p.head = (p.head || 0) + (r.head || 0);
    if (challengesDone(currentSponsor)) {
      sponsorStage = "active";
      sponsorDaysLeft = currentSponsor.days;
      api.toast(`${currentSponsor.name} · challenges complete, bonus active for ${currentSponsor.days} days`);
      api.log(`Sponsor challenges complete: ${currentSponsor.name} · bonus active`, "action");
      api.rumble(120, .45);
    }
    saveSponsorStage();
    renderCards();
  }

  function expireSponsor(announce, failed) {
    const name = currentSponsor?.name;
    currentSponsor = null;
    sponsorDaysLeft = 0;
    sponsorStage = "active";
    sponsorDeadlineLeft = 0;
    sponsorProgress = {};
    api.store.set("mtx_sponsor", "");
    saveSponsorStage();
    if (announce && name) {
      api.toast(failed ? `Sponsor deadline missed · ${name} withdrew the offer` : `Sponsor contract ended · ${name}`);
      api.log(failed ? `Sponsor lost (challenges not finished in time): ${name}` : `Sponsor contract expired: ${name}`, "action");
    }
  }

  // 7-day strip on the Career profile card: 3 days back (crossed out), today, 3 days ahead.
  function renderCalendar() {
    const host = api.bind("calDays");
    if (!host) return;
    api.bind("calMonth").textContent = MONTHS[simDate.getMonth()];
    api.bind("calYear").textContent = simDate.getFullYear();
    let html = "";
    for (let i = -3; i <= 3; i++) {
      const d = new Date(simDate);
      d.setDate(simDate.getDate() + i);
      const cls = i === 0 ? " is-today" : i < 0 ? " is-past" : "";
      html += `<div class="mini-cal__day${cls}"><b>${d.getDate()}</b><span>${DAYS_SHORT[d.getDay()]}</span></div>`;
    }
    host.innerHTML = html;
  }

  function renderFitness() {
    api.$$("[data-bind=fitness]").forEach(b => { b.textContent = fitness; });
    api.$$(".fitness").forEach(f => f.style.setProperty("--v", Math.min(1, fitness / 61).toFixed(3)));
  }

  function buildSimOverlayDayHtml(dateObj, isPast, isToday) {
    const cls = isToday ? "sim-day is-today" : (isPast ? "sim-day is-past" : "sim-day");
    return `
      <div class="${cls}" data-date="${dateObj.toISOString()}">
        <div class="sim-day__num">${dateObj.getDate()}</div>
        <div class="sim-day__name">${DAYS_SHORT[dateObj.getDay()]}</div>
        <div class="sim-day__scrim"></div>
        <div class="sim-day__scratch">
          <img src="mtx/assets/svg/cross-mark-scratched.svg" alt="">
        </div>
      </div>
    `;
  }

  function renderCards() {
    renderManagerCard();
    renderSponsorCard();
    renderCollectionCard();
  }

  // Management: a small link under the 3 cards (right edge), opens the Collection screen (A on it, or Y anywhere)
  function renderCollectionCard() {
    const slot = api.$("#colCardSlot");
    if (!slot) return;
    const nM = Object.keys(MANAGERS).length, nS = Object.keys(SPONSORS).length, nE = (window.MTX_SIM_EVENTS?.scenarios || []).length;
    const have = collection.mgr.length + collection.spon.length + collection.scn.length;
    slot.innerHTML = `
      <a class="col-link focus-ring focus-ring--out" data-nav data-id="col" data-go="collection" data-focus-hints='{"a":"Open"}' aria-label="Collection: ${collection.mgr.length} of ${nM} managers, ${collection.spon.length} of ${nS} sponsors, ${collection.scn.length} of ${nE} random event scenarios unlocked">
        ${window.MTX_UI.glyph("y", { cls: "col-link__glyph" })}
        <span class="col-link__label">Collection</span>
        <span class="col-link__count"><b>${have}</b> / ${nM + nS + nE}</span>
      </a>`;
  }

  // Collection screen: all managers and sponsors; unlocked ones flip to their bonuses
  function collectionCard(kind, c, i) {
    const owned = collection[kind].includes(c.id);
    const active = (kind === "mgr" ? currentManager : currentSponsor)?.id === c.id;
    const id = `${kind}${i}`;
    if (!owned) {
      const art = kind === "mgr"
        ? `<img class="col-lock__art col-lock__art--photo" src="${c.photo}" alt="" style="${boxStyle(c.photoBox)}">`
        : `<img class="col-lock__art" src="${c.logo}" alt="" style="${boxStyle(c.logoBox)}">`;
      return `<div class="col-slot"><a class="sim-card col-card col-card--locked focus-ring focus-ring--out" data-nav data-id="${id}"
          data-toast="Locked · ${kind === "mgr" ? "hire" : "sign"} this ${kind === "mgr" ? "manager" : "sponsor"} from a Simulate day offer" aria-label="Locked ${kind === "mgr" ? "manager" : "sponsor"}">
          <div class="sim-card__face sim-card__face--front col-lock">
            ${art}
            <i class="col-lock__icon" aria-hidden="true"></i>
            <p class="col-lock__name">???</p>
          </div>
        </a></div>`;
    }
    // the hired manager / signed sponsor carries an "ACTIVE" label
    return `<div class="col-slot${active ? " is-active" : ""}">${active ? `<span class="col-slot__active">Active</span>` : ""}
        <a class="sim-card col-card focus-ring focus-ring--out" data-nav data-id="${id}" data-fn="flipCard" style="${accStyle(c.acc)}" aria-label="${c.name}, ${c.role}${active ? ", active" : ""}">
          ${cardFaces(kind, c)}
        </a></div>`;
  }

  // front + back of an unlocked manager / sponsor card (Collection grid and the Compare overlay)
  function cardFaces(kind, c) {
    const front = kind === "mgr" ? `
          <div class="sim-card__face sim-card__face--front ev-card ev-card--mgr">
            <p class="ev-card__name">${c.name}</p>
            <p class="ev-card__role">${c.role}</p>
            <img class="ev-card__cutout" src="${c.photo}" alt="${c.name}" style="${boxStyle(c.photoBox)}">
            <hr class="ev-card__rule ev-card__rule--photo">
            <p class="ev-card__desc">${c.desc}</p>
            ${CARD_CORNER}
          </div>` : `
          <div class="sim-card__face sim-card__face--front ev-card ev-card--spon">
            <span class="ev-card__days"><img src="mtx/assets/svg/icon-clock.svg" alt="">${c.days} days</span>
            <img class="ev-card__logo" src="${c.logo}" alt="${c.name}" style="${boxStyle(c.logoBox)}">
            <p class="ev-card__k">Bonus</p>
            <p class="ev-card__perks">${c.buffs.map(([k, v]) => `<span><b>${v}</b> ${k}</span>`).join("")}</p>
            <hr class="ev-card__rule ev-card__rule--a">
            <p class="ev-card__desc">${c.desc}</p>
            ${CARD_CORNER}
          </div>`;
    return front + (kind === "mgr" ? managerBack(c, null) : sponsorBack(c, null, false));
  }

  //#region [Collection · Compare]
  // Y on an unlocked manager / sponsor that is not the one hired / signed now: both cards side by side with a
  // benefit-by-benefit table. A (Space) flips both cards, B or Y closes. Input is routed here through isModalOpen().
  let overlay = null;   // open Collection overlay: "compare" | "set" | null

  // "+5%" -> 5, "+500" -> 500; null when the value is not a number ("Unlocked")
  const benefitNum = v => { const n = parseFloat(String(v).replace(/[^\d.+-]/g, "")); return Number.isFinite(n) ? n : null; };

  function compareRows(kind, cur, sel) {
    const rows = [];
    const byLabel = list => new Map(list.map(([k, v, neg]) => [k, { v, neg: !!neg }]));
    const a = byLabel(cur.benefits), b = byLabel(sel.benefits);
    [...new Set([...a.keys(), ...b.keys()])].forEach(k => rows.push({ k, a: a.get(k), b: b.get(k) }));
    if (kind === "spon") {
      const days = n => ({ v: `${n} ${n === 1 ? "day" : "days"}`, neg: false });
      rows.push({ k: "Bonus duration", a: days(cur.days), b: days(sel.days) });
      rows.push({ k: "Challenge deadline", a: days(cur.deadline), b: days(sel.deadline) });
      rows.push({ k: "Challenges", a: { v: String(cur.challenges.length), neg: true }, b: { v: String(sel.challenges.length), neg: true } });
    }
    return rows.map(r => {
      // a cost (neg) that appears is worse, one that goes away is better
      let state = "same";
      if (!r.a) state = r.b.neg ? "new-bad" : "new";
      else if (!r.b) state = r.a.neg ? "lost-good" : "lost";
      else {
        const x = benefitNum(r.a.v), y = benefitNum(r.b.v);
        if (x !== null && y !== null && x !== y) state = (y > x) !== (r.b.neg || r.a.neg) ? "up" : "down";
        else if (r.a.v !== r.b.v) state = "diff";
      }
      return { ...r, state };
    });
  }

  function compareTable(kind, cur, sel) {
    const rows = compareRows(kind, cur, sel);
    const mark = { up: "▲", down: "▼", new: "New", "new-bad": "New", lost: "Lost", "lost-good": "Gone" };
    const cell = (x, neg) => x ? `<span class="${neg ? "is-neg" : ""}">${x.v}</span>` : `<span class="is-none">—</span>`;
    const gains = rows.filter(r => ["up", "new", "lost-good"].includes(r.state)).length;
    const losses = rows.filter(r => ["down", "lost", "new-bad"].includes(r.state)).length;
    return `
        <div class="col-compare__table">
          <div class="col-compare__row col-compare__row--head"><span>Benefit</span><span>Current</span><span>Selected</span></div>
          ${rows.map(r => `<div class="col-compare__row is-${r.state}">
            <span class="col-compare__k">${r.k}</span>
            ${cell(r.a, r.a?.neg)}
            <span class="col-compare__sel">${r.b ? `<span class="${r.b.neg ? "is-neg" : ""}">${r.b.v}</span>` : `<span class="is-none">—</span>`}${mark[r.state] ? `<i>${mark[r.state]}</i>` : ""}</span>
          </div>`).join("")}
          <p class="col-compare__sum"><b class="is-up">${gains}</b> better &nbsp;·&nbsp; <b class="is-down">${losses}</b> worse than your ${kind === "mgr" ? "manager" : "sponsor"}</p>
        </div>`;
  }

  function compareCard(el) {
    const card = el?.classList?.contains("sim-card") ? el : api.getFocused?.();
    const m = /^(mgr|spon|evt)(\d+)$/.exec(card?.dataset?.id || "");
    if (!m || !card.closest("#collectionGroups")) return;
    const [, kind, i] = m;
    if (kind === "evt") { api.toast("Compare works on Personal and Sponsor cards"); return; }
    if (card.classList.contains("col-card--locked")) { api.toast(card.dataset.toast || "Locked"); return; }
    const sel = Object.values(kind === "mgr" ? MANAGERS : SPONSORS)[+i];
    const cur = kind === "mgr" ? currentManager : currentSponsor;
    const noun = kind === "mgr" ? "manager" : "sponsor";
    if (!cur) { api.toast(`No ${noun} ${kind === "mgr" ? "hired" : "signed"} yet · nothing to compare`); return; }
    if (cur.id === sel.id) { api.toast(`This is your current ${noun}`); return; }
    const box = api.$("#colCompare");
    if (!box) return;
    const face = (c, tag, cls) => `
        <div class="col-compare__col">
          <span class="col-compare__tag ${cls}">${tag}</span>
          <div class="sim-card col-compare__card col-ov-card" style="${accStyle(c.acc)}" aria-label="${c.name}, ${c.role}">${cardFaces(kind, c)}</div>
        </div>`;
    api.$("#colCompareSub").textContent = `${kind === "mgr" ? "Personal manager" : "Sponsor"} · ${cur.name} vs ${sel.name}`;
    api.$("#colCompareBody").innerHTML =
      face(cur, "Active", "col-compare__tag--cur") +
      compareTable(kind, cur, sel) +
      face(sel, "Selected", "col-compare__tag--sel");
    api.$$("#colCompareBody .col-ov-card").forEach(c => c.addEventListener("click", flipOverlay));
    box.hidden = false;
    overlay = "compare";
    api.rumble(60, 0.25);
    api.log(`Compare: ${cur.name} vs ${sel.name}`, "action");
  }

  // A on an unlocked scenario group: the cards of that scenario the player has chosen, side by side
  // (A flips them all, B / Y close). Cards never chosen are not shown.
  function openScenario(el) {
    const card = el?.dataset?.scenario ? el : api.getFocused?.();
    const s = (window.MTX_SIM_EVENTS?.scenarios || []).find(x => x.id === card?.dataset?.scenario);
    const box = api.$("#colSet");
    if (!s || !box) return;
    const SE = window.MTX_SIM_EVENTS;
    const all = scenarioCards(s), chosen = chosenCards(s);
    api.$("#colSetTitle").textContent = s.name;
    api.$("#colSetSub").textContent = `${s.desc} · ${chosen.length} of ${all.length} cards chosen`;
    const body = api.$("#colSetBody");
    body.dataset.count = chosen.length;
    body.innerHTML = chosen.length ? chosen.map(e => `<div class="col-set__col">
          <div class="sim-card col-set__card col-ov-card" style="${accStyle(SE.EVENT_ACC[e.type] || "track-r")}" aria-label="${SE.esc(e.name)}">${eventFaces(e, SE.events.indexOf(e))}</div>
        </div>`).join("")
      : `<p class="col-set__empty">No card chosen yet. Pick one when this scenario comes up on a Simulate day.</p>`;
    api.$$("#colSetBody .col-ov-card").forEach(c => c.addEventListener("click", flipOverlay));
    box.hidden = false;
    overlay = "set";
    api.rumble(60, 0.25);
    api.log(`Scenario card set: ${s.name}`, "action");
  }

  function flipOverlay() {
    const box = api.$(overlay === "set" ? "#colSet" : "#colCompare");
    const cards = box ? [...box.querySelectorAll(".col-ov-card")] : [];
    const flip = !cards[0]?.classList.contains("is-flipped");
    cards.forEach(c => c.classList.toggle("is-flipped", flip));
    api.rumble(60, 0.25);
  }

  function closeOverlay() {
    ["#colCompare", "#colSet"].forEach(sel => { const box = api.$(sel); if (box) box.hidden = true; });
    overlay = null;
    api.rumble(40, 0.2);
  }
  //#endregion

  // front + back of one Random Event card (Collection card-set overlay); i = index in MTX_SIM_EVENTS.events (photo)
  function eventFaces(e, i) {
    const SE = window.MTX_SIM_EVENTS, esc = SE.esc;
    const random = e.variants.length > 1, v = e.variants[0];
    const list = arr => arr.length ? arr.map(SE.effect).map(x => `<span class="ev-fx${x.good ? "" : " is-bad"}">${esc(x.text)}</span>`).join("") : `<span class="ev-fx">None</span>`;
    const body = random
      ? `<p class="ev-card__k">Outcome</p><p class="ev-card__fx"><span class="ev-fx">Random · ${e.variants.length} possible results</span></p>`
      : `<p class="ev-card__k">Instant</p><p class="ev-card__fx">${list(v.instant)}</p><hr class="ev-card__rule"><p class="ev-card__k">Over time</p><p class="ev-card__fx">${list(v.cont)}</p>`;
    return `
          <div class="sim-card__face sim-card__face--front ev-card ev-card--event">
            <p class="ev-card__title">${esc(e.name)}</p>
            <img class="ev-card__photo" src="mtx/assets/img/${SE.EVENT_PHOTOS[i % SE.EVENT_PHOTOS.length]}" alt="">
            ${body}
            <div class="ev-card__foot"><span><b>Type</b>${esc(e.type)}</span><span><b>Ref</b>${esc(e.id)}</span></div>
            ${CARD_CORNER}
          </div>
          <div class="sim-card__face sim-card__face--back ev-card sim-back sim-back--sheet">
            <p class="sim-back__name">${esc(e.name)}</p>
            <p class="sim-back__k">What happens</p>
            <p class="sim-back__desc ev-back__desc">${esc(e.desc)}</p>
            <p class="sim-back__k">${random ? "Possible results" : "Result"}</p>
            <ul class="sim-back__quests ev-back__list">${e.variants.map(x => `<li><span>${esc([...x.instant, ...x.cont].map(l => SE.effect(l).text).join(" · ") || "Nothing")}</span></li>`).join("")}</ul>
            ${CARD_CORNER}
          </div>`;
  }

  // Random Event tab: one group per scenario (sim-scenarios.js); a scenario unlocks once it has come up on a
  // Simulate day, and A on it opens its whole card set as an overlay. Locked groups stay "???".
  function scenarioCards(s) {
    const events = window.MTX_SIM_EVENTS?.events || [];
    return s.cards.map(id => events.find(e => e.id === id)).filter(Boolean);
  }
  const chosenCards = s => scenarioCards(s).filter(e => collection.evt.includes(e.id));

  function scenarioCollectionCard(s, i) {
    const SE = window.MTX_SIM_EVENTS, esc = SE.esc;
    const id = `evt${i}`;
    if (!collection.scn.includes(s.id)) {
      return `<div class="col-slot"><a class="sim-card col-card col-card--locked focus-ring focus-ring--out" data-nav data-id="${id}"
          data-toast="Locked · meet this scenario on a Simulate day" aria-label="Locked random event scenario">
          <div class="sim-card__face sim-card__face--front col-lock">
            <i class="col-lock__icon" aria-hidden="true"></i>
            <p class="col-lock__name">???</p>
          </div>
        </a></div>`;
    }
    const cards = scenarioCards(s), chosen = chosenCards(s);
    const first = SE.events.indexOf(chosen[0] || cards[0]);
    return `<div class="col-slot col-slot--set">
        <a class="sim-card col-card col-card--set focus-ring focus-ring--out" data-nav data-id="${id}" data-fn="openScenario" data-scenario="${s.id}"
          style="${accStyle("track-r")}" aria-label="${esc(s.name)}, ${chosen.length} of ${cards.length} cards chosen">
          <div class="sim-card__face sim-card__face--front ev-card ev-card--event ev-card--scn">
            <p class="ev-card__title">${esc(s.name)}</p>
            <img class="ev-card__photo" src="mtx/assets/img/${SE.EVENT_PHOTOS[Math.max(0, first) % SE.EVENT_PHOTOS.length]}" alt="">
            <p class="ev-card__k">Chosen · ${chosen.length} / ${cards.length}</p>
            <p class="ev-card__fx">${chosen.length ? chosen.map(e => `<span class="ev-fx">${esc(e.name)}</span>`).join("") : `<span class="ev-fx">None yet</span>`}</p>
            <div class="ev-card__foot"><span><b>Scenario</b>${esc(s.id)}</span><span><b>Chosen</b>${chosen.length} / ${cards.length}</span></div>
            ${CARD_CORNER}
          </div>
        </a></div>`;
  }

  // Collection: Q / E tabs Personal / Sponsor / Random Event, one grid at a time
  function renderCollection() {
    const host = api.$("#collectionGroups");
    if (!host) return;
    const lists = { mgr: Object.values(MANAGERS), spon: Object.values(SPONSORS), evt: window.MTX_SIM_EVENTS?.scenarios || [] };
    const list = lists[colTab];
    host.innerHTML = list.map((c, i) => colTab === "evt" ? scenarioCollectionCard(c, i) : collectionCard(colTab, c, i)).join("");
    host.scrollTop = 0;
    api.$$("#s-collection [data-col-tab]").forEach(t => {
      const on = t.dataset.colTab === colTab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on);
      if (!t.dataset.bound) { t.dataset.bound = "1"; t.addEventListener("click", () => setColTab(t.dataset.colTab)); }
    });
    const count = api.$("#colCount");
    if (count) count.innerHTML = `<b>${collection[colTab === "evt" ? "scn" : colTab].length}</b> / ${list.length} unlocked`;
    const scr = api.$("#s-collection");
    if (scr) scr.dataset.first = `${colTab}0`;
    // scrollbar inside the grid's right edge, synced on scroll (screen just shown: lay out first)
    requestAnimationFrame(() => window.MTX_UI.bindScrollbar(host, api.$("#colScroll"), { side: "inside", gap: 4 }));
  }

  function setColTab(k) {
    if (k === colTab) return;
    colTab = k;
    api.store.set("col_tab", k);
    renderCollection();
    api.rumble(40, 0.2);
    api.setFocus(api.$(`#s-collection [data-nav][data-id="${k}0"]`));
  }

  function stepColTab(d) {
    const i = COL_TABS.findIndex(([k]) => k === colTab);
    setColTab(COL_TABS[(i + d + COL_TABS.length) % COL_TABS.length][0]);
  }

  const CARD_CORNER = `
    <svg class="ev-card__corner" viewBox="0 0 383 61" preserveAspectRatio="none" aria-hidden="true">
      <path class="ev-card__corner-dark" d="M319.9 55.85C319.56 55.87 319.26 55.87 319 55.85H319.9C323.52 55.66 331.23 53.29 339.29 44.68C348.1 35.27 371.95 10.97 382.77 0V37.63L358.42 55.85Z"/>
      <path class="ev-card__corner-band" d="M0 57H330C346 57 360 49 383 25V61H0Z"/>
    </svg>`;

  const boxStyle = ([l, t, w, h]) => `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
  const accStyle = acc => `--acc:var(--${acc});--acc-dark:var(--${acc}-dark)`;
  // Back face rows: label left, value right, thin rule between (same language as the Figma event cards).
  const backRows = rows => rows.map(([k, v]) => `<div class="sim-back__row"><span>${k}</span><b>${v}</b></div>`).join("");
  const benefitRows = list => list.map(([k, v, neg]) => `<div class="sim-back__row${neg ? " is-neg" : ""}"><span>${k}</span><b>${v}</b></div>`).join("");

  // manager back: type + tier, sheet benefits, then profile rows (or the unlock requirement in the collection)
  function managerBack(m, rows) {
    return `
          <div class="sim-card__face sim-card__face--back ev-card sim-back sim-back--sheet">
            <p class="sim-back__name">${m.name}</p>
            <p class="sim-back__role">${m.role}  ·  Tier ${m.tier}</p>
            <p class="sim-back__k">Benefits</p>
            ${benefitRows(m.benefits)}
            ${rows ? `<p class="sim-back__k">Profile</p>${backRows(rows)}` : ""}
            <p class="sim-back__desc">&ldquo;${m.quote}&rdquo;</p>
            ${CARD_CORNER}
          </div>`;
  }

  // sponsor back: benefits, contract (stage 1 Deadline / stage 2 Remaining), challenges
  //   live = the signed contract on Management; otherwise the Collection's static view
  function sponsorBack(sp, signed, live) {
    const pending = live && sponsorStage === "deadline";
    const days = n => `${n} ${n === 1 ? "day" : "days"}`;
    let contract;
    if (!live) {
      contract = backRows([["Challenge deadline", days(sp.deadline)], ["Bonus duration", days(sp.days)]]);
    } else if (pending) {
      contract = backRows([["Signed", fmtDate(signed)], ["Deadline", `${sponsorDeadlineLeft} of ${days(sp.deadline)}`]]) +
        `<div class="sim-back__bar is-deadline"><i style="width:${(sponsorDeadlineLeft / sp.deadline * 100).toFixed(1)}%"></i></div>`;
    } else {
      contract = backRows([["Signed", fmtDate(signed)], ["Remaining", `${sponsorDaysLeft} of ${days(sp.days)}`]]) +
        `<div class="sim-back__bar"><i style="width:${(sponsorDaysLeft / sp.days * 100).toFixed(1)}%"></i></div>`;
    }
    const quests = sp.challenges.map(c => {
      const v = live ? (pending ? challengeValue(c) : c[1]) : 0;
      const done = live && v >= c[1];
      return `<li class="${done ? "is-done" : ""}"><span>${c[0]}</span><b>${live ? `${v.toLocaleString("en-US")} / ` : ""}${c[1].toLocaleString("en-US")}</b></li>`;
    }).join("");
    const doneCount = live ? sp.challenges.filter(c => (pending ? challengeValue(c) : c[1]) >= c[1]).length : 0;
    return `
          <div class="sim-card__face sim-card__face--back ev-card sim-back sim-back--sheet">
            <p class="sim-back__name">${sp.name}</p>
            <p class="sim-back__k">Benefits${live ? (pending ? " · locked" : " · active") : ""}</p>
            <div class="${pending ? "sim-back__locked" : ""}">${benefitRows(sp.benefits)}</div>
            <p class="sim-back__k">Contract</p>
            ${contract}
            <p class="sim-back__k">Challenges${live ? ` · ${doneCount}/${sp.challenges.length}` : ` · ${sp.challenges.length}`}</p>
            <ul class="sim-back__quests">${quests}</ul>
            ${CARD_CORNER}
          </div>`;
  }

  // Re-rendering a slot keeps the card on the side the player flipped it to.
  function wasFlipped(slot) {
    return !!slot.querySelector(".sim-card.is-flipped");
  }

  // State and hint of a Management card: A always reads Flip
  const cardStateAttrs = open => `aria-expanded="${open}" data-focus-hints='{"a":"Flip"}'`;

  function renderManagerCard() {
    const slot = api.$("#mgrCardSlot");
    if (!slot) return;
    if (!currentManager) {
      slot.innerHTML = `
        <a class="sim-card sim-card--vacant focus-ring focus-ring--out" data-nav data-id="mgrVacant" data-figma="112:354 Group 1244834396">
          <div class="sim-card__face sim-card__face--front sim-card__vacant sim-card__vacant--mgr">
            <img class="sim-card__vacant-art" src="mtx/assets/img/card-no-mgr-art.webp" alt="">
            <h3 class="sim-card__vacant-title">NO MANAGER<br>AVAILABLE</h3>
            <div class="sim-card__vacant-scratch"></div>
          </div>
        </a>
      `;
    } else {
      const m = currentManager;
      slot.innerHTML = `
        <a class="sim-card focus-ring focus-ring--out${wasFlipped(slot) ? " is-flipped" : ""}" data-nav data-id="mgr" data-fn="flipCard" ${cardStateAttrs(wasFlipped(slot))}
          data-figma="2:880 Manager card" style="${accStyle(m.acc)}">
          <div class="sim-card__face sim-card__face--front ev-card ev-card--mgr">
            <p class="ev-card__name">${m.name}</p>
            <p class="ev-card__role">${m.role}</p>
            <img class="ev-card__cutout" src="${m.photo}" alt="${m.name}" style="${boxStyle(m.photoBox)}">
            <hr class="ev-card__rule ev-card__rule--photo">
            <p class="ev-card__desc">${m.desc}</p>
            ${CARD_CORNER}
          </div>
          ${managerBack(m, [["Hired", fmtDate(managerHiredDate)], ["Days on team", Math.max(0, Math.round((simDate - managerHiredDate) / 86400000))]])}
        </a>
      `;
    }
  }

  function renderSponsorCard() {
    const slot = api.$("#sponCardSlot");
    if (!slot) return;
    if (!currentSponsor) {
      slot.innerHTML = `
        <a class="sim-card sim-card--vacant focus-ring focus-ring--out" data-nav data-id="sponVacant" data-figma="112:360 Group 1244833245">
          <div class="sim-card__face sim-card__face--front sim-card__vacant sim-card__vacant--spon">
            <img class="sim-card__vacant-art" src="mtx/assets/img/card-no-spon-art.webp" alt="">
            <h3 class="sim-card__vacant-title">NO SPONSOR<br>AVAILABLE</h3>
            <div class="sim-card__vacant-scratch"></div>
          </div>
        </a>
      `;
    } else {
      const sp = currentSponsor;
      const expires = new Date(sponsorSignedDate);
      expires.setDate(expires.getDate() + sp.days);
      const pending = sponsorStage === "deadline";
      const left = pending ? sponsorDeadlineLeft : sponsorDaysLeft;
      const low = left <= 1 ? " is-low" : "";
      const dayWord = left === 1 ? "day" : "days";
      slot.innerHTML = `
        <a class="sim-card focus-ring focus-ring--out${wasFlipped(slot) ? " is-flipped" : ""}" data-nav data-id="spon" data-fn="flipCard" ${cardStateAttrs(wasFlipped(slot))}
          data-figma="2:1497 Sponsor card" style="${accStyle(sp.acc)}">
          <div class="sim-card__face sim-card__face--front ev-card ev-card--spon">
            <span class="ev-card__days${low}${pending ? " is-deadline" : ""}"><img src="mtx/assets/svg/icon-clock.svg" alt="">${pending ? "Deadline " : ""}${left} ${dayWord}</span>
            <img class="ev-card__logo" src="${sp.logo}" alt="${sp.name}" style="${boxStyle(sp.logoBox)}">
            <p class="ev-card__k">Bonus${pending ? " · locked" : " · active"}</p>
            <p class="ev-card__perks${pending ? " is-locked" : ""}">${sp.buffs.map(([k, v]) => `<span><b>${v}</b> ${k}</span>`).join("")}</p>
            <hr class="ev-card__rule ev-card__rule--a">
            <p class="ev-card__desc">${pending ? `Finish ${sp.challenges.length} challenges before the deadline to activate the bonus.` : sp.desc}</p>
            <hr class="ev-card__rule ev-card__rule--b">
            <div class="ev-card__foot"><span><b>Contract signed</b>${fmtDate(sponsorSignedDate)}</span><span><b>${pending ? "Deadline" : "Remaining"}</b>${left} ${dayWord}</span></div>
            ${CARD_CORNER}
          </div>
          ${sponsorBack(sp, sponsorSignedDate, true)}
        </a>
      `;
    }
  }

  function runSimulateDay() {
    if (isSimulatingDay) return;
    const overlay = api.$("#simulateDayOverlay");
    if (!overlay) return;
    isSimulatingDay = true;

    const animDays = api.$("#simAnimDays");
    const animMonth = api.$("#simAnimMonth");
    const animFit = api.$("#simAnimFitness");
    const animFitVal = api.$("#simAnimFitnessVal");
    const animFitBadge = api.$("#simAnimFitBadge");
    const animFitDim = api.$("#simAnimFitDim");
    const animFitMark = api.$("#simAnimFitMark");

    if (animMonth) animMonth.textContent = MONTHS[simDate.getMonth()].toUpperCase();
    if (animFitVal) animFitVal.textContent = fitness;
    const currentV = Math.min(1, fitness / 61).toFixed(3);
    if (animFit) animFit.style.setProperty("--v", currentV);
    if (animFitDim) animFitDim.style.left = `calc(${currentV} * 100%)`;
    if (animFitMark) animFitMark.style.left = `calc(${currentV} * 100%)`;

    let html = "";
    for (let i = -3; i <= 5; i++) {
      const d = new Date(simDate);
      d.setDate(simDate.getDate() + i);
      const isToday = i === 0;
      const isPast = i < 0;
      html += buildSimOverlayDayHtml(d, isPast, isToday);
    }
    if (animDays) {
      animDays.style.transition = "none";
      animDays.style.transform = "translateX(0px)";
      animDays.innerHTML = html;
    }

    overlay.style.display = "flex";
    overlay.style.opacity = "1";
    overlay.style.transition = "";
    api.rumble(60, 0.25);

    setTimeout(() => {
      const currentTodayEl = animDays?.children?.[3];
      if (currentTodayEl) {
        const scratch = currentTodayEl.querySelector(".sim-day__scratch");
        if (scratch) {
          scratch.classList.add("is-stamping");
        }
        currentTodayEl.classList.remove("is-today");
        currentTodayEl.classList.add("is-past");
        api.rumble(90, 0.4);
      }
    }, 450);

    setTimeout(() => {
      if (animDays) {
        animDays.style.transition = "transform 0.72s cubic-bezier(0.22, 0.9, 0.28, 1)";
        animDays.style.transform = "translateX(-161px)";
      }

      setTimeout(() => {
        const nextTodayEl = animDays?.children?.[4];
        if (nextTodayEl) {
          nextTodayEl.classList.add("is-today", "is-igniting");
        }

        const newFit = Math.min(60, fitness + 5);
        if (animFitVal) animFitVal.textContent = newFit;
        const newV = Math.min(1, newFit / 61).toFixed(3);
        if (animFit) animFit.style.setProperty("--v", newV);
        if (animFitDim) animFitDim.style.left = `calc(${newV} * 100%)`;
        if (animFitMark) animFitMark.style.left = `calc(${newV} * 100%)`;
        if (animFitBadge) {
          animFitBadge.classList.remove("is-pulsing");
          void animFitBadge.offsetWidth;
          animFitBadge.classList.add("is-pulsing");
        }
        api.rumble(60, 0.3);
      }, 350);
    }, 850);

    setTimeout(() => {
      overlay.style.transition = "opacity 0.35s ease";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.style.display = "none";
        overlay.style.opacity = "1";
        overlay.style.transition = "";
        isSimulatingDay = false;

        simDate.setDate(simDate.getDate() + 1);
        api.store.set("simDate", simDate.toISOString());
        if (currentSponsor && sponsorStage === "deadline") {
          sponsorDeadlineLeft = Math.max(0, sponsorDeadlineLeft - 1);
          saveSponsorStage();
          if (sponsorDeadlineLeft === 0) expireSponsor(true, true);
        } else if (currentSponsor) {
          sponsorDaysLeft = Math.max(0, sponsorDaysLeft - 1);
          saveSponsorStage();
          if (sponsorDaysLeft === 0) expireSponsor(true);
        }
        fitness = Math.min(60, fitness + 5);
        api.store.set("fitness", fitness);

        renderFitness();
        renderCalendar();
        renderCards();

        const dateStr = `${DAYS_SHORT[simDate.getDay()]}, ${MONTHS[simDate.getMonth()].slice(0, 3)} ${simDate.getDate()}, ${simDate.getFullYear()}`;
        api.toast(`Day simulated · ${dateStr}`);
        api.log(`Simulate day: ${dateStr} · Fitness ${fitness}`, "action");

        events.advance();
      }, 350);
    }, 2050);
  }

  // what a popup choice does to the career; sim-events.js calls these
  function createEvents() {
    return window.MTX_SIM_EVENTS.create(api, {
      getSimDayCount: () => simDayCount,
      nextDay(min) {
        simDayCount = Math.max(min, simDayCount + 1);
        api.store.set("simDayCount", simDayCount.toString());
      },
      hasSponsor: () => !!currentSponsor,
      hasManager: () => !!currentManager,
      currentManagerName: () => currentManager?.name || "",
      sponsorNote: () => `<b>${currentSponsor.name}</b> · ${sponsorStage === "deadline" ? `deadline in ${sponsorDeadlineLeft} days` : `${sponsorDaysLeft} days left`}`,
      hireManager(id) {
        const mgr = MANAGERS[id];
        if (!mgr) return null;
        currentManager = mgr;
        unlockCard("mgr", mgr.id);
        managerHiredDate = new Date(simDate);
        api.store.set("mtx_personal_manager", id);
        api.store.set("managerHiredDate", managerHiredDate.toISOString());
        renderCards();
        return mgr;
      },
      signSponsor(id) {
        const spon = SPONSORS[id];
        if (!spon) return null;
        const previous = currentSponsor;
        signSponsor(spon);
        renderCards();
        return { spon, previous };
      },
      seenEvent(id) {
        unlockCard("evt", id);
        renderCollectionCard();
      },
      seenScenario(id) {
        unlockCard("scn", id);
        renderCollectionCard();
      },
      // back face of an offer card in the popup (same details as the Management / Collection backs)
      cardBack(kind, id) {
        if (kind === "mgr") return MANAGERS[id] ? managerBack(MANAGERS[id], null) : "";
        return SPONSORS[id] ? sponsorBack(SPONSORS[id], null, false) : "";
      }
    });
  }

  function bindEvents() {
    events.bind();

    api.$$(".main__sim-btn, #s-career .simulate-btn").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        if (e.button === 0) startSimulateHold(btn, "mouse");
      });
      btn.addEventListener("mouseup", () => cancelSimulateHold());
      btn.addEventListener("mouseleave", () => cancelSimulateHold());
      btn.addEventListener("touchstart", () => startSimulateHold(btn, "touch"), { passive: true });
      btn.addEventListener("touchend", () => cancelSimulateHold());
    });

    // Mouse hover moves the focus, so the hint matches what A / a click will do. mousemove, not mouseenter:
    // a mouse left resting on a card must not take the focus back from the pad or keyboard.
    api.$("#managementCards")?.addEventListener("mousemove", e => {
      const el = e.target.closest("[data-nav]");
      if (!el || el === api.getFocused() || isModalOpen() || document.body.classList.contains("layout-editing")) return;
      api.setFocus(el);
    });

    api.$("#resetCareerBtn")?.addEventListener("click", () => resetCareer());
    api.$("#resetAllStorageBtn")?.addEventListener("click", () => {
      localStorage.clear();
      location.reload();
    });
    api.$("#resetAllDesignBtn")?.addEventListener("click", () => {
      api.store.set("layout_overrides", "{}");
      api.store.set("prototype_wires", "{}");
      api.store.set("layout_groups", "[]");
      location.reload();
    });
  }
  //#endregion

  const screenModule = {
    bindApi,
    init,
    enter,
    renderFitness,
    renderCards,
    simulateDay,
    runSimulateDay,
    startSimulateHold,
    cancelSimulateHold,
    finishSimulateHold,
    handleNav,
    handleConfirm,
    handleCancel,
    handleAux,
    isModalOpen,
    isSelectHoldReady,
    startSelectHold,
    cancelSelectHold,
    cancelDeclineHold,
    resetCareer,
    getFitness,
    getSimDate,
    getSponsorDaysLeft,
    isSponsorActive,
    recordFight,
    // dev / testing: open one simulate-day popup directly (manager | sponsor | interview | social | post)
    openEvent: type => events.open(type),
    getSimDayCount,
    actions: {
      flipCard(el) {
        const card = el && el.classList.contains("sim-card") ? el : api.getFocused();
        if (!card || !card.classList.contains("sim-card") || !card.querySelector(".sim-card__face--back")) {
          api.toast("Select the manager or sponsor card");
          return;
        }
        const open = card.classList.toggle("is-flipped");
        if (card.hasAttribute("aria-expanded")) card.setAttribute("aria-expanded", open);
        api.rumble(60, 0.25);
      },
      holdSimulateDay(el) {
        startSimulateHold(el, "action");
      },
      simulateDay
    }
  };

  window.MTX_SCREENS.collection = {
    enter() { if (overlay) closeOverlay(); renderCollection(); },
    // the grid scrolls (Random Event has 21 cards): keep the focused card in view
    focus(el) { el?.closest?.("#collectionGroups") && el.scrollIntoView({ block: "nearest" }); },
    actions: Object.assign({}, screenModule.actions, { colPrevTab: () => stepColTab(-1), colNextTab: () => stepColTab(1), compareCard, openScenario })
  };
  window.MTX_SCREENS.simulation = screenModule;
  window.MTX_SCREENS.management = screenModule;
})();
