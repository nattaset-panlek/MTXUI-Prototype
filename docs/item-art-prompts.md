# Item art prompts: 3x3 sheets (2026-11-26)

For the Item Slot Corner cards (Store / Rewards / MTX Points). Each sheet = 9 items in a 3x3 grid, read left to right, top to bottom.
The `id` column is the item in `mtx/js/data/items.js`: after generating, the sheet is cut into 9 images named by id and set as `img`.

How to use: paste **STYLE** first, then the **SHEET** block. One prompt = one PNG with up to 9 items (16 sheets: 13 square, 3 tall).
Square sheets: 1:1 PNG (2048 x 2048 if possible).
Tall sheets (fighters, outfits): 3:6 image (1536 x 3072), every cell 1:2.

---

## STYLE (paste before every sheet)

```
Game item icon sheet for a premium Muay Thai fighting game (console UI, dark theme).
Layout: exact 3x3 grid of 9 separate items, equal cells, each item centred in its own cell, about 80% of the cell, nothing crosses into another cell, even gaps between cells.
Output: one PNG image, 3x3 grid. Transparent background (alpha) if possible; if not, one flat solid colour #16181A everywhere (no gradient, no floor, no vignette, no frame, no cell borders), so each item can be cut out cleanly.
Render: photoreal 3D product render, same camera for all items (3/4 front view, slightly from above), same soft studio key light from top left, thin cool rim light, soft contact shadow under the object only.
Materials: real leather, cloth, metal, ink on skin; crisp detail, readable at 156 px.
Rarity shows only in material richness: normal = plain, standard = clean colour, rare = metallic trim, epic = embroidery and bold colour, legendary = gold leaf and fine Thai ornament.
No text, no numbers, no UI, no price tags, no watermark. A small "MTX" mark on glove cuffs is allowed.
No graffiti, no paint splatter, no brush strokes, no stickers, no neon glow, no particles.
Consistent scale across the sheet. Thai Muay Thai culture: mongkol, prajioud, sak yant, temple gold, but tasteful and premium.
```

---

## Square sheets (1:1 cards)

### SHEET G1: Store gloves
| # | id | item | prompt |
|---|---|---|---|
| 1 | glove_temple | Temple Fair | pair of red boxing gloves with small temple-fair flower print, simple |
| 2 | glove_shadow | Shadow Teep | matte black boxing gloves, grey stitching |
| 3 | glove_mtx26 | MTX26 Street Art | white gloves with clean geometric MTX 26 artwork, silver trim |
| 4 | glove_sakura | Sakura Kru | pale pink gloves with cherry blossom print, silver trim |
| 5 | glove_ironshin | Iron Shin | gunmetal grey gloves with brushed steel cuff plate |
| 6 | glove_black | MTX Classic Black | glossy black gloves, white MTX cuff, red embroidery |
| 7 | glove_midnight | Midnight Camp | deep navy gloves with star embroidery and dark gold piping |
| 8 | glove_golden | Golden Mongkol | gold leather gloves with a braided mongkol headband laid on top |
| 9 | glove_ivory | Ivory Kru | ivory white gloves with gold Thai ornament and gold leaf cuff |

```
SHEET G1, row by row:
1 red boxing gloves, small temple-fair flower print, simple | 2 matte black boxing gloves, grey stitching | 3 white gloves, clean geometric MTX 26 artwork, silver trim
4 pale pink gloves, cherry blossom print, silver trim | 5 gunmetal grey gloves, brushed steel cuff plate | 6 glossy black gloves, white MTX cuff, red embroidery
7 deep navy gloves, star embroidery, dark gold piping | 8 gold leather gloves with a braided mongkol laid on top | 9 ivory white gloves, gold Thai ornament, gold leaf cuff
```

### SHEET G2: Customize gloves
```
SHEET G2, row by row:
1 Tiger Blaze: black gloves with orange tiger stripes and flame-cut panels | 2 Jungle Camo: olive and khaki camouflage gloves | 3 Pink Riot: hot pink gloves with black lacing
4 Red Lotus: crimson gloves with an embroidered lotus | 5 Volt Strike: electric yellow and black gloves, lightning-shaped panels | 6 Pearl White: pearlescent white gloves, silver stitching
7 Midnight: plain dark blue gloves | 8 Ivory Kru (custom): ivory gloves with gold cuff band | 9 Seux Phen Gloves: black and gold gloves, gold dragon embroidery
```
ids: cc_glove_1, cc_glove_2, cc_glove_3, cc_glove_4, cc_glove_5, cc_glove_6, cc_glove_7, cc_glove_8, seux_gloves_item

