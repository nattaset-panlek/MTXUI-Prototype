/* Component: global modal (console style) - one look for every menu / confirm that floats over a page.
     MTX_UI.modal.open({ kicker, title, items | body, buttons, onSelect, onClose, tone })
       items   [{ id, label, desc, icon, key }]   vertical list (↑ ↓), the focused row is a full yellow bar
       body    text                               confirm style: text + buttons in a row (← →)
       buttons [{ id, label, tone: "primary" | "danger" | "" }]
       key     glyph name drawn on the row's right edge (its shortcut, e.g. "view" for Friends)
     MTX_UI.modal.input(action) -> true while open (app.js routes every input here first)
     MTX_UI.modal.close() · isOpen()
   Modals stack: opening one over another keeps the one below and returns to it on close. */
(() => {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const ICONS = {
    resume: '<path d="M8 5v14l11-7z"/>',
    friends: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 13.6c3 .2 5.5 2.1 5.5 5.4"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    custom: '<path d="M8 3 4 6v4l3-1v12h10V9l3 1V6l-4-3c0 2-2 3-4 3S8 5 8 3Z"/>',
    controls: '<path d="M6.5 8h11a4 4 0 0 1 3.9 4.8l-1 4.6a2 2 0 0 1-3.4.9L14.5 16h-5L7 18.3a2 2 0 0 1-3.4-.9l-1-4.6A4 4 0 0 1 6.5 8Z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="11.5" r=".9"/><circle cx="17.8" cy="13.3" r=".9"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
    quit: '<path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/>',
    warn: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
  };
  const icon = k => `<svg class="mm-ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ""}</svg>`;
  const G = b => UI.glyph ? UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const stack = [];
  let root = null;
  const top = () => stack[stack.length - 1];
  const api = () => window.MTX?.api;

  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.id = "globalModal"; root.className = "mm"; root.hidden = true;
    document.getElementById("stage").appendChild(root);
    root.addEventListener("click", e => {
      const m = top(); if (!m) return;
      if (e.target.closest(".mm__scrim")) return back();
      const it = e.target.closest("[data-mm-i]"), bt = e.target.closest("[data-mm-b]");
      if (it) { m.focus = +it.dataset.mmI; render(); choose(); }
      else if (bt) { m.focus = +bt.dataset.mmB; render(); choose(); }
    });
  }
  function render() {
    const m = top(); if (!root) return;
    if (!m) { root.hidden = true; root.innerHTML = ""; return; }
    root.hidden = false;
    const list = m.items ? `<div class="mm-list" role="listbox">${m.items.map((it, i) =>
      `<div class="mm-item${i === m.focus ? " is-focused" : ""}${it.off ? " is-off" : ""}" data-mm-i="${i}" role="option" aria-selected="${i === m.focus}">
         <span class="mm-item__ico">${icon(it.icon)}</span>
         <span class="mm-item__txt"><b>${esc(it.label)}</b>${it.desc ? `<small>${esc(it.desc)}</small>` : ""}</span>
         ${it.key ? `<span class="mm-item__key">${G(it.key)}</span>` : `<i class="mm-item__chev" aria-hidden="true"></i>`}
       </div>`).join("")}</div>` : "";
    const body = m.body ? `<div class="mm-body">${m.icon ? `<span class="mm-body__ico mm-tone--${m.tone || "warn"}">${icon(m.icon)}</span>` : ""}<p>${esc(m.body)}</p></div>` : "";
    const btns = m.buttons ? `<div class="mm-btns">${m.buttons.map((b, i) =>
      `<span class="mm-btn mm-btn--${b.tone || "plain"}${i === m.focus ? " is-focused" : ""}" data-mm-b="${i}" role="button"><span>${esc(b.label)}</span></span>`).join("")}</div>` : "";
    const hints = window.MTX_UI.hintItems(m.items ? { b: "Back", a: "Select" } : { b: "Cancel", a: "Confirm" });
    root.className = `mm mm--${m.items ? "list" : "confirm"}${m.tone ? " mm--" + m.tone : ""}`;
    root.innerHTML = `<div class="mm__scrim" aria-hidden="true"></div>
      <section class="mm__panel" role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
        <i class="mm__accent" aria-hidden="true"></i>
        <header class="mm__head">${m.kicker ? `<p class="mm__kicker">${esc(m.kicker)}</p>` : ""}<h2 class="mm__title">${esc(m.title)}</h2>
          ${m.player ? `<span class="mm__player"><img src="mtx/assets/img/avatar.webp" alt=""><b>SX.MTX</b><small>Ring Warrior III · Lv 25</small></span>` : ""}</header>
        ${list}${body}${btns}
      </section>
      <footer class="mm__foot">${hints}</footer>`;
  }
  function choose() {
    const m = top(); if (!m) return;
    const pick = m.items ? m.items[m.focus] : m.buttons[m.focus];
    if (!pick || pick.off) { api()?.rumble?.(80, .15); return; }
    api()?.rumble?.(50, .25);
    m.onSelect?.(pick.id, pick);
  }
  function back() { const m = top(); if (!m) return; close(); m.onClose?.("back"); }
  function open(opts) {
    mount();
    stack.push({ focus: 0, ...opts });
    render(); api()?.rumble?.(60, .25);
    return { close };
  }
  function close() { stack.pop(); render(); }
  function input(a) {
    const m = top(); if (!m) return false;
    if (a === "back" || (a === "menu" && m.menuCloses)) { back(); return true; }
    const n = m.items ? m.items.length : m.buttons.length;
    const prev = m.items ? "up" : "left", next = m.items ? "down" : "right";
    if (a === prev || a === next) { m.focus = (m.focus + (a === prev ? -1 : 1) + n) % n; api()?.rumble?.(20, .1); render(); return true; }
    if (a === "a") { choose(); return true; }
    const hot = m.items?.findIndex(it => it.key && it.key === a);   // a row's own shortcut works while the menu is open
    if (hot >= 0) { m.focus = hot; render(); choose(); return true; }
    return true;   // the page under a modal never reacts
  }
  UI.modal = { open, close, input, isOpen: () => !!top(), render, confirm: o => UI.dialog ? UI.dialog.open({ title: o.title, body: o.body, primary: o.yes || "Confirm", secondary: o.no || "Cancel", onPrimary: () => o.onSelect?.("yes"), onSecondary: () => o.onSelect?.("no"), onClose: () => (o.onClose || o.onSelect)?.("no") })
    : open({ buttons: [{ id: "yes", label: o.yes || "Confirm", tone: o.tone === "danger" ? "danger" : "primary" }, { id: "no", label: o.no || "Cancel" }], ...o }) };   // confirm = the global Dialog
})();
