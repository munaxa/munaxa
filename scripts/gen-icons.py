#!/usr/bin/env python3
"""Generate square app icons + favicons from the Munaxa logo (docs/design-system/logo.png).

The brand mark is portrait + transparent; app icons and favicons must be square, and iOS
launcher/apple-touch icons must be opaque. This pads the ibex onto square canvases and writes:

  Web (copied into apps/admin/src/app/):
    favicon.ico  (16/32/48/64, transparent)
    icon.png     (512, transparent)
    apple-icon.png (180, opaque on brand ink #090B0C)
  Mobile launcher sources (apps/mobile/assets/icon/):
    ic_launcher.png            (1024, opaque on ink) — iOS + legacy Android
    ic_launcher_foreground.png (1024, transparent)   — Android adaptive foreground

Usage:  python3 scripts/gen-icons.py   (requires Pillow)
Then wire mobile icons with:  cd apps/mobile && dart run flutter_launcher_icons
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs/design-system/logo.png")
INK = (9, 11, 12, 255)  # brand ink-900 #090B0C (munaxadesignsystem)

logo = Image.open(SRC).convert("RGBA")
ratio = logo.width / logo.height


def square(size, height_frac, bg=None):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    h = max(1, int(size * height_frac))
    w = max(1, int(h * ratio))
    canvas.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB") if bg else canvas


def write(img, *paths, **kw):
    for p in paths:
        full = os.path.join(ROOT, p)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        img.save(full, **kw)
        print("wrote", p)


web = ["apps/admin/src/app"]
write(square(512, 0.84), *[f"{d}/icon.png" for d in web])
write(square(180, 0.72, bg=INK), *[f"{d}/apple-icon.png" for d in web])
write(square(256, 0.92), *[f"{d}/favicon.ico" for d in web],
      sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

write(square(1024, 0.70, bg=INK), "apps/mobile/assets/icon/ic_launcher.png")
write(square(1024, 0.55), "apps/mobile/assets/icon/ic_launcher_foreground.png")
