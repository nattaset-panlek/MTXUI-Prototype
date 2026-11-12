/* Options (Start: Menu / Options · keyboard Tab) - side rail over the current page (Figma Section 18 "1D · Watermark", 286:38639).
     ↑ ↓ focus   A open   B / Start close   Select Friends
   Profile -> Character customization (Profile tab) · Settings -> Settings overlay (backing out returns here)
   Main Menu -> the main menu page · Exit Game -> not in this prototype
   window.MTX_OPTIONS = { open, close, toggle, isOpen, input, render } */
(() => {
  const ITEMS = [
    { id: "profile", title: "Profile", sub: "Fighter card, belts and achievements" },
    { id: "settings", title: "Settings", sub: "Gameplay, controls, audio, graphics" },
    { id: "main", title: "Main menu", sub: "Log out and go back to the login page" },
    { id: "exit", title: "Exit game", sub: "Close Muay Thai Xtreme" },
  ];
  let root = null, open = false, focus = 0, hideT = 0;
  const items = () => window.MTX_PREGAME?.() ? ITEMS.filter(it => it.id === "settings" || it.id === "exit")
    : api()?.getCur?.() === "charselect" ? ITEMS.filter(it => it.id !== "profile") : ITEMS;   // Character Select: no fighter picked yet, so no Profile   // before login: no Profile / Main menu
  const SLIDE_OUT_MS = 180;   // .op.is-closing in screens.css
  const api = () => window.MTX?.api;
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function render() {
    if (!root) return;
    focus = Math.min(focus, items().length - 1);   // the pre-login list is shorter
    const row = (it, i) => `<a class="op__row focus-ring focus-ring--thin${i === focus ? " is-focused" : ""}" data-op-i="${i}" role="menuitem" aria-label="${esc(it.title)}">${esc(it.title)}</a>`;
    root.innerHTML = `<div class="op__scrim" aria-hidden="true"></div>
      <div class="op__safe">
        <div class="op__rail" aria-hidden="true"><span class="op__mark">Options</span></div>
        <h1 class="op__title">Options</h1>
        <nav class="op__list" role="menu" aria-label="Options">${(L => L.slice(0, -1).map(row).join("") + `<i class="op__rule"></i>` + row(L[L.length - 1], L.length - 1))(items())}</nav>
        ${window.MTX_UI.hintBar({ b: "Back", a: "Select", ls: "Move", menu: "Close", ...(window.MTX_PREGAME?.() ? {} : { view: "Friends" }) }, { cls: "op__hints" })}
      </div>`;
  }

  // focus moves only toggle classes: a re-render would replay the slide-in
  function paintFocus() { root?.querySelectorAll("[data-op-i]").forEach(r => r.classList.toggle("is-focused", +r.dataset.opI === focus)); }

  function select() {
    const it = items()[focus];
    api()?.rumble?.(60, .3);
    if (it.id === "profile") { close(); return window.MTX_SCREENS?.customize?.show?.(0); }
    if (it.id === "settings") { close(); return window.MTX_SETTINGS?.open?.({ onClose: () => show() }); }
    if (it.id === "main") { const go = () => { if (api()?.getCur?.() !== "main") api()?.show?.("main"); window.MTX_LOGOUT?.(); }; close(); if (window.MTX_FIND_LEAVE?.(() => { window.MTX_MODE_CARD?.stopFind(false); go(); })) return; go(); return; }   // back to the Login page (logs out)
    if (it.id === "exit") return api()?.toast?.("Exit game · not in this prototype");
  }

  function input(a) {
    if (a === "back" || a === "menu") return close();
    if (a === "view") { if (window.MTX_PREGAME?.()) return; close(); return window.MTX_FRIENDS?.open?.(); }
    if (a === "up" || a === "down") {
      focus = (focus + (a === "up" ? -1 : 1) + items().length) % items().length; api()?.rumble?.(20, .1); return paintFocus();
    }
    if (a === "a") return select();
  }

  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.id = "optionsMenu"; root.className = "op"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Options");
    document.getElementById("stage").appendChild(root);
    root.addEventListener("click", e => {
      const c = e.target.closest("[data-op-i]"); if (c) { focus = +c.dataset.opI; paintFocus(); return select(); }
      if (e.target.closest(".op__scrim")) close();
    });
  }
  function show() {
    window.MTX_FRIENDS?.close?.(); window.MTX_SETTINGS?.close?.();
    mount(); clearTimeout(hideT); root.classList.remove("is-closing");
    open = true; root.hidden = false; document.getElementById("stage")?.classList.add("ovl-open");
    render(); api()?.rumble?.(60, .25);
  }
  // the rail slides back out to the left, then the overlay hides (input is already released)
  function close() {
    if (!root || !open) return; open = false;
    root.classList.add("is-closing");
    clearTimeout(hideT); hideT = setTimeout(() => { root.hidden = true; root.classList.remove("is-closing"); }, SLIDE_OUT_MS);
    if (!window.MTX_FRIENDS?.isOpen?.() && !window.MTX_SETTINGS?.isOpen?.()) document.getElementById("stage")?.classList.remove("ovl-open");
  }
  window.MTX_OPTIONS = { open: show, close, toggle: () => (open ? close() : show()), isOpen: () => open, input, render };
})();
