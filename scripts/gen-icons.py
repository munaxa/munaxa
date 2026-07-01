#!/usr/bin/env python3
"""Generate square app icons + favicons from the Munaxa logo (docs/design-system/logo.png).

The brand mark is portrait + transparent; app icons and favicons must be square, and iOS
launcher/apple-touch icons must be opaque. This pads the ibex onto square canvases and writes:

  Web (copied into apps/admin/src/app/) — circular brand badge (mark on ink disk + teal ring):
    favicon.ico  (16/32/48/64)
    icon.png     (512)
    apple-icon.png (180, opaque)
  Mobile launcher sources (apps/mobile/assets/icon/):
    ic_launcher.png            (1024, opaque on ink) — iOS + legacy Android
    ic_launcher_foreground.png (1024, transparent)   — Android adaptive foreground

Usage:  python3 scripts/gen-icons.py   (requires Pillow)
Then wire mobile icons with:  cd apps/mobile && dart run flutter_launcher_icons
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs/design-system/logo.png")
INK = (9, 11, 12, 255)  # brand ink-900 #090B0C (munaxadesignsystem)
BRAND = (0, 184, 219)  # brand teal #00B8DB — used for the badge ring

logo = Image.open(SRC).convert("RGBA")
ratio = logo.width / logo.height


def square(size, height_frac, bg=None):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    h = max(1, int(size * height_frac))
    w = max(1, int(h * ratio))
    canvas.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB") if bg else canvas


def badge(size, height_frac=0.62):
    """Circular brand badge: the mark on a deep-ink disk with a thin teal ring.
    Rendered at 4x and downscaled for clean anti-aliased edges. Transparent outside the disk."""
    s = size * 4
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([0, 0, s - 1, s - 1], fill=INK)
    ring = max(2, int(s * 0.012))
    draw.ellipse([ring, ring, s - 1 - ring, s - 1 - ring], outline=BRAND + (235,), width=ring)
    h = max(1, int(s * height_frac))
    w = max(1, int(h * ratio))
    canvas.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((s - w) // 2, (s - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def write(img, *paths, **kw):
    for p in paths:
        full = os.path.join(ROOT, p)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        img.save(full, **kw)
        print("wrote", p)


web = ["apps/admin/src/app"]
# Circular brand badge for the PWA icon, apple-touch icon, and favicon — the mark on a
# deep-ink disk reads clearly as an avatar/tab icon at any size and on any background.
write(badge(512), *[f"{d}/icon.png" for d in web])
write(badge(180).convert("RGB"), *[f"{d}/apple-icon.png" for d in web])
write(badge(256), *[f"{d}/favicon.ico" for d in web],
      sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

write(square(1024, 0.70, bg=INK), "apps/mobile/assets/icon/ic_launcher.png")
write(square(1024, 0.55), "apps/mobile/assets/icon/ic_launcher_foreground.png")
