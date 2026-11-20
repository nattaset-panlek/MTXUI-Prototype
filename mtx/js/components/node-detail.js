/* Component: skill tree node detail card (Figma "Node Detail · Pack I" 833:93841; cards Attribute 833:93491,
   Signature 833:93561, Decisive 833:93631, Special 833:93701, Perk 833:93771). Styles: css/node-detail.css.

   Top to bottom: type label (type colour) · art with type frame + skill icon (+ Y VIDEO badge on moves) · title ·
   level tabs "LB [Lv 1|Lv 2|Lv 3] RB" (Perk Lv, Decisive Tier) · info stack · CTA + key hints.

     MTX_UI.nodeDetail.html({ attrs: 'data-bind="skillDetail" hidden' })
     MTX_UI.nodeDetail.render(el, {
       kind: "perk",                  // attribute | signature | decisive | special | perk | core
       label: "Perk",                 // type label text
       name: "Relentless Assault",
       video: false,                  // Y VIDEO badge on the art (moves)
       frame: { src, w, h } | null,   // frame art override (perk: level frame), else the type frame
       tabs: { labels: ["Lv 1", "Lv 2", "Lv 3"], view: 3, owned: 2 | [true, false, true] } | null,
       rows: [                        // info stack; a divider goes after every row
         { t: "desc", text },
         { t: "row", label, value, color },       // Label | Value (color optional)
         { t: "keys", label, keys: ["rb", "y"] }, // Label | key glyphs
         { t: "effect", tag: "buff" | "flaw", html }
       ],
       cta: { label: "Equip", state: "ready" | "equip" | "done" | "locked" },
       hints: [["b", "Close"], ["y", "Video"]]
     })
   Data hooks kept for app.js / hold: data-bind sdPrimary (CTA, label .tl-info__label), level tabs [data-lv-tab]. */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const glyph = (b, cls = "", combat = false) => UI.glyph?.(b, { cls, combat }) || `<span class="glyph ${cls}" data-btn="${b}">${b.toUpperCase()}</span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IMG = "mtx/assets/img/", ND = "mtx/assets/svg/node-detail/";
  const COLOR = { attribute: "#3fd28b", signature: "#4da3ff", decisive: "#ff4060", special: "#c7f029", perk: "#e5e5e5", core: "#ed153f" };
  const CHECK = '<svg viewBox="0 0 25 25"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 0C19.4036 0 25 5.59635 25 12.5C25 19.4036 19.4036 25 12.5 25C5.59635 25 0 19.4036 0 12.5C0 5.59635 5.59635 0 12.5 0ZM6.64896 13.2422L10.2089 16.5115C10.7281 16.9896 11.5318 16.9641 12.0203 16.4604L18.3714 10.3797C18.888 9.88281 18.9036 9.06094 18.4068 8.54479C17.9099 8.02812 17.088 8.0125 16.5719 8.50937L11.0703 13.776L8.40781 11.3307C7.88021 10.8453 7.05833 10.8792 6.57292 11.4068C6.08698 11.9349 6.12135 12.7562 6.64896 13.2422Z" fill="currentColor"/></svg>';

  function html({ attrs = "", cls = "" } = {}) {
    return `<aside class="skill-detail nd${cls ? " " + cls : ""}" ${attrs} data-figma="833:93841 Node Detail · Pack I">
      <p class="nd__kind" data-nd="kind"></p>
      <div class="nd__card">
        <div class="nd__art"><img class="nd__bg" src="${IMG}card-art.webp" alt="">
          <img class="nd__frame" data-nd="frame" alt=""><img class="nd__icon" data-nd="icon" alt="">
          <span class="nd__video" data-nd="video">${glyph("y")}<span>Video</span></span></div>
        <div class="nd__title"><h2 class="tex-text" data-nd="name"></h2></div>
        <div class="nd__tabs" data-nd="tabs">${glyph("lt", "nd__bump")}<div class="nd__pager" data-nd="pager"></div>${glyph("rt", "nd__bump")}</div>
        <div class="nd__panel" data-nd="panel"><div class="nd__stack" data-nd="stack"></div></div>
        <div class="nd__actions">
          <a class="btn-cta btn-cta--detail btn-cta--key nd__cta" data-i-equip data-bind="sdPrimary"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${glyph("a")}<span class="btn-cta__label tl-info__label"></span><span class="btn-cta__check" aria-hidden="true">${CHECK}</span></a>
          <span class="nd__hints" data-nd="hints"></span>
        </div>
      </div></aside>`;
  }

  function row(r) {
    if (r.t === "desc") return `<p class="nd-desc">${esc(r.text)}</p>`;
    if (r.t === "row") return `<div class="nd-row"><span>${esc(r.label)}</span><b${r.color ? ` style="color:${r.color}"` : ""}>${r.html ?? esc(r.value)}</b></div>`;
    if (r.t === "keys") return `<div class="nd-row nd-row--keys"><span>${esc(r.label)}</span><b>${r.keys.map(k => glyph(k, "", true)).join("<i>+</i>")}</b></div>`;
    if (r.t === "warn") return `<p class="nd-warn">${esc(r.text)}</p>`;
    // r.cd = cooldown shown in the block's bottom-right corner with a clock (thread #10: no separate Cooldown row)
    if (r.t === "effect") return `<div class="nd-fx nd-fx--${r.tag}"><span class="nd-fx__tag">${r.tag === "flaw" ? "Flaw" : "Buff"}</span><p>${r.html}</p>${r.cd ? `<span class="nd-fx__cd" title="Cooldown"><img src="mtx/assets/svg/icon-clock.svg" alt="">${esc(r.cd)}</span>` : ""}</div>`;
    return "";
  }

  function render(el, m) {
    if (!el) return;
    const q = k => el.querySelector(`[data-nd="${k}"]`);
    const col = COLOR[m.kind] || "#e5e5e5";
    el.dataset.kind = m.kind;
    el.style.setProperty("--tc", col);
    q("kind").textContent = m.label;
    q("name").textContent = m.name;
    fitTitle(q("name"));
    const art = m.kind === "core" ? "decisive" : m.kind;
    // m.frame { src, w, h }: own frame art (perk: level frame), centred on the type frame spot (centre 227,137 in the art)
    const fr = q("frame");
    fr.src = m.frame?.src || `${ND}frame-${art}.svg`;
    fr.style.cssText = m.frame ? `left:${227 - m.frame.w / 2}px;top:${137 - m.frame.h / 2}px;width:${m.frame.w}px;height:${m.frame.h}px` : "";
    q("icon").src = `${ND}icon-${art}.svg`;
    q("video").hidden = !m.video;
    const vl = q("video").querySelector("span:last-child");
    if (vl) vl.textContent = m.videoOn ? "Playing" : "Video";
    const tabs = q("tabs");
    tabs.hidden = !m.tabs;
    el.classList.toggle("has-tabs", !!m.tabs);
    if (m.tabs) {
      q("pager").innerHTML = m.tabs.labels.map((t, k) =>
        `<span data-lv-tab="${k + 1}" class="${k + 1 === m.tabs.view ? "is-on" : ""} ${(Array.isArray(m.tabs.owned) ? m.tabs.owned[k] : k + 1 <= m.tabs.owned) ? "is-owned" : ""}${k + 1 === m.tabs.eq ? " is-eq" : ""}">${esc(t)}</span>`).join("");
      q("pager").classList.toggle("is-wide", m.tabs.labels.some(t => t.length > 4));
    }
    // dividers between rows (and after the last); a warn line sits right under the row before it, no divider
    const DIV = '<i class="nd-div"></i>';
    q("stack").innerHTML = m.rows.map((r, k) => (k && r.t !== "warn" ? DIV : "") + row(r)).join("") + (m.rows.length && m.rows.at(-1).t !== "warn" ? DIV : "");
    const cta = el.querySelector(".nd__cta"), st = m.cta?.state || "locked";
    cta.hidden = !m.cta;
    cta.classList.toggle("is-ready-unlock", st === "ready");
    cta.classList.toggle("is-equip", st === "equip");
    cta.classList.toggle("is-done", st === "done");
    cta.classList.toggle("is-locked", st === "locked");
    cta.querySelector(".tl-info__label").textContent = m.cta?.label || "";
    q("hints").innerHTML = (m.hints || []).map(([b, t]) => `<span class="hint-inline">${glyph(b)}<span>${esc(t)}</span></span>`).join("");
    relabel(el);
  }

  // glyphs made before the device was known (CTA, VIDEO badge) read "A" / "Y": set every label for the current device
  const relabel = el => el?.querySelectorAll(".glyph[data-btn]").forEach(g => { g.textContent = "combat" in g.dataset ? UI.combatLabel(g.dataset.btn) : UI.keyLabel(g.dataset.btn); });

  // ---- Video Skill Preview (Figma 837:100435, 912x581) centred over 80% black: Y on a card with the VIDEO badge opens it;
  // B (or Y again) closes. One hint only (B Back): both keys mean the same.
  // No move clips yet: the player shows the card art and a running 0:00 / 0:12 clock (placeholder).
  // Dev Tools > Skill tree > Skill video: "popup" (this one, blocks input) or "side" (Figma 863:75488 V3: a panel that slides
  // out left from behind the card, full card height, 18 px gap; the tree stays live, B / Y close it).
  let vid = null, vidTimer = 0, vidMode = "popup";
  const videoMode = () => window.MTX?.api?.store?.get?.("skillVideo", "popup") === "side" ? "side" : "popup";
  function startClock(el, length) {
    clearInterval(vidTimer);
    const t0 = performance.now(), time = el.querySelector(".nd-video__time");
    const show = s => { time.textContent = `0:${String(s).padStart(2, "0")} / 0:${String(length).padStart(2, "0")}`; };
    show(0);
    vidTimer = setInterval(() => show(Math.floor((performance.now() - t0) / 1000) % (length + 1)), 250);
  }
  const media = src => src ? `<video src="${src}" autoplay loop muted playsinline></video>` : `<img src="${IMG}card-art.webp" alt="">`;
  function sideOpen(host, { kind, src = "", length = 12 }) {
    if (vid && vidMode === "side" && vid.isConnected) {   // already out: swap the clip, no new slide
      vid.dataset.kind = kind;
      vid.querySelector(".nd-video__player").firstElementChild.outerHTML = media(src);
      startClock(vid, length);
      return;
    }
    videoClose(true);
    vidMode = "side";
    host.insertAdjacentHTML("beforeend", `<div class="nd-vside" data-kind="${kind}" data-figma="863:75488 V3 · Separate panel">
      <div class="nd-video__player">${media(src)}<span class="nd-video__time"></span></div></div>`);
    vid = host.lastElementChild;
    startClock(vid, length);
    void vid.offsetWidth;                                   // start position painted, then slide in
    vid.classList.add("is-in");
  }
  function videoOpen(host, opts) {
    if (videoMode() === "side") return sideOpen(host, opts);
    const { name, kind, label, src = "", length = 12 } = opts;
    videoClose(true);
    vidMode = "popup";
    host.insertAdjacentHTML("beforeend", `<div class="nd-video" data-kind="${kind}" data-figma="837:100435 Video Skill Preview">
      <div class="nd-video__panel">
        <p class="nd-video__title">${esc(name)}</p>
        <div class="nd-video__player">${src ? `<video src="${src}" autoplay loop muted playsinline></video>` : `<img src="${IMG}card-art.webp" alt="">`}
          <span class="nd-video__time">0:00 / 0:${String(length).padStart(2, "0")}</span></div>
        <div class="nd-video__hints"><span class="hint-inline" data-nd-video-close>${glyph("b")}<span>Back</span></span></div>
      </div></div>`);
    vid = host.lastElementChild;
    relabel(vid);
    startClock(vid, length);
  }
  // instant = no slide back (switching mode / reopening)
  function videoClose(instant = false) {
    clearInterval(vidTimer);
    const el = vid;
    vid = null;
    if (!el) return;
    if (instant || !el.classList.contains("nd-vside")) { el.remove(); return; }
    el.classList.remove("is-in");                          // slide back behind the card, then go
    setTimeout(() => el.remove(), 200);
  }
  const videoIsOpen = () => !!vid;
  const videoIsBlocking = () => !!vid && vidMode === "popup";   // only the popup takes every input

  // long names shrink until they fit one line of the 440 px title box
  function fitTitle(h) {
    h.style.fontSize = "";
    for (let s = 40; s > 24 && h.scrollWidth > h.clientWidth + 1; s -= 2) h.style.fontSize = s - 2 + "px";
  }

  //#region global skill card content: one model per skill, any screen (user 2026-11-18: "global component")
  // MTX_UI.nodeDetail.model(styleId, id, opts) -> render() model, from the skill data (MTX_SKILLS) + unlock state (MTX_SKILLSTATE).
  //   id   = tree node id, or a decisive family id (shows its top owned tier, else Tier 1)
  //   opts = { lv: perk level tab shown (default: equipped, else owned, else 1), cta, hints, videoOn }
  // Content per kind = the Skill Tree card (Figma Node Detail · Pack I 833:93841). Screens add their own CTA / hints.
  const KIND_LABEL = { core: "Style core", attribute: "Attribute", perk: "Perk", decisive: "Decisive Move", signature: "Signature Move", special: "Special Move" };
  const LO = "mtx/assets/svg/loadout/", LV_FRAME = { 1: 2, 2: 1, 3: 3 }, PERK_FRAME_SVG = { 1: [124, 122], 2: [120, 117], 3: [129, 124] };
  const fxHtml = t => esc(t).replace(/\([^)]*\)|[+-]?\d+(?:\.\d+)?%?/g, m => m[0] === "(" ? m.replace(/\d+(?:\.\d+)?%?/g, d => `<b class="nd-num nd-num--cond">${d}</b>`) : `<b class="nd-num">${m}</b>`);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
  const lvOf = (sid, id) => window.MTX_SKILLSTATE?.level(sid, id) || 0;
  // value colours by meaning (thread #30): good for you = green, a cost / downside = red, plain facts stay white
  const POS = "#3fd28b", NEG = "#ff8a9b";
  // basic attack a move replaces when used (thread #6). PLACEHOLDER: no game data yet (n.replaces wins when the data gets it);
  // guessed from the move name / text: knee, elbow, kick (teep / push kick = lead leg), else punch; rear side by default
  function replacesOf(n) {
    if (n.replaces) return n.replaces;
    const t = (n.name + " " + (n.desc || "")).toLowerCase();
    if (/teep|push kick/.test(t)) return "Left Kick";
    if (/knee/.test(t)) return "Right Knee";
    if (/elbow/.test(t)) return "Right Elbow";
    if (/kick/.test(t)) return "Right Kick";
    return "Right Punch";
  }
  function findSkill(sid, id, o = {}) {
    const S = window.MTX_SKILLS?.styles?.[sid];
    if (!S) return null;
    const n = S.nodes.find(x => x.id === id);
    if (n) return { S, n };
    const f = S.families?.[id];
    if (!f) return null;
    const owned = f.tiers.filter(t => lvOf(sid, t) > 0).length, eq = window.MTX_LOADOUT?.equippedTier?.(sid, f.tiers[0]) || 0;
    const tier = Math.min(f.tiers.length, Math.max(1, o.lv || eq || owned || 1));   // tier shown: asked, equipped, else top owned
    return { S, n: S.nodes.find(x => x.id === f.tiers[tier - 1]), fam: { f, tier, owned, eq } };
  }
  function model(sid, id, o = {}) {
    const hit = findSkill(sid, id, o);
    if (!hit) return null;
    const { S, n } = hit, tc = COLOR[n.kind], st = n.stats || {}, own = lvOf(sid, n.id);
    const isMove = n.kind === "decisive" || n.kind === "signature" || n.kind === "special";
    const m = { kind: n.kind, label: KIND_LABEL[n.kind], name: n.kind === "core" ? `${S.name} core` : n.name, video: isMove, tabs: null, rows: [],
      cta: o.cta ?? null, videoOn: !!o.videoOn, hints: o.hints ?? [["b", "Close"]], node: n, owned: own };
    if (n.kind === "core") {
      m.rows = [{ t: "desc", text: n.desc }];
    } else if (n.kind === "attribute") {
      m.rows = [{ t: "desc", text: n.desc }, ...(n.bonus || []).map(b => ({ t: "row", label: b.stat, value: "+" + b.value, color: POS }))];
    } else if (n.kind === "perk") {
      const eq = window.MTX_LOADOUT?.equippedLevel?.(sid, n.id) || 0;
      const v = Math.min(3, Math.max(1, o.lv || eq || own || 1)), L = n.levels[v - 1];
      m.lv = v;
      m.tabs = { labels: n.levels.map(l => "Lv " + l.lv), view: v, owned: own, eq };   // eq = equipped level: its tab is outlined yellow
      const fk = LV_FRAME[v], [fw, fh] = PERK_FRAME_SVG[fk], k = 194 / 124;   // frame follows the tab: Lv 1 copper, Lv 2 silver, Lv 3 gold
      m.frame = { src: `${LO}perk-frame-${fk}.svg`, w: Math.round(fw * k), h: Math.round(fh * k) };
      m.rows = [{ t: "effect", tag: "buff", html: fxHtml(L.buff), cd: n.cooldown ? n.cooldown + "s" : "" }, ...(L.flaw ? [{ t: "effect", tag: "flaw", html: esc(L.flaw) }] : [])];
    } else if (n.kind === "decisive") {
      // Loadout: one item per family -> Tier tabs (Tier 1-3, owned / equipped like the perk Lv tabs); the Skill Tree shows no tabs
      if (hit.fam && o.tierTabs) {
        const { f, tier, owned, eq } = hit.fam;
        m.lv = tier;
        m.tabs = { labels: f.tiers.map((_, k) => "Tier " + (k + 1)), view: tier, owned, eq };
      }
      m.rows = [{ t: "desc", text: n.desc }, { t: "row", label: "Tier", value: "Tier " + (n.tier || 1) }, { t: "row", label: "Base Damage", value: st.baseDamage, color: POS },
        { t: "row", label: "Damage Part", html: esc(st.damagePart).replace(/ \/ /g, ' <i class="nd-sep">/</i> ') }, { t: "row", label: "Type", value: cap(n.tag) }, { t: "row", label: "Replaces", value: replacesOf(n) }];
    } else {
      m.rows = [{ t: "desc", text: n.desc }, { t: "row", label: "Damage", value: st.damage, color: POS },
        { t: "row", label: "Target Attack", value: st.target }, { t: "row", label: "Stamina Cost", value: st.stamina, color: NEG },
        ...(n.kind === "signature" && st.input ? [{ t: "keys", label: "Input", keys: st.input }] : []), { t: "row", label: "Replaces", value: replacesOf(n) }];
    }
    return m;
  }
  //#endregion

  UI.nodeDetail = { html, render, relabel, COLOR, model, fxHtml, video: { open: videoOpen, close: videoClose, isOpen: videoIsOpen, isBlocking: videoIsBlocking, mode: videoMode } };
})();
