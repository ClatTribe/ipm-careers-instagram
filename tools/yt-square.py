#!/usr/bin/env python3
"""YouTube community posts show images square (1:1), so a 4:5 Instagram post gets its top and bottom cut.
This pads each image to a square (nothing cropped) using the image's own edge colour, then saves 1080 x 1080.
  python3 tools/yt-square.py out_dir img1.png [img2.png ...]   -> out_dir/<name>-yt.jpg"""
import sys, os
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for f in sys.argv[2:]:
    im = Image.open(f).convert("RGB")
    w, h = im.size; s = max(w, h)
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    sq = Image.new("RGB", (s, s), bg); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    name = os.path.splitext(os.path.basename(f))[0]
    sq.resize((1080, 1080), Image.LANCZOS).save(os.path.join(out, f"{name}-yt.jpg"), quality=92)
    print(os.path.join(out, f"{name}-yt.jpg"))
