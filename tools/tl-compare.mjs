// Side-by-side for the Tactical Loadout frames: Figma export (left) | browser capture (right), difference blend below.
// node tools/tl-compare.mjs <port> <name...>   (images in .work-tl/fig/<name>.png and .work-tl/br/<name>.jpg) -> .work-tl/cmp/<name>.jpg
import fs from "fs";
const [port, ...names] = process.argv.slice(2);
fs.mkdirSync(".work-tl/cmp", { recursive: true });
for (const n of names) {
  const f = `/.work-tl/fig/${n}.png?${Date.now()}`, b = `/.work-tl/br/${n}.jpg?${Date.now()}`;
  const html = `<!doctype html><html><body style="margin:0;background:#000;width:1920px;height:1080px;position:relative">
    <img src="${f}" style="position:absolute;left:0;top:0;width:960px;height:540px"><img src="${b}" style="position:absolute;left:960px;top:0;width:960px;height:540px">
    <div style="position:absolute;left:0;top:540px;width:960px;height:540px;isolation:isolate"><img src="${f}" style="position:absolute;inset:0;width:960px;height:540px"><img src="${b}" style="position:absolute;inset:0;width:960px;height:540px;mix-blend-mode:difference"></div>
    <img src="${b}" style="position:absolute;left:960px;top:540px;width:960px;height:540px;opacity:.5"><img src="${f}" style="position:absolute;left:960px;top:540px;width:960px;height:540px;opacity:.5">
  </body></html>`;
  const r = await fetch(`http://127.0.0.1:${port}/__shot`, { method: "POST", body: JSON.stringify({ html }) }).then(r => r.json());
  fs.writeFileSync(`.work-tl/cmp/${n}.jpg`, Buffer.from(r.jpeg, "base64"));
}
console.log("ok " + names.join(" "));
