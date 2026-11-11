// Decode the newest bakes/mtx-tlshot-<name>-*.svg (base64 JPEG from dev-loadout-shots.js) to <out>/<name>.jpg
// node tools/tl-decode.mjs <outDir>
import fs from "fs"; import path from "path";
const dir = path.resolve("bakes"), out = process.argv[2] || ".work-tl";
fs.mkdirSync(out, { recursive: true });
const newest = {};
for (const f of fs.readdirSync(dir)) {
  const m = /^mtx-tlshot-(.+)-(\d{8}-\d{6})\.svg$/.exec(f); if (!m) continue;
  if (!newest[m[1]] || newest[m[1]].t < m[2]) newest[m[1]] = { t: m[2], f };
}
for (const [n, { f }] of Object.entries(newest)) {
  fs.writeFileSync(path.join(out, n + ".jpg"), Buffer.from(fs.readFileSync(path.join(dir, f), "utf8"), "base64"));
  fs.unlinkSync(path.join(dir, f));
}
console.log(Object.keys(newest).join(" "));
