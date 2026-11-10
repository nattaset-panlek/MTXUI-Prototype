/* HUD style switch (Dev Tools > System > "Player HUD style").
   Figma 301:43473 (Player HUD · 10 proposals) + 306:44800 (Profile Card E/S/R in the same 10 styles).
   "current" = the original prototype look (default). 1-10 set html[data-hud-style] and hud-style.css restyles
   the existing .player-hud / .profile-card__levels markup. This file only adds the few extra parts some styles need:
   short XP text, XP bar + segments on mini chips, and the expanded clones for style 10. Saved as localStorage "mtx.hudStyle". */
(() => {
  const KEY = "mtx.hudStyle";
  const STYLES = [
    ["current", "Current (prototype)"],
    ["1", "1 · Unified strip"], ["2", "2 · Ring gauges"], ["3", "3 · Vertical stack"], ["4", "4 · Track pills"],
    ["5", "5 · Emblem hub"], ["6", "6 · Minimal type"], ["7", "7 · Slanted tiles"], ["8", "8 · Segmented XP"],
    ["9", "9 · Profile widget"], ["10", "10 · Collapsed + expanded"],
  ];
  const get = () => { try { return localStorage.getItem(KEY) || "current"; } catch (e) { return "current"; } };
  const short = n => n >= 1000 ? (Math.round(n / 100) / 10) + "K" : String(Math.round(n));

  function enhance() {
    const P = window.MTX_PLAYER;
    let added = false;
    document.querySelectorAll(".level-chip[data-pl]").forEach(chip => {
      const body = chip.querySelector(".level-chip__body");
      if (!body) return;
      const add = (cls, html = "") => {
        let el = body.querySelector("." + cls);
        if (!el) { added = true; el = document.createElement("span"); el.className = cls; el.innerHTML = html; body.appendChild(el); }
        return el;
      };
      add("level-chip__xp"); add("level-chip__bar", "<i></i>");
      const xps = add("level-chip__xps"); add("level-chip__seg");
      const tr = P?.get?.()?.[chip.dataset.pl];
      if (tr && P.need) {
        const nx = P.need(chip.dataset.pl), p = Math.min(1, tr.xp / nx);
        chip.style.setProperty("--p", (p * 100).toFixed(1) + "%");
        chip.style.setProperty("--n", tr.xp > 0 ? Math.max(1, Math.round(p * 10)) : 0);
        xps.textContent = `${short(tr.xp)} / ${short(nx)} XP`;
      }
    });
    // style 10 expanded panel: clones of the 3 chips (keep data-pl so MTX_PLAYER.render fills them)
    document.querySelectorAll(".player-hud, .profile-card__levels").forEach(box => {
      if (box.querySelector(":scope > .level-expand")) return;
      const ex = document.createElement("div");
      ex.className = "level-expand";
      box.querySelectorAll(":scope > .level-chip[data-pl]").forEach(c => {
        const k = c.cloneNode(true);
        k.classList.remove("level-chip--mini");
        k.querySelector(".level-chip__label").textContent = "Level";
        ex.appendChild(k);
      });
      box.appendChild(ex);
    });
    if (added) P?.render?.(); // fill the XP text of parts added just now
  }

  function apply(v) {
    if (v === "current") delete document.documentElement.dataset.hudStyle;
    else { enhance(); document.documentElement.dataset.hudStyle = v; }
  }

  function set(v) {
    if (!STYLES.some(s => s[0] === v)) v = "current";
    try { localStorage.setItem(KEY, v); } catch (e) {}
    apply(v);
    const sel = document.getElementById("hudStyle");
    if (sel) sel.value = v;
  }

  function mountDev() {
    const host = document.getElementById("tabContentSystem");
    if (!host || document.getElementById("devHudStyle")) return;
    const sec = document.createElement("section");
    sec.className = "dev-sec";
    sec.id = "devHudStyle";
    sec.innerHTML = `<h3 class="dev-sec__title">Player HUD style</h3>
      <label>HUD + profile card E/S/R <select id="hudStyle">${STYLES.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
      <p class="dev-note">Figma 301:43473 + 306:44800. Style 10: hover the HUD / card levels to expand. Saved in this browser.</p>
      <label>Wallet (every page) <select id="walletStyle"><option value="current">Current (prototype)</option><option value="blocks">Blocks (dark tiles)</option></select></label>`;
    host.insertBefore(sec, host.firstChild);
    const sel = sec.querySelector("#hudStyle");
    sel.value = get();
    sel.addEventListener("change", () => {
      set(sel.value);
      window.MTX?.api?.toast?.(`HUD style: ${sel.selectedOptions[0].text}`);
    });
    const ws = sec.querySelector("#walletStyle");
    ws.value = getWallet();
    ws.addEventListener("change", () => {
      setWallet(ws.value);
      window.MTX?.api?.toast?.(`Wallet: ${ws.selectedOptions[0].text}`);
    });
  }

  // Wallet style: "current" (default) or "blocks"; independent of the HUD style. localStorage "mtx.walletStyle".
  const WKEY = "mtx.walletStyle";
  const getWallet = () => { try { return localStorage.getItem(WKEY) === "blocks" ? "blocks" : "current"; } catch (e) { return "current"; } };
  function setWallet(v) {
    v = v === "blocks" ? "blocks" : "current";
    try { localStorage.setItem(WKEY, v); } catch (e) {}
    if (v === "blocks") document.documentElement.dataset.walletStyle = v; else delete document.documentElement.dataset.walletStyle;
  }

  window.MTX_HUD_STYLE = { STYLES, get, set, enhance, getWallet, setWallet };
  setWallet(getWallet());
  const boot = () => {
    apply(get());
    mountDev();
    window.MTX_PLAYER?.on?.(() => { if (get() !== "current") enhance(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0));
  else setTimeout(boot, 0);
})();
