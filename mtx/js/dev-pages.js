/* Dev tools · Pages
   The shared name of every page in the prototype. Click a row to open that page.
     name   what we call the page
     id     screen id (MTX.show) or the overlay's global
     figma  node in the MTX file, when the page has one
   To rename a page, edit its name here. */
(() => {
  const SCREENS = [
    { group: "Main", pages: [
      { id: "charselect", name: "Character Select" },
      { id: "main", name: "Main Menu", figma: "1:6345" },
      { id: "career", name: "Ultimate Fight", figma: "1:1039" },
    ] },
    { group: "Style", pages: [
      { id: "tactical", name: "Tactical Style", figma: "87:151" },
      { id: "mastery", name: "Style Hub", figma: "1:1807" },
      { id: "attributes", name: "Attributes", figma: "51:180" },
      { id: "skilltree", name: "Mastery", figma: "14:747" },
      { id: "rewards", name: "Rewards", figma: "1:4850" },
      { id: "quests", name: "Quests", figma: "123:100" },
    ] },
    { group: "Store", pages: [
      { id: "store", name: "Store", figma: "128:99" },
      { id: "pack", name: "Pack Collection", figma: "128:437" },
    ] },
    { group: "Management", pages: [
      { id: "management", name: "Management", figma: "2:427" },
      { id: "collection", name: "Collection" },
    ] },
    { group: "Community", pages: [
      { id: "leaderboard", name: "Leaderboard", figma: "144:249" },
      { id: "history", name: "Match History", figma: "216:633" },
      { id: "matchdetail", name: "Match Detail", figma: "217:6954" },
      { id: "media", name: "Media", figma: "2:2234" },
    ] },
  ];
  const OVERLAYS = [
    { id: "MTX_SHADER", name: "Shader Preload (first launch)" },
    { id: "MTX_LOGIN", name: "Login", args: [() => {}, () => {}] },
    { id: "MTX_CAMPAIGN", name: "Campaign" },
    { id: "MTX_TOUR", name: "Tournament" },
    { id: "MTX_CLOBBY", name: "Custom Lobby" },
    { id: "MTX_MATCH_RESULT", name: "Match Result (Rank · RP + Level)", args: [{ mode: "rank" }] },
    { id: "MTX_LOADOUT", name: "Tactical Loadout" },
    { id: "MTX_FRIENDS", name: "Friends" },
    { id: "MTX_OPTIONS", name: "Options" },
    { id: "MTX_SETTINGS", name: "Settings" },
  ];

  const el = document.getElementById("tabContentPages");
  if (!el) return;
  const row = (attr, name, id, figma) => `<button type="button" class="dev-page" ${attr}>
    <span class="dev-page__name">${name}</span><code>${id}</code><span class="dev-page__figma">${figma || ""}</span></button>`;
  el.innerHTML = SCREENS.map(s => `<section class="dev-sec"><h3 class="dev-sec__title">${s.group}</h3>
      ${s.pages.map(p => row(`data-page="${p.id}"`, p.name, p.id, p.figma)).join("")}</section>`).join("")
    + `<section class="dev-sec"><h3 class="dev-sec__title">Overlays</h3>
      ${OVERLAYS.map(p => row(`data-overlay="${p.id}"`, p.name, p.id)).join("")}</section>`;

  const closeOverlays = () => OVERLAYS.forEach(o => { if (window[o.id]?.isOpen?.()) window[o.id].close?.(); });
  const refresh = () => {
    const cur = document.querySelector(".screen.is-active")?.dataset.screen;
    const over = OVERLAYS.find(o => window[o.id]?.isOpen?.())?.id;
    el.querySelectorAll(".dev-page").forEach(b => b.classList.toggle("is-current", over ? b.dataset.overlay === over : b.dataset.page === cur));
  };
  el.addEventListener("click", e => {
    const b = e.target.closest(".dev-page");
    if (!b) return;
    closeOverlays();
    if (b.dataset.page) window.MTX.show(b.dataset.page);
    else { const o = OVERLAYS.find(x => x.id === b.dataset.overlay); window[o.id]?.open?.(...(o.args || [])); }
    setTimeout(refresh, 100);
  });
  document.querySelector('.figma-tab[data-tab="pages"]')?.addEventListener("click", refresh);
  document.getElementById("devBtn")?.addEventListener("click", refresh);
})();
