// MTX dev server + pixel-exact Figma baker. Node 22+, no dependencies.
//
//   node tools/bake-server.mjs            -> http://127.0.0.1:8765  (serves the prototype, like python -m http.server)
//
// The page's Bake button POSTs a snapshot of the live screen (DOM with its current state, scripts removed)
// to /__bake. The server renders that snapshot in a hidden Chrome at exactly 1920x1080 and screenshots it:
//   - Background plate: screen__bg + blocks that blend with what is behind them (opaque JPEG)
//   - one transparent PNG per block (fighter, tabs, panel, buttons, logo, hints...) with real alpha
//     (page backgrounds are made transparent and Chrome's default background is transparent)
//   - optional live <text> on top (sent by the page)
// and writes one SVG to bakes/ (also returned to the page, which copies it for pasting into Figma).
// /__save stores an SVG the page made itself (the "Vector" bake).
// /__shot renders a snapshot 1:1 and returns it as one JPEG (Navigation graph thumbnails).

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +(process.env.PORT || 8765);
const HOST = "127.0.0.1";
const DEBUG_PORT = 9333;
const BAKES = path.join(ROOT, "bakes");
const SNAP_DIR = path.join(ROOT, ".bake");
const W = 1920, H = 1080;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
  ".otf": "font/otf", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm"
};

// ---------------------------------------------------------------- Chrome (headless) over CDP
const CHROME_PATHS = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
].filter(Boolean);

let chrome = null;   // { proc, ws, send, on }

