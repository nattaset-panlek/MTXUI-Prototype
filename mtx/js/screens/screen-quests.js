(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;

  // Reward thumbs: [image in mtx/assets/img, rarity colour]
  // Quest reward key -> item in data/items.js (drawn with MTX_UI.itemCard)
  const REWARD_ITEM = { coins: "r0_3", glove: "r0_0", black: "r0_1", skinA: "r0_4", skinB: "r2_0", legend: "r0_2" };

  // Style mastery: 5 levels, each a set of camp quests. Mastery Points (mp) come from objective progress;
  // reaching a level's target unlocks the next one. objectives = [text, current, required].
  // Each style has its own Style (Mastery) Level and Mastery Points in the player store: only that style's
  // quests give MP, a full level target (QUEST_LEVELS[].target) unlocks its next Style Level.
  const P = () => window.MTX_PLAYER;
  const curStyle = () => window.MTX_SCREENS.tactical?.getSelStyle?.() || "phranakhon";
  const curLevel = () => (P() ? P().styleOf(curStyle()).level : 2);
  const QUEST_LEVELS = [
    {
      name: "Foundation", target: 2500,
      quests: [
        { name: "Wai Kru Ram Muay", mp: 300, rewards: [["coins", 100]],
          desc: "Every fight begins with respect. Perform the Wai Kru to honour your Kru, your camp and your family before the first bell.",
          objectives: [["Perform the Wai Kru before a fight", 3, 3], ["Wear the Mongkol into the ring", 1, 1]] },
        { name: "Jab and Teep", mp: 400, rewards: [["coins", 150]],
          desc: "The straight punch and the push kick are the first weapons a Nak Muay learns. Use them to control the distance.",
          objectives: [["Land jabs (Mat Trong)", 50, 50], ["Land teeps to the body", 30, 30]] },
        { name: "Morning Roadwork", mp: 300, rewards: [["coins", 100]],
          desc: "Camp life starts before sunrise. Run, skip rope and come back ready for the first pad round.",
          objectives: [["Run before sunrise (km)", 10, 10], ["Skip rope rounds", 6, 6]] },
        { name: "Pads with the Kru", mp: 400, rewards: [["black", 100]],
          desc: "Your Kru holds the pads and calls the combinations. Keep your guard up and finish every round.",
          objectives: [["Finish pad rounds", 5, 5], ["Land punch-kick combinations", 20, 20]] },
        { name: "Shin Conditioning", mp: 500, rewards: [["glove", 150]],
          desc: "A hard shin is built one kick at a time. Work the heavy bag until checking a kick no longer hurts.",
          objectives: [["Kick the heavy bag", 200, 200], ["Check incoming kicks", 15, 15]] },
        { name: "Temple Fair Fight", mp: 600, rewards: [["coins", 300], ["skinA", 1]],
          desc: "Your first real bout is on the temple fair card. The village is watching. Win it in front of them.",
          objectives: [["Win your first temple fair bout", 1, 1]] }
      ]
    },
    {
      name: "Weapons of the Eight Limbs", target: 10000,
      quests: [
        { name: "Breaking the Guard", mp: 1500, rewards: [["glove", 350], ["black", 350], ["black", 350]],
          desc: "A tight guard cannot stop what it does not see. Feint high, open the body and break your opponent's guard round by round.",
          objectives: [["Break the guard with a cross-hook combination", 14, 14], ["Land roundhouse kicks to the open ribs", 8, 14]] },
        { name: "The Sharp Elbow", mp: 1800, rewards: [["black", 200], ["coins", 300]],
          desc: "Elbows cut. Learn the slashing Sok Tad, the downward Sok Ti and the spinning Sok Klap, and finish fights in the pocket.",
          objectives: [["Land elbow strikes", 12, 20], ["Cut an opponent with an elbow", 0, 1]] },
        { name: "Master of the Clinch", mp: 1800, rewards: [["skinB", 1], ["coins", 400]],
          desc: "Inside the Plum the fight is won with posture and knees. Control the neck, off-balance and drive the knee.",
          objectives: [["Land knees from the clinch", 9, 15], ["Off-balance your opponent from the clinch", 2, 5]] },
        { name: "Kick Like a Whip", mp: 2200, rewards: [["glove", 500], ["skinA", 1]],
          desc: "The roundhouse kick (Te Tad) turns the hip all the way through. Land it hard enough that the judges hear it.",
          objectives: [["Land roundhouse kicks to the body", 25, 25], ["Check incoming kicks", 10, 10]] },
        { name: "The Teep Wall", mp: 1200, rewards: [["black", 300]],
          desc: "A good teep stops a charging fighter dead. Use it to interrupt every combination before it starts.",
          objectives: [["Interrupt combinations with a teep", 4, 10], ["Win a fight without taking a body kick", 0, 1]] },
        { name: "Lumpinee Debut", mp: 1500, rewards: [["legend", 1], ["coins", 500]],
          desc: "Your camp has booked you on a Lumpinee Stadium card. Five rounds, the gamblers at ringside and no second chances.",
          objectives: [["Reach Fitness 50 before fight night", 30, 50], ["Win a five-round bout at Lumpinee Stadium", 0, 1]] }
      ]
    },
    {
      name: "Mae Mai Muay Thai", target: 18000,
      quests: [
        { name: "Salab Fan Pla", mp: 3000, rewards: [["skinA", 1], ["coins", 500]],
          desc: "Mae Mai: zig-zag past the straight punch and answer with the elbow before your opponent can reset.",
          objectives: [["Counter a jab with Salab Fan Pla", 0, 5]] },
        { name: "Pak Look Thoy", mp: 3000, rewards: [["black", 400]],
          desc: "Mae Mai: stab the incoming kick with the elbow and make your opponent regret throwing it.",
          objectives: [["Elbow-block an incoming kick", 0, 5]] },
        { name: "Chawa Sad Hok", mp: 3000, rewards: [["glove", 400]],
          desc: "Mae Mai: step outside the straight punch and spear the elbow into the ribs.",
          objectives: [["Land Chawa Sad Hok in a fight", 0, 5]] },
        { name: "Inao Thang Krit", mp: 3000, rewards: [["coins", 600]],
          desc: "Mae Mai: slip inside the punch and drive the elbow up under the arm like a drawn dagger.",
          objectives: [["Land Inao Thang Krit in a fight", 0, 5]] },
        { name: "Yo Khao Phra Sumen", mp: 3000, rewards: [["skinB", 1]],
          desc: "Mae Mai: duck under the hook and lift the uppercut like raising Mount Meru.",
          objectives: [["Counter a hook with an uppercut", 0, 5]] },
        { name: "Ta Then Kham Fak", mp: 3000, rewards: [["legend", 1]],
          desc: "Mae Mai: parry the punch away and answer straight down the middle like an old man carrying his load.",
          objectives: [["Parry and counter in one move", 0, 5]] }
      ]
    },
    {
      name: "Look Mai Muay Thai", target: 30000,
      quests: [
        { name: "Mon Yan Lak", mp: 5000, rewards: [["glove", 600]],
          desc: "Look Mai: the planted teep that holds the opponent off like a pillar.", objectives: [["Stop a charge with Mon Yan Lak", 0, 5]] },
        { name: "Hak Nguang Ai Ra Wat", mp: 5000, rewards: [["black", 600]],
          desc: "Look Mai: catch the kick and break the elephant's trunk at the elbow.", objectives: [["Catch-and-counter a kick", 0, 5]] },
        { name: "Erawan Soei Nga", mp: 5000, rewards: [["coins", 800]],
          desc: "Look Mai: the three-headed elephant lifts its tusks, an uppercut from the clinch.", objectives: [["Land an uppercut from the clinch", 0, 5]] },
        { name: "Hanuman Thawai Waen", mp: 5000, rewards: [["skinA", 1]],
          desc: "Look Mai: Hanuman presents the ring, a double uppercut through the guard.", objectives: [["Split the guard with a double uppercut", 0, 5]] },
        { name: "Kwang Liao Lang", mp: 5000, rewards: [["skinB", 1]],
          desc: "Look Mai: the deer looks back, a spinning back kick on the exit.", objectives: [["Land a spinning back kick", 0, 3]] },
        { name: "Khun Yak Chap Ling", mp: 5000, rewards: [["legend", 1]],
          desc: "Look Mai: the giant catches the monkey and throws it to the canvas.", objectives: [["Throw an opponent from the clinch", 0, 5]] }
      ]
    },
    {
      name: "Champion of the Stadium", target: 50000,
      quests: [
        { name: "Rajadamnern Title", mp: 8000, rewards: [["legend", 1], ["glove", 800]],
          desc: "Win the belt at the oldest stadium in Bangkok.", objectives: [["Win the Rajadamnern Stadium title", 0, 1]] },
        { name: "Lumpinee Title", mp: 8000, rewards: [["legend", 1], ["black", 800]],
          desc: "Win the belt every Nak Muay dreams about.", objectives: [["Win the Lumpinee Stadium title", 0, 1]] },
        { name: "Fight of the Year", mp: 9000, rewards: [["skinA", 1], ["coins", 1000]],
          desc: "Give the crowd a war they will still talk about next season.", objectives: [["Win a fight by decision after five full rounds", 0, 1]] },
        { name: "King's Cup", mp: 9000, rewards: [["skinB", 1], ["coins", 1000]],
          desc: "Fight for the King's Cup at Sanam Luang on the national stage.", objectives: [["Win the King's Cup tournament", 0, 1]] },
        { name: "Defend the Belt", mp: 8000, rewards: [["glove", 1000]],
          desc: "Winning the belt is one thing. Keep it.", objectives: [["Defend your stadium title", 0, 3]] },
        { name: "Become a Kru", mp: 8000, rewards: [["legend", 1]],
          desc: "Pass the art on. Train the next generation of your camp.", objectives: [["Train young fighters at your camp", 0, 5]] }
      ]
    }
  ];

  let viewLevel = curLevel(); // 1-based level shown in the list
  let shownStyle = null;      // style the list was last opened for
  let questFocus = 0;            // index in that level's quests
  const tracked = new Set();     // "level:index" of every tracked quest (any number)
  //#endregion

  //#region [Helpers]
  const fmt = n => n.toLocaleString("en-US");
  const pad = n => String(n).padStart(2, "0");
  const objDone = ([, cur, max]) => cur >= max;
  const questDone = q => q.objectives.every(objDone);
  const isLocked = lv => lv > curLevel();
  // Mastery Points earned on a quest scale with objective progress.
  const questPoints = q => {
    const got = q.objectives.reduce((s, [, c, m]) => s + Math.min(c, m), 0);
    const need = q.objectives.reduce((s, [, , m]) => s + m, 0);
    return Math.round(q.mp * got / need);
  };
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  // the player store uses these targets to unlock Style Levels
  if (window.MTX_PLAYER) window.MTX_PLAYER.CONFIG.styleTargets = QUEST_LEVELS.map(l => l.target);

  function init(coreApi) {
    api = coreApi;
    P()?.on(() => {
      if (api.getCur() !== "quests") return;
      renderTabs();
      renderList();
      renderQuest();
      renderProgress();
    });
    renderAll();
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
      renderQuest();
    }
  }

  function renderAll() {
    renderProgress();
    renderTabs();
    renderList();
    renderQuest();
  }

  function renderProgress() {
    const level = QUEST_LEVELS[curLevel() - 1];
    const pts = P() ? P().styleOf(curStyle()).mp : level.quests.reduce((s, q) => s + questPoints(q), 0);
    api.bind("mqLevel").textContent = pad(curLevel());
    api.bind("mqPts").innerHTML = `<b>${fmt(pts)}</b> | ${fmt(level.target)}`;
    api.bind("mqBar").style.setProperty("--p", Math.min(100, pts / level.target * 100).toFixed(1) + "%");
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
      const cls = ["mq-tab", lv === viewLevel ? "is-current" : "", isLocked(lv) ? "is-locked" : "", lv < curLevel() ? "is-cleared" : ""].join(" ");
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
        `<span class="mq-row__state"></span><span class="mq-row__name">${q.name}</span>` +
        `<span class="mq-row__mp">${state === "is-done" ? "Completed" : `${fmt(q.mp)} MP`}</span></a>`;
    }).join("");
    // the screen opens on the first row shown (the top unfinished quest)
    const sec = api.screens?.quests;
    if (sec) sec.dataset.first = `q${order[0]}`;
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
    api.bind("questRewards").innerHTML =
      q.rewards.slice(0, 2).map(([k, n]) =>
        window.MTX_UI.itemCard(REWARD_ITEM[k], { label: window.MTX_UI.itemLabel("qty", `x${fmt(n)}`), badge: "" }).replace(" data-nav", "")).join("");   // shown only, not focusable

    const n = level.quests.length;
    const thumb = api.bind("questThumb");
    const pos = Math.max(0, api.$$("#s-quests .mq-row").findIndex(r => +r.dataset.index === questFocus));   // row on screen (done quests sit last)
    if (thumb) thumb.style.top = (n > 1 ? pos * (346 - 87) / (n - 1) : 0) + "px";

    const btn = api.bind("trackBtn"), label = btn.querySelector(".btn-cta__label");
    const done = questDone(q), isTracked = tracked.has(`${viewLevel}:${questFocus}`);
    // Track <-> Untrack is one toggle on A / Space (or a click): Track = Accept Primary (yellow),
    // Untrack = Accept Secondary (dark body, yellow ring) so the tracked state reads at a glance
    btn.classList.toggle("is-done", locked || done);
    btn.classList.toggle("is-locked", locked);
    btn.classList.toggle("btn-cta--secondary", !locked && !done && isTracked);
    label.textContent = locked ? "Locked" : done ? "Completed" : isTracked ? "Untrack" : "Track";
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
    if (on) tracked.add(key); else tracked.delete(key);
    const onRow = api.getFocused()?.classList.contains("mq-row");
    renderList();
    renderQuest();
    if (onRow) api.setFocus(api.$(`#s-quests .mq-row[data-index="${questFocus}"]`));
    api.rumble(80, 0.3);
    api.toast(on ? `Tracking ${q.name} · ${tracked.size} tracked` : `Stopped tracking ${q.name}`);
  }
})();
