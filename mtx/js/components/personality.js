/* Component: Social personality.
   The 4 answer tones the player picks on Simulate day (Interview answers, and the replies to a social mention):
     Professional  #03d0a4  smiling face     (respectful, humble, grateful, promoting the sponsor)
     Boastful      #c509ff  sunglasses face  (confident, hype, bold)
     Controversy   #ff0027  angry face       (trash talk, jokes at someone's cost)
     Cold          #4190e3  flat face        (focus, quiet, no comment)
   Counts are player data (MTX_PLAYER personality) and every [data-personality] block shows them:
     face + how many times each tone was answered (no labels; the name is in the tooltip / aria-label); the most answered tone is the player's personality.

     MTX_UI.personality.TONES            [{ key, name, color, icon }]
     MTX_UI.personality.record(tone)     tone = key, name ("Boastful") or reply slot 0-3 (mention replies are
                                          ordered Professional / Boastful / Controversy / Cold)
     MTX_UI.personality.icon(key)        inline SVG (currentColor)
     MTX_UI.personality.render()         re-fill every [data-personality] block (also runs on player changes) */
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};

  // emoji-style faces, 24x24: solid head in the tone colour (currentColor), features cut in dark ink on top
  const INK = "#141415";
  const S = `fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"`;
  const F = `fill="${INK}"`;
  const HEAD = `<circle cx="12" cy="12" r="11" fill="currentColor"/>`;
  const ICONS = {
    // calm smile
    professional: HEAD + `<circle cx="8.6" cy="10" r="1.4" ${F}/><circle cx="15.4" cy="10" r="1.4" ${F}/><path d="M7.9 14.3c1.1 1.5 2.5 2.3 4.1 2.3s3-.8 4.1-2.3" ${S} stroke-width="2"/>`,
    // sunglasses + smirk
    boastful: HEAD + `<path d="M4.4 8.4h15.2v1.5l-.7 2.2a2.5 2.5 0 0 1-2.4 1.8h-.9a2.5 2.5 0 0 1-2.4-2l-.2-1.1h-2l-.2 1.1a2.5 2.5 0 0 1-2.4 2h-.9a2.5 2.5 0 0 1-2.4-1.8l-.7-2.2z" ${F}/><path d="M9.2 16.4c2 .8 4.1.4 5.8-1.2" ${S} stroke-width="2"/>`,
    // angry brows + gritted teeth
    controversy: HEAD + `<path d="M6.6 7.4l3.5 1.7M17.4 7.4l-3.5 1.7" ${S} stroke-width="2"/><circle cx="8.8" cy="11" r="1.3" ${F}/><circle cx="15.2" cy="11" r="1.3" ${F}/><rect x="7.6" y="14.6" width="8.8" height="3.4" rx=".8" ${S} stroke-width="1.8"/><path d="M10.5 14.6V18M13.5 14.6V18" ${S} stroke-width="1.4"/>`,
    // flat eyes + straight mouth
    cold: HEAD + `<path d="M6.9 10.3h3.4M13.7 10.3h3.4M9 15.5h6" ${S} stroke-width="2"/>`
  };

  const TONES = [
    { key: "professional", name: "Professional", color: "#03d0a4" },
    { key: "boastful", name: "Boastful", color: "#c509ff" },
    { key: "controversy", name: "Controversy", color: "#ff0027" },
    { key: "cold", name: "Cold", color: "#4190e3" }
  ].map(t => Object.assign(t, { icon: ICONS[t.key] }));

  const icon = (key, cls = "persona__svg") => `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[key] || ""}</svg>`;
  const toneOf = t => typeof t === "number" ? TONES[t]
    : TONES.find(x => x.key === String(t).toLowerCase() || x.name.toLowerCase() === String(t).toLowerCase());

  const counts = () => Object.assign({ professional: 0, boastful: 0, controversy: 0, cold: 0 }, window.MTX_PLAYER?.get().personality || {});

  // the most answered tone (ties: the one answered first in TONES order); null before any answer
  function dominant(c = counts()) {
    let best = null;
    TONES.forEach(t => { if (c[t.key] > 0 && (!best || c[t.key] > c[best.key])) best = t; });
    return best;
  }

  function record(t) {
    const tone = toneOf(t);
    const P = window.MTX_PLAYER;
    if (!tone || !P) return null;
    const c = counts();
    c[tone.key]++;
    P.set({ personality: c });
    return tone;
  }

  function render() {
    const c = counts(), top = dominant(c), total = TONES.reduce((n, t) => n + c[t.key], 0);
    document.querySelectorAll("[data-personality]").forEach(el => {
      el.innerHTML = `
        <span class="stat-card__head persona__head">Personality<b style="color:${top ? top.color : "var(--text-muted)"}">${top ? top.name : "Not set"}</b></span>
        <div class="persona__row">${TONES.map(t => `
          <div class="persona__cell${top && top.key === t.key ? " is-top" : ""}${c[t.key] ? "" : " is-zero"}" style="--tone:${t.color}"
            title="${t.name}: answered ${c[t.key]} time${c[t.key] === 1 ? "" : "s"}">
            <span class="persona__badge">${icon(t.key)}</span>
            <b class="persona__n">${c[t.key]}</b>
          </div>`).join("")}</div>`;
      el.setAttribute("aria-label", `Personality ${top ? top.name : "not set"}: ` + TONES.map(t => `${t.name} ${c[t.key]}`).join(", ") + ` (${total} answers)`);
    });
  }

  UI.personality = { TONES, record, icon, dominant, render };

  const boot = () => { render(); window.MTX_PLAYER?.on(render); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);
})();