### SHEET G3: Reward gloves (Phra Nakhon + Thasao)
```
SHEET G3, row by row:
1 MTX 2026 Collection: white and red gloves, limited edition 2026 cuff | 2 MTX Classic Gloves: classic red leather gloves, white cuff | 3 Muay Chaiya Golden Wraps: hand wraps in golden cloth, coiled
4 Phra Nakhon Royal Gloves: crimson gloves with copper and gold royal Thai pattern | 5 Swift Step Gloves: light purple gloves, slim padding | 6 Thasao Wind Gloves: violet gloves with feather pattern
7 Wind Step Wraps: lavender hand wraps, coiled | 8 Golden Swallow Gloves: gold gloves with swallow bird motif | 9 Precision Jab Gloves: orange and white gloves, target ring motif
```
ids: r0_0, r0_1, r1_1, r2_1, rw_north_0_0, rw_north_0_1, rw_north_1_1, rw_north_2_1, rw_west_0_0

### SHEET G4: Reward gloves (Lopburi + Korat + Chaiya)
```
SHEET G4, row by row:
1 Tiger Blaze Gloves (Lopburi): orange gloves with black tiger stripes | 2 Slip Guard Wraps: orange hand wraps, coiled | 3 Golden Feint Gloves: gold gloves with monkey temple motif
4 Heavy Hand Gloves: thick lime green 16 oz gloves | 5 Volt Strike Gloves (Korat): lime and black gloves, bold padding | 6 Iron Fist Wraps: heavy grey hand wraps with lime tape
7 Golden Buffalo Gloves: gold gloves with buffalo horn motif | 8 Guard Cover Gloves: sky blue gloves, high padded cuff | 9 Pearl Deflect Gloves: pearl white and sky blue gloves
```
ids: rw_west_0_1, rw_west_1_1, rw_west_2_1, rw_isan_0_0, rw_isan_0_1, rw_isan_1_1, rw_isan_2_1, rw_south_0_0, rw_south_0_1

### SHEET A1: Accessories and collectibles
```
SHEET A1, row by row:
1 Close Guard Wraps: dark blue hand wraps, coiled | 2 Golden Guard Gloves: gold gloves with wave and shield motif | 3 Seux Phen Shorts: black Muay Thai shorts with gold dragon, folded
4 Replica Belt: championship belt, gold plate, red strap | 5 Street Vinyl: glove vinyl wrap sheet, rolled, clean graphic | 6 Tournament Ticket: single gold-edged event ticket
7 Ticket Stack: five fanned event tickets | 8 Season 1 Legacy Shield: metal shield badge with laurel | 9 MTX Arena: miniature boxing ring diorama with lights
```
ids: rw_south_1_1, rw_south_2_1, seux_shorts_item, cos_belt_1, cos_vinyl, ticket_1, ticket_5 (also pts_tickets), r1_4, stage_mtx

### SHEET T1: Tattoos and body skins (shown as ink on a forearm or back panel)
```
SHEET T1, row by row:
1 Temple Skin Pack: two sak yant designs on skin panels side by side | 2 Grandmaster Sak Yant Tiger: twin tiger sak yant on a back | 3 Skull Ink: skull chest tattoo on skin
4 Lanna Ink Pack: Lanna script sak yant on skin panel | 5 Swallow Sak Yant: swallow bird sak yant on shoulder | 6 Feint Ink Pack: monkey motif sak yant on skin panel
7 Deception Sak Yant: mask-face sak yant on back | 8 Buffalo Ink Pack: buffalo motif sak yant on skin panel | 9 Buffalo Sak Yant: charging buffalo sak yant on back
```
ids: r0_4, r2_0, tattoo_skull, rw_north_0_4, rw_north_2_0, rw_west_0_4, rw_west_2_0, rw_isan_0_4, rw_isan_2_0

