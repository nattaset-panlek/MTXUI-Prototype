// Dev Tools comments: one op on the thread list. Shared logic for the local store (bake-server /__comments)
// and, later, the team store (mtxworkingstation /api/comments). Design: docs/comment-system-design.html
//
// state = { crev, threads: [Thread] }   Thread = { id, n, proto, screen, tab?, anchor, title, status, author, createdAt, updatedAt, rev, deleted?, messages: [{ id, author, text, at, editedAt?, sys? }] }
// apply(state, op, who, admin?) -> { ok, crev, thread } or { error }   (state is changed in place; who = the caller's name / email, set by the server)

export const STATUSES = ["critical", "warning", "progress", "review", "done"];
export const STATUS_NAME = { critical: "Critical", warning: "Warning", progress: "In progress", review: "Waiting for review", done: "Complete" };
const LIMIT = { title: 120, text: 4000, screen: 60, tab: 60, sel: 600, figma: 200 };

const rid = p => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = v => (Number.isFinite(+v) ? Math.round(+v * 1000) / 1000 : undefined);

function cleanAnchor(a) {
  if (!a || typeof a !== "object") return null;
  const out = { x: num(a.x) ?? 0, y: num(a.y) ?? 0 };
  const figma = str(a.figma, LIMIT.figma), selector = str(a.selector, LIMIT.sel);
  if (figma) { out.figma = figma; if (num(a.fdx) !== undefined) { out.fdx = num(a.fdx); out.fdy = num(a.fdy); } }
  if (selector) { out.selector = selector; if (num(a.dx) !== undefined) { out.dx = num(a.dx); out.dy = num(a.dy); } }
  return out;
}

// threads changed after `since` for one prototype (deleted ones too, so clients drop them)
export function read(state, proto, since) {
  const crev = state.crev || 0;
  if (since !== null && since !== undefined && since !== "" && String(since) === String(crev)) return { crev, unchanged: true };
  const s = Number(since) || 0;
  return { crev, threads: state.threads.filter(t => (!proto || t.proto === proto) && (t.rev || 0) > s) };
}

export function apply(state, op, who, admin = false) {
  if (!op || typeof op !== "object") return { error: "bad op" };
  if (!who) return { error: "no author" };
  const now = Date.now();
  const find = () => state.threads.find(t => t.id === op.id);
  const touch = t => { state.crev = (state.crev || 0) + 1; t.rev = state.crev; t.updatedAt = now; return { ok: true, crev: state.crev, thread: t }; };
  const owner = t => admin || t.author === who;

  if (op.op === "create") {
    const proto = str(op.proto, 60) || "default", screen = str(op.screen, LIMIT.screen), anchor = cleanAnchor(op.anchor);
    const title = str(op.title, LIMIT.title), text = str(op.text, LIMIT.text);
    if (!screen || !anchor || (!title && !text)) return { error: "screen, anchor and title or text are needed" };
    const status = STATUSES.includes(op.status) ? op.status : "warning";
    const n = state.threads.filter(t => t.proto === proto).reduce((m, t) => Math.max(m, t.n || 0), 0) + 1;
    const t = { id: rid("c"), n, proto, screen, anchor, title: title || text.slice(0, 60), status, author: who, createdAt: now, updatedAt: now,
      messages: [{ id: rid("m"), author: who, text: text || title, at: now }] };
    const tab = str(op.tab, LIMIT.tab); if (tab) t.tab = tab;
    state.threads.push(t);
    return touch(t);
  }

  const t = find();
  if (!t) return { error: "thread not found" };
  if (t.deleted && op.op !== "restore") return { error: "thread deleted" };
  const msg = () => t.messages.find(m => m.id === op.mid);

  switch (op.op) {
    case "reply": {
      const text = str(op.text, LIMIT.text); if (!text) return { error: "empty" };
      t.messages.push({ id: rid("m"), author: who, text, at: now });
      return touch(t);
    }
    case "editMsg": {
      const m = msg(); if (!m || m.sys) return { error: "message not found" };
      if (m.author !== who) return { error: "only the writer can edit this message" };
      const text = str(op.text, LIMIT.text); if (!text) return { error: "empty" };
      m.text = text; m.editedAt = now;
      return touch(t);
    }
    case "deleteMsg": {
      const m = msg(); if (!m) return { error: "message not found" };
      if (m.author !== who && !admin) return { error: "only the writer can delete this message" };
      if (t.messages.filter(x => !x.sys)[0] === m) return { error: "the first message can't be deleted; delete the thread" };
      t.messages = t.messages.filter(x => x !== m);
      return touch(t);
    }
    case "editTitle": {
      if (!owner(t)) return { error: "only the thread starter can edit the title" };
      const title = str(op.title, LIMIT.title); if (!title) return { error: "empty" };
      t.title = title;
      return touch(t);
    }
    case "status": {   // everyone (decided 2026-11-19); logged as a system line
      if (!STATUSES.includes(op.status)) return { error: "bad status" };
      if (t.status === op.status) return { ok: true, crev: state.crev, thread: t };
      t.status = op.status;
      t.messages.push({ id: rid("m"), author: who, text: "→ " + STATUS_NAME[op.status], at: now, sys: true });
      return touch(t);
    }
    case "reanchor": {
      if (!owner(t)) return { error: "only the thread starter can move it" };
      const a = cleanAnchor(op.anchor); if (!a) return { error: "bad anchor" };
      t.anchor = a; const tab = str(op.tab, LIMIT.tab); if (tab) t.tab = tab; else delete t.tab;
      return touch(t);
    }
    case "delete": {
      if (!owner(t)) return { error: "only the thread starter can delete it" };
      t.deleted = true;
      return touch(t);
    }
    case "restore": {
      if (!owner(t)) return { error: "only the thread starter can restore it" };
      delete t.deleted;
      return touch(t);
    }
  }
  return { error: "unknown op" };
}
