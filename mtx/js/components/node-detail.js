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

  function html({ attrs = "" } = {}) {
    return `<aside class="skill-detail nd" ${attrs} data-figma="833:93841 Node Detail · Pack I">
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
    if (r.t === "effect") return `<div class="nd-fx nd-fx--${r.tag}"><span class="nd-fx__tag">${r.tag === "flaw" ? "Flaw" : "Buff"}</span><p>${r.html}</p></div>`;
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
    const tabs = q("tabs");
    tabs.hidden = !m.tabs;
    el.classList.toggle("has-tabs", !!m.tabs);
    if (m.tabs) {
      q("pager").innerHTML = m.tabs.labels.map((t, k) =>
        `<span data-lv-tab="${k + 1}" class="${k + 1 === m.tabs.view ? "is-on" : ""} ${(Array.isArray(m.tabs.owned) ? m.tabs.owned[k] : k + 1 <= m.tabs.owned) ? "is-owned" : ""}">${esc(t)}</span>`).join("");
      q("pager").classList.toggle("is-wide", m.tabs.labels.some(t => t.length > 4));
    }
    q("stack").innerHTML = m.rows.map(row).join('<i class="nd-div"></i>') + (m.rows.length ? '<i class="nd-div"></i>' : "");
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
  let vid = null, vidTimer = 0;
  function videoOpen(host, { name, kind, label, src = "", length = 12 }) {
    videoClose();
    host.insertAdjacentHTML("beforeend", `<div class="nd-video" data-kind="${kind}" data-figma="837:100435 Video Skill Preview">
      <div class="nd-video__panel">
        <p class="nd-video__title">${esc(name)}</p>
        <div class="nd-video__player">${src ? `<video src="${src}" autoplay loop muted playsinline></video>` : `<img src="${IMG}card-art.webp" alt="">`}
          <span class="nd-video__time">0:00 / 0:${String(length).padStart(2, "0")}</span></div>
        <div class="nd-video__hints"><span class="hint-inline" data-nd-video-close>${glyph("b")}<span>Back</span></span></div>
      </div></div>`);
    vid = host.lastElementChild;
    relabel(vid);
    const t0 = performance.now(), time = vid.querySelector(".nd-video__time");
    vidTimer = setInterval(() => {
      const s = Math.floor((performance.now() - t0) / 1000) % (length + 1);
      time.textContent = `0:${String(s).padStart(2, "0")} / 0:${String(length).padStart(2, "0")}`;
    }, 250);
  }
  function videoClose() {
    clearInterval(vidTimer);
    vid?.remove();
    vid = null;
  }
  const videoIsOpen = () => !!vid;

  // long names shrink until they fit one line of the 440 px title box
  function fitTitle(h) {
    h.style.fontSize = "";
    for (let s = 40; s > 24 && h.scrollWidth > h.clientWidth + 1; s -= 2) h.style.fontSize = s - 2 + "px";
  }

  UI.nodeDetail = { html, render, relabel, COLOR, video: { open: videoOpen, close: videoClose, isOpen: videoIsOpen } };
})();
