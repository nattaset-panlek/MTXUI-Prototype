(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  // v6 data (tools/skilltree/build-v6.mjs -> mtx/js/data/skills-data.js): 5 styles, one tree each; the shown tree follows
  // the selected Tactical style (useStyle). window.MTX_TREE = that style's tree (Attributes feed + older callers read it).
  // Node y = depth from the core; layout.dir "up" draws the core at the bottom (DY below), logic keeps using depth.
  const SKILLS = window.MTX_SKILLS || { styles: {}, styleOrder: [], layout: {} };
  const FLIP = SKILLS.layout?.dir === "up";
  let styleId = null;
  let TREE = { nodes: [], edges: [] }, TN = new Map(), PARENTS = new Map(), CHILDREN = new Map();
  const NEED_LV = new Map();   // "from>to" -> parent level the child needs
  function loadTree(id) {
    TREE = SKILLS.styles[id] || SKILLS.styles[SKILLS.styleOrder[0]] || TREE;
    styleId = TREE.id || id;
    window.MTX_TREE = TREE;
    TN = new Map(TREE.nodes.map(n => [n.id, n]));
    PARENTS = new Map(TREE.nodes.map(n => [n.id, []]));
    CHILDREN = new Map(TREE.nodes.map(n => [n.id, []]));
    NEED_LV.clear();
    TREE.edges.forEach(e => {
      PARENTS.get(e.to)?.push(e.from);
      CHILDREN.get(e.from)?.push(e.to);
      NEED_LV.set(e.from + ">" + e.to, e.needLv || 1);
    });
  }
  loadTree(SKILLS.styleOrder[0]);

  const TYPE_NAME = { root: "Style core", stat: "Attribute", tier: "Technique", perk: "Perk", dsm: "DSM technique", sgm: "SGM", spe: "SPE" };
  // type colours = Node Detail card (Figma 833:93841); root follows the style colour
  const TYPE_COLOR = { root: "#ed153f", stat: "#3fd28b", tier: "#e5e5e5", perk: "#e5e5e5", dsm: "#ff4060", sgm: "#4da3ff", spe: "#c7f029" };
  // perk kind by wiki tag (same names / colours as the Tactical Loadout info card)
  const PERK_KIND = { defend: ["Defend perk", "#4da3ff"], attack: ["Attack perk", "#ff4060"], sustain: ["Sustain perk", "#3fd28b"] };
  // perk frame per level = MTX / Perk Frame 719:80514 (1 silver 719:80512, 2 copper 719:80511, 3 gold 719:80513), grid sizes from the loadout
  const LO = "mtx/assets/svg/loadout/";
  // level -> frame file: Lv 1 copper (perk-frame-2), Lv 2 silver (perk-frame-1), Lv 3 gold (perk-frame-3)
  const LV_FRAME = { 1: 2, 2: 1, 3: 3 };
  const PERK_FRAME = { 1: [122, 122, 96, 94], 2: [119, 116, 96, 94], 3: [128, 124, 84, 82] };   // by frame file
  const PERK_SCALE = 0.74;
  const PERK_FRAME_SVG = { 1: [124, 122], 2: [120, 117], 3: [129, 124] };   // svg viewBox sizes of perk-frame-N (detail card)
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let skillTotal = 10;
  let unlockRule = "all";
  // owned level per node id: base nodes start at 1; perks go 1-3, every other node is 1 level
  // owned level per style lives in MTX_SKILLSTATE (shared with the Tactical Loadout); equipped = in the style's Loadout preset
  let owned = window.MTX_SKILLSTATE ? window.MTX_SKILLSTATE.owned(styleId) : new Map(TREE.nodes.filter(n => n.base).map(n => [n.id, 1]));
  const LOADOUT = () => window.MTX_LOADOUT;
  const isEquipped = id => !!LOADOUT()?.isEquipped?.(styleId, id);
  const eqLevel = id => LOADOUT()?.equippedLevel?.(styleId, id) || 0;   // perk: level it is equipped at (Loadout state)
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

  const maxY = Math.max(0, ...TREE.nodes.map(n => n.y));   // same rows for every style (one layout graph)
  const DY = y => FLIP ? maxY - y : y;   // depth -> drawn y
  const GATES = (() => {
    const ys = [...new Set(TREE.nodes.map(n => n.y))].sort((a, b) => a - b), out = [70];
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] >= 160 && ys[i] < maxY - 100) out.push((ys[i] + ys[i - 1]) / 2);
    }
    return out;
  })();
  const ROOT_DY = -30;
  const THAI_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

  // v5 data (wiki "Skill Tree PhraNakorn"): node.kind = core | attribute | perk | decisive | signature | special
  const KIND_LABEL = { core: "Style core", attribute: "Attribute", perk: "Perk", decisive: "Decisive Move", signature: "Signature Move", special: "Special Move" };
  const FAMILIES = () => TREE.families || {};
  const isMove = n => n.kind === "decisive" || n.kind === "signature" || n.kind === "special";
  // tree / toast name: decisive tiers carry their tier ("Mon Yan Lak T1")
  const nodeLabel = n => n.kind === "decisive" ? `${n.name} T${n.tier}` : n.name;
  let coreName = "Phra Nakorn core";
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
    return new Set(TREE.nodes.filter(n => isEquipped(n.id)).map(n => n.id));
  }
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    api.screens?.skilltree?.addEventListener("wheel", wheelCamera, { passive: false });
    const ph = api.bind("skillDetail");
    if (ph && window.MTX_UI?.nodeDetail) ph.outerHTML = window.MTX_UI.nodeDetail.html({ attrs: 'data-bind="skillDetail" hidden' });
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
    if (FLIP) setCamera(clampCam(CAM_H / 2 + 20 - DY(0)), DY(0));   // core at the bottom: open on it
    else { const cam = api.bind("treeCamera"); if (cam) cam.style.transform = "translateY(300px)"; }
  }

  function enter() {
    closeDetail();
    syncStyle();
    updateTree();
  }

  // the tree shown = the selected Tactical style; swaps data, nodes, links and the background tint
  function syncStyle() {
    const id = api?.getScreen?.("tactical")?.getSelStyle?.() || styleId;
    return useStyle(id);
  }
  function useStyle(id) {
    const scr = api?.screens?.skilltree;
    if (scr) scr.dataset.treeStyle = id;
    if (!SKILLS.styles[id] || id === styleId) return false;
    cancelUnlockHold?.();
    closeDetail();
    loadTree(id);
    owned = window.MTX_SKILLSTATE ? window.MTX_SKILLSTATE.owned(styleId) : new Map(TREE.nodes.filter(n => n.base).map(n => [n.id, 1]));
    const root = TREE.nodes.find(n => n.kind === "core");
    if (scr && root) scr.dataset.first = root.id;
    buildTree();
    updateTree();
    if (root) focusCamera(root.id);
    return true;
  }

  function focus(el) {
    if (el && el.classList.contains("tnode")) {
      focusCamera(el.dataset.id);
      renderNodeInfo(el.dataset.id);
      if (detailOpen && detailOpen !== el.dataset.id) {
        cancelUnlockHold();
        detailOpen = el.dataset.id;
        viewLv = defaultViewLv(detailOpen);
        followVideo();
        renderDetail();
      }
    }
  }

  function onStyleChanged(style) {
    coreName = `${style.title} core`;
    TYPE_COLOR.root = style.color;
    if (!api) return;
    if (!syncStyle() && api.screens?.skilltree?.classList?.contains?.("is-active")) updateTree();
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
    window.MTX_SKILLSTATE?.save();   // shared with the Tactical Loadout (each style spends its own points from the same total)
    api.$$("#s-skilltree .tnode").forEach(t => {
      const id = t.dataset.id, n = TN.get(id), lv = lvOf(id), own = lv > 0;
      t.classList.toggle("is-owned", own);
      t.classList.toggle("is-equipped", own && isEquipped(id));   // yellow diamond tag, top right (user 2026-11-18)
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
    const f = api.getFocused?.();
    if (f && f.classList.contains("tnode")) renderNodeInfo(f.dataset.id);
  }

  // tabs in the detail card: perk Lv 1-3, decisive Tier 1-3 (the family's tier nodes); others none
  // Skill Tree: a Decisive node shows only itself (no Tier tabs; each tier is its own node, bought on its own) - user 2026-11-17
  const tierIds = n => n?.kind === "decisive" ? [n.id] : null;
  const tabCount = n => n?.levels ? maxLv(n) : 0;   // only perks have Lv tabs
  // tab the card opens on: perk = next level to buy (top when maxed), decisive = the node's own tier
  const defaultViewLv = id => {
    const n = TN.get(id);
    return n?.kind === "decisive" ? 1 : Math.min(lvOf(id) + 1, maxLv(n));
  };

  // LB / RB (step -1 / +1): previous / next Lv or Tier tab, wraps; RS (no step) = next
  function detailLevel(step = 1) {
    const n = TN.get(detailOpen), k = tabCount(n);
    if (!k) return false;
    cancelUnlockHold();
    viewLv = (viewLv - 1 + step + k) % k + 1;
    renderDetail();
    api.rumble(30, 0.15);
    return true;
  }

  // click a level tab to view it
  function setViewLevel(k) {
    const n = TN.get(detailOpen);
    if (k < 1 || k > tabCount(n) || k === viewLv) return false;
    cancelUnlockHold();
    viewLv = k;
    renderDetail();
    return true;
  }

  // what the card's CTA acts on for the tab shown: { id, lv } = buy level lv of node id
  function viewTarget() {
    const n = TN.get(detailOpen);
    if (n?.kind === "decisive") return { id: tierIds(n)[viewLv - 1] || n.id, lv: 1 };
    return { id: detailOpen, lv: n?.levels ? viewLv : 1 };
  }

  // Y on a move (card with the VIDEO badge): Video Panel over the screen (Figma 827:93068); Y / B close it
  const V = () => window.MTX_UI.nodeDetail.video;
  function detailVideo() {
    if (V().isOpen()) { closeVideo(); return true; }
    const n = TN.get(detailOpen);
    if (!n || !isMove(n)) return false;
    cancelUnlockHold();
    V().open(api.screens.skilltree, { name: n.name, kind: n.kind, label: KIND_LABEL[n.kind], src: n.video || "" });
    renderDetail();                                         // card: "Hide video" hint, "Playing" badge
    api.rumble(30, 0.15);
    return true;
  }
  function closeVideo() {
    if (!V().isOpen()) return false;
    V().close();
    if (detailOpen) renderDetail();
    api.rumble(20, 0.1);
    return true;
  }
  const isVideoOpen = () => !!window.MTX_UI?.nodeDetail?.video.isOpen();
  // popup variant takes every input; the side panel leaves the tree live
  const isVideoBlocking = () => !!window.MTX_UI?.nodeDetail?.video.isBlocking?.();
  // side panel open while moving to another node: a move swaps the clip, anything else closes it
  function followVideo() {
    if (!V().isOpen() || V().isBlocking()) return;
    const n = TN.get(detailOpen);
    if (n && isMove(n)) V().open(api.screens.skilltree, { name: n.name, kind: n.kind, label: KIND_LABEL[n.kind], src: n.video || "" });
    else V().close();
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
    window.MTX_UI?.nodeDetail?.video.close();
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
    if (api.getCur() !== "skilltree" || !detailOpen || isVideoBlocking()) return false;   // video popup open: no unlock hold
    const { id, lv } = viewTarget(), n = TN.get(id);
    if (!n || n.base || lvOf(id) >= maxLv(n)) return false;
    return lv === lvOf(id) + 1;   // only the next level (perk) / an unowned tier or node can be bought
  }

  function startUnlockHold(source) {
    if (!isHoldToUnlockReady()) return false;
    const { id } = viewTarget(), n = TN.get(id);
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
    const label = api.bind("sdPrimary")?.querySelector(".tl-info__label");
    if (label && detailOpen) label.textContent = ctaOf().label;
    if (notify) window.MTX_UI.holdHint("unlock (1.75s)");
  }

  // CTA for the tab shown (Figma 833:93841): not owned = Unlock (or Locked); owned Attribute = Unlocked (passive),
  // owned move / perk = Equip; core = Core
  function ctaOf() {
    const { id, lv } = viewTarget(), n = TN.get(id);
    if (!n) return { label: "", state: "locked" };
    if (n.base && !n.granted) return { label: "Core", state: "done" };
    if (lv <= lvOf(id)) {
      if (n.kind === "attribute") return { label: "Unlocked", state: "done" };
      if (n.levels) {   // perk: equip the level of the tab shown; another equipped level = switch
        const eq = eqLevel(id);
        return eq === lv ? { label: "Equipped", state: "done" } : { label: "Equip", state: "equip" };   // button text stays plain (user 2026-11-18); the Lv tab shows the level
      }
      return { label: isEquipped(id) ? "Equipped" : "Equip", state: isEquipped(id) ? "done" : "equip" };
    }
    return lv === lvOf(id) + 1 && canLevelUp(id) ? { label: "Unlock", state: "ready" } : { label: "Locked", state: "locked" };
  }

  // every unlock / level up: a light ring spreads from the node through the tier ornament (masked to its lines; user 2026-11-17)
  const vfxOff = k => api?.screens?.skilltree?.classList.contains("no-vfx-" + k);   // Dev > Skill tree VFX toggles
  function yantraRipple(id) {
    requestAnimationFrame(() => nodeForge(id));
    if (vfxOff("ripple") || vfxOff("ornament")) return;   // after updateTree, so the burst copies the new (owned) face
    const orn = api.$("#s-skilltree .tree__yantra"), n = TN.get(id);
    if (!orn || !n || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // the ornament and its ripples are shifted by the parallax (--plx on the camera), so take it off to land on the node (user 2026-11-17)
    const plx = parseFloat(api.bind("treeCamera")?.style.getPropertyValue("--plx")) || 0;
    const cx = n.x - parseFloat(orn.style.left), cy = DY(n.y) + (n.type === "root" ? ROOT_DY : 0) - parseFloat(orn.style.top) - plx;
    const r = document.createElement("i");
    r.className = "tree__ripple";
    r.style.setProperty("--cx", cx + "px");
    r.style.setProperty("--cy", cy + "px");
    ["left", "top", "width", "height"].forEach(k => r.style[k] = orn.style[k]);   // own layer (screen blend), same box as the ornament
    r.addEventListener("animationend", () => r.remove());
    orn.after(r);
  }

  // node "forge" hit on unlock / level up: flat flash + one focus-ring copy that grows and fades; no sparks / glow (user 2026-11-17)
  function nodeForge(id) {
    if (vfxOff("forge")) return;
    const t = api.$(`#s-skilltree .tnode[data-id="${id}"]`), ring = t?.querySelector(".tnode__focus");
    if (!t || !ring || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // perks scale with the level just bought (user 2026-11-17): Lv N = N ring blinks (beats, no growing), stronger flash
    const lv = TN.get(id)?.levels ? Math.max(1, lvOf(id)) : 1;
    t.dataset.forge = lv;
    t.classList.remove("is-forged"); void t.offsetWidth; t.classList.add("is-forged");
    setTimeout(() => t.classList.remove("is-forged"), 500 + lv * 120);
    const kill = e => e.target.remove();
    for (let k = 0; k < lv; k++) {   // one ring per level (non-perk = 1)
      const b = ring.cloneNode(false);
      b.className = "tnode__focus tnode__burst";   // keeps the ring shape / size rules of the focus ring
      b.style.animationDelay = k * 0.2 + "s";   // beats: ting, ting, ting
      b.addEventListener("animationend", kill);
      t.appendChild(b);
    }
    // perk Lv 2-3 extras (added on top, flat, no glow): Lv 2 = 4 shards, Lv 3 = 8 shards + a diamond outline that opens out
    // shards removed (user 2026-11-17)
    if (lv >= 3) {
      const o = document.createElement("i");
      o.className = "tnode__opening";
      o.addEventListener("animationend", kill);
      t.appendChild(o);
    }
  }

  function finishUnlockHold(id) {
    lastUnlockTime = performance.now();
    const n = TN.get(id), lv = lvOf(id) + 1;
    owned.set(id, lv);
    yantraRipple(id);
    if (detailOpen === id && n.levels) viewLv = defaultViewLv(id);   // next level tab: the same Unlock CTA buys it
    updateTree();
    renderDetail();
    api.rumble(150, 0.6);
    api.toast(n.levels ? `${n.name} Lv ${lv} unlocked` : `${nodeLabel(n)} unlocked`);
  }

  function detailPrimary() {
    const { id, lv: want } = viewTarget(), n = TN.get(id), lv = lvOf(id);
    if (n.base && !n.granted) {
      api.toast(coreName + " · always unlocked");
      return;
    }
    if (want <= lv) {
      if (n.kind === "attribute") { api.toast(`${n.name} · passive, always active`); return; }
      // Equip = put it in the first free slot of this style's Tactical Loadout preset (saved); full -> say so
      // perks equip the level of the tab shown (want), any owned level; moves equip as they are
      const eqLv = n.levels ? want : 0;
      if (isEquipped(id) && (!n.levels || eqLevel(id) === eqLv)) { api.toast(`${nodeLabel(n)}${eqLv ? " Lv " + eqLv : ""} · already in your loadout`); return; }
      const was = n.levels && isEquipped(id) ? eqLevel(id) : 0;
      const wasTier = n.kind === "decisive" && !n.granted ? LOADOUT()?.equippedTier?.(styleId, id) || 0 : 0;   // other tier of this family equipped
      const slot = LOADOUT()?.equipNode?.(styleId, id, eqLv || undefined);   // free slot, or replaces the last one when full (auto)
      if (slot == null) { api.rumble(120, 0.2); api.toast("Can not equip this skill"); return; }
      const out = LOADOUT()?.lastReplaced;
      updateTree();
      renderDetail();
      api.rumble(60, 0.3);
      api.toast(was ? `${n.name} · equipped Lv ${was} → Lv ${eqLv}`
        : wasTier ? `${n.name} · Tier ${wasTier} → Tier ${n.tier}`
        : `${nodeLabel(n)}${eqLv ? " Lv " + eqLv : ""} equipped · slot ${slot + 1}${out ? ` (replaced ${out})` : ""}`);
      return;
    }
    if (want > lv + 1) {
      api.rumble(120, 0.2);
      api.toast(`Locked · unlock Lv ${want - 1} first`);
      return;
    }
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
      const what = n.levels ? `${n.name} Lv ${lv + 1}` : nodeLabel(n);
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
  }

  // takes the node down one level (a perk Lv 3 -> 2 ...); children whose link is no longer met are refunded too.
  // The Node Detail card has no Remove key (Figma 833:93841); kept for direct mode and the dev tools.
  function removeLevel(id) {
    const n = TN.get(id), lv = lvOf(id);
    if (!lv || n.base) return;
    const back = costOf(n, lv);
    if (lv > 1) owned.set(id, lv - 1); else { owned.delete(id); LOADOUT()?.unequipNode?.(styleId, id); }
    const extra = pruneInvalid();
    if (detailOpen === id && n.levels) viewLv = defaultViewLv(id);
    updateTree();
    renderDetail();
    api.rumble(60, 0.2);
    const pts = back + extra;
    api.toast(`${nodeLabel(n)} ${n.levels && lv > 1 ? `down to Lv ${lv - 1}` : "removed"} · ${pts} point${pts === 1 ? "" : "s"} refunded`);
  }

  function detailSecondary() {
    removeLevel(detailOpen);
  }

  function isLinked(a, b) {
    // controller nav only (app.js rows mode): Core <-> granted DSM count as linked so D-pad down from Core lands on it; no line drawn
    const g = id => TN.get(id)?.granted, c = id => TN.get(id)?.type === "root";
    if ((g(a) && c(b)) || (c(a) && g(b))) return true;
    return !!(PARENTS.get(a)?.includes(b) || CHILDREN.get(a)?.includes(b));
  }
  //#endregion

  //#region [Private Methods]
  // core emblem follows the selected Tactical style (bug 2026-11-19: the rebuild on a style change reset it to Phra Nakhon)
  function buildTree() {
    const nodesEl = api.bind("treeNodes");
    if (!nodesEl) return;
    nodesEl.innerHTML = TREE.nodes.map(n => n.type === "root"
      ? `<a class="tnode tnode--root" data-nav data-id="${n.id}" data-fn="toggleSkill" style="left:${n.x}px;top:${DY(n.y) + ROOT_DY}px">
          <span class="tnode__focus" aria-hidden="true"></span><span class="node-core"><span class="node-core__circle"></span><span class="node-core__diamond"></span><img class="node-core__emblem" data-bind="coreEmblem" src="mtx/assets/svg/style-${window.MTX_SCREENS?.tactical?.getSelStyle?.() || "phranakhon"}-sel.svg" alt=""></span>
          <span class="tnode__label">${esc(n.name)}</span></a>`
      : `<a class="tnode tnode--${n.type}" data-nav data-id="${n.id}" data-fn="toggleSkill" style="left:${n.x}px;top:${DY(n.y)}px${moveArt(n) ? `;--fm:url(${moveArt(n).replace(LO, "../assets/svg/loadout/")})` : ""}">
          <span class="tnode__focus" aria-hidden="true"></span>
          <span class="tnode__lock"></span>
          <span class="tnode__star"><i class="glow"></i><i class="edge"></i><i class="fill"></i></span>
          <span class="node"><span class="node__glow"></span><span class="node__shape"></span><span class="node__ring"></span><span class="node__lock"></span><span class="node__figure"></span></span>
          ${moveArt(n) ? `<span class="tnode__move"><img src="${moveArt(n)}" alt=""></span>` : ""}
          ${n.levels ? `<span class="tnode__perk"><img class="tnode__perk-frame" src="${LO}perk-frame-2.svg" alt=""><img class="tnode__perk-icon" src="${LO}perk-icon-${perkIcon(n)}.svg" alt=""></span>` : ""}
          <span class="tnode__label">${esc(nodeLabel(n))}${n.levels ? ' <em class="tnode__lv"></em>' : ""}</span></a>`).join("");

    const octi = (p, q) => {
      const a = { x: p.x, y: DY(p.y) }, b = { x: q.x, y: DY(q.y) };
      const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
      if (!dx || !dy) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
      return ay >= ax ? `M${a.x} ${a.y}L${b.x} ${a.y + Math.sign(dy) * ax}L${b.x} ${b.y}`
                      : `M${a.x} ${a.y}L${a.x + Math.sign(dx) * (ax - ay)} ${a.y}L${b.x} ${b.y}`;
    };

    api.bind("treeLinks").innerHTML = TREE.edges.map(e => { const d = octi(TN.get(e.from), TN.get(e.to)); return `<path class="base" d="${d}"/>`; }).join("") +
      TREE.edges.map(e => `<path class="lit" d="${octi(TN.get(e.from), TN.get(e.to))}" data-from="${e.from}" data-to="${e.to}"/>`).join("");

    const hubs = [0, ...GATES.slice(1)].map((g, i) => DY(i === 0 ? 0 : (TREE.nodes.filter(n => n.y > g).sort((p, q) => p.y - q.y)[0] || { y: g }).y));
    api.bind("treeFrames").innerHTML = hubs.map(cy => [240, 360, 480].map(r => `<path d="M0 ${cy - r}L${r * 1.15} ${cy}L0 ${cy + r}L${-r * 1.15} ${cy}Z"/>`).join("")).join("") +
      `<circle cx="0" cy="${DY(0) + ROOT_DY}" r="140"/>`;

    // yantra script ornaments around the core (skill-orn-*.svg) removed on request (2026-11-17)
    // Tier ornament strip (user image 2026-11-17, mtx/assets/skill-tree-yan.png (Yan PanakornTheme, 1513x3914 since 2026-11-18; was 1513x4998; was skill-tree-bg.webp with the roosters), 5 motifs stacked): whole image, not sliced,
    // spanning gate 1 -> tree end at 132 % (110 % then +20 %, user), centred on that span. Replaces the Tier 1 yantra.
    const cam = api.bind("treeCamera");
    if (cam && !cam.querySelector(".tree__yantra")) {
      const span = maxY + 60 - GATES[0], h = Math.round(span * 1.32), w = Math.round(h * 1513 / 3914), top = (FLIP ? -60 : GATES[0]) + (span - h) / 2;
      cam.insertAdjacentHTML("afterbegin", `<div class="tree__yantra" aria-hidden="true" data-bx="${-w / 2}" data-by="${top}" style="left:${-w / 2 + ornOff.x}px;top:${top + ornOff.y}px;width:${w}px;height:${h}px;background:none"><div class="tree__yantra-art tree__yantra-art--plain"></div><div class="tree__yantra-art tree__yantra-art--n0"></div><div class="tree__yantra-art tree__yantra-art--n1"></div><div class="tree__yantra-art tree__yantra-art--n2"></div><div class="tree__shine"><i></i></div></div>`);   // v5 baked noise crossfade, see screens.css (user 2026-11-18)
    }
    api.bind("treeGates").innerHTML = GATES.map((y, i) => `<div class="tree__gate${FLIP ? " tree__gate--up" : ""}" style="top:${DY(y)}px"><span>ขั้น ${THAI_NUM[i] || i + 1}</span></div>`).join("");
    const rail = api.bind("treeRail");
    if (rail) rail.innerHTML = GATES.map((y, i) => `<i style="top:${DY(y) / (maxY + 60) * 620 - 6}px"></i>`).join("") + "<b></b>";
  }

  // DSM / SPE owned face = the Tactical Loadout D-pad slot art (Decisive dc-slot, Special sp-slot); a / b art alternate
  const ofType = t => TREE.nodes.filter(n => n.type === t);
  function moveArt(n) {
    if (n.type === "dsm") return `${LO}dc-slot-${/salabfanpla|dsmb$/.test(n.family || "") ? "b" : "a"}.svg`;
    if (n.type === "spe") return `${LO}sp-slot-${ofType("spe").indexOf(n) % 2 ? "b" : "a"}.svg`;
    if (n.type === "sgm") return `${LO}sg-slot-${ofType("sgm").indexOf(n) % 2 ? "b" : "a"}.svg`;
    return "";
  }

  // perk art: the loadout's 10 perk icons, in tree order (perks 11-14 reuse them; mock art)
  const perkIcon = n => Math.max(0, TREE.nodes.filter(x => x.levels).indexOf(n)) % 10 + 1;   // shown style's perks (was fixed to PN: perk-icon-0 404)

  // owned perk face = MTX / Perk Frame of its level; the label shows "Lv N"
  function setPerkFace(t, n, lv) {
    const fr = t.querySelector(".tnode__perk-frame"), ic = t.querySelector(".tnode__perk-icon"), tag = t.querySelector(".tnode__lv");
    const fk = LV_FRAME[Math.max(1, lv)], [fw, fh, iw, ih] = PERK_FRAME[fk];
    t.style.setProperty("--fm", "url(../assets/svg/loadout/perk-frame-2.svg)");   // ring = plain frame outline for every level (url from mtx/css/)   // resolved from mtx/css/
    if (fr) { fr.src = `${LO}perk-frame-${fk}.svg`; fr.width = Math.round(fw * PERK_SCALE); fr.height = Math.round(fh * PERK_SCALE); }
    if (ic) { ic.width = Math.round(iw * PERK_SCALE); ic.height = Math.round(ih * PERK_SCALE); }
    t.dataset.lv = lv;
    // equipped level (Loadout) -> data-eq-lv for the tag look (no text on the node, user 2026-11-18; tag design pending)
    const eq = lv ? eqLevel(n.id) : 0;
    if (eq) t.dataset.eqLv = eq; else delete t.dataset.eqLv;
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
    api.bind("tiName").textContent = nodeLabel(n);
    const st = api.bind("tiState");
    st.className = "tree-info__state " + (own ? "is-owned" : ready ? "is-ready" : "is-locked");
    st.textContent = n.levels && own ? `Lv ${lv} / ${maxLv(n)}` : own ? "Unlocked" : ready ? "Ready to unlock" : "Locked";
    api.bind("tiStats").innerHTML = n.levels ? `<dt>Level</dt><dd>${lv} / ${maxLv(n)}</dd>`
      : (n.bonus || []).map(b => `<dt>${esc(b.stat)}</dt><dd>+${esc(b.value)}</dd>`).join("") || "<dt>No stat bonus</dt><dd></dd>";
    api.bind("tiDesc").textContent = n.levels ? n.levels[Math.max(0, lv - 1)].desc : n.desc;
    const ps = PARENTS.get(id) || [];
    api.bind("tiReq").innerHTML = n.base ? '<li class="is-met">Starting node</li>'
      : ps.map(p => `<li class="${owned.has(p) ? "is-met" : ""}">${esc(nodeLabel(TN.get(p)))}</li>`).join("") +
        (ps.length > 1 ? `<li style="color:var(--text-dim)">${unlockRule === "all" ? "Needs all of these" : (ready ? "Requirement met (connected)" : "Needs any one connected")}</li>` : "");
    api.bind("tiAction").textContent = n.base ? "Always unlocked" : own ? "A · Remove (refunds this and dependent skills)"
      : ready ? (skillPts ? `A · Unlock (1 point, ${skillPts} left)` : "No skill points left") : "Unlock the required skills first";
  }

  // Dev tools: ornament offset in tree px (store treeYanX / treeYanY, default 0 / +50; user 2026-11-18). Moves the strip's box,
  // so the ripple (which reads the box left/top) stays aligned.
  const ornOff = { x: 0, y: 50 };
  function setOrnamentOffset(x, y) {
    ornOff.x = +x || 0; ornOff.y = +y || 0;
    const orn = api?.$?.("#s-skilltree .tree__yantra");
    if (orn) { orn.style.left = (+orn.dataset.bx + ornOff.x) + "px"; orn.style.top = (+orn.dataset.by + ornOff.y) + "px"; }
  }

  let plxPct = 45;
  // Dev tools: ornament parallax amount in % of the camera move; re-applies to the focused node
  function setParallax(pct) {
    plxPct = Math.max(0, Math.min(80, +pct || 0));
    const f = api?.getFocused?.();
    if (f?.dataset?.id && TN.has(f.dataset.id)) focusCamera(f.dataset.id);
  }

  const CAM_H = 1080, CAM_TOP = 300, CAM_BOTTOM = 230;
  const clampCam = ty => Math.max(Math.min(ty, CAM_TOP), CAM_H - CAM_BOTTOM - maxY);
  let camTy = CAM_TOP;

  // mouse wheel scrolls the tree camera freely (user 2026-11-17); the next focus move snaps back to the focused node
  function wheelCamera(e) {
    if (e.target.closest?.(".skill-detail, [data-bind='skillDetail']")) return;
    e.preventDefault();
    setCamera(clampCam(camTy - e.deltaY), null);
  }

  function focusCamera(id) {
    const n = TN.get(id);
    if (!n) return;
    setCamera(clampCam(CAM_H / 2 + 20 - DY(n.y)), DY(n.y));
  }

  function setCamera(ty, railY) {
    const cam = api.bind("treeCamera");
    if (!cam) return;
    camTy = ty;
    cam.style.transform = `translateY(${ty}px)`;
    // parallax: the ornament (and its ripples) trails the camera at 70 % speed, so it reads as further back (user 2026-11-17)
    cam.style.setProperty("--plx", Math.round(-ty * plxPct / 100) + "px");   // Dev > Ornament parallax (store treePlx, default 45 %)   // v1 parallax restored (user 2026-11-17): ornament 30 % slower, same timing as the camera
    const rail = api.$("#s-skilltree .tree-rail b");
    if (rail) rail.style.top = (railY ?? (CAM_H / 2 + 20 - ty)) / (maxY + 60) * 620 + "px";
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

  // Mastery data for a move shown elsewhere (Character Customize > Style preset).
  //   decisive  the family's tier nodes, matched by name (Mon Yan Lak = Tier 1-3)
  //   signature / special  the tree node with that move name, else the slot node by slot order
  //   perk      the perk node with that name (levels 1-3)
  // Returns null when the move is not part of the tree.
  function getMastery(cat, name, i) {
    const byY = (a, b) => a.y - b.y || a.x - b.x;
    if (cat === "perk") {
      const p = TREE.nodes.find(n => n.levels && n.name === name);
      if (!p) return null;
      const lv = lvOf(p.id);
      return {
        kind: "Perk", name: p.name, desc: p.levels[Math.max(0, lv - 1)].desc, code: "", icon: p.icon,
        tiers: maxLv(p), owned: lv, level: lv, levels: p.levels, stats: p.cooldown ? [["Cooldown", p.cooldown + "s"]] : [],
        next: lv >= maxLv(p) ? "Fully unlocked" : canLevelUp(p.id) ? `Lv ${lv + 1} ready to unlock in Mastery Skill` : "Locked · unlock earlier skills first"
      };
    }
    let nodes = [];
    if (cat === "decisive") {
      const fam = Object.values(FAMILIES()).find(f => f.name === name);
      if (fam) nodes = fam.tiers.map(id => TN.get(id));
    } else if (cat === "signature" || cat === "special") {
      const slots = TREE.nodes.filter(n => n.kind === cat).sort(byY);
      const hit = slots.find(n => n.name === name) || slots[i % (slots.length || 1)];
      if (hit) nodes = [hit];
    }
    if (!nodes.length) return null;
    const first = nodes[0], ownedN = nodes.filter(n => owned.has(n.id));
    const top = ownedN.at(-1) || first, next = nodes.find(n => !owned.has(n.id)), st = top.stats || {};
    const stats = first.kind === "decisive" ? [["Base Damage", st.baseDamage], ["Damage Part", st.damagePart]]
      : [["Damage", st.damage], ["Target", st.target], ["Stamina", st.stamina]];
    return {
      kind: KIND_LABEL[first.kind],
      name: first.kind === "decisive" ? first.name : name,
      desc: first.desc,
      code: first.kind === "decisive" ? first.th : "",
      icon: first.icon,
      tiers: nodes.length,
      owned: ownedN.length,
      stats: stats.filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      next: next ? (canUnlock(next.id) ? "Ready to unlock in Mastery Skill" : "Locked · unlock earlier skills first") : "Fully unlocked"
    };
  }

  // highlight numbers in effect text (same look as the Tactical Loadout card)
  // numbers green; numbers inside (...) are conditions: yellow (Figma 833:94092)
  const fxHtml = t => esc(t).replace(/\([^)]*\)|[+-]?\d+(?:\.\d+)?%?/g, m => m[0] === "(" ? m.replace(/\d+(?:\.\d+)?%?/g, d => `<b class="nd-num nd-num--cond">${d}</b>`) : `<b class="nd-num">${m}</b>`);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";

  // card content per node type (Figma Node Detail · Pack I 833:93841)
  // card content = the global skill card model (components/node-detail.js MTX_UI.nodeDetail.model, shared with Loadout etc.);
  // the tree adds its CTA (unlock / equip by tab), Video hint and the style core name
  function detailModel(n) {
    const m = window.MTX_UI.nodeDetail.model(styleId, n.id, { lv: viewLv, cta: ctaOf(), videoOn: isMove(n) && isVideoOpen(),
      hints: [["b", "Close"], ...(isMove(n) ? [["y", isVideoOpen() ? "Hide video" : "Video"]] : [])] });
    if (n.kind === "core") { m.name = coreName; m.rows.push({ t: "row", label: "Decisive Move", value: n.name }); }
    return m;
  }

  // detail panel = Node Detail card (components/node-detail.js)
  function renderDetail() {
    const id = detailOpen;
    if (!id) return;
    window.MTX_UI.nodeDetail.render(api.bind("skillDetail"), detailModel(TN.get(id)));
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
    setParallax,
    setOrnamentOffset,
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
    detailVideo,
    closeVideo,
    isVideoOpen,
    isVideoBlocking,
    setViewLevel,
    getEquipped,
    getMastery,
    useStyle,
    getStyleId: () => styleId,
    actions: {
      toggleSkill(el) { openDetail(el.dataset.id); },
      toggleSkillDirect(el) {
        const id = el.dataset.id, n = TN.get(id);
        if (n.base) { api.toast(coreName + " · always unlocked"); return; }
        // direct mode: A buys the next level; a maxed node is taken down one level
        if (lvOf(id) >= maxLv(n)) { removeLevel(id); return; }
        if (!canLevelUp(id)) {
          api.rumble(120, 0.2);
          return;
        }
        if (skillPts < costOf(n, lvOf(id) + 1)) { api.rumble(120, 0.2); api.toast("No skill points left · remove a skill"); return; }
        owned.set(id, lvOf(id) + 1); yantraRipple(id); updateTree(); api.rumble(90, 0.4);
        api.toast(`${nodeLabel(n)}${n.levels ? " Lv " + lvOf(id) : ""} unlocked · ${skillPts} point${skillPts === 1 ? "" : "s"} left`);
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
