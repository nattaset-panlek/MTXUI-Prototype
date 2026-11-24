(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;

  // Reward thumbs: [image in mtx/assets/img, rarity colour]
  // Quest reward key -> item in data/items.js (drawn with MTX_UI.itemCard)
  const REWARD_ITEM = { coins: "r0_3", glove: "r0_0", black: "r0_1", skinA: "r0_4", skinB: "r2_0", legend: "r0_2" };

  // Style mastery: 5 levels, each a set of camp quests. objectives = [text, current, required].
  // A level is cleared by completing its quests: need = how many (default every quest of the level).
  // Each style has its own Style (Mastery) Level and quest count in the player store: only that style's
  // quests count, reaching a level's need unlocks its next Style Level. (No Mastery Points / MP any more.)
  const P = () => window.MTX_PLAYER;
  const curStyle = () => window.MTX_SCREENS.tactical?.getSelStyle?.() || "phranakhon";
  const curLevel = () => (P() ? P().styleOf(curStyle()).level : 2);
  const QUEST_LEVELS = [
    {
      name: "Foundation",
      // one objective per quest (thread #39)
      quests: [
        { name: "Wai Kru Ram Muay", rewards: [["coins", 100]],
          desc: "Every fight begins with respect. Perform the Wai Kru to honour your Kru, your camp and your family before the first bell.",
          objectives: [["Perform the Wai Kru before a fight", 3, 3]] },
        { name: "The Mongkol", rewards: [["coins", 50]],
          desc: "The sacred headband is blessed by your Kru. Wear it into the ring and take it off only after the Wai Kru.",
          objectives: [["Wear the Mongkol into the ring", 1, 1]] },
        { name: "Mat Trong", rewards: [["coins", 100]],
          desc: "The straight punch is the first weapon a Nak Muay learns. Use it to measure the distance.",
          objectives: [["Land jabs (Mat Trong)", 50, 50]] },
        { name: "Teep to the Body", rewards: [["coins", 100]],
          desc: "The push kick keeps the opponent where you want him. Plant it in the stomach and take his rhythm.",
          objectives: [["Land teeps to the body", 30, 30]] },
        { name: "Morning Roadwork", rewards: [["coins", 100]],
          desc: "Camp life starts before sunrise. Run the village road and come back ready for the first pad round.",
          objectives: [["Run before sunrise (km)", 10, 10]] },
        { name: "Skip Rope", rewards: [["coins", 50]],
          desc: "Light feet win long fights. Skip until the rope sings and your calves stop complaining.",
          objectives: [["Skip rope rounds", 6, 6]] },
        { name: "Pads with the Kru", rewards: [["black", 100]],
          desc: "Your Kru holds the pads and calls the combinations. Keep your guard up and finish every round.",
          objectives: [["Finish pad rounds", 5, 5]] },
        { name: "Punch-Kick Combinations", rewards: [["coins", 100]],
          desc: "Hands set up the kick. Chain them together until the combination comes without thinking.",
          objectives: [["Land punch-kick combinations", 20, 20]] },
        { name: "Shin Conditioning", rewards: [["glove", 150]],
          desc: "A hard shin is built one kick at a time. Work the heavy bag until it no longer hurts.",
          objectives: [["Kick the heavy bag", 200, 200]] },
        { name: "Check the Kick", rewards: [["coins", 100]],
          desc: "Lift the knee, turn the shin out and let the kick break on bone. Then answer it.",
          objectives: [["Check incoming kicks", 15, 15]] },
        { name: "Temple Fair Fight", rewards: [["coins", 300], ["skinA", 1]],
          desc: "Your first real bout is on the temple fair card. The village is watching. Win it in front of them.",
          objectives: [["Win your first temple fair bout", 1, 1]] }
      ]
    },
    {
      name: "Weapons of the Eight Limbs",
      quests: [
        { name: "Breaking the Guard", rewards: [["glove", 350], ["black", 350]],
          desc: "A tight guard cannot stop what it does not see. Feint high and break your opponent's guard round by round.",
          objectives: [["Break the guard with a cross-hook combination", 14, 14]] },
        { name: "Open the Ribs", rewards: [["black", 350]],
          desc: "Once the guard comes up, the ribs are open. Turn the hip over and kick through them.",
          objectives: [["Land roundhouse kicks to the open ribs", 8, 14]] },
        { name: "The Sharp Elbow", rewards: [["black", 200], ["coins", 300]],
          desc: "Elbows cut. Learn the slashing Sok Tad, the downward Sok Ti and the spinning Sok Klap.",
          objectives: [["Land elbow strikes", 12, 20]] },
        { name: "First Cut", rewards: [["coins", 200]],
          desc: "One clean elbow in the pocket can end the fight. Find the opening and open the brow.",
          objectives: [["Cut an opponent with an elbow", 0, 1]] },
        { name: "Master of the Clinch", rewards: [["skinB", 1], ["coins", 400]],
          desc: "Inside the Plum the fight is won with posture and knees. Control the neck and drive the knee.",
          objectives: [["Land knees from the clinch", 9, 15]] },
        { name: "Off-Balance", rewards: [["coins", 200]],
          desc: "Turn him, tip him, step away. In the clinch the judges score the fighter who stays on his feet.",
          objectives: [["Off-balance your opponent from the clinch", 2, 5]] },
        { name: "Kick Like a Whip", rewards: [["glove", 500], ["skinA", 1]],
          desc: "The roundhouse kick (Te Tad) turns the hip all the way through. Land it hard enough that the judges hear it.",
          objectives: [["Land roundhouse kicks to the body", 25, 25]] },
        { name: "Check and Return", rewards: [["coins", 200]],
          desc: "Every kick he throws is a chance for yours. Check it and fire straight back.",
          objectives: [["Check incoming kicks", 10, 10]] },
        { name: "The Teep Wall", rewards: [["black", 300]],
          desc: "A good teep stops a charging fighter dead. Use it to interrupt every combination before it starts.",
          objectives: [["Interrupt combinations with a teep", 4, 10]] },
        { name: "Untouched Body", rewards: [["coins", 300]],
          desc: "Keep the distance and the guard tight. Go a whole fight without letting a kick land on your body.",
          objectives: [["Win a fight without taking a body kick", 0, 1]] },
        { name: "Fight Weight", rewards: [["coins", 200]],
          desc: "Five rounds at Lumpinee need lungs. Get your Fitness up before the camp books the fight.",
          objectives: [["Reach Fitness 50 before fight night", 30, 50]] },
        { name: "Lumpinee Debut", rewards: [["legend", 1], ["coins", 500]],
          desc: "Your camp has booked you on a Lumpinee Stadium card. Five rounds, the gamblers at ringside and no second chances.",
          objectives: [["Win a five-round bout at Lumpinee Stadium", 0, 1]] }
      ]
    },
    {
      name: "Mae Mai Muay Thai",
      quests: [
        { name: "Salab Fan Pla", rewards: [["skinA", 1], ["coins", 500]],
          desc: "Mae Mai: zig-zag past the straight punch and answer with the elbow before your opponent can reset.",
          objectives: [["Counter a jab with Salab Fan Pla", 0, 5]] },
        { name: "Pak Look Thoy", rewards: [["black", 400]],
          desc: "Mae Mai: stab the incoming kick with the elbow and make your opponent regret throwing it.",
          objectives: [["Elbow-block an incoming kick", 0, 5]] },
        { name: "Chawa Sad Hok", rewards: [["glove", 400]],
          desc: "Mae Mai: step outside the straight punch and spear the elbow into the ribs.",
          objectives: [["Land Chawa Sad Hok in a fight", 0, 5]] },
        { name: "Inao Thang Krit", rewards: [["coins", 600]],
          desc: "Mae Mai: slip inside the punch and drive the elbow up under the arm like a drawn dagger.",
          objectives: [["Land Inao Thang Krit in a fight", 0, 5]] },
        { name: "Yo Khao Phra Sumen", rewards: [["skinB", 1]],
          desc: "Mae Mai: duck under the hook and lift the uppercut like raising Mount Meru.",
          objectives: [["Counter a hook with an uppercut", 0, 5]] },
        { name: "Ta Then Kham Fak", rewards: [["legend", 1]],
          desc: "Mae Mai: parry the punch away and answer straight down the middle like an old man carrying his load.",
          objectives: [["Parry and counter in one move", 0, 5]] }
      ]
    },
    {
      name: "Look Mai Muay Thai",
      quests: [
        { name: "Mon Yan Lak", rewards: [["glove", 600]],
          desc: "Look Mai: the planted teep that holds the opponent off like a pillar.", objectives: [["Stop a charge with Mon Yan Lak", 0, 5]] },
        { name: "Hak Nguang Ai Ra Wat", rewards: [["black", 600]],
          desc: "Look Mai: catch the kick and break the elephant's trunk at the elbow.", objectives: [["Catch-and-counter a kick", 0, 5]] },
        { name: "Erawan Soei Nga", rewards: [["coins", 800]],
          desc: "Look Mai: the three-headed elephant lifts its tusks, an uppercut from the clinch.", objectives: [["Land an uppercut from the clinch", 0, 5]] },
        { name: "Hanuman Thawai Waen", rewards: [["skinA", 1]],
          desc: "Look Mai: Hanuman presents the ring, a double uppercut through the guard.", objectives: [["Split the guard with a double uppercut", 0, 5]] },
        { name: "Kwang Liao Lang", rewards: [["skinB", 1]],
          desc: "Look Mai: the deer looks back, a spinning back kick on the exit.", objectives: [["Land a spinning back kick", 0, 3]] },
        { name: "Khun Yak Chap Ling", rewards: [["legend", 1]],
          desc: "Look Mai: the giant catches the monkey and throws it to the canvas.", objectives: [["Throw an opponent from the clinch", 0, 5]] }
      ]
    },
    {
      name: "Champion of the Stadium",
      quests: [
        { name: "Rajadamnern Title", rewards: [["legend", 1], ["glove", 800]],
          desc: "Win the belt at the oldest stadium in Bangkok.", objectives: [["Win the Rajadamnern Stadium title", 0, 1]] },
        { name: "Lumpinee Title", rewards: [["legend", 1], ["black", 800]],
          desc: "Win the belt every Nak Muay dreams about.", objectives: [["Win the Lumpinee Stadium title", 0, 1]] },
        { name: "Fight of the Year", rewards: [["skinA", 1], ["coins", 1000]],
          desc: "Give the crowd a war they will still talk about next season.", objectives: [["Win a fight by decision after five full rounds", 0, 1]] },
        { name: "King's Cup", rewards: [["skinB", 1], ["coins", 1000]],
          desc: "Fight for the King's Cup at Sanam Luang on the national stage.", objectives: [["Win the King's Cup tournament", 0, 1]] },
        { name: "Defend the Belt", rewards: [["glove", 1000]],
          desc: "Winning the belt is one thing. Keep it.", objectives: [["Defend your stadium title", 0, 3]] },
        { name: "Become a Kru", rewards: [["legend", 1]],
          desc: "Pass the art on. Train the next generation of your camp.", objectives: [["Train young fighters at your camp", 0, 5]] }
      ]
    }
  ];

  let viewLevel = curLevel(); // 1-based level shown in the list
  let shownStyle = null;      // style the list was last opened for
  let questFocus = 0;            // index in that level's quests
  const tracked = new Set();     // "level:index" of every tracked quest
  const MAX_TRACK = 4;           // thread #38: at most 4 tracked, the Track button shows n/4
  //#endregion

  //#region [Helpers]
  const fmt = n => n.toLocaleString("en-US");
  const pad = n => String(n).padStart(2, "0");
  const objDone = ([, cur, max]) => cur >= max;
  const questDone = q => q.objectives.every(objDone);
  const isLocked = lv => lv > curLevel();
  const needOf = level => level.need || level.quests.length;
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  // the player store uses these targets to unlock Style Levels
  if (window.MTX_PLAYER) window.MTX_PLAYER.CONFIG.styleTargets = QUEST_LEVELS.map(needOf);

  function init(coreApi) {
    api = coreApi;
    // the store count never sits below the quests already done in the list (older saves had MP, no count)
    const lv = QUEST_LEVELS[curLevel() - 1], rowsDone = lv ? lv.quests.filter(questDone).length : 0;
    if (P() && P().styleOf(curStyle()).quests < rowsDone) P().setStyle(curStyle(), { quests: rowsDone });
    P()?.on(() => {
      if (api.getCur() !== "quests") return;
      renderTabs();
      renderList();
      renderQuest();
      renderProgress();
    });
    renderAll();
    api.bind("mqList")?.addEventListener("scroll", syncScroll, { passive: true });   // mouse wheel scrolls the list
    // Not a focus stop: A / Space on a quest row or X anywhere tracks; a click on the button does too.
    api.bind("trackBtn")?.addEventListener("click", () => trackQuest());
    api.bind("mqTabs")?.addEventListener("click", e => {
      const tab = e.target.closest(".mq-tab");
      if (tab) stepLevel(+tab.dataset.level - viewLevel);
    });
  }

  function enter() {
    // another style may be selected: show its own level
    if (shownStyle !== curStyle()) { shownStyle = curStyle(); viewLevel = curLevel(); questFocus = 0; }
    renderAll();
  }

  function focus(el) {
    if (!el) return;
    if (el.classList.contains("mq-row")) {
      questFocus = +el.dataset.index;
      reveal(el);
      renderQuest();
    }
  }

  // the list scrolls (levels 1-2 have 11-12 one-objective quests): keep the focused row in view, thumb follows
  function reveal(row) {
    const list = api.bind("mqList");
    if (!list || !row || !list.contains(row)) return;
    const pad = parseFloat(getComputedStyle(list).paddingTop) || 0;
    const top = row.offsetTop - pad, bottom = row.offsetTop + row.offsetHeight - pad;
    const view = list.clientHeight - 2 * pad;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + view) list.scrollTop = bottom - view;
    syncScroll();
  }
  // bar = the rows' own height (list minus its focus-ring padding), 14 px right of the rows; the bar's margin-top
  // (no-brand shift) is taken out so it lines up with the first row
  function syncScroll() {
    const list = api.bind("mqList"), bar = api.$("#s-quests .quests__scroll"), thumb = api.bind("questThumb");
    if (!list || !bar || !thumb) return;
    const over = list.scrollHeight - list.clientHeight;
    bar.hidden = over <= 1;
    if (bar.hidden) return;
    const lcs = getComputedStyle(list), bcs = getComputedStyle(bar);
    const pad = parseFloat(lcs.paddingTop) || 0, view = list.clientHeight - 2 * pad;
    bar.style.top = list.offsetTop + pad - (parseFloat(bcs.marginTop) || 0) + "px";
    bar.style.left = list.offsetLeft + list.offsetWidth - pad + 14 - (parseFloat(bcs.marginLeft) || 0) + "px";
    bar.style.height = view + "px";
    const h = Math.max(48, Math.round(view * view / (list.scrollHeight - 2 * pad)));
    thumb.style.height = h + "px";
    thumb.style.top = Math.round(list.scrollTop / over * (view - h)) + "px";
  }

  // thread #41: say which level's quests count and why the others are blocked
  function renderSub() {
    const sub = api.bind("mqSub");
    if (!sub) return;
    const cur = curLevel(), last = QUEST_LEVELS.length;
    sub.textContent = viewLevel > cur ? `Level ${pad(viewLevel)} is locked · finish the Level ${pad(cur)} quests first`
      : viewLevel < cur ? `Level ${pad(viewLevel)} cleared · Level ${pad(cur)} quests level up this style`
      : cur >= last ? `Complete the Level ${pad(cur)} quests to master this style`
      : `Complete the Level ${pad(cur)} quests to reach Level ${pad(cur + 1)}`;
  }

  function renderAll() {
    renderProgress();
    renderTabs();
    renderList();
    renderQuest();
  }

  function renderProgress() {
    const level = QUEST_LEVELS[curLevel() - 1];
    // progress = quests done / quests needed to level up (player store count of this style; level.need, default all)
    const need = needOf(level), done = P() ? P().styleOf(curStyle()).quests : level.quests.filter(questDone).length;
    api.bind("mqLevel").textContent = pad(curLevel());
    api.bind("mqPts").innerHTML = `<b>${Math.min(done, need)}</b> | ${need} Quest${need === 1 ? "" : "s"}`;
    api.bind("mqBar").style.setProperty("--p", Math.min(100, done / need * 100).toFixed(1) + "%");
    renderStyle();
  }

  // The big faded word in the progression panel is the style picked on the Tactical screen.
  function renderStyle() {
    const tactical = api.getScreen("tactical");
    const st = tactical?.getStyles?.()[tactical?.getSelStyle?.() || "phranakhon"];
    if (st) api.bind("mqStyleName").textContent = st.title;
  }

  // level tabs are switched with Q / E (LT / RT) only: not focus stops, a click also works
  function renderTabs() {
    const host = api.bind("mqTabs");
    host.innerHTML = QUEST_LEVELS.map((_, i) => {
      const lv = i + 1;
      const hasTracked = [...tracked].some(k => k.startsWith(lv + ":"));   // corner flag only on levels with a tracked quest
      const cls = ["mq-tab", lv === viewLevel ? "is-current" : "", isLocked(lv) ? "is-locked" : "", lv < curLevel() ? "is-cleared" : "", hasTracked ? "has-tracked" : ""].join(" ");
      return `<a class="${cls}" data-level="${lv}" role="tab" aria-selected="${lv === viewLevel}" title="${QUEST_LEVELS[i].name}">${pad(lv)}</a>`;
    }).join("");
  }

  function renderList() {
    const level = QUEST_LEVELS[viewLevel - 1];
    const locked = isLocked(viewLevel);
    // completed quests sink to the bottom (stable order otherwise); rows keep their quest index
    const order = level.quests.map((q, i) => i).sort((a, b) => (!locked && questDone(level.quests[a]) ? 1 : 0) - (!locked && questDone(level.quests[b]) ? 1 : 0) || a - b);
    api.bind("mqList").innerHTML = order.map(i => {
      const q = level.quests[i];
      const state = locked ? "is-locked" : questDone(q) ? "is-done" : "";
      const tr = tracked.has(`${viewLevel}:${i}`) ? " is-tracked" : "";
      return `<a class="mq-row focus-ring focus-ring--3 ${state}${tr}" data-nav data-id="q${i}" data-index="${i}" data-fn="trackQuest" data-nav-right="q${i}">` +
        `<span class="mq-row__state"></span><span class="mq-row__name">${q.name}</span>` + (tr ? `<i class="mq-row__mark" aria-hidden="true"></i>` : "") +
        (state === "is-done" ? `<span class="mq-row__mp">Completed</span>` : "") + `</a>`;
    }).join("");
    // the screen opens on the first row shown (the top unfinished quest)
    const sec = api.screens?.quests;
    if (sec) sec.dataset.first = `q${order[0]}`;
    api.bind("mqList").scrollTop = 0;
    syncScroll();
    renderSub();
  }

  function renderQuest() {
    const level = QUEST_LEVELS[viewLevel - 1];
    const q = level.quests[questFocus];
    if (!q) return;
    const locked = isLocked(viewLevel);
    api.bind("questTitle").textContent = q.name;
    api.bind("questDesc").textContent = locked ? `${q.desc} Unlocks at Mastery Level ${pad(viewLevel)}.` : q.desc;
    api.bind("questObjectives").innerHTML = q.objectives.map(o => {
      const [text, cur, max] = o;
      return `<div class="mq-obj${objDone(o) ? " is-done" : ""}"><span class="mq-obj__box"></span>` +
        `<p class="mq-obj__text">${text}</p><div class="mq-obj__bar"><i style="--p:${(Math.min(cur, max) / max * 100).toFixed(1)}%"></i></div>` +
        `<div class="mq-obj__val">${fmt(Math.min(cur, max))}<span>/${fmt(max)}</span></div></div>`;
    }).join("");
    // Rewards panel removed (2026-11-17); quest rewards data kept in QUEST_LEVELS


    const btn = api.bind("trackBtn"), label = btn.querySelector(".btn-cta__label");
    const done = questDone(q), isTracked = tracked.has(`${viewLevel}:${questFocus}`);
    // Track <-> Untrack is one toggle on A / Space (or a click): Track = Accept Primary (yellow),
    // Untrack = Accept Secondary (dark body, yellow ring) so the tracked state reads at a glance
    btn.classList.toggle("is-done", locked || done);
    btn.classList.toggle("is-locked", locked);
    btn.classList.toggle("btn-cta--secondary", !locked && !done && isTracked);
    label.textContent = locked ? "Locked" : done ? "Completed" : isTracked ? "Untrack" : "Track";
    if (!locked && !done) label.insertAdjacentHTML("beforeend", ` <span class="mq-track__count">${tracked.size}/${MAX_TRACK}</span>`);
    btn.classList.toggle("is-full", !locked && !done && !isTracked && tracked.size >= MAX_TRACK);
  }

  // LT / RT: previous / next mastery level, focus lands on its first quest.
  function stepLevel(dir) {
    const lv = Math.min(QUEST_LEVELS.length, Math.max(1, viewLevel + dir));
    if (lv === viewLevel) return;
    viewLevel = lv;
    renderTabs();
    renderList();
    const first = api.$("#s-quests .mq-row");
    questFocus = first ? +first.dataset.index : 0;
    renderQuest();
    api.setFocus(first);
    api.rumble(50, 0.2);
    if (isLocked(lv)) api.toast(`Mastery Level ${pad(lv)} · ${QUEST_LEVELS[lv - 1].name} · locked`);
  }
  //#endregion

  window.MTX_SCREENS.quests = {
    bindApi,
    init,
    enter,
    focus,
    renderQuest,
    getMasteryLevel: () => curLevel(),
    // dev: complete the next open quest of the current level (objectives filled) and count it in the player store
    completeNext() {
      const level = QUEST_LEVELS[curLevel() - 1], q = level?.quests.find(x => !questDone(x));
      if (!q) { api?.toast?.("Every quest of this level is done"); return true; }
      q.objectives.forEach(o => { o[1] = o[2]; });
      const before = curLevel();
      P()?.addQuestDone(curStyle(), 1);
      api?.toast?.(curLevel() > before ? `${q.name} done · Style Level ${pad(curLevel())} unlocked` : `${q.name} done`);
      if (api?.getCur?.() === "quests") { renderTabs(); renderList(); renderQuest(); renderProgress(); }
      return true;
    },
    actions: {
      prevQuestLevel() { stepLevel(-1); },
      nextQuestLevel() { stepLevel(1); },
      trackQuest
    }
  };

  function trackQuest() {
    const q = QUEST_LEVELS[viewLevel - 1].quests[questFocus];
    if (isLocked(viewLevel)) { api.toast(`Reach Mastery Level ${pad(viewLevel)} to start this quest`); return; }
    if (questDone(q)) { api.toast("Quest already completed"); return; }
    const key = `${viewLevel}:${questFocus}`;
    const on = !tracked.has(key);
    if (on && tracked.size >= MAX_TRACK) { api.toast(`Tracking ${MAX_TRACK}/${MAX_TRACK} quests · untrack one first`); return; }
    if (on) tracked.add(key); else tracked.delete(key);
    const onRow = api.getFocused()?.classList.contains("mq-row");
    renderTabs();
    renderList();
    renderQuest();
    if (onRow) api.setFocus(api.$(`#s-quests .mq-row[data-index="${questFocus}"]`));
    api.rumble(80, 0.3);
    api.toast(on ? `Tracking ${q.name} · ${tracked.size}/${MAX_TRACK}` : `Stopped tracking ${q.name}`);
  }
})();
