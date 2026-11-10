/* Component: Spotlight window (global, from the Campaign window, Figma 388:143691) - one big 1200 × 800 panel over a page:
   art on the right fading into the copy on the left, Tactical Style pattern top-left, slides with dots.
     MTX_UI.spotlight.open({ id, slides, page, onAction(slide, i), onClose(), closeHint, ctaInHints })
       ctaInHints: the slide's button lives in the hint bar under the panel (no button inside the panel)
       slide = { tag, art, title, sub, body, cta,          copy + the slide's button (A)
                 price: { icon, value, tone },             optional big price line (ticket shop)
                 media: "<html>",                          optional extra layer on the right (ticket, gold panel ...)
                 hint }                                    optional label for the slide key hint (default "Slide")
     ← → / LB RB slide · A the slide's button · B close (the hint bar floats under the panel)
     MTX_UI.spotlight.input(action) -> true while open · close() · isOpen() · page()
   Only one spotlight is open at a time; the caller keeps its own state and reacts in onAction / onClose. */
(() => {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const G = b => UI.glyph ? UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const IMG = "mtx/assets/img/";
  let root = null, cur = null;

  // the page behind blurs like under a Dialog (filter on the other stage layers; see dialog.css)
  const blur = on => document.getElementById("stage")?.classList.toggle("spot-open", on);
  const art = s => /^(mtx\/|https?:|data:)/.test(s.art || "") ? s.art : IMG + (s.art || "");
  function html() {
    const s = cur.slides[cur.page], n = cur.slides.length;
    return `<div class="spot__dim"></div>
      <article class="spot__panel">
        ${s.art ? `<div class="spot__art" style="background-image:url('${art(s)}')"></div>` : ""}
        ${s.media ? `<div class="spot__media">${s.media}</div>` : ""}
        <div class="spot__copy" key="${cur.page}">
          ${s.tag ? `<span class="spot__tag">${s.tag}</span>` : ""}
          <h1 class="spot__title tex-text">${s.title}</h1>
          ${s.sub ? `<p class="spot__sub">${s.sub}</p>` : ""}
          ${s.body ? `<p class="spot__body">${s.body}</p>` : ""}
          ${s.price ? `<p class="spot__price${s.price.tone ? " spot__price--" + s.price.tone : ""}">${s.price.icon ? `<img src="${s.price.icon}" alt="">` : ""}${s.price.value}</p>` : ""}
          ${s.cta && !cur.ctaInHints ? `<span class="spot__cta" data-cl-btn="a"><span class="spot__cta-key">${G("a")}</span><span>${s.cta}</span></span>` : ""}
        </div>
        ${n > 1 ? `<div class="spot__dots">${cur.slides.map((_, i) => `<i class="${i === cur.page ? "is-on" : ""}" data-spot-dot="${i}"></i>`).join("")}</div>` : ""}
      </article>
      ${UI.hintBar({ b: cur.closeHint || "Close", ...(n > 1 ? { "lb+rb": s.hint || "Slide" } : {}), ...(s.cta && cur.ctaInHints ? { a: { label: s.cta, attrs: 'data-cl-btn="a"' } } : {}) }, { cls: "spot__hints" })}`;
  }
  // switch = a slide change: the window entry (panel / art / media) does not replay, only the copy crossfades
  function render(sw) { if (root && cur) { root.className = `spot${cur.id ? " spot--" + cur.id : ""}${sw ? " is-switch" : ""}`; root.innerHTML = html(); } }
  function go(d) { const n = cur.slides.length; if (n < 2) return; cur.page = (cur.page + d + n) % n; window.MTX?.api?.rumble?.(20, .1); render(true); }
  function open(opts) {
    cur = { page: 0, ...opts }; cur.page = Math.max(0, Math.min(cur.slides.length - 1, cur.page || 0));
    if (!root) {
      root = document.createElement("section"); root.id = "spotlight";
      document.getElementById("stage").appendChild(root);
      root.addEventListener("click", e => {
        const d = e.target.closest("[data-spot-dot]"); if (d && cur) { cur.page = +d.dataset.spotDot; render(true); }
      });
    }
    root.hidden = false; render(); blur(true);
  }
  function close(silent) {
    if (!cur || !root) return; const was = cur; cur = null;
    addEventListener("keyup", e => { e.stopImmediatePropagation(); e.preventDefault(); }, { capture: true, once: true });   // the closing key does not act on the page below
    root.hidden = true;
    const st = document.getElementById("stage"); st?.classList.add("spot-snap"); blur(false); if (st) void st.offsetWidth; st?.classList.remove("spot-snap");   // the page unblurs at once: skip the Dialog blur transition
    if (!silent) was.onClose?.();
  }
  function input(a) {
    if (!cur) return false;
    if (a === "left" || a === "lt") { go(-1); return true; }
    if (a === "right" || a === "rt") { go(1); return true; }
    if (a === "back") { close(); return true; }
    if (a === "a") { const s = cur.slides[cur.page]; if (s.cta) cur.onAction?.(s, cur.page); return true; }
    return true;   // the page under the spotlight never reacts
  }
  UI.spotlight = { open, close, input, render, isOpen: () => !!cur, page: () => cur?.page ?? -1 };
})();