async function startChrome() {
  if (chrome) return chrome;
  const exe = CHROME_PATHS.find(p => fs.existsSync(p));
  if (!exe) throw new Error("Chrome / Edge not found (set CHROME=path/to/chrome)");
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), "mtx-bake-"));
  const proc = spawn(exe, [
    "--headless=new", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check",
    "--force-device-scale-factor=1", "--force-color-profile=srgb", "--disable-extensions", "about:blank"
  ], { stdio: "ignore" });
  proc.on("exit", () => { chrome = null; });

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json()).webSocketDebuggerUrl; }
    catch { await new Promise(r => setTimeout(r, 150)); }
  }
  if (!wsUrl) { proc.kill(); throw new Error("Chrome did not start"); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map(), listeners = new Set();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else listeners.forEach(fn => fn(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
  chrome = { proc, ws, send, on: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
  return chrome;
}

async function openPage(url, width = W) {
  const c = await startChrome();
  const { targetId } = await c.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await c.send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => c.send(m, p, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");
  await s("Emulation.setDeviceMetricsOverride", { width, height: H, deviceScaleFactor: 1, mobile: false });
  await s("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const loaded = new Promise(res => { const off = c.on(m => { if (m.sessionId === sessionId && m.method === "Page.loadEventFired") { off(); res(); } }); });
  await s("Page.navigate", { url });
  await Promise.race([loaded, new Promise(r => setTimeout(r, 15000))]);
  const evaluate = async expr => {
    const r = await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  // fonts + every image decoded, then two frames
  await evaluate(`(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return true;
  })()`);
  const shot = async (clip, format = "png") => {
    const r = await s("Page.captureScreenshot", { format, quality: format === "jpeg" ? 92 : undefined, clip: { ...clip, scale: 1 }, captureBeyondViewport: false, fromSurface: true });
    return r.data;
  };
  const close = () => c.send("Target.closeTarget", { targetId }).catch(() => {});
  return { evaluate, shot, close };
}

// ---------------------------------------------------------------- bake
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

async function bake({ name = "screen", mode = "layers", html, text = [] }) {
  await fsp.mkdir(SNAP_DIR, { recursive: true });
  await fsp.mkdir(BAKES, { recursive: true });
  const snapName = `snap-${Date.now()}.html`;
  await fsp.writeFile(path.join(SNAP_DIR, snapName), html, "utf8");
  const page = await openPage(`http://${HOST}:${PORT}/.bake/${snapName}`);
  const parts = [];
  try {
    const plan = await page.evaluate(`(() => {
      const layers = [...document.querySelectorAll("[data-bake-layer]")].map(e => e.getAttribute("data-bake-layer"));
      return { layers };
    })()`);

    const settle = `new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`;
    if (mode === "layers") await page.evaluate(`document.body.classList.add("bake-notext"), ${settle}`);

    // 1) background plate, opaque, the whole frame
    await page.evaluate(`(() => {
      document.body.classList.add("bake-iso");
      document.querySelectorAll("[data-bake-on]").forEach(e => e.removeAttribute("data-bake-on"));
      document.querySelectorAll("[data-bake-plate]").forEach(e => e.setAttribute("data-bake-on", ""));
      return ${settle};
    })()`);
    const plate = await page.shot({ x: 0, y: 0, width: W, height: H }, "jpeg");
    parts.push(`<g id="00 Background"><image x="0" y="0" width="${W}" height="${H}" href="data:image/jpeg;base64,${plate}"/></g>`);

    // 2) one transparent layer per block, clipped to its painted area (+ margin for shadows / pseudo-elements)
    let i = 1;
    for (const label of plan.layers) {
      const box = await page.evaluate(`(() => {
        document.body.classList.add("bake-iso", "bake-clear");
        document.querySelectorAll("[data-bake-on]").forEach(e => e.removeAttribute("data-bake-on"));
        const el = document.querySelector('[data-bake-layer="${label.replace(/"/g, '\\"')}"]');
        el.setAttribute("data-bake-on", "");
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const e of [el, ...el.querySelectorAll("*")]) {
          const r = e.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        }
        const m = 40;
        x0 = Math.max(0, Math.floor(x0 - m)); y0 = Math.max(0, Math.floor(y0 - m));
        x1 = Math.min(${W}, Math.ceil(x1 + m)); y1 = Math.min(${H}, Math.ceil(y1 + m));
        return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() =>
          r(x1 > x0 && y1 > y0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null))));
      })()`);
      if (box) {
        const png = await page.shot(box, "png");
        parts.push(`<g id="${esc(label)}"><image x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" href="data:image/png;base64,${png}"/></g>`);
      }
      i++;
    }
    if (mode === "layers" && text.length) parts.push(`<g id="${String(i).padStart(2, "0")} Text">\n${text.join("\n")}\n</g>`);
  } finally {
    await page.close();
    fsp.unlink(path.join(SNAP_DIR, snapName)).catch(() => {});
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<title>MTX ${esc(name)} (1:1)</title>\n${parts.join("\n")}\n</svg>`;
  const file = await saveSvg(`${name}-1to1${mode === "flat" ? "-flat" : ""}`, svg);
  return { file, svg, layers: parts.length };
}

async function shotPage(html, width = W) {
  await fsp.mkdir(SNAP_DIR, { recursive: true });
  const snapName = `shot-${Date.now()}.html`;
  await fsp.writeFile(path.join(SNAP_DIR, snapName), html, "utf8");
  const page = await openPage(`http://${HOST}:${PORT}/.bake/${snapName}`, width);
  try { return await page.shot({ x: 0, y: 0, width, height: H }, "jpeg"); }
  finally { await page.close(); fsp.unlink(path.join(SNAP_DIR, snapName)).catch(() => {}); }
}

async function saveSvg(base, svg) {
  await fsp.mkdir(BAKES, { recursive: true });
  const t = new Date(), p2 = n => String(n).padStart(2, "0");
  const stamp = `${t.getFullYear()}${p2(t.getMonth() + 1)}${p2(t.getDate())}-${p2(t.getHours())}${p2(t.getMinutes())}${p2(t.getSeconds())}`;
  const file = path.join(BAKES, `mtx-${base.replace(/[^\w.-]+/g, "_")}-${stamp}.svg`);
  await fsp.writeFile(file, svg, "utf8");
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

// ---------------------------------------------------------------- http
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const send = (code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" }); res.end(body); };
  try {
    if (req.method === "GET" && url.pathname === "/__bake") return send(200, JSON.stringify({ ok: true, baker: "1to1" }));
    if (req.method === "POST" && url.pathname === "/__bake") {
      const body = await readJson(req);
      const t0 = Date.now();
      const out = await bake(body);
      console.log(`baked ${body.name} (${body.mode}) -> ${out.file} in ${Date.now() - t0} ms`);
      return send(200, JSON.stringify({ ok: true, file: out.file, layers: out.layers, svg: out.svg }));
    }
    if (req.method === "POST" && url.pathname === "/__shot") {
      const body = await readJson(req);
      return send(200, JSON.stringify({ ok: true, jpeg: await shotPage(body.html || "", +body.width || W) }));
    }
    if (req.method === "POST" && url.pathname === "/__save") {
      const body = await readJson(req);
      const file = await saveSvg(body.name || "screen", body.svg || "");
      console.log(`saved ${file}`);
      return send(200, JSON.stringify({ ok: true, file }));
    }
    // static files
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) return send(403, "forbidden", "text/plain");
    const st = await fsp.stat(file).catch(() => null);
    if (!st || !st.isFile()) return send(404, "not found", "text/plain");
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    send(500, JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  }
});

server.listen(PORT, HOST, () => console.log(`MTX dev + bake server: http://${HOST}:${PORT}/  (bakes -> ${path.relative(process.cwd(), BAKES) || "bakes"})`));
const quit = () => { try { chrome?.proc.kill(); } catch {} process.exit(0); };
process.on("SIGINT", quit);
process.on("SIGTERM", quit);
