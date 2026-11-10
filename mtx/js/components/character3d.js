/* Standalone 3D character for screens that contain a [data-char3d] host.
   Three.js and the FBX files load on first need, so other screens cost nothing.
   One renderer and model are shared; the canvas moves to the visible host.
   If WebGL or loading fails, the host stays empty and the screen keeps its static art.
   Dev tools settings (on/off, view box, camera) are kept per screen in localStorage.
   window.MTX_CHARACTER3D = { state(), next(), isEnabled(), setEnabled(on), get(screenId), set(screenId, patch), reset(screenId), setColor(hex, metalness) } */
(function () {
  //#region [Variables/Fields]
  const BASE = new URL("../../", document.currentScript.src).href;   // .../mtx/
  const THREE_URL = BASE + "js/vendor/three-0.170.0/three.module.min.js";
  const FBX_URL = BASE + "js/vendor/three-0.170.0/loaders/FBXLoader.js";
  const MODEL_DIR = BASE + "assets/models/fighter/";
  const CLIPS = [                 // the first file also supplies the mesh; all four share the rig
    { id: "breathing-idle", loops: 1 },
    { id: "boxing-a", loops: 2 },
    { id: "boxing-b", loops: 3 },
    { id: "boxing-c", loops: 2 },
  ];
  const FADE = 0.6;               // crossfade, seconds
  const MAX_PIXEL_RATIO = 2;
  const STORE_KEY = "mtx_char3d";
  const CAMERA_DEFAULT = { zoom: 1.5, camY: 0.65, yaw: 0 };   // camY: fraction of model height
  const DEFAULTS = {              // view box in 1920x1080 frame px
    "s-main": { x: 576, y: 40, w: 660, h: 1040, ...CAMERA_DEFAULT },
    "s-charselect": { x: 576, y: 40, w: 660, h: 1040, ...CAMERA_DEFAULT },
    "s-career": { x: 576, y: 40, w: 660, h: 1040, ...CAMERA_DEFAULT },
    "s-store": { x: 1000, y: 150, w: 480, h: 850, zoom: 1, camY: 0.5, yaw: 0 },
    "s-rewards": { x: 860, y: 150, w: 480, h: 850, zoom: 1, camY: 0.5, yaw: 0 },   // full body preview, only for fighter skins
  };

  const EXT_CAMERA = { zoom: 1.5, camY: 0.65, yaw: 0 };
  const hosts = [...document.querySelectorAll("[data-char3d]")];
  let THREE, renderer, scene, camera, mixer, clock, pivot, material, modelHeight = 1;
  const actions = [];             // { id, action, length }
  let current = null, currentEnd = 0, played = 0;
  let host = null, raf = 0, frames = 0, startup = null, failed = false;
  let ext = null;                 // { left, right, mirror }: an overlay shows the model in two hosts (Standby Lobby)
  const saved = loadSaved();
  //#endregion

  //#region [Settings]
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* still applies for this visit */ }
  }
  const isEnabled = () => saved.enabled !== false;
  const settingsOf = id => ({ ...DEFAULTS[id], ...saved[id] });

  function applyView(h) {
    const v = settingsOf(h.closest(".screen").id);
    Object.assign(h.style, { left: v.x + "px", top: v.y + "px", width: v.w + "px", height: v.h + "px" });
  }
  function applyCamera() {
    if (!camera || !host) return;
    const c = ext && host === ext.left ? EXT_CAMERA : settingsOf(host.closest(".screen").id);
    pivot.rotation.y = THREE.MathUtils.degToRad(c.yaw);
    const dist = (modelHeight * 1.08 / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / c.zoom;
    const y = modelHeight * c.camY;
    camera.position.set(0, y, dist);
    camera.lookAt(0, y, 0);
  }
  function markScreens() {
    const on = isEnabled() && frames > 0;
    hosts.forEach(h => h.closest(".screen")?.classList.toggle("has-char3d", on));
    hosts.forEach(h => { h.hidden = !isEnabled(); });
  }
  //#endregion

  //#region [Visibility]
  function overlayOnTop() {
    if (window.MTX_LOGIN?.isOpen?.() || window.MTX_CLOBBY?.isOpen?.()) return true;
    const title = document.getElementById("titleBg");
    return !!title && !title.hidden && !title.classList.contains("is-off");
  }

  function visibleHost() {
    if (ext) return isEnabled() && !document.hidden ? ext.left : null;
    if (!isEnabled() || document.hidden || overlayOnTop()) return null;
    return hosts.find(h => !h.hasAttribute("data-char3d-off") && h.closest(".screen")?.classList.contains("is-active")) || null;
  }

  function sync() {
    if (failed) return;
    const next = visibleHost();
    if (!next) return stop();
    if (next !== host) stop();
    host = next;
    if (!startup) startup = boot().catch(fail);
    startup.then(() => { if (!failed && host === visibleHost()) start(); });
  }
  //#endregion

  //#region [Loading]
  async function boot() {
    const [three, fbx] = await Promise.all([import(THREE_URL), import(FBX_URL)]);
    THREE = three;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.className = "char3d__canvas";
    scene = new THREE.Scene();
    clock = new THREE.Clock(false);
    addLights();

    const loader = new fbx.FBXLoader();
    const base = await loader.loadAsync(MODEL_DIR + CLIPS[0].id + ".fbx");
    setupModel(base);
    addClip(CLIPS[0], base.animations[0]);
    playNext();
    loadRemainingClips(loader);   // idle shows first; the rest join the pool as they arrive
  }

  async function loadRemainingClips(loader) {
    for (const def of CLIPS.slice(1)) {
      try {
        const file = await loader.loadAsync(MODEL_DIR + def.id + ".fbx");   // keeps only the clip
        addClip(def, file.animations[0]);
      } catch (err) { console.warn("[char3d] clip not loaded:", def.id, err); }
    }
  }

  function setupModel(model) {
    const look = window.MTX_SCREENS?.charselect?.look?.() ?? { color: 0x9a9da6, metalness: 0.05 };   // the character picked before the model loaded
    material = new THREE.MeshStandardMaterial({ color: look.color, roughness: 0.62, metalness: look.metalness });
    model.traverse(o => {
      if (!o.isMesh) return;
      o.material = material;      // the FBX has UVs but no texture
      o.frustumCulled = false;    // the bind-pose bounds don't follow the animation
    });
    const box = new THREE.Box3().setFromObject(model, true);
    modelHeight = box.max.y - box.min.y;
    model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    pivot = new THREE.Group();    // yaw turns the model around its own center
    pivot.add(model);
    scene.add(pivot);
    mixer = new THREE.AnimationMixer(model);
    camera = new THREE.PerspectiveCamera(24, 1, modelHeight / 10, modelHeight * 20);
  }

  function addLights() {
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x20222a, 1.1));
    const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.position.set(1.5, 3, 3);
    const rim = new THREE.DirectionalLight(0x8fb4ff, 2.2);
    rim.position.set(-2.5, 2.5, -3);
    scene.add(key, rim);
  }

  function addClip(def, clip) {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    actions.push({ id: def.id, action, length: clip.duration * def.loops });
  }

  function fail(err) {
    failed = true;
    stop();
    console.warn("[char3d] disabled, keeping static art:", err);
  }
  //#endregion

  //#region [Playback]
  function playNext() {
    const pool = actions.filter(a => a !== current);
    if (!pool.length) { currentEnd = played + current.length; return; }   // idle only so far: keep looping it
    const next = pool[Math.floor(Math.random() * pool.length)];
    next.action.reset().play();
    if (current) current.action.crossFadeTo(next.action, FADE, false);
    current = next;
    currentEnd = played + next.length - FADE;
  }

  function start() {
    if (raf) return;
    if (renderer.domElement.parentNode !== host) host.appendChild(renderer.domElement);
    resize();
    applyCamera();
    clock.start();                // a pause doesn't jump the animation ahead
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1);
    played += dt;
    if (played >= currentEnd) playNext();
    mixer.update(dt);
    renderer.render(scene, camera);
    if (ext && host === ext.left) mirrorFrame();
    if (frames++ === 0) markScreens();
  }

  function mirrorFrame() {
    ext.left.parentNode.classList.add("is-live");
    if (!ext.mirror) return;
    const src = renderer.domElement, dst = ext.mirror;
    if (dst.width !== src.width || dst.height !== src.height) { dst.width = src.width; dst.height = src.height; }
    const ctx = dst.getContext("2d");
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
  }

  function resize() {
    const w = host.offsetWidth, h = host.offsetHeight;
    const scale = host.getBoundingClientRect().width / w || 1;   // the stage is scaled to the window
    renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO, (window.devicePixelRatio || 1) * scale));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  //#endregion

  //#region [Public Methods]
  window.MTX_CHARACTER3D = {
    state: () => ({ running: !!raf, loaded: !!mixer, failed, frames, clip: current?.id || null, clips: actions.map(a => a.id), host: host?.closest(".screen")?.id || null }),
    next: () => { if (mixer) playNext(); },
    attach(left, right) {   // show the model in an overlay host; an optional second host copies each frame
      if (ext && ext.left === left && ext.right === right) { if (!raf) sync(); return; }
      const copy = el => el.querySelector("canvas:not(.char3d__canvas)");
      copy(left)?.remove();
      let mirror = null;
      if (right) {
        mirror = copy(right);
        if (!mirror) { mirror = document.createElement("canvas"); right.appendChild(mirror); }
      }
      ext = { left, right, mirror };
      sync();
    },
    detach() { if (!ext) return; ext = null; sync(); },
    refresh: () => sync(),   // after a screen toggles data-char3d-off on its host
    setColor(hex, metalness = 0.05) {
      if (!material) return;
      material.color.setHex(hex);
      material.metalness = metalness;
    },
    isEnabled,
    setEnabled(on) { saved.enabled = !!on; save(); markScreens(); sync(); },
    get: settingsOf,
    set(id, patch) {
      saved[id] = { ...saved[id], ...patch };
      save();
      hosts.filter(h => h.closest(".screen").id === id).forEach(applyView);
      if (raf) { resize(); applyCamera(); }
    },
    reset(id) {
      delete saved[id];
      save();
      hosts.filter(h => h.closest(".screen").id === id).forEach(applyView);
      if (raf) { resize(); applyCamera(); }
    },
  };
  //#endregion

  hosts.forEach(applyView);
  markScreens();

  //#region [Watchers]
  // Later scripts set up the login and title, so the first sync waits for page load.
  function watch() {
    const observer = new MutationObserver(sync);
    const watchAttrs = { attributes: true, attributeFilter: ["class", "hidden"] };
    hosts.forEach(h => observer.observe(h.closest(".screen"), watchAttrs));
    ["titleBg", "login"].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el, watchAttrs);
    });
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", () => { if (raf) resize(); });
    sync();
  }
  if (document.readyState === "complete") watch(); else window.addEventListener("load", watch);
  //#endregion
})();
