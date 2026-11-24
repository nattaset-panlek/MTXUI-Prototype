/* Component: scratch texture on display-font headers (user 2026-11-24).
   Every element that shows its own text in the display font (Modi Thorson, var(--font-display)) at header size gets
   class .tex-scratched: the scratch texture (tex-scratch-white.webp) is used as a luminance mask over the text, so the
   scratches wear through whatever colour / gradient the text already has.
   Skipped: .tex-text (already textured with the same image), elements that have their own mask, small text (< MIN_PX),
   anything marked data-no-scratch, the HUD / wallet / E S R level chips and tabs (user 2026-11-24). Runs on load and on DOM changes inside #stage (debounced). */
(function () {
  const MIN_PX = 24;   // header size and up (stage px)
  const isModi = ff => /modi/i.test(ff);
  // tabs (lb-tab, mq-tab, col-tabs, [role=tab] ...): no texture for now (user 2026-11-24); a class token ending in -tab / -tabs
  const inTabs = el => { for (let n = el, i = 0; n && i < 4; n = n.parentElement, i++) { if (n.getAttribute?.("role") === "tab" || [...(n.classList || [])].some(c => /(^|-)tabs?$/.test(c))) return true; } return false; };
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());

  function tag(el) {
    if (el.classList.contains("tex-scratched") || el.classList.contains("tex-text") || el.closest("[data-no-scratch], #tools, #devPanel, .player-hud, .wallet, .level-chip") || inTabs(el)) return;
    if (!ownText(el)) return;
    const cs = getComputedStyle(el);
    if (!isModi(cs.fontFamily) || parseFloat(cs.fontSize) < MIN_PX) return;
    if (cs.maskImage && cs.maskImage !== "none" || cs.webkitMaskImage && cs.webkitMaskImage !== "none") return;
    el.classList.add("tex-scratched");
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    tag(root);
    root.querySelectorAll("*").forEach(tag);
  }

  let queue = new Set(), timer = 0;
  function flush() { timer = 0; const list = [...queue]; queue.clear(); list.forEach(n => n.isConnected && scan(n)); }

  function boot() {
    const stage = document.getElementById("stage") || document.body;
    scan(stage);
    new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(n => { if (n.nodeType === 1) queue.add(n); else if (n.parentElement) queue.add(n.parentElement); });
      if (queue.size && !timer) timer = setTimeout(flush, 120);
    }).observe(stage, { childList: true, subtree: true });
  }

  window.MTX_UI = window.MTX_UI || {};
  window.MTX_UI.texHeaders = { scan };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0));
  else setTimeout(boot, 0);
})();