### SHEET T2: Tattoos, cards and card packs
```
SHEET T2, row by row:
1 Guard Ink Pack: shield and wave sak yant on skin panel | 2 Guard Sak Yant: guardian deity sak yant on back | 3 Common Card: plain fighter trading card, back view, silver edge
4 Rare Card: trading card with purple metallic edge | 5 Epic Card: trading card with red foil edge | 6 Legendary Card: trading card with gold foil edge and ornament
7 Legend Card Pack: sealed gold foil card pack | 8 Rookie Card Pack: sealed silver foil card pack | 9 Sacred Ink Pack: sealed dark red pack with sak yant emboss
```
ids: rw_south_0_4, rw_south_2_0, card_common, card_rare, card_epic, card_legendary, pack_legend (also pack_rookie_item: use 8), pack_rookie, pack_ink

### SHEET C1: MTX Points and coins
```
SHEET C1, row by row, MTX coins (silver coins with an embossed MTX star), amount grows each cell:
1 small pile of 3 coins | 2 pile of 6 coins | 3 two stacks and a pile
4 open small chest of coins | 5 large open chest overflowing | 6 huge treasure vault door open with coin piles
7 coin pouch (cloth bag, tied) | 8 coin vault box, metal, half open | 9 grand treasury crate with gold bars and coins
```
ids: pts_500, pts_1100, pts_2400, pts_5000, pts_10500, pts_21000, r0_3, r1_3, r2_3

### SHEET C2: Style coin rewards (style colour = cloth and metal accent)
```
SHEET C2, row by row:
1 coin pouch, violet cloth | 2 coin vault box, violet enamel | 3 treasury crate, violet and gold
4 coin pouch, orange cloth | 5 coin vault box, orange enamel | 6 treasury crate, orange and gold
7 coin pouch, lime cloth | 8 coin vault box, lime enamel | 9 treasury crate, lime and gold
```
ids: rw_north_0_3, rw_north_1_3, rw_north_2_3, rw_west_0_3, rw_west_1_3, rw_west_2_3, rw_isan_0_3, rw_isan_1_3, rw_isan_2_3

### SHEET C3: Chaiya coins, cash and offers
```
SHEET C3, row by row:
1 coin pouch, sky blue cloth | 2 coin vault box, sky blue enamel | 3 treasury crate, sky blue and gold
4 Cash Bag: canvas money bag with gold coins | 5 Cash Bonus: neat stack of banknote bundles | 6 First Top-up x2: two coin piles side by side, the second glowing gold
7 Weekly Points: small coin stack with a calendar page | 8 Season Pass: premium gold pass card with laurel | 9 Season 1 Bundle: gift box with gloves and a card pack
```
ids: rw_south_0_3, rw_south_1_3, rw_south_2_3, cash_pack, cash_bonus_2500, pts_first, pts_weekly, pts_season, bundle_season

### SHEET E1: Emotes and VFX (shown as a stylised fist or hand pose with a subtle light effect)
```
SHEET E1, row by row:
1 Wai Khru: hands pressed together in the wai gesture, gloves on | 2 Ram Muay: one gloved arm raised in a dance pose | 3 Victory Fist: gloved fist raised
4 Siam Diamond Strike VFX: gloved fist with a diamond-shaped impact flash | 5 Flash Step VFX: foot with a soft violet speed trail | 6 Perfect Read VFX: gloved fist with an orange ring flash
7 Knockout Roar VFX: gloved fist with a lime shockwave ring | 8 Iron Wall VFX: crossed gloved forearms with a sky blue guard flash | 9 Ring Entrance Pack: three emote cards fanned
```
ids: emote_waikhru, emote_rammuay, emote_victory, r2_4, rw_north_2_4, rw_west_2_4, rw_isan_2_4, rw_south_2_4, pack_emote

### SHEET K1: Portraits and badges (round or shield shapes)
```
SHEET K1, row by row:
1 Kru Portrait: elderly Muay Thai teacher, round portrait medallion | 2 Camp Portrait: young fighter at a training camp, round medallion | 3 Lanna Kru Portrait: northern teacher, violet medallion rim
4 Kru Tactician Portrait: western teacher, orange rim | 5 Buffalo Kru Portrait: Isan teacher, lime rim | 6 Chaiya Kru Portrait: southern teacher, sky blue rim
7 Muay Sorcerer badge: dark shield badge with mystic eye | 8 Underground Beast badge: iron shield badge with beast head | 9 Camp Gloves Pack: three gloves bundled with a strap
```
ids: cos_avatar_1, cos_avatar_2, rw_north_1_4, rw_west_1_4, rw_isan_1_4, rw_south_1_4, cos_badge_sorcerer, cos_badge_beast, pack_gloves

