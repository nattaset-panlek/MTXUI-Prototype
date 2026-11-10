/* Component: list scrollbar (the .scrollbar / .scrollbar__thumb look from components.css).
     MTX_UI.syncScrollbar(list, bar, { thumb, side: "right" | "inside", gap: 14 })
       thumb size = visible share of the list, position = scroll position; the bar is hidden when everything fits.
       side "right"  : bar sits gap px to the right of the list (Leaderboard)
       side "inside" : bar sits gap px inside the list's right edge (Collection grid)
     MTX_UI.bindScrollbar(list, bar, opts) -> keeps it synced on scroll / resize; returns the sync function */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};

  UI.syncScrollbar = (list, bar, { thumb = bar && bar.querySelector(".scrollbar__thumb"), side = null, gap = 14, min = 48 } = {}) => {
    if (!list || !bar || !thumb) return;
    const over = list.scrollHeight - list.clientHeight;
    bar.hidden = over <= 1;
    if (bar.hidden) return;
    bar.style.top = list.offsetTop + "px";
    bar.style.height = list.clientHeight + "px";
    if (side === "right") bar.style.left = list.offsetLeft + list.offsetWidth + gap + "px";
    if (side === "inside") bar.style.left = list.offsetLeft + list.offsetWidth - gap - bar.offsetWidth + "px";
    const h = Math.max(min, Math.round(list.clientHeight * list.clientHeight / list.scrollHeight));
    thumb.style.height = h + "px";
    thumb.style.top = Math.round(list.scrollTop / over * (list.clientHeight - h)) + "px";
  };

  UI.bindScrollbar = (list, bar, opts) => {
    const sync = () => UI.syncScrollbar(list, bar, opts);
    if (list && !list.dataset.scrollbarBound) {
      list.dataset.scrollbarBound = "1";
      list.addEventListener("scroll", sync, { passive: true });
      addEventListener("resize", sync);
    }
    sync();
    return sync;
  };
})();
