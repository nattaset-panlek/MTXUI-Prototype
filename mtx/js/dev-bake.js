/* Dev "Bake": turn the active screen into one 1920x1080 SVG that Figma can take.
   Copies the SVG markup to the clipboard (paste straight into Figma) and downloads it as a .svg file.
   What comes across: boxes (background colour, radius, border / inset-ring box-shadow), images (<img>,
   background-image url(), inline <svg>) embedded as PNG, and text as live <text> (one per line, with the
   computed font, size, weight, colour, letter-spacing and uppercase). CSS-only effects (::before/::after,
   gradients, masks, blend modes, filters) are not reproduced. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const W = 1920, H = 1080;
  const pngCache = new Map();

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = v => Math.round(v * 100) / 100;
  const visibleColor = c => c && c !== "transparent" && !/rgba?\([^)]*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);

  function effectiveOpacity(el, stop) {
    let o = 1;
    for (let e = el; e && e !== stop.parentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity;
    return o;
  }

  // any raster or svg image -> data URL Figma reads (PNG when it has transparency, else JPEG),
  // drawn no larger than it is shown in the 1920x1080 frame so the file stays small
  function toPng(src, w, h) {
    const key = src + "|" + Math.round(w) + "x" + Math.round(h);
    if (pngCache.has(key)) return pngCache.get(key);
    const p = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const nw = img.naturalWidth || w, nh = img.naturalHeight || h;
        const s = Math.min(1, Math.max(w / nw, h / nh));
        const cw = Math.max(1, Math.round(nw * s)), ch = Math.max(1, Math.round(nh * s));
        const c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        try {
          // transparency check on a 24x24 thumbnail
          const t = document.createElement("canvas");
          t.width = t.height = 24;
          const tc = t.getContext("2d");
          tc.drawImage(img, 0, 0, 24, 24);
          const a = tc.getImageData(0, 0, 24, 24).data;
          let alpha = false;
          for (let i = 3; i < a.length; i += 4) if (a[i] < 250) { alpha = true; break; }
          resolve(alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    pngCache.set(key, p);
    return p;
  }

  // "inset 0 0 0 2px #4e4e4e" style rings -> stroke
  function insetRing(shadow) {
    const m = /inset\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s*(rgba?\([^)]*\)|#[0-9a-f]+|color\([^)]*\))?|(rgba?\([^)]*\)|#[0-9a-f]+)\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset/i.exec(shadow || "");
    if (!m) return null;
    return m[1] ? { w: +m[1], c: m[2] } : { w: +m[4], c: m[3] };
  }

  function fontFamily(cs) {
    return cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  }

  function applyCase(text, cs) {
    if (cs.textTransform === "uppercase") return text.toUpperCase();
    if (cs.textTransform === "lowercase") return text.toLowerCase();
    return text;
  }

  // split a text node into visual lines by measuring each word
  function textLines(node) {
    const text = node.textContent, lines = [], range = document.createRange();
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const r = rects[0];
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - r.top) < r.height * 0.5) {
        last.words.push(m[0]); last.right = Math.max(last.right, r.right); last.bottom = Math.max(last.bottom, r.bottom);
      } else {
        lines.push({ words: [m[0]], left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      }
    }
    return lines;
  }

  // opts.textOnly: only the live <text> layers (used by the 1:1 baker on top of its pixel plates)
  async function bake(opts = {}) {
    const screen = document.querySelector(".screen.is-active");
    if (!screen) return null;
    const safe = screen.querySelector(".screen__safe");
    const frame = safe.getBoundingClientRect(), k = frame.width / W;
    const X = v => n((v - frame.left) / k), Y = v => n((v - frame.top) / k), S = v => n(v / k);
    const out = [];
    const jobs = [];

    const walk = el => {
      if (el.id === "tools" || el.closest?.("#tools")) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
      const r = el.getBoundingClientRect();
      const op = n(effectiveOpacity(el, screen));
      const g = op < 1 ? ` opacity="${op}"` : "";
      const x = X(r.left), y = Y(r.top), w = S(r.width), h = S(r.height);
      const scale = el.offsetWidth ? r.width / el.offsetWidth : 1;   // transformed ancestors (e.g. the 1.19 panel)

      if (!opts.textOnly && w >= 1 && h >= 1) {
        const rad = cs.borderTopLeftRadius;
        const rx = (rad.endsWith("%") ? w * parseFloat(rad) / 100 : S(parseFloat(rad) * scale)) || 0;
        const rxa = rx ? ` rx="${Math.min(rx, w / 2, h / 2)}"` : "";
        if (visibleColor(cs.backgroundColor)) out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxa} fill="${cs.backgroundColor}"${g}/>`);
        // a texture blended into its colour (soft-light etc.) would cover the colour in SVG: keep the colour only
        const bg = /^normal/.test(cs.backgroundBlendMode) ? /url\(["']?([^"')]+)["']?\)/.exec(cs.backgroundImage) : null;
        if (bg) {
          const slot = out.length; out.push("");
          const fit = /contain/.test(cs.backgroundSize) ? "xMidYMid meet" : /cover/.test(cs.backgroundSize) ? "xMidYMid slice" : "none";
          jobs.push(toPng(bg[1], w, h).then(d => { if (d) out[slot] = `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" href="${d}"${g}/>`; }));
        }
        const bw = parseFloat(cs.borderTopWidth);
        if (bw > 0 && visibleColor(cs.borderTopColor) && cs.borderTopStyle !== "none") {
          out.push(`<rect x="${n(x + S(bw * scale) / 2)}" y="${n(y + S(bw * scale) / 2)}" width="${n(w - S(bw * scale))}" height="${n(h - S(bw * scale))}"${rxa} fill="none" stroke="${cs.borderTopColor}" stroke-width="${S(bw * scale)}"${g}/>`);
        }
        const ring = insetRing(cs.boxShadow);
        if (ring && ring.c && visibleColor(ring.c)) {
          const sw = S(ring.w * scale);
          out.push(`<rect x="${n(x + sw / 2)}" y="${n(y + sw / 2)}" width="${n(w - sw)}" height="${n(h - sw)}"${rxa} fill="none" stroke="${ring.c}" stroke-width="${sw}"${g}/>`);
        }
      }

      if (el.tagName === "IMG") {
        if (!opts.textOnly && w >= 1 && h >= 1 && el.currentSrc) {
          const slot = out.length; out.push("");
          const fit = cs.objectFit === "contain" ? "xMidYMid meet" : cs.objectFit === "cover" ? "xMidYMid slice" : "none";
          jobs.push(toPng(el.currentSrc, w, h).then(d => { if (d) out[slot] = `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" href="${d}"${g}/>`; }));
        }
        return;
      }

      if (el.tagName.toLowerCase() === "svg") {
        if (opts.textOnly || w < 1 || h < 1) return;
        const clone = el.cloneNode(true);
        const src = el.querySelectorAll("*"), dst = clone.querySelectorAll("*");
        src.forEach((s, i) => {
          const c = getComputedStyle(s);
          if (c.fill) dst[i].setAttribute("fill", c.fill);
          if (c.stroke && c.stroke !== "none") { dst[i].setAttribute("stroke", c.stroke); dst[i].setAttribute("stroke-width", c.strokeWidth); }
          dst[i].removeAttribute("class");
          dst[i].removeAttribute("style");
        });
        clone.removeAttribute("class");
        clone.removeAttribute("style");
        clone.setAttribute("x", x); clone.setAttribute("y", y);
        clone.setAttribute("width", w); clone.setAttribute("height", h);
        if (op < 1) clone.setAttribute("opacity", op);
        out.push(new XMLSerializer().serializeToString(clone).replace(/ xmlns="[^"]*"/, ""));
        return;
      }

      // text nodes directly inside this element
      for (const node of el.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        let fill = cs.color;
        if (!visibleColor(fill) || cs.webkitTextFillColor === "transparent" || cs.backgroundClip === "text") fill = "#f6f1eb";
        const fs = n(S(parseFloat(cs.fontSize) * scale));
        const ls = parseFloat(cs.letterSpacing) || 0;
        const attrs = `font-family="${esc(fontFamily(cs))}" font-size="${fs}" font-weight="${cs.fontWeight}" fill="${fill}"` +
          (ls ? ` letter-spacing="${n(S(ls * scale))}"` : "") + g;
        const vertical = cs.writingMode.startsWith("vertical");
        if (vertical) {
          const rr = document.createRange(); rr.selectNodeContents(node); const b = rr.getBoundingClientRect();
          const bx = X(b.left) + S(b.width) * 0.82, by = Y(b.bottom);
          out.push(`<text x="${n(bx)}" y="${n(by)}" transform="rotate(-90 ${n(bx)} ${n(by)})" ${attrs}>${esc(applyCase(node.textContent.trim(), cs))}</text>`);
          continue;
        }
        for (const line of textLines(node)) {
          const lh = S(line.bottom - line.top);
          const base = Y(line.top) + (lh - fs) / 2 + fs * 0.8;
          out.push(`<text x="${X(line.left)}" y="${n(base)}" ${attrs}>${esc(applyCase(line.words.join(" "), cs))}</text>`);
        }
      }

      for (const c of el.children) walk(c);
    };

    walk(screen);
    await Promise.all(jobs);
    const name = screen.dataset.screen || "screen";
    if (opts.textOnly) return { name, text: out.filter(Boolean) };
    return {
      name,
      svg: `<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<title>MTX ${esc(name)}</title>\n` +
        `<rect width="${W}" height="${H}" fill="#000"/>\n` + out.filter(Boolean).join("\n") + "\n</svg>"
    };
  }

  function toast(msg) {
    window.MTX?.api?.toast ? window.MTX.api.toast(msg) : console.log(msg);
  }

  async function run(btn) {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "Baking…";
    try {
      const res = await bake();
      if (!res) { toast("Bake: no active screen"); return; }
      let copied = false;
      try { await navigator.clipboard.writeText(res.svg); copied = true; } catch (e) { /* clipboard blocked */ }
      const say = window.MTX_BAKE_STATUS || toast;
      const file = window.MTX_BAKE_SAVE ? await window.MTX_BAKE_SAVE(`${res.name}-vector`, res.svg) : null;
      if (file) {
        say(`Baked ${res.name} (vector)\nSaved: ${file}${copied ? "\nCopied: paste into Figma (Ctrl+V)" : ""}`, "ok", 12000);
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([res.svg], { type: "image/svg+xml" }));
        a.download = `mtx-${res.name}.svg`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        say(`Baked ${res.name} (vector) · ${copied ? "copied + " : ""}download started\n(run node tools/bake-server.mjs to save into bakes/ instead)`, "ok", 12000);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  function mount() {
    const row = document.querySelector("#tools .row");
    if (!row || document.getElementById("bakeBtn")) return;
    const btn = document.createElement("button");
    btn.id = "bakeBtn";
    btn.className = "chip";
    btn.type = "button";
    btn.title = "Bake this screen to SVG (copy for Figma + download)";
    btn.textContent = "Bake";
    // with dev-bake-1to1.js loaded the button opens the mode menu (1:1 layers / 1:1 flat / vector)
    btn.addEventListener("click", e => { e.stopPropagation(); window.MTX_BAKE_MENU ? window.MTX_BAKE_MENU(btn) : run(btn); });
    row.insertBefore(btn, document.getElementById("toggleUiBtn"));
  }

  window.MTX_BAKE = { bake, runVector: run };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
