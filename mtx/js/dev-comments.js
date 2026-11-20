/* Dev Tools comments (Phase 1) — design: docs/comment-system-design.html
   Two modes, toggled by the "Play | Comment" chip in #tools or Shift+C:
     Play    = no pins, the prototype works as usual.
     Comment = the prototype is locked (mouse / keys / pad never reach it). Hover shows what a click picks
               (dashed box + label), click = solid highlight + new comment box, Alt+click = a bare x,y point.
               Pins show only on their screen and only while their element is visible; click a pin = its thread.
   Data: local = bake-server /__comments (.work/comments.json), team (Phase 2) = mtxworkingstation /api/comments.
   Sync: fetch on load, on entering Comment, on "↻ Fetch", after each own op, and a light check every N min (default 3).
   window.MTX_COMMENTS.locked() is read by app.js (gamepad loop). */
(() => {
  const PROTO = "controller-flow";
  const API = location.pathname.includes("/prototypes/") ? "/api/comments" : "/__comments";
  const LOCAL = API === "/__comments";
  const ST = [
    { k: "critical", n: "Critical" }, { k: "warning", n: "Warning" }, { k: "progress", n: "In progress" },
    { k: "review", n: "Waiting for review" }, { k: "done", n: "Complete" },
  ];
  const stName = k => (ST.find(s => s.k === k) || ST[1]).n;
  const pref = {
    get(k, d) { try { return localStorage.getItem("mtx.comments." + k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mtx.comments." + k, v); } catch (e) {} },
  };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = who => String(who || "?").split("@")[0];

  // ------------------------------------------------------------ state
  const threads = new Map();   // id -> thread
  let crev = null, me = null, online = null, lastFetch = 0, firstLoad = true;
  let on = false, showDone = pref.get("showDone", "false") === "true", openId = null, composer = null, reanchorId = null;
  let listOpen = false, scope = "screen", stOff = new Set(), hoverEl = null, hoverPoint = null, cur = null, busy = false;
  const myName = () => me || pref.get("name", "") || "";   // signed in (Cloudflare Access) = email, else the typed name
  const isMine = who => !!who && who === myName();

  // ------------------------------------------------------------ DOM
  const stage = $("#stage");
  const root = document.createElement("div");
  root.id = "cmt";
  root.innerHTML = `
    <div class="cmt-hov"><span></span></div>
    <div class="cmt-hl"><span></span></div>
    <div class="cmt-pins"></div>
    <div class="cmt-card" hidden></div>
    <aside class="cmt-list" hidden>
      <header>
        <div class="cmt-list__t"><b>Comments</b><span class="cmt-list__n"></span><button type="button" class="cmt-ib" data-act="listClose" title="Close (L)">×</button></div>
        <div class="cmt-flt" data-role="scope"><button type="button" data-scope="screen" class="on">This screen</button><button type="button" data-scope="all">All screens</button><button type="button" data-scope="mine">Mine</button></div>
        <div class="cmt-flt" data-role="status">${ST.map(s => `<button type="button" class="on" data-st="${s.k}"><i class="cmt-dot st-${s.k}"></i>${s.n}</button>`).join("")}</div>
      </header>
      <ol></ol>
    </aside>
    <div class="cmt-toasts"></div>
    <div class="cmt-modal" hidden>
      <div class="cmt-modal__box" role="dialog" aria-modal="true" aria-label="Your name for comments">
        <b class="cmt-modal__t">Your name for comments</b>
        <p>Shown on every comment and reply you post. Saved in this browser; change it later in ⚙.</p>
        <input data-role="mname" maxlength="40" placeholder="e.g. nattaset">
        <div class="cmt-btns"><button type="button" class="cmt-ib cmt-ib--txt" data-act="mLater">Later</button><button type="button" class="cmt-send" data-act="mSave">Save</button></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const modal = $(".cmt-modal", root), mName = $('[data-role="mname"]', modal);
  const hov = $(".cmt-hov", root), hl = $(".cmt-hl", root), pins = $(".cmt-pins", root), card = $(".cmt-card", root), list = $(".cmt-list", root), toasts = $(".cmt-toasts", root);

  // chip + bar in #tools
  const tools = $("#tools"), row = $("#tools .row");
  const seg = document.createElement("span");
  seg.className = "cmt-seg";
  seg.innerHTML = `<button type="button" class="chip cmt-play is-on" title="Play mode (Shift+C)">Play</button><button type="button" class="chip cmt-cmode" title="Comment mode (Shift+C)">Comment <b class="cmt-count">0</b></button>`;
  ($("#devBtn") ? $("#devBtn").after(seg) : row?.appendChild(seg));
  const bar = document.createElement("div");
  bar.className = "cmt-bar"; bar.hidden = true;
  bar.innerHTML = `
    <button type="button" class="chip" data-act="fetch" title="Fetch new comments">↻ Fetch</button><span class="cmt-at"></span>
    <span class="cmt-sep"></span>
    <button type="button" class="chip" data-act="done" title="Show / hide Complete pins">Show Complete</button>
    <button type="button" class="chip" data-act="list" title="Thread list (L)">List</button>
    <button type="button" class="chip" data-act="export" title="Export comments for an AI agent">Export</button>
    <button type="button" class="chip" data-act="settings" title="Comment settings">⚙</button>
    <div class="cmt-exp" hidden>
      <b>Export for an AI agent</b>
      <span class="cmt-exp__hint">Markdown with screen, element, selector, Figma node, files and the whole conversation. Paste it to an agent.</span>
      <label><input type="radio" name="cmtExpScope" value="screen" checked> This screen</label>
      <label><input type="radio" name="cmtExpScope" value="all"> All screens</label>
      <label><input type="checkbox" data-role="expDone"> Include Complete</label>
      <div class="cmt-exp__n" data-role="expN"></div>
      <div class="cmt-btns"><button type="button" class="cmt-ib cmt-ib--txt" data-act="expDownload">Download .md</button><button type="button" class="cmt-send" data-act="expCopy">Copy</button></div>
    </div>
    <div class="cmt-set" hidden>
      <div class="cmt-set__name" data-role="nameRow"><span>Name</span><b data-role="nameShow">–</b><button type="button" class="cmt-ib cmt-ib--txt" data-act="nameEdit">Edit</button></div>
      <div class="cmt-set__edit" data-role="nameEditRow" hidden><input data-role="name" maxlength="40" placeholder="e.g. nattaset"><div class="cmt-btns"><button type="button" class="cmt-ib cmt-ib--txt" data-act="nameCancel">Cancel</button><button type="button" class="cmt-send" data-act="nameSave">Save</button></div></div><div class="cmt-set__me" data-role="meRow" hidden>Signed in as <b data-role="me">–</b></div>
      <label>Check for new every <select data-role="every"><option value="0">Off</option><option value="1">1 min</option><option value="3">3 min</option><option value="5">5 min</option><option value="10">10 min</option></select></label>
      <div class="cmt-set__src">${LOCAL ? "Local store: .work/comments.json (bake-server)" : "Team store: /api/comments"}</div>
    </div>`;
  if (row) row.after(bar); else tools?.appendChild(bar);
  const chipPlay = $(".cmt-play", seg), chipCmt = $(".cmt-cmode", seg), countEl = $(".cmt-count", seg), atEl = $(".cmt-at", bar), setBox = $(".cmt-set", bar);
  const everySel = $('[data-role="every"]', bar); everySel.value = pref.get("every", "3");
  const nameIn = $('[data-role="name"]', bar);
  function setName(v) {   // the one place the typed name is saved
    pref.set("name", v); $('[data-role="nameShow"]', bar).textContent = v || "–";
    renderPins(); refreshCard(true); renderList();
  }
  $('[data-role="nameShow"]', bar).textContent = pref.get("name", "") || "–";
  function nameEditing(v) { $('[data-role="nameRow"]', bar).hidden = v; $('[data-role="nameEditRow"]', bar).hidden = !v; if (v) { nameIn.value = pref.get("name", ""); nameIn.focus(); nameIn.select(); } }

  // ------------------------------------------------------------ geometry
  const stageW = () => stage.offsetWidth || 1920, stageH = () => stage.offsetHeight || 1080;
  function toStage(cx, cy) { const r = stage.getBoundingClientRect(); return { x: (cx - r.left) / r.width * stageW(), y: (cy - r.top) / r.height * stageH() }; }
  function fromStage(x, y) { const r = stage.getBoundingClientRect(); return { left: r.left + x / stageW() * r.width, top: r.top + y / stageH() * r.height }; }
  const curScreen = () => $("#stage section.screen.is-active")?.dataset.screen || null;
  const screenEl = key => $(`#stage section.screen[data-screen="${CSS.escape(key)}"]`);
  const shown = el => {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    return el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : getComputedStyle(el).visibility !== "hidden";
  };
  // something else (Intro, Login, a dialog...) drawn over the element at this point = the element is not seen
  const covered = (el, x, y) => {
    const top = document.elementsFromPoint(x, y).find(n => !n.closest("#cmt, #tools, #hud, #dev, #logPanel, #showUiBtn"));   // dev UI never hides a pin
    return !!top && !(top === el || el.contains(top) || top.contains(el));
  };
  const qAttr = v => String(v).replace(/["\\]/g, "\\$&");

  // short CSS path from the screen (or #stage) down to el
  function selectorFor(el, scopeEl) {
    const parts = [];
    for (let n = el; n && n !== scopeEl && n !== document.body; n = n.parentElement) {
      if (n.id) { parts.unshift("#" + CSS.escape(n.id)); return parts.join(" > "); }
      const tag = n.tagName.toLowerCase();
      if (n.dataset.id) parts.unshift(`${tag}[data-id="${qAttr(n.dataset.id)}"]`);
      else if (n.dataset.bind) parts.unshift(`${tag}[data-bind="${qAttr(n.dataset.bind)}"]`);
      else parts.unshift(`${tag}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
    }
    parts.unshift(scopeEl.id ? "#" + CSS.escape(scopeEl.id) : "#stage");
    return parts.join(" > ");
  }
  function labelFor(el) {
    if (el.dataset.figma) return el.dataset.figma;
    const tag = el.tagName.toLowerCase(), cls = [...el.classList].filter(c => !/^is-/.test(c))[0];
    const f = el.closest("[data-figma]");
    return (cls ? `${tag}.${cls}` : tag) + (f ? ` · in ${f.dataset.figma}` : "");
  }
  // where a thread sits now: {el?, box?, x, y (viewport), state: "point" | "el" | "orphan", visible}
  function resolve(t) {
    const a = t.anchor || {};
    const scr = screenEl(t.screen);
    const pt = fromStage(a.x || 0, a.y || 0);
    if (!a.figma && !a.selector) return { state: "point", left: pt.left, top: pt.top, visible: true };
    const at = (el, left, top) => ({ state: "el", el, left, top, visible: shown(el) && !covered(el, left, top) });
    if (a.selector) {
      let el = null; try { el = document.querySelector(a.selector); } catch (e) {}
      if (el && (!a.figma || el.closest("[data-figma]")?.dataset.figma === a.figma)) {   // the same element, not whatever took its place
        const r = el.getBoundingClientRect();
        return at(el, r.left + (a.dx ?? .5) * r.width, r.top + (a.dy ?? .5) * r.height);
      }
    }
    if (a.figma) {
      const found = (scr || stage).querySelectorAll(`[data-figma="${qAttr(a.figma)}"]`);
      const one = found.length === 1 ? found[0] : (scr && scr.dataset.figma === a.figma ? scr : null);
      if (one) { const r = one.getBoundingClientRect(); return at(one, r.left + (a.fdx ?? .5) * r.width, r.top + (a.fdy ?? .5) * r.height); }
    }
    return { state: "orphan", left: pt.left, top: pt.top, visible: true };
  }
  function inStage(left, top) { const r = stage.getBoundingClientRect(); return left >= r.left - 2 && left <= r.right + 2 && top >= r.top - 2 && top <= r.bottom + 2; }
  const placeBox = (box, el) => { if (!el) { box.style.display = "none"; return; } const r = el.getBoundingClientRect(); Object.assign(box.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); box.classList.toggle("is-right", r.left > innerWidth - 320); box.classList.toggle("is-low", r.top < 24); };

  // ------------------------------------------------------------ render
  const live = () => [...threads.values()].filter(t => !t.deleted);
  function renderPins() {
    const want = new Set();
    if (on) for (const t of live()) {
      if (t.screen !== cur || (!showDone && t.status === "done" && openId !== t.id)) continue;
      const r = resolve(t);
      if (!r.visible || !inStage(r.left, r.top)) continue;
      want.add(t.id);
      let p = pins.querySelector(`[data-id="${CSS.escape(t.id)}"]`);
      if (!p) { p = document.createElement("button"); p.type = "button"; p.className = "cmt-pin"; p.dataset.id = t.id; pins.appendChild(p); }
      p.className = `cmt-pin st-${t.status}${r.state === "orphan" ? " is-orphan" : ""}${openId === t.id ? " is-open" : ""}`;
      p.textContent = t.n;
      p.title = (r.state === "orphan" ? "Orphan: element not found · " : "") + t.title;
      p.style.left = r.left + "px"; p.style.top = r.top + "px";
    }
    pins.querySelectorAll(".cmt-pin").forEach(p => { if (!want.has(p.dataset.id)) p.remove(); });
    countEl.textContent = live().filter(t => t.screen === cur && t.status !== "done").length;
    chipCmt.classList.toggle("is-offline", online === false);
    chipCmt.title = online === false ? "Comments offline (no comment server here)" : "Comment mode (Shift+C)";
  }
  function renderAt() {
    if (online === false) { atEl.textContent = "offline"; return; }
    if (!lastFetch) { atEl.textContent = "…"; return; }
    const s = (Date.now() - lastFetch) / 1000;
    atEl.textContent = s < 60 ? "updated just now" : `updated ${Math.round(s / 60)} min ago`;
  }
  function fmtAt(ms) {
    const d = (Date.now() - ms) / 1000;
    if (d < 60) return "now"; if (d < 3600) return Math.round(d / 60) + "m"; if (d < 86400) return Math.round(d / 3600) + "h";
    return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  // card position next to a viewport point, inside the window, clear of #tools
  function placeCard(left, top) {
    card.hidden = false;
    const w = card.offsetWidth, h = card.offsetHeight, W = innerWidth, H = innerHeight;
    let x = left + 18, y = top - 24;
    if (x + w > W - 8) x = left - w - 18;
    x = Math.max(8, Math.min(x, W - w - 8));
    y = Math.max(8, Math.min(y, H - h - 8));
    card.style.left = x + "px"; card.style.top = y + "px";
  }
  function threadHtml(t) {
    const r = resolve(t), mine = isMine(t.author);
    const msgs = t.messages.map(m => m.sys
      ? `<div class="cmt-msg is-sys">${esc(short(m.author))} ${esc(m.text)} <span class="cmt-at2">${fmtAt(m.at)}</span></div>`
      : `<div class="cmt-msg" data-mid="${esc(m.id)}">
          <div class="cmt-msg__h"><b>${esc(short(m.author))}</b><span class="cmt-at2" title="${new Date(m.at).toLocaleString()}">${fmtAt(m.at)}</span>${m.editedAt ? '<span class="cmt-ed">(edited)</span>' : ""}
          ${isMine(m.author) ? `<span class="cmt-acts"><button type="button" class="cmt-ib" data-act="editMsg" title="Edit">✎</button><button type="button" class="cmt-ib" data-act="delMsg" title="Delete">🗑</button></span>` : ""}</div>
          <div class="cmt-msg__t">${esc(m.text)}</div></div>`).join("");
    return `
      <div class="cmt-card__h">
        <span class="cmt-n">#${t.n}</span><div class="cmt-title">${esc(t.title)}</div>
        ${mine ? `<button type="button" class="cmt-ib" data-act="editTitle" title="Edit title">✎</button><button type="button" class="cmt-ib" data-act="delThread" title="Delete thread">🗑</button>` : ""}
        <button type="button" class="cmt-ib cmt-ib--ai" data-act="copyAi" title="Copy this thread for an AI agent (Markdown)">⧉ AI</button>
        <button type="button" class="cmt-ib" data-act="close" title="Close (Esc)">×</button>
      </div>
      <div class="cmt-card__m">
        <select class="cmt-st st-${t.status}" data-role="status">${ST.map(s => `<option value="${s.k}"${s.k === t.status ? " selected" : ""}>${s.n}</option>`).join("")}</select>
        <span>${esc(t.screen)}${t.tab ? " · " + esc(t.tab) : ""} · by ${esc(short(t.author))}</span>
      </div>
      ${r.state === "orphan" ? `<div class="cmt-orphan">Element not found: <code>${esc(t.anchor.figma || t.anchor.selector)}</code>. The pin sits at its old x,y.${mine ? ` <button type="button" class="cmt-link" data-act="reanchor">Re-anchor</button>` : ""}</div>` : ""}
      ${r.state === "el" && !r.visible ? `<div class="cmt-orphan">The element is not on screen now (other tab or hidden).</div>` : ""}
      <div class="cmt-msgs">${msgs}</div>
      <div class="cmt-reply"><textarea rows="2" data-role="reply" placeholder="Reply… (Ctrl+Enter)"></textarea><button type="button" class="cmt-send" data-act="reply">Send</button></div>`;
  }
  function composerHtml() {
    return `<div class="cmt-comp">
      <div class="cmt-anc">${esc(composer.label)}</div>
      <input data-role="ctitle" maxlength="120" placeholder="Title">
      <textarea data-role="ctext" rows="3" placeholder="Comment… (Ctrl+Enter)"></textarea>
      <div class="cmt-comp__r">
        <select class="cmt-st st-warning" data-role="cstatus">${ST.map(s => `<option value="${s.k}"${s.k === "warning" ? " selected" : ""}>${s.n}</option>`).join("")}</select>
        <span><button type="button" class="cmt-ib" data-act="cancel">Cancel</button><button type="button" class="cmt-send" data-act="create">Post</button></span>
      </div></div>`;
  }
  function openThread(id) {
    const t = threads.get(id); if (!t) return;
    composer = null; openId = id; hov.style.display = "none";
    card.innerHTML = threadHtml(t); card.className = "cmt-card"; card.hidden = false;
    const r = resolve(t); placeBox(hl, r.state === "el" && r.visible ? r.el : null); setHlLabel(r.el);
    placeCard(r.left, r.top); renderPins();
    const ms = $(".cmt-msgs", card); if (ms) ms.scrollTop = ms.scrollHeight;
  }
  function refreshCard(force) {   // after a fetch: re-render the open thread unless the user is typing in it (force = after an own op)
    if (!openId) return;
    const t = threads.get(openId);
    if (!t || t.deleted) { closeCard(); return; }
    const typing = !force && card.contains(document.activeElement) && /textarea|input/i.test(document.activeElement.tagName) && document.activeElement.value;
    if (typing) { card.classList.add("has-update"); return; }
    const keep = $(".cmt-msgs", card)?.scrollTop;
    card.innerHTML = threadHtml(t); card.classList.remove("has-update", "is-editing");
    const ms = $(".cmt-msgs", card); if (ms && keep != null) ms.scrollTop = ms.scrollHeight;
  }
  function setHlLabel(el) { $("span", hl).textContent = el ? labelFor(el) : ""; }
  function openComposer(anchor, el, left, top) {
    openId = null; composer = { anchor, label: el ? labelFor(el) : `point ${Math.round(anchor.x)}, ${Math.round(anchor.y)}`, el, left, top };
    hov.style.display = "none"; placeBox(hl, el); setHlLabel(el);
    card.innerHTML = composerHtml(); card.className = "cmt-card"; card.hidden = false;
    placeCard(left, top); renderPins();
    $('[data-role="ctitle"]', card).focus();
  }
  function closeCard() { openId = null; composer = null; card.hidden = true; card.innerHTML = ""; hl.style.display = "none"; renderPins(); }

  function renderList() {
    if (!listOpen) return;
    const arr = live().filter(t => !stOff.has(t.status) && (scope !== "screen" || t.screen === cur) && (scope !== "mine" || isMine(t.author)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    $(".cmt-list__n", list).textContent = arr.length;
    const groups = {};
    arr.forEach(t => (groups[t.screen] ||= []).push(t));
    $("ol", list).innerHTML = arr.length ? Object.entries(groups).map(([scr, ts]) => `<li class="cmt-grp">${esc(scr)}</li>` + ts.map(t => {
      const last = [...t.messages].reverse().find(m => !m.sys) || t.messages[0];
      return `<li class="cmt-row${openId === t.id ? " is-open" : ""}" data-id="${esc(t.id)}">
        <div class="cmt-row__1"><i class="cmt-dot st-${t.status}"></i><span>${stName(t.status)}</span><b>#${t.n}</b><span class="cmt-row__c">${t.messages.filter(m => !m.sys).length} msg · ${fmtAt(t.updatedAt)}</span></div>
        <div class="cmt-row__2"><b>${esc(t.title)}</b> · ${esc(short(last.author))}: ${esc(last.text)}</div></li>`;
    }).join("")).join("") : `<li class="cmt-empty">No threads for this filter</li>`;
  }
  function setList(v) { listOpen = v; list.hidden = !v; renderList(); }

  // ------------------------------------------------------------ toasts (new things from others)
  function toast(text, id, kind) {
    const el = document.createElement("button");
    el.type = "button"; el.className = "cmt-toast" + (kind ? " is-" + kind : ""); el.textContent = text;
    if (id) el.onclick = () => { jump(id); el.remove(); }; else el.onclick = () => el.remove();
    toasts.appendChild(el);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => el.remove(), id ? 8000 : 3500);
  }
  function notify(old, t) {
    if (t.deleted) return;
    const mine = myName();
    if (!old) { if (t.author !== mine) toast(`💬 ${short(t.author)} commented on ${t.screen} · #${t.n}`, t.id); return; }
    const seen = new Set(old.messages.map(m => m.id));
    const fresh = t.messages.filter(m => !seen.has(m.id) && m.author !== mine);
    if (!fresh.length) return;
    const m = fresh[fresh.length - 1];
    toast(m.sys ? `${short(m.author)} ${m.text} · #${t.n}` : `💬 ${short(m.author)} replied on #${t.n}`, t.id);
  }

  // ------------------------------------------------------------ server
  let fetching = null;
  async function fetchNow(why) {
    if (fetching) return fetching;
    fetching = (async () => {
      try {
        const r = await fetch(`${API}?proto=${encodeURIComponent(PROTO)}&since=${crev ?? ""}`, { cache: "no-store", credentials: "same-origin" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        online = true; if (j.me) me = j.me;
        if (!j.unchanged) for (const t of j.threads || []) { if (!firstLoad) notify(threads.get(t.id), t); threads.set(t.id, t); }
        crev = j.crev; firstLoad = false; lastFetch = Date.now();
        if (why === "button") toast(j.unchanged ? "Nothing new" : "Updated");
      } catch (e) {
        online = false;
        if (why === "button") toast("Fetch failed: no comment server here", null, "err");
      } finally { fetching = null; }
      const meEl = $('[data-role="me"]', bar); if (meEl) meEl.textContent = me || "–";
      $('[data-role="meRow"]', bar).hidden = !me; $('[data-role="nameRow"]', bar).hidden = !!me; if (me) $('[data-role="nameEditRow"]', bar).hidden = true;
      if (why === "load" || why === "mode") askNameIfNeeded();
      renderPins(); renderList(); refreshCard(); renderAt();
    })();
    return fetching;
  }
  async function send(op) {
    if (!myName()) { askName(); return null; }
    if (busy) return null;
    busy = true;
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ ...op, proto: PROTO, author: me ? undefined : myName() }) });
      const j = await r.json().catch(() => ({ error: "HTTP " + r.status }));
      if (!r.ok || j.error) { toast("Not saved: " + (j.error || r.status), null, "err"); return null; }
      online = true;
      if (j.thread) threads.set(j.thread.id, j.thread);
      if (crev != null && j.crev === crev + 1) crev = j.crev;   // nobody else wrote in between: no need to pull my own change again
      renderPins(); renderList();
      return j.thread || true;
    } catch (e) { online = false; toast("Not saved: comment server not reachable", null, "err"); return null; }
    finally { busy = false; }
  }

  // ------------------------------------------------------------ name modal (first visit, not signed in)
  let askedThisLoad = false;
  function askName() { modal.hidden = false; mName.value = pref.get("name", ""); setTimeout(() => mName.focus(), 0); }
  function closeModal() { modal.hidden = true; }
  function askNameIfNeeded() { if (online && !me && !pref.get("name", "") && !askedThisLoad) { askedThisLoad = true; askName(); } }
  modal.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "mLater") closeModal();
    if (b.dataset.act === "mSave") { const v = mName.value.trim(); if (!v) { mName.focus(); return; } setName(v); closeModal(); toast("Hi " + v + " · Shift+C = Comment mode"); }
  });

  // ------------------------------------------------------------ mode
  function setMode(v) {
    if (v === on) return;
    on = v;
    document.body.classList.toggle("cmt-on", on);
    chipPlay.classList.toggle("is-on", !on); chipCmt.classList.toggle("is-on", on);
    bar.hidden = !on;
    if (!on) { closeCard(); setList(false); setBox.hidden = true; reanchorId = null; hov.style.display = "none"; }
    else { if (!me && !pref.get("name", "")) askedThisLoad = false; fetchNow("mode"); }
    renderPins();
  }
  async function jump(id) {
    const t = threads.get(id); if (!t) return;
    if (!on) setMode(true);
    if (t.status === "done" && !showDone) { showDone = true; pref.set("showDone", "true"); syncDoneBtn(); }
    if (t.screen !== curScreen() && window.MTX?.show) { closeCard(); window.MTX.show(t.screen); await new Promise(r => setTimeout(r, 450)); }
    cur = curScreen();
    openThread(id);
    const p = pins.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (p) { p.classList.remove("is-flash"); void p.offsetWidth; p.classList.add("is-flash"); }
    renderList();
  }
  function syncDoneBtn() { $('[data-act="done"]', bar).classList.toggle("is-on", showDone); }
  syncDoneBtn();

  // ------------------------------------------------------------ pick (Comment mode mouse on the prototype)
  const ours = t => !!(t && t.closest && t.closest("#cmt, #tools, #dev, #showUiBtn, #logPanel"));
  const inProto = t => !!(t && t.closest && t.closest("#viewport"));
  function pickTarget(e) {
    const el = e.target;
    if (e.altKey || !el || el === stage || !stage.contains(el)) return null;
    return el;
  }
  function onHover(e) {
    if (card.hidden === false && !reanchorId) { hov.style.display = "none"; return; }
    const el = pickTarget(e);
    if (el) { hoverEl = el; placeBox(hov, el); hov.classList.remove("is-pt"); $("span", hov).textContent = (reanchorId ? "Re-anchor → " : "") + labelFor(el); return; }
    const r = stage.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { hov.style.display = "none"; return; }
    const p = toStage(e.clientX, e.clientY);
    hov.classList.add("is-pt"); Object.assign(hov.style, { display: "block", left: e.clientX + "px", top: e.clientY + "px", width: "", height: "" });
    $("span", hov).textContent = `point ${Math.round(p.x)}, ${Math.round(p.y)}`;
  }
  function anchorFor(e, el) {
    const p = toStage(e.clientX, e.clientY), a = { x: Math.round(p.x), y: Math.round(p.y) };
    if (!el) return a;
    const scr = el.closest("section.screen") || stage;
    const r = el.getBoundingClientRect();
    a.selector = selectorFor(el, scr); a.dx = +((e.clientX - r.left) / r.width).toFixed(3); a.dy = +((e.clientY - r.top) / r.height).toFixed(3);
    const f = el.closest("[data-figma]");
    if (f && stage.contains(f)) { const fr = f.getBoundingClientRect(); a.figma = f.dataset.figma; a.fdx = +((e.clientX - fr.left) / fr.width).toFixed(3); a.fdy = +((e.clientY - fr.top) / fr.height).toFixed(3); }
    return a;
  }
  // ------------------------------------------------------------ export for an AI agent (Markdown)
  const ST_ORDER = ST.map(x => x.k);
  const when = ms => { const d = new Date(ms), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const figmaId = v => (String(v || "").match(/\b\d+:\d+\b/) || [])[0];
  const code = v => "`" + String(v).replace(/`/g, "'") + "`";
  function openTag(el) { const c = el.cloneNode(false); return c.outerHTML.replace(/<\/[^>]+>$/, "").replace(/\s+/g, " ").slice(0, 300); }
  function scriptFor(key) {
    const re = new RegExp("screens/screen-" + key + "\\.js");
    const src = [...document.scripts].map(x => x.getAttribute("src") || "").find(x => re.test(x));
    return src ? src.split("?")[0] : null;
  }
  function figmaChain(el) { const out = []; for (let n = el; n && n !== stage; n = n.parentElement) if (n.dataset && n.dataset.figma) out.push(n.dataset.figma); return out.slice(0, 4); }
  function threadMd(t) {
    const r = resolve(t), a = t.anchor || {}, scr = screenEl(t.screen), L = [];
    L.push(`## #${t.n} · ${stName(t.status)} · ${t.title}`);
    L.push(`- Thread id: ${code(t.id)} · by ${short(t.author)} · ${when(t.createdAt)}${t.updatedAt !== t.createdAt ? " · updated " + when(t.updatedAt) : ""}`);
    L.push(`- Screen: ${code(t.screen)} (open with URL ${code("#screen=" + t.screen)} or ${code('MTX.show("' + t.screen + '")')})${t.tab ? " · tab/context: " + code(t.tab) : ""}`);
    if (!a.figma && !a.selector) L.push(`- Where: a point on the 1920×1080 stage, x ${a.x}, y ${a.y} (not tied to an element)`);
    else {
      L.push("- Where:" + (r.state === "orphan" ? " ⚠ element NOT FOUND any more (moved or removed); use the point and the names below" : ""));
      if (r.el) {
        const txt = (r.el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
        L.push(`  - element: ${code(openTag(r.el))}${txt ? ` text "${txt}"` : ""}`);
      }
      if (a.selector) L.push(`  - selector: ${code(a.selector)}`);
      if (a.figma) {
        const fid = figmaId(a.figma), chain = r.el ? figmaChain(r.el) : [];
        L.push(`  - data-figma: ${code(a.figma)}${fid ? ` (Figma node ${fid})` : ""}${chain.length > 1 ? " · inside: " + chain.slice(1).map(code).join(" › ") : ""}`);
      }
      if (r.el && r.el.getClientRects().length) {   // box even when covered or mid-animation
        const sr = stage.getBoundingClientRect(), er = r.el.getBoundingClientRect(), k = stageW() / sr.width;
        L.push(`  - box on the 1920×1080 stage: x ${Math.round((er.left - sr.left) * k)}, y ${Math.round((er.top - sr.top) * k)}, w ${Math.round(er.width * k)}, h ${Math.round(er.height * k)}`);
      }
      L.push(`  - clicked point on the stage: x ${a.x}, y ${a.y}`);
    }
    const files = [code("mtx-controller-flow/index.html") + (scr && scr.id ? " (section " + code("#" + scr.id) + ")" : "")];
    const js = scriptFor(t.screen); if (js) files.push(code("mtx-controller-flow/" + js));
    if (r.el) { const cls = [...r.el.classList].filter(c => !/^is-/.test(c)); if (cls.length) files.push("CSS: grep " + code("." + cls[0]) + " in " + code("mtx-controller-flow/mtx/css/")); }
    L.push("- Files to look at: " + files.join(", "));
    L.push("- Conversation:");
    for (const m of t.messages) L.push(m.sys ? `  - _${short(m.author)} ${m.text} (${when(m.at)})_` : `  - **${short(m.author)}** (${when(m.at)}${m.editedAt ? ", edited" : ""}): ${m.text.replace(/\n/g, "\n    ")}`);
    return L.join("\n");
  }
  function exportMd(list, scopeLabel) {
    const H = [], api = location.origin + API;
    H.push(`# MTX prototype comments — ${PROTO}`);
    H.push(`Exported ${when(Date.now())} by ${short(myName()) || "?"} · ${list.length} thread${list.length === 1 ? "" : "s"} · ${scopeLabel}`);
    H.push("");
    H.push("## How to work on these (for an AI agent)");
    H.push("- Project: " + code("mtx-controller-flow/") + " — vanilla JS prototype on a 1920×1080 stage (" + code("index.html") + " + " + code("mtx/js") + ", " + code("mtx/css") + "). It is the source of truth; " + code("publish-to-workingstation.bat") + " copies it to mtxworkingstation.");
    H.push("- Preview: " + code("node mtx-controller-flow/tools/bake-server.mjs") + " then open http://127.0.0.1:8765/#screen=<screen>.");
    H.push("- Find each element by its selector / data-figma in " + code("index.html") + "; rows built by JS live in " + code("mtx/js/screens/screen-<screen>.js") + " (grep the class names).");
    H.push("- Do only what each comment asks. Keep other layout and styles as they are.");
    if (LOCAL) {
      H.push("- When a thread is done, reply with what you changed and set it to Waiting for review (local comment server):");
      H.push("  " + code(`curl -X POST ${api} -H "Content-Type: application/json" -d '{"op":"reply","id":"<thread id>","text":"<what changed>","author":"agent"}'`));
      H.push("  " + code(`curl -X POST ${api} -H "Content-Type: application/json" -d '{"op":"status","id":"<thread id>","status":"review","author":"agent"}'`));
    } else H.push("- When a thread is done, list what you changed per thread id; a person sets the status on the team site.");
    H.push("");
    return H.join("\n") + "\n" + list.map(threadMd).join("\n\n") + "\n";
  }
  function exportList() {
    const sc = $('input[name="cmtExpScope"]:checked', bar)?.value || "screen", withDone = $('[data-role="expDone"]', bar).checked;
    const list = live().filter(t => (sc === "all" || t.screen === cur) && (withDone || t.status !== "done"))
      .sort((x, y) => (x.screen === cur ? 0 : 1) - (y.screen === cur ? 0 : 1) || x.screen.localeCompare(y.screen) || ST_ORDER.indexOf(x.status) - ST_ORDER.indexOf(y.status) || x.n - y.n);
    return { list, label: (sc === "all" ? "all screens" : "screen " + cur) + (withDone ? ", with Complete" : ", open only") };
  }
  function syncExpN() { const n = exportList().list.length; $('[data-role="expN"]', bar).textContent = n + " thread" + (n === 1 ? "" : "s"); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; root.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; }
  }
  function download(name, text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" })); a.download = name;
    root.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const expBox = $(".cmt-exp", bar);
  expBox.addEventListener("change", syncExpN);

  const tabOf = key => { try { return window.MTX_SCREENS?.[key]?.commentCtx?.() || undefined; } catch (e) { return undefined; } };
  async function onPick(e) {
    const r = stage.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    if (!card.hidden && !reanchorId) { closeCard(); return; }   // first click outside only closes what is open
    const el = pickTarget(e), anchor = anchorFor(e, el);
    if (reanchorId) {
      const id = reanchorId; reanchorId = null; hov.style.display = "none";
      const t = await send({ op: "reanchor", id, anchor, tab: tabOf(cur) });
      if (t) { toast("Moved #" + t.n); openThread(id); }
      return;
    }
    openComposer(anchor, el, e.clientX, e.clientY);
  }

  // one capture listener in front of the app: Comment mode locks the prototype
  const MOUSE = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "wheel", "pointermove", "mousemove", "mouseover", "mouseout", "pointerover", "pointerout", "touchstart", "touchend", "auxclick"];
  const block = e => {
    if (!on || ours(e.target) || !inProto(e.target)) return;
    e.stopPropagation();
    if (e.type === "mousemove") onHover(e);
    if (e.type === "click" && e.button === 0) onPick(e);
    if (e.cancelable && !/move|over|out/.test(e.type)) e.preventDefault();
  };
  MOUSE.forEach(t => addEventListener(t, block, { capture: true, passive: false }));
  document.addEventListener("mouseleave", () => { hov.style.display = "none"; });

  addEventListener("keydown", e => {
    const typing = e.target && /input|textarea|select/i.test(e.target.tagName);
    if (e.key === "C" && e.shiftKey && !e.ctrlKey && !e.altKey && !typing) { e.preventDefault(); e.stopPropagation(); setMode(!on); return; }
    if (ours(e.target)) {   // our fields: typing works, the app never sees it (both modes)
      if (typing) {
        e.stopPropagation();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const role = e.target.dataset.role;
          const btn = role === "emsg" ? $('[data-act="saveMsg"]', e.target.closest(".cmt-msg")) : role === "etitle" ? $('[data-act="saveTitle"]', card)
            : role === "reply" ? $('[data-act="reply"]', card) : $('[data-act="create"]', card);
          btn?.click();
        }
        if (e.key === "Escape") { e.preventDefault(); const role = e.target.dataset.role; if (role === "emsg" || role === "etitle") refreshCard(true); else e.target.blur(); }
        if (e.key === "Enter" && !e.shiftKey && e.target.dataset.role === "etitle") { e.preventDefault(); $('[data-act="saveTitle"]', card)?.click(); }
        if (e.key === "Enter" && e.target.dataset.role === "name") { e.preventDefault(); $('[data-act="nameSave"]', bar)?.click(); }
        if (e.key === "Enter" && e.target.dataset.role === "mname") { e.preventDefault(); $('[data-act="mSave"]', modal)?.click(); }
        if (e.key === "Escape" && e.target.dataset.role === "mname") closeModal();
        return;
      }
    }
    if (!modal.hidden) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeModal(); } return; }
    if (!on) return;
    if (e.key === "`" || (e.key.toLowerCase() === "h" && !e.ctrlKey)) return;   // Dev panel / Hide UI still work
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); if (reanchorId) { reanchorId = null; hov.style.display = "none"; toast("Re-anchor cancelled"); } else if (!setBox.hidden) setBox.hidden = true; else closeCard(); }
    else if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.altKey) setList(!listOpen);
    else if (["Tab", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Backspace", "Enter"].includes(e.key)) e.preventDefault();
  }, true);
  addEventListener("keyup", e => { if (on && !ours(e.target)) e.stopPropagation(); }, true);

  // ------------------------------------------------------------ UI events
  chipPlay.onclick = () => setMode(false);
  chipCmt.onclick = () => setMode(true);
  bar.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act;
    if (a === "fetch") fetchNow("button");
    if (a === "done") { showDone = !showDone; pref.set("showDone", String(showDone)); syncDoneBtn(); renderPins(); }
    if (a === "list") setList(!listOpen);
    if (a === "settings") { setBox.hidden = !setBox.hidden; nameEditing(false); expBox.hidden = true; }
    if (a === "export") { expBox.hidden = !expBox.hidden; setBox.hidden = true; if (!expBox.hidden) syncExpN(); }
    if (a === "expCopy" || a === "expDownload") {
      const { list, label } = exportList();
      if (!list.length) return toast("Nothing to export for this filter", null, "err");
      const md = exportMd(list, label);
      if (a === "expCopy") toast((await copyText(md)) ? "Copied " + list.length + " thread" + (list.length === 1 ? "" : "s") + " for an AI agent" : "Copy failed");
      else { download("mtx-comments-" + PROTO + "-" + (label.startsWith("all") ? "all" : cur) + "-" + when(Date.now()).replace(/[: ]/g, "-") + ".md", md); toast("Downloaded " + list.length + " threads"); }
      expBox.hidden = true;
    }
    if (a === "nameEdit") nameEditing(true);
    if (a === "nameCancel") nameEditing(false);
    if (a === "nameSave") { const v = nameIn.value.trim(); if (!v) { nameIn.focus(); return toast("Type a name", null, "err"); } setName(v); nameEditing(false); toast("Name saved"); }
  });
  everySel.onchange = () => { pref.set("every", everySel.value); armCheck(); };


  list.addEventListener("click", e => {
    if (e.target.closest('[data-act="listClose"]')) return setList(false);
    const sb = e.target.closest('[data-role="scope"] button');
    if (sb) { scope = sb.dataset.scope; list.querySelectorAll('[data-role="scope"] button').forEach(x => x.classList.toggle("on", x === sb)); return renderList(); }
    const fb = e.target.closest('[data-role="status"] button');
    if (fb) { fb.classList.toggle("on"); stOff[fb.classList.contains("on") ? "delete" : "add"](fb.dataset.st); return renderList(); }
    const row = e.target.closest(".cmt-row"); if (row) jump(row.dataset.id);
  });
  pins.addEventListener("click", e => { const p = e.target.closest(".cmt-pin"); if (p) { if (openId === p.dataset.id) closeCard(); else openThread(p.dataset.id); } });

  card.addEventListener("change", async e => {
    const s = e.target;
    if (s.dataset.role === "cstatus") s.className = "cmt-st st-" + s.value;
    if (s.dataset.role === "status" && openId) { s.className = "cmt-st st-" + s.value; await send({ op: "status", id: openId, status: s.value }); refreshCard(true); }
  });
  card.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act, t = openId && threads.get(openId);
    if (a === "close" || a === "cancel") return closeCard();
    if (a === "create") {
      const title = $('[data-role="ctitle"]', card).value.trim(), text = $('[data-role="ctext"]', card).value.trim();
      if (!title && !text) return toast("Type a title or a comment", null, "err");
      const th = await send({ op: "create", screen: cur, tab: tabOf(cur), anchor: composer.anchor, title, text, status: $('[data-role="cstatus"]', card).value });
      if (th) openThread(th.id);
      return;
    }
    if (!t) return;
    if (a === "reply") {
      const ta = $('[data-role="reply"]', card), v = ta.value.trim(); if (!v) return;
      if (await send({ op: "reply", id: t.id, text: v })) { card.classList.remove("has-update"); refreshCard(true); $(".cmt-msgs", card).scrollTop = 1e6; }
    }
    if (a === "editTitle") {
      const h = $(".cmt-title", card);
      h.innerHTML = `<input data-role="etitle" maxlength="120" value="${esc(t.title)}"><div class="cmt-btns"><button type="button" class="cmt-ib cmt-ib--txt" data-act="cancelEdit">Cancel</button><button type="button" class="cmt-send" data-act="saveTitle">Save</button></div>`;
      card.classList.add("is-editing"); $("input", h).focus(); $("input", h).select();
    } else if (a === "saveTitle") {
      const v = $('[data-role="etitle"]', card)?.value.trim();
      if (v && v !== t.title) await send({ op: "editTitle", id: t.id, title: v });
      refreshCard(true);
    }
    if (a === "editMsg") {
      const box = b.closest(".cmt-msg"), m = t.messages.find(x => x.id === box.dataset.mid), tx = $(".cmt-msg__t", box);
      tx.innerHTML = `<textarea rows="3" data-role="emsg">${esc(m.text)}</textarea><div class="cmt-btns"><button type="button" class="cmt-ib cmt-ib--txt" data-act="cancelEdit">Cancel</button><button type="button" class="cmt-send" data-act="saveMsg">Save</button></div>`;
      box.classList.add("is-editing"); card.classList.add("is-editing"); const ta = $("textarea", tx); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    } else if (a === "saveMsg") {
      const box = b.closest(".cmt-msg"), m = t.messages.find(x => x.id === box.dataset.mid), v = $('[data-role="emsg"]', box)?.value.trim();
      if (v && v !== m.text) await send({ op: "editMsg", id: t.id, mid: m.id, text: v });
      refreshCard(true);
    }
    if (a === "cancelEdit") { refreshCard(true); return; }
    if (a === "copyAi") { const md = exportMd([t], "thread #" + t.n); toast((await copyText(md)) ? "Copied #" + t.n + " for an AI agent" : "Copy failed"); return; }
    if (a === "delMsg") {
      const box = b.closest(".cmt-msg");
      if (confirm("Delete this message?")) { await send({ op: "deleteMsg", id: t.id, mid: box.dataset.mid }); refreshCard(true); }
    }
    if (a === "delThread") {
      if (confirm(`Delete thread #${t.n} "${t.title}"?`)) { if (await send({ op: "delete", id: t.id })) { closeCard(); toast(`Deleted #${t.n}`); } }
    }
    if (a === "reanchor") { const id = t.id; closeCard(); reanchorId = id; toast("Re-anchor: click the new element (Esc = cancel)"); }
  });

  // ------------------------------------------------------------ ticking: screen changes + pin positions (no network)
  setInterval(() => {
    const s = curScreen();
    if (s !== cur) { cur = s; if (openId && threads.get(openId)?.screen !== cur) closeCard(); if (composer) closeCard(); renderList(); renderPins(); return; }
    if (!on) return;
    renderPins();
    if (openId) { const t = threads.get(openId), r = t && resolve(t); if (r) { placeBox(hl, r.state === "el" && r.visible ? r.el : null); } }
    else if (composer && composer.el) placeBox(hl, composer.el);
  }, 250);
  setInterval(renderAt, 15000);
  let checkT = null;
  function armCheck() {
    clearInterval(checkT);
    const min = +pref.get("every", "3");
    if (min > 0) checkT = setInterval(() => { if (!document.hidden && online !== false) fetchNow("check"); }, min * 60000);
  }
  armCheck();
  addEventListener("resize", () => { if (openId) { const r = resolve(threads.get(openId)); placeCard(r.left, r.top); } });

  cur = curScreen();
  fetchNow("load");
  window.MTX_COMMENTS = { locked: () => on, setMode, fetch: () => fetchNow("button"), jump, threads: () => [...threads.values()] };
})();
