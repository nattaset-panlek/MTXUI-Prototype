/* Per Tactical Style presets at runtime (data: style-presets.js; edits: localStorage mtx.style_dev = { v, styles: { id: { group: { key } } } },
   only what differs from the preset).
   Dev Tools: header #devStyle dropdown = the game style (synced both ways with the Tactical screen);
   tab "Style Presets" (#tabContentStyles) = table built from MTX_STYLE_PRESETS.ui, one column per style.
   Events on document: "mtx:style" (fired by screen-tactical applyStyle, detail {id}) and
   "mtx:styledev" (detail {style, path}; path null = whole style changed) - screens listen to the second one.
   window.MTX_STYLE_DEV = { cur(), get(id?), set(id, "group.key", v), reset(id), resetGroup(id, g), resetKey(path), copyKey(path, from), copyToAll(id), exportJson() } */
(function () {
  const P = window.MTX_STYLE_PRESETS;
  const KEY = "mtx.style_dev";
  const IDS = Object.keys(P.styles);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* still applies for this visit */ } },
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const tactical = () => window.MTX_SCREENS?.tactical;
  const cur = () => { const id = tactical()?.getSelStyle?.(); return P.styles[id] ? id : "phranakhon"; };
  const toast = m => window.MTX?.api?.toast?.(m);
  const saved = load();

  // first run: carry the old flat keys (attr_vfx emblem fields, treePlx / treeYanX / treeYanY) into every style
  function load() {
    let s = null;
    try { s = JSON.parse(ls.get(KEY) || "null"); } catch (e) { s = null; }
    const d = P.defaults, ov = {};
    let old = {};
    try { old = JSON.parse(ls.get("mtx.attr_vfx") || "null") || {}; } catch (e) { old = {}; }
    const fromOld = keys => keys.forEach(k => { if (k in old && old[k] !== d.attr[k]) (ov.attr = ov.attr || {})[k] = old[k]; });
    if (s && s.styles) {
      if (s.v >= 2) return s;
      // v2: Overall change + Confirm VFX moved from the global attr_vfx into the presets too
      fromOld(["overallAnim", "flash", "ring", "ripple", "pop"]);
      if (ov.attr) IDS.forEach(id => { const o = s.styles[id] = s.styles[id] || {}; o.attr = Object.assign({}, ov.attr, o.attr); });
      s.v = 2;
      ls.set(KEY, JSON.stringify(s));
      return s;
    }
    s = { v: 2, styles: {} };
    fromOld(Object.keys(d.attr));
    const t = { plx: "mtx.treePlx", yanX: "mtx.treeYanX", yanY: "mtx.treeYanY" };
    for (const k in t) {
      const v = ls.get(t[k]);
      if (v != null && v !== "" && +v !== d.tree[k]) (ov.tree = ov.tree || {})[k] = +v;
    }
    if (Object.keys(ov).length) IDS.forEach(id => { s.styles[id] = clone(ov); });
    ls.set(KEY, JSON.stringify(s));
    return s;
  }
  const save = () => ls.set(KEY, JSON.stringify(saved));

  // preset value of a style (defaults + styles.<id>), then with this browser's edits on top
  function base(id) {
    const out = {};
    for (const g in P.defaults) out[g] = { ...P.defaults[g], ...(P.styles[id]?.[g] || {}) };
    return out;
  }
  function get(id = cur()) {
    const out = base(id), own = saved.styles[id] || {};
    for (const g in out) Object.assign(out[g], own[g] || {});
    return out;
  }
  function emit(style, path) { document.dispatchEvent(new CustomEvent("mtx:styledev", { detail: { style, path } })); }

  function set(id, path, v) {
    const [g, k] = path.split(".");
    const own = saved.styles[id] = saved.styles[id] || {};
    if (base(id)[g]?.[k] === v) { if (own[g]) delete own[g][k]; }
    else (own[g] = own[g] || {})[k] = v;
    save();
    emit(id, path);
  }
  function reset(id = cur()) { delete saved.styles[id]; save(); emit(id, null); }
  function resetGroup(id, g) { if (saved.styles[id]) delete saved.styles[id][g]; save(); emit(id, g + ".*"); refresh(); }
  function copyToAll(id = cur()) {
    const src = get(id);
    IDS.forEach(o => {
      if (o === id) return;
      const b = base(o), own = {};
      for (const g in src) for (const k in src[g]) if (src[g][k] !== b[g][k]) (own[g] = own[g] || {})[k] = src[g][k];
      saved.styles[o] = own;
    });
    save();
    emit(id, null);
  }
  // full `styles` block for style-presets.js: per style, what differs from defaults
  function exportJson() {
    const out = {};
    IDS.forEach(id => {
      const v = get(id), d = P.defaults, o = {};
      for (const g in v) for (const k in v[g]) if (v[g][k] !== d[g][k]) (o[g] = o[g] || {})[k] = v[g][k];
      out[id] = o;
    });
    return JSON.stringify(out, null, 2);
  }

  // one key for every style: back to its preset / the value of style `from` to all
  function resetKey(path) {
    const [g, k] = path.split(".");
    IDS.forEach(id => { const o = saved.styles[id]?.[g]; if (o) delete o[k]; });
    save(); emit(cur(), path);
  }
  // rows with save: true (group "player") read / write the player's save data of each style, not the preset
  const PL = () => window.MTX_PLAYER;
  const isSave = path => path.startsWith("player.");
  const valOf = (id, path) => {
    const [g, k] = path.split(".");
    return isSave(path) ? PL()?.styleProg?.(id)?.[k] : get(id)[g]?.[k];
  };
  function copyKey(path, from = cur()) {
    const [g, k] = path.split("."), v = valOf(from, path);
    if (isSave(path)) { IDS.forEach(id => { if (id !== from) PL()?.setStyleProg?.(id, { [k]: v }); }); return; }
    IDS.forEach(id => { if (id !== from) setRaw(id, g, k, v); });
    save(); emit(cur(), path);
  }
  function setRaw(id, g, k, v) {
    const own = saved.styles[id] = saved.styles[id] || {};
    if (base(id)[g]?.[k] === v) { if (own[g]) delete own[g][k]; }
    else (own[g] = own[g] || {})[k] = v;
  }
  function resetAll() { Object.keys(saved.styles).forEach(id => delete saved.styles[id]); save(); emit(cur(), null); }

  /* ---- Dev Tools: header Style dropdown (= the game's selected style, synced both ways with the Tactical screen) */
  const sel = document.getElementById("devStyle");
  const styleInfo = () => tactical()?.getStyles?.() || {};
  function fillOptions() {
    const st = styleInfo();
    if (!sel || !st[IDS[0]] || sel.options.length) return;
    sel.innerHTML = IDS.map(id => `<option value="${id}">${st[id]?.title || id}</option>`).join("");
  }
  sel?.addEventListener("change", () => {
    tactical()?.setSelStyle?.(sel.value);   // fires mtx:style -> refresh
    toast(`Style: ${sel.selectedOptions[0]?.textContent || sel.value}`);
  });

  /* ---- Dev Tools > "Style Presets" tab: rows = MTX_STYLE_PRESETS.ui, one column per style (built once, values in refresh) */
  const tab = document.getElementById("tabContentStyles");
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  function cellHtml(r, id) {
    const a = `data-sp="${r.key}" data-id="${id}"`;
    if (r.type === "bool") return `<input type="checkbox" ${a}>`;
    if (r.type === "color") return `<input type="color" ${a}>`;
    if (r.type === "select") return `<select ${a}>${r.options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>`;
    return `<input type="number" ${a}${r.min != null ? ` min="${r.min}"` : ""}${r.max != null ? ` max="${r.max}"` : ""} step="${r.step || 1}">`;
  }
  function build() {
    if (!tab) return;
    const head = IDS.map(id => `<th data-col="${id}"><button type="button" class="sp-col" data-pick="${id}" title="Preview this style in the game"><i></i><span>${id}</span></button></th>`).join("");
    const body = P.ui.map(gr => `
      <tbody>
        <tr class="sp-group"><th colspan="${IDS.length + 2}"><span>${esc(gr.title)}</span>${gr.action ? ` <button type="button" class="chip" id="${gr.action.id}">${esc(gr.action.label)}</button>` : ""}</th></tr>
        ${gr.rows.map(r => `<tr data-row="${r.key}"${r.save ? ' class="sp-save"' : ""}>
          <th class="sp-label">${esc(r.label)}${r.unit ? ` <small>${esc(r.unit)}</small>` : ""}</th>
          ${IDS.map(id => `<td data-col="${id}">${cellHtml(r, id)}</td>`).join("")}
          <td class="sp-act"><button type="button" data-copy="${r.key}" title="Copy the selected style's value to all styles">⇉</button>${r.save ? "" : `<button type="button" data-reset="${r.key}" title="All styles back to the preset">↺</button>`}</td>
        </tr>`).join("")}
      </tbody>`).join("");
    tab.innerHTML = `
      <div class="sp-bar">
        <p class="dev-note">Per Tactical Style tuning. Source: <code>mtx/js/style-presets.js</code> · ● = edited here, not in the file yet · click a style name to preview it</p>
        <button type="button" class="chip chip--primary" id="styleDevExport" title="Copy the styles block for style-presets.js">Export JSON</button>
        <button type="button" class="chip" id="styleDevResetAll" title="Drop every edit made here: all styles back to style-presets.js">Reset all</button>
      </div>
      <div class="sp-wrap"><table class="sp-table">
        <thead><tr><th class="sp-label">Parameter</th>${head}<th></th></tr></thead>${body}
      </table></div>`;
    tab.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.pick) { tactical()?.setSelStyle?.(b.dataset.pick); return; }
      if (b.dataset.copy) { copyKey(b.dataset.copy); refresh(); toast(`${b.dataset.copy} copied to all styles`); return; }
      if (b.dataset.reset) { resetKey(b.dataset.reset); refresh(); toast(`${b.dataset.reset} back to preset`); return; }
      if (b.id === "styleDevExport") {
        const txt = exportJson();
        console.log("style-presets.js styles:\n" + txt);
        navigator.clipboard?.writeText(txt).then(() => toast("Styles JSON copied · paste into style-presets.js"), () => toast("Styles JSON in console"));
      }
      if (b.id === "styleDevResetAll" && confirm("Drop every Style Presets edit made in this browser?")) { resetAll(); refresh(); toast("All styles back to style-presets.js"); }
    });
    const onEdit = e => {
      const el = e.target.closest("[data-sp]");
      if (!el) return;
      const r = rowOf(el.dataset.sp);
      const val = el.type === "checkbox" ? el.checked : r.type === "num" ? +el.value : el.value;
      if (isSave(el.dataset.sp)) PL()?.setStyleProg?.(el.dataset.id, { [el.dataset.sp.split(".")[1]]: val });
      else set(el.dataset.id, el.dataset.sp, val);
      refresh();
    };
    tab.addEventListener("change", onEdit);
    tab.addEventListener("input", e => { if (e.target.type === "color") onEdit(e); });
  }
  const rowOf = key => P.ui.flatMap(g => g.rows).find(r => r.key === key) || {};

  function refresh() {
    fillOptions();
    const id = cur(), st = styleInfo();
    if (sel) sel.value = id;
    document.querySelectorAll(".dev-style-name").forEach(n => { n.textContent = st[id]?.title || id; });
    document.getElementById("dev")?.style.setProperty("--sd-color", st[id]?.color || "#0d99ff");
    if (!tab) return;
    tab.querySelectorAll(".sp-col").forEach(b => {
      const s = st[b.dataset.pick];
      b.querySelector("span").textContent = s?.title || b.dataset.pick;
      b.querySelector("i").style.background = s?.color || "#888";
    });
    tab.querySelectorAll("[data-col]").forEach(c => c.classList.toggle("is-cur", c.dataset.col === id));
    IDS.forEach(sid => {
      const v = get(sid), b = base(sid);
      tab.querySelectorAll(`[data-sp][data-id="${sid}"]`).forEach(el => {
        const [g, k] = el.dataset.sp.split("."), save = isSave(el.dataset.sp), val = save ? valOf(sid, el.dataset.sp) : v[g][k];
        if (el.type === "checkbox") el.checked = !!val; else if (document.activeElement !== el) el.value = val;
        el.closest("td").classList.toggle("is-mod", !save && val !== b[g][k]);
      });
    });
  }

  build();
  document.addEventListener("mtx:style", () => { refresh(); emit(cur(), null); });
  window.addEventListener("load", () => { refresh(); PL()?.on?.(() => { if (tab?.offsetParent) refresh(); }); });
  document.querySelector('.figma-tab[data-tab="styles"]')?.addEventListener("click", refresh);

  window.MTX_STYLE_DEV = { cur, get, set, reset, resetGroup, resetKey, copyKey, copyToAll, exportJson, refresh };
})();