### SHEET B1: Banners (hanging cloth flags)
```
SHEET B1, row by row (cells 4-9 empty background):
1 Wishlist Seux Phen Banner: black and gold flag with dragon | 2 Doi Night Arena Banner: violet flag, mountain silhouette | 3 Monkey Temple Banner: orange flag, temple and monkey
4 Khorat Plateau Banner: lime flag, buffalo | 5 Gulf Night Arena Banner: sky blue flag, wave | 6-9 empty
```
ids: r1_2, rw_north_1_2, rw_west_1_2, rw_isan_1_2, rw_south_1_2

---

## Tall sheets (1:2 cards): full-body fighter, standing, front 3/4, head to feet, same height in every cell

Add to STYLE for tall sheets:
```
Each cell is a tall 1:2 portrait. One Thai male fighter, athletic, full body head to feet, standing relaxed guard, same height and same position in every cell.
Only the outfit changes between cells. Bare feet, hand wraps unless gloves are named.
```

### SHEET F1: Fighter skins
```
1 Legend Fighter Skin: gold-trim black trunks, braided mongkol | 2 Fighter Knee Champion Skin: knee armour, golden dragon decals | 3 Thasao Runner Skin: violet light trunks, ankle wraps
4 Swift Kick Champion Skin: violet and silver trunks, kick pose | 5 Lopburi Tactician Skin: orange trunks with black trim | 6 Counter Knee Champion Skin: orange and gold trunks, knee guard
7 Korat Brawler Skin: lime trunks, heavy wraps | 8 Buffalo Swing Champion Skin: lime and gold trunks, horn emblem | 9 Chaiya Guardian Skin: sky blue trunks, elbow pads
```
ids: r0_2, r1_0, rw_north_0_2, rw_north_1_0, rw_west_0_2, rw_west_1_0, rw_isan_0_2, rw_isan_1_0, rw_south_0_2

### SHEET F2: Outfits and robes
```
1 Elbow Guard Champion Skin: sky blue and silver trunks, elbow guards | 2 Lobby Grand Champion Robe: red silk entrance robe | 3 Gold Trim Trunks: black trunks with gold trim
4 Camp Training Kit: training shorts, shin guards, tank top | 5 Ringside Classic: plain red trunks | 6 Northern Ceremony Robe: violet silk robe, Lanna pattern
7 Lopburi Master Robe: orange silk robe, sunset pattern | 8 Korat Warlord Robe: heavy lime and black robe | 9 Chaiya Temple Robe: sky blue silk robe, temple pattern
```
ids: rw_south_1_0, r2_2, outfit_gold, outfit_camp, outfit_ringside, rw_north_2_2, rw_west_2_2, rw_isan_2_2, rw_south_2_2

### SHEET F3: Fighters and bundles (cells 7-9 empty)
```
1 Seux Phen Fighter: black and gold Seux Phen shorts and wraps | 2 SX.KRU: older fighter, teacher look, red trunks | 3 SX.NAGA: lean fighter, serpent scale trunks
4 SX.SAMART: fighter in classic blue trunks | 5 Champion Bundle: fighter in robe with gloves and VFX glow | 6 Champion Bundle (MTX Points): same as 5, gold robe
7-9 empty
```
ids: outfit_seux, fighter_kru, fighter_naga, fighter_samart, bundle_champion, pts_champion

---

## For the local AI agent (Codex): generate, save, use references

Work folder (repo root): `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/`

For every sheet below:
1. Build the prompt: the STYLE block, plus the tall-sheet lines for F sheets, plus that sheet's SHEET block from this file.
2. Attach the **theme references** (always) and the **cell references** of that sheet as image references (image prompt / reference images / IP-Adapter, about 0.5 to 0.7 strength).
   - Theme references: show the game look (dark UI, card style, render quality). Match lighting, material quality and colour mood. Do not copy their layout.
   - Cell references: the current art of that item. Keep its object type, silhouette, main colours and key details (e.g. glove print, MTX cuff, tattoo motif) but render it cleaner and in the shared style. A cell marked "placeholder" uses a shared stand-in picture: keep only the object type from it and follow the text.
