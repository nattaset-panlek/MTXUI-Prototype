/* Login / Sign up (Figma "Login / Mainmenu" 301:44395) - the first screen after "Press any button".
   Any username / password is accepted (prototype). Views: login · signup.
     login:  ↑ ↓ field / button · A select (type in a field, Login) · B cancel (back to the title) · Y sign up
     signup: ↑ ↓ · A select (Sign up) · B cancel (back to login)
   Cancel is a text action (not a Secondary CTA). Login and Cancel show no key: move focus to them and press A.
   window.MTX_LOGIN = { open(onDone, onCancel), close, isOpen, input, keyInField } */
(function () {
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const IMG = "mtx/assets/img/login/";
  const KEY = "mtx.login";   // remembered login (localStorage) until Main menu / logout
  const isLoggedIn = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  const logout = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
  const S = { open: false, view: "login", focus: 0, onDone: null, onCancel: null };
  let root = null;

  const VIEWS = {
    login: { title: "Login", fields: [["user", "text", "Username"], ["pass", "password", "Password"]], cta: "Login" },
    signup: { title: "Sign up", fields: [["user", "text", "User name"], ["mail", "email", "Email"], ["pass", "password", "Password"]], cta: "Sign up" },
  };
  // focusable rows: the fields, then the CTA, then Cancel
  const rows = () => [...VIEWS[S.view].fields.map(f => "f:" + f[0]), "cta", "cancel"];

  function html() {
    const v = VIEWS[S.view], fx = rows()[S.focus];
    const fields = v.fields.map(([id, type, ph]) =>
      `<label class="login__field focus-ring${fx === "f:" + id ? " is-focused" : ""}" data-login-row="f:${id}"><input data-login-field="${id}" type="${type}" placeholder="${ph}" autocomplete="off" spellcheck="false"></label>`).join("");
    const platforms = `<div class="login__platforms"><img src="${IMG}steam.png" alt="Steam" data-login-row="cta"><img src="${IMG}epic.png" alt="Epic Games Store" data-login-row="cta"></div>`;
    const or = `<div class="login__or"><i></i><span>or</span><i></i></div>`;
    const actions = `<div class="login__actions">
        <span class="btn-cta focus-ring${fx === "cta" ? " is-focused" : ""}" data-login-row="cta"><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__label">${v.cta}</span></span>
        <span class="login__cancel focus-ring${fx === "cancel" ? " is-focused" : ""}" data-cl-btn="b" data-login-row="cancel"><span>Cancel</span></span>
      </div>`;
    const body = S.view === "login"
      ? `${fields}${actions}<div class="login__links"><span class="login__link">Forgot password</span><span class="login__link" data-cl-btn="y">${G("y")}<span>Create account</span></span></div>${or}${platforms}`
      : `${platforms}${or}${fields}${actions}`;
    return `<div class="login__bg" aria-hidden="true"></div>
      <aside class="login__panel login__panel--${S.view}">
        <h1 class="login__title tex-text">${v.title}</h1>
        ${body}
        <p class="login__legal">© SQUADX. ALL RIGHTS RESERVED. DATES AND CONTENT SUBJECT TO CHANGE. GAME IS NOT YET RATED.<br>SQUADX, THE SQUADX LOGO, MUAY THAI XTREME AND THE MTX LOGO ARE AMONG THE TRADEMARKS OF SQUADX CO., LTD.</p>
      </aside>
      ${window.MTX_UI.hintBar({ b: S.view === "login" ? "Quit" : "Back", a: "Select" }, { cls: "login__hints" })}`;
  }

  function render(keep) {
    if (!root) return;
    const vals = {}; if (root.dataset.view === S.view) root.querySelectorAll("[data-login-field]").forEach(i => { vals[i.dataset.loginField] = i.value; });
    const sw = !!root.dataset.view && root.dataset.view !== S.view;
    root.dataset.view = S.view;   // switching login / sign up starts with empty fields
    root.innerHTML = html();
    if (sw) root.querySelector(".login__panel")?.classList.add("is-switch");
    root.querySelectorAll("[data-login-field]").forEach(i => { if (vals[i.dataset.loginField] != null) i.value = vals[i.dataset.loginField]; });
    if (keep !== false) syncFocus();
  }
  // a focused field row also has the DOM focus, so typing goes straight in
  function syncFocus() {
    const fx = rows()[S.focus];
    root.querySelectorAll("[data-login-row]").forEach(el => el.classList.toggle("is-focused", el.dataset.loginRow === fx && !el.matches("img")));
    const inp = fx.startsWith("f:") ? root.querySelector(`[data-login-field="${fx.slice(2)}"]`) : null;
    if (inp) { if (document.activeElement !== inp) inp.focus({ preventScroll: true }); }
    else if (document.activeElement?.closest?.("#login")) document.activeElement.blur();
  }
  function move(d) { const n = rows().length; S.focus = (S.focus + d + n) % n; syncFocus(); }

  function submit() {
    const user = root.querySelector('[data-login-field="user"]')?.value.trim() || "SX.MTX";
    window.MTX?.api?.toast?.(S.view === "login" ? `Logged in as ${user}` : `Account created · ${user}`);
    try { localStorage.setItem(KEY, JSON.stringify({ user, at: Date.now() })); } catch (e) {}
    swallowKeyUp();
    close(); S.onDone?.(user);
  }
  // the key that confirmed (Enter / A) is released on the next screen: don't let its keyup confirm there too
  function swallowKeyUp() { addEventListener("keyup", e => { e.stopImmediatePropagation(); e.preventDefault(); }, { capture: true, once: true }); }
  function cancel() {
    if (S.view === "signup") { S.view = "login"; S.focus = 0; return render(); }
    swallowKeyUp();
    close(); S.onCancel?.();
  }

  function input(a) {
    if (!S.open) return false;
    const fx = rows()[S.focus];
    if (a === "up" || a === "left") return move(-1);
    if (a === "down" || a === "right") return move(1);
    if (a === "back") return cancel();
    if (a === "y" && S.view === "login") { S.view = "signup"; S.focus = 0; return render(); }
    if (a === "a") {
      if (fx === "cancel") return cancel();
      if (fx.startsWith("f:")) { const last = rows().indexOf("cta") - 1; if (S.focus < last) return move(1); return submit(); }   // Enter on the last field logs in
      return submit();
    }
  }
  // keys while typing in a field: Enter / Tab / arrows / Esc drive the form, everything else types
  function keyInField(e) {
    if (e.key === "Enter") { e.preventDefault(); input("a"); return true; }
    if (e.key === "Escape") { e.preventDefault(); input("back"); return true; }
    if (e.key === "Tab" || e.key === "ArrowDown") { e.preventDefault(); move(e.shiftKey ? -1 : 1); return true; }
    if (e.key === "ArrowUp") { e.preventDefault(); move(-1); return true; }
    return true;   // typing: not a game key
  }

  function open(onDone, onCancel) {
    S.onDone = onDone; S.onCancel = onCancel; S.view = "login"; S.focus = 0; S.open = true;
    if (!root) {
      root = document.createElement("section"); root.id = "login"; root.className = "login";
      document.getElementById("stage").appendChild(root);
      root.addEventListener("click", e => {   // mouse: click a row to focus it, the CTA / Cancel are clickable key hints (app.js)
        const r = e.target.closest("[data-login-row]"); if (!r) return;
        const i = rows().indexOf(r.dataset.loginRow); if (i >= 0) { S.focus = i; syncFocus(); }
        if (r.matches("img") || r.dataset.loginRow === "cta") submit();
      });
      root.addEventListener("focusin", e => { const f = e.target.dataset?.loginField; if (f) { S.focus = rows().indexOf("f:" + f); syncFocus(); } });
    }
    clearTimeout(leaveT); root.classList.remove("is-leaving"); root.hidden = false; root.dataset.view = ""; render();
  }
  let leaveT = 0;
  function close() {
    S.open = false; if (!root) return;
    document.activeElement?.blur?.();
    root.classList.add("is-leaving"); clearTimeout(leaveT);
    leaveT = setTimeout(() => { root.hidden = true; root.classList.remove("is-leaving"); }, 360);   // .login.is-leaving in login.css
  }

  window.MTX_LOGIN = { open, close, isOpen: () => S.open, input, keyInField, isLoggedIn, logout };
})();
