/* Dev panel · Text editor
   Design tab > Text: turn on "Pick text", click any label on screen, then change its text, font, weight and size.
   Overrides are kept in localStorage (mtx.text_overrides) and survive re-renders:
     font / weight / size / line height  -> a generated stylesheet keyed by a stable selector
     text                                -> re-applied whenever the element is rendered again */
(function () {
  const KEY = "mtx.text_overrides";
  const FONTS = ["Modi Thorson", "Industry", "Inter", "Arial", "Impact", "Georgia"];
  const stage = document.getElementById("stage") || document.body;
  const panel = document.getElementById("tabContentLayout");
  if (!panel) return;

  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { overrides = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch (e) {} };

  let picking = false, selected = null, selKey = "";

  // ---------------------------------------------------------------- UI
  const box = document.createElement("div");
  box.className = "dev-text";
  box.innerHTML = `
    <h2>Text</h2>
    <label>Pick text (click a label) <input type="checkbox" data-dt="pick"></label>
    <p class="dev-text__sel" data-dt="sel">Nothing selected</p>
    <div class="dev-text__form" data-dt="form" hidden>
      <textarea data-dt="text" rows="2" spellcheck="false" placeholder="Text"></textarea>
      <label>Font <input data-dt="font" list="devTextFonts" placeholder="Font family"></label>
      <datalist id="devTextFonts">${FONTS.map(f => `<option value="${f}">`).join("")}</datalist>
      <label>Weight <select data-dt="weight">
        <option value="">Default</option><option>400</option><option>500</option><option>600</option><option>700</option><option>900</option>
      </select></label>
      <label>Size (px) <input type="number" data-dt="size" min="6" max="300" step="1"></label>
      <label>Line height (px) <input type="number" data-dt="lh" min="0" max="300" step="1"></label>
      <div class="dev-text__row">
        <button type="button" class="chip" data-dt="reset">Reset this</button>
        <button type="button" class="chip" data-dt="resetAll">Reset all text</button>
      </div>
    </div>`;
  const anchor = panel.querySelector("#groupToolbar");
  panel.insertBefore(box, anchor || null);
  const $ = n => box.querySelector(`[data-dt="${n}"]`);

  const css = document.createElement("style");
  css.id = "devTextOverrides";
  document.head.appendChild(css);

  // ---------------------------------------------------------------- selectors
  // stable path: nearest ancestor with an id, then :nth-child steps
  function keyFor(el) {
    const parts = [];
    let n = el;
    while (n && n !== document.body) {
      if (n.id) { parts.unshift("#" + CSS.escape(n.id)); break; }
      const p = n.parentElement;
      if (!p) break;
      const i = Array.prototype.indexOf.call(p.children, n) + 1;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${i})`);
      n = p;
    }
    return parts.join(" > ");
  }

  // the element that actually holds the words (has its own text node)
  function textTarget(t) {
    let n = t;
    while (n && n !== stage) {
      if ([...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return n;
      n = n.parentElement;
    }
    return null;
  }

  // ---------------------------------------------------------------- apply
  function applyStyles() {
    css.textContent = Object.entries(overrides).map(([sel, o]) => {
      const r = [];
      if (o.font) r.push(`font-family:"${o.font.replace(/"/g, "")}" !important`);
      if (o.weight) r.push(`font-weight:${o.weight} !important`);
      if (o.size) r.push(`font-size:${o.size}px !important`);
      if (o.lh) r.push(`line-height:${o.lh}px !important`);
      return r.length ? `${sel}{${r.join(";")}}` : "";
    }).join("\n");
  }

  let applying = false;
  function applyTexts() {
    applying = true;
    for (const [sel, o] of Object.entries(overrides)) {
      if (o.text == null) continue;
      let el = null;
      try { el = document.querySelector(sel); } catch (e) { continue; }
      if (!el) continue;
      const node = [...el.childNodes].find(c => c.nodeType === 3 && c.textContent.trim());
      if (node && node.textContent !== o.text) node.textContent = o.text;
      else if (!node && el.textContent !== o.text) el.textContent = o.text;
    }
    applying = false;
  }

  let queued = false;
  new MutationObserver(() => {
    if (applying || queued) return;
    queued = true;
    setTimeout(() => { queued = false; applyTexts(); }, 0);
  }).observe(stage, { childList: true, subtree: true, characterData: true });

  // ---------------------------------------------------------------- selection
  function select(el) {
    if (selected) selected.classList.remove("dev-text-selected");
    selected = el;
    selKey = el ? keyFor(el) : "";
    $("form").hidden = !el;
    if (!el) { $("sel").textContent = "Nothing selected"; return; }
    el.classList.add("dev-text-selected");
    const c = getComputedStyle(el), o = overrides[selKey] || {};
    const cls = (el.className && el.className.toString().split(/\s+/).filter(x => x && !x.startsWith("is-") && x !== "dev-text-selected")[0]) || el.tagName.toLowerCase();
    $("sel").textContent = `.${cls}  ·  ${c.fontFamily.split(",")[0].replace(/"/g, "")} ${c.fontWeight} / ${Math.round(parseFloat(c.fontSize))}px`;
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    $("text").value = o.text != null ? o.text : (node ? node.textContent : el.textContent).trim();
    $("font").value = o.font || "";
    $("font").placeholder = c.fontFamily.split(",")[0].replace(/"/g, "");
    $("weight").value = o.weight || "";
    $("size").value = o.size || Math.round(parseFloat(c.fontSize));
    $("lh").value = o.lh || "";
    $("lh").placeholder = c.lineHeight === "normal" ? "auto" : Math.round(parseFloat(c.lineHeight));
  }

  function update(field, value) {
    if (!selected) return;
    const o = overrides[selKey] = overrides[selKey] || {};
    if (value === "" || value == null) delete o[field]; else o[field] = field === "size" || field === "lh" ? +value : value;
    if (!Object.keys(o).length) delete overrides[selKey];
    save(); applyStyles();
    if (field === "text") applyTexts();
  }

  // capture clicks before the game sees them while picking
  function onPick(e) {
    if (!picking) return;
    if (e.target.closest("#tools, #dev, #hud")) return;
    const el = textTarget(e.target);
    if (!el) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "click") select(el);
  }
  ["pointerdown", "mousedown", "click"].forEach(t => window.addEventListener(t, onPick, true));

  let hoverEl = null;
  window.addEventListener("mousemove", e => {
    if (!picking) return;
    const el = e.target.closest && !e.target.closest("#tools") ? textTarget(e.target) : null;
    if (hoverEl && hoverEl !== el) hoverEl.classList.remove("dev-text-hover");
    hoverEl = el;
    if (el) el.classList.add("dev-text-hover");
  }, true);

  $("pick").addEventListener("change", e => {
    picking = e.target.checked;
    document.body.classList.toggle("dev-text-picking", picking);
    if (!picking && hoverEl) { hoverEl.classList.remove("dev-text-hover"); hoverEl = null; }
  });
  $("text").addEventListener("input", e => update("text", e.target.value));
  $("font").addEventListener("input", e => update("font", e.target.value.trim()));
  $("weight").addEventListener("change", e => update("weight", e.target.value));
  $("size").addEventListener("input", e => update("size", e.target.value));
  $("lh").addEventListener("input", e => update("lh", e.target.value));
  $("reset").addEventListener("click", () => {
    if (!selected) return;
    delete overrides[selKey]; save(); applyStyles();
    location.reload();   // original text comes back from the screen's own render
  });
  $("resetAll").addEventListener("click", () => {
    overrides = {}; save(); applyStyles(); location.reload();
  });

  applyStyles();
  applyTexts();
})();