3. Output: one PNG per sheet, exactly the size given, 3x3 grid, transparent background if the model supports alpha, else flat #16181A.
4. Save to the **output path** exactly (create the folder if missing). Do not overwrite an existing file: save as `<SHEET>_v2.png`, `_v3` and so on.
5. Do not edit any other file in the repo. After each sheet, write one line to `mtx/assets/img/gen/log.md`: sheet, file name, model, seed, date.

Theme references (attach to every sheet):
- `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/docs/item-art-refs/figma-store.jpg` (Store screen, Figma)
- `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/docs/item-art-refs/figma-card-sample.png` (item cards with coin art, Figma)
- `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` (glove render quality)
- `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-model.webp` (F sheets only: fighter body, pose and light)

If the model needs PNG references, convert the .webp files first (e.g. `ffmpeg -i in.webp out.png`) into `mtx/assets/img/gen/refs/`; do not change the originals.

## Sheet files: output path and cell references

### G1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/G1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | glove_temple | Temple Fair | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` |
| 2 | glove_shadow | Shadow Teep | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` |
| 3 | glove_mtx26 | MTX26 Street Art | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` |
| 4 | glove_sakura | Sakura Kru | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` |
| 5 | glove_ironshin | Iron Shin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` |
| 6 | glove_black | MTX Classic Black | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` |
| 7 | glove_midnight | Midnight Camp | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` |
| 8 | glove_golden | Golden Mongkol | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` |
| 9 | glove_ivory | Ivory Kru | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` |

### G2
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/G2.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | cc_glove_1 | Tiger Blaze | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-1.webp` |
| 2 | cc_glove_2 | Jungle Camo | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-2.webp` |
| 3 | cc_glove_3 | Pink Riot | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-3.webp` |
| 4 | cc_glove_4 | Red Lotus | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-4.webp` |
| 5 | cc_glove_5 | Volt Strike | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-5.webp` |
| 6 | cc_glove_6 | Pearl White | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-6.webp` |
| 7 | cc_glove_7 | Midnight | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-7.webp` |
| 8 | cc_glove_8 | Ivory Kru | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-8.webp` |
| 9 | seux_gloves_item | Seux Phen Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/pack-seux-glove.webp` |

### G3
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/G3.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | r0_0 | MTX 2026 Collection | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/glove1-thumb.webp` |
| 2 | r0_1 | MTX Classic Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/glove2.webp` |
| 3 | r1_1 | Muay Chaiya Golden Wraps | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/glove1-thumb.webp` (placeholder: keep only the type, follow the text) |
| 4 | r2_1 | Phra Nakhon Royal Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/glove2.webp` |
| 5 | rw_north_0_0 | Swift Step Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-5.webp` |
| 6 | rw_north_0_1 | Thasao Wind Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-4.webp` |
| 7 | rw_north_1_1 | Wind Step Wraps | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-6.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_north_2_1 | Golden Swallow Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-3.webp` (placeholder: keep only the type, follow the text) |
| 9 | rw_west_0_0 | Precision Jab Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-mtx26.webp` (placeholder: keep only the type, follow the text) |

### G4
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/G4.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_west_0_1 | Tiger Blaze Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-1.webp` |
| 2 | rw_west_1_1 | Slip Guard Wraps | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-6.webp` (placeholder: keep only the type, follow the text) |
| 3 | rw_west_2_1 | Golden Feint Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-3.webp` (placeholder: keep only the type, follow the text) |
| 4 | rw_isan_0_0 | Heavy Hand Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-2.webp` |
| 5 | rw_isan_0_1 | Volt Strike Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-5.webp` |
| 6 | rw_isan_1_1 | Iron Fist Wraps | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-6.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_isan_2_1 | Golden Buffalo Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-3.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_south_0_0 | Guard Cover Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-8.webp` |
| 9 | rw_south_0_1 | Pearl Deflect Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-6.webp` (placeholder: keep only the type, follow the text) |

