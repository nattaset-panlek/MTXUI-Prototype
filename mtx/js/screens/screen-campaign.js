/* Campaign window (Figma "Campaign Modal" 388:143691) - shown once over the Main menu the first time the game is entered
   after a login (the news items as full slides). Logging out shows it again on the next entry.
     ← → / LB RB slide · A the slide's button (Shop: opens the Store) · B close

  window.MTX_CAMPAIGN = { maybeOpen, open, close, isOpen, input, reset } */
(function () {
  const G = b => window.MTX_UI?.glyph ? window.MTX_UI.glyph(b) : `<span class="glyph" data-btn="${b}"></span>`;
  const IMG = "mtx/assets/img/";
  const KEY = "mtx.campaign";   // seen for this login (cleared with the login)
  const SLIDES = [
    { tag: "News!", art: "news-season.webp", title: "Season 1<br>Legend legacy", sub: "Upcoming season", cta: "Shop", go: "store",
      body: "A new ranked season opens with the Legend Legacy tour. Climb from Novice Tier to Champion, earn Warrior Points in every ranked fight and unlock the season's legendary style rewards before the season ends." },
    { tag: "Rewards", art: "wishlist-art.webp", title: "Wishlist<br>rewards", sub: "Seux Phen collection", cta: "Claim", toast: "Wishlist rewards claimed",
      body: "Wishlist Muay Thai Xtreme to claim the Seux Phen shorts and gloves on launch day. Rewards are added to your Collection automatically the first time you log in." },
    { tag: "Event", art: "news-season.webp", title: "Ultimate<br>Fight", sub: "Career mode",
      body: "Build your fighter day by day: train, manage fitness, take sponsor offers and fight your way up the calendar. Hold Simulate day to skip ahead to the next fight." },
  ];
  const S = { open: false, page: 0 };
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch (e) {} };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  // the window itself is the global Spotlight component (components/spotlight.js)
  const SP = () => window.MTX_UI.spotlight;
  function input(a) { return S.open ? SP().input(a) : false; }
  function open(page) {
    S.open = true; markSeen();
    SP().open({ id: "campaign", slides: SLIDES, page: page > 0 ? page % SLIDES.length : 0,
      onAction: s => { close(); if (s.go) window.MTX?.show?.(s.go); if (s.toast) window.MTX?.api?.toast?.(s.toast); },
      onClose: () => { S.open = false; } });
  }
  function close() { if (!S.open) return; S.open = false; SP().close(true); }
  // first entry into the game for this login
  function maybeOpen() { if (!seen()) setTimeout(open, 450); }

  // Event card under Shop (Figma 388:146972): the same slides, rotating; Q / E while selected · A opens the window on that slide
  let card = 0;
  function cards() {
    const s = SLIDES[card];
    document.querySelectorAll(".news-ev").forEach(el => {
      el.dataset.page = card;
      el.style.backgroundImage = `url('${IMG}${s.art}')`;
      el.innerHTML = `<span class="news-ev__shade"></span><span class="tag tag--news news-ev__tag">${s.tag === "News!" ? "Event" : s.tag}</span>
        <span class="news-ev__title">${s.title}</span>
        <span class="news-ev__pager">${SLIDES.map((_, i) => `<i class="${i === card ? "is-on" : ""}" data-ev-dot="${i}"></i>`).join("")}</span>`;
    });
  }
  function stepCard(d) { card = (card + d + SLIDES.length) % SLIDES.length; cards(); }
  const nextCard = () => stepCard(1);
  let rot = setInterval(() => { if (!document.querySelector(".news-ev.is-focused")) nextCard(); }, 6000);
  addEventListener("keydown", e => {   // Q / E turn the card, only while it is selected (its pager is the hint)
    const k = e.key.toLowerCase();
    if (S.open || (k !== "q" && k !== "e") || !document.querySelector(".screen.is-active .news-ev.is-focused")) return;
    e.preventDefault(); e.stopImmediatePropagation(); stepCard(k === "q" ? -1 : 1);
  }, true);
  document.addEventListener("click", e => {
    const st = e.target.closest("[data-ev-step]"), dot = e.target.closest("[data-ev-dot]");
    if (!st && !dot) return;
    e.preventDefault(); e.stopPropagation();
    if (st) stepCard(+st.dataset.evStep); else { card = +dot.dataset.evDot; cards(); }
  }, true);
  (window.MTX_SCREENS = window.MTX_SCREENS || {}).campaign = { actions: { openCampaign: el => open(+el.dataset.page || 0) } };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", cards) : cards();

  window.MTX_CAMPAIGN = { maybeOpen, open, close, isOpen: () => S.open, input, reset, stepCard };
})();
