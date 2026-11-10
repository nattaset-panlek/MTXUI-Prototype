(function () {
  window.MTX_SCREENS = window.MTX_SCREENS || {};

  //#region [Variables/Fields]
  let api = null;
  const IMG = "mtx/assets/img/";
  const SVG = "mtx/assets/svg/";

  // Accounts that show up in the feed and in Mention events. Text content stays emoji-free.
  const ACCOUNTS = {
    me:       { name: "SX.MTX", handle: "sx_mtx", avatar: IMG + "avatar.webp", verified: true },
    official: { name: "MTX Official", handle: "MTX_Official", avatar: IMG + "post-avatar.webp", verified: true },
    rival:    { name: "Petchsangwan Sor.Kaewsai", handle: "petchsangwan_sk", avatar: IMG + "fighter-samart.webp", verified: true, cutout: true },
    fan:      { name: "Ploy", handle: "ploy_nakmuay", avatar: IMG + "manager-nattapong.webp", cutout: true },
    news:     { name: "Muay Thai Daily", handle: "MuayThaiDaily", avatar: IMG + "news-season.webp", verified: true },
    gambler:  { name: "Ringside Lek", handle: "ringside_lek", avatar: IMG + "manager-kamol.webp", cutout: true },
    beefy:    { name: "Beefy Buff", handle: "BeefyBuff", avatar: SVG + "sponsor-beefybuff.svg", verified: true, logo: true },
    camp:     { name: "Sit MTX Camp", handle: "SitMTX_Camp", avatar: IMG + "manager-justin.webp", verified: true, cutout: true }
  };

  // Starting timeline (newest first). Player replies from Mention events are prepended at runtime.
  const BASE_FEED = [
    { by: "official", time: "2h", text: "Who would you like to face next?\nDrop a message. The world is watching.\n#MTX #MuayThaiXtreme #NextFight", stats: [3200, 1600, 5600, 128000] },
    { by: "me", time: "5h", text: "Knees from the clinch all morning. 300 reps, then pads with Kru. Saturday can't come soon enough.", media: IMG + "fighter-knee.webp", mediaFit: "contain", stats: [412, 96, 2840, 41000] },
    { by: "news", time: "8h", text: "Saturday's Lumpinee card is set. Rookie @sx_mtx steps up against @petchsangwan_sk over five rounds. The gamblers have it 3:1 against the newcomer.", media: IMG + "event-interview.webp", stats: [890, 2100, 7400, 210000] },
    { by: "fan", time: "12h", text: "Saw @sx_mtx doing roadwork at 5am past the temple. Stopped to wai the monks and kept running. #NakMuay", stats: [64, 31, 1290, 18000] },
    { by: "me", time: "1d", text: "Season 1 starts now. From temple fairs to Lumpinee. Thank you to my Kru and my camp. #MTX #Season1", media: IMG + "news-season.webp", stats: [1100, 640, 9800, 156000] }
  ];

  const TRENDS = [
    ["Sports · Trending", "#Lumpinee", "24.1K posts"],
    ["Muay Thai · Trending", "#SXvsPetch", "12.8K posts"],
    ["Trending in Thailand", "#WaiKru", "8,402 posts"],
    ["Combat sports", "Rajadamnern", "5,960 posts"],
    ["Muay Thai · Trending", "#MaeMai", "3,118 posts"],
    ["Sports · Trending", "#BeefyBuffFuel", "2,450 posts"]
  ];
  const FOLLOW = ["camp", "beefy", "rival"];

  // Mention events from Simulate day: a post about the player + 4 reply tones.
  // fx = [followers, reputation XP]
  const MENTIONS = [
    {
      id: "rival_callout", by: "rival", tag: "Rival callout",
      text: "Heard @sx_mtx is the new name at Lumpinee. Bring your shins, kid. I'll check every kick you throw.",
      stats: [1800, 960, 6400, 98000],
      replies: [
        { tone: "Respect", color: "#03d0a4", text: "Respect, P'Petch. I'll bring my best shins and my Wai Kru. See you on Saturday.", effect: "+1,200 Followers · +600 RXP · Fans respect you", fx: [1200, 600] },
        { tone: "Confident", color: "#c509ff", text: "Check all you want. My Te Tad doesn't stop at your shin.", effect: "+2,500 Followers · +300 RXP · Rivalry grows", fx: [2500, 300] },
        { tone: "Trash talk", color: "#ff0027", text: "You were checking kicks before I was born. Saturday you retire.", effect: "+4,800 Followers · -400 RXP · Heated rivalry", fx: [4800, -400] },
        { tone: "Focus", color: "#4190e3", text: "Back to the bag. Talk is cheap, roadwork isn't.", effect: "+600 Followers · +200 RXP · Focus up", fx: [600, 200] }
      ]
    },
    {
      id: "fan_roadwork", by: "fan", tag: "Fan post",
      text: "5am roadwork spotted again. @sx_mtx do you ever sleep? Saturday I'm buying ringside seats for the whole family.",
      stats: [120, 44, 2100, 26000],
      replies: [
        { tone: "Grateful", color: "#03d0a4", text: "Thank you Ploy! Sleep is for after the fight. See you ringside.", effect: "+1,500 Followers · +500 RXP · Fan loyalty", fx: [1500, 500] },
        { tone: "Hype", color: "#c509ff", text: "Bring the whole village. Saturday we make noise at Lumpinee!", effect: "+2,200 Followers · +300 RXP · Hype builds", fx: [2200, 300] },
        { tone: "Joke", color: "#ff0027", text: "Kru says if I sleep in he makes me do 500 teeps. So no.", effect: "+1,800 Followers · +200 RXP · Fans love it", fx: [1800, 200] },
        { tone: "Quiet", color: "#4190e3", text: "Thank you.", effect: "+300 Followers · +100 RXP", fx: [300, 100] }
      ]
    },
    {
      id: "news_odds", by: "news", tag: "News",
      text: "Gamblers at Lumpinee now have @sx_mtx at 3:1 against Petchsangwan. Can the rookie prove them wrong? Reply with your prediction.",
      media: IMG + "event-interview.webp",
      stats: [2400, 1300, 8800, 260000],
      replies: [
        { tone: "Humble", color: "#03d0a4", text: "The odds are fair. He's a champion. I'll let my Muay do the talking.", effect: "+1,400 Followers · +700 RXP · Press likes you", fx: [1400, 700] },
        { tone: "Bold", color: "#c509ff", text: "Put your money on the rookie. You'll thank me Saturday night.", effect: "+3,000 Followers · +200 RXP · Odds shift", fx: [3000, 200] },
        { tone: "Trash talk", color: "#ff0027", text: "3:1? Petch should take those odds and run.", effect: "+4,200 Followers · -300 RXP · Rival angry", fx: [4200, -300] },
        { tone: "No comment", color: "#4190e3", text: "Training. Talk after the fight.", effect: "+500 Followers · +300 RXP · Focus up", fx: [500, 300] }
      ]
    },
    {
      id: "sponsor_tag", by: "beefy", tag: "Sponsor",
      text: "Who eats Beefy Buff before pad rounds? Tag your favourite Nak Muay. #FuelTheFight",
      stats: [340, 210, 3300, 54000],
      replies: [
        { tone: "Promote", color: "#03d0a4", text: "Two packs before every session. Fuel for Saturday. #FuelTheFight", effect: "+1,600 Followers · +400 RXP · Sponsor happy", fx: [1600, 400] },
        { tone: "Hype", color: "#c509ff", text: "Beefy Buff in the corner, Petch on the canvas. That's the plan.", effect: "+2,400 Followers · +200 RXP · Hype builds", fx: [2400, 200] },
        { tone: "Joke", color: "#ff0027", text: "Kru found my stash. Send help (and more Beefy Buff).", effect: "+2,000 Followers · +300 RXP · Fans love it", fx: [2000, 300] },
        { tone: "Skip", color: "#4190e3", text: "Rice and fish before fights. Kru's rules.", effect: "+400 Followers · -200 RXP · Sponsor annoyed", fx: [400, -200] }
      ]
    },
    {
      id: "hater", by: "gambler", tag: "Hater",
      text: "Lucky win last week. The ref stopped it early. Rematch and @sx_mtx is done. Calling it now.",
      stats: [210, 80, 640, 31000],
      replies: [
        { tone: "Respect", color: "#03d0a4", text: "Rematch any time. Respect to my opponent, he fought hard.", effect: "+1,300 Followers · +600 RXP · Respect earned", fx: [1300, 600] },
        { tone: "Confident", color: "#c509ff", text: "Watch the replay. Three clean knees before the stop.", effect: "+2,000 Followers · +300 RXP", fx: [2000, 300] },
        { tone: "Trash talk", color: "#ff0027", text: "Lose your bet? Try picking the winner next time.", effect: "+3,600 Followers · -300 RXP · Drama", fx: [3600, -300] },
        { tone: "Ignore", color: "#4190e3", text: "(Mute and keep training)", effect: "+0 Followers · +300 RXP · Focus up", fx: [0, 300] }
      ]
    }
  ];

  let followers = 125420;
  // Reputation = the player's R track (MTX_PLAYER): RXP is R XP, the level is the R level of the HUD
  const P = () => window.MTX_PLAYER;
  const rep = () => {
    const p = P();
    if (!p) return { level: 1, xp: 0, need: 1 };
    const r = p.get().r;
    return { level: r.level, xp: r.xp, need: p.need("r") };
  };
  let myPosts = [];      // replies the player has posted (newest first)
  let mention = null;    // event currently open in the Mention modal
  //#endregion

  //#region [Helpers]
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = n => n.toLocaleString("en-US");
  const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K" : String(n);
  // hashtags + @mentions in the accent blue, line breaks kept; emoji are dropped so older saved posts render clean too
  const richText = t => esc(String(t).replace(EMOJI, "")).replace(/(#\w+|@\w+)/g, '<em>$1</em>').replace(/\n/g, "<br>");

  function avatarHtml(acc, cls = "xp__avatar") {
    const kind = acc.logo ? " is-logo" : acc.cutout ? " is-cutout" : "";
    return `<span class="${cls}${kind}"><img src="${acc.avatar}" alt=""></span>`;
  }

  function whoHtml(acc, time) {
    return `<div class="xp__who"><b>${esc(acc.name)}</b>${acc.verified ? '<i class="xp__verified"></i>' : ""}` +
      `<span>@${acc.handle}${time ? " · " + time : ""}</span></div>`;
  }

  function actionsHtml(stats, bookmarked) {
    const [rep, rt, like, views] = stats;
    return `<div class="xp__actions">` +
      `<span class="xp__act xp__act--reply"><i></i>${short(rep)}</span>` +
      `<span class="xp__act xp__act--repost"><i></i>${short(rt)}</span>` +
      `<span class="xp__act xp__act--like"><i></i>${short(like)}</span>` +
      `<span class="xp__act xp__act--views"><i></i>${short(views)}</span>` +
      `<span class="xp__act xp__act--bookmark${bookmarked ? " is-on" : ""}"><i></i></span></div>`;
  }

  function postHtml(p) {
    const acc = ACCOUNTS[p.by];
    const reply = p.replyTo ? `<p class="xp__replying">Replying to <em>@${p.replyTo}</em></p>` : "";
    const media = p.media ? `<div class="xp__media${p.mediaFit === "contain" ? " is-contain" : ""}"><img src="${p.media}" alt=""></div>` : "";
    return `<article class="xp">` +
      avatarHtml(acc) +
      `<div class="xp__main">${whoHtml(acc, p.time)}${reply}<p class="xp__text">${richText(p.text)}</p>${media}${actionsHtml(p.stats, p.by === "me")}</div>` +
      `</article>`;
  }
  //#endregion

  //#region [Public Methods]
  function bindApi(coreApi) {
    api = coreApi;
  }

  function init(coreApi) {
    api = coreApi;
    followers = +api.store.get("social_followers", followers) || followers;
    try { myPosts = JSON.parse(api.store.get("social_my_posts", "[]")) || []; } catch (e) { myPosts = []; }
    api.bind("feedView")?.addEventListener("scroll", syncScrollbar, { passive: true });
    renderSide();
    renderFeed();
    renderStats();
    P()?.on(() => renderStats());   // R XP / level changes anywhere (dev panel, replies) update every RXP read-out
  }

  function enter() {
    renderFeed();
    renderStats();
  }

  // The feed is view-only: Up / Down scroll, Back leaves (app.js handles it), every other button does nothing.
  // Options and Friends stay global. Mouse: wheel, native scroll on the view.
  const SCROLL_STEP = 160;
  let scrollGoal = null, scrollTimer = 0;
  function scrollFeed(by) {
    const v = api.bind("feedView");
    if (!v) return;
    const max = v.scrollHeight - v.clientHeight;
    scrollGoal = Math.max(0, Math.min(max, (scrollGoal ?? v.scrollTop) + by));   // a held key adds up
    clearInterval(scrollTimer);
    scrollTimer = setInterval(() => {
      const d = scrollGoal - v.scrollTop;
      if (Math.abs(d) < 2) { v.scrollTop = scrollGoal; scrollGoal = null; clearInterval(scrollTimer); return; }
      v.scrollTop += d * .3;
    }, 16);
  }

  function onInput(a) {
    if (a === "back") return false;
    if (a === "up" || a === "down") scrollFeed(a === "up" ? -SCROLL_STEP : SCROLL_STEP);
    return true;
  }

  function syncScrollbar() {
    window.MTX_UI.syncScrollbar(api.bind("feedView"), api.bind("feedScroll"), { thumb: api.bind("feedThumb") });
  }

  function renderFeed() {
    const list = api.bind("feed");
    if (!list) return;
    list.innerHTML = [...myPosts, ...BASE_FEED].map(postHtml).join("");
    api.bind("feedView").scrollTop = 0;
    syncScrollbar();
  }

  function renderSide() {
    const trends = api.bind("trends");
    if (trends) trends.innerHTML = TRENDS.map(([meta, name, count]) =>
      `<div class="xside__trend"><span>${meta}</span><b>${esc(name)}</b><span>${count}</span></div>`).join("");
    const follow = api.bind("whoToFollow");
    if (follow) follow.innerHTML = FOLLOW.map(k => {
      const a = ACCOUNTS[k];
      return `<div class="xside__user">${avatarHtml(a, "xp__avatar xp__avatar--sm")}` +
        `<div class="xside__user-who"><b>${esc(a.name)}${a.verified ? '<i class="xp__verified"></i>' : ""}</b><span>@${a.handle}</span></div></div>`;
    }).join("");
  }

  // Followers / reputation appear on Media, Management and the Interview modal.
  function renderStats() {
    api.$$("[data-followers]").forEach(el => { el.textContent = fmt(followers); });
    const r = rep();
    api.$$("[data-rxp]").forEach(el => { el.textContent = `${fmt(r.xp)} / ${fmt(r.need)}`; });
    api.$$("[data-rxp-bar]").forEach(el => el.style.setProperty("--p", Math.min(100, r.xp / r.need * 100).toFixed(1) + "%"));
    api.$$("[data-rlevel]").forEach(el => { el.textContent = r.level; });
    api.$$("[data-post-count]").forEach(el => { el.textContent = fmt(214 + myPosts.length); });
  }

  // ---- Mention event (opened by screen-manager.js during Simulate day) ----
  function prepareMention() {
    mention = MENTIONS[Math.floor(Math.random() * MENTIONS.length)];
    const acc = ACCOUNTS[mention.by];
    api.bind("mentionTag").textContent = mention.tag;
    api.bind("mentionPost").innerHTML =
      avatarHtml(acc) +
      `<div class="xp__main">${whoHtml(acc, "now")}<p class="xp__text">${richText(mention.text)}</p>` +
      (mention.media ? `<div class="xp__media"><img src="${mention.media}" alt=""></div>` : "") +
      `${actionsHtml(mention.stats, false)}</div>`;
    api.bind("mentionReplyTo").textContent = "@" + acc.handle;
    api.bind("mentionReplies").innerHTML = mention.replies.map((r, i) =>
      `<div class="sp-reply focus-ring focus-ring--3${i === 0 ? " is-focused" : ""}" data-flow-id="${i}" tabindex="0" style="--tone:${r.color}">` +
      `<span class="sp-reply__tone">${r.tone}</span>` +
      `<p class="sp-reply__text">${richText(r.text)}</p>` +
      `<span class="sp-reply__fx">${r.effect}</span></div>`).join("");
    return mention;
  }

  function replyToMention(index) {
    const r = mention?.replies[index];
    if (!r) return null;
    const acc = ACCOUNTS[mention.by];
    followers = Math.max(0, followers + r.fx[0]);
    P()?.addXp("r", r.fx[1]);   // RXP = R XP (level ups included)
    if (!/^\(.*\)$/.test(r.text)) {   // "(Mute and keep training)" is not a post
      myPosts.unshift({ by: "me", time: "now", replyTo: acc.handle, text: r.text, stats: [0, Math.round(r.fx[0] / 40), Math.round(r.fx[0] / 4), r.fx[0] * 6] });
      myPosts = myPosts.slice(0, 20);
    }
    api.store.set("social_followers", followers);
    api.store.set("social_my_posts", JSON.stringify(myPosts));
    renderFeed();
    renderStats();
    return { tone: r.tone, handle: acc.handle, followers: r.fx[0] };
  }

  function resetSocial() {
    followers = 125420;
    myPosts = [];
    api.store.set("social_followers", followers);
    api.store.set("social_my_posts", "[]");
    renderFeed();
    renderStats();
  }
  //#endregion

  window.MTX_SCREENS.media = {
    bindApi,
    init,
    enter,
    onInput,
    prepareMention,
    replyToMention,
    resetSocial
  };
})();
