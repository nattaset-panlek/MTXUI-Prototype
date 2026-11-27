/* Component: site Home link (mtxworkingstation only).
   The team site (mtxworkingstation build.py, HOME_BTN) injects <a class="mtx-home" style="position:fixed; ..."> at the top of <body>
   on every prototype page. Over the 1920x1080 stage it covered the game (user 2026-11-27), so here it moves into the
   dev tools button row (#tools .row, first chip) and takes the chip look from base.css. Locally the link does not exist: nothing happens.
   A late injection is caught by a short MutationObserver. */
(function () {
  function adopt(link) {
    const row = document.querySelector("#tools .row");
    if (!link || !row || link.dataset.adopted) return false;
    link.dataset.adopted = "1";
    link.removeAttribute("style");   // drop the fixed, top-left overlay
    link.classList.add("chip");
    link.title = "Back to MTX Working Station";
    row.prepend(link);
    return true;
  }

  function run() {
    if (adopt(document.querySelector("a.mtx-home"))) return;
    const mo = new MutationObserver(() => { if (adopt(document.querySelector("a.mtx-home"))) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 5000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
