# Image-gen prompt · Title belts (Profile showcase)

ใช้ส่งต่อให้ Agent / โมเดลสร้างภาพ ได้ภาพเดียวเป็น grid 3×3 แล้วเอามาตัดเป็นไฟล์ละ 1 เส้น
ใช้แสดงใน Profile (บอร์ดโชว์เข็มขัด: ช่องสี่เหลี่ยม 112px, ช่องข้าวหลามตัดกลาง 128px, หน้าเลือกเข็มขัด 150px)

รายชื่อและสีสายตรงกับ `BELTS` ใน `mtx/js/screens/screen-customize.js`

---

## Prompt (copy ส่วนนี้ไปทั้งก้อน)

```
Create ONE image: a 3x3 grid sprite sheet of nine Muay Thai championship title belts for a fighting-game UI.

CANVAS / GRID (most important — the sheet will be cut automatically)
- Square canvas 3072 x 3072 px, exactly 3 columns x 3 rows of equal 1024 x 1024 px cells.
- No borders, no gutters drawn, no labels, no captions, no numbers anywhere.
- Background of EVERY cell: one flat solid colour #00B140 (chroma green), perfectly even, no gradient, no vignette, no floor, no shadow, no reflection.
- Each belt is centred in its cell, fully inside it with ~12% empty margin on every side. Nothing crosses into a neighbouring cell.

CAMERA / CONSISTENCY
- All nine belts: same camera, same scale, same pose. Straight-on front view, belt laid flat and opened out horizontally (strap ends visible left and right), very slight top-down angle, centre plate facing the viewer.
- Same lighting on all: soft key light from top-left, neutral white, gentle specular on metal. Identical style across the sheet so they look like one set.

BELT DESIGN (every belt)
- Thick leather strap in the cell's strap colour with fine stitching along both edges.
- Large ornate centre plate: gold metal, oval/shield shape, Thai Lai Kranok flame-scroll engraving, a raised central emblem (see per-cell motif).
- Two smaller matching side plates on the strap, one each side of the centre plate.
- Realistic premium game-asset look (polished metal, real leather texture), crisp edges, high detail, readable at small size (will be shown at ~120 px wide).
- NO text, NO letters, NO words, NO numbers, NO logos of real brands or real stadiums on the belt — use abstract ornaments only.
- NO glow, NO sparkles, NO light rays, NO lens flare, NO particles, NO floating elements.

CELLS (row by row, left to right) — strap colour / metal / centre emblem motif
1. Crimson red strap #C8102E / gold / crossed Muay Thai gloves
2. Royal blue strap #1F4FBF / gold / Garuda bird with spread wings
3. Black strap #1A1A1A / gold with silver inlay / a sacred number-free sun disc with rays carved in relief
4. Emerald green strap #2A8A4A / gold / Thai temple roof (chofa) silhouette
5. Purple strap #6A2BD1 / gold / Isan naga serpent coiled in a ring
6. Dark goldenrod strap #B8860B / gold with red enamel accents / royal crown (chada) — the most prestigious, slightly more ornate
7. Deep maroon strap #8A1C1C / gold and silver / globe with laurel wreath
8. Navy strap #123A8A / gold / Thai elephant head facing forward
9. Teal strap #0E6B6B / gold / ocean wave with a sea-eagle

OUTPUT
- PNG, 3072 x 3072, the 3x3 grid exactly as specified.
```

---

## Cell → ชื่อในเกม

| Cell | ชื่อ (BELTS) | สีสาย |
|---|---|---|
| 1 | Lumpinee Stadium | `#c8102e` |
| 2 | Rajadamnern Stadium | `#1f4fbf` |
| 3 | Channel 7 Stadium | `#1a1a1a` |
| 4 | Omnoi Stadium | `#2a8a4a` |
| 5 | Isan Regional | `#6a2bd1` |
| 6 | King's Cup | `#b8860b` |
| 7 | WMC World | `#8a1c1c` |
| 8 | Thailand National | `#123a8a` |
| 9 | Southern Champion | `#0e6b6b` |

## หมายเหตุ
- ถ้าโมเดลทำพื้นหลังโปร่งใส (transparent PNG) ได้ ให้แก้บรรทัด Background เป็น `fully transparent background` แทนสีเขียว
- ถ้าโมเดลทำ 3072px ไม่ได้ ใช้ 2048 x 2048 (cell 683px) ได้ แต่ขอให้ grid เท่ากันทุกช่อง
- เกมมีเข็มขัดทั้งหมด 35 เส้น (`BELT_TOTAL`) ถ้าจะสร้างชุดถัดไป ใช้ prompt เดิม เปลี่ยนแค่รายการ CELLS (สี + emblem) เพื่อให้สไตล์ต่อเนื่องกัน
- เข็มขัดที่ยังไม่ปลดล็อก เกมทำเป็นเงาเทาเองด้วย CSS (`.pf-belt.is-locked`) ไม่ต้องสร้างภาพแยก
