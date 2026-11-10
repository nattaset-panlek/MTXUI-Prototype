/* Component: Dialog (global message popup, was the Custom Lobby "msg" modal) - light top (title + body), dark bottom with
   the buttons (Secondary left, Primary right, no key inside), the keys float under the panel.
     MTX_UI.dialog.open({ title, body, primary, secondary, secondaryKey = "b", onPrimary, onSecondary, onClose })
       primary only (no secondary)  -> one wide button; A and B both run it (e.g. "Close")
     Move (WASD / stick / d-pad) picks a button, Confirm (A · Space / Enter) presses it - Primary is picked first.
     B still backs out (= the secondary / close) but is not shown; the hints under the panel are Move + Confirm only.
     primary / secondary can be { html } for a label with icons
     hold: ms        -> the Primary is hold-to-confirm (hold A for ms, the ring fills around the button; let go = nothing)
     closeHint       -> also show a B / Esc hint with this label (e.g. "Close"); B closes without running a button
     holdLabel       -> the Confirm hint text while hold is on (default "Hold to confirm")
     MTX_UI.dialog.release(action) -> app.js calls it on key / button up (ends an unfinished hold)
     MTX_UI.dialog.input(action) -> true while open (app.js routes every input here first) · close() · isOpen()
   Dialogs stack: opening one over another keeps the one below and returns to it on close. */
(() => {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const G = b => UI.glyph ? UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const stack = [];
  let root = null, hold = null;
  const top = () => stack[stack.length - 1];
  const keyAct = k => k === "b" ? "back" : k;
  const btn = (key, label, sec, f) => `<span class="btn-cta${sec ? " btn-cta--secondary" : ""}${f ? " is-focused" : ""}" data-dlg="${key}"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__label">${label?.html ?? esc(label)}</span></span>`;

  // the whole page behind blurs: a filter on every stage layer under the dialog (backdrop-filter on the scrim dropped out
  // whenever something underneath repainted, e.g. moving between the buttons or a card hover settling)
  const blur = on => document.getElementById("stage")?.classList.toggle("dlg-open", on);
  function render() {
    const d = top(); blur(!!d);
    if (!d) { if (root) { root.hidden = true; root.innerHTML = ""; } return; }
    if (!root) {
      root = document.createElement("div"); root.id = "dialog"; root.className = "dlg";
      document.getElementById("stage").appendChild(root);
      root.addEventListener("click", e => { if (top()?.hold) return; const b = e.target.closest(".btn-cta[data-dlg]"); const d = top(); if (!b || !d) { const h = e.target.closest(".hint[data-dlg]"); if (h) input(h.dataset.dlg === "b" ? "back" : "a"); return; } d.focus = b.dataset.dlg === "a" ? 1 : 0; input("a"); });
    }
    const sk = d.secondaryKey || "b";
    const ok = d.hold ? d.holdLabel || "Hold to confirm" : "Confirm";
    const keys = [...(d.closeHint ? [["b", d.closeHint]] : []), ...(d.secondary ? [["ls", "Move"], ["a", ok]] : [["a", ok]])];
    root.hidden = false;
    root.innerHTML = `<div class="dlg__scrim"></div><div class="dlg__wrap"><section class="dlg__panel" role="alertdialog" aria-label="${esc(d.title)}">
        <div class="dlg__top"><h2>${esc(d.title)}</h2>${d.body ? `<p>${esc(d.body)}</p>` : ""}</div>
        <div class="dlg__bot"><div class="dlg__foot${d.secondary ? "" : " is-one"}">${d.secondary ? btn(sk, d.secondary, true, d.focus === 0) : ""}${btn("a", d.primary, false, !d.secondary || d.focus === 1)}</div></div></section>
      <nav class="dlg__keys">${window.MTX_UI.hintItems(keys, { itemAttrs: k => `data-dlg="${k}"` })}</nav></div>`;
  }
  // moving between the buttons only moves the focus ring (no re-render: the scrim / panel do not fade in again)
  function focusOnly() { const d = top(); root?.querySelectorAll(".dlg__foot .btn-cta").forEach((b, i, all) => b.classList.toggle("is-focused", all.length === 1 || i === d.focus)); }
  function open(opts) { stack.push({ focus: 1, ...opts }); window.MTX?.api?.rumble?.(50, .25); render(); return { close }; }
  function close() { stack.pop(); render(); }
  function input(a) {
    const d = top(); if (!d) return false;
    if (hold?.active) return true;   // holding: nothing else until it ends
    if (d.secondary && (a === "left" || a === "right" || a === "up" || a === "down")) { d.focus = a === "left" || a === "up" ? 0 : 1; window.MTX?.api?.rumble?.(20, .1); focusOnly(); return true; }
    if (a === "a" && d.hold && (!d.secondary || d.focus === 1)) { startHold(d); return true; }
    if (a === "a") { close(); (d.secondary && d.focus === 0 ? d.onSecondary : d.onPrimary)?.(); return true; }
    if (a === "back") { close(); (d.secondary || d.closeHint ? d.onClose : d.onPrimary)?.(); return true; }
    return true;   // the page under a dialog never reacts
  }
  // hold-to-confirm Primary: same hold component as the rest of the game (ring sweep on the button, stepped rumble)
  function startHold(d) {
    if (hold?.ms !== d.hold) hold = Object.assign(UI.createHold({ ms: d.hold, steps: 3, flash: null, onDone: ctx => { if (top() === ctx) { close(); ctx.onPrimary?.(); } },
      onCancel: ({ quick }) => { if (quick) UI.holdHint?.("confirm"); } }), { ms: d.hold });
    hold.start(root.querySelector('.dlg__foot .btn-cta[data-dlg="a"]'), { ctx: d, source: "input" });
  }
  function release(a) { if (a === "a" && hold?.active) hold.cancel(true); }
  UI.dialog = { open, close, input, release, isOpen: () => !!top() };
})();
