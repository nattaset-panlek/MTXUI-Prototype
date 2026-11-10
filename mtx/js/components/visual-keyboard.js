/* Component: visual keyboard (text and PIN entry for pad and keyboard). Used by Create Lobby and Tournament setting.
     const vk = MTX_UI.createVk({ host, render, rumble, esc, ico, pinShown, togglePin });
     host() returns the form object { v: { field: text }, vk: state or null }, or null when this screen is closed.
     vk.vkOpen(form, { label, field, max, num, secret })   vk.vkInput(form, action)   vk.vkHtml(form)
     addEventListener("keydown", vk.vkKey, true) for physical keys. Styles: .vk in css/screens.css.
     Pad: A key, B cancel, X delete, Y space, LB shift, Menu done. Physical keyboard: every key types,
     Enter done (or presses the key picked with the arrows), Esc cancel, Backspace delete. */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  UI.createVk = function (o) {
  const VK_TEXT = ["1234567890", "qwertyuiop", "asdfghjkl-", ["shift", ..."zxcvbnm", "del"], ["space", "done"]];
  const VK_NUM = ["123", "456", "789", ["del", "0", "done"]];
  const VK_WIDE = { shift: 1.5, del: 1.5, space: 7, done: 3 };
  const vkRows = vk => (vk.num ? VK_NUM : VK_TEXT).map(r => [...r]);
  const vkW = (vk, k) => vk.num ? 1 : VK_WIDE[k] || 1;
  function vkOpen(md, r) { md.vk = { label: r.label, key: r.field, text: md.v[r.field], num: !!r.num, secret: !!r.secret, max: r.max, row: 0, col: 0, shift: false, nav: false, err: "" }; o.rumble(40, .2); }
  function vkType(vk, ch) {
    if (vk.text.length >= vk.max) { o.rumble(60, .15); return; }
    vk.text += vk.shift && !vk.num ? ch.toUpperCase() : ch; vk.shift = false; vk.err = "";
  }
  function vkDone(md) {
    const vk = md.vk, t = vk.text.trim();
    if (vk.num ? t.length !== vk.max : !t) { vk.err = vk.num ? `Enter all ${vk.max} digits.` : "Enter a name."; o.rumble(80, .2); return; }
    md.v[vk.key] = t; md.vk = null; o.rumble(40, .2);
  }
  function vkPress(md, k) {
    const vk = md.vk;
    if (k === "del") { vk.text = vk.text.slice(0, -1); vk.err = ""; }
    else if (k === "shift") vk.shift = !vk.shift;
    else if (k === "space") vkType(vk, " ");
    else if (k === "done") vkDone(md);
    else vkType(vk, k);
    o.rumble(20, .1);
  }
  function vkMove(vk, a) {
    const rows = vkRows(vk);
    if (a === "left" || a === "right") { const n = rows[vk.row].length; vk.col = (vk.col + (a === "left" ? -1 : 1) + n) % n; }
    else {   // up / down: the key nearest under the current key's center
      const center = (r, c) => rows[r].slice(0, c).reduce((x, k) => x + vkW(vk, k), 0) + vkW(vk, rows[r][c]) / 2;
      const x = center(vk.row, vk.col); vk.row = (vk.row + (a === "up" ? -1 : 1) + rows.length) % rows.length;
      let best = 0; rows[vk.row].forEach((_, c) => { if (Math.abs(center(vk.row, c) - x) < Math.abs(center(vk.row, best) - x)) best = c; }); vk.col = best;
    }
    o.rumble(20, .1);
  }
  function vkInput(md, a) {
    const vk = md.vk;
    if (a === "back") { md.vk = null; return o.render(); }   // cancel: the field keeps its old value
    if (a === "up" || a === "down" || a === "left" || a === "right") { vk.nav = true; vkMove(vk, a); return o.render(); }
    if (a === "a") { vkPress(md, vkRows(vk)[vk.row][vk.col]); return o.render(); }
    if (a === "x") { vkPress(md, "del"); return o.render(); }
    if (a === "y" && vk.secret) { o.togglePin(); return o.render(); }
    if (a === "y" && !vk.num) { vkPress(md, "space"); return o.render(); }
    if (a === "lt" && !vk.num) { vkPress(md, "shift"); return o.render(); }
    if (a === "menu") { vkDone(md); return o.render(); }
  }
  function vkKey(e) {   // physical keys only; on-screen hint clicks send synthetic keys, which go through input()
    const md = o.host(), vk = md?.vk; if (!vk || !e.isTrusted || e.key === "`") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopImmediatePropagation();
    window.MTX?.api?.setDevice?.("kb");
    const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];
    if (dir) { vk.nav = true; vkMove(vk, dir); }
    else if (e.key === "Escape") { if (!e.repeat) md.vk = null; }
    else if (e.key === "Backspace") vkPress(md, "del");
    else if (e.key === "Enter") { if (e.repeat) return; if (vk.nav) vkPress(md, vkRows(vk)[vk.row][vk.col]); else vkDone(md); }
    else if (vk.secret && e.key.toLowerCase() === "y") o.togglePin();
    else if (e.key.length === 1 && (vk.num ? /[0-9]/.test(e.key) : /[ -~]/.test(e.key))) { vk.nav = false; vk.shift = false; vkType(vk, e.key); }
    else return;
    o.render();
  }
  const VK_FACE = { shift: "Shift", del: "Delete", space: "Space", done: "Done" };
  const VK_GLYPH = { shift: "lb", del: "x", space: "y", done: "menu" };
  function vkHtml(md) {
    const vk = md?.vk; if (!vk) return "";
    const G2 = k => VK_GLYPH[k] ? window.MTX_UI.glyph(VK_GLYPH[k]) : "";
    const keys = vkRows(vk).map((row, r) => `<div class="vk__row">${row.map((k, c) => {
      const face = VK_FACE[k] || (vk.shift ? k.toUpperCase() : k);
      return `<button type="button" tabindex="-1" class="vk__k${VK_FACE[k] ? " vk__k--fn" : ""}${r === vk.row && c === vk.col ? " is-focused" : ""}${k === "shift" && vk.shift ? " is-on" : ""}" style="flex-grow:${vkW(vk, k)}" data-vk-r="${r}" data-vk-c="${c}">${G2(k)}<span>${o.esc(face)}</span></button>`; }).join("")}</div>`).join("");
    const pad = vk.num ? { b: "Cancel", a: "Select", x: "Delete", y: o.pinShown() ? "Hide PIN" : "Show PIN", menu: "Done" } : { b: "Cancel", a: "Select", x: "Delete", y: "Space", lb: "Shift", menu: "Done" };
    const kb = [["Enter", "Done"], ["Esc", "Cancel"], ["Backspace", "Delete"], ["Arrows", "Move"], ...(vk.secret ? [["Y", o.pinShown() ? "Hide PIN" : "Show PIN"]] : [])];
    return `<div class="vk${vk.num ? " vk--num" : ""}${vk.nav ? " is-nav" : ""}" role="dialog" aria-label="${o.esc(vk.label)} keyboard"><div class="vk__wrap"><section class="vk__panel">
      <header class="vk__head"><span class="vk__label">${o.esc(vk.label)}</span><span class="vk__count">${vk.text.length} / ${vk.max}</span></header>
      <div class="vk__field"><span>${o.esc(vk.secret && !o.pinShown() ? "•".repeat(vk.text.length) : vk.text)}</span><i></i>${vk.secret ? `<span class="vk__eye" data-cl-pin>${o.ico(o.pinShown() ? "eye" : "eyeoff")}</span>` : ""}</div>
      <p class="vk__err">${o.esc(vk.err)}</p>
      <div class="vk__keys">${keys}</div></section>
      <nav class="cl-md__keys vk__hints vk__hints--pad">${window.MTX_UI.hintItems(pad)}</nav>
      <nav class="cl-md__keys vk__hints vk__hints--kb">${kb.map(([k, l]) => `<span class="vk__kbhint"><kbd>${k}</kbd>${l}</span>`).join("")}</nav></div></div>`;
  }
    return { vkOpen, vkInput, vkKey, vkHtml, vkPress, vkRows };
  };
})();
