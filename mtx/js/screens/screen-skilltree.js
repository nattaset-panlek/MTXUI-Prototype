(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const TREE = window.MTX_TREE || { nodes: [], edges: [] };
  const TN = new Map(TREE.nodes.map(n => [n.id, n]));
  const PARENTS = new Map(TREE.nodes.map(n => [n.id, []]));
  const CHILDREN = new Map(TREE.nodes.map(n => [n.id, []]));
  const NEED_LV = new Map();   // "from>to" -> parent level the child needs (v4 data: 1 on every link)
  TREE.edges.forEach(e => {
    PARENTS.get(e.to)?.push(e.from);
    CHILDREN.get(e.from)?.push(e.to);
    NEED_LV.set(e.from + ">" + e.to, e.needLv || 1);
  });

  const TYPE_NAME = { root: "Style core", stat: "Attribute", tier: "Technique", perk: "Perk", dsm: "DSM technique", sgm: "SGM", spe: "SPE" };
  const TYPE_COLOR = { root: "#ed153f", stat: "#e2629a", tier: "#e5e5e5", perk: "#e5e5e5", dsm: "#ed153f", sgm: "#3d7fe0", spe: "#2fb07a" };
  // perk kind by wiki tag (same names / colours as the Tactical Loadout info card)
  const PERK_KIND = { defend: ["Defend perk", "#4da3ff"], attack: ["Attack perk", "#ff4060"], sustain: ["Sustain perk", "#3fd28b"] };
  // perk frame per level = MTX / Perk Frame 719:80514 (1 silver 719:80512, 2 copper 719:80511, 3 gold 719:80513), grid sizes from the loadout
  const LO = "mtx/assets/svg/loadout/";
  // level -> frame file: Lv 1 copper (perk-frame-2), Lv 2 silver (perk-frame-1), Lv 3 gold (perk-frame-3)
  const LV_FRAME = { 1: 2, 2: 1, 3: 3 };
  const PERK_FRAME = { 1: [122, 122, 96, 94], 2: [119, 116, 96, 94], 3: [128, 124, 84, 82] };   // by frame file
  const PERK_SCALE = 0.74;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let skillTotal = 10;
  let unlockRule = "all";
  // owned level per node id: base nodes start at 1; perks go 1-3, every other node is 1 level
  const owned = new Map(TREE.nodes.filter(n => n.base).map(n => [n.id, 1]));
  const equipped = new Set();
  const lvOf = id => owned.get(id) || 0;
  const maxLv = n => n?.levels?.length || 1;
  const costOf = (n, lv) => n?.levels?.[lv - 1]?.cost ?? 1;
  const spent = () => [...owned].reduce((s, [id, lv]) => {
    const n = TN.get(id);
    if (n?.base) return s;
    for (let k = 1; k <= lv; k++) s += costOf(n, k);
    return s;
  }, 0);
  let skillPts = 10;
  let viewLv = 1;   // perk level tab shown in the detail panel (RS cycles it)

  const maxY = Math.max(0, ...TREE.nodes.map(n => n.y));
  const GATES = (() => {
    const ys = [...new Set(TREE.nodes.map(n => n.y))].sort((a, b) => a - b), out = [70];
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] >= 160 && ys[i] < maxY - 100) out.push((ys[i] + ys[i - 1]) / 2);
    }
    return out;
  })();
  const ROOT_DY = -30;
  const THAI_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

  const SKILL_INFO = {
    "DSM Default": ["Phra Nakorn core", "The root of the Phra Nakorn style. Every branch of the tree starts here."],
    "Block Gauge": ["Block Gauge", "Raises the block gauge so your guard holds through longer combos."],
    "Max Stamina": ["Max Stamina", "Increases maximum stamina for longer exchanges."],
    "Critical Damage": ["Critical Damage", "Critical hits deal extra damage."],
    "Stamina Regeneration": ["Stamina Regeneration", "Stamina comes back faster between exchanges."],
    "Finesse Counter": ["Finesse Counter", "A clean counter after a successful parry deals bonus damage."],
    "Restorative Breath": ["Restorative Breath", "Recover stamina while holding your guard in the pocket."],
    "Max Stamina Efficiency": ["Max Stamina Efficiency", "Strikes cost less stamina while it is above half."],
    "SGM": ["Signature Move", "Unlocks a signature move slot for this branch."],
    "SPE": ["Special", "Unlocks a special technique slot for this branch."],
    "Combo Stamina Efficiency": ["Combo Stamina Efficiency", "Combos of three hits or more cost less stamina."],
    "Hop Stamina Efficiency": ["Hop Stamina Efficiency", "Switch-steps and hops cost less stamina."],
    "Combo Power": ["Combo Power", "Each hit in a combo deals more damage than the last."],
    "Triple Rhythm Press": ["Triple Rhythm Press", "A three-beat pressure pattern that breaks the opponent's timing."],
    "Fluid Evasion": ["Fluid Evasion", "Wider evasion window when slipping straight punches."],
    "Knee Power": ["Knee Power", "Knees deal more damage, more again in the clinch."],
    "Punch Power": ["Punch Power", "Punches deal more damage."],
    "Tiger Trap": ["Tiger Trap", "Bait a kick, catch it, and sweep the standing leg."],
    "Counter-Catch Pivot": ["Counter-Catch Pivot", "Catch a body kick and pivot out to the open side."],
    "Relentless Assault": ["Relentless Assault", "Keep pressing forward: every landed strike lowers the opponent's guard."],
    "Elbow Power": ["Elbow Power", "Elbows deal more damage and cut more often."],
    "Steadfast Focus": ["Steadfast Focus", "Stun lasts less and you recover your stance sooner."],
    "Defensive Breaker": ["Defensive Breaker", "Strikes into a raised guard drain more block gauge."],
    "Three-Step Pacing": ["Three-Step Pacing", "Step-in, step-out footwork that resets range after every exchange."],
    "Alternating Breaker": ["Alternating Breaker", "Alternate high and low strikes to crack a closed guard."],
    "Against All Odds": ["Against All Odds", "Deal more damage while your health is low."],
    "Warcry": ["Warcry", "A shout between rounds that restores morale and some stamina."],
    "Flawless Execution": ["Flawless Execution", "A perfect-timing strike deals 1000 damage to the enemy instantly."],
  };

  const DSM_INFO = {
    "มอญยันหลัก": ["Mon Yan Lak", "\"The Mon holds up the pillar\": a straight push kick that stops the rush and opens the counter."],
    "สลับฟันปลา": ["Salab Fan Pla", "\"Fish-tooth zigzag\": slip off the line on the diagonal and answer from the blind side."],
    "จระเข้ฟาดหาง": ["Chorakhe Fad Hang", "\"The crocodile whips its tail\": a spinning back kick that ends the exchange."],
  };

  const KIND = { root: "Style core", stat: "Attribute", tier: "Technique", dsm: "Decisive move", sgm: "Signature move", spe: "Special" };
  const ROMAN = ["", "I", "II", "III"];
  let detailOpen = null;

  const HOLD_DURATION = 1750;
  let lastUnlockTime = 0;
  let hold = null;   // MTX_UI.createHold (4 rumble ticks + flash), made in init
  //#endregion

  //#region [Properties]
  function isDetailOpen() {
    return !!detailOpen;
  }

  function isHoldingUnlockState() {
    return !!hold?.active;
  }

  function getHoldSource() {
    return hold?.source ?? null;
  }

  function getSkillPts() {
    return skillPts;
  }

  function getSkillTotal() {
    return skillTotal;
  }

  // Skill points are earned with S levels (MTX_PLAYER.skillTotal); this only mirrors the player value
  function setSkillTotal(val) {
    skillTotal = Math.max(0, +val || 0);
    updateTree();
  }

  const playerSkillTotal = () => window.MTX_PLAYER ? window.MTX_PLAYER.get().skillTotal : +api.store.get("skillTotal", 10) || 0;

  function setUnlockRule(rule) {
    unlockRule = rule;
    updateTree();
  }

  // ids with at least Lv 1 (callers that only need "is it unlocked")
  function getOwned() {
    return new Set([...owned.keys()]);
  }

  function getLevel(id) {
    return lvOf(id);
  }

  // deep link #own=...: buy the next level of a node when the rules allow it
  function addLevel(id) {
    if (!canLevelUp(id) || skillPts < costOf(TN.get(id), lvOf(id) + 1)) return false;
    owned.set(id, lvOf(id) + 1);
    skillPts = skillTotal - spent();
    return true;
  }

  function getEquipped() {
    return equipped;
  }
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    const ph = api.bind("skillDetail");
    if (ph && window.MTX_UI?.skillInfo) ph.outerHTML = window.MTX_UI.skillInfo.html({ attrs: 'data-bind="skillDetail" hidden', bind: true, primary: "Unlock", secondary: "Remove", cta: true });
    hold = window.MTX_UI.createHold({
      ms: HOLD_DURATION,
      steps: 4,
      startRumble: [30, 0.15],
      flash: "is-unlocked-flash",
      onDone: id => finishUnlockHold(id),
      onCancel: onUnlockCancel
    });
    skillTotal = Math.max(0, playerSkillTotal());
    // S level ups (dev panel, rewards) add Skill points: the tree and the available count follow
    window.MTX_PLAYER?.on(st => {
      if (st.skillTotal === skillTotal) return;
      skillTotal = st.skillTotal;
      updateTree();
    });
    unlockRule = api.store.get("unlockRule", "any");
    if (unlockRule === "all") {
      unlockRule = "any";
      api.store.set("unlockRule", "any");
    }
    buildTree();
    initHoldListeners();
    updateTree();
    const cam = api.bind("treeCamera");
    if (cam) cam.style.transform = "translateY(300px)";
  }

  function enter() {
    closeDetail();
    updateTree();
  }

  function focus(el) {
    if (el && el.classList.contains("tnode")) {
      focusCamera(el.dataset.id);
      renderNodeInfo(el.dataset.id);
      if (detailOpen && detailOpen !== el.dataset.id) {
        cancelUnlockHold();
        detailOpen = el.dataset.id;
        viewLv = defaultViewLv(detailOpen);
        renderDetail();
      }
    }
  }

  function onStyleChanged(style) {
    if (SKILL_INFO["DSM Default"]) SKILL_INFO["DSM Default"][0] = `${style.title} core`;
    TYPE_COLOR.root = style.color;
    TYPE_COLOR.dsm = style.color;
    if (api?.screens?.skilltree?.classList?.contains?.("is-active")) updateTree();
  }

  // a link counts once its parent has the level it asks for (needLv, 1 by default)
  const linkMet = (from, to) => lvOf(from) >= (NEED_LV.get(from + ">" + to) || 1);

  // Lv 1 of a node: only through its designed links (any / all parents, dev panel rule)
  function canUnlock(id) {
    const n = TN.get(id);
    if (!n) return false;
    if (n.base) return true;
    const ps = PARENTS.get(id);
    if (!ps || !ps.length) return false;
    return unlockRule === "all" ? ps.every(p => linkMet(p, id)) : ps.some(p => linkMet(p, id));
  }

  // next level can be bought (ignores skill points): Lv 1 needs a met link, Lv 2-3 need only the level before
  function canLevelUp(id) {
    const n = TN.get(id), lv = lvOf(id);
    if (!n || n.base || lv >= maxLv(n)) return false;
    return lv > 0 || canUnlock(id);
  }

  // removes nodes whose links are no longer met; returns the skill points refunded
  function pruneInvalid() {
    let changed = true, refunded = 0;
    while (changed) {
      changed = false;
      for (const [id, lv] of owned) {
        const n = TN.get(id);
        if (!n?.base && !canUnlock(id)) {
          for (let k = 1; k <= lv; k++) refunded += costOf(n, k);
          owned.delete(id);
          changed = true;
        }
      }
    }
    return refunded;
  }

  function updateTree() {
    skillPts = skillTotal - spent();
    api.$$("#s-skilltree .tnode").forEach(t => {
      const id = t.dataset.id, n = TN.get(id), lv = lvOf(id), own = lv > 0;
      t.classList.toggle("is-owned", own);
      t.classList.toggle("is-equipped", false);
      t.classList.toggle("is-ready", !own && canUnlock(id));
      t.classList.toggle("is-upgradable", own && canLevelUp(id) && skillPts >= costOf(n, lv + 1));
      const nd = t.querySelector(".node");
      if (nd) nd.classList.toggle("is-owned", own);
      if (n?.levels) setPerkFace(t, n, lv);
    });
    api.$$("#s-skilltree .tree__links .lit").forEach(p => {
      const a = linkMet(p.dataset.from, p.dataset.to), b = owned.has(p.dataset.to);
      p.classList.toggle("is-on", a && b);
      p.classList.toggle("is-ready", a && !b);
    });
    api.$$("#s-skilltree .tree-rail i").forEach((g, i) => g.classList.toggle("is-on",
      TREE.nodes.some(n => owned.has(n.id) && !n.base && n.y > GATES[i] && (GATES[i + 1] === undefined || n.y < GATES[i + 1]))));
    const pts = api.bind("skillPts");
    if (pts) pts.textContent = skillPts;
    if (api.focused && api.focused.classList.contains("tnode")) renderNodeInfo(api.focused.dataset.id);
  }

  // level tab the panel opens on: the next level to buy, or the top level when maxed
  const defaultViewLv = id => Math.min(lvOf(id) + 1, maxLv(TN.get(id)));

  // RS: next perk level tab (wraps 3 -> 1)
  function detailLevel() {
    const n = TN.get(detailOpen);
    if (!n?.levels) return false;
    cancelUnlockHold();
    viewLv = viewLv % maxLv(n) + 1;
    renderDetail();
    api.rumble(30, 0.15);
    return true;
  }

  // click a level tab (Lv 1-3) to view it
  function setViewLevel(k) {
    const n = TN.get(detailOpen);
    if (!n?.levels || k < 1 || k > maxLv(n) || k === viewLv) return false;
    cancelUnlockHold();
    viewLv = k;
    renderDetail();
    return true;
  }

  function openDetail(id) {
    cancelUnlockHold();
    detailOpen = id;
    viewLv = defaultViewLv(id);
    api.bind("skillDetail").hidden = false;
    api.screens.skilltree.classList.add("has-detail");
    renderDetail();
    api.rumble(40, 0.2);
  }

  function closeDetail() {
    cancelUnlockHold();
    detailOpen = null;
    api.bind("skillDetail").hidden = true;
    api.screens.skilltree.classList.remove("has-detail");
  }

  // Dev panel test toggle: "hold" = hold A on the CTA, "confirm" = press A, then confirm in a dialog.
  function setUnlockInput(mode) {
    cancelUnlockHold();
    api.store.set("unlockInput", mode);
  }

  function isHoldToUnlockReady() {
    if (api.store.get("unlockInput", "hold") !== "hold") return false;
    if (api.getCur() !== "skilltree" || !detailOpen) return false;
    const n = TN.get(detailOpen), lv = lvOf(detailOpen);
    if (!n || n.base || lv >= maxLv(n)) return false;
    if (n.levels && viewLv !== lv + 1) return false;   // only the tab of the next level can be bought
    return true;
  }

  function startUnlockHold(source) {
    if (!isHoldToUnlockReady()) return false;
    const id = detailOpen, n = TN.get(id);
    if (!canLevelUp(id)) {
      api.rumble(120, 0.2);
      api.toast("Locked · unlock a connected skill first");
      return false;
    }
    if (skillPts < costOf(n, lvOf(id) + 1)) {
      api.rumble(120, 0.2);
      api.toast("No skill points left");
      return false;
    }

    return hold.start(api.bind("sdPrimary"), { ctx: id, source });
  }

  function cancelUnlockHold(notify = false) {
    hold?.cancel(notify);
  }

  // the hold was let go: the label goes back to what the node allows; notify = "Hold A for 1.75s" hint
  function onUnlockCancel({ notify }) {
    const btn = api.bind("sdPrimary");
    const label = btn?.querySelector(".tl-info__label");
    if (label && detailOpen) label.textContent = primaryLabel(detailOpen);
    if (notify) window.MTX_UI.holdHint("unlock (1.75s)");
  }

  // CTA text for the node / perk level tab shown in the panel
  function primaryLabel(id) {
    const n = TN.get(id), lv = lvOf(id);
    if (n?.base) return "Core";
    if (n?.levels) {
      if (viewLv <= lv) return "Unlocked";
      return viewLv === lv + 1 && canLevelUp(id) ? "Unlock" : "Locked";
    }
    return lv ? "Unlocked" : canUnlock(id) ? "Unlock" : "Locked";
  }

  function finishUnlockHold(id) {
    lastUnlockTime = performance.now();
    const n = TN.get(id), lv = lvOf(id) + 1;
    owned.set(id, lv);
    if (detailOpen === id && n.levels) viewLv = defaultViewLv(id);   // next level tab: the same Unlock CTA buys it
    updateTree();
    renderDetail();
    api.rumble(150, 0.6);
    api.toast(n.levels ? `${skillMeta(n).name} Lv ${lv} unlocked` : `${skillMeta(n).name} unlocked`);
  }

  function detailPrimary() {
    const id = detailOpen, n = TN.get(id), lv = lvOf(id);
    if (n.base) {
      api.toast(n.label + " · always unlocked");
      return;
    }
    if (n.levels && viewLv <= lv) { api.toast(`${skillMeta(n).name} Lv ${viewLv} already unlocked`); return; }
    if (n.levels && viewLv > lv + 1) {
      api.rumble(120, 0.2);
      api.toast(`Locked · unlock Lv ${viewLv - 1} first`);
      return;
    }
    if (lv < maxLv(n)) {
      if (!canLevelUp(id)) {
        api.rumble(120, 0.2);
        api.toast("Locked · unlock a connected skill first");
        return;
      }
      const cost = costOf(n, lv + 1);
      if (skillPts < cost) {
        api.rumble(120, 0.2);
        api.toast("No skill points left");
        return;
      }
      if (api.store.get("unlockInput", "hold") === "confirm") {
        const what = n.levels ? `${skillMeta(n).name} Lv ${lv + 1}` : skillMeta(n).name;
        window.MTX_UI.dialog.open({
          title: "Unlock skill?",
          body: `Spend ${cost} Mastery point${cost === 1 ? "" : "s"} to unlock ${what}.`,
          primary: "Unlock",
          secondary: "Cancel",
          onPrimary: () => finishUnlockHold(id)
        });
        return;
      }
      const glyph = api.getGlyphs()[api.getDevice()]?.a || "A";
      api.toast(`Hold ${glyph} for 1.75s to unlock`);
      return;
    }
    api.toast(`${skillMeta(n).name} already unlocked`);
  }

  // X: takes the node down one level (a perk Lv 3 -> 2 ...); children whose link is no longer met are refunded too
  function removeLevel(id) {
    const n = TN.get(id), lv = lvOf(id);
    if (!lv || n.base) return;
    const back = costOf(n, lv);
    if (lv > 1) owned.set(id, lv - 1); else owned.delete(id);
    const extra = pruneInvalid();
    if (detailOpen === id && n.levels) viewLv = defaultViewLv(id);
    updateTree();
    renderDetail();
    api.rumble(60, 0.2);
    const pts = back + extra;
    api.toast(`${skillMeta(n).name} ${n.levels ? (lv > 1 ? `down to Lv ${lv - 1}` : "removed") : "removed"} · ${pts} point${pts === 1 ? "" : "s"} refunded`);
  }

  function detailSecondary() {
    removeLevel(detailOpen);
  }

  function isLinked(a, b) {
    return !!(PARENTS.get(a)?.includes(b) || CHILDREN.get(a)?.includes(b));
  }
  //#endregion

  //#region [Private Methods]
  function buildTree() {
    const nodesEl = api.bind("treeNodes");
    if (!nodesEl) return;
    nodesEl.innerHTML = TREE.nodes.map(n => n.type === "root"
      ? `<a class="tnode tnode--root" data-nav data-id="${n.id}" data-fn="toggleSkill" style="left:${n.x}px;top:${n.y + ROOT_DY}px">
          <span class="tnode__focus" aria-hidden="true"></span><span class="node-core"><span class="node-core__circle"></span><span class="node-core__diamond"></span><img class="node-core__emblem" data-bind="coreEmblem" src="mtx/assets/svg/style-phranakhon-sel.svg" alt=""></span>
          <span class="tnode__label">${esc(n.label)}</span></a>`
      : `<a class="tnode tnode--${n.type}" data-nav data-id="${n.id}" data-fn="toggleSkill" style="left:${n.x}px;top:${n.y}px${moveArt(n) ? `;--fm:url(${moveArt(n).replace(LO, "../assets/svg/loadout/")})` : ""}">
          <span class="tnode__focus" aria-hidden="true"></span>
          <span class="tnode__lock"></span>
          <span class="tnode__star"><i class="glow"></i><i class="edge"></i><i class="fill"></i></span>
          <span class="node"><span class="node__glow"></span><span class="node__shape"></span><span class="node__ring"></span><span class="node__lock"></span><span class="node__figure"></span></span>
          ${moveArt(n) ? `<span class="tnode__move"><img src="${moveArt(n)}" alt=""></span>` : ""}
          ${n.levels ? `<span class="tnode__perk"><img class="tnode__perk-frame" src="${LO}perk-frame-2.svg" alt=""><img class="tnode__perk-icon" src="${LO}perk-icon-${perkIcon(n)}.svg" alt=""></span>` : ""}
          <span class="tnode__label">${esc(n.label)}${n.levels ? ' <em class="tnode__lv"></em>' : ""}</span></a>`).join("");

    const octi = (a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
      if (!dx || !dy) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
      return ay >= ax ? `M${a.x} ${a.y}L${b.x} ${a.y + Math.sign(dy) * ax}L${b.x} ${b.y}`
                      : `M${a.x} ${a.y}L${a.x + Math.sign(dx) * (ax - ay)} ${a.y}L${b.x} ${b.y}`;
    };

    api.bind("treeLinks").innerHTML = TREE.edges.map(e => { const d = octi(TN.get(e.from), TN.get(e.to)); return `<path class="base" d="${d}"/>`; }).join("") +
      TREE.edges.map(e => `<path class="lit" d="${octi(TN.get(e.from), TN.get(e.to))}" data-from="${e.from}" data-to="${e.to}"/>`).join("");

    const hubs = [0, ...GATES.slice(1)].map((g, i) => i === 0 ? 0 : (TREE.nodes.filter(n => n.y > g).sort((p, q) => p.y - q.y)[0] || { y: g }).y);
    api.bind("treeFrames").innerHTML = hubs.map(cy => [240, 360, 480].map(r => `<path d="M0 ${cy - r}L${r * 1.15} ${cy}L0 ${cy + r}L${-r * 1.15} ${cy}Z"/>`).join("")).join("") +
      `<circle cx="0" cy="${ROOT_DY}" r="140"/>`;

    const ORN = [["tl", -138, -139], ["tr", 138, -139], ["bl", -130, 148], ["br", 130, 148], ["top", 0, -246], ["bottom", 0, 246]];
    api.bind("treeOrn").innerHTML = ORN.map(([k, x, y]) => `<img class="tree__orn" src="mtx/assets/svg/skill-orn-${k}.svg" alt="" style="left:${x * 0.6}px;top:${y * 0.6 + ROOT_DY}px;transform:translate(-50%,-50%) scale(.6)">`).join("");
    api.bind("treeGates").innerHTML = GATES.map((y, i) => `<div class="tree__gate" style="top:${y}px"><span>ขั้น ${THAI_NUM[i] || i + 1}</span></div>`).join("");
    const rail = api.bind("treeRail");
    if (rail) rail.innerHTML = GATES.map((y, i) => `<i style="top:${y / (maxY + 60) * 620 - 6}px"></i>`).join("") + "<b></b>";
  }

  // DSM / SPE owned face = the Tactical Loadout D-pad slot art (Decisive dc-slot, Special sp-slot); a / b art alternate
  const MOVE_NODES = { dsm: TREE.nodes.filter(n => n.type === "dsm"), spe: TREE.nodes.filter(n => n.type === "spe") };
  function moveArt(n) {
    if (n.type === "dsm") return `${LO}dc-slot-${(/DSM_B/.test(Object.keys(n.extras).join()) ? "b" : "a")}.svg`;
    if (n.type === "spe") return `${LO}sp-slot-${MOVE_NODES.spe.indexOf(n) % 2 ? "b" : "a"}.svg`;
    return "";
  }

  // perk art: the loadout's 10 perk icons, in tree order (perks 11-14 reuse them; mock art)
  const PERKS_IN_ORDER = TREE.nodes.filter(n => n.levels);
  const perkIcon = n => PERKS_IN_ORDER.indexOf(n) % 10 + 1;

  // owned perk face = MTX / Perk Frame of its level; the label shows "Lv N"
  function setPerkFace(t, n, lv) {
    const fr = t.querySelector(".tnode__perk-frame"), ic = t.querySelector(".tnode__perk-icon"), tag = t.querySelector(".tnode__lv");
    const fk = LV_FRAME[Math.max(1, lv)], [fw, fh, iw, ih] = PERK_FRAME[fk];
    t.style.setProperty("--fm", "url(../assets/svg/loadout/perk-frame-2.svg)");   // ring = plain frame outline for every level (url from mtx/css/)   // resolved from mtx/css/
    if (fr) { fr.src = `${LO}perk-frame-${fk}.svg`; fr.width = Math.round(fw * PERK_SCALE); fr.height = Math.round(fh * PERK_SCALE); }
    if (ic) { ic.width = Math.round(iw * PERK_SCALE); ic.height = Math.round(ih * PERK_SCALE); }
    t.dataset.lv = lv;
    if (tag) tag.textContent = lv ? `Lv ${lv}` : "";
  }

  function renderNodeInfo(id) {
    if (!api.$("#s-skilltree .tree-info")) return;
    const n = TN.get(id), own = owned.has(id), ready = !own && canUnlock(id), lv = lvOf(id);
    api.$("#s-skilltree .tree-info").style.setProperty("--tc", TYPE_COLOR[n.type]);
    const tactical = api.getScreen("tactical");
    const curStyle = tactical?.getSelStyle() || "phranakhon";
    api.bind("tiIcon").src = n.type === "root" ? `mtx/assets/svg/style-${curStyle}-sel.svg` : n.icon;
    api.bind("tiType").textContent = TYPE_NAME[n.type] || n.type;
    api.bind("tiName").textContent = n.label;
    const st = api.bind("tiState");
    st.className = "tree-info__state " + (own ? "is-owned" : ready ? "is-ready" : "is-locked");
    st.textContent = n.levels && own ? `Lv ${lv} / ${maxLv(n)}` : own ? "Unlocked" : ready ? "Ready to unlock" : "Locked";
    api.bind("tiStats").innerHTML = n.levels ? `<dt>Level</dt><dd>${lv} / ${maxLv(n)}</dd>`
      : Object.entries(n.extras).map(([k, v]) => `<dt>${esc(k.replace(/_/g, " "))}</dt><dd>+${esc(v)}</dd>`).join("") || "<dt>No stat bonus</dt><dd></dd>";
    api.bind("tiDesc").textContent = n.levels ? n.levels[Math.max(0, lv - 1)].fx : n.desc;
    const ps = PARENTS.get(id) || [];
    api.bind("tiReq").innerHTML = n.base ? '<li class="is-met">Starting node</li>'
      : ps.map(p => `<li class="${owned.has(p) ? "is-met" : ""}">${esc(TN.get(p).label)}</li>`).join("") +
        (ps.length > 1 ? `<li style="color:var(--text-dim)">${unlockRule === "all" ? "Needs all of these" : (ready ? "Requirement met (connected)" : "Needs any one connected")}</li>` : "");
    api.bind("tiAction").textContent = n.base ? "Always unlocked" : own ? "A · Remove (refunds this and dependent skills)"
      : ready ? (skillPts ? `A · Unlock (1 point, ${skillPts} left)` : "No skill points left") : "Unlock the required skills first";
  }

  function focusCamera(id) {
    const n = TN.get(id), cam = api.bind("treeCamera");
    if (!n || !cam) return;
    const H = 1080, TOP = 300, BOTTOM = 230;
    const ty = Math.max(Math.min(H / 2 + 20 - n.y, TOP), H - BOTTOM - maxY);
    cam.style.transform = `translateY(${ty}px)`;
    const rail = api.$("#s-skilltree .tree-rail b");
    if (rail) rail.style.top = n.y / (maxY + 60) * 620 + "px";
  }

  function gateOf(y) {
    let g = 0;
    GATES.forEach((gy, i) => { if (y > gy) g = i; });
    return g;
  }

  function jumpGate(step) {
    const f = api.getFocused?.(), cur = f && TN.get(f.dataset.id);
    const g = (gateOf(cur ? cur.y : 0) + step + GATES.length) % GATES.length; // wraps at both ends
    const first = TREE.nodes.filter(n => gateOf(n.y) === g && !n.base).sort((p, q) => p.y - q.y || Math.abs(p.x) - Math.abs(q.x) || p.x - q.x)[0]
      || (g === 0 && TREE.nodes.find(n => n.base));
    if (first) api.setFocus(api.$(`#s-skilltree .tnode[data-id="${first.id}"]`));
    api.toast(`ขั้น ${THAI_NUM[g] || g + 1}`);
  }

  function skillMeta(n) {
    if (n.levels) {
      const [kind] = PERK_KIND[n.tag] || ["Perk"];
      return { name: n.label, desc: n.levels[0].fx, tier: lvOf(n.id), sub: kind, score: [150, 150, 250, 350][lvOf(n.id)] };
    }
    const tier = +((/Tier (\d)/.exec(n.label) || [])[1] || 0);
    const base = n.label.replace(/\s*Tier \d$/, "");
    if (n.type === "dsm") {
      const thai = Object.keys(DSM_INFO).find(k => n.label.includes(k)), code = (/DSM ([ABC])/.exec(n.label) || [])[1];
      const [name, desc] = DSM_INFO[thai] || [base, ""];
      return { name, desc, tier, sub: `${thai} · DSM ${code} · Tier ${ROMAN[tier] || tier}`, score: [0, 350, 500, 700][tier] || 350 };
    }
    const [name, desc] = SKILL_INFO[base] || [base, n.desc];
    const score = { root: 0, stat: 100, tier: [0, 150, 250, 350][tier], sgm: 400, spe: 450 }[n.type] ?? 150;
    return { name, desc, tier, sub: tier ? `Tier ${ROMAN[tier]}` : KIND[n.type], score };
  }

  // Mastery data for a move shown elsewhere (Character Customize > Style preset).
  //   decisive  DSM family matched by name (Mon Yan Lak = DSM A ...), tiers I-III
  //   signature / special  the tree's SGM / SPE slot nodes, by slot order
  //   perk      technique family matched by name (Finesse Counter Tier 1-3 ...)
  // Returns null when the move is not part of the tree.
  function getMastery(cat, name, i) {
    const byY = (a, b) => a.y - b.y || a.x - b.x;
    let nodes = [];
    if (cat === "decisive") {
      const thai = Object.keys(DSM_INFO).find(k => DSM_INFO[k][0] === name);
      if (thai) nodes = TREE.nodes.filter(n => n.type === "dsm" && n.label.startsWith(thai)).sort(byY);
    } else if (cat === "signature" || cat === "special") {
      const slots = TREE.nodes.filter(n => n.type === (cat === "signature" ? "sgm" : "spe")).sort(byY);
      if (slots.length) nodes = [slots[i % slots.length]];
    } else if (cat === "perk") {
      const p = TREE.nodes.find(n => n.levels && n.label === name);
      if (!p) return null;
      const lv = lvOf(p.id), [kind] = PERK_KIND[p.tag] || ["Perk"];
      return {
        kind, name: p.label, desc: p.levels[Math.max(0, lv - 1)].fx, code: "", icon: p.icon,
        tiers: maxLv(p), owned: lv, level: lv, levels: p.levels, stats: [],
        next: lv >= maxLv(p) ? "Fully unlocked" : canLevelUp(p.id) ? `Lv ${lv + 1} ready to unlock in Mastery Skill` : "Locked · unlock earlier skills first"
      };
    }
    if (!nodes.length) return null;
    const first = nodes[0], m = skillMeta(first);
    const ownedTiers = nodes.filter(n => owned.has(n.id)).length;
    const next = nodes.find(n => !owned.has(n.id));
    const stats = {};
    nodes.filter(n => owned.has(n.id)).forEach(n => Object.entries(n.extras).forEach(([k, v]) => { stats[k] = Math.max(stats[k] || 0, v); }));
    const base = Object.keys(stats).length ? stats : first.extras;
    return {
      kind: KIND[first.type],
      name: cat === "signature" || cat === "special" ? name : m.name,
      desc: cat === "signature" || cat === "special"
        ? `${m.desc} Slot ${(i % TREE.nodes.filter(n => n.type === first.type).length) + 1} of the Mastery tree.`
        : m.desc,
      code: first.type === "dsm" ? `DSM ${(/DSM ([ABC])/.exec(first.label) || [])[1]}` : "",
      icon: first.icon,
      tiers: nodes.length,
      owned: ownedTiers,
      stats: Object.entries(base).map(([k, v]) => [k.replace(/_/g, " "), "+" + v]),
      next: next ? (canUnlock(next.id) ? "Ready to unlock in Mastery Skill" : "Locked · unlock earlier skills first") : "Fully unlocked"
    };
  }

  // Long names ("Combo Stamina Efficiency") shrink until they fit the title's two lines.
  function fitDetailTitle(el, text) {
    el.textContent = text;
    el.style.fontSize = el.style.lineHeight = "";
    const limit = parseFloat(getComputedStyle(el).maxHeight) + 4; // glyphs overhang the line box by a few px
    for (let size = 46; size > 26 && el.scrollHeight > limit; size -= 2) {
      el.style.fontSize = size - 2 + "px";
      el.style.lineHeight = Math.round((size - 2) * 38 / 46) + "px";
    }
  }

  // highlight numbers in effect text (same look as the Tactical Loadout card)
  const fxHtml = t => esc(t).replace(/[+-]?d+(?:.d+)?%?/g, m => `<b class="tl-num">${m}</b>`);

  // detail panel = shared skill info card (components/skill-info.js, MTX / Perk Info Card 719:89368)
  function renderDetail() {
    const id = detailOpen;
    if (!id) return;
    const n = TN.get(id), m = skillMeta(n), lv = lvOf(id), own = lv > 0, perk = !!n.levels;
    // perk: level tabs Lv 1-3 (RS / click), CTA buys only the next level
    const tabOwned = perk ? viewLv <= lv : own;
    const ready = perk ? viewLv === lv + 1 && canLevelUp(id) : !own && canUnlock(id);
    const panel = api.bind("skillDetail");
    const col = perk ? (PERK_KIND[n.tag] || [, "#e5e5e5"])[1] : n.type === "dsm" ? "#ff4060" : n.type === "spe" ? "#c7f029" : TYPE_COLOR[n.type];
    panel.style.setProperty("--tc", col);
    panel.style.setProperty("--style-color", col);
    panel.style.setProperty("--style-fg", "#16181f");
    api.bind("sdKind").textContent = perk ? m.sub : KIND[n.type];
    api.bind("sdBadge").textContent = n.base ? "Core" : perk ? (own ? `Owned Lv${lv}` : "Locked") : own ? "Owned" : "Locked";
    fitDetailTitle(api.bind("sdName"), m.name);
    const draw = api.bind("sdDraw");
    panel.querySelectorAll("[data-i-lv]").forEach(x => { x.hidden = !perk; });
    panel.classList.toggle("is-perk", perk);
    if (perk) {
      const L = n.levels[viewLv - 1];
      window.MTX_UI.skillInfo.levels(panel, viewLv, lv);
      api.bind("sdDesc").innerHTML = fxHtml(L.fx);
      draw.textContent = L.drawback || "";
      draw.hidden = !L.drawback;
      api.bind("sdStats").innerHTML = n.cooldown ? `<div><dt>Cooldown</dt><dd>${esc(n.cooldown)}s</dd></div>` : "";
    } else {
      draw.hidden = true;
      api.bind("sdDesc").textContent = m.desc;
      api.bind("sdStats").innerHTML = Object.entries(n.extras).map(([k, v]) => `<div><dt>${esc(k.replace(/_/g, " "))}</dt><dd>+${esc(v)}</dd></div>`).join("");
    }
    const btn = api.bind("sdPrimary");
    btn.classList.toggle("is-locked", !tabOwned && !ready && !n.base);
    btn.classList.toggle("is-ready-unlock", !tabOwned && ready);
    btn.classList.toggle("is-done", tabOwned || !!n.base);
    btn.querySelector(".tl-info__label").textContent = primaryLabel(id);
    const sec = api.bind("sdSecondary");
    sec.hidden = n.base || !own;
    sec.lastElementChild.textContent = "Remove";
  }

  function initHoldListeners() {
    const sdPri = api.bind("sdPrimary");
    if (sdPri) {
      sdPri.addEventListener("mousedown", e => {
        if (e.button !== 0) return;
        if (isHoldToUnlockReady()) {
          api.setDevice?.("kb");
          api.logIn?.("Hold Click");
          startUnlockHold("mouse");
        }
      });
      sdPri.addEventListener("mouseleave", () => {
        if (hold?.active && hold.source === "mouse") {
          cancelUnlockHold(true);
        }
      });
      sdPri.addEventListener("touchstart", () => {
        if (isHoldToUnlockReady()) {
          startUnlockHold("touch");
        }
      }, { passive: true });
    }
    addEventListener("mouseup", () => {
      if (hold?.active && (hold.source === "mouse" || hold.source === "touch")) {
        cancelUnlockHold(true);
      }
    });
    addEventListener("touchend", () => {
      if (hold?.active && hold.source === "touch") {
        cancelUnlockHold(true);
      }
    });
    addEventListener("touchcancel", () => {
      if (hold?.active && hold.source === "touch") {
        cancelUnlockHold(false);
      }
    });
  }

  //#endregion

  window.MTX_SCREENS.skilltree = {
    bindApi,
    init,
    enter,
    focus,
    onStyleChanged,
    buildTree,
    updateTree,
    openDetail,
    closeDetail,
    detailPrimary,
    detailSecondary,
    isDetailOpen,
    isHoldingUnlock: isHoldingUnlockState,
    getHoldSource,
    isHoldToUnlockReady,
    startUnlockHold,
    cancelUnlockHold,
    finishUnlockHold,
    canUnlock,
    pruneInvalid,
    isLinked,
    getSkillPts,
    getSkillTotal,
    setSkillTotal,
    setUnlockRule,
    setUnlockInput,
    getOwned,
    getLevel,
    addLevel,
    canLevelUp,
    detailLevel,
    setViewLevel,
    getEquipped,
    getMastery,
    actions: {
      toggleSkill(el) { openDetail(el.dataset.id); },
      toggleSkillDirect(el) {
        const id = el.dataset.id, n = TN.get(id);
        if (n.base) { api.toast(n.label + " · always unlocked"); return; }
        // direct mode: A buys the next level; a maxed node is taken down one level
        if (lvOf(id) >= maxLv(n)) { removeLevel(id); return; }
        if (!canLevelUp(id)) {
          api.rumble(120, 0.2);
          return;
        }
        if (skillPts < costOf(n, lvOf(id) + 1)) { api.rumble(120, 0.2); api.toast("No skill points left · remove a skill"); return; }
        owned.set(id, lvOf(id) + 1); updateTree(); api.rumble(90, 0.4);
        api.toast(`${n.label}${n.levels ? " Lv " + lvOf(id) : ""} unlocked · ${skillPts} point${skillPts === 1 ? "" : "s"} left`);
      },
      prevGate() { jumpGate(-1); },
      nextGate() { jumpGate(1); },
      coreInfo() {
        const tactical = api.getScreen("tactical");
        const curStyle = tactical?.getSelStyle() || "phranakhon";
        const styles = tactical?.getStyles() || {};
        api.toast((styles[curStyle]?.title || "Style") + " core · always unlocked");
      }
    }
  };
})();
