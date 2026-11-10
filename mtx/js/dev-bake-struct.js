/* Dev "Bake · Structure": the active screen as an editable layer tree for Figma.
   Every visible element becomes a frame (named after its id / first meaningful class) with its box, background colour,
   linear gradients, url() images (embedded), border / inset ring, corner radius, opacity and overflow clipping;
   text nodes become text layers (font, size, weight, colour, letter-spacing, line-height, alignment, uppercase);
   <img> -> image frame; inline <svg> -> vector. Pseudo-elements, blend modes, filters and masks are not reproduced.
   Output: JSON { name, w, h, images: { key: dataURL }, root: node } saved through the bake server (/__save).
   MTX_BAKE_STRUCT.bake() returns the object; .run(btn) bakes and saves. */
(function () {
  const W = 1920, H = 1080;
  const r2 = v => Math.round(v * 100) / 100;
  const visible = c => c && c !== "transparent" && !/rgba?\([^)]*,\s*0\)$/.test(c) && !/\/\s*0\)$/.test(c);

  function rgba(c) {
    const cs = /color\(srgb\s+([^)]+)\)/.exec(c || "");          // color-mix() results: color(srgb r g b [/ a]) in 0..1
    if (cs) { const p = cs[1].split(/[\s\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    const m = /rgba?\(([^)]+)\)/.exec(c || "");
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 };
  }

  // split a CSS background-image list at top-level commas
  function layers(bi) {
    const out = []; let depth = 0, cur = "";
    for (const ch of bi || "") {
      if (ch === "(") depth++; if (ch === ")") depth--;
      if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.filter(l => l !== "none");
  }

  function gradient(l) {
    const m = /^(linear|radial|conic)-gradient\((.*)\)$/s.exec(l);
    if (!m) return null;
    if (m[1] === "conic" && / at /.test(m[2].split(",")[0])) return { type: "skip" };
    const kind = m[1];
    const parts = layers(m[2]);
    let angle = 180;
    if (kind !== "linear") {
      if (parts.length && !/^(rgba?\(|#|transparent)/i.test(parts[0])) parts.shift();   // shape / position / from-angle
      const stops = parts.map((p, i) => {
        const cm = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent)\s*([\d.]+%|[\d.]+px|[\d.]+deg)?/i.exec(p);
        if (!cm) return null;
        const col = cm[1] === "transparent" ? { r: 0, g: 0, b: 0, a: 0 } : (rgba(cm[1]) || { r: 0, g: 0, b: 0, a: 1 });
        let pos = i / Math.max(1, parts.length - 1);
        if (cm[2] && cm[2].endsWith("%")) pos = parseFloat(cm[2]) / 100;
        if (cm[2] && cm[2].endsWith("deg")) pos = parseFloat(cm[2]) / 360;
        return { ...col, position: Math.max(0, Math.min(1, pos)) };
      }).filter(Boolean);
      for (let i = 1; i < stops.length; i++) if (stops[i].position < stops[i - 1].position) stops[i].position = stops[i - 1].position;
      return stops.length >= 2 ? { type: kind, stops } : null;
    }
    if (/deg$/.test(parts[0])) angle = parseFloat(parts.shift());
    else if (/^to /.test(parts[0])) {
      const d = parts.shift();
      angle = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270, "to top right": 45, "to bottom right": 135, "to bottom left": 225, "to top left": 315 }[d] ?? 180;
    }
    const stops = parts.map((p, i) => {
      const cm = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent)\s*([\d.]+%|[\d.]+px)?/i.exec(p);
      if (!cm) return null;
      let col = cm[1] === "transparent" ? { r: 0, g: 0, b: 0, a: 0 } : rgba(cm[1]);
      if (!col && cm[1][0] === "#") { const h = cm[1].slice(1); const f = h.length === 3 ? h.split("").map(x => x + x).join("") : h; col = { r: parseInt(f.slice(0, 2), 16) / 255, g: parseInt(f.slice(2, 4), 16) / 255, b: parseInt(f.slice(4, 6), 16) / 255, a: 1 }; }
      const pos = cm[2] && cm[2].endsWith("%") ? parseFloat(cm[2]) / 100 : i / Math.max(1, parts.length - 1);
      return col ? { ...col, position: Math.max(0, Math.min(1, pos)) } : null;
    }).filter(Boolean);
    return stops.length >= 2 ? { type: "gradient", angle, stops } : null;
  }

  // image -> data URL, drawn at most at its shown size; PNG when it has transparency
  const cache = new Map();
  function toData(src, w, h) {
    const key = src + "|" + Math.round(w) + "x" + Math.round(h);
    if (!cache.has(key)) cache.set(key, new Promise(res => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const nw = img.naturalWidth || w, nh = img.naturalHeight || h;
        const s = Math.min(1, Math.max(w / nw, h / nh, .05));
        const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(nw * s)); c.height = Math.max(1, Math.round(nh * s));
        const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
        try {
          const d = x.getImageData(0, 0, c.width, c.height).data; let alpha = false;
          for (let i = 3; i < d.length; i += 16) if (d[i] < 250) { alpha = true; break; }
          res({ key, data: alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", .86) });
        } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = src;
    }));
    return cache.get(key);
  }

  const FONT = cs => cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  function nameOf(el) {
    if (el.id) return el.id;
    const c = [...el.classList].find(c => !/^(is-|has-|focus-ring|tex$|tex-|glyph--)/.test(c));
    return c || el.tagName.toLowerCase();
  }

  async function bake() {
    let screen = document.querySelector(".screen.is-active");
    // finish finite transitions / animations (a throttled pane can freeze a fade at 0)
    for (const an of document.getAnimations()) { try { if (an.effect && an.effect.getComputedTiming().iterations !== Infinity) an.finish(); } catch (e) {} }
    for (let i = 0; i < 40 && screen && +getComputedStyle(screen).opacity < 1; i++) {   // wait for the screen fade-in
      await new Promise(r => setTimeout(r, 100)); screen = document.querySelector(".screen.is-active");
    }
    // wait for the screen's enter fade to finish (a half-faded screen would bake as hidden)
    for (let i = 0; i < 40 && +getComputedStyle(screen).opacity < 1; i++) await new Promise(r => setTimeout(r, 100));
    const safe = screen.querySelector(".screen__safe");
    const fr = safe.getBoundingClientRect(), k = fr.width / W;
    const A = r => ({ x: (r.left - fr.left) / k, y: (r.top - fr.top) / k, w: r.width / k, h: r.height / k });
    const images = {}, jobs = [];

    const BL = { "soft-light": "SOFT_LIGHT", multiply: "MULTIPLY", overlay: "OVERLAY", screen: "SCREEN", "hard-light": "HARD_LIGHT", darken: "DARKEN", lighten: "LIGHTEN", "color-dodge": "COLOR_DODGE", "color-burn": "COLOR_BURN", luminosity: "LUMINOSITY", color: "COLOR", difference: "DIFFERENCE", exclusion: "EXCLUSION" };
    // background colour (bottom), background-image layers (last listed = bottom in CSS), border / inset ring, radius
    // repeating-linear-gradient(angle, colour a b, ...) -> PNG data URL at 2x (px / % stops; calc() stops are not supported)
    function hatch(l, w, h) {
      const body = l.slice(l.indexOf("(") + 1, -1), parts = layers(body);
      let ang = 180;
      if (/deg$/.test(parts[0])) ang = parseFloat(parts.shift());
      else if (/^to /.test(parts[0])) parts.shift();
      const stops = [];
      for (const p of parts) {
        if (/calc\(/.test(p)) return null;
        const m = /^(.*?\))\s*(.*)$|^(\S+)\s*(.*)$/.exec(p.trim()); if (!m) return null;
        const colS = m[1] || m[3], rest = (m[2] ?? m[4] ?? "").trim().split(/\s+/).filter(Boolean);
        const col = colS === "transparent" ? "rgba(0,0,0,0)" : colS;
        const L0 = Math.abs(w * Math.sin(ang * Math.PI / 180)) + Math.abs(h * Math.cos(ang * Math.PI / 180));
        const px = v => v.endsWith("%") ? parseFloat(v) / 100 * L0 : parseFloat(v);
        if (!rest.length) stops.push([col, stops.length ? stops[stops.length - 1][1] : 0]);
        for (const v of rest) stops.push([col, px(v)]);
      }
      const P = stops[stops.length - 1][1]; if (!(P > 0)) return null;
      const S = 2, c = document.createElement("canvas"); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
      const ctx = c.getContext("2d"), a = ang * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
      const L = Math.abs(w * dx) + Math.abs(h * dy), cx = w / 2, cy = h / 2;
      const g = ctx.createLinearGradient((cx - dx * L / 2) * S, (cy - dy * L / 2) * S, (cx + dx * L / 2) * S, (cy + dy * L / 2) * S);
      for (let r = 0; r * P <= L; r++) for (const [col, pos] of stops) { const t = (r * P + pos) / L; if (t >= 0 && t <= 1) g.addColorStop(t, col); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    }
    function paint(cs, box, node, ls1) {
      if (visible(cs.backgroundColor)) node.fills.push({ type: "solid", ...rgba(cs.backgroundColor) });
      const lays = layers(cs.backgroundImage).reverse();
      const sizes = (cs.backgroundSize || "").split(",").map(s => s.trim()).reverse();
      const blends = (cs.backgroundBlendMode || "normal").split(",").map(s => s.trim());
      while (blends.length < lays.length) blends.push(blends[blends.length - 1]);
      blends.length = lays.length; blends.reverse();
      const _unused = { "soft-light": "SOFT_LIGHT", multiply: "MULTIPLY", overlay: "OVERLAY", screen: "SCREEN", "hard-light": "HARD_LIGHT", darken: "DARKEN", lighten: "LIGHTEN", "color-dodge": "COLOR_DODGE", "color-burn": "COLOR_BURN", luminosity: "LUMINOSITY", color: "COLOR" };
      lays.forEach((l, i) => {
        if (/^repeating-linear-gradient\(/.test(l) && box.w >= 1 && box.h >= 1) {   // hatch patterns: painted exactly into a PNG fill
          const d = hatch(l, box.w, box.h);
          if (d) { const key = "hatch" + Math.random().toString(36).slice(2); images[key] = d; node.fills.push({ type: "image", key, fit: "FILL", ...(BL[blends[i]] ? { blend: BL[blends[i]] } : {}) }); }
          return;
        }
        const g = gradient(l);
        if (g && g.type === "skip") return;
        if (g) { if (BL[blends[i]]) g.blend = BL[blends[i]]; node.fills.push(g); return; }
        const u = /url\(["']?([^"')]+)["']?\)/.exec(l);
        if (u && /\.svg(\?|$)/i.test(u[1]) && !BL[blends[i]] && box.w >= 1 && box.h >= 1) {   // vector art stays vector
          const v = { name: "icon", x: box.x, y: box.y, w: box.w, h: box.h, children: [] };
          (node.bgSvgs = node.bgSvgs || []).push(v);
          jobs.push(fetch(u[1]).then(r => r.text()).then(t => {
            const doc = new DOMParser().parseFromString(t, "image/svg+xml").documentElement;
            const fit = /contain/.test(sizes[i] || "") || !/100%/.test(sizes[i] || "") ? "xMidYMid meet" : "none";
            doc.setAttribute("width", r2(box.w)); doc.setAttribute("height", r2(box.h)); doc.setAttribute("preserveAspectRatio", fit);
            v.svg = new XMLSerializer().serializeToString(doc);
          }).catch(() => {}));
          return;
        }
        if (u && box.w >= 1 && box.h >= 1) {
          const slot = node.fills.length; node.fills.push(null);
          const fit = /contain/.test(sizes[i] || "") ? "FIT" : "FILL";
          const blend = BL[blends[i]];
          jobs.push(toData(u[1], box.w, box.h).then(d => { if (d) { images[d.key] = d.data; node.fills[slot] = { type: "image", key: d.key, fit, ...(blend ? { blend } : {}) }; } }));
        }
      });
      const side = s => { const w = parseFloat(cs[`border${s}Width`]); return w > 0 && cs[`border${s}Style`] !== "none" && visible(cs[`border${s}Color`]) ? { w: w * ls1, c: cs[`border${s}Color`] } : null; };
      const sides = { Top: side("Top"), Right: side("Right"), Bottom: side("Bottom"), Left: side("Left") };
      const all = Object.values(sides);
      if (all.every(s => s && s.w === sides.Top.w && s.c === sides.Top.c)) node.stroke = { ...rgba(sides.Top.c), w: sides.Top.w, align: "INSIDE" };
      else if (node.children) for (const [s, b] of Object.entries(sides)) {   // single-side borders (border-top divider, ...) -> edge bars
        if (!b) continue;
        const r = { Top: [0, 0, box.w, b.w], Bottom: [0, box.h - b.w, box.w, b.w], Left: [0, 0, b.w, box.h], Right: [box.w - b.w, 0, b.w, box.h] }[s];
        node.children.push({ name: "border " + s.toLowerCase(), x: box.x + r[0], y: box.y + r[1], w: r[2], h: r[3], fills: [{ type: "solid", ...rgba(b.c) }], children: [] });
      }
      const ring = /inset\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s*(rgba?\([^)]*\))?|(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset/i.exec(cs.boxShadow || "");
      if (ring && !node.stroke) {
        const all = [...(cs.boxShadow || "").matchAll(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset/gi)].map(m => [rgba(m[1]), +m[2] * ls1]).filter(x => x[0]);
        if (all.length) {
          node.stroke = { ...all[0][0], w: all[0][1], align: "INSIDE" };
          let prev = all[0][1];
          for (const [c, sz] of all.slice(1)) {            // CSS: first shadow on top, later (wider) ones show below as inner bands
            if (sz <= prev || !node.children) continue;
            node.children.push({ name: "inset ring", x: box.x + prev, y: box.y + prev, w: box.w - prev * 2, h: box.h - prev * 2, fills: [], children: [], stroke: { ...c, w: sz - prev, align: "INSIDE" } });
            prev = sz;
          }
        } else { const c = rgba(ring[2] || ring[3]); if (c) node.stroke = { ...c, w: +(ring[1] || ring[4]) * ls1, align: "INSIDE" }; }
      }

      const rad = parseFloat(cs.borderTopLeftRadius);
      if (rad && !node.radius) node.radius = cs.borderTopLeftRadius.endsWith("%") ? Math.min(box.w, box.h) * parseFloat(cs.borderTopLeftRadius) / 100 : rad * ls1;
    }
    const walk = (el, ctx) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return null;
      if (el.id === "tools" || el.matches?.("script, style, template")) return null;
      if (/^rect\(0(px)?,? 0(px)?/.test(cs.clip || "") || (el.offsetWidth <= 1 && el.offsetHeight <= 1 && cs.overflow === "hidden")) return null;   // screen-reader only (live regions)
      if (cs.backfaceVisibility === "hidden") {
        let m = new DOMMatrix();
        for (let e = el; e && e !== document.body; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== "none") m = new DOMMatrix(t).multiply(m); }
        if (m.m33 < 0) return null;                          // facing away
      }
      let box = A(el.getBoundingClientRect());
      const R0 = (ctx && ctx.R) || 0;                       // total rotation of the ancestors (deg, CSS clockwise)
      let ls1 = !R0 && el.offsetWidth ? el.getBoundingClientRect().width / k / el.offsetWidth : 1;   // scale from transformed ancestors
      let rot = 0;
      const tm = /matrix\(([^)]+)\)/.exec(cs.transform || "");
      if (tm) {
        const [a, b] = tm[1].split(",").map(parseFloat);
        const r = Math.round(Math.atan2(b, a) * 180 / Math.PI * 100) / 100;
        if (Math.abs(r) > .5) { rot = r; ls1 = Math.hypot(a, b); }
      }
      if ((rot || R0) && el.offsetWidth) {                  // rotated (or inside rotated): true size, centred on the screen box
        const cx = box.x + box.w / 2, cy = box.y + box.h / 2, w = el.offsetWidth * ls1, h = el.offsetHeight * ls1;
        box = { x: cx - w / 2, y: cy - h / 2, w, h };
      }
      const node = { name: nameOf(el), ...box, fills: [], children: [] };
      if (rot) node.rot = rot;
      node.R = R0 + rot; node.pR = R0;
      if (el.dataset && el.dataset.btn) node.btn = el.dataset.btn;
      if (+cs.opacity < 1) node.opacity = +cs.opacity;
      { const bl = /blur\(([\d.]+)px\)/.exec(cs.filter || ""); if (bl) node.blur = +bl[1] * ls1; }
      if (cs.overflow === "hidden" || cs.overflowX === "hidden") node.clip = true;
      const rad = parseFloat(cs.borderTopLeftRadius); if (rad) node.radius = cs.borderTopLeftRadius.endsWith("%") ? Math.min(box.w, box.h) / 2 : rad * ls1;
      if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.type !== "hidden" && el.type !== "checkbox" && el.type !== "range") {
        // form field: its value (or the placeholder, in the placeholder colour) becomes a text layer
        paint(cs, box, node, ls1);
        const val = el.type === "password" && el.value ? "•".repeat(el.value.length) : el.value;
        const txt = val || el.placeholder || "";
        if (txt) {
          const ph = !val, pcs = ph ? getComputedStyle(el, "::placeholder") : cs;
          const col = rgba(pcs.color) || rgba(cs.color);
          const pl = parseFloat(cs.paddingLeft) || 0, fs = parseFloat(cs.fontSize);
          node.children.push({ name: ph ? "placeholder" : "value", text: cs.textTransform === "uppercase" ? txt.toUpperCase() : txt,
            x: box.x + pl * ls1, y: box.y, w: Math.max(1, box.w - pl * 2 * ls1), h: box.h, font: FONT(cs), weight: +pcs.fontWeight || +cs.fontWeight, size: fs * ls1,
            color: { ...col, a: (col?.a ?? 1) * (+pcs.opacity || 1) }, ls: (parseFloat(cs.letterSpacing) || 0) * ls1, lh: box.h, upper: false, lower: false, align: "LEFT", lines: false });
        }
        node.name = (el.name || el.dataset.loginField || "field") + " · input";
        return node;
      }
      if (el.tagName === "CANVAS") {
        try { const key = "canvas" + Math.random().toString(36).slice(2); images[key] = el.toDataURL("image/png"); node.fills.push({ type: "image", key, fit: "FILL" }); } catch (e) {}
        node.name = "canvas";
        return node;
      }
      if (el.tagName === "IMG") {
        // the picture is drawn in the content box (padding / border around it stay empty)
        const pl = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0), pr = (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderRightWidth) || 0);
        const pt = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.borderTopWidth) || 0), pb = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
        if (pl + pr + pt + pb > 0 && !node.fills.length) {
          box = { x: box.x + pl * ls1, y: box.y + pt * ls1, w: Math.max(1, box.w - (pl + pr) * ls1), h: Math.max(1, box.h - (pt + pb) * ls1) };
          Object.assign(node, box);
        }
        // a cut-out picture keeps the colour painted behind it, and an outer box-shadow ring (avatar rims) becomes an outside stroke
        if (visible(cs.backgroundColor)) node.fills.push({ type: "solid", ...rgba(cs.backgroundColor) });
        const rims = [...(cs.boxShadow || "").matchAll(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px(?!\s+inset)/gi)].map(m => [rgba(m[1]), +m[2]]).filter(x => x[0]);
        if (rims.length) { const [c, wd] = rims[rims.length - 1], inner = rims.length > 1 ? rims[rims.length - 2][1] : 0; node.stroke = { ...c, w: (wd - inner) * ls1, align: "OUTSIDE" }; }   // outermost band
        if (el.currentSrc && box.w >= 1 && box.h >= 1) {
          const fit = cs.objectFit === "contain" ? "FIT" : "FILL";
          if (/\.svg(\?|$)/i.test(el.currentSrc))   // vector art stays vector
            jobs.push(fetch(el.currentSrc).then(r => r.text()).then(t => {
              const doc = new DOMParser().parseFromString(t, "image/svg+xml").documentElement;
              doc.setAttribute("width", r2(box.w)); doc.setAttribute("height", r2(box.h));
              node.svg = new XMLSerializer().serializeToString(doc);
            }).catch(() => {}));
          else jobs.push(toData(el.currentSrc, box.w, box.h).then(d => { if (d) { images[d.key] = d.data; node.fills.push({ type: "image", key: d.key, fit }); } }));
        }
        node.name = "img " + (el.getAttribute("alt") || (el.currentSrc || "").split("/").pop().split("?")[0]);
        return node;
      }
      if (el.tagName.toLowerCase() === "svg") {
        const clone = el.cloneNode(true), src = el.querySelectorAll("*"), dst = clone.querySelectorAll("*");
        src.forEach((s, i) => {
          const c = getComputedStyle(s);
          if (c.fill) dst[i].setAttribute("fill", c.fill);
          if (c.stroke && c.stroke !== "none") { dst[i].setAttribute("stroke", c.stroke); dst[i].setAttribute("stroke-width", c.strokeWidth); }
          if (+c.opacity < 1) dst[i].setAttribute("opacity", c.opacity);
          if (c.strokeDasharray && c.strokeDasharray !== "none") dst[i].setAttribute("stroke-dasharray", c.strokeDasharray);
          if (c.strokeLinecap) dst[i].setAttribute("stroke-linecap", c.strokeLinecap);
          if (c.strokeLinejoin) dst[i].setAttribute("stroke-linejoin", c.strokeLinejoin);
          dst[i].removeAttribute("class"); dst[i].removeAttribute("style");
        });
        if ((box.w < 4 || box.h < 4) && cs.overflow === "visible" && el.getBBox) {
          const bb = el.getBBox(), pad = 12;
          if (bb.width > 0 || bb.height > 0) {
            const vb = [bb.x - pad, bb.y - pad, bb.width + pad * 2, bb.height + pad * 2];
            clone.setAttribute("viewBox", vb.map(r2).join(" "));
            box = { x: box.x + vb[0] * ls1, y: box.y + vb[1] * ls1, w: vb[2] * ls1, h: vb[3] * ls1 };
            Object.assign(node, box);
            clone.setAttribute("width", r2(box.w)); clone.setAttribute("height", r2(box.h));
          }
        }
        clone.removeAttribute("class"); clone.removeAttribute("style");
        clone.setAttribute("width", r2(box.w)); clone.setAttribute("height", r2(box.h));
        if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        node.svg = new XMLSerializer().serializeToString(clone);
        node.name = "icon";
        return node;
      }
      const mk = /url\(["']?([^"')]+\.svg)["']?\)/.exec((cs.webkitMaskImage && cs.webkitMaskImage !== "none" ? cs.webkitMaskImage : cs.maskImage) || "");
      if (mk && visible(cs.backgroundColor)) {
        const col = cs.backgroundColor;
        jobs.push(fetch(mk[1]).then(r => r.text()).then(t => {
          const doc = new DOMParser().parseFromString(t, "image/svg+xml").documentElement;
          doc.querySelectorAll("*").forEach(e => { if (e.getAttribute("fill") !== "none") e.setAttribute("fill", col); if (e.getAttribute("stroke") && e.getAttribute("stroke") !== "none") e.setAttribute("stroke", col); });
          if (!doc.querySelector("[fill]")) doc.setAttribute("fill", col);
          doc.setAttribute("width", r2(box.w)); doc.setAttribute("height", r2(box.h)); doc.setAttribute("preserveAspectRatio", "xMidYMid meet");
          node.svg = new XMLSerializer().serializeToString(doc);
        }).catch(() => {}));
        node.name = "icon " + nameOf(el);
        return node;
      }
      const cp = /^polygon\((.*)\)$/.exec(cs.clipPath || "");
      if (cp && !el.children.length && visible(cs.backgroundColor)) {
        const pts = cp[1].split(",").map(p => p.trim().split(/\s+/).map((v, i) => v.endsWith("%") ? parseFloat(v) / 100 * (i ? box.h : box.w) : parseFloat(v) * ls1));
        node.svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(box.w)}" height="${r2(box.h)}" viewBox="0 0 ${r2(box.w)} ${r2(box.h)}"><path d="M${pts.map(p => p.map(r2).join(" ")).join(" L")} Z" fill="${cs.backgroundColor}"/></svg>`;
        node.name = "shape " + nameOf(el);
        return node;
      }
      paint(cs, box, node, ls1);
      if (/text/.test(cs.backgroundClip || "") || /text/.test(cs.webkitBackgroundClip || "")) node.clipBg = true;   // the background paints the glyphs only
      node.cls = [...el.classList].join(" ");
      if (BL[cs.mixBlendMode]) node.blend = BL[cs.mixBlendMode];
      const pseudo = which => {
        const ps = getComputedStyle(el, which);
        if (ps.content === "none" || ps.display === "none" || +ps.opacity === 0 || ps.visibility === "hidden") return null;
        const num = v => parseFloat(v);
        // computed width/height of a content-box pseudo exclude its padding + border (a focus ring's padding is its thickness)
        const cb = ps.boxSizing !== "border-box";
        const padX = cb ? num(ps.paddingLeft) + num(ps.paddingRight) + num(ps.borderLeftWidth) + num(ps.borderRightWidth) : 0;
        const padY = cb ? num(ps.paddingTop) + num(ps.paddingBottom) + num(ps.borderTopWidth) + num(ps.borderBottomWidth) : 0;
        const pw = num(ps.width) + (padX || 0), ph = num(ps.height) + (padY || 0);
        let x = 0, y = 0, w = box.w / ls1, h = box.h / ls1;
        if (ps.position === "absolute" || ps.position === "fixed") {
          const L = num(ps.left), R = num(ps.right), T = num(ps.top), B = num(ps.bottom);
          w = !isNaN(pw) ? pw : w - (isNaN(L) ? 0 : L) - (isNaN(R) ? 0 : R);
          h = !isNaN(ph) ? ph : h - (isNaN(T) ? 0 : T) - (isNaN(B) ? 0 : B);
          x = !isNaN(L) ? L : !isNaN(R) ? box.w / ls1 - R - w : 0;
          y = !isNaN(T) ? T : !isNaN(B) ? box.h / ls1 - B - h : 0;
        } else if (!isNaN(pw) && !isNaN(ph)) { w = pw; h = ph; }
        if (w < .5 || h < .5) return null;
        const pn = { name: which.replace("::", ""), x: box.x + x * ls1, y: box.y + y * ls1, w: w * ls1, h: h * ls1, fills: [], children: [] };
        paint(ps, pn, pn, ls1);
        // ring made with a mask (border-box minus content-box, or a radial hole): the paint becomes the stroke
        const masked = (ps.webkitMaskImage && ps.webkitMaskImage !== "none") || (ps.maskImage && ps.maskImage !== "none");
        const pt = /matrix\(([^)]+)\)/.exec(ps.transform || "");
        if (pt) { const [a, b] = pt[1].split(",").map(parseFloat); const r = Math.round(Math.atan2(b, a) * 18000 / Math.PI) / 100; if (Math.abs(r) > .5) pn.rot = r; }
        const bl = /blur\(([\d.]+)px\)/.exec(ps.filter || ""); if (bl) pn.blur = +bl[1] * ls1;
        const pmk = /url\(["']?([^"')]+\.svg)["']?\)/.exec((ps.webkitMaskImage && ps.webkitMaskImage !== "none" ? ps.webkitMaskImage : ps.maskImage) || "");
        if (pmk && visible(ps.backgroundColor)) {           // icon drawn with an svg mask: the svg itself, in the background colour
          const col = ps.backgroundColor;
          jobs.push(fetch(pmk[1]).then(r => r.text()).then(t => {
            const doc = new DOMParser().parseFromString(t, "image/svg+xml").documentElement;
            doc.querySelectorAll("*").forEach(e => { if (e.getAttribute("fill") !== "none") e.setAttribute("fill", col); if (e.getAttribute("stroke") && e.getAttribute("stroke") !== "none") e.setAttribute("stroke", col); });
            if (!doc.querySelector("[fill]")) doc.setAttribute("fill", col);
            doc.setAttribute("width", r2(pn.w)); doc.setAttribute("height", r2(pn.h)); doc.setAttribute("preserveAspectRatio", "xMidYMid meet");
            pn.svg = new XMLSerializer().serializeToString(doc);
          }).catch(() => {}));
          pn.fills = []; pn.stroke = undefined; pn.name += " icon";
          if (+ps.opacity < 1) pn.opacity = +ps.opacity;
          return pn;
        }
        if (masked && pn.fills.length) {
          const rm = /calc\(100% - ([\d.]+)px\)/.exec(ps.maskImage || ps.webkitMaskImage || "");
          const pad = parseFloat(ps.paddingTop) || parseFloat(ps.borderTopWidth) || (rm ? +rm[1] : /radial/.test(ps.maskImage || ps.webkitMaskImage) ? Math.max(3, Math.min(w, h) * .09) : 2);
          pn.stroke = { paint: pn.fills[pn.fills.length - 1], w: pad * ls1, align: "INSIDE" };
          pn.fills = [];
          pn.name += " ring";
        }
        if (+ps.opacity < 1) pn.opacity = +ps.opacity;
        if (BL[ps.mixBlendMode]) pn.blend = BL[ps.mixBlendMode];
        if (pn.bgSvgs) { pn.children.push(...pn.bgSvgs); delete pn.bgSvgs; }
        return pn.fills.length || pn.stroke || pn.children.length ? pn : null;
      };
      if (node.bgSvgs) { node.children.push(...node.bgSvgs); delete node.bgSvgs; }
      const before = pseudo("::before"), after = pseudo("::after");
      if (before) node.children.push(before);

      // direct text nodes -> one text layer each (centred inside flex / grid boxes that centre their content)
      const centred = el.children.length === 0 && (/flex/.test(cs.display) ? cs.justifyContent === "center" : /grid/.test(cs.display) && (cs.justifyItems === "center" || cs.justifyContent === "center"));
      for (const t of el.childNodes) {
        if (t.nodeType !== 3 || !t.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(t);
        const rects = [...rg.getClientRects()]; if (!rects.length) continue;
        const tb = A(rg.getBoundingClientRect());
        if (parseFloat(cs.fontSize) < 1) continue;                      // icon keys hide their label with font-size 0
        let col = rgba(cs.color), tfills = null;
        const clipText = /text/.test(cs.backgroundClip || "") || /text/.test(cs.webkitBackgroundClip || "");
        if (clipText) {                                                 // texture / gradient titles: the background paints the text
          const tmp = { fills: [], children: [] }; paint(cs, box, tmp, ls1);
          tfills = tmp.fills.length ? tmp.fills : null;
          col = { r: .965, g: .945, b: .922, a: 1 };
        } else if (!col || col.a === 0) continue;                        // transparent label (PlayStation keys): not drawn
        const lh = parseFloat(cs.lineHeight);
        node.children.push({ name: t.textContent.trim().slice(0, 40), text: t.textContent.replace(/\s+/g, " ").trim(), ...tb,
          font: FONT(cs), weight: +cs.fontWeight, size: parseFloat(cs.fontSize) * ls1,
          color: col, ...(tfills ? { tfills } : {}), ls: (parseFloat(cs.letterSpacing) || 0) * ls1, lh: isNaN(lh) ? null : lh * ls1,
          upper: cs.textTransform === "uppercase", lower: cs.textTransform === "lowercase",
          align: centred ? "CENTER" : ({ center: "CENTER", right: "RIGHT", end: "RIGHT", justify: "JUSTIFIED" }[cs.textAlign] || "LEFT"),
          ...(centred ? { x: box.x, w: box.w } : {}),
          lines: rects.length > 1 && new Set(rects.map(r => Math.round(r.top))).size > 1 });
        if (/^vertical/.test(cs.writingMode)) {             // vertical text: a horizontal text layer turned 90deg about its centre
          const t = node.children[node.children.length - 1], cx = t.x + t.w / 2, cy = t.y + t.h / 2, nw = t.h, nh = t.w;
          Object.assign(t, { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh, rot: 90, lines: false });
        }
      }
      const kids = [];
      for (const c of el.children) {
        const ch = walk(c, { R: R0 + rot }); if (!ch) continue;
        const cc = getComputedStyle(c);
        kids.push([cc.position !== "static" && cc.zIndex !== "auto" ? +cc.zIndex || 0 : 0, ch]);
      }
      kids.sort((a, b) => a[0] - b[0]);                     // paint order: z-index (stable for equal values)
      node.children.push(...kids.map(k => k[1]));
      if (after) node.children.push(after);
      // collapse: plain wrappers with no own paint and one child keep the child's name context
      if (!node.fills.length && !node.stroke && !node.clip && !node.opacity && node.children.length === 0 && !node.text) return null;
      // zero-size wrappers (only absolute children): take the children's bounds
      if ((node.w < 1 || node.h < 1) && node.children.length) {
        const xs = node.children.map(c => c.x), ys = node.children.map(c => c.y);
        const x1 = Math.max(...node.children.map(c => c.x + c.w)), y1 = Math.max(...node.children.map(c => c.y + c.h));
        node.x = Math.min(...xs); node.y = Math.min(...ys); node.w = x1 - node.x; node.h = y1 - node.y;
      }
      return node;
    };

    const root = walk(screen);
    // open overlays that live outside the screen (Simulate Day popups, Character Customization, ...) go on top
    for (const o of document.getElementById("stage").children) {
      if (o.matches("section.screen, #tools, #hud, script") || o.closest("#tools")) continue;
      const cs = getComputedStyle(o);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0 || o.hidden || o.getAttribute("aria-hidden") === "true") continue;
      const r = o.getBoundingClientRect(); if (r.width < 50 || r.height < 50) continue;
      const n = walk(o); if (n) { n.name = "overlay " + n.name; root.children.push(n); }
    }
    await Promise.all(jobs);
    // absolute -> relative to the parent, rounded
    const rel = (n, px, py) => {
      if (n.clipBg) { n.fills = []; delete n.clipBg; }
      if (n.fills) n.fills = n.fills.filter(Boolean);      // background-clip:text -> the texture is on the text, not the box
      (n.children || []).forEach(c => rel(c, n.x, n.y));
      n.x = r2(n.x - px); n.y = r2(n.y - py); n.w = r2(Math.max(.01, n.w)); n.h = r2(Math.max(.01, n.h));
      if (n.fills) n.fills = n.fills.filter(Boolean);
      if (n.svg) delete n.children;
    };
    root.x = 0; root.y = 0; root.w = W; root.h = H;
    root.children.forEach(c => rel(c, 0, 0));
    root.clip = true;
    root.name = "MTX · " + (screen.dataset.screen || "screen");
    return { name: screen.dataset.screen || "screen", w: W, h: H, images, root };
  }

  // one element (and its subtree) as a tree relative to itself: used to bake components (e.g. every key glyph per device)
  async function bakeEl(el) {
    const keep = document.querySelector(".screen.is-active");
    const tmp = await bake();                                   // reuse the full walker, then cut the element out
    const r = el.getBoundingClientRect(), fr = keep.querySelector(".screen__safe").getBoundingClientRect(), k = fr.width / W;
    const ax = (r.left - fr.left) / k, ay = (r.top - fr.top) / k;
    let found = null;
    const find = (n, px, py) => {
      const x = px + n.x, y = py + n.y;
      if (!found && n.text === undefined && Math.abs(x - ax) < 1 && Math.abs(y - ay) < 1 && Math.abs(n.w - r.width / k) < 1 && (n.cls || "").includes(el.classList[0] || "#"))
        { found = { ...n, x: 0, y: 0 }; return; }
      (n.children || []).forEach(c => find(c, x, y));
    };
    find(tmp.root, 0, 0);
    return found ? { root: found, images: tmp.images } : null;
  }

  async function run() {
    const say = window.MTX_BAKE_STATUS || console.log;
    say("Baking structure…");
    const out = await bake();
    const file = window.MTX_BAKE_SAVE ? await window.MTX_BAKE_SAVE(`${out.name}-struct`, JSON.stringify(out)) : null;
    say(`Baked ${out.name} (structure) · ${Object.keys(out.images).length} images${file ? "\nSaved: " + file : ""}`, "ok", 12000);
    return file;
  }

  window.MTX_BAKE_STRUCT = { bake, run, bakeEl };
})();
