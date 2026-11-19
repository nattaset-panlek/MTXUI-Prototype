(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const STYLES = {
    // panel copy: name / desc / traits (style brief); title stays the short name used by other screens
    north:      { color: "#4b00d6", dark: "#230064", fg: "#ffffff", title: "Thasao", lines: "Thasao", region: "Northern style", name: "Muay Tha Sao",
                  desc: "A traditional fighting style renowned for its exceptional speed and agility. It emphasizes swift footwork, rapid engagement and disengagement, and continuous attacks to outmaneuver opponents and seize the initiative.",
                  traits: ["Speed", "Agility", "Quick Timing"] },
    west:       { color: "#f96000", dark: "#6e2a00", fg: "#ffffff", title: "Lopburi", lines: "Lopburi", region: "Western style", name: "Muay Lopburi",
                  desc: "A technical fighting style distinguished by its precision, deception, and tactical intelligence. It focuses on accurate punches, evasive movements, and reading opponents to create openings for decisive counterattacks.",
                  traits: ["Technique", "Precision", "Deception"] },
    phranakhon: { color: "#e6003f", dark: "#680920", fg: "#ffffff", title: "Phranakhon", lines: "Phranakhon", region: "Central style", name: "Muay Phra Nakhon",
                  desc: "A versatile fighting style that combines techniques from various traditional Muay Thai schools. Emphasizing a balance of offense, defense, and adaptability, it represents an important foundation in the evolution of modern Muay Thai.",
                  traits: ["Versatility", "Balance", "Adaptability"] },
    isan:       { color: "#c9ff00", dark: "#76980a", fg: "#141414", title: "Korat", lines: "Korat", region: "Isan style", name: "Muay Korat",
                  desc: "A powerful traditional fighting style known for its devastating strikes and overwhelming force. It emphasizes heavy punches and wide, sweeping kicks, including its signature technique, the \"Buffalo Swing Punch.\"",
                  traits: ["Power", "Heavy Strikes", "Devastating Force"] },
    south:      { color: "#5fc8e6", dark: "#1c5163", fg: "#141414", title: "Chaiya", lines: "Chaiya", region: "Southern style", name: "Muay Chaiya",
                  desc: "A defensive traditional fighting style built around tight guards, precise deflections, and effective counterattacks. Following the principles of \"Guard, Deflect, Cover, and Open,\" it excels in close-range combat using elbows and knees.",
                  traits: ["Defense", "Counterattacks", "Close Combat"] },
  };
  let selStyle = "phranakhon";
  // false until the player picks a style themselves (saved as mtx.style); until then selStyle is only
  // the fallback other screens read and no node is marked as picked (no beam).
  let chosen = false;
  let preview = "phranakhon";
  // The screen opens on the whole map (zoomed out, no panel). A on a style zooms in to the panel;
  // B / Y zooms back out first, a second B leaves. Changing style is a hold on A (or the mouse) for HOLD_MS.
  let zoomed = false;
  let holdDoneAt = 0;
  const HOLD_MS = 1000;
  let hold = null;   // MTX_UI.createHold (made in init: needs isMine / STYLES)
  // Camera on .tactical__world (frame px, origin top-left). Zoomed out = whole map; zoomed in = 1:1 with the
  // previewed style centred in the map area left of the panel. It eases (frame-rate independent lerp) to its target.
  const ZOOM_OUT = { x: 560, y: 90, s: 0.5 };
  const FOCUS_AT = { x: 677, y: 540 };
  const CAM_RATE = 9;   // higher = snappier
  let cam = { ...ZOOM_OUT }, camRaf = 0, camLast = 0;
  //#endregion

  //#region [Properties]
  function getSelStyle() {
    return selStyle;
  }

  function getPreviewStyle() {
    return preview;
  }

  function getStyles() {
    return STYLES;
  }

  function setSelStyle(styleId) {
    if (STYLES[styleId]) {
      selStyle = preview = styleId;
      chosen = true;
      applyStyle();
    }
  }
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    hold = makeHold();
    const saved = api.store.get("style", "");
    chosen = !!STYLES[saved];
    selStyle = chosen ? saved : "phranakhon";
    preview = selStyle;
    applyStyle();
    bindMouse();
    moveCam(true);
  }

  function enter() {
    preview = selStyle;
    cancelHold(false);
    setZoom(false);
    renderPanel();
    moveCam(true);
  }

  function focus(el) {
    if (el && STYLES[el.dataset.id]) {
      preview = el.dataset.id;
      renderPanel();
      moveCam();
    }
  }

  function applyStyle() {
    api.$$("#s-tactical .style-marker").forEach(m => m.classList.toggle("is-selected", chosen && m.dataset.id === selStyle));
    api.screens?.tactical?.classList.toggle("has-style", chosen);
    if (api.screens?.tactical?.dataset) api.screens.tactical.dataset.first = selStyle;
    const s = STYLES[selStyle];
    const name = api.bind("styleName");
    if (name) {
      name.textContent = s.title;
      fitName(name, 1488);
    }
    const emblem = api.bind("emblem");
    if (emblem) emblem.src = `mtx/assets/svg/style-${selStyle}-sel.svg`;
    const core = api.bind("coreEmblem");
    if (core) core.src = `mtx/assets/svg/style-${selStyle}-sel.svg`;
    const treeSub = api.bind("treeStyle");
    if (treeSub) treeSub.textContent = s.title + " tree";

    const skillTree = api.getScreen("skilltree");
    if (skillTree?.onStyleChanged) skillTree.onStyleChanged(s);

    if (chosen) api.store.set("style", selStyle);
    document.dispatchEvent(new CustomEvent("mtx:style", { detail: { id: selStyle } }));   // Dev Tools style dropdown + per-style dev values (style-dev.js)
    document.documentElement.style.setProperty("--style-color", s.color);
    document.documentElement.style.setProperty("--style-fg", s.fg || "#ffffff");
    renderPanel();
  }
  //#endregion

  //#region [Private Methods]
  function setZoom(on) {
    zoomed = on;
    const t = api.screens.tactical;
    t.classList.toggle("is-zoomed", on);
    const btn = api.bind("selectBtn", t);
    // the Select button is only a focus stop while the panel is on screen
    if (on) btn.setAttribute("data-nav", "");
    else {
      btn.removeAttribute("data-nav");
      if (api.getFocused() === btn) api.setFocus(api.$(`#s-tactical .style-marker[data-id="${preview}"]`));
    }
    setHint("b", on ? "Zoom out" : "Back");
    setHint("a", on ? (isMine() ? "Hold to enter" : "Hold to select") : "Choose style");
    renderPanel();
    moveCam();
  }

  function camTarget() {
    const m = zoomed && api.$(`#s-tactical .style-marker[data-id="${preview}"]`);
    if (!m) return ZOOM_OUT;
    return { x: FOCUS_AT.x - parseFloat(m.style.left), y: FOCUS_AT.y - parseFloat(m.style.top), s: 1 };
  }

  function applyCam() {
    const w = api.$("#s-tactical .tactical__world");
    if (!w) return;
    w.style.transform = `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
  }

  function moveCam(snap = false) {
    if (snap) {
      cancelAnimationFrame(camRaf);
      camRaf = 0;
      cam = { ...camTarget() };
      applyCam();
      return;
    }
    if (camRaf) return;
    camLast = performance.now();
    camRaf = requestAnimationFrame(stepCam);
  }

  function stepCam(now) {
    const dt = Math.min(0.064, (now - camLast) / 1000);
    camLast = now;
    const t = camTarget(), k = 1 - Math.exp(-dt * CAM_RATE);
    cam.x += (t.x - cam.x) * k;
    cam.y += (t.y - cam.y) * k;
    cam.s += (t.s - cam.s) * k;
    const done = Math.abs(t.x - cam.x) < 0.3 && Math.abs(t.y - cam.y) < 0.3 && Math.abs(t.s - cam.s) < 0.0005;
    if (done) cam = { ...t };
    applyCam();
    camRaf = done ? 0 : requestAnimationFrame(stepCam);
  }

  function setHint(btn, label) {
    const g = api.$(`#s-tactical .hint-bar .glyph[data-btn="${btn}"]`);
    const span = g && g.closest(".hint")?.lastElementChild;
    if (span) span.textContent = label;
  }

  // B / Y on this screen: zoom out first; the caller goes back only when this returns false
  function onBack() {
    if (!zoomed) return false;
    cancelHold(false);
    setZoom(false);
    api.rumble(50, 0.2);
    return true;
  }

  // the previewed style is the one the player already picked
  function isMine() {
    return chosen && preview === selStyle;
  }

  function isHoldReady() {
    if (api.getCur() !== "tactical" || !zoomed) return false;   // the player's own style: hold = Enter
    const f = api.getFocused();
    return !!f && (f.classList.contains("style-marker") || f === api.bind("selectBtn", api.screens.tactical));
  }

  function startHold() {
    if (hold.active || !isHoldReady()) return false;
    return hold.start(api.bind("selectBtn", api.screens.tactical));
  }

  function cancelHold(hint = true) {
    hold?.cancel(hint);
  }

  function makeHold() {
    return window.MTX_UI.createHold({
      ms: HOLD_MS,
      onCancel({ quick, notify }) {
        if (notify && quick) window.MTX_UI.holdHint(isMine() ? "enter" : `select ${STYLES[preview].title}`);
      },
      onDone() {
        holdDoneAt = performance.now();
        api.rumble(140, 0.5);
        // already the player's style: Enter returns to the page that opened the map (the style / Mastery hub)
        if (isMine()) {
          api.back();
          return;
        }
        selStyle = preview;
        chosen = true;
        applyStyle();
        api.toast(STYLES[selStyle].title + " style selected");   // stay on the map: the button now reads "Enter"
      }
    });
  }

  function bindMouse() {
    const btn = api.bind("selectBtn", api.screens.tactical);
    if (!btn || btn.dataset.holdBound) return;
    btn.dataset.holdBound = "1";
    btn.addEventListener("mousedown", e => { if (e.button === 0) { api.setFocus(btn); startHold(); } });
    ["mouseup", "mouseleave"].forEach(ev => btn.addEventListener(ev, () => cancelHold(ev === "mouseup")));
  }

  // panel name: largest size (50 -> 30 px) that keeps it on one line inside the panel
  function fitPanelName(el) {
    let size = 50;
    el.style.fontSize = size + "px";
    while (el.scrollWidth > el.clientWidth + 1 && size > 30) el.style.fontSize = (size -= 2) + "px";
  }

  function fitName(el, max) {
    el.style.transform = "";
    const w = el.scrollWidth;
    if (w > max) el.style.transform = `scaleX(${max / w})`;
  }

  function renderPanel() {
    const s = STYLES[preview];
    const t = api.screens.tactical;
    if (!s || !t) return;
    // zoomed in, the previewed node keeps its colour even while focus sits on the Select button
    api.$$("#s-tactical .style-marker").forEach(m => m.classList.toggle("is-viewing", zoomed && m.dataset.id === preview));
    t.style.setProperty("--preview-color", s.color);
    t.style.setProperty("--preview-dark", s.dark || `color-mix(in srgb, ${s.color} 45%, #000)`);
    const reg = api.bind("region", t);
    if (reg) reg.textContent = s.region;
    const em = api.bind("panelEmblem", t);
    if (em) em.src = `mtx/assets/svg/style-${preview}-sel.svg`;
    const nm = api.bind("name", t);
    if (nm) {
      nm.textContent = s.name;
      fitPanelName(nm);
    }
    const d = api.bind("desc", t);
    if (d) d.textContent = s.desc;
    const tr = api.bind("traits", t);
    if (tr) tr.innerHTML = s.traits.map(x => `<span>${x}</span>`).join("");
    const sel = api.bind("selectBtn", t);
    if (sel) {
      // picked style: "Enter" (hold -> Ultimate Fight); any other: "Select" (hold -> pick it)
      sel.classList.remove("is-done");
      sel.querySelector(".btn-cta__label").textContent = isMine() ? "Enter" : "Select";
      if (zoomed) setHint("a", isMine() ? "Hold to enter" : "Hold to select");
    }
  }
  //#endregion

  window.MTX_SCREENS.tactical = {
    bindApi,
    init,
    enter,
    focus,
    applyStyle,
    renderPanel,
    getSelStyle,
    hasStyle: () => chosen,
    getPreviewStyle,
    getStyles,
    setSelStyle,
    onBack,
    isHoldReady,
    startHold,
    cancelHold,
    isZoomed: () => zoomed,
    actions: {
      // A on a style: zoomed out it opens that style's panel; zoomed in, the change itself is a hold
      pickStyle(el) {
        preview = el.dataset.id;
        if (!zoomed) {
          setZoom(true);
          renderPanel();
          api.rumble(60, 0.25);
          return;
        }
        if (isMine()) api.toast("Already your style");
      },
      confirmStyle() {
        if (performance.now() - holdDoneAt < 600) return;   // the click that ends a mouse hold
        if (isMine()) api.toast("Already your style");
      }
    }
  };
})();
