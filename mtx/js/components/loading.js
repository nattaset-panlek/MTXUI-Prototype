/* Component: load screen (Figma 638:70485 "Load Screen").
     MTX_LOADING.show({ page, duration, tip, onDone })   -> full-screen load screen; the progress bar fills over duration
     MTX_LOADING.hide()                                  -> close now, without onDone
     MTX_LOADING.setProgress(0.5)                        -> drive the bar yourself (use with duration: null)
     MTX_LOADING.isOpen()                                -> true while shown; app.js blocks input meanwhile
     MTX_LOADING.pages                                   -> the page ids

   options: page      "decisive" | "resources" | "corner" | "knockdown" | "random" (default)
            duration  ms until it finishes (default 5000); null = stays until hide() or setProgress(1)
            tip       { title, text, keys: ["LT", "RS", "X"] } (default: the tip from Figma)
            label     footer heading (default "Tips and tricks")
            onDone    called once when the bar is full */
(function () {
  const IMG = "mtx/assets/img/load/";
  const img = (file, x, y, w, h, cls = "") => `<img class="mtx-load__art ${cls}" src="${IMG}${file}" alt="" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">`;
  const text = (cls, x, y, w, html) => `<p class="mtx-load__text ${cls}" style="left:${x}px;top:${y}px;width:${w}px">${html}</p>`;
  const title = (x, y, w, html) => `<h1 class="mtx-load__title tex-text" style="left:${x}px;top:${y}px;width:${w}px">${html}</h1>`;
  const line = y => `<i class="mtx-load__line" style="top:${y}px"></i>`;

  const PAGES = {
    decisive: () => title(113, 42, 1191, "Decisive<br>Move") + text("is-desc", 660, 217, 565, "A powerful special attack capable of a direct Knockout (KO).") + line(365)
      + text("is-body is-yellow", 1300, 602, 573, "<b>Execute:</b> Once full, press the D-Pad in your assigned direction to unleash the move.")
      + [1300, 1388, 1476, 1564].map((x, i) => img(`dir${i + 1}.png`, x, 514, 57, 57)).join("") + img("wheel.png", 1047, 476, 217, 217)
      + text("is-body", 113, 602, 668, "<b>Unlock:</b> Fill the Decisive Gauge by landing strikes and successfully defending.")
      + img("gauge.png", -1, 537, 1273, 119) + `<b class="mtx-load__gauge">Decisive move</b>`,
    resources: () => title(179, 39, 1077, "Resources") + line(221) + line(596)
      + img("leg_health.png", 179, 442, 144, 32) + text("is-res is-green", 345, 434, 624, "<b>Health (HP):</b> Your survival meter. Keep it above zero to stay in the fight. HP regenerates slightly when backing away from combat.")
      + img("leg_stamina.png", 1065, 440, 144, 32) + text("is-res is-blue", 1231, 430, 563, "<b>Stamina:</b> Required for movement, striking, and defense. Manage it wisely; exhaustion leaves you vulnerable.")
      + img("armor.png", 432, 660, 238, 128) + text("is-res is-red", 723, 698, 815, "<b>Armor:</b> Three layers of protection that absorb impact. Breaking these layers will increase the damage you receive.")
      + img("hud.png", 178, 283, 595, 97) + `<b class="mtx-load__hud-name">Player</b>`,
    corner: () => title(154, 64, 1117, "Corner<br>Mechanic") + text("is-desc", 1112, 167, 613, "A recovery phase between rounds where you can partially restore your fighter’s condition.")
      + `<b class="mtx-load__badge">150 Points</b>` + text("is-res is-yellow", 945, 548, 695, "<b>Points:</b> Earn Corner Points by maintaining pressure and staying aggressive against your opponent.")
      + img("corner.webp", 306, 329, 526, 480),
    knockdown: () => img("dial.webp", 721, 394, 412, 458) + title(79, 64, 1325, "Knockdown<br>Recovery") + text("is-desc", 1111, 191, 643, "When knocked down, you can return to the fight through the recovery system.") + line(325)
      + text("is-rule", 79, 447, 576, `<b class="is-red">Difficulty:</b><br>The recovery difficulty is determined by your remaining Stamina at the moment of the knockdown.`)
      + text("is-rule", 79, 604, 599, `<b class="is-yellow">Three-knockdown rule:</b><br>Being knocked down 3 times in a single round results in an immediate Technical Knockout (TKO).`)
      + text("is-big is-green", 1227, 517, 527, "<b>Recovery:</b> Successfully reach the required point threshold to stand back up."),
  };
  const IDS = Object.keys(PAGES);
  const TIP = { title: "High kick", text: "A basic high kick in Muay Thai that can be dangerous and knock out people.", keys: ["LT", "RS", "X"] };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let root = null, fill = null, raf = 0, started = 0, ms = 0, done = null, finished = false;

  function footer(tip, label) {
    const keys = (tip.keys || []).map((k, i) => `${i ? "<em>+</em>" : ""}<kbd class="${k === "X" ? "is-x" : ""}">${esc(k)}</kbd>`).join("");
    return `<img class="mtx-load__band" src="${IMG}band.webp" alt=""><i class="mtx-load__track"></i><i class="mtx-load__fill" data-load-fill></i>
      <h2 class="mtx-load__label">${esc(label)}</h2><img class="mtx-load__pose" src="${IMG}pose.png" alt=""><div class="mtx-load__keys">${keys}</div><i class="mtx-load__sep"></i>
      <p class="mtx-load__tip"><b>${esc(tip.title)}</b>${esc(tip.text)}</p><div class="mtx-load__pager"><i class="is-on"></i><i></i><i></i><i></i><i></i></div>`;
  }
  function setProgress(p) {
    const v = Math.max(0, Math.min(1, p));
    if (fill) fill.style.width = v * 100 + "%";
    if (v >= 1 && !finished) { finished = true; finish(); }
  }
  // time based on the clock so it still ends on time when frames are slow
  function tick() {
    if (!root) return;
    const p = (performance.now() - started) / ms;
    setProgress(p);
    if (p < 1 && root) raf = requestAnimationFrame(tick);
  }
  let timer = 0;
  function show({ page = "random", duration = 5000, tip = TIP, label = "Tips and tricks", onDone = null } = {}) {
    hide();
    const id = PAGES[page] ? page : IDS[Math.floor(Math.random() * IDS.length)];
    root = document.createElement("section");
    root.className = `mtx-load mtx-load--${id}`;
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-label", "Loading");
    root.innerHTML = `<img class="mtx-load__bg" src="${IMG}bg.webp" alt="">${PAGES[id]()}${footer(tip, label)}`;
    (document.getElementById("stage") || document.body).appendChild(root);
    fill = root.querySelector("[data-load-fill]");
    done = onDone; finished = false;
    if (duration != null) {
      ms = Math.max(1, duration); started = performance.now();
      raf = requestAnimationFrame(tick);
      timer = setTimeout(() => setProgress(1), ms);   // also ends when the tab is in the background
    } else setProgress(0);
    return id;
  }
  // the next screen is set up underneath, then the load screen fades away over it
  function finish() {
    const el = root, cb = done;
    cancelAnimationFrame(raf); clearTimeout(timer);
    root = null; fill = null; done = null;
    el?.classList.add("is-leaving");
    setTimeout(() => el?.remove(), 320);
    cb?.();
  }
  function hide() {
    cancelAnimationFrame(raf); clearTimeout(timer);
    root?.remove(); root = null; fill = null; done = null;
  }
  window.MTX_LOADING = { show, hide, setProgress, isOpen: () => !!root, pages: IDS };
})();
