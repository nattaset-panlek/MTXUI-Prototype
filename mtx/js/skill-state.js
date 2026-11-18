(function () {
  /* Shared skill unlock state (window.MTX_SKILLSTATE), one map per tactical style: node id -> owned level.
     Written by the Skill Tree (screen-skilltree.js), read by the Tactical Loadout (screen-loadout.js) and the Attributes feed.
     Base nodes (core, granted DSM) are always owned and not stored. Saved in localStorage "mtx.skills.v1";
     MTX_SKILLSTATE.reset() clears every style (dev). */
  const KEY = "mtx.skills.v1";
  const D = window.MTX_SKILLS || { styles: {} };
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { stored = {}; }
  const maps = {}, subs = [];
  let last = JSON.stringify(stored);

  const nodesOf = sid => D.styles[sid]?.nodes || [];
  function owned(sid) {
    if (!maps[sid]) {
      const ns = nodesOf(sid), m = new Map(ns.filter(n => n.base).map(n => [n.id, 1]));
      Object.entries(stored[sid] || {}).forEach(([id, lv]) => { const n = ns.find(x => x.id === id); if (n && !n.base && lv > 0) m.set(id, Math.min(lv, n.levels?.length || 1)); });
      maps[sid] = m;
    }
    return maps[sid];
  }
  // persist + tell listeners, only when something changed
  function save() {
    Object.entries(maps).forEach(([sid, m]) => {
      stored[sid] = Object.fromEntries([...m].filter(([id]) => !nodesOf(sid).find(n => n.id === id)?.base));
    });
    const now = JSON.stringify(stored);
    if (now === last) return;
    last = now;
    try { localStorage.setItem(KEY, now); } catch { /* private mode: state stays in memory */ }
    subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  }
  function reset() {
    Object.keys(maps).forEach(sid => { const m = maps[sid]; [...m.keys()].forEach(id => { if (!nodesOf(sid).find(n => n.id === id)?.base) m.delete(id); }); });
    save();
  }
  window.MTX_SKILLSTATE = { owned, level: (sid, id) => owned(sid).get(id) || 0, save, reset, on: f => subs.push(f) };
})();
