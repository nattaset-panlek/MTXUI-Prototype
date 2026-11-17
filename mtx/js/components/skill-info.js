/* Component: skill info card (Figma MTX / Perk Info Card 719:89368).
   One markup for reading a skill: kind, art, badge, name, level tabs Lv 1-3 + RS Level (perks only),
   effect text, Lv 3 drawback, stats line, actions. Used by Tactical Loadout (perk / move info) and the
   Mastery skill tree detail panel. Styles: .tl-info rules in css/loadout.css (+ skill tree bits in screens.css).

     MTX_UI.skillInfo.html({
       attrs: 'data-tl-info hidden',          // extra attributes on the <aside>
       bind: false,                           // true: also add the skill tree data-bind names (sdKind, sdName ...)
       primary: "Equip",                      // label of the primary action (data-i-equip / data-bind sdPrimary)
       cta: false,                            // true: primary is the gold hold CTA button (btn-cta, A glyph + hold bar), false: the Equip pill
       secondary: "",                         // optional X hint label (data-bind sdSecondary), "" = none
     })
     MTX_UI.skillInfo.levels(el, lv, owned)   // mark the Lv tab shown (is-on) and the owned ones (is-owned)
*/
(function () {
  const UI = window.MTX_UI = window.MTX_UI || {};
  const glyph = b => UI.glyph?.(b) || `<span class="glyph" data-btn="${b}">${b.toUpperCase()}</span>`;
  const IMG = "mtx/assets/img/", SV = "mtx/assets/svg/";

  function html({ attrs = "", bind = false, primary = "Equip", secondary = "", cta = false } = {}) {
    const b = name => bind ? ` data-bind="${name}"` : "";
    return `<aside class="skill-detail tl-info" ${attrs} data-figma="719:89368 MTX / Perk Info Card">
      <p class="skill-detail__kind" data-i="kind"${b("sdKind")}></p>
      <div class="skill-detail__card">
        <div class="skill-detail__art"><img src="${IMG}card-art.webp" alt=""></div>
        <span class="skill-detail__score"><img src="${SV}icon-check-circle.svg" alt=""><span data-i="badge"${b("sdBadge")}></span></span>
        <div class="skill-detail__title"><div><h2 class="tex-text" data-i="name"${b("sdName")}></h2></div></div>
        <div class="skill-detail__desc">
          <div class="tl-lv" data-i-lv${b("sdLevels")}><span>Lv 1</span><span>Lv 2</span><span>Lv 3</span></div><div class="tl-lv__sr" data-i-lv${b("sdLevelsRs")}>${glyph("rs")}<span>Level</span></div>
          <p class="tl-info__fx" data-i="fx"${b("sdDesc")}></p><p class="tl-info__draw" data-i="draw"${b("sdDraw")}></p>
          ${bind ? `<dl class="tl-info__stats" data-bind="sdStats"></dl>` : ""}
        </div>
        <div class="skill-detail__actions">${cta ? ctaHtml(primary, b("sdPrimary")) : `<a class="tl-info__equip" data-i-equip${b("sdPrimary")}><i></i><span class="tl-info__label">${primary}</span></a>`}
          ${secondary ? `<span class="hint-inline"${b("sdSecondary")}>${glyph("x")}<span>${secondary}</span></span>` : ""}
          <span class="hint-inline">${glyph("b")}<span>Close</span></span></div>
      </div></aside>`;
  }

  // gold hold CTA (same markup as the old Mastery detail button, Figma 1:3718); label also carries .tl-info__label
  const CHECK = '<svg viewBox="0 0 25 25"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 0C19.4036 0 25 5.59635 25 12.5C25 19.4036 19.4036 25 12.5 25C5.59635 25 0 19.4036 0 12.5C0 5.59635 5.59635 0 12.5 0ZM6.64896 13.2422L10.2089 16.5115C10.7281 16.9896 11.5318 16.9641 12.0203 16.4604L18.3714 10.3797C18.888 9.88281 18.9036 9.06094 18.4068 8.54479C17.9099 8.02812 17.088 8.0125 16.5719 8.50937L11.0703 13.776L8.40781 11.3307C7.88021 10.8453 7.05833 10.8792 6.57292 11.4068C6.08698 11.9349 6.12135 12.7562 6.64896 13.2422Z" fill="currentColor"/></svg>';
  const ctaHtml = (label, attr) => `<a class="btn-cta btn-cta--detail btn-cta--key" data-i-equip${attr}><span class="btn-cta__grad"></span><span class="btn-cta__tex"></span><span class="btn-cta__hold-bar"></span>${glyph("a")}<span class="btn-cta__label tl-info__label">${label}</span><span class="btn-cta__check" aria-hidden="true">${CHECK}</span></a>`;

  function levels(el, lv, owned = 0) {
    el?.querySelectorAll(".tl-lv span").forEach((n, k) => {
      n.classList.toggle("is-on", k + 1 === lv);
      n.classList.toggle("is-owned", k + 1 <= owned);
    });
  }

  UI.skillInfo = { html, levels };
})();
