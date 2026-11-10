/* Component: hint bar (the key + label row at the bottom of a screen).
     MTX_UI.hintBar({ b: "Back", a: "Confirm", "lt+rt": "Tabs" }, { cls })  -> <nav class="hint-bar ...">…</nav>
     MTX_UI.hintItems(data, opts)        -> only the hints, for a nav with its own class (modal / dialog keys)
     MTX_UI.hintItem("menu", "Options")  -> one hint
     <nav class="hint-bar" data-hints='{"b":"Back","a":"Confirm"}'>  -> filled by MTX_UI.renderHintBars() at startup
     <a data-nav data-focus-hints='{"lt+rt":"Mode"}'>  -> these hints join the screen's hint bar while this item is focused
                                                         (app.js setFocus calls MTX_UI.syncFocusHints)

   data:    { key: label }. "lt+rt" = a pair of keys. Always shown in the standard order of docs/HINT-BAR-ORDER.md,
            whatever the order they are written in.
            A list of [key, label] also works, for lists built at runtime.
   label:   text, or { label, off, attrs } (off = greyed out, attrs = extra HTML attributes)
   opts:    cls        extra class on the nav
            launcher   true = also add Options and Friends unless already listed
            itemAttrs  key => HTML attributes on each hint
            after      HTML added at the end of each hint
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const ORDER = ["b","a","x","y","lb+rb","lb","rb","lt+rt","lt","rt","zl+zr","zl","zr","du+dd","dl+dr","dlr","dl","dr","ls","rs","menu","view"];
  const rank = key => { const i = ORDER.indexOf(key); return i < 0 ? ORDER.indexOf("menu") : i; };

  const entries = data => Array.isArray(data)
    ? data.map(([key, label, o]) => [key, o ? { label, ...o } : label])
    : Object.entries(data || {});

  UI.hintItem = (key, value, { itemAttrs, after = "" } = {}) => {
    const v = value && typeof value === "object" ? value : { label: value };
    const btns = key.split("+"), pair = btns.length > 1;
    const glyphs = btns.map(b => UI.glyph(b)).join("");
    const attrs = [`data-hint-key="${key}"`, itemAttrs?.(key), v.attrs].filter(Boolean).join(" ");
    return `<span class="hint${pair ? " hint--pair" : ""}${v.off ? " is-off" : ""}"${attrs ? " " + attrs : ""}>${pair ? `<span class="hint__glyphs">${glyphs}</span>` : glyphs}<span>${esc(v.label)}</span>${after}</span>`;
  };

  UI.hintItems = (data, opts = {}) => {
    const list = entries(data);
    if (opts.launcher) for (const [key, label] of [["menu", "Options"], ["view", "Friends"]]) {
      if (!list.some(([k]) => k === key)) list.push([key, label]);
    }
    return list.map((item, i) => [item, i]).sort((p, q) => rank(p[0][0]) - rank(q[0][0]) || p[1] - q[1])
      .map(([[key, value]]) => UI.hintItem(key, value, opts)).join("");
  };

  UI.hintBar = (data, opts = {}) =>
    `<nav class="hint-bar${opts.cls ? " " + opts.cls : ""}">${UI.hintItems(data, opts)}</nav>`;

  // Focused item's extra hints: placed in their standard slot, removed again when the focus moves on
  UI.syncFocusHints = el => {
    document.querySelectorAll(".hint[data-hint-focus]").forEach(h => h.remove());
    const bar = el?.dataset.focusHints && el.closest(".screen")?.querySelector(".hint-bar");
    if (!bar) return;
    for (const [key, value] of Object.entries(JSON.parse(el.dataset.focusHints))) {
      const next = [...bar.querySelectorAll(":scope > .hint")].find(h => rank(h.dataset.hintKey) > rank(key));
      const html = UI.hintItem(key, value, { itemAttrs: () => "data-hint-focus" });
      if (next) next.insertAdjacentHTML("beforebegin", html); else bar.insertAdjacentHTML("beforeend", html);
    }
  };

  UI.renderHintBars = (root = document) => {
    root.querySelectorAll(".hint-bar[data-hints]").forEach(bar => { bar.innerHTML = UI.hintItems(JSON.parse(bar.dataset.hints)); });
  };
})();
