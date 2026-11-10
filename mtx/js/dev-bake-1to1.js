/* Dev "Bake 1:1": pixel-exact Figma export of the active screen.
   The browser's own frames are used (getDisplayMedia on this tab), so every CSS effect comes out exactly as
   rendered: gradients, masks, pseudo-elements, filters, blend modes, textures.

   Layers
     Background   screen__bg + anything with a blend mode / backdrop-filter, captured as one opaque plate
     <layer>      every other top-level block of the screen (fighter, tabs, panel, buttons, logo, hints...),
                  rendered alone twice, on black and on white; alpha = 1 - (white - black), colour = black / alpha.
                  That difference matte is exact for normally-blended content, so each layer is a transparent PNG
                  identical to the screen, cropped to its pixels.
     Text         "layers" mode: text is hidden while capturing and added back as live, editable <text>
                  (fonts must exist in Figma: Industry / Modi Thorson). "flat" mode keeps text inside the pixels.

   Output: one 1920x1080 SVG, a <g id="..."> per layer (Figma uses the ids as layer names), copied to the
   clipboard and downloaded. For true 1:1 pixels the 1920x1080 frame must be shown at >= 1920 css px wide
   (a 1080p screen in fullscreen); smaller windows are captured at their size and scaled up. */
(function () {
  const W = 1920, H = 1080;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const frames = n => new Promise(r => { const step = () => (n-- <= 0 ? r() : requestAnimationFrame(step)); requestAnimationFrame(step); });
  const toast = m => (window.MTX?.api?.toast ? window.MTX.api.toast(m) : console.log(m));

  const STYLE = `
    body.bake-run #tools, body.bake-run #hud, body.bake-run #start, body.bake-run #layoutBadge { visibility: hidden !important }
    body.bake-run *, body.bake-run *::before, body.bake-run *::after { transition: none !important; animation-play-state: paused !important; caret-color: transparent !important }
    body.bake-iso .screen.is-active, body.bake-iso .screen.is-active * { visibility: hidden !important }
    body.bake-iso .screen.is-active [data-bake-on], body.bake-iso .screen.is-active [data-bake-on] * { visibility: visible !important }
    body.bake-iso, body.bake-iso #stage, body.bake-iso .screen.is-active { background: var(--bake-bg) !important }
    body.bake-notext .screen.is-active * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important }
    body.bake-notext [data-bake-clip] { background: none !important }
  `;

  // ---------------------------------------------------------------- capture
  let stream = null, video = null;

  async function openCapture() {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser", frameRate: 30 },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude"
    });
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await nextVideoFrame();
  }

  function closeCapture() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    video = null;
  }

  function nextVideoFrame() {
    return new Promise(r => {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => r());
      else setTimeout(r, 60);
    });
  }

  // render settles, then two fresh video frames so the capture shows the new DOM state
  async function settle() {
    await frames(2);
    await wait(90);
    await nextVideoFrame();
    await nextVideoFrame();
  }

  // grab the 1920x1080 frame area of the tab as ImageData (frame px)
  function grab(frameRect) {
    const vw = video.videoWidth, vh = video.videoHeight;
    const sx = vw / window.innerWidth, sy = vh / window.innerHeight;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, frameRect.left * sx, frameRect.top * sy, frameRect.width * sx, frameRect.height * sy, 0, 0, W, H);
    return { data: ctx.getImageData(0, 0, W, H), srcWidth: frameRect.width * sx };
  }

  // ---------------------------------------------------------------- matte + crop
  function matte(black, white) {
    const b = black.data, w = white.data, out = new ImageData(W, H), o = out.data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0, p = 0; i < b.length; i += 4, p++) {
      const d = ((w[i] - b[i]) + (w[i + 1] - b[i + 1]) + (w[i + 2] - b[i + 2])) / 3;
      let a = 1 - d / 255;
      if (a <= 0.004) { o[i + 3] = 0; continue; }
      if (a > 1) a = 1;
      o[i] = Math.min(255, b[i] / a);
      o[i + 1] = Math.min(255, b[i + 1] / a);
      o[i + 2] = Math.min(255, b[i + 2] / a);
      o[i + 3] = Math.round(a * 255);
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return null;
    return { img: out, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  }

  function toDataUrl(img, box, opaque) {
    const c = document.createElement("canvas");
    c.width = box.w; c.height = box.h;
    c.getContext("2d").putImageData(img, -box.x, -box.y);
    return opaque ? c.toDataURL("image/jpeg", 0.92) : c.toDataURL("image/png");
  }

  // ---------------------------------------------------------------- layers
  // a block goes into the background plate only when its blending reaches what is behind it:
  // its own blend mode / backdrop-filter, or a descendant's whose nearest stacking context is outside the block
  const blends = cs => cs.mixBlendMode !== "normal" || (cs.backdropFilter && cs.backdropFilter !== "none");
  const isolates = cs => cs.isolation === "isolate" || cs.transform !== "none" || +cs.opacity < 1 || cs.filter !== "none" ||
    (cs.position !== "static" && cs.zIndex !== "auto") || (cs.mask && cs.mask !== "none") || cs.clipPath !== "none";
  const blended = el => {
    if (blends(getComputedStyle(el))) return true;
    return [...el.querySelectorAll("*")].some(d => {
      if (!blends(getComputedStyle(d))) return false;
      for (let p = d.parentElement; p; p = p.parentElement) {
        if (isolates(getComputedStyle(p))) return !el.contains(p) && p !== el ? true : false;
        if (p === el) break;
      }
      return !isolates(getComputedStyle(el));
    });
  };

  const shown = el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  function layerName(el, i) {
    const cls = [...el.classList].find(c => !/^(is-|has-|focus-ring|tex|page-title|glyph--)/.test(c)) || el.tagName.toLowerCase();
    return `${String(i).padStart(2, "0")} ${cls.replace(/^(attr|lb|cc|mq|st)[-_]+/, "").replace(/__/g, " ").replace(/[-_]/g, " ")}`.trim();
  }

  function planLayers(screen) {
    const bg = screen.querySelector(".screen__bg");
    const blocks = [];
    for (const host of screen.querySelectorAll(":scope > .screen__safe, :scope > .screen__chrome")) {
      for (const el of host.children) if (shown(el)) blocks.push(el);
    }
    const plate = [bg, ...blocks.filter(blended)].filter(Boolean);
    const layers = blocks.filter(el => !blended(el));
    return { plate, layers };
  }

  function isolate(els, color) {
    document.querySelectorAll("[data-bake-on]").forEach(e => e.removeAttribute("data-bake-on"));
    els.forEach(e => e.setAttribute("data-bake-on", ""));
    document.body.style.setProperty("--bake-bg", color);
    document.body.classList.add("bake-iso");
  }

  // ---------------------------------------------------------------- main
  async function bake1to1(mode) {
    const screen = document.querySelector(".screen.is-active");
    if (!screen) { toast("Bake 1:1: no active screen"); return; }
    if (!navigator.mediaDevices?.getDisplayMedia) { toast("Bake 1:1 needs Chrome / Edge (screen capture)"); return; }

    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);
    const name = screen.dataset.screen || "screen";
    const svgColors = [];
    let text = [];

    try {
      // live text layer first (from the real DOM, before anything is hidden)
      if (mode === "layers") text = (await window.MTX_BAKE.bake({ textOnly: true })).text;

      await openCapture();
      document.body.classList.add("bake-run");
      if (mode === "layers") {
        // keep icons that paint with currentColor, then hide all text (incl. background-clip:text titles)
        screen.querySelectorAll("svg").forEach(s => { svgColors.push([s, s.style.color]); s.style.setProperty("color", getComputedStyle(s).color, "important"); });
        screen.querySelectorAll("*").forEach(e => { if (getComputedStyle(e).backgroundClip === "text") e.setAttribute("data-bake-clip", ""); });
        document.body.classList.add("bake-notext");
      }

      const safe = screen.querySelector(".screen__safe");
      const { plate, layers } = planLayers(screen);
      const parts = [];
      let srcWidth = W;

      // 1) background plate (opaque)
      isolate(plate, "#000");
      await settle();
      const shot = grab(safe.getBoundingClientRect());
      srcWidth = shot.srcWidth;
      parts.push(`<g id="00 Background"><image x="0" y="0" width="${W}" height="${H}" href="${toDataUrl(shot.data, { x: 0, y: 0, w: W, h: H }, true)}"/></g>`);

      // 2) each block on black, then on white -> exact alpha
      let i = 1;
      for (const el of layers) {
        toast(`Bake 1:1 · layer ${i} / ${layers.length}`);
        isolate([el], "#000"); await settle();
        const b = grab(safe.getBoundingClientRect()).data;
        isolate([el], "#fff"); await settle();
        const w = grab(safe.getBoundingClientRect()).data;
        const m = matte(b, w);
        if (m) {
          parts.push(`<g id="${layerName(el, i)}"><image x="${m.box.x}" y="${m.box.y}" width="${m.box.w}" height="${m.box.h}" href="${toDataUrl(m.img, m.box, false)}"/></g>`);
        }
        i++;
      }

      if (mode === "layers" && text.length) parts.push(`<g id="${String(i).padStart(2, "0")} Text">\n${text.join("\n")}\n</g>`);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<title>MTX ${name} (1:1)</title>\n${parts.join("\n")}\n</svg>`;
      let copied = false;
      try { await navigator.clipboard.writeText(svg); copied = true; } catch (e) { /* download below still works */ }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      a.download = `mtx-${name}-1to1${mode === "flat" ? "-flat" : ""}.svg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      const sharp = srcWidth >= W - 1 ? "1:1 pixels" : `captured at ${Math.round(srcWidth)} px wide, scaled up (fullscreen on a 1080p screen for 1:1)`;
      toast(`Baked ${name} 1:1 · ${layers.length + 1} layers · ${copied ? "copied + " : ""}downloaded · ${sharp}`);
    } catch (e) {
      status(e && e.name === "NotAllowedError"
        ? "Screen capture is blocked or was cancelled here.\nRun:  node tools/bake-server.mjs  and open http://127.0.0.1:8765, then Bake again."
        : "Bake 1:1 failed: " + (e && e.message || e), "err", 15000);
    } finally {
      closeCapture();
      document.body.classList.remove("bake-run", "bake-iso", "bake-notext");
      document.body.style.removeProperty("--bake-bg");
      document.querySelectorAll("[data-bake-on]").forEach(e => e.removeAttribute("data-bake-on"));
      document.querySelectorAll("[data-bake-clip]").forEach(e => e.removeAttribute("data-bake-clip"));
      svgColors.forEach(([s, c]) => { s.style.removeProperty("color"); if (c) s.style.color = c; });
      style.remove();
    }
  }

  // ---------------------------------------------------------------- on-screen status (toasts only reach the Log panel)
  function status(msg, kind = "info", ms = 0) {
    let el = document.getElementById("bakeStatus");
    if (!el) {
      el = document.createElement("div");
      el.id = "bakeStatus";
      el.style.cssText = "position:fixed;z-index:100001;right:12px;bottom:12px;max-width:520px;padding:10px 14px;border-radius:6px;font:12px/1.45 system-ui,sans-serif;color:#eee;background:rgba(30,30,30,.97);border:1px solid #444;box-shadow:0 6px 18px rgba(0,0,0,.5);white-space:pre-line;user-select:text";
      document.body.appendChild(el);
    }
    el.style.borderColor = kind === "ok" ? "#14ae5c" : kind === "err" ? "#e5484d" : "#444";
    el.textContent = msg;
    clearTimeout(el._t);
    if (ms) el._t = setTimeout(() => el.remove(), ms);
    toast(msg.split("\n")[0]);
  }

  // ---------------------------------------------------------------- bake server (tools/bake-server.mjs)
  async function hasServer() {
    try { const r = await fetch("/__bake", { cache: "no-store" }); return r.ok && (await r.json()).baker === "1to1"; }
    catch (e) { return false; }
  }

  // save an SVG into the project's bakes/ folder through the server; null when there is no server
  async function save(name, svg) {
    try {
      const r = await fetch("/__save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, svg }) });
      if (!r.ok) return null;
      return (await r.json()).file || null;
    } catch (e) { return null; }
  }

  // the live screen as a static page: current DOM + state, scripts removed, stage reset to an unscaled 1920x1080,
  // blocks marked as plate / layers for the server
  // opts.width: stage width to render (1920 = 16:9, 2520 = 21:9); default = the live stage width
  function snapshot(mode, opts = {}) {
    const sw = opts.width || parseFloat(getComputedStyle(document.getElementById("stage")).getPropertyValue("--sw")) || 1920;
    const screen = document.querySelector(".screen.is-active");
    const { plate, layers } = planLayers(screen);
    plate.forEach(e => e.setAttribute("data-bake-plate", ""));
    layers.forEach((e, i) => e.setAttribute("data-bake-layer", layerName(e, i + 1)));
    if (mode === "layers") screen.querySelectorAll("*").forEach(e => { if (getComputedStyle(e).backgroundClip === "text") e.setAttribute("data-bake-clip", ""); });
    screen.querySelectorAll("svg").forEach(s => s.setAttribute("data-bake-color", getComputedStyle(s).color));
    const live = [...document.querySelectorAll("input, textarea, select")];
    const doc = document.documentElement.cloneNode(true);
    // undo the marks on the live page
    const marks = ["data-bake-plate", "data-bake-layer", "data-bake-clip", "data-bake-color"];
    document.querySelectorAll(marks.map(m => `[${m}]`).join(",")).forEach(e => marks.forEach(a => e.removeAttribute(a)));

    doc.querySelectorAll("script, #tools, #hud, #bakeMenu, #bakeStatus, #layoutBadge, #navGraph, #navEditBar").forEach(e => e.remove());
    const cloneFields = [...doc.querySelectorAll("input, textarea, select")];
    live.forEach((f, i) => {
      const c = cloneFields[i];
      if (!c) return;
      if (f.type === "checkbox" || f.type === "radio") { if (f.checked) c.setAttribute("checked", ""); }
      else c.setAttribute("value", f.value);
    });
    doc.querySelectorAll("[data-bake-color]").forEach(s => s.style.setProperty("color", s.getAttribute("data-bake-color"), "important"));
    const head = doc.querySelector("head");
    const base = document.createElement("base");
    base.href = new URL(".", location.href).href;
    head.insertBefore(base, head.firstChild);
    const st = document.createElement("style");
    st.textContent = STYLE + `
      html, body { width: ${sw}px !important; height: 1080px !important; margin: 0 !important; overflow: hidden !important }
      #stage { transform: none !important; left: 0 !important; top: 0 !important; --sw: ${sw}px !important; --ox: ${(sw - 1920) / 2}px !important }
      *, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important }`;
    head.appendChild(st);
    doc.querySelector("body").classList.remove("safe-fluid", "bake-run", "bake-iso", "bake-notext");
    return "<!doctype html>\n" + doc.outerHTML;
  }

  async function bakeViaServer(mode) {
    const screen = document.querySelector(".screen.is-active");
    const name = screen.dataset.screen || "screen";
    status(`Baking ${name} (${mode === "flat" ? "1:1 flat" : "1:1 layers"})…`);
    const text = mode === "layers" ? (await window.MTX_BAKE.bake({ textOnly: true })).text : [];
    const html = snapshot(mode, { width: 1920 });   // the Figma bake is always the 1920 frame
    const r = await fetch("/__bake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mode, html, text }) });
    const out = await r.json();
    if (!out.ok) throw new Error(out.error || "bake failed");
    let copied = false;
    try { await navigator.clipboard.writeText(out.svg); copied = true; } catch (e) { /* the file is saved anyway */ }
    status(`Baked ${name} · ${out.layers} layers · 1:1 pixels\nSaved: ${out.file}` +
      (copied ? "\nCopied: paste into Figma (Ctrl+V)" : "\nDrag the file into Figma"), "ok", 15000);
  }

  // menu entry: the bake server when it runs, otherwise this tab's screen capture
  async function run1to1(mode) {
    try {
      if (await hasServer()) return await bakeViaServer(mode);
      status("Bake server not running: using screen capture (share this tab when asked).\nBest result: run  node tools/bake-server.mjs  and open http://127.0.0.1:8765");
      await bake1to1(mode);
    } catch (e) {
      status("Bake failed: " + (e && e.message || e), "err", 15000);
    }
  }

  // ---------------------------------------------------------------- Bake menu (replaces the plain Bake click)
  function menu(btn) {
    let m = document.getElementById("bakeMenu");
    if (m) { m.remove(); return; }
    m = document.createElement("div");
    m.id = "bakeMenu";
    m.style.cssText = "position:fixed;z-index:100000;display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:6px;background:rgba(36,36,36,.97);border:1px solid #383838;box-shadow:0 6px 18px rgba(0,0,0,.5);font:12px/1.3 system-ui,sans-serif;color:#eee;width:260px";
    const r = btn.getBoundingClientRect();
    m.style.top = r.bottom + 6 + "px";
    m.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    const item = (title, sub, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.cssText = "all:unset;cursor:pointer;padding:8px 10px;border-radius:4px;display:block";
      b.innerHTML = `<b style="display:block;font-weight:600">${title}</b><span style="opacity:.65">${sub}</span>`;
      b.onmouseenter = () => (b.style.background = "#3a3a3a");
      b.onmouseleave = () => (b.style.background = "none");
      b.onclick = e => { e.stopPropagation(); m.remove(); fn(); };
      m.appendChild(b);
    };
    item("1:1 layers + editable text", "Exact pixels per layer, live text on top", () => run1to1("layers"));
    item("1:1 flat", "Exact pixels, text kept in the images", () => run1to1("flat"));
    item("Structure (editable)", "Frames, text and images as a layer tree (JSON for the Figma plugin)", () => window.MTX_BAKE_STRUCT?.run());
    item("Vector (fast)", "Re-drawn shapes, no CSS effects", () => window.MTX_BAKE.runVector(btn));
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener("click", function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener("click", off); } }), 0);
  }

  window.MTX_BAKE_MENU = menu;
  window.MTX_BAKE_SNAPSHOT = snapshot;
  window.MTX_BAKE_SAVE = save;
  window.MTX_BAKE_STATUS = status;
  window.MTX_BAKE_1TO1 = bake1to1;
  bake1to1.plan = planLayers;      // debug: which blocks become layers / go into the plate
  bake1to1.STYLE = STYLE;
})();
