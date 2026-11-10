"""Cut the Title belt sprite sheet (3x3 grid on chroma green) into one transparent image per belt.

    python -I tools/cut_belts.py <sheet.png|webp>  [out_dir]

- background = pixels close to the sheet's green, connected to the cell border (so a green strap is kept)
- soft 1-2 px edge + green despill on the rim
- each belt trimmed to its own bounds, saved as mtx/assets/img/belts/belt-<n>.webp (n = 0..8, row by row,
  same order as BELTS in mtx/js/screens/screen-customize.js)
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "mtx", "assets", "img", "belts")
os.makedirs(out, exist_ok=True)

im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
H, W, _ = im.shape
bg = np.median(np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3), im[:, :4].reshape(-1, 3), im[:, -4:].reshape(-1, 3)]), axis=0)
dist = np.sqrt(((im - bg) ** 2).sum(-1))

HARD, SOFT = 38.0, 70.0          # <= HARD: background, >= SOFT: belt, between: edge
near = dist < SOFT
# background = "near green" regions that touch the sheet border or a cell border (grid lines)
lab, n = ndimage.label(near)
touch = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
for k in range(1, 3):
    touch |= set(np.unique(lab[round(H * k / 3)])) | set(np.unique(lab[:, round(W * k / 3)]))
touch.discard(0)
bgmask = np.isin(lab, list(touch))

alpha = np.ones((H, W), np.float32)
alpha[bgmask] = np.clip((dist[bgmask] - HARD) / (SOFT - HARD), 0, 1)

# despill: on the rim (within 3 px of the background) green may not exceed the brighter of red / blue
rim = ndimage.binary_dilation(bgmask, iterations=3) & (alpha > 0)
rgb = im.copy()
g_cap = np.maximum(rgb[..., 0], rgb[..., 2])
rgb[..., 1] = np.where(rim, np.minimum(rgb[..., 1], g_cap + 8), rgb[..., 1])

rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
cw, ch = W / 3, H / 3
for r in range(3):
    for c in range(3):
        x0, y0, x1, y1 = round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)
        cell = rgba[y0:y1, x0:x1]
        ys, xs = np.where(cell[..., 3] > 8)
        pad = 3
        cy0, cy1 = max(0, ys.min() - pad), min(cell.shape[0], ys.max() + pad + 1)
        cx0, cx1 = max(0, xs.min() - pad), min(cell.shape[1], xs.max() + pad + 1)
        img = Image.fromarray(cell[cy0:cy1, cx0:cx1], "RGBA")
        i = r * 3 + c
        path = os.path.join(out, f"belt-{i}.webp")
        img.save(path, "WEBP", quality=92, method=6)
        print(path, img.size)
