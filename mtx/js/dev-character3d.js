/* Dev tools · 3D
   On/off, view box and camera for the 3D character, per screen. Saved in this browser only.
   The values line can be copied into DEFAULTS in components/character3d.js to make them permanent. */
(() => {
  const el = document.getElementById("tabContentChar3d");
  const api = window.MTX_CHARACTER3D;
  if (!el || !api) return;

  const SCREENS = [
    { id: "s-charselect", page: "charselect", name: "Character Select" },
    { id: "s-main", page: "main", name: "Main Menu" },
    { id: "s-career", page: "career", name: "Ultimate Fight" },
    { id: "s-rewards", page: "rewards", name: "Rewards" },
    { id: "s-store", page: "store", name: "Store" },
  ];
  const VIEW = [
    { key: "x", label: "X", min: -400, max: 1920, step: 1 },
    { key: "y", label: "Y", min: -400, max: 1080, step: 1 },
    { key: "w", label: "Width", min: 200, max: 1920, step: 1 },
    { key: "h", label: "Height", min: 200, max: 1400, step: 1 },
  ];
  const CAMERA = [
    { key: "zoom", label: "Zoom", min: 0.5, max: 4, step: 0.01 },
    { key: "camY", label: "Height", min: 0, max: 1.2, step: 0.01 },
    { key: "yaw", label: "Rotate", min: -180, max: 180, step: 1 },
  ];
  let selected = SCREENS[0];

  const row = f => `<div class="dev3d-row"><span>${f.label}</span>
    <input type="range" data-key="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}">
    <input type="number" data-key="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}"></div>`;

  el.innerHTML = `<section class="dev-sec">
      <label>Show 3D character <input type="checkbox" id="char3dOn"></label>
      <div class="dev3d-pick">${SCREENS.map(s => `<button type="button" data-id="${s.id}">${s.name}</button>`).join("")}</div>
    </section>
    <section class="dev-sec"><h3 class="dev-sec__title">View</h3>${VIEW.map(row).join("")}</section>
    <section class="dev-sec"><h3 class="dev-sec__title">Camera</h3>${CAMERA.map(row).join("")}</section>
    <section class="dev-sec">
      <button type="button" class="dev-page" id="char3dReset"><span class="dev-page__name">Reset this screen</span></button>
      <code class="dev3d-values" id="char3dValues"></code>
    </section>`;

  const FIELDS = [...VIEW, ...CAMERA];
  function refresh() {
    const v = api.get(selected.id);
    el.querySelector("#char3dOn").checked = api.isEnabled();
    el.querySelectorAll(".dev3d-pick button").forEach(b => b.classList.toggle("is-current", b.dataset.id === selected.id));
    el.querySelectorAll("input[data-key]").forEach(i => { if (document.activeElement !== i || i.type === "range") i.value = v[i.dataset.key]; });
    el.querySelector("#char3dValues").textContent = `"${selected.id}": ` + JSON.stringify(Object.fromEntries(FIELDS.map(f => [f.key, v[f.key]])));
  }

  el.addEventListener("input", e => {
    const key = e.target.dataset.key;
    if (key) {
      const n = parseFloat(e.target.value);
      if (Number.isFinite(n)) api.set(selected.id, { [key]: n });
    } else if (e.target.id === "char3dOn") api.setEnabled(e.target.checked);
    refresh();
  });
  el.addEventListener("click", e => {
    const pick = e.target.closest(".dev3d-pick button");
    if (pick) {
      selected = SCREENS.find(s => s.id === pick.dataset.id);
      window.MTX.show(selected.page);   // edit while looking at that screen
    } else if (e.target.closest("#char3dReset")) api.reset(selected.id);
    else return;
    refresh();
  });
  // Typing in these fields must not drive the game's keyboard navigation.
  el.addEventListener("keydown", e => e.stopPropagation());

  const open = () => {
    const cur = document.querySelector(".screen.is-active")?.id;
    selected = SCREENS.find(s => s.id === cur) || selected;
    refresh();
  };
  document.querySelector('.figma-tab[data-tab="char3d"]')?.addEventListener("click", open);
  refresh();
})();