### A1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/A1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_south_1_1 | Close Guard Wraps | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/store-glove-black.webp` (placeholder: keep only the type, follow the text) |
| 2 | rw_south_2_1 | Golden Guard Gloves | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-3.webp` (placeholder: keep only the type, follow the text) |
| 3 | seux_shorts_item | Seux Phen Shorts | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/pack-seux-shorts.webp` |
| 4 | cos_belt_1 | Replica Belt | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/belts/belt-1.webp` |
| 5 | cos_vinyl | Street Vinyl | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-vinyl.webp` |
| 6 | ticket_1 | Tournament Ticket | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/svg/icon-ticket.svg` |
| 7 | ticket_5 | Ticket Stack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/svg/icon-ticket.svg` |
| 8 | r1_4 | Season 1 Legacy Shield | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/news-season.webp` |
| 9 | stage_mtx | MTX Arena | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/map-mtx-arena.webp` |

### T1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/T1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | r0_4 | Temple Skin Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` |
| 2 | r2_0 | Grandmaster Sak Yant Tiger | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 3 | tattoo_skull | Skull Ink | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-tattoo-skull.webp` |
| 4 | rw_north_0_4 | Lanna Ink Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_north_2_0 | Swallow Sak Yant | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 6 | rw_west_0_4 | Feint Ink Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_west_2_0 | Deception Sak Yant | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_isan_0_4 | Buffalo Ink Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 9 | rw_isan_2_0 | Buffalo Sak Yant | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |

### T2
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/T2.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_south_0_4 | Guard Ink Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 2 | rw_south_2_0 | Guard Sak Yant | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 3 | card_common | Common Card | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 4 | card_rare | Rare Card | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 5 | card_epic | Epic Card | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 6 | card_legendary | Legendary Card | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 7 | pack_legend | Legend Card Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-a.webp` (placeholder: keep only the type, follow the text) |
| 8 | pack_rookie | Rookie Card Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |
| 9 | pack_ink | Sacred Ink Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/skin-b.webp` (placeholder: keep only the type, follow the text) |

### C1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/C1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | pts_500 | 500 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 2 | pts_1100 | 1,100 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 3 | pts_2400 | 2,400 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 4 | pts_5000 | 5,000 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 5 | pts_10500 | 10,500 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 6 | pts_21000 | 21,000 MTX Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 7 | r0_3 | MTX Coins Stash | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` |
| 8 | r1_3 | Treasury Vault (1,000 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 9 | r2_3 | Grand Treasury (2,500 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |

### C2
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/C2.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_north_0_3 | Tha Sao Coin Pouch | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 2 | rw_north_1_3 | Tha Sao Vault (1,000 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 3 | rw_north_2_3 | Tha Sao Treasury (2,500 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 4 | rw_west_0_3 | Lopburi Coin Pouch | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_west_1_3 | Lopburi Vault (1,000 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 6 | rw_west_2_3 | Lopburi Treasury (2,500 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_isan_0_3 | Korat Coin Pouch | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_isan_1_3 | Korat Vault (1,000 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 9 | rw_isan_2_3 | Korat Treasury (2,500 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |

### C3
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/C3.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_south_0_3 | Chaiya Coin Pouch | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 2 | rw_south_1_3 | Chaiya Vault (1,000 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 3 | rw_south_2_3 | Chaiya Treasury (2,500 Coins) | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 4 | cash_pack | Cash Bag | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 5 | cash_bonus_2500 | Cash Bonus | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/pack-coins.webp` |
| 6 | pts_first | First Top-up x2 | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 7 | pts_weekly | Weekly Points | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/coins.webp` (placeholder: keep only the type, follow the text) |
| 8 | pts_season | Season Pass | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/news-season.webp` (placeholder: keep only the type, follow the text) |
| 9 | bundle_season | Season 1 Bundle | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/quest-rewards.webp` |

### E1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/E1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | emote_waikhru | Wai Khru | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` |
| 2 | emote_rammuay | Ram Muay | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` |
| 3 | emote_victory | Victory Fist | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` |
| 4 | r2_4 | Siam Diamond Strike VFX | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_north_2_4 | Flash Step VFX | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |
| 6 | rw_west_2_4 | Perfect Read VFX | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_isan_2_4 | Knockout Roar VFX | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_south_2_4 | Iron Wall VFX | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |
| 9 | pack_emote | Ring Entrance Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fist.webp` (placeholder: keep only the type, follow the text) |

### K1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/K1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | cos_avatar_1 | Kru Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-1.webp` |
| 2 | cos_avatar_2 | Camp Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-2.webp` |
| 3 | rw_north_1_4 | Lanna Kru Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-2.webp` (placeholder: keep only the type, follow the text) |
| 4 | rw_west_1_4 | Kru Tactician Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-1.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_isan_1_4 | Buffalo Kru Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-2.webp` (placeholder: keep only the type, follow the text) |
| 6 | rw_south_1_4 | Chaiya Kru Portrait | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-avatar-1.webp` (placeholder: keep only the type, follow the text) |
| 7 | cos_badge_sorcerer | Muay Sorcerer | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/badges/muay-sorcerer.webp` |
| 8 | cos_badge_beast | Underground Beast | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/badges/underground-beast.webp` |
| 9 | pack_gloves | Camp Gloves Pack | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/cc-glove-5.webp` |

### B1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/B1.png` (2048 x 2048, cells 1:1)

| cell | id | name | reference |
|---|---|---|---|
| 1 | r1_2 | Wishlist Seux Phen Banner | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/wishlist-art.webp` |
| 2 | rw_north_1_2 | Doi Night Arena Banner | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/card-art.webp` (placeholder: keep only the type, follow the text) |
| 3 | rw_west_1_2 | Monkey Temple Banner | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/card-art.webp` (placeholder: keep only the type, follow the text) |
| 4 | rw_isan_1_2 | Khorat Plateau Banner | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/card-art.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_south_1_2 | Gulf Night Arena Banner | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/card-art.webp` (placeholder: keep only the type, follow the text) |

### F1
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/F1.png` (1536 x 3072, cells 1:2)

| cell | id | name | reference |
|---|---|---|---|
| 1 | r0_2 | Legend Fighter Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` |
| 2 | r1_0 | Fighter Knee Champion Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` |
| 3 | rw_north_0_2 | Thasao Runner Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` (placeholder: keep only the type, follow the text) |
| 4 | rw_north_1_0 | Swift Kick Champion Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` (placeholder: keep only the type, follow the text) |
| 5 | rw_west_0_2 | Lopburi Tactician Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` (placeholder: keep only the type, follow the text) |
| 6 | rw_west_1_0 | Counter Knee Champion Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_isan_0_2 | Korat Brawler Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_isan_1_0 | Buffalo Swing Champion Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` (placeholder: keep only the type, follow the text) |
| 9 | rw_south_0_2 | Chaiya Guardian Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` (placeholder: keep only the type, follow the text) |

### F2
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/F2.png` (1536 x 3072, cells 1:2)

| cell | id | name | reference |
|---|---|---|---|
| 1 | rw_south_1_0 | Elbow Guard Champion Skin | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` (placeholder: keep only the type, follow the text) |
| 2 | r2_2 | Lobby Grand Champion Robe | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` |
| 3 | outfit_gold | Gold Trim Trunks | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` |
| 4 | outfit_camp | Camp Training Kit | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` |
| 5 | outfit_ringside | Ringside Classic | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` |
| 6 | rw_north_2_2 | Northern Ceremony Robe | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |
| 7 | rw_west_2_2 | Lopburi Master Robe | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |
| 8 | rw_isan_2_2 | Korat Warlord Robe | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |
| 9 | rw_south_2_2 | Chaiya Temple Robe | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |

### F3
Output: `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/gen/F3.png` (1536 x 3072, cells 1:2)

| cell | id | name | reference |
|---|---|---|---|
| 1 | outfit_seux | Seux Phen Fighter | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` |
| 2 | fighter_kru | SX.KRU | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` |
| 3 | fighter_naga | SX.NAGA | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-knee.webp` |
| 4 | fighter_samart | SX.SAMART | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/fighter-samart.webp` |
| 5 | bundle_champion | Champion Bundle | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |
| 6 | pts_champion | Champion Bundle | `C:/Personal/Figma FlowUX Prototype/Figma FlowUX Prototype/mtx-controller-flow/mtx/assets/img/char-lobby.webp` (placeholder: keep only the type, follow the text) |

Placeholder means the item uses a shared stand-in picture today (for example every coin item uses coins.webp). Keep the object type from it, but make each cell different as the text says.

---

## After generating
Put the sheets in `mtx/assets/img/gen/` named by sheet (`G1.png`, `F1.png`, ...). They get cut into one webp per id (empty cells skipped), and `img` in items.js is pointed at them. The 2:1 banners (Seux Phen, Lumpinee Night) keep their current art.
